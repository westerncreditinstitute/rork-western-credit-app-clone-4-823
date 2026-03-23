import { supabase } from '@/lib/supabase';
import { marketplaceService } from './MarketplaceService';
import type {
  MarketplaceListing,
  BidResult,
  AuctionBidHistory,
  AuctionProcessResult,
  AuctionDetails,
} from '@/types/customization';

export class AuctionService {
  private readonly ENDING_SOON_THRESHOLD_HOURS = 24;
  private readonly CRITICAL_THRESHOLD_MINUTES = 30;

  async createAuction(
    sellerId: string,
    inventoryItemId: string,
    startingPrice: number,
    durationHours: number,
    description?: string,
    buyItNowPrice?: number
  ): Promise<MarketplaceListing | null> {
    console.log(`Creating auction: seller=${sellerId}, item=${inventoryItemId}, startingPrice=${startingPrice}, duration=${durationHours}h`);

    return marketplaceService.createListing(
      sellerId,
      inventoryItemId,
      startingPrice,
      description,
      'auction',
      buyItNowPrice,
      durationHours
    );
  }

  async placeBid(listingId: string, bidderId: string, bidAmount: number): Promise<BidResult> {
    return marketplaceService.placeBid(listingId, bidderId, bidAmount);
  }

  async getAuctionDetails(listingId: string): Promise<AuctionDetails | null> {
    try {
      const { data: listing, error } = await supabase
        .from('avatar_marketplace_listings')
        .select('*, item(*), seller:users(id, username)')
        .eq('id', listingId)
        .single();

      if (error || !listing) {
        console.error('Error fetching auction details:', error);
        return null;
      }

      const bidHistory = await marketplaceService.getBidHistory(listingId);

      const auctionDetails: AuctionDetails = {
        ...listing,
        bid_history: bidHistory,
        total_bids: bidHistory.length,
      };

      if (listing.auction_end_time) {
        const endTime = new Date(listing.auction_end_time);
        const now = new Date();
        const remainingMs = endTime.getTime() - now.getTime();
        auctionDetails.time_remaining_seconds = Math.max(0, Math.floor(remainingMs / 1000));
        auctionDetails.is_ending_soon = remainingMs > 0 && remainingMs < this.CRITICAL_THRESHOLD_MINUTES * 60 * 1000;
      }

      return auctionDetails;
    } catch (error) {
      console.error('Error fetching auction details:', error);
      return null;
    }
  }

  async getActiveAuctions(): Promise<MarketplaceListing[]> {
    return marketplaceService.getActiveListings({ listing_type: 'auction' });
  }

  async getEndingSoonAuctions(): Promise<MarketplaceListing[]> {
    return marketplaceService.getEndingSoonAuctions(this.ENDING_SOON_THRESHOLD_HOURS);
  }

  async getCriticalAuctions(): Promise<MarketplaceListing[]> {
    return marketplaceService.getEndingSoonAuctions(this.CRITICAL_THRESHOLD_MINUTES / 60);
  }

  async getUserBids(userId: string): Promise<AuctionBidHistory[]> {
    return marketplaceService.getUserActiveBids(userId);
  }

