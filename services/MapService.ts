// MapService - Core functionality for the interactive map system

import { supabase } from '../lib/supabase';
import {
  City,
  Property,
  PropertyCluster,
  MapBounds,
  PropertyFilter,
  MapStats,
} from '../types/map';

export class MapService {
  /**
   * Get all active cities
   */
  static async getCities(): Promise<City[]> {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name');

      if (error) {
        console.error('[MapService] Error fetching cities:', error.message);
        throw new Error(`Failed to fetch cities: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('[MapService] Error in getCities:', error);
      throw error;
    }
  }

  /**
   * Get city by ID
   */
  static async getCity(cityId: string): Promise<City | null> {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('id', cityId)
        .single();

      if (error) {
        console.error('[MapService] Error fetching city:', error.message);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[MapService] Error in getCity:', error);
      return null;
    }
  }

  /**
   * Get properties for a city with optional filters
   */
  static async getCityProperties(
    cityId: string,
    filters?: PropertyFilter
  ): Promise<Property[]> {
    try {
      let query = supabase
        .from('properties')
        .select('*')
        .eq('city_id', cityId);

      // Apply filters
      if (filters?.propertyTypeId) {
        query = query.eq('property_type_id', filters.propertyTypeId);
      }

      if (filters?.saleStatus) {
        query = query.eq('sale_status', filters.saleStatus);
      }

      if (filters?.featuredOnly) {
        query = query.eq('is_featured', true);
      }

      if (filters?.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice);
      }

      if (filters?.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice);
      }

      if (filters?.minRating !== undefined) {
        query = query.gte('rating', filters.minRating);
      }

      if (filters?.searchQuery) {
        query = query.or(`title.ilike.%${filters.searchQuery}%,address.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
      }

      const { data, error } = await query
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[MapService] Error fetching properties:', error.message);
        throw new Error(`Failed to fetch properties: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('[MapService] Error in getCityProperties:', error);
      throw error;
    }
  }

  /**
   * Get properties within map bounds
   */
  static async getPropertiesInBounds(
    bounds: MapBounds,
    filters?: PropertyFilter
  ): Promise<Property[]> {
    try {
      const { data, error } = await supabase.rpc('find_properties_in_bounds', {
        bounds_north: bounds.north,
        bounds_south: bounds.south,
        bounds_east: bounds.east,
        bounds_west: bounds.west,
        p_city_id: filters?.cityId || null,
        p_type_id: filters?.propertyTypeId || null,
        p_status: filters?.saleStatus || null,
      });

      if (error) {
        console.error('[MapService] Error fetching properties in bounds:', error.message);
        throw new Error(`Failed to fetch properties in bounds: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('[MapService] Error in getPropertiesInBounds:', error);
      throw error;
    }
  }

  /**
   * Get property by ID
   */
  static async getProperty(propertyId: string): Promise<Property | null> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          cities (
            name,
            state
          ),
          property_types (
            name,
            category,
            icon,
            color
          )
        `)
        .eq('id', propertyId)
        .single();

      if (error) {
        console.error('[MapService] Error fetching property:', error.message);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[MapService] Error in getProperty:', error);
      return null;
    }
  }

  /**
   * Search properties by location (within radius)
   */
  static async searchNearbyProperties(
    lat: number,
    lng: number,
    radiusMeters: number,
    filters?: PropertyFilter
  ): Promise<Property[]> {
    try {
      const { data, error } = await supabase.rpc('find_properties_within_radius', {
        p_lat: lat,
        p_lng: lng,
        radius_meters: radiusMeters,
        p_city_id: filters?.cityId || null,
        p_type_id: filters?.propertyTypeId || null,
        p_status: filters?.saleStatus || null,
      });

      if (error) {
        console.error('[MapService] Error searching nearby properties:', error.message);
        throw new Error(`Failed to search nearby properties: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('[MapService] Error in searchNearbyProperties:', error);
      throw error;
    }
  }

  /**
   * Get property clusters for a city
   */
  static async getPropertyClusters(cityId: string): Promise<PropertyCluster[]> {
    try {
      const { data, error } = await supabase
        .from('property_clusters')
        .select('*')
        .eq('city_id', cityId)
        .order('property_count', { ascending: false });

      if (error) {
        console.error('[MapService] Error fetching clusters:', error.message);
        throw new Error(`Failed to fetch clusters: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('[MapService] Error in getPropertyClusters:', error);
      throw error;
    }
  }

  /**
   * Get map statistics
   */
  static async getMapStats(cityId?: string): Promise<MapStats> {
    try {
      let query = supabase
        .from('properties')
        .select('sale_status');

      if (cityId) {
        query = query.eq('city_id', cityId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[MapService] Error fetching stats:', error.message);
        throw new Error(`Failed to fetch stats: ${error.message}`);
      }

      const properties = data || [];
      
      return {
        totalProperties: properties.length,
        availableProperties: properties.filter(p => p.sale_status === 'available').length,
        soldProperties: properties.filter(p => p.sale_status === 'sold').length,
        favoriteProperties: 0, // Will be populated from favorites table
        visitedProperties: 0, // Will be populated from visits table
      };
    } catch (error) {
      console.error('[MapService] Error in getMapStats:', error);
      throw error;
    }
  }

  /**
   * Create a new property
   */
  static async createProperty(property: Partial<Property>): Promise<Property> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .insert({
          ...property,
          sale_status: property.sale_status || 'available',
        })
        .select()
        .single();

      if (error) {
        console.error('[MapService] Error creating property:', error.message);
        throw new Error(`Failed to create property: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('[MapService] Error in createProperty:', error);
      throw error;
    }
  }

  /**
   * Update property sale status
   */
  static async updatePropertyStatus(
    propertyId: string,
    status: Property['sale_status']
  ): Promise<Property> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .update({ sale_status: status })
        .eq('id', propertyId)
        .select()
        .single();

      if (error) {
        console.error('[MapService] Error updating property status:', error.message);
        throw new Error(`Failed to update property status: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('[MapService] Error in updatePropertyStatus:', error);
      throw error;
    }
  }

  /**
   * Bulk update property status
   */
  static async bulkUpdateStatus(
    propertyIds: string[],
    status: Property['sale_status']
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ sale_status: status })
        .in('id', propertyIds);

      if (error) {
        console.error('[MapService] Error bulk updating status:', error.message);
        throw new Error(`Failed to bulk update status: ${error.message}`);
      }
    } catch (error) {
      console.error('[MapService] Error in bulkUpdateStatus:', error);
      throw error;
    }
  }
}