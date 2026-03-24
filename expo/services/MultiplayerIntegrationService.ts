import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  MultiplayerUser,
  MultiplayerPresence,
  IntegrationConfig,
  DEFAULT_INTEGRATION_CONFIG,
  MultiplayerEvent,
  MultiplayerEventType,
} from '@/types/multiplayerIntegration';
import { multiplayerService } from './MultiplayerService';
import { rateLimitService } from './RateLimitService';

type PresenceCallback = (presences: MultiplayerPresence[]) => void;
type EventCallback = (event: MultiplayerEvent) => void;
type ConnectionCallback = (status: 'connected' | 'disconnected' | 'error') => void;

class MultiplayerIntegrationService {
  private config: IntegrationConfig = DEFAULT_INTEGRATION_CONFIG;
  private currentUser: MultiplayerUser | null = null;
  private globalChannel: RealtimeChannel | null = null;
  private presenceCallbacks: PresenceCallback[] = [];
  private eventCallbacks: EventCallback[] = [];
  private connectionCallbacks: ConnectionCallback[] = [];
  private isInitialized: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private eventQueue: MultiplayerEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  async initialize(user: MultiplayerUser, config?: Partial<IntegrationConfig>): Promise<boolean> {
    if (this.isInitialized) {
      console.log('[MultiplayerIntegration] Already initialized');
      return true;
    }

    try {
      this.currentUser = user;
      this.config = { ...DEFAULT_INTEGRATION_CONFIG, ...config };

      console.log('[MultiplayerIntegration] Initializing with config:', this.config);

      multiplayerService.setCurrentUser(user.id, user.name, user.avatar);

      await rateLimitService.initialize();

      if (isSupabaseConfigured && this.config.enablePresence) {
        await this.setupGlobalPresence();
      }

      this.isInitialized = true;
      console.log('[MultiplayerIntegration] Initialized successfully for user:', user.id);
      return true;
    } catch (error) {
      console.error('[MultiplayerIntegration] Initialization failed:', error);
      return false;
    }
  }

