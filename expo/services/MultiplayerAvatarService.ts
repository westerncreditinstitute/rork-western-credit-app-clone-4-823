import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MultiplayerAvatar,
  AvatarPosition,
} from '@/types/multiplayerIntegration';
import { multiplayerAnalyticsService } from './MultiplayerAnalyticsService';

const STORAGE_KEY = 'multiplayer_avatars';
const POSITION_UPDATE_THROTTLE = 100;
const STATUS_COLORS = {
  online: '#22C55E',
  away: '#F59E0B',
  busy: '#EF4444',
  offline: '#6B7280',
};

type AvatarUpdateCallback = (avatar: MultiplayerAvatar) => void;
type PositionUpdateCallback = (position: AvatarPosition) => void;
type StatusChangeCallback = (userId: string, status: MultiplayerAvatar['statusIndicator']) => void;

class MultiplayerAvatarService {
  private avatarCache: Map<string, MultiplayerAvatar> = new Map();
  private positionCache: Map<string, AvatarPosition> = new Map();
  private homeChannels: Map<string, RealtimeChannel> = new Map();
  private avatarUpdateCallbacks: AvatarUpdateCallback[] = [];
  private positionUpdateCallbacks: PositionUpdateCallback[] = [];
  private statusChangeCallbacks: StatusChangeCallback[] = [];
  private currentUserId: string | null = null;
  private currentAvatar: MultiplayerAvatar | null = null;
  private lastPositionUpdate: Map<string, number> = new Map();
  private isInitialized: boolean = false;

  async initialize(userId: string, avatar: MultiplayerAvatar): Promise<void> {
    if (this.isInitialized && this.currentUserId === userId) {
      console.log('[MultiplayerAvatar] Already initialized for user:', userId);
      return;
    }

    this.currentUserId = userId;
    this.currentAvatar = avatar;

    await this.loadCachedAvatars();

    this.avatarCache.set(userId, avatar);
    await this.saveCachedAvatars();

    if (isSupabaseConfigured) {
      await this.syncAvatarToDatabase(avatar);
    }

    this.isInitialized = true;
    console.log('[MultiplayerAvatar] Initialized for user:', userId);
  }

