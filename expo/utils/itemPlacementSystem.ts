import { homeManager } from './homeManager';
import {
  InternalHomeData,
  RoomData,
  InternalPlacedItem,
  Vector3,
  canPlaceItem,
  canAddMoreItems,
} from '@/types/home';

type PlacedItem = InternalPlacedItem;
type HomeData = InternalHomeData;

export type PlacementMode = 'idle' | 'placing' | 'moving' | 'rotating';

export type PlacementValidation = 
  | 'valid'
  | 'invalid_position'
  | 'collision'
  | 'out_of_bounds'
  | 'room_full'
  | 'home_full'
  | 'no_permission'
  | 'blocked_by_door'
  | 'blocked_by_window';

export interface ItemDefinition {
  id: string;
  name: string;
  category: 'furniture' | 'decor' | 'electronics' | 'appliance' | 'storage' | 'lighting';
  size: Vector3;
  canRotate: boolean;
  floorPlacement: boolean;
  wallPlacement: boolean;
  stackable: boolean;
  price: number;
  imageUrl: string;
  description: string;
  // 3D Preview images for Phase 2
  preview3D?: {
    front: string;      // Front view
    side: string;       // Side view  
    top: string;        // Top-down view
    isometric: string;  // Isometric 3D-style view
  };
  modelColor?: string;  // Base color for 3D representation
}

export interface PlacementPreview {
  itemId: string;
  position: Vector3;
  rotation: Vector3;
  roomName: string;
  isValid: boolean;
  validationResult: PlacementValidation;
  snappedPosition: Vector3;
}

export interface PlacementHistoryEntry {
  action: 'place' | 'move' | 'remove' | 'rotate';
  item: PlacedItem;
  previousState?: {
    position: Vector3;
    rotation: Vector3;
  };
  timestamp: number;
}

export interface ItemPlacementState {
  mode: PlacementMode;
  selectedItem: ItemDefinition | null;
  selectedPlacedItem: PlacedItem | null;
  currentRoom: string | null;
  preview: PlacementPreview | null;
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  isOwner: boolean;
  history: PlacementHistoryEntry[];
  historyIndex: number;
}

export interface CollisionResult {
  hasCollision: boolean;
  collidingItems: PlacedItem[];
  blockedByDoor: boolean;
  blockedByWindow: boolean;
}

const DEFAULT_GRID_SIZE = 0.5;
const DOOR_CLEARANCE = 1.5;
const WINDOW_CLEARANCE = 0.5;
const MAX_HISTORY_SIZE = 50;

export class ItemPlacementSystem {
  private state: ItemPlacementState;
  private onStateChange: ((state: ItemPlacementState) => void) | null = null;
  private itemDefinitions: Map<string, ItemDefinition> = new Map();

  constructor() {
    this.state = {
      mode: 'idle',
      selectedItem: null,
      selectedPlacedItem: null,
      currentRoom: null,
      preview: null,
      gridSize: DEFAULT_GRID_SIZE,
      snapToGrid: true,
      showGrid: false,
      isOwner: false,
      history: [],
      historyIndex: -1,
    };
    console.log('[ItemPlacementSystem] Initialized');
  }

  setOnStateChange(callback: (state: ItemPlacementState) => void): void {
    this.onStateChange = callback;
  }

