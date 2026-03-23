import { useEffect, useCallback, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/services/NotificationService';
import {
  AppNotification,
  NotificationType,
  NotificationPreferences,
  NotificationFilter,
} from '@/types/notification';

export const [NotificationProvider, useNotifications] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newNotification, setNewNotification] = useState<AppNotification | null>(null);

  useEffect(() => {
    if (user?.id) {
      notificationService.setCurrentUser(user.id);
      notificationService.subscribeToNotifications();

      const unsubscribe = notificationService.onNewNotification((notification) => {
        console.log('[NotificationContext] New notification received:', notification.type);
        setNewNotification(notification);
        
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notification-count'] });
        
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      });

      return () => {
        unsubscribe();
        notificationService.unsubscribe();
      };
    }
  }, [user?.id, queryClient]);

  const notificationsQuery = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => notificationService.getNotifications({ limit: 50 }),
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const unreadCountQuery = useQuery({
    queryKey: ['notification-count', user?.id],
    queryFn: () => notificationService.getUnreadCount(),
    enabled: !!user?.id,
    staleTime: 10000,
    refetchInterval: 30000,
  });

  const statsQuery = useQuery({
    queryKey: ['notification-stats', user?.id],
    queryFn: () => notificationService.getStats(),
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const preferencesQuery = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: () => notificationService.getPreferences(),
    enabled: !!user?.id,
    staleTime: 300000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => notificationService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => notificationService.clearAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    },
  });

  const savePreferencesMutation = useMutation({
    mutationFn: (prefs: Partial<NotificationPreferences>) => notificationService.savePreferences(prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  const notifications = useMemo(() => {
    return notificationsQuery.data || [];
  }, [notificationsQuery.data]);

  const unreadNotifications = useMemo(() => {
    return notifications.filter(n => !n.isRead);
  }, [notifications]);

  const groupedNotifications = useMemo(() => {
    const today: AppNotification[] = [];
    const yesterday: AppNotification[] = [];
    const thisWeek: AppNotification[] = [];
    const older: AppNotification[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    notifications.forEach(notification => {
      const notifDate = new Date(notification.createdAt);
      
      if (notifDate >= todayStart) {
        today.push(notification);
      } else if (notifDate >= yesterdayStart) {
        yesterday.push(notification);
      } else if (notifDate >= weekStart) {
        thisWeek.push(notification);
      } else {
        older.push(notification);
      }
    });

    return { today, yesterday, thisWeek, older };
  }, [notifications]);

  const { mutateAsync: markReadAsync } = markAsReadMutation;
  const { mutateAsync: markAllReadAsync } = markAllAsReadMutation;
  const { mutateAsync: deleteAsync } = deleteNotificationMutation;
  const { mutateAsync: clearAsync } = clearAllMutation;
  const { mutateAsync: savePrefsAsync } = savePreferencesMutation;

  const markAsRead = useCallback(async (notificationId: string) => {
    const result = await markReadAsync(notificationId);
    return result;
  }, [markReadAsync]);

  const markAllAsRead = useCallback(async () => {
    const result = await markAllReadAsync();
    return result;
  }, [markAllReadAsync]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    const result = await deleteAsync(notificationId);
    return result;
  }, [deleteAsync]);

  const clearAll = useCallback(async () => {
    const result = await clearAsync();
    return result;
  }, [clearAsync]);

  const savePreferences = useCallback(async (prefs: Partial<NotificationPreferences>) => {
    const result = await savePrefsAsync(prefs);
    return result;
  }, [savePrefsAsync]);

  const getNotificationsByType = useCallback((type: NotificationType): AppNotification[] => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  const refreshNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notification-count'] });
    queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
  }, [queryClient]);

  const clearNewNotification = useCallback(() => {
    setNewNotification(null);
  }, []);

  return {
    notifications,
    unreadNotifications,
    groupedNotifications,
    unreadCount: unreadCountQuery.data || 0,
    stats: statsQuery.data || { total: 0, unread: 0, byType: {} as Record<NotificationType, number> },
    preferences: preferencesQuery.data,
    isLoading: notificationsQuery.isLoading,
    isRefreshing: notificationsQuery.isFetching,
    newNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    savePreferences,
    getNotificationsByType,
    refreshNotifications,
    clearNewNotification,
    isMarkingRead: markAsReadMutation.isPending,
    isClearing: clearAllMutation.isPending,
  };
});

export function useNotificationFilter(filter: NotificationFilter) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['notifications-filtered', user?.id, filter],
    queryFn: () => notificationService.getNotifications(filter),
    enabled: !!user?.id,
    staleTime: 30000,
  });

  return {
    notifications: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
