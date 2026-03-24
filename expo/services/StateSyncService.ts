import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  SyncOperation,
  SyncState,
  SyncConflict,
  OptimisticUpdate,
  ConflictResolution,
  StateSyncConfig,
  SyncResult,
  BatchSyncResult,
  SyncEvent,
  SyncEventCallback,
  ReconnectionState,
} from '@/types/sync';

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

class StateSyncService {
  private clientId: string;
  private channels: Map<string, RealtimeChannel> = new Map();
  private syncStates: Map<string, SyncState> = new Map();
  private pendingOperations: Map<string, SyncOperation[]> = new Map();
  private optimisticUpdates: Map<string, OptimisticUpdate[]> = new Map();
  private configs: Map<string, StateSyncConfig> = new Map();
  private eventListeners: Map<string, SyncEventCallback[]> = new Map();
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isOnline: boolean = true;
  private reconnectionStates: Map<string, ReconnectionState> = new Map();

  constructor() {
    this.clientId = generateId();
    console.log('[StateSyncService] Initialized with clientId:', this.clientId);
  }

  registerEntity(
    entityType: string,
    config: Partial<StateSyncConfig> = {}
  ): void {
    const defaultConfig: StateSyncConfig = {
      entityType,
      conflictResolution: { strategy: 'last-write-wins' },
      maxRetries: 3,
      retryDelay: 1000,
      batchSize: 10,
      syncInterval: 5000,
      enableOfflineQueue: true,
    };

    this.configs.set(entityType, { ...defaultConfig, ...config });
    this.pendingOperations.set(entityType, []);
    this.optimisticUpdates.set(entityType, []);
    this.eventListeners.set(entityType, []);

    console.log('[StateSyncService] Registered entity:', entityType);
  }

  async initializeSync<T>(
    entityType: string,
    entityId: string,
    initialData: T
  ): Promise<SyncState<T>> {
    const state: SyncState<T> = {
      data: initialData,
      version: 0,
      lastSyncedAt: Date.now(),
      pendingOperations: [],
      conflicts: [],
      isOnline: this.isOnline,
      isSyncing: false,
    };

    this.syncStates.set(`${entityType}:${entityId}`, state);

    if (isSupabaseConfigured) {
      await this.subscribeToChanges(entityType, entityId);
    }

    console.log('[StateSyncService] Initialized sync for:', entityType, entityId);
    return state;
  }

  private async subscribeToChanges(entityType: string, entityId: string): Promise<void> {
    const channelKey = `${entityType}:${entityId}`;
    
    if (this.channels.has(channelKey)) {
      return;
    }

    const channel = supabase.channel(`sync-${channelKey}`)
      .on('broadcast', { event: 'state_change' }, ({ payload }) => {
        this.handleRemoteChange(entityType, entityId, payload);
      })
      .on('broadcast', { event: 'operation' }, ({ payload }) => {
        this.handleRemoteOperation(entityType, entityId, payload);
      });

    await channel.subscribe((status) => {
      console.log('[StateSyncService] Channel status:', channelKey, status);
      if (status === 'SUBSCRIBED') {
        this.emitEvent(entityType, { type: 'reconnected', entityType, entityId, timestamp: Date.now() });
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        this.emitEvent(entityType, { type: 'disconnected', entityType, entityId, timestamp: Date.now() });
      }
    });

    this.channels.set(channelKey, channel);
  }

