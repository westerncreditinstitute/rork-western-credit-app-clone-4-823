/// <reference types="jest" />
import { customizationService } from '@/services/CustomizationService';
import type { AvatarCustomizationUpdate } from '@/types/customization';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('CustomizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPlayerInventory', () => {
    it('should fetch player inventory', async () => {
      const mockInventory = [
        {
          id: '1',
          player_id: 'user-1',
          item_id: 'item-1',
          is_equipped: false,
          item: {
            name: 'Test Item',
            item_type: 'outfit',
            rarity: 'common',
          },
        },
      ];

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockInventory, error: null }),
          }),
        }),
      });

      const inventory = await customizationService.getPlayerInventory('user-1');

      expect(inventory).toEqual(mockInventory);
      expect(supabase.from).toHaveBeenCalledWith('player_inventory');
    });

    it('should handle errors gracefully', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
          }),
        }),
      });

      const inventory = await customizationService.getPlayerInventory('user-1');

      expect(inventory).toEqual([]);
    });
  });

  describe('getPlayerAvatarConfig', () => {
    it('should fetch avatar configuration', async () => {
      const mockConfig = {
        player_id: 'user-1',
        current_outfit_id: 'inv-1',
        current_hat_id: null,
        current_hair_style: 'short',
        avatar_name: 'Test Avatar',
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockConfig, error: null }),
          }),
        }),
      });

      const config = await customizationService.getPlayerAvatarConfig('user-1');

      expect(config).toEqual(mockConfig);
    });

    it('should return null on error', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: new Error('Error') }),
          }),
        }),
      });

      const config = await customizationService.getPlayerAvatarConfig('user-1');

      expect(config).toBeNull();
    });
  });

  describe('purchaseFromBusiness', () => {
    it('should successfully purchase item from business', async () => {
      const mockItem = {
        id: 'item-1',
        name: 'Test Item',
        base_price: 100,
        currency_type: 'usd',
      };

      const mockInventory = {
        id: 'inv-1',
        business_id: 'biz-1',
        item_id: 'item-1',
        stock_quantity: 10,
        discount_percentage: 0,
      };

      const mockPlayerInventoryItem = {
        id: 'player-inv-1',
        player_id: 'user-1',
        item_id: 'item-1',
        purchase_price: 100,
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockItem, error: null }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
        insert: jest.fn().mockResolvedValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockPlayerInventoryItem, error: null }),
          }),
        }),
      });

      // Mock sequential calls
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockItem, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockInventory, error: null }),
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
              single: jest.fn().mockResolvedValue({
                data: { ...mockPlayerInventoryItem, item: mockItem },
                error: null,
              }),
            }),
          }),
        });

      const result = await customizationService.purchaseFromBusiness('user-1', 'biz-1', 'item-1', 100);

      expect(result.success).toBe(true);
      expect(result.inventory_item).toBeDefined();
      expect(result.remaining_stock).toBe(9);
    });

    it('should fail if item is out of stock', async () => {
      const mockItem = {
        id: 'item-1',
        name: 'Test Item',
        base_price: 100,
      };

      const mockInventory = {
        business_id: 'biz-1',
        item_id: 'item-1',
        stock_quantity: 0,
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockItem, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockInventory, error: null }),
          }),
        });

      const result = await customizationService.purchaseFromBusiness('user-1', 'biz-1', 'item-1', 100);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item out of stock');
    });

    it('should apply discount to purchase price', async () => {
      const mockItem = {
        id: 'item-1',
        name: 'Test Item',
        base_price: 100,
        currency_type: 'usd',
      };

      const mockInventory = {
        business_id: 'biz-1',
        item_id: 'item-1',
        stock_quantity: 10,
        discount_percentage: 10,
      };

      const mockPlayerInventoryItem = {
        id: 'player-inv-1',
        player_id: 'user-1',
        item_id: 'item-1',
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockItem, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockInventory, error: null }),
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
              single: jest.fn().mockResolvedValue({
                data: { ...mockPlayerInventoryItem, item: mockItem },
                error: null,
              }),
            }),
          }),
        });

      const result = await customizationService.purchaseFromBusiness('user-1', 'biz-1', 'item-1', 100);

      // Purchase price should be 100 * (1 - 0.10) = 90
      expect(result.inventory_item?.purchase_price).toBe(90);
    });
  });

  describe('equipItem', () => {
    it('should successfully equip an item', async () => {
      const mockInventoryItem = {
        id: 'inv-1',
        player_id: 'user-1',
        item_id: 'item-1',
        is_equipped: false,
        times_equipped: 0,
        item: {
          item_type: 'outfit',
          name: 'Test Outfit',
        },
      };

      const mockAvatarConfig = {
        player_id: 'user-1',
        current_outfit_id: null,
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockInventoryItem, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockAvatarConfig, error: null }),
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
              single: jest.fn().mockResolvedValue({
                data: { ...mockAvatarConfig, current_outfit: mockInventoryItem },
                error: null,
              }),
            }),
          }),
        });

      const result = await customizationService.equipItem('user-1', 'inv-1');

      expect(result.success).toBe(true);
      expect(result.equipped_items).toBeDefined();
    });

    it('should fail if item not found in inventory', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
          }),
        }),
      });

      const result = await customizationService.equipItem('user-1', 'inv-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item not found in inventory');
    });
  });

  describe('updateAvatarConfig', () => {
    it('should update existing avatar config', async () => {
      const update: AvatarCustomizationUpdate = {
        outfit_id: 'outfit-1',
        avatar_name: 'New Avatar Name',
      };

      const mockExistingConfig = {
        player_id: 'user-1',
        current_outfit_id: null,
        avatar_name: 'Old Name',
      };

      const mockUpdatedConfig = {
        player_id: 'user-1',
        current_outfit_id: 'outfit-1',
        avatar_name: 'New Avatar Name',
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockExistingConfig, error: null }),
          }),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockUpdatedConfig, error: null }),
              }),
            }),
          }),
        });

      const config = await customizationService.updateAvatarConfig('user-1', update);

      expect(config).toEqual(mockUpdatedConfig);
    });

    it('should create new avatar config if none exists', async () => {
      const update: AvatarCustomizationUpdate = {
        avatar_name: 'New Avatar',
      };

      const mockNewConfig = {
        player_id: 'user-1',
        avatar_name: 'New Avatar',
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockNewConfig, error: null }),
            }),
          }),
        });

      const config = await customizationService.updateAvatarConfig('user-1', update);

      expect(config).toEqual(mockNewConfig);
    });
  });

  describe('getInventoryStats', () => {
    it('should calculate inventory statistics', async () => {
      const mockInventory = [
        {
          id: '1',
          item: { item_type: 'outfit', rarity: 'common' },
          is_equipped: true,
          purchase_price: 100,
        },
        {
          id: '2',
          item: { item_type: 'hat', rarity: 'rare' },
          is_equipped: false,
          purchase_price: 200,
        },
      ];

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockInventory, error: null }),
          }),
        }),
      });

      customizationService.getPlayerInventory = jest.fn().mockResolvedValue(mockInventory);

      const stats = await customizationService.getInventoryStats('user-1');

      expect(stats.total_items).toBe(2);
      expect(stats.equipped_items).toBe(1);
      expect(stats.items_by_type.outfit).toBe(1);
      expect(stats.items_by_type.hat).toBe(1);
      expect(stats.items_by_rarity.common).toBe(1);
      expect(stats.items_by_rarity.rare).toBe(1);
      expect(stats.total_value).toBe(300);
    });
  });

  describe('updateItemWear', () => {
    it('should update item wear percentage', async () => {
      const mockInventoryItem = {
        id: 'inv-1',
        player_id: 'user-1',
        item_id: 'item-1',
        wear_percentage: 0,
        condition_status: 'new',
        purchase_price: 100,
      };

      const { supabase } = require('@/lib/supabase');
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

      const result = await customizationService.updateItemWear('inv-1');

      expect(result.success).toBe(true);
      expect(result.wear_percentage).toBe(5); // 5% increase
      expect(result.new_condition).toBe('new');
      expect(result.repair_cost).toBe(10); // 10% of purchase price
    });

    it('should update condition when wear increases', async () => {
      const mockInventoryItem = {
        id: 'inv-1',
        player_id: 'user-1',
        item_id: 'item-1',
        wear_percentage: 75,
        condition_status: 'good',
        purchase_price: 100,
      };

      const { supabase } = require('@/lib/supabase');
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

      const result = await customizationService.updateItemWear('inv-1');

      expect(result.new_condition).toBe('poor');
      expect(result.wear_percentage).toBe(80);
    });
  });
});