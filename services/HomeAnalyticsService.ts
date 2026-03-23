import AsyncStorage from '@react-native-async-storage/async-storage';

const ANALYTICS_STORAGE_KEY = 'home_analytics';

export type HomeEventType =
  | 'home_created'
  | 'home_upgraded'
  | 'item_placed'
  | 'item_removed'
  | 'item_purchased'
  | 'visit_started'
  | 'visit_ended'
  | 'rating_given'
  | 'rating_received'
  | 'room_added'
  | 'room_removed'
  | 'edit_session_started'
  | 'edit_session_ended'
  | 'home_shared'
  | 'home_privacy_changed';

export interface HomeAnalyticsEvent {
  id: string;
  type: HomeEventType;
  timestamp: number;
  playerId: string;
  homeId?: string;
  metadata?: Record<string, unknown>;
}

export interface HomeMetrics {
  totalHomesCreated: number;
  totalVisitsReceived: number;
  totalVisitsMade: number;
  totalItemsPlaced: number;
  totalItemsPurchased: number;
  totalRatingsReceived: number;
  averageRating: number;
  totalEditSessions: number;
  totalEditTime: number;
  popularRooms: Record<string, number>;
  popularItems: Record<string, number>;
  visitsByDay: Record<string, number>;
  tierUpgrades: number;
}

export interface VisitAnalytics {
  totalVisits: number;
  uniqueVisitors: number;
  averageVisitDuration: number;
  peakVisitHour: number;
  returnVisitorRate: number;
}

class HomeAnalyticsService {
  private events: HomeAnalyticsEvent[] = [];
  private currentEditSession: { startTime: number; homeId: string } | null = null;
  private isInitialized = false;

  async initialize(playerId: string): Promise<void> {
    if (this.isInitialized) return;

    try {
      const stored = await AsyncStorage.getItem(`${ANALYTICS_STORAGE_KEY}_${playerId}`);
      if (stored) {
        this.events = JSON.parse(stored);
        console.log('[HomeAnalytics] Loaded', this.events.length, 'events');
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('[HomeAnalytics] Error loading analytics:', error);
      this.events = [];
      this.isInitialized = true;
    }
  }

  private async saveEvents(playerId: string): Promise<void> {
    try {
      const recentEvents = this.events.slice(-500);
      await AsyncStorage.setItem(
        `${ANALYTICS_STORAGE_KEY}_${playerId}`,
        JSON.stringify(recentEvents)
      );
    } catch (error) {
      console.error('[HomeAnalytics] Error saving analytics:', error);
    }
  }

  trackEvent(
    type: HomeEventType,
    playerId: string,
    homeId?: string,
    metadata?: Record<string, unknown>
  ): void {
    const event: HomeAnalyticsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      playerId,
      homeId,
      metadata,
    };

    this.events.push(event);
    console.log('[HomeAnalytics] Event tracked:', type, metadata);

    this.saveEvents(playerId);
  }

  trackHomeCreated(playerId: string, homeId: string, tier: number): void {
    this.trackEvent('home_created', playerId, homeId, { tier });
  }

  trackHomeUpgraded(playerId: string, homeId: string, fromTier: number, toTier: number, cost: number): void {
    this.trackEvent('home_upgraded', playerId, homeId, { fromTier, toTier, cost });
  }

  trackItemPlaced(playerId: string, homeId: string, itemId: string, roomName: string): void {
    this.trackEvent('item_placed', playerId, homeId, { itemId, roomName });
  }

  trackItemRemoved(playerId: string, homeId: string, itemId: string, roomName: string): void {
    this.trackEvent('item_removed', playerId, homeId, { itemId, roomName });
  }

  trackItemPurchased(playerId: string, itemId: string, itemName: string, price: number): void {
    this.trackEvent('item_purchased', playerId, undefined, { itemId, itemName, price });
  }

  trackVisitStarted(playerId: string, homeId: string, hostId: string): void {
    this.trackEvent('visit_started', playerId, homeId, { hostId, startTime: Date.now() });
  }

  trackVisitEnded(playerId: string, homeId: string, duration: number, rating?: number): void {
    this.trackEvent('visit_ended', playerId, homeId, { duration, rating });
  }

  trackRatingGiven(playerId: string, homeId: string, rating: number, hasComment: boolean): void {
    this.trackEvent('rating_given', playerId, homeId, { rating, hasComment });
  }

  trackRatingReceived(playerId: string, homeId: string, rating: number, raterName: string): void {
    this.trackEvent('rating_received', playerId, homeId, { rating, raterName });
  }

  trackRoomAdded(playerId: string, homeId: string, roomName: string): void {
    this.trackEvent('room_added', playerId, homeId, { roomName });
  }

  trackRoomRemoved(playerId: string, homeId: string, roomName: string): void {
    this.trackEvent('room_removed', playerId, homeId, { roomName });
  }

  startEditSession(playerId: string, homeId: string): void {
    this.currentEditSession = { startTime: Date.now(), homeId };
    this.trackEvent('edit_session_started', playerId, homeId);
  }