  private async setupGlobalPresence(): Promise<void> {
    if (!isSupabaseConfigured || !this.currentUser) return;

    try {
      this.globalChannel = supabase.channel('global-presence', {
        config: {
          presence: {
            key: this.currentUser.id,
          },
        },
      });

      this.globalChannel
        .on('presence', { event: 'sync' }, () => {
          const state = this.globalChannel?.presenceState();
          if (state) {
            const presences = this.parseGlobalPresence(state);
            this.notifyPresenceCallbacks(presences);
          }
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('[MultiplayerIntegration] User joined:', key);
          this.emitEvent('visitor_join', { userId: key, presences: newPresences });
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('[MultiplayerIntegration] User left:', key);
          this.emitEvent('visitor_leave', { userId: key, presences: leftPresences });
        })
        .on('broadcast', { event: 'global_event' }, ({ payload }) => {
          this.handleGlobalEvent(payload as MultiplayerEvent);
        });

      await this.globalChannel.subscribe(async (status) => {
        console.log('[MultiplayerIntegration] Global channel status:', status);
        
        if (status === 'SUBSCRIBED') {
          await this.globalChannel?.track({
            user_id: this.currentUser!.id,
            user_name: this.currentUser!.name,
            avatar: this.currentUser!.avatar,
            status: 'active',
            online_at: Date.now(),
          });
          this.notifyConnectionCallbacks('connected');
          this.reconnectAttempts = 0;
        } else if (status === 'CHANNEL_ERROR') {
          this.notifyConnectionCallbacks('error');
          this.scheduleReconnect();
        } else if (status === 'CLOSED') {
          this.notifyConnectionCallbacks('disconnected');
        }
      });

      console.log('[MultiplayerIntegration] Global presence setup complete');
    } catch (error) {
      console.error('[MultiplayerIntegration] Failed to setup global presence:', error);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      console.log('[MultiplayerIntegration] Max reconnect attempts reached');
      return;
    }

    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log('[MultiplayerIntegration] Scheduling reconnect in', delay, 'ms');

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectAttempts++;
      console.log('[MultiplayerIntegration] Reconnect attempt', this.reconnectAttempts);
      
      if (this.globalChannel) {
        await supabase.removeChannel(this.globalChannel);
        this.globalChannel = null;
      }
      
      await this.setupGlobalPresence();
    }, delay) as unknown as NodeJS.Timeout;
  }

  private parseGlobalPresence(state: any): MultiplayerPresence[] {
    const presences: MultiplayerPresence[] = [];

    for (const [key, values] of Object.entries(state)) {
      if (Array.isArray(values) && values.length > 0) {
        const presence = values[0] as any;
        presences.push({
          userId: presence.user_id || key,
          homeId: presence.home_id || '',
          roomId: presence.room_id,
          status: presence.status || 'active',
          joinedAt: presence.online_at || Date.now(),
          lastActivity: Date.now(),
          position: presence.position,
        });
      }
    }

    return presences;
  }

  async joinHome(homeId: string): Promise<boolean> {
    if (!this.currentUser) {
      console.error('[MultiplayerIntegration] No user set');
      return false;
    }

    const rateLimitResult = await rateLimitService.consumeRateLimit(
      this.currentUser.id,
      'home_visit'
    );

    if (!rateLimitResult.allowed) {
      console.warn('[MultiplayerIntegration] Rate limited for home visits');
      return false;
    }

    const result = await multiplayerService.joinHome(homeId);
    
    if (result.success) {
      this.emitEvent('session_start', { homeId });
      
      if (this.globalChannel) {
        await this.globalChannel.track({
          user_id: this.currentUser.id,
          user_name: this.currentUser.name,
          avatar: this.currentUser.avatar,
          status: 'active',
          home_id: homeId,
          online_at: Date.now(),
        });
      }
    }

    return result.success;
  }

  async leaveHome(homeId: string): Promise<boolean> {
    const result = await multiplayerService.leaveHome(homeId);
    
    if (result.success) {
      this.emitEvent('session_end', { homeId });
      
      if (this.globalChannel && this.currentUser) {
        await this.globalChannel.track({
          user_id: this.currentUser.id,
          user_name: this.currentUser.name,
          avatar: this.currentUser.avatar,
          status: 'active',
          home_id: null,
          online_at: Date.now(),
        });
      }
    }

    return result.success;
  }

  async updateUserStatus(status: 'active' | 'idle' | 'away'): Promise<void> {
    if (!this.globalChannel || !this.currentUser) return;

    await this.globalChannel.track({
      user_id: this.currentUser.id,
      user_name: this.currentUser.name,
      avatar: this.currentUser.avatar,
      status,
      online_at: Date.now(),
    });
  }

  emitEvent(type: MultiplayerEventType, data: Record<string, any>): void {
    if (!this.currentUser) return;

    const event: MultiplayerEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      userId: this.currentUser.id,
      homeId: data.homeId,
      businessId: data.businessId,
      sessionId: data.sessionId,
      data,
      timestamp: Date.now(),
    };

    this.eventQueue.push(event);
    this.notifyEventCallbacks(event);

    if (this.config.enableAnalytics) {
      this.scheduleEventFlush();
    }

    if (this.globalChannel) {
      this.globalChannel.send({
        type: 'broadcast',
        event: 'global_event',
        payload: event,
      }).catch(err => console.warn('[MultiplayerIntegration] Failed to broadcast event:', err));
    }
  }

  private scheduleEventFlush(): void {
    if (this.flushTimer) return;

    this.flushTimer = setTimeout(() => {
      this.flushEvents();
      this.flushTimer = null;
    }, this.config.analyticsFlushInterval) as unknown as NodeJS.Timeout;
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    if (isSupabaseConfigured) {
      try {
        await supabase.from('multiplayer_events').insert(
          events.map(e => ({
            id: e.id,
            event_type: e.type,
            user_id: e.userId,
            home_id: e.homeId,
            business_id: e.businessId,
            session_id: e.sessionId,
            event_data: e.data,
            created_at: new Date(e.timestamp).toISOString(),
          }))
        );
        console.log('[MultiplayerIntegration] Flushed', events.length, 'events');
      } catch (error) {
        console.warn('[MultiplayerIntegration] Failed to flush events:', error);
        this.eventQueue.unshift(...events);
      }
    }
  }

  private handleGlobalEvent(event: MultiplayerEvent): void {
    if (event.userId === this.currentUser?.id) return;
    this.notifyEventCallbacks(event);
  }

  onPresenceChange(callback: PresenceCallback): () => void {
    this.presenceCallbacks.push(callback);
    return () => {
      const index = this.presenceCallbacks.indexOf(callback);
      if (index > -1) this.presenceCallbacks.splice(index, 1);
    };
  }

  onEvent(callback: EventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const index = this.eventCallbacks.indexOf(callback);
      if (index > -1) this.eventCallbacks.splice(index, 1);
    };
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.push(callback);
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) this.connectionCallbacks.splice(index, 1);
    };
  }

  private notifyPresenceCallbacks(presences: MultiplayerPresence[]): void {
    this.presenceCallbacks.forEach(cb => cb(presences));
  }

  private notifyEventCallbacks(event: MultiplayerEvent): void {
    this.eventCallbacks.forEach(cb => cb(event));
  }

  private notifyConnectionCallbacks(status: 'connected' | 'disconnected' | 'error'): void {
    this.connectionCallbacks.forEach(cb => cb(status));
  }

  getOnlineUsers(): MultiplayerPresence[] {
    if (!this.globalChannel) return [];
    const state = this.globalChannel.presenceState();
    return this.parseGlobalPresence(state);
  }

  getOnlineUsersInHome(homeId: string): MultiplayerPresence[] {
    return this.getOnlineUsers().filter(p => p.homeId === homeId);
  }

  getCurrentUser(): MultiplayerUser | null {
    return this.currentUser;
  }

  isUserOnline(userId: string): boolean {
    return this.getOnlineUsers().some(p => p.userId === userId);
  }

  getConfig(): IntegrationConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('[MultiplayerIntegration] Config updated:', this.config);
  }

  async cleanup(): Promise<void> {
    console.log('[MultiplayerIntegration] Cleaning up...');

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flushEvents();

    if (this.globalChannel) {
      await this.globalChannel.untrack();
      await supabase.removeChannel(this.globalChannel);
      this.globalChannel = null;
    }

    await multiplayerService.disconnectAll();

    this.presenceCallbacks = [];
    this.eventCallbacks = [];
    this.connectionCallbacks = [];
    this.currentUser = null;
    this.isInitialized = false;

    console.log('[MultiplayerIntegration] Cleanup complete');
  }

  getStats(): {
    isInitialized: boolean;
    isConnected: boolean;
    onlineUsers: number;
    queuedEvents: number;
    reconnectAttempts: number;
  } {
    return {
      isInitialized: this.isInitialized,
      isConnected: this.globalChannel !== null,
      onlineUsers: this.getOnlineUsers().length,
      queuedEvents: this.eventQueue.length,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

export const multiplayerIntegrationService = new MultiplayerIntegrationService();
export default multiplayerIntegrationService;
