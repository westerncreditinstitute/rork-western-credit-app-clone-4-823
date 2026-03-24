import { supabase } from '@/lib/supabase';

export interface RentalIncomeData {
  id: string;
  propertyId: string;
  playerId: string;
  rentAmount: number;
  month: number;
  year: number;
  occupancyRate: number;
  collectedAmount: number;
  collectionDate: string;
}

export interface RentalCollectionResult {
  success: boolean;
  totalCollected: number;
  propertyCount: number;
  details: Array<{
    propertyId: string;
    rentAmount: number;
    collectedAmount: number;
    occupancyRate: number;
  }>;
  error?: string;
}

/**
 * RentalIncomeService - Handles rental income collection and tracking
 */
export class RentalIncomeService {
  /**
   * Collect rent for a specific property
   */
  static async collectRentForProperty(
    propertyId: string,
    playerId: string,
    rentAmount: number,
    month: number,
    year: number
  ): Promise<{ success: boolean; collectedAmount: number; error?: string }> {
    try {
      // Calculate occupancy rate (90-98% random for simulation)
      const occupancyRate = 0.90 + Math.random() * 0.08;
      const collectedAmount = rentAmount * occupancyRate;

      // Record the rental income
      const { error } = await supabase.from('rental_income').insert({
        property_id: propertyId,
        player_id: playerId,
        rent_amount: rentAmount,
        month,
        year,
        occupancy_rate: Math.round(occupancyRate * 100),
        collected_amount: Math.round(collectedAmount),
        collection_date: new Date().toISOString(),
      });

      if (error) {
        console.error('[RentalIncomeService] Error collecting rent:', error);
        return { success: false, collectedAmount: 0, error: error.message };
      }

      return { success: true, collectedAmount: Math.round(collectedAmount) };
    } catch (error) {
      console.error('[RentalIncomeService] Unexpected error:', error);
      return { success: false, collectedAmount: 0, error: 'Failed to collect rent' };
    }
  }

  /**
   * Collect rent for all properties owned by a player
   */
  static async collectRentForAllProperties(
    playerId: string
  ): Promise<RentalCollectionResult> {
    try {
      const now = new Date();
      const month = now.getMonth() + 1; // 1-12
      const year = now.getFullYear();

      // Get all properties owned by the player
      const { data: properties, error: fetchError } = await supabase
        .from('properties')
        .select('id, property_id, current_rent_price, base_rent_price')
        .eq('owner_id', playerId)
        .eq('status', 'owned');

      if (fetchError || !properties) {
        return {
          success: false,
          totalCollected: 0,
          propertyCount: 0,
          details: [],
          error: 'Failed to fetch player properties',
        };
      }

      const results = [];
      let totalCollected = 0;

      // Collect rent for each property
      for (const property of properties) {
        const rentAmount = property.current_rent_price || property.base_rent_price;
        
        // Check if rent already collected this month
        const { data: existing } = await supabase
          .from('rental_income')
          .select('id')
          .eq('property_id', property.id)
          .eq('month', month)
          .eq('year', year)
          .single();

        if (existing) {
          // Already collected, use previous data
          const { data: incomeData } = await supabase
            .from('rental_income')
            .select('collected_amount, occupancy_rate')
            .eq('property_id', property.id)
            .eq('month', month)
            .eq('year', year)
            .single();

          results.push({
            propertyId: property.property_id,
            rentAmount,
            collectedAmount: incomeData?.collected_amount || 0,
            occupancyRate: incomeData?.occupancy_rate || 0,
          });
          totalCollected += incomeData?.collected_amount || 0;
        } else {
          // Collect rent
          const result = await this.collectRentForProperty(
            property.id,
            playerId,
            rentAmount,
            month,
            year
          );

          if (result.success) {
            const occupancyRate = Math.round((result.collectedAmount / rentAmount) * 100);
            results.push({
              propertyId: property.property_id,
              rentAmount,
              collectedAmount: result.collectedAmount,
              occupancyRate,
            });
            totalCollected += result.collectedAmount;
          }
        }
      }

      return {
        success: true,
        totalCollected,
        propertyCount: results.length,
        details: results,
      };
    } catch (error) {
      console.error('[RentalIncomeService] Unexpected error:', error);
      return {
        success: false,
        totalCollected: 0,
        propertyCount: 0,
        details: [],
        error: 'Failed to collect rent for all properties',
      };
    }
  }

