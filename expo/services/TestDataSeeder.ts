import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { AvatarItem, MarketplaceListing, PlayerInventory } from '@/types/customization';

export interface TestUser {
  id: string;
  email: string;
  username: string;
  is_test_data: boolean;
}

export interface TestItem extends AvatarItem {
  is_test_data: boolean;
}

export interface TestListing extends MarketplaceListing {
  is_test_data: boolean;
}

export interface TestInventoryItem extends PlayerInventory {
  is_test_data: boolean;
}

export interface SeededTestData {
  testUsers: TestUser[];
  testItems: TestItem[];
  testListings: TestListing[];
  testAuctions: TestListing[];
  testInventory: TestInventoryItem[];
}

export interface SeederConfig {
  userCount?: number;
  itemCount?: number;
  listingCount?: number;
  auctionCount?: number;
  inventoryItemsPerUser?: number;
}

const DEFAULT_CONFIG: Required<SeederConfig> = {
  userCount: 10,
  itemCount: 100,
  listingCount: 50,
  auctionCount: 20,
  inventoryItemsPerUser: 5,
};

const ITEM_TYPES = ['outfit', 'hat', 'accessory', 'shoes', 'glasses', 'hair', 'skin', 'body', 'special'] as const;
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
const CURRENCIES = ['usd', 'muso', 'credits'] as const;
const CONDITIONS = ['new', 'good', 'fair', 'poor', 'damaged'] as const;

class TestDataSeeder {
  private testDataPrefix = 'test_';

