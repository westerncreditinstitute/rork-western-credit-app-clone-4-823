import { supabase } from '@/lib/supabase';
import {
  BudgetActivityLog,
  BudgetActivityPayload,
} from '@/types/budget';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

function isDemoUser(userId: string): boolean {
  return userId.startsWith('demo-') || !isValidUUID(userId);
}

export class BudgetActivityService {
  /**
   * Log a budget activity
   */
  static async logActivity(
    userId: string,
    payload: BudgetActivityPayload
  ): Promise<BudgetActivityLog | null> {
    try {
      if (isDemoUser(userId)) {
        console.log('[BudgetActivityService] Demo user detected, returning local activity log');
        return {
          id: `local-activity-${Date.now()}`,
          user_id: userId,
          budget_id: payload.budget_id || null,
          activity_type: payload.activity_type,
          activity_details: payload.activity_details || {},
          old_value: payload.old_value || null,
          new_value: payload.new_value || null,
          ip_address: null,
          user_agent: null,
          created_at: new Date().toISOString(),
        } as BudgetActivityLog;
      }

      const { data, error } = await supabase
        .from('budget_activity_log')
        .insert({
          user_id: userId,
          budget_id: payload.budget_id || null,
          activity_type: payload.activity_type,
          activity_details: payload.activity_details || {},
          old_value: payload.old_value || null,
          new_value: payload.new_value || null,
          ip_address: null, // Can be added if needed
          user_agent: null, // Can be added if needed
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('[BudgetActivityService] Error logging activity:', error.message || JSON.stringify(error));
        return null;
      }

      return data as BudgetActivityLog;
    } catch (error) {
      console.error('[BudgetActivityService] Exception in logActivity:', error);
      return null;
    }
  }

  /**
   * Get user's activity log
   */
  static async getActivityLog(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<BudgetActivityLog[]> {
    try {
      if (isDemoUser(userId)) {
        console.log('[BudgetActivityService] Demo user detected, returning empty activity log');
        return [];
      }

      const { data, error } = await supabase
        .from('budget_activity_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('[BudgetActivityService] Error fetching activity log:', error.message || JSON.stringify(error));
        return [];
      }

      return data as BudgetActivityLog[];
    } catch (error) {
      console.error('[BudgetActivityService] Exception in getActivityLog:', error);
      return [];
    }
  }

  /**
   * Get activity log by budget ID
   */
  static async getBudgetActivityLog(
    budgetId: string,
    limit: number = 50
  ): Promise<BudgetActivityLog[]> {
    try {
      const { data, error } = await supabase
        .from('budget_activity_log')
        .select('*')
        .eq('budget_id', budgetId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[BudgetActivityService] Error fetching budget activity log:', error.message || JSON.stringify(error));
        return [];
      }

      return data as BudgetActivityLog[];
    } catch (error) {
      console.error('[BudgetActivityService] Exception in getBudgetActivityLog:', error);
      return [];
    }
  }

  /**
   * Get activity log by type
   */
  static async getActivityByType(
    userId: string,
    activityType: string,
    limit: number = 50
  ): Promise<BudgetActivityLog[]> {
    try {
      if (isDemoUser(userId)) {
        console.log('[BudgetActivityService] Demo user detected, returning empty activity log');
        return [];
      }

      const { data, error } = await supabase
        .from('budget_activity_log')
        .select('*')
        .eq('user_id', userId)
        .eq('activity_type', activityType)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[BudgetActivityService] Error fetching activity by type:', error.message || JSON.stringify(error));
        return [];
      }

      return data as BudgetActivityLog[];
    } catch (error) {
      console.error('[BudgetActivityService] Exception in getActivityByType:', error);
      return [];
    }
  }

  /**
   * Get recent activity (last N activities)
   */
  static async getRecentActivity(
    userId: string,
    count: number = 10
  ): Promise<BudgetActivityLog[]> {
    return this.getActivityLog(userId, count, 0);
  }

  /**
   * Delete old activity logs (cleanup)
   */
  static async cleanupOldActivity(
    userId: string,
    olderThanDays: number = 90
  ): Promise<number> {
    try {
      if (isDemoUser(userId)) {
        console.log('[BudgetActivityService] Demo user detected, skipping cleanup');
        return 0;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { error } = await supabase
        .from('budget_activity_log')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error('[BudgetActivityService] Error cleaning up old activity:', error.message || JSON.stringify(error));
        return 0;
      }

      console.log('[BudgetActivityService] Cleaned up old activity logs');
      return 1;
    } catch (error) {
      console.error('[BudgetActivityService] Exception in cleanupOldActivity:', error);
      return 0;
    }
  }
}