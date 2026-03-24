-- Marketplace Auction System Migration
-- Adds concurrent bid handling with row locking to prevent race conditions

-- Auction bid history table
CREATE TABLE IF NOT EXISTS auction_bid_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES avatar_marketplace_listings(id) ON DELETE CASCADE,
  bidder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bid_amount DECIMAL(12,2) NOT NULL,
  previous_bid DECIMAL(12,2),
  previous_bidder_id UUID REFERENCES auth.users(id),
  bid_status VARCHAR(20) DEFAULT 'active' CHECK (bid_status IN ('active', 'outbid', 'won', 'cancelled', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for bid history
CREATE INDEX IF NOT EXISTS idx_bid_history_listing ON auction_bid_history(listing_id);
CREATE INDEX IF NOT EXISTS idx_bid_history_bidder ON auction_bid_history(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bid_history_status ON auction_bid_history(bid_status);

-- Enable RLS
ALTER TABLE auction_bid_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for bid history
CREATE POLICY "Bid history viewable by listing participants" ON auction_bid_history
  FOR SELECT USING (
    bidder_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM avatar_marketplace_listings 
      WHERE id = listing_id AND seller_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own bids" ON auction_bid_history
  FOR INSERT WITH CHECK (auth.uid() = bidder_id);

-- Function: Place bid with row locking to prevent race conditions
CREATE OR REPLACE FUNCTION place_auction_bid(
  p_listing_id UUID,
  p_bidder_id UUID,
  p_bid_amount DECIMAL
) RETURNS JSON AS $$
DECLARE
  v_listing RECORD;
  v_previous_bidder_id UUID;
  v_previous_bid DECIMAL;
  v_min_bid DECIMAL;
  v_auction_end TIMESTAMP WITH TIME ZONE;
  v_result JSON;
BEGIN
  -- Lock the listing row to prevent concurrent modifications
  SELECT * INTO v_listing
  FROM avatar_marketplace_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  -- Check if listing exists
  IF v_listing IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Listing not found',
      'code', 'LISTING_NOT_FOUND'
    );
  END IF;

  -- Check if listing is active
  IF v_listing.is_active = FALSE THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Listing is no longer active',
      'code', 'LISTING_INACTIVE'
    );
  END IF;

  -- Check if it's an auction
  IF v_listing.listing_type != 'auction' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This listing is not an auction',
      'code', 'NOT_AUCTION'
    );
  END IF;

  -- Check auction end time
  IF v_listing.auction_end_time IS NOT NULL AND v_listing.auction_end_time <= NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Auction has ended',
      'code', 'AUCTION_ENDED'
    );
  END IF;

  -- Check bidder is not seller
  IF v_listing.seller_id = p_bidder_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot bid on your own listing',
      'code', 'SELF_BID'
    );
  END IF;

  -- Store previous bid info
  v_previous_bidder_id := v_listing.current_bidder_id;
  v_previous_bid := v_listing.current_bid;

  -- Calculate minimum valid bid
  IF v_listing.current_bid IS NOT NULL THEN
    v_min_bid := v_listing.current_bid + COALESCE(v_listing.minimum_bid_increment, 1);
  ELSE
    v_min_bid := v_listing.listing_price;
  END IF;

  -- Check bid amount is sufficient
  IF p_bid_amount < v_min_bid THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Bid must be at least %s', v_min_bid),
      'code', 'BID_TOO_LOW',
      'minimum_bid', v_min_bid,
      'current_bid', v_listing.current_bid
    );
  END IF;

  -- Check if bidder is already the highest bidder
  IF v_previous_bidder_id = p_bidder_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You are already the highest bidder',
      'code', 'ALREADY_HIGHEST'
    );
  END IF;

  -- Update the listing with new bid
  UPDATE avatar_marketplace_listings
  SET 
    current_bid = p_bid_amount,
    current_bidder_id = p_bidder_id,
    watchers_count = watchers_count + 1,
    updated_at = NOW()
  WHERE id = p_listing_id;

  -- Record the bid in history
  INSERT INTO auction_bid_history (
    listing_id,
    bidder_id,
    bid_amount,
    previous_bid,
    previous_bidder_id,
    bid_status
  ) VALUES (
    p_listing_id,
    p_bidder_id,
    p_bid_amount,
    v_previous_bid,
    v_previous_bidder_id,
    'active'
  );

  -- Mark previous bid as outbid
  IF v_previous_bidder_id IS NOT NULL THEN
    UPDATE auction_bid_history
    SET bid_status = 'outbid'
    WHERE listing_id = p_listing_id
      AND bidder_id = v_previous_bidder_id
      AND bid_status = 'active';
  END IF;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'listing_id', p_listing_id,
    'bid_amount', p_bid_amount,
    'previous_bid', v_previous_bid,
    'previous_bidder_id', v_previous_bidder_id,
    'message', 'Bid placed successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'SYSTEM_ERROR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Process ended auctions
