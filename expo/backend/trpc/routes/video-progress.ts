import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
// Replaces the old SurrealDB HTTP client (process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT),
// which no longer exists after the Railway migration. Backed by the
// pre-existing `video_progress` Supabase table (per-video playhead / percent
// complete), distinct from `course_progress` (whole-course, section-by-section
// completion used by the enrollment flow in progress.ts).
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

const CERTIFICATION_THRESHOLD = 80;
const ACE_COURSE_IDS = ["3", "4", "5", "9"];

interface DbVideoProgress {
  id: string;
  user_id: string;
  video_id: string;
  progress: number;
  completed: boolean;
  last_position: number;
  created_at: string;
  updated_at: string;
}

interface DbVideo {
  id: string;
  course_id: string;
  section_id: string;
  title: string;
  duration: string;
}

function dbToProgress(db: DbVideoProgress, courseId?: string, sectionId?: string) {
  const progressPercent = Number(db.progress) || 0;
  return {
    id: db.id,
    userId: db.user_id,
    videoId: db.video_id,
    courseId: courseId ?? "",
    sectionId: sectionId ?? "",
    currentTime: db.last_position ?? 0,
    duration: 0,
    progressPercent,
    completed: db.completed ?? false,
    certificationEligible: progressPercent >= CERTIFICATION_THRESHOLD,
    lastWatchedAt: db.updated_at,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export const videoProgressRouter = createTRPCRouter({
  getProgress: publicProcedure
    .input(z.object({
      userId: z.string(),
      videoId: z.string(),
    }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("video_progress")
        .select("*")
        .eq("user_id", input.userId)
        .eq("video_id", input.videoId)
        .maybeSingle();

      if (error) {
        console.error("[VideoProgress] getProgress error:", error);
        return null;
      }

      return data ? dbToProgress(data as DbVideoProgress) : null;
    }),

  getAllProgress: publicProcedure
    .input(z.object({
      userId: z.string(),
      courseId: z.string().optional(),
      sectionId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const { data: progressRows, error } = await supabase
        .from("video_progress")
        .select("*")
        .eq("user_id", input.userId);

      if (error) {
        console.error("[VideoProgress] getAllProgress error:", error);
        return [];
      }

      const rows = (progressRows || []) as DbVideoProgress[];
      if (rows.length === 0) return [];

      // video_progress only stores video_id, so course/section filtering
      // requires joining against `videos` for the ids the client asked about.
      if (!input.courseId && !input.sectionId) {
        return rows.map((r) => dbToProgress(r));
      }

      const videoIds = rows.map((r) => r.video_id);
      let videosQuery = supabase
        .from("videos")
        .select("id, course_id, section_id")
        .in("id", videoIds);

      if (input.courseId) videosQuery = videosQuery.eq("course_id", input.courseId);
      if (input.sectionId) videosQuery = videosQuery.eq("section_id", input.sectionId);

      const { data: videos, error: videosError } = await videosQuery;
      if (videosError) {
        console.error("[VideoProgress] getAllProgress videos lookup error:", videosError);
        return [];
      }

      const videoMap = new Map((videos || []).map((v: any) => [v.id, v]));
      return rows
        .filter((r) => videoMap.has(r.video_id))
        .map((r) => {
          const v = videoMap.get(r.video_id);
          return dbToProgress(r, v?.course_id, v?.section_id);
        });
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
      const progressPercent = input.duration > 0
        ? Math.round((input.currentTime / input.duration) * 100)
        : 0;

      const isCompleted = input.completed ?? progressPercent >= 90;

      const { data, error } = await supabase
        .from("video_progress")
        .upsert(
          {
            user_id: input.userId,
            video_id: input.videoId,
            progress: progressPercent,
            completed: isCompleted,
            last_position: Math.round(input.currentTime),
          },
          { onConflict: "user_id,video_id" }
        )
        .select()
        .single();

      if (error) {
        console.error("[VideoProgress] updateProgress error:", error);
        throw new Error(`Failed to update progress: ${error.message}`);
      }

      return dbToProgress(data as DbVideoProgress, input.courseId, input.sectionId);
    }),

  markCompleted: publicProcedure
    .input(z.object({
      userId: z.string(),
      videoId: z.string(),
      courseId: z.string(),
      sectionId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { error } = await supabase
        .from("video_progress")
        .upsert(
          {
            user_id: input.userId,
            video_id: input.videoId,
            progress: 100,
            completed: true,
          },
          { onConflict: "user_id,video_id" }
        );

      if (error) {
        console.error("[VideoProgress] markCompleted error:", error);
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

      const { data: videos, error: videosError } = await supabase
        .from("videos")
        .select("id, title, section_id")
        .eq("course_id", input.courseId)
        .order("section_id", { ascending: true })
        .order("order_index", { ascending: true });

      if (videosError) {
        console.error("[VideoProgress] getCertificationEligibility videos error:", videosError);
      }

      const videoList = videos || [];
      const videoIds = videoList.map((v: any) => v.id);

      let progressRows: DbVideoProgress[] = [];
      if (videoIds.length > 0) {
        const { data: progressData, error: progressError } = await supabase
          .from("video_progress")
          .select("*")
          .eq("user_id", input.userId)
          .in("video_id", videoIds);

        if (progressError) {
          console.error("[VideoProgress] getCertificationEligibility progress error:", progressError);
        } else {
          progressRows = (progressData || []) as DbVideoProgress[];
        }
      }

      const progressMap = new Map(progressRows.map((p) => [p.video_id, p]));

      const incompleteVideos: {
        videoId: string;
        title: string;
        sectionId: string;
        progressPercent: number;
        requiredPercent: number;
      }[] = [];

      let eligibleCount = 0;

      videoList.forEach((video: any) => {
        const progress = progressMap.get(video.id);
        const progressPercent = Number(progress?.progress) || 0;
        const isEligible = progressPercent >= CERTIFICATION_THRESHOLD;

        if (isEligible) {
          eligibleCount++;
        } else {
          incompleteVideos.push({
            videoId: video.id,
            title: video.title,
            sectionId: video.section_id,
            progressPercent,
            requiredPercent: CERTIFICATION_THRESHOLD,
          });
        }
      });

      return {
        isEligible: incompleteVideos.length === 0,
        requiresCertification: true,
        incompleteVideos,
        totalVideos: videoList.length,
        eligibleVideos: eligibleCount,
        threshold: CERTIFICATION_THRESHOLD,
      };
    }),

  getAllCoursesEligibility: publicProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ input }) => {
      const results: Record<string, {
        isEligible: boolean;
        incompleteCount: number;
        totalVideos: number;
        eligibleVideos: number;
      }> = {};

      for (const courseId of ACE_COURSE_IDS) {
        const { data: videos, error: videosError } = await supabase
          .from("videos")
          .select("id")
          .eq("course_id", courseId);

        if (videosError) {
          console.error("[VideoProgress] getAllCoursesEligibility videos error:", videosError);
        }

        const videoList = videos || [];
        const videoIds = videoList.map((v: any) => v.id);

        let progressRows: DbVideoProgress[] = [];
        if (videoIds.length > 0) {
          const { data: progressData, error: progressError } = await supabase
            .from("video_progress")
            .select("*")
            .eq("user_id", input.userId)
            .in("video_id", videoIds);

          if (progressError) {
            console.error("[VideoProgress] getAllCoursesEligibility progress error:", progressError);
          } else {
            progressRows = (progressData || []) as DbVideoProgress[];
          }
        }

        const progressMap = new Map(progressRows.map((p) => [p.video_id, p]));

        let eligibleCount = 0;
        let incompleteCount = 0;

        videoList.forEach((video: any) => {
          const progress = progressMap.get(video.id);
          const progressPercent = Number(progress?.progress) || 0;
          if (progressPercent >= CERTIFICATION_THRESHOLD) {
            eligibleCount++;
          } else {
            incompleteCount++;
          }
        });

        results[courseId] = {
          isEligible: incompleteCount === 0 && videoList.length > 0,
          incompleteCount,
          totalVideos: videoList.length,
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
      const { data: videos, error: videosError } = await supabase
        .from("videos")
        .select("id")
        .eq("course_id", input.courseId);

      if (videosError) {
        console.error("[VideoProgress] getCourseProgress videos error:", videosError);
      }

      const videoList = (videos || []) as DbVideo[];
      const totalVideos = videoList.length;
      const videoIds = videoList.map((v) => v.id);

      let progressRecords: DbVideoProgress[] = [];
      if (videoIds.length > 0) {
        const { data: progressData, error: progressError } = await supabase
          .from("video_progress")
          .select("*")
          .eq("user_id", input.userId)
          .in("video_id", videoIds);

        if (progressError) {
          console.error("[VideoProgress] getCourseProgress progress error:", progressError);
        } else {
          progressRecords = (progressData || []) as DbVideoProgress[];
        }
      }

      const completedVideos = progressRecords.filter((p) => p.completed).length;

      return {
        totalVideos,
        completedVideos,
        progressPercent: totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0,
        progressRecords: progressRecords.map((p) => dbToProgress(p, input.courseId)),
      };
    }),
});
