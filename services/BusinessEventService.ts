import { supabase } from '@/lib/supabase';
import { BusinessEventData, BusinessEventType, ImpactType } from '@/types/business';

export interface CreateEventInput {
  business_id: string;
  event_type: BusinessEventType;
  event_title: string;
  event_description: string;
  impact_type: ImpactType;
  revenue_impact: number;
  expense_impact: number;
  reputation_impact: number;
  employee_impact: number;
  duration_days?: number;
}

export interface BusinessActivityLog {
  id: string;
  userId: string;
  businessId: string | null;
  activityType: string;
  activityDetails: Record<string, any>;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  createdAt: string;
}

export class BusinessEventService {
  static async createEvent(input: CreateEventInput): Promise<BusinessEventData | null> {
    try {
      console.log('[BusinessEventService] Creating event:', input.event_title);
      const now = new Date();
      const endDate = input.duration_days 
        ? new Date(now.getTime() + input.duration_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('business_events')
        .insert({
          business_id: input.business_id,
          event_type: input.event_type,
          event_title: input.event_title,
          event_description: input.event_description,
          impact_type: input.impact_type,
          revenue_impact: input.revenue_impact,
          expense_impact: input.expense_impact,
          reputation_impact: input.reputation_impact,
          employee_impact: input.employee_impact,
          is_active: true,
          event_start_date: now.toISOString(),
          event_end_date: endDate,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('[BusinessEventService] Error creating event:', error);
        return null;
      }

      console.log('[BusinessEventService] Event created:', data.id);
      return this.mapDatabaseToEventData(data);
    } catch (error) {
      console.error('[BusinessEventService] Exception in createEvent:', error);
      return null;
    }
  }

  static async getActiveEvents(businessId: string): Promise<BusinessEventData[]> {
    try {
      console.log('[BusinessEventService] Fetching active events for business:', businessId);
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('business_events')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .or(`event_end_date.is.null,event_end_date.gt.${now}`)
        .order('event_start_date', { ascending: false });

      if (error) {
        console.error('[BusinessEventService] Error fetching events:', error);
        return [];
      }

      return (data || []).map(this.mapDatabaseToEventData);
    } catch (error) {
      console.error('[BusinessEventService] Exception in getActiveEvents:', error);
      return [];
    }
  }

  static async getEventHistory(businessId: string, limit: number = 50): Promise<BusinessEventData[]> {
    try {
      console.log('[BusinessEventService] Fetching event history for business:', businessId);

      const { data, error } = await supabase
        .from('business_events')
        .select('*')
        .eq('business_id', businessId)
        .order('event_start_date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[BusinessEventService] Error fetching event history:', error);
        return [];
      }

      return (data || []).map(this.mapDatabaseToEventData);
    } catch (error) {
      console.error('[BusinessEventService] Exception in getEventHistory:', error);
      return [];
    }
  }

  static async deactivateEvent(eventId: string): Promise<boolean> {
    try {
      console.log('[BusinessEventService] Deactivating event:', eventId);

      const { error } = await supabase
        .from('business_events')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', eventId);

      if (error) {
        console.error('[BusinessEventService] Error deactivating event:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[BusinessEventService] Exception in deactivateEvent:', error);
      return false;
    }
  }

  static async logActivity(
    userId: string,
    businessId: string | null,
    activityType: string,
    activityDetails: Record<string, any>,
    oldValue?: Record<string, any>,
    newValue?: Record<string, any>
  ): Promise<BusinessActivityLog | null> {
    try {
      console.log('[BusinessEventService] Logging activity:', activityType);

      const { data, error } = await supabase
        .from('business_activity_log')
        .insert({
          user_id: userId,
          business_id: businessId,
          activity_type: activityType,
          activity_details: activityDetails,
          old_value: oldValue || null,
          new_value: newValue || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('[BusinessEventService] Error logging activity:', error);
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        businessId: data.business_id,
        activityType: data.activity_type,
        activityDetails: data.activity_details,
        oldValue: data.old_value,
        newValue: data.new_value,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('[BusinessEventService] Exception in logActivity:', error);
      return null;
    }
  }

  static async getActivityLog(userId: string, limit: number = 50): Promise<BusinessActivityLog[]> {
    try {
      console.log('[BusinessEventService] Fetching activity log for user:', userId);

      const { data, error } = await supabase
        .from('business_activity_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[BusinessEventService] Error fetching activity log:', error);
        return [];
      }

      return (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        businessId: item.business_id,
        activityType: item.activity_type,
        activityDetails: item.activity_details,
        oldValue: item.old_value,
        newValue: item.new_value,
        createdAt: item.created_at,
      }));
    } catch (error) {
      console.error('[BusinessEventService] Exception in getActivityLog:', error);
      return [];
    }
  }

  static generateRandomEvent(businessId: string): CreateEventInput | null {
    const eventTemplates: CreateEventInput[] = [
      {
        business_id: businessId,
        event_type: 'market_shift',
        event_title: 'Market Demand Surge',
        event_description: 'Increased demand in your market sector has boosted sales.',
        impact_type: 'positive',
        revenue_impact: 15,
        expense_impact: 0,
        reputation_impact: 5,
        employee_impact: 0,
        duration_days: 30,
      },
      {
        business_id: businessId,
        event_type: 'competitor_entry',
        event_title: 'New Competitor',
        event_description: 'A new competitor has entered your market, increasing competition.',
        impact_type: 'negative',
        revenue_impact: -10,
        expense_impact: 5,
        reputation_impact: -3,
        employee_impact: 0,
        duration_days: 60,
      },
      {
        business_id: businessId,
        event_type: 'customer_spike',
        event_title: 'Viral Marketing Success',
        event_description: 'Your business gained unexpected attention, bringing in new customers.',
        impact_type: 'positive',
        revenue_impact: 25,
        expense_impact: 5,
        reputation_impact: 10,
        employee_impact: 0,
        duration_days: 14,
      },
      {
        business_id: businessId,
        event_type: 'supply_chain_issue',
        event_title: 'Supply Chain Disruption',
        event_description: 'Supply chain issues have increased costs temporarily.',
        impact_type: 'negative',
        revenue_impact: -5,
        expense_impact: 15,
        reputation_impact: -2,
        employee_impact: 0,
        duration_days: 21,
      },
      {
        business_id: businessId,
        event_type: 'regulatory_change',
        event_title: 'New Industry Regulations',
        event_description: 'New regulations require compliance updates.',
        impact_type: 'negative',
        revenue_impact: 0,
        expense_impact: 10,
        reputation_impact: 0,
        employee_impact: 0,
        duration_days: 90,
      },
      {
        business_id: businessId,
        event_type: 'economic_cycle',
        event_title: 'Economic Upturn',
        event_description: 'Favorable economic conditions are boosting consumer spending.',
        impact_type: 'positive',
        revenue_impact: 12,
        expense_impact: 0,
        reputation_impact: 3,
        employee_impact: 0,
        duration_days: 45,
      },
    ];

    if (Math.random() > 0.3) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * eventTemplates.length);
    return eventTemplates[randomIndex];
  }

  private static mapDatabaseToEventData(data: any): BusinessEventData {
    return {
      id: data.id,
      businessId: data.business_id,
      eventType: data.event_type,
      eventTitle: data.event_title,
      eventDescription: data.event_description,
      impactType: data.impact_type,
      revenueImpact: data.revenue_impact,
      expenseImpact: data.expense_impact,
      reputationImpact: data.reputation_impact,
      employeeImpact: data.employee_impact,
      isActive: data.is_active,
      eventStartDate: data.event_start_date,
      eventEndDate: data.event_end_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