  /**
   * Get rental income history for a property
   */
  static async getPropertyRentalHistory(
    propertyId: string,
    limit: number = 12
  ): Promise<{ success: boolean; data?: RentalIncomeData[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('rental_income')
        .select('*')
        .eq('property_id', propertyId)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[RentalIncomeService] Error fetching history:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as RentalIncomeData[] };
    } catch (error) {
      console.error('[RentalIncomeService] Unexpected error:', error);
      return { success: false, error: 'Failed to fetch rental history' };
    }
  }

  /**
   * Get rental income summary for a player
   */
  static async getPlayerRentalSummary(
    playerId: string,
    months: number = 6
  ): Promise<{
    success: boolean;
    data?: {
      totalCollected: number;
      monthlyAverage: number;
      propertyCount: number;
      byMonth: Array<{
        month: number;
        year: number;
        totalCollected: number;
        propertyCount: number;
      }>;
    };
    error?: string;
  }> {
    try {
      const now = new Date();
      const startMonth = now.getMonth() - months + 1;
      const startYear = startMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const actualStartMonth = startMonth < 0 ? 12 + startMonth : startMonth;

      const { data, error } = await supabase
        .from('rental_income')
        .select('month, year, collected_amount')
        .eq('player_id', playerId)
        .gte('year', startYear)
        .order('year', { ascending: true })
        .order('month', { ascending: true });

      if (error) {
        console.error('[RentalIncomeService] Error fetching summary:', error);
        return { success: false, error: error.message };
      }

      const records = data || [];
      const totalCollected = records.reduce((sum, r) => sum + Number(r.collected_amount), 0);
      const monthlyAverage = records.length > 0 ? totalCollected / records.length : 0;

      // Group by month
      const byMonthMap = new Map<string, { month: number; year: number; totalCollected: number; propertyCount: number }>();
      
      records.forEach(record => {
        const key = `${record.year}-${record.month}`;
        const existing = byMonthMap.get(key);
        if (existing) {
          existing.totalCollected += Number(record.collected_amount);
          existing.propertyCount++;
        } else {
          byMonthMap.set(key, {
            month: record.month,
            year: record.year,
            totalCollected: Number(record.collected_amount),
            propertyCount: 1,
          });
        }
      });

      const byMonth = Array.from(byMonthMap.values());

      return {
        success: true,
        data: {
          totalCollected,
          monthlyAverage,
          propertyCount: records.length,
          byMonth,
        },
      };
    } catch (error) {
      console.error('[RentalIncomeService] Unexpected error:', error);
      return { success: false, error: 'Failed to fetch rental summary' };
    }
  }

  /**
   * Calculate projected monthly income for a player
   */
  static async calculateProjectedIncome(
    playerId: string
  ): Promise<{ success: boolean; projectedIncome: number; error?: string }> {
    try {
      const { data: properties, error } = await supabase
        .from('properties')
        .select('current_rent_price, base_rent_price')
        .eq('owner_id', playerId)
        .eq('status', 'owned');

      if (error) {
        return { success: false, projectedIncome: 0, error: error.message };
      }

      const projectedIncome = (properties || []).reduce((sum, property) => {
        const rent = property.current_rent_price || property.base_rent_price;
        // Assume 95% occupancy rate for projection
        return sum + (rent * 0.95);
      }, 0);

      return { success: true, projectedIncome: Math.round(projectedIncome) };
    } catch (error) {
      console.error('[RentalIncomeService] Unexpected error:', error);
      return { success: false, projectedIncome: 0, error: 'Failed to calculate projected income' };
    }
  }
}