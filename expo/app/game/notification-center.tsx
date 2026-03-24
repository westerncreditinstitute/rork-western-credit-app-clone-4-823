import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  UserPlus,
  UserCheck,
  MessageCircle,
  Home,
  LogIn,
  LogOut,
  Trophy,
  Settings,
  Filter,
  X,
  Star,
  TrendingUp,
  Gift,
  DollarSign,
  ShoppingBag,
  AlertTriangle,
  Award,
  Clock,
  XCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { AppNotification, NotificationType, NOTIFICATION_COLORS } from '@/types/notification';

const NOTIFICATION_ICONS: Record<NotificationType, React.ComponentType<any>> = {
  friend_request: UserPlus,
  friend_accepted: UserCheck,
  new_message: MessageCircle,
  home_visit_invitation: Home,
  home_visitor_joined: LogIn,
  home_visitor_left: LogOut,
  home_rating_received: Star,
  home_tier_upgraded: TrendingUp,
  home_item_gifted: Gift,
  achievement_unlocked: Trophy,
  marketplace_item_sold: DollarSign,
  marketplace_purchase_complete: ShoppingBag,
  marketplace_outbid: AlertTriangle,
  marketplace_auction_won: Award,
  marketplace_auction_ended: Clock,
  marketplace_listing_expired: XCircle,
  system: Bell,
};

type FilterType = 'all' | 'unread' | NotificationType;

export default function NotificationCenterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    notifications,
    groupedNotifications,
    unreadCount,
    isRefreshing,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refreshNotifications,
  } = useNotifications();

  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredNotifications = useMemo(() => {
    if (selectedFilter === 'all') {
      return notifications;
    }
    if (selectedFilter === 'unread') {
      return notifications.filter(n => !n.isRead);
    }
    return notifications.filter(n => n.type === selectedFilter);
  }, [notifications, selectedFilter]);

  const handleNotificationPress = useCallback(async (notification: AppNotification) => {
    Haptics.selectionAsync();
    
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    if (notification.data?.actionUrl) {
      router.push(notification.data.actionUrl as any);
    }
  }, [markAsRead, router]);

  const handleDelete = useCallback(async (notificationId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await deleteNotification(notificationId);
  }, [deleteNotification]);

  const handleMarkAllRead = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markAllAsRead();
  }, [markAllAsRead]);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await clearAll();
          },
        },
      ]
    );
  }, [clearAll]);

  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }, []);

  const renderNotificationItem = (notification: AppNotification) => {
    const IconComponent = NOTIFICATION_ICONS[notification.type] || Bell;
    const iconColor = NOTIFICATION_COLORS[notification.type] || colors.primary;

    return (
      <TouchableOpacity
        key={notification.id}
        style={[
          styles.notificationItem,
          { 
            backgroundColor: notification.isRead ? colors.surface : colors.primary + '08',
            borderLeftColor: notification.isRead ? 'transparent' : iconColor,
          },
        ]}
        onPress={() => handleNotificationPress(notification)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
          {notification.data?.friendAvatarUrl ? (
            <Image
              source={{ uri: notification.data.friendAvatarUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <IconComponent color={iconColor} size={20} />
          )}
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text 
              style={[
                styles.notificationTitle, 
                { color: colors.text },
                !notification.isRead && styles.unreadTitle
              ]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
              {formatTime(notification.createdAt)}
            </Text>
          </View>
          
          <Text 
            style={[styles.notificationBody, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {notification.body}
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          {!notification.isRead && (
            <View style={[styles.unreadDot, { backgroundColor: iconColor }]} />
          )}
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: colors.error + '10' }]}
            onPress={() => handleDelete(notification.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X color={colors.error} size={14} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (title: string, items: AppNotification[]) => {
    if (items.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {title}
        </Text>
        {items.map(renderNotificationItem)}
      </View>
    );
  };

  const filterOptions: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'friend_request', label: 'Friend Requests' },
    { key: 'new_message', label: 'Messages' },
    { key: 'home_visit_invitation', label: 'Invitations' },
    { key: 'achievement_unlocked', label: 'Achievements' },
  ];

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft color={colors.text} size={24} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity 
                  onPress={handleMarkAllRead} 
                  style={styles.headerButton}
                >
                  <CheckCheck color={colors.primary} size={22} />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                onPress={() => setShowFilters(!showFilters)} 
                style={styles.headerButton}
              >
                <Filter 
                  color={selectedFilter !== 'all' ? colors.primary : colors.text} 
                  size={22} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => router.push('/notifications' as any)} 
                style={styles.headerButton}
              >
                <Settings color={colors.text} size={22} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {showFilters && (
        <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedFilter === option.key ? colors.primary : colors.surfaceAlt,
                    borderColor: selectedFilter === option.key ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedFilter(option.key);
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: selectedFilter === option.key ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshNotifications}
            tintColor={colors.primary}
          />
        }
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceAlt }]}>
              <BellOff color={colors.textSecondary} size={48} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Notifications
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {selectedFilter === 'unread' 
                ? "You're all caught up!" 
                : "When you receive notifications, they'll appear here"}
            </Text>
          </View>
        ) : selectedFilter === 'all' ? (
          <>
            {renderSection('Today', groupedNotifications.today)}
            {renderSection('Yesterday', groupedNotifications.yesterday)}
            {renderSection('This Week', groupedNotifications.thisWeek)}
            {renderSection('Older', groupedNotifications.older)}
          </>
        ) : (
          <View style={styles.section}>
            {filteredNotifications.map(renderNotificationItem)}
          </View>
        )}

        {notifications.length > 0 && (
          <TouchableOpacity
            style={[styles.clearAllButton, { borderColor: colors.error }]}
            onPress={handleClearAll}
          >
            <Trash2 color={colors.error} size={18} />
            <Text style={[styles.clearAllText, { color: colors.error }]}>
              Clear All Notifications
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerButton: {
      padding: 8,
      marginHorizontal: 4,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    filterBar: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      borderWidth: 1,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    content: {
      flex: 1,
    },
    section: {
      paddingTop: 16,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    notificationItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderLeftWidth: 3,
      marginHorizontal: 12,
      marginBottom: 8,
      borderRadius: 12,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      overflow: 'hidden',
    },
    avatarImage: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    contentContainer: {
      flex: 1,
      marginRight: 8,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    notificationTitle: {
      fontSize: 15,
      fontWeight: '500' as const,
      flex: 1,
      marginRight: 8,
    },
    unreadTitle: {
      fontWeight: '600' as const,
    },
    timestamp: {
      fontSize: 12,
    },
    notificationBody: {
      fontSize: 14,
      lineHeight: 20,
    },
    actionsContainer: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 2,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginBottom: 8,
    },
    deleteButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 100,
      paddingHorizontal: 40,
    },
    emptyIcon: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600' as const,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 15,
      textAlign: 'center',
      lineHeight: 22,
    },
    clearAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      marginHorizontal: 16,
      marginTop: 24,
      borderRadius: 12,
      borderWidth: 1,
      gap: 8,
    },
    clearAllText: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
  });
