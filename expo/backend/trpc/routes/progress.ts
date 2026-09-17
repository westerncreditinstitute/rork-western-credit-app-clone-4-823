import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
// Replaces the old SurrealDB HTTP client (process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT),
// which no longer exists after the Railway migration. Backed by the
// `course_progress` table (migration 028) - distinct from `video_progress`,
// which tracks a single video's playhead rather than a whole course's
// section-by-section completion.
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

interface DbCourseProgress {
  id: string;
  user_id: string;
  course_id: string;
  sections: Record<string, { completedSteps: number; totalSteps: number; completedStepIndices?: number[] }>;
  overall_progress: number;
  enrolled: boolean;
  created_at: string;
  updated_at: string;
}

function dbToProgress(db: DbCourseProgress) {
  return {
    id: db.id,
    userId: db.user_id,
    courseId: db.course_id,
    sections: db.sections || {},
    overallProgress: db.overall_progress ?? 0,
    enrolled: db.enrolled ?? true,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export const progressRouter = createTRPCRouter({
  getByUserAndCourse: publicProcedure
    .input(z.object({
      userId: z.string(),
      courseId: z.string(),
    }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("course_progress")
        .select("*")
        .eq("user_id", input.userId)
        .eq("course_id", input.courseId)
        .maybeSingle();

      if (error) {
        console.error("[progress.getByUserAndCourse] Database error:", error.message);
        throw new Error(`Failed to fetch progress: ${error.message}`);
      }

      return data ? dbToProgress(data as DbCourseProgress) : null;
    }),

  getAllByUser: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("course_progress")
        .select("*")
        .eq("user_id", input.userId);

      if (error) {
        console.error("[progress.getAllByUser] Database error:", error.message);
        throw new Error(`Failed to fetch progress: ${error.message}`);
      }

      return (data || []).map((row) => dbToProgress(row as DbCourseProgress));
    }),

  upsert: publicProcedure
    .input(z.object({
      userId: z.string(),
      courseId: z.string(),
      sectionId: z.string(),
      completedSteps: z.number(),
      totalSteps: z.number(),
    }))
    .mutation(async ({ input }) => {
      const { data: existing, error: fetchError } = await supabase
        .from("course_progress")
        .select("*")
        .eq("user_id", input.userId)
        .eq("course_id", input.courseId)
        .maybeSingle();

      if (fetchError) {
        console.error("[progress.upsert] Database error:", fetchError.message);
        throw new Error(`Failed to check progress: ${fetchError.message}`);
      }

      const sections = (existing?.sections as DbCourseProgress["sections"]) || {};
      sections[input.sectionId] = {
        ...sections[input.sectionId],
        completedSteps: input.completedSteps,
        totalSteps: input.totalSteps,
      };

      let totalCompleted = 0;
      let totalSteps = 0;
      Object.values(sections).forEach((section) => {
        totalCompleted += section.completedSteps;
        totalSteps += section.totalSteps;
      });
      const overallProgress = totalSteps > 0 ? Math.round((totalCompleted / totalSteps) * 100) : 0;

      const { data, error } = await supabase
        .from("course_progress")
        .upsert(
          {
            user_id: input.userId,
            course_id: input.courseId,
            sections,
            overall_progress: overallProgress,
            enrolled: true,
          },
          { onConflict: "user_id,course_id" },
        )
        .select()
        .single();

      if (error) {
        console.error("[progress.upsert] Database error:", error.message);
        throw new Error(`Failed to update progress: ${error.message}`);
      }

      return dbToProgress(data as DbCourseProgress);
    }),

  enroll: publicProcedure
    .input(z.object({
      userId: z.string(),
      courseId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { data, error } = await supabase
        .from("course_progress")
        .upsert(
          {
            user_id: input.userId,
            course_id: input.courseId,
            sections: {},
            overall_progress: 0,
            enrolled: true,
          },
          { onConflict: "user_id,course_id", ignoreDuplicates: false },
        )
        .select()
        .single();

      if (error) {
        console.error("[progress.enroll] Database error:", error.message);
        throw new Error(`Failed to enroll: ${error.message}`);
      }

      return dbToProgress(data as DbCourseProgress);
    }),

  completeStep: publicProcedure
    .input(z.object({
      userId: z.string(),
      courseId: z.string(),
      sectionId: z.string(),
      stepIndex: z.number(),
      totalStepsInSection: z.number(),
    }))
    .mutation(async ({ input }) => {
      const { data: existing, error: fetchError } = await supabase
        .from("course_progress")
        .select("*")
        .eq("user_id", input.userId)
        .eq("course_id", input.courseId)
        .maybeSingle();

      if (fetchError) {
        console.error("[progress.completeStep] Database error:", fetchError.message);
        throw new Error(`Failed to check progress: ${fetchError.message}`);
      }

      const sections = (existing?.sections as DbCourseProgress["sections"]) || {};
      const currentSection = sections[input.sectionId] || {
        completedSteps: 0,
        totalSteps: input.totalStepsInSection,
        completedStepIndices: [] as number[],
      };

      if (!currentSection.completedStepIndices) {
        currentSection.completedStepIndices = [];
      }

      if (!currentSection.completedStepIndices.includes(input.stepIndex)) {
        currentSection.completedStepIndices.push(input.stepIndex);
        currentSection.completedSteps = currentSection.completedStepIndices.length;
      }

      currentSection.totalSteps = input.totalStepsInSection;
      sections[input.sectionId] = currentSection;

      let totalCompleted = 0;
      let totalSteps = 0;
      Object.values(sections).forEach((section) => {
        totalCompleted += section.completedSteps;
        totalSteps += section.totalSteps;
      });
      const overallProgress = totalSteps > 0 ? Math.round((totalCompleted / totalSteps) * 100) : 0;

      const { data, error } = await supabase
        .from("course_progress")
        .upsert(
          {
            user_id: input.userId,
            course_id: input.courseId,
            sections,
            overall_progress: overallProgress,
            enrolled: true,
          },
          { onConflict: "user_id,course_id" },
        )
        .select()
        .single();

      if (error) {
        console.error("[progress.completeStep] Database error:", error.message);
        throw new Error(`Failed to update progress: ${error.message}`);
      }

      return dbToProgress(data as DbCourseProgress);
    }),
});
