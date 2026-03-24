import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

export const progressRouter = createTRPCRouter({
  getByUserAndCourse: publicProcedure
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
          query: `SELECT * FROM progress WHERE userId = '${input.userId}' AND courseId = '${input.courseId}'`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Database error:", errorText);
        throw new Error(`Failed to fetch progress: ${response.status} ${errorText}`);
      }

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("Failed to parse response:", responseText);
        throw new Error("Invalid response from database");
      }
      
      return data[0]?.result?.[0] || null;
    }),

  getAllByUser: publicProcedure
    .input(z.object({ userId: z.string() }))
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
          query: `SELECT * FROM progress WHERE userId = '${input.userId}'`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Database error:", errorText);
        throw new Error(`Failed to fetch progress: ${response.status} ${errorText}`);
      }

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("Failed to parse response:", responseText);
        throw new Error("Invalid response from database");
      }
      
      return data[0]?.result || [];
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
          query: `SELECT * FROM progress WHERE userId = '${input.userId}' AND courseId = '${input.courseId}'`,
        }),
      });

      if (!checkResponse.ok) {
        const errorText = await checkResponse.text();
        console.error("Database error:", errorText);
        throw new Error(`Failed to check progress: ${checkResponse.status} ${errorText}`);
      }

      const checkText = await checkResponse.text();
      let checkData;
      try {
        checkData = JSON.parse(checkText);
      } catch {
        console.error("Failed to parse response:", checkText);
        throw new Error("Invalid response from database");
      }

      const existingProgress = checkData[0]?.result?.[0];

      if (existingProgress) {
        const sections = existingProgress.sections || {};
        sections[input.sectionId] = {
          completedSteps: input.completedSteps,
          totalSteps: input.totalSteps,
        };

        let totalCompleted = 0;
        let totalSteps = 0;
        Object.values(sections).forEach((section: unknown) => {
          const s = section as { completedSteps: number; totalSteps: number };
          totalCompleted += s.completedSteps;
          totalSteps += s.totalSteps;
        });

        const overallProgress = totalSteps > 0 ? Math.round((totalCompleted / totalSteps) * 100) : 0;

        const query = `UPDATE ${existingProgress.id} SET sections = ${JSON.stringify(sections)}, overallProgress = ${overallProgress}, updatedAt = '${now}'`;

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
          throw new Error(`Failed to update progress: ${response.status} ${errorText}`);
        }

        const responseText = await response.text();
        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          console.error("Failed to parse response:", responseText);
          throw new Error("Invalid response from database");
        }
        
        return data[0]?.result?.[0] || null;
      } else {
        const id = `progress:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const sections = {
          [input.sectionId]: {
            completedSteps: input.completedSteps,
            totalSteps: input.totalSteps,
          },
        };

        const overallProgress = input.totalSteps > 0 ? Math.round((input.completedSteps / input.totalSteps) * 100) : 0;

        const progress = {
          id,
          userId: input.userId,
          courseId: input.courseId,
          sections,
          overallProgress,
          enrolled: true,
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
            query: `CREATE ${id} CONTENT ${JSON.stringify(progress)}`,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Database error:", errorText);
          throw new Error(`Failed to create progress: ${response.status} ${errorText}`);
        }

        const responseText = await response.text();
        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          console.error("Failed to parse response:", responseText);
          throw new Error("Invalid response from database");
        }
        
        return data[0]?.result?.[0] || progress;
      }
    }),

  enroll: publicProcedure
    .input(z.object({
      userId: z.string(),
      courseId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = new Date().toISOString();
      const id = `progress:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const progress = {
        id,
        userId: input.userId,
        courseId: input.courseId,
        sections: {},
        overallProgress: 0,
        enrolled: true,
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
          query: `CREATE ${id} CONTENT ${JSON.stringify(progress)}`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Database error:", errorText);
        throw new Error(`Failed to enroll: ${response.status} ${errorText}`);
      }

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("Failed to parse response:", responseText);
        throw new Error("Invalid response from database");
      }
      
      return data[0]?.result?.[0] || progress;
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
          query: `SELECT * FROM progress WHERE userId = '${input.userId}' AND courseId = '${input.courseId}'`,
        }),
      });

      if (!checkResponse.ok) {
        const errorText = await checkResponse.text();
        console.error("Database error:", errorText);
        throw new Error(`Failed to check progress: ${checkResponse.status} ${errorText}`);
      }

      const checkText = await checkResponse.text();
      let checkData;
      try {
        checkData = JSON.parse(checkText);
      } catch {
        console.error("Failed to parse response:", checkText);
        throw new Error("Invalid response from database");
      }

      const existingProgress = checkData[0]?.result?.[0];

      if (existingProgress) {
        const sections = existingProgress.sections || {};
        const currentSection = sections[input.sectionId] || { completedSteps: 0, totalSteps: input.totalStepsInSection, completedStepIndices: [] };
        
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
        Object.values(sections).forEach((section: unknown) => {
          const s = section as { completedSteps: number; totalSteps: number };
          totalCompleted += s.completedSteps;
          totalSteps += s.totalSteps;
        });

        const overallProgress = totalSteps > 0 ? Math.round((totalCompleted / totalSteps) * 100) : 0;

        const query = `UPDATE ${existingProgress.id} SET sections = ${JSON.stringify(sections)}, overallProgress = ${overallProgress}, updatedAt = '${now}'`;

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
          throw new Error(`Failed to update progress: ${response.status} ${errorText}`);
        }

        const responseText = await response.text();
        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          console.error("Failed to parse response:", responseText);
          throw new Error("Invalid response from database");
        }
        
        return data[0]?.result?.[0] || null;
      } else {
        const id = `progress:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const sections = {
          [input.sectionId]: {
            completedSteps: 1,
            totalSteps: input.totalStepsInSection,
            completedStepIndices: [input.stepIndex],
          },
        };

        const overallProgress = input.totalStepsInSection > 0 ? Math.round((1 / input.totalStepsInSection) * 100) : 0;

        const progress = {
          id,
          userId: input.userId,
          courseId: input.courseId,
          sections,
          overallProgress,
          enrolled: true,
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
            query: `CREATE ${id} CONTENT ${JSON.stringify(progress)}`,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Database error:", errorText);
          throw new Error(`Failed to create progress: ${response.status} ${errorText}`);
        }

        const responseText = await response.text();
        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          console.error("Failed to parse response:", responseText);
          throw new Error("Invalid response from database");
        }
        
        return data[0]?.result?.[0] || progress;
      }
    }),
});
