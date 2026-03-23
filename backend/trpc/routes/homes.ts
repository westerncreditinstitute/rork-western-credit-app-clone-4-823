import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const Vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const PlacedItemSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  position: Vector3Schema,
  rotation: Vector3Schema,
  roomName: z.string(),
  placedAt: z.string(),
});

const RoomDataSchema = z.object({
  roomName: z.string(),
  position: Vector3Schema,
  dimensions: Vector3Schema,
  doorPositions: z.array(Vector3Schema),
  windowPositions: z.array(Vector3Schema),
  maxItems: z.number(),
});

const HomeDataSchema = z.object({
  homeId: z.string(),
  playerId: z.string(),
  homeTier: z.number(),
  isPublic: z.boolean(),
  maxVisitors: z.number(),
  rooms: z.array(RoomDataSchema),
  placedItems: z.array(PlacedItemSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const homesRouter = createTRPCRouter({
  getHome: publicProcedure
    .input(z.object({ playerId: z.string() }))
    .query(async ({ input }) => {
      console.log('[Homes API] Getting home for player:', input.playerId);

      if (!isSupabaseConfigured) {
        console.log('[Homes API] Supabase not configured, returning null');
        return null;
      }

      try {
        const { data, error } = await supabase
          .from('player_homes')
          .select('*')
          .eq('player_id', input.playerId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            console.log('[Homes API] No home found for player');
            return null;
          }
          throw error;
        }

        const { data: items } = await supabase
          .from('placed_items')
          .select('*')
          .eq('home_id', data.id);

        const homeData = {
          homeId: data.id,
          playerId: data.player_id,
          homeTier: data.home_tier,
          isPublic: data.is_public,
          maxVisitors: data.max_visitors,
          rooms: data.rooms || [],
          placedItems: (items || []).map((item: any) => ({
            id: item.id,
            itemId: item.item_id,
            position: { x: item.position_x, y: item.position_y, z: item.position_z },
            rotation: { x: item.rotation_x, y: item.rotation_y, z: item.rotation_z },
            roomName: item.room_name,
            placedAt: item.placed_at,
          })),
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        console.log('[Homes API] Home retrieved successfully');
        return homeData;
      } catch (error) {
        console.error('[Homes API] Error getting home:', error);
        throw error;
      }
    }),

  createHome: publicProcedure
    .input(z.object({
      playerId: z.string(),
      homeTier: z.number().min(1).max(4),
      rooms: z.array(RoomDataSchema),
      maxVisitors: z.number(),
    }))
    .mutation(async ({ input }) => {
      console.log('[Homes API] Creating home for player:', input.playerId);

      if (!isSupabaseConfigured) {
        console.log('[Homes API] Supabase not configured, returning mock data');
        return {
          homeId: `home_${input.playerId}_${Date.now()}`,
          playerId: input.playerId,
          homeTier: input.homeTier,
          isPublic: false,
          maxVisitors: input.maxVisitors,
          rooms: input.rooms,
          placedItems: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      try {
        const { data, error } = await supabase
          .from('player_homes')
          .insert({
            player_id: input.playerId,
            home_tier: input.homeTier,
            is_public: false,
            max_visitors: input.maxVisitors,
            rooms: input.rooms,
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[Homes API] Home created successfully:', data.id);
        return {
          homeId: data.id,
          playerId: data.player_id,
          homeTier: data.home_tier,
          isPublic: data.is_public,
          maxVisitors: data.max_visitors,
          rooms: data.rooms || [],
          placedItems: [],
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      } catch (error) {
        console.error('[Homes API] Error creating home:', error);
        throw error;
      }
    }),

  updateHome: publicProcedure
    .input(z.object({
      homeId: z.string(),
      updates: z.object({
        homeTier: z.number().optional(),
        isPublic: z.boolean().optional(),
        maxVisitors: z.number().optional(),
        rooms: z.array(RoomDataSchema).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      console.log('[Homes API] Updating home:', input.homeId);

      if (!isSupabaseConfigured) {
        return { success: true };
      }

      try {
        const updateData: any = { updated_at: new Date().toISOString() };
        if (input.updates.homeTier !== undefined) updateData.home_tier = input.updates.homeTier;
        if (input.updates.isPublic !== undefined) updateData.is_public = input.updates.isPublic;
        if (input.updates.maxVisitors !== undefined) updateData.max_visitors = input.updates.maxVisitors;
        if (input.updates.rooms !== undefined) updateData.rooms = input.updates.rooms;

        const { error } = await supabase
          .from('player_homes')
          .update(updateData)
          .eq('id', input.homeId);

        if (error) throw error;

        console.log('[Homes API] Home updated successfully');
        return { success: true };
      } catch (error) {
        console.error('[Homes API] Error updating home:', error);
        throw error;
      }
    }),

  placeItem: publicProcedure
    .input(z.object({
      homeId: z.string(),
      item: z.object({
        itemId: z.string(),
        position: Vector3Schema,
        rotation: Vector3Schema,
        roomName: z.string(),
      }),
    }))
    .mutation(async ({ input }) => {
      console.log('[Homes API] Placing item in home:', input.homeId);

      if (!isSupabaseConfigured) {
        return {
          id: `item_${Date.now()}`,
          itemId: input.item.itemId,
          position: input.item.position,
          rotation: input.item.rotation,
          roomName: input.item.roomName,
          placedAt: new Date().toISOString(),
        };
      }

      try {
        const { data, error } = await supabase
          .from('placed_items')
          .insert({
            home_id: input.homeId,
            item_id: input.item.itemId,
            position_x: input.item.position.x,
            position_y: input.item.position.y,
            position_z: input.item.position.z,
            rotation_x: input.item.rotation.x,
            rotation_y: input.item.rotation.y,
            rotation_z: input.item.rotation.z,
            room_name: input.item.roomName,
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[Homes API] Item placed successfully:', data.id);
        return {
          id: data.id,
          itemId: data.item_id,
          position: { x: data.position_x, y: data.position_y, z: data.position_z },
          rotation: { x: data.rotation_x, y: data.rotation_y, z: data.rotation_z },
          roomName: data.room_name,
          placedAt: data.placed_at,
        };
      } catch (error) {
        console.error('[Homes API] Error placing item:', error);
        throw error;
      }
    }),

  removeItem: publicProcedure
    .input(z.object({
      homeId: z.string(),
      itemId: z.string(),
    }))
    .mutation(async ({ input }) => {
      console.log('[Homes API] Removing item:', input.itemId);

      if (!isSupabaseConfigured) {
        return { success: true };
      }

      try {
        const { error } = await supabase
          .from('placed_items')
          .delete()
          .eq('id', input.itemId)
          .eq('home_id', input.homeId);

        if (error) throw error;

        console.log('[Homes API] Item removed successfully');
        return { success: true };
      } catch (error) {
        console.error('[Homes API] Error removing item:', error);
        throw error;
      }
    }),

  getPublicHomes: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(20),
      offset: z.number().optional().default(0),
      tier: z.number().optional(),
    }))
    .query(async ({ input }) => {
      console.log('[Homes API] Getting public homes');

      if (!isSupabaseConfigured) {
        return {
          homes: [
            {
              homeId: 'public_home_1',
              hostId: 'host_1',
              hostName: 'CreditMaster42',
              homeTier: 3,
              tierName: 'House',
              visitorCount: 3,
              maxVisitors: 8,
              roomCount: 5,
              itemCount: 67,
              rating: 4.5,
              totalVisits: 234,
              createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              previewImageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400',
            },
            {
              homeId: 'public_home_2',
              hostId: 'host_2',
              hostName: 'BudgetPro99',
              homeTier: 4,
              tierName: 'Mansion',
              visitorCount: 8,
              maxVisitors: 15,
              roomCount: 8,
              itemCount: 156,
              rating: 4.8,
              totalVisits: 892,
              createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
              previewImageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400',
            },
            {
              homeId: 'public_home_3',
              hostId: 'host_3',
              hostName: 'ScoreSaver',
              homeTier: 2,
              tierName: 'Apartment',
              visitorCount: 2,
              maxVisitors: 5,
              roomCount: 3,
              itemCount: 34,
              rating: 4.2,
              totalVisits: 78,
              createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
              previewImageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400',
            },
          ],
          total: 3,
        };
      }

      try {
        let query = supabase
          .from('player_homes')
          .select('*, users!inner(name)', { count: 'exact' })
          .eq('is_public', true)
          .range(input.offset, input.offset + input.limit - 1);

        if (input.tier) {
          query = query.eq('home_tier', input.tier);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        const tierNames: Record<number, string> = {
          1: 'Starter Studio',
          2: 'Apartment',
          3: 'House',
          4: 'Mansion',
        };

        const homes = (data || []).map((home: any) => ({
          homeId: home.id,
          hostId: home.player_id,
          hostName: home.users?.name || 'Unknown',
          homeTier: home.home_tier,
          tierName: tierNames[home.home_tier] || 'Home',
          visitorCount: home.current_visitors || 0,
          maxVisitors: home.max_visitors,
          roomCount: home.rooms?.length || 0,
          itemCount: home.item_count || 0,
          rating: home.rating || 4.0,
          totalVisits: home.total_visits || 0,
          createdAt: home.created_at,
          previewImageUrl: home.preview_image_url,
        }));

        console.log('[Homes API] Found', homes.length, 'public homes');
        return { homes, total: count || 0 };
      } catch (error) {
        console.error('[Homes API] Error getting public homes:', error);
        throw error;
      }
    }),

  recordVisit: publicProcedure
    .input(z.object({
      homeId: z.string(),
      visitorId: z.string(),
      visitorName: z.string(),
    }))
    .mutation(async ({ input }) => {
      console.log('[Homes API] Recording visit to home:', input.homeId);

      if (!isSupabaseConfigured) {
        return {
          visitId: `visit_${Date.now()}`,
          homeId: input.homeId,
          visitorId: input.visitorId,
          visitTime: new Date().toISOString(),
        };
      }

      try {
        const { data, error } = await supabase
          .from('home_visitors')
          .insert({
            home_id: input.homeId,
            visitor_id: input.visitorId,
            visitor_name: input.visitorName,
          })
          .select()
          .single();

        if (error) throw error;

        await supabase
          .from('player_homes')
          .update({ total_visits: supabase.rpc('increment_visits') })
          .eq('id', input.homeId);

        console.log('[Homes API] Visit recorded successfully');
        return {
          visitId: data.id,
          homeId: data.home_id,
          visitorId: data.visitor_id,
          visitTime: data.visit_time,
        };
      } catch (error) {
        console.error('[Homes API] Error recording visit:', error);
        throw error;
      }
    }),

  endVisit: publicProcedure
    .input(z.object({
      visitId: z.string(),
      duration: z.number(),
      roomsVisited: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      console.log('[Homes API] Ending visit:', input.visitId);

      if (!isSupabaseConfigured) {
        return { success: true };
      }

      try {
        const { error } = await supabase
          .from('home_visitors')
          .update({
            duration: input.duration,
            rooms_visited: input.roomsVisited,
          })
          .eq('id', input.visitId);

        if (error) throw error;

        console.log('[Homes API] Visit ended successfully');
        return { success: true };
      } catch (error) {
        console.error('[Homes API] Error ending visit:', error);
        throw error;
      }
    }),

  getVisitHistory: publicProcedure
    .input(z.object({
      visitorId: z.string(),
      limit: z.number().optional().default(20),
    }))
    .query(async ({ input }) => {
      console.log('[Homes API] Getting visit history for:', input.visitorId);

      if (!isSupabaseConfigured) {
        return [];
      }

      try {
        const { data, error } = await supabase
          .from('home_visitors')
          .select('*, player_homes!inner(player_id, home_tier)')
          .eq('visitor_id', input.visitorId)
          .order('visit_time', { ascending: false })
          .limit(input.limit);

        if (error) throw error;

        return (data || []).map((visit: any) => ({
          homeId: visit.home_id,
          hostId: visit.player_homes?.player_id,
          hostName: visit.host_name || 'Unknown',
          visitTime: visit.visit_time,
          duration: visit.duration || 0,
          roomsVisited: visit.rooms_visited || [],
        }));
      } catch (error) {
        console.error('[Homes API] Error getting visit history:', error);
        throw error;
      }
    }),
});
