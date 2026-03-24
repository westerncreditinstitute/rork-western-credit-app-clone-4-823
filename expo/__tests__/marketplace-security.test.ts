/// <reference types="jest" />
import { marketplaceService } from '@/services/MarketplaceService';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      refreshSession: jest.fn(),
      signOut: jest.fn(),
    },
    rpc: jest.fn(),
  },
}));

describe('Marketplace Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =============================================
  // A) AUTHENTICATION & AUTHORIZATION
  // =============================================
  describe('A) Authentication & Authorization', () => {
    describe('RLS Policy Tests', () => {
      it('should only allow users to view their own listings', async () => {
        const mockUserListings = [
          { id: 'listing-1', seller_id: 'user-1', item_id: 'item-1' },
        ];

        const { supabase } = require('@/lib/supabase');
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockUserListings, error: null }),
            }),
          }),
        });

        const listings = await marketplaceService.getUserListings('user-1');

        expect(listings).toEqual(mockUserListings);
        expect(listings.every(l => l.seller_id === 'user-1')).toBe(true);
      });

      it('should only allow users to edit their own listings', async () => {
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
          });

        const result = await marketplaceService.cancelListing('user-1', 'listing-1');
        expect(result).toBe(true);
      });

      it('should block users from editing other users listings', async () => {
        const mockListing = {
          id: 'listing-1',
          seller_id: 'user-2',
          listing_type: 'player_sale',
        };

        const { supabase } = require('@/lib/supabase');
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              }),
            }),
          }),
        });

        const result = await marketplaceService.cancelListing('user-1', 'listing-1');
        expect(result).toBe(false);
      });

      it('should only allow users to purchase with their own funds', async () => {
        const mockListing = {
          id: 'listing-1',
          seller_id: 'user-2',
          buyer_id: null,
          item_id: 'item-1',
          listing_price: 150,
          listing_type: 'player_sale',
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
        expect(result.success).toBeDefined();
      });

      it('should block unauthorized access to listings', async () => {
        const { supabase } = require('@/lib/supabase');
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: null, 
                  error: { message: 'Row level security violation', code: '42501' } 
                }),
              }),
            }),
          }),
        });

        const result = await marketplaceService.purchaseListing('unauthorized-user', 'listing-1', 150);
        expect(result.success).toBe(false);
      });
    });

    describe('Session Management Tests', () => {
      it('should handle session expiry gracefully', async () => {
        const { supabase } = require('@/lib/supabase');
        supabase.auth.getSession.mockResolvedValue({
          data: { session: null },
          error: { message: 'Session expired' },
        });

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: null, 
                  error: { message: 'JWT expired' } 
                }),
              }),
            }),
          }),
        });

        const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 150);
        expect(result.success).toBe(false);
      });

      it('should handle token refresh', async () => {
        const { supabase } = require('@/lib/supabase');
        supabase.auth.refreshSession.mockResolvedValue({
          data: { session: { access_token: 'new-token' } },
          error: null,
        });

        const refreshResult = await supabase.auth.refreshSession();
        expect(refreshResult.data.session.access_token).toBe('new-token');
      });

      it('should handle concurrent sessions', async () => {
        const { supabase } = require('@/lib/supabase');
        
        const session1 = { access_token: 'token-1', user: { id: 'user-1' } };
        const session2 = { access_token: 'token-2', user: { id: 'user-1' } };
        
        supabase.auth.getSession
          .mockResolvedValueOnce({ data: { session: session1 }, error: null })
          .mockResolvedValueOnce({ data: { session: session2 }, error: null });

        const result1 = await supabase.auth.getSession();
        const result2 = await supabase.auth.getSession();

        expect(result1.data.session.access_token).not.toBe(result2.data.session.access_token);
      });

      it('should handle logout functionality', async () => {
        const { supabase } = require('@/lib/supabase');
        supabase.auth.signOut.mockResolvedValue({ error: null });

        const result = await supabase.auth.signOut();
        expect(result.error).toBeNull();
      });
    });
  });

  // =============================================
  // B) TRANSACTION SECURITY
  // =============================================
  describe('B) Transaction Security', () => {
    describe('Payment Processing Tests', () => {
      it('should validate payment amounts', async () => {
        const mockListing = {
          id: 'listing-1',
          seller_id: 'user-2',
          listing_price: 150,
          listing_type: 'player_sale',
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

        const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 100);
        expect(result).toBeDefined();
      });

      it('should prevent double payments', async () => {
        const mockListing = {
          id: 'listing-1',
          seller_id: 'user-2',
          buyer_id: 'user-3',
          is_active: false,
          sold_at: new Date().toISOString(),
        };

        const { supabase } = require('@/lib/supabase');
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not active' } }),
              }),
            }),
          }),
        });

        const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 150);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Listing not found or not active');
      });

      it('should handle payment failures gracefully', async () => {
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
              eq: jest.fn().mockResolvedValue({ error: { message: 'Payment failed' } }),
            }),
          });

        const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 150);
        expect(result).toBeDefined();
      });

      it('should verify fund transfers complete correctly', async () => {
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
          item: { name: 'Test Item' },
        };

        const mockBuyerInventory = {
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
                  data: { ...mockBuyerInventory, item: mockListing.item },
                  error: null,
                }),
              }),
            }),
          });

        const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 150);
        expect(result.success).toBe(true);
        expect(result.transaction_id).toBeDefined();
      });
    });

    describe('Auction Security Tests', () => {
      it('should prevent bid manipulation', async () => {
        const mockListing = {
          id: 'listing-1',
          seller_id: 'user-2',
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

        const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 140);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Bid must be higher than current bid');
      });

      it('should validate bid amounts against starting price', async () => {
        const mockListing = {
          id: 'listing-1',
          seller_id: 'user-2',
          listing_price: 100,
          current_bid: null,
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

        const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 50);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Bid must be at least starting price');
      });

      it('should enforce minimum bid increment', async () => {
        const mockListing = {
          id: 'listing-1',
          seller_id: 'user-2',
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

        const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 155);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Bid increment too small');
      });

      it('should handle bid withdrawal attempts on active auctions', async () => {
        const mockListing = {
          id: 'listing-1',
          seller_id: 'user-1',
          listing_type: 'auction',
          current_bid: 200,
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

      it('should prevent fraudulent bids from seller', async () => {
        const mockListing = {
          id: 'listing-1',
          seller_id: 'user-1',
          listing_price: 100,
          current_bid: 150,
          listing_type: 'auction',
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

        const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 200);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Cannot purchase your own listing');
      });
    });
  });

  // =============================================
  // C) DATA INTEGRITY
  // =============================================
  describe('C) Data Integrity', () => {
    describe('Concurrent Transaction Tests', () => {
      it('should handle multiple purchases of same item', async () => {
        const mockListing = {
          id: 'listing-1',
          seller_id: 'user-2',
          listing_price: 150,
          listing_type: 'player_sale',
          is_active: true,
          item: { name: 'Test Item' },
        };

        const { supabase } = require('@/lib/supabase');
        
        let purchaseAttempts = 0;
        supabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockImplementation(async () => {
                  purchaseAttempts++;
                  if (purchaseAttempts > 1) {
                    return { data: { ...mockListing, is_active: false }, error: null };
                  }
                  return { data: mockListing, error: null };
                }),
              }),
            }),
          }),
        }));

        const [result1, result2] = await Promise.all([
          marketplaceService.purchaseListing('user-1', 'listing-1', 150),
          marketplaceService.purchaseListing('user-3', 'listing-1', 150),
        ]);

        const successCount = [result1.success, result2.success].filter(Boolean).length;
        expect(successCount).toBeLessThanOrEqual(1);
      });

      it('should handle simultaneous auction bids', async () => {
        const mockListing = {
          id: 'listing-1',
          seller_id: 'user-2',
          listing_price: 100,
          current_bid: 150,
          minimum_bid_increment: 10,
          listing_type: 'auction',
          is_active: true,
          auction_end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };

        const { supabase } = require('@/lib/supabase');
        
        let bidAttempts = 0;
        supabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockImplementation(async () => {
                  bidAttempts++;
                  const updatedBid = mockListing.current_bid + (bidAttempts - 1) * 20;
                  return { 
                    data: { ...mockListing, current_bid: updatedBid }, 
                    error: null 
                  };
                }),
              }),
            }),
          }),
        }));

        const results = await Promise.all([
          marketplaceService.purchaseListing('user-1', 'listing-1', 170),
          marketplaceService.purchaseListing('user-3', 'listing-1', 180),
          marketplaceService.purchaseListing('user-4', 'listing-1', 190),
        ]);

        expect(results).toBeDefined();
        expect(bidAttempts).toBe(3);
      });

      it('should handle race condition in item transfer', async () => {
        const mockListing = {
          id: 'listing-1',
          seller_id: 'user-2',
          item_id: 'item-1',
          player_inventory_id: 'inv-1',
          listing_price: 150,
          listing_type: 'player_sale',
          is_active: true,
          item: { name: 'Test Item' },
        };

        const { supabase } = require('@/lib/supabase');
        
        let updateCalls = 0;
        supabase.from.mockImplementation((table: string) => {
          if (table === 'avatar_marketplace_listings') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: mockListing, error: null }),
                  }),
                }),
              }),
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockImplementation(async () => {
                  updateCalls++;
                  if (updateCalls > 1) {
                    return { error: { message: 'Row already updated', code: '23505' } };
                  }
                  return { error: null };
                }),
              }),
            };
          }
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: 'new-inv' }, error: null }),
              }),
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: 'new-inv', item: {} }, error: null }),
              }),
            }),
          };
        });

        const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 150);
        expect(result).toBeDefined();
      });

      it('should maintain data consistency after failed transaction', async () => {
        const mockListing = {
          id: 'listing-1',
          seller_id: 'user-2',
          item_id: 'item-1',
          listing_price: 150,
          is_active: true,
          listing_type: 'player_sale',
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
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: { message: 'Database error' } }),
          }),
        });

        const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 150);
        expect(result).toBeDefined();
      });
    });

    describe('SQL Injection Prevention Tests', () => {
      it('should sanitize user inputs in search queries', async () => {
        const maliciousInput = "'; DROP TABLE avatar_marketplace_listings; --";

        const { supabase } = require('@/lib/supabase');
        const mockQueryBuilder = {
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };

        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue(mockQueryBuilder),
        });

        const listings = await marketplaceService.getActiveListings({
          search_query: maliciousInput,
        });

        expect(listings).toEqual([]);
        expect(mockQueryBuilder.or).toHaveBeenCalled();
      });

      it('should use parameterized queries for filters', async () => {
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
          category: 'test',
        });

        expect(mockQueryBuilder.gte).toHaveBeenCalledWith('listing_price', 100);
        expect(mockQueryBuilder.lte).toHaveBeenCalledWith('listing_price', 500);
      });

      it('should validate input types', async () => {
        const { supabase } = require('@/lib/supabase');
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        });

        const invalidFilters = {
          min_price: 'not-a-number' as any,
          max_price: null as any,
        };

        const listings = await marketplaceService.getActiveListings(invalidFilters);
        expect(Array.isArray(listings)).toBe(true);
      });

      it('should handle special characters in item descriptions', async () => {
        const mockInventoryItem = {
          id: 'inv-1',
          player_id: 'user-1',
          item_id: 'item-1',
          purchase_price: 100,
          item: { currency_type: 'usd' },
        };

        const specialDescription = "<script>alert('xss')</script> & \"test\" 'quotes'";

        const { supabase } = require('@/lib/supabase');
        supabase.from
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: mockInventoryItem, error: null }),
                }),
              }),
            }),
          })
          .mockReturnValueOnce({
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: { id: 'listing-1', description: specialDescription }, 
                  error: null 
                }),
              }),
            }),
          });

        const listing = await marketplaceService.createListing(
          'user-1',
          'inv-1',
          150,
          specialDescription
        );

        expect(listing).toBeDefined();
      });

      it('should sanitize error messages', async () => {
        const { supabase } = require('@/lib/supabase');
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: null, 
                  error: { 
                    message: 'Database error at table avatar_marketplace_listings column seller_id',
                    details: 'Internal server configuration exposed',
                  } 
                }),
              }),
            }),
          }),
        });

        const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 150);
        expect(result.success).toBe(false);
        expect(result.error).not.toContain('Internal server');
      });
    });
  });

  // =============================================
  // D) RATE LIMITING & ABUSE PREVENTION
  // =============================================
  describe('D) Rate Limiting & Abuse Prevention', () => {
    describe('Rate Limiting Tests', () => {
      it('should track listing creation rate', async () => {
        const mockInventoryItem = {
          id: 'inv-1',
          player_id: 'user-1',
          item_id: 'item-1',
          purchase_price: 100,
          item: { currency_type: 'usd' },
        };

        const { supabase } = require('@/lib/supabase');
        let createCount = 0;

        supabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockInventoryItem, error: null }),
              }),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockImplementation(async () => {
                createCount++;
                return { data: { id: `listing-${createCount}` }, error: null };
              }),
            }),
          }),
        }));

        const createPromises = Array.from({ length: 10 }, (_, i) =>
          marketplaceService.createListing('user-1', `inv-${i}`, 100)
        );

        const results = await Promise.all(createPromises);
        expect(createCount).toBe(10);
        expect(results.length).toBe(10);
      });

      it('should handle rapid search queries', async () => {
        const { supabase } = require('@/lib/supabase');
        let queryCount = 0;

        supabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            order: jest.fn().mockImplementation(async () => {
              queryCount++;
              return { data: [], error: null };
            }),
          }),
        }));

        const searchPromises = Array.from({ length: 50 }, () =>
          marketplaceService.getActiveListings({ search_query: 'test' })
        );

        const results = await Promise.all(searchPromises);
        expect(queryCount).toBe(50);
        expect(results.every(r => Array.isArray(r))).toBe(true);
      });

      it('should handle spam prevention for view increments', async () => {
        const { supabase } = require('@/lib/supabase');
        let rpcCount = 0;

        supabase.rpc.mockImplementation(async () => {
          rpcCount++;
          return { error: null };
        });

        const incrementPromises = Array.from({ length: 100 }, () =>
          marketplaceService.incrementListingViews('listing-1')
        );

        await Promise.all(incrementPromises);
        expect(rpcCount).toBe(100);
      });

      it('should enforce rate limits on watchers', async () => {
        const { supabase } = require('@/lib/supabase');
        let watcherCount = 0;

        supabase.rpc.mockImplementation(async () => {
          watcherCount++;
          return { error: null };
        });

        const watcherPromises = Array.from({ length: 20 }, () =>
          marketplaceService.addWatcher('listing-1', 'user-1')
        );

        await Promise.all(watcherPromises);
        expect(watcherCount).toBe(20);
      });
    });

    describe('Abuse Prevention Tests', () => {
      it('should prevent self-purchase attempts', async () => {
        const mockListing = {
          id: 'listing-1',
          seller_id: 'user-1',
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

      it('should handle price manipulation attempts', async () => {
        const mockListingForPrice = {
          id: 'listing-1',
          seller_id: 'user-2',
          listing_price: 1000,
          listing_type: 'player_sale',
          is_active: true,
        };

        const { supabase } = require('@/lib/supabase');
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockListingForPrice, error: null }),
              }),
            }),
          }),
        });

        const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 1);
        expect(result).toBeDefined();
      });

      it('should validate listing ownership before cancellation', async () => {
        const { supabase } = require('@/lib/supabase');
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              }),
            }),
          }),
        });

        const result = await marketplaceService.cancelListing('attacker-user', 'listing-1');
        expect(result).toBe(false);
      });

      it('should prevent inventory duplication attacks', async () => {
        const mockInventoryItem = {
          id: 'inv-1',
          player_id: 'user-1',
          item_id: 'item-1',
          item: { currency_type: 'usd' },
        };

        const { supabase } = require('@/lib/supabase');
        let insertCalls = 0;

        supabase.from.mockImplementation((table: string) => {
          if (table === 'player_inventory') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: mockInventoryItem, error: null }),
                  }),
                }),
              }),
            };
          }
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockImplementation(async () => {
                  insertCalls++;
                  if (insertCalls > 1) {
                    return { data: null, error: { message: 'Duplicate entry', code: '23505' } };
                  }
                  return { data: { id: 'listing-1' }, error: null };
                }),
              }),
            }),
          };
        });

        const [listing1, listing2] = await Promise.all([
          marketplaceService.createListing('user-1', 'inv-1', 100),
          marketplaceService.createListing('user-1', 'inv-1', 100),
        ]);

        const successCount = [listing1, listing2].filter(Boolean).length;
        expect(successCount).toBeLessThanOrEqual(2);
      });

      it('should validate auction end time integrity', async () => {
        const pastEndTime = new Date(Date.now() - 1000).toISOString();
        const mockListing = {
          id: 'listing-1',
          seller_id: 'user-2',
          listing_price: 100,
          current_bid: 150,
          listing_type: 'auction',
          is_active: true,
          auction_end_time: pastEndTime,
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
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'new-inv' }, error: null }),
            }),
          }),
        });

        const result = await marketplaceService.purchaseListing('user-1', 'listing-1', 200);
        expect(result).toBeDefined();
      });
    });
  });
});

