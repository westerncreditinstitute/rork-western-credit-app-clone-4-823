// Home Cache Service - Caching layer for frequently accessed home data

import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxEntries: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5 minutes
  maxEntries: 100,
};

const CACHE_KEYS = {
  HOMES: 'home_cache_homes',
  ROOMS: 'home_cache_rooms',
  ITEMS: 'home_cache_items',
  PUBLIC_HOMES: 'home_cache_public_homes',
  TIER_CONFIGS: 'home_cache_tier_configs',
} as const;

class HomeCacheServiceClass {
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
  private config: CacheConfig = DEFAULT_CONFIG;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load persisted cache entries into memory
      const keys = Object.values(CACHE_KEYS);
      for (const key of keys) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const entries = JSON.parse(stored) as Record<string, CacheEntry<unknown>>;
          for (const [entryKey, entry] of Object.entries(entries)) {
            if (entry.expiresAt > Date.now()) {
              this.memoryCache.set(entryKey, entry);
            }
          }
        }
      }
      this.initialized = true;
      console.log('[HomeCacheService] Initialized with', this.memoryCache.size, 'entries');
    } catch (error) {
      console.error('[HomeCacheService] Failed to initialize:', error);
      this.initialized = true;
    }
  }

  setConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private getCacheKey(type: string, id: string): string {
    return `${type}:${id}`;
  }

  async get<T>(type: string, id: string): Promise<T | null> {
    const key = this.getCacheKey(type, id);
    const entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      console.log('[HomeCacheService] Cache expired for:', key);
      return null;
    }

    console.log('[HomeCacheService] Cache hit for:', key);
    return entry.data;
  }

  async set<T>(type: string, id: string, data: T, ttl?: number): Promise<void> {
    const key = this.getCacheKey(type, id);
    const effectiveTtl = ttl ?? this.config.ttl;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + effectiveTtl,
    };

    this.memoryCache.set(key, entry);

    // Enforce max entries
    if (this.memoryCache.size > this.config.maxEntries) {
      this.evictOldest();
    }

    console.log('[HomeCacheService] Cached:', key, 'TTL:', effectiveTtl);
  }

  async invalidate(type: string, id: string): Promise<void> {
    const key = this.getCacheKey(type, id);
    this.memoryCache.delete(key);
    console.log('[HomeCacheService] Invalidated:', key);
  }

  async invalidateType(type: string): Promise<void> {
    const keysToDelete: string[] = [];
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(`${type}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.memoryCache.delete(key));
    console.log('[HomeCacheService] Invalidated type:', type, 'Count:', keysToDelete.length);
  }

  async invalidateAll(): Promise<void> {
    this.memoryCache.clear();
    console.log('[HomeCacheService] All cache invalidated');
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      console.log('[HomeCacheService] Evicted oldest entry:', oldestKey);
    }
  }

  async persistToStorage(): Promise<void> {
    try {
      const groupedEntries: Record<string, Record<string, CacheEntry<unknown>>> = {};

      for (const [key, entry] of this.memoryCache.entries()) {
        const [type] = key.split(':');
        const storageKey = `home_cache_${type}`;
        
        if (!groupedEntries[storageKey]) {
          groupedEntries[storageKey] = {};
        }
        groupedEntries[storageKey][key] = entry;
      }

      for (const [storageKey, entries] of Object.entries(groupedEntries)) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(entries));
      }

      console.log('[HomeCacheService] Persisted to storage');
    } catch (error) {
      console.error('[HomeCacheService] Failed to persist:', error);
    }
  }

  getStats(): { size: number; hitRate: number; entries: string[] } {
    return {
      size: this.memoryCache.size,
      hitRate: 0, // Would need to track hits/misses for this
      entries: Array.from(this.memoryCache.keys()),
    };
  }

  // Specialized cache methods for home data
  async cacheHome(homeId: string, data: unknown): Promise<void> {
    await this.set('home', homeId, data, 10 * 60 * 1000); // 10 min TTL
  }

  async getCachedHome<T>(homeId: string): Promise<T | null> {
    return this.get<T>('home', homeId);
  }

  async cacheRooms(homeId: string, rooms: unknown[]): Promise<void> {
    await this.set('rooms', homeId, rooms, 5 * 60 * 1000); // 5 min TTL
  }

  async getCachedRooms<T>(homeId: string): Promise<T[] | null> {
    return this.get<T[]>('rooms', homeId);
  }

  async cacheItems(roomId: string, items: unknown[], page: number): Promise<void> {
    const key = `${roomId}_page_${page}`;
    await this.set('items', key, items, 2 * 60 * 1000); // 2 min TTL
  }

  async getCachedItems<T>(roomId: string, page: number): Promise<T[] | null> {
    const key = `${roomId}_page_${page}`;
    return this.get<T[]>('items', key);
  }

  async cachePublicHomes(page: number, homes: unknown[]): Promise<void> {
    await this.set('publicHomes', `page_${page}`, homes, 2 * 60 * 1000); // 2 min TTL
  }

  async getCachedPublicHomes<T>(page: number): Promise<T[] | null> {
    return this.get<T[]>('publicHomes', `page_${page}`);
  }

  async cacheTierConfigs(configs: unknown[]): Promise<void> {
    await this.set('tierConfigs', 'all', configs, 30 * 60 * 1000); // 30 min TTL
  }

  async getCachedTierConfigs<T>(): Promise<T[] | null> {
    return this.get<T[]>('tierConfigs', 'all');
  }
}

export const HomeCacheService = new HomeCacheServiceClass();

// Prefetch utility for warming the cache
export async function prefetchHomeData(homeId: string, fetchFn: () => Promise<unknown>): Promise<void> {
  const cached = await HomeCacheService.getCachedHome(homeId);
  if (!cached) {
    try {
      const data = await fetchFn();
      await HomeCacheService.cacheHome(homeId, data);
    } catch (error) {
      console.error('[HomeCacheService] Prefetch failed:', error);
    }
  }
}

// Batch prefetch for multiple homes
export async function batchPrefetchHomes(
  homeIds: string[],
  fetchFn: (id: string) => Promise<unknown>
): Promise<void> {
  const uncachedIds: string[] = [];

  for (const id of homeIds) {
    const cached = await HomeCacheService.getCachedHome(id);
    if (!cached) {
      uncachedIds.push(id);
    }
  }

  // Fetch uncached homes in parallel (max 5 concurrent)
  const batchSize = 5;
  for (let i = 0; i < uncachedIds.length; i += batchSize) {
    const batch = uncachedIds.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (id) => {
        try {
          const data = await fetchFn(id);
          await HomeCacheService.cacheHome(id, data);
        } catch (error) {
          console.error('[HomeCacheService] Batch prefetch failed for:', id, error);
        }
      })
    );
  }
}
