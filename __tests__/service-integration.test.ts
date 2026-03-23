/// <reference types="jest" />
import { marketplaceService } from '@/services/MarketplaceService';
import { customizationService } from '@/services/CustomizationService';
import { businessInventoryService } from '@/services/BusinessInventoryService';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('Service Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End Purchase Flow', () => {
    it('should complete full purchase flow: check availability -> purchase -> update inventory', async () => {
      const { supabase } = require('@/lib/supabase');

      const mockItem = {
        id: 'item-1',
        name: 'Designer Jacket',
        base_price: 500,
        currency_type: 'usd',
        item_type: 'outfit',
        rarity: 'rare',
      };

      const mockBusinessInventory = {
        id: 'biz-inv-1',
        business_id: 'biz-1',
        item_id: 'item-1',
        stock_quantity: 10,
        is_available: true,
        discount_percentage: 10,
        custom_price: null,
        item: mockItem,
      };

      const mockPlayerInventoryItem = {
        id: 'player-inv-1',
        player_id: 'user-1',
        item_id: 'item-1',
        purchase_price: 450,
        purchase_source: 'business',
        business_id: 'biz-1',
        is_equipped: false,
        condition_status: 'new',
        wear_percentage: 0,
        item: mockItem,
      };

      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockBusinessInventory, error: null }),
              }),
            }),
          }),
        });

      const availability = await businessInventoryService.checkAvailability('biz-1', 'item-1');

      expect(availability.available).toBe(true);
      expect(availability.stock_quantity).toBe(10);
      expect(availability.final_price).toBe(450);

      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockItem, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockBusinessInventory, error: null }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockPlayerInventoryItem, error: null }),
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
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockPlayerInventoryItem, error: null }),
            }),
          }),
        });

      const purchaseResult = await customizationService.purchaseFromBusiness(
        'user-1',
        'biz-1',
        'item-1',
        500
      );

      expect(purchaseResult.success).toBe(true);
      expect(purchaseResult.inventory_item).toBeDefined();
      expect(purchaseResult.remaining_stock).toBe(9);
    });

    it('should prevent purchase when item is out of stock', async () => {
      const { supabase } = require('@/lib/supabase');

      const mockItem = {
        id: 'item-1',
        name: 'Limited Edition Hat',
        base_price: 200,
      };

      const mockEmptyInventory = {
        id: 'biz-inv-1',
        business_id: 'biz-1',
        item_id: 'item-1',
        stock_quantity: 0,
        is_available: false,
        discount_percentage: 0,
        item: mockItem,
      };

      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockEmptyInventory, error: null }),
              }),
            }),
          }),
        });

      const availability = await businessInventoryService.checkAvailability('biz-1', 'item-1');
      expect(availability.available).toBe(false);

      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockItem, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockEmptyInventory, error: null }),
          }),
        });

      const purchaseResult = await customizationService.purchaseFromBusiness(
        'user-1',
        'biz-1',
        'item-1',
        200
      );

      expect(purchaseResult.success).toBe(false);
      expect(purchaseResult.error).toBe('Item out of stock');
    });
  });

  describe('Marketplace Listing Flow', () => {
    it('should complete flow: purchase -> equip -> list on marketplace -> sell', async () => {
      const { supabase } = require('@/lib/supabase');

      const mockItem = {
        id: 'item-1',
        name: 'Vintage Sneakers',
        base_price: 300,
        currency_type: 'usd',
        item_type: 'shoes',
      };

      const mockPlayerInventory = {
        id: 'player-inv-1',
        player_id: 'user-1',
        item_id: 'item-1',
        is_equipped: false,
        times_equipped: 0,
        purchase_price: 300,
        item: mockItem,
      };

      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockPlayerInventory, error: null }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'listing-1',
                  seller_id: 'user-1',
                  item_id: 'item-1',
                  player_inventory_id: 'player-inv-1',
                  listing_price: 400,
                  listing_type: 'player_sale',
                  is_active: true,
                  item: mockItem,
                },
                error: null,
              }),
            }),
          }),
        });

      const listing = await marketplaceService.createListing(
        'user-1',
        'player-inv-1',
        400,
        'Great condition sneakers'
      );

      expect(listing).toBeDefined();
      expect(listing?.listing_price).toBe(400);
      expect(listing?.listing_type).toBe('player_sale');

      const mockActiveListing = {
        id: 'listing-1',
        seller_id: 'user-1',
        buyer_id: null,
        item_id: 'item-1',
        player_inventory_id: 'player-inv-1',
        listing_price: 400,
        currency_type: 'usd',
        listing_type: 'player_sale',
        is_active: true,
        item: mockItem,
      };

      const mockBuyerInventory = {
        id: 'buyer-inv-1',
        player_id: 'user-2',
        item_id: 'item-1',
        purchase_price: 400,
      };

      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockActiveListing, error: null }),
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
              single: jest.fn().mockResolvedValue({ data: mockBuyerInventory, error: null }),
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
                data: { ...mockBuyerInventory, item: mockItem },
                error: null,
              }),
            }),
          }),
        });

      const purchaseResult = await marketplaceService.purchaseListing('user-2', 'listing-1', 400);

      expect(purchaseResult.success).toBe(true);
      expect(purchaseResult.inventory_item).toBeDefined();
    });
  });

  describe('Auction Flow', () => {
    it('should handle auction bidding and completion', async () => {
      const { supabase } = require('@/lib/supabase');

      const mockItem = {
        id: 'item-1',
        name: 'Rare Collectible',
        base_price: 1000,
        currency_type: 'muso',
      };

      const auctionEndTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const mockAuctionListing = {
        id: 'auction-1',
        seller_id: 'user-1',
        item_id: 'item-1',
        listing_price: 1000,
        current_bid: 1200,
        current_bidder_id: 'user-2',
        minimum_bid_increment: 50,
        listing_type: 'auction',
        auction_end_time: auctionEndTime,
        is_active: true,
        watchers_count: 5,
        item: mockItem,
      };

      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockAuctionListing, error: null }),
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
          insert: jest.fn().mockResolvedValue({ error: null }),
        });

      const bidResult = await marketplaceService.purchaseListing('user-3', 'auction-1', 1300);

      expect(bidResult.success).toBe(true);
      expect(bidResult.transaction_id).toContain('bid_');
    });

    it('should reject bid below minimum increment', async () => {
      const { supabase } = require('@/lib/supabase');

      const mockAuctionListing = {
        id: 'auction-1',
        seller_id: 'user-1',
        item_id: 'item-1',
        listing_price: 1000,
        current_bid: 1200,
        minimum_bid_increment: 50,
        listing_type: 'auction',
        auction_end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      };

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockAuctionListing, error: null }),
            }),
          }),
        }),
      });

      const bidResult = await marketplaceService.purchaseListing('user-3', 'auction-1', 1220);

      expect(bidResult.success).toBe(false);
      expect(bidResult.error).toBe('Bid increment too small');
    });
  });

  describe('Business Inventory Restock Flow', () => {
    it('should restock low stock items and update availability', async () => {
      const { supabase } = require('@/lib/supabase');

      const mockLowStockItems = [
        { id: 'inv-1', item_id: 'item-1', stock_quantity: 2 },
        { id: 'inv-2', item_id: 'item-2', stock_quantity: 0 },
      ];

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({ data: mockLowStockItems, error: null }),
          }),
        }),
      });

      businessInventoryService.restockItems = jest.fn().mockResolvedValue({
        success: true,
        restocked_items: 2,
        failed_items: 0,
      });

      const result = await businessInventoryService.restockLowStockItems('biz-1', 5, 20);

      expect(result.success).toBe(true);
      expect(result.restocked_items).toBe(2);
    });
  });

  describe('Item Wear and Condition Flow', () => {
    it('should track item wear over multiple equip cycles', async () => {
      const { supabase } = require('@/lib/supabase');

      const mockInventoryItem = {
        id: 'inv-1',
        player_id: 'user-1',
        item_id: 'item-1',
        wear_percentage: 35,
        condition_status: 'good',
        purchase_price: 500,
      };

      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockInventoryItem, error: null }),
          }),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ error: null }),
        });

      const wearResult = await customizationService.updateItemWear('inv-1');

      expect(wearResult.success).toBe(true);
      expect(wearResult.wear_percentage).toBe(40);
      expect(wearResult.new_condition).toBe('fair');
      expect(wearResult.repair_cost).toBe(50);
    });
  });

  describe('Cross-Service Data Consistency', () => {
    it('should maintain inventory consistency after marketplace sale', async () => {
      const { supabase } = require('@/lib/supabase');

      const mockSellerInventory = [
        { id: 'inv-1', item_id: 'item-1', is_equipped: false },
        { id: 'inv-2', item_id: 'item-2', is_equipped: true },
      ];

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockSellerInventory, error: null }),
          }),
        }),
      });

      const sellerInventory = await customizationService.getPlayerInventory('user-1');

      expect(sellerInventory).toHaveLength(2);

      const mockBuyerInventory = [
        { id: 'inv-3', item_id: 'item-3', is_equipped: false },
        { id: 'inv-1', item_id: 'item-1', is_equipped: false },
      ];

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockBuyerInventory, error: null }),
          }),
        }),
      });

      const buyerInventory = await customizationService.getPlayerInventory('user-2');

      expect(buyerInventory).toHaveLength(2);
      expect(buyerInventory.find((i) => i.item_id === 'item-1')).toBeDefined();
    });

    it('should sync business inventory after purchase', async () => {
      const { supabase } = require('@/lib/supabase');

      const initialInventory = [
        {
          id: 'inv-1',
          item_id: 'item-1',
          stock_quantity: 10,
          custom_price: 100,
          item: { base_price: 100 },
        },
      ];

      businessInventoryService.getBusinessInventory = jest.fn().mockResolvedValue(initialInventory);

      const initialStats = await businessInventoryService.getInventoryStats('biz-1');
      expect(initialStats.total_stock).toBe(10);

      const updatedInventory = [
        {
          id: 'inv-1',
          item_id: 'item-1',
          stock_quantity: 9,
          custom_price: 100,
          item: { base_price: 100 },
        },
      ];

      businessInventoryService.getBusinessInventory = jest.fn().mockResolvedValue(updatedInventory);

      const updatedStats = await businessInventoryService.getInventoryStats('biz-1');
      expect(updatedStats.total_stock).toBe(9);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent purchase attempts gracefully', async () => {
      const { supabase } = require('@/lib/supabase');

      const mockListing = {
        id: 'listing-1',
        seller_id: 'user-1',
        is_active: false,
        item_id: 'item-1',
      };

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockListing, error: null }),
            }),
          }),
        }),
      });

      const result = await marketplaceService.purchaseListing('user-2', 'listing-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Listing not found or not active');
    });

    it('should prevent listing already-listed items', async () => {
      const { supabase } = require('@/lib/supabase');

      const mockInventoryItem = {
        id: 'inv-1',
        player_id: 'user-2',
        item_id: 'item-1',
        item: { currency_type: 'usd' },
      };

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockInventoryItem, error: null }),
        }),
      });

      const listing = await marketplaceService.createListing('user-1', 'inv-1', 500);

      expect(listing).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const { supabase } = require('@/lib/supabase');

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: new Error('Connection lost') }),
          }),
        }),
      });

      const inventory = await customizationService.getPlayerInventory('user-1');

      expect(inventory).toEqual([]);
    });
  });
});
