import { useState, useEffect, useCallback, useRef } from 'react';
import { homeRealtimeSyncService, VisitorPosition, ItemUpdate, RoomChangeEvent, ConflictResolution } from '@/services/HomeRealtimeSyncService';
import { useAuth } from '@/contexts/AuthContext';

export interface UseVisitorSyncOptions {
  homeId: string | undefined;
  userName?: string;
  userAvatar?: string;
  enabled?: boolean;
  onRoomChange?: (event: RoomChangeEvent) => void;
  onItemUpdate?: (update: ItemUpdate) => void;
  onConflict?: (resolution: ConflictResolution) => void;
  onVisitorJoin?: (visitor: VisitorPosition) => void;
  onVisitorLeave?: (visitorId: string) => void;
}

export interface UseVisitorSyncReturn {
  visitors: VisitorPosition[];
  visitorCount: number;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  updatePosition: (
    position: { x: number; y: number; z: number },
    rotation: number,
    currentRoom: string,
    status?: 'active' | 'idle' | 'exploring'
  ) => void;
  updateItemPosition: (
    itemId: string,
    roomId: string,
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number },
    scale: number
  ) => void;
  changeRoom: (fromRoom: string, toRoom: string) => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
}

export function useVisitorSync(options: UseVisitorSyncOptions): UseVisitorSyncReturn {
  const {
    homeId,
    userName,
    userAvatar,
    enabled = true,
    onRoomChange,
    onItemUpdate,
    onConflict,
    onVisitorJoin,
    onVisitorLeave,
  } = options;

  const auth = useAuth();
  const userId = auth?.user?.id || 'anonymous_user';
  const displayName = userName || auth?.user?.email?.split('@')[0] || 'Visitor';

  const [visitors, setVisitors] = useState<VisitorPosition[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previousVisitorsRef = useRef<Map<string, VisitorPosition>>(new Map());
  const cleanupRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (!enabled || !homeId) {
      return;
    }

    let isMounted = true;

    const connect = async () => {
      setIsLoading(true);
      setError(null);

      homeRealtimeSyncService.setCurrentUser(userId, displayName, userAvatar);

      const result = await homeRealtimeSyncService.joinHomeSession(homeId);

      if (!isMounted) return;

      if (result.success) {
        setIsConnected(true);
        console.log('[useVisitorSync] Connected to home session:', homeId);
      } else {
        setError(result.error || 'Failed to connect');
        console.error('[useVisitorSync] Connection failed:', result.error);
      }

      setIsLoading(false);
    };

    connect();

    const unsubPosition = homeRealtimeSyncService.onVisitorPositions(homeId, (positions) => {
      if (!isMounted) return;

      const visitorArray = Array.from(positions.values());
      setVisitors(visitorArray);

      const previousMap = previousVisitorsRef.current;
      const currentIds = new Set(positions.keys());
      const previousIds = new Set(previousMap.keys());

      currentIds.forEach((id) => {
        if (!previousIds.has(id) && id !== userId) {
          const visitor = positions.get(id);
          if (visitor && onVisitorJoin) {
            onVisitorJoin(visitor);
          }
        }
      });

      previousIds.forEach((id) => {
        if (!currentIds.has(id) && id !== userId) {
          if (onVisitorLeave) {
            onVisitorLeave(id);
          }
        }
      });

      previousVisitorsRef.current = new Map(positions);
    });
    cleanupRef.current.push(unsubPosition);

    const unsubConnection = homeRealtimeSyncService.onConnectionChange(homeId, (connected) => {
      if (!isMounted) return;
      setIsConnected(connected);
      if (!connected) {
        setError('Connection lost');
      } else {
        setError(null);
      }
    });
    cleanupRef.current.push(unsubConnection);

    if (onRoomChange) {
      const unsubRoom = homeRealtimeSyncService.onRoomChange(homeId, onRoomChange);
      cleanupRef.current.push(unsubRoom);
    }

    if (onItemUpdate) {
      const unsubItem = homeRealtimeSyncService.onItemUpdate(homeId, onItemUpdate);
      cleanupRef.current.push(unsubItem);
    }

    if (onConflict) {
      const unsubConflict = homeRealtimeSyncService.onConflict(homeId, onConflict);
      cleanupRef.current.push(unsubConflict);
    }

    return () => {
      isMounted = false;
      cleanupRef.current.forEach((cleanup) => cleanup());
      cleanupRef.current = [];
      
      if (homeId) {
        homeRealtimeSyncService.leaveHomeSession(homeId);
      }
    };
  }, [homeId, userId, displayName, userAvatar, enabled, onRoomChange, onItemUpdate, onConflict, onVisitorJoin, onVisitorLeave]);

  const updatePosition = useCallback(
    (
      position: { x: number; y: number; z: number },
      rotation: number,
      currentRoom: string,
      status: 'active' | 'idle' | 'exploring' = 'active'
    ) => {
      if (!homeId) return;
      homeRealtimeSyncService.updateVisitorPosition(homeId, position, rotation, currentRoom, status);
    },
    [homeId]
  );

  const updateItemPosition = useCallback(
    (
      itemId: string,
      roomId: string,
      position: { x: number; y: number; z: number },
      rotation: { x: number; y: number; z: number },
      scale: number
    ) => {
      if (!homeId) return;
      homeRealtimeSyncService.updateItemPosition(homeId, itemId, roomId, position, rotation, scale);
    },
    [homeId]
  );

  const changeRoom = useCallback(
    async (fromRoom: string, toRoom: string) => {
      if (!homeId) return;
      await homeRealtimeSyncService.changeRoom(homeId, fromRoom, toRoom);
    },
    [homeId]
  );

  const disconnect = useCallback(async () => {
    if (!homeId) return;
    await homeRealtimeSyncService.leaveHomeSession(homeId);
    setIsConnected(false);
    setVisitors([]);
  }, [homeId]);

  const reconnect = useCallback(async () => {
    if (!homeId) return;

    setIsLoading(true);
    setError(null);

    homeRealtimeSyncService.setCurrentUser(userId, displayName, userAvatar);
    const result = await homeRealtimeSyncService.joinHomeSession(homeId);

    if (result.success) {
      setIsConnected(true);
      setError(null);
    } else {
      setError(result.error || 'Failed to reconnect');
    }

    setIsLoading(false);
  }, [homeId, userId, displayName, userAvatar]);

  return {
    visitors,
    visitorCount: visitors.length,
    isConnected,
    isLoading,
    error,
    updatePosition,
    updateItemPosition,
    changeRoom,
    disconnect,
    reconnect,
  };
}

