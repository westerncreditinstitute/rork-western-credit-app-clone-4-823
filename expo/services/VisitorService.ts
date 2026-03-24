// Visitor Service - Manages home visits and visitor interactions

import { supabase } from '../lib/supabase';
import {
  HomeVisitor,
  VisitHomeInput,
  RateHomeInput,
  ActiveHomeSession,
  VisitorData,
} from '../types/home';

export class VisitorService {
  /**
   * Start a visit to a home
   */
  static async startVisit(input: VisitHomeInput): Promise<HomeVisitor> {
    const { homeId, visitorId } = input;

    // Check if home is public
    const { data: home } = await supabase
      .from('player_homes')
      .select('player_id, max_visitors, current_visitors, is_public')
      .eq('id', homeId)
      .single();

    if (!home) {
      throw new Error('Home not found');
    }

    if (!home.is_public) {
      throw new Error('Home is not open for visitors');
    }

    if (home.current_visitors >= home.max_visitors) {
      throw new Error('Home is at maximum capacity');
    }

    // Check if visitor is already visiting (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existingVisit } = await supabase
      .from('home_visitors')
      .select('*')
      .eq('home_id', homeId)
      .eq('visitor_id', visitorId)
      .gte('visit_time', fiveMinutesAgo)
      .single();

    if (existingVisit) {
      throw new Error('You are already visiting this home');
    }

    // Create visit record
    const { data, error } = await supabase
      .from('home_visitors')
      .insert({
        home_id: homeId,
        visitor_id: visitorId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to start visit: ${error.message}`);
    }

    // Log analytics
    await supabase.from('home_analytics').insert({
      home_id: homeId,
      event_type: 'visit',
      event_data: {
        visitor_id: visitorId,
      },
      visitor_id: visitorId,
    });

    return this.mapToHomeVisitor(data);
  }

  /**
   * End a visit to a home
   */
  static async endVisit(homeId: string, visitorId: string): Promise<HomeVisitor> {
    // Get current visit (most recent)
    const { data: visit } = await supabase
      .from('home_visitors')
      .select('*')
      .eq('home_id', homeId)
      .eq('visitor_id', visitorId)
      .order('visit_time', { ascending: false })
      .limit(1)
      .single();

    if (!visit) {
      throw new Error('No active visit found');
    }

    const visitEndTime = new Date();
    const visitStartTime = new Date(visit.visit_time);
    const durationSeconds = Math.floor(
      (visitEndTime.getTime() - visitStartTime.getTime()) / 1000
    );

    // Update visit record with duration
    const { data, error } = await supabase
      .from('home_visitors')
      .update({
        duration: durationSeconds,
      })
      .eq('id', visit.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to end visit: ${error.message}`);
    }

    return this.mapToHomeVisitor(data);
  }

