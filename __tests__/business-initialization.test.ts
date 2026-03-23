/// <reference types="jest" />
import { businessInitializationService } from '@/services/BusinessInitializationService';

// Mock Supabase client and services
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('@/services/BusinessOwnershipService', () => ({
  businessOwnershipService: {
    getCities: jest.fn(),
    getBusinessCategories: jest.fn(),
    initializeCityBusinesses: jest.fn(),
    calculateBusinessValuation: jest.fn(),
    getBusinessOwnershipHistory: jest.fn(),
  },
}));

jest.mock('@/data/avatar-items-catalog', () => ({
  AVATAR_ITEMS_CATALOG: [
    { id: 'item-1', name: 'Test Item', category: 'casual', tags: ['everyday'] },
    { id: 'item-2', name: 'Business Item', category: 'business', tags: ['formal'] },
  ],
}));

describe('BusinessInitializationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeAllCities', () => {
    it('should initialize businesses for all cities', async () => {
      const mockCities = [
        { id: 'city-1', name: 'Los Angeles' },
        { id: 'city-2', name: 'New York' },
      ];

      const mockCategories = [
        { id: 'cat_real_estate', name: 'Real Estate' },
        { id: 'cat_retail', name: 'Retail' },
      ];

      const { businessOwnershipService } = require('@/services/BusinessOwnershipService');
      businessOwnershipService.getCities.mockResolvedValue(mockCities);
      businessOwnershipService.getBusinessCategories.mockResolvedValue(mockCategories);
      businessOwnershipService.initializeCityBusinesses.mockResolvedValue(undefined);

      // Mock getCityBusinessCount to return 0 (no existing businesses)
      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          count: jest.fn().mockReturnValue({
            head: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        }),
      });

      await businessInitializationService.initializeAllCities();

      expect(businessOwnershipService.getCities).toHaveBeenCalled();
      expect(businessOwnershipService.getBusinessCategories).toHaveBeenCalled();
      expect(businessOwnershipService.initializeCityBusinesses).toHaveBeenCalledTimes(2);
    });

    it('should skip cities that already have businesses', async () => {
      const mockCities = [
        { id: 'city-1', name: 'Los Angeles' },
        { id: 'city-2', name: 'New York' },
      ];

      const mockCategories = [
        { id: 'cat_real_estate', name: 'Real Estate' },
      ];

      const { businessOwnershipService } = require('@/services/BusinessOwnershipService');
      businessOwnershipService.getCities.mockResolvedValue(mockCities);
      businessOwnershipService.getBusinessCategories.mockResolvedValue(mockCategories);
      businessOwnershipService.initializeCityBusinesses.mockResolvedValue(undefined);

      const { supabase } = require('@/lib/supabase');
      const mockCountQuery = {
        count: jest.fn().mockReturnValue({
          head: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }),
      };

      // First city has businesses, second doesn't
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockCountQuery),
      });

      // Override count for first call
      mockCountQuery.count.mockReturnValueOnce({
        head: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 20, error: null }),
        }),
      });

      await businessInitializationService.initializeAllCities();

      // Should only initialize second city
      expect(businessOwnershipService.initializeCityBusinesses).toHaveBeenCalledTimes(1);
    });
  });

  describe('populateBusinessInventory', () => {
    it('should populate inventory for all businesses', async () => {
      const mockBusinesses = [
        { id: 'biz-1', category_id: 'cat_retail' },
        { id: 'biz-2', category_id: 'cat_real_estate' },
      ];

      const mockItems = [
        { id: 'item-1', category: 'casual', tags: ['everyday'] },
        { id: 'item-2', category: 'business', tags: ['formal'] },
      ];

      const { supabase } = require('@/lib/supabase');
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ data: mockBusinesses, error: null }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ data: mockItems, error: null }),
        })
        .mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
          }),
          insert: jest.fn().mockResolvedValue({ error: null }),
        });

      await businessInitializationService.populateBusinessInventory();

      expect(supabase.from).toHaveBeenCalledWith('physical_businesses');
      expect(supabase.from).toHaveBeenCalledWith('avatar_items');
    });

    it('should not add items that already exist in inventory', async () => {
      const mockBusinesses = [
        { id: 'biz-1', category_id: 'cat_retail' },
      ];

      const mockItems = [
        { id: 'item-1', category: 'casual', tags: ['everyday'] },
      ];

      const { supabase } = require('@/lib/supabase');
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ data: mockBusinesses, error: null }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ data: mockItems, error: null }),
        })
        .mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 'existing' }, error: null }),
          }),
        });

      await businessInitializationService.populateBusinessInventory();

      // Should not call insert if item already exists
      const calls = supabase.from.mock.calls;
      const insertCalls = calls.filter((call: unknown[]) => call[0] === 'business_inventory' && call[1] === 'insert');
      expect(insertCalls.length).toBe(0);
    });
  });

  describe('initializeAvatarItems', () => {
    it('should initialize avatar items catalog', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
        }),
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      await businessInitializationService.initializeAvatarItems();

      expect(supabase.from).toHaveBeenCalledWith('avatar_items');
    });

    it('should skip items that already exist', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'existing' }, error: null }),
        }),
      });

      await businessInitializationService.initializeAvatarItems();

      // Should not call insert if item already exists
      const calls = supabase.from.mock.calls;
      const insertCalls = calls.filter((call: unknown[]) => call[0] === 'avatar_items' && call[1] === 'insert');
      expect(insertCalls.length).toBe(0);
    });
  });

  describe('completeInitialization', () => {
    it('should run all initialization steps', async () => {
      businessInitializationService.initializeAvatarItems = jest.fn().mockResolvedValue(undefined);
      businessInitializationService.initializeAllCities = jest.fn().mockResolvedValue(undefined);
      businessInitializationService.populateBusinessInventory = jest.fn().mockResolvedValue(undefined);

      await businessInitializationService.completeInitialization();

      expect(businessInitializationService.initializeAvatarItems).toHaveBeenCalled();
      expect(businessInitializationService.initializeAllCities).toHaveBeenCalled();
      expect(businessInitializationService.populateBusinessInventory).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      businessInitializationService.initializeAvatarItems = jest.fn().mockRejectedValue(new Error('Error'));
      businessInitializationService.initializeAllCities = jest.fn().mockResolvedValue(undefined);
      businessInitializationService.populateBusinessInventory = jest.fn().mockResolvedValue(undefined);

      // Should not throw
      await expect(businessInitializationService.completeInitialization()).resolves.not.toThrow();
    });
  });

  describe('getRelevantItemsForCategory', () => {
    it('should filter items by category tags', () => {
      const mockItems = [
        { id: 'item-1', category: 'casual', tags: ['everyday'] },
        { id: 'item-2', category: 'business', tags: ['formal'] },
        { id: 'item-3', category: 'medical', tags: ['healthcare'] },
      ];

      // Access private method through service instance
      const relevantItems = (businessInitializationService as any).getRelevantItemsForCategory(
        mockItems,
        'cat_retail'
      );

      // cat_retail maps to ['casual', 'everyday']
      expect(relevantItems).toContainEqual(mockItems[0]);
      expect(relevantItems).not.toContainEqual(mockItems[1]);
    });
  });
});