/// <reference types="jest" />
import { businessOwnershipService } from '@/services/BusinessOwnershipService';
import type { BusinessInitializationConfig } from '@/types/business-ownership';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('BusinessOwnershipService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCities', () => {
    it('should fetch all cities', async () => {
      const mockCities = [
        { id: '1', name: 'Los Angeles', state: 'CA', country: 'USA' },
        { id: '2', name: 'New York', state: 'NY', country: 'USA' },
      ];

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockCities, error: null }),
        }),
      });

      const cities = await businessOwnershipService.getCities();

      expect(cities).toEqual(mockCities);
      expect(supabase.from).toHaveBeenCalledWith('cities');
    });

    it('should handle errors gracefully', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
        }),
      });

      const cities = await businessOwnershipService.getCities();

      expect(cities).toEqual([]);
    });
  });

  describe('getBusinessCategories', () => {
    it('should fetch all business categories', async () => {
      const mockCategories = [
        { id: 'cat_real_estate', name: 'Real Estate Brokerage', risk_level: 'medium' },
        { id: 'cat_retail', name: 'Retail Store', risk_level: 'medium' },
      ];

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockCategories, error: null }),
        }),
      });

      const categories = await businessOwnershipService.getBusinessCategories();

      expect(categories).toEqual(mockCategories);
      expect(supabase.from).toHaveBeenCalledWith('business_categories');
    });
  });

  describe('getAvailableBusinesses', () => {
    it('should fetch businesses with filters', async () => {
      const mockBusinesses = [
        {
          id: '1',
          name: 'Test Business',
          category_id: 'cat_real_estate',
          for_sale: true,
          listing_price: 100000,
        },
      ];

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockBusinesses, error: null }),
        }),
      });

      const businesses = await businessOwnershipService.getAvailableBusinesses({
        city_id: 'city-1',
        category_id: 'cat_real_estate',
        for_sale_only: true,
      });

      expect(businesses).toEqual(mockBusinesses);
      expect(supabase.from).toHaveBeenCalledWith('physical_businesses');
    });

    it('should filter by min_price and max_price', async () => {
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

      await businessOwnershipService.getAvailableBusinesses({
        min_price: 50000,
        max_price: 200000,
      });

      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('listing_price', 50000);
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('listing_price', 200000);
    });
  });

  describe('purchaseBusiness', () => {
    it('should successfully purchase a business', async () => {
      const mockBusiness = {
        id: '1',
        name: 'Test Business',
        for_sale: true,
        listing_price: 100000,
        purchase_price: null,
      };

      const { supabase } = require('@/lib/supabase');
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockBusiness, error: null }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await businessOwnershipService.purchaseBusiness('user-1', '1', 100000);

      expect(result.success).toBe(true);
      expect(result.business).toBeDefined();
    });

    it('should fail if business is not for sale', async () => {
      const mockBusiness = {
        id: '1',
        name: 'Test Business',
        for_sale: false,
        listing_price: 100000,
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockBusiness, error: null }),
        }),
      });

      const result = await businessOwnershipService.purchaseBusiness('user-1', '1', 100000);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Business is not for sale');
    });

    it('should fail if purchase price is incorrect', async () => {
      const mockBusiness = {
        id: '1',
        name: 'Test Business',
        for_sale: true,
        listing_price: 100000,
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockBusiness, error: null }),
        }),
      });

      const result = await businessOwnershipService.purchaseBusiness('user-1', '1', 50000);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid purchase price');
    });
  });

  describe('getPlayerOwnedBusinesses', () => {
    it('should fetch player-owned businesses', async () => {
      const mockBusinesses = [
        {
          id: '1',
          name: 'My Business',
          current_owner_id: 'user-1',
        },
      ];

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockBusinesses, error: null }),
          }),
        }),
      });

      const businesses = await businessOwnershipService.getPlayerOwnedBusinesses('user-1');

      expect(businesses).toEqual(mockBusinesses);
      expect(supabase.from).toHaveBeenCalledWith('physical_businesses');
    });
  });

  describe('calculateBusinessValuation', () => {
    it('should calculate business valuation correctly', async () => {
      const mockBusiness = {
        id: '1',
        monthly_revenue: 10000,
        purchase_price: 200000,
      };

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockBusiness, error: null }),
        }),
      });

      const valuation = await businessOwnershipService.calculateBusinessValuation('1');

      expect(valuation).not.toBeNull();
      expect(valuation?.business_id).toBe('1');
      expect(valuation?.current_value).toBe(10000 * 12 * 2.5); // Monthly revenue * 12 months * 2.5 multiple
    });
  });

  describe('getBusinessOwnershipHistory', () => {
    it('should fetch ownership history', async () => {
      const mockHistory = [
        {
          id: '1',
          business_id: 'biz-1',
          transfer_date: '2024-01-01',
          transfer_price: 100000,
        },
      ];

      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockHistory, error: null }),
          }),
        }),
      });

      const history = await businessOwnershipService.getBusinessOwnershipHistory('biz-1');

      expect(history).toEqual(mockHistory);
    });
  });
});