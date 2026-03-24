import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

const BUNNY_API_BASE = "https://video.bunnycdn.com";

function generateBunnyToken(
  libraryId: string,
  videoId: string,
  expirationTime: number,
  apiKey: string
): string {
  const hashableBase = `${apiKey}${videoId}${expirationTime}`;
  
  let hash = 0;
  for (let i = 0; i < hashableBase.length; i++) {
    const char = hashableBase.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const token = Math.abs(hash).toString(16) + expirationTime.toString(16);
  return token;
}

async function makeBunnyRequest(
  endpoint: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: any; error?: string }> {
  const url = `${BUNNY_API_BASE}${endpoint}`;
  console.log(`[Bunny API] ${options.method || 'GET'} ${url}`);
  console.log(`[Bunny API] API Key length: ${apiKey?.length}, preview: ${apiKey?.substring(0, 12)}...${apiKey?.substring(apiKey.length - 8)}`);
  
  const headers: Record<string, string> = {
    "AccessKey": apiKey,
    "accept": "application/json",
  };
  
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }
  
  console.log(`[Bunny API] Request headers:`, JSON.stringify(headers, null, 2));
  if (options.body) {
    console.log(`[Bunny API] Request body:`, options.body);
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    const responseText = await response.text();
    console.log(`[Bunny API] Response status: ${response.status}`);
    console.log(`[Bunny API] Response body: ${responseText.substring(0, 500)}`);

    let data;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      data = { rawResponse: responseText };
    }

    if (!response.ok) {
      let errorMessage = `Bunny API error (${response.status})`;
      
      if (response.status === 401) {
        errorMessage = "Invalid API key. Make sure you're using the Stream Library API key from your Bunny.net video library settings (not the main account API key).";
      } else if (response.status === 404) {
        errorMessage = "Library not found. Please verify your Library ID in the Bunny.net Stream dashboard.";
      } else if (response.status === 403) {
        errorMessage = "Access forbidden. The API key may not have permission for this library.";
      } else if (data?.Message) {
        errorMessage = data.Message;
      } else if (data?.message) {
        errorMessage = data.message;
      }

      return { ok: false, status: response.status, data, error: errorMessage };
    }

    return { ok: true, status: response.status, data };
  } catch (error) {
    console.error("[Bunny API] Network error:", error);
    return { 
      ok: false, 
      status: 0, 
      data: null, 
      error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

export const bunnyRouter = createTRPCRouter({
  testConnection: publicProcedure
    .input(z.object({
      libraryId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const apiKey = process.env.BUNNY_STREAM_API_KEY;
      const libraryId = input.libraryId;

      console.log("[Bunny Test] Testing connection...");
      console.log("[Bunny Test] Library ID provided:", libraryId);
      console.log("[Bunny Test] API Key configured:", !!apiKey);
      console.log("[Bunny Test] API Key length:", apiKey?.length || 0);
      console.log("[Bunny Test] API Key preview:", apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : "N/A");

      if (!libraryId) {
        return {
          success: false,
          error: "Library ID is required. Please enter your Bunny Stream Library ID.",
          details: {
            libraryId: null,
            apiKeyConfigured: !!apiKey,
          },
        };
      }

      if (!apiKey) {
        return {
          success: false,
          error: "BUNNY_STREAM_API_KEY environment variable is not set",
          details: {
            libraryId,
            apiKeyConfigured: false,
          },
        };
      }

      const result = await makeBunnyRequest(
        `/library/${libraryId}/videos?page=1&itemsPerPage=1`,
        apiKey
      );

      return {
        success: result.ok,
        error: result.error || null,
        details: {
          libraryId,
          apiKeyConfigured: true,
          apiKeyLength: apiKey.length,
          httpStatus: result.status,
          videoCount: result.ok ? (result.data?.totalItems || 0) : null,
        },
      };
    }),

  getSignedUrl: publicProcedure
    .input(z.object({
      videoId: z.string(),
      libraryId: z.string(),
    }))
    .query(async ({ input }) => {
      const apiKey = process.env.BUNNY_STREAM_API_KEY;
      const libraryId = input.libraryId;
      
      if (!libraryId) {
        throw new Error("Library ID is required");
      }
      
      if (!apiKey) {
        console.log("Bunny API key not configured, returning direct URL");
        return {
          embedUrl: `https://iframe.mediadelivery.net/embed/${libraryId}/${input.videoId}`,
          directUrl: `https://iframe.mediadelivery.net/play/${libraryId}/${input.videoId}`,
          expiresAt: null,
        };
      }

      const expirationTime = Math.floor(Date.now() / 1000) + 3600;
      
      const token = generateBunnyToken(
        libraryId,
        input.videoId,
        expirationTime,
        apiKey
      );

      const embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${input.videoId}?token=${token}&expires=${expirationTime}`;
      const directUrl = `https://iframe.mediadelivery.net/play/${libraryId}/${input.videoId}?token=${token}&expires=${expirationTime}`;

      return {
        embedUrl,
        directUrl,
        expiresAt: expirationTime * 1000,
      };
    }),

  getVideoInfo: publicProcedure
    .input(z.object({
      videoId: z.string(),
      libraryId: z.string(),
    }))
    .query(async ({ input }) => {
      const apiKey = process.env.BUNNY_STREAM_API_KEY;
      const libraryId = input.libraryId;
      
      if (!libraryId) {
        return {
          title: "Video",
          length: 0,
          status: "error",
          thumbnailUrl: null,
          error: "Library ID is required",
        };
      }
      
      if (!apiKey) {
        return {
          title: "Video",
          length: 0,
          status: "unknown",
          thumbnailUrl: null,
        };
      }

      try {
        const response = await fetch(
          `https://video.bunnycdn.com/library/${libraryId}/videos/${input.videoId}`,
          {
            headers: {
              "AccessKey": apiKey,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          console.error("Failed to fetch video info:", response.status);
          return {
            title: "Video",
            length: 0,
            status: "unknown",
            thumbnailUrl: null,
          };
        }

        const data = await response.json();
        
        return {
          title: data.title || "Video",
          length: data.length || 0,
          status: data.status === 4 ? "ready" : "processing",
          thumbnailUrl: data.thumbnailFileName 
            ? `https://vz-${libraryId}.b-cdn.net/${input.videoId}/${data.thumbnailFileName}`
            : null,
        };
      } catch (error) {
        console.error("Error fetching video info:", error);
        return {
          title: "Video",
          length: 0,
          status: "error",
          thumbnailUrl: null,
        };
      }
    }),

  createVideo: publicProcedure
    .input(z.object({
      title: z.string(),
      libraryId: z.string(),
      collectionId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const apiKey = process.env.BUNNY_STREAM_API_KEY;
      const libraryId = input.libraryId;
      
      console.log("[Bunny Create] ========================");
      console.log("[Bunny Create] Creating video:", input.title);
      console.log("[Bunny Create] Library ID:", libraryId);
      console.log("[Bunny Create] API Key exists:", !!apiKey);
      console.log("[Bunny Create] API Key length:", apiKey?.length || 0);
      
      if (!libraryId) {
        throw new Error("Library ID is required. Please enter your Bunny Stream Library ID.");
      }
      
      if (!apiKey) {
        throw new Error("BUNNY_STREAM_API_KEY environment variable is not configured. Please add it in your project's environment variables.");
      }
      
      if (apiKey.length < 30) {
        console.log("[Bunny Create] WARNING: API key seems too short. Expected ~44 characters.");
      }

      const body: { title: string; collectionId?: string } = { title: input.title };
      if (input.collectionId) {
        body.collectionId = input.collectionId;
      }

      console.log("[Bunny Create] Making request to:", `${BUNNY_API_BASE}/library/${libraryId}/videos`);
      
      const result = await makeBunnyRequest(
        `/library/${libraryId}/videos`,
        apiKey,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );

      console.log("[Bunny Create] Response:", JSON.stringify(result, null, 2));

      if (!result.ok) {
        const errorMsg = result.error || "Failed to create video in Bunny";
        console.log("[Bunny Create] Error:", errorMsg);
        throw new Error(errorMsg);
      }

      console.log("[Bunny Create] Success! Video ID:", result.data.guid);
      
      return {
        videoId: result.data.guid,
        libraryId: libraryId,
        title: result.data.title,
        tusUploadUrl: `${BUNNY_API_BASE}/tusupload`,
        directUploadUrl: `${BUNNY_API_BASE}/library/${libraryId}/videos/${result.data.guid}`,
      };
    }),

  getUploadUrl: publicProcedure
    .input(z.object({
      videoId: z.string(),
      libraryId: z.string(),
    }))
    .query(async ({ input }) => {
      const apiKey = process.env.BUNNY_STREAM_API_KEY;
      const libraryId = input.libraryId;
      
      if (!libraryId) {
        throw new Error("Library ID is required");
      }
      
      if (!apiKey) {
        throw new Error("Bunny Stream API key is not configured");
      }

      const expirationTime = Math.floor(Date.now() / 1000) + 3600;

      return {
        tusEndpoint: "https://video.bunnycdn.com/tusupload",
        libraryId,
        videoId: input.videoId,
        apiKey,
        expiresAt: expirationTime * 1000,
        headers: {
          "AuthorizationSignature": apiKey,
          "AuthorizationExpire": expirationTime.toString(),
          "VideoId": input.videoId,
          "LibraryId": libraryId,
        },
      };
    }),

  deleteVideo: publicProcedure
    .input(z.object({
      videoId: z.string(),
      libraryId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const apiKey = process.env.BUNNY_STREAM_API_KEY;
      const libraryId = input.libraryId;
      
      if (!libraryId) {
        throw new Error("Library ID is required");
      }
      
      if (!apiKey) {
        throw new Error("Bunny Stream API key is not configured");
      }

      try {
        const response = await fetch(
          `https://video.bunnycdn.com/library/${libraryId}/videos/${input.videoId}`,
          {
            method: "DELETE",
            headers: {
              "AccessKey": apiKey,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to delete video from Bunny:", response.status, errorText);
          throw new Error(`Failed to delete video: ${response.status}`);
        }

        return { success: true };
      } catch (error) {
        console.error("Error deleting video from Bunny:", error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Failed to delete video from Bunny");
      }
    }),

  listVideos: publicProcedure
    .input(z.object({
      libraryId: z.string(),
      page: z.number().optional().default(1),
      itemsPerPage: z.number().optional().default(100),
    }))
    .query(async ({ input }) => {
      const apiKey = process.env.BUNNY_STREAM_API_KEY;
      const libraryId = input.libraryId;
      
      console.log("[Bunny List] ========================");
      console.log("[Bunny List] Library ID provided:", libraryId);
      
      if (!libraryId) {
        console.log("[Bunny List] ERROR: No library ID provided");
        throw new Error("Library ID is required. Please enter your Bunny Stream Library ID.");
      }
      
      console.log("[Bunny List] Listing videos for library:", libraryId);
      console.log("[Bunny List] API Key configured:", !!apiKey);
      console.log("[Bunny List] API Key length:", apiKey?.length || 0);
      console.log("[Bunny List] Page:", input.page, "Items per page:", input.itemsPerPage);
      
      if (!apiKey) {
        console.log("[Bunny List] ERROR: No API key configured");
        throw new Error("BUNNY_STREAM_API_KEY environment variable is not configured. Please add it in your project settings.");
      }

      const endpoint = `/library/${libraryId}/videos?page=${input.page}&itemsPerPage=${input.itemsPerPage}`;
      console.log("[Bunny List] Calling endpoint:", endpoint);

      const result = await makeBunnyRequest(endpoint, apiKey);

      console.log("[Bunny List] Response OK:", result.ok);
      console.log("[Bunny List] Response status:", result.status);
      
      if (!result.ok) {
        console.log("[Bunny List] ERROR:", result.error);
        console.log("[Bunny List] Response data:", JSON.stringify(result.data, null, 2));
        throw new Error(result.error || "Failed to fetch videos from Bunny");
      }

      console.log("[Bunny List] Raw response data type:", typeof result.data);
      console.log("[Bunny List] Raw response data:", JSON.stringify(result.data, null, 2).substring(0, 1000));
      console.log("[Bunny List] Has items property:", !!result.data?.items);
      console.log("[Bunny List] Is array:", Array.isArray(result.data));

      let videoItems: any[] = [];
      let totalItems = 0;
      let currentPage = input.page;

      if (Array.isArray(result.data)) {
        console.log("[Bunny List] Response is direct array");
        videoItems = result.data;
        totalItems = result.data.length;
      } else if (result.data?.items && Array.isArray(result.data.items)) {
        console.log("[Bunny List] Response has items array");
        videoItems = result.data.items;
        totalItems = result.data.totalItems || videoItems.length;
        currentPage = result.data.currentPage || input.page;
      } else if (result.data && typeof result.data === 'object') {
        console.log("[Bunny List] Response is object, checking for video properties");
        const keys = Object.keys(result.data);
        console.log("[Bunny List] Response keys:", keys.join(', '));
        
        if (result.data.guid) {
          console.log("[Bunny List] Single video response detected");
          videoItems = [result.data];
          totalItems = 1;
        } else {
          console.log("[Bunny List] Unknown response structure");
        }
      }

      console.log("[Bunny List] Processing", videoItems.length, "video items");

      const videos = videoItems.map((video: { guid: string; title: string; length: number; status: number; thumbnailFileName?: string }) => {
        console.log("[Bunny List] Processing video:", video.guid, video.title);
        return {
          videoId: video.guid,
          title: video.title || 'Untitled',
          length: video.length || 0,
          status: video.status === 4 ? "ready" : "processing",
          thumbnailUrl: video.thumbnailFileName 
            ? `https://vz-${libraryId}.b-cdn.net/${video.guid}/${video.thumbnailFileName}`
            : null,
        };
      });
      
      console.log("[Bunny List] Successfully processed", videos.length, "videos");
      console.log("[Bunny List] Total items:", totalItems);
      
      return {
        videos,
        totalItems,
        currentPage,
      };
    }),
});
