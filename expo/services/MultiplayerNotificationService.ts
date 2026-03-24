import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MultiplayerNotification,
  MultiplayerNotificationType,
} from '@/types/multiplayerIntegration';

const STORAGE_KEY = 'multiplayer_notifications';
const MAX_NOTIFICATIONS = 100;
const BATCH_INTERVAL = 1000;

type NotificationCallback = (notification: MultiplayerNotification) => void;
type BatchCallback = (notifications: MultiplayerNotification[]) => void;

interface NotificationPreferences {
  enablePush: boolean;
  enableInApp: boolean;
  enableSound: boolean;
  mutedTypes: MultiplayerNotificationType[];
  mutedUsers: string[];
  quietHoursStart?: number;
  quietHoursEnd?: number;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enablePush: true,
  enableInApp: true,
  enableSound: true,
  mutedTypes: [],
  mutedUsers: [],
};

class MultiplayerNotificationService {
  private notifications: MultiplayerNotification[] = [];
  private channel: RealtimeChannel | null = null;
  private currentUserId: string | null = null;
  private callbacks: NotificationCallback[] = [];
  private batchCallbacks: BatchCallback[] = [];
  private preferences: NotificationPreferences = DEFAULT_PREFERENCES;
  private pendingBatch: MultiplayerNotification[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;

  async initialize(userId: string): Promise<void> {
    if (this.isInitialized && this.currentUserId === userId) {
      console.log('[MultiplayerNotifications] Already initialized for user:', userId);
      return;
    }

    this.currentUserId = userId;

    await this.loadNotifications();
    await this.loadPreferences();

    if (isSupabaseConfigured) {
      await this.setupRealtimeChannel();
    }

    this.isInitialized = true;
    console.log('[MultiplayerNotifications] Initialized for user:', userId);
  }

  private async setupRealtimeChannel(): Promise<void> {
    if (!this.currentUserId) return;

    if (this.channel) {
      await supabase.removeChannel(this.channel);
    }

    this.channel = supabase.channel(`notifications-${this.currentUserId}`);

    this.channel
      .on('broadcast', { event: 'notification' }, ({ payload }) => {
        this.handleIncomingNotification(payload as MultiplayerNotification);
      })
      .on('broadcast', { event: 'notification_batch' }, ({ payload }) => {
        const notifications = payload.notifications as MultiplayerNotification[];
        notifications.forEach(n => this.handleIncomingNotification(n));
      });

    await this.channel.subscribe((status) => {
      console.log('[MultiplayerNotifications] Channel status:', status);
    });
  }

  private handleIncomingNotification(notification: MultiplayerNotification): void {
    if (notification.userId !== this.currentUserId) return;

    if (this.shouldFilterNotification(notification)) {
      console.log('[MultiplayerNotifications] Notification filtered:', notification.type);
      return;
    }

    this.addNotification(notification);
    this.notifyCallbacks(notification);
  }

  private shouldFilterNotification(notification: MultiplayerNotification): boolean {
    if (this.preferences.mutedTypes.includes(notification.type)) {
      return true;
    }

    if (notification.fromUserId && this.preferences.mutedUsers.includes(notification.fromUserId)) {
      return true;
    }

    if (this.isQuietHours()) {
      return true;
    }

    return false;
  }

  private isQuietHours(): boolean {
    if (!this.preferences.quietHoursStart || !this.preferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();

    if (this.preferences.quietHoursStart < this.preferences.quietHoursEnd) {
      return currentHour >= this.preferences.quietHoursStart && 
             currentHour < this.preferences.quietHoursEnd;
    } else {
      return currentHour >= this.preferences.quietHoursStart || 
             currentHour < this.preferences.quietHoursEnd;
    }
  }

  async sendNotification(
    toUserId: string,
    type: MultiplayerNotificationType,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<MultiplayerNotification> {
    const notification: MultiplayerNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      data,
      userId: toUserId,
      fromUserId: this.currentUserId || undefined,
      isRead: false,
      createdAt: Date.now(),
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('multiplayer_notifications').insert({
          id: notification.id,
          user_id: notification.userId,
          from_user_id: notification.fromUserId,
          notification_type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          is_read: false,
          created_at: new Date(notification.createdAt).toISOString(),
        });

        const targetChannel = supabase.channel(`notifications-${toUserId}`);
        await targetChannel.send({
          type: 'broadcast',
          event: 'notification',
          payload: notification,
        });
        await supabase.removeChannel(targetChannel);
      } catch (error) {
        console.warn('[MultiplayerNotifications] Failed to send notification:', error);
      }
    }

    if (toUserId === this.currentUserId) {
      this.addNotification(notification);
      this.notifyCallbacks(notification);
    }

    console.log('[MultiplayerNotifications] Notification sent:', notification.type, 'to:', toUserId);
    return notification;
  }

  async sendBatchNotifications(
    toUserIds: string[],
    type: MultiplayerNotificationType,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    const notifications = toUserIds.map(userId => ({
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      data,
      userId,
      fromUserId: this.currentUserId || undefined,
      isRead: false,
      createdAt: Date.now(),
    }));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('multiplayer_notifications').insert(
          notifications.map(n => ({
            id: n.id,
            user_id: n.userId,
            from_user_id: n.fromUserId,
            notification_type: n.type,
            title: n.title,
            message: n.message,
            data: n.data,
            is_read: false,
            created_at: new Date(n.createdAt).toISOString(),
          }))
        );
      } catch (error) {
        console.warn('[MultiplayerNotifications] Failed to send batch notifications:', error);
      }
    }

