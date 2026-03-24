/**
 * OASIS × Credit Life Simulator — API Client Service
 * Connects the React Native app to the OASIS backend server.
 * Handles all REST API calls for social features.
 */

const DEFAULT_BASE_URL = 'https://your-oasis-server.com'; // Configure for production
const API_VERSION = '/api/v1';

// Allow runtime configuration
let baseUrl = DEFAULT_BASE_URL;

export function setOasisBaseUrl(url: string) {
  baseUrl = url.replace(/\/$/, ''); // Remove trailing slash
}

function apiUrl(path: string): string {
  return `${baseUrl}${API_VERSION}${path}`;
}

// ============================================================
// Types matching the backend API responses
// ============================================================

export interface OasisUser {
  user_id: number;
  agent_id: string;
  user_name: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  city: string;
  credit_score: number;
  level: number;
  lifestyle: string;
  occupation: string;
  monthly_income?: number;
  net_worth?: number;
  num_followers: number;
  num_following: number;
  num_posts: number;
  is_ai_agent: boolean;
  is_online: boolean;
}

export interface OasisPostMedia {
  id: string;
  type: 'image' | 'video';
  uri: string;
  thumbnailUri?: string;
  width?: number;
  height?: number;
}

export interface OasisPost {
  post_id: number;
  user_id: number;
  user_name: string;
  display_name: string;
  avatar_url: string;
  level: number;
  credit_score: number | null;
  city: string | null;
  is_ai_agent: boolean;
  content: string;
  post_type: 'status' | 'achievement' | 'home' | 'milestone' | 'tip' | 'question';
  badge: string | null;
  media: OasisPostMedia[];
  num_likes: number;
  num_comments: number;
  num_shares: number;
  is_liked: boolean;
  created_at: string;
}

export interface OasisComment {
  comment_id: number;
  post_id: number;
  user_id: number;
  user_name: string;
  display_name: string;
  avatar_url: string;
  is_ai_agent: boolean;
  content: string;
  num_likes: number;
  created_at: string;
}

export interface OasisNotification {
  notification_id: number;
  user_id: number;
  from_user_id: number | null;
  type: 'like' | 'comment' | 'follow' | 'friend_request' | 'mention';
  reference_id: number | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  user_name?: string;
  display_name?: string;
  avatar_url?: string;
}