  private updateState(updates: Partial<ItemPlacementState>): void {
    this.state = { ...this.state, ...updates };
    console.log('[ItemPlacementSystem] State updated:', Object.keys(updates));
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  getState(): ItemPlacementState {
    return { ...this.state };
  }

  registerItemDefinition(item: ItemDefinition): void {
    this.itemDefinitions.set(item.id, item);
    console.log('[ItemPlacementSystem] Registered item definition:', item.id);
  }

  registerItemDefinitions(items: ItemDefinition[]): void {
    items.forEach(item => this.registerItemDefinition(item));
    console.log('[ItemPlacementSystem] Registered', items.length, 'item definitions');
  }

  getItemDefinition(itemId: string): ItemDefinition | undefined {
    return this.itemDefinitions.get(itemId);
  }

  setOwnership(isOwner: boolean): void {
    this.updateState({ isOwner });
    console.log('[ItemPlacementSystem] Ownership set to:', isOwner);
  }

  enterPlacementMode(item: ItemDefinition, roomName: string): boolean {
    if (!this.state.isOwner) {
      console.warn('[ItemPlacementSystem] Cannot enter placement mode - not owner');
      return false;
    }

    const home = homeManager.getCurrentHome();
    if (!home) {
      console.error('[ItemPlacementSystem] No home loaded');
      return false;
    }

    const room = home.rooms.find(r => r.roomName === roomName);
    if (!room) {
      console.error('[ItemPlacementSystem] Room not found:', roomName);
      return false;
    }

    this.updateState({
      mode: 'placing',
      selectedItem: item,
      selectedPlacedItem: null,
      currentRoom: roomName,
      showGrid: true,
      preview: null,
    });

    console.log('[ItemPlacementSystem] Entered placement mode for item:', item.id, 'in room:', roomName);
    return true;
  }

  enterMoveMode(placedItem: PlacedItem): boolean {
    if (!this.state.isOwner) {
      console.warn('[ItemPlacementSystem] Cannot enter move mode - not owner');
      return false;
    }

    const itemDef = this.itemDefinitions.get(placedItem.itemId);
    if (!itemDef) {
      console.error('[ItemPlacementSystem] Item definition not found:', placedItem.itemId);
      return false;
    }

    this.updateState({
      mode: 'moving',
      selectedItem: itemDef,
      selectedPlacedItem: placedItem,
      currentRoom: placedItem.roomName,
      showGrid: true,
      preview: {
        itemId: placedItem.itemId,
        position: { ...placedItem.position },
        rotation: { ...placedItem.rotation },
        roomName: placedItem.roomName,
        isValid: true,
        validationResult: 'valid',
        snappedPosition: { ...placedItem.position },
      },
    });

    console.log('[ItemPlacementSystem] Entered move mode for item:', placedItem.id);
    return true;
  }

  enterRotateMode(placedItem: PlacedItem): boolean {
    if (!this.state.isOwner) {
      console.warn('[ItemPlacementSystem] Cannot enter rotate mode - not owner');
      return false;
    }

    const itemDef = this.itemDefinitions.get(placedItem.itemId);
    if (!itemDef || !itemDef.canRotate) {
      console.warn('[ItemPlacementSystem] Item cannot be rotated');
      return false;
    }

    this.updateState({
      mode: 'rotating',
      selectedItem: itemDef,
      selectedPlacedItem: placedItem,
      currentRoom: placedItem.roomName,
    });

    console.log('[ItemPlacementSystem] Entered rotate mode for item:', placedItem.id);
    return true;
  }

  exitPlacementMode(): void {
    this.updateState({
      mode: 'idle',
      selectedItem: null,
      selectedPlacedItem: null,
      currentRoom: null,
      preview: null,
      showGrid: false,
    });
    console.log('[ItemPlacementSystem] Exited placement mode');
  }

  updatePreviewPosition(position: Vector3): PlacementPreview | null {
    const { mode, selectedItem, currentRoom, selectedPlacedItem } = this.state;

    if ((mode !== 'placing' && mode !== 'moving') || !selectedItem || !currentRoom) {
      return null;
    }

    const home = homeManager.getCurrentHome();
    if (!home) return null;

    const room = home.rooms.find(r => r.roomName === currentRoom);
    if (!room) return null;

    const snappedPosition = this.state.snapToGrid
      ? this.snapToGrid(position)
      : position;

    const validationResult = this.validatePlacement(
      snappedPosition,
      selectedItem,
      room,
      home,
      selectedPlacedItem?.id
    );

    const preview: PlacementPreview = {
      itemId: selectedItem.id,
      position,
      rotation: selectedPlacedItem?.rotation || { x: 0, y: 0, z: 0 },
      roomName: currentRoom,
      isValid: validationResult === 'valid',
      validationResult,
      snappedPosition,
    };

    this.updateState({ preview });
    return preview;
  }

  updatePreviewRotation(rotation: Vector3): void {
    const { preview } = this.state;
    if (!preview) return;

    const updatedPreview: PlacementPreview = {
      ...preview,
      rotation,
    };

    this.updateState({ preview: updatedPreview });
    console.log('[ItemPlacementSystem] Preview rotation updated:', rotation);
  }

  rotatePreview(degrees: number = 90): void {
    const { preview } = this.state;
    if (!preview) return;

    const newRotationY = (preview.rotation.y + degrees) % 360;
    this.updatePreviewRotation({
      ...preview.rotation,
      y: newRotationY,
    });
  }

  private snapToGrid(position: Vector3): Vector3 {
    const { gridSize } = this.state;
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize,
      z: Math.round(position.z / gridSize) * gridSize,
    };
  }

