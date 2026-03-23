import {
  NormalizedHomeState,
  NormalizedHome,
  NormalizedRoom,
  NormalizedItem,
} from '@/types/normalizedHomeState';
import { getHomeTierConfig, HomeTierConfig } from '@/types/home';

export const selectAllHomes = (state: NormalizedHomeState): NormalizedHome[] => {
  return state.homeIds.map(id => state.homes[id]).filter(Boolean);
};

export const selectHomeById = (
  state: NormalizedHomeState,
  homeId: string
): NormalizedHome | null => {
  return state.homes[homeId] || null;
};

export const selectActiveHome = (state: NormalizedHomeState): NormalizedHome | null => {
  if (!state.activeHomeId) return null;
  return state.homes[state.activeHomeId] || null;
};

export const selectRoomsByHomeId = (
  state: NormalizedHomeState,
  homeId: string
): NormalizedRoom[] => {
  const home = state.homes[homeId];
  if (!home) return [];
  return home.roomIds.map(id => state.rooms[id]).filter(Boolean);
};

export const selectActiveHomeRooms = (state: NormalizedHomeState): NormalizedRoom[] => {
  if (!state.activeHomeId) return [];
  return selectRoomsByHomeId(state, state.activeHomeId);
};

export const selectRoomById = (
  state: NormalizedHomeState,
  roomId: string
): NormalizedRoom | null => {
  return state.rooms[roomId] || null;
};

export const selectActiveRoom = (state: NormalizedHomeState): NormalizedRoom | null => {
  if (!state.activeRoomId) return null;
  return state.rooms[state.activeRoomId] || null;
};

export const selectItemsByRoomId = (
  state: NormalizedHomeState,
  roomId: string
): NormalizedItem[] => {
  const room = state.rooms[roomId];
  if (!room) return [];
  return room.itemIds.map(id => state.items[id]).filter(Boolean);
};

export const selectActiveRoomItems = (state: NormalizedHomeState): NormalizedItem[] => {
  if (!state.activeRoomId) return [];
  return selectItemsByRoomId(state, state.activeRoomId);
};

export const selectItemsByHomeId = (
  state: NormalizedHomeState,
  homeId: string
): NormalizedItem[] => {
  const home = state.homes[homeId];
  if (!home) return [];

  return home.roomIds.flatMap(roomId => {
    const room = state.rooms[roomId];
    if (!room) return [];
    return room.itemIds.map(id => state.items[id]).filter(Boolean);
  });
};

export const selectActiveHomeItems = (state: NormalizedHomeState): NormalizedItem[] => {
  if (!state.activeHomeId) return [];
  return selectItemsByHomeId(state, state.activeHomeId);
};

export const selectItemById = (
  state: NormalizedHomeState,
  itemId: string
): NormalizedItem | null => {
  return state.items[itemId] || null;
};

export const selectSelectedItem = (state: NormalizedHomeState): NormalizedItem | null => {
  if (!state.selectedItemId) return null;
  return state.items[state.selectedItemId] || null;
};

export const selectHomeTierConfig = (
  state: NormalizedHomeState,
  homeId: string
): HomeTierConfig | null => {
  const home = state.homes[homeId];
  if (!home) return null;
  return getHomeTierConfig(home.homeTier) || null;
};

export const selectActiveHomeTierConfig = (
  state: NormalizedHomeState
): HomeTierConfig | null => {
  if (!state.activeHomeId) return null;
  return selectHomeTierConfig(state, state.activeHomeId);
};

export const selectHomeStats = (
  state: NormalizedHomeState,
  homeId: string
): {
  roomCount: number;
  itemCount: number;
  maxRooms: number;
  maxItems: number;
  visitorCount: number;
  maxVisitors: number;
  averageRating: number;
} | null => {
  const home = state.homes[homeId];
  if (!home) return null;

  const tierConfig = getHomeTierConfig(home.homeTier);
  const itemCount = selectItemsByHomeId(state, homeId).length;

  return {
    roomCount: home.roomIds.length,
    itemCount,
    maxRooms: tierConfig?.maxRooms || 0,
    maxItems: tierConfig?.totalMaxItems || 0,
    visitorCount: home.currentVisitors,
    maxVisitors: home.maxVisitors,
    averageRating: home.ratingCount > 0 ? home.totalRating / home.ratingCount : 0,
  };
};