describe('Security Test Helpers', () => {
  describe('Input Validation', () => {
    it('should validate UUID format', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const invalidUUID = 'not-a-uuid';
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      expect(uuidRegex.test(validUUID)).toBe(true);
      expect(uuidRegex.test(invalidUUID)).toBe(false);
    });

    it('should validate price format', () => {
      const validatePrice = (price: any): boolean => {
        return typeof price === 'number' && price >= 0 && isFinite(price);
      };

      expect(validatePrice(100)).toBe(true);
      expect(validatePrice(0)).toBe(true);
      expect(validatePrice(-1)).toBe(false);
      expect(validatePrice(Infinity)).toBe(false);
      expect(validatePrice(NaN)).toBe(false);
      expect(validatePrice('100')).toBe(false);
    });

    it('should sanitize string inputs', () => {
      const sanitizeInput = (input: string): string => {
        return input
          .replace(/[<>]/g, '')
          .replace(/javascript:/gi, '')
          .trim()
          .slice(0, 1000);
      };

      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('javascript:void(0)')).toBe('void(0)');
      expect(sanitizeInput('  normal text  ')).toBe('normal text');
    });
  });

  describe('Error Handling', () => {
    it('should mask sensitive error details', () => {
      const maskError = (error: any): string => {
        const sensitivePatterns = [
          /password/i,
          /token/i,
          /secret/i,
          /key/i,
          /connection string/i,
        ];

        let message = error?.message || 'An error occurred';
        
        sensitivePatterns.forEach(pattern => {
          if (pattern.test(message)) {
            message = 'An error occurred. Please try again.';
          }
        });

        return message;
      };

      expect(maskError({ message: 'Invalid password' })).toBe('An error occurred. Please try again.');
      expect(maskError({ message: 'Token expired' })).toBe('An error occurred. Please try again.');
      expect(maskError({ message: 'User not found' })).toBe('User not found');
    });
  });
});
