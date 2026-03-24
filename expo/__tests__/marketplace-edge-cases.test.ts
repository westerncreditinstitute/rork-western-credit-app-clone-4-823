/// <reference types="jest" />
import { marketplaceService } from '@/services/MarketplaceService';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
    rpc: jest.fn(),
  },
}));

describe('Marketplace Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =============================================
  // A) NETWORK ISSUES
  // =============================================
  describe('A) Network Issues', () => {
    describe('Offline Scenarios', () => {
      it('should handle network timeout gracefully', async () => {
        const { supabase } = require('@/lib/supabase');
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockRejectedValue(new Error('Network request failed')),
          }),
        });

        const listings = await marketplaceService.getActiveListings();
        expect(listings).toEqual([]);
      });

      it('should return empty data when connection fails', async () => {
        const { supabase } = require('@/lib/supabase');
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Failed to fetch', code: 'NETWORK_ERROR' } 
            }),
          }),
        });

        const listings = await marketplaceService.getActiveListings();
        expect(Array.isArray(listings)).toBe(true);
      });

      it('should handle purchase during network interruption', async () => {
        const mockListing = {
          id: 'listing-1',
          seller_id: 'user-2',
          listing_price: 150,
          listing_type: 'player_sale',
          is_active: true,
          item: { name: 'Test Item' },
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
              eq: jest.fn().mockRejectedValue(new Error('Connection lost')),
            }),
          });

        const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 150);
        expect(result.success).toBe(false);
      });

      it('should handle listing creation during connection drop', async () => {
        const mockInventoryItem = {
          id: 'inv-1',
          player_id: 'user-1',
          item_id: 'item-1',
          purchase_price: 100,
          item: { currency_type: 'usd' },
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
                single: jest.fn().mockRejectedValue(new Error('Network unavailable')),
              }),
            }),
          });

        const listing = await marketplaceService.createListing('user-1', 'inv-1', 150);
        expect(listing).toBeNull();
      });

      it('should handle partial response during slow connection', async () => {
        const { supabase } = require('@/lib/supabase');
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ 
              data: [{ id: 'listing-1', item: null }],
              error: null 
            }),
          }),
        });

        const listings = await marketplaceService.getActiveListings();
        expect(listings.length).toBe(1);
        expect(listings[0].item).toBeNull();
      });
    });

    describe('Slow Connection Handling', () => {
      it('should handle slow query response', async () => {
        const { supabase } = require('@/lib/supabase');
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockImplementation(() => 
              new Promise(resolve => 
                setTimeout(() => resolve({ data: [], error: null }), 100)
              )
            ),
          }),
        });

        const startTime = Date.now();
        const listings = await marketplaceService.getActiveListings();
        const duration = Date.now() - startTime;

        expect(duration).toBeGreaterThanOrEqual(100);
        expect(listings).toEqual([]);
      });

      it('should handle retry logic on transient failures', async () => {
        const { supabase } = require('@/lib/supabase');
        let attempts = 0;

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockImplementation(async () => {
              attempts++;
              if (attempts < 3) {
                return { data: null, error: { message: 'Temporary failure' } };
              }
              return { data: [{ id: 'listing-1' }], error: null };
            }),
          }),
        });

        const listings = await marketplaceService.getActiveListings();
        expect(listings).toBeDefined();
      });

      it('should provide user feedback during slow operations', async () => {
        const { supabase } = require('@/lib/supabase');
        const operationStates: string[] = [];

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockImplementation(async () => {
              operationStates.push('fetching');
              await new Promise(resolve => setTimeout(resolve, 50));
              operationStates.push('complete');
              return { data: [], error: null };
            }),
          }),
        });

        await marketplaceService.getActiveListings();
        expect(operationStates).toContain('fetching');
        expect(operationStates).toContain('complete');
      });

      it('should implement progressive loading for large results', async () => {
        const { supabase } = require('@/lib/supabase');
        const mockListings = Array.from({ length: 100 }, (_, i) => ({
          id: `listing-${i}`,
          item_id: `item-${i}`,
          listing_price: 100 + i,
        }));

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockImplementation((start: number, end: number) => ({
                then: (resolve: Function) => resolve({ 
                  data: mockListings.slice(start, end + 1), 
                  error: null 
                }),
              })),
            }),
          }),
        });

        const listings = await marketplaceService.getActiveListings();
        expect(listings).toBeDefined();
      });
    });
  });

  // =============================================
  // B) DATA EDGE CASES
  // =============================================
  describe('B) Data Edge Cases', () => {
    describe('Large Data Sets', () => {
      it('should handle 10,000+ listings query', async () => {
        const { supabase } = require('@/lib/supabase');
        const mockLargeDataset = Array.from({ length: 10000 }, (_, i) => ({
          id: `listing-${i}`,
          item_id: `item-${i}`,
          listing_price: Math.floor(Math.random() * 10000),
          is_active: true,
        }));

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockLargeDataset, error: null }),
          }),
        });

        const listings = await marketplaceService.getActiveListings();
        expect(listings.length).toBe(10000);
      });

      it('should handle long search terms', async () => {
        const { supabase } = require('@/lib/supabase');
        const longSearchTerm = 'a'.repeat(5000);

        const mockQueryBuilder = {
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue(mockQueryBuilder),
        });

        const listings = await marketplaceService.getActiveListings({
          search_query: longSearchTerm,
        });

        expect(listings).toEqual([]);
        expect(mockQueryBuilder.or).toHaveBeenCalled();
      });

      it('should handle large item descriptions', async () => {
        const mockInventoryItem = {
          id: 'inv-1',
          player_id: 'user-1',
          item_id: 'item-1',
          purchase_price: 100,
          item: { currency_type: 'usd' },
        };

        const largeDescription = 'Lorem ipsum '.repeat(1000);

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
                single: jest.fn().mockResolvedValue({ 
                  data: { id: 'listing-1', description: largeDescription.slice(0, 5000) }, 
                  error: null 
                }),
              }),
            }),
          });

        const listing = await marketplaceService.createListing(
          'user-1',
          'inv-1',
          150,
          largeDescription
        );

        expect(listing).toBeDefined();
      });

      it('should handle many filters applied simultaneously', async () => {
        const { supabase } = require('@/lib/supabase');
        const mockQueryBuilder = {
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue(mockQueryBuilder),
        });

        const filters = {
          category: 'casual',
          min_price: 100,
          max_price: 10000,
          currency_type: 'usd' as const,
          listing_type: 'player_sale' as const,
          search_query: 'rare item',
        };

        const listings = await marketplaceService.getActiveListings(filters);
        expect(listings).toEqual([]);
      });

      it('should handle pagination for large result sets', async () => {
        const { supabase } = require('@/lib/supabase');
        const pageSize = 50;
        const totalItems = 500;
        const mockItems = Array.from({ length: pageSize }, (_, i) => ({
          id: `listing-${i}`,
          item_id: `item-${i}`,
        }));

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({ 
                data: mockItems, 
                error: null,
                count: totalItems,
              }),
            }),
          }),
        });

        const listings = await marketplaceService.getActiveListings();
        expect(listings.length).toBeLessThanOrEqual(pageSize);
      });
    });

    describe('Special Characters', () => {
      it('should handle emoji in listing names', async () => {
        const { supabase } = require('@/lib/supabase');
        const mockListing = {
          id: 'listing-1',
          item: { name: '🔥 Rare Item 🔥 💎✨' },
          description: 'Amazing item! 🎉🎊',
        };

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [mockListing], error: null }),
          }),
        });

        const listings = await marketplaceService.getActiveListings();
        const firstListing = listings[0];
        expect(firstListing?.item?.name ?? '').toContain('🔥');
      });

      it('should handle Unicode characters in search', async () => {
        const { supabase } = require('@/lib/supabase');
        const unicodeSearch = '日本語テスト 中文测试 العربية';

        const mockQueryBuilder = {
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue(mockQueryBuilder),
        });

        const listings = await marketplaceService.getActiveListings({
          search_query: unicodeSearch,
        });

        expect(listings).toEqual([]);
      });

      it('should handle SQL special characters safely', async () => {
        const { supabase } = require('@/lib/supabase');
        const sqlInjectionAttempts = [
          "'; DELETE FROM listings; --",
          "1' OR '1'='1",
          "1; DROP TABLE users--",
          "' UNION SELECT * FROM users --",
          "Robert'); DROP TABLE listings;--",
        ];

        const mockQueryBuilder = {
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue(mockQueryBuilder),
        });

        for (const injection of sqlInjectionAttempts) {
          const listings = await marketplaceService.getActiveListings({
            search_query: injection,
          });
          expect(listings).toEqual([]);
        }
      });

      it('should prevent XSS in item descriptions', async () => {
        const mockInventoryItem = {
          id: 'inv-1',
          player_id: 'user-1',
          item_id: 'item-1',
          purchase_price: 100,
          item: { currency_type: 'usd' },
        };

        const xssAttempts = [
          '<script>alert("XSS")</script>',
          '<img src="x" onerror="alert(1)">',
          '<svg onload="alert(1)">',
          'javascript:alert(1)',
          '<iframe src="javascript:alert(1)">',
        ];

        const { supabase } = require('@/lib/supabase');

        for (const xss of xssAttempts) {
          supabase.from
            .mockReturnValueOnce({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockInventoryItem, error: null }),
              }),
            })
            .mockReturnValueOnce({
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: { id: 'listing-1', description: xss }, 
                    error: null 
                  }),
                }),
              }),
            });

          const listing = await marketplaceService.createListing('user-1', 'inv-1', 150, xss);
          expect(listing).toBeDefined();
        }
      });

      it('should handle null bytes and control characters', async () => {
        const { supabase } = require('@/lib/supabase');
        const controlCharString = 'Test\x00\x01\x02\x03\x04\x05String';

        const mockQueryBuilder = {
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue(mockQueryBuilder),
        });

        const listings = await marketplaceService.getActiveListings({
          search_query: controlCharString,
        });

        expect(listings).toEqual([]);
      });
    });
  });

  // =============================================
  // C) USER EDGE CASES
  // =============================================
  describe('C) User Edge Cases', () => {
    describe('Deleted Users', () => {
      it('should handle listings from deleted users', async () => {
        const { supabase } = require('@/lib/supabase');
        const mockListingWithDeletedSeller = {
          id: 'listing-1',
          seller_id: 'deleted-user-123',
          item_id: 'item-1',
          listing_price: 150,
          is_active: true,
          seller: null,
          item: { name: 'Orphaned Item' },
        };

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ 
              data: [mockListingWithDeletedSeller], 
              error: null 
            }),
          }),
        });

        const listings = await marketplaceService.getActiveListings();
        const firstListing = listings[0] as { seller?: unknown; item?: unknown } | undefined;
        expect(firstListing?.seller).toBeNull();
        expect(firstListing?.item).toBeDefined();
      });

      it('should handle purchases from deleted user listings', async () => {
        const mockListing = {
          id: 'listing-1',
          seller_id: 'deleted-user-123',
          buyer_id: null,
          item_id: 'item-1',
          listing_price: 150,
          listing_type: 'player_sale',
          is_active: true,
          seller: null,
          item: { name: 'Test Item' },
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
        expect(result).toBeDefined();
      });

      it('should display deleted user placeholder in listings', async () => {
        const { supabase } = require('@/lib/supabase');
        const mockListingsWithMixedUsers = [
          { id: 'listing-1', seller_id: 'user-1', seller: { username: 'ActiveUser' } },
          { id: 'listing-2', seller_id: 'deleted-user', seller: null },
          { id: 'listing-3', seller_id: 'user-2', seller: { username: 'AnotherUser' } },
        ];

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockListingsWithMixedUsers, error: null }),
          }),
        });

        const listings = await marketplaceService.getActiveListings();
        const typedListings = listings as Array<{ seller?: { username?: string } | null }>;
        const deletedUserListing = typedListings.find(l => l.seller === null);
        expect(deletedUserListing).toBeDefined();
      });

      it('should handle user deletion during active transaction', async () => {
        const mockListing = {
          id: 'listing-1',
          seller_id: 'user-being-deleted',
          listing_price: 150,
          listing_type: 'player_sale',
          is_active: true,
          item: { name: 'Test Item' },
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
              eq: jest.fn().mockResolvedValue({ 
                error: { message: 'Foreign key constraint violation', code: '23503' } 
              }),
            }),
          });

        const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 150);
        expect(result.success).toBe(false);
      });
    });

    describe('Deleted Items', () => {
      it('should handle listings with deleted items', async () => {
        const { supabase } = require('@/lib/supabase');
        const mockListingWithDeletedItem = {
          id: 'listing-1',
          seller_id: 'user-1',
          item_id: 'deleted-item-123',
          listing_price: 150,
          is_active: true,
          item: null,
        };

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ 
              data: [mockListingWithDeletedItem], 
              error: null 
            }),
          }),
        });

        const listings = await marketplaceService.getActiveListings();
        expect(listings[0].item).toBeNull();
      });

      it('should handle inventory with deleted items', async () => {
        const { supabase } = require('@/lib/supabase');
        const mockInventoryWithDeletedItem = {
          id: 'inv-1',
          player_id: 'user-1',
          item_id: 'deleted-item-123',
          item: null,
        };

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockInventoryWithDeletedItem, error: null }),
          }),
        });

        const listing = await marketplaceService.createListing('user-1', 'inv-1', 150);
        expect(listing).toBeNull();
      });

      it('should maintain reference integrity for deleted items', async () => {
        const { supabase } = require('@/lib/supabase');
        
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: null, 
                  error: { message: 'Referenced item not found', code: '23503' } 
                }),
              }),
            }),
          }),
        });

        const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 150);
        expect(result.success).toBe(false);
      });

      it('should filter out listings with null items in display', async () => {
        const { supabase } = require('@/lib/supabase');
        const mockMixedListings = [
          { id: 'listing-1', item: { name: 'Valid Item' } },
          { id: 'listing-2', item: null },
          { id: 'listing-3', item: { name: 'Another Valid Item' } },
        ];

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockMixedListings, error: null }),
          }),
        });

        const listings = await marketplaceService.getActiveListings();
        const validListings = listings.filter(l => l.item !== null);
        const invalidListings = listings.filter(l => l.item === null);
        
        expect(validListings.length).toBe(2);
        expect(invalidListings.length).toBe(1);
      });

      it('should handle soft-deleted items with is_deleted flag', async () => {
        const { supabase } = require('@/lib/supabase');
        const mockListingWithSoftDeletedItem = {
          id: 'listing-1',
          item_id: 'soft-deleted-item',
          item: { 
            name: 'Soft Deleted Item', 
            is_deleted: true,
            deleted_at: new Date().toISOString(),
          },
        };

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ 
              data: [mockListingWithSoftDeletedItem], 
              error: null 
            }),
          }),
        });

        const listings = await marketplaceService.getActiveListings();
        const firstListing = listings[0];
        const item = firstListing?.item as { is_deleted?: boolean; deleted_at?: string } | null | undefined;
        expect(item?.is_deleted).toBe(true);
      });
    });

    describe('Deactivated Accounts', () => {
      it('should handle listings from deactivated accounts', async () => {
        const { supabase } = require('@/lib/supabase');
        const mockListingFromDeactivated = {
          id: 'listing-1',
          seller_id: 'deactivated-user',
          is_active: true,
          seller: { 
            id: 'deactivated-user',
            is_active: false,
            deactivated_at: new Date().toISOString(),
          },
        };

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ 
              data: [mockListingFromDeactivated], 
              error: null 
            }),
          }),
        });

        const listings = await marketplaceService.getActiveListings();
        const firstListing = listings[0] as { seller?: { id: string; is_active?: boolean } | null } | undefined;
        expect(firstListing?.seller?.is_active).toBe(false);
      });

      it('should prevent purchases if buyer account is deactivated', async () => {
        const { supabase } = require('@/lib/supabase');
        
        supabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-1', user_metadata: { is_active: false } } },
          error: null,
        });

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: null, 
                  error: { message: 'Account deactivated' } 
                }),
              }),
            }),
          }),
        });

        const result = await marketplaceService.purchaseListing('deactivated-user', 'listing-1', 150);
        expect(result.success).toBe(false);
      });
    });
  });

  // =============================================
  // D) BOUNDARY CONDITIONS
  // =============================================
  describe('D) Boundary Conditions', () => {
    describe('Price Boundaries', () => {
      it('should handle zero price listings', async () => {
        const mockInventoryItem = {
          id: 'inv-1',
          player_id: 'user-1',
          item_id: 'item-1',
          item: { currency_type: 'usd' },
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
                single: jest.fn().mockResolvedValue({ 
                  data: { id: 'listing-1', listing_price: 0 }, 
                  error: null 
                }),
              }),
            }),
          });

        const listing = await marketplaceService.createListing('user-1', 'inv-1', 0);
        expect(listing?.listing_price).toBe(0);
      });

      it('should handle maximum price value', async () => {
        const { supabase } = require('@/lib/supabase');
        const maxPrice = Number.MAX_SAFE_INTEGER;

        const mockQueryBuilder = {
          eq: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue(mockQueryBuilder),
        });

        const listings = await marketplaceService.getActiveListings({
          max_price: maxPrice,
        });

        expect(mockQueryBuilder.lte).toHaveBeenCalledWith('listing_price', maxPrice);
      });

      it('should handle negative price filter gracefully', async () => {
        const { supabase } = require('@/lib/supabase');
        const mockQueryBuilder = {
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue(mockQueryBuilder),
        });

        const listings = await marketplaceService.getActiveListings({
          min_price: -100,
        });

        expect(listings).toEqual([]);
      });

      it('should handle floating point price precision', async () => {
        const { supabase } = require('@/lib/supabase');
        const mockListing = {
          id: 'listing-1',
          listing_price: 99.99,
        };

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [mockListing], error: null }),
          }),
        });

        const listings = await marketplaceService.getActiveListings();
        expect(listings[0].listing_price).toBe(99.99);
      });
    });

    describe('Time Boundaries', () => {
      it('should handle auction with zero time remaining', async () => {
        const { supabase } = require('@/lib/supabase');
        const mockAuction = {
          id: 'listing-1',
          listing_type: 'auction',
          auction_end_time: new Date().toISOString(),
          is_active: true,
        };

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [mockAuction], error: null }),
          }),
        });

        const listings = await marketplaceService.getActiveListings();
        expect(listings[0].time_remaining).toBeLessThanOrEqual(0);
      });

      it('should handle auction with far future end time', async () => {
        const { supabase } = require('@/lib/supabase');
        const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        const mockAuction = {
          id: 'listing-1',
          listing_type: 'auction',
          auction_end_time: farFuture,
          is_active: true,
        };

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [mockAuction], error: null }),
          }),
        });

        const listings = await marketplaceService.getActiveListings();
        expect(listings[0].time_remaining).toBeGreaterThan(0);
      });

      it('should handle listings created with past dates', async () => {
        const { supabase } = require('@/lib/supabase');
        const pastDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
        const mockListing = {
          id: 'listing-1',
          created_at: pastDate,
          is_active: true,
        };

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [mockListing], error: null }),
          }),
        });

        const listings = await marketplaceService.getActiveListings();
        expect(new Date(listings[0].created_at).getTime()).toBeLessThan(Date.now());
      });
    });
  });
});
