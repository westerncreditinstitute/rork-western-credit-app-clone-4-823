import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

const CERTIFICATION_THRESHOLD = 80;
const ACE_COURSE_IDS = ["3", "4", "5", "9"];

export const videoProgressRouter = createTRPCRouter({
  getProgress: publicProcedure
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
          query: `SELECT * FROM video_progress WHERE userId = '${input.userId}' AND videoId = '${input.videoId}'`,
        }),
      });

      if (!response.ok) {
        console.error("Database error:", await response.text());
        return null;
      }

      const data = await response.json();
      return data[0]?.result?.[0] || null;
    }),

  getAllProgress: publicProcedure
    .input(z.object({
      userId: z.string(),
      courseId: z.string().optional(),
      sectionId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      let query = `SELECT * FROM video_progress WHERE userId = '${input.userId}'`;
      
      if (input.courseId) {
        query += ` AND courseId = '${input.courseId}'`;
      }
      if (input.sectionId) {
        query += ` AND sectionId = '${input.sectionId}'`;
      }

      const response = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        console.error("Database error:", await response.text());
        return [];
      }

      const data = await response.json();
      return data[0]?.result || [];
    }),

  updateProgress: publicProcedure
    .input(z.object({
      userId: z.string(),
      videoId: z.string(),
      courseId: z.string(),
      sectionId: z.string(),
      currentTime: z.number(),
      duration: z.number(),
      completed: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const progressPercent = input.duration > 0 
        ? Math.round((input.currentTime / input.duration) * 100) 
        : 0;
      
      const isCompleted = input.completed ?? progressPercent >= 90;
      const certificationEligible = progressPercent >= CERTIFICATION_THRESHOLD;
      const now = new Date().toISOString();

      const checkResponse = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `SELECT * FROM video_progress WHERE userId = '${input.userId}' AND videoId = '${input.videoId}'`,
        }),
      });

      const checkData = await checkResponse.json();
      const existingProgress = checkData[0]?.result?.[0];

      let query: string;
      if (existingProgress) {
        query = `UPDATE ${existingProgress.id} SET 
          currentTime = ${input.currentTime}, 
          duration = ${input.duration}, 
          progressPercent = ${progressPercent}, 
          completed = ${isCompleted}, 
          certificationEligible = ${certificationEligible},
          lastWatchedAt = '${now}', 
          updatedAt = '${now}'`;
      } else {
        const id = `video_progress:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const progressData = {
          id,
          userId: input.userId,
          videoId: input.videoId,
          courseId: input.courseId,
          sectionId: input.sectionId,
          currentTime: input.currentTime,
          duration: input.duration,
          progressPercent,
          completed: isCompleted,
          certificationEligible,
          lastWatchedAt: now,
          createdAt: now,
          updatedAt: now,
        };
        query = `CREATE ${id} CONTENT ${JSON.stringify(progressData)}`;
      }

      const response = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Database error:", errorText);
        throw new Error(`Failed to update progress: ${response.status}`);
      }

      const data = await response.json();
      return data[0]?.result?.[0] || { success: true };
    }),

  markCompleted: publicProcedure
    .input(z.object({
      userId: z.string(),
      videoId: z.string(),
      courseId: z.string(),
      sectionId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = new Date().toISOString();

      const checkResponse = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `SELECT * FROM video_progress WHERE userId = '${input.userId}' AND videoId = '${input.videoId}'`,
        }),
      });

      const checkData = await checkResponse.json();
      const existingProgress = checkData[0]?.result?.[0];

      let query: string;
      if (existingProgress) {
        query = `UPDATE ${existingProgress.id} SET 
          completed = true, 
          progressPercent = 100,
          completedAt = '${now}', 
          updatedAt = '${now}'`;
      } else {
        const id = `video_progress:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const progressData = {
          id,
          userId: input.userId,
          videoId: input.videoId,
          courseId: input.courseId,
          sectionId: input.sectionId,
          currentTime: 0,
          duration: 0,
          progressPercent: 100,
          completed: true,
          completedAt: now,
          lastWatchedAt: now,
          createdAt: now,
          updatedAt: now,
        };
        query = `CREATE ${id} CONTENT ${JSON.stringify(progressData)}`;
      }

      const response = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark video as completed");
      }

      return { success: true };
    }),

  getCertificationEligibility: publicProcedure
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

      const isACECourse = ACE_COURSE_IDS.includes(input.courseId);
      if (!isACECourse) {
        return {
          isEligible: true,
          requiresCertification: false,
          incompleteVideos: [],
          totalVideos: 0,
          eligibleVideos: 0,
          threshold: CERTIFICATION_THRESHOLD,
        };
      }

      const videosResponse = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `SELECT * FROM videos WHERE courseId = '${input.courseId}' ORDER BY sectionId, order`,
        }),
      });

      const videosData = await videosResponse.json();
      const videos = videosData[0]?.result || [];

      const progressResponse = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `SELECT * FROM video_progress WHERE userId = '${input.userId}' AND courseId = '${input.courseId}'`,
        }),
      });

      const progressData = await progressResponse.json();
      const progressRecords = progressData[0]?.result || [];

      const progressMap = new Map();
      progressRecords.forEach((p: { videoId: string; progressPercent: number; certificationEligible?: boolean }) => {
        progressMap.set(p.videoId, p);
      });

      const incompleteVideos: {
        videoId: string;
        title: string;
        sectionId: string;
        progressPercent: number;
        requiredPercent: number;
      }[] = [];

      let eligibleCount = 0;

      videos.forEach((video: { id: string; title: string; sectionId: string }) => {
        const progress = progressMap.get(video.id);
        const progressPercent = progress?.progressPercent || 0;
        const isEligible = progressPercent >= CERTIFICATION_THRESHOLD;

        if (isEligible) {
          eligibleCount++;
        } else {
          incompleteVideos.push({
            videoId: video.id,
            title: video.title,
            sectionId: video.sectionId,
            progressPercent,
            requiredPercent: CERTIFICATION_THRESHOLD,
          });
        }
      });

      return {
        isEligible: incompleteVideos.length === 0,
        requiresCertification: true,
        incompleteVideos,
        totalVideos: videos.length,
        eligibleVideos: eligibleCount,
        threshold: CERTIFICATION_THRESHOLD,
      };
    }),

  getAllCoursesEligibility: publicProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const results: Record<string, {
        isEligible: boolean;
        incompleteCount: number;
        totalVideos: number;
        eligibleVideos: number;
      }> = {};

      for (const courseId of ACE_COURSE_IDS) {
        const videosResponse = await fetch(`${endpoint}/sql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "surreal-ns": namespace,
            "surreal-db": "app",
          },
          body: JSON.stringify({
            query: `SELECT * FROM videos WHERE courseId = '${courseId}'`,
          }),
        });

        const videosData = await videosResponse.json();
        const videos = videosData[0]?.result || [];

        const progressResponse = await fetch(`${endpoint}/sql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "surreal-ns": namespace,
            "surreal-db": "app",
          },
          body: JSON.stringify({
            query: `SELECT * FROM video_progress WHERE userId = '${input.userId}' AND courseId = '${courseId}'`,
          }),
        });

        const progressData = await progressResponse.json();
        const progressRecords = progressData[0]?.result || [];

        const progressMap = new Map();
        progressRecords.forEach((p: { videoId: string; progressPercent: number }) => {
          progressMap.set(p.videoId, p);
        });

        let eligibleCount = 0;
        let incompleteCount = 0;

        videos.forEach((video: { id: string }) => {
          const progress = progressMap.get(video.id);
          const progressPercent = progress?.progressPercent || 0;
          if (progressPercent >= CERTIFICATION_THRESHOLD) {
            eligibleCount++;
          } else {
            incompleteCount++;
          }
        });

        results[courseId] = {
          isEligible: incompleteCount === 0 && videos.length > 0,
          incompleteCount,
          totalVideos: videos.length,
          eligibleVideos: eligibleCount,
        };
      }

      const allEligible = ACE_COURSE_IDS.every(
        (id) => results[id]?.isEligible && results[id]?.totalVideos > 0
      );

      return {
        courses: results,
        csoExamEligible: allEligible,
        threshold: CERTIFICATION_THRESHOLD,
      };
    }),

  getCourseProgress: publicProcedure
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

      const progressResponse = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `SELECT * FROM video_progress WHERE userId = '${input.userId}' AND courseId = '${input.courseId}'`,
        }),
      });

      const progressData = await progressResponse.json();
      const progressRecords = progressData[0]?.result || [];

      const videosResponse = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `SELECT * FROM videos WHERE courseId = '${input.courseId}'`,
        }),
      });

      const videosData = await videosResponse.json();
      const totalVideos = videosData[0]?.result?.length || 0;
      const completedVideos = progressRecords.filter((p: { completed: boolean }) => p.completed).length;

      return {
        totalVideos,
        completedVideos,
        progressPercent: totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0,
        progressRecords,
      };
    }),
});
