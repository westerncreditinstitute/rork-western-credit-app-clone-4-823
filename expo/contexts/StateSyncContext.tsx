import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import createContextHook from '@nkzw/create-context-hook';
import { stateSyncService } from '@/services/StateSyncService';
import {
  SyncEvent,
  OptimisticUpdate,
} from '@/types/sync';
import { PlacedItem, Position3D } from '@/types/home';

interface ItemSyncState {
  items: PlacedItem[];
  version: number;
  lastSyncedAt: number;
  pendingCount: number;
  conflictCount: number;
  isOnline: boolean;
  isSyncing: boolean;
}



export const [StateSyncProvider, useStateSync] = createContextHook(() => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingOperationsCount, setPendingOperationsCount] = useState(0);
  const [conflictsCount, setConflictsCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [homeSyncStates, setHomeSyncStates] = useState<Map<string, ItemSyncState>>(new Map());
  
  const activeHomeId = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    stateSyncService.registerEntity('placed_items', {
      conflictResolution: {
        strategy: 'last-write-wins',
        merge: (serverState: unknown, clientState: unknown) => {
          const serverItems = serverState as PlacedItem[];
          const clientItems = clientState as PlacedItem[];
          const merged = new Map<string, PlacedItem>();
          serverItems.forEach((item: PlacedItem) => merged.set(item.id, item));
          clientItems.forEach((item: PlacedItem) => {
            const existing = merged.get(item.id);
            if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
              merged.set(item.id, item);
            }
          });
          return Array.from(merged.values());
        },
      },
      maxRetries: 3,
      retryDelay: 1000,
      enableOfflineQueue: true,
    });

    return () => {
      stateSyncService.cleanupAll();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: { isConnected: boolean | null }) => {
      const online = state.isConnected ?? true;
      setIsOnline(online);
      stateSyncService.setOnlineStatus(online);
      
      if (online && activeHomeId.current) {
        stateSyncService.flushPendingOperations('placed_items');
      }
      
      console.log('[StateSyncContext] Network status:', online ? 'online' : 'offline');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && activeHomeId.current) {
        console.log('[StateSyncContext] App became active, reconciling state');
        stateSyncService.reconcileState('placed_items', activeHomeId.current);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const updateSyncState = useCallback((homeId: string, updates: Partial<ItemSyncState>) => {
    setHomeSyncStates(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(homeId) || {
        items: [],
        version: 0,
        lastSyncedAt: 0,
        pendingCount: 0,
        conflictCount: 0,
        isOnline: true,
        isSyncing: false,
      };
      newMap.set(homeId, { ...current, ...updates });
      return newMap;
    });
  }, []);

  const initializeHomeSync = useCallback(async (homeId: string, items: PlacedItem[]) => {
    console.log('[StateSyncContext] Initializing sync for home:', homeId);
    
    activeHomeId.current = homeId;

    await stateSyncService.initializeSync('placed_items', homeId, items);

    updateSyncState(homeId, {
      items,
      version: 0,
      lastSyncedAt: Date.now(),
      pendingCount: 0,
      conflictCount: 0,
      isOnline,
      isSyncing: false,
    });

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = stateSyncService.onSyncEvent('placed_items', (event: SyncEvent) => {
      console.log('[StateSyncContext] Sync event:', event.type);
      
      switch (event.type) {
        case 'operation_queued':
          setPendingOperationsCount(prev => prev + 1);
          updateSyncState(homeId, { pendingCount: pendingOperationsCount + 1 });
          break;
        case 'operation_confirmed':
          setPendingOperationsCount(prev => Math.max(0, prev - 1));
          setLastSyncedAt(Date.now());
          updateSyncState(homeId, { 
            pendingCount: Math.max(0, pendingOperationsCount - 1),
            lastSyncedAt: Date.now(),
          });
          break;
        case 'operation_failed':
          setPendingOperationsCount(prev => Math.max(0, prev - 1));
          break;
        case 'conflict_detected':
          setConflictsCount(prev => prev + 1);
          updateSyncState(homeId, { conflictCount: conflictsCount + 1 });
          break;
        case 'conflict_resolved':
          setConflictsCount(prev => Math.max(0, prev - 1));
          updateSyncState(homeId, { conflictCount: Math.max(0, conflictsCount - 1) });
          break;
        case 'disconnected':
          setIsOnline(false);
          updateSyncState(homeId, { isOnline: false });
          break;
        case 'reconnected':
          setIsOnline(true);
          updateSyncState(homeId, { isOnline: true });
          break;
      }
    });
  }, [isOnline, updateSyncState, pendingOperationsCount, conflictsCount]);

  const placeItem = useCallback(async (item: PlacedItem): Promise<OptimisticUpdate<PlacedItem[]>> => {
    if (!activeHomeId.current) {
      throw new Error('Home sync not initialized');
    }

    const homeId = activeHomeId.current;
    const currentState = homeSyncStates.get(homeId);
    const currentItems = currentState?.items || [];

    setIsSyncing(true);
    updateSyncState(homeId, { isSyncing: true });

    try {
      const optimisticUpdate = await stateSyncService.applyOptimisticUpdate<PlacedItem[]>(
        'placed_items',
        homeId,
        {
          type: 'create',
          entityType: 'placed_items',
          entityId: item.id,
          payload: item as any,
          version: (currentState?.version || 0) + 1,
        }
      );

      updateSyncState(homeId, {
        items: [...currentItems, item],
        version: (currentState?.version || 0) + 1,
      });

      console.log('[StateSyncContext] Item placed optimistically:', item.id);
      return optimisticUpdate;
    } finally {
      setIsSyncing(false);
      updateSyncState(homeId, { isSyncing: false });
    }
  }, [homeSyncStates, updateSyncState]);

  const updateItemPosition = useCallback(async (
    itemId: string,
    position: Position3D,
    rotation?: Position3D
  ): Promise<OptimisticUpdate<PlacedItem[]>> => {
    if (!activeHomeId.current) {
      throw new Error('Home sync not initialized');
    }

    const homeId = activeHomeId.current;
    const currentState = homeSyncStates.get(homeId);
    const currentItems = currentState?.items || [];

    const itemIndex = currentItems.findIndex(i => i.id === itemId);
    if (itemIndex === -1) {
      throw new Error('Item not found');
    }

    const updatedItem: PlacedItem = {
      ...currentItems[itemIndex],
      position,
      rotation: rotation || currentItems[itemIndex].rotation,
      updatedAt: new Date().toISOString(),
    };

    setIsSyncing(true);
    updateSyncState(homeId, { isSyncing: true });

    try {
      const optimisticUpdate = await stateSyncService.applyOptimisticUpdate<PlacedItem[]>(
        'placed_items',
        homeId,
        {
          type: 'update',
          entityType: 'placed_items',
          entityId: itemId,
          payload: { position, rotation: rotation || currentItems[itemIndex].rotation } as any,
          version: (currentState?.version || 0) + 1,
        }
      );

      const newItems = [...currentItems];
      newItems[itemIndex] = updatedItem;
      updateSyncState(homeId, {
        items: newItems,
        version: (currentState?.version || 0) + 1,
      });

      console.log('[StateSyncContext] Item position updated optimistically:', itemId);
      return optimisticUpdate;
    } finally {
      setIsSyncing(false);
      updateSyncState(homeId, { isSyncing: false });
    }
  }, [homeSyncStates, updateSyncState]);

  const removeItem = useCallback(async (itemId: string): Promise<OptimisticUpdate<PlacedItem[]>> => {
    if (!activeHomeId.current) {
      throw new Error('Home sync not initialized');
    }

    const homeId = activeHomeId.current;
    const currentState = homeSyncStates.get(homeId);
    const currentItems = currentState?.items || [];

    setIsSyncing(true);
    updateSyncState(homeId, { isSyncing: true });

    try {
      const optimisticUpdate = await stateSyncService.applyOptimisticUpdate<PlacedItem[]>(
        'placed_items',
        homeId,
        {
          type: 'delete',
          entityType: 'placed_items',
          entityId: itemId,
          payload: null as any,
          version: (currentState?.version || 0) + 1,
        }
      );

      updateSyncState(homeId, {
        items: currentItems.filter(i => i.id !== itemId),
        version: (currentState?.version || 0) + 1,
      });

      console.log('[StateSyncContext] Item removed optimistically:', itemId);
      return optimisticUpdate;
    } finally {
      setIsSyncing(false);
      updateSyncState(homeId, { isSyncing: false });
    }
  }, [homeSyncStates, updateSyncState]);

  const getItems = useCallback((homeId: string): PlacedItem[] => {
    return homeSyncStates.get(homeId)?.items || [];
  }, [homeSyncStates]);

  const getSyncState = useCallback((homeId: string): ItemSyncState | null => {
    return homeSyncStates.get(homeId) || null;
  }, [homeSyncStates]);

  const resolveConflict = useCallback((conflictId: string, resolution: 'client' | 'server' | 'merge') => {
    console.log('[StateSyncContext] Resolving conflict:', conflictId, 'with:', resolution);
  }, []);

  const retryFailedOperations = useCallback(async () => {
    console.log('[StateSyncContext] Retrying failed operations');
    await stateSyncService.flushPendingOperations('placed_items');
  }, []);

  const forceSync = useCallback(async (homeId: string) => {
    console.log('[StateSyncContext] Force syncing home:', homeId);
    await stateSyncService.reconcileState('placed_items', homeId);
  }, []);

  const cleanupHomeSync = useCallback(async (homeId: string) => {
    console.log('[StateSyncContext] Cleaning up sync for home:', homeId);
    
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    await stateSyncService.cleanup('placed_items', homeId);
    
    setHomeSyncStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(homeId);
      return newMap;
    });
    
    if (activeHomeId.current === homeId) {
      activeHomeId.current = null;
    }
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingOperationsCount,
    conflictsCount,
    lastSyncedAt,
    initializeHomeSync,
    placeItem,
    updateItemPosition,
    removeItem,
    getItems,
    getSyncState,
    resolveConflict,
    retryFailedOperations,
    forceSync,
    cleanupHomeSync,
  };
});

export function useSyncedItems(homeId: string) {
  const { getItems, getSyncState } = useStateSync();
  
  return useMemo(() => ({
    items: getItems(homeId),
    syncState: getSyncState(homeId),
  }), [getItems, getSyncState, homeId]);
}

export function useSyncStatus() {
  const { isOnline, isSyncing, pendingOperationsCount, conflictsCount, lastSyncedAt } = useStateSync();
  
  return useMemo(() => ({
    isOnline,
    isSyncing,
    pendingCount: pendingOperationsCount,
    conflictCount: conflictsCount,
    lastSyncedAt,
    hasPendingChanges: pendingOperationsCount > 0,
    hasConflicts: conflictsCount > 0,
  }), [isOnline, isSyncing, pendingOperationsCount, conflictsCount, lastSyncedAt]);
}
