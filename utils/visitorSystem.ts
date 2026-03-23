import { homeManager } from './homeManager';
import {
  InternalHomeData,
  RoomData,
  VisitorData,
  Vector3,
  getHomeTierConfig,
} from '@/types/home';

type HomeData = InternalHomeData;

export type VisitStatus = 'idle' | 'browsing' | 'requesting' | 'visiting' | 'leaving';

export type FloorStyle = 'Wood' | 'Tile' | 'Carpet' | 'Stone' | 'Marble' | 'Concrete';

export type WallStyle = 'Paint' | 'Wallpaper' | 'Brick' | 'Stone' | 'Wood';

export interface VisitorPosition {
  visitorId: string;
  position: Vector3;
  rotation: number;
  currentRoom: string;
  isMoving: boolean;
  targetPosition: Vector3 | null;
}

export interface PublicHomeEntry {
  homeId: string;
  hostId: string;
  hostName: string;
  homeTier: number;
  tierName: string;
  visitorCount: number;
  maxVisitors: number;
  roomCount: number;
  itemCount: number;
  rating: number;
  totalVisits: number;
  createdAt: string;
  previewImageUrl?: string;
}

export interface VisitRequest {
  requestId: string;
  visitorId: string;
  visitorName: string;
  homeId: string;
  requestTime: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
}

export interface DoorState {
  doorId: string;
  roomName: string;
  position: Vector3;
  isOpen: boolean;
  openAngle: number;
  targetAngle: number;
  openSpeed: number;
}

export interface RoomStyle {
  roomName: string;
  floorStyle: FloorStyle;
  wallStyle: WallStyle;
  floorColor: string;
  wallColor: string;
  ceilingColor: string;
  ambientLighting: number;
}

export interface VisitorSystemState {
  status: VisitStatus;
  currentVisitedHome: HomeData | null;
  visitorPositions: Map<string, VisitorPosition>;
  publicHomes: PublicHomeEntry[];
  pendingRequests: VisitRequest[];
  doorStates: DoorState[];
  roomStyles: RoomStyle[];
  visitStartTime: string | null;
  visitDuration: number;
  isHost: boolean;
  error: string | null;
  isLoading: boolean;
}

export interface VisitHistoryEntry {
  homeId: string;
  hostId: string;
  hostName: string;
  visitTime: string;
  duration: number;
  roomsVisited: string[];
}

const FLOOR_STYLES: FloorStyle[] = ['Wood', 'Tile', 'Carpet', 'Stone', 'Marble', 'Concrete'];
const WALL_STYLES: WallStyle[] = ['Paint', 'Wallpaper', 'Brick', 'Stone', 'Wood'];

const FLOOR_COLORS: Record<FloorStyle, string[]> = {
  Wood: ['#8B4513', '#A0522D', '#D2691E', '#CD853F', '#DEB887'],
  Tile: ['#F5F5F5', '#E0E0E0', '#BDBDBD', '#D4AF37', '#1E90FF'],
  Carpet: ['#800020', '#2F4F4F', '#4B0082', '#191970', '#006400'],
  Stone: ['#696969', '#808080', '#A9A9A9', '#C0C0C0', '#D3D3D3'],
  Marble: ['#FFFAFA', '#F0F0F0', '#E8E8E8', '#FFF8DC', '#FAF0E6'],
  Concrete: ['#808080', '#A9A9A9', '#7B7B7B', '#8B8B8B', '#989898'],
};

const WALL_COLORS: Record<WallStyle, string[]> = {
  Paint: ['#FFFFFF', '#F5F5DC', '#FFF8DC', '#E6E6FA', '#F0FFF0'],
  Wallpaper: ['#FFE4E1', '#E0FFFF', '#FAFAD2', '#D8BFD8', '#FFE4B5'],
  Brick: ['#8B4513', '#A52A2A', '#CD5C5C', '#BC8F8F', '#D2691E'],
  Stone: ['#696969', '#808080', '#A9A9A9', '#778899', '#708090'],
  Wood: ['#8B4513', '#A0522D', '#CD853F', '#D2B48C', '#DEB887'],
};

