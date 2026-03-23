import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  blocked: boolean;
  blockExpiresAt?: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
  violations: number;
  blockedUntil?: number;
}

const STORAGE_KEY = 'wci_rate_limits';

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  chat_message: { maxRequests: 60, windowMs: 60000, blockDurationMs: 300000 },
  report: { maxRequests: 10, windowMs: 3600000, blockDurationMs: 86400000 },
  home_visit: { maxRequests: 30, windowMs: 60000, blockDurationMs: 600000 },
  api_call: { maxRequests: 100, windowMs: 60000, blockDurationMs: 300000 },
  login_attempt: { maxRequests: 5, windowMs: 300000, blockDurationMs: 900000 },
  investment: { maxRequests: 20, windowMs: 60000, blockDurationMs: 300000 },
  profile_update: { maxRequests: 10, windowMs: 60000, blockDurationMs: 60000 },
  broadcast: { maxRequests: 30, windowMs: 1000, blockDurationMs: 60000 },
  position_update: { maxRequests: 10, windowMs: 1000 },
  action: { maxRequests: 20, windowMs: 1000, blockDurationMs: 30000 },
};

const VIOLATION_THRESHOLD = 3;

class RateLimitService {
  private limits: Map<string, RateLimitEntry> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();
  private initialized: boolean = false;

  constructor() {
    Object.entries(DEFAULT_CONFIGS).forEach(([key, config]) => {
      this.configs.set(key, config);
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([key, value]) => {
          this.limits.set(key, value as RateLimitEntry);
        });
        console.log('[RateLimitService] Loaded rate limits from storage');
      }
      this.initialized = true;
    } catch (error) {
      console.error('[RateLimitService] Error loading rate limits:', error);
      this.initialized = true;
    }
  }

  private async persist(): Promise<void> {
    try {
      const data: Record<string, RateLimitEntry> = {};
      this.limits.forEach((value, key) => {
        data[key] = value;
      });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[RateLimitService] Error persisting rate limits:', error);
    }
  }

  setConfig(actionType: string, config: RateLimitConfig): void {
    this.configs.set(actionType, config);
    console.log('[RateLimitService] Config set for:', actionType, config);
  }

  getConfig(actionType: string): RateLimitConfig {
    return this.configs.get(actionType) || DEFAULT_CONFIGS.api_call;
  }

  checkRateLimit(userId: string, actionType: string): RateLimitResult {
    const key = `${userId}:${actionType}`;
    const config = this.getConfig(actionType);
    const now = Date.now();

    let entry = this.limits.get(key);

    if (entry?.blockedUntil && now < entry.blockedUntil) {
      console.log('[RateLimitService] User blocked:', userId, actionType);
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        blocked: true,
        blockExpiresAt: entry.blockedUntil,
      };
    }

    if (!entry || now >= entry.resetAt) {
      entry = {
        count: 1,
        resetAt: now + config.windowMs,
        violations: entry?.violations || 0,
        blockedUntil: undefined,
      };
      this.limits.set(key, entry);
      this.persist();
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: entry.resetAt,
        blocked: false,
      };
    }

    if (entry.count >= config.maxRequests) {
      entry.violations++;
      
      if (entry.violations >= VIOLATION_THRESHOLD && config.blockDurationMs) {
        entry.blockedUntil = now + config.blockDurationMs;
        console.log('[RateLimitService] User blocked due to violations:', userId, actionType);
      }
      
      this.limits.set(key, entry);
      this.persist();

      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        blocked: !!entry.blockedUntil,
        blockExpiresAt: entry.blockedUntil,
      };
    }

    entry.count++;
    this.limits.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetAt: entry.resetAt,
      blocked: false,
    };
  }

  async consumeRateLimit(userId: string, actionType: string): Promise<RateLimitResult> {
    await this.initialize();
    const result = this.checkRateLimit(userId, actionType);
    
    if (!result.allowed) {
      console.log('[RateLimitService] Rate limit exceeded:', userId, actionType, {
        remaining: result.remaining,
        blocked: result.blocked,
      });
    }
    
    return result;
  }

  getRemainingRequests(userId: string, actionType: string): number {
    const key = `${userId}:${actionType}`;
    const config = this.getConfig(actionType);
    const entry = this.limits.get(key);
    const now = Date.now();

    if (!entry || now >= entry.resetAt) {
      return config.maxRequests;
    }

    return Math.max(0, config.maxRequests - entry.count);
  }

  isBlocked(userId: string, actionType: string): boolean {
    const key = `${userId}:${actionType}`;
    const entry = this.limits.get(key);
    const now = Date.now();

    return !!(entry?.blockedUntil && now < entry.blockedUntil);
  }

  getBlockExpiry(userId: string, actionType: string): number | null {
    const key = `${userId}:${actionType}`;
    const entry = this.limits.get(key);
    const now = Date.now();

    if (entry?.blockedUntil && now < entry.blockedUntil) {
      return entry.blockedUntil;
    }
    return null;
  }

  clearUserLimits(userId: string): void {
    const keysToDelete: string[] = [];
    this.limits.forEach((_, key) => {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.limits.delete(key));
    this.persist();
    console.log('[RateLimitService] Cleared limits for user:', userId);
  }

  unblockUser(userId: string, actionType?: string): void {
    if (actionType) {
      const key = `${userId}:${actionType}`;
      const entry = this.limits.get(key);
      if (entry) {
        entry.blockedUntil = undefined;
        entry.violations = 0;
        this.limits.set(key, entry);
      }
    } else {
      this.limits.forEach((entry, key) => {
        if (key.startsWith(`${userId}:`)) {
          entry.blockedUntil = undefined;
          entry.violations = 0;
          this.limits.set(key, entry);
        }
      });
    }
    this.persist();
    console.log('[RateLimitService] Unblocked user:', userId, actionType || 'all');
  }

  getStats(): {
    totalEntries: number;
    blockedUsers: number;
    configuredActions: number;
  } {
    let blockedUsers = 0;
    const now = Date.now();
    
    this.limits.forEach(entry => {
      if (entry.blockedUntil && now < entry.blockedUntil) {
        blockedUsers++;
      }
    });

    return {
      totalEntries: this.limits.size,
      blockedUsers,
      configuredActions: this.configs.size,
    };
  }

  cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.limits.forEach((entry, key) => {
      if (now >= entry.resetAt && (!entry.blockedUntil || now >= entry.blockedUntil)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.limits.delete(key));
    
    if (keysToDelete.length > 0) {
      this.persist();
      console.log('[RateLimitService] Cleaned up', keysToDelete.length, 'expired entries');
    }
  }
}

export const rateLimitService = new RateLimitService();
export default rateLimitService;
