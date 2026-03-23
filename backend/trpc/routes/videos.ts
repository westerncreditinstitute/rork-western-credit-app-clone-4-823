import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { supabase } from "@/lib/supabase";

interface Video {
  id: string;
  courseId: string;
  sectionId: string;
  title: string;
  url: string;
  embedCode: string;
  bunnyVideoId: string;
  bunnyLibraryId: string;
  cloudflareVideoId: string;
  cloudflareAccountId: string;
  duration: string;
  description: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface DbVideo {
  id: string;
  course_id: string;
  section_id: string;
  title: string;
  url: string;
  embed_code: string;
  bunny_video_id: string;
  bunny_library_id: string;
  cloudflare_video_id: string;
  cloudflare_account_id: string;
  duration: string;
  description: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

function dbToVideo(db: DbVideo): Video {
  return {
    id: db.id,
    courseId: db.course_id,
    sectionId: db.section_id,
    title: db.title,
    url: db.url || "",
    embedCode: db.embed_code || "",
    bunnyVideoId: db.bunny_video_id || "",
    bunnyLibraryId: db.bunny_library_id || "",
    cloudflareVideoId: db.cloudflare_video_id || "",
    cloudflareAccountId: db.cloudflare_account_id || "",
    duration: db.duration || "",
    description: db.description || "",
    order: db.order_index,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function videoToDb(video: Partial<Video> & { id?: string }): Partial<DbVideo> {
  const result: Partial<DbVideo> = {};
  
  if (video.id !== undefined) result.id = video.id;
  if (video.courseId !== undefined) result.course_id = video.courseId;
  if (video.sectionId !== undefined) result.section_id = video.sectionId;
  if (video.title !== undefined) result.title = video.title;
  if (video.url !== undefined) result.url = video.url;
  if (video.embedCode !== undefined) result.embed_code = video.embedCode;
  if (video.bunnyVideoId !== undefined) result.bunny_video_id = video.bunnyVideoId;
  if (video.bunnyLibraryId !== undefined) result.bunny_library_id = video.bunnyLibraryId;
  if (video.cloudflareVideoId !== undefined) result.cloudflare_video_id = video.cloudflareVideoId;
  if (video.cloudflareAccountId !== undefined) result.cloudflare_account_id = video.cloudflareAccountId;
  if (video.duration !== undefined) result.duration = video.duration;
  if (video.description !== undefined) result.description = video.description;
  if (video.order !== undefined) result.order_index = video.order;
  
  return result;
}

export const videosRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({
      courseId: z.string().optional(),
      sectionId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      console.log("[Videos] getAll called with:", input);

      let query = supabase
        .from('videos')
        .select('*')
        .order('order_index', { ascending: true });

      if (input.courseId) {
        query = query.eq('course_id', input.courseId);
      }
      if (input.sectionId) {
        query = query.eq('section_id', input.sectionId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("[Videos] Error fetching videos:", error);
        return [];
      }

      const videos = (data || []).map(dbToVideo);
      console.log("[Videos] Returning", videos.length, "videos");
      return videos;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      console.log("[Videos] getById called with:", input.id);

      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', input.id)
        .single();

      if (error) {
        console.error("[Videos] Error fetching video:", error);
        return null;
      }

      const video = data ? dbToVideo(data) : null;
      console.log("[Videos] Found video:", video ? "yes" : "no");
      return video;
    }),

  create: publicProcedure
    .input(z.object({
      courseId: z.string(),
      sectionId: z.string(),
      title: z.string(),
      url: z.string().optional(),
      embedCode: z.string().optional(),
      bunnyVideoId: z.string().optional(),
      bunnyLibraryId: z.string().optional(),
      cloudflareVideoId: z.string().optional(),
      cloudflareAccountId: z.string().optional(),
      duration: z.string().optional(),
      order: z.number(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log("[Videos] create called with:", JSON.stringify(input, null, 2));

      const newVideoData = {
        course_id: input.courseId,
        section_id: input.sectionId,
        title: input.title,
        url: input.url || "",
        embed_code: input.embedCode || "",
        bunny_video_id: input.bunnyVideoId || "",
        bunny_library_id: input.bunnyLibraryId || "",
        cloudflare_video_id: input.cloudflareVideoId || "",
        cloudflare_account_id: input.cloudflareAccountId || "",
        duration: input.duration || "",
        description: input.description || "",
        order_index: input.order,
      };

      const { data, error } = await supabase
        .from('videos')
        .insert(newVideoData)
        .select()
        .single();

      if (error) {
        console.error("[Videos] Error creating video:", error);
        throw new Error(`Failed to create video: ${error.message}`);
      }

      const newVideo = dbToVideo(data);
      console.log("[Videos] Created video:", newVideo.id);
      return newVideo;
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      url: z.string().optional(),
      embedCode: z.string().optional(),
      bunnyVideoId: z.string().optional(),
      bunnyLibraryId: z.string().optional(),
      cloudflareVideoId: z.string().optional(),
      cloudflareAccountId: z.string().optional(),
      duration: z.string().optional(),
      order: z.number().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log("[Videos] update called for:", input.id);

      const { id, ...updates } = input;
      const dbUpdates = videoToDb(updates);

      const { data, error } = await supabase
        .from('videos')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("[Videos] Error updating video:", error);
        throw new Error(`Failed to update video: ${error.message}`);
      }

      const updatedVideo = dbToVideo(data);
      console.log("[Videos] Updated video:", id);
      return updatedVideo;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      console.log("[Videos] delete called for:", input.id);

      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', input.id);

      if (error) {
        console.error("[Videos] Error deleting video:", error);
        throw new Error(`Failed to delete video: ${error.message}`);
      }

      console.log("[Videos] Deleted video:", input.id);
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
      console.log("[Videos] reorder called for", input.videos.length, "videos");

      for (const { id, order } of input.videos) {
        const { error } = await supabase
          .from('videos')
          .update({ order_index: order })
          .eq('id', id);

        if (error) {
          console.error("[Videos] Error reordering video:", id, error);
        }
      }

      console.log("[Videos] Reorder complete");
      return { success: true };
    }),
});
