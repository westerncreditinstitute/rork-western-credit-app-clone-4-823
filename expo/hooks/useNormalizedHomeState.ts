import { useReducer, useCallback, useMemo } from 'react';
import {
  NormalizedHomeState,
  initialNormalizedState,
  NormalizedHome,
  NormalizedRoom,
  NormalizedItem,
  normalizeHomeData,
  denormalizeHomeData,
} from '@/types/normalizedHomeState';
import { homeStateReducer } from '@/utils/homeStateReducer';
import * as selectors from '@/utils/homeStateSelectors';
import { InternalHomeData, Position3D } from '@/types/home';

export function useNormalizedHomeState(initialState?: Partial<NormalizedHomeState>) {
  const [state, dispatch] = useReducer(
    homeStateReducer,
    { ...initialNormalizedState, ...initialState }
  );

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const loadHome = useCallback((homeData: InternalHomeData) => {
    console.log('[NormalizedHomeState] Loading home:', homeData.homeId);
    const normalized = normalizeHomeData(homeData);
    dispatch({ type: 'LOAD_HOME', payload: normalized });
  }, []);

  const loadHomes = useCallback((homesData: InternalHomeData[]) => {
    console.log('[NormalizedHomeState] Loading homes:', homesData.length);
    const allHomes: NormalizedHome[] = [];
    const allRooms: NormalizedRoom[] = [];
    const allItems: NormalizedItem[] = [];

    homesData.forEach(homeData => {
      const { home, rooms, items } = normalizeHomeData(homeData);
      allHomes.push(home);
      allRooms.push(...rooms);
      allItems.push(...items);
    });

    dispatch({ type: 'LOAD_HOMES', payload: { homes: allHomes, rooms: allRooms, items: allItems } });
  }, []);

  const addHome = useCallback((home: NormalizedHome) => {
    console.log('[NormalizedHomeState] Adding home:', home.id);
    dispatch({ type: 'ADD_HOME', payload: home });
  }, []);

  const updateHome = useCallback((id: string, updates: Partial<NormalizedHome>) => {
    console.log('[NormalizedHomeState] Updating home:', id);
    dispatch({ type: 'UPDATE_HOME', payload: { id, updates } });
  }, []);

  const removeHome = useCallback((homeId: string) => {
    console.log('[NormalizedHomeState] Removing home:', homeId);
    dispatch({ type: 'REMOVE_HOME', payload: homeId });
  }, []);

  const setActiveHome = useCallback((homeId: string | null) => {
    console.log('[NormalizedHomeState] Setting active home:', homeId);
    dispatch({ type: 'SET_ACTIVE_HOME', payload: homeId });
  }, []);

  const addRoom = useCallback((room: NormalizedRoom) => {
    console.log('[NormalizedHomeState] Adding room:', room.id);
    dispatch({ type: 'ADD_ROOM', payload: room });
  }, []);

  const updateRoom = useCallback((id: string, updates: Partial<NormalizedRoom>) => {
    console.log('[NormalizedHomeState] Updating room:', id);
    dispatch({ type: 'UPDATE_ROOM', payload: { id, updates } });
  }, []);

  const removeRoom = useCallback((roomId: string, homeId: string) => {
    console.log('[NormalizedHomeState] Removing room:', roomId);
    dispatch({ type: 'REMOVE_ROOM', payload: { roomId, homeId } });
  }, []);

  const setActiveRoom = useCallback((roomId: string | null) => {
    console.log('[NormalizedHomeState] Setting active room:', roomId);
    dispatch({ type: 'SET_ACTIVE_ROOM', payload: roomId });
  }, []);

  const addItem = useCallback((item: NormalizedItem) => {
    console.log('[NormalizedHomeState] Adding item:', item.id);
    dispatch({ type: 'ADD_ITEM', payload: item });
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<NormalizedItem>) => {
    console.log('[NormalizedHomeState] Updating item:', id);
    dispatch({ type: 'UPDATE_ITEM', payload: { id, updates } });
  }, []);

  const moveItem = useCallback((id: string, position: Position3D, rotation?: Position3D) => {
    dispatch({ type: 'MOVE_ITEM', payload: { id, position, rotation } });
  }, []);

  const removeItem = useCallback((itemId: string, roomId: string) => {
    console.log('[NormalizedHomeState] Removing item:', itemId);
    dispatch({ type: 'REMOVE_ITEM', payload: { itemId, roomId } });
  }, []);

  const selectItem = useCallback((itemId: string | null) => {
    dispatch({ type: 'SELECT_ITEM', payload: itemId });
  }, []);

  const batchUpdateItems = useCallback((items: NormalizedItem[]) => {
    console.log('[NormalizedHomeState] Batch updating items:', items.length);
    dispatch({ type: 'BATCH_UPDATE_ITEMS', payload: items });
  }, []);

  const resetState = useCallback(() => {
    console.log('[NormalizedHomeState] Resetting state');
    dispatch({ type: 'RESET_STATE' });
  }, []);

  const exportHome = useCallback((homeId: string): InternalHomeData | null => {
    return denormalizeHomeData(state, homeId);
  }, [state]);

  const exportActiveHome = useCallback((): InternalHomeData | null => {
    if (!state.activeHomeId) return null;
    return denormalizeHomeData(state, state.activeHomeId);
  }, [state]);

  const derivedState = useMemo(() => ({
    allHomes: selectors.selectAllHomes(state),
    activeHome: selectors.selectActiveHome(state),
    activeHomeRooms: selectors.selectActiveHomeRooms(state),
    activeRoom: selectors.selectActiveRoom(state),
    activeRoomItems: selectors.selectActiveRoomItems(state),
    activeHomeItems: selectors.selectActiveHomeItems(state),
    selectedItem: selectors.selectSelectedItem(state),
    activeHomeStats: selectors.selectActiveHomeStats(state),
    activeHomeTierConfig: selectors.selectActiveHomeTierConfig(state),
    activeRoomCapacity: selectors.selectActiveRoomCapacity(state),
    activeHomeWithDetails: selectors.selectActiveHomeWithDetails(state),
    activeRoomWithItems: selectors.selectActiveRoomWithItems(state),
    publicHomes: selectors.selectPublicHomes(state),
  }), [state]);

  const selectorHelpers = useMemo(() => ({
    getHomeById: (homeId: string) => selectors.selectHomeById(state, homeId),
    getRoomById: (roomId: string) => selectors.selectRoomById(state, roomId),
    getItemById: (itemId: string) => selectors.selectItemById(state, itemId),
    getRoomsByHomeId: (homeId: string) => selectors.selectRoomsByHomeId(state, homeId),
    getItemsByRoomId: (roomId: string) => selectors.selectItemsByRoomId(state, roomId),
    getItemsByHomeId: (homeId: string) => selectors.selectItemsByHomeId(state, homeId),
    getHomeStats: (homeId: string) => selectors.selectHomeStats(state, homeId),
    getRoomCapacity: (roomId: string) => selectors.selectRoomCapacity(state, roomId),
    getHomeTierConfig: (homeId: string) => selectors.selectHomeTierConfig(state, homeId),
    canPlaceItemInRoom: (roomId: string) => selectors.selectCanPlaceItemInRoom(state, roomId),
    canAddRoomToHome: (homeId: string) => selectors.selectCanAddRoomToHome(state, homeId),
    getHomesByPlayerId: (playerId: string) => selectors.selectHomesByPlayerId(state, playerId),
    getItemsByCategory: (homeId: string, category: string) =>
      selectors.selectItemsByCategory(state, homeId, category),
    getRoomsByType: (homeId: string, roomType: string) =>
      selectors.selectRoomsByType(state, homeId, roomType),
    getHomeWithDetails: (homeId: string) => selectors.selectHomeWithDetails(state, homeId),
    getRoomWithItems: (roomId: string) => selectors.selectRoomWithItems(state, roomId),
  }), [state]);

  return {
    state,
    ...derivedState,
    ...selectorHelpers,

    setLoading,
    setError,
    loadHome,
    loadHomes,
    addHome,
    updateHome,
    removeHome,
    setActiveHome,
    addRoom,
    updateRoom,
    removeRoom,
    setActiveRoom,
    addItem,
    updateItem,
    moveItem,
    removeItem,
    selectItem,
    batchUpdateItems,
    resetState,
    exportHome,
    exportActiveHome,
  };
}

export type NormalizedHomeStateHook = ReturnType<typeof useNormalizedHomeState>;
