export interface Friend {
  id: string;
  name: string;
  avatar: string;
  creditScore: number;
  level: number;
  isOnline: boolean;
  addedAt: number;
  city?: string;
  lifestyle?: string;
  bio?: string;
  occupation?: string;
  numFollowers?: number;
  numFollowing?: number;
  isAIAgent?: boolean;
  oasisUserId?: number;
}

export interface FriendRequest {
  id: string;
  from: Friend;
  sentAt: number;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
}

export type PostMediaType = 'image' | 'video';

export interface PostMedia {
  id: string;
  type: PostMediaType;
  uri: string;
  thumbnailUri?: string;
  width?: number;
  height?: number;
}

export interface PostComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  createdAt: number;
  likes: number;
  isAIAgent?: boolean;
}

export interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorLevel: number;
  authorCreditScore?: number;
  authorCity?: string;
  oasisUserId?: number;
  isAIAgent?: boolean;
  text: string;
  media: PostMedia[];
  likes: number;
  isLiked: boolean;
  comments: PostComment[];
  numComments?: number;
  numShares?: number;
  createdAt: number;
  type: 'status' | 'achievement' | 'home' | 'milestone' | 'tip' | 'question';
  badge?: string;
  authorOccupation?: string;
  oasisPostId?: number;
  content?: string;
  timestamp?: string;
  postType?: string;
}

export interface AIAgentProfile {
  id: string;
  userId?: number;
  displayName: string;
  avatarUrl: string;
  creditScore: number;
  level: number;
  isOnline: boolean;
  city?: string;
  occupation?: string;
  bio?: string;
  lifestyle?: string;
  numFollowers?: number;
}

export type PostType = 'status' | 'achievement' | 'home' | 'milestone' | 'tip' | 'question';

export interface SocialNotification {
  id: string;
  type: string;
  message: string;
  createdAt: number;
  isRead: boolean;
  fromUserId?: string;
  postId?: string;
}

export interface FeedFilters {
  feedType: 'personalized' | 'trending' | 'following' | 'all';
  city?: string;
  minCreditScore?: number;
  maxCreditScore?: number;
}

export function oasisPostToSocialPost(post: any): SocialPost {
  return {
    id: `oasis_post_${post.post_id || post.id || Date.now()}`,
    authorId: `oasis_user_${post.user_id}`,
    authorName: post.display_name || post.user_name || 'Agent',
    authorAvatar: post.avatar_url || '',
    authorLevel: post.level || 1,
    authorCreditScore: post.credit_score,
    authorCity: post.city,
    authorOccupation: post.occupation,
    oasisUserId: post.user_id,
    oasisPostId: post.post_id || post.id,
    isAIAgent: post.is_ai_agent ?? true,
    text: post.content || post.text || '',
    content: post.content || post.text || '',
    media: (post.media || []).map((m: any) => ({
      id: m.id || String(Math.random()),
      type: m.type || 'image',
      uri: m.url || m.uri || '',
    })),
    likes: post.like_count || post.likes || 0,
    isLiked: post.is_liked || false,
    comments: (post.comments || []).map(oasisCommentToPostComment),
    numComments: post.comment_count || 0,
    numShares: post.share_count || 0,
    createdAt: post.created_at ? new Date(post.created_at).getTime() : Date.now(),
    type: (post.post_type as PostType) || 'status',
    postType: post.post_type || 'status',
    timestamp: post.created_at || new Date().toISOString(),
  };
}

export function oasisCommentToPostComment(comment: any): PostComment {
  return {
    id: `oasis_comment_${comment.comment_id || comment.id || Date.now()}`,
    authorId: `oasis_user_${comment.user_id}`,
    authorName: comment.display_name || comment.user_name || 'Agent',
    authorAvatar: comment.avatar_url || '',
    text: comment.content || comment.text || '',
    createdAt: comment.created_at ? new Date(comment.created_at).getTime() : Date.now(),
    likes: comment.like_count || 0,
    isAIAgent: comment.is_ai_agent ?? true,
  };
}

export function oasisUserToFriend(user: any): Friend {
  return {
    id: `oasis_user_${user.user_id || user.id}`,
    name: user.display_name || user.user_name || 'Agent',
    avatar: user.avatar_url || '',
    creditScore: user.credit_score || 650,
    level: user.level || 1,
    isOnline: user.is_online || false,
    addedAt: user.created_at ? new Date(user.created_at).getTime() : Date.now(),
    city: user.city,
    occupation: user.occupation,
    bio: user.bio,
    lifestyle: user.lifestyle,
    numFollowers: user.follower_count || 0,
    numFollowing: user.following_count || 0,
    isAIAgent: user.is_ai_agent ?? true,
    oasisUserId: user.user_id || user.id,
  };
}

export function oasisUserToAgentProfile(user: any): AIAgentProfile {
  return {
    id: `oasis_agent_${user.user_id || user.id}`,
    userId: user.user_id || user.id,
    displayName: user.display_name || user.user_name || 'Agent',
    avatarUrl: user.avatar_url || '',
    creditScore: user.credit_score || 650,
    level: user.level || 1,
    isOnline: user.is_online || false,
    city: user.city,
    occupation: user.occupation,
    bio: user.bio,
    lifestyle: user.lifestyle,
    numFollowers: user.follower_count || 0,
  };
}

export function oasisNotificationToSocialNotification(notif: any): SocialNotification {
  return {
    id: `oasis_notif_${notif.notification_id || notif.id || Date.now()}`,
    type: notif.type || 'general',
    message: notif.message || notif.content || '',
    createdAt: notif.created_at ? new Date(notif.created_at).getTime() : Date.now(),
    isRead: notif.is_read || false,
    fromUserId: notif.from_user_id ? `oasis_user_${notif.from_user_id}` : undefined,
    postId: notif.post_id ? `oasis_post_${notif.post_id}` : undefined,
  };
}
