-- =============================================
-- MARKETPLACE PERFORMANCE OPTIMIZATION
-- Efficient indexes, full-text search, and query optimization
-- =============================================

-- =============================================
-- 1. EFFICIENT INDEXES FOR MARKETPLACE LISTINGS
-- =============================================

-- Partial index for active listings only (most queries filter by is_active = true)
CREATE INDEX IF NOT EXISTS idx_marketplace_active 
ON avatar_marketplace_listings(is_active) 
WHERE is_active = true;

-- Composite index for category and price filtering
CREATE INDEX IF NOT EXISTS idx_marketplace_category_price 
ON avatar_marketplace_listings(currency_type, listing_price)
WHERE is_active = true;

-- Index for auction end time (for ending soon queries)
CREATE INDEX IF NOT EXISTS idx_marketplace_auction_end 
ON avatar_marketplace_listings(auction_end_time)
WHERE is_active = true AND listing_type = 'auction';

-- Index for seller lookups
CREATE INDEX IF NOT EXISTS idx_marketplace_seller 
ON avatar_marketplace_listings(seller_id, is_active);

-- Index for business listings
CREATE INDEX IF NOT EXISTS idx_marketplace_business 
ON avatar_marketplace_listings(business_id, is_active)
WHERE business_id IS NOT NULL;

-- Index for listing type filtering
CREATE INDEX IF NOT EXISTS idx_marketplace_listing_type 
ON avatar_marketplace_listings(listing_type, is_active);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_marketplace_filters 
ON avatar_marketplace_listings(is_active, listing_type, currency_type, listing_price);

-- Index for item lookups
CREATE INDEX IF NOT EXISTS idx_marketplace_item 
ON avatar_marketplace_listings(item_id);

-- Index for buyer history
CREATE INDEX IF NOT EXISTS idx_marketplace_buyer 
ON avatar_marketplace_listings(buyer_id)
WHERE buyer_id IS NOT NULL;

-- Index for sold items timeline
CREATE INDEX IF NOT EXISTS idx_marketplace_sold_at 
ON avatar_marketplace_listings(sold_at DESC)
WHERE sold_at IS NOT NULL;

-- Index for views and popularity sorting
CREATE INDEX IF NOT EXISTS idx_marketplace_views 
ON avatar_marketplace_listings(views_count DESC)
WHERE is_active = true;

-- Index for watchers count
CREATE INDEX IF NOT EXISTS idx_marketplace_watchers 
ON avatar_marketplace_listings(watchers_count DESC)
WHERE is_active = true;

-- =============================================
-- 2. FULL-TEXT SEARCH OPTIMIZATION
-- =============================================