  async joinHomeAvatarChannel(homeId: string): Promise<void> {
    if (!isSupabaseConfigured || !this.currentUserId || !this.currentAvatar) return;

    if (this.homeChannels.has(homeId)) {
      console.log('[MultiplayerAvatar] Already in home channel:', homeId);
      return;
    }

    const channel = supabase.channel(`avatar-positions-${homeId}`, {
      config: {
        presence: {
          key: this.currentUserId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        this.syncAvatarsFromPresence(state);
      })
      .on('broadcast', { event: 'avatar_move' }, ({ payload }) => {
        this.handleAvatarMove(payload as AvatarPosition);
      })
      .on('broadcast', { event: 'avatar_update' }, ({ payload }) => {
        this.handleAvatarUpdate(payload as MultiplayerAvatar);
      })
      .on('broadcast', { event: 'status_change' }, ({ payload }) => {
        this.handleStatusChange(payload.userId, payload.status);
      });

    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: this.currentUserId,
          avatar: this.currentAvatar,
          position: this.positionCache.get(`${this.currentUserId}:${homeId}`),
          joined_at: Date.now(),
        });
        console.log('[MultiplayerAvatar] Joined home channel:', homeId);
      }
    });

    this.homeChannels.set(homeId, channel);
  }

  async leaveHomeAvatarChannel(homeId: string): Promise<void> {
    const channel = this.homeChannels.get(homeId);
    if (channel) {
      await channel.untrack();
      await supabase.removeChannel(channel);
      this.homeChannels.delete(homeId);
      console.log('[MultiplayerAvatar] Left home channel:', homeId);
    }
  }

  async updatePosition(
    homeId: string,
    x: number,
    y: number,
    z: number,
    rotation: number,
    roomId?: string,
    animation?: string
  ): Promise<void> {
    if (!this.currentUserId) return;

    const key = `${this.currentUserId}:${homeId}`;
    const now = Date.now();
    const lastUpdate = this.lastPositionUpdate.get(key) || 0;

    if (now - lastUpdate < POSITION_UPDATE_THROTTLE) {
      return;
    }

    this.lastPositionUpdate.set(key, now);

    const position: AvatarPosition = {
      userId: this.currentUserId,
      homeId,
      roomId,
      x,
      y,
      z,
      rotation,
      animation,
    };

    this.positionCache.set(key, position);

    const channel = this.homeChannels.get(homeId);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'avatar_move',
        payload: position,
      });
    }
  }

  async updateAvatar(updates: Partial<MultiplayerAvatar>): Promise<void> {
    if (!this.currentUserId || !this.currentAvatar) return;

    this.currentAvatar = { ...this.currentAvatar, ...updates };
    this.avatarCache.set(this.currentUserId, this.currentAvatar);

    await this.saveCachedAvatars();

    if (isSupabaseConfigured) {
      await this.syncAvatarToDatabase(this.currentAvatar);
    }

    for (const channel of this.homeChannels.values()) {
      await channel.send({
        type: 'broadcast',
        event: 'avatar_update',
        payload: this.currentAvatar,
      });
    }

    this.notifyAvatarUpdateCallbacks(this.currentAvatar);

    multiplayerAnalyticsService.trackAvatarUpdate(this.currentUserId, updates);

    console.log('[MultiplayerAvatar] Avatar updated');
  }

  async updateStatus(status: MultiplayerAvatar['statusIndicator']): Promise<void> {
    if (!this.currentUserId || !this.currentAvatar) return;

    this.currentAvatar.statusIndicator = status;
    this.avatarCache.set(this.currentUserId, this.currentAvatar);

    for (const channel of this.homeChannels.values()) {
      await channel.send({
        type: 'broadcast',
        event: 'status_change',
        payload: { userId: this.currentUserId, status },
      });
    }

    this.notifyStatusChangeCallbacks(this.currentUserId, status);

    console.log('[MultiplayerAvatar] Status updated to:', status);
  }

  getAvatar(userId: string): MultiplayerAvatar | null {
    return this.avatarCache.get(userId) || null;
  }

  getCurrentAvatar(): MultiplayerAvatar | null {
    return this.currentAvatar;
  }

  getAvatarPosition(userId: string, homeId: string): AvatarPosition | null {
    return this.positionCache.get(`${userId}:${homeId}`) || null;
  }

  getAvatarsInHome(homeId: string): MultiplayerAvatar[] {
    const channel = this.homeChannels.get(homeId);
    if (!channel) return [];

    const state = channel.presenceState();
    const avatars: MultiplayerAvatar[] = [];

    for (const presences of Object.values(state)) {
      if (Array.isArray(presences) && presences.length > 0) {
        const presence = presences[0] as any;
        if (presence.avatar) {
          avatars.push(presence.avatar);
        }
      }
    }

    return avatars;
  }

  getPositionsInHome(homeId: string): AvatarPosition[] {
    const positions: AvatarPosition[] = [];

    this.positionCache.forEach((position, key) => {
      if (key.endsWith(`:${homeId}`)) {
        positions.push(position);
      }
    });

    return positions;
  }

  getStatusColor(status: MultiplayerAvatar['statusIndicator']): string {
    return STATUS_COLORS[status];
  }

  generateAvatarColor(userId: string): string {
    const colors = [
      '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444',
      '#F59E0B', '#22C55E', '#06B6D4', '#6366F1',
    ];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  createDefaultAvatar(userId: string, displayName: string, avatarUrl?: string): MultiplayerAvatar {
    return {
      userId,
      displayName,
      avatarUrl,
      avatarColor: this.generateAvatarColor(userId),
      statusIndicator: 'online',
      customization: {},
      badges: [],
      level: 1,
    };
  }

  onAvatarUpdate(callback: AvatarUpdateCallback): () => void {
    this.avatarUpdateCallbacks.push(callback);
    return () => {
      const index = this.avatarUpdateCallbacks.indexOf(callback);
      if (index > -1) this.avatarUpdateCallbacks.splice(index, 1);
    };
  }

  onPositionUpdate(callback: PositionUpdateCallback): () => void {
    this.positionUpdateCallbacks.push(callback);
    return () => {
      const index = this.positionUpdateCallbacks.indexOf(callback);
      if (index > -1) this.positionUpdateCallbacks.splice(index, 1);
    };
  }

  onStatusChange(callback: StatusChangeCallback): () => void {
    this.statusChangeCallbacks.push(callback);
    return () => {
      const index = this.statusChangeCallbacks.indexOf(callback);
      if (index > -1) this.statusChangeCallbacks.splice(index, 1);
    };
  }

  private syncAvatarsFromPresence(state: any): void {
    for (const [key, presences] of Object.entries(state)) {
      if (Array.isArray(presences) && presences.length > 0) {
        const presence = presences[0] as any;
        if (presence.avatar) {
          this.avatarCache.set(presence.user_id || key, presence.avatar);
          this.notifyAvatarUpdateCallbacks(presence.avatar);
        }
        if (presence.position) {
          const positionKey = `${presence.user_id}:${presence.position.homeId}`;
          this.positionCache.set(positionKey, presence.position);
        }
      }
    }
  }

  private handleAvatarMove(position: AvatarPosition): void {
    if (position.userId === this.currentUserId) return;

    const key = `${position.userId}:${position.homeId}`;
    this.positionCache.set(key, position);

    this.notifyPositionUpdateCallbacks(position);
  }

  private handleAvatarUpdate(avatar: MultiplayerAvatar): void {
    if (avatar.userId === this.currentUserId) return;

    this.avatarCache.set(avatar.userId, avatar);
    this.notifyAvatarUpdateCallbacks(avatar);
  }

  private handleStatusChange(userId: string, status: MultiplayerAvatar['statusIndicator']): void {
    if (userId === this.currentUserId) return;

    const avatar = this.avatarCache.get(userId);
    if (avatar) {
      avatar.statusIndicator = status;
      this.avatarCache.set(userId, avatar);
    }

    this.notifyStatusChangeCallbacks(userId, status);
  }

  private notifyAvatarUpdateCallbacks(avatar: MultiplayerAvatar): void {
    this.avatarUpdateCallbacks.forEach(cb => cb(avatar));
  }

  private notifyPositionUpdateCallbacks(position: AvatarPosition): void {
    this.positionUpdateCallbacks.forEach(cb => cb(position));
  }

  private notifyStatusChangeCallbacks(userId: string, status: MultiplayerAvatar['statusIndicator']): void {
    this.statusChangeCallbacks.forEach(cb => cb(userId, status));
  }

  private async syncAvatarToDatabase(avatar: MultiplayerAvatar): Promise<void> {
    if (!isSupabaseConfigured) return;

    try {
      await supabase.from('user_avatars').upsert({
        user_id: avatar.userId,
        display_name: avatar.displayName,
        avatar_url: avatar.avatarUrl,
        avatar_color: avatar.avatarColor,
        status_indicator: avatar.statusIndicator,
        customization: avatar.customization,
        badges: avatar.badges,
        level: avatar.level,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('[MultiplayerAvatar] Failed to sync avatar to database:', error);
    }
  }

  async fetchAvatar(userId: string): Promise<MultiplayerAvatar | null> {
    const cached = this.avatarCache.get(userId);
    if (cached) return cached;

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('user_avatars')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (data) {
          const avatar: MultiplayerAvatar = {
            userId: data.user_id,
            displayName: data.display_name,
            avatarUrl: data.avatar_url,
            avatarColor: data.avatar_color,
            statusIndicator: data.status_indicator,
            customization: data.customization,
            badges: data.badges,
            level: data.level,
          };

          this.avatarCache.set(userId, avatar);
          return avatar;
        }
      } catch (error) {
        console.warn('[MultiplayerAvatar] Failed to fetch avatar from database:', error);
      }
    }

    return null;
  }

  private async loadCachedAvatars(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${this.currentUserId}`);
      if (stored) {
        const data = JSON.parse(stored);
        this.avatarCache = new Map(Object.entries(data));
        console.log('[MultiplayerAvatar] Loaded', this.avatarCache.size, 'cached avatars');
      }
    } catch (error) {
      console.error('[MultiplayerAvatar] Failed to load cached avatars:', error);
    }
  }

  private async saveCachedAvatars(): Promise<void> {
    try {
      const data = Object.fromEntries(this.avatarCache);
      await AsyncStorage.setItem(
        `${STORAGE_KEY}_${this.currentUserId}`,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('[MultiplayerAvatar] Failed to save cached avatars:', error);
    }
  }

  async cleanup(): Promise<void> {
    for (const [homeId] of this.homeChannels) {
      await this.leaveHomeAvatarChannel(homeId);
    }

    await this.saveCachedAvatars();

    this.avatarUpdateCallbacks = [];
    this.positionUpdateCallbacks = [];
    this.statusChangeCallbacks = [];
    this.positionCache.clear();
    this.lastPositionUpdate.clear();
    this.isInitialized = false;

    console.log('[MultiplayerAvatar] Cleanup complete');
  }
}

export const multiplayerAvatarService = new MultiplayerAvatarService();
export default multiplayerAvatarService;