  async applyOptimisticUpdate<T>(
    entityType: string,
    entityId: string,
    operation: Omit<SyncOperation<T>, 'id' | 'timestamp' | 'clientId' | 'status' | 'retryCount'>
  ): Promise<OptimisticUpdate<T>> {
    const stateKey = `${entityType}:${entityId}`;
    const state = this.syncStates.get(stateKey) as SyncState<T> | undefined;
    
    if (!state) {
      throw new Error(`State not initialized for ${stateKey}`);
    }

    const previousState = JSON.parse(JSON.stringify(state.data));
    
    const fullOperation: SyncOperation<T> = {
      ...operation,
      id: generateId(),
      timestamp: Date.now(),
      clientId: this.clientId,
      status: 'pending',
      retryCount: 0,
    };

    const optimisticState = this.applyOperationToState(state.data, fullOperation);

    const optimisticUpdate: OptimisticUpdate<T> = {
      id: fullOperation.id,
      previousState,
      optimisticState,
      operation: fullOperation,
      rollback: () => this.rollbackUpdate(entityType, entityId, fullOperation.id),
      commit: () => this.commitUpdate(entityType, entityId, fullOperation.id),
    };

    state.data = optimisticState;
    state.version++;
    state.pendingOperations.push(fullOperation);

    const updates = this.optimisticUpdates.get(entityType) || [];
    updates.push(optimisticUpdate);
    this.optimisticUpdates.set(entityType, updates);

    this.emitEvent(entityType, {
      type: 'operation_queued',
      entityType,
      entityId,
      operation: fullOperation,
      timestamp: Date.now(),
    });

    console.log('[StateSyncService] Applied optimistic update:', fullOperation.id);

    this.syncToServer(entityType, entityId, fullOperation);

    return optimisticUpdate;
  }

  private applyOperationToState<T>(state: T, operation: SyncOperation<T>): T {
    if (Array.isArray(state)) {
      const items = [...state] as T[];
      
      switch (operation.type) {
        case 'create':
          return [...items, operation.payload] as unknown as T;
        case 'update':
          return items.map(item => 
            (item as any).id === operation.entityId ? { ...item, ...operation.payload } : item
          ) as unknown as T;
        case 'delete':
          return items.filter(item => (item as any).id !== operation.entityId) as unknown as T;
        default:
          return state;
      }
    }

    if (typeof state === 'object' && state !== null) {
      switch (operation.type) {
        case 'update':
          return { ...state, ...operation.payload };
        case 'delete':
          return null as unknown as T;
        default:
          return state;
      }
    }

    return state;
  }

  private async syncToServer<T>(
    entityType: string,
    entityId: string,
    operation: SyncOperation<T>
  ): Promise<void> {
    if (!this.isOnline || !isSupabaseConfigured) {
      console.log('[StateSyncService] Offline or not configured, queuing operation');
      this.queueOperation(entityType, operation);
      return;
    }

    const config = this.configs.get(entityType);
    if (!config) return;

    try {
      this.emitEvent(entityType, {
        type: 'operation_sent',
        entityType,
        entityId,
        operation,
        timestamp: Date.now(),
      });

      const result = await this.executeServerOperation(entityType, operation);

      if (result.success) {
        this.confirmOperation(entityType, entityId, operation.id, result.version);
        
        const channel = this.channels.get(`${entityType}:${entityId}`);
        if (channel) {
          await channel.send({
            type: 'broadcast',
            event: 'operation',
            payload: { ...operation, status: 'synced', version: result.version },
          });
        }
      } else if (result.conflicts && result.conflicts.length > 0) {
        await this.handleConflicts(entityType, entityId, result.conflicts);
      } else {
        throw new Error(result.error || 'Unknown sync error');
      }
    } catch (error) {
      console.error('[StateSyncService] Sync error:', error);
      this.handleSyncError(entityType, entityId, operation, error);
    }
  }

  private async executeServerOperation<T>(
    entityType: string,
    operation: SyncOperation<T>
  ): Promise<SyncResult<T>> {
    const tableMap: Record<string, string> = {
      'placed_items': 'placed_items',
      'home': 'player_homes',
      'room': 'room_layouts',
    };

    const tableName = tableMap[entityType] || entityType;

    try {
      switch (operation.type) {
        case 'create': {
          const { data, error } = await supabase
            .from(tableName)
            .insert(this.toSnakeCase(operation.payload as Record<string, any>))
            .select()
            .single();
          
          if (error) throw error;
          return { success: true, data: this.toCamelCase(data) as T, version: Date.now() };
        }
        case 'update': {
          const { data, error } = await supabase
            .from(tableName)
            .update(this.toSnakeCase(operation.payload as Record<string, any>))
            .eq('id', operation.entityId)
            .select()
            .single();
          
          if (error) throw error;
          return { success: true, data: this.toCamelCase(data) as T, version: Date.now() };
        }
        case 'delete': {
          const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', operation.entityId);
          
          if (error) throw error;
          return { success: true, version: Date.now() };
        }
        default:
          return { success: false, error: 'Unknown operation type' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Database operation failed' 
      };
    }
  }

  private toSnakeCase(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = value;
    }
    return result;
  }

