// Item Placement Service - Manages placing and moving items in homes

import { supabase } from '../lib/supabase';
import {
  PlacedItem,
  PlaceItemInput,
  UpdateItemPositionInput,
} from '../types/home';

export interface PaginatedItemsResult {
  items: PlacedItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ItemsQueryOptions {
  page?: number;
  pageSize?: number;
  category?: string;
  sortBy?: 'placed_at' | 'item_name' | 'item_category';
  sortOrder?: 'asc' | 'desc';
}

export class ItemPlacementService {
  /**
   * Place an item in a room
   */
  static async placeItem(input: PlaceItemInput): Promise<PlacedItem> {
    const {
      homeId,
      roomLayoutId,
      itemId,
      itemName,
      itemCategory,
      itemImageUrl,
      position,
      rotation = { x: 0, y: 0, z: 0 },
      scale = 1.0,
    } = input;

    // Check if room exists and has space
    const { data: room } = await supabase
      .from('room_layouts')
      .select('max_items')
      .eq('id', roomLayoutId)
      .single();

    if (!room) {
      throw new Error('Room not found');
    }

    // Count items in room
    const { count } = await supabase
      .from('placed_items')
      .select('*', { count: 'exact', head: true })
      .eq('room_layout_id', roomLayoutId);

    if (count && count >= room.max_items) {
      throw new Error(`Maximum items (${room.max_items}) reached for this room`);
    }

    // Place item
    const { data, error } = await supabase
      .from('placed_items')
      .insert({
        home_id: homeId,
        room_layout_id: roomLayoutId,
        item_id: itemId,
        item_name: itemName,
        item_category: itemCategory,
        item_image_url: itemImageUrl,
        position_x: position.x,
        position_y: position.y,
        position_z: position.z,
        rotation_x: rotation.x,
        rotation_y: rotation.y,
        rotation_z: rotation.z,
        scale: scale,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to place item: ${error.message}`);
    }

    // Log analytics
    await supabase.from('home_analytics').insert({
      home_id: homeId,
      event_type: 'item_placed',
      event_data: {
        item_id: itemId,
        item_name: itemName,
        room_layout_id: roomLayoutId,
        position,
      },
    });

    return this.mapToPlacedItem(data);
  }

  /**
   * Get item by ID
   */
  static async getItemById(itemId: string): Promise<PlacedItem | null> {
    const { data, error } = await supabase
      .from('placed_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch item: ${error.message}`);
    }

    return this.mapToPlacedItem(data);
  }

  /**
   * Get all items in a home
   */
  static async getHomeItems(homeId: string): Promise<PlacedItem[]> {
    const { data, error } = await supabase
      .from('placed_items')
      .select('*')
      .eq('home_id', homeId)
      .order('placed_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch items: ${error.message}`);
    }

    return (data || []).map(this.mapToPlacedItem);
  }

  /**
   * Get all items in a room
   */
  static async getRoomItems(roomLayoutId: string): Promise<PlacedItem[]> {
    const { data, error } = await supabase
      .from('placed_items')
      .select('*')
      .eq('room_layout_id', roomLayoutId)
      .order('placed_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch items: ${error.message}`);
    }

    return (data || []).map(this.mapToPlacedItem);
  }

