export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  message?: string;
  createdAt: string;
  updatedAt: string;
  sender?: FriendUser;
  receiver?: FriendUser;
}

export interface FriendUser {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastSeen?: string;
  currentActivity?: string;
  currentHomeId?: string;
}

export interface Friend {
  id: string;
  friendshipId: string;
  user: FriendUser;
  friendsSince: string;
  isOnline: boolean;
  lastSeen?: string;
  currentActivity?: string;
  currentHomeId?: string;
}

export interface FriendMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface FriendConversation {
  friendId: string;
  friend: FriendUser;
  lastMessage?: FriendMessage;
  unreadCount: number;
}

export interface SendFriendRequestInput {
  receiverId: string;
  message?: string;
}

export interface RespondToRequestInput {
  requestId: string;
  accept: boolean;
}

export interface FriendshipStats {
  totalFriends: number;
  onlineFriends: number;
  pendingRequests: number;
  sentRequests: number;
}
