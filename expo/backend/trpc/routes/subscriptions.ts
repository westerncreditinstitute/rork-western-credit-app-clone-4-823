import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
// Server-only client: bypasses RLS when SUPABASE_SERVICE_ROLE_KEY is set,
// and transparently falls back to the anon client when it isn't. This
// replaces the old SurrealDB HTTP client (process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT),
// which no longer exists after the Railway migration and made every call in
// this file throw "Database configuration missing" - the actual root cause
// of upgrades not persisting after logout/refresh.
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

/**
 * Server-side mirror of `expo/constants/pricing.ts`.
 *
 * The backend cannot import from the app bundle, so these values are
 * duplicated deliberately. If a price changes, it must change in BOTH files -
 * and in `Pricing.swift` for iOS.
 */
const SUBSCRIPTION_FEES: Record<string, number> = {
  free: 0,
  ace1_student: 49.99,
  cso_affiliate: 50,
};

/** Length of the ACE-1 free trial, mirroring `ACE1_TRIAL_DAYS`. */
const ACE1_TRIAL_DAYS = 7;

const REFERRAL_BONUSES = {
  /** ACE-1 referral paid to a referrer still on the free tier. */
  ace1_from_free: 25,
  /** ACE-1 referral paid to a referrer who is an ACE-1 student or CSO. */
  ace1_from_enrolled: 50,
  /** Flat bounty per ACE-2 / ACE-3 registration. */
  advanced_course: 99.99,
  /** Share of an ACE-4 bundle sale for a CSO Affiliate referrer. */
  bundle_cso: 0.5,
  /** Share of an ACE-4 bundle sale for a non-CSO referrer. */
  bundle_standard: 0.25,
};

/** ACE-1 payout depends on whether the REFERRER is enrolled, not the referee. */
function ace1BonusFor(referrerTier: string | undefined): number {
  return referrerTier === "ace1_student" || referrerTier === "cso_affiliate"
    ? REFERRAL_BONUSES.ace1_from_enrolled
    : REFERRAL_BONUSES.ace1_from_free;
}

interface DbSubscription {
  id: string;
  user_id: string;
  plan: string;
  tier: string | null;
  status: string;
  monthly_fee: number | null;
  start_date: string;
  end_date: string | null;
  initial_registration_date: string | null;
  initial_registration_expiry: string | null;
  certificate_paid: boolean | null;
  trial_ends_at: string | null;
  auto_renew: boolean | null;
  referred_by: string | null;
  promo_applied: boolean | null;
  created_at: string;
  updated_at: string;
}

/**
 * Maps a Supabase row (snake_case) to the camelCase shape the app's
 * TypeScript types and UI screens already expect (see
 * `contexts/SubscriptionContext.tsx`).
 */
