import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  MarketplaceListing,
  PurchaseResult,
  MarketplaceFilter,
  BidResult,
  AuctionBidHistory,
  AuctionProcessResult,
} from '@/types/customization';
import type {
  PlayerWallet,
  PlayerInventory,
  MarketplaceTransaction,
  AvatarItem,
} from '@/types/marketplace';

export class MarketplaceService {
  /**
   * Create a marketplace listing
   */
  async createListing(
    sellerId: string,
    inventoryItemId: string,
    listingPrice: number,
    description?: string,
    listingType: 'player_sale' | 'business_sale' | 'auction' = 'player_sale',
    buyItNowPrice?: number,
    auctionDuration?: number // Duration in hours
  ): Promise<MarketplaceListing | null> {
    try {
      // Get inventory item
      const { data: inventoryItem, error: inventoryError } = await supabase
        .from('player_inventory')
        .select('*, item(*)')
        .eq('id', inventoryItemId)
        .eq('player_id', sellerId)
        .single();

      if (inventoryError || !inventoryItem) {
        console.error('Inventory item not found:', inventoryError);
        return null;
      }

      // Validate player owns the item
      if (inventoryItem.player_id !== sellerId) {
        console.error('Player does not own this item');
        return null;
      }

      // Calculate auction end time if applicable
      let auctionEndTime: string | undefined;
      if (listingType === 'auction' && auctionDuration) {
        auctionEndTime = new Date(Date.now() + auctionDuration * 60 * 60 * 1000).toISOString();
      }

      // Create listing
      const { data, error } = await supabase
        .from('avatar_marketplace_listings')
        .insert({
          seller_id: sellerId,
          item_id: inventoryItem.item_id,
          player_inventory_id: inventoryItemId,
          listing_price: listingPrice,
          currency_type: inventoryItem.item.currency_type,
          listing_type: listingType,
          auction_end_time: auctionEndTime,
          is_active: true,
          views_count: 0,
          watchers_count: 0,
          buy_it_now_price: buyItNowPrice,
          description: description,
          minimum_bid_increment: Math.round(listingPrice * 0.05), // 5% minimum increment
        })
        .select('*, item(*)')
        .single();

      if (error) {
        console.error('Error creating listing:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating listing:', error);
      return null;
    }
  }

  /**
   * Purchase a marketplace listing using RPC with row-level locking
   * This method handles concurrent purchases safely and maintains inventory sync
   */
  async purchaseListing(
    buyerId: string,
    listingId: string,
    purchasePrice?: number
  ): Promise<PurchaseResult> {
    if (!isSupabaseConfigured) {
      console.log('[MarketplaceService] Supabase not configured');
      return { success: false, error: 'Database not configured' };
    }

    try {
      console.log(`[MarketplaceService] Attempting purchase - Listing: ${listingId}, Buyer: ${buyerId}`);

      // Use the RPC function with row-level locking for safe concurrent purchases
      const { data, error } = await supabase.rpc('purchase_listing', {
        p_listing_id: listingId,
        p_buyer_id: buyerId,
      });

      if (error) {
        console.error('[MarketplaceService] RPC error:', error);
        return { success: false, error: error.message };
      }

      console.log('[MarketplaceService] Purchase result:', data);

      if (data && typeof data === 'object') {
        const result = data as {
          success: boolean;
          error?: string;
          transaction_id?: string;
          amount?: number;
          platform_fee?: number;
          seller_payout?: number;
        };
        
        if (result.success) {
          // Fetch the updated listing to return inventory item
          const { data: listing } = await supabase
            .from('avatar_marketplace_listings')
            .select('*, item(*)')
            .eq('id', listingId)
            .single();

          return {
            success: true,
            transaction_id: result.transaction_id,
            inventory_item: listing,
          };
        } else {
          return {
            success: false,
            error: result.error || 'Purchase failed',
          };
        }
      }

      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('[MarketplaceService] purchaseListing error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Legacy purchase method for backwards compatibility
   * Falls back to RPC-based purchase
   */
  async purchaseListingLegacy(
    buyerId: string,
    listingId: string,
    purchasePrice?: number
  ): Promise<PurchaseResult> {
    try {
      // Get listing
      const { data: listing, error: listingError } = await supabase
        .from('avatar_marketplace_listings')
        .select('*, item(*)')
        .eq('id', listingId)
        .eq('is_active', true)
        .single();

      if (listingError || !listing) {
        return { success: false, error: 'Listing not found or not active' };
      }

      const typedListing = listing as MarketplaceListing;

      // Validate buyer is not seller
      if (typedListing.seller_id === buyerId) {
        return { success: false, error: 'Cannot purchase your own listing' };
      }

      // Determine final price
      const finalPrice = purchasePrice || typedListing.listing_price;

      // Validate price for auctions
      if (typedListing.listing_type === 'auction') {
        if (typedListing.current_bid && finalPrice <= typedListing.current_bid) {
          return { success: false, error: 'Bid must be higher than current bid' };
        }
        if (finalPrice < typedListing.listing_price) {
          return { success: false, error: 'Bid must be at least starting price' };
        }
        if (typedListing.current_bid && finalPrice < typedListing.current_bid + (typedListing.minimum_bid_increment || 0)) {
          return { success: false, error: 'Bid increment too small' };
        }
      }

      // Handle auction bid vs immediate purchase
      if (typedListing.listing_type === 'auction') {
        const auctionEndTime = new Date(typedListing.auction_end_time || 0);
        const currentTime = new Date();

        if (currentTime >= auctionEndTime) {
          // Auction ended, process sale
          return await this.processAuctionSale(typedListing, buyerId, finalPrice);
        } else {
          // Auction still active, just update bid
          return await this.updateAuctionBid(typedListing, buyerId, finalPrice);
        }
      } else {
        // Immediate purchase (player_sale or business_sale)
        return await this.processImmediateSale(typedListing, buyerId, finalPrice);
      }
    } catch (error) {
      console.error('Error purchasing listing:', error);
      return { success: false, error: 'An error occurred while purchasing the listing' };
    }
  }

  /**
   * Process immediate sale
   */
  private async processImmediateSale(
    listing: MarketplaceListing,
    buyerId: string,
    price: number
  ): Promise<PurchaseResult> {
    try {
      // Remove item from seller's inventory
      const { error: removeError } = await supabase
        .from('player_inventory')
        .update({ is_equipped: false })
        .eq('id', listing.player_inventory_id);

      if (removeError) {
        console.error('Error removing item from seller inventory:', removeError);
      }

      // Add item to buyer's inventory
      const { data: buyerInventoryItem, error: addError } = await supabase
        .from('player_inventory')
        .insert({
          player_id: buyerId,
          item_id: listing.item_id,
          purchase_price: price,
          purchase_source: 'marketplace',
          business_id: null,
          is_equipped: false,
          times_equipped: 0,
          condition_status: 'good',
          wear_percentage: 0,
        })
        .select()
        .single();

      if (addError) {
        return { success: false, error: 'Failed to add item to buyer inventory' };
      }

      // Update listing
      await supabase
        .from('avatar_marketplace_listings')
        .update({
          is_active: false,
          buyer_id: buyerId,
          sold_at: new Date().toISOString(),
          final_price: price,
          updated_at: new Date().toISOString(),
        })
        .eq('id', listing.id);

      // Record transaction for seller
      await supabase
        .from('customization_transactions')
        .insert({
          player_id: listing.seller_id,
          transaction_type: 'sell',
          item_id: listing.item_id,
          source_type: 'marketplace',
          source_id: listing.id,
          amount: price,
          currency_type: listing.currency_type,
          quantity: 1,
          notes: `Sold ${listing.item?.name} on marketplace`,
        });

      // Record transaction for buyer
      await supabase
        .from('customization_transactions')
        .insert({
          player_id: buyerId,
          transaction_type: 'purchase',
          item_id: listing.item_id,
          source_type: 'marketplace',
          source_id: listing.id,
          amount: price,
          currency_type: listing.currency_type,
          quantity: 1,
          notes: `Purchased ${listing.item?.name} from marketplace`,
        });

      // Get full inventory item
      const { data: fullInventoryItem } = await supabase
        .from('player_inventory')
        .select('*, item(*)')
        .eq('id', buyerInventoryItem.id)
        .single();

      return {
        success: true,
        inventory_item: fullInventoryItem,
        transaction_id: 'tx_' + Date.now(),
      };
    } catch (error) {
      console.error('Error processing immediate sale:', error);
      return { success: false, error: 'An error occurred while processing the sale' };
    }
  }

  /**
   * Update auction bid
   */
  private async updateAuctionBid(
    listing: MarketplaceListing,
    bidderId: string,
    bidAmount: number
  ): Promise<PurchaseResult> {
    try {
      // Update listing with new bid
      const { error: updateError } = await supabase
        .from('avatar_marketplace_listings')
        .update({
          current_bid: bidAmount,
          current_bidder_id: bidderId,
          watchers_count: (listing.watchers_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', listing.id);

      if (updateError) {
        return { success: false, error: 'Failed to update bid' };
      }

      // Record bid transaction
      await supabase
        .from('customization_transactions')
        .insert({
          player_id: bidderId,
          transaction_type: 'purchase',
          item_id: listing.item_id,
          source_type: 'marketplace',
          source_id: listing.id,
          amount: bidAmount,
          currency_type: listing.currency_type,
          quantity: 1,
          notes: `Bid on ${listing.item?.name} auction`,
        });

      return {
        success: true,
        transaction_id: 'bid_' + Date.now(),
      };
    } catch (error) {
      console.error('Error updating auction bid:', error);
      return { success: false, error: 'An error occurred while updating the bid' };
    }
  }

  /**
   * Process auction sale when auction ends
   */
  private async processAuctionSale(
    listing: MarketplaceListing,
    buyerId: string,
    price: number
  ): Promise<PurchaseResult> {
    // Same logic as immediate sale
    return await this.processImmediateSale(listing, buyerId, price);
  }

  /**
   * Cancel a marketplace listing
   */
  async cancelListing(sellerId: string, listingId: string): Promise<boolean> {
    try {
      // Validate ownership
      const { data: listing, error: listingError } = await supabase
        .from('avatar_marketplace_listings')
        .select('*')
        .eq('id', listingId)
        .eq('seller_id', sellerId)
        .single();

      if (listingError || !listing) {
        console.error('Listing not found or not owned by seller');
        return false;
      }

      // Cannot cancel if there are bids (for auctions)
      if (listing.listing_type === 'auction' && listing.current_bid && listing.current_bid > 0) {
        console.error('Cannot cancel auction with existing bids');
        return false;
      }

      // Cancel listing
      const { error: cancelError } = await supabase
        .from('avatar_marketplace_listings')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', listingId);

      if (cancelError) {
        console.error('Error canceling listing:', cancelError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error canceling listing:', error);
      return false;
    }
  }

  /**
   * Get active marketplace listings
   */
  async getActiveListings(filter?: MarketplaceFilter): Promise<MarketplaceListing[]> {
    try {
      let query = supabase
        .from('avatar_marketplace_listings')
        .select('*, item(*)')
        .eq('is_active', true);

      if (filter?.item_type) {
        // Join with avatar_items to filter by type
        query = query.contains('item.item_type', filter.item_type);
      }

      if (filter?.category) {
        query = query.eq('item.category', filter.category);
      }

      if (filter?.min_price) {
        query = query.gte('listing_price', filter.min_price);
      }

      if (filter?.max_price) {
        query = query.lte('listing_price', filter.max_price);
      }

      if (filter?.currency_type) {
        query = query.eq('currency_type', filter.currency_type);
      }

      if (filter?.seller_id) {
        query = query.eq('seller_id', filter.seller_id);
      }

      if (filter?.business_id) {
        query = query.eq('business_id', filter.business_id);
      }

      if (filter?.listing_type) {
        query = query.eq('listing_type', filter.listing_type);
      }

      if (filter?.search_query) {
        query = query.or(`item.name.ilike.%${filter.search_query}%,description.ilike.%${filter.search_query}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching marketplace listings:', error);
        return [];
      }

      // Calculate time remaining for auctions
      const listings = (data || []) as MarketplaceListing[];
      listings.forEach((listing) => {
        if (listing.listing_type === 'auction' && listing.auction_end_time) {
          const endTime = new Date(listing.auction_end_time);
          const now = new Date();
          listing.time_remaining = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
        }
      });

      return listings;
    } catch (error) {
      console.error('Error fetching marketplace listings:', error);
      return [];
    }
  }

  /**
   * Get user's listings
   */
  async getUserListings(userId: string): Promise<MarketplaceListing[]> {
    try {
      const { data, error } = await supabase
        .from('avatar_marketplace_listings')
        .select('*, item(*)')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user listings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user listings:', error);
      return [];
    }
  }

  /**
   * Get business listings
   */
  async getBusinessListings(businessId: string): Promise<MarketplaceListing[]> {
    try {
      const { data, error } = await supabase
        .from('avatar_marketplace_listings')
        .select('*, item(*)')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching business listings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching business listings:', error);
      return [];
    }
  }

  /**
   * Increment listing views
   */
  async incrementListingViews(listingId: string): Promise<void> {
    try {
      await supabase.rpc('increment_marketplace_views', { listing_id: listingId });
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
  }

  /**
   * Add watcher to listing
   */
  async addWatcher(listingId: string, userId: string): Promise<void> {
    try {
      await supabase.rpc('add_marketplace_watcher', { listing_id: listingId, user_id: userId });
    } catch (error) {
      console.error('Error adding watcher:', error);
    }
  }

  /**
   * Place a bid on an auction listing with concurrent bid protection
   */
  async placeBid(listingId: string, bidderId: string, bidAmount: number): Promise<BidResult> {
    try {
      console.log(`Placing bid: listing=${listingId}, bidder=${bidderId}, amount=${bidAmount}`);

      const { data, error } = await supabase.rpc('place_auction_bid', {
        p_listing_id: listingId,
        p_bidder_id: bidderId,
        p_bid_amount: bidAmount,
      });

      if (error) {
        console.error('Error placing bid:', error);
        return {
          success: false,
          error: error.message,
          code: 'SYSTEM_ERROR',
        };
      }

      const result = data as BidResult;
      console.log('Bid result:', result);
      return result;
    } catch (error) {
      console.error('Error placing bid:', error);
      return {
        success: false,
        error: 'An error occurred while placing the bid',
        code: 'SYSTEM_ERROR',
      };
    }
  }

  /**
   * Process an ended auction
   */
  async processEndedAuction(listingId: string): Promise<AuctionProcessResult> {
    try {
      console.log(`Processing ended auction: ${listingId}`);

      const { data, error } = await supabase.rpc('process_ended_auction', {
        p_listing_id: listingId,
      });

      if (error) {
        console.error('Error processing auction:', error);
        return { success: false, error: error.message };
      }

      return data as AuctionProcessResult;
    } catch (error) {
      console.error('Error processing auction:', error);
      return { success: false, error: 'An error occurred while processing the auction' };
    }
  }

  /**
   * Get bid history for a listing
   */
  async getBidHistory(listingId: string): Promise<AuctionBidHistory[]> {
    try {
      const { data, error } = await supabase
        .from('auction_bid_history')
        .select('*')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bid history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching bid history:', error);
      return [];
    }
  }

  /**
   * Get active auctions ending soon
   */
  async getEndingSoonAuctions(hoursRemaining: number = 24): Promise<MarketplaceListing[]> {
    try {
      const endTime = new Date(Date.now() + hoursRemaining * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('avatar_marketplace_listings')
        .select('*, item(*)')
        .eq('is_active', true)
        .eq('listing_type', 'auction')
        .lte('auction_end_time', endTime)
        .gte('auction_end_time', new Date().toISOString())
        .order('auction_end_time', { ascending: true });

      if (error) {
        console.error('Error fetching ending auctions:', error);
        return [];
      }

      const listings = (data || []) as MarketplaceListing[];
      listings.forEach((listing) => {
        if (listing.auction_end_time) {
          const endTime = new Date(listing.auction_end_time);
          const now = new Date();
          listing.time_remaining = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
        }
      });

      return listings;
    } catch (error) {
      console.error('Error fetching ending auctions:', error);
      return [];
    }
  }

  /**
   * Get user's active bids
   */
  async getUserActiveBids(userId: string): Promise<AuctionBidHistory[]> {
    try {
      const { data, error } = await supabase
        .from('auction_bid_history')
        .select(`
          *,
          listing:avatar_marketplace_listings(
            id,
            item_id,
            listing_price,
            current_bid,
            auction_end_time,
            is_active,
            item(*)
          )
        `)
        .eq('bidder_id', userId)
        .eq('bid_status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user bids:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user bids:', error);
      return [];
    }
  }

  /**
   * Cancel an auction (only if no bids)
   */
  async cancelAuction(listingId: string, sellerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('cancel_auction', {
        p_listing_id: listingId,
        p_seller_id: sellerId,
      });

      if (error) {
        console.error('Error cancelling auction:', error);
        return { success: false, error: error.message };
      }

      return data as { success: boolean; error?: string };
    } catch (error) {
      console.error('Error cancelling auction:', error);
      return { success: false, error: 'An error occurred while cancelling the auction' };
    }
  }
  /**
   * Get player wallet with balances
   */
  async getPlayerWallet(playerId: string): Promise<PlayerWallet | null> {
    if (!isSupabaseConfigured) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('player_wallets')
        .select('*')
        .eq('player_id', playerId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[MarketplaceService] Error fetching wallet:', error);
        return null;
      }

      if (!data) {
        // Create wallet if it doesn't exist
        const { data: newWallet, error: createError } = await supabase
          .from('player_wallets')
          .insert({
            player_id: playerId,
            credits_balance: 0,
            muso_balance: 0,
            usd_balance: 0,
          })
          .select()
          .single();

        if (createError) {
          console.error('[MarketplaceService] Error creating wallet:', createError);
          return null;
        }

        return newWallet as PlayerWallet;
      }

      return data as PlayerWallet;
    } catch (error) {
      console.error('[MarketplaceService] getPlayerWallet error:', error);
      return null;
    }
  }

  /**
   * Get player inventory items
   */
  async getPlayerInventory(playerId: string): Promise<PlayerInventory[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('player_inventory')
        .select(`
          *,
          item:avatar_items(*)
        `)
        .eq('player_id', playerId);

      if (error) {
        console.error('[MarketplaceService] Error fetching inventory:', error);
        return [];
      }

      return (data || []) as PlayerInventory[];
    } catch (error) {
      console.error('[MarketplaceService] getPlayerInventory error:', error);
      return [];
    }
  }

  /**
   * Restock business inventory using RPC
   */
  async restockBusinessInventory(
    businessId: string,
    itemId: string,
    quantity: number
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      const { data, error } = await supabase.rpc('restock_business_inventory', {
        p_business_id: businessId,
        p_item_id: itemId,
        p_quantity: quantity,
      });

      if (error) {
        console.error('[MarketplaceService] Restock error:', error);
        return { success: false, error: error.message };
      }

      console.log('[MarketplaceService] Restock result:', data);
      return { success: true };
    } catch (error) {
      console.error('[MarketplaceService] restockBusinessInventory error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get business inventory with stock levels
   */
  async getBusinessInventory(
    businessId: string
  ): Promise<{ item: AvatarItem; stock_quantity: number; last_restock_at: string | null }[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('business_inventory')
        .select(`
          stock_quantity,
          last_restock_at,
          item:avatar_items(*)
        `)
        .eq('business_id', businessId);

      if (error) {
        console.error('[MarketplaceService] Error fetching business inventory:', error);
        return [];
      }

      return (data || []).map((item) => ({
        item: item.item as unknown as AvatarItem,
        stock_quantity: item.stock_quantity,
        last_restock_at: item.last_restock_at,
      }));
    } catch (error) {
      console.error('[MarketplaceService] getBusinessInventory error:', error);
      return [];
    }
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(
    userId: string,
    type: 'buyer' | 'seller' | 'all' = 'all'
  ): Promise<MarketplaceTransaction[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    try {
      let query = supabase
        .from('marketplace_transactions')
        .select(`
          *,
          item:avatar_items(name, image_url),
          listing:avatar_marketplace_listings(listing_type)
        `)
        .order('created_at', { ascending: false });

      if (type === 'buyer') {
        query = query.eq('buyer_id', userId);
      } else if (type === 'seller') {
        query = query.eq('seller_id', userId);
      } else {
        query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[MarketplaceService] Error fetching transactions:', error);
        return [];
      }

      return (data || []) as MarketplaceTransaction[];
    } catch (error) {
      console.error('[MarketplaceService] getTransactionHistory error:', error);
      return [];
    }
  }

  /**
   * Finalize an ended auction using RPC
   */
  async finalizeAuction(listingId: string): Promise<PurchaseResult> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      console.log(`[MarketplaceService] Finalizing auction - Listing: ${listingId}`);

      const { data, error } = await supabase.rpc('finalize_auction', {
        p_listing_id: listingId,
      });

      if (error) {
        console.error('[MarketplaceService] RPC error:', error);
        return { success: false, error: error.message };
      }

      console.log('[MarketplaceService] Finalize result:', data);

      if (data && typeof data === 'object') {
        const result = data as { success: boolean; error?: string; transaction_id?: string };
        return {
          success: result.success,
          error: result.error,
          transaction_id: result.transaction_id,
        };
      }

      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('[MarketplaceService] finalizeAuction error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}

export const marketplaceService = new MarketplaceService();