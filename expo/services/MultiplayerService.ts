import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';
import { Position3D, PlacedItem } from '@/types/home';
import { SyncOperation, ReconnectionState } from '@/types/sync';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface PendingUpdate {
  type: 'position' | 'action' | 'state';
  data: any;
  timestamp: number;
}

const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  position: { maxRequests: 10, windowMs: 1000 },
  action: { maxRequests: 20, windowMs: 1000 },
  broadcast: { maxRequests: 30, windowMs: 1000 },
};

const DEBOUNCE_DELAYS: Record<string, number> = {
  position: 50,
  action: 100,
  stateSnapshot: 300,
};

export interface MultiplayerVisitor {
  visitorId: string;
  visitorName: string;
  avatarUrl?: string;
  position?: Position3D;
  currentRoomId?: string;
  joinedAt: string;
  isOnline: boolean;
}

export interface PlayerAction {
  type: 'move' | 'interact' | 'emote' | 'chat' | 'item_pickup' | 'item_drop';
  payload: Record<string, any>;
  timestamp: string;
  playerId: string;
}

export interface MultiplayerState {
  homeId: string;
  visitors: MultiplayerVisitor[];
  hostId: string;
  isConnected: boolean;
  stateVersion: number;
  lastSyncedAt: number;
}

export interface StateSnapshot {
  version: number;
  items: PlacedItem[];
  timestamp: number;
  checksum: string;
}

export interface StateDelta {
  fromVersion: number;
  toVersion: number;
  operations: SyncOperation[];
  timestamp: number;
}

type VisitorCallback = (visitors: MultiplayerVisitor[]) => void;
type ActionCallback = (action: PlayerAction) => void;
type ConnectionCallback = (status: 'connected' | 'disconnected' | 'error') => void;
type StateReconciliationCallback = (snapshot: StateSnapshot) => void;
type StateDeltaCallback = (delta: StateDelta) => void;

