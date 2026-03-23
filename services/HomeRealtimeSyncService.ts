import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface VisitorPosition {
  visitorId: string;
  visitorName: string;
  avatar?: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  currentRoom: string;
  status: 'active' | 'idle' | 'exploring';
  lastUpdate: number;
}

export interface ItemUpdate {
  itemId: string;
  homeId: string;
  roomId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
  updatedBy: string;
  timestamp: number;
  version: number;
}

export interface RoomChangeEvent {
  visitorId: string;
  visitorName: string;
  fromRoom: string;
  toRoom: string;
  timestamp: number;
}

export interface ConflictResolution {
  itemId: string;
  localVersion: number;
  serverVersion: number;
  resolution: 'accept_server' | 'accept_local' | 'merge';
  resolvedData: ItemUpdate;
}

type VisitorPositionCallback = (positions: Map<string, VisitorPosition>) => void;
type ItemUpdateCallback = (update: ItemUpdate) => void;
type RoomChangeCallback = (event: RoomChangeEvent) => void;
type ConflictCallback = (conflict: ConflictResolution) => void;
type ConnectionCallback = (isConnected: boolean) => void;

const POSITION_UPDATE_DEBOUNCE = 100;
const ITEM_UPDATE_DEBOUNCE = 150;
const IDLE_TIMEOUT = 30000;
const STALE_POSITION_TIMEOUT = 10000;

