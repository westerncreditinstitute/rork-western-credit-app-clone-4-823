import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

export const walletRouter = createTRPCRouter({
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
          query: `SELECT * FROM wallets WHERE userId = '${input.userId}'`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch wallet");
      }

      const data = await response.json();
      return data[0]?.result?.[0] || null;
    }),

  create: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = new Date().toISOString();
      const id = `wallets:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const wallet = {
        id,
        userId: input.userId,
        availableBalance: 0,
        pendingBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
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
          query: `CREATE ${id} CONTENT ${JSON.stringify(wallet)}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create wallet");
      }

      const data = await response.json();
      return data[0]?.result?.[0] || wallet;
    }),

  getTransactions: publicProcedure
    .input(z.object({ 
      userId: z.string(),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
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
          query: `SELECT * FROM wallet_transactions WHERE userId = '${input.userId}' ORDER BY createdAt DESC LIMIT ${input.limit} START ${input.offset}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();
      return data[0]?.result || [];
    }),

  addTransaction: publicProcedure
    .input(z.object({
      userId: z.string(),
      walletId: z.string(),
      type: z.enum(["referral_bonus", "residual_income", "commission", "payout", "consultation"]),
      amount: z.number(),
      description: z.string(),
      referenceId: z.string().optional(),
      referenceType: z.enum(["subscription", "sale", "consultation"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = new Date().toISOString();
      const id = `wallet_transactions:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const transaction = {
        id,
        walletId: input.walletId,
        userId: input.userId,
        type: input.type,
        amount: input.amount,
        status: input.type === "payout" ? "pending" : "pending",
        description: input.description,
        referenceId: input.referenceId,
        referenceType: input.referenceType,
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
          query: `CREATE ${id} CONTENT ${JSON.stringify(transaction)}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add transaction");
      }

      if (input.type !== "payout") {
        await fetch(`${endpoint}/sql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "surreal-ns": namespace,
            "surreal-db": "app",
          },
          body: JSON.stringify({
            query: `UPDATE ${input.walletId} SET pendingBalance += ${input.amount}, totalEarned += ${input.amount}, updatedAt = '${now}'`,
          }),
        });
      }

      const data = await response.json();
      return data[0]?.result?.[0] || transaction;
    }),

  processMonthlyPayouts: publicProcedure
    .mutation(async () => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = new Date().toISOString();

      const pendingTxResponse = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `SELECT * FROM wallet_transactions WHERE status = 'pending' AND type != 'payout'`,
        }),
      });

      const pendingData = await pendingTxResponse.json();
      const pendingTransactions = pendingData[0]?.result || [];

      const userTotals: Record<string, { walletId: string; amount: number }> = {};

      for (const tx of pendingTransactions) {
        if (!userTotals[tx.userId]) {
          userTotals[tx.userId] = { walletId: tx.walletId, amount: 0 };
        }
        userTotals[tx.userId].amount += tx.amount;

        await fetch(`${endpoint}/sql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "surreal-ns": namespace,
            "surreal-db": "app",
          },
          body: JSON.stringify({
            query: `UPDATE ${tx.id} SET status = 'completed', processedAt = '${now}'`,
          }),
        });
      }

      for (const [, data] of Object.entries(userTotals)) {
        await fetch(`${endpoint}/sql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "surreal-ns": namespace,
            "surreal-db": "app",
          },
          body: JSON.stringify({
            query: `UPDATE ${data.walletId} SET 
              availableBalance += ${data.amount}, 
              pendingBalance -= ${data.amount}, 
              lastPayoutDate = '${now}',
              updatedAt = '${now}'`,
          }),
        });
      }

      return { 
        processed: pendingTransactions.length, 
        users: Object.keys(userTotals).length,
        processedAt: now,
      };
    }),

  processResidualIncome: publicProcedure
    .mutation(async () => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = new Date().toISOString();
      const currentMonth = new Date().toISOString().slice(0, 7);

      const csoAffiliatesResponse = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `SELECT * FROM subscriptions WHERE tier = 'cso_affiliate' AND status = 'active'`,
        }),
      });

      const csoData = await csoAffiliatesResponse.json();
      const activeCSOs = csoData[0]?.result || [];

      let totalProcessed = 0;

      for (const cso of activeCSOs) {
        if (!cso.referredBy) continue;

        const referrerSubResponse = await fetch(`${endpoint}/sql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "surreal-ns": namespace,
            "surreal-db": "app",
          },
          body: JSON.stringify({
            query: `SELECT * FROM subscriptions WHERE userId = '${cso.referredBy}' AND status = 'active' AND tier = 'cso_affiliate'`,
          }),
        });

        const referrerData = await referrerSubResponse.json();
        const referrerSub = referrerData[0]?.result?.[0];

        if (!referrerSub) continue;

        const referralsCountResponse = await fetch(`${endpoint}/sql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "surreal-ns": namespace,
            "surreal-db": "app",
          },
          body: JSON.stringify({
            query: `SELECT count() as count FROM referrals WHERE referrerId = '${cso.referredBy}' AND referralType = 'cso_affiliate' AND status = 'active' GROUP ALL`,
          }),
        });

        const countData = await referralsCountResponse.json();
        const csoReferralCount = countData[0]?.result?.[0]?.count || 0;

        const residualRate = csoReferralCount >= 100 ? 0.75 : 0.50;
        const residualAmount = 49.99 * residualRate;

        const walletResponse = await fetch(`${endpoint}/sql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "surreal-ns": namespace,
            "surreal-db": "app",
          },
          body: JSON.stringify({
            query: `SELECT * FROM wallets WHERE userId = '${cso.referredBy}'`,
          }),
        });

        const walletData = await walletResponse.json();
        const wallet = walletData[0]?.result?.[0];

        if (wallet) {
          const txId = `wallet_transactions:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const transaction = {
            id: txId,
            walletId: wallet.id,
            userId: cso.referredBy,
            type: "residual_income",
            amount: residualAmount,
            status: "pending",
            description: `CSO Affiliate Residual Income (${Math.round(residualRate * 100)}%) - ${currentMonth}`,
            referenceId: cso.id,
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
              query: `UPDATE ${wallet.id} SET pendingBalance += ${residualAmount}, totalEarned += ${residualAmount}, updatedAt = '${now}'`,
            }),
          });

          totalProcessed++;
        }
      }

      return { 
        processedResiduals: totalProcessed, 
        month: currentMonth,
        processedAt: now,
      };
    }),

  requestPayout: publicProcedure
    .input(z.object({
      userId: z.string(),
      walletId: z.string(),
      amount: z.number(),
      paymentMethod: z.enum(["bank_transfer", "paypal", "check"]),
      paymentDetails: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const walletResponse = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `SELECT * FROM wallets WHERE id = '${input.walletId}'`,
        }),
      });

      const walletData = await walletResponse.json();
      const wallet = walletData[0]?.result?.[0];

      if (!wallet || wallet.availableBalance < input.amount) {
        throw new Error("Insufficient balance");
      }

      const now = new Date().toISOString();
      const id = `payout_requests:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const payoutRequest = {
        id,
        userId: input.userId,
        walletId: input.walletId,
        amount: input.amount,
        status: "pending",
        paymentMethod: input.paymentMethod,
        paymentDetails: input.paymentDetails,
        requestedAt: now,
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
          query: `CREATE ${id} CONTENT ${JSON.stringify(payoutRequest)}`,
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
          query: `UPDATE ${input.walletId} SET availableBalance -= ${input.amount}, updatedAt = '${now}'`,
        }),
      });

      const txId = `wallet_transactions:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `CREATE ${txId} CONTENT ${JSON.stringify({
            id: txId,
            walletId: input.walletId,
            userId: input.userId,
            type: "payout",
            amount: -input.amount,
            status: "pending",
            description: `Payout Request - ${input.paymentMethod}`,
            referenceId: id,
            createdAt: now,
          })}`,
        }),
      });

      return payoutRequest;
    }),

  getPayoutHistory: publicProcedure
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
          query: `SELECT * FROM payout_requests WHERE userId = '${input.userId}' ORDER BY requestedAt DESC`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch payout history");
      }

      const data = await response.json();
      return data[0]?.result || [];
    }),
});