  endEditSession(playerId: string): number {
    if (!this.currentEditSession) return 0;

    const duration = Date.now() - this.currentEditSession.startTime;
    this.trackEvent('edit_session_ended', playerId, this.currentEditSession.homeId, {
      duration,
      durationMinutes: Math.round(duration / 60000),
    });

    this.currentEditSession = null;
    return duration;
  }

  trackHomeShared(playerId: string, homeId: string, platform: string): void {
    this.trackEvent('home_shared', playerId, homeId, { platform });
  }

  trackPrivacyChanged(playerId: string, homeId: string, isPublic: boolean): void {
    this.trackEvent('home_privacy_changed', playerId, homeId, { isPublic });
  }

  getMetrics(playerId: string): HomeMetrics {
    const playerEvents = this.events.filter(e => e.playerId === playerId);

    const homesCreated = playerEvents.filter(e => e.type === 'home_created').length;
    const visitsReceived = playerEvents.filter(e => e.type === 'visit_started' && e.metadata?.hostId !== playerId).length;
    const visitsMade = playerEvents.filter(e => e.type === 'visit_started' && e.metadata?.hostId === playerId).length;
    const itemsPlaced = playerEvents.filter(e => e.type === 'item_placed').length;
    const itemsPurchased = playerEvents.filter(e => e.type === 'item_purchased').length;

    const ratingsReceived = playerEvents.filter(e => e.type === 'rating_received');
    const totalRatings = ratingsReceived.length;
    const avgRating = totalRatings > 0
      ? ratingsReceived.reduce((sum, e) => sum + (e.metadata?.rating as number || 0), 0) / totalRatings
      : 0;

    const editSessions = playerEvents.filter(e => e.type === 'edit_session_ended');
    const totalEditTime = editSessions.reduce((sum, e) => sum + (e.metadata?.duration as number || 0), 0);

    const popularRooms: Record<string, number> = {};
    playerEvents
      .filter(e => e.type === 'item_placed' && e.metadata?.roomName)
      .forEach(e => {
        const room = e.metadata?.roomName as string;
        popularRooms[room] = (popularRooms[room] || 0) + 1;
      });

    const popularItems: Record<string, number> = {};
    playerEvents
      .filter(e => e.type === 'item_placed' && e.metadata?.itemId)
      .forEach(e => {
        const item = e.metadata?.itemId as string;
        popularItems[item] = (popularItems[item] || 0) + 1;
      });

    const visitsByDay: Record<string, number> = {};
    playerEvents
      .filter(e => e.type === 'visit_started')
      .forEach(e => {
        const day = new Date(e.timestamp).toISOString().split('T')[0];
        visitsByDay[day] = (visitsByDay[day] || 0) + 1;
      });

    const tierUpgrades = playerEvents.filter(e => e.type === 'home_upgraded').length;

    return {
      totalHomesCreated: homesCreated,
      totalVisitsReceived: visitsReceived,
      totalVisitsMade: visitsMade,
      totalItemsPlaced: itemsPlaced,
      totalItemsPurchased: itemsPurchased,
      totalRatingsReceived: totalRatings,
      averageRating: Math.round(avgRating * 10) / 10,
      totalEditSessions: editSessions.length,
      totalEditTime,
      popularRooms,
      popularItems,
      visitsByDay,
      tierUpgrades,
    };
  }

  getVisitAnalytics(playerId: string, homeId?: string): VisitAnalytics {
    let visitEvents = this.events.filter(e => 
      e.type === 'visit_ended' && 
      (homeId ? e.homeId === homeId : e.playerId === playerId)
    );

    const totalVisits = visitEvents.length;
    const uniqueVisitors = new Set(visitEvents.map(e => e.playerId)).size;

    const durations = visitEvents
      .map(e => e.metadata?.duration as number || 0)
      .filter(d => d > 0);
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    const hourCounts: Record<number, number> = {};
    visitEvents.forEach(e => {
      const hour = new Date(e.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || '0';

    const visitorCounts: Record<string, number> = {};
    visitEvents.forEach(e => {
      visitorCounts[e.playerId] = (visitorCounts[e.playerId] || 0) + 1;
    });
    const returnVisitors = Object.values(visitorCounts).filter(c => c > 1).length;
    const returnRate = uniqueVisitors > 0 ? returnVisitors / uniqueVisitors : 0;

    return {
      totalVisits,
      uniqueVisitors,
      averageVisitDuration: Math.round(avgDuration / 1000),
      peakVisitHour: parseInt(peakHour, 10),
      returnVisitorRate: Math.round(returnRate * 100) / 100,
    };
  }

  getRecentEvents(playerId: string, limit: number = 20): HomeAnalyticsEvent[] {
    return this.events
      .filter(e => e.playerId === playerId)
      .slice(-limit)
      .reverse();
  }

  getEventsByType(playerId: string, type: HomeEventType): HomeAnalyticsEvent[] {
    return this.events.filter(e => e.playerId === playerId && e.type === type);
  }

  async clearAnalytics(playerId: string): Promise<void> {
    this.events = this.events.filter(e => e.playerId !== playerId);
    await AsyncStorage.removeItem(`${ANALYTICS_STORAGE_KEY}_${playerId}`);
    console.log('[HomeAnalytics] Analytics cleared for player:', playerId);
  }
}

export const homeAnalyticsService = new HomeAnalyticsService();
export default homeAnalyticsService;
