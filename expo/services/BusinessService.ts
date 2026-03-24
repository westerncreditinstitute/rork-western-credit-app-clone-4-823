import { supabase } from '@/lib/supabase';
import {
  BusinessCategoryData,
  UserBusinessData,
  BusinessStartupRequest,
  BusinessOperationResult,
} from '@/types/business';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

export class BusinessService {
  /**
   * Get user's businesses
   */
  static async getUserBusinesses(userId: string): Promise<UserBusinessData[]> {
    try {
      if (!isValidUUID(userId)) {
        console.log('[BusinessService] Skipping database query for non-UUID user:', userId);
        return [];
      }

      const { data, error } = await supabase
        .from('user_businesses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[BusinessService] Error fetching user businesses:', error?.message || JSON.stringify(error));
        return [];
      }

      return data as UserBusinessData[];
    } catch (error) {
      console.error('[BusinessService] Exception in getUserBusinesses:', error);
      return [];
    }
  }

  /**
   * Get business by ID
   */
  static async getBusinessById(businessId: string): Promise<UserBusinessData | null> {
    try {
      const { data, error } = await supabase
        .from('user_businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error) {
        console.error('[BusinessService] Error fetching business:', error);
        return null;
      }

      return data as UserBusinessData;
    } catch (error) {
      console.error('[BusinessService] Exception in getBusinessById:', error);
      return null;
    }
  }

  /**
   * Create a new business
   */
  static async createBusiness(
    request: BusinessStartupRequest,
    categoryData: BusinessCategoryData
  ): Promise<BusinessOperationResult<UserBusinessData>> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('user_businesses')
        .insert({
          user_id: request.userId,
          business_name: request.businessName,
          category_id: request.categoryId,
          business_type: categoryData.name,
          startup_cost: request.startupCost,
          current_funding: request.usePersonalFunds ? request.startupCost : 0,
          funding_goal: request.fundingGoal || request.startupCost,
          total_startup_cost: request.startupCost,
          ownership_percentage: 100,
          monthly_revenue: 0,
          monthly_expenses: 0,
          monthly_profit: 0,
          business_stage: request.usePersonalFunds ? 'operational' : 'funding',
          employee_count: 0,
          credit_score_impact: 0,
          reputation_score: 50,
          location: request.location || 'Unknown',
          founded_at: now,
          operational_date: request.usePersonalFunds ? now : null,
          last_profit_update: null,
          is_active: true,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error('[BusinessService] Error creating business:', error);
        return {
          success: false,
          error: 'Failed to create business',
          errorCode: 'DATABASE_ERROR',
        };
      }

      console.log('[BusinessService] Business created successfully:', data.id);
      return {
        success: true,
        data: data as UserBusinessData,
      };
    } catch (error) {
      console.error('[BusinessService] Exception in createBusiness:', error);
      return {
        success: false,
        error: 'Failed to create business',
        errorCode: 'EXCEPTION',
      };
    }
  }

  /**
   * Update business
   */
  static async updateBusiness(
    businessId: string,
    userId: string,
    updates: Partial<UserBusinessData>
  ): Promise<BusinessOperationResult<UserBusinessData>> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Map camelCase to snake_case for database
      if (updates.monthlyRevenue !== undefined) updateData.monthly_revenue = updates.monthlyRevenue;
      if (updates.monthlyExpenses !== undefined) updateData.monthly_expenses = updates.monthlyExpenses;
      if (updates.monthlyProfit !== undefined) updateData.monthly_profit = updates.monthlyProfit;
      if (updates.employeeCount !== undefined) updateData.employee_count = updates.employeeCount;
      if (updates.reputationScore !== undefined) updateData.reputation_score = updates.reputationScore;
      if (updates.creditScoreImpact !== undefined) updateData.credit_score_impact = updates.creditScoreImpact;
      if (updates.businessStage !== undefined) updateData.business_stage = updates.businessStage;
      if (updates.currentFunding !== undefined) updateData.current_funding = updates.currentFunding;

      const { data, error } = await supabase
        .from('user_businesses')
        .update(updateData)
        .eq('id', businessId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('[BusinessService] Error updating business:', error);
        return {
          success: false,
          error: 'Failed to update business',
          errorCode: 'DATABASE_ERROR',
        };
      }

      return {
        success: true,
        data: data as UserBusinessData,
      };
    } catch (error) {
      console.error('[BusinessService] Exception in updateBusiness:', error);
      return {
        success: false,
        error: 'Failed to update business',
        errorCode: 'EXCEPTION',
      };
    }
  }

  /**
   * Delete business (soft delete)
   */
  static async deleteBusiness(businessId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_businesses')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', businessId)
        .eq('user_id', userId);

      if (error) {
        console.error('[BusinessService] Error deleting business:', error);
        return false;
      }

      console.log('[BusinessService] Business deleted successfully:', businessId);
      return true;
    } catch (error) {
      console.error('[BusinessService] Exception in deleteBusiness:', error);
      return false;
    }
  }

  /**
   * Process monthly business cycle (revenue, expenses, profit)
   */
  static async processMonthlyCycle(businessId: string): Promise<boolean> {
    try {
      const business = await this.getBusinessById(businessId);
      if (!business) return false;

      // Calculate monthly profit based on category
      const categoryAvgRevenue = business.categoryData?.avgMonthlyRevenue || 5000;
      const variation = 0.8 + Math.random() * 0.4; // 80%-120% variation
      
      const revenue = Math.round(categoryAvgRevenue * variation);
      const expenses = Math.round(revenue * 0.6); // 60% of revenue
      const profit = revenue - expenses;

      // Update business
      await this.updateBusiness(businessId, business.userId, {
        monthlyRevenue: revenue,
        monthlyExpenses: expenses,
        monthlyProfit: profit,
        lastProfitUpdate: new Date().toISOString(),
      });

      // Record business event
      await supabase.from('business_events').insert({
        business_id: businessId,
        event_type: profit > 0 ? 'profit' : 'loss',
        event_details: {
          revenue,
          expenses,
          profit,
        },
        created_at: new Date().toISOString(),
      });

      console.log('[BusinessService] Monthly cycle processed:', {
        businessId,
        revenue,
        expenses,
        profit,
      });

      return true;
    } catch (error) {
      console.error('[BusinessService] Exception in processMonthlyCycle:', error);
      return false;
    }
  }

  /**
   * Get business statistics
   */
  static async getBusinessStats(userId: string): Promise<{
    totalBusinesses: number;
    totalRevenue: number;
    totalExpenses: number;
    totalProfit: number;
    activeBusinesses: number;
  }> {
    try {
      const businesses = await this.getUserBusinesses(userId);
      
      const totalRevenue = businesses.reduce((sum, b) => sum + (b.monthlyRevenue || 0), 0);
      const totalExpenses = businesses.reduce((sum, b) => sum + (b.monthlyExpenses || 0), 0);
      const totalProfit = businesses.reduce((sum, b) => sum + (b.monthlyProfit || 0), 0);
      const activeBusinesses = businesses.filter(b => b.businessStage === 'operational').length;

      return {
        totalBusinesses: businesses.length,
        totalRevenue,
        totalExpenses,
        totalProfit,
        activeBusinesses,
      };
    } catch (error) {
      console.error('[BusinessService] Exception in getBusinessStats:', error);
      return {
        totalBusinesses: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        totalProfit: 0,
        activeBusinesses: 0,
      };
    }
  }
}