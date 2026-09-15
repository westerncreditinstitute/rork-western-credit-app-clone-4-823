import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

/**
 * Server-side mirror of `expo/constants/pricing.ts`.
 *
 * The backend cannot import from the app bundle, so these values are
 * duplicated deliberately. If a price changes, it must change in BOTH files -
 * and in `Pricing.swift` for iOS.
 */
const SUBSCRIPTION_FEES = {
  free: 0,
  ace1_student: 49.99,
  cso_affiliate: 50,
};

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

export const subscriptionsRouter = createTRPCRouter({
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
          query: `SELECT * FROM subscriptions WHERE userId = '${input.userId}' ORDER BY createdAt DESC LIMIT 1`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Database error:", errorText);
        throw new Error(`Failed to fetch subscription: ${response.status}`);
      }

      const data = await response.json();
      return data[0]?.result?.[0] || null;
    }),

  create: publicProcedure
    .input(z.object({
      userId: z.string(),
      tier: z.enum(["free", "ace1_student", "cso_affiliate"]),
      referredBy: z.string().optional(),
      isInitialRegistration: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = new Date().toISOString();
      const id = `subscriptions:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // ACE-1 is free for 60 days after the certificate fee is paid. This is
      // the access window, and is deliberately separate from the 7-day
      // referral qualifying window used by `processReferralBonus`.
      const trialDays = input.tier === 'ace1_student' ? 60 : 30;
      const expiryDate = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

      const subscription = {
        id,
        userId: input.userId,
        tier: input.tier,
        status: "active",
        monthlyFee: SUBSCRIPTION_FEES[input.tier],
        startDate: now,
        endDate: input.tier === 'ace1_student' ? expiryDate : undefined,
        initialRegistrationDate: input.isInitialRegistration ? now : undefined,
        initialRegistrationExpiry: input.isInitialRegistration ? expiryDate : undefined,
        autoRenew: true,
        referredBy: input.referredBy,
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
          query: `CREATE ${id} CONTENT ${JSON.stringify(subscription)}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create subscription");
      }

      if (input.referredBy && input.tier !== "free") {
        // A referral must never block the subscription it was triggered by:
        // the student has already paid, so a bookkeeping failure is logged
        // and reconciled rather than surfaced as a failed enrollment.
        try {
          await processReferralBonus(input.referredBy, input.userId, input.tier, endpoint, namespace, token);
        } catch (error) {
          console.error(
            "[subscriptions] Referral bonus failed for referrer",
            input.referredBy,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      const data = await response.json();
      return data[0]?.result?.[0] || subscription;
    }),

  upgrade: publicProcedure
    .input(z.object({
      subscriptionId: z.string(),
      newTier: z.enum(["ace1_student", "cso_affiliate"]),
    }))
    .mutation(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = new Date().toISOString();
      const query = `UPDATE ${input.subscriptionId} SET 
        tier = '${input.newTier}', 
        monthlyFee = ${SUBSCRIPTION_FEES[input.newTier]},
        updatedAt = '${now}'`;

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
        throw new Error("Failed to upgrade subscription");
      }

      const data = await response.json();
      return data[0]?.result?.[0] || null;
    }),

  cancel: publicProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .mutation(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = new Date().toISOString();
      const query = `UPDATE ${input.subscriptionId} SET 
        status = 'cancelled', 
        autoRenew = false,
        endDate = '${now}',
        updatedAt = '${now}'`;

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
        throw new Error("Failed to cancel subscription");
      }

      const data = await response.json();
      return data[0]?.result?.[0] || null;
    }),

  checkAccess: publicProcedure
    .input(z.object({ 
      userId: z.string(),
      feature: z.enum(["courses", "ai_coach", "hire_pro_listing", "referral_program", "credit_tips"]),
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
          query: `SELECT * FROM subscriptions WHERE userId = '${input.userId}' AND status = 'active' ORDER BY createdAt DESC LIMIT 1`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to check access");
      }

      const data = await response.json();
      const subscription = data[0]?.result?.[0];

      if (!subscription) {
        return { hasAccess: input.feature === "credit_tips", tier: "free" as const };
      }

      const tier = subscription.tier;
      const now = new Date();
      const initialExpiry = subscription.initialRegistrationExpiry 
        ? new Date(subscription.initialRegistrationExpiry)
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
        initialExpiryDate: subscription.initialRegistrationExpiry,
      };
    }),

  getReferralStats: publicProcedure
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
          query: `SELECT * FROM referrals WHERE referrerId = '${input.userId}'`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch referral stats");
      }

      const data = await response.json();
      const referrals = data[0]?.result || [];

      const ace1Count = referrals.filter((r: any) => r.referralType === "ace1_student" && r.status === "active").length;
      const csoCount = referrals.filter((r: any) => r.referralType === "cso_affiliate" && r.status === "active").length;
      const advancedCount = referrals.filter((r: any) => r.referralType === "advanced_course" && r.status === "active").length;
      const bundleCount = referrals.filter((r: any) => r.referralType === "bundle" && r.status === "active").length;
      const totalEarned = referrals.reduce((sum: number, r: any) => sum + (r.totalEarned || 0), 0);

      // The referrer's own tier decides both the ACE-1 rate and the bundle
      // split, so it is read here rather than assumed from the referral rows.
      const subResponse = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `SELECT tier FROM subscriptions WHERE userId = '${input.userId}' AND status = 'active' ORDER BY createdAt DESC LIMIT 1`,
        }),
      });

      const subData = subResponse.ok ? await subResponse.json() : null;
      const referrerTier = subData?.[0]?.result?.[0]?.tier ?? "free";
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
});

