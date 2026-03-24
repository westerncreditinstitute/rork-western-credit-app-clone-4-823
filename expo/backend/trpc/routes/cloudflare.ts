import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

async function makeCloudflareRequest(
  endpoint: string,
  accountId: string,
  apiToken: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: any; error?: string }> {
  const url = `${CLOUDFLARE_API_BASE}/accounts/${accountId}${endpoint}`;
  console.log(`[Cloudflare API] ${options.method || 'GET'} ${url}`);
  console.log(`[Cloudflare API] API Token length: ${apiToken?.length}, preview: ${apiToken?.substring(0, 8)}...`);

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    const responseText = await response.text();
    console.log(`[Cloudflare API] Response status: ${response.status}`);
    console.log(`[Cloudflare API] Response body: ${responseText.substring(0, 500)}`);

    let data;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      data = { rawResponse: responseText };
    }

    if (!response.ok) {
      let errorMessage = `Cloudflare API error (${response.status})`;

      if (response.status === 401) {
        errorMessage = "Invalid API token. Make sure you're using a valid Cloudflare API token with Stream permissions.";
      } else if (response.status === 403) {
        errorMessage = "Access forbidden. The API token may not have permission for Stream operations.";
      } else if (response.status === 404) {
        errorMessage = "Resource not found. Please verify your Account ID.";
      } else if (data?.errors?.[0]?.message) {
        errorMessage = data.errors[0].message;
      }

      return { ok: false, status: response.status, data, error: errorMessage };
    }

    return { ok: true, status: response.status, data };
  } catch (error) {
    console.error("[Cloudflare API] Network error:", error);
    return {
      ok: false,
      status: 0,
      data: null,
      error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export const cloudflareRouter = createTRPCRouter({
  testConnection: publicProcedure
    .input(z.object({
      accountId: z.string(),
    }))
    .query(async ({ input }) => {
      const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
      const accountId = input.accountId;

      console.log("[Cloudflare Test] Testing connection...");
      console.log("[Cloudflare Test] Account ID:", accountId);
      console.log("[Cloudflare Test] API Token configured:", !!apiToken);

      if (!apiToken) {
        return {
          success: false,
          error: "CLOUDFLARE_STREAM_API_TOKEN environment variable is not set",
          details: {
            accountId,
            apiTokenConfigured: false,
          },
        };
      }

      if (!accountId) {
        return {
          success: false,
          error: "Account ID is required",
          details: {
            accountId: null,
            apiTokenConfigured: true,
          },
        };
      }

      const result = await makeCloudflareRequest(
        "/stream?per_page=1",
        accountId,
        apiToken
      );

      return {
        success: result.ok,
        error: result.error || null,
        details: {
          accountId,
          apiTokenConfigured: true,
          apiTokenLength: apiToken.length,
          httpStatus: result.status,
          videoCount: result.ok ? (result.data?.result?.length || 0) : null,
          totalVideos: result.ok ? (result.data?.total || 0) : null,
        },
      };
    }),

  getSignedUrl: publicProcedure
    .input(z.object({
      videoId: z.string(),
      accountId: z.string(),
    }))
    .query(async ({ input }) => {
      const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

      if (!apiToken) {
        console.log("Cloudflare API token not configured, returning direct URL");
        return {
          embedUrl: `https://customer-${input.accountId}.cloudflarestream.com/${input.videoId}/iframe`,
          directUrl: `https://customer-${input.accountId}.cloudflarestream.com/${input.videoId}/manifest/video.m3u8`,
          thumbnailUrl: `https://customer-${input.accountId}.cloudflarestream.com/${input.videoId}/thumbnails/thumbnail.jpg`,
          expiresAt: null,
        };
      }

      const result = await makeCloudflareRequest(
        `/stream/${input.videoId}/token`,
        input.accountId,
        apiToken,
        {
          method: "POST",
          body: JSON.stringify({
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }
      );

      if (!result.ok) {
        return {
          embedUrl: `https://customer-${input.accountId}.cloudflarestream.com/${input.videoId}/iframe`,
          directUrl: `https://customer-${input.accountId}.cloudflarestream.com/${input.videoId}/manifest/video.m3u8`,
          thumbnailUrl: `https://customer-${input.accountId}.cloudflarestream.com/${input.videoId}/thumbnails/thumbnail.jpg`,
          expiresAt: null,
        };
      }

      const token = result.data?.result?.token;
      const expirationTime = Math.floor(Date.now() / 1000) + 3600;

      return {
        embedUrl: `https://customer-${input.accountId}.cloudflarestream.com/${token}/iframe`,
        directUrl: `https://customer-${input.accountId}.cloudflarestream.com/${token}/manifest/video.m3u8`,
        thumbnailUrl: `https://customer-${input.accountId}.cloudflarestream.com/${input.videoId}/thumbnails/thumbnail.jpg`,
        expiresAt: expirationTime * 1000,
      };
    }),

  getVideoInfo: publicProcedure
    .input(z.object({
      videoId: z.string(),
      accountId: z.string(),
    }))
    .query(async ({ input }) => {
      const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

      if (!apiToken) {
        return {
          title: "Video",
          length: 0,
          status: "unknown",
          thumbnailUrl: null,
        };
      }

      const result = await makeCloudflareRequest(
        `/stream/${input.videoId}`,
        input.accountId,
        apiToken
      );

      if (!result.ok) {
        return {
          title: "Video",
          length: 0,
          status: "unknown",
          thumbnailUrl: null,
        };
      }

      const video = result.data?.result;
      return {
        title: video?.meta?.name || "Video",
        length: Math.round(video?.duration || 0),
        status: video?.status?.state === "ready" ? "ready" : "processing",
        thumbnailUrl: video?.thumbnail || null,
      };
    }),

  listVideos: publicProcedure
    .input(z.object({
      accountId: z.string(),
      page: z.number().optional().default(1),
      itemsPerPage: z.number().optional().default(100),
    }))
    .query(async ({ input }) => {
      const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

      console.log("[Cloudflare List] Listing videos for account:", input.accountId);

      if (!apiToken) {
        throw new Error("CLOUDFLARE_STREAM_API_TOKEN environment variable is not configured. Please add it in your project settings.");
      }

      const result = await makeCloudflareRequest(
        `/stream?per_page=${input.itemsPerPage}`,
        input.accountId,
        apiToken
      );

      if (!result.ok) {
        throw new Error(result.error || "Failed to fetch videos from Cloudflare");
      }

      const videos = result.data?.result?.map((video: {
        uid: string;
        meta?: { name?: string };
        duration?: number;
        status?: { state?: string };
        thumbnail?: string;
      }) => ({
        videoId: video.uid,
        title: video.meta?.name || "Untitled",
        length: Math.round(video.duration || 0),
        status: video.status?.state === "ready" ? "ready" : "processing",
        thumbnailUrl: video.thumbnail || null,
      })) || [];

      console.log("[Cloudflare List] Found", videos.length, "videos");

      return {
        videos,
        totalItems: result.data?.total || videos.length,
        currentPage: input.page,
      };
    }),

  createDirectUpload: publicProcedure
    .input(z.object({
      accountId: z.string(),
      maxDurationSeconds: z.number().optional().default(3600),
      metadata: z.object({
        name: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

      if (!apiToken) {
        throw new Error("CLOUDFLARE_STREAM_API_TOKEN environment variable is not configured");
      }

      const result = await makeCloudflareRequest(
        "/stream/direct_upload",
        input.accountId,
        apiToken,
        {
          method: "POST",
          body: JSON.stringify({
            maxDurationSeconds: input.maxDurationSeconds,
            meta: input.metadata,
          }),
        }
      );

      if (!result.ok) {
        throw new Error(result.error || "Failed to create direct upload URL");
      }

      return {
        uploadUrl: result.data?.result?.uploadURL,
        videoId: result.data?.result?.uid,
      };
    }),

  deleteVideo: publicProcedure
    .input(z.object({
      videoId: z.string(),
      accountId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

      if (!apiToken) {
        throw new Error("CLOUDFLARE_STREAM_API_TOKEN environment variable is not configured");
      }

      const result = await makeCloudflareRequest(
        `/stream/${input.videoId}`,
        input.accountId,
        apiToken,
        { method: "DELETE" }
      );

      if (!result.ok) {
        throw new Error(result.error || "Failed to delete video from Cloudflare");
      }

      return { success: true };
    }),
});