  /**
   * Get paginated items in a room
   */
  static async getRoomItemsPaginated(
    roomLayoutId: string,
    options: ItemsQueryOptions = {}
  ): Promise<PaginatedItemsResult> {
    const {
      page = 0,
      pageSize = 50,
      category,
      sortBy = 'placed_at',
      sortOrder = 'asc',
    } = options;

    const start = page * pageSize;
    const end = start + pageSize - 1;

    // Get total count first
    let countQuery = supabase
      .from('placed_items')
      .select('*', { count: 'exact', head: true })
      .eq('room_layout_id', roomLayoutId);

    if (category) {
      countQuery = countQuery.eq('item_category', category);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      throw new Error(`Failed to count items: ${countError.message}`);
    }

    // Get paginated items
    let query = supabase
      .from('placed_items')
      .select('*')
      .eq('room_layout_id', roomLayoutId)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(start, end);

    if (category) {
      query = query.eq('item_category', category);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch items: ${error.message}`);
    }

    const items = (data || []).map(this.mapToPlacedItem);
    const total = totalCount || 0;

    console.log(`[ItemPlacementService] Fetched page ${page} with ${items.length} items (total: ${total})`);

    return {
      items,
      totalCount: total,
      page,
      pageSize,
      hasMore: (page + 1) * pageSize < total,
    };
  }

  /**
   * Get paginated items in a home
   */
  static async getHomeItemsPaginated(
    homeId: string,
    options: ItemsQueryOptions = {}
  ): Promise<PaginatedItemsResult> {
    const {
      page = 0,
      pageSize = 50,
      category,
      sortBy = 'placed_at',
      sortOrder = 'asc',
    } = options;

    const start = page * pageSize;
    const end = start + pageSize - 1;

    // Get total count first
    let countQuery = supabase
      .from('placed_items')
      .select('*', { count: 'exact', head: true })
      .eq('home_id', homeId);

    if (category) {
      countQuery = countQuery.eq('item_category', category);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      throw new Error(`Failed to count items: ${countError.message}`);
    }

    // Get paginated items
    let query = supabase
      .from('placed_items')
      .select('*')
      .eq('home_id', homeId)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(start, end);

    if (category) {
      query = query.eq('item_category', category);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch items: ${error.message}`);
    }

    const items = (data || []).map(this.mapToPlacedItem);
    const total = totalCount || 0;

    console.log(`[ItemPlacementService] Fetched home page ${page} with ${items.length} items (total: ${total})`);

    return {
      items,
      totalCount: total,
      page,
      pageSize,
      hasMore: (page + 1) * pageSize < total,
    };
  }