CREATE OR REPLACE FUNCTION process_ended_auction(
  p_listing_id UUID
) RETURNS JSON AS $$
DECLARE
  v_listing RECORD;
  v_winner_id UUID;
  v_final_price DECIMAL;
  v_new_inventory_id UUID;
BEGIN
  -- Lock the listing
  SELECT * INTO v_listing
  FROM avatar_marketplace_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  -- Validate listing
  IF v_listing IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Listing not found');
  END IF;

  IF v_listing.is_active = FALSE THEN
    RETURN json_build_object('success', false, 'error', 'Listing already processed');
  END IF;

  IF v_listing.listing_type != 'auction' THEN
    RETURN json_build_object('success', false, 'error', 'Not an auction');
  END IF;

  IF v_listing.auction_end_time > NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Auction has not ended yet');
  END IF;

  -- Check if there's a winner
  IF v_listing.current_bidder_id IS NULL THEN
    -- No bids - mark as inactive
    UPDATE avatar_marketplace_listings
    SET is_active = FALSE, updated_at = NOW()
    WHERE id = p_listing_id;

    RETURN json_build_object(
      'success', true,
      'has_winner', false,
      'message', 'Auction ended with no bids'
    );
  END IF;

  v_winner_id := v_listing.current_bidder_id;
  v_final_price := v_listing.current_bid;

  -- Transfer item to winner's inventory
  INSERT INTO player_inventory (
    player_id,
    item_id,
    purchase_price,
    purchase_source,
    is_equipped,
    times_equipped,
    condition_status,
    wear_percentage
  ) VALUES (
    v_winner_id,
    v_listing.item_id,
    v_final_price,
    'marketplace',
    FALSE,
    0,
    'good',
    0
  )
  RETURNING id INTO v_new_inventory_id;

  -- Remove from seller's inventory
  UPDATE player_inventory
  SET is_equipped = FALSE
  WHERE id = v_listing.player_inventory_id;

  -- Update listing as sold
  UPDATE avatar_marketplace_listings
  SET 
    is_active = FALSE,
    buyer_id = v_winner_id,
    sold_at = NOW(),
    final_price = v_final_price,
    updated_at = NOW()
  WHERE id = p_listing_id;

  -- Mark winning bid
  UPDATE auction_bid_history
  SET bid_status = 'won'
  WHERE listing_id = p_listing_id
    AND bidder_id = v_winner_id
    AND bid_status = 'active';

  -- Record transactions
  INSERT INTO customization_transactions (player_id, transaction_type, item_id, source_type, source_id, amount, currency_type, quantity, notes)
  VALUES 
    (v_listing.seller_id, 'sell', v_listing.item_id, 'marketplace', p_listing_id, v_final_price, v_listing.currency_type, 1, 'Auction sale'),
    (v_winner_id, 'purchase', v_listing.item_id, 'marketplace', p_listing_id, v_final_price, v_listing.currency_type, 1, 'Auction win');

  RETURN json_build_object(
    'success', true,
    'has_winner', true,
    'winner_id', v_winner_id,
    'final_price', v_final_price,
    'inventory_item_id', v_new_inventory_id,
    'message', 'Auction processed successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cancel auction (only if no bids)
CREATE OR REPLACE FUNCTION cancel_auction(
  p_listing_id UUID,
  p_seller_id UUID
) RETURNS JSON AS $$
DECLARE
  v_listing RECORD;
BEGIN
  SELECT * INTO v_listing
  FROM avatar_marketplace_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF v_listing IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Listing not found');
  END IF;

  IF v_listing.seller_id != p_seller_id THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_listing.is_active = FALSE THEN
    RETURN json_build_object('success', false, 'error', 'Listing already inactive');
  END IF;

  IF v_listing.current_bid IS NOT NULL AND v_listing.current_bid > 0 THEN
    RETURN json_build_object('success', false, 'error', 'Cannot cancel auction with existing bids');
  END IF;

  UPDATE avatar_marketplace_listings
  SET is_active = FALSE, updated_at = NOW()
  WHERE id = p_listing_id;

  RETURN json_build_object('success', true, 'message', 'Auction cancelled');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment marketplace views
CREATE OR REPLACE FUNCTION increment_marketplace_views(listing_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE avatar_marketplace_listings
  SET views_count = views_count + 1
  WHERE id = listing_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Add watcher to listing
CREATE OR REPLACE FUNCTION add_marketplace_watcher(listing_id UUID, user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE avatar_marketplace_listings
  SET watchers_count = watchers_count + 1
  WHERE id = listing_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION place_auction_bid(UUID, UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION process_ended_auction(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_auction(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_marketplace_views(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_marketplace_watcher(UUID, UUID) TO authenticated;

-- Comments
COMMENT ON TABLE auction_bid_history IS 'History of all auction bids for tracking and dispute resolution';
COMMENT ON FUNCTION place_auction_bid IS 'Atomically places a bid on an auction with row-level locking to prevent race conditions';
COMMENT ON FUNCTION process_ended_auction IS 'Processes an ended auction, transferring item to winner';
COMMENT ON FUNCTION cancel_auction IS 'Cancels an auction if no bids have been placed';