    const selfNotifications = notifications.filter(n => n.userId === this.currentUserId);
    selfNotifications.forEach(n => {
      this.addNotification(n);
      this.notifyCallbacks(n);
    });

    console.log('[MultiplayerNotifications] Batch sent to', toUserIds.length, 'users');
  }

  sendVisitorJoinedNotification(
    homeOwnerId: string,
    visitorName: string,
    visitorAvatar: string | undefined,
    homeName: string,
    homeId: string
  ): Promise<MultiplayerNotification> {
    return this.sendNotification(
      homeOwnerId,
      'visitor_joined',
      'New Visitor',
      `${visitorName} is visiting ${homeName}`,
      { homeId, homeName, visitorName, visitorAvatar }
    );
  }

  sendChatMessageNotification(
    toUserId: string,
    fromUserName: string,
    fromUserAvatar: string | undefined,
    message: string,
    homeId: string
  ): Promise<MultiplayerNotification> {
    return this.sendNotification(
      toUserId,
      'chat_message',
      `Message from ${fromUserName}`,
      message.length > 50 ? message.substring(0, 50) + '...' : message,
      { homeId, fromUserName, fromUserAvatar, fullMessage: message }
    );
  }

  sendInvestmentNotification(
    businessOwnerId: string,
    investorName: string,
    amount: number,
    businessId: string,
    businessName: string
  ): Promise<MultiplayerNotification> {
    return this.sendNotification(
      businessOwnerId,
      'investment_received',
      'Investment Received',
      `${investorName} invested $${amount.toLocaleString()} in ${businessName}`,
      { businessId, businessName, investorName, amount }
    );
  }

  sendPartnershipRequestNotification(
    toUserId: string,
    fromUserName: string,
    businessName: string,
    businessId: string,
    ownershipPercentage: number
  ): Promise<MultiplayerNotification> {
    return this.sendNotification(
      toUserId,
      'partnership_request',
      'Partnership Request',
      `${fromUserName} wants to partner on ${businessName} (${ownershipPercentage}% ownership)`,
      { businessId, businessName, fromUserName, ownershipPercentage }
    );
  }

  sendLeaderboardUpdateNotification(
    userId: string,
    newRank: number,
    previousRank: number,
    leaderboardType: string
  ): Promise<MultiplayerNotification> {
    const improved = newRank < previousRank;
    return this.sendNotification(
      userId,
      'leaderboard_update',
      improved ? 'Rank Improved!' : 'Rank Changed',
      improved 
        ? `You moved up to #${newRank} on the ${leaderboardType} leaderboard!`
        : `Your ${leaderboardType} rank is now #${newRank}`,
      { newRank, previousRank, leaderboardType, improved }
    );
  }

  sendFriendOnlineNotification(
    userId: string,
    friendName: string,
    friendAvatar: string | undefined,
    friendId: string
  ): Promise<MultiplayerNotification> {
    return this.sendNotification(
      userId,
      'friend_online',
      'Friend Online',
      `${friendName} is now online`,
      { friendId, friendName, friendAvatar }
    );
  }

  private addNotification(notification: MultiplayerNotification): void {
    this.notifications.unshift(notification);

    if (this.notifications.length > MAX_NOTIFICATIONS) {
      this.notifications = this.notifications.slice(0, MAX_NOTIFICATIONS);
    }

    this.saveNotifications();
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      this.saveNotifications();

      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('multiplayer_notifications')
            .update({ is_read: true })
            .eq('id', notificationId);
        } catch (error) {
          console.warn('[MultiplayerNotifications] Failed to mark as read:', error);
        }
      }
    }
  }

  async markAllAsRead(): Promise<void> {
    this.notifications.forEach(n => n.isRead = true);
    this.saveNotifications();

    if (isSupabaseConfigured && this.currentUserId) {
      try {
        await supabase
          .from('multiplayer_notifications')
          .update({ is_read: true })
          .eq('user_id', this.currentUserId)
          .eq('is_read', false);
      } catch (error) {
        console.warn('[MultiplayerNotifications] Failed to mark all as read:', error);
      }
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('multiplayer_notifications')
          .delete()
          .eq('id', notificationId);
      } catch (error) {
        console.warn('[MultiplayerNotifications] Failed to delete:', error);
      }
    }
  }

  async clearAllNotifications(): Promise<void> {
    this.notifications = [];
    this.saveNotifications();

    if (isSupabaseConfigured && this.currentUserId) {
      try {
        await supabase
          .from('multiplayer_notifications')
          .delete()
          .eq('user_id', this.currentUserId);
      } catch (error) {
        console.warn('[MultiplayerNotifications] Failed to clear all:', error);
      }
    }
  }

  getNotifications(): MultiplayerNotification[] {
    return [...this.notifications];
  }

  getUnreadNotifications(): MultiplayerNotification[] {
    return this.notifications.filter(n => !n.isRead);
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  getNotificationsByType(type: MultiplayerNotificationType): MultiplayerNotification[] {
    return this.notifications.filter(n => n.type === type);
  }

  onNotification(callback: NotificationCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) this.callbacks.splice(index, 1);
    };
  }

  onBatch(callback: BatchCallback): () => void {
    this.batchCallbacks.push(callback);
    return () => {
      const index = this.batchCallbacks.indexOf(callback);
      if (index > -1) this.batchCallbacks.splice(index, 1);
    };
  }

  private notifyCallbacks(notification: MultiplayerNotification): void {
    this.callbacks.forEach(cb => cb(notification));

    this.pendingBatch.push(notification);
    this.scheduleBatchNotify();
  }

  private scheduleBatchNotify(): void {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      if (this.pendingBatch.length > 0) {
        this.batchCallbacks.forEach(cb => cb([...this.pendingBatch]));
        this.pendingBatch = [];
      }
      this.batchTimer = null;
    }, BATCH_INTERVAL) as unknown as NodeJS.Timeout;
  }

  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  async updatePreferences(updates: Partial<NotificationPreferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...updates };
    await this.savePreferences();
    console.log('[MultiplayerNotifications] Preferences updated:', this.preferences);
  }

  async muteType(type: MultiplayerNotificationType): Promise<void> {
    if (!this.preferences.mutedTypes.includes(type)) {
      this.preferences.mutedTypes.push(type);
      await this.savePreferences();
    }
  }

  async unmuteType(type: MultiplayerNotificationType): Promise<void> {
    this.preferences.mutedTypes = this.preferences.mutedTypes.filter(t => t !== type);
    await this.savePreferences();
  }

  async muteUser(userId: string): Promise<void> {
    if (!this.preferences.mutedUsers.includes(userId)) {
      this.preferences.mutedUsers.push(userId);
      await this.savePreferences();
    }
  }

  async unmuteUser(userId: string): Promise<void> {
    this.preferences.mutedUsers = this.preferences.mutedUsers.filter(u => u !== userId);
    await this.savePreferences();
  }

  private async loadNotifications(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${this.currentUserId}`);
      if (stored) {
        this.notifications = JSON.parse(stored);
        console.log('[MultiplayerNotifications] Loaded', this.notifications.length, 'notifications');
      }
    } catch (error) {
      console.error('[MultiplayerNotifications] Failed to load notifications:', error);
    }
  }

  private async saveNotifications(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${STORAGE_KEY}_${this.currentUserId}`,
        JSON.stringify(this.notifications)
      );
    } catch (error) {
      console.error('[MultiplayerNotifications] Failed to save notifications:', error);
    }
  }

  private async loadPreferences(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_prefs_${this.currentUserId}`);
      if (stored) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('[MultiplayerNotifications] Failed to load preferences:', error);
    }
  }

  private async savePreferences(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${STORAGE_KEY}_prefs_${this.currentUserId}`,
        JSON.stringify(this.preferences)
      );
    } catch (error) {
      console.error('[MultiplayerNotifications] Failed to save preferences:', error);
    }
  }

  async cleanup(): Promise<void> {
    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    this.callbacks = [];
    this.batchCallbacks = [];
    this.pendingBatch = [];
    this.isInitialized = false;

    console.log('[MultiplayerNotifications] Cleanup complete');
  }
}

export const multiplayerNotificationService = new MultiplayerNotificationService();
export default multiplayerNotificationService;