export function useItemSync(homeId: string | undefined, enabled: boolean = true) {
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, ItemUpdate>>(new Map());
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([]);

  useEffect(() => {
    if (!enabled || !homeId) return;

    const unsubItem = homeRealtimeSyncService.onItemUpdate(homeId, (update) => {
      console.log('[useItemSync] Item updated:', update.itemId);
    });

    const unsubConflict = homeRealtimeSyncService.onConflict(homeId, (resolution) => {
      console.log('[useItemSync] Conflict resolved:', resolution.itemId, resolution.resolution);
      setConflicts((prev) => [...prev, resolution]);
      
      setTimeout(() => {
        setConflicts((prev) => prev.filter((c) => c.itemId !== resolution.itemId));
      }, 5000);
    });

    return () => {
      unsubItem();
      unsubConflict();
    };
  }, [homeId, enabled]);

  const updateItem = useCallback(
    (
      itemId: string,
      roomId: string,
      position: { x: number; y: number; z: number },
      rotation: { x: number; y: number; z: number },
      scale: number
    ) => {
      if (!homeId) return;
      homeRealtimeSyncService.updateItemPosition(homeId, itemId, roomId, position, rotation, scale);
    },
    [homeId]
  );

  const clearConflicts = useCallback(() => {
    setConflicts([]);
  }, []);

  return {
    pendingUpdates,
    conflicts,
    updateItem,
    clearConflicts,
    hasPendingUpdates: pendingUpdates.size > 0,
    hasConflicts: conflicts.length > 0,
  };
}

export default useVisitorSync;
