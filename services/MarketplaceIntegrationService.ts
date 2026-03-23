import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { marketplaceService } from './MarketplaceService';
import { TokenEngineService } from './TokenEngineService';
import { notificationService } from './NotificationService';
import { customizationService } from './CustomizationService';
import { businessInventoryService } from './BusinessInventoryService';
import { CurrencyConversionService, type CurrencyAmount, type PaymentResult } from './CurrencyConversionService';
import type { MarketplaceListing as MarketplaceListingType, CurrencyType } from '@/types/marketplace';
import type { MarketplaceListing, PurchaseResult } from '@/types/customization';
import type { NotificationType } from '@/types/notification';

export interface MarketplaceAnalyticsEvent {
  eventType: 
    | 'listing_created'
    | 'listing_viewed'
    | 'listing_purchased'
    | 'listing_cancelled'
    | 'bid_placed'
    | 'auction_won'
    | 'auction_expired'
    | 'search_performed'
    | 'filter_applied'
    | 'item_equipped';
  userId: string;
  listingId?: string;
  itemId?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface IntegratedPurchaseResult extends PurchaseResult {
  paymentResult?: PaymentResult;
  tokenTransaction?: { id: string; type: 'mint' | 'burn'; amount: number };
  notificationSent?: boolean;
  itemEquipped?: boolean;
  businessRevenueUpdated?: boolean;
  analyticsTracked?: boolean;
}

export interface MarketplaceUserContext {
  userId: string;
  walletBalance: { credits: number; muso: number; usd: number };
  inventoryCount: number;
  activeListingsCount: number;
  activeBidsCount: number;
  isAuthenticated: boolean;
  sessionValid: boolean;
}

export class MarketplaceIntegrationService {
  async validateUserSession(userId: string): Promise<{ valid: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      console.log('[MarketplaceIntegration] Supabase not configured, using demo mode');
      return { valid: true };
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[MarketplaceIntegration] Session validation error:', error);
        return { valid: false, error: 'Session validation failed' };
      }

      if (!session) {
        return { valid: false, error: 'No active session' };
      }

      if (session.user.id !== userId) {
        console.warn('[MarketplaceIntegration] User ID mismatch');
        return { valid: false, error: 'User ID mismatch' };
      }

      const expiresAt = new Date(session.expires_at || 0);
      if (expiresAt < new Date()) {
        return { valid: false, error: 'Session expired' };
      }

