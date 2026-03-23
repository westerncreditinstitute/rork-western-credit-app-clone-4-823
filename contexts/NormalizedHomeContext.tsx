import { useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { useNormalizedHomeState } from '@/hooks/useNormalizedHomeState';
import {
  NormalizedHome,
  NormalizedRoom,
  NormalizedItem,
} from '@/types/normalizedHomeState';
import { InternalHomeData, Position3D, getHomeTierConfig, createDefaultHome } from '@/types/home';

const NORMALIZED_HOME_STORAGE_KEY = 'credit_life_normalized_home';

export const [NormalizedHomeProvider, useNormalizedHome] = createContextHook(() => {
  const auth = useAuth();
  const playerId = auth?.user?.id;

  const normalizedState = useNormalizedHomeState();

  useEffect(() => {
    if (!playerId) return;

    const loadStoredData = async () => {
      try {
        normalizedState.setLoading(true);
        console.log('[NormalizedHomeContext] Loading stored data for player:', playerId);

        const stored = await AsyncStorage.getItem(`${NORMALIZED_HOME_STORAGE_KEY}_${playerId}`);
        if (stored) {
          const homeData = JSON.parse(stored) as InternalHomeData;
          normalizedState.loadHome(homeData);
          console.log('[NormalizedHomeContext] Loaded home:', homeData.homeId);
        }
      } catch (error) {
        console.error('[NormalizedHomeContext] Error loading stored data:', error);
        normalizedState.setError('Failed to load home data');
      } finally {
        normalizedState.setLoading(false);
      }
    };

    loadStoredData();
  }, [playerId, normalizedState]);

  const saveToStorage = useCallback(async () => {
    if (!playerId || !normalizedState.state.activeHomeId) return;

    try {
      const homeData = normalizedState.exportActiveHome();
      if (homeData) {
        await AsyncStorage.setItem(
          `${NORMALIZED_HOME_STORAGE_KEY}_${playerId}`,
          JSON.stringify(homeData)
        );
        console.log('[NormalizedHomeContext] Saved home to storage');
      }
    } catch (error) {
      console.error('[NormalizedHomeContext] Error saving to storage:', error);
    }
  }, [playerId, normalizedState]);

  const createHome = useCallback(async (tier: number = 1): Promise<NormalizedHome | null> => {
    if (!playerId) {
      normalizedState.setError('No player ID available');
      return null;
    }

    try {
      normalizedState.setLoading(true);
      console.log('[NormalizedHomeContext] Creating home tier:', tier);

      const homeData = createDefaultHome(playerId, tier);
      normalizedState.loadHome(homeData);

      await AsyncStorage.setItem(
        `${NORMALIZED_HOME_STORAGE_KEY}_${playerId}`,
        JSON.stringify(homeData)
      );

      return normalizedState.getHomeById(homeData.homeId);
    } catch (error) {
      console.error('[NormalizedHomeContext] Error creating home:', error);
      normalizedState.setError('Failed to create home');
      return null;
    } finally {
      normalizedState.setLoading(false);
    }
  }, [playerId, normalizedState]);

  const createRoom = useCallback((
    homeId: string,
    roomName: string,
    roomType: string,
    options?: {
      position?: Position3D;
      dimensions?: Position3D;
      wallColor?: string;
      floorColor?: string;
      maxItems?: number;
    }
  ): NormalizedRoom | null => {
    const home = normalizedState.getHomeById(homeId);
    if (!home) {
      normalizedState.setError('Home not found');
      return null;
    }

    if (!normalizedState.canAddRoomToHome(homeId)) {
      normalizedState.setError('Maximum rooms reached for this tier');
      return null;
    }

    const tierConfig = getHomeTierConfig(home.homeTier);
    const roomId = `${homeId}_room_${Date.now()}`;

    const room: NormalizedRoom = {
      id: roomId,
      homeId,
      roomName,
      roomType,
      position: options?.position || { x: home.roomIds.length * 12, y: 0, z: 0 },
      dimensions: options?.dimensions || { x: 10, y: 3, z: 10 },
      wallColor: options?.wallColor || '#FFFFFF',
      floorColor: options?.floorColor || '#E0E0E0',
      maxItems: options?.maxItems || Math.floor((tierConfig?.totalMaxItems || 20) / (tierConfig?.maxRooms || 3)),
      itemIds: [],
      doorPositions: [{ x: 5, y: 0, z: 0 }],
      windowPositions: [{ x: 0, y: 1.5, z: 5 }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    normalizedState.addRoom(room);
    console.log('[NormalizedHomeContext] Room created:', roomId);
    return room;
  }, [normalizedState]);

  const placeItem = useCallback((
    roomId: string,
    itemDefinitionId: string,
    itemName: string,
    itemCategory: string,
    position: Position3D,
    options?: {
      rotation?: Position3D;
      scale?: number;
      imageUrl?: string;
    }
  ): NormalizedItem | null => {
    const room = normalizedState.getRoomById(roomId);
    if (!room) {
      normalizedState.setError('Room not found');
      return null;
    }

    if (!normalizedState.canPlaceItemInRoom(roomId)) {
      normalizedState.setError('Room is at maximum capacity');
      return null;
    }

    const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const item: NormalizedItem = {
      id: itemId,
      homeId: room.homeId,
      roomId,
      itemDefinitionId,
      itemName,
      itemCategory,
      itemImageUrl: options?.imageUrl,
      position,
      rotation: options?.rotation || { x: 0, y: 0, z: 0 },
      scale: options?.scale || 1,
      placedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    normalizedState.addItem(item);
    console.log('[NormalizedHomeContext] Item placed:', itemId);
    return item;
  }, [normalizedState]);

  const moveItemToPosition = useCallback((
    itemId: string,
    position: Position3D,
    rotation?: Position3D
  ): boolean => {
    const item = normalizedState.getItemById(itemId);
    if (!item) {
      normalizedState.setError('Item not found');
      return false;
    }

    normalizedState.moveItem(itemId, position, rotation);
    return true;
  }, [normalizedState]);

  const moveItemToRoom = useCallback((
    itemId: string,
    newRoomId: string,
    position?: Position3D
  ): boolean => {
    const item = normalizedState.getItemById(itemId);
    const newRoom = normalizedState.getRoomById(newRoomId);

    if (!item || !newRoom) {
      normalizedState.setError('Item or room not found');
      return false;
    }

    if (!normalizedState.canPlaceItemInRoom(newRoomId)) {
      normalizedState.setError('Target room is at maximum capacity');
      return false;
    }

    normalizedState.removeItem(itemId, item.roomId);

    const movedItem: NormalizedItem = {
      ...item,
      roomId: newRoomId,
      position: position || item.position,
      updatedAt: new Date().toISOString(),
    };

    normalizedState.addItem(movedItem);
    console.log('[NormalizedHomeContext] Item moved to room:', newRoomId);
    return true;
  }, [normalizedState]);

  const deleteItem = useCallback((itemId: string): boolean => {
    const item = normalizedState.getItemById(itemId);
    if (!item) {
      normalizedState.setError('Item not found');
      return false;
    }

    normalizedState.removeItem(itemId, item.roomId);
    console.log('[NormalizedHomeContext] Item deleted:', itemId);
    return true;
  }, [normalizedState]);

  const deleteRoom = useCallback((roomId: string): boolean => {
    const room = normalizedState.getRoomById(roomId);
    if (!room) {
      normalizedState.setError('Room not found');
      return false;
    }

    normalizedState.removeRoom(roomId, room.homeId);
    console.log('[NormalizedHomeContext] Room deleted:', roomId);
    return true;
  }, [normalizedState]);

  const setHomePublic = useCallback((homeId: string, isPublic: boolean): boolean => {
    const home = normalizedState.getHomeById(homeId);
    if (!home) {
      normalizedState.setError('Home not found');
      return false;
    }

    normalizedState.updateHome(homeId, { isPublic });
    console.log('[NormalizedHomeContext] Home visibility updated:', isPublic);
    return true;
  }, [normalizedState]);

  const clearError = useCallback(() => {
    normalizedState.setError(null);
  }, [normalizedState]);

  const reset = useCallback(async () => {
    if (playerId) {
      await AsyncStorage.removeItem(`${NORMALIZED_HOME_STORAGE_KEY}_${playerId}`);
    }
    normalizedState.resetState();
    console.log('[NormalizedHomeContext] State reset');
  }, [playerId, normalizedState]);

  return {
    ...normalizedState,

    createHome,
    createRoom,
    placeItem,
    moveItemToPosition,
    moveItemToRoom,
    deleteItem,
    deleteRoom,
    setHomePublic,
    saveToStorage,
    clearError,
    reset,
  };
});

export function useActiveHomeEditor() {
  const ctx = useNormalizedHome();

  return useMemo(() => ({
    home: ctx.activeHome,
    rooms: ctx.activeHomeRooms,
    items: ctx.activeHomeItems,
    stats: ctx.activeHomeStats,
    tierConfig: ctx.activeHomeTierConfig,

    activeRoom: ctx.activeRoom,
    activeRoomItems: ctx.activeRoomItems,
    activeRoomCapacity: ctx.activeRoomCapacity,

    selectedItem: ctx.selectedItem,

    setActiveRoom: ctx.setActiveRoom,
    selectItem: ctx.selectItem,

    createRoom: (roomName: string, roomType: string, options?: Parameters<typeof ctx.createRoom>[3]) => {
      if (!ctx.state.activeHomeId) return null;
      return ctx.createRoom(ctx.state.activeHomeId, roomName, roomType, options);
    },

    placeItem: (
      itemDefinitionId: string,
      itemName: string,
      itemCategory: string,
      position: Position3D,
      options?: Parameters<typeof ctx.placeItem>[5]
    ) => {
      if (!ctx.state.activeRoomId) return null;
      return ctx.placeItem(ctx.state.activeRoomId, itemDefinitionId, itemName, itemCategory, position, options);
    },

    moveItem: ctx.moveItemToPosition,
    moveItemToRoom: ctx.moveItemToRoom,
    deleteItem: ctx.deleteItem,
    deleteRoom: ctx.deleteRoom,
    save: ctx.saveToStorage,

    isLoading: ctx.state.isLoading,
    error: ctx.state.error,
    clearError: ctx.clearError,
  }), [ctx]);
}

export function useHomeRoomSelector() {
  const ctx = useNormalizedHome();

  return useMemo(() => ({
    rooms: ctx.activeHomeRooms,
    activeRoomId: ctx.state.activeRoomId,
    setActiveRoom: ctx.setActiveRoom,
    getRoomCapacity: ctx.getRoomCapacity,
    getRoomWithItems: ctx.getRoomWithItems,
  }), [ctx]);
}

export function useHomeItemSelector() {
  const ctx = useNormalizedHome();

  return useMemo(() => ({
    items: ctx.activeRoomItems,
    selectedItemId: ctx.state.selectedItemId,
    selectItem: ctx.selectItem,
    getItemById: ctx.getItemById,
    moveItem: ctx.moveItemToPosition,
    deleteItem: ctx.deleteItem,
  }), [ctx]);
}
