import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
// Replaces the old SurrealDB HTTP client (process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT),
// which no longer exists after the Railway migration. Backed by the
// pre-existing `video_notes` Supabase table.
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

interface DbVideoNote {
  id: string;
  user_id: string;
  video_id: string;
  timestamp: number;
  content: string;
  created_at: string;
  updated_at: string;
}

// The `video_notes` table (per supabase-schema.sql) doesn't have courseId,
// sectionId, or videoTitle columns - those were only ever used to render the
// notes list without a second round trip against `videos`. We keep serving
// them by joining against `videos` here so the client shape is unchanged.
interface DbVideo {
  id: string;
  course_id: string;
  section_id: string;
  title: string;
}

function dbToNote(db: DbVideoNote, video?: DbVideo) {
  return {
    id: db.id,
    userId: db.user_id,
    videoId: db.video_id,
    courseId: video?.course_id ?? "",
    sectionId: video?.section_id ?? "",
    content: db.content,
    timestamp: db.timestamp ?? 0,
    videoTitle: video?.title ?? "",
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export const videoNotesRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({
      userId: z.string(),
      videoId: z.string(),
    }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("video_notes")
        .select("*")
        .eq("user_id", input.userId)
        .eq("video_id", input.videoId)
        .order("timestamp", { ascending: true });

      if (error) {
        console.error("[VideoNotes] getAll error:", error);
        return [];
      }

      const notes = (data || []) as DbVideoNote[];
      if (notes.length === 0) return [];

      const { data: video } = await supabase
        .from("videos")
        .select("id, course_id, section_id, title")
        .eq("id", input.videoId)
        .maybeSingle();

      return notes.map((n) => dbToNote(n, video as DbVideo | undefined));
    }),

  getAllForCourse: publicProcedure
    .input(z.object({
      userId: z.string(),
      courseId: z.string(),
    }))
    .query(async ({ input }) => {
      const { data: videos, error: videosError } = await supabase
        .from("videos")
        .select("id, course_id, section_id, title")
        .eq("course_id", input.courseId);

      if (videosError) {
        console.error("[VideoNotes] getAllForCourse videos error:", videosError);
        return [];
      }

      const videoList = (videos || []) as DbVideo[];
      const videoIds = videoList.map((v) => v.id);
      if (videoIds.length === 0) return [];

      const { data: notes, error: notesError } = await supabase
        .from("video_notes")
        .select("*")
        .eq("user_id", input.userId)
        .in("video_id", videoIds)
        .order("created_at", { ascending: false });

      if (notesError) {
        console.error("[VideoNotes] getAllForCourse notes error:", notesError);
        return [];
      }

      const videoMap = new Map(videoList.map((v) => [v.id, v]));
      return ((notes || []) as DbVideoNote[]).map((n) =>
        dbToNote(n, videoMap.get(n.video_id))
      );
    }),

  create: publicProcedure
    .input(z.object({
      userId: z.string(),
      videoId: z.string(),
      courseId: z.string(),
      sectionId: z.string(),
      content: z.string(),
      timestamp: z.number().optional(),
      videoTitle: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { data, error } = await supabase
        .from("video_notes")
        .insert({
          user_id: input.userId,
          video_id: input.videoId,
          timestamp: input.timestamp || 0,
          content: input.content,
        })
        .select()
        .single();

      if (error) {
        console.error("[VideoNotes] create error:", error);
        throw new Error(`Failed to create note: ${error.message}`);
      }

      return dbToNote(data as DbVideoNote, {
        id: input.videoId,
        course_id: input.courseId,
        section_id: input.sectionId,
        title: input.videoTitle || "",
      });
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      content: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { data, error } = await supabase
        .from("video_notes")
        .update({ content: input.content })
        .eq("id", input.id)
        .select()
        .single();

      if (error) {
        console.error("[VideoNotes] update error:", error);
        throw new Error("Failed to update note");
      }

      return dbToNote(data as DbVideoNote);
    }),

  delete: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { error } = await supabase
        .from("video_notes")
        .delete()
        .eq("id", input.id);

      if (error) {
        console.error("[VideoNotes] delete error:", error);
        throw new Error("Failed to delete note");
      }

      return { success: true };
    }),
});
