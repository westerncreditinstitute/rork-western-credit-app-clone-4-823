import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { supabase } from "@/lib/supabase";

type VideoType = "youtube" | "heygen";

interface FeaturedVideo {
  id: string;
  videoType: VideoType;
  youtubeId: string;
  heygenEmbedId: string;
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
  video_type?: string | null;
  youtube_id?: string | null;
  heygen_embed_id?: string | null;
  title: string;
  duration: string;
  description: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** The embed shipped with the app, used until an admin configures one. */
const DEFAULT_HEYGEN_EMBED_ID = "92770d6dd5164282bbeabb6a890f3f41";

function dbToFeaturedVideo(db: DbFeaturedVideo): FeaturedVideo {
  const heygenEmbedId = db.heygen_embed_id ?? "";
  const rawType = db.video_type ?? "";
  const videoType: VideoType =
    rawType === "heygen" || rawType === "youtube"
      ? rawType
      : heygenEmbedId
        ? "heygen"
        : "youtube";

  return {
    id: db.id,
    videoType,
    youtubeId: db.youtube_id ?? "",
    heygenEmbedId,
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
  {
    id: "default-heygen",
    videoType: "heygen",
    youtubeId: "",
    heygenEmbedId: DEFAULT_HEYGEN_EMBED_ID,
    title: "Welcome to Western Credit Institute",
    duration: "",
    description: "Featured AI video shown in the Videos section on the home page.",
    order: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Turns a Supabase write failure into something an admin can act on. The
 * HeyGen columns only exist after migration 026 has been applied.
 */
function describeWriteError(message: string): string {
  const isMissingColumn =
    /column .* does not exist/i.test(message) ||
    message.includes("heygen_embed_id") ||
    message.includes("video_type");

  if (isMissingColumn) {
    return "The featured_videos table is missing the HeyGen columns. Run migration 026_heygen_featured_videos.sql in Supabase, then try again.";
  }
  return message;
}

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

  /**
   * The single HeyGen video rendered in the home page "Videos" section:
   * the lowest-ordered active HeyGen record, or the bundled default.
   */
  getHomeVideo: publicProcedure.query(async () => {
    try {
      const { data, error } = await supabase
        .from('featured_videos')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.log("[FeaturedVideos] getHomeVideo falling back to default:", error.message);
        return DEFAULT_FEATURED_VIDEOS[0];
      }

      const heygen = (data ?? [])
        .map(dbToFeaturedVideo)
        .find((video) => video.videoType === "heygen" && video.heygenEmbedId.length > 0);

      return heygen ?? DEFAULT_FEATURED_VIDEOS[0];
    } catch (err) {
      console.log("[FeaturedVideos] getHomeVideo error, returning default:", err);
      return DEFAULT_FEATURED_VIDEOS[0];
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
      videoType: z.enum(["youtube", "heygen"]).optional().default("heygen"),
      youtubeId: z.string().optional().default(""),
      heygenEmbedId: z.string().optional().default(""),
      title: z.string(),
      duration: z.string().optional(),
      description: z.string().optional(),
      order: z.number(),
      isActive: z.boolean().optional().default(true),
    }))
    .mutation(async ({ input }) => {
      console.log("[FeaturedVideos] create called for type:", input.videoType);

      const newVideoData = {
        video_type: input.videoType,
        youtube_id: input.youtubeId,
        heygen_embed_id: input.heygenEmbedId,
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
        throw new Error(`Failed to create featured video: ${describeWriteError(error.message)}`);
      }

      const newVideo = dbToFeaturedVideo(data);
      console.log("[FeaturedVideos] Created video:", newVideo.id);
      return newVideo;
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      videoType: z.enum(["youtube", "heygen"]).optional(),
      youtubeId: z.string().optional(),
      heygenEmbedId: z.string().optional(),
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

      if (updates.videoType !== undefined) dbUpdates.video_type = updates.videoType;
      if (updates.youtubeId !== undefined) dbUpdates.youtube_id = updates.youtubeId;
      if (updates.heygenEmbedId !== undefined) dbUpdates.heygen_embed_id = updates.heygenEmbedId;
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
        throw new Error(`Failed to update featured video: ${describeWriteError(error.message)}`);
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