      return { valid: true };
    } catch (error) {
      console.error('[MarketplaceIntegration] validateUserSession error:', error);
      return { valid: false, error: 'Authentication check failed' };
    }
  }

  async getUserContext(userId: string): Promise<MarketplaceUserContext | null> {
    try {
      console.log('[MarketplaceIntegration] Getting user context:', userId);

      const [sessionResult, wallet, inventory, listings, bids] = await Promise.all([
        this.validateUserSession(userId),
        CurrencyConversionService.getFullWallet(userId),
        marketplaceService.getPlayerInventory(userId),
        marketplaceService.getUserListings(userId),
        marketplaceService.getUserActiveBids(userId),
      ]);

      const activeListings = listings.filter(l => l.is_active);

      return {
        userId,
        walletBalance: {
          credits: wallet?.credits_balance || 0,
          muso: wallet?.muso_balance || 0,
          usd: wallet?.usd_balance || 0,
        },
        inventoryCount: inventory.length,
        activeListingsCount: activeListings.length,
        activeBidsCount: bids.length,
        isAuthenticated: sessionResult.valid,
        sessionValid: sessionResult.valid,
      };
    } catch (error) {
      console.error('[MarketplaceIntegration] getUserContext error:', error);
      return null;
    }
  }

  async purchaseWithIntegration(
    buyerId: string,
    listingId: string,
    paymentCurrency?: CurrencyType,
    autoEquip: boolean = false
  ): Promise<IntegratedPurchaseResult> {
    console.log('[MarketplaceIntegration] Starting integrated purchase:', {
      buyerId,
      listingId,
      paymentCurrency,
      autoEquip,
    });

    const sessionValidation = await this.validateUserSession(buyerId);
    if (!sessionValidation.valid) {
      return {
        success: false,
        error: sessionValidation.error || 'Authentication failed',
      };
    }

    try {
      const { data: listing, error: listingError } = await supabase
        .from('avatar_marketplace_listings')
        .select('*, item(*)')
        .eq('id', listingId)
        .eq('is_active', true)
        .single();

      if (listingError || !listing) {
        return { success: false, error: 'Listing not found or no longer active' };
      }

      const typedListing = listing as MarketplaceListing;

      if (typedListing.seller_id === buyerId) {
        return { success: false, error: 'Cannot purchase your own listing' };
      }

      const requiredAmount: CurrencyAmount = {
        amount: typedListing.listing_price,
        currency: typedListing.currency_type,
      };

      const affordCheck = await CurrencyConversionService.canAfford(
        buyerId,
        requiredAmount,
        paymentCurrency
      );

      if (!affordCheck.canAfford || !affordCheck.bestPaymentOption) {
        return {
          success: false,
          error: `Insufficient funds. Need ${CurrencyConversionService.formatCurrency(requiredAmount)}`,
        };
      }

      const paymentAmount = affordCheck.bestPaymentOption;

      const paymentResult = await CurrencyConversionService.processPayment(
        buyerId,
        paymentAmount,
        requiredAmount
      );

      if (!paymentResult.success) {
        return {
          success: false,
          error: paymentResult.error || 'Payment processing failed',
          paymentResult,
        };
      }

      const purchaseResult = await marketplaceService.purchaseListing(buyerId, listingId);

      if (!purchaseResult.success) {
        console.error('[MarketplaceIntegration] Purchase failed, attempting refund');
        await this.refundPayment(buyerId, paymentAmount);
        return {
          ...purchaseResult,
          paymentResult,
        };
      }

      const result: IntegratedPurchaseResult = {
        ...purchaseResult,
        paymentResult,
        analyticsTracked: false,
        notificationSent: false,
        itemEquipped: false,
        businessRevenueUpdated: false,
      };

      try {
        if (typedListing.currency_type === 'muso') {
          const burnResult = await TokenEngineService.burnTokens({
            playerId: buyerId,
            amount: typedListing.listing_price,
            reason: 'marketplace_purchase',
            metadata: {
              listingId,
              itemId: typedListing.item_id,
              source: 'marketplace',
            },
          });
          result.tokenTransaction = {
            id: burnResult.id,
            type: 'burn',
            amount: typedListing.listing_price,
          };
        }
      } catch (tokenError) {
        console.error('[MarketplaceIntegration] Token burn failed:', tokenError);
      }

      try {
        await this.sendPurchaseNotifications(typedListing, buyerId);
        result.notificationSent = true;
      } catch (notifError) {
        console.error('[MarketplaceIntegration] Notification failed:', notifError);
      }

      if (autoEquip && purchaseResult.inventory_item?.id) {
        try {
          const equipResult = await customizationService.equipItem(
            buyerId,
            purchaseResult.inventory_item.id
          );
          result.itemEquipped = equipResult.success;
        } catch (equipError) {
          console.error('[MarketplaceIntegration] Auto-equip failed:', equipError);
        }
      }

      if (typedListing.business_id) {
        try {
          await this.updateBusinessRevenue(
            typedListing.business_id,
            typedListing.listing_price,
            typedListing.currency_type
          );
          result.businessRevenueUpdated = true;
        } catch (businessError) {
          console.error('[MarketplaceIntegration] Business revenue update failed:', businessError);
        }
      }

      try {
        await this.trackAnalyticsEvent({
          eventType: 'listing_purchased',
          userId: buyerId,
          listingId,
          itemId: typedListing.item_id,
          metadata: {
            price: typedListing.listing_price,
            currency: typedListing.currency_type,
            listingType: typedListing.listing_type,
            sellerId: typedListing.seller_id,
            paymentCurrency: paymentAmount.currency,
            conversionApplied: paymentResult.conversionApplied,
          },
          timestamp: new Date().toISOString(),
        });
        result.analyticsTracked = true;
      } catch (analyticsError) {
        console.error('[MarketplaceIntegration] Analytics tracking failed:', analyticsError);
      }

      console.log('[MarketplaceIntegration] Purchase completed successfully');
      return result;
    } catch (error) {
      console.error('[MarketplaceIntegration] purchaseWithIntegration error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during purchase',
      };
    }
  }

  async createListingWithIntegration(
    sellerId: string,
    inventoryItemId: string,
    listingPrice: number,
    currencyType: CurrencyType,
    listingType: 'player_sale' | 'business_sale' | 'auction' = 'player_sale',
    options?: {
      description?: string;
      buyItNowPrice?: number;
      auctionDurationHours?: number;
      businessId?: string;
    }
  ): Promise<{ success: boolean; listing?: MarketplaceListing | MarketplaceListingType; error?: string }> {
    console.log('[MarketplaceIntegration] Creating listing:', {
      sellerId,
      inventoryItemId,
      listingPrice,
      listingType,
    });

    const sessionValidation = await this.validateUserSession(sellerId);
    if (!sessionValidation.valid) {
      return { success: false, error: sessionValidation.error };
    }

    try {
      const inventory = await customizationService.getPlayerInventory(sellerId);
      const inventoryItem = inventory.find(i => i.id === inventoryItemId);

      if (!inventoryItem) {
        return { success: false, error: 'Item not found in your inventory' };
      }

      const isTradeable = (inventoryItem.item as any)?.is_tradeable ?? !inventoryItem.item?.is_exclusive;
      if (!isTradeable) {
        return { success: false, error: 'This item cannot be traded' };
      }

      if (inventoryItem.is_equipped) {
        return { success: false, error: 'Please unequip this item before listing' };
      }

      const listing = await marketplaceService.createListing(
        sellerId,
        inventoryItemId,
        listingPrice,
        options?.description,
        listingType,
        options?.buyItNowPrice,
        options?.auctionDurationHours
      );

      if (!listing) {
        return { success: false, error: 'Failed to create listing' };
      }

      await this.trackAnalyticsEvent({
        eventType: 'listing_created',
        userId: sellerId,
        listingId: listing.id,
        itemId: listing.item_id,
        metadata: {
          price: listingPrice,
          currency: currencyType,
          listingType,
          itemName: listing.item?.name,
          itemRarity: listing.item?.rarity,
        },
        timestamp: new Date().toISOString(),
      });

      return { success: true, listing };
    } catch (error) {
      console.error('[MarketplaceIntegration] createListingWithIntegration error:', error);
      return { success: false, error: 'Failed to create listing' };
    }
  }

  async placeBidWithIntegration(
    bidderId: string,
    listingId: string,
    bidAmount: number
  ): Promise<{ success: boolean; error?: string; isWinning?: boolean }> {
    console.log('[MarketplaceIntegration] Placing bid:', { bidderId, listingId, bidAmount });

    const sessionValidation = await this.validateUserSession(bidderId);
    if (!sessionValidation.valid) {
      return { success: false, error: sessionValidation.error };
    }

    try {
      const { data: listing, error: listingError } = await supabase
        .from('avatar_marketplace_listings')
        .select('*')
        .eq('id', listingId)
        .single();

      if (listingError || !listing) {
        return { success: false, error: 'Listing not found' };
      }

      if (listing.listing_type !== 'auction') {
        return { success: false, error: 'This listing is not an auction' };
      }

      const requiredAmount: CurrencyAmount = {
        amount: bidAmount,
        currency: listing.currency_type,
      };

      const affordCheck = await CurrencyConversionService.canAfford(bidderId, requiredAmount);

      if (!affordCheck.canAfford) {
        return { success: false, error: 'Insufficient funds for this bid' };
      }

      const bidResult = await marketplaceService.placeBid(listingId, bidderId, bidAmount);

      if (!bidResult.success) {
        return { success: false, error: bidResult.error };
      }

      if (listing.current_bidder_id && listing.current_bidder_id !== bidderId) {
        await notificationService.createNotification({
          userId: listing.current_bidder_id,
          type: 'system' as NotificationType,
          title: 'You\'ve Been Outbid!',
          body: `Someone placed a higher bid on the auction you were winning.`,
          data: {
            listingId,
            newBidAmount: bidAmount,
            actionUrl: `/marketplace/listing/${listingId}`,
          },
          priority: 'high',
        });
      }

      await this.trackAnalyticsEvent({
        eventType: 'bid_placed',
        userId: bidderId,
        listingId,
        metadata: {
          bidAmount,
          currency: listing.currency_type,
          previousBid: listing.current_bid,
        },
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        isWinning: bidResult.current_bid === bidAmount,
      };
    } catch (error) {
      console.error('[MarketplaceIntegration] placeBidWithIntegration error:', error);
      return { success: false, error: 'Failed to place bid' };
    }
  }

  async processEndedAuctionWithIntegration(listingId: string): Promise<IntegratedPurchaseResult> {
    console.log('[MarketplaceIntegration] Processing ended auction:', listingId);

    try {
      const { data: listing, error } = await supabase
        .from('avatar_marketplace_listings')
        .select('*')
        .eq('id', listingId)
        .single();

      if (error || !listing) {
        return { success: false, error: 'Listing not found' };
      }

      if (!listing.current_bidder_id || !listing.current_bid) {
        await supabase
          .from('avatar_marketplace_listings')
          .update({ is_active: false })
          .eq('id', listingId);

        await notificationService.createNotification({
          userId: listing.seller_id,
          type: 'system' as NotificationType,
          title: 'Auction Ended - No Bids',
          body: `Your auction ended without any bids.`,
          data: { listingId },
          priority: 'normal',
        });

        await this.trackAnalyticsEvent({
          eventType: 'auction_expired',
          userId: listing.seller_id,
          listingId,
          metadata: { startingPrice: listing.listing_price },
          timestamp: new Date().toISOString(),
        });

        return { success: true };
      }

      const result = await this.purchaseWithIntegration(
        listing.current_bidder_id,
        listingId,
        listing.currency_type
      );

      if (result.success) {
        await notificationService.createNotification({
          userId: listing.current_bidder_id,
          type: 'system' as NotificationType,
          title: 'Auction Won!',
          body: `Congratulations! You won the auction.`,
          data: {
            listingId,
            winningBid: listing.current_bid,
            actionUrl: `/inventory`,
          },
          priority: 'high',
        });

        await this.trackAnalyticsEvent({
          eventType: 'auction_won',
          userId: listing.current_bidder_id,
          listingId,
          metadata: {
            winningBid: listing.current_bid,
            startingPrice: listing.listing_price,
          },
          timestamp: new Date().toISOString(),
        });
      }

      return result;
    } catch (error) {
      console.error('[MarketplaceIntegration] processEndedAuctionWithIntegration error:', error);
      return { success: false, error: 'Failed to process auction' };
    }
  }

  async syncBusinessInventoryWithMarketplace(businessId: string): Promise<{
    success: boolean;
    syncedItems: number;
    errors: string[];
  }> {
    console.log('[MarketplaceIntegration] Syncing business inventory:', businessId);

    const errors: string[] = [];
    let syncedItems = 0;

    try {
      const inventory = await businessInventoryService.getBusinessInventory(businessId);

      for (const item of inventory) {
        try {
          const existingListings = await marketplaceService.getBusinessListings(businessId);
          const existingListing = existingListings.find(l => l.item_id === item.item_id);

          if (item.stock_quantity > 0 && item.is_available) {
            if (!existingListing) {
              console.log(`[MarketplaceIntegration] Would create listing for item ${item.item_id}`);
              syncedItems++;
            }
          } else if (existingListing && existingListing.is_active) {
            console.log(`[MarketplaceIntegration] Would deactivate listing ${existingListing.id}`);
            syncedItems++;
          }
        } catch (itemError) {
          errors.push(`Failed to sync item ${item.item_id}: ${itemError}`);
        }
      }

      return { success: errors.length === 0, syncedItems, errors };
    } catch (error) {
      console.error('[MarketplaceIntegration] syncBusinessInventoryWithMarketplace error:', error);
      return { success: false, syncedItems: 0, errors: ['Sync failed'] };
    }
  }

  async getMarketplaceAnalytics(
    timeRange: 'day' | 'week' | 'month' = 'week'
  ): Promise<{
    totalListings: number;
    totalSales: number;
    totalVolume: { credits: number; muso: number; usd: number };
    topCategories: { category: string; count: number }[];
    averagePrices: { category: string; avgPrice: number }[];
  }> {
    try {
      const daysMap = { day: 1, week: 7, month: 30 };
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysMap[timeRange]);

      const { data: listings } = await supabase
        .from('avatar_marketplace_listings')
        .select('*')
        .gte('created_at', startDate.toISOString());

      const { data: transactions } = await supabase
        .from('marketplace_transactions')
        .select('*')
        .gte('created_at', startDate.toISOString());

      const volume = { credits: 0, muso: 0, usd: 0 };
      const categoryCount: Record<string, number> = {};
      const categoryPrices: Record<string, number[]> = {};

      for (const tx of transactions || []) {
        volume[tx.currency_type as keyof typeof volume] += tx.amount;
      }

      for (const listing of listings || []) {
        const category = listing.item?.category || 'unknown';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
        
        if (!categoryPrices[category]) categoryPrices[category] = [];
        categoryPrices[category].push(listing.listing_price);
      }

      const topCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const averagePrices = Object.entries(categoryPrices)
        .map(([category, prices]) => ({
          category,
          avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
        }));

      return {
        totalListings: listings?.length || 0,
        totalSales: transactions?.length || 0,
        totalVolume: volume,
        topCategories,
        averagePrices,
      };
    } catch (error) {
      console.error('[MarketplaceIntegration] getMarketplaceAnalytics error:', error);
      return {
        totalListings: 0,
        totalSales: 0,
        totalVolume: { credits: 0, muso: 0, usd: 0 },
        topCategories: [],
        averagePrices: [],
      };
    }
  }

  private async sendPurchaseNotifications(
    listing: MarketplaceListing,
    buyerId: string
  ): Promise<void> {
    await notificationService.createNotification({
      userId: listing.seller_id,
      type: 'system' as NotificationType,
      title: 'Item Sold!',
      body: `Your ${listing.item?.name || 'item'} has been sold for ${CurrencyConversionService.formatCurrency({ amount: listing.listing_price, currency: listing.currency_type })}`,
      data: {
        listingId: listing.id,
        itemId: listing.item_id,
        price: listing.listing_price,
        currency: listing.currency_type,
        buyerId,
        actionUrl: '/marketplace/my-sales',
      },
      priority: 'high',
    });

    await notificationService.createNotification({
      userId: buyerId,
      type: 'system' as NotificationType,
      title: 'Purchase Successful',
      body: `You've successfully purchased ${listing.item?.name || 'an item'}`,
      data: {
        listingId: listing.id,
        itemId: listing.item_id,
        price: listing.listing_price,
        currency: listing.currency_type,
        actionUrl: '/inventory',
      },
      priority: 'normal',
    });
  }

  private async updateBusinessRevenue(
    businessId: string,
    amount: number,
    currency: CurrencyType
  ): Promise<void> {
    try {
      const platformFee = amount * 0.05;
      const netRevenue = amount - platformFee;

      await supabase.rpc('update_business_revenue', {
        p_business_id: businessId,
        p_amount: netRevenue,
        p_currency: currency,
      });

      console.log('[MarketplaceIntegration] Business revenue updated:', {
        businessId,
        netRevenue,
        platformFee,
      });
    } catch (error) {
      console.error('[MarketplaceIntegration] updateBusinessRevenue error:', error);
    }
  }

  private async refundPayment(userId: string, amount: CurrencyAmount): Promise<boolean> {
    try {
      console.log('[MarketplaceIntegration] Processing refund:', { userId, amount });

      const { error } = await supabase
        .from('player_wallets')
        .update({
          [`${amount.currency}_balance`]: supabase.rpc('increment_balance', {
            p_user_id: userId,
            p_currency: amount.currency,
            p_amount: amount.amount,
          }),
        })
        .eq('player_id', userId);

      if (error) {
        console.error('[MarketplaceIntegration] Refund failed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[MarketplaceIntegration] refundPayment error:', error);
      return false;
    }
  }

  private async trackAnalyticsEvent(event: MarketplaceAnalyticsEvent): Promise<void> {
    try {
      console.log('[MarketplaceIntegration] Analytics event:', event.eventType);

      if (isSupabaseConfigured) {
        await supabase.from('marketplace_analytics').insert({
          event_type: event.eventType,
          user_id: event.userId,
          listing_id: event.listingId,
          item_id: event.itemId,
          metadata: event.metadata,
          created_at: event.timestamp,
        });
      }
    } catch (error) {
      console.error('[MarketplaceIntegration] trackAnalyticsEvent error:', error);
    }
  }
}

export const marketplaceIntegrationService = new MarketplaceIntegrationService();