function dbToSubscription(db: DbSubscription) {
  return {
    id: db.id,
    userId: db.user_id,
    tier: (db.tier || db.plan) as "free" | "ace1_student" | "cso_affiliate",
    status: db.status,
    monthlyFee: db.monthly_fee ?? 0,
    startDate: db.start_date,
    endDate: db.end_date ?? undefined,
    initialRegistrationDate: db.initial_registration_date ?? undefined,
    initialRegistrationExpiry: db.initial_registration_expiry ?? undefined,
    certificatePaid: db.certificate_paid ?? undefined,
    trialEndsAt: db.trial_ends_at ?? undefined,
    autoRenew: db.auto_renew ?? true,
    referredBy: db.referred_by ?? undefined,
    promoApplied: db.promo_applied ?? undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export const subscriptionsRouter = createTRPCRouter({
  getByUserId: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", input.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("[subscriptions.getByUserId] Database error:", error.message);
        throw new Error(`Failed to fetch subscription: ${error.message}`);
      }

      return data ? dbToSubscription(data as DbSubscription) : null;
    }),

  create: publicProcedure
    .input(z.object({
      userId: z.string(),
      tier: z.enum(["free", "ace1_student", "cso_affiliate"]),
      referredBy: z.string().optional(),
      isInitialRegistration: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const now = new Date().toISOString();

      // ACE-1 starts on a 7-day free trial: enrollment costs nothing and the
      // certificate fee is collected when the trial ends. `certificatePaid`
      // is what separates a trial member from a subscriber - the trial
      // withholds the dispute-letter library, so this flag gates real value
      // and must never be inferred from the tier alone.
      const trialDays = input.tier === "ace1_student" ? ACE1_TRIAL_DAYS : 30;
      const expiryDate = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

      const row = {
        user_id: input.userId,
        plan: input.tier,
        tier: input.tier,
        status: "active",
        monthly_fee: SUBSCRIPTION_FEES[input.tier],
        start_date: now,
        end_date: input.tier === "ace1_student" ? expiryDate : null,
        initial_registration_date: input.isInitialRegistration ? now : null,
        initial_registration_expiry: input.isInitialRegistration ? expiryDate : null,
        // A new ACE-1 subscription is always a trial: nothing has been billed
        // yet. Only a completed certificate payment flips this.
        certificate_paid: input.tier === "ace1_student" ? false : null,
        trial_ends_at: input.tier === "ace1_student" ? expiryDate : null,
        auto_renew: true,
        referred_by: input.referredBy || null,
      };

      const { data, error } = await supabase
        .from("subscriptions")
        .insert(row)
        .select()
        .single();

      if (error) {
        console.error("[subscriptions.create] Database error:", error.message);
        throw new Error(`Failed to create subscription: ${error.message}`);
      }

      if (input.referredBy && input.tier !== "free") {
        // A referral must never block the subscription it was triggered by:
        // the student has already paid, so a bookkeeping failure is logged
        // and reconciled rather than surfaced as a failed enrollment.
        try {
          await processReferralBonus(input.referredBy, input.userId, input.tier);
        } catch (error) {
          console.error(
            "[subscriptions] Referral bonus failed for referrer",
            input.referredBy,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      return dbToSubscription(data as DbSubscription);
    }),

  upgrade: publicProcedure
    .input(z.object({
      subscriptionId: z.string(),
      newTier: z.enum(["ace1_student", "cso_affiliate"]),
    }))
    .mutation(async ({ input }) => {
      const { data, error } = await supabase
        .from("subscriptions")
        .update({
          plan: input.newTier,
          tier: input.newTier,
          monthly_fee: SUBSCRIPTION_FEES[input.newTier],
        })
        .eq("id", input.subscriptionId)
        .select()
        .single();

      if (error) {
        console.error("[subscriptions.upgrade] Database error:", error.message);
        throw new Error(`Failed to upgrade subscription: ${error.message}`);
      }

      return data ? dbToSubscription(data as DbSubscription) : null;
    }),

  cancel: publicProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .mutation(async ({ input }) => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("subscriptions")
        .update({
          status: "cancelled",
          auto_renew: false,
          end_date: now,
        })
        .eq("id", input.subscriptionId)
        .select()
        .single();

      if (error) {
        console.error("[subscriptions.cancel] Database error:", error.message);
        throw new Error(`Failed to cancel subscription: ${error.message}`);
      }

      return data ? dbToSubscription(data as DbSubscription) : null;
    }),

  checkAccess: publicProcedure
    .input(z.object({
      userId: z.string(),
      feature: z.enum(["courses", "ai_coach", "hire_pro_listing", "referral_program", "credit_tips"]),
    }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", input.userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("[subscriptions.checkAccess] Database error:", error.message);
        throw new Error(`Failed to check access: ${error.message}`);
      }

      if (!data) {
        return { hasAccess: input.feature === "credit_tips", tier: "free" as const };
      }

      const subscription = data as DbSubscription;
      const tier = subscription.tier || subscription.plan;
      const now = new Date();
      const initialExpiry = subscription.initial_registration_expiry
        ? new Date(subscription.initial_registration_expiry)
        : null;
      const isInInitialPeriod = initialExpiry ? now < initialExpiry : false;

      const accessMap: Record<string, boolean> = {
        credit_tips: true,
        courses: tier === "ace1_student" || tier === "cso_affiliate",
        ai_coach: (tier === "ace1_student" || tier === "cso_affiliate") && isInInitialPeriod,
        hire_pro_listing: tier === "cso_affiliate",
        referral_program: tier === "ace1_student" || tier === "cso_affiliate",
      };

      return {
        hasAccess: accessMap[input.feature] || false,
        tier,
        isInInitialPeriod,
        initialExpiryDate: subscription.initial_registration_expiry,
      };
    }),

  getReferralStats: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const { data: referralRows, error: referralError } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", input.userId);

      if (referralError) {
        console.error("[subscriptions.getReferralStats] Database error:", referralError.message);
        throw new Error(`Failed to fetch referral stats: ${referralError.message}`);
      }

      const referrals = referralRows || [];

      const ace1Count = referrals.filter((r) => r.referral_type === "ace1_student" && r.status === "active").length;
      const csoCount = referrals.filter((r) => r.referral_type === "cso_affiliate" && r.status === "active").length;
      const advancedCount = referrals.filter((r) => r.referral_type === "advanced_course" && r.status === "active").length;
      const bundleCount = referrals.filter((r) => r.referral_type === "bundle" && r.status === "active").length;
      const totalEarned = referrals.reduce((sum, r) => sum + (Number(r.total_earned) || 0), 0);

      // The referrer's own tier decides both the ACE-1 rate and the bundle
      // split, so it is read here rather than assumed from the referral rows.
      const { data: subRow } = await supabase
        .from("subscriptions")
        .select("tier, plan")
        .eq("user_id", input.userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const referrerTier = (subRow?.tier || subRow?.plan) ?? "free";
      const isCSO = referrerTier === "cso_affiliate";

      return {
        ace1Referrals: ace1Count,
        csoReferrals: csoCount,
        advancedCourseReferrals: advancedCount,
        bundleReferrals: bundleCount,
        totalReferrals: referrals.length,
        totalEarned,
        referrerTier,
        ace1BonusRate: ace1BonusFor(referrerTier),
        advancedCourseBounty: REFERRAL_BONUSES.advanced_course,
        bundleCommissionRate: isCSO ? REFERRAL_BONUSES.bundle_cso : REFERRAL_BONUSES.bundle_standard,
      };
    }),

  /**
   * SANDBOX TESTING ONLY: Mark an ACE-1 subscription as paid without requiring
   * actual payment processing. This is used during development and testing to
   * simulate a user who has completed the certificate payment and should have
   * full access to the Credit Repair Tool.
   *
   * In production, this will be replaced with a webhook handler that updates
   * `certificate_paid` when the actual payment processor (PayPal, Stripe, etc.)
   * confirms payment completion.
   *
   * Usage: Call this after the trial period ends or when you want to test
   * paid functionality without processing an actual payment.
   */
  markCertificatePaid: publicProcedure
    .input(z.object({
      userId: z.string().uuid("userId must be a valid UUID"),
      subscriptionId: z.string().uuid("subscriptionId must be a valid UUID"),
    }))
    .mutation(async ({ input }) => {
      console.log(
        `[subscriptions.markCertificatePaid] Marking subscription ${input.subscriptionId} as paid for user ${input.userId}`
      );

      const { data, error } = await supabase
        .from("subscriptions")
        .update({
          certificate_paid: true,
          // Also set the billing start date to now (trial has ended)
          start_date: new Date().toISOString(),
        })
        .eq("id", input.subscriptionId)
        .eq("user_id", input.userId)
        .select()
        .single();

      if (error) {
        console.error("[subscriptions.markCertificatePaid] Database error:", error.message);
        throw new Error(`Failed to mark certificate as paid: ${error.message}`);
      }

      if (!data) {
        throw new Error(
          `Subscription not found or does not belong to this user. ID: ${input.subscriptionId}`
        );
      }

      console.log("[subscriptions.markCertificatePaid] Successfully marked as paid");

      return {
        success: true,
        subscription: data ? dbToSubscription(data as DbSubscription) : null,
        message: "Subscription marked as paid. Credit Repair Tool access should now be available.",
      };
    }),
});

