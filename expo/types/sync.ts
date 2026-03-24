export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

export interface SyncOperation<T = unknown> {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  payload: T;
  timestamp: number;
  clientId: string;
  version: number;
  status: SyncStatus;
  retryCount: number;
  error?: string;
}

export interface SyncState<T = unknown> {
  data: T;
  version: number;
  lastSyncedAt: number;
  pendingOperations: SyncOperation[];
  conflicts: SyncConflict[];
  isOnline: boolean;
  isSyncing: boolean;
}

export interface SyncConflict<T = unknown> {
  id: string;
  operation: SyncOperation<T>;
  serverState: T;
  clientState: T;
  timestamp: number;
  resolved: boolean;
  resolution?: 'client' | 'server' | 'merge';
}

export interface OptimisticUpdate<T = unknown> {
  id: string;
  previousState: T;
  optimisticState: T;
  operation: SyncOperation<T>;
  rollback: () => void;
  commit: () => void;
}

export interface ConflictResolution<T = unknown> {
  strategy: 'last-write-wins' | 'first-write-wins' | 'merge' | 'manual';
  merge?: (serverState: T, clientState: T) => T;
  onConflict?: (conflict: SyncConflict<T>) => Promise<'client' | 'server' | 'merge'>;
}

export interface OperationalTransform {
  id: string;
  baseVersion: number;
  operations: TransformOperation[];
  resultVersion: number;
}

export interface TransformOperation {
  type: 'insert' | 'delete' | 'update' | 'move';
  path: string[];
  value?: unknown;
  previousValue?: unknown;
  index?: number;
  fromIndex?: number;
  toIndex?: number;
}

export interface StateSyncConfig {
  entityType: string;
  conflictResolution: ConflictResolution;
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  syncInterval: number;
  enableOfflineQueue: boolean;
}

export interface SyncResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  conflicts?: SyncConflict<T>[];
  version?: number;
}

export interface BatchSyncResult {
  successful: string[];
  failed: { id: string; error: string }[];
  conflicts: SyncConflict[];
}

export interface ReconnectionState {
  lastSyncedVersion: number;
  missedOperations: SyncOperation[];
  requiresFullSync: boolean;
}

export interface ItemSyncPayload {
  id: string;
  homeId: string;
  roomLayoutId: string;
  itemId: string;
  itemName: string;
  itemCategory: string;
  itemImageUrl?: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
}

export interface HomeSyncState extends SyncState<ItemSyncPayload[]> {
  homeId: string;
  visitors: string[];
}

export type SyncEventType = 
  | 'operation_queued'
  | 'operation_sent'
  | 'operation_confirmed'
  | 'operation_failed'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'reconnected'
  | 'disconnected'
  | 'full_sync_required';

export interface SyncEvent {
  type: SyncEventType;
  entityType: string;
  entityId?: string;
  operation?: SyncOperation;
  conflict?: SyncConflict;
  timestamp: number;
}

export type SyncEventCallback = (event: SyncEvent) => void;