  /**
   * Get active visits for a home
   */
  static async getActiveVisits(homeId: string): Promise<VisitorData[]> {
    try {
      // Get visits from last 30 minutes as "active"
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('home_visitors')
        .select('*')
        .eq('home_id', homeId)
        .gte('visit_time', thirtyMinutesAgo);

      if (error) {
        const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        console.error('[VisitorService] Error fetching active visits:', errorMessage);
        return [];
      }

      return (data || []).map((visit: any) => ({
        visitorId: visit.visitor_id,
        visitorName: 'Visitor',
        visitorEmail: undefined,
        isOnline: true,
        visitStartTime: visit.visit_time,
        durationSeconds: visit.duration || 0,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[VisitorService] Error fetching active visits:', errorMessage);
      return [];
    }
  }

  /**
   * Get active home session
   */
  static async getActiveHomeSession(homeId: string): Promise<ActiveHomeSession | null> {
    try {
      const { data: home, error } = await supabase
        .from('player_homes')
        .select('player_id, max_visitors')
        .eq('id', homeId)
        .single();

      if (error || !home) {
        console.error('[VisitorService] Error fetching home for session:', error?.message || 'Home not found');
        return null;
      }

      const activeVisitors = await this.getActiveVisits(homeId);

      return {
        homeId,
        homeName: 'Home',
        hostPlayerId: home.player_id,
        currentVisitors: activeVisitors,
        sessionStart: new Date().toISOString(),
        maxVisitors: home.max_visitors,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[VisitorService] Error getting active home session:', errorMessage);
      return null;
    }
  }

  /**
   * Get visitor's visit history
   */
  static async getVisitorHistory(visitorId: string, limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('home_visitors')
        .select(`
          *,
          home:player_homes(id, player_id)
        `)
        .eq('visitor_id', visitorId)
        .order('visit_time', { ascending: false })
        .limit(limit);

      if (error) {
        const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        console.log('[VisitorService] Table may not exist, returning empty history:', errorMessage);
        return [];
      }

      return (data || []).map((visit: any) => ({
        id: visit.id,
        home_id: visit.home_id,
        visitor_id: visit.visitor_id,
        visit_start_time: visit.visit_time,
        visit_end_time: null,
        duration_seconds: visit.duration || 0,
        is_online: false,
        rating: undefined,
        comment: undefined,
        home_name: 'Home',
        host_id: visit.home?.player_id,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[VisitorService] Error fetching visitor history:', errorMessage);
      return [];
    }
  }

  /**
   * Get home's visit history
   */
  static async getHomeVisitHistory(homeId: string, limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('home_visitors')
        .select('*')
        .eq('home_id', homeId)
        .order('visit_time', { ascending: false })
        .limit(limit);

      if (error) {
        const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        console.log('[VisitorService] Table may not exist, returning empty history:', errorMessage);
        return [];
      }

      return (data || []).map((visit: any) => ({
        id: visit.id,
        home_id: visit.home_id,
        visitor_id: visit.visitor_id,
        visit_start_time: visit.visit_time,
        visit_end_time: null,
        duration_seconds: visit.duration || 0,
        is_online: false,
        rating: undefined,
        comment: undefined,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[VisitorService] Error fetching home visit history:', errorMessage);
      return [];
    }
  }

  /**
   * Rate a home
   */
  static async rateHome(input: RateHomeInput): Promise<HomeVisitor> {
    const { homeId, visitorId, rating, comment } = input;

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Get the most recent visit
    const { data: visit } = await supabase
      .from('home_visitors')
      .select('*')
      .eq('home_id', homeId)
      .eq('visitor_id', visitorId)
      .order('visit_time', { ascending: false })
      .limit(1)
      .single();

    if (!visit) {
      throw new Error('No visit found for this home');
    }

    // Log analytics (rating stored in analytics since home_visitors doesn't have rating column)
    await supabase.from('home_analytics').insert({
      home_id: homeId,
      event_type: 'rating_given',
      event_data: {
        visitor_id: visitorId,
        rating,
        comment,
      },
      visitor_id: visitorId,
    });

    return this.mapToHomeVisitor(visit);
  }

  /**
   * Get home's ratings
   */
  static async getHomeRatings(homeId: string): Promise<{
    averageRating: number;
    totalRatings: number;
    ratingDistribution: { [key: number]: number };
  }> {
    // Get ratings from home_analytics since home_visitors doesn't have rating column
    const { data, error } = await supabase
      .from('home_analytics')
      .select('event_data')
      .eq('home_id', homeId)
      .eq('event_type', 'rating_given');

    if (error) {
      console.log('[VisitorService] Error fetching ratings:', error.message);
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const ratings = (data || [])
      .map((r: any) => r.event_data?.rating)
      .filter((r: any) => typeof r === 'number');
    const totalRatings = ratings.length;

    if (totalRatings === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const averageRating = ratings.reduce((sum: number, r: number) => sum + r, 0) / totalRatings;

    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    ratings.forEach((r: number) => {
      if (r >= 1 && r <= 5) {
        ratingDistribution[r as keyof typeof ratingDistribution]++;
      }
    });

    return {
      averageRating: Math.round(averageRating * 100) / 100,
      totalRatings,
      ratingDistribution,
    };
  }

  /**
   * Check if visitor can visit home
   */
  static async canVisitHome(homeId: string, visitorId: string): Promise<{
    canVisit: boolean;
    reason?: string;
  }> {
    // Check if home is public
    const { data: home } = await supabase
      .from('player_homes')
      .select('player_id, max_visitors, current_visitors, is_public')
      .eq('id', homeId)
      .single();

    if (!home) {
      return { canVisit: false, reason: 'Home not found' };
    }

    if (home.player_id === visitorId) {
      return { canVisit: true }; // Owner can always visit
    }

    if (!home.is_public) {
      return { canVisit: false, reason: 'Home is not open for visitors' };
    }

    if (home.current_visitors >= home.max_visitors) {
      return { canVisit: false, reason: 'Home is at maximum capacity' };
    }

    // Check if visitor visited recently (within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existingVisit } = await supabase
      .from('home_visitors')
      .select('id')
      .eq('home_id', homeId)
      .eq('visitor_id', visitorId)
      .gte('visit_time', fiveMinutesAgo)
      .single();

    if (existingVisit) {
      return { canVisit: false, reason: 'You are already visiting this home' };
    }

    return { canVisit: true };
  }

  // Helper method to map database record to TypeScript type
  private static mapToHomeVisitor(data: any): HomeVisitor {
    return {
      id: data.id,
      homeId: data.home_id,
      visitorId: data.visitor_id,
      visitStartTime: data.visit_time,
      visitEndTime: null,
      durationSeconds: data.duration || 0,
      isOnline: true,
      rating: undefined,
      comment: undefined,
      createdAt: data.visit_time,
    };
  }
}