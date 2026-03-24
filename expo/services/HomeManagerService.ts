// Home Manager Service - Manages player homes and operations

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  PlayerHome,
  CreateHomeInput,
  UpdateHomeInput,
  HomeDetails,
  PublicHomeListItem,
  HomeTierConfig,
  HOME_TIERS,
} from '../types/home';

export class HomeManagerService {
  /**
   * Create a new home for a player
   */
  static async createHome(input: CreateHomeInput): Promise<PlayerHome> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured');
    }
    const { playerId, homeTier, homeName, homeDescription, isPublic = false } = input;

    // Get tier configuration
    const tierConfig = await this.getTierConfig(homeTier);
    if (!tierConfig) {
      throw new Error('Invalid home tier');
    }

    // Check if player already has a home
    const existingHome = await this.getPlayerHome(playerId);
    if (existingHome) {
      throw new Error('Player already has a home');
    }

    // Create default home layout
    const homeLayout = {
      rooms: [],
      version: '1.0.0',
    };

    // Create home
    const { data, error } = await supabase
      .from('player_homes')
      .insert({
        player_id: playerId,
        home_tier: homeTier,
        home_name: homeName || 'My Home',
        home_description: homeDescription,
        home_layout: homeLayout,
        is_public: isPublic,
        max_visitors: tierConfig.maxVisitors,
        current_visitors: 0,
        total_visits: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create home: ${error.message}`);
    }

    return this.mapToPlayerHome(data);
  }

  /**
   * Validate if a string is a valid UUID
   */
  private static isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Get player's home
   */
  static async getPlayerHome(playerId: string): Promise<PlayerHome | null> {
    try {
      if (!isSupabaseConfigured) {
        console.log('[HomeManagerService] Supabase not configured, skipping fetch');
        return null;
      }
      if (!playerId || !this.isValidUUID(playerId)) {
        console.warn('[HomeManagerService] Invalid player ID format:', playerId);
        return null;
      }

      const { data, error } = await supabase
        .from('player_homes')
        .select('*')
        .eq('player_id', playerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('[HomeManagerService] Error fetching player home:', error.message);
        return null;
      }

      return this.mapToPlayerHome(data);
    } catch (error: any) {
      console.warn('[HomeManagerService] Network error fetching player home:', error?.message || String(error));
      return null;
    }
  }

  /**
   * Get home by ID
   */
  static async getHomeById(homeId: string): Promise<PlayerHome | null> {
    try {
      if (!isSupabaseConfigured) {
        console.log('[HomeManagerService] Supabase not configured, skipping fetch');
        return null;
      }
      if (!homeId || !this.isValidUUID(homeId)) {
        console.warn('[HomeManagerService] Invalid home ID format:', homeId);
        return null;
      }

      const { data, error } = await supabase
        .from('player_homes')
        .select('*')
        .eq('id', homeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('[HomeManagerService] Error fetching home by ID:', error.message);
        return null;
      }

      return this.mapToPlayerHome(data);
    } catch (error: any) {
      console.warn('[HomeManagerService] Network error fetching home by ID:', error?.message || String(error));
      return null;
    }
  }

  /**
   * Update home details
   */
  static async updateHome(input: UpdateHomeInput): Promise<PlayerHome> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured');
    }
    const { homeId, homeName, homeDescription, isPublic, maxVisitors } = input;

    const updates: any = {};
    if (homeName !== undefined) updates.home_name = homeName;
    if (homeDescription !== undefined) updates.home_description = homeDescription;
    if (isPublic !== undefined) updates.is_public = isPublic;
    if (maxVisitors !== undefined) updates.max_visitors = maxVisitors;

    const { data, error } = await supabase
      .from('player_homes')
      .update(updates)
      .eq('id', homeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update home: ${error.message}`);
    }

    return this.mapToPlayerHome(data);
  }

  /**
   * Delete home
   */
  static async deleteHome(homeId: string): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured');
    }
    const { error } = await supabase.from('player_homes').delete().eq('id', homeId);

    if (error) {
      throw new Error(`Failed to delete home: ${error.message}`);
    }
  }

  /**
   * Get home details with rooms and items
   */
  static async getHomeDetails(homeId: string): Promise<HomeDetails> {
    // Get home
    const home = await this.getHomeById(homeId);
    if (!home) {
      throw new Error('Home not found');
    }

    // Get tier config
    const tierConfig = await this.getTierConfig(home.homeTier);
    if (!tierConfig) {
      throw new Error('Tier config not found');
    }

    // Get rooms
    const { data: rooms } = await supabase
      .from('room_layouts')
      .select('*')
      .eq('home_id', homeId)
      .order('created_at', { ascending: true });

    // Get items
    const { data: items } = await supabase
      .from('placed_items')
      .select('*')
      .eq('home_id', homeId)
      .order('placed_at', { ascending: true });

    return {
      home,
      tierConfig,
      roomCount: rooms?.length || 0,
      itemCount: items?.length || 0,
      rooms: rooms?.map((r) => this.mapToRoomLayout(r)) || [],
      items: items?.map((i) => this.mapToPlacedItem(i)) || [],
    };
  }

  /**
   * Upgrade home tier
   */
  static async upgradeHomeTier(homeId: string, newTier: 1 | 2 | 3 | 4): Promise<PlayerHome> {
    const home = await this.getHomeById(homeId);
    if (!home) {
      throw new Error('Home not found');
    }

    if (newTier <= home.homeTier) {
      throw new Error('New tier must be higher than current tier');
    }

    const tierConfig = await this.getTierConfig(newTier);
    if (!tierConfig) {
      throw new Error('Invalid tier');
    }

    const { data, error } = await supabase
      .from('player_homes')
      .update({
        home_tier: newTier,
        max_visitors: tierConfig.maxVisitors,
      })
      .eq('id', homeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upgrade home: ${error.message}`);
    }

    return this.mapToPlayerHome(data);
  }

  /**
   * Get public homes list
   */
  static async getPublicHomes(
    limit: number = 20,
    offset: number = 0,
    tierFilter?: number
  ): Promise<PublicHomeListItem[]> {
    if (!isSupabaseConfigured) {
      console.log('[HomeManagerService] Supabase not configured, returning empty list');
      return [];
    }
    let query = supabase
      .from('player_homes')
      .select(`
        *,
        users:player_id (
          email,
          name
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (tierFilter !== undefined) {
      query = query.eq('home_tier', tierFilter);
    }

    let data: any[] | null = null;
    let error: any = null;

    try {
      const result = await query;
      data = result.data;
      error = result.error;
    } catch (networkError: any) {
      console.warn('[HomeManagerService] Network error fetching public homes:', networkError?.message || String(networkError));
      return [];
    }

    if (error) {
      console.warn('[HomeManagerService] Error fetching public homes:', error.message);
      return [];
    }

    const homes = data || [];
    if (homes.length === 0) return [];

    const homeIds = homes.map(h => h.id);
    
    let roomCounts: any = { data: [] };
    let itemCounts: any = { data: [] };

    try {
      [roomCounts, itemCounts] = await Promise.all([
        homeIds.length > 0 
          ? supabase.from('room_layouts').select('home_id').in('home_id', homeIds)
          : Promise.resolve({ data: [] }),
        homeIds.length > 0
          ? supabase.from('placed_items').select('home_id').in('home_id', homeIds)
          : Promise.resolve({ data: [] })
      ]);
    } catch (countError: any) {
      console.warn('[HomeManagerService] Error fetching room/item counts:', countError?.message || String(countError));
    }

    const roomCountMap = new Map<string, number>();
    const itemCountMap = new Map<string, number>();
    
    (roomCounts.data || []).forEach((r: any) => {
      roomCountMap.set(r.home_id, (roomCountMap.get(r.home_id) || 0) + 1);
    });
    
    (itemCounts.data || []).forEach((i: any) => {
      itemCountMap.set(i.home_id, (itemCountMap.get(i.home_id) || 0) + 1);
    });

    return homes.map(home => this.mapToPublicHomeListItemFromJoin(home, roomCountMap, itemCountMap));
  }

  /**
   * Search public homes
   */
  static async searchPublicHomes(
    searchTerm: string,
    limit: number = 20
  ): Promise<PublicHomeListItem[]> {
    if (!isSupabaseConfigured) {
      console.log('[HomeManagerService] Supabase not configured, returning empty list');
      return [];
    }
    try {
      const { data, error } = await supabase
        .from('player_homes')
        .select(`
          *,
          users:player_id (
            email,
            name
          )
        `)
        .eq('is_public', true)
        .or(`home_name.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('[HomeManagerService] Error searching homes:', error.message);
        return [];
      }

      const homes = data || [];
      if (homes.length === 0) return [];

      const homeIds = homes.map(h => h.id);
      
      let roomCounts: any = { data: [] };
      let itemCounts: any = { data: [] };

      try {
        [roomCounts, itemCounts] = await Promise.all([
          homeIds.length > 0 
            ? supabase.from('room_layouts').select('home_id').in('home_id', homeIds)
            : Promise.resolve({ data: [] }),
          homeIds.length > 0
            ? supabase.from('placed_items').select('home_id').in('home_id', homeIds)
            : Promise.resolve({ data: [] })
        ]);
      } catch (countError: any) {
        console.warn('[HomeManagerService] Error fetching room/item counts:', countError?.message || String(countError));
      }

      const roomCountMap = new Map<string, number>();
      const itemCountMap = new Map<string, number>();
      
      (roomCounts.data || []).forEach((r: any) => {
        roomCountMap.set(r.home_id, (roomCountMap.get(r.home_id) || 0) + 1);
      });
      
      (itemCounts.data || []).forEach((i: any) => {
        itemCountMap.set(i.home_id, (itemCountMap.get(i.home_id) || 0) + 1);
      });

      return homes.map(home => this.mapToPublicHomeListItemFromJoin(home, roomCountMap, itemCountMap));
    } catch (error: any) {
      console.warn('[HomeManagerService] Network error searching homes:', error?.message || String(error));
      return [];
    }
  }

  /**
   * Get tier configuration (using hardcoded defaults since table may not exist)
   */
  static async getTierConfig(tier: number): Promise<HomeTierConfig | null> {
    const tierConfigs = this.getDefaultTierConfigs();
    return tierConfigs.find(t => t.id === tier) || null;
  }

  /**
   * Get all tier configurations
   */
  static async getAllTierConfigs(): Promise<HomeTierConfig[]> {
    return this.getDefaultTierConfigs();
  }

  /**
   * Get default tier configurations
   */
  private static getDefaultTierConfigs(): HomeTierConfig[] {
    return HOME_TIERS;
  }

  /**
   * Get home statistics
   */
  static async getHomeStats(): Promise<{
    totalHomes: number;
    publicHomes: number;
    totalVisits: number;
    averageRating: number;
  }> {
    if (!isSupabaseConfigured) {
      return { totalHomes: 0, publicHomes: 0, totalVisits: 0, averageRating: 0 };
    }
    try {
    const { data } = await supabase
      .from('player_homes')
      .select('is_public, total_visits, total_rating, rating_count');

    if (!data || data.length === 0) {
      return {
        totalHomes: 0,
        publicHomes: 0,
        totalVisits: 0,
        averageRating: 0,
      };
    }

    const totalHomes = data.length;
    const publicHomes = data.filter((h) => h.is_public).length;
    const totalVisits = data.reduce((sum, h) => sum + (h.total_visits || 0), 0);
    const homesWithRatings = data.filter((h) => h.rating_count > 0);
    const averageRating =
      homesWithRatings.length > 0
        ? homesWithRatings.reduce((sum, h) => sum + h.total_rating, 0) / homesWithRatings.length
        : 0;

    return {
      totalHomes,
      publicHomes,
      totalVisits,
      averageRating,
    };
    } catch (error: any) {
      console.warn('[HomeManagerService] Network error fetching home stats:', error?.message || String(error));
      return { totalHomes: 0, publicHomes: 0, totalVisits: 0, averageRating: 0 };
    }
  }

  // Helper methods to map database records to TypeScript types
  private static mapToPlayerHome(data: any): PlayerHome {
    return {
      id: data.id,
      playerId: data.player_id,
      homeTier: data.home_tier,
      homeName: data.home_name,
      homeDescription: data.home_description,
      homeLayout: data.home_layout || { rooms: [], version: '1.0.0' },
      isPublic: data.is_public,
      maxVisitors: data.max_visitors,
      currentVisitors: data.current_visitors,
      totalVisits: data.total_visits,
      totalRating: parseFloat(data.total_rating) || 0,
      ratingCount: data.rating_count,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private static mapToPublicHomeListItem(data: any): PublicHomeListItem {
    return {
      id: data.id,
      playerId: data.player_id,
      homeTier: data.home_tier,
      homeName: data.home_name || 'My Home',
      homeDescription: data.home_description || '',
      maxVisitors: data.max_visitors || 5,
      currentVisitors: data.current_visitors || 0,
      totalVisits: data.total_visits || 0,
      totalRating: parseFloat(data.total_rating) || 0,
      ratingCount: data.rating_count || 0,
      createdAt: data.created_at,
      email: data.email || '',
      username: data.username || 'Anonymous',
      tierName: data.tier_name || this.getTierName(data.home_tier),
      roomCount: data.room_count || 0,
      itemCount: data.item_count || 0,
    };
  }

  private static mapToPublicHomeListItemFromJoin(
    data: any,
    roomCountMap: Map<string, number>,
    itemCountMap: Map<string, number>
  ): PublicHomeListItem {
    const user = data.users || {};
    return {
      id: data.id,
      playerId: data.player_id,
      homeTier: data.home_tier,
      homeName: data.home_name || 'My Home',
      homeDescription: data.home_description || '',
      maxVisitors: data.max_visitors || 5,
      currentVisitors: data.current_visitors || 0,
      totalVisits: data.total_visits || 0,
      totalRating: parseFloat(data.total_rating) || 0,
      ratingCount: data.rating_count || 0,
      createdAt: data.created_at,
      email: user.email || '',
      username: user.name || 'Anonymous',
      tierName: this.getTierName(data.home_tier),
      roomCount: roomCountMap.get(data.id) || 0,
      itemCount: itemCountMap.get(data.id) || 0,
    };
  }

  private static getTierName(tier: number): string {
    const tierNames: Record<number, string> = {
      1: 'Studio',
      2: 'Apartment',
      3: 'House',
      4: 'Mansion',
    };
    return tierNames[tier] || 'Unknown';
  }

  private static mapToTierConfig(data: any): HomeTierConfig {
    return {
      id: data.id,
      tierName: data.tier_name,
      maxRooms: data.max_rooms,
      totalMaxItems: data.total_max_items,
      maxVisitors: data.max_visitors,
      defaultRoomTypes: data.default_room_types || [],
      tierDescription: data.tier_description,
      unlockPrice: parseFloat(data.unlock_price) || 0,
    };
  }

  private static mapToRoomLayout(data: any): any {
    return {
      id: data.id,
      homeId: data.home_id,
      roomName: data.room_name,
      roomType: data.room_type,
      position: {
        x: parseFloat(data.position_x),
        y: parseFloat(data.position_y),
        z: parseFloat(data.position_z),
      },
      dimensions: {
        x: parseFloat(data.dimensions_x),
        y: parseFloat(data.dimensions_y),
        z: parseFloat(data.dimensions_z),
      },
      wallColor: data.wall_color,
      floorColor: data.floor_color,
      maxItems: data.max_items,
      layoutData: data.layout_data || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private static mapToPlacedItem(data: any): any {
    return {
      id: data.id,
      homeId: data.home_id,
      roomLayoutId: data.room_layout_id,
      itemId: data.item_id,
      itemName: data.item_name,
      itemCategory: data.item_category,
      itemImageUrl: data.item_image_url,
      position: {
        x: parseFloat(data.position_x),
        y: parseFloat(data.position_y),
        z: parseFloat(data.position_z),
      },
      rotation: {
        x: parseFloat(data.rotation_x),
        y: parseFloat(data.rotation_y),
        z: parseFloat(data.rotation_z),
      },
      scale: parseFloat(data.scale),
      placedAt: data.placed_at,
      updatedAt: data.updated_at,
    };
  }
}