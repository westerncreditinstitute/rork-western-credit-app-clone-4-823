import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { supabase } from "@/lib/supabase";

interface Document {
  id: string;
  courseId: string;
  sectionId: string;
  title: string;
  url: string;
  embedCode: string;
  type: "pdf" | "form" | "embed" | "link" | "other";
  description: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface DbDocument {
  id: string;
  course_id: string;
  section_id: string;
  title: string;
  url: string;
  embed_code: string;
  type: string;
  description: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

function dbToDocument(db: DbDocument): Document {
  return {
    id: db.id,
    courseId: db.course_id,
    sectionId: db.section_id,
    title: db.title,
    url: db.url || "",
    embedCode: db.embed_code || "",
    type: (db.type as Document["type"]) || "link",
    description: db.description || "",
    order: db.order_index,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function documentToDb(doc: Partial<Document> & { id?: string }): Partial<DbDocument> {
  const result: Partial<DbDocument> = {};
  
  if (doc.id !== undefined) result.id = doc.id;
  if (doc.courseId !== undefined) result.course_id = doc.courseId;
  if (doc.sectionId !== undefined) result.section_id = doc.sectionId;
  if (doc.title !== undefined) result.title = doc.title;
  if (doc.url !== undefined) result.url = doc.url;
  if (doc.embedCode !== undefined) result.embed_code = doc.embedCode;
  if (doc.type !== undefined) result.type = doc.type;
  if (doc.description !== undefined) result.description = doc.description;
  if (doc.order !== undefined) result.order_index = doc.order;
  
  return result;
}

export const documentsRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({
      courseId: z.string().optional(),
      sectionId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      console.log("[Documents] getAll called with:", input);

      let query = supabase
        .from('documents')
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
        console.error("[Documents] Error fetching documents:", error);
        return [];
      }

      const documents = (data || []).map(dbToDocument);
      console.log("[Documents] Returning", documents.length, "documents");
      return documents;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      console.log("[Documents] getById called with:", input.id);

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', input.id)
        .single();

      if (error) {
        console.error("[Documents] Error fetching document:", error);
        return null;
      }

      const document = data ? dbToDocument(data) : null;
      console.log("[Documents] Found document:", document ? "yes" : "no");
      return document;
    }),

  create: publicProcedure
    .input(z.object({
      courseId: z.string(),
      sectionId: z.string(),
      title: z.string(),
      url: z.string().optional().default(""),
      embedCode: z.string().optional().default(""),
      type: z.enum(["pdf", "form", "embed", "link", "other"]),
      description: z.string().optional().default(""),
      order: z.number(),
    }))
    .mutation(async ({ input }) => {
      console.log("[Documents] create called with:", JSON.stringify(input, null, 2));

      const newDocData = {
        course_id: input.courseId,
        section_id: input.sectionId,
        title: input.title,
        url: input.url || "",
        embed_code: input.embedCode || "",
        type: input.type,
        description: input.description || "",
        order_index: input.order,
      };

      const { data, error } = await supabase
        .from('documents')
        .insert(newDocData)
        .select()
        .single();

      if (error) {
        console.error("[Documents] Error creating document:", error);
        throw new Error(`Failed to create document: ${error.message}`);
      }

      const newDocument = dbToDocument(data);
      console.log("[Documents] Created document:", newDocument.id);
      return newDocument;
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      url: z.string().optional(),
      embedCode: z.string().optional(),
      type: z.enum(["pdf", "form", "embed", "link", "other"]).optional(),
      description: z.string().optional(),
      order: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log("[Documents] update called for:", input.id);

      const { id, ...updates } = input;
      const dbUpdates = documentToDb(updates);

      const { data, error } = await supabase
        .from('documents')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("[Documents] Error updating document:", error);
        throw new Error(`Failed to update document: ${error.message}`);
      }

      const updatedDocument = dbToDocument(data);
      console.log("[Documents] Updated document:", id);
      return updatedDocument;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      console.log("[Documents] delete called for:", input.id);

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', input.id);

      if (error) {
        console.error("[Documents] Error deleting document:", error);
        throw new Error(`Failed to delete document: ${error.message}`);
      }

      console.log("[Documents] Deleted document:", input.id);
      return { success: true };
    }),
});
