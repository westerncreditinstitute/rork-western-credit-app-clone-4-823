// Room Layout Service - Manages room layouts within homes

import { supabase } from '../lib/supabase';
import {
  RoomLayout,
  CreateRoomInput,
  RoomWithItems,
  PlacedItem,
  RoomType,
} from '../types/home';

export class RoomLayoutService {
  /**
   * Create a new room in a home
   */
  static async createRoom(input: CreateRoomInput): Promise<RoomLayout> {
    const {
      homeId,
      roomName,
      roomType,
      position = { x: 0, y: 0, z: 0 },
      dimensions = { x: 10, y: 3, z: 10 },
      wallColor = '#FFFFFF',
      floorColor = '#E5E7EB',
    } = input;

    // Check home exists and get tier config
    const { data: home } = await supabase
      .from('player_homes')
      .select('home_tier')
      .eq('id', homeId)
      .single();

    if (!home) {
      throw new Error('Home not found');
    }

    const { data: tierConfig } = await supabase
      .from('home_tier_config')
      .select('max_rooms')
      .eq('id', home.home_tier)
      .single();

    if (!tierConfig) {
      throw new Error('Tier config not found');
    }

    // Check if home has reached max rooms
    const { count } = await supabase
      .from('room_layouts')
      .select('*', { count: 'exact', head: true })
      .eq('home_id', homeId);

    if (count && count >= tierConfig.max_rooms) {
      throw new Error(`Maximum rooms (${tierConfig.max_rooms}) reached for this home tier`);
    }

    // Create room
    const { data, error } = await supabase
      .from('room_layouts')
      .insert({
        home_id: homeId,
        room_name: roomName,
        room_type: roomType,
        position_x: position.x,
        position_y: position.y,
        position_z: position.z,
        dimensions_x: dimensions.x,
        dimensions_y: dimensions.y,
        dimensions_z: dimensions.z,
        wall_color: wallColor,
        floor_color: floorColor,
        max_items: 20,
        layout_data: {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create room: ${error.message}`);
    }

    return this.mapToRoomLayout(data);
  }

  /**
   * Get room by ID
   */
  static async getRoomById(roomId: string): Promise<RoomLayout | null> {
    const { data, error } = await supabase
      .from('room_layouts')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch room: ${error.message}`);
    }

    return this.mapToRoomLayout(data);
  }

  /**
   * Get all rooms for a home
   */
  static async getHomeRooms(homeId: string): Promise<RoomLayout[]> {
    const { data, error } = await supabase
      .from('room_layouts')
      .select('*')
      .eq('home_id', homeId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch rooms: ${error.message}`);
    }

    return (data || []).map(this.mapToRoomLayout);
  }

  /**
   * Get room with items
   */
  static async getRoomWithItems(roomId: string): Promise<RoomWithItems> {
    const room = await this.getRoomById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const { data: items } = await supabase
      .from('placed_items')
      .select('*')
      .eq('room_layout_id', roomId)
      .order('placed_at', { ascending: true });

    const itemCount = items?.length || 0;
    const itemsRemaining = room.maxItems - itemCount;

    return {
      room,
      items: (items || []).map(this.mapToPlacedItem),
      itemCount,
      itemsRemaining,
    };
  }

  /**
   * Update room details
   */
  static async updateRoom(
    roomId: string,
    updates: {
      roomName?: string;
      wallColor?: string;
      floorColor?: string;
      position?: { x: number; y: number; z: number };
      dimensions?: { x: number; y: number; z: number };
    }
  ): Promise<RoomLayout> {
    const dbUpdates: any = {};
    if (updates.roomName !== undefined) dbUpdates.room_name = updates.roomName;
    if (updates.wallColor !== undefined) dbUpdates.wall_color = updates.wallColor;
    if (updates.floorColor !== undefined) dbUpdates.floor_color = updates.floorColor;
    if (updates.position) {
      dbUpdates.position_x = updates.position.x;
      dbUpdates.position_y = updates.position.y;
      dbUpdates.position_z = updates.position.z;
    }
    if (updates.dimensions) {
      dbUpdates.dimensions_x = updates.dimensions.x;
      dbUpdates.dimensions_y = updates.dimensions.y;
      dbUpdates.dimensions_z = updates.dimensions.z;
    }

    const { data, error } = await supabase
      .from('room_layouts')
      .update(dbUpdates)
      .eq('id', roomId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update room: ${error.message}`);
    }

    return this.mapToRoomLayout(data);
  }

  /**
   * Delete room
   */
  static async deleteRoom(roomId: string): Promise<void> {
    const { error } = await supabase.from('room_layouts').delete().eq('id', roomId);

    if (error) {
      throw new Error(`Failed to delete room: ${error.message}`);
    }
  }

  /**
   * Add door to room
   */
  static async addDoor(
    roomId: string,
    doorPosition: { x: number; y: number; z: number },
    width: number = 1.0,
    height: number = 2.1,
    direction: 'north' | 'south' | 'east' | 'west' = 'north'
  ): Promise<RoomLayout> {
    const room = await this.getRoomById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const newDoor = {
      position: doorPosition,
      width,
      height,
      direction,
    };

    const updatedLayoutData = {
      ...room.layoutData,
      doors: [...(room.layoutData.doors || []), newDoor],
    };

    const { data, error } = await supabase
      .from('room_layouts')
      .update({
        layout_data: updatedLayoutData,
      })
      .eq('id', roomId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add door: ${error.message}`);
    }

    return this.mapToRoomLayout(data);
  }

  /**
   * Add window to room
   */
  static async addWindow(
    roomId: string,
    windowPosition: { x: number; y: number; z: number },
    width: number = 1.5,
    height: number = 1.2
  ): Promise<RoomLayout> {
    const room = await this.getRoomById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const newWindow = {
      position: windowPosition,
      width,
      height,
    };

    const updatedLayoutData = {
      ...room.layoutData,
      windows: [...(room.layoutData.windows || []), newWindow],
    };

    const { data, error } = await supabase
      .from('room_layouts')
      .update({
        layout_data: updatedLayoutData,
      })
      .eq('id', roomId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add window: ${error.message}`);
    }

    return this.mapToRoomLayout(data);
  }

  /**
   * Get available room types for a home tier
   */
  static async getAvailableRoomTypes(homeTier: number): Promise<RoomType[]> {
    const { data, error } = await supabase
      .from('home_tier_config')
      .select('default_room_types')
      .eq('id', homeTier)
      .single();

    if (error) {
      throw new Error(`Failed to fetch room types: ${error.message}`);
    }

    return (data?.default_room_types || []) as RoomType[];
  }

  // Helper method to map database record to TypeScript type
  private static mapToRoomLayout(data: any): RoomLayout {
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

  private static mapToPlacedItem(data: any): PlacedItem {
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