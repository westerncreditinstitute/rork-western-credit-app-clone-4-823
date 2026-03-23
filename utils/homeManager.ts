import {
  InternalHomeData,
  RoomData,
  InternalPlacedItem,
  InternalVisitorData,
  InternalActiveHomeSession,
  HomeTierConfig,
  Vector3,
  HOME_TIERS,
  getHomeTierConfig,
  createDefaultHome,
  canPlaceItem,
  getTotalPlacedItems,
  canAddMoreItems,
} from '@/types/home';

type HomeData = InternalHomeData;
type PlacedItem = InternalPlacedItem;
type VisitorData = InternalVisitorData;
type ActiveHomeSession = InternalActiveHomeSession;

export interface HomeManagerState {
  currentHome: HomeData | null;
  activeSession: ActiveHomeSession | null;
  visitHistory: VisitorData[];
  isLoading: boolean;
  error: string | null;
}

export interface PlaceItemParams {
  itemId: string;
  position: Vector3;
  rotation: Vector3;
  roomName: string;
}

export interface VisitHomeParams {
  homeId: string;
  visitorId: string;
  visitorName: string;
}

export class HomeManager {
  private state: HomeManagerState;
  private onStateChange: ((state: HomeManagerState) => void) | null = null;

  constructor() {
    this.state = {
      currentHome: null,
      activeSession: null,
      visitHistory: [],
      isLoading: false,
      error: null,
    };
    console.log('[HomeManager] Initialized');
  }

  setOnStateChange(callback: (state: HomeManagerState) => void): void {
    this.onStateChange = callback;
  }