-- Add search vector column to listings if not exists
ALTER TABLE avatar_marketplace_listings 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_marketplace_search 
ON avatar_marketplace_listings USING gin(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_marketplace_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update search vector on insert/update
DROP TRIGGER IF EXISTS trigger_marketplace_search_vector ON avatar_marketplace_listings;
CREATE TRIGGER trigger_marketplace_search_vector
  BEFORE INSERT OR UPDATE OF description
  ON avatar_marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_search_vector();

-- Update existing rows
UPDATE avatar_marketplace_listings
SET search_vector = setweight(to_tsvector('english', COALESCE(description, '')), 'A')
WHERE search_vector IS NULL;

-- =============================================
-- 3. AUCTION BID HISTORY TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS auction_bid_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES avatar_marketplace_listings(id) ON DELETE CASCADE,
  bidder_id UUID REFERENCES users(id) ON DELETE SET NULL,
  bid_amount DECIMAL(15, 2) NOT NULL,
  previous_bid DECIMAL(15, 2),
  previous_bidder_id UUID REFERENCES users(id) ON DELETE SET NULL,
  bid_status TEXT DEFAULT 'active' CHECK (bid_status IN ('active', 'outbid', 'won', 'cancelled', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for bid history
CREATE INDEX IF NOT EXISTS idx_bid_history_listing ON auction_bid_history(listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bid_history_bidder ON auction_bid_history(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bid_history_status ON auction_bid_history(bid_status);

-- Enable RLS
ALTER TABLE auction_bid_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Public read bid history" ON auction_bid_history;
DROP POLICY IF EXISTS "Insert bid history" ON auction_bid_history;
DROP POLICY IF EXISTS "Update bid history" ON auction_bid_history;

CREATE POLICY "Public read bid history" ON auction_bid_history FOR SELECT USING (true);
CREATE POLICY "Insert bid history" ON auction_bid_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Update bid history" ON auction_bid_history FOR UPDATE USING (true);

-- =============================================
-- 4. CONCURRENT BID PROTECTION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION place_auction_bid(
  p_listing_id UUID,
  p_bidder_id UUID,
  p_bid_amount DECIMAL
) RETURNS JSON AS $$
DECLARE
  v_listing RECORD;
  v_previous_bid DECIMAL;
  v_previous_bidder_id UUID;
  v_minimum_bid DECIMAL;
BEGIN
  -- Lock the listing row to prevent race conditions
  SELECT * INTO v_listing
  FROM avatar_marketplace_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  -- Check if listing exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Listing not found',
      'code', 'LISTING_NOT_FOUND'
    );
  END IF;

  -- Check if listing is active
  IF NOT v_listing.is_active THEN
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
      'error', 'This is not an auction listing',
      'code', 'NOT_AUCTION'
    );
  END IF;

  -- Check if auction has ended
  IF v_listing.auction_end_time IS NOT NULL AND v_listing.auction_end_time < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Auction has ended',
      'code', 'AUCTION_ENDED'
    );
  END IF;

  -- Prevent bidding on own listing
  IF v_listing.seller_id = p_bidder_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot bid on your own listing',
      'code', 'SELF_BID'
    );
  END IF;

  -- Calculate minimum bid
  v_previous_bid := COALESCE(v_listing.current_bid, 0);
  v_previous_bidder_id := v_listing.current_bidder_id;
  
  IF v_previous_bid > 0 THEN
    v_minimum_bid := v_previous_bid + COALESCE(v_listing.minimum_bid_increment, v_previous_bid * 0.05);
  ELSE
    v_minimum_bid := v_listing.listing_price;
  END IF;

  -- Check if bid is high enough
  IF p_bid_amount < v_minimum_bid THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Bid must be at least %s', v_minimum_bid),
      'code', 'BID_TOO_LOW',
      'minimum_bid', v_minimum_bid,
      'current_bid', v_previous_bid
    );
  END IF;

  -- Check if bidder is already highest bidder
  IF v_previous_bidder_id = p_bidder_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You are already the highest bidder',
      'code', 'ALREADY_HIGHEST',
      'current_bid', v_previous_bid
    );
  END IF;

  -- Mark previous bid as outbid
  IF v_previous_bidder_id IS NOT NULL THEN
    UPDATE auction_bid_history
    SET bid_status = 'outbid'
    WHERE listing_id = p_listing_id
      AND bidder_id = v_previous_bidder_id
      AND bid_status = 'active';
  END IF;

  -- Insert new bid into history
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

  -- Update listing with new bid
  UPDATE avatar_marketplace_listings
  SET 
    current_bid = p_bid_amount,
    current_bidder_id = p_bidder_id,
    watchers_count = COALESCE(watchers_count, 0) + 1,
    updated_at = NOW()
  WHERE id = p_listing_id;

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
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. PROCESS ENDED AUCTION FUNCTION
-- =============================================

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

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Listing not found');
  END IF;

  IF NOT v_listing.is_active THEN
    RETURN json_build_object('success', false, 'error', 'Listing already processed');
  END IF;

  IF v_listing.listing_type != 'auction' THEN
    RETURN json_build_object('success', false, 'error', 'Not an auction listing');
  END IF;

  IF v_listing.auction_end_time > NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Auction has not ended yet');
  END IF;

  v_winner_id := v_listing.current_bidder_id;
  v_final_price := COALESCE(v_listing.current_bid, v_listing.listing_price);

  -- No winner case
  IF v_winner_id IS NULL THEN
    UPDATE avatar_marketplace_listings
    SET 
      is_active = false,
      updated_at = NOW()
    WHERE id = p_listing_id;

    RETURN json_build_object(
      'success', true,
      'has_winner', false,
      'message', 'Auction ended with no bids'
    );
  END IF;

  -- Transfer item to winner
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
    false,
    0,
    'good',
    0
  )
  RETURNING id INTO v_new_inventory_id;

  -- Update listing
  UPDATE avatar_marketplace_listings
  SET 
    is_active = false,
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
  INSERT INTO customization_transactions (
    player_id, transaction_type, item_id, source_type, source_id,
    amount, currency_type, quantity, notes
  ) VALUES 
  (
    v_listing.seller_id, 'sell', v_listing.item_id, 'marketplace', p_listing_id,
    v_final_price, v_listing.currency_type, 1, 'Auction sale completed'
  ),
  (
    v_winner_id, 'purchase', v_listing.item_id, 'marketplace', p_listing_id,
    v_final_price, v_listing.currency_type, 1, 'Auction purchase completed'
  );

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
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. CANCEL AUCTION FUNCTION
-- =============================================

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

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Listing not found');
  END IF;

  IF v_listing.seller_id != p_seller_id THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized to cancel this auction');
  END IF;

  IF NOT v_listing.is_active THEN
    RETURN json_build_object('success', false, 'error', 'Listing is not active');
  END IF;

  IF v_listing.current_bid IS NOT NULL AND v_listing.current_bid > 0 THEN
    RETURN json_build_object('success', false, 'error', 'Cannot cancel auction with existing bids');
  END IF;

  UPDATE avatar_marketplace_listings
  SET 
    is_active = false,
    updated_at = NOW()
  WHERE id = p_listing_id;

  RETURN json_build_object('success', true, 'message', 'Auction cancelled successfully');

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. INCREMENT VIEWS FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION increment_marketplace_views(listing_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE avatar_marketplace_listings
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = listing_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 8. ADD WATCHER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION add_marketplace_watcher(listing_id UUID, user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE avatar_marketplace_listings
  SET watchers_count = COALESCE(watchers_count, 0) + 1
  WHERE id = listing_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 9. OPTIMIZED SEARCH FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION search_marketplace_listings(
  p_search_query TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_min_price DECIMAL DEFAULT NULL,
  p_max_price DECIMAL DEFAULT NULL,
  p_currency_type TEXT DEFAULT NULL,
  p_listing_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  seller_id UUID,
  item_id UUID,
  listing_price DECIMAL,
  currency_type TEXT,
  listing_type TEXT,
  auction_end_time TIMESTAMPTZ,
  is_active BOOLEAN,
  views_count INTEGER,
  watchers_count INTEGER,
  current_bid DECIMAL,
  current_bidder_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.seller_id,
    l.item_id,
    l.listing_price,
    l.currency_type::TEXT,
    l.listing_type::TEXT,
    l.auction_end_time,
    l.is_active,
    l.views_count,
    l.watchers_count,
    l.current_bid,
    l.current_bidder_id,
    l.description,
    l.created_at,
    CASE 
      WHEN p_search_query IS NOT NULL AND l.search_vector IS NOT NULL
      THEN ts_rank(l.search_vector, plainto_tsquery('english', p_search_query))
      ELSE 0
    END AS rank
  FROM avatar_marketplace_listings l
  WHERE l.is_active = true
    AND (p_search_query IS NULL OR l.search_vector @@ plainto_tsquery('english', p_search_query))
    AND (p_min_price IS NULL OR l.listing_price >= p_min_price)
    AND (p_max_price IS NULL OR l.listing_price <= p_max_price)
    AND (p_currency_type IS NULL OR l.currency_type::TEXT = p_currency_type)
    AND (p_listing_type IS NULL OR l.listing_type::TEXT = p_listing_type)
  ORDER BY 
    CASE WHEN p_search_query IS NOT NULL THEN rank END DESC NULLS LAST,
    l.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 10. MARKETPLACE STATISTICS MATERIALIZED VIEW
-- =============================================

DROP MATERIALIZED VIEW IF EXISTS marketplace_statistics;
CREATE MATERIALIZED VIEW marketplace_statistics AS
SELECT
  COUNT(*) FILTER (WHERE is_active = true) AS active_listings,
  COUNT(*) FILTER (WHERE is_active = false AND sold_at IS NOT NULL) AS completed_sales,
  COUNT(*) FILTER (WHERE listing_type = 'auction' AND is_active = true) AS active_auctions,
  COUNT(*) FILTER (WHERE listing_type = 'player_sale' AND is_active = true) AS active_player_sales,
  COUNT(*) FILTER (WHERE listing_type = 'business_sale' AND is_active = true) AS active_business_sales,
  AVG(listing_price) FILTER (WHERE is_active = true) AS avg_listing_price,
  AVG(final_price) FILTER (WHERE sold_at IS NOT NULL) AS avg_sale_price,
  SUM(final_price) FILTER (WHERE sold_at IS NOT NULL AND sold_at > NOW() - INTERVAL '30 days') AS total_volume_30d,
  COUNT(DISTINCT seller_id) FILTER (WHERE is_active = true) AS unique_sellers,
  COUNT(DISTINCT buyer_id) FILTER (WHERE sold_at IS NOT NULL AND sold_at > NOW() - INTERVAL '30 days') AS unique_buyers_30d,
  NOW() AS refreshed_at
FROM avatar_marketplace_listings;

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_marketplace_statistics()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW marketplace_statistics;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 11. CLEANUP EXPIRED AUCTIONS FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_expired_auctions()
RETURNS INTEGER AS $$
DECLARE
  processed_count INTEGER := 0;
  v_listing RECORD;
BEGIN
  FOR v_listing IN
    SELECT id
    FROM avatar_marketplace_listings
    WHERE is_active = true
      AND listing_type = 'auction'
      AND auction_end_time < NOW()
  LOOP
    PERFORM process_ended_auction(v_listing.id);
    processed_count := processed_count + 1;
  END LOOP;

  RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 12. AVATAR ITEMS SEARCH INDEX
-- =============================================

-- Add search vector to avatar_items
ALTER TABLE avatar_items 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for avatar items search
CREATE INDEX IF NOT EXISTS idx_avatar_items_search 
ON avatar_items USING gin(search_vector);

-- Function to update avatar item search vector
CREATE OR REPLACE FUNCTION update_avatar_items_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for avatar items search
DROP TRIGGER IF EXISTS trigger_avatar_items_search_vector ON avatar_items;
CREATE TRIGGER trigger_avatar_items_search_vector
  BEFORE INSERT OR UPDATE OF name, description, category, tags
  ON avatar_items
  FOR EACH ROW
  EXECUTE FUNCTION update_avatar_items_search_vector();

-- Update existing avatar items
UPDATE avatar_items
SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'D')
WHERE search_vector IS NULL;

-- Additional avatar items indexes
CREATE INDEX IF NOT EXISTS idx_avatar_items_type ON avatar_items(item_type);
CREATE INDEX IF NOT EXISTS idx_avatar_items_rarity ON avatar_items(rarity);
CREATE INDEX IF NOT EXISTS idx_avatar_items_category ON avatar_items(category);
CREATE INDEX IF NOT EXISTS idx_avatar_items_price ON avatar_items(base_price);
CREATE INDEX IF NOT EXISTS idx_avatar_items_currency ON avatar_items(currency_type);
CREATE INDEX IF NOT EXISTS idx_avatar_items_level ON avatar_items(level_requirement);
CREATE INDEX IF NOT EXISTS idx_avatar_items_active ON avatar_items(is_deleted) WHERE is_deleted = false OR is_deleted IS NULL;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON FUNCTION place_auction_bid IS 'Places a bid on an auction with row-level locking to prevent race conditions';
COMMENT ON FUNCTION process_ended_auction IS 'Processes an ended auction, transferring item to winner';
COMMENT ON FUNCTION cancel_auction IS 'Cancels an auction if there are no bids';
COMMENT ON FUNCTION search_marketplace_listings IS 'Optimized full-text search for marketplace listings';
COMMENT ON FUNCTION cleanup_expired_auctions IS 'Batch processes all expired auctions';
COMMENT ON MATERIALIZED VIEW marketplace_statistics IS 'Aggregated marketplace statistics, refresh periodically';
