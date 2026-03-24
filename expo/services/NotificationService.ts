import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  AppNotification,
  NotificationType,
  NotificationPreferences,
  NotificationStats,
  NotificationFilter,
  CreateNotificationInput,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '@/types/notification';

const NOTIFICATIONS_STORAGE_KEY = 'wci_notifications';
const PREFERENCES_STORAGE_KEY = 'wci_notification_preferences';

type NotificationCallback = (notification: AppNotification) => void;

class NotificationService {
  private currentUserId: string | null = null;
  private channel: RealtimeChannel | null = null;
  private notificationCallbacks: NotificationCallback[] = [];

  setCurrentUser(userId: string): void {
    this.currentUserId = userId;
    console.log('[NotificationService] Current user set:', userId);
  }

  async getNotifications(filter?: NotificationFilter): Promise<AppNotification[]> {
    if (!this.currentUserId) {
      console.warn('[NotificationService] No current user set');
      return [];
    }

    try {
      if (isSupabaseConfigured) {
        let query = supabase
          .from('notifications')
          .select('*')
          .eq('user_id', this.currentUserId)
          .order('created_at', { ascending: false });

        if (filter?.types && filter.types.length > 0) {
          query = query.in('type', filter.types);
        }
        if (filter?.isRead !== undefined) {
          query = query.eq('is_read', filter.isRead);
        }
        if (filter?.startDate) {
          query = query.gte('created_at', filter.startDate);
        }
        if (filter?.endDate) {
          query = query.lte('created_at', filter.endDate);
        }
        if (filter?.limit) {
          query = query.limit(filter.limit);
        }
        if (filter?.offset) {
          query = query.range(filter.offset, filter.offset + (filter.limit || 50) - 1);
        }

        const { data, error } = await query;

        if (error) {
          // Table may not exist or network issue, fallback to local notifications
          return this.getLocalNotifications(filter);
        }

        const notifications: AppNotification[] = (data || []).map((n: any) => ({
          id: n.id,
          userId: n.user_id,
          type: n.type as NotificationType,
          title: n.title,
          body: n.body,
          data: n.data,
          priority: n.priority || 'normal',
          isRead: n.is_read,
          createdAt: n.created_at,
          readAt: n.read_at,
          expiresAt: n.expires_at,
        }));

        await this.saveLocalNotifications(notifications);
        return notifications;
      }

      return this.getLocalNotifications(filter);
    } catch {
      // Network errors are expected when offline, silently fallback to local
      return this.getLocalNotifications(filter);
    }
  }

  async getUnreadCount(): Promise<number> {
    if (!this.currentUserId) return 0;

    try {
      if (isSupabaseConfigured) {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', this.currentUserId)
          .eq('is_read', false);

        if (error) {
          const local = await this.getLocalNotifications({ isRead: false });
          return local.length;
        }

        return count || 0;
      }

      const local = await this.getLocalNotifications({ isRead: false });
      return local.length;
    } catch (error) {
      // Network errors are expected when offline, silently fallback to local
      const local = await this.getLocalNotifications({ isRead: false });
      return local.length;
    }
  }

  async getStats(): Promise<NotificationStats> {
    if (!this.currentUserId) {
      return { total: 0, unread: 0, byType: {} as Record<NotificationType, number> };
    }

    try {
      const notifications = await this.getNotifications();
      const unread = notifications.filter(n => !n.isRead).length;
      
      const byType: Record<NotificationType, number> = {
        friend_request: 0,
        friend_accepted: 0,
        new_message: 0,
        home_visit_invitation: 0,
        home_visitor_joined: 0,
        home_visitor_left: 0,
        home_rating_received: 0,
        home_tier_upgraded: 0,
        home_item_gifted: 0,
        achievement_unlocked: 0,
        marketplace_item_sold: 0,
        marketplace_purchase_complete: 0,
        marketplace_outbid: 0,
        marketplace_auction_won: 0,
        marketplace_auction_ended: 0,
        marketplace_listing_expired: 0,
        system: 0,
      };

      notifications.forEach(n => {
        byType[n.type] = (byType[n.type] || 0) + 1;
      });

      return {
        total: notifications.length,
        unread,
        byType,
      };
    } catch (error) {
      console.error('[NotificationService] Error getting stats:', error);
      return { total: 0, unread: 0, byType: {} as Record<NotificationType, number> };
    }
  }

