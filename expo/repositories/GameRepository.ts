import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from '@/types/game';

const GAME_STORAGE_KEY_PREFIX = 'credit_life_simulator_game_';
const ANONYMOUS_KEY = 'credit_life_simulator_game_anonymous';
const PENDING_SYNC_KEY = 'credit_life_simulator_pending_sync';
const LAST_SYNCED_USER_KEY = 'credit_life_simulator_last_synced_user';
const OPTIMISTIC_UPDATES_KEY = 'credit_life_simulator_optimistic_updates';

interface PendingSyncData {
  state: GameState;
  userId: string;
  timestamp: number;
}

interface SaveOptions {
  userId?: string;
  isAuthenticated: boolean;
  onSaveToDatabase?: (state: GameState) => Promise<void>;
}

interface LoadOptions {
  userId?: string;
  isAuthenticated: boolean;
  remoteState?: Partial<GameState> | null;
  mergeWithInitial: (state: Partial<GameState>) => GameState;
}

export interface OptimisticUpdate<T = unknown> {
  id: string;
  type: string;
  payload: T;
  previousState: GameState;
  timestamp: number;
  status: 'pending' | 'committed' | 'rolled_back';
}

export interface OptimisticOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  rollback?: () => void;
}

export class GameRepository {
  private lastSavedState: string = '';
  private pendingSave: GameState | null = null;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private isMounted: boolean = true;
  private optimisticUpdates: Map<string, OptimisticUpdate> = new Map();
  private onStateChange?: (state: GameState) => void;

  constructor() {
    console.log('[GameRepository] Initialized');
    this.loadPendingOptimisticUpdates();
  }

  setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  private async loadPendingOptimisticUpdates(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(OPTIMISTIC_UPDATES_KEY);
      if (stored) {
        const updates = JSON.parse(stored) as OptimisticUpdate[];
        updates.forEach(update => {
          if (update.status === 'pending') {
            this.optimisticUpdates.set(update.id, update);
          }
        });
        console.log('[GameRepository] Loaded', this.optimisticUpdates.size, 'pending optimistic updates');
      }
    } catch (error) {
      console.log('[GameRepository] Error loading optimistic updates:', error);
    }
  }

  private async persistOptimisticUpdates(): Promise<void> {
    try {
      const updates = Array.from(this.optimisticUpdates.values());
      await AsyncStorage.setItem(OPTIMISTIC_UPDATES_KEY, JSON.stringify(updates));
    } catch (error) {
      console.log('[GameRepository] Error persisting optimistic updates:', error);
    }
  }

  setMounted(mounted: boolean): void {
    this.isMounted = mounted;
  }

  private getStorageKey(userId?: string, isAuthenticated: boolean = false): string {
    if (isAuthenticated && userId) {
      return `${GAME_STORAGE_KEY_PREFIX}${userId}`;
    }
    return ANONYMOUS_KEY;
  }

  async getLocalState(userId?: string, isAuthenticated: boolean = false): Promise<GameState | null> {
    try {
      const storageKey = this.getStorageKey(userId, isAuthenticated);
      console.log('[GameRepository] Loading from local storage with key:', storageKey);
      
      const saved = await AsyncStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as GameState;
        console.log('[GameRepository] Loaded local state, lastUpdated:', parsed.lastUpdated);
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('[GameRepository] Error loading local state:', error);
      return null;
    }
  }

  async saveLocalState(state: GameState, userId?: string, isAuthenticated: boolean = false): Promise<boolean> {
    try {
      const stateToSave = {
        ...state,
        lastUpdated: Date.now(),
      };
      const storageKey = this.getStorageKey(userId, isAuthenticated);
      await AsyncStorage.setItem(storageKey, JSON.stringify(stateToSave));
      console.log('[GameRepository] Saved to local storage:', storageKey, 'lastUpdated:', stateToSave.lastUpdated);
      return true;
    } catch (error) {
      console.error('[GameRepository] Error saving to local storage:', error);
      return false;
    }
  }

  async saveRemoteState(
    state: GameState,
    userId: string,
    saveMutation: (params: { userId: string; gameState: GameState }) => Promise<unknown>,
    retryCount: number = 0
  ): Promise<boolean> {
    const stateString = JSON.stringify(state);
    if (stateString === this.lastSavedState && retryCount === 0) {
      console.log('[GameRepository] State unchanged, skipping remote save');
      return true;
    }

    const maxRetries = 3;
    const baseDelay = 2000;
    const retryDelay = Math.min(baseDelay * Math.pow(2, retryCount), 30000);

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    try {
      console.log('[GameRepository] Saving to remote for user:', userId, retryCount > 0 ? `(retry ${retryCount}/${maxRetries})` : '');
      
      const cleanState = {
        ...state,
        activityLog: (state.activityLog || []).slice(-100),
        scoreHistory: (state.scoreHistory || []).slice(-50),
        pendingIncidents: (state.pendingIncidents || []).slice(-20),
        lastUpdated: Date.now(),
      };
      
      this.pendingSave = state;
      
      await saveMutation({
        userId,
        gameState: cleanState,
      });
      
      this.lastSavedState = stateString;
      this.pendingSave = null;
      await this.clearPendingSync();
      console.log('[GameRepository] Remote save successful');
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('[GameRepository] Remote save failed:', errorMessage);
      
      const lowerError = errorMessage.toLowerCase();
      const isRetryableError = lowerError.includes('fetch') || 
                               lowerError.includes('network') ||
                               lowerError.includes('timeout') ||
                               lowerError.includes('timed out') ||
                               lowerError.includes('request') ||
                               lowerError.includes('connection') ||
                               lowerError.includes('failed to fetch') ||
                               lowerError.includes('aborted') ||
                               lowerError.includes('json parse') || 
                               lowerError.includes('unexpected character') ||
                               lowerError.includes('unexpected token');
      
      await this.markPendingSync(state, userId);
      
      if (isRetryableError && retryCount < maxRetries && this.isMounted) {
        console.log(`[GameRepository] Will retry in ${retryDelay / 1000}s (attempt ${retryCount + 1}/${maxRetries})`);
        this.retryTimeout = setTimeout(() => {
          if (this.isMounted && this.pendingSave) {
            this.saveRemoteState(this.pendingSave, userId, saveMutation, retryCount + 1);
          }
        }, retryDelay);
      }
      
      return false;
    }
  }

  async getGameState(options: LoadOptions): Promise<{ state: GameState | null; source: string }> {
    const { userId, isAuthenticated, remoteState, mergeWithInitial } = options;

    try {
      if (isAuthenticated && userId) {
        const localData = await this.getLocalState(userId, true);
        
        const localTimestamp = localData?.lastUpdated || 0;
        const dbTimestamp = remoteState?.lastUpdated || 0;
        
        console.log('[GameRepository] Comparing timestamps - Local:', localTimestamp, 'DB:', dbTimestamp);
        
        let stateToUse: Partial<GameState> | null = null;
        let source = 'none';
        
        if (localData && remoteState) {
          if (localTimestamp >= dbTimestamp) {
            stateToUse = localData;
            source = 'local (newer)';
          } else {
            stateToUse = remoteState;
            source = 'database (newer)';
          }
        } else if (localData) {
          stateToUse = localData;
          source = 'local (only)';
        } else if (remoteState) {
          stateToUse = remoteState;
          source = 'database (only)';
        }
        
        if (stateToUse) {
          const loadedState = mergeWithInitial(stateToUse);
          this.lastSavedState = JSON.stringify(loadedState);
          
          const storageKey = this.getStorageKey(userId, true);
          await AsyncStorage.setItem(storageKey, JSON.stringify(loadedState));
          await AsyncStorage.setItem(LAST_SYNCED_USER_KEY, userId);
          
          console.log('[GameRepository] Loaded state from:', source);
          return { state: loadedState, source };
        }
        
        return { state: null, source: 'none' };
      } else {
        const localData = await this.getLocalState(undefined, false);
        
        if (localData) {
          const loadedState = mergeWithInitial(localData);
          this.lastSavedState = JSON.stringify(loadedState);
          console.log('[GameRepository] Loaded anonymous state from local storage');
          return { state: loadedState, source: 'local (anonymous)' };
        }
        
        return { state: null, source: 'none' };
      }
    } catch (error) {
      console.error('[GameRepository] Error loading game state:', error);
      return { state: null, source: 'error' };
    }
  }

  async saveGameState(state: GameState, options: SaveOptions): Promise<void> {
    const { userId, isAuthenticated, onSaveToDatabase } = options;

    const localSaveSuccess = await this.saveLocalState(state, userId, isAuthenticated);
    if (!localSaveSuccess) {
      console.error('[GameRepository] Critical: Local storage save failed, retrying...');
      await this.saveLocalState(state, userId, isAuthenticated);
    }

    if (isAuthenticated && userId && onSaveToDatabase) {
      onSaveToDatabase(state).catch(err => {
        console.log('[GameRepository] Database save failed, data safe in local storage:', err);
      });
    }
  }

  async migrateAnonymousDataToUser(targetUserId: string): Promise<GameState | null> {
    try {
      const anonymousData = await AsyncStorage.getItem(ANONYMOUS_KEY);
      if (!anonymousData) {
        console.log('[GameRepository] No anonymous data to migrate');
        return null;
      }
      
      const parsed = JSON.parse(anonymousData) as GameState;
      if (parsed.citySelectionCompleted || parsed.monthsPlayed > 0 || parsed.creditAccounts.length > 0) {
        console.log('[GameRepository] Found anonymous game progress, migrating to user:', targetUserId);
        
        const userStorageKey = `${GAME_STORAGE_KEY_PREFIX}${targetUserId}`;
        await AsyncStorage.setItem(userStorageKey, anonymousData);
        await AsyncStorage.removeItem(ANONYMOUS_KEY);
        
        return parsed;
      }
      
      return null;
    } catch (error) {
      console.error('[GameRepository] Error migrating anonymous data:', error);
      return null;
    }
  }

  async markPendingSync(state: GameState, userId: string): Promise<void> {
    try {
      const pendingData: PendingSyncData = { state, userId, timestamp: Date.now() };
      await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pendingData));
      console.log('[GameRepository] Marked state for pending sync');
    } catch (error) {
      console.log('[GameRepository] Error marking pending sync:', error);
    }
  }

  async clearPendingSync(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PENDING_SYNC_KEY);
    } catch (error) {
      console.log('[GameRepository] Error clearing pending sync:', error);
    }
  }

  async checkPendingSync(userId: string): Promise<PendingSyncData | null> {
    try {
      const pendingData = await AsyncStorage.getItem(PENDING_SYNC_KEY);
      if (pendingData) {
        const parsed = JSON.parse(pendingData) as PendingSyncData;
        const ageInMinutes = (Date.now() - parsed.timestamp) / 1000 / 60;
        
        if (parsed.userId === userId && ageInMinutes < 60) {
          console.log('[GameRepository] Found pending sync from', ageInMinutes.toFixed(1), 'minutes ago');
          return parsed;
        } else {
          await AsyncStorage.removeItem(PENDING_SYNC_KEY);
        }
      }
      return null;
    } catch (error) {
      console.log('[GameRepository] Error checking pending sync:', error);
      return null;
    }
  }

  async saveUserStorageOnLogout(state: GameState, userId: string): Promise<void> {
    try {
      const userStorageKey = `${GAME_STORAGE_KEY_PREFIX}${userId}`;
      const stateToSave = { ...state, lastUpdated: Date.now() };
      await AsyncStorage.setItem(userStorageKey, JSON.stringify(stateToSave));
      console.log('[GameRepository] Saved state to user storage before logout:', userStorageKey);
    } catch (error) {
      console.error('[GameRepository] Error saving state before logout:', error);
    }
  }

  async clearLocalState(userId?: string, isAuthenticated: boolean = false): Promise<void> {
    try {
      const storageKey = this.getStorageKey(userId, isAuthenticated);
      await AsyncStorage.removeItem(storageKey);
      this.lastSavedState = '';
      console.log('[GameRepository] Cleared local state:', storageKey);
    } catch (error) {
      console.error('[GameRepository] Error clearing local state:', error);
    }
  }

  async setLastSyncedUser(userId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_SYNCED_USER_KEY, userId);
    } catch (error) {
      console.log('[GameRepository] Error setting last synced user:', error);
    }
  }

  async getLastSyncedUser(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LAST_SYNCED_USER_KEY);
    } catch (error) {
      console.log('[GameRepository] Error getting last synced user:', error);
      return null;
    }
  }

  clearRetryTimeout(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  resetLastSavedState(): void {
    this.lastSavedState = '';
  }

  shouldSyncToDatabase(source: string): boolean {
    return source === 'local (newer)' || source === 'local (only)' || source === 'migrated';
  }

  cleanup(): void {
    this.clearRetryTimeout();
    this.isMounted = false;
  }

  async executeOptimisticUpdate<T>(
    id: string,
    type: string,
    payload: T,
    currentState: GameState,
    applyUpdate: (state: GameState, payload: T) => GameState,
    syncToServer: (newState: GameState) => Promise<void>
  ): Promise<OptimisticOperationResult<GameState>> {
    const updateId = `${id}_${Date.now()}`;
    const previousState = { ...currentState };
    
    const optimisticUpdate: OptimisticUpdate<T> = {
      id: updateId,
      type,
      payload,
      previousState,
      timestamp: Date.now(),
      status: 'pending',
    };
    
    this.optimisticUpdates.set(updateId, optimisticUpdate as OptimisticUpdate);
    await this.persistOptimisticUpdates();
    
    const newState = applyUpdate(currentState, payload);
    console.log('[GameRepository] Applied optimistic update:', type, updateId);
    
    if (this.onStateChange) {
      this.onStateChange(newState);
    }
    
    await this.saveLocalState(newState, undefined, false);
    
    const rollback = () => {
      console.log('[GameRepository] Rolling back optimistic update:', type, updateId);
      optimisticUpdate.status = 'rolled_back';
      this.optimisticUpdates.delete(updateId);
      this.persistOptimisticUpdates();
      
      if (this.onStateChange) {
        this.onStateChange(previousState);
      }
      
      this.saveLocalState(previousState, undefined, false);
    };
    
    try {
      await syncToServer(newState);
      
      optimisticUpdate.status = 'committed';
      this.optimisticUpdates.delete(updateId);
      await this.persistOptimisticUpdates();
      
      console.log('[GameRepository] Optimistic update committed:', type, updateId);
      
      return {
        success: true,
        data: newState,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('[GameRepository] Optimistic update failed, rolling back:', type, errorMessage);
      
      rollback();
      
      return {
        success: false,
        error: errorMessage,
        rollback,
      };
    }
  }

  async executeOptimisticUpdateWithRetry<T>(
    id: string,
    type: string,
    payload: T,
    currentState: GameState,
    applyUpdate: (state: GameState, payload: T) => GameState,
    syncToServer: (newState: GameState) => Promise<void>,
    options: { maxRetries?: number; retryDelay?: number; rollbackOnFailure?: boolean } = {}
  ): Promise<OptimisticOperationResult<GameState>> {
    const { maxRetries = 3, retryDelay = 2000, rollbackOnFailure = true } = options;
    const updateId = `${id}_${Date.now()}`;
    const previousState = { ...currentState };
    
    const optimisticUpdate: OptimisticUpdate<T> = {
      id: updateId,
      type,
      payload,
      previousState,
      timestamp: Date.now(),
      status: 'pending',
    };
    
    this.optimisticUpdates.set(updateId, optimisticUpdate as OptimisticUpdate);
    await this.persistOptimisticUpdates();
    
    const newState = applyUpdate(currentState, payload);
    console.log('[GameRepository] Applied optimistic update with retry:', type, updateId);
    
    if (this.onStateChange) {
      this.onStateChange(newState);
    }
    
    await this.saveLocalState(newState, undefined, false);
    
    const rollback = () => {
      console.log('[GameRepository] Rolling back optimistic update:', type, updateId);
      optimisticUpdate.status = 'rolled_back';
      this.optimisticUpdates.delete(updateId);
      this.persistOptimisticUpdates();
      
      if (this.onStateChange) {
        this.onStateChange(previousState);
      }
      
      this.saveLocalState(previousState, undefined, false);
    };
    
    let lastError: string = '';
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[GameRepository] Retry attempt ${attempt}/${maxRetries} for:`, type);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
        
        await syncToServer(newState);
        
        optimisticUpdate.status = 'committed';
        this.optimisticUpdates.delete(updateId);
        await this.persistOptimisticUpdates();
        
        console.log('[GameRepository] Optimistic update committed after', attempt, 'retries:', type);
        
        return {
          success: true,
          data: newState,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.log(`[GameRepository] Attempt ${attempt + 1} failed:`, lastError);
      }
    }
    
    console.log('[GameRepository] All retries exhausted for:', type);
    
    if (rollbackOnFailure) {
      rollback();
    } else {
      console.log('[GameRepository] Keeping optimistic state, will retry on next sync');
    }
    
    return {
      success: false,
      error: lastError,
      rollback: rollbackOnFailure ? undefined : rollback,
    };
  }

  getPendingOptimisticUpdates(): OptimisticUpdate[] {
    return Array.from(this.optimisticUpdates.values()).filter(u => u.status === 'pending');
  }

  async replayPendingUpdates(
    currentState: GameState,
    syncToServer: (state: GameState) => Promise<void>
  ): Promise<void> {
    const pendingUpdates = this.getPendingOptimisticUpdates();
    
    if (pendingUpdates.length === 0) {
      console.log('[GameRepository] No pending updates to replay');
      return;
    }
    
    console.log('[GameRepository] Replaying', pendingUpdates.length, 'pending updates');
    
    for (const update of pendingUpdates) {
      try {
        await syncToServer(currentState);
        update.status = 'committed';
        this.optimisticUpdates.delete(update.id);
        console.log('[GameRepository] Replayed update committed:', update.type);
      } catch (error) {
        console.log('[GameRepository] Failed to replay update:', update.type, error);
      }
    }
    
    await this.persistOptimisticUpdates();
  }

  clearAllOptimisticUpdates(): void {
    this.optimisticUpdates.clear();
    AsyncStorage.removeItem(OPTIMISTIC_UPDATES_KEY).catch(console.log);
    console.log('[GameRepository] Cleared all optimistic updates');
  }
}

export const gameRepository = new GameRepository();
