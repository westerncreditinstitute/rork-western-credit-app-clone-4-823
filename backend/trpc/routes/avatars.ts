import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

interface Avatar {
  id: string;
  courseId: string;
  sectionId: string;
  title: string;
  embedCode: string;
  apiKey: string;
  description: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface AvatarsStore {
  avatars: Avatar[];
}

async function getAvatarsStore(): Promise<AvatarsStore> {
  const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
  const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
  const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

  if (!endpoint || !namespace || !token) {
    console.log("[Avatars] Using empty store - DB not configured");
    return { avatars: [] };
  }

  try {
    const url = `${endpoint}/key/${namespace}/avatars`;
    console.log("[Avatars] Fetching from:", url);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("[Avatars] GET Response status:", response.status);

    if (response.status === 404) {
      console.log("[Avatars] No data found, returning empty store");
      return { avatars: [] };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Avatars] GET Error:", errorText);
      return { avatars: [] };
    }

    const data = await response.json();
    console.log("[Avatars] Fetched data:", JSON.stringify(data).substring(0, 200));
    
    if (data && data.avatars && Array.isArray(data.avatars)) {
      return data as AvatarsStore;
    }
    
    return { avatars: [] };
  } catch (error) {
    console.error("[Avatars] Error fetching store:", error);
    return { avatars: [] };
  }
}

async function saveAvatarsStore(store: AvatarsStore): Promise<boolean> {
  const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
  const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
  const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

  if (!endpoint || !namespace || !token) {
    throw new Error("Database configuration missing");
  }

  const url = `${endpoint}/key/${namespace}/avatars`;
  console.log("[Avatars] Saving to:", url);
  console.log("[Avatars] Data size:", store.avatars.length, "avatars");

  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const body = JSON.stringify(store);

  try {
    // Try PUT first (update existing)
    let response = await fetch(url, {
      method: "PUT",
      headers,
      body,
    });

    console.log("[Avatars] PUT Response status:", response.status);

    // If PUT returns 404, the key doesn't exist yet - try POST to create it
    if (response.status === 404) {
      console.log("[Avatars] Key not found, trying POST to create...");
      response = await fetch(url, {
        method: "POST",
        headers,
        body,
      });
      console.log("[Avatars] POST Response status:", response.status);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Avatars] Save Error:", errorText);
      throw new Error(`Failed to save: ${response.status} - ${errorText}`);
    }

    console.log("[Avatars] Save successful");
    return true;
  } catch (error) {
    console.error("[Avatars] Error saving store:", error);
    throw error;
  }
}

export const avatarsRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({
      courseId: z.string(),
      sectionId: z.string(),
    }))
    .query(async ({ input }) => {
      console.log("[Avatars] getAll called with:", input);
      
      const store = await getAvatarsStore();
      let avatars = store.avatars;

      avatars = avatars.filter(a => a.courseId === input.courseId && a.sectionId === input.sectionId);
      avatars.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      console.log("[Avatars] Returning", avatars.length, "avatars");
      return avatars;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      console.log("[Avatars] getById called with:", input.id);
      
      const store = await getAvatarsStore();
      const avatar = store.avatars.find(a => a.id === input.id);
      
      console.log("[Avatars] Found avatar:", avatar ? "yes" : "no");
      return avatar || null;
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
      
      const store = await getAvatarsStore();
      const now = new Date().toISOString();
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newAvatar: Avatar = {
        id: `avatars_${uniqueId}`,
        courseId: input.courseId,
        sectionId: input.sectionId,
        title: input.title,
        embedCode: input.embedCode,
        apiKey: input.apiKey || "",
        description: input.description || "",
        order: input.order,
        createdAt: now,
        updatedAt: now,
      };

      store.avatars.push(newAvatar);
      await saveAvatarsStore(store);

      console.log("[Avatars] Created avatar:", newAvatar.id);
      return newAvatar;
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
      
      const store = await getAvatarsStore();
      const index = store.avatars.findIndex(a => a.id === input.id);

      if (index === -1) {
        throw new Error("Avatar not found");
      }

      const { id, ...updates } = input;
      store.avatars[index] = {
        ...store.avatars[index],
        ...Object.fromEntries(
          Object.entries(updates).filter(([_, v]) => v !== undefined)
        ),
        updatedAt: new Date().toISOString(),
      };

      await saveAvatarsStore(store);

      console.log("[Avatars] Updated avatar:", id);
      return store.avatars[index];
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      console.log("[Avatars] delete called for:", input.id);
      
      const store = await getAvatarsStore();
      const index = store.avatars.findIndex(a => a.id === input.id);

      if (index === -1) {
        throw new Error("Avatar not found");
      }

      store.avatars.splice(index, 1);
      await saveAvatarsStore(store);

      console.log("[Avatars] Deleted avatar:", input.id);
      return { success: true };
    }),
});