export const selectActiveHomeStats = (state: NormalizedHomeState) => {
  if (!state.activeHomeId) return null;
  return selectHomeStats(state, state.activeHomeId);
};

export const selectRoomCapacity = (
  state: NormalizedHomeState,
  roomId: string
): { current: number; max: number; remaining: number } | null => {
  const room = state.rooms[roomId];
  if (!room) return null;

  const current = room.itemIds.length;
  return {
    current,
    max: room.maxItems,
    remaining: room.maxItems - current,
  };
};

export const selectActiveRoomCapacity = (state: NormalizedHomeState) => {
  if (!state.activeRoomId) return null;
  return selectRoomCapacity(state, state.activeRoomId);
};

export const selectCanPlaceItemInRoom = (
  state: NormalizedHomeState,
  roomId: string
): boolean => {
  const capacity = selectRoomCapacity(state, roomId);
  return capacity ? capacity.remaining > 0 : false;
};

export const selectCanAddRoomToHome = (
  state: NormalizedHomeState,
  homeId: string
): boolean => {
  const home = state.homes[homeId];
  if (!home) return false;

  const tierConfig = getHomeTierConfig(home.homeTier);
  if (!tierConfig) return false;

  return home.roomIds.length < tierConfig.maxRooms;
};

export const selectPublicHomes = (state: NormalizedHomeState): NormalizedHome[] => {
  return selectAllHomes(state).filter(home => home.isPublic);
};

export const selectHomesByPlayerId = (
  state: NormalizedHomeState,
  playerId: string
): NormalizedHome[] => {
  return selectAllHomes(state).filter(home => home.playerId === playerId);
};

export const selectItemsByCategory = (
  state: NormalizedHomeState,
  homeId: string,
  category: string
): NormalizedItem[] => {
  return selectItemsByHomeId(state, homeId).filter(item => item.itemCategory === category);
};

export const selectRoomsByType = (
  state: NormalizedHomeState,
  homeId: string,
  roomType: string
): NormalizedRoom[] => {
  return selectRoomsByHomeId(state, homeId).filter(room => room.roomType === roomType);
};

export const selectHomeWithDetails = (
  state: NormalizedHomeState,
  homeId: string
): {
  home: NormalizedHome;
  rooms: NormalizedRoom[];
  items: NormalizedItem[];
  stats: ReturnType<typeof selectHomeStats>;
  tierConfig: HomeTierConfig | null;
} | null => {
  const home = state.homes[homeId];
  if (!home) return null;

  return {
    home,
    rooms: selectRoomsByHomeId(state, homeId),
    items: selectItemsByHomeId(state, homeId),
    stats: selectHomeStats(state, homeId),
    tierConfig: selectHomeTierConfig(state, homeId),
  };
};

export const selectActiveHomeWithDetails = (state: NormalizedHomeState) => {
  if (!state.activeHomeId) return null;
  return selectHomeWithDetails(state, state.activeHomeId);
};

export const selectRoomWithItems = (
  state: NormalizedHomeState,
  roomId: string
): {
  room: NormalizedRoom;
  items: NormalizedItem[];
  capacity: ReturnType<typeof selectRoomCapacity>;
} | null => {
  const room = state.rooms[roomId];
  if (!room) return null;

  return {
    room,
    items: selectItemsByRoomId(state, roomId),
    capacity: selectRoomCapacity(state, roomId),
  };
};

export const selectActiveRoomWithItems = (state: NormalizedHomeState) => {
  if (!state.activeRoomId) return null;
  return selectRoomWithItems(state, state.activeRoomId);
};