  private validatePlacement(
    position: Vector3,
    item: ItemDefinition,
    room: RoomData,
    home: HomeData,
    excludeItemId?: string
  ): PlacementValidation {
    if (!this.state.isOwner) {
      return 'no_permission';
    }

    if (!this.isWithinRoomBounds(position, item.size, room)) {
      return 'out_of_bounds';
    }

    if (this.isBlockedByDoor(position, item.size, room)) {
      return 'blocked_by_door';
    }

    if (item.wallPlacement && this.isBlockedByWindow(position, item.size, room)) {
      return 'blocked_by_window';
    }

    const collision = this.checkCollision(position, item.size, room.roomName, home, excludeItemId);
    if (collision.hasCollision) {
      return 'collision';
    }

    if (!excludeItemId) {
      if (!canPlaceItem(home, room.roomName)) {
        return 'room_full';
      }

      if (!canAddMoreItems(home)) {
        return 'home_full';
      }
    }

    return 'valid';
  }

  private isWithinRoomBounds(position: Vector3, itemSize: Vector3, room: RoomData): boolean {
    const halfWidth = itemSize.x / 2;
    const halfDepth = itemSize.z / 2;

    return (
      position.x - halfWidth >= 0 &&
      position.x + halfWidth <= room.dimensions.x &&
      position.y >= 0 &&
      position.y + itemSize.y <= room.dimensions.y &&
      position.z - halfDepth >= 0 &&
      position.z + halfDepth <= room.dimensions.z
    );
  }

  private isBlockedByDoor(position: Vector3, itemSize: Vector3, room: RoomData): boolean {
    const halfWidth = itemSize.x / 2;
    const halfDepth = itemSize.z / 2;

    for (const doorPos of room.doorPositions) {
      const itemMinX = position.x - halfWidth;
      const itemMaxX = position.x + halfWidth;
      const itemMinZ = position.z - halfDepth;
      const itemMaxZ = position.z + halfDepth;

      const doorMinX = doorPos.x - DOOR_CLEARANCE;
      const doorMaxX = doorPos.x + DOOR_CLEARANCE;
      const doorMinZ = doorPos.z - DOOR_CLEARANCE;
      const doorMaxZ = doorPos.z + DOOR_CLEARANCE;

      if (
        itemMinX < doorMaxX &&
        itemMaxX > doorMinX &&
        itemMinZ < doorMaxZ &&
        itemMaxZ > doorMinZ
      ) {
        return true;
      }
    }

    return false;
  }

  private isBlockedByWindow(position: Vector3, itemSize: Vector3, room: RoomData): boolean {
    const halfWidth = itemSize.x / 2;
    const halfDepth = itemSize.z / 2;

    for (const windowPos of room.windowPositions) {
      const itemMinX = position.x - halfWidth;
      const itemMaxX = position.x + halfWidth;
      const itemMinY = position.y;
      const itemMaxY = position.y + itemSize.y;
      const itemMinZ = position.z - halfDepth;
      const itemMaxZ = position.z + halfDepth;

      const windowMinX = windowPos.x - WINDOW_CLEARANCE;
      const windowMaxX = windowPos.x + WINDOW_CLEARANCE;
      const windowMinY = windowPos.y - 0.5;
      const windowMaxY = windowPos.y + 0.5;
      const windowMinZ = windowPos.z - WINDOW_CLEARANCE;
      const windowMaxZ = windowPos.z + WINDOW_CLEARANCE;

      if (
        itemMinX < windowMaxX &&
        itemMaxX > windowMinX &&
        itemMinY < windowMaxY &&
        itemMaxY > windowMinY &&
        itemMinZ < windowMaxZ &&
        itemMaxZ > windowMinZ
      ) {
        return true;
      }
    }

    return false;
  }