  async createNotification(input: CreateNotificationInput): Promise<{ success: boolean; notification?: AppNotification; error?: string }> {
    try {
      console.log('[NotificationService] Creating notification:', input.type);

      const notification: AppNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data,
        priority: input.priority || 'normal',
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('notifications')
          .insert({
            user_id: input.userId,
            type: input.type,
            title: input.title,
            body: input.body,
            data: input.data,
            priority: input.priority || 'normal',
            is_read: false,
          })
          .select()
          .single();

        if (error) {
          const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
          console.error('[NotificationService] Error creating notification:', errorMessage);
          // Continue with local storage even if database fails
        } else if (data) {
          notification.id = data.id;
          notification.createdAt = data.created_at;
        }
      }

      const existing = await this.getLocalNotifications();
      existing.unshift(notification);
      await this.saveLocalNotifications(existing.slice(0, 100));

      return { success: true, notification };
    } catch (error) {
      console.error('[NotificationService] Error creating notification:', error);
      return { success: false, error: 'Failed to create notification' };
    }
  }

  async markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUserId) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      console.log('[NotificationService] Marking as read:', notificationId);

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('notifications')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('id', notificationId)
          .eq('user_id', this.currentUserId);

        if (error) {
          console.error('[NotificationService] Error marking as read:', error.message || JSON.stringify(error));
          return { success: false, error: error.message };
        }
      }

      const notifications = await this.getLocalNotifications();
      const index = notifications.findIndex(n => n.id === notificationId);
      if (index !== -1) {
        notifications[index].isRead = true;
        notifications[index].readAt = new Date().toISOString();
        await this.saveLocalNotifications(notifications);
      }

      return { success: true };
    } catch (error) {
      console.error('[NotificationService] Error marking as read:', error);
      return { success: false, error: 'Failed to mark as read' };
    }
  }

  async markAllAsRead(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUserId) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      console.log('[NotificationService] Marking all as read');

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('notifications')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('user_id', this.currentUserId)
          .eq('is_read', false);

        if (error) {
          console.error('[NotificationService] Error marking all as read:', error.message || JSON.stringify(error));
          return { success: false, error: error.message };
        }
      }

      const notifications = await this.getLocalNotifications();
      const now = new Date().toISOString();
      notifications.forEach(n => {
        if (!n.isRead) {
          n.isRead = true;
          n.readAt = now;
        }
      });
      await this.saveLocalNotifications(notifications);

      return { success: true };
    } catch (error) {
      console.error('[NotificationService] Error marking all as read:', error);
      return { success: false, error: 'Failed to mark all as read' };
    }
  }

  async deleteNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUserId) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      console.log('[NotificationService] Deleting notification:', notificationId);

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notificationId)
          .eq('user_id', this.currentUserId);

        if (error) {
          console.error('[NotificationService] Error deleting notification:', error.message || JSON.stringify(error));
          return { success: false, error: error.message };
        }
      }

      const notifications = await this.getLocalNotifications();
      const filtered = notifications.filter(n => n.id !== notificationId);
      await this.saveLocalNotifications(filtered);

      return { success: true };
    } catch (error) {
      console.error('[NotificationService] Error deleting notification:', error);
      return { success: false, error: 'Failed to delete notification' };
    }
  }

  async clearAll(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUserId) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      console.log('[NotificationService] Clearing all notifications');

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('user_id', this.currentUserId);

        if (error) {
          console.error('[NotificationService] Error clearing notifications:', error.message || JSON.stringify(error));
          return { success: false, error: error.message };
        }
      }

      await this.saveLocalNotifications([]);
      return { success: true };
    } catch (error) {
      console.error('[NotificationService] Error clearing notifications:', error);
      return { success: false, error: 'Failed to clear notifications' };
    }
  }

  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const stored = await AsyncStorage.getItem(`${PREFERENCES_STORAGE_KEY}_${this.currentUserId}`);
      if (stored) {
        return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(stored) };
      }
      return DEFAULT_NOTIFICATION_PREFERENCES;
    } catch (error) {
      console.error('[NotificationService] Error getting preferences:', error);
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  }

  async savePreferences(preferences: Partial<NotificationPreferences>): Promise<{ success: boolean; error?: string }> {
    try {
      const current = await this.getPreferences();
      const updated = { ...current, ...preferences };
      await AsyncStorage.setItem(
        `${PREFERENCES_STORAGE_KEY}_${this.currentUserId}`,
        JSON.stringify(updated)
      );
      console.log('[NotificationService] Preferences saved');
      return { success: true };
    } catch (error) {
      console.error('[NotificationService] Error saving preferences:', error);
      return { success: false, error: 'Failed to save preferences' };
    }
  }

  async subscribeToNotifications(): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      console.warn('[NotificationService] Supabase not configured, using demo mode');
      return { success: true };
    }

    if (!this.currentUserId) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      console.log('[NotificationService] Subscribing to real-time notifications');

      if (this.channel) {
        console.log('[NotificationService] Already subscribed');
        return { success: true };
      }

      this.channel = supabase
        .channel(`notifications-${this.currentUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${this.currentUserId}`,
          },
          (payload) => {
            console.log('[NotificationService] New notification received:', payload);
            const notification: AppNotification = {
              id: payload.new.id,
              userId: payload.new.user_id,
              type: payload.new.type as NotificationType,
              title: payload.new.title,
              body: payload.new.body,
              data: payload.new.data,
              priority: payload.new.priority || 'normal',
              isRead: payload.new.is_read,
              createdAt: payload.new.created_at,
            };
            this.notifyCallbacks(notification);
          }
        )
        .subscribe((status) => {
          console.log('[NotificationService] Subscription status:', status);
        });

      return { success: true };
    } catch (error) {
      console.error('[NotificationService] Error subscribing:', error);
      return { success: false, error: 'Failed to subscribe to notifications' };
    }
  }

  async unsubscribe(): Promise<void> {
    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
      console.log('[NotificationService] Unsubscribed from notifications');
    }
    this.notificationCallbacks = [];
  }

  onNewNotification(callback: NotificationCallback): () => void {
    this.notificationCallbacks.push(callback);
    return () => {
      const index = this.notificationCallbacks.indexOf(callback);
      if (index > -1) {
        this.notificationCallbacks.splice(index, 1);
      }
    };
  }

  private notifyCallbacks(notification: AppNotification): void {
    this.notificationCallbacks.forEach(callback => callback(notification));
  }

  private async getLocalNotifications(filter?: NotificationFilter): Promise<AppNotification[]> {
    try {
      const stored = await AsyncStorage.getItem(`${NOTIFICATIONS_STORAGE_KEY}_${this.currentUserId}`);
      let notifications: AppNotification[] = stored ? JSON.parse(stored) : [];

      if (filter?.types && filter.types.length > 0) {
        notifications = notifications.filter(n => filter.types!.includes(n.type));
      }
      if (filter?.isRead !== undefined) {
        notifications = notifications.filter(n => n.isRead === filter.isRead);
      }
      if (filter?.startDate) {
        notifications = notifications.filter(n => n.createdAt >= filter.startDate!);
      }
      if (filter?.endDate) {
        notifications = notifications.filter(n => n.createdAt <= filter.endDate!);
      }
      if (filter?.limit) {
        notifications = notifications.slice(filter.offset || 0, (filter.offset || 0) + filter.limit);
      }

      return notifications;
    } catch {
      return [];
    }
  }

  private async saveLocalNotifications(notifications: AppNotification[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${NOTIFICATIONS_STORAGE_KEY}_${this.currentUserId}`,
        JSON.stringify(notifications)
      );
    } catch (error) {
      console.error('[NotificationService] Error saving local notifications:', error);
    }
  }

  async sendFriendRequestNotification(receiverId: string, senderName: string, senderAvatarUrl?: string): Promise<void> {
    await this.createNotification({
      userId: receiverId,
      type: 'friend_request',
      title: 'New Friend Request',
      body: `${senderName} sent you a friend request`,
      data: {
        friendName: senderName,
        friendAvatarUrl: senderAvatarUrl,
        actionUrl: '/game/friends',
      },
      priority: 'normal',
    });
  }

  async sendFriendAcceptedNotification(receiverId: string, accepterName: string, accepterAvatarUrl?: string): Promise<void> {
    await this.createNotification({
      userId: receiverId,
      type: 'friend_accepted',
      title: 'Friend Request Accepted',
      body: `${accepterName} accepted your friend request`,
      data: {
        friendName: accepterName,
        friendAvatarUrl: accepterAvatarUrl,
        actionUrl: '/game/friends',
      },
      priority: 'normal',
    });
  }

  async sendNewMessageNotification(receiverId: string, senderName: string, messagePreview: string, senderAvatarUrl?: string): Promise<void> {
    await this.createNotification({
      userId: receiverId,
      type: 'new_message',
      title: 'New Message',
      body: `${senderName}: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`,
      data: {
        friendName: senderName,
        friendAvatarUrl: senderAvatarUrl,
        messagePreview,
        actionUrl: '/game/friends',
      },
      priority: 'high',
    });
  }

  async sendHomeInvitationNotification(receiverId: string, inviterName: string, homeName: string, homeId: string, inviterAvatarUrl?: string): Promise<void> {
    await this.createNotification({
      userId: receiverId,
      type: 'home_visit_invitation',
      title: 'Home Visit Invitation',
      body: `${inviterName} invited you to visit "${homeName}"`,
      data: {
        friendName: inviterName,
        friendAvatarUrl: inviterAvatarUrl,
        homeId,
        homeName,
        actionUrl: `/home-visit?homeId=${homeId}`,
      },
      priority: 'normal',
    });
  }
}

export const notificationService = new NotificationService();
export default notificationService;