  private updateState(updates: Partial<HomeManagerState>): void {
    this.state = { ...this.state, ...updates };
    console.log('[HomeManager] State updated:', updates);
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  getState(): HomeManagerState {
    return { ...this.state };
  }

  getCurrentHome(): HomeData | null {
    return this.state.currentHome;
  }

  hasHome(): boolean {
    return this.state.currentHome !== null;
  }

  async createHome(playerId: string, tier: number = 1): Promise<HomeData> {
    console.log('[HomeManager] Creating home for player:', playerId, 'tier:', tier);
    this.updateState({ isLoading: true, error: null });

    try {
      const config = getHomeTierConfig(tier);
      if (!config) {
        throw new Error(`Invalid home tier: ${tier}`);
      }

      const rooms = this.generateRoomsForTier(config);
      const home: HomeData = {
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

      this.updateState({ currentHome: home, isLoading: false });
      console.log('[HomeManager] Home created successfully:', home.homeId);
      return home;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create home';
      console.error('[HomeManager] Error creating home:', errorMessage);
      this.updateState({ isLoading: false, error: errorMessage });
      throw error;
    }
  }

  private generateRoomsForTier(config: HomeTierConfig): RoomData[] {
    const rooms: RoomData[] = [];
    const itemsPerRoom = Math.floor(config.totalMaxItems / config.defaultRoomTypes.length);

    for (let i = 0; i < config.defaultRoomTypes.length; i++) {
      const roomType = config.defaultRoomTypes[i];
      const roomDimensions = this.getRoomDimensions(roomType, config.id);
      
      rooms.push({
        roomName: roomType,
        position: { x: i * 12, y: 0, z: 0 },
        dimensions: roomDimensions,
        doorPositions: this.generateDoorPositions(roomDimensions),
        windowPositions: this.generateWindowPositions(roomDimensions),
        maxItems: itemsPerRoom,
      });
    }

    console.log('[HomeManager] Generated', rooms.length, 'rooms for tier', config.id);
    return rooms;
  }

  private getRoomDimensions(roomType: string, tier: number): Vector3 {
    const baseSizes: Record<string, Vector3> = {
      'Living Space': { x: 8, y: 3, z: 8 },
      'Living Room': { x: 12, y: 3, z: 10 },
      'Bedroom': { x: 10, y: 3, z: 10 },
      'Kitchen': { x: 8, y: 3, z: 8 },
      'Bathroom': { x: 6, y: 3, z: 6 },
      'Garage': { x: 12, y: 4, z: 14 },
      'Dining Room': { x: 10, y: 3, z: 10 },
      'Office': { x: 8, y: 3, z: 8 },
      'Game Room': { x: 14, y: 3, z: 12 },
    };

    const baseSize = baseSizes[roomType] || { x: 10, y: 3, z: 10 };
    const tierMultiplier = 1 + (tier - 1) * 0.15;

    return {
      x: Math.round(baseSize.x * tierMultiplier),
      y: baseSize.y,
      z: Math.round(baseSize.z * tierMultiplier),
    };
  }

  private generateDoorPositions(dimensions: Vector3): Vector3[] {
    return [
      { x: dimensions.x / 2, y: 0, z: 0 },
    ];
  }

  private generateWindowPositions(dimensions: Vector3): Vector3[] {
    return [
      { x: 0, y: dimensions.y / 2, z: dimensions.z / 2 },
      { x: dimensions.x, y: dimensions.y / 2, z: dimensions.z / 2 },
    ];
  }

  loadHome(homeData: HomeData): void {
    console.log('[HomeManager] Loading home:', homeData.homeId);
    this.updateState({ currentHome: homeData, error: null });
  }

  async upgradeHome(newTier: number): Promise<HomeData | null> {
    const currentHome = this.state.currentHome;
    if (!currentHome) {
      console.error('[HomeManager] No home to upgrade');
      this.updateState({ error: 'No home to upgrade' });
      return null;
    }

    if (newTier <= currentHome.homeTier) {
      console.error('[HomeManager] New tier must be higher than current tier');
      this.updateState({ error: 'New tier must be higher than current tier' });
      return null;
    }

    const config = getHomeTierConfig(newTier);
    if (!config) {
      console.error('[HomeManager] Invalid tier:', newTier);
      this.updateState({ error: `Invalid tier: ${newTier}` });
      return null;
    }

    console.log('[HomeManager] Upgrading home from tier', currentHome.homeTier, 'to', newTier);
    this.updateState({ isLoading: true });

    try {
      const newRooms = this.generateRoomsForTier(config);
      const existingItems = currentHome.placedItems.filter(item => {
        return newRooms.some(room => room.roomName === item.roomName);
      });

      const upgradedHome: HomeData = {
        ...currentHome,
        homeTier: newTier,
        maxVisitors: config.maxVisitors,
        rooms: newRooms,
        placedItems: existingItems,
        updatedAt: new Date().toISOString(),
      };

      this.updateState({ currentHome: upgradedHome, isLoading: false });
      console.log('[HomeManager] Home upgraded successfully to tier', newTier);
      return upgradedHome;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upgrade home';
      console.error('[HomeManager] Error upgrading home:', errorMessage);
      this.updateState({ isLoading: false, error: errorMessage });
      return null;
    }
  }

  placeItem(params: PlaceItemParams): PlacedItem | null {
    const currentHome = this.state.currentHome;
    if (!currentHome) {
      console.error('[HomeManager] No home loaded');
      this.updateState({ error: 'No home loaded' });
      return null;
    }

    if (!canPlaceItem(currentHome, params.roomName)) {
      console.error('[HomeManager] Cannot place item in room:', params.roomName);
      this.updateState({ error: `Room "${params.roomName}" is at capacity` });
      return null;
    }

    if (!canAddMoreItems(currentHome)) {
      console.error('[HomeManager] Home is at maximum item capacity');
      this.updateState({ error: 'Home is at maximum item capacity' });
      return null;
    }

    const room = currentHome.rooms.find(r => r.roomName === params.roomName);
    if (!room) {
      console.error('[HomeManager] Room not found:', params.roomName);
      this.updateState({ error: `Room "${params.roomName}" not found` });
      return null;
    }

    if (!this.isPositionValid(params.position, room)) {
      console.error('[HomeManager] Invalid position for item');
      this.updateState({ error: 'Invalid position for item' });
      return null;
    }

    const newItem: PlacedItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      itemId: params.itemId,
      position: params.position,
      rotation: params.rotation,
      roomName: params.roomName,
      placedAt: new Date().toISOString(),
    };

    const updatedHome: HomeData = {
      ...currentHome,
      placedItems: [...currentHome.placedItems, newItem],
      updatedAt: new Date().toISOString(),
    };

    this.updateState({ currentHome: updatedHome, error: null });
    console.log('[HomeManager] Item placed:', newItem.id, 'in room:', params.roomName);
    return newItem;
  }

  private isPositionValid(position: Vector3, room: RoomData): boolean {
    return (
      position.x >= 0 && position.x <= room.dimensions.x &&
      position.y >= 0 && position.y <= room.dimensions.y &&
      position.z >= 0 && position.z <= room.dimensions.z
    );
  }

  removeItem(itemId: string): boolean {
    const currentHome = this.state.currentHome;
    if (!currentHome) {
      console.error('[HomeManager] No home loaded');
      return false;
    }

    const itemIndex = currentHome.placedItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      console.error('[HomeManager] Item not found:', itemId);
      return false;
    }

    const updatedItems = currentHome.placedItems.filter(item => item.id !== itemId);
    const updatedHome: HomeData = {
      ...currentHome,
      placedItems: updatedItems,
      updatedAt: new Date().toISOString(),
    };

    this.updateState({ currentHome: updatedHome, error: null });
    console.log('[HomeManager] Item removed:', itemId);
    return true;
  }