async function processReferralBonus(
  referrerId: string, 
  referredUserId: string, 
  tier: "ace1_student" | "cso_affiliate",
  endpoint: string,
  namespace: string,
  token: string
) {
  const now = new Date().toISOString();
  const referralId = `referrals:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const userResponse = await fetch(`${endpoint}/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "surreal-ns": namespace,
      "surreal-db": "app",
    },
    body: JSON.stringify({
      query: `SELECT name, email FROM users WHERE id = '${referredUserId}'`,
    }),
  });

  const userData = await userResponse.json();
  const referredUser = userData[0]?.result?.[0] || { name: "Unknown", email: "" };

  // The payout is set by the REFERRER's tier, not the referee's: a free member
  // earns $25 on an ACE-1 referral while an enrolled student or CSO earns $50.
  const referrerResponse = await fetch(`${endpoint}/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "surreal-ns": namespace,
      "surreal-db": "app",
    },
    body: JSON.stringify({
      query: `SELECT tier FROM subscriptions WHERE userId = '${referrerId}' AND status = 'active' ORDER BY createdAt DESC LIMIT 1`,
    }),
  });

  const referrerData = referrerResponse.ok ? await referrerResponse.json() : null;
  const referrerTier = referrerData?.[0]?.result?.[0]?.tier ?? "free";

  const bonusAmount = tier === "ace1_student" ? ace1BonusFor(referrerTier) : 0;

  // The bonus is only earned once the referred student keeps the account open
  // past the 7-day window, so it is banked as pending until that date passes.
  const qualifiesAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const referral = {
    id: referralId,
    referrerId,
    referredUserId,
    referredUserName: referredUser.name,
    referredUserEmail: referredUser.email,
    referralType: tier,
    status: "active",
    referrerTierAtSignup: referrerTier,
    qualifiesAt,
    totalEarned: bonusAmount,
    createdAt: now,
    updatedAt: now,
  };

  await fetch(`${endpoint}/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "surreal-ns": namespace,
      "surreal-db": "app",
    },
    body: JSON.stringify({
      query: `CREATE ${referralId} CONTENT ${JSON.stringify(referral)}`,
    }),
  });

  if (bonusAmount > 0) {
    const walletResponse = await fetch(`${endpoint}/sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "surreal-ns": namespace,
        "surreal-db": "app",
      },
      body: JSON.stringify({
        query: `SELECT * FROM wallets WHERE userId = '${referrerId}'`,
      }),
    });

    const walletData = await walletResponse.json();
    const wallet = walletData[0]?.result?.[0];

    if (wallet) {
      const txId = `wallet_transactions:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const transaction = {
        id: txId,
        walletId: wallet.id,
        userId: referrerId,
        type: "referral_bonus",
        amount: bonusAmount,
        status: "pending",
        description: `ACE-1 Referral Bonus - ${referredUser.name}`,
        referenceId: referralId,
        referenceType: "subscription",
        createdAt: now,
      };

      await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `CREATE ${txId} CONTENT ${JSON.stringify(transaction)}`,
        }),
      });

      await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `UPDATE ${wallet.id} SET pendingBalance += ${bonusAmount}, totalEarned += ${bonusAmount}, updatedAt = '${now}'`,
        }),
      });
    }
  }
}