  private toCamelCase(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = value;
    }
    return result;
  }

  private confirmOperation(
    entityType: string,
    entityId: string,
    operationId: string,
    serverVersion?: number
  ): void {
    const stateKey = `${entityType}:${entityId}`;
    const state = this.syncStates.get(stateKey);
    
    if (state) {
      state.pendingOperations = state.pendingOperations.filter(op => op.id !== operationId);
      state.lastSyncedAt = Date.now();
      if (serverVersion) {
        state.version = serverVersion;
      }
    }

    const updates = this.optimisticUpdates.get(entityType) || [];
    this.optimisticUpdates.set(
      entityType,
      updates.filter(u => u.id !== operationId)
    );

    this.emitEvent(entityType, {
      type: 'operation_confirmed',
      entityType,
      entityId,
      timestamp: Date.now(),
    });

    console.log('[StateSyncService] Operation confirmed:', operationId);
  }

  private rollbackUpdate(entityType: string, entityId: string, operationId: string): void {
    const stateKey = `${entityType}:${entityId}`;
    const state = this.syncStates.get(stateKey);
    const updates = this.optimisticUpdates.get(entityType) || [];
    
    const update = updates.find(u => u.id === operationId);
    if (update && state) {
      state.data = update.previousState;
      state.pendingOperations = state.pendingOperations.filter(op => op.id !== operationId);
    }

    this.optimisticUpdates.set(
      entityType,
      updates.filter(u => u.id !== operationId)
    );

    console.log('[StateSyncService] Rolled back update:', operationId);
  }

  private commitUpdate(entityType: string, entityId: string, operationId: string): void {
    this.confirmOperation(entityType, entityId, operationId);
  }

  private async handleConflicts<T>(
    entityType: string,
    entityId: string,
    conflicts: SyncConflict<T>[]
  ): Promise<void> {
    const config = this.configs.get(entityType);
    if (!config) return;

    const stateKey = `${entityType}:${entityId}`;
    const state = this.syncStates.get(stateKey);
    if (state) {
      state.conflicts.push(...conflicts);
    }

    for (const conflict of conflicts) {
      this.emitEvent(entityType, {
        type: 'conflict_detected',
        entityType,
        entityId,
        conflict,
        timestamp: Date.now(),
      });

      const resolution = await this.resolveConflict(config.conflictResolution, conflict);
      
      switch (resolution) {
        case 'client':
          await this.syncToServer(entityType, entityId, conflict.operation);
          break;
        case 'server':
          this.rollbackUpdate(entityType, entityId, conflict.operation.id);
          if (state) {
            state.data = conflict.serverState;
          }
          break;
        case 'merge':
          if (config.conflictResolution.merge) {
            const merged = config.conflictResolution.merge(
              conflict.serverState,
              conflict.clientState
            );
            if (state) {
              state.data = merged;
            }
          }
          break;
      }

      conflict.resolved = true;
      conflict.resolution = resolution;

      this.emitEvent(entityType, {
        type: 'conflict_resolved',
        entityType,
        entityId,
        conflict,
        timestamp: Date.now(),
      });
    }
  }

  private async resolveConflict<T>(
    resolution: ConflictResolution<T>,
    conflict: SyncConflict<T>
  ): Promise<'client' | 'server' | 'merge'> {
    switch (resolution.strategy) {
      case 'last-write-wins':
        return 'client';
      case 'first-write-wins':
        return 'server';
      case 'merge':
        return 'merge';
      case 'manual':
        if (resolution.onConflict) {
          return await resolution.onConflict(conflict);
        }
        return 'server';
      default:
        return 'last-write-wins' as any;
    }
  }

  private handleSyncError<T>(
    entityType: string,
    entityId: string,
    operation: SyncOperation<T>,
    error: unknown
  ): void {
    const config = this.configs.get(entityType);
    if (!config) return;

    operation.retryCount++;
    operation.status = 'error';
    operation.error = error instanceof Error ? error.message : 'Unknown error';

    if (operation.retryCount < config.maxRetries) {
      const delay = config.retryDelay * Math.pow(2, operation.retryCount - 1);
      console.log(`[StateSyncService] Retrying operation ${operation.id} in ${delay}ms`);
      
      const timer = setTimeout(() => {
        this.syncToServer(entityType, entityId, operation);
      }, delay);
      
      this.retryTimers.set(operation.id, timer as unknown as NodeJS.Timeout);
    } else {
      this.emitEvent(entityType, {
        type: 'operation_failed',
        entityType,
        entityId,
        operation,
        timestamp: Date.now(),
      });

      this.rollbackUpdate(entityType, entityId, operation.id);
    }
  }

  private queueOperation<T>(entityType: string, operation: SyncOperation<T>): void {
    const config = this.configs.get(entityType);
    if (!config?.enableOfflineQueue) return;

    const operations = this.pendingOperations.get(entityType) || [];
    operations.push(operation);
    this.pendingOperations.set(entityType, operations);

    console.log('[StateSyncService] Queued operation for offline sync:', operation.id);
  }

  private handleRemoteChange(entityType: string, entityId: string, payload: any): void {
    const stateKey = `${entityType}:${entityId}`;
    const state = this.syncStates.get(stateKey);
    
    if (!state) return;

    if (payload.clientId === this.clientId) {
      return;
    }

    const hasPendingForEntity = state.pendingOperations.some(
      op => op.entityId === payload.entityId
    );

    if (hasPendingForEntity) {
      const pendingOp = state.pendingOperations.find(op => op.entityId === payload.entityId);
      if (pendingOp) {
        const conflict: SyncConflict = {
          id: generateId(),
          operation: pendingOp,
          serverState: payload.data,
          clientState: state.data,
          timestamp: Date.now(),
          resolved: false,
        };
        
        this.handleConflicts(entityType, entityId, [conflict]);
      }
    } else {
      state.data = payload.data;
      state.version = payload.version;
      state.lastSyncedAt = Date.now();
    }

    console.log('[StateSyncService] Applied remote change:', payload.entityId);
  }

  private handleRemoteOperation(entityType: string, entityId: string, payload: SyncOperation): void {
    if (payload.clientId === this.clientId) {
      return;
    }

    const stateKey = `${entityType}:${entityId}`;
    const state = this.syncStates.get(stateKey);
    
    if (state) {
      state.data = this.applyOperationToState(state.data, payload);
      state.version = payload.version;
    }

    console.log('[StateSyncService] Applied remote operation:', payload.id);
  }

  async reconcileState(entityType: string, entityId: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    const stateKey = `${entityType}:${entityId}`;
    const state = this.syncStates.get(stateKey);
    
    if (!state) return;

    console.log('[StateSyncService] Reconciling state for:', stateKey);

    const tableMap: Record<string, string> = {
      'placed_items': 'placed_items',
      'home': 'player_homes',
      'room': 'room_layouts',
    };

    const tableName = tableMap[entityType] || entityType;

    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', entityId)
        .single();

      if (error) throw error;

      const serverData = this.toCamelCase(data);

      if (state.pendingOperations.length > 0) {
        let reconciledData = serverData;
        for (const op of state.pendingOperations) {
          reconciledData = this.applyOperationToState(reconciledData, op as SyncOperation<typeof reconciledData>);
        }
        state.data = reconciledData;
      } else {
        state.data = serverData;
      }

      state.lastSyncedAt = Date.now();
      console.log('[StateSyncService] State reconciled successfully');
    } catch (error) {
      console.error('[StateSyncService] Reconciliation error:', error);
      this.emitEvent(entityType, {
        type: 'full_sync_required',
        entityType,
        entityId,
        timestamp: Date.now(),
      });
    }
  }

  async flushPendingOperations(entityType: string): Promise<BatchSyncResult> {
    const operations = this.pendingOperations.get(entityType) || [];
    const result: BatchSyncResult = {
      successful: [],
      failed: [],
      conflicts: [],
    };

    if (operations.length === 0 || !this.isOnline) {
      return result;
    }

    console.log('[StateSyncService] Flushing', operations.length, 'pending operations');

    for (const operation of operations) {
      try {
        const syncResult = await this.executeServerOperation(entityType, operation);
        if (syncResult.success) {
          result.successful.push(operation.id);
          this.confirmOperation(entityType, operation.entityId, operation.id, syncResult.version);
        } else if (syncResult.conflicts) {
          result.conflicts.push(...syncResult.conflicts);
        } else {
          result.failed.push({ id: operation.id, error: syncResult.error || 'Unknown error' });
        }
      } catch (error) {
        result.failed.push({ 
          id: operation.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    this.pendingOperations.set(
      entityType,
      operations.filter(op => !result.successful.includes(op.id))
    );

    return result;
  }

  setOnlineStatus(isOnline: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = isOnline;

    console.log('[StateSyncService] Online status:', isOnline);

    if (isOnline && wasOffline) {
      this.configs.forEach((_, entityType) => {
        this.flushPendingOperations(entityType);
      });
    }
  }

  onSyncEvent(entityType: string, callback: SyncEventCallback): () => void {
    const listeners = this.eventListeners.get(entityType) || [];
    listeners.push(callback);
    this.eventListeners.set(entityType, listeners);

    return () => {
      const current = this.eventListeners.get(entityType) || [];
      this.eventListeners.set(
        entityType,
        current.filter(cb => cb !== callback)
      );
    };
  }

  private emitEvent(entityType: string, event: SyncEvent): void {
    const listeners = this.eventListeners.get(entityType) || [];
    listeners.forEach(callback => callback(event));
  }

  getState<T>(entityType: string, entityId: string): SyncState<T> | undefined {
    return this.syncStates.get(`${entityType}:${entityId}`) as SyncState<T> | undefined;
  }

  getPendingOperations(entityType: string): SyncOperation[] {
    return this.pendingOperations.get(entityType) || [];
  }

  getConflicts<T>(entityType: string, entityId: string): SyncConflict<T>[] {
    const state = this.syncStates.get(`${entityType}:${entityId}`);
    return (state?.conflicts || []) as SyncConflict<T>[];
  }

  async cleanup(entityType: string, entityId: string): Promise<void> {
    const channelKey = `${entityType}:${entityId}`;
    const channel = this.channels.get(channelKey);
    
    if (channel) {
      await supabase.removeChannel(channel);
      this.channels.delete(channelKey);
    }

    this.syncStates.delete(`${entityType}:${entityId}`);
    
    const interval = this.syncIntervals.get(channelKey);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(channelKey);
    }

    console.log('[StateSyncService] Cleaned up:', channelKey);
  }

  async cleanupAll(): Promise<void> {
    for (const [, channel] of this.channels) {
      await supabase.removeChannel(channel);
    }
    
    this.channels.clear();
    this.syncStates.clear();
    this.pendingOperations.clear();
    this.optimisticUpdates.clear();
    
    this.retryTimers.forEach(timer => clearTimeout(timer));
    this.retryTimers.clear();
    
    this.syncIntervals.forEach(interval => clearInterval(interval));
    this.syncIntervals.clear();

    console.log('[StateSyncService] Cleaned up all resources');
  }
}

export const stateSyncService = new StateSyncService();
export default stateSyncService;