  moveItem(itemId: string, newPosition: Vector3, newRotation?: Vector3): boolean {
    const currentHome = this.state.currentHome;
    if (!currentHome) {
      console.error('[HomeManager] No home loaded');
      return false;
    }

    const item = currentHome.placedItems.find(i => i.id === itemId);
    if (!item) {
      console.error('[HomeManager] Item not found:', itemId);
      return false;
    }

    const room = currentHome.rooms.find(r => r.roomName === item.roomName);
    if (!room || !this.isPositionValid(newPosition, room)) {
      console.error('[HomeManager] Invalid new position');
      return false;
    }

    const updatedItems = currentHome.placedItems.map(i =>
      i.id === itemId
        ? { ...i, position: newPosition, rotation: newRotation || i.rotation }
        : i
    );

    const updatedHome: HomeData = {
      ...currentHome,
      placedItems: updatedItems,
      updatedAt: new Date().toISOString(),
    };

    this.updateState({ currentHome: updatedHome, error: null });
    console.log('[HomeManager] Item moved:', itemId);
    return true;
  }

  setHomePublic(isPublic: boolean): void {
    const currentHome = this.state.currentHome;
    if (!currentHome) {
      console.error('[HomeManager] No home loaded');
      return;
    }

    const updatedHome: HomeData = {
      ...currentHome,
      isPublic,
      updatedAt: new Date().toISOString(),
    };

    this.updateState({ currentHome: updatedHome, error: null });
    console.log('[HomeManager] Home visibility set to:', isPublic ? 'public' : 'private');
  }

  startVisitSession(hostPlayerId: string): ActiveHomeSession {
    const currentHome = this.state.currentHome;
    if (!currentHome) {
      throw new Error('No home to start session for');
    }

    const session: ActiveHomeSession = {
      homeId: currentHome.homeId,
      hostPlayerId,
      currentVisitors: [],
      sessionStart: new Date().toISOString(),
    };

    this.updateState({ activeSession: session });
    console.log('[HomeManager] Visit session started for home:', currentHome.homeId);
    return session;
  }

  addVisitor(params: VisitHomeParams): VisitorData | null {
    const session = this.state.activeSession;
    const currentHome = this.state.currentHome;

    if (!session || !currentHome) {
      console.error('[HomeManager] No active session or home');
      return null;
    }

    if (session.currentVisitors.length >= currentHome.maxVisitors) {
      console.error('[HomeManager] Home is at maximum visitor capacity');
      this.updateState({ error: 'Home is at maximum visitor capacity' });
      return null;
    }

    const existingVisitor = session.currentVisitors.find(v => v.visitorId === params.visitorId);
    if (existingVisitor) {
      console.log('[HomeManager] Visitor already in home:', params.visitorId);
      return existingVisitor;
    }

    const visitor: VisitorData = {
      visitorId: params.visitorId,
      visitorName: params.visitorName,
      visitTime: new Date().toISOString(),
      duration: 0,
      isOnline: true,
    };

    const updatedSession: ActiveHomeSession = {
      ...session,
      currentVisitors: [...session.currentVisitors, visitor],
    };

    this.updateState({ activeSession: updatedSession });
    console.log('[HomeManager] Visitor added:', params.visitorName);
    return visitor;
  }

  removeVisitor(visitorId: string): boolean {
    const session = this.state.activeSession;
    if (!session) {
      console.error('[HomeManager] No active session');
      return false;
    }

    const visitor = session.currentVisitors.find(v => v.visitorId === visitorId);
    if (!visitor) {
      console.error('[HomeManager] Visitor not found:', visitorId);
      return false;
    }

    const visitDuration = Math.floor(
      (Date.now() - new Date(visitor.visitTime).getTime()) / 1000
    );
    const completedVisit: VisitorData = {
      ...visitor,
      duration: visitDuration,
      isOnline: false,
    };

    const updatedSession: ActiveHomeSession = {
      ...session,
      currentVisitors: session.currentVisitors.filter(v => v.visitorId !== visitorId),
    };

    this.updateState({
      activeSession: updatedSession,
      visitHistory: [...this.state.visitHistory, completedVisit],
    });

    console.log('[HomeManager] Visitor removed:', visitorId, 'Duration:', visitDuration, 'seconds');
    return true;
  }

