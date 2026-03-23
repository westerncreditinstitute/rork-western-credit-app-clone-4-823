import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MultiplayerAnalytics,
  MultiplayerSessionMetrics,
  MultiplayerEvent,
  MultiplayerEventType,
} from '@/types/multiplayerIntegration';

const STORAGE_KEY = 'multiplayer_analytics';
const FLUSH_INTERVAL = 30000;
const MAX_CACHED_EVENTS = 500;

interface AnalyticsEvent {
  type: MultiplayerEventType;
  userId: string;
  homeId?: string;
  businessId?: string;
  sessionId?: string;
  data: Record<string, any>;
  timestamp: number;
}

interface SessionTracker {
  sessionId: string;
  homeId: string;
  hostId: string;
  startTime: number;
  visitorIds: Set<string>;
  messageCount: number;
  reactionCount: number;
  peakVisitors: number;
}

interface DailyStats {
  date: string;
  sessions: number;
  visitors: number;
  messages: number;
  reactions: number;
  investments: number;
  partnerships: number;
}

class MultiplayerAnalyticsService {
  private eventQueue: AnalyticsEvent[] = [];
  private activeSessions: Map<string, SessionTracker> = new Map();
  private dailyStats: Map<string, DailyStats> = new Map();
  private flushTimer: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;
  private currentUserId: string | null = null;