  checkCollision(
    position: Vector3,
    itemSize: Vector3,
    roomName: string,
    home: HomeData,
    excludeItemId?: string
  ): CollisionResult {
    const result: CollisionResult = {
      hasCollision: false,
      collidingItems: [],
      blockedByDoor: false,
      blockedByWindow: false,
    };

    const roomItems = home.placedItems.filter(
      item => item.roomName === roomName && item.id !== excludeItemId
    );

    const halfWidth = itemSize.x / 2;
    const halfDepth = itemSize.z / 2;

    for (const placedItem of roomItems) {
      const placedItemDef = this.itemDefinitions.get(placedItem.itemId);
      if (!placedItemDef) continue;

      const placedHalfWidth = placedItemDef.size.x / 2;
      const placedHalfDepth = placedItemDef.size.z / 2;

      const itemMinX = position.x - halfWidth;
      const itemMaxX = position.x + halfWidth;
      const itemMinY = position.y;
      const itemMaxY = position.y + itemSize.y;
      const itemMinZ = position.z - halfDepth;
      const itemMaxZ = position.z + halfDepth;

      const placedMinX = placedItem.position.x - placedHalfWidth;
      const placedMaxX = placedItem.position.x + placedHalfWidth;
      const placedMinY = placedItem.position.y;
      const placedMaxY = placedItem.position.y + placedItemDef.size.y;
      const placedMinZ = placedItem.position.z - placedHalfDepth;
      const placedMaxZ = placedItem.position.z + placedHalfDepth;

      if (
        itemMinX < placedMaxX &&
        itemMaxX > placedMinX &&
        itemMinY < placedMaxY &&
        itemMaxY > placedMinY &&
        itemMinZ < placedMaxZ &&
        itemMaxZ > placedMinZ
      ) {
        result.hasCollision = true;
        result.collidingItems.push(placedItem);
      }
    }

    return result;
  }

  confirmPlacement(): PlacedItem | null {
    const { mode, preview, selectedPlacedItem } = this.state;

    if (!preview || !preview.isValid) {
      console.error('[ItemPlacementSystem] Cannot confirm - invalid preview');
      return null;
    }

    let result: PlacedItem | null = null;

    if (mode === 'placing') {
      result = homeManager.placeItem({
        itemId: preview.itemId,
        position: preview.snappedPosition,
        rotation: preview.rotation,
        roomName: preview.roomName,
      });

      if (result) {
        this.addToHistory({
          action: 'place',
          item: result,
          timestamp: Date.now(),
        });
        console.log('[ItemPlacementSystem] Item placed:', result.id);
      }
    } else if (mode === 'moving' && selectedPlacedItem) {
      const previousState = {
        position: { ...selectedPlacedItem.position },
        rotation: { ...selectedPlacedItem.rotation },
      };

      const success = homeManager.moveItem(
        selectedPlacedItem.id,
        preview.snappedPosition,
        preview.rotation
      );

      if (success) {
        const updatedItem: PlacedItem = {
          ...selectedPlacedItem,
          position: preview.snappedPosition,
          rotation: preview.rotation,
        };

        this.addToHistory({
          action: 'move',
          item: updatedItem,
          previousState,
          timestamp: Date.now(),
        });

        result = updatedItem;
        console.log('[ItemPlacementSystem] Item moved:', selectedPlacedItem.id);
      }
    }

    this.exitPlacementMode();
    return result;
  }

