import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';

export type UserStatus = 'online' | 'away' | 'busy' | 'offline';

export interface PresenceUser {
  userId: string;
  username: string;
  avatarUrl?: string;
  status: UserStatus;
  lastSeen: string;
  currentActivity?: string;
  currentHomeId?: string;
}

export interface FriendPresence extends PresenceUser {
  isFriend: boolean;
}

type PresenceCallback = (users: PresenceUser[]) => void;
type StatusCallback = (userId: string, status: UserStatus) => void;
type FriendsCallback = (friends: FriendPresence[]) => void;

class PresenceService {
  private globalChannel: RealtimeChannel | null = null;
  private customChannels: Map<string, RealtimeChannel> = new Map();
  private presenceCallbacks: PresenceCallback[] = [];
  private statusCallbacks: StatusCallback[] = [];
  private friendsCallbacks: FriendsCallback[] = [];
  private currentUserId: string | null = null;
  private currentUsername: string | null = null;
  private currentAvatarUrl: string | null = null;
  private currentStatus: UserStatus = 'online';
  private friendIds: Set<string> = new Set();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  setCurrentUser(userId: string, username: string, avatarUrl?: string): void {
    this.currentUserId = userId;
    this.currentUsername = username;
    this.currentAvatarUrl = avatarUrl || null;
    console.log('[PresenceService] Current user set:', { userId, username });
  }

  setFriendIds(friendIds: string[]): void {
    this.friendIds = new Set(friendIds);
    console.log('[PresenceService] Friend IDs set:', friendIds.length);
  }

