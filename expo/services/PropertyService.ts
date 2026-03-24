import { supabase } from '@/lib/supabase';

export interface PropertyData {
  id: string;
  propertyId: string;
  city: string;
  propertyType: 'apartment' | 'house' | 'mansion' | 'beach_house';
  address: string;
  latitude: number;
  longitude: number;
  purchasePrice: number;
  baseRentPrice: number;
  currentRentPrice: number | null;
  propertyQuality: number;
  squareFootage: number;
  bedrooms: number;
  bathrooms: number;
  neighborhood: string;
  ownerId: string | null;
  status: 'available' | 'sold' | 'owned' | 'rented';
  totalUnits?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyFilter {
  city?: string;
  propertyType?: string;
  neighborhood?: string;
  minPrice?: number;
  maxPrice?: number;
  minQuality?: number;
  maxQuality?: number;
  status?: string;
}

export interface PurchasePropertyRequest {
  playerId: string;
  propertyId: string;
  purchasePrice: number;
  closingCosts: number;
}

export interface PropertyOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

/**
 * PropertyService - Handles all property-related database operations
 */
export class PropertyService {
  /**
   * Get all properties with optional filtering
   */
  static async getProperties(
    filter?: PropertyFilter,
    limit: number = 100,
    offset: number = 0
  ): Promise<PropertyOperationResult<PropertyData[]>> {
    try {
      let query = supabase
        .from('properties')
        .select('*')
        .range(offset, offset + limit - 1)
        .order('purchase_price', { ascending: true });

      if (filter) {
        if (filter.city) query = query.eq('city', filter.city);
        if (filter.propertyType) query = query.eq('property_type', filter.propertyType);
        if (filter.neighborhood) query = query.ilike('neighborhood', `%${filter.neighborhood}%`);
        if (filter.minPrice) query = query.gte('purchase_price', filter.minPrice);
        if (filter.maxPrice) query = query.lte('purchase_price', filter.maxPrice);
        if (filter.minQuality) query = query.gte('property_quality', filter.minQuality);
        if (filter.maxQuality) query = query.lte('property_quality', filter.maxQuality);
        if (filter.status) query = query.eq('status', filter.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[PropertyService] Error fetching properties:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as PropertyData[] };
    } catch (error) {
      console.error('[PropertyService] Unexpected error:', error);
      return { success: false, error: 'Failed to fetch properties' };
    }
  }

  /**
   * Get a single property by ID
   */
  static async getPropertyById(
    propertyId: string
  ): Promise<PropertyOperationResult<PropertyData>> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('property_id', propertyId)
        .single();

      if (error) {
        console.error('[PropertyService] Error fetching property:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as PropertyData };
    } catch (error) {
      console.error('[PropertyService] Unexpected error:', error);
      return { success: false, error: 'Failed to fetch property' };
    }
  }

  /**
   * Get properties owned by a player
   */
  static async getPlayerProperties(
    playerId: string
  ): Promise<PropertyOperationResult<PropertyData[]>> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', playerId)
        .order('purchase_price', { ascending: false });

      if (error) {
        console.error('[PropertyService] Error fetching player properties:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as PropertyData[] };
    } catch (error) {
      console.error('[PropertyService] Unexpected error:', error);
      return { success: false, error: 'Failed to fetch player properties' };
    }
  }

  /**
   * Get available properties for purchase
   */
  static async getAvailableProperties(
    city?: string,
    limit: number = 50
  ): Promise<PropertyOperationResult<PropertyData[]>> {
    try {
      let query = supabase
        .from('properties')
        .select('*')
        .eq('status', 'available')
        .limit(limit)
        .order('purchase_price', { ascending: true });

      if (city) {
        query = query.eq('city', city);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[PropertyService] Error fetching available properties:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as PropertyData[] };
    } catch (error) {
      console.error('[PropertyService] Unexpected error:', error);
      return { success: false, error: 'Failed to fetch available properties' };
    }
  }

  /**
   * Purchase a property
   */
  static async purchaseProperty(
    request: PurchasePropertyRequest
  ): Promise<PropertyOperationResult<PropertyData>> {
    try {
      // First, check if property is available
      const { data: property, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .eq('property_id', request.propertyId)
        .single();

      if (fetchError || !property) {
        return { success: false, error: 'Property not found' };
      }

      if (property.status !== 'available') {
        return { success: false, error: 'Property is not available for purchase' };
      }

      // Update property status and owner
      const { data, error } = await supabase
        .from('properties')
        .update({
          status: 'owned',
          owner_id: request.playerId,
          current_rent_price: property.base_rent_price,
          updated_at: new Date().toISOString(),
        })
        .eq('property_id', request.propertyId)
        .select()
        .single();

      if (error) {
        console.error('[PropertyService] Error purchasing property:', error);
        return { success: false, error: error.message };
      }

      // Create property owner record
      await supabase.from('property_owners').insert({
        property_id: property.id,
        player_id: request.playerId,
        purchase_price: request.purchasePrice,
        monthly_income: 0,
        is_active: true,
      });

      // Create property history entry
      await supabase.from('property_history').insert({
        property_id: property.id,
        player_id: request.playerId,
        action: 'purchased',
        action_date: new Date().toISOString(),
        details: {
          purchase_price: request.purchasePrice,
          closing_costs: request.closingCosts,
          total_amount: request.purchasePrice + request.closingCosts,
        },
      });

      return { success: true, data: data as PropertyData };
    } catch (error) {
      console.error('[PropertyService] Unexpected error:', error);
      return { success: false, error: 'Failed to purchase property' };
    }
  }

  /**
   * Update property rent price
   */
  static async updatePropertyRent(
    propertyId: string,
    rentPrice: number
  ): Promise<PropertyOperationResult<PropertyData>> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .update({
          current_rent_price: rentPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('property_id', propertyId)
        .select()
        .single();

      if (error) {
        console.error('[PropertyService] Error updating rent:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as PropertyData };
    } catch (error) {
      console.error('[PropertyService] Unexpected error:', error);
      return { success: false, error: 'Failed to update rent' };
    }
  }

  /**
   * Get property statistics for a city
   */
  static async getCityStats(city: string): Promise<
    PropertyOperationResult<{
      totalProperties: number;
      availableProperties: number;
      averagePrice: number;
      averageRent: number;
      propertiesByType: Record<string, number>;
    }>
  > {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('property_type, purchase_price, base_rent_price, status')
        .eq('city', city);

      if (error) {
        console.error('[PropertyService] Error fetching city stats:', error);
        return { success: false, error: error.message };
      }

      const properties = data || [];
      const totalProperties = properties.length;
      const availableProperties = properties.filter(p => p.status === 'available').length;
      const averagePrice = properties.length > 0
        ? properties.reduce((sum, p) => sum + Number(p.purchase_price), 0) / properties.length
        : 0;
      const averageRent = properties.length > 0
        ? properties.reduce((sum, p) => sum + Number(p.base_rent_price), 0) / properties.length
        : 0;

      const propertiesByType: Record<string, number> = {
        apartment: 0,
        house: 0,
        mansion: 0,
        beach_house: 0,
      };

      properties.forEach(p => {
        const type = p.property_type;
        if (propertiesByType[type] !== undefined) {
          propertiesByType[type]++;
        }
      });

      return {
        success: true,
        data: {
          totalProperties,
          availableProperties,
          averagePrice,
          averageRent,
          propertiesByType,
        },
      };
    } catch (error) {
      console.error('[PropertyService] Unexpected error:', error);
      return { success: false, error: 'Failed to fetch city stats' };
    }
  }

  /**
   * Add property to watchlist
   */
  static async addToWatchlist(
    playerId: string,
    propertyId: string,
    notes?: string
  ): Promise<PropertyOperationResult<any>> {
    try {
      const { error } = await supabase.from('property_watchlist').insert({
        player_id: playerId,
        property_id: propertyId,
        notes: notes || null,
      });

      if (error) {
        console.error('[PropertyService] Error adding to watchlist:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('[PropertyService] Unexpected error:', error);
      return { success: false, error: 'Failed to add to watchlist' };
    }
  }

  /**
   * Remove property from watchlist
   */
  static async removeFromWatchlist(
    playerId: string,
    propertyId: string
  ): Promise<PropertyOperationResult<any>> {
    try {
      const { error } = await supabase
        .from('property_watchlist')
        .delete()
        .eq('player_id', playerId)
        .eq('property_id', propertyId);

      if (error) {
        console.error('[PropertyService] Error removing from watchlist:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('[PropertyService] Unexpected error:', error);
      return { success: false, error: 'Failed to remove from watchlist' };
    }
  }

  /**
   * Get player's watchlist
   */
  static async getPlayerWatchlist(
    playerId: string
  ): Promise<PropertyOperationResult<PropertyData[]>> {
    try {
      const { data, error } = await supabase
        .from('property_watchlist')
        .select(`
          properties (*)
        `)
        .eq('player_id', playerId);

      if (error) {
        console.error('[PropertyService] Error fetching watchlist:', error);
        return { success: false, error: error.message };
      }

      const properties = data
        ?.map((item: any) => item.properties)
        .filter(Boolean) || [];

      return { success: true, data: properties as PropertyData[] };
    } catch (error) {
      console.error('[PropertyService] Unexpected error:', error);
      return { success: false, error: 'Failed to fetch watchlist' };
    }
  }
}