/// <reference types="jest" />
import { businessInventoryService } from '@/services/BusinessInventoryService';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('BusinessInventoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBusinessInventory', () => {
    it('should fetch all inventory for a business', async () => {
      const mockInventory = [
        {
          id: 'inv-1',
          business_id: 'biz-1',
          item_id: 'item-1',
          stock_quantity: 10,
          discount_percentage: 0,
          is_available: true,
          item: { name: 'Test Item', base_price: 100 },
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

      const inventory = await businessInventoryService.getBusinessInventory('biz-1');

      expect(inventory).toHaveLength(1);
      expect(inventory[0].stock_quantity).toBe(10);
      expect(supabase.from).toHaveBeenCalledWith('business_inventory');
    });

    it('should return empty array on error', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
          }),
        }),
      });

      const inventory = await businessInventoryService.getBusinessInventory('biz-1');

      expect(inventory).toEqual([]);
    });
  });

  describe('getAvailableInventory', () => {
    it('should fetch only in-stock items', async () => {
      const mockInventory = [
        {
          id: 'inv-1',
          business_id: 'biz-1',
          item_id: 'item-1',
          stock_quantity: 5,
          is_available: true,
          item: { name: 'Available Item' },
        },
      ];

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gt: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: mockInventory, error: null }),
              }),
            }),
          }),
        }),
      });

      const inventory = await businessInventoryService.getAvailableInventory('biz-1');

      expect(inventory).toHaveLength(1);
      expect(inventory[0].is_available).toBe(true);
    });
  });

  describe('updateStock', () => {
    it('should set stock quantity directly', async () => {
      const mockExistingInventory = {
        id: 'inv-1',
        business_id: 'biz-1',
        item_id: 'item-1',
        stock_quantity: 10,
      };

      const mockUpdatedInventory = {
        ...mockExistingInventory,
        stock_quantity: 20,
        is_available: true,
        item: { name: 'Test Item' },
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockExistingInventory, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockUpdatedInventory, error: null }),
              }),
            }),
          }),
        });

      const result = await businessInventoryService.updateStock('biz-1', 'item-1', 20, 'set');

      expect(result.success).toBe(true);
      expect(result.inventory?.stock_quantity).toBe(20);
    });

    it('should add to existing stock quantity', async () => {
      const mockExistingInventory = {
        id: 'inv-1',
        business_id: 'biz-1',
        item_id: 'item-1',
        stock_quantity: 10,
      };

      const mockUpdatedInventory = {
        ...mockExistingInventory,
        stock_quantity: 15,
        is_available: true,
        item: { name: 'Test Item' },
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockExistingInventory, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockUpdatedInventory, error: null }),
              }),
            }),
          }),
        });

      const result = await businessInventoryService.updateStock('biz-1', 'item-1', 5, 'add');

      expect(result.success).toBe(true);
      expect(result.inventory?.stock_quantity).toBe(15);
    });

    it('should subtract from stock quantity (minimum 0)', async () => {
      const mockExistingInventory = {
        id: 'inv-1',
        business_id: 'biz-1',
        item_id: 'item-1',
        stock_quantity: 3,
      };

      const mockUpdatedInventory = {
        ...mockExistingInventory,
        stock_quantity: 0,
        is_available: false,
        item: { name: 'Test Item' },
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockExistingInventory, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockUpdatedInventory, error: null }),
              }),
            }),
          }),
        });

      const result = await businessInventoryService.updateStock('biz-1', 'item-1', 10, 'subtract');

      expect(result.success).toBe(true);
      expect(result.inventory?.stock_quantity).toBe(0);
    });

    it('should create new inventory if not exists', async () => {
      const mockNewInventory = {
        id: 'inv-new',
        business_id: 'biz-1',
        item_id: 'item-1',
        stock_quantity: 10,
        is_available: true,
        item: { name: 'Test Item' },
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockNewInventory, error: null }),
            }),
          }),
        });

      const result = await businessInventoryService.updateStock('biz-1', 'item-1', 10);

      expect(result.success).toBe(true);
      expect(result.inventory?.stock_quantity).toBe(10);
    });
  });

  describe('restockItems', () => {
    it('should restock multiple items', async () => {
      const mockExistingInventory = {
        id: 'inv-1',
        business_id: 'biz-1',
        stock_quantity: 5,
      };

      const mockUpdatedInventory = {
        ...mockExistingInventory,
        stock_quantity: 15,
        is_available: true,
        item: { name: 'Test Item' },
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockExistingInventory, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockUpdatedInventory, error: null }),
              }),
            }),
          }),
        });

      const result = await businessInventoryService.restockItems('biz-1', [
        { itemId: 'item-1', quantity: 10 },
      ]);

      expect(result.success).toBe(true);
      expect(result.restocked_items).toBe(1);
      expect(result.failed_items).toBe(0);
    });
  });

  describe('checkAvailability', () => {
    it('should return availability info for in-stock item', async () => {
      const mockInventory = {
        id: 'inv-1',
        business_id: 'biz-1',
        item_id: 'item-1',
        stock_quantity: 10,
        is_available: true,
        discount_percentage: 15,
        custom_price: null,
        item: { base_price: 100 },
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockInventory, error: null }),
            }),
          }),
        }),
      });

      const result = await businessInventoryService.checkAvailability('biz-1', 'item-1');

      expect(result.available).toBe(true);
      expect(result.stock_quantity).toBe(10);
      expect(result.price).toBe(100);
      expect(result.discount_percentage).toBe(15);
      expect(result.final_price).toBe(85); // 100 * (1 - 0.15)
    });

    it('should return unavailable for out-of-stock item', async () => {
      const mockInventory = {
        stock_quantity: 0,
        is_available: false,
        discount_percentage: 0,
        item: { base_price: 100 },
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockInventory, error: null }),
            }),
          }),
        }),
      });

      const result = await businessInventoryService.checkAvailability('biz-1', 'item-1');

      expect(result.available).toBe(false);
      expect(result.stock_quantity).toBe(0);
    });

    it('should return unavailable for non-existent item', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
        }),
      });

      const result = await businessInventoryService.checkAvailability('biz-1', 'item-1');

      expect(result.available).toBe(false);
      expect(result.stock_quantity).toBe(0);
    });
  });

  describe('setCustomPrice', () => {
    it('should set custom price for item', async () => {
      const mockUpdatedInventory = {
        id: 'inv-1',
        business_id: 'biz-1',
        item_id: 'item-1',
        custom_price: 150,
        item: { name: 'Test Item', base_price: 100 },
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockUpdatedInventory, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await businessInventoryService.setCustomPrice('biz-1', 'item-1', 150);

      expect(result.success).toBe(true);
      expect(result.inventory?.custom_price).toBe(150);
    });
  });

  describe('setDiscount', () => {
    it('should set discount percentage', async () => {
      const mockUpdatedInventory = {
        id: 'inv-1',
        business_id: 'biz-1',
        item_id: 'item-1',
        discount_percentage: 20,
        item: { name: 'Test Item' },
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockUpdatedInventory, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await businessInventoryService.setDiscount('biz-1', 'item-1', 20);

      expect(result.success).toBe(true);
      expect(result.inventory?.discount_percentage).toBe(20);
    });

    it('should clamp discount between 0 and 100', async () => {
      const mockUpdatedInventory = {
        id: 'inv-1',
        discount_percentage: 100,
        item: { name: 'Test Item' },
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockUpdatedInventory, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await businessInventoryService.setDiscount('biz-1', 'item-1', 150);

      expect(result.success).toBe(true);
    });
  });

  describe('getInventoryStats', () => {
    it('should calculate inventory statistics', async () => {
      const mockInventory = [
        { stock_quantity: 10, custom_price: null, item: { base_price: 100 } },
        { stock_quantity: 3, custom_price: 50, item: { base_price: 100 } },
        { stock_quantity: 0, custom_price: null, item: { base_price: 200 } },
      ];

      businessInventoryService.getBusinessInventory = jest.fn().mockResolvedValue(mockInventory);

      const stats = await businessInventoryService.getInventoryStats('biz-1');

      expect(stats.total_items).toBe(3);
      expect(stats.total_stock).toBe(13);
      expect(stats.low_stock_items).toBe(1);
      expect(stats.out_of_stock_items).toBe(1);
      expect(stats.total_value).toBe(1150); // (10*100) + (3*50) + (0*200)
    });
  });

  describe('addItemToInventory', () => {
    it('should add new item to inventory', async () => {
      const mockNewInventory = {
        id: 'inv-new',
        business_id: 'biz-1',
        item_id: 'item-1',
        stock_quantity: 10,
        is_available: true,
        custom_price: 150,
        discount_percentage: 10,
        item: { name: 'New Item' },
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockNewInventory, error: null }),
            }),
          }),
        });

      const result = await businessInventoryService.addItemToInventory(
        'biz-1',
        'item-1',
        10,
        150,
        10
      );

      expect(result.success).toBe(true);
      expect(result.inventory?.stock_quantity).toBe(10);
    });
  });

  describe('removeItemFromInventory', () => {
    it('should remove item from inventory', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      const result = await businessInventoryService.removeItemFromInventory('biz-1', 'item-1');

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: new Error('Delete failed') }),
          }),
        }),
      });

      const result = await businessInventoryService.removeItemFromInventory('biz-1', 'item-1');

      expect(result).toBe(false);
    });
  });

  describe('scheduleRestock', () => {
    it('should schedule future restock date', async () => {
      const restockDate = new Date('2026-02-01');
      const mockUpdatedInventory = {
        id: 'inv-1',
        business_id: 'biz-1',
        item_id: 'item-1',
        restock_date: restockDate.toISOString(),
        item: { name: 'Test Item' },
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockUpdatedInventory, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await businessInventoryService.scheduleRestock('biz-1', 'item-1', restockDate);

      expect(result.success).toBe(true);
      expect(result.inventory?.restock_date).toBe(restockDate.toISOString());
    });
  });
});
