export type NotificationType = 
  | 'friend_request'
  | 'friend_accepted'
  | 'new_message'
  | 'home_visit_invitation'
  | 'home_visitor_joined'
  | 'home_visitor_left'
  | 'home_rating_received'
  | 'home_tier_upgraded'
  | 'home_item_gifted'
  | 'achievement_unlocked'
  | 'marketplace_item_sold'
  | 'marketplace_purchase_complete'
  | 'marketplace_outbid'
  | 'marketplace_auction_won'
  | 'marketplace_auction_ended'
  | 'marketplace_listing_expired'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationData {
  friendId?: string;
  friendName?: string;
  friendAvatarUrl?: string;
  requestId?: string;
  messageId?: string;
  messagePreview?: string;
  homeId?: string;
  homeName?: string;
  achievementId?: string;
  achievementName?: string;
  actionUrl?: string;
  rating?: number;
  comment?: string;
  visitDuration?: string;
  itemName?: string;
  tierLevel?: number;
  listingId?: string;
  itemId?: string;
  price?: number;
  currency?: string;
  buyerId?: string;
  sellerId?: string;
  bidAmount?: number;
  winningBid?: number;
  [key: string]: unknown;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: NotificationData;
  priority: NotificationPriority;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  friendRequests: boolean;
  friendAccepted: boolean;
  newMessages: boolean;
  homeInvitations: boolean;
  homeVisitors: boolean;
  achievements: boolean;
  marketplaceAlerts: boolean;
  auctionAlerts: boolean;
  systemNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: NotificationData;
  priority?: NotificationPriority;
}

export interface NotificationFilter {
  types?: NotificationType[];
  isRead?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  friendRequests: true,
  friendAccepted: true,
  newMessages: true,
  homeInvitations: true,
  homeVisitors: true,
  achievements: true,
  marketplaceAlerts: true,
  auctionAlerts: true,
  systemNotifications: true,
  soundEnabled: true,
  vibrationEnabled: true,
};

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  friend_request: 'UserPlus',
  friend_accepted: 'UserCheck',
  new_message: 'MessageCircle',
  home_visit_invitation: 'Home',
  home_visitor_joined: 'LogIn',
  home_visitor_left: 'LogOut',
  home_rating_received: 'Star',
  home_tier_upgraded: 'TrendingUp',
  home_item_gifted: 'Gift',
  achievement_unlocked: 'Trophy',
  marketplace_item_sold: 'DollarSign',
  marketplace_purchase_complete: 'ShoppingBag',
  marketplace_outbid: 'AlertTriangle',
  marketplace_auction_won: 'Award',
  marketplace_auction_ended: 'Clock',
  marketplace_listing_expired: 'XCircle',
  system: 'Bell',
};

export const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  friend_request: '#3B82F6',
  friend_accepted: '#10B981',
  new_message: '#8B5CF6',
  home_visit_invitation: '#F59E0B',
  home_visitor_joined: '#06B6D4',
  home_visitor_left: '#6B7280',
  home_rating_received: '#FBBF24',
  home_tier_upgraded: '#10B981',
  home_item_gifted: '#EC4899',
  achievement_unlocked: '#EAB308',
  marketplace_item_sold: '#10B981',
  marketplace_purchase_complete: '#3B82F6',
  marketplace_outbid: '#F59E0B',
  marketplace_auction_won: '#10B981',
  marketplace_auction_ended: '#6B7280',
  marketplace_listing_expired: '#EF4444',
  system: '#6366F1',
};