class HomeRealtimeSyncService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private visitorPositions: Map<string, Map<string, VisitorPosition>> = new Map();
  private itemVersions: Map<string, number> = new Map();
  private pendingItemUpdates: Map<string, ItemUpdate> = new Map();
  private optimisticUpdates: Map<string, ItemUpdate[]> = new Map();
  
  private positionCallbacks: Map<string, VisitorPositionCallback[]> = new Map();
  private itemCallbacks: Map<string, ItemUpdateCallback[]> = new Map();
  private roomChangeCallbacks: Map<string, RoomChangeCallback[]> = new Map();
  private conflictCallbacks: Map<string, ConflictCallback[]> = new Map();
  private connectionCallbacks: Map<string, ConnectionCallback[]> = new Map();
  
  private currentUserId: string | null = null;
  private currentUserName: string | null = null;
  private currentUserAvatar: string | null = null;
  
  private positionDebounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private itemDebounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private idleTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private cleanupIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  setCurrentUser(userId: string, userName: string, avatarUrl?: string): void {
    this.currentUserId = userId;
    this.currentUserName = userName;
    this.currentUserAvatar = avatarUrl || null;
    console.log('[HomeRealtimeSync] Current user set:', { userId, userName });
  }

  async joinHomeSession(homeId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUserId) {
      return { success: false, error: 'User not authenticated' };
    }

    if (this.channels.has(homeId)) {
      console.log('[HomeRealtimeSync] Already connected to home:', homeId);
      return { success: true };
    }

    try {
      console.log('[HomeRealtimeSync] Joining home session:', homeId);

      if (!this.visitorPositions.has(homeId)) {
        this.visitorPositions.set(homeId, new Map());
      }

      if (!isSupabaseConfigured) {
        console.warn('[HomeRealtimeSync] Supabase not configured, using demo mode');
        this.initializeDemoVisitors(homeId);
        this.notifyConnectionCallbacks(homeId, true);
        return { success: true };
      }

      const channel = supabase.channel(`home-sync-${homeId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: this.currentUserId },
        },
      });

      channel
        .on('broadcast', { event: 'visitor_position' }, ({ payload }) => {
          this.handleVisitorPositionUpdate(homeId, payload as VisitorPosition);
        })
        .on('broadcast', { event: 'item_update' }, ({ payload }) => {
          this.handleItemUpdate(homeId, payload as ItemUpdate);
        })
        .on('broadcast', { event: 'room_change' }, ({ payload }) => {
          this.handleRoomChange(homeId, payload as RoomChangeEvent);
        })
        .on('presence', { event: 'sync' }, () => {
          this.syncPresenceState(homeId, channel);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          this.handleVisitorJoin(homeId, key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          this.handleVisitorLeave(homeId, key);
        });

      await channel.subscribe(async (status) => {
        console.log('[HomeRealtimeSync] Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          await channel.track({
            visitorId: this.currentUserId,
            visitorName: this.currentUserName,
            avatar: this.currentUserAvatar,
            joinedAt: new Date().toISOString(),
          });
          
          this.notifyConnectionCallbacks(homeId, true);
          this.startCleanupInterval(homeId);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.notifyConnectionCallbacks(homeId, false);
        }
      });

      this.channels.set(homeId, channel);
      return { success: true };
    } catch (error) {
      console.error('[HomeRealtimeSync] Error joining session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join session',
      };
    }
  }

  async leaveHomeSession(homeId: string): Promise<void> {
    console.log('[HomeRealtimeSync] Leaving home session:', homeId);

    const channel = this.channels.get(homeId);
    if (channel) {
      await channel.untrack();
      await supabase.removeChannel(channel);
      this.channels.delete(homeId);
    }

    this.visitorPositions.delete(homeId);
    this.positionCallbacks.delete(homeId);
    this.itemCallbacks.delete(homeId);
    this.roomChangeCallbacks.delete(homeId);
    this.conflictCallbacks.delete(homeId);
    this.connectionCallbacks.delete(homeId);
    this.optimisticUpdates.delete(homeId);

    const cleanupInterval = this.cleanupIntervals.get(homeId);
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      this.cleanupIntervals.delete(homeId);
    }

    const idleTimer = this.idleTimers.get(homeId);
    if (idleTimer) {
      clearTimeout(idleTimer);
      this.idleTimers.delete(homeId);
    }
  }

  updateVisitorPosition(
    homeId: string,
    position: { x: number; y: number; z: number },
    rotation: number,
    currentRoom: string,
    status: 'active' | 'idle' | 'exploring' = 'active'
  ): void {
    if (!this.currentUserId) return;

    const timerKey = `${homeId}-position`;
    const existingTimer = this.positionDebounceTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.sendPositionUpdate(homeId, position, rotation, currentRoom, status);
    }, POSITION_UPDATE_DEBOUNCE);

    this.positionDebounceTimers.set(timerKey, timer);

    this.resetIdleTimer(homeId);

    const positions = this.visitorPositions.get(homeId);
    if (positions && this.currentUserId) {
      positions.set(this.currentUserId, {
        visitorId: this.currentUserId,
        visitorName: this.currentUserName || 'You',
        avatar: this.currentUserAvatar || undefined,
        position,
        rotation,
        currentRoom,
        status,
        lastUpdate: Date.now(),
      });
      this.notifyPositionCallbacks(homeId);
    }
  }

  private async sendPositionUpdate(
    homeId: string,
    position: { x: number; y: number; z: number },
    rotation: number,
    currentRoom: string,
    status: 'active' | 'idle' | 'exploring'
  ): Promise<void> {
    const channel = this.channels.get(homeId);
    if (!channel || !this.currentUserId) return;

    const update: VisitorPosition = {
      visitorId: this.currentUserId,
      visitorName: this.currentUserName || 'Anonymous',
      avatar: this.currentUserAvatar || undefined,
      position,
      rotation,
      currentRoom,
      status,
      lastUpdate: Date.now(),
    };

    try {
      await channel.send({
        type: 'broadcast',
        event: 'visitor_position',
        payload: update,
      });
    } catch (error) {
      console.warn('[HomeRealtimeSync] Error sending position update:', error);
    }
  }

  updateItemPosition(
    homeId: string,
    itemId: string,
    roomId: string,
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number },
    scale: number
  ): void {
    if (!this.currentUserId) return;

    const currentVersion = this.itemVersions.get(itemId) || 0;
    const newVersion = currentVersion + 1;

    const update: ItemUpdate = {
      itemId,
      homeId,
      roomId,
      position,
      rotation,
      scale,
      updatedBy: this.currentUserId,
      timestamp: Date.now(),
      version: newVersion,
    };

    this.addOptimisticUpdate(homeId, update);

    const timerKey = `${homeId}-${itemId}`;
    const existingTimer = this.itemDebounceTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.pendingItemUpdates.set(timerKey, update);

    const timer = setTimeout(() => {
      const pendingUpdate = this.pendingItemUpdates.get(timerKey);
      if (pendingUpdate) {
        this.sendItemUpdate(homeId, pendingUpdate);
        this.pendingItemUpdates.delete(timerKey);
      }
    }, ITEM_UPDATE_DEBOUNCE);

    this.itemDebounceTimers.set(timerKey, timer);
  }

  private async sendItemUpdate(homeId: string, update: ItemUpdate): Promise<void> {
    const channel = this.channels.get(homeId);
    if (!channel) return;

    try {
      await channel.send({
        type: 'broadcast',
        event: 'item_update',
        payload: update,
      });

      this.itemVersions.set(update.itemId, update.version);
      this.removeOptimisticUpdate(homeId, update.itemId);

      console.log('[HomeRealtimeSync] Item update sent:', update.itemId);
    } catch (error) {
      console.warn('[HomeRealtimeSync] Error sending item update:', error);
      this.revertOptimisticUpdate(homeId, update.itemId);
    }
  }

  async changeRoom(homeId: string, fromRoom: string, toRoom: string): Promise<void> {
    if (!this.currentUserId) return;

    const event: RoomChangeEvent = {
      visitorId: this.currentUserId,
      visitorName: this.currentUserName || 'Anonymous',
      fromRoom,
      toRoom,
      timestamp: Date.now(),
    };

    const channel = this.channels.get(homeId);
    if (channel) {
      try {
        await channel.send({
          type: 'broadcast',
          event: 'room_change',
          payload: event,
        });
      } catch (error) {
        console.warn('[HomeRealtimeSync] Error sending room change:', error);
      }
    }

    this.notifyRoomChangeCallbacks(homeId, event);
  }

  private handleVisitorPositionUpdate(homeId: string, update: VisitorPosition): void {
    if (update.visitorId === this.currentUserId) return;

    const positions = this.visitorPositions.get(homeId);
    if (positions) {
      positions.set(update.visitorId, update);
      this.notifyPositionCallbacks(homeId);
    }
  }

  private handleItemUpdate(homeId: string, update: ItemUpdate): void {
    if (update.updatedBy === this.currentUserId) return;

    const currentVersion = this.itemVersions.get(update.itemId) || 0;

    if (update.version < currentVersion) {
      console.log('[HomeRealtimeSync] Ignoring stale item update:', update.itemId);
      return;
    }

    const optimisticUpdates = this.optimisticUpdates.get(homeId) || [];
    const hasLocalPending = optimisticUpdates.some(u => u.itemId === update.itemId);

    if (hasLocalPending && update.version === currentVersion) {
      console.log('[HomeRealtimeSync] Conflict detected for item:', update.itemId);
      this.resolveConflict(homeId, update);
      return;
    }

    this.itemVersions.set(update.itemId, update.version);
    this.notifyItemCallbacks(homeId, update);
  }

  private handleRoomChange(homeId: string, event: RoomChangeEvent): void {
    if (event.visitorId === this.currentUserId) return;

    const positions = this.visitorPositions.get(homeId);
    if (positions) {
      const visitor = positions.get(event.visitorId);
      if (visitor) {
        visitor.currentRoom = event.toRoom;
        visitor.lastUpdate = event.timestamp;
        this.notifyPositionCallbacks(homeId);
      }
    }

    this.notifyRoomChangeCallbacks(homeId, event);
  }

  private handleVisitorJoin(homeId: string, key: string, newPresences: any[]): void {
    console.log('[HomeRealtimeSync] Visitor joined:', key);
    
    const positions = this.visitorPositions.get(homeId);
    if (positions && newPresences.length > 0) {
      const presence = newPresences[0];
      positions.set(key, {
        visitorId: key,
        visitorName: presence.visitorName || 'Anonymous',
        avatar: presence.avatar,
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        currentRoom: 'living_room',
        status: 'active',
        lastUpdate: Date.now(),
      });
      this.notifyPositionCallbacks(homeId);
    }
  }

  private handleVisitorLeave(homeId: string, key: string): void {
    console.log('[HomeRealtimeSync] Visitor left:', key);
    
    const positions = this.visitorPositions.get(homeId);
    if (positions) {
      positions.delete(key);
      this.notifyPositionCallbacks(homeId);
    }
  }

  private syncPresenceState(homeId: string, channel: RealtimeChannel): void {
    const presenceState = channel.presenceState();
    const positions = this.visitorPositions.get(homeId) || new Map();

    Object.entries(presenceState).forEach(([key, value]) => {
      if (key === this.currentUserId) return;
      
      const presence = (value as any[])[0];
      if (!positions.has(key)) {
        positions.set(key, {
          visitorId: key,
          visitorName: presence?.visitorName || 'Anonymous',
          avatar: presence?.avatar,
          position: { x: 0, y: 0, z: 0 },
          rotation: 0,
          currentRoom: 'living_room',
          status: 'active',
          lastUpdate: Date.now(),
        });
      }
    });

    this.visitorPositions.set(homeId, positions);
    this.notifyPositionCallbacks(homeId);
  }

  private resolveConflict(homeId: string, serverUpdate: ItemUpdate): void {
    const optimisticUpdates = this.optimisticUpdates.get(homeId) || [];
    const localUpdate = optimisticUpdates.find(u => u.itemId === serverUpdate.itemId);

    if (!localUpdate) {
      this.itemVersions.set(serverUpdate.itemId, serverUpdate.version);
      this.notifyItemCallbacks(homeId, serverUpdate);
      return;
    }

    const timeDiff = Math.abs(serverUpdate.timestamp - localUpdate.timestamp);
    let resolution: ConflictResolution;

    if (timeDiff < 500) {
      resolution = {
        itemId: serverUpdate.itemId,
        localVersion: localUpdate.version,
        serverVersion: serverUpdate.version,
        resolution: 'accept_server',
        resolvedData: serverUpdate,
      };
    } else if (localUpdate.timestamp > serverUpdate.timestamp) {
      resolution = {
        itemId: serverUpdate.itemId,
        localVersion: localUpdate.version,
        serverVersion: serverUpdate.version,
        resolution: 'accept_local',
        resolvedData: localUpdate,
      };
      this.sendItemUpdate(homeId, { ...localUpdate, version: serverUpdate.version + 1 });
    } else {
      resolution = {
        itemId: serverUpdate.itemId,
        localVersion: localUpdate.version,
        serverVersion: serverUpdate.version,
        resolution: 'accept_server',
        resolvedData: serverUpdate,
      };
    }

    this.removeOptimisticUpdate(homeId, serverUpdate.itemId);
    this.itemVersions.set(serverUpdate.itemId, resolution.resolvedData.version);
    this.notifyConflictCallbacks(homeId, resolution);
    this.notifyItemCallbacks(homeId, resolution.resolvedData);
  }

  private addOptimisticUpdate(homeId: string, update: ItemUpdate): void {
    if (!this.optimisticUpdates.has(homeId)) {
      this.optimisticUpdates.set(homeId, []);
    }
    const updates = this.optimisticUpdates.get(homeId)!;
    const existingIndex = updates.findIndex(u => u.itemId === update.itemId);
    if (existingIndex >= 0) {
      updates[existingIndex] = update;
    } else {
      updates.push(update);
    }
  }

  private removeOptimisticUpdate(homeId: string, itemId: string): void {
    const updates = this.optimisticUpdates.get(homeId);
    if (updates) {
      const index = updates.findIndex(u => u.itemId === itemId);
      if (index >= 0) {
        updates.splice(index, 1);
      }
    }
  }

  private revertOptimisticUpdate(homeId: string, itemId: string): void {
    this.removeOptimisticUpdate(homeId, itemId);
    console.warn('[HomeRealtimeSync] Reverted optimistic update for:', itemId);
  }

  private resetIdleTimer(homeId: string): void {
    const existingTimer = this.idleTimers.get(homeId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      const positions = this.visitorPositions.get(homeId);
      if (positions && this.currentUserId) {
        const myPosition = positions.get(this.currentUserId);
        if (myPosition) {
          myPosition.status = 'idle';
          this.notifyPositionCallbacks(homeId);
          this.sendPositionUpdate(
            homeId,
            myPosition.position,
            myPosition.rotation,
            myPosition.currentRoom,
            'idle'
          );
        }
      }
    }, IDLE_TIMEOUT);

    this.idleTimers.set(homeId, timer);
  }

  private startCleanupInterval(homeId: string): void {
    const interval = setInterval(() => {
      const positions = this.visitorPositions.get(homeId);
      if (positions) {
        const now = Date.now();
        let changed = false;
        
        positions.forEach((pos, visitorId) => {
          if (visitorId !== this.currentUserId && now - pos.lastUpdate > STALE_POSITION_TIMEOUT) {
            positions.delete(visitorId);
            changed = true;
          }
        });
        
        if (changed) {
          this.notifyPositionCallbacks(homeId);
        }
      }
    }, STALE_POSITION_TIMEOUT / 2);

    this.cleanupIntervals.set(homeId, interval);
  }

  private initializeDemoVisitors(homeId: string): void {
    const positions = this.visitorPositions.get(homeId) || new Map();
    
    if (this.currentUserId) {
      positions.set(this.currentUserId, {
        visitorId: this.currentUserId,
        visitorName: this.currentUserName || 'You',
        avatar: this.currentUserAvatar || undefined,
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        currentRoom: 'living_room',
        status: 'active',
        lastUpdate: Date.now(),
      });
    }

    this.visitorPositions.set(homeId, positions);
    this.notifyPositionCallbacks(homeId);
  }

  getVisitorPositions(homeId: string): Map<string, VisitorPosition> {
    return this.visitorPositions.get(homeId) || new Map();
  }

  getVisitorCount(homeId: string): number {
    return this.visitorPositions.get(homeId)?.size || 0;
  }

  onVisitorPositions(homeId: string, callback: VisitorPositionCallback): () => void {
    if (!this.positionCallbacks.has(homeId)) {
      this.positionCallbacks.set(homeId, []);
    }
    this.positionCallbacks.get(homeId)!.push(callback);

    const positions = this.visitorPositions.get(homeId);
    if (positions) {
      callback(positions);
    }

    return () => {
      const callbacks = this.positionCallbacks.get(homeId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      }
    };
  }

  onItemUpdate(homeId: string, callback: ItemUpdateCallback): () => void {
    if (!this.itemCallbacks.has(homeId)) {
      this.itemCallbacks.set(homeId, []);
    }
    this.itemCallbacks.get(homeId)!.push(callback);

    return () => {
      const callbacks = this.itemCallbacks.get(homeId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      }
    };
  }

  onRoomChange(homeId: string, callback: RoomChangeCallback): () => void {
    if (!this.roomChangeCallbacks.has(homeId)) {
      this.roomChangeCallbacks.set(homeId, []);
    }
    this.roomChangeCallbacks.get(homeId)!.push(callback);

    return () => {
      const callbacks = this.roomChangeCallbacks.get(homeId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      }
    };
  }

  onConflict(homeId: string, callback: ConflictCallback): () => void {
    if (!this.conflictCallbacks.has(homeId)) {
      this.conflictCallbacks.set(homeId, []);
    }
    this.conflictCallbacks.get(homeId)!.push(callback);

    return () => {
      const callbacks = this.conflictCallbacks.get(homeId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      }
    };
  }

  onConnectionChange(homeId: string, callback: ConnectionCallback): () => void {
    if (!this.connectionCallbacks.has(homeId)) {
      this.connectionCallbacks.set(homeId, []);
    }
    this.connectionCallbacks.get(homeId)!.push(callback);

    return () => {
      const callbacks = this.connectionCallbacks.get(homeId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      }
    };
  }

  private notifyPositionCallbacks(homeId: string): void {
    const callbacks = this.positionCallbacks.get(homeId);
    const positions = this.visitorPositions.get(homeId);
    if (callbacks && positions) {
      callbacks.forEach(cb => cb(positions));
    }
  }

  private notifyItemCallbacks(homeId: string, update: ItemUpdate): void {
    const callbacks = this.itemCallbacks.get(homeId);
    if (callbacks) {
      callbacks.forEach(cb => cb(update));
    }
  }

  private notifyRoomChangeCallbacks(homeId: string, event: RoomChangeEvent): void {
    const callbacks = this.roomChangeCallbacks.get(homeId);
    if (callbacks) {
      callbacks.forEach(cb => cb(event));
    }
  }

  private notifyConflictCallbacks(homeId: string, resolution: ConflictResolution): void {
    const callbacks = this.conflictCallbacks.get(homeId);
    if (callbacks) {
      callbacks.forEach(cb => cb(resolution));
    }
  }

  private notifyConnectionCallbacks(homeId: string, isConnected: boolean): void {
    const callbacks = this.connectionCallbacks.get(homeId);
    if (callbacks) {
      callbacks.forEach(cb => cb(isConnected));
    }
  }

  isConnected(homeId: string): boolean {
    return this.channels.has(homeId);
  }

  async disconnectAll(): Promise<void> {
    console.log('[HomeRealtimeSync] Disconnecting from all sessions');
    
    const homeIds = Array.from(this.channels.keys());
    for (const homeId of homeIds) {
      await this.leaveHomeSession(homeId);
    }
  }
}

export const homeRealtimeSyncService = new HomeRealtimeSyncService();
export default homeRealtimeSyncService;