  async initialize(userId: string): Promise<void> {
    if (this.isInitialized) {
      console.log('[MultiplayerAnalytics] Already initialized');
      return;
    }

    this.currentUserId = userId;
    await this.loadCachedData();
    this.startFlushTimer();
    this.isInitialized = true;

    console.log('[MultiplayerAnalytics] Initialized for user:', userId);
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, FLUSH_INTERVAL) as unknown as NodeJS.Timeout;
  }

  trackEvent(event: MultiplayerEvent): void {
    const analyticsEvent: AnalyticsEvent = {
      type: event.type,
      userId: event.userId,
      homeId: event.homeId,
      businessId: event.businessId,
      sessionId: event.sessionId,
      data: event.data,
      timestamp: event.timestamp,
    };

    this.eventQueue.push(analyticsEvent);

    if (this.eventQueue.length > MAX_CACHED_EVENTS) {
      this.eventQueue = this.eventQueue.slice(-MAX_CACHED_EVENTS);
    }

    this.updateDailyStats(analyticsEvent);
    this.updateSessionTracking(analyticsEvent);

    console.log('[MultiplayerAnalytics] Event tracked:', event.type);
  }

  trackSessionStart(sessionId: string, homeId: string, hostId: string): void {
    const tracker: SessionTracker = {
      sessionId,
      homeId,
      hostId,
      startTime: Date.now(),
      visitorIds: new Set([hostId]),
      messageCount: 0,
      reactionCount: 0,
      peakVisitors: 1,
    };

    this.activeSessions.set(sessionId, tracker);

    this.trackEvent({
      id: `event_${Date.now()}`,
      type: 'session_start',
      userId: hostId,
      homeId,
      sessionId,
      data: { hostId },
      timestamp: Date.now(),
    });

    console.log('[MultiplayerAnalytics] Session started:', sessionId);
  }

  trackSessionEnd(sessionId: string): MultiplayerSessionMetrics | null {
    const tracker = this.activeSessions.get(sessionId);
    if (!tracker) {
      console.warn('[MultiplayerAnalytics] Session not found:', sessionId);
      return null;
    }

    const endTime = Date.now();
    const metrics: MultiplayerSessionMetrics = {
      sessionId: tracker.sessionId,
      homeId: tracker.homeId,
      hostId: tracker.hostId,
      startTime: tracker.startTime,
      endTime,
      duration: endTime - tracker.startTime,
      visitorCount: tracker.visitorIds.size,
      messageCount: tracker.messageCount,
      reactionCount: tracker.reactionCount,
      peakVisitors: tracker.peakVisitors,
    };

    this.activeSessions.delete(sessionId);

    this.trackEvent({
      id: `event_${Date.now()}`,
      type: 'session_end',
      userId: tracker.hostId,
      homeId: tracker.homeId,
      sessionId,
      data: { metrics },
      timestamp: Date.now(),
    });

    this.saveSessionMetrics(metrics);

    console.log('[MultiplayerAnalytics] Session ended:', sessionId, metrics);
    return metrics;
  }

  trackVisitorJoin(sessionId: string, visitorId: string): void {
    const tracker = this.activeSessions.get(sessionId);
    if (tracker) {
      tracker.visitorIds.add(visitorId);
      tracker.peakVisitors = Math.max(tracker.peakVisitors, tracker.visitorIds.size);

      this.trackEvent({
        id: `event_${Date.now()}`,
        type: 'visitor_join',
        userId: visitorId,
        homeId: tracker.homeId,
        sessionId,
        data: { visitorCount: tracker.visitorIds.size },
        timestamp: Date.now(),
      });
    }
  }

  trackVisitorLeave(sessionId: string, visitorId: string): void {
    const tracker = this.activeSessions.get(sessionId);
    if (tracker) {
      tracker.visitorIds.delete(visitorId);

      this.trackEvent({
        id: `event_${Date.now()}`,
        type: 'visitor_leave',
        userId: visitorId,
        homeId: tracker.homeId,
        sessionId,
        data: { visitorCount: tracker.visitorIds.size },
        timestamp: Date.now(),
      });
    }
  }

  trackChatMessage(sessionId: string, userId: string, homeId: string): void {
    const tracker = this.activeSessions.get(sessionId);
    if (tracker) {
      tracker.messageCount++;
    }

    this.trackEvent({
      id: `event_${Date.now()}`,
      type: 'chat_sent',
      userId,
      homeId,
      sessionId,
      data: {},
      timestamp: Date.now(),
    });
  }

  trackReaction(sessionId: string, userId: string, homeId: string, emoji: string): void {
    const tracker = this.activeSessions.get(sessionId);
    if (tracker) {
      tracker.reactionCount++;
    }

    this.trackEvent({
      id: `event_${Date.now()}`,
      type: 'reaction_sent',
      userId,
      homeId,
      sessionId,
      data: { emoji },
      timestamp: Date.now(),
    });
  }

  trackInvestment(userId: string, businessId: string, amount: number): void {
    this.trackEvent({
      id: `event_${Date.now()}`,
      type: 'investment_action',
      userId,
      businessId,
      data: { amount, action: 'invest' },
      timestamp: Date.now(),
    });
  }

  trackPartnership(userId: string, businessId: string, partnerId: string, action: 'request' | 'accept' | 'reject'): void {
    this.trackEvent({
      id: `event_${Date.now()}`,
      type: 'partnership_action',
      userId,
      businessId,
      data: { partnerId, action },
      timestamp: Date.now(),
    });
  }

  trackLeaderboardChange(userId: string, leaderboardType: string, newRank: number, previousRank: number): void {
    this.trackEvent({
      id: `event_${Date.now()}`,
      type: 'leaderboard_change',
      userId,
      data: { leaderboardType, newRank, previousRank },
      timestamp: Date.now(),
    });
  }

  trackAvatarUpdate(userId: string, changes: Record<string, any>): void {
    this.trackEvent({
      id: `event_${Date.now()}`,
      type: 'avatar_update',
      userId,
      data: { changes },
      timestamp: Date.now(),
    });
  }

  private updateDailyStats(event: AnalyticsEvent): void {
    const date = new Date(event.timestamp).toISOString().split('T')[0];
    
    let stats = this.dailyStats.get(date);
    if (!stats) {
      stats = {
        date,
        sessions: 0,
        visitors: 0,
        messages: 0,
        reactions: 0,
        investments: 0,
        partnerships: 0,
      };
      this.dailyStats.set(date, stats);
    }

    switch (event.type) {
      case 'session_start':
        stats.sessions++;
        break;
      case 'visitor_join':
        stats.visitors++;
        break;
      case 'chat_sent':
        stats.messages++;
        break;
      case 'reaction_sent':
        stats.reactions++;
        break;
      case 'investment_action':
        stats.investments++;
        break;
      case 'partnership_action':
        stats.partnerships++;
        break;
    }
  }

  private updateSessionTracking(event: AnalyticsEvent): void {
    if (!event.sessionId) return;

    const tracker = this.activeSessions.get(event.sessionId);
    if (!tracker) return;

    switch (event.type) {
      case 'chat_sent':
        tracker.messageCount++;
        break;
      case 'reaction_sent':
        tracker.reactionCount++;
        break;
    }
  }

  async getAnalytics(days: number = 7): Promise<MultiplayerAnalytics> {
    const now = Date.now();
    const startTime = now - (days * 24 * 60 * 60 * 1000);

    const recentEvents = this.eventQueue.filter(e => e.timestamp >= startTime);
    
    const sessions = recentEvents.filter(e => e.type === 'session_start').length;
    const visitors = new Set(recentEvents.filter(e => e.type === 'visitor_join').map(e => e.userId)).size;
    const messages = recentEvents.filter(e => e.type === 'chat_sent').length;
    const reactions = recentEvents.filter(e => e.type === 'reaction_sent').length;

    const sessionDurations = recentEvents
      .filter(e => e.type === 'session_end' && e.data.metrics?.duration)
      .map(e => e.data.metrics.duration);
    
    const avgDuration = sessionDurations.length > 0
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
      : 0;

    const homeVisits = new Map<string, number>();
    recentEvents.filter(e => e.homeId).forEach(e => {
      const count = homeVisits.get(e.homeId!) || 0;
      homeVisits.set(e.homeId!, count + 1);
    });

    const topHomes = Array.from(homeVisits.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([homeId, visits]) => ({ homeId, visits }));

    const userScores = new Map<string, number>();
    recentEvents.forEach(e => {
      const score = userScores.get(e.userId) || 0;
      userScores.set(e.userId, score + 1);
    });

    const topUsers = Array.from(userScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, score]) => ({ userId, score }));

    const today = new Date().toISOString().split('T')[0];
    
    const activeUsersToday = new Set(
      recentEvents
        .filter(e => new Date(e.timestamp).toISOString().split('T')[0] === today)
        .map(e => e.userId)
    ).size;

    const activeUsersThisWeek = new Set(
      recentEvents.map(e => e.userId)
    ).size;

    return {
      totalSessions: sessions,
      totalVisitors: visitors,
      totalMessages: messages,
      totalReactions: reactions,
      averageSessionDuration: avgDuration,
      peakConcurrentUsers: Math.max(...Array.from(this.activeSessions.values()).map(s => s.peakVisitors), 0),
      activeUsersToday,
      activeUsersThisWeek,
      topHomes,
      topUsers,
    };
  }

  getDailyStats(date: string): DailyStats | null {
    return this.dailyStats.get(date) || null;
  }

  getWeeklyStats(): DailyStats[] {
    const stats: DailyStats[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      stats.push(this.dailyStats.get(dateStr) || {
        date: dateStr,
        sessions: 0,
        visitors: 0,
        messages: 0,
        reactions: 0,
        investments: 0,
        partnerships: 0,
      });
    }

    return stats;
  }

  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  getTotalOnlineUsers(): number {
    const allUsers = new Set<string>();
    this.activeSessions.forEach(session => {
      session.visitorIds.forEach(id => allUsers.add(id));
    });
    return allUsers.size;
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];

    if (isSupabaseConfigured) {
      try {
        await supabase.from('multiplayer_analytics_events').insert(
          eventsToFlush.map(e => ({
            event_type: e.type,
            user_id: e.userId,
            home_id: e.homeId,
            business_id: e.businessId,
            session_id: e.sessionId,
            event_data: e.data,
            created_at: new Date(e.timestamp).toISOString(),
          }))
        );
        console.log('[MultiplayerAnalytics] Flushed', eventsToFlush.length, 'events to database');
      } catch (error) {
        console.warn('[MultiplayerAnalytics] Failed to flush events to database:', error);
      }
    }

    await this.saveCachedData();
  }

  private async saveSessionMetrics(metrics: MultiplayerSessionMetrics): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('multiplayer_session_metrics').insert({
          session_id: metrics.sessionId,
          home_id: metrics.homeId,
          host_id: metrics.hostId,
          start_time: new Date(metrics.startTime).toISOString(),
          end_time: metrics.endTime ? new Date(metrics.endTime).toISOString() : null,
          duration_ms: metrics.duration,
          visitor_count: metrics.visitorCount,
          message_count: metrics.messageCount,
          reaction_count: metrics.reactionCount,
          peak_visitors: metrics.peakVisitors,
        });
      } catch (error) {
        console.warn('[MultiplayerAnalytics] Failed to save session metrics:', error);
      }
    }
  }

  private async loadCachedData(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${this.currentUserId}`);
      if (stored) {
        const data = JSON.parse(stored);
        this.eventQueue = data.events || [];
        
        if (data.dailyStats) {
          this.dailyStats = new Map(Object.entries(data.dailyStats));
        }

        console.log('[MultiplayerAnalytics] Loaded cached data:', this.eventQueue.length, 'events');
      }
    } catch (error) {
      console.error('[MultiplayerAnalytics] Failed to load cached data:', error);
    }
  }

  private async saveCachedData(): Promise<void> {
    try {
      const data = {
        events: this.eventQueue.slice(-MAX_CACHED_EVENTS),
        dailyStats: Object.fromEntries(this.dailyStats),
      };

      await AsyncStorage.setItem(
        `${STORAGE_KEY}_${this.currentUserId}`,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('[MultiplayerAnalytics] Failed to save cached data:', error);
    }
  }

  async cleanup(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flushEvents();

    this.activeSessions.forEach((_, sessionId) => {
      this.trackSessionEnd(sessionId);
    });

    this.eventQueue = [];
    this.activeSessions.clear();
    this.isInitialized = false;

    console.log('[MultiplayerAnalytics] Cleanup complete');
  }
}

export const multiplayerAnalyticsService = new MultiplayerAnalyticsService();
export default multiplayerAnalyticsService;