class MultiplayerService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private visitorCallbacks: Map<string, VisitorCallback[]> = new Map();
  private actionCallbacks: Map<string, ActionCallback[]> = new Map();
  private connectionCallbacks: Map<string, ConnectionCallback[]> = new Map();
  private reconciliationCallbacks: Map<string, StateReconciliationCallback[]> = new Map();
  private deltaCallbacks: Map<string, StateDeltaCallback[]> = new Map();
  private currentUserId: string | null = null;
  private currentUsername: string | null = null;
  private currentAvatarUrl: string | null = null;
  private stateVersions: Map<string, number> = new Map();
  private stateSnapshots: Map<string, StateSnapshot> = new Map();
  private pendingDeltas: Map<string, StateDelta[]> = new Map();
  private reconnectionStates: Map<string, ReconnectionState> = new Map();
  private lastHeartbeat: Map<string, number> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  private rateLimitCounters: Map<string, { count: number; resetAt: number }> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private pendingUpdates: Map<string, PendingUpdate[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private lastPositionUpdate: Map<string, Position3D> = new Map();

  setCurrentUser(userId: string, username: string, avatarUrl?: string): void {
    this.currentUserId = userId;
    this.currentUsername = username;
    this.currentAvatarUrl = avatarUrl || null;
    console.log('[MultiplayerService] Current user set:', { userId, username });
  }

  async joinHome(homeId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      console.warn('[MultiplayerService] Supabase not configured, using demo mode');
      return { success: true };
    }

    if (!this.currentUserId) {
      console.error('[MultiplayerService] No current user set');
      return { success: false, error: 'User not authenticated' };
    }

    try {
      console.log('[MultiplayerService] Joining home:', homeId);

      if (this.channels.has(homeId)) {
        console.log('[MultiplayerService] Already connected to home:', homeId);
        return { success: true };
      }

      const channel = supabase.channel(`home-presence-${homeId}`, {
        config: {
          presence: {
            key: this.currentUserId,
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const visitors = this.parsePresenceState(state);
          console.log('[MultiplayerService] Presence sync:', visitors.length, 'visitors');
          this.notifyVisitorCallbacks(homeId, visitors);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('[MultiplayerService] Visitor joined:', key, newPresences);
          const state = channel.presenceState();
          const visitors = this.parsePresenceState(state);
          this.notifyVisitorCallbacks(homeId, visitors);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('[MultiplayerService] Visitor left:', key, leftPresences);
          const state = channel.presenceState();
          const visitors = this.parsePresenceState(state);
          this.notifyVisitorCallbacks(homeId, visitors);
        })
        .on('broadcast', { event: 'player_action' }, ({ payload }) => {
          console.log('[MultiplayerService] Received action:', payload);
          this.notifyActionCallbacks(homeId, payload as PlayerAction);
        })
        .on('broadcast', { event: 'state_snapshot' }, ({ payload }) => {
          console.log('[MultiplayerService] Received state snapshot:', payload.version);
          this.handleStateSnapshot(homeId, payload as StateSnapshot);
        })
        .on('broadcast', { event: 'state_delta' }, ({ payload }) => {
          console.log('[MultiplayerService] Received state delta:', payload.fromVersion, '->', payload.toVersion);
          this.handleStateDelta(homeId, payload as StateDelta);
        })
        .on('broadcast', { event: 'request_sync' }, ({ payload }) => {
          console.log('[MultiplayerService] Received sync request from:', payload.clientId);
          this.handleSyncRequest(homeId, payload);
        });

      await channel.subscribe(async (status) => {
        console.log('[MultiplayerService] Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: this.currentUserId,
            username: this.currentUsername,
            avatar_url: this.currentAvatarUrl,
            online_at: new Date().toISOString(),
            room_id: null,
            position: { x: 0, y: 0, z: 0 },
          });
          this.notifyConnectionCallbacks(homeId, 'connected');
          this.startHeartbeat(homeId);
          await this.requestStateReconciliation(homeId);
        } else if (status === 'CHANNEL_ERROR') {
          this.notifyConnectionCallbacks(homeId, 'error');
          this.stopHeartbeat(homeId);
        } else if (status === 'CLOSED') {
          this.notifyConnectionCallbacks(homeId, 'disconnected');
          this.stopHeartbeat(homeId);
          this.saveReconnectionState(homeId);
        }
      });

      this.channels.set(homeId, channel);

      await this.recordVisit(homeId);

      return { success: true };
    } catch (error) {
      console.error('[MultiplayerService] Error joining home:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to join home' 
      };
    }
  }

  async leaveHome(homeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[MultiplayerService] Leaving home:', homeId);

      const channel = this.channels.get(homeId);
      if (channel) {
        await channel.untrack();
        await supabase.removeChannel(channel);
        this.channels.delete(homeId);
      }

      this.visitorCallbacks.delete(homeId);
      this.actionCallbacks.delete(homeId);
      this.connectionCallbacks.delete(homeId);

      await this.endVisit(homeId);

      console.log('[MultiplayerService] Left home successfully');
      return { success: true };
    } catch (error) {
      console.error('[MultiplayerService] Error leaving home:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to leave home' 
      };
    }
  }

  async updatePosition(
    homeId: string, 
    roomId: string, 
    position: Position3D
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const channel = this.channels.get(homeId);
      if (!channel) {
        return { success: false, error: 'Not connected to home' };
      }

      if (!this.checkRateLimit(`position:${homeId}`)) {
        console.log('[MultiplayerService] Position update rate limited');
        return { success: true };
      }

      const lastPos = this.lastPositionUpdate.get(homeId);
      if (lastPos && this.isPositionSimilar(lastPos, position)) {
        return { success: true };
      }

      this.lastPositionUpdate.set(homeId, position);

      await this.debouncedTrack(homeId, roomId, position);

      return { success: true };
    } catch (error) {
      console.error('[MultiplayerService] Error updating position:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update position' 
      };
    }
  }

  private isPositionSimilar(pos1: Position3D, pos2: Position3D, threshold = 0.01): boolean {
    return (
      Math.abs(pos1.x - pos2.x) < threshold &&
      Math.abs(pos1.y - pos2.y) < threshold &&
      Math.abs(pos1.z - pos2.z) < threshold
    );
  }

  private async debouncedTrack(homeId: string, roomId: string, position: Position3D): Promise<void> {
    const key = `track:${homeId}`;
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(key);
        const channel = this.channels.get(homeId);
        if (channel) {
          try {
            await channel.track({
              user_id: this.currentUserId,
              username: this.currentUsername,
              avatar_url: this.currentAvatarUrl,
              online_at: new Date().toISOString(),
              room_id: roomId,
              position,
            });
            console.log('[MultiplayerService] Debounced position updated:', { roomId, position });
          } catch (err) {
            console.warn('[MultiplayerService] Debounced track failed:', err);
          }
        }
        resolve();
      }, DEBOUNCE_DELAYS.position) as unknown as NodeJS.Timeout;
      
      this.debounceTimers.set(key, timer);
    });
  }

  async broadcastAction(
    homeId: string, 
    action: Omit<PlayerAction, 'timestamp' | 'playerId'>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const channel = this.channels.get(homeId);
      if (!channel) {
        return { success: false, error: 'Not connected to home' };
      }

      if (!this.checkRateLimit(`action:${homeId}`)) {
        this.queuePendingUpdate(homeId, { type: 'action', data: action, timestamp: Date.now() });
        return { success: true };
      }

      const fullAction: PlayerAction = {
        ...action,
        playerId: this.currentUserId || '',
        timestamp: new Date().toISOString(),
      };

      await channel.send({
        type: 'broadcast',
        event: 'player_action',
        payload: fullAction,
      });

      console.log('[MultiplayerService] Action broadcast:', fullAction.type);
      return { success: true };
    } catch (error) {
      console.error('[MultiplayerService] Error broadcasting action:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to broadcast action' 
      };
    }
  }

  private checkRateLimit(key: string): boolean {
    const now = Date.now();
    const limitKey = key.split(':')[0];
    const config = DEFAULT_RATE_LIMITS[limitKey] || DEFAULT_RATE_LIMITS.broadcast;
    
    const counter = this.rateLimitCounters.get(key);
    
    if (!counter || now >= counter.resetAt) {
      this.rateLimitCounters.set(key, { count: 1, resetAt: now + config.windowMs });
      return true;
    }
    
    if (counter.count >= config.maxRequests) {
      console.log('[MultiplayerService] Rate limit exceeded for:', key);
      return false;
    }
    
    counter.count++;
    return true;
  }

  private queuePendingUpdate(homeId: string, update: PendingUpdate): void {
    const pending = this.pendingUpdates.get(homeId) || [];
    pending.push(update);
    this.pendingUpdates.set(homeId, pending);
    
    this.scheduleBatchFlush(homeId);
  }

  private scheduleBatchFlush(homeId: string): void {
    if (this.batchTimers.has(homeId)) return;
    
    const timer = setTimeout(() => {
      this.batchTimers.delete(homeId);
      this.flushPendingUpdates(homeId);
    }, 200) as unknown as NodeJS.Timeout;
    
    this.batchTimers.set(homeId, timer);
  }

  private async flushPendingUpdates(homeId: string): Promise<void> {
    const pending = this.pendingUpdates.get(homeId) || [];
    if (pending.length === 0) return;
    
    this.pendingUpdates.set(homeId, []);
    
    const channel = this.channels.get(homeId);
    if (!channel) return;
    
    const actionUpdates = pending.filter(u => u.type === 'action');
    
    if (actionUpdates.length > 0) {
      const batchedActions = actionUpdates.map(u => ({
        ...u.data,
        playerId: this.currentUserId || '',
        timestamp: new Date(u.timestamp).toISOString(),
      }));
      
      try {
        await channel.send({
          type: 'broadcast',
          event: 'player_actions_batch',
          payload: { actions: batchedActions },
        });
        console.log('[MultiplayerService] Flushed', batchedActions.length, 'batched actions');
      } catch (err) {
        console.warn('[MultiplayerService] Batch flush failed:', err);
      }
    }
  }

  getVisitors(homeId: string): MultiplayerVisitor[] {
    const channel = this.channels.get(homeId);
    if (!channel) {
      return [];
    }

    const state = channel.presenceState();
    return this.parsePresenceState(state);
  }

  onVisitorsChange(homeId: string, callback: VisitorCallback): () => void {
    if (!this.visitorCallbacks.has(homeId)) {
      this.visitorCallbacks.set(homeId, []);
    }
    this.visitorCallbacks.get(homeId)!.push(callback);

    return () => {
      const callbacks = this.visitorCallbacks.get(homeId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  onAction(homeId: string, callback: ActionCallback): () => void {
    if (!this.actionCallbacks.has(homeId)) {
      this.actionCallbacks.set(homeId, []);
    }
    this.actionCallbacks.get(homeId)!.push(callback);

    return () => {
      const callbacks = this.actionCallbacks.get(homeId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
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
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  isConnected(homeId: string): boolean {
    return this.channels.has(homeId);
  }

  async disconnectAll(): Promise<void> {
    console.log('[MultiplayerService] Disconnecting from all homes');
    
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.batchTimers.forEach(timer => clearTimeout(timer));
    this.batchTimers.clear();
    this.pendingUpdates.clear();
    this.rateLimitCounters.clear();
    this.lastPositionUpdate.clear();
    
    const homeIds = Array.from(this.channels.keys());
    for (const homeId of homeIds) {
      await this.leaveHome(homeId);
    }
  }

  getConnectionStats(): {
    activeConnections: number;
    pendingUpdates: number;
    rateLimitedKeys: number;
  } {
    let totalPending = 0;
    this.pendingUpdates.forEach(updates => {
      totalPending += updates.length;
    });

    return {
      activeConnections: this.channels.size,
      pendingUpdates: totalPending,
      rateLimitedKeys: this.rateLimitCounters.size,
    };
  }

  private parsePresenceState(state: RealtimePresenceState): MultiplayerVisitor[] {
    const visitors: MultiplayerVisitor[] = [];

    for (const [key, presences] of Object.entries(state)) {
      if (presences && presences.length > 0) {
        const presence = presences[0] as any;
        visitors.push({
          visitorId: presence.user_id || key,
          visitorName: presence.username || 'Anonymous',
          avatarUrl: presence.avatar_url,
          position: presence.position,
          currentRoomId: presence.room_id,
          joinedAt: presence.online_at || new Date().toISOString(),
          isOnline: true,
        });
      }
    }

    return visitors;
  }

  private notifyVisitorCallbacks(homeId: string, visitors: MultiplayerVisitor[]): void {
    const callbacks = this.visitorCallbacks.get(homeId);
    if (callbacks) {
      callbacks.forEach(callback => callback(visitors));
    }
  }

  private notifyActionCallbacks(homeId: string, action: PlayerAction): void {
    const callbacks = this.actionCallbacks.get(homeId);
    if (callbacks) {
      callbacks.forEach(callback => callback(action));
    }
  }

  private notifyConnectionCallbacks(homeId: string, status: 'connected' | 'disconnected' | 'error'): void {
    const callbacks = this.connectionCallbacks.get(homeId);
    if (callbacks) {
      callbacks.forEach(callback => callback(status));
    }
  }

  private async recordVisit(homeId: string): Promise<void> {
    if (!isSupabaseConfigured || !this.currentUserId) return;

    try {
      await supabase.from('home_visits').insert({
        home_id: homeId,
        visitor_id: this.currentUserId,
        is_online: true,
      });

      await supabase.rpc('increment_home_visitors', { home_id: homeId });
      
      console.log('[MultiplayerService] Visit recorded');
    } catch (error) {
      console.warn('[MultiplayerService] Could not record visit:', error);
    }
  }

  private async endVisit(homeId: string): Promise<void> {
    if (!isSupabaseConfigured || !this.currentUserId) return;

    try {
      await supabase
        .from('home_visits')
        .update({
          visit_end_time: new Date().toISOString(),
          is_online: false,
        })
        .eq('home_id', homeId)
        .eq('visitor_id', this.currentUserId)
        .is('visit_end_time', null);

      await supabase.rpc('decrement_home_visitors', { home_id: homeId });
      
      console.log('[MultiplayerService] Visit ended');
    } catch (error) {
      console.warn('[MultiplayerService] Could not end visit:', error);
    }
  }

  private startHeartbeat(homeId: string): void {
    this.stopHeartbeat(homeId);
    
    const interval = setInterval(() => {
      this.lastHeartbeat.set(homeId, Date.now());
      const channel = this.channels.get(homeId);
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: {
            clientId: this.currentUserId,
            timestamp: Date.now(),
            stateVersion: this.stateVersions.get(homeId) || 0,
          },
        }).catch(err => console.warn('[MultiplayerService] Heartbeat failed:', err));
      }
    }, 5000) as unknown as NodeJS.Timeout;
    
    this.heartbeatIntervals.set(homeId, interval);
    console.log('[MultiplayerService] Heartbeat started for:', homeId);
  }

  private stopHeartbeat(homeId: string): void {
    const interval = this.heartbeatIntervals.get(homeId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(homeId);
      console.log('[MultiplayerService] Heartbeat stopped for:', homeId);
    }
  }

  private saveReconnectionState(homeId: string): void {
    const currentVersion = this.stateVersions.get(homeId) || 0;
    const reconnectionState: ReconnectionState = {
      lastSyncedVersion: currentVersion,
      missedOperations: [],
      requiresFullSync: false,
    };
    this.reconnectionStates.set(homeId, reconnectionState);
    console.log('[MultiplayerService] Saved reconnection state for:', homeId, 'version:', currentVersion);
  }

  async requestStateReconciliation(homeId: string): Promise<void> {
    const channel = this.channels.get(homeId);
    if (!channel) return;

    const reconnectionState = this.reconnectionStates.get(homeId);
    const lastVersion = reconnectionState?.lastSyncedVersion || 0;

    console.log('[MultiplayerService] Requesting state reconciliation from version:', lastVersion);

    await channel.send({
      type: 'broadcast',
      event: 'request_sync',
      payload: {
        clientId: this.currentUserId,
        fromVersion: lastVersion,
        timestamp: Date.now(),
      },
    });
  }

  private handleStateSnapshot(homeId: string, snapshot: StateSnapshot): void {
    const currentVersion = this.stateVersions.get(homeId) || 0;
    
    if (snapshot.version > currentVersion) {
      this.stateSnapshots.set(homeId, snapshot);
      this.stateVersions.set(homeId, snapshot.version);
      this.notifyReconciliationCallbacks(homeId, snapshot);
      console.log('[MultiplayerService] Applied state snapshot, new version:', snapshot.version);
    } else {
      console.log('[MultiplayerService] Ignored older snapshot:', snapshot.version, 'current:', currentVersion);
    }
  }

  private handleStateDelta(homeId: string, delta: StateDelta): void {
    const currentVersion = this.stateVersions.get(homeId) || 0;

    if (delta.fromVersion === currentVersion) {
      this.stateVersions.set(homeId, delta.toVersion);
      this.notifyDeltaCallbacks(homeId, delta);
      this.processPendingDeltas(homeId);
      console.log('[MultiplayerService] Applied delta, new version:', delta.toVersion);
    } else if (delta.fromVersion > currentVersion) {
      const pending = this.pendingDeltas.get(homeId) || [];
      pending.push(delta);
      pending.sort((a, b) => a.fromVersion - b.fromVersion);
      this.pendingDeltas.set(homeId, pending);
      console.log('[MultiplayerService] Queued delta for later, from:', delta.fromVersion, 'current:', currentVersion);
    } else {
      console.log('[MultiplayerService] Ignored outdated delta:', delta.fromVersion, '->', delta.toVersion);
    }
  }

  private processPendingDeltas(homeId: string): void {
    const pending = this.pendingDeltas.get(homeId) || [];
    const currentVersion = this.stateVersions.get(homeId) || 0;

    let processed = 0;
    for (const delta of pending) {
      if (delta.fromVersion === currentVersion) {
        this.stateVersions.set(homeId, delta.toVersion);
        this.notifyDeltaCallbacks(homeId, delta);
        processed++;
      } else {
        break;
      }
    }

    if (processed > 0) {
      this.pendingDeltas.set(homeId, pending.slice(processed));
      console.log('[MultiplayerService] Processed', processed, 'pending deltas');
    }
  }

  private handleSyncRequest(homeId: string, payload: { clientId: string; fromVersion: number }): void {
    if (payload.clientId === this.currentUserId) return;

    const currentSnapshot = this.stateSnapshots.get(homeId);
    if (currentSnapshot && currentSnapshot.version > payload.fromVersion) {
      const channel = this.channels.get(homeId);
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'state_snapshot',
          payload: currentSnapshot,
        }).catch(err => console.warn('[MultiplayerService] Failed to send snapshot:', err));
      }
    }
  }

  async broadcastStateSnapshot(homeId: string, snapshot: StateSnapshot): Promise<void> {
    const channel = this.channels.get(homeId);
    if (!channel) return;

    this.stateSnapshots.set(homeId, snapshot);
    this.stateVersions.set(homeId, snapshot.version);

    await this.debouncedBroadcast(homeId, 'state_snapshot', snapshot);

    console.log('[MultiplayerService] Broadcast state snapshot, version:', snapshot.version);
  }

  private async debouncedBroadcast(
    homeId: string,
    event: string,
    payload: any
  ): Promise<void> {
    const key = `broadcast:${homeId}:${event}`;
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    return new Promise((resolve) => {
      const delay = DEBOUNCE_DELAYS.stateSnapshot;
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(key);
        const channel = this.channels.get(homeId);
        if (channel && this.checkRateLimit(`broadcast:${homeId}`)) {
          try {
            await channel.send({
              type: 'broadcast',
              event,
              payload,
            });
            console.log('[MultiplayerService] Debounced broadcast sent:', event);
          } catch (err) {
            console.warn('[MultiplayerService] Debounced broadcast failed:', err);
          }
        }
        resolve();
      }, delay) as unknown as NodeJS.Timeout;
      
      this.debounceTimers.set(key, timer);
    });
  }

  async broadcastStateDelta(homeId: string, delta: StateDelta): Promise<void> {
    const channel = this.channels.get(homeId);
    if (!channel) return;

    this.stateVersions.set(homeId, delta.toVersion);

    await channel.send({
      type: 'broadcast',
      event: 'state_delta',
      payload: delta,
    });

    console.log('[MultiplayerService] Broadcast state delta:', delta.fromVersion, '->', delta.toVersion);
  }

  onStateReconciliation(homeId: string, callback: StateReconciliationCallback): () => void {
    if (!this.reconciliationCallbacks.has(homeId)) {
      this.reconciliationCallbacks.set(homeId, []);
    }
    this.reconciliationCallbacks.get(homeId)!.push(callback);

    return () => {
      const callbacks = this.reconciliationCallbacks.get(homeId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  onStateDelta(homeId: string, callback: StateDeltaCallback): () => void {
    if (!this.deltaCallbacks.has(homeId)) {
      this.deltaCallbacks.set(homeId, []);
    }
    this.deltaCallbacks.get(homeId)!.push(callback);

    return () => {
      const callbacks = this.deltaCallbacks.get(homeId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  private notifyReconciliationCallbacks(homeId: string, snapshot: StateSnapshot): void {
    const callbacks = this.reconciliationCallbacks.get(homeId);
    if (callbacks) {
      callbacks.forEach(callback => callback(snapshot));
    }
  }

  private notifyDeltaCallbacks(homeId: string, delta: StateDelta): void {
    const callbacks = this.deltaCallbacks.get(homeId);
    if (callbacks) {
      callbacks.forEach(callback => callback(delta));
    }
  }

  getStateVersion(homeId: string): number {
    return this.stateVersions.get(homeId) || 0;
  }

  getStateSnapshot(homeId: string): StateSnapshot | undefined {
    return this.stateSnapshots.get(homeId);
  }

  generateChecksum(items: PlacedItem[]): string {
    const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
    const str = JSON.stringify(sorted.map(i => ({ id: i.id, pos: i.position, rot: i.rotation })));
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

export const multiplayerService = new MultiplayerService();
export default multiplayerService;