  async getUserWonAuctions(userId: string): Promise<MarketplaceListing[]> {
    try {
      const { data, error } = await supabase
        .from('avatar_marketplace_listings')
        .select('*, item(*)')
        .eq('buyer_id', userId)
        .eq('listing_type', 'auction')
        .eq('is_active', false)
        .not('sold_at', 'is', null)
        .order('sold_at', { ascending: false });

      if (error) {
        console.error('Error fetching won auctions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching won auctions:', error);
      return [];
    }
  }

  async getUserOutbidAuctions(userId: string): Promise<AuctionBidHistory[]> {
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
            current_bidder_id,
            auction_end_time,
            is_active,
            item(*)
          )
        `)
        .eq('bidder_id', userId)
        .eq('bid_status', 'outbid')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching outbid auctions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching outbid auctions:', error);
      return [];
    }
  }

  async processEndedAuction(listingId: string): Promise<AuctionProcessResult> {
    return marketplaceService.processEndedAuction(listingId);
  }

  async processAllEndedAuctions(): Promise<{ processed: number; errors: number }> {
    try {
      const { data: endedAuctions, error } = await supabase
        .from('avatar_marketplace_listings')
        .select('id')
        .eq('is_active', true)
        .eq('listing_type', 'auction')
        .lte('auction_end_time', new Date().toISOString());

      if (error) {
        console.error('Error fetching ended auctions:', error);
        return { processed: 0, errors: 1 };
      }

      let processed = 0;
      let errors = 0;

      for (const auction of endedAuctions || []) {
        const result = await this.processEndedAuction(auction.id);
        if (result.success) {
          processed++;
        } else {
          errors++;
          console.error(`Failed to process auction ${auction.id}:`, result.error);
        }
      }

      console.log(`Processed ${processed} ended auctions, ${errors} errors`);
      return { processed, errors };
    } catch (error) {
      console.error('Error processing ended auctions:', error);
      return { processed: 0, errors: 1 };
    }
  }

  async cancelAuction(listingId: string, sellerId: string): Promise<{ success: boolean; error?: string }> {
    return marketplaceService.cancelAuction(listingId, sellerId);
  }

  async buyItNow(listingId: string, buyerId: string): Promise<BidResult> {
    try {
      const { data: listing, error } = await supabase
        .from('avatar_marketplace_listings')
        .select('*')
        .eq('id', listingId)
        .eq('is_active', true)
        .eq('listing_type', 'auction')
        .single();

      if (error || !listing) {
        return { success: false, error: 'Auction not found', code: 'LISTING_NOT_FOUND' };
      }

      if (!listing.buy_it_now_price) {
        return { success: false, error: 'This auction does not have a Buy It Now option', code: 'NOT_AUCTION' };
      }

      if (listing.seller_id === buyerId) {
        return { success: false, error: 'Cannot buy your own listing', code: 'SELF_BID' };
      }

      const auctionEnd = new Date(listing.auction_end_time || 0);
      if (auctionEnd <= new Date()) {
        return { success: false, error: 'Auction has ended', code: 'AUCTION_ENDED' };
      }

      const purchaseResult = await marketplaceService.purchaseListing(
        buyerId,
        listingId,
        listing.buy_it_now_price
      );

      return {
        success: purchaseResult.success,
        error: purchaseResult.error,
        bid_amount: listing.buy_it_now_price,
        listing_id: listingId,
      };
    } catch (error) {
      console.error('Error processing Buy It Now:', error);
      return { success: false, error: 'An error occurred', code: 'SYSTEM_ERROR' };
    }
  }

  calculateMinimumBid(listing: MarketplaceListing): number {
    if (listing.current_bid) {
      return listing.current_bid + (listing.minimum_bid_increment || 1);
    }
    return listing.listing_price;
  }

  formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) return 'Ended';

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  isEndingSoon(listing: MarketplaceListing): boolean {
    if (!listing.auction_end_time) return false;
    const endTime = new Date(listing.auction_end_time);
    const now = new Date();
    const remainingMs = endTime.getTime() - now.getTime();
    return remainingMs > 0 && remainingMs < this.ENDING_SOON_THRESHOLD_HOURS * 60 * 60 * 1000;
  }

  isCritical(listing: MarketplaceListing): boolean {
    if (!listing.auction_end_time) return false;
    const endTime = new Date(listing.auction_end_time);
    const now = new Date();
    const remainingMs = endTime.getTime() - now.getTime();
    return remainingMs > 0 && remainingMs < this.CRITICAL_THRESHOLD_MINUTES * 60 * 1000;
  }
}

export const auctionService = new AuctionService();
