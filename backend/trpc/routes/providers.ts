import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

const CONSULTATION_FEE = 99.99;
const PLATFORM_FEE = 25.00;

export const providersRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      specialty: z.string().optional(),
      minRating: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      let query = "SELECT * FROM cso_providers WHERE isAvailable = true";
      
      if (input?.minRating) {
        query += ` AND rating >= ${input.minRating}`;
      }

      query += " ORDER BY rating DESC, reviewCount DESC";

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
        throw new Error(`Failed to fetch providers: ${response.status}`);
      }

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("Failed to parse response:", responseText);
        return [];
      }

      let providers = data[0]?.result || [];

      if (input?.search) {
        const searchLower = input.search.toLowerCase();
        providers = providers.filter((p: { name?: string; bio?: string; location?: string }) => 
          p.name?.toLowerCase().includes(searchLower) ||
          p.bio?.toLowerCase().includes(searchLower) ||
          p.location?.toLowerCase().includes(searchLower)
        );
      }

      if (input?.specialty) {
        providers = providers.filter((p: { specialties?: string[] }) => 
          p.specialties?.includes(input.specialty!)
        );
      }

      return providers;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
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
          query: `SELECT * FROM cso_providers WHERE id = '${input.id}'`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch provider");
      }

      const responseText = await response.text();
      const data = JSON.parse(responseText);
      return data[0]?.result?.[0] || null;
    }),

  getByUserId: publicProcedure
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
          query: `SELECT * FROM cso_providers WHERE userId = '${input.userId}'`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch provider by user ID");
      }

      const responseText = await response.text();
      const data = JSON.parse(responseText);
      return data[0]?.result?.[0] || null;
    }),

  create: publicProcedure
    .input(z.object({
      userId: z.string(),
      name: z.string(),
      email: z.string().email(),
      phone: z.string().optional(),
      avatar: z.string(),
      bio: z.string(),
      specialties: z.array(z.string()),
      yearsExperience: z.number(),
      location: z.string(),
    }))
    .mutation(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = new Date().toISOString();
      const id = `cso_providers:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const provider = {
        id,
        ...input,
        rating: 0,
        reviewCount: 0,
        consultationFee: CONSULTATION_FEE,
        isAvailable: true,
        certifiedAt: now,
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
          query: `CREATE ${id} CONTENT ${JSON.stringify(provider)}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create provider");
      }

      const responseText = await response.text();
      const data = JSON.parse(responseText);
      return data[0]?.result?.[0] || provider;
    }),

  getReviews: publicProcedure
    .input(z.object({ providerId: z.string() }))
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
          query: `SELECT * FROM cso_reviews WHERE providerId = '${input.providerId}' ORDER BY createdAt DESC`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch reviews");
      }

      const responseText = await response.text();
      const data = JSON.parse(responseText);
      return data[0]?.result || [];
    }),

  createReview: publicProcedure
    .input(z.object({
      providerId: z.string(),
      reviewerId: z.string(),
      reviewerName: z.string(),
      reviewerAvatar: z.string(),
      rating: z.number().min(1).max(5),
      comment: z.string(),
    }))
    .mutation(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = new Date().toISOString();
      const id = `cso_reviews:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const review = {
        id,
        ...input,
        createdAt: now,
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
          query: `CREATE ${id} CONTENT ${JSON.stringify(review)}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create review");
      }

      const allReviewsResponse = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `SELECT * FROM cso_reviews WHERE providerId = '${input.providerId}'`,
        }),
      });

      if (allReviewsResponse.ok) {
        const reviewsText = await allReviewsResponse.text();
        const reviewsData = JSON.parse(reviewsText);
        const reviews = reviewsData[0]?.result || [];
        
        const avgRating = reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviews.length;
        
        await fetch(`${endpoint}/sql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "surreal-ns": namespace,
            "surreal-db": "app",
          },
          body: JSON.stringify({
            query: `UPDATE ${input.providerId} SET rating = ${avgRating.toFixed(1)}, reviewCount = ${reviews.length}, updatedAt = '${now}'`,
          }),
        });
      }

      return review;
    }),

  createConsultation: publicProcedure
    .input(z.object({
      providerId: z.string(),
      providerName: z.string(),
      clientId: z.string(),
      clientName: z.string(),
      clientEmail: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = new Date().toISOString();
      const id = `consultations:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const providerPayout = CONSULTATION_FEE - PLATFORM_FEE;

      const consultation = {
        id,
        ...input,
        amount: CONSULTATION_FEE,
        platformFee: PLATFORM_FEE,
        providerPayout: providerPayout,
        status: "pending",
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
          query: `CREATE ${id} CONTENT ${JSON.stringify(consultation)}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create consultation");
      }

      const responseText = await response.text();
      const data = JSON.parse(responseText);
      return data[0]?.result?.[0] || consultation;
    }),

  updateConsultationStatus: publicProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["pending", "paid", "completed", "refunded"]),
    }))
    .mutation(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = new Date().toISOString();
      let query = `UPDATE ${input.id} SET status = '${input.status}', updatedAt = '${now}'`;
      
      if (input.status === "paid") {
        query = `UPDATE ${input.id} SET status = '${input.status}', paymentDate = '${now}', updatedAt = '${now}'`;
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
        throw new Error("Failed to update consultation");
      }

      const responseText = await response.text();
      const data = JSON.parse(responseText);
      return data[0]?.result?.[0] || null;
    }),

  getClientConsultations: publicProcedure
    .input(z.object({ clientId: z.string() }))
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
          query: `SELECT * FROM consultations WHERE clientId = '${input.clientId}' ORDER BY createdAt DESC`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch consultations");
      }

      const responseText = await response.text();
      const data = JSON.parse(responseText);
      return data[0]?.result || [];
    }),

  checkAccess: publicProcedure
    .input(z.object({
      clientId: z.string(),
      providerId: z.string(),
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
          query: `SELECT * FROM consultations WHERE clientId = '${input.clientId}' AND providerId = '${input.providerId}' AND status = 'paid'`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to check access");
      }

      const responseText = await response.text();
      const data = JSON.parse(responseText);
      const consultations = data[0]?.result || [];
      
      return {
        hasAccess: consultations.length > 0,
        consultation: consultations[0] || null,
      };
    }),
});