export interface FeedResponse {
  posts: OasisPost[];
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface PlatformStats {
  total_users: number;
  total_posts: number;
  total_comments: number;
  total_likes: number;
  total_follows: number;
  ai_agents: number;
  real_players: number;
  simulation: {
    total_ticks: number;
    posts_generated: number;
    comments_generated: number;
    likes_generated: number;
    is_running: boolean;
  };
}

// ============================================================
// HTTP helper with error handling
// ============================================================

class APIError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'OasisAPIError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: any,
  queryParams?: Record<string, string | number | boolean>
): Promise<T> {
  let url = apiUrl(path);

  // Append query parameters
  if (queryParams) {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new APIError(
        `API error: ${response.status} ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof APIError) throw error;
    throw new APIError(
      `Network error: ${(error as Error).message}`,
      0,
      null
    );
  }
}

// ============================================================
// OASIS API Service
// ============================================================

export const OasisAPI = {
  // ==================== Player Registration ====================

  registerPlayer: (data: {
    username: string;
    display_name: string;
    avatar_url?: string;
    city?: string;
    credit_score?: number;
  }) =>
    request<{ user_id: number; agent_id: string; status: string }>(
      'POST',
      '/players/register',
      data
    ),

  getPlayerProfile: (userId: number) =>
    request<OasisUser>('GET', `/players/${userId}`),

  updatePlayerProfile: (userId: number, updates: Partial<OasisUser>) =>
    request<{ status: string; fields: string[] }>(
      'PUT',
      `/players/${userId}`,
      updates
    ),

  // ==================== Feed ====================

  getFeed: (params: {
    user_id: number;
    page?: number;
    page_size?: number;
    feed_type?: 'personalized' | 'following' | 'trending' | 'all';
  }) =>
    request<FeedResponse>('GET', '/feed', undefined, {
      user_id: params.user_id,
      page: params.page || 1,
      page_size: params.page_size || 20,
      feed_type: params.feed_type || 'personalized',
    }),

  getTrending: (hours?: number, limit?: number) =>
    request<{ posts: OasisPost[] }>('GET', '/feed/trending', undefined, {
      hours: hours || 24,
      limit: limit || 20,
    }),

  // ==================== Posts ====================

  createPost: (
    userId: number,
    data: {
      content: string;
      post_type?: string;
      badge?: string;
      media?: OasisPostMedia[];
    }
  ) =>
    request<OasisPost>('POST', '/posts', data, { user_id: userId }),

  getPost: (postId: number, userId?: number) =>
    request<OasisPost>('GET', `/posts/${postId}`, undefined, {
      user_id: userId || 0,
    }),

  getPostComments: (postId: number, limit?: number) =>
    request<{ comments: OasisComment[] }>(
      'GET',
      `/posts/${postId}/comments`,
      undefined,
      { limit: limit || 50 }
    ),

  createComment: (
    postId: number,
    userId: number,
    data: { content: string }
  ) =>
    request<{ comment_id: number; post_id: number }>(
      'POST',
      `/posts/${postId}/comments`,
      data,
      { user_id: userId }
    ),

  toggleLike: (postId: number, userId: number) =>
    request<{ is_liked: boolean; total_likes: number }>(
      'POST',
      `/posts/${postId}/like`,
      undefined,
      { user_id: userId }
    ),

  getUserPosts: (userId: number, page?: number, pageSize?: number) =>
    request<{ posts: OasisPost[]; page: number; has_more: boolean }>(
      'GET',
      `/users/${userId}/posts`,
      undefined,
      { page: page || 1, page_size: pageSize || 20 }
    ),

  // ==================== Users / Agents ====================

  searchUsers: (query: string, limit?: number) =>
    request<{ users: OasisUser[] }>('GET', '/users/search', undefined, {
      q: query,
      limit: limit || 20,
    }),

  getSuggestions: (userId: number, limit?: number) =>
    request<{ suggestions: OasisUser[] }>(
      'GET',
      `/users/${userId}/suggestions`,
      undefined,
      { limit: limit || 10 }
    ),

  // ==================== Follow ====================

  followUser: (userId: number, followeeId: number) =>
    request<{ status: string }>('POST', `/users/${userId}/follow`, {
      followee_id: followeeId,
    }),

  unfollowUser: (userId: number, followeeId: number) =>
    request<{ status: string }>('POST', `/users/${userId}/unfollow`, {
      followee_id: followeeId,
    }),

  getFollowers: (userId: number, limit?: number) =>
    request<{ followers: OasisUser[] }>(
      'GET',
      `/users/${userId}/followers`,
      undefined,
      { limit: limit || 50 }
    ),

  getFollowing: (userId: number, limit?: number) =>
    request<{ following: OasisUser[] }>(
      'GET',
      `/users/${userId}/following`,
      undefined,
      { limit: limit || 50 }
    ),

  isFollowing: (userId: number, targetId: number) =>
    request<{ is_following: boolean }>(
      'GET',
      `/users/${userId}/is-following/${targetId}`
    ),

  // ==================== Friend Requests ====================

  sendFriendRequest: (userId: number, receiverId: number, message?: string) =>
    request<{ request_id: number; status: string }>(
      'POST',
      '/friend-requests',
      { receiver_id: receiverId, message },
      { user_id: userId }
    ),

  getFriendRequests: (userId: number, direction?: 'received' | 'sent') =>
    request<{ requests: any[] }>('GET', '/friend-requests', undefined, {
      user_id: userId,
      direction: direction || 'received',
    }),

  respondToFriendRequest: (
    requestId: number,
    status: 'accepted' | 'declined'
  ) =>
    request<{ status: string }>('PUT', `/friend-requests/${requestId}`, {
      status,
    }),

  // ==================== Notifications ====================

  getNotifications: (
    userId: number,
    unreadOnly?: boolean,
    limit?: number
  ) =>
    request<{ notifications: OasisNotification[] }>(
      'GET',
      '/notifications',
      undefined,
      {
        user_id: userId,
        unread_only: unreadOnly || false,
        limit: limit || 50,
      }
    ),

  markNotificationsRead: (userId: number) =>
    request<{ marked_read: number }>('POST', '/notifications/read', undefined, {
      user_id: userId,
    }),

  // ==================== Platform ====================

  getStats: () => request<PlatformStats>('GET', '/stats'),

  healthCheck: () =>
    request<{ status: string; timestamp: string; users: number }>(
      'GET',
      '/health'
    ),

  // ==================== Agent Profiles ====================

  getAgentProfile: (userId: number) =>
    request<AgentProfileResponse>('GET', `/agents/${userId}/profile`),

  getAgentActivity: (userId: number, page?: number, limit?: number) =>
    request<AgentActivityResponse>(
      'GET',
      `/agents/${userId}/activity`,
      undefined,
      { page: page || 1, limit: limit || 20 }
    ),
};

// ============================================================
// Agent Profile Types
// ============================================================

export interface AgentProfileResponse {
  user_id: number;
  agent_id: string;
  user_name: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  city: string;
  credit_score: number;
  level: number;
  lifestyle: string;
  occupation: string;
  monthly_income: number;
  net_worth: number;
  is_ai_agent: boolean;
  is_online: boolean;
  personality_type: string;
  agent_tier: string;
  num_followers: number;
  num_following: number;
  num_posts: number;
  created_at: string;
  last_active_at: string;
  credit_tier: string;
  credit_rank: number;
  total_users: number;
  net_worth_rank: number;
  activity_breakdown: Record<string, number>;
  current_job: {
    job_title: string;
    company_name: string;
    salary_monthly: number;
    started_at: string;
  } | null;
  education: Array<{
    program_name: string;
    institution: string;
    status: string;
    enrolled_at: string;
    completed_at: string | null;
  }>;
  investments: {
    count: number;
    total_value: number;
    holdings: Array<{
      asset_type: string;
      asset_name: string;
      shares_or_units: number;
      purchase_price: number;
      current_value: number;
    }>;
  };
  properties: Array<{
    property_type: string;
    address: string;
    purchase_price: number;
    current_value: number;
  }>;
  credit_events: Array<{
    event_type: string;
    description: string;
    score_impact: number;
    created_at: string;
  }>;
  wealth_history: Array<{
    net_worth: number;
    total_assets: number;
    total_liabilities: number;
    recorded_at: string;
  }>;
}

export interface AgentActivityResponse {
  user_id: number;
  activities: Array<{
    post_id: number;
    content: string;
    post_type: string;
    badge: string | null;
    num_likes: number;
    num_comments: number;
    created_at: string;
    activity_category: string;
    activity_icon: string;
    activity_label: string;
  }>;
  page: number;
  limit: number;
  has_more: boolean;
}

export default OasisAPI;