async function processReferralBonus(
  referrerId: string,
  referredUserId: string,
  tier: "ace1_student" | "cso_affiliate",
) {
  const { data: referredUser } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", referredUserId)
    .maybeSingle();

  const referredUserName = referredUser?.name ?? "Unknown";
  const referredUserEmail = referredUser?.email ?? "";

  // The payout is set by the REFERRER's tier, not the referee's: a free member
  // earns $25 on an ACE-1 referral while an enrolled student or CSO earns $50.
  const { data: referrerSub } = await supabase
    .from("subscriptions")
    .select("tier, plan")
    .eq("user_id", referrerId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const referrerTier = (referrerSub?.tier || referrerSub?.plan) ?? "free";
  const bonusAmount = tier === "ace1_student" ? ace1BonusFor(referrerTier) : 0;

  // The bonus is only earned once the referred student keeps the account open
  // past the 7-day window, so it is banked as pending until that date passes.
  const qualifiesAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: referral, error: referralError } = await supabase
    .from("referrals")
    .insert({
      referrer_id: referrerId,
      referred_user_id: referredUserId,
      referred_user_name: referredUserName,
      referred_user_email: referredUserEmail,
      referral_type: tier,
      status: "active",
      referrer_tier_at_signup: referrerTier,
      qualifies_at: qualifiesAt,
      total_earned: bonusAmount,
    })
    .select()
    .single();

  if (referralError) {
    console.error("[processReferralBonus] Failed to create referral:", referralError.message);
    return;
  }

  if (bonusAmount > 0) {
    const { data: wallet } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", referrerId)
      .maybeSingle();

    if (wallet) {
      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        user_id: referrerId,
        type: "referral_bonus",
        amount: bonusAmount,
        status: "pending",
        description: `ACE-1 Referral Bonus - ${referredUserName}`,
        reference_id: referral?.id,
        reference_type: "subscription",
      });

      await supabase
        .from("wallets")
        .update({
          pending_balance: Number(wallet.pending_balance || 0) + bonusAmount,
          total_earned: Number(wallet.total_earned || 0) + bonusAmount,
        })
        .eq("id", wallet.id);
    }
  }
}
