import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { supabase } from "@/lib/supabase";

interface FeaturedVideo {
  id: string;
  youtubeId: string;
  title: string;
  duration: string;
  description: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DbFeaturedVideo {
  id: string;
  youtube_id: string;
  title: string;
  duration: string;
  description: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function dbToFeaturedVideo(db: DbFeaturedVideo): FeaturedVideo {
  return {
    id: db.id,
    youtubeId: db.youtube_id,
    title: db.title,
    duration: db.duration || "",
    description: db.description || "",
    order: db.order_index,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

const DEFAULT_FEATURED_VIDEOS: FeaturedVideo[] = [
  { id: "1", youtubeId: "dQw4w9WgXcQ", title: "Getting Started with Credit Repair", duration: "5:32", description: "", order: 0, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "2", youtubeId: "9bZkp7q19f0", title: "Understanding Credit Scores", duration: "8:15", description: "", order: 1, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "3", youtubeId: "kJQP7kiw5Fk", title: "Dispute Letter Basics", duration: "6:48", description: "", order: 2, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "4", youtubeId: "RgKAFK5djSk", title: "Building Business Credit", duration: "10:22", description: "", order: 3, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export const featuredVideosRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({
      activeOnly: z.boolean().optional().default(true),
    }).optional())
    .query(async ({ input }) => {
      console.log("[FeaturedVideos] getAll called");

      try {
        let query = supabase
          .from('featured_videos')
          .select('*')
          .order('order_index', { ascending: true });

        if (input?.activeOnly !== false) {
          query = query.eq('is_active', true);
        }

        const { data, error } = await query;

        if (error) {
          console.log("[FeaturedVideos] Table may not exist, returning defaults:", error.message);
          return DEFAULT_FEATURED_VIDEOS;
        }

        if (!data || data.length === 0) {
          console.log("[FeaturedVideos] No videos found, returning defaults");
          return DEFAULT_FEATURED_VIDEOS;
        }

        const videos = data.map(dbToFeaturedVideo);
        console.log("[FeaturedVideos] Returning", videos.length, "videos");
        return videos;
      } catch (err) {
        console.log("[FeaturedVideos] Error, returning defaults:", err);
        return DEFAULT_FEATURED_VIDEOS;
      }
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      console.log("[FeaturedVideos] getById called with:", input.id);

      try {
        const { data, error } = await supabase
          .from('featured_videos')
          .select('*')
          .eq('id', input.id)
          .single();

        if (error) {
          console.error("[FeaturedVideos] Error fetching video:", error);
          return null;
        }

        return data ? dbToFeaturedVideo(data) : null;
      } catch (err) {
        console.error("[FeaturedVideos] Error:", err);
        return null;
      }
    }),

  create: publicProcedure
    .input(z.object({
      youtubeId: z.string(),
      title: z.string(),
      duration: z.string().optional(),
      description: z.string().optional(),
      order: z.number(),
      isActive: z.boolean().optional().default(true),
    }))
    .mutation(async ({ input }) => {
      console.log("[FeaturedVideos] create called with:", input);

      const newVideoData = {
        youtube_id: input.youtubeId,
        title: input.title,
        duration: input.duration || "",
        description: input.description || "",
        order_index: input.order,
        is_active: input.isActive,
      };

      const { data, error } = await supabase
        .from('featured_videos')
        .insert(newVideoData)
        .select()
        .single();

      if (error) {
        console.error("[FeaturedVideos] Error creating video:", error);
        throw new Error(`Failed to create featured video: ${error.message}`);
      }

      const newVideo = dbToFeaturedVideo(data);
      console.log("[FeaturedVideos] Created video:", newVideo.id);
      return newVideo;
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      youtubeId: z.string().optional(),
      title: z.string().optional(),
      duration: z.string().optional(),
      description: z.string().optional(),
      order: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log("[FeaturedVideos] update called for:", input.id);

      const { id, ...updates } = input;
      const dbUpdates: Partial<DbFeaturedVideo> = {};

      if (updates.youtubeId !== undefined) dbUpdates.youtube_id = updates.youtubeId;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.order !== undefined) dbUpdates.order_index = updates.order;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

      const { data, error } = await supabase
        .from('featured_videos')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("[FeaturedVideos] Error updating video:", error);
        throw new Error(`Failed to update featured video: ${error.message}`);
      }

      const updatedVideo = dbToFeaturedVideo(data);
      console.log("[FeaturedVideos] Updated video:", id);
      return updatedVideo;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      console.log("[FeaturedVideos] delete called for:", input.id);

      const { error } = await supabase
        .from('featured_videos')
        .delete()
        .eq('id', input.id);

      if (error) {
        console.error("[FeaturedVideos] Error deleting video:", error);
        throw new Error(`Failed to delete featured video: ${error.message}`);
      }

      console.log("[FeaturedVideos] Deleted video:", input.id);
      return { success: true };
    }),

  reorder: publicProcedure
    .input(z.object({
      videos: z.array(z.object({
        id: z.string(),
        order: z.number(),
      })),
    }))
    .mutation(async ({ input }) => {
      console.log("[FeaturedVideos] reorder called for", input.videos.length, "videos");

      for (const { id, order } of input.videos) {
        const { error } = await supabase
          .from('featured_videos')
          .update({ order_index: order })
          .eq('id', id);

        if (error) {
          console.error("[FeaturedVideos] Error reordering video:", id, error);
        }
      }

      console.log("[FeaturedVideos] Reorder complete");
      return { success: true };
    }),
});