  rotateItem(placedItem: PlacedItem, degrees: number = 90): boolean {
    if (!this.state.isOwner) {
      console.warn('[ItemPlacementSystem] Cannot rotate - not owner');
      return false;
    }

    const itemDef = this.itemDefinitions.get(placedItem.itemId);
    if (!itemDef || !itemDef.canRotate) {
      console.warn('[ItemPlacementSystem] Item cannot be rotated');
      return false;
    }

    const previousState = {
      position: { ...placedItem.position },
      rotation: { ...placedItem.rotation },
    };

    const newRotation: Vector3 = {
      ...placedItem.rotation,
      y: (placedItem.rotation.y + degrees) % 360,
    };

    const success = homeManager.moveItem(placedItem.id, placedItem.position, newRotation);

    if (success) {
      this.addToHistory({
        action: 'rotate',
        item: { ...placedItem, rotation: newRotation },
        previousState,
        timestamp: Date.now(),
      });
      console.log('[ItemPlacementSystem] Item rotated:', placedItem.id);
    }

    return success;
  }

  removeItem(placedItem: PlacedItem): boolean {
    if (!this.state.isOwner) {
      console.warn('[ItemPlacementSystem] Cannot remove - not owner');
      return false;
    }

    const success = homeManager.removeItem(placedItem.id);

    if (success) {
      this.addToHistory({
        action: 'remove',
        item: placedItem,
        timestamp: Date.now(),
      });
      console.log('[ItemPlacementSystem] Item removed:', placedItem.id);
    }

    return success;
  }

  private addToHistory(entry: PlacementHistoryEntry): void {
    const { history, historyIndex } = this.state;

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(entry);

    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.shift();
    }