  async trackPresence(): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      console.warn('[PresenceService] Supabase not configured, using demo mode');
      return { success: true };
    }

    if (!this.currentUserId) {
      console.error('[PresenceService] No current user set');
      return { success: false, error: 'User not authenticated' };
    }

    try {
      console.log('[PresenceService] Starting presence tracking');

      if (this.globalChannel) {
        console.log('[PresenceService] Already tracking presence');
        return { success: true };
      }

      this.globalChannel = supabase.channel('global-presence', {
        config: {
          presence: {
            key: this.currentUserId,
          },
        },
      });

      this.globalChannel
        .on('presence', { event: 'sync' }, () => {
          const state = this.globalChannel!.presenceState();
          const users = this.parsePresenceState(state);
          console.log('[PresenceService] Presence sync:', users.length, 'users online');
          this.notifyPresenceCallbacks(users);
          this.notifyFriendsCallbacks(users);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('[PresenceService] User joined:', key);
          if (newPresences && newPresences.length > 0) {
            const presence = newPresences[0] as any;
            this.notifyStatusCallbacks(presence.user_id || key, presence.status || 'online');
          }
          const state = this.globalChannel!.presenceState();
          const users = this.parsePresenceState(state);
          this.notifyPresenceCallbacks(users);
          this.notifyFriendsCallbacks(users);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('[PresenceService] User left:', key);
          if (leftPresences && leftPresences.length > 0) {
            const presence = leftPresences[0] as any;
            this.notifyStatusCallbacks(presence.user_id || key, 'offline');
          }
          const state = this.globalChannel!.presenceState();
          const users = this.parsePresenceState(state);
          this.notifyPresenceCallbacks(users);
          this.notifyFriendsCallbacks(users);
        });

      await this.globalChannel.subscribe(async (status) => {
        console.log('[PresenceService] Global subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          await this.updatePresenceData();
          this.startHeartbeat();
        }
      });

      return { success: true };
    } catch (error) {
      console.error('[PresenceService] Error tracking presence:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to track presence' 
      };
    }
  }

  async updateStatus(status: UserStatus, activity?: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.currentStatus = status;
      
      if (this.globalChannel) {
        await this.updatePresenceData(activity);
      }

      if (isSupabaseConfigured && this.currentUserId) {
        await supabase
          .from('user_presence')
          .upsert({
            user_id: this.currentUserId,
            status,
            current_activity: activity,
            last_seen: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });
      }

      console.log('[PresenceService] Status updated:', status, activity);
      return { success: true };
    } catch (error) {
      console.error('[PresenceService] Error updating status:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update status' 
      };
    }
  }

  async getOnlineFriends(): Promise<FriendPresence[]> {
    if (!this.globalChannel) {
      return [];
    }

    const state = this.globalChannel.presenceState();
    const users = this.parsePresenceState(state);
    
    return users
      .filter(user => this.friendIds.has(user.userId))
      .map(user => ({
        ...user,
        isFriend: true,
      }));
  }

  async joinChannel(channelName: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      console.warn('[PresenceService] Supabase not configured, using demo mode');
      return { success: true };
    }

    if (!this.currentUserId) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      console.log('[PresenceService] Joining channel:', channelName);

      if (this.customChannels.has(channelName)) {
        console.log('[PresenceService] Already in channel:', channelName);
        return { success: true };
      }

      const channel = supabase.channel(`custom-${channelName}`, {
        config: {
          presence: {
            key: this.currentUserId,
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          console.log('[PresenceService] Channel sync:', channelName, Object.keys(state).length, 'users');
        })
        .on('broadcast', { event: 'message' }, ({ payload }) => {
          console.log('[PresenceService] Channel message:', channelName, payload);
        });

      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: this.currentUserId,
            username: this.currentUsername,
            avatar_url: this.currentAvatarUrl,
            joined_at: new Date().toISOString(),
          });
        }
      });

      this.customChannels.set(channelName, channel);
      return { success: true };
    } catch (error) {
      console.error('[PresenceService] Error joining channel:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to join channel' 
      };
    }
  }

  async leaveChannel(channelName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const channel = this.customChannels.get(channelName);
      if (channel) {
        await channel.untrack();
        await supabase.removeChannel(channel);
        this.customChannels.delete(channelName);
      }
      console.log('[PresenceService] Left channel:', channelName);
      return { success: true };
    } catch (error) {
      console.error('[PresenceService] Error leaving channel:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to leave channel' 
      };
    }
  }

  getChannelUsers(channelName: string): PresenceUser[] {
    const channel = this.customChannels.get(channelName);
    if (!channel) {
      return [];
    }

    const state = channel.presenceState();
    return this.parsePresenceState(state);
  }

  async sendChannelMessage(channelName: string, message: any): Promise<{ success: boolean; error?: string }> {
    try {
      const channel = this.customChannels.get(channelName);
      if (!channel) {
        return { success: false, error: 'Not in channel' };
      }

      await channel.send({
        type: 'broadcast',
        event: 'message',
        payload: {
          senderId: this.currentUserId,
          senderName: this.currentUsername,
          message,
          timestamp: new Date().toISOString(),
        },
      });

      return { success: true };
    } catch (error) {
      console.error('[PresenceService] Error sending channel message:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send message' 
      };
    }
  }

  onPresenceChange(callback: PresenceCallback): () => void {
    this.presenceCallbacks.push(callback);
    return () => {
      const index = this.presenceCallbacks.indexOf(callback);
      if (index > -1) {
        this.presenceCallbacks.splice(index, 1);
      }
    };
  }

  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  onFriendsChange(callback: FriendsCallback): () => void {
    this.friendsCallbacks.push(callback);
    return () => {
      const index = this.friendsCallbacks.indexOf(callback);
      if (index > -1) {
        this.friendsCallbacks.splice(index, 1);
      }
    };
  }

  async stopTracking(): Promise<void> {
    console.log('[PresenceService] Stopping presence tracking');

    this.stopHeartbeat();

    if (this.globalChannel) {
      await this.globalChannel.untrack();
      await supabase.removeChannel(this.globalChannel);
      this.globalChannel = null;
    }

    for (const [, channel] of this.customChannels) {
      await channel.untrack();
      await supabase.removeChannel(channel);
    }
    this.customChannels.clear();

    this.presenceCallbacks = [];
    this.statusCallbacks = [];
    this.friendsCallbacks = [];

    if (isSupabaseConfigured && this.currentUserId) {
      await supabase
        .from('user_presence')
        .update({
          status: 'offline',
          last_seen: new Date().toISOString(),
        })
        .eq('user_id', this.currentUserId);
    }
  }

  getCurrentStatus(): UserStatus {
    return this.currentStatus;
  }

  isTracking(): boolean {
    return this.globalChannel !== null;
  }

  private async updatePresenceData(activity?: string): Promise<void> {
    if (!this.globalChannel) return;

    await this.globalChannel.track({
      user_id: this.currentUserId,
      username: this.currentUsername,
      avatar_url: this.currentAvatarUrl,
      status: this.currentStatus,
      current_activity: activity,
      last_seen: new Date().toISOString(),
    });
  }

  private parsePresenceState(state: RealtimePresenceState): PresenceUser[] {
    const users: PresenceUser[] = [];

    for (const [key, presences] of Object.entries(state)) {
      if (presences && presences.length > 0) {
        const presence = presences[0] as any;
        users.push({
          userId: presence.user_id || key,
          username: presence.username || 'Anonymous',
          avatarUrl: presence.avatar_url,
          status: presence.status || 'online',
          lastSeen: presence.last_seen || new Date().toISOString(),
          currentActivity: presence.current_activity,
          currentHomeId: presence.current_home_id,
        });
      }
    }

    return users;
  }

  private notifyPresenceCallbacks(users: PresenceUser[]): void {
    this.presenceCallbacks.forEach(callback => callback(users));
  }

  private notifyStatusCallbacks(userId: string, status: UserStatus): void {
    this.statusCallbacks.forEach(callback => callback(userId, status));
  }

  private notifyFriendsCallbacks(allUsers: PresenceUser[]): void {
    const friends = allUsers
      .filter(user => this.friendIds.has(user.userId))
      .map(user => ({
        ...user,
        isFriend: true,
      }));
    this.friendsCallbacks.forEach(callback => callback(friends));
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(async () => {
      if (this.globalChannel && this.currentStatus !== 'offline') {
        await this.updatePresenceData();
      }
    }, 30000);
    
    console.log('[PresenceService] Heartbeat started');
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('[PresenceService] Heartbeat stopped');
    }
  }
}

export const presenceService = new PresenceService();
export default presenceService;
