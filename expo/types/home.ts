// Virtual Home Visitation System - TypeScript Types

export interface PlayerHome {
  id: string;
  playerId: string;
  homeTier: 1 | 2 | 3 | 4;
  homeName: string;
  homeDescription?: string;
  homeLayout: HomeLayout;
  isPublic: boolean;
  maxVisitors: number;
  currentVisitors: number;
  totalVisits: number;
  totalRating: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface HomeLayout {
  rooms: RoomLayout[];
  version: string;
  metadata?: {
    [key: string]: any;
  };
}

export interface RoomLayout {
  id: string;
  homeId: string;
  roomName: string;
  roomType: RoomType;
  position: Position3D;
  dimensions: Dimensions3D;
  wallColor: string;
  floorColor: string;
  maxItems: number;
  layoutData: {
    doors?: DoorPosition[];
    windows?: WindowPosition[];
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export type RoomType =
  | 'living_room'
  | 'bedroom'
  | 'kitchen'
  | 'bathroom'
  | 'garage'
  | 'dining_room'
  | 'library'
  | 'office'
  | 'pool'
  | 'garden'
  | 'storage'
  | 'balcony';

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface Dimensions3D {
  x: number;
  y: number;
  z: number;
}

export interface DoorPosition {
  position: Position3D;
  width: number;
  height: number;
  direction: 'north' | 'south' | 'east' | 'west';
}

export interface WindowPosition {
  position: Position3D;
  width: number;
  height: number;
}

export interface PlacedItem {
  id: string;
  homeId: string;
  roomLayoutId: string;
  itemId: string;
  itemName: string;
  itemCategory: ItemCategory;
  itemImageUrl?: string;
  position: Position3D;
  rotation: Position3D;
  scale: number;
  placedAt: string;
  updatedAt: string;
}

export type ItemCategory =
  | 'furniture'
  | 'decoration'
  | 'electronics'
  | 'appliance'
  | 'lighting'
  | 'art'
  | 'rugs'
  | 'plants'
  | 'outdoor'
  | 'vehicle';

export interface HomeVisitor {
  id: string;
  homeId: string;
  visitorId: string;
  visitStartTime: string;
  visitEndTime: string | null;
  durationSeconds: number | null;
  isOnline: boolean;
  rating?: number;
  comment?: string;
  createdAt: string;
}

export interface VisitorData {
  visitorId: string;
  visitorName: string;
  visitorEmail?: string;
  isOnline: boolean;
  visitStartTime: string;
  durationSeconds?: number;
}

export interface ActiveHomeSession {
  homeId: string;
  homeName: string;
  hostPlayerId: string;
  currentVisitors: VisitorData[];
  sessionStart: string;
  maxVisitors: number;
}

export interface HomeTierConfig {
  id: number;
  tierName: string;
  maxRooms: number;
  totalMaxItems: number;
  maxVisitors: number;
  defaultRoomTypes: RoomType[];
  tierDescription: string;
  unlockPrice: number;
}

export const HOME_TIERS: HomeTierConfig[] = [
  {
    id: 1,
    tierName: 'Starter Apartment',
    maxRooms: 3,
    totalMaxItems: 20,
    maxVisitors: 2,
    defaultRoomTypes: ['living_room', 'bedroom', 'bathroom'],
    tierDescription: 'A cozy starter apartment perfect for beginners',
    unlockPrice: 0,
  },
  {
    id: 2,
    tierName: 'Modern Condo',
    maxRooms: 5,
    totalMaxItems: 40,
    maxVisitors: 4,
    defaultRoomTypes: ['living_room', 'bedroom', 'kitchen', 'bathroom', 'office'],
    tierDescription: 'A spacious modern condo with room to grow',
    unlockPrice: 50000,
  },
  {
    id: 3,
    tierName: 'Luxury House',
    maxRooms: 8,
    totalMaxItems: 80,
    maxVisitors: 8,
    defaultRoomTypes: ['living_room', 'bedroom', 'bedroom', 'kitchen', 'bathroom', 'bathroom', 'dining_room', 'garage'],
    tierDescription: 'A beautiful luxury house with premium amenities',
    unlockPrice: 150000,
  },
  {
    id: 4,
    tierName: 'Grand Estate',
    maxRooms: 12,
    totalMaxItems: 150,
    maxVisitors: 16,
    defaultRoomTypes: ['living_room', 'bedroom', 'bedroom', 'bedroom', 'kitchen', 'bathroom', 'bathroom', 'bathroom', 'dining_room', 'library', 'pool', 'garden'],
    tierDescription: 'The ultimate grand estate with everything you could dream of',
    unlockPrice: 500000,
  },
];

export interface HomeAnalytics {
  id: string;
  homeId: string;
  eventType: AnalyticsEventType;
  eventData: {
    [key: string]: any;
  };
  visitorId?: string;
  createdAt: string;
}

export type AnalyticsEventType =
  | 'visit'
  | 'item_placed'
  | 'item_removed'
  | 'item_moved'
  | 'tier_upgrade'
  | 'room_added'
  | 'room_removed'
  | 'rating_given'
  | 'home_shared';

export interface PublicHomeListItem {
  id: string;
  playerId: string;
  homeTier: number;
  homeName: string;
  homeDescription?: string;
  maxVisitors: number;
  currentVisitors: number;
  totalVisits: number;
  totalRating: number;
  ratingCount: number;
  createdAt: string;
  email?: string;
  username?: string;
  tierName: string;
  roomCount: number;
  itemCount: number;
}

export interface HomeDetails {
  home: PlayerHome;
  tierConfig: HomeTierConfig;
  roomCount: number;
  itemCount: number;
  rooms: RoomLayout[];
  items: PlacedItem[];
}

export interface CreateHomeInput {
  playerId: string;
  homeTier: 1 | 2 | 3 | 4;
  homeName?: string;
  homeDescription?: string;
  isPublic?: boolean;
}

export interface UpdateHomeInput {
  homeId: string;
  homeName?: string;
  homeDescription?: string;
  isPublic?: boolean;
  maxVisitors?: number;
}

export interface CreateRoomInput {
  homeId: string;
  roomName: string;
  roomType: RoomType;
  position?: Position3D;
  dimensions?: Dimensions3D;
  wallColor?: string;
  floorColor?: string;
}

export interface PlaceItemInput {
  homeId: string;
  roomLayoutId: string;
  itemId: string;
  itemName: string;
  itemCategory: ItemCategory;
  itemImageUrl?: string;
  position: Position3D;
  rotation?: Position3D;
  scale?: number;
}

export interface UpdateItemPositionInput {
  itemId: string;
  position: Position3D;
  rotation?: Position3D;
  scale?: number;
}

export interface VisitHomeInput {
  homeId: string;
  visitorId: string;
}

export interface RateHomeInput {
  homeId: string;
  visitorId: string;
  rating: number;
  comment?: string;
}

export interface HomeStats {
  totalHomes: number;
  publicHomes: number;
  totalVisits: number;
  totalItemsPlaced: number;
  averageRating: number;
  topRatedHomes: PublicHomeListItem[];
  mostVisitedHomes: PublicHomeListItem[];
}

export interface RoomWithItems {
  room: RoomLayout;
  items: PlacedItem[];
  itemCount: number;
  itemsRemaining: number;
}

// Alias for backward compatibility
export type HomeData = PlayerHome;

// Alias for Position3D for backward compatibility
export type Vector3 = Position3D;

// Internal room data structure for HomeManager
export interface RoomData {
  roomName: string;
  position: Position3D;
  dimensions: Dimensions3D;
  doorPositions: Position3D[];
  windowPositions: Position3D[];
  maxItems: number;
}

// Internal placed item structure for HomeManager
export interface InternalPlacedItem {
  id: string;
  itemId: string;
  position: Position3D;
  rotation: Position3D;
  roomName: string;
  placedAt: string;
}

// Internal visitor data structure for HomeManager
export interface InternalVisitorData {
  visitorId: string;
  visitorName: string;
  visitTime: string;
  duration: number;
  isOnline: boolean;
}

// Internal home data structure for HomeManager
export interface InternalHomeData {
  homeId: string;
  playerId: string;
  homeTier: number;
  isPublic: boolean;
  maxVisitors: number;
  rooms: RoomData[];
  placedItems: InternalPlacedItem[];
  createdAt: string;
  updatedAt: string;
}

// Internal active session for HomeManager
export interface InternalActiveHomeSession {
  homeId: string;
  hostPlayerId: string;
  currentVisitors: InternalVisitorData[];
  sessionStart: string;
}

// Helper function to get tier config by tier number
export function getHomeTierConfig(tier: number): HomeTierConfig | undefined {
  return HOME_TIERS.find(t => t.id === tier);
}

// Helper function to create a default home
export function createDefaultHome(playerId: string, tier: number = 1): InternalHomeData {
  const config = getHomeTierConfig(tier);
  if (!config) {
    throw new Error(`Invalid tier: ${tier}`);
  }
  
  const rooms: RoomData[] = config.defaultRoomTypes.map((roomType, index) => ({
    roomName: roomType,
    position: { x: index * 12, y: 0, z: 0 },
    dimensions: { x: 10, y: 3, z: 10 },
    doorPositions: [{ x: 5, y: 0, z: 0 }],
    windowPositions: [{ x: 0, y: 1.5, z: 5 }],
    maxItems: Math.floor(config.totalMaxItems / config.defaultRoomTypes.length),
  }));

  return {
    homeId: `home_${playerId}_${Date.now()}`,
    playerId,
    homeTier: tier,
    isPublic: false,
    maxVisitors: config.maxVisitors,
    rooms,
    placedItems: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Helper function to check if an item can be placed in a room
export function canPlaceItem(home: InternalHomeData, roomName: string): boolean {
  const room = home.rooms.find(r => r.roomName === roomName);
  if (!room) return false;
  
  const itemsInRoom = home.placedItems.filter(item => item.roomName === roomName).length;
  return itemsInRoom < room.maxItems;
}

// Helper function to get total placed items
export function getTotalPlacedItems(home: InternalHomeData): number {
  return home.placedItems.length;
}

// Helper function to check if more items can be added
export function canAddMoreItems(home: InternalHomeData): boolean {
  const config = getHomeTierConfig(home.homeTier);
  if (!config) return false;
  
  return home.placedItems.length < config.totalMaxItems;
}