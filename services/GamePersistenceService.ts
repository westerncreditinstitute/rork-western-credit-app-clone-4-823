import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from '@/types/game';

const GAME_STORAGE_KEY_PREFIX = 'credit_life_simulator_game_';
const ANONYMOUS_STORAGE_KEY = 'credit_life_simulator_game_anonymous';

const MAX_ACTIVITY_LOG_ENTRIES = 100;
const MAX_SCORE_HISTORY_ENTRIES = 50;
const MAX_TRANSACTIONS_ENTRIES = 200;

export class GamePersistenceService {
  private storageKey: string;
  private userId: string | undefined;
  private isAuthenticated: boolean;

  constructor(userId?: string, isAuthenticated: boolean = false) {
    this.userId = userId;
    this.isAuthenticated = isAuthenticated;
    this.storageKey = this.getStorageKey();
    console.log('[GamePersistenceService] Initialized with key:', this.storageKey);
  }

  private getStorageKey(): string {
    if (this.isAuthenticated && this.userId) {
      return `${GAME_STORAGE_KEY_PREFIX}${this.userId}`;
    }
    return ANONYMOUS_STORAGE_KEY;
  }

  updateUser(userId?: string, isAuthenticated: boolean = false): void {
    this.userId = userId;
    this.isAuthenticated = isAuthenticated;
    this.storageKey = this.getStorageKey();
    console.log('[GamePersistenceService] Updated user, new key:', this.storageKey);
  }

  async save(state: GameState): Promise<boolean> {
    try {
      const compressed = this.compressState(state);
      await AsyncStorage.setItem(this.storageKey, compressed);
      console.log('[GamePersistenceService] State saved successfully, key:', this.storageKey);
      return true;
    } catch (error) {
      console.error('[GamePersistenceService] Save failed:', error);
      return false;
    }
  }

  async saveWithRetry(state: GameState, maxRetries: number = 2): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const success = await this.save(state);
      if (success) return true;
      console.log(`[GamePersistenceService] Retry attempt ${attempt}/${maxRetries}`);
      await this.delay(100 * attempt);
    }
    return false;
  }

  async load(): Promise<GameState | null> {
    try {
      const compressed = await AsyncStorage.getItem(this.storageKey);
      if (!compressed) {
        console.log('[GamePersistenceService] No saved state found for key:', this.storageKey);
        return null;
      }
      const state = this.decompressState(compressed);
      console.log('[GamePersistenceService] State loaded successfully, key:', this.storageKey);
      return state;
    } catch (error) {
      console.error('[GamePersistenceService] Load failed:', error);
      return null;
    }
  }

  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(this.storageKey);
      console.log('[GamePersistenceService] State cleared for key:', this.storageKey);
      return true;
    } catch (error) {
      console.error('[GamePersistenceService] Clear failed:', error);
      return false;
    }
  }

  async migrateAnonymousToUser(targetUserId: string): Promise<GameState | null> {
    try {
      const anonymousData = await AsyncStorage.getItem(ANONYMOUS_STORAGE_KEY);
      if (!anonymousData) {
        console.log('[GamePersistenceService] No anonymous data to migrate');
        return null;
      }

      const state = this.decompressState(anonymousData);
      if (!state) return null;

      const userKey = `${GAME_STORAGE_KEY_PREFIX}${targetUserId}`;
      const existingUserData = await AsyncStorage.getItem(userKey);

      if (existingUserData) {
        const existingState = this.decompressState(existingUserData);
        if (existingState && existingState.lastUpdated && state.lastUpdated) {
          if (existingState.lastUpdated > state.lastUpdated) {
            console.log('[GamePersistenceService] Existing user data is newer, skipping migration');
            await AsyncStorage.removeItem(ANONYMOUS_STORAGE_KEY);
            return null;
          }
        }
      }

      const migratedState: GameState = {
        ...state,
        lastUpdated: Date.now(),
      };

      await AsyncStorage.setItem(userKey, this.compressState(migratedState));
      await AsyncStorage.removeItem(ANONYMOUS_STORAGE_KEY);

      console.log('[GamePersistenceService] Successfully migrated anonymous data to user:', targetUserId);
      return migratedState;
    } catch (error) {
      console.error('[GamePersistenceService] Migration failed:', error);
      return null;
    }
  }

  async saveToSpecificKey(state: GameState, key: string): Promise<boolean> {
    try {
      const compressed = this.compressState(state);
      await AsyncStorage.setItem(key, compressed);
      console.log('[GamePersistenceService] State saved to specific key:', key);
      return true;
    } catch (error) {
      console.error('[GamePersistenceService] Save to specific key failed:', error);
      return false;
    }
  }

  async loadFromSpecificKey(key: string): Promise<GameState | null> {
    try {
      const compressed = await AsyncStorage.getItem(key);
      if (!compressed) return null;
      return this.decompressState(compressed);
    } catch (error) {
      console.error('[GamePersistenceService] Load from specific key failed:', error);
      return null;
    }
  }

  async getLastSyncedUser(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('game_last_synced_user');
    } catch {
      return null;
    }
  }

  async setLastSyncedUser(userId: string): Promise<void> {
    try {
      await AsyncStorage.setItem('game_last_synced_user', userId);
    } catch (error) {
      console.error('[GamePersistenceService] Failed to set last synced user:', error);
    }
  }

  private compressState(state: GameState): string {
    const compressedState: GameState = {
      ...state,
      activityLog: state.activityLog.slice(-MAX_ACTIVITY_LOG_ENTRIES),
      scoreHistory: state.scoreHistory.slice(-MAX_SCORE_HISTORY_ENTRIES),
      tokenWallet: {
        ...state.tokenWallet,
        transactions: state.tokenWallet.transactions.slice(0, MAX_TRANSACTIONS_ENTRIES),
      },
      lastUpdated: Date.now(),
    };

    return JSON.stringify(compressedState);
  }

  private decompressState(compressed: string): GameState | null {
    try {
      const parsed = JSON.parse(compressed);
      return parsed as GameState;
    } catch (error) {
      console.error('[GamePersistenceService] Decompress failed:', error);
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStorageKeyForUser(userId: string): string {
    return `${GAME_STORAGE_KEY_PREFIX}${userId}`;
  }

  get currentStorageKey(): string {
    return this.storageKey;
  }

  static async getAllGameKeys(): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys.filter(key => key.startsWith(GAME_STORAGE_KEY_PREFIX) || key === ANONYMOUS_STORAGE_KEY);
    } catch (error) {
      console.error('[GamePersistenceService] Failed to get all game keys:', error);
      return [];
    }
  }

  static async getStorageStats(): Promise<{ keyCount: number; totalSize: number }> {
    try {
      const keys = await this.getAllGameKeys();
      let totalSize = 0;

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }

      return { keyCount: keys.length, totalSize };
    } catch (error) {
      console.error('[GamePersistenceService] Failed to get storage stats:', error);
      return { keyCount: 0, totalSize: 0 };
    }
  }
}

export const createPersistenceService = (userId?: string, isAuthenticated?: boolean): GamePersistenceService => {
  return new GamePersistenceService(userId, isAuthenticated);
};
