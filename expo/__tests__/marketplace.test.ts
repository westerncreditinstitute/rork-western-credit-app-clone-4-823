/// <reference types="jest" />
import { marketplaceService } from '@/services/MarketplaceService';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('MarketplaceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createListing', () => {
    it('should create a marketplace listing', async () => {
      const mockInventoryItem = {
        id: 'inv-1',
        player_id: 'user-1',
        item_id: 'item-1',
        purchase_price: 100,
        item: {
          currency_type: 'usd',
        },
      };

      const mockListing = {
        id: 'listing-1',
        seller_id: 'user-1',
        item_id: 'item-1',
        player_inventory_id: 'inv-1',
        listing_price: 150,
        currency_type: 'usd',
        listing_type: 'player_sale',
        item: {
          name: 'Test Item',
        },
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockInventoryItem, error: null }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockListing, error: null }),
            }),
          }),
        });

      const listing = await marketplaceService.createListing(
        'user-1',
        'inv-1',
        150,
        'Test item for sale'
      );

      expect(listing).toEqual(mockListing);
      expect(listing?.listing_price).toBe(150);
    });

    it('should return null if player does not own item', async () => {
      const mockInventoryItem = {
        id: 'inv-1',
        player_id: 'user-2',
        item_id: 'item-1',
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockInventoryItem, error: null }),
        }),
      });

      const listing = await marketplaceService.createListing('user-1', 'inv-1', 150);

      expect(listing).toBeNull();
    });

    it('should create auction listing with end time', async () => {
      const mockInventoryItem = {
        id: 'inv-1',
        player_id: 'user-1',
        item_id: 'item-1',
        purchase_price: 100,
        item: {
          currency_type: 'usd',
        },
      };

      const mockListing = {
        id: 'listing-1',
        seller_id: 'user-1',
        item_id: 'item-1',
        listing_type: 'auction',
        auction_end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockInventoryItem, error: null }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockListing, error: null }),
            }),
          }),
        });

      const listing = await marketplaceService.createListing(
        'user-1',
        'inv-1',
        100,
        'Auction item',
        'player_sale',
        undefined,
        24 // 24 hours - this makes it an auction
      );

      expect(listing?.listing_type).toBe('auction');
      expect(listing?.auction_end_time).toBeDefined();
    });
  });

  describe('purchaseListing', () => {
    it('should purchase listing successfully', async () => {
      const mockListing = {
        id: 'listing-1',
        seller_id: 'user-2',
        buyer_id: null,
        item_id: 'item-1',
        player_inventory_id: 'inv-1',
        listing_price: 150,
        currency_type: 'usd',
        listing_type: 'player_sale',
        is_active: true,
        item: {
          name: 'Test Item',
        },
      };

      const mockBuyerInventoryItem = {
        id: 'buyer-inv-1',
        player_id: 'user-1',
        item_id: 'item-1',
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockListing, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockBuyerInventoryItem, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ error: null }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...mockBuyerInventoryItem, item: mockListing.item },
                error: null,
              }),
            }),
          }),
        });

      const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 150);

      expect(result.success).toBe(true);
      expect(result.inventory_item).toBeDefined();
    });

    it('should fail if buying own listing', async () => {
      const mockListing = {
        id: 'listing-1',
        seller_id: 'user-1',
        item_id: 'item-1',
        listing_price: 150,
        is_active: true,
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockListing, error: null }),
            }),
          }),
        }),
      });

      const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 150);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot purchase your own listing');
    });

    it('should validate auction bid increment', async () => {
      const mockListing = {
        id: 'listing-1',
        seller_id: 'user-2',
        buyer_id: null,
        item_id: 'item-1',
        listing_price: 100,
        current_bid: 150,
        minimum_bid_increment: 10,
        listing_type: 'auction',
        is_active: true,
        auction_end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockListing, error: null }),
            }),
          }),
        }),
      });

      // Bid below increment (150 + 10 - 1 = 159)
      const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 159);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bid increment too small');
    });
  });

  describe('cancelListing', () => {
    it('should cancel own listing', async () => {
      const mockListing = {
        id: 'listing-1',
        seller_id: 'user-1',
        listing_type: 'player_sale',
        current_bid: null,
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockListing, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        });

      const result = await marketplaceService.cancelListing('user-1', 'listing-1');

      expect(result).toBe(true);
    });

    it('should fail if listing has bids', async () => {
      const mockListing = {
        id: 'listing-1',
        seller_id: 'user-1',
        listing_type: 'auction',
        current_bid: 150,
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockListing, error: null }),
          }),
        }),
      });

      const result = await marketplaceService.cancelListing('user-1', 'listing-1');

      expect(result).toBe(false);
    });
  });

  describe('getActiveListings', () => {
    it('should fetch active listings', async () => {
      const mockListings = [
        {
          id: 'listing-1',
          item_id: 'item-1',
          listing_price: 150,
          is_active: true,
          item: {
            name: 'Test Item',
            category: 'casual',
          },
        },
      ];

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockListings, error: null }),
        }),
      });

      const listings = await marketplaceService.getActiveListings({
        category: 'casual',
      });

      expect(listings).toEqual(mockListings);
    });

    it('should apply price filters', async () => {
      const { supabase } = require('@/lib/supabase');
      const mockQueryBuilder = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQueryBuilder),
      });

      await marketplaceService.getActiveListings({
        min_price: 100,
        max_price: 500,
      });

      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('listing_price', 100);
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('listing_price', 500);
    });

    it('should calculate time remaining for auctions', async () => {
      const mockListings = [
        {
          id: 'listing-1',
          listing_type: 'auction',
          auction_end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
      ];

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockListings, error: null }),
        }),
      });

      const listings = await marketplaceService.getActiveListings();

      expect(listings[0].time_remaining).toBeDefined();
      expect(listings[0].time_remaining).toBeGreaterThan(0);
    });
  });

  describe('getUserListings', () => {
    it('should fetch user listings', async () => {
      const mockListings = [
        {
          id: 'listing-1',
          seller_id: 'user-1',
          item_id: 'item-1',
        },
      ];

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockListings, error: null }),
          }),
        }),
      });

      const listings = await marketplaceService.getUserListings('user-1');

      expect(listings).toEqual(mockListings);
    });
  });

  describe('getBusinessListings', () => {
    it('should fetch business listings', async () => {
      const mockListings = [
        {
          id: 'listing-1',
          business_id: 'biz-1',
          item_id: 'item-1',
          is_active: true,
        },
      ];

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockListings, error: null }),
            }),
          }),
        }),
      });

      const listings = await marketplaceService.getBusinessListings('biz-1');

      expect(listings).toEqual(mockListings);
    });
  });

  describe('incrementListingViews', () => {
    it('should increment listing views', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.rpc.mockResolvedValue({ error: null });

      await marketplaceService.incrementListingViews('listing-1');

      expect(supabase.rpc).toHaveBeenCalledWith('increment_marketplace_views', {
        listing_id: 'listing-1',
      });
    });
  });

  describe('addWatcher', () => {
    it('should add watcher to listing', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.rpc.mockResolvedValue({ error: null });

      await marketplaceService.addWatcher('listing-1', 'user-1');

      expect(supabase.rpc).toHaveBeenCalledWith('add_marketplace_watcher', {
        listing_id: 'listing-1',
        user_id: 'user-1',
      });
    });
  });
});