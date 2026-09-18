import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
// Replaces the old SurrealDB HTTP client (process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT),
// which no longer exists after the Railway migration. Backed by the new
// `cso_providers` / `cso_reviews` / `consultations` Supabase tables
// (see migrations/029_providers_avatars_muso_supabase.sql).
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

const CONSULTATION_FEE = 99.99;
const PLATFORM_FEE = 25.00;

interface DbProvider {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  bio: string | null;
  specialties: string[] | null;
  years_experience: number | null;
  location: string | null;
  rating: number | null;
  review_count: number | null;
  consultation_fee: number | null;
  is_available: boolean | null;
  certified_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DbReview {
  id: string;
  provider_id: string;
  reviewer_id: string | null;
  reviewer_name: string | null;
  reviewer_avatar: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface DbConsultation {
  id: string;
  provider_id: string | null;
  provider_name: string | null;
  client_id: string | null;
  client_name: string | null;
  client_email: string | null;
  amount: number;
  platform_fee: number;
  provider_payout: number;
  status: string;
  payment_date: string | null;
  created_at: string;
  updated_at: string;
}

function dbToProvider(db: DbProvider) {
  return {
    id: db.id,
    userId: db.user_id ?? "",
    name: db.name,
    email: db.email,
    phone: db.phone ?? "",
    avatar: db.avatar ?? "",
    bio: db.bio ?? "",
    specialties: db.specialties ?? [],
    yearsExperience: db.years_experience ?? 0,
    location: db.location ?? "",
    rating: Number(db.rating) || 0,
    reviewCount: db.review_count ?? 0,
    consultationFee: Number(db.consultation_fee) || CONSULTATION_FEE,
    isAvailable: db.is_available ?? true,
    certifiedAt: db.certified_at ?? db.created_at,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function dbToReview(db: DbReview) {
  return {
    id: db.id,
    providerId: db.provider_id,
    reviewerId: db.reviewer_id ?? "",
    reviewerName: db.reviewer_name ?? "",
    reviewerAvatar: db.reviewer_avatar ?? "",
    rating: db.rating,
    comment: db.comment ?? "",
    createdAt: db.created_at,
  };
}

function dbToConsultation(db: DbConsultation) {
  return {
    id: db.id,
    providerId: db.provider_id ?? "",
    providerName: db.provider_name ?? "",
    clientId: db.client_id ?? "",
    clientName: db.client_name ?? "",
    clientEmail: db.client_email ?? "",
    amount: Number(db.amount) || 0,
    platformFee: Number(db.platform_fee) || 0,
    providerPayout: Number(db.provider_payout) || 0,
    status: db.status as "pending" | "paid" | "completed" | "refunded",
    paymentDate: db.payment_date ?? undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export const providersRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      specialty: z.string().optional(),
      minRating: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      let query = supabase
        .from("cso_providers")
        .select("*")
        .eq("is_available", true);

      if (input?.minRating) {
        query = query.gte("rating", input.minRating);
      }

      query = query.order("rating", { ascending: false }).order("review_count", { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("Database error:", error);
        throw new Error(`Failed to fetch providers: ${error.message}`);
      }

      let providers = ((data ?? []) as DbProvider[]).map(dbToProvider);

      if (input?.search) {
        const searchLower = input.search.toLowerCase();
        providers = providers.filter((p) =>
          p.name?.toLowerCase().includes(searchLower) ||
          p.bio?.toLowerCase().includes(searchLower) ||
          p.location?.toLowerCase().includes(searchLower)
        );
      }

      if (input?.specialty) {
        providers = providers.filter((p) =>
          p.specialties?.includes(input.specialty!)
        );
      }

      return providers;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("cso_providers")
        .select("*")
        .eq("id", input.id)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch provider: ${error.message}`);
      }

      return data ? dbToProvider(data as DbProvider) : null;
    }),

  getByUserId: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      if (!input.userId) return null;

      const { data, error } = await supabase
        .from("cso_providers")
        .select("*")
        .eq("user_id", input.userId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch provider by user ID: ${error.message}`);
      }

      return data ? dbToProvider(data as DbProvider) : null;
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
      const { data, error } = await supabase
        .from("cso_providers")
        .insert({
          user_id: input.userId,
          name: input.name,
          email: input.email,
          phone: input.phone ?? "",
          avatar: input.avatar,
          bio: input.bio,
          specialties: input.specialties,
          years_experience: input.yearsExperience,
          location: input.location,
          rating: 0,
          review_count: 0,
          consultation_fee: CONSULTATION_FEE,
          is_available: true,
          certified_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create provider: ${error.message}`);
      }

      return dbToProvider(data as DbProvider);
    }),

  getReviews: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("cso_reviews")
        .select("*")
        .eq("provider_id", input.providerId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch reviews: ${error.message}`);
      }

      return ((data ?? []) as DbReview[]).map(dbToReview);
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
      const { data, error } = await supabase
        .from("cso_reviews")
        .insert({
          provider_id: input.providerId,
          reviewer_id: input.reviewerId,
          reviewer_name: input.reviewerName,
          reviewer_avatar: input.reviewerAvatar,
          rating: input.rating,
          comment: input.comment,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create review: ${error.message}`);
      }

      const { data: allReviews, error: allReviewsError } = await supabase
        .from("cso_reviews")
        .select("rating")
        .eq("provider_id", input.providerId);

      if (!allReviewsError && allReviews && allReviews.length > 0) {
        const avgRating =
          allReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) /
          allReviews.length;

        await supabase
          .from("cso_providers")
          .update({
            rating: Number(avgRating.toFixed(1)),
            review_count: allReviews.length,
          })
          .eq("id", input.providerId);
      }

      return dbToReview(data as DbReview);
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
      const providerPayout = CONSULTATION_FEE - PLATFORM_FEE;

      const { data, error } = await supabase
        .from("consultations")
        .insert({
          provider_id: input.providerId,
          provider_name: input.providerName,
          client_id: input.clientId,
          client_name: input.clientName,
          client_email: input.clientEmail,
          amount: CONSULTATION_FEE,
          platform_fee: PLATFORM_FEE,
          provider_payout: providerPayout,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create consultation: ${error.message}`);
      }

      return dbToConsultation(data as DbConsultation);
    }),

  updateConsultationStatus: publicProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["pending", "paid", "completed", "refunded"]),
    }))
    .mutation(async ({ input }) => {
      const updatePayload: Record<string, unknown> = { status: input.status };

      if (input.status === "paid") {
        updatePayload.payment_date = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("consultations")
        .update(updatePayload)
        .eq("id", input.id)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to update consultation: ${error.message}`);
      }

      return data ? dbToConsultation(data as DbConsultation) : null;
    }),

  getClientConsultations: publicProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .eq("client_id", input.clientId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch consultations: ${error.message}`);
      }

      return ((data ?? []) as DbConsultation[]).map(dbToConsultation);
    }),

  checkAccess: publicProcedure
    .input(z.object({
      clientId: z.string(),
      providerId: z.string(),
    }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .eq("client_id", input.clientId)
        .eq("provider_id", input.providerId)
        .eq("status", "paid");

      if (error) {
        throw new Error(`Failed to check access: ${error.message}`);
      }

      const consultations = ((data ?? []) as DbConsultation[]).map(dbToConsultation);

      return {
        hasAccess: consultations.length > 0,
        consultation: consultations[0] || null,
      };
    }),
});
