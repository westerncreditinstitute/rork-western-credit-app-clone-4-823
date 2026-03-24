import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

export const videoNotesRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({
      userId: z.string(),
      videoId: z.string(),
    }))
    .query(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const response = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `SELECT * FROM video_notes WHERE userId = '${input.userId}' AND videoId = '${input.videoId}' ORDER BY timestamp ASC`,
        }),
      });

      if (!response.ok) {
        console.error("Database error:", await response.text());
        return [];
      }

      const data = await response.json();
      return data[0]?.result || [];
    }),

  getAllForCourse: publicProcedure
    .input(z.object({
      userId: z.string(),
      courseId: z.string(),
    }))
    .query(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const response = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `SELECT * FROM video_notes WHERE userId = '${input.userId}' AND courseId = '${input.courseId}' ORDER BY createdAt DESC`,
        }),
      });

      if (!response.ok) {
        console.error("Database error:", await response.text());
        return [];
      }

      const data = await response.json();
      return data[0]?.result || [];
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
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = new Date().toISOString();
      const id = `video_notes:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const note = {
        id,
        userId: input.userId,
        videoId: input.videoId,
        courseId: input.courseId,
        sectionId: input.sectionId,
        content: input.content,
        timestamp: input.timestamp || 0,
        videoTitle: input.videoTitle || "",
        createdAt: now,
        updatedAt: now,
      };

      const response = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `CREATE ${id} CONTENT ${JSON.stringify(note)}`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Database error:", errorText);
        throw new Error(`Failed to create note: ${response.status}`);
      }

      const data = await response.json();
      return data[0]?.result?.[0] || note;
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      content: z.string(),
    }))
    .mutation(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = new Date().toISOString();

      const response = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `UPDATE ${input.id} SET content = ${JSON.stringify(input.content)}, updatedAt = '${now}'`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update note");
      }

      const data = await response.json();
      return data[0]?.result?.[0] || { success: true };
    }),

  delete: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const response = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `DELETE ${input.id}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete note");
      }

      return { success: true };
    }),
});
