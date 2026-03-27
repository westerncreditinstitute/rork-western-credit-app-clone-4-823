import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  InvestmentPoolData,
  PoolContributionData,
  BusinessOperationResult,
} from '@/types/business';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

export class InvestmentPoolService {
  /**
   * Get open investment pools
   */
  static async getOpenPools(): Promise<InvestmentPoolData[]> {
    try {
      if (!isSupabaseConfigured) {
        console.log('[InvestmentPoolService] Supabase not configured, returning empty pools');
        return [];
      }

      const { data, error } = await supabase
        .from('investment_pool')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[InvestmentPoolService] Error fetching open pools:', error.message || JSON.stringify(error));
        return [];
      }

      return (data || []) as InvestmentPoolData[];
    } catch (error: any) {
      console.error('[InvestmentPoolService] Exception in getOpenPools:', error?.message || error);
      return [];
    }
  }

  /**
   * Get pools by business ID
   */
  static async getPoolsByBusiness(businessId: string): Promise<InvestmentPoolData[]> {
    try {
      if (!isSupabaseConfigured) {
        console.log('[InvestmentPoolService] Supabase not configured, returning empty pools');
        return [];
      }

      const { data, error } = await supabase
        .from('investment_pool')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[InvestmentPoolService] Error fetching business pools:', error.message || JSON.stringify(error));
        return [];
      }

      return (data || []) as InvestmentPoolData[];
    } catch (error: any) {
      console.error('[InvestmentPoolService] Exception in getPoolsByBusiness:', error?.message || error);
      return [];
    }
  }

  /**
   * Get user's contributions
   */
  static async getUserContributions(userId: string): Promise<PoolContributionData[]> {
    try {
      if (!isSupabaseConfigured) {
        console.log('[InvestmentPoolService] Supabase not configured, returning empty contributions');
        return [];
      }

      if (!isValidUUID(userId)) {
        console.log('[InvestmentPoolService] Skipping database query for non-UUID user:', userId);
        return [];
      }

      const { data, error } = await supabase
        .from('pool_contributions')
        .select('*')
        .eq('investor_user_id', userId)
        .order('contribution_date', { ascending: false });

      if (error) {
        console.error('[InvestmentPoolService] Error fetching contributions:', error.message || JSON.stringify(error));
        return [];
      }

      return (data || []) as PoolContributionData[];
    } catch (error: any) {
      console.error('[InvestmentPoolService] Exception in getUserContributions:', error?.message || error);
      return [];
    }
  }

  /**
   * Create investment pool
   */
  static async createPool(
    poolData: Partial<InvestmentPoolData>
  ): Promise<BusinessOperationResult<InvestmentPoolData>> {
    try {
      if (!isSupabaseConfigured) {
        return { success: false, error: 'Database not configured', errorCode: 'DATABASE_ERROR' };
      }

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('investment_pool')
        .insert({
          business_id: poolData.businessId || '',
          pool_name: poolData.poolName || 'Investment Pool',
          funding_goal: poolData.fundingGoal || 0,
          current_amount: 0,
          min_investment: poolData.minInvestment || 500,
          max_investors: poolData.maxInvestors || 10,
          current_investor_count: 0,
          expected_roi_percentage: poolData.expectedRoiPercentage || 15,
          estimated_break_even_months: poolData.estimatedBreakEvenMonths || 12,
          risk_level: poolData.riskLevel || 'medium',
          description: poolData.description || '',
          business_plan: poolData.businessPlan || '',
          financial_projections: poolData.financialProjections || '{}',
          status: 'open',
          deadline: poolData.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error('[InvestmentPoolService] Error creating pool:', error);
        return {
          success: false,
          error: 'Failed to create investment pool',
          errorCode: 'DATABASE_ERROR',
        };
      }

      console.log('[InvestmentPoolService] Pool created successfully:', data.id);
      return {
        success: true,
        data: data as InvestmentPoolData,
      };
    } catch (error) {
      console.error('[InvestmentPoolService] Exception in createPool:', error);
      return {
        success: false,
        error: 'Failed to create investment pool',
        errorCode: 'EXCEPTION',
      };
    }
  }

  /**
   * Contribute to investment pool
   */
  static async contributeToPool(
    poolId: string,
    userId: string,
    amount: number
  ): Promise<BusinessOperationResult<PoolContributionData>> {
    try {
      if (!isSupabaseConfigured) {
        return { success: false, error: 'Database not configured', errorCode: 'DATABASE_ERROR' };
      }

      // Get pool details
      const { data: pool, error: poolError } = await supabase
        .from('investment_pool')
        .select('*')
        .eq('id', poolId)
        .single();

      if (poolError || !pool) {
        return {
          success: false,
          error: 'Investment pool not found',
          errorCode: 'POOL_NOT_FOUND',
        };
      }

      // Validate contribution
      if (amount < (pool.min_investment || 0)) {
        return {
          success: false,
          error: `Minimum investment is $${pool.min_investment}`,
          errorCode: 'BELOW_MINIMUM_INVESTMENT',
        };
      }

      if ((pool.current_investor_count || 0) >= (pool.max_investors || 10)) {
        return {
          success: false,
          error: 'Maximum investors reached',
          errorCode: 'MAX_INVESTORS_REACHED',
        };
      }

      if ((pool.current_amount || 0) + amount > (pool.funding_goal || 0)) {
        return {
          success: false,
          error: 'Funding goal reached',
          errorCode: 'FUNDING_GOAL_REACHED',
        };
      }

      const now = new Date().toISOString();
      const ownershipPercentage = (amount / pool.funding_goal) * 100;

      // Create contribution
      const { data: contribution, error: contributionError } = await supabase
        .from('pool_contributions')
        .insert({
          pool_id: poolId,
          investor_user_id: userId,
          contribution_amount: amount,
          ownership_percentage: ownershipPercentage,
          contribution_date: now,
          total_return_received: 0,
          status: 'active',
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (contributionError) {
        console.error('[InvestmentPoolService] Error creating contribution:', contributionError);
        return {
          success: false,
          error: 'Failed to process contribution',
          errorCode: 'DATABASE_ERROR',
        };
      }

      // Update pool
      await supabase
        .from('investment_pool')
        .update({
          current_amount: (pool.current_amount || 0) + amount,
          current_investor_count: (pool.current_investor_count || 0) + 1,
          updated_at: now,
        })
        .eq('id', poolId);

      // Check if pool is fully funded
      if ((pool.current_amount || 0) + amount >= (pool.funding_goal || 0)) {
        await supabase
          .from('investment_pool')
          .update({
            status: 'funded',
            updated_at: now,
          })
          .eq('id', poolId);
      }

      console.log('[InvestmentPoolService] Contribution successful:', {
        poolId,
        userId,
        amount,
        ownershipPercentage,
      });

      return {
        success: true,
        data: contribution as PoolContributionData,
      };
    } catch (error) {
      console.error('[InvestmentPoolService] Exception in contributeToPool:', error);
      return {
        success: false,
        error: 'Failed to process contribution',
        errorCode: 'EXCEPTION',
      };
    }
  }

  /**
   * Get pool details with contributions
   */
  static async getPoolDetails(poolId: string): Promise<InvestmentPoolData | null> {
    try {
      if (!isSupabaseConfigured) {
        console.log('[InvestmentPoolService] Supabase not configured, returning null');
        return null;
      }

      const { data, error } = await supabase
        .from('investment_pool')
        .select(`
          *,
          pool_contributions (
            id,
            investor_user_id,
            contribution_amount,
            ownership_percentage,
            contribution_date,
            status
          )
        `)
        .eq('id', poolId)
        .single();

      if (error) {
        console.error('[InvestmentPoolService] Error fetching pool details:', error);
        return null;
      }

      return data as any;
    } catch (error) {
      console.error('[InvestmentPoolService] Exception in getPoolDetails:', error);
      return null;
    }
  }

  /**
   * Close pool (no longer accepting investments)
   */
  static async closePool(poolId: string): Promise<boolean> {
    try {
      if (!isSupabaseConfigured) return false;

      const { error } = await supabase
        .from('investment_pool')
        .update({
          status: 'closed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', poolId);

      if (error) {
        console.error('[InvestmentPoolService] Error closing pool:', error);
        return false;
      }

      console.log('[InvestmentPoolService] Pool closed successfully:', poolId);
      return true;
    } catch (error) {
      console.error('[InvestmentPoolService] Exception in closePool:', error);
      return false;
    }
  }

  /**
   * Distribute returns to investors
   */
  static async distributeReturns(
    poolId: string,
    totalReturnAmount: number
  ): Promise<boolean> {
    try {
      if (!isSupabaseConfigured) return false;

      // Get all active contributions
      const { data: contributions, error } = await supabase
        .from('pool_contributions')
        .select('*')
        .eq('pool_id', poolId)
        .eq('status', 'active');

      if (error || !contributions) {
        console.error('[InvestmentPoolService] Error fetching contributions:', error);
        return false;
      }

      // Calculate each investor's share
      const totalInvested = contributions.reduce((sum, c) => sum + (c.contribution_amount || 0), 0);

      for (const contribution of contributions) {
        const share = (contribution.contribution_amount / totalInvested) * totalReturnAmount;
        
        await supabase
          .from('pool_contributions')
          .update({
            total_return_received: (contribution.total_return_received || 0) + share,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contribution.id);
      }

      console.log('[InvestmentPoolService] Returns distributed:', {
        poolId,
        totalReturnAmount,
        investorCount: contributions.length,
      });

      return true;
    } catch (error) {
      console.error('[InvestmentPoolService] Exception in distributeReturns:', error);
      return false;
    }
  }
}