  /**
   * Get item count for a room (lightweight query)
   */
  static async getRoomItemCount(roomLayoutId: string): Promise<number> {
    const { count, error } = await supabase
      .from('placed_items')
      .select('*', { count: 'exact', head: true })
      .eq('room_layout_id', roomLayoutId);

    if (error) {
      console.error('[ItemPlacementService] Failed to count items:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Get item counts for multiple rooms (batch query)
   */
  static async getRoomItemCounts(roomLayoutIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();

    if (roomLayoutIds.length === 0) {
      return counts;
    }

    const { data, error } = await supabase
      .from('placed_items')
      .select('room_layout_id')
      .in('room_layout_id', roomLayoutIds);

    if (error) {
      console.error('[ItemPlacementService] Failed to fetch item counts:', error);
      return counts;
    }

    // Initialize all rooms with 0
    roomLayoutIds.forEach(id => counts.set(id, 0));

    // Count items per room
    (data || []).forEach((item: { room_layout_id: string }) => {
      const currentCount = counts.get(item.room_layout_id) || 0;
      counts.set(item.room_layout_id, currentCount + 1);
    });

    return counts;
  }

  /**
   * Update item position and rotation
   */
  static async updateItemPosition(input: UpdateItemPositionInput): Promise<PlacedItem> {
    const { itemId, position, rotation, scale } = input;

    const updates: any = {
      position_x: position.x,
      position_y: position.y,
      position_z: position.z,
    };

    if (rotation) {
      updates.rotation_x = rotation.x;
      updates.rotation_y = rotation.y;
      updates.rotation_z = rotation.z;
    }

    if (scale !== undefined) {
      updates.scale = scale;
    }

    const { data, error } = await supabase
      .from('placed_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update item: ${error.message}`);
    }

    // Log analytics
    const item = await this.getItemById(itemId);
    if (item) {
      await supabase.from('home_analytics').insert({
        home_id: item.homeId,
        event_type: 'item_moved',
        event_data: {
          item_id: item.itemId,
          item_name: item.itemName,
          room_layout_id: item.roomLayoutId,
          new_position: position,
        },
      });
    }

    return this.mapToPlacedItem(data);
  }

  /**
   * Move item to different room
   */
  static async moveItemToRoom(
    itemId: string,
    newRoomLayoutId: string,
    newPosition: { x: number; y: number; z: number }
  ): Promise<PlacedItem> {
    // Check if new room exists and has space
    const { data: room } = await supabase
      .from('room_layouts')
      .select('max_items')
      .eq('id', newRoomLayoutId)
      .single();

    if (!room) {
      throw new Error('Room not found');
    }

    // Count items in new room
    const { count } = await supabase
      .from('placed_items')
      .select('*', { count: 'exact', head: true })
      .eq('room_layout_id', newRoomLayoutId);

    if (count && count >= room.max_items) {
      throw new Error(`Maximum items (${room.max_items}) reached for this room`);
    }

    const { data, error } = await supabase
      .from('placed_items')
      .update({
        room_layout_id: newRoomLayoutId,
        position_x: newPosition.x,
        position_y: newPosition.y,
        position_z: newPosition.z,
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to move item: ${error.message}`);
    }

    // Log analytics
    const item = await this.getItemById(itemId);
    if (item) {
      await supabase.from('home_analytics').insert({
        home_id: item.homeId,
        event_type: 'item_moved',
        event_data: {
          item_id: item.itemId,
          item_name: item.itemName,
          from_room_id: item.roomLayoutId,
          to_room_id: newRoomLayoutId,
          new_position: newPosition,
        },
      });
    }

    return this.mapToPlacedItem(data);
  }

  /**
   * Remove item from home
   */
  static async removeItem(itemId: string): Promise<void> {
    // Get item details for analytics
    const item = await this.getItemById(itemId);

    const { error } = await supabase.from('placed_items').delete().eq('id', itemId);

    if (error) {
      throw new Error(`Failed to remove item: ${error.message}`);
    }

    // Log analytics
    if (item) {
      await supabase.from('home_analytics').insert({
        home_id: item.homeId,
        event_type: 'item_removed',
        event_data: {
          item_id: item.itemId,
          item_name: item.itemName,
          room_layout_id: item.roomLayoutId,
        },
      });
    }
  }

  /**
   * Remove all items from a room
   */
  static async clearRoom(roomLayoutId: string): Promise<number> {
    const { data: items } = await supabase
      .from('placed_items')
      .select('id, item_id, item_name, home_id')
      .eq('room_layout_id', roomLayoutId);

    if (!items || items.length === 0) {
      return 0;
    }

    const { error } = await supabase
      .from('placed_items')
      .delete()
      .eq('room_layout_id', roomLayoutId);

    if (error) {
      throw new Error(`Failed to clear room: ${error.message}`);
    }

    // Log analytics for each item
    const homeId = items[0]?.home_id;
    if (homeId) {
      await supabase.from('home_analytics').insert({
        home_id: homeId,
        event_type: 'item_removed',
        event_data: {
          room_layout_id: roomLayoutId,
          items_cleared: items.length,
        },
      });
    }

    return items.length;
  }

  /**
   * Get items by category
   */
  static async getItemsByCategory(
    homeId: string,
    category: string
  ): Promise<PlacedItem[]> {
    const { data, error } = await supabase
      .from('placed_items')
      .select('*')
      .eq('home_id', homeId)
      .eq('item_category', category)
      .order('placed_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch items: ${error.message}`);
    }

    return (data || []).map(this.mapToPlacedItem);
  }

  /**
   * Duplicate item in same room
   */
  static async duplicateItem(
    itemId: string,
    newPosition: { x: number; y: number; z: number }
  ): Promise<PlacedItem> {
    const item = await this.getItemById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    return this.placeItem({
      homeId: item.homeId,
      roomLayoutId: item.roomLayoutId,
      itemId: item.itemId,
      itemName: item.itemName,
      itemCategory: item.itemCategory,
      itemImageUrl: item.itemImageUrl,
      position: newPosition,
      rotation: item.rotation,
      scale: item.scale,
    });
  }

  // Helper method to map database record to TypeScript type
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