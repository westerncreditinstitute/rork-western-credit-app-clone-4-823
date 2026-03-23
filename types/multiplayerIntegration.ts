export interface MultiplayerUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: number;
  currentHomeId?: string;
  currentRoomId?: string;
}

export interface MultiplayerPresence {
  userId: string;
  homeId: string;
  roomId?: string;
  status: 'active' | 'idle' | 'away';
  joinedAt: number;
  lastActivity: number;
  position?: { x: number; y: number; z: number };
}

export interface MultiplayerNotification {
  id: string;
  type: MultiplayerNotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  userId: string;
  fromUserId?: string;
  fromUserName?: string;
  fromUserAvatar?: string;
  homeId?: string;
  homeName?: string;
  isRead: boolean;
  createdAt: number;
  expiresAt?: number;
}

export type MultiplayerNotificationType =
  | 'visitor_joined'
  | 'visitor_left'
  | 'chat_message'
  | 'reaction'
  | 'tour_started'
  | 'tour_ended'
  | 'investment_received'
  | 'partnership_request'
  | 'partnership_accepted'
  | 'leaderboard_update'
  | 'achievement_unlocked'
  | 'friend_online'
  | 'home_featured'
  | 'business_update';

export interface MultiplayerEvent {
  id: string;
  type: MultiplayerEventType;
  userId: string;
  homeId?: string;
  businessId?: string;
  sessionId?: string;
  data: Record<string, any>;
  timestamp: number;
}

export type MultiplayerEventType =
  | 'session_start'
  | 'session_end'
  | 'visitor_join'
  | 'visitor_leave'
  | 'chat_sent'
  | 'reaction_sent'
  | 'tour_action'
  | 'investment_action'
  | 'partnership_action'
  | 'leaderboard_change'
  | 'avatar_update';

export interface MultiplayerAnalytics {
  totalSessions: number;
  totalVisitors: number;
  totalMessages: number;
  totalReactions: number;
  averageSessionDuration: number;
  peakConcurrentUsers: number;
  activeUsersToday: number;
  activeUsersThisWeek: number;
  topHomes: { homeId: string; visits: number }[];
  topUsers: { userId: string; score: number }[];
}

export interface MultiplayerSessionMetrics {
  sessionId: string;
  homeId: string;
  hostId: string;
  startTime: number;
  endTime?: number;
  duration: number;
  visitorCount: number;
  messageCount: number;
  reactionCount: number;
  peakVisitors: number;
}

export interface BusinessMultiplayerData {
  businessId: string;
  ownerId: string;
  totalInvestors: number;
  totalInvestment: number;
  partnerships: BusinessPartnership[];
  investmentPool: InvestmentPoolData;
  realtimeViewers: number;
}

export interface BusinessPartnership {
  id: string;
  businessId: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string;
  ownershipPercentage: number;
  investmentAmount: number;
  status: 'pending' | 'active' | 'dissolved';
  createdAt: number;
  updatedAt: number;
}

export interface InvestmentPoolData {
  poolId: string;
  businessId: string;
  targetAmount: number;
  currentAmount: number;
  investorCount: number;
  status: 'open' | 'closed' | 'funded';
  minInvestment: number;
  maxInvestment: number;
  deadline?: number;
  investors: PoolInvestor[];
}

export interface PoolInvestor {
  userId: string;
  userName: string;
  userAvatar?: string;
  amount: number;
  percentage: number;
  investedAt: number;
}

export interface MultiplayerAvatar {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  avatarColor: string;
  statusIndicator: 'online' | 'away' | 'busy' | 'offline';
  customization?: {
    skinTone?: string;
    hairColor?: string;
    hairStyle?: string;
    eyeColor?: string;
    outfit?: Record<string, any>;
  };
  badges?: string[];
  level?: number;
}

export interface AvatarPosition {
  userId: string;
  homeId: string;
  roomId?: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  animation?: string;
}

export interface IntegrationConfig {
  enablePresence: boolean;
  enableNotifications: boolean;
  enableAnalytics: boolean;
  enableBusinessFeatures: boolean;
  enableAvatarSync: boolean;
  presenceUpdateInterval: number;
  notificationBatchInterval: number;
  analyticsFlushInterval: number;
  maxConcurrentConnections: number;
  reconnectAttempts: number;
  reconnectDelay: number;
}

export const DEFAULT_INTEGRATION_CONFIG: IntegrationConfig = {
  enablePresence: true,
  enableNotifications: true,
  enableAnalytics: true,
  enableBusinessFeatures: true,
  enableAvatarSync: true,
  presenceUpdateInterval: 5000,
  notificationBatchInterval: 1000,
  analyticsFlushInterval: 30000,
  maxConcurrentConnections: 50,
  reconnectAttempts: 5,
  reconnectDelay: 2000,
};