    this.updateState({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  }

  canUndo(): boolean {
    return this.state.historyIndex >= 0;
  }

  canRedo(): boolean {
    return this.state.historyIndex < this.state.history.length - 1;
  }

  undo(): boolean {
    if (!this.canUndo()) {
      console.log('[ItemPlacementSystem] Nothing to undo');
      return false;
    }

    const entry = this.state.history[this.state.historyIndex];

    switch (entry.action) {
      case 'place':
        homeManager.removeItem(entry.item.id);
        break;

      case 'move':
      case 'rotate':
        if (entry.previousState) {
          homeManager.moveItem(
            entry.item.id,
            entry.previousState.position,
            entry.previousState.rotation
          );
        }
        break;

      case 'remove':
        homeManager.placeItem({
          itemId: entry.item.itemId,
          position: entry.item.position,
          rotation: entry.item.rotation,
          roomName: entry.item.roomName,
        });
        break;
    }

    this.updateState({ historyIndex: this.state.historyIndex - 1 });
    console.log('[ItemPlacementSystem] Undo:', entry.action);
    return true;
  }

  redo(): boolean {
    if (!this.canRedo()) {
      console.log('[ItemPlacementSystem] Nothing to redo');
      return false;
    }

    const nextIndex = this.state.historyIndex + 1;
    const entry = this.state.history[nextIndex];

    switch (entry.action) {
      case 'place':
        homeManager.placeItem({
          itemId: entry.item.itemId,
          position: entry.item.position,
          rotation: entry.item.rotation,
          roomName: entry.item.roomName,
        });
        break;

      case 'move':
      case 'rotate':
        homeManager.moveItem(entry.item.id, entry.item.position, entry.item.rotation);
        break;

      case 'remove':
        homeManager.removeItem(entry.item.id);
        break;
    }

    this.updateState({ historyIndex: nextIndex });
    console.log('[ItemPlacementSystem] Redo:', entry.action);
    return true;
  }

  setGridSize(size: number): void {
    this.updateState({ gridSize: Math.max(0.1, Math.min(2, size)) });
    console.log('[ItemPlacementSystem] Grid size set to:', this.state.gridSize);
  }

  setSnapToGrid(enabled: boolean): void {
    this.updateState({ snapToGrid: enabled });
    console.log('[ItemPlacementSystem] Snap to grid:', enabled);
  }

  setShowGrid(show: boolean): void {
    this.updateState({ showGrid: show });
    console.log('[ItemPlacementSystem] Show grid:', show);
  }

  getPlacementValidationMessage(result: PlacementValidation): string {
    const messages: Record<PlacementValidation, string> = {
      valid: 'Valid placement',
      invalid_position: 'Invalid position',
      collision: 'Collides with another item',
      out_of_bounds: 'Position is outside room boundaries',
      room_full: 'This room has reached maximum capacity',
      home_full: 'Your home has reached maximum item capacity',
      no_permission: 'You do not have permission to place items here',
      blocked_by_door: 'Cannot place items near doorways',
      blocked_by_window: 'Cannot place wall items near windows',
    };

    return messages[result];
  }

  inspectItem(placedItem: PlacedItem): {
    item: PlacedItem;
    definition: ItemDefinition | undefined;
    canInteract: boolean;
  } {
    const definition = this.itemDefinitions.get(placedItem.itemId);
    
    return {
      item: placedItem,
      definition,
      canInteract: this.state.isOwner,
    };
  }

  getItemsInView(roomName: string): PlacedItem[] {
    const home = homeManager.getCurrentHome();
    if (!home) return [];

    return home.placedItems.filter(item => item.roomName === roomName);
  }

  getRoomStats(roomName: string): {
    itemCount: number;
    maxItems: number;
    categories: Record<string, number>;
  } | null {
    const home = homeManager.getCurrentHome();
    if (!home) return null;

    const room = home.rooms.find(r => r.roomName === roomName);
    if (!room) return null;

    const roomItems = home.placedItems.filter(item => item.roomName === roomName);
    const categories: Record<string, number> = {};

    for (const item of roomItems) {
      const def = this.itemDefinitions.get(item.itemId);
      if (def) {
        categories[def.category] = (categories[def.category] || 0) + 1;
      }
    }

    return {
      itemCount: roomItems.length,
      maxItems: room.maxItems,
      categories,
    };
  }

  clearHistory(): void {
    this.updateState({ history: [], historyIndex: -1 });
    console.log('[ItemPlacementSystem] History cleared');
  }

  reset(): void {
    this.state = {
      mode: 'idle',
      selectedItem: null,
      selectedPlacedItem: null,
      currentRoom: null,
      preview: null,
      gridSize: DEFAULT_GRID_SIZE,
      snapToGrid: true,
      showGrid: false,
      isOwner: false,
      history: [],
      historyIndex: -1,
    };

    if (this.onStateChange) {
      this.onStateChange(this.state);
    }

    console.log('[ItemPlacementSystem] Reset');
  }
}

export const itemPlacementSystem = new ItemPlacementSystem();

export const SAMPLE_ITEM_DEFINITIONS: ItemDefinition[] = [
  {
    id: 'sofa_basic',
    name: 'Basic Sofa',
    category: 'furniture',
    size: { x: 2, y: 0.8, z: 0.9 },
    canRotate: true,
    floorPlacement: true,
    wallPlacement: false,
    stackable: false,
    price: 500,
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200',
    description: 'A comfortable basic sofa',
    modelColor: '#6B7280',
    preview3D: {
      front: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400',
      side: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400',
      top: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400',
      isometric: 'https://images.unsplash.com/photo-1550254478-ead40cc54513?w=400',
    },
  },
  {
    id: 'coffee_table',
    name: 'Coffee Table',
    category: 'furniture',
    size: { x: 1.2, y: 0.45, z: 0.6 },
    canRotate: true,
    floorPlacement: true,
    wallPlacement: false,
    stackable: false,
    price: 150,
    imageUrl: 'https://images.unsplash.com/photo-1499933374294-4584851497cc?w=200',
    description: 'A sleek coffee table',
    modelColor: '#92400E',
    preview3D: {
      front: 'https://images.unsplash.com/photo-1499933374294-4584851497cc?w=400',
      side: 'https://images.unsplash.com/photo-1532372576444-dda954194ad0?w=400',
      top: 'https://images.unsplash.com/photo-1499933374294-4584851497cc?w=400',
      isometric: 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=400',
    },
  },
  {
    id: 'bookshelf_tall',
    name: 'Tall Bookshelf',
    category: 'storage',
    size: { x: 0.8, y: 2, z: 0.3 },
    canRotate: true,
    floorPlacement: true,
    wallPlacement: true,
    stackable: false,
    price: 300,
    imageUrl: 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=200',
    description: 'A tall bookshelf for storage',
    modelColor: '#78350F',
    preview3D: {
      front: 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=400',
      side: 'https://images.unsplash.com/photo-1588279102819-f4220f56f10e?w=400',
      top: 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=400',
      isometric: 'https://images.unsplash.com/photo-1597072689227-8882273e8f6a?w=400',
    },
  },
  {
    id: 'tv_flatscreen',
    name: 'Flatscreen TV',
    category: 'electronics',
    size: { x: 1.2, y: 0.7, z: 0.1 },
    canRotate: true,
    floorPlacement: false,
    wallPlacement: true,
    stackable: false,
    price: 800,
    imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=200',
    description: 'A modern flatscreen TV',
    modelColor: '#1F2937',
    preview3D: {
      front: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400',
      side: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400',
      top: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400',
      isometric: 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=400',
    },
  },
  {
    id: 'plant_pot',
    name: 'Potted Plant',
    category: 'decor',
    size: { x: 0.3, y: 0.6, z: 0.3 },
    canRotate: false,
    floorPlacement: true,
    wallPlacement: false,
    stackable: false,
    price: 50,
    imageUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=200',
    description: 'A decorative potted plant',
    modelColor: '#166534',
    preview3D: {
      front: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400',
      side: 'https://images.unsplash.com/photo-1463320898484-cdee8141c787?w=400',
      top: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400',
      isometric: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400',
    },
  },
  {
    id: 'floor_lamp',
    name: 'Floor Lamp',
    category: 'lighting',
    size: { x: 0.3, y: 1.6, z: 0.3 },
    canRotate: false,
    floorPlacement: true,
    wallPlacement: false,
    stackable: false,
    price: 120,
    imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=200',
    description: 'An elegant floor lamp',
    modelColor: '#D4A574',
    preview3D: {
      front: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400',
      side: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400',
      top: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400',
      isometric: 'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=400',
    },
  },
  {
    id: 'bed_queen',
    name: 'Queen Bed',
    category: 'furniture',
    size: { x: 1.6, y: 0.6, z: 2 },
    canRotate: true,
    floorPlacement: true,
    wallPlacement: false,
    stackable: false,
    price: 1200,
    imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=200',
    description: 'A comfortable queen-sized bed',
    modelColor: '#E5E7EB',
    preview3D: {
      front: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400',
      side: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400',
      top: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400',
      isometric: 'https://images.unsplash.com/photo-1588046130717-0eb0c9a3ba15?w=400',
    },
  },
  {
    id: 'desk_office',
    name: 'Office Desk',
    category: 'furniture',
    size: { x: 1.4, y: 0.75, z: 0.7 },
    canRotate: true,
    floorPlacement: true,
    wallPlacement: false,
    stackable: false,
    price: 350,
    imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=200',
    description: 'A functional office desk',
    modelColor: '#374151',
    preview3D: {
      front: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400',
      side: 'https://images.unsplash.com/photo-1519974719765-e6559eac2575?w=400',
      top: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400',
      isometric: 'https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=400',
    },
  },
  {
    id: 'dining_table',
    name: 'Dining Table',
    category: 'furniture',
    size: { x: 1.8, y: 0.75, z: 0.9 },
    canRotate: true,
    floorPlacement: true,
    wallPlacement: false,
    stackable: false,
    price: 600,
    imageUrl: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=200',
    description: 'A dining table for the family',
    modelColor: '#451A03',
    preview3D: {
      front: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400',
      side: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=400',
      top: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400',
      isometric: 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=400',
    },
  },
  {
    id: 'refrigerator',
    name: 'Refrigerator',
    category: 'appliance',
    size: { x: 0.8, y: 1.8, z: 0.7 },
    canRotate: true,
    floorPlacement: true,
    wallPlacement: false,
    stackable: false,
    price: 1500,
    imageUrl: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=200',
    description: 'A modern refrigerator',
    modelColor: '#D1D5DB',
    preview3D: {
      front: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400',
      side: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400',
      top: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400',
      isometric: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400',
    },
  },
];