const VISIT_REQUEST_TIMEOUT = 60000;
const DOOR_OPEN_ANGLE = 90;
const DOOR_OPEN_SPEED = 2;

export class VisitorSystem {
  private state: VisitorSystemState;
  private onStateChange: ((state: VisitorSystemState) => void) | null = null;
  private visitHistory: VisitHistoryEntry[] = [];
  private roomsVisitedThisSession: Set<string> = new Set();
  private visitDurationInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.state = {
      status: 'idle',
      currentVisitedHome: null,
      visitorPositions: new Map(),
      publicHomes: [],
      pendingRequests: [],
      doorStates: [],
      roomStyles: [],
      visitStartTime: null,
      visitDuration: 0,
      isHost: false,
      error: null,
      isLoading: false,
    };
    console.log('[VisitorSystem] Initialized');
  }

  setOnStateChange(callback: (state: VisitorSystemState) => void): void {
    this.onStateChange = callback;
  }

  private updateState(updates: Partial<VisitorSystemState>): void {
    this.state = { ...this.state, ...updates };
    console.log('[VisitorSystem] State updated:', Object.keys(updates));
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  getState(): VisitorSystemState {
    return {
      ...this.state,
      visitorPositions: new Map(this.state.visitorPositions),
    };
  }

  get isVisiting(): boolean {
    return this.state.status === 'visiting';
  }

  get currentVisitedHome(): HomeData | null {
    return this.state.currentVisitedHome;
  }

  async browsePublicHomes(): Promise<PublicHomeEntry[]> {
    console.log('[VisitorSystem] Browsing public homes');
    this.updateState({ status: 'browsing', isLoading: true, error: null });

    try {
      const mockPublicHomes: PublicHomeEntry[] = [
        {
          homeId: 'public_home_1',
          hostId: 'host_1',
          hostName: 'CreditMaster42',
          homeTier: 3,
          tierName: 'House',
          visitorCount: 3,
          maxVisitors: 8,
          roomCount: 5,
          itemCount: 67,
          rating: 4.5,
          totalVisits: 234,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          previewImageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400',
        },
        {
          homeId: 'public_home_2',
          hostId: 'host_2',
          hostName: 'BudgetPro99',
          homeTier: 4,
          tierName: 'Mansion',
          visitorCount: 8,
          maxVisitors: 15,
          roomCount: 8,
          itemCount: 156,
          rating: 4.8,
          totalVisits: 892,
          createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          previewImageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400',
        },
        {
          homeId: 'public_home_3',
          hostId: 'host_3',
          hostName: 'ScoreSaver',
          homeTier: 2,
          tierName: 'Apartment',
          visitorCount: 2,
          maxVisitors: 5,
          roomCount: 3,
          itemCount: 34,
          rating: 4.2,
          totalVisits: 78,
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          previewImageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400',
        },
      ];

      this.updateState({
        publicHomes: mockPublicHomes,
        isLoading: false,
      });

      console.log('[VisitorSystem] Found', mockPublicHomes.length, 'public homes');
      return mockPublicHomes;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to browse homes';
      console.error('[VisitorSystem] Error browsing homes:', errorMessage);
      this.updateState({ isLoading: false, error: errorMessage, status: 'idle' });
      return [];
    }
  }

  async requestVisit(
    homeId: string,
    visitorId: string,
    visitorName: string
  ): Promise<VisitRequest | null> {
    console.log('[VisitorSystem] Requesting visit to home:', homeId);
    this.updateState({ status: 'requesting', isLoading: true, error: null });

    try {
      const request: VisitRequest = {
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        visitorId,
        visitorName,
        homeId,
        requestTime: new Date().toISOString(),
        status: 'pending',
      };

      const updatedRequests = [...this.state.pendingRequests, request];
      this.updateState({ pendingRequests: updatedRequests, isLoading: false });

      setTimeout(() => {
        this.expireRequest(request.requestId);
      }, VISIT_REQUEST_TIMEOUT);

      console.log('[VisitorSystem] Visit request created:', request.requestId);
      return request;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to request visit';
      console.error('[VisitorSystem] Error requesting visit:', errorMessage);
      this.updateState({ isLoading: false, error: errorMessage, status: 'idle' });
      return null;
    }
  }

  private expireRequest(requestId: string): void {
    const request = this.state.pendingRequests.find(r => r.requestId === requestId);
    if (request && request.status === 'pending') {
      const updatedRequests = this.state.pendingRequests.map(r =>
        r.requestId === requestId ? { ...r, status: 'expired' as const } : r
      );
      this.updateState({ pendingRequests: updatedRequests });
      console.log('[VisitorSystem] Request expired:', requestId);
    }
  }

  handleVisitRequest(requestId: string, approved: boolean): void {
    const request = this.state.pendingRequests.find(r => r.requestId === requestId);
    if (!request || request.status !== 'pending') {
      console.warn('[VisitorSystem] Request not found or not pending:', requestId);
      return;
    }

    const updatedRequests = this.state.pendingRequests.map(r =>
      r.requestId === requestId
        ? { ...r, status: approved ? ('approved' as const) : ('denied' as const) }
        : r
    );

    this.updateState({ pendingRequests: updatedRequests });
    console.log('[VisitorSystem] Request', approved ? 'approved' : 'denied', ':', requestId);
  }

  async visitHome(homeId: string, visitorId: string, visitorName: string): Promise<boolean> {
    console.log('[VisitorSystem] Visiting home:', homeId);
    this.updateState({ isLoading: true, error: null });

    try {
      const publicHome = this.state.publicHomes.find(h => h.homeId === homeId);
      if (publicHome && publicHome.visitorCount >= publicHome.maxVisitors) {
        throw new Error('Home is at maximum visitor capacity');
      }

      const mockHomeData = this.generateMockHomeData(homeId, publicHome);
      const doorStates = this.initializeDoorStates(mockHomeData);
      const roomStyles = this.generateRoomStyles(mockHomeData);

      const visitorPosition: VisitorPosition = {
        visitorId,
        position: { x: 5, y: 0, z: 5 },
        rotation: 0,
        currentRoom: mockHomeData.rooms[0]?.roomName || 'Living Room',
        isMoving: false,
        targetPosition: null,
      };

      const visitorPositions = new Map(this.state.visitorPositions);
      visitorPositions.set(visitorId, visitorPosition);

      this.roomsVisitedThisSession = new Set([visitorPosition.currentRoom]);

      this.updateState({
        status: 'visiting',
        currentVisitedHome: mockHomeData,
        visitorPositions,
        doorStates,
        roomStyles,
        visitStartTime: new Date().toISOString(),
        visitDuration: 0,
        isHost: false,
        isLoading: false,
      });

      this.startVisitDurationTimer();

      console.log('[VisitorSystem] Now visiting home:', homeId);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to visit home';
      console.error('[VisitorSystem] Error visiting home:', errorMessage);
      this.updateState({ isLoading: false, error: errorMessage, status: 'idle' });
      return false;
    }
  }

  private generateMockHomeData(homeId: string, publicHome?: PublicHomeEntry): HomeData {
    const tier = publicHome?.homeTier || 2;
    const config = getHomeTierConfig(tier);

    if (!config) {
      throw new Error('Invalid home tier');
    }

    const rooms: RoomData[] = config.defaultRoomTypes.map((roomType: string, index: number) => ({
      roomName: roomType,
      position: { x: index * 12, y: 0, z: 0 },
      dimensions: this.getRoomDimensions(roomType, tier),
      doorPositions: [{ x: 6, y: 0, z: 0 }],
      windowPositions: [{ x: 0, y: 1.5, z: 5 }, { x: 12, y: 1.5, z: 5 }],
      maxItems: Math.floor(config.totalMaxItems / config.defaultRoomTypes.length),
    }));

    return {
      homeId,
      playerId: publicHome?.hostId || 'unknown',
      homeTier: tier as 1 | 2 | 3 | 4,
      isPublic: true,
      maxVisitors: config.maxVisitors,
      rooms,
      placedItems: [],
      createdAt: publicHome?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
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

  private initializeDoorStates(home: HomeData): DoorState[] {
    const doorStates: DoorState[] = [];
    let doorIndex = 0;

    for (const room of home.rooms) {
      for (const doorPos of room.doorPositions) {
        doorStates.push({
          doorId: `door_${doorIndex++}`,
          roomName: room.roomName,
          position: doorPos,
          isOpen: false,
          openAngle: 0,
          targetAngle: 0,
          openSpeed: DOOR_OPEN_SPEED,
        });
      }
    }

    console.log('[VisitorSystem] Initialized', doorStates.length, 'door states');
    return doorStates;
  }

  private generateRoomStyles(home: HomeData): RoomStyle[] {
    return home.rooms.map(room => {
      const floorStyle = this.getRandomFloorStyle();
      const wallStyle = this.getRandomWallStyle();

      return {
        roomName: room.roomName,
        floorStyle,
        wallStyle,
        floorColor: this.getRandomColorForStyle(floorStyle, FLOOR_COLORS),
        wallColor: this.getRandomColorForStyle(wallStyle, WALL_COLORS),
        ceilingColor: '#FFFFFF',
        ambientLighting: 0.7 + Math.random() * 0.3,
      };
    });
  }

  private getRandomFloorStyle(): FloorStyle {
    return FLOOR_STYLES[Math.floor(Math.random() * FLOOR_STYLES.length)];
  }

  private getRandomWallStyle(): WallStyle {
    return WALL_STYLES[Math.floor(Math.random() * WALL_STYLES.length)];
  }

  private getRandomColorForStyle<T extends string>(
    style: T,
    colorMap: Record<T, string[]>
  ): string {
    const colors = colorMap[style];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private startVisitDurationTimer(): void {
    this.stopVisitDurationTimer();

    this.visitDurationInterval = setInterval(() => {
      if (this.state.visitStartTime) {
        const duration = Math.floor(
          (Date.now() - new Date(this.state.visitStartTime).getTime()) / 1000
        );
        this.updateState({ visitDuration: duration });
      }
    }, 1000);
  }

  private stopVisitDurationTimer(): void {
    if (this.visitDurationInterval) {
      clearInterval(this.visitDurationInterval);
      this.visitDurationInterval = null;
    }
  }

  toggleDoor(doorId: string): void {
    const doorIndex = this.state.doorStates.findIndex(d => d.doorId === doorId);
    if (doorIndex === -1) {
      console.warn('[VisitorSystem] Door not found:', doorId);
      return;
    }

    const door = this.state.doorStates[doorIndex];
    const newIsOpen = !door.isOpen;
    const newTargetAngle = newIsOpen ? DOOR_OPEN_ANGLE : 0;

    const updatedDoorStates = [...this.state.doorStates];
    updatedDoorStates[doorIndex] = {
      ...door,
      isOpen: newIsOpen,
      targetAngle: newTargetAngle,
    };

    this.updateState({ doorStates: updatedDoorStates });
    console.log('[VisitorSystem] Door', newIsOpen ? 'opened' : 'closed', ':', doorId);
  }

  updateDoorAnimation(doorId: string, deltaTime: number): void {
    const doorIndex = this.state.doorStates.findIndex(d => d.doorId === doorId);
    if (doorIndex === -1) return;

    const door = this.state.doorStates[doorIndex];
    if (Math.abs(door.openAngle - door.targetAngle) < 0.1) return;

    const direction = door.targetAngle > door.openAngle ? 1 : -1;
    const newAngle = door.openAngle + direction * door.openSpeed * deltaTime * 60;
    const clampedAngle = direction > 0
      ? Math.min(newAngle, door.targetAngle)
      : Math.max(newAngle, door.targetAngle);

    const updatedDoorStates = [...this.state.doorStates];
    updatedDoorStates[doorIndex] = {
      ...door,
      openAngle: clampedAngle,
    };

    this.updateState({ doorStates: updatedDoorStates });
  }

  moveVisitor(visitorId: string, targetPosition: Vector3, targetRoom: string): void {
    const visitorPosition = this.state.visitorPositions.get(visitorId);
    if (!visitorPosition) {
      console.warn('[VisitorSystem] Visitor not found:', visitorId);
      return;
    }

    const updatedPosition: VisitorPosition = {
      ...visitorPosition,
      targetPosition,
      isMoving: true,
    };

    if (targetRoom !== visitorPosition.currentRoom) {
      updatedPosition.currentRoom = targetRoom;
      this.roomsVisitedThisSession.add(targetRoom);
    }

    const visitorPositions = new Map(this.state.visitorPositions);
    visitorPositions.set(visitorId, updatedPosition);

    this.updateState({ visitorPositions });
    console.log('[VisitorSystem] Visitor moving to:', targetPosition, 'in room:', targetRoom);
  }

  updateVisitorPosition(visitorId: string, position: Vector3, rotation?: number): void {
    const visitorPosition = this.state.visitorPositions.get(visitorId);
    if (!visitorPosition) return;

    const updatedPosition: VisitorPosition = {
      ...visitorPosition,
      position,
      rotation: rotation ?? visitorPosition.rotation,
    };

    if (visitorPosition.targetPosition) {
      const distance = Math.sqrt(
        Math.pow(position.x - visitorPosition.targetPosition.x, 2) +
        Math.pow(position.z - visitorPosition.targetPosition.z, 2)
      );

      if (distance < 0.1) {
        updatedPosition.isMoving = false;
        updatedPosition.targetPosition = null;
      }
    }

    const visitorPositions = new Map(this.state.visitorPositions);
    visitorPositions.set(visitorId, updatedPosition);

    this.updateState({ visitorPositions });
  }

  leaveVisit(visitorId: string): VisitHistoryEntry | null {
    if (this.state.status !== 'visiting' || !this.state.currentVisitedHome) {
      console.warn('[VisitorSystem] Not currently visiting');
      return null;
    }

    this.stopVisitDurationTimer();

    const visitEntry: VisitHistoryEntry = {
      homeId: this.state.currentVisitedHome.homeId,
      hostId: this.state.currentVisitedHome.playerId,
      hostName: 'Unknown Host',
      visitTime: this.state.visitStartTime || new Date().toISOString(),
      duration: this.state.visitDuration,
      roomsVisited: Array.from(this.roomsVisitedThisSession),
    };

    this.visitHistory.push(visitEntry);

    const visitorPositions = new Map(this.state.visitorPositions);
    visitorPositions.delete(visitorId);

    this.updateState({
      status: 'idle',
      currentVisitedHome: null,
      visitorPositions,
      doorStates: [],
      roomStyles: [],
      visitStartTime: null,
      visitDuration: 0,
      isHost: false,
    });

    this.roomsVisitedThisSession.clear();

    console.log('[VisitorSystem] Left visit. Duration:', visitEntry.duration, 'seconds');
    return visitEntry;
  }

  hostSession(): boolean {
    const currentHome = homeManager.getCurrentHome();
    if (!currentHome) {
      console.error('[VisitorSystem] No home to host');
      this.updateState({ error: 'No home to host' });
      return false;
    }

    if (!currentHome.isPublic) {
      console.warn('[VisitorSystem] Home is not public');
      this.updateState({ error: 'Home must be public to host visitors' });
      return false;
    }

    const doorStates = this.initializeDoorStates(currentHome);
    const roomStyles = this.generateRoomStyles(currentHome);

    this.updateState({
      status: 'visiting',
      currentVisitedHome: currentHome,
      doorStates,
      roomStyles,
      visitStartTime: new Date().toISOString(),
      isHost: true,
    });

    console.log('[VisitorSystem] Now hosting session for home:', currentHome.homeId);
    return true;
  }

  endHostSession(): VisitorData[] {
    if (!this.state.isHost) {
      console.warn('[VisitorSystem] Not hosting a session');
      return [];
    }

    const visitors: VisitorData[] = [];
    const now = Date.now();

    this.state.visitorPositions.forEach((pos, visitorId) => {
      visitors.push({
        visitorId,
        visitorName: 'Visitor',
        visitStartTime: this.state.visitStartTime || new Date().toISOString(),
        durationSeconds: Math.floor((now - new Date(this.state.visitStartTime || now).getTime()) / 1000),
        isOnline: false,
      });
    });

    this.updateState({
      status: 'idle',
      currentVisitedHome: null,
      visitorPositions: new Map(),
      doorStates: [],
      roomStyles: [],
      visitStartTime: null,
      visitDuration: 0,
      isHost: false,
    });

    console.log('[VisitorSystem] Host session ended with', visitors.length, 'visitors');
    return visitors;
  }

  getVisitorInfo(visitorId: string): VisitorPosition | null {
    return this.state.visitorPositions.get(visitorId) || null;
  }

  getAllVisitors(): VisitorPosition[] {
    return Array.from(this.state.visitorPositions.values());
  }

  getVisitorCount(): number {
    return this.state.visitorPositions.size;
  }

  getRoomStyle(roomName: string): RoomStyle | null {
    return this.state.roomStyles.find(s => s.roomName === roomName) || null;
  }

  getDoorState(doorId: string): DoorState | null {
    return this.state.doorStates.find(d => d.doorId === doorId) || null;
  }

  getDoorInRoom(roomName: string): DoorState[] {
    return this.state.doorStates.filter(d => d.roomName === roomName);
  }

  getVisitHistory(): VisitHistoryEntry[] {
    return [...this.visitHistory];
  }

  getVisitStats(): {
    totalVisits: number;
    totalDuration: number;
    averageDuration: number;
    uniqueHomesVisited: number;
    mostVisitedHome: string | null;
  } {
    const totalVisits = this.visitHistory.length;
    const totalDuration = this.visitHistory.reduce((sum, v) => sum + v.duration, 0);
    const averageDuration = totalVisits > 0 ? Math.round(totalDuration / totalVisits) : 0;

    const homeVisitCounts = new Map<string, number>();
    for (const visit of this.visitHistory) {
      homeVisitCounts.set(visit.homeId, (homeVisitCounts.get(visit.homeId) || 0) + 1);
    }

    const uniqueHomesVisited = homeVisitCounts.size;

    let mostVisitedHome: string | null = null;
    let maxVisits = 0;
    homeVisitCounts.forEach((count, homeId) => {
      if (count > maxVisits) {
        maxVisits = count;
        mostVisitedHome = homeId;
      }
    });

    return {
      totalVisits,
      totalDuration,
      averageDuration,
      uniqueHomesVisited,
      mostVisitedHome,
    };
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  clearError(): void {
    this.updateState({ error: null });
  }

  reset(): void {
    this.stopVisitDurationTimer();
    this.roomsVisitedThisSession.clear();

    this.state = {
      status: 'idle',
      currentVisitedHome: null,
      visitorPositions: new Map(),
      publicHomes: [],
      pendingRequests: [],
      doorStates: [],
      roomStyles: [],
      visitStartTime: null,
      visitDuration: 0,
      isHost: false,
      error: null,
      isLoading: false,
    };

    if (this.onStateChange) {
      this.onStateChange(this.state);
    }

    console.log('[VisitorSystem] Reset');
  }
}

export const visitorSystem = new VisitorSystem();
