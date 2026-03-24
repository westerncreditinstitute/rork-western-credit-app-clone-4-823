// PropertyTypesService - Manage property types and categorization

import { supabase } from '../lib/supabase';
import { PropertyType } from '../types/map';

export class PropertyTypesService {
  /**
   * Get all property types
   */
  static async getPropertyTypes(): Promise<PropertyType[]> {
    try {
      const { data, error } = await supabase
        .from('property_types')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('name');

      if (error) {
        console.error('[PropertyTypesService] Error fetching property types:', error.message);
        throw new Error(`Failed to fetch property types: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('[PropertyTypesService] Error in getPropertyTypes:', error);
      throw error;
    }
  }

  /**
   * Get property types by category
   */
  static async getPropertyTypesByCategory(category: 'residential' | 'commercial'): Promise<PropertyType[]> {
    try {
      const { data, error } = await supabase
        .from('property_types')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('name');

      if (error) {
        console.error('[PropertyTypesService] Error fetching property types by category:', error.message);
        throw new Error(`Failed to fetch property types by category: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('[PropertyTypesService] Error in getPropertyTypesByCategory:', error);
      throw error;
    }
  }

  /**
   * Get property type by ID
   */
  static async getPropertyType(typeId: number): Promise<PropertyType | null> {
    try {
      const { data, error } = await supabase
        .from('property_types')
        .select('*')
        .eq('id', typeId)
        .single();

      if (error) {
        console.error('[PropertyTypesService] Error fetching property type:', error.message);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[PropertyTypesService] Error in getPropertyType:', error);
      return null;
    }
  }

  /**
   * Initialize property types (run once on setup)
   */
  static async initializePropertyTypes(): Promise<void> {
    const propertyTypes = [
      // Residential
      {
        id: 1,
        name: 'Apartment',
        category: 'residential' as const,
        icon: 'apartment',
        color: '#3B82F6',
        description: 'Residential apartment units',
        priority: 100,
        is_active: true,
      },
      {
        id: 2,
        name: 'House',
        category: 'residential' as const,
        icon: 'home',
        color: '#10B981',
        description: 'Single-family houses',
        priority: 90,
        is_active: true,
      },
      {
        id: 3,
        name: 'Condo',
        category: 'residential' as const,
        icon: 'building',
        color: '#F59E0B',
        description: 'Condominium units',
        priority: 80,
        is_active: true,
      },
      {
        id: 4,
        name: 'Townhouse',
        category: 'residential' as const,
        icon: 'house-line',
        color: '#8B5CF6',
        description: 'Townhouse properties',
        priority: 70,
        is_active: true,
      },
      // Commercial - Entertainment
      {
        id: 10,
        name: 'Bowling Alley',
        category: 'commercial' as const,
        icon: 'bowling',
        color: '#EF4444',
        description: 'Bowling entertainment venue',
        priority: 95,
        is_active: true,
      },
      {
        id: 11,
        name: 'Movie Theater',
        category: 'commercial' as const,
        icon: 'movie',
        color: '#EC4899',
        description: 'Cinema and movie theaters',
        priority: 95,
        is_active: true,
      },
      {
        id: 12,
        name: 'Nightclub',
        category: 'commercial' as const,
        icon: 'music',
        color: '#8B5CF6',
        description: 'Nightclubs and bars with entertainment',
        priority: 90,
        is_active: true,
      },
      {
        id: 13,
        name: 'Bar',
        category: 'commercial' as const,
        icon: 'beer',
        color: '#F59E0B',
        description: 'Bars and pubs',
        priority: 85,
        is_active: true,
      },
      {
        id: 14,
        name: 'Billiards Hall',
        category: 'commercial' as const,
        icon: 'pool',
        color: '#6366F1',
        description: 'Billiards and pool halls',
        priority: 80,
        is_active: true,
      },
      // Commercial - Food & Dining
      {
        id: 20,
        name: 'Restaurant',
        category: 'commercial' as const,
        icon: 'utensils',
        color: '#EF4444',
        description: 'Restaurants and cafes',
        priority: 100,
        is_active: true,
      },
      {
        id: 21,
        name: 'Grocery Store',
        category: 'commercial' as const,
        icon: 'shopping-cart',
        color: '#10B981',
        description: 'Grocery and food stores',
        priority: 95,
        is_active: true,
      },
      // Commercial - Sports & Recreation
      {
        id: 30,
        name: 'Sports Arena',
        category: 'commercial' as const,
        icon: 'trophy',
        color: '#3B82F6',
        description: 'Sports arenas and stadiums',
        priority: 95,
        is_active: true,
      },
      {
        id: 31,
        name: 'Paintball Range',
        category: 'commercial' as const,
        icon: 'target',
        color: '#F59E0B',
        description: 'Paintball and gaming venues',
        priority: 85,
        is_active: true,
      },
      {
        id: 32,
        name: 'Golf Country Club',
        category: 'commercial' as const,
        icon: 'golf',
        color: '#10B981',
        description: 'Golf courses and country clubs',
        priority: 90,
        is_active: true,
      },
      // Commercial - Services
      {
        id: 40,
        name: 'Bank',
        category: 'commercial' as const,
        icon: 'bank',
        color: '#6366F1',
        description: 'Banks and financial institutions',
        priority: 90,
        is_active: true,
      },
      {
        id: 41,
        name: 'Event Hall',
        category: 'commercial' as const,
        icon: 'calendar',
        color: '#EC4899',
        description: 'Event halls and convention centers',
        priority: 85,
        is_active: true,
      },
    ];

    try {
      // Insert property types (upsert to avoid duplicates)
      for (const type of propertyTypes) {
        await supabase
          .from('property_types')
          .upsert(type, { onConflict: 'id' });
      }

      console.log(`[PropertyTypesService] Initialized ${propertyTypes.length} property types`);
    } catch (error) {
      console.error('[PropertyTypesService] Error initializing property types:', error);
      throw error;
    }
  }
}