  endVisitSession(): VisitorData[] {
    const session = this.state.activeSession;
    if (!session) {
      console.log('[HomeManager] No active session to end');
      return [];
    }

    const completedVisits: VisitorData[] = session.currentVisitors.map(visitor => ({
      ...visitor,
      duration: Math.floor(
        (Date.now() - new Date(visitor.visitTime).getTime()) / 1000
      ),
      isOnline: false,
    }));

    this.updateState({
      activeSession: null,
      visitHistory: [...this.state.visitHistory, ...completedVisits],
    });

    console.log('[HomeManager] Session ended with', completedVisits.length, 'visitors');
    return completedVisits;
  }

  getItemsInRoom(roomName: string): PlacedItem[] {
    const currentHome = this.state.currentHome;
    if (!currentHome) return [];

    return currentHome.placedItems.filter(item => item.roomName === roomName);
  }

  getRoomCapacity(roomName: string): { current: number; max: number } | null {
    const currentHome = this.state.currentHome;
    if (!currentHome) return null;

    const room = currentHome.rooms.find(r => r.roomName === roomName);
    if (!room) return null;

    const itemsInRoom = this.getItemsInRoom(roomName).length;
    return { current: itemsInRoom, max: room.maxItems };
  }

  getTotalCapacity(): { current: number; max: number } | null {
    const currentHome = this.state.currentHome;
    if (!currentHome) return null;

    const config = getHomeTierConfig(currentHome.homeTier);
    if (!config) return null;

    return {
      current: getTotalPlacedItems(currentHome),
      max: config.totalMaxItems,
    };
  }

  getVisitorCount(): number {
    return this.state.activeSession?.currentVisitors.length || 0;
  }

  getMaxVisitors(): number {
    return this.state.currentHome?.maxVisitors || 0;
  }

  getUpgradeCost(targetTier: number): number {
    const currentTier = this.state.currentHome?.homeTier || 1;
    if (targetTier <= currentTier) return 0;

    const baseCosts: Record<number, number> = {
      2: 25000,
      3: 100000,
      4: 500000,
    };

    let totalCost = 0;
    for (let tier = currentTier + 1; tier <= targetTier; tier++) {
      totalCost += baseCosts[tier] || 0;
    }

    return totalCost;
  }

  canUpgrade(targetTier: number, playerBalance: number): boolean {
    const currentTier = this.state.currentHome?.homeTier || 0;
    if (targetTier <= currentTier || targetTier > 4) return false;
    return playerBalance >= this.getUpgradeCost(targetTier);
  }

  getHomeStats(): {
    tier: number;
    tierName: string;
    roomCount: number;
    itemCount: number;
    maxItems: number;
    visitorCapacity: number;
    isPublic: boolean;
  } | null {
    const currentHome = this.state.currentHome;
    if (!currentHome) return null;

    const config = getHomeTierConfig(currentHome.homeTier);
    if (!config) return null;

    return {
      tier: currentHome.homeTier,
      tierName: config.tierName,
      roomCount: currentHome.rooms.length,
      itemCount: getTotalPlacedItems(currentHome),
      maxItems: config.totalMaxItems,
      visitorCapacity: currentHome.maxVisitors,
      isPublic: currentHome.isPublic,
    };
  }

  exportHomeData(): string {
    const currentHome = this.state.currentHome;
    if (!currentHome) return '';

    return JSON.stringify(currentHome, null, 2);
  }

  importHomeData(jsonData: string): boolean {
    try {
      const homeData = JSON.parse(jsonData) as HomeData;
      
      if (!homeData.homeId || !homeData.playerId || !homeData.rooms) {
        throw new Error('Invalid home data structure');
      }

      this.loadHome(homeData);
      console.log('[HomeManager] Home data imported successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import home data';
      console.error('[HomeManager] Error importing home data:', errorMessage);
      this.updateState({ error: errorMessage });
      return false;
    }
  }

  clearError(): void {
    this.updateState({ error: null });
  }

  reset(): void {
    console.log('[HomeManager] Resetting state');
    this.state = {
      currentHome: null,
      activeSession: null,
      visitHistory: [],
      isLoading: false,
      error: null,
    };
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}

export const homeManager = new HomeManager();

export {
  HomeTierConfig,
  Vector3,
  HOME_TIERS,
  getHomeTierConfig,
  createDefaultHome,
  canPlaceItem,
  getTotalPlacedItems,
  canAddMoreItems,
};

export type {
  HomeData,
  RoomData,
  PlacedItem,
  VisitorData,
  ActiveHomeSession,
};
