import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

const SUBSCRIPTION_FEES = {
  free: 0,
  ace1_student: 25,
  cso_affiliate: 49.99,
};

const REFERRAL_BONUSES = {
  ace1_student: 25,
  cso_affiliate_base: 0.50,
  cso_affiliate_premium: 0.75,
  sale_commission: 0.20,
};

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
      
      const initialExpiry = input.isInitialRegistration 
        ? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const subscription = {
        id,
        userId: input.userId,
        tier: input.tier,
        status: "active",
        monthlyFee: SUBSCRIPTION_FEES[input.tier],
        startDate: now,
        initialRegistrationDate: input.isInitialRegistration ? now : undefined,
        initialRegistrationExpiry: initialExpiry,
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
        await processReferralBonus(input.referredBy, input.userId, input.tier, endpoint, namespace, token);
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
      const totalEarned = referrals.reduce((sum: number, r: any) => sum + (r.totalEarned || 0), 0);

      const residualRate = csoCount >= 100 ? 0.75 : 0.50;

      return {
        ace1Referrals: ace1Count,
        csoReferrals: csoCount,
        totalReferrals: referrals.length,
        totalEarned,
        currentResidualRate: residualRate,
        nextTierAt: csoCount >= 100 ? null : 100 - csoCount,
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

  const bonusAmount = tier === "ace1_student" ? REFERRAL_BONUSES.ace1_student : 0;
  const commissionRate = tier === "cso_affiliate" ? REFERRAL_BONUSES.cso_affiliate_base : 0;

  const referral = {
    id: referralId,
    referrerId,
    referredUserId,
    referredUserName: referredUser.name,
    referredUserEmail: referredUser.email,
    referralType: tier,
    status: "active",
    commissionRate,
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
        description: `ACE-1 Student Referral Bonus - ${referredUser.name}`,
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
