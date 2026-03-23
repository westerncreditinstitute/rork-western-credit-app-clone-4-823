import { RoomData, InternalPlacedItem, InternalHomeData, Position3D } from './home';

export interface NormalizedHomeState {
  homes: Record<string, NormalizedHome>;
  rooms: Record<string, NormalizedRoom>;
  items: Record<string, NormalizedItem>;
  activeHomeId: string | null;
  activeRoomId: string | null;
  selectedItemId: string | null;
  homeIds: string[];
  isLoading: boolean;
  error: string | null;
}

export interface NormalizedHome {
  id: string;
  playerId: string;
  homeTier: number;
  homeName: string;
  homeDescription?: string;
  isPublic: boolean;
  maxVisitors: number;
  currentVisitors: number;
  totalVisits: number;
  totalRating: number;
  ratingCount: number;
  roomIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NormalizedRoom {
  id: string;
  homeId: string;
  roomName: string;
  roomType: string;
  position: Position3D;
  dimensions: Position3D;
  wallColor: string;
  floorColor: string;
  maxItems: number;
  itemIds: string[];
  doorPositions: Position3D[];
  windowPositions: Position3D[];
  createdAt: string;
  updatedAt: string;
}

export interface NormalizedItem {
  id: string;
  homeId: string;
  roomId: string;
  itemDefinitionId: string;
  itemName: string;
  itemCategory: string;
  itemImageUrl?: string;
  position: Position3D;
  rotation: Position3D;
  scale: number;
  placedAt: string;
  updatedAt: string;
}

export type HomeAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_HOME'; payload: { home: NormalizedHome; rooms: NormalizedRoom[]; items: NormalizedItem[] } }
  | { type: 'LOAD_HOMES'; payload: { homes: NormalizedHome[]; rooms: NormalizedRoom[]; items: NormalizedItem[] } }
  | { type: 'ADD_HOME'; payload: NormalizedHome }
  | { type: 'UPDATE_HOME'; payload: { id: string; updates: Partial<NormalizedHome> } }
  | { type: 'REMOVE_HOME'; payload: string }
  | { type: 'SET_ACTIVE_HOME'; payload: string | null }
  | { type: 'ADD_ROOM'; payload: NormalizedRoom }
  | { type: 'UPDATE_ROOM'; payload: { id: string; updates: Partial<NormalizedRoom> } }
  | { type: 'REMOVE_ROOM'; payload: { roomId: string; homeId: string } }
  | { type: 'SET_ACTIVE_ROOM'; payload: string | null }
  | { type: 'ADD_ITEM'; payload: NormalizedItem }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<NormalizedItem> } }
  | { type: 'MOVE_ITEM'; payload: { id: string; position: Position3D; rotation?: Position3D } }
  | { type: 'REMOVE_ITEM'; payload: { itemId: string; roomId: string } }
  | { type: 'SELECT_ITEM'; payload: string | null }
  | { type: 'BATCH_UPDATE_ITEMS'; payload: NormalizedItem[] }
  | { type: 'RESET_STATE' };

export const initialNormalizedState: NormalizedHomeState = {
  homes: {},
  rooms: {},
  items: {},
  activeHomeId: null,
  activeRoomId: null,
  selectedItemId: null,
  homeIds: [],
  isLoading: false,
  error: null,
};

export function normalizeHomeData(
  homeData: InternalHomeData
): { home: NormalizedHome; rooms: NormalizedRoom[]; items: NormalizedItem[] } {
  const homeId = homeData.homeId;
  const roomIds: string[] = [];
  const rooms: NormalizedRoom[] = [];
  const items: NormalizedItem[] = [];

  homeData.rooms.forEach((room, index) => {
    const roomId = `${homeId}_room_${index}`;
    roomIds.push(roomId);

    const roomItems = homeData.placedItems.filter(item => item.roomName === room.roomName);
    const itemIds = roomItems.map(item => item.id);

    rooms.push({
      id: roomId,
      homeId,
      roomName: room.roomName,
      roomType: room.roomName,
      position: room.position,
      dimensions: room.dimensions,
      wallColor: '#FFFFFF',
      floorColor: '#E0E0E0',
      maxItems: room.maxItems,
      itemIds,
      doorPositions: room.doorPositions,
      windowPositions: room.windowPositions,
      createdAt: homeData.createdAt,
      updatedAt: homeData.updatedAt,
    });

    roomItems.forEach(item => {
      items.push({
        id: item.id,
        homeId,
        roomId,
        itemDefinitionId: item.itemId,
        itemName: item.itemId,
        itemCategory: 'furniture',
        position: item.position,
        rotation: item.rotation,
        scale: 1,
        placedAt: item.placedAt,
        updatedAt: item.placedAt,
      });
    });
  });

  const home: NormalizedHome = {
    id: homeId,
    playerId: homeData.playerId,
    homeTier: homeData.homeTier,
    homeName: `Home Tier ${homeData.homeTier}`,
    isPublic: homeData.isPublic,
    maxVisitors: homeData.maxVisitors,
    currentVisitors: 0,
    totalVisits: 0,
    totalRating: 0,
    ratingCount: 0,
    roomIds,
    createdAt: homeData.createdAt,
    updatedAt: homeData.updatedAt,
  };

  return { home, rooms, items };
}

export function denormalizeHomeData(
  state: NormalizedHomeState,
  homeId: string
): InternalHomeData | null {
  const home = state.homes[homeId];
  if (!home) return null;

  const rooms: RoomData[] = home.roomIds.map(roomId => {
    const room = state.rooms[roomId];
    return {
      roomName: room.roomName,
      position: room.position,
      dimensions: room.dimensions,
      doorPositions: room.doorPositions,
      windowPositions: room.windowPositions,
      maxItems: room.maxItems,
    };
  });

  const placedItems: InternalPlacedItem[] = Object.values(state.items)
    .filter(item => item.homeId === homeId)
    .map(item => {
      const room = state.rooms[item.roomId];
      return {
        id: item.id,
        itemId: item.itemDefinitionId,
        position: item.position,
        rotation: item.rotation,
        roomName: room?.roomName || '',
        placedAt: item.placedAt,
      };
    });

  return {
    homeId: home.id,
    playerId: home.playerId,
    homeTier: home.homeTier,
    isPublic: home.isPublic,
    maxVisitors: home.maxVisitors,
    rooms,
    placedItems,
    createdAt: home.createdAt,
    updatedAt: home.updatedAt,
  };
}
