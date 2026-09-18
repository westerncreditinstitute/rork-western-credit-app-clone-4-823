import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
// Replaces the old SurrealDB HTTP key-value store client
// (process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT), which no longer exists after
// the Railway migration. Backed by the new `section_avatars` Supabase table
// (see migrations/029_providers_avatars_muso_supabase.sql).
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

interface DbAvatar {
  id: string;
  course_id: string;
  section_id: string;
  title: string;
  embed_code: string | null;
  api_key: string | null;
  description: string | null;
  order_index: number | null;
  created_at: string;
  updated_at: string;
}

function dbToAvatar(db: DbAvatar) {
  return {
    id: db.id,
    courseId: db.course_id,
    sectionId: db.section_id,
    title: db.title,
    embedCode: db.embed_code ?? "",
    apiKey: db.api_key ?? "",
    description: db.description ?? "",
    order: db.order_index ?? 0,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export const avatarsRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({
      courseId: z.string(),
      sectionId: z.string(),
    }))
    .query(async ({ input }) => {
      console.log("[Avatars] getAll called with:", input);

      const { data, error } = await supabase
        .from("section_avatars")
        .select("*")
        .eq("course_id", input.courseId)
        .eq("section_id", input.sectionId)
        .order("order_index", { ascending: true });

      if (error) {
        console.error("[Avatars] getAll error:", error);
        throw new Error(`Failed to fetch avatars: ${error.message}`);
      }

      const avatars = ((data ?? []) as DbAvatar[]).map(dbToAvatar);
      console.log("[Avatars] Returning", avatars.length, "avatars");
      return avatars;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      console.log("[Avatars] getById called with:", input.id);

      const { data, error } = await supabase
        .from("section_avatars")
        .select("*")
        .eq("id", input.id)
        .maybeSingle();

      if (error) {
        console.error("[Avatars] getById error:", error);
        throw new Error(`Failed to fetch avatar: ${error.message}`);
      }

      console.log("[Avatars] Found avatar:", data ? "yes" : "no");
      return data ? dbToAvatar(data as DbAvatar) : null;
    }),

  create: publicProcedure
    .input(z.object({
      courseId: z.string(),
      sectionId: z.string(),
      title: z.string(),
      embedCode: z.string(),
      apiKey: z.string().optional(),
      description: z.string().optional(),
      order: z.number(),
    }))
    .mutation(async ({ input }) => {
      console.log("[Avatars] create called with:", JSON.stringify(input, null, 2));

      const { data, error } = await supabase
        .from("section_avatars")
        .insert({
          course_id: input.courseId,
          section_id: input.sectionId,
          title: input.title,
          embed_code: input.embedCode,
          api_key: input.apiKey ?? "",
          description: input.description ?? "",
          order_index: input.order,
        })
        .select()
        .single();

      if (error) {
        console.error("[Avatars] create error:", error);
        throw new Error(`Failed to create avatar: ${error.message}`);
      }

      console.log("[Avatars] Created avatar:", data.id);
      return dbToAvatar(data as DbAvatar);
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      embedCode: z.string().optional(),
      apiKey: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log("[Avatars] update called for:", input.id);

      const updatePayload: Record<string, unknown> = {};
      if (input.title !== undefined) updatePayload.title = input.title;
      if (input.embedCode !== undefined) updatePayload.embed_code = input.embedCode;
      if (input.apiKey !== undefined) updatePayload.api_key = input.apiKey;
      if (input.description !== undefined) updatePayload.description = input.description;

      const { data, error } = await supabase
        .from("section_avatars")
        .update(updatePayload)
        .eq("id", input.id)
        .select()
        .maybeSingle();

      if (error) {
        console.error("[Avatars] update error:", error);
        throw new Error(`Failed to update avatar: ${error.message}`);
      }

      if (!data) {
        throw new Error("Avatar not found");
      }

      console.log("[Avatars] Updated avatar:", input.id);
      return dbToAvatar(data as DbAvatar);
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      console.log("[Avatars] delete called for:", input.id);

      const { data, error } = await supabase
        .from("section_avatars")
        .delete()
        .eq("id", input.id)
        .select()
        .maybeSingle();

      if (error) {
        console.error("[Avatars] delete error:", error);
        throw new Error(`Failed to delete avatar: ${error.message}`);
      }

      if (!data) {
        throw new Error("Avatar not found");
      }

      console.log("[Avatars] Deleted avatar:", input.id);
      return { success: true };
    }),
});