  generateUUID(): string {
    return `${this.testDataPrefix}${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  generateTestUsers(count: number): TestUser[] {
    console.log(`[TestDataSeeder] Generating ${count} test users`);
    const users: TestUser[] = [];

    for (let i = 0; i < count; i++) {
      users.push({
        id: this.generateUUID(),
        email: `testuser${i}@test.marketplace.com`,
        username: `TestUser_${i}_${Date.now()}`,
        is_test_data: true,
      });
    }

    return users;
  }

  generateTestItems(count: number): TestItem[] {
    console.log(`[TestDataSeeder] Generating ${count} test items`);
    const items: TestItem[] = [];

    for (let i = 0; i < count; i++) {
      const itemType = ITEM_TYPES[i % ITEM_TYPES.length];
      const rarity = RARITIES[Math.floor(Math.random() * RARITIES.length)];
      const currency = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];

      const rarityMultiplier = {
        common: 1,
        uncommon: 2,
        rare: 5,
        epic: 10,
        legendary: 25,
      };

      const basePrice = Math.floor(Math.random() * 100 + 10) * rarityMultiplier[rarity];

      items.push({
        id: this.generateUUID(),
        name: `Test ${rarity} ${itemType} #${i}`,
        description: `A test ${rarity} ${itemType} for marketplace testing. Item index: ${i}`,
        item_type: itemType,
        category: itemType,
        rarity,
        base_price: basePrice,
        currency_type: currency,
        image_url: `https://picsum.photos/seed/${i}/200/200`,
        model_url: undefined,
        level_requirement: Math.floor(Math.random() * 50),
        credit_score_requirement: Math.floor(Math.random() * 300 + 300),
        is_exclusive: Math.random() > 0.9,
        is_limited: Math.random() > 0.8,
        is_default: false,
        limited_quantity: Math.random() > 0.8 ? Math.floor(Math.random() * 100 + 10) : undefined,
        gender: ['male', 'female', 'unisex'][Math.floor(Math.random() * 3)] as 'male' | 'female' | 'unisex',
        season: ['spring', 'summer', 'fall', 'winter'][Math.floor(Math.random() * 4)],
        tags: [`test`, `${rarity}`, `${itemType}`],
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_test_data: true,
      });
    }

    return items;
  }

  generateTestInventory(
    users: TestUser[],
    items: TestItem[],
    itemsPerUser: number
  ): TestInventoryItem[] {
    console.log(`[TestDataSeeder] Generating inventory for ${users.length} users (${itemsPerUser} items each)`);
    const inventory: TestInventoryItem[] = [];

    for (const user of users) {
      const userItems = this.shuffleArray([...items]).slice(0, itemsPerUser);

      for (const item of userItems) {
        inventory.push({
          id: this.generateUUID(),
          player_id: user.id,
          item_id: item.id,
          purchase_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          purchase_price: item.base_price * (0.8 + Math.random() * 0.4),
          purchase_source: ['business', 'marketplace', 'reward', 'gift', 'achievement'][
            Math.floor(Math.random() * 5)
          ] as 'business' | 'marketplace' | 'reward' | 'gift' | 'achievement',
          business_id: undefined,
          is_equipped: Math.random() > 0.7,
          times_equipped: Math.floor(Math.random() * 20),
          condition_status: CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)],
          wear_percentage: Math.floor(Math.random() * 100),
          custom_color: undefined,
          custom_pattern: undefined,
          notes: 'Test inventory item',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          item: item,
          is_test_data: true,
        });
      }
    }

    return inventory;
  }

  generateTestListings(
    users: TestUser[],
    inventory: TestInventoryItem[],
    count: number
  ): TestListing[] {
    console.log(`[TestDataSeeder] Generating ${count} test listings`);
    const listings: TestListing[] = [];
    const availableInventory = inventory.filter((inv) => !inv.is_equipped);

    for (let i = 0; i < Math.min(count, availableInventory.length); i++) {
      const invItem = availableInventory[i];
      const seller = users.find((u) => u.id === invItem.player_id);

      if (!seller || !invItem.item) continue;

      const listingPrice = invItem.item.base_price * (0.7 + Math.random() * 0.6);

      listings.push({
        id: this.generateUUID(),
        seller_id: seller.id,
        business_id: undefined,
        item_id: invItem.item_id,
        player_inventory_id: invItem.id,
        listing_price: Math.round(listingPrice * 100) / 100,
        currency_type: invItem.item.currency_type,
        listing_type: 'player_sale',
        auction_end_time: undefined,
        is_active: true,
        views_count: Math.floor(Math.random() * 500),
        watchers_count: Math.floor(Math.random() * 50),
        current_bid: undefined,
        current_bidder_id: undefined,
        minimum_bid_increment: undefined,
        buy_it_now_price: undefined,
        description: `Selling my ${invItem.item.rarity} ${invItem.item.name}. Condition: ${invItem.condition_status}`,
        created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        sold_at: undefined,
        buyer_id: undefined,
        final_price: undefined,
        item: invItem.item,
        seller: {
          id: seller.id,
          username: seller.username,
          is_active: true,
        },
        seller_name: seller.username,
        inventory_item: invItem,
        is_test_data: true,
      });
    }

    return listings;
  }

  generateTestAuctions(
    users: TestUser[],
    inventory: TestInventoryItem[],
    count: number
  ): TestListing[] {
    console.log(`[TestDataSeeder] Generating ${count} test auctions`);
    const auctions: TestListing[] = [];
    const availableInventory = inventory.filter((inv) => !inv.is_equipped);
    const shuffled = this.shuffleArray([...availableInventory]);

    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      const invItem = shuffled[i];
      const seller = users.find((u) => u.id === invItem.player_id);

      if (!seller || !invItem.item) continue;

      const startingPrice = invItem.item.base_price * (0.5 + Math.random() * 0.3);
      const auctionDurationHours = [1, 6, 12, 24, 48, 72][Math.floor(Math.random() * 6)];
      const auctionEndTime = new Date(Date.now() + auctionDurationHours * 60 * 60 * 1000);

      const hasBids = Math.random() > 0.3;
      const bidCount = hasBids ? Math.floor(Math.random() * 10 + 1) : 0;
      const currentBid = hasBids
        ? startingPrice * (1 + bidCount * 0.1)
        : undefined;
      const otherUsers = users.filter((u) => u.id !== seller.id);
      const currentBidder = hasBids && otherUsers.length > 0
        ? otherUsers[Math.floor(Math.random() * otherUsers.length)]
        : undefined;

      auctions.push({
        id: this.generateUUID(),
        seller_id: seller.id,
        business_id: undefined,
        item_id: invItem.item_id,
        player_inventory_id: invItem.id,
        listing_price: Math.round(startingPrice * 100) / 100,
        currency_type: invItem.item.currency_type,
        listing_type: 'auction',
        auction_end_time: auctionEndTime.toISOString(),
        is_active: true,
        views_count: Math.floor(Math.random() * 1000),
        watchers_count: Math.floor(Math.random() * 100),
        current_bid: currentBid ? Math.round(currentBid * 100) / 100 : undefined,
        current_bidder_id: currentBidder?.id,
        minimum_bid_increment: Math.round(startingPrice * 0.05 * 100) / 100,
        buy_it_now_price: Math.random() > 0.5 ? Math.round(startingPrice * 2 * 100) / 100 : undefined,
        description: `Auction: ${invItem.item.rarity} ${invItem.item.name}. Starting bid: ${startingPrice.toFixed(2)}`,
        created_at: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        sold_at: undefined,
        buyer_id: undefined,
        final_price: undefined,
        item: invItem.item,
        seller: {
          id: seller.id,
          username: seller.username,
          is_active: true,
        },
        seller_name: seller.username,
        inventory_item: invItem,
        time_remaining: Math.floor((auctionEndTime.getTime() - Date.now()) / 1000),
        is_test_data: true,
      });
    }

    return auctions;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async seedTestMarketplace(config: SeederConfig = {}): Promise<SeededTestData> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    console.log('[TestDataSeeder] Starting marketplace seeding with config:', finalConfig);

    const testUsers = this.generateTestUsers(finalConfig.userCount);
    const testItems = this.generateTestItems(finalConfig.itemCount);
    const testInventory = this.generateTestInventory(
      testUsers,
      testItems,
      finalConfig.inventoryItemsPerUser
    );
    const testListings = this.generateTestListings(
      testUsers,
      testInventory,
      finalConfig.listingCount
    );
    const testAuctions = this.generateTestAuctions(
      testUsers,
      testInventory,
      finalConfig.auctionCount
    );

    console.log('[TestDataSeeder] Generated test data:', {
      users: testUsers.length,
      items: testItems.length,
      inventory: testInventory.length,
      listings: testListings.length,
      auctions: testAuctions.length,
    });

    return {
      testUsers,
      testItems,
      testListings,
      testAuctions,
      testInventory,
    };
  }

  async persistTestData(data: SeededTestData): Promise<boolean> {
    if (!isSupabaseConfigured) {
      console.warn('[TestDataSeeder] Supabase not configured, skipping persistence');
      return false;
    }

    try {
      console.log('[TestDataSeeder] Persisting test data to database...');

      const { error: itemsError } = await supabase
        .from('avatar_items')
        .insert(data.testItems.map(({ is_test_data, ...item }) => ({
          ...item,
          metadata: { is_test_data: true },
        })));

      if (itemsError) {
        console.error('[TestDataSeeder] Error inserting items:', itemsError);
        return false;
      }

      const { error: inventoryError } = await supabase
        .from('player_inventory')
        .insert(data.testInventory.map(({ is_test_data, item, ...inv }) => ({
          ...inv,
          metadata: { is_test_data: true },
        })));

      if (inventoryError) {
        console.error('[TestDataSeeder] Error inserting inventory:', inventoryError);
        return false;
      }

      const allListings = [...data.testListings, ...data.testAuctions];
      const { error: listingsError } = await supabase
        .from('avatar_marketplace_listings')
        .insert(allListings.map(({ is_test_data, item, seller, inventory_item, time_remaining, seller_name, ...listing }) => ({
          ...listing,
          metadata: { is_test_data: true },
        })));

      if (listingsError) {
        console.error('[TestDataSeeder] Error inserting listings:', listingsError);
        return false;
      }

      console.log('[TestDataSeeder] Test data persisted successfully');
      return true;
    } catch (error) {
      console.error('[TestDataSeeder] Error persisting test data:', error);
      return false;
    }
  }

  async cleanupTestData(): Promise<{ success: boolean; deletedCounts: Record<string, number> }> {
    if (!isSupabaseConfigured) {
      console.warn('[TestDataSeeder] Supabase not configured, skipping cleanup');
      return { success: false, deletedCounts: {} };
    }

    const deletedCounts: Record<string, number> = {};

    try {
      console.log('[TestDataSeeder] Starting test data cleanup...');

      const { data: listings, error: listingsQueryError } = await supabase
        .from('avatar_marketplace_listings')
        .select('id')
        .contains('metadata', { is_test_data: true });

      if (!listingsQueryError && listings) {
        const { error: listingsDeleteError } = await supabase
          .from('avatar_marketplace_listings')
          .delete()
          .contains('metadata', { is_test_data: true });

        if (!listingsDeleteError) {
          deletedCounts.listings = listings.length;
        }
      }

      const { data: inventory, error: inventoryQueryError } = await supabase
        .from('player_inventory')
        .select('id')
        .contains('metadata', { is_test_data: true });

      if (!inventoryQueryError && inventory) {
        const { error: inventoryDeleteError } = await supabase
          .from('player_inventory')
          .delete()
          .contains('metadata', { is_test_data: true });

        if (!inventoryDeleteError) {
          deletedCounts.inventory = inventory.length;
        }
      }

      const { data: items, error: itemsQueryError } = await supabase
        .from('avatar_items')
        .select('id')
        .contains('metadata', { is_test_data: true });

      if (!itemsQueryError && items) {
        const { error: itemsDeleteError } = await supabase
          .from('avatar_items')
          .delete()
          .contains('metadata', { is_test_data: true });

        if (!itemsDeleteError) {
          deletedCounts.items = items.length;
        }
      }

      console.log('[TestDataSeeder] Cleanup complete:', deletedCounts);
      return { success: true, deletedCounts };
    } catch (error) {
      console.error('[TestDataSeeder] Error during cleanup:', error);
      return { success: false, deletedCounts };
    }
  }

  async cleanupByPrefix(): Promise<{ success: boolean; deletedCounts: Record<string, number> }> {
    if (!isSupabaseConfigured) {
      console.warn('[TestDataSeeder] Supabase not configured, skipping cleanup');
      return { success: false, deletedCounts: {} };
    }

    const deletedCounts: Record<string, number> = {};

    try {
      console.log('[TestDataSeeder] Starting prefix-based cleanup...');

      const { data: listings, error: listingsError } = await supabase
        .from('avatar_marketplace_listings')
        .delete()
        .like('id', `${this.testDataPrefix}%`)
        .select('id');

      if (!listingsError && listings) {
        deletedCounts.listings = listings.length;
      }

      const { data: inventory, error: inventoryError } = await supabase
        .from('player_inventory')
        .delete()
        .like('id', `${this.testDataPrefix}%`)
        .select('id');

      if (!inventoryError && inventory) {
        deletedCounts.inventory = inventory.length;
      }

      const { data: items, error: itemsError } = await supabase
        .from('avatar_items')
        .delete()
        .like('id', `${this.testDataPrefix}%`)
        .select('id');

      if (!itemsError && items) {
        deletedCounts.items = items.length;
      }

      console.log('[TestDataSeeder] Prefix cleanup complete:', deletedCounts);
      return { success: true, deletedCounts };
    } catch (error) {
      console.error('[TestDataSeeder] Error during prefix cleanup:', error);
      return { success: false, deletedCounts };
    }
  }

  getMockData(config: SeederConfig = {}): SeededTestData {
    return {
      testUsers: this.generateTestUsers(config.userCount || 10),
      testItems: this.generateTestItems(config.itemCount || 100),
      testInventory: [],
      testListings: [],
      testAuctions: [],
    };
  }
}

export const testDataSeeder = new TestDataSeeder();
