import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import {
  CSO_MONTHLY_FEE,
  CSO_RESIDUAL_BONUS_MONTHLY,
  CSO_RESIDUAL_BONUS_THRESHOLD,
  CSO_RESIDUAL_MONTHLY,
} from "@/constants/pricing";
// Replaces the old SurrealDB HTTP client (process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT),
// which no longer exists after the Railway migration. Backed by the
// `wallets`, `wallet_transactions`, and `payout_requests` tables
// (migration 028 extends the base schema).
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

function dbToWallet(db: Record<string, unknown>) {
  return {
    id: db.id,
    userId: db.user_id,
    availableBalance: Number(db.available_balance) || 0,
    pendingBalance: Number(db.pending_balance) || 0,
    totalEarned: Number(db.total_earned) || 0,
    totalWithdrawn: Number(db.total_withdrawn) || 0,
    lastPayoutDate: db.last_payout_date ?? undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function dbToTransaction(db: Record<string, unknown>) {
  return {
    id: db.id,
    walletId: db.wallet_id,
    userId: db.user_id,
    type: db.type,
    amount: Number(db.amount) || 0,
    status: db.status,
    description: db.description,
    referenceId: db.reference_id ?? undefined,
    referenceType: db.reference_type ?? undefined,
    createdAt: db.created_at,
  };
}

export const walletRouter = createTRPCRouter({
  getByUserId: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", input.userId)
        .maybeSingle();

      if (error) {
        console.error("[wallet.getByUserId] Database error:", error.message);
        throw new Error(`Failed to fetch wallet: ${error.message}`);
      }

      return data ? dbToWallet(data) : null;
    }),

  create: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      const { data, error } = await supabase
        .from("wallets")
        .upsert(
          {
            user_id: input.userId,
            available_balance: 0,
            pending_balance: 0,
            total_earned: 0,
            total_withdrawn: 0,
          },
          { onConflict: "user_id" },
        )
        .select()
        .single();

      if (error) {
        console.error("[wallet.create] Database error:", error.message);
        throw new Error(`Failed to create wallet: ${error.message}`);
      }

      return dbToWallet(data);
    }),

  getTransactions: publicProcedure
    .input(z.object({
      userId: z.string(),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", input.userId)
        .order("created_at", { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (error) {
        console.error("[wallet.getTransactions] Database error:", error.message);
        throw new Error(`Failed to fetch transactions: ${error.message}`);
      }

      return (data || []).map(dbToTransaction);
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
      const { data, error } = await supabase
        .from("wallet_transactions")
        .insert({
          wallet_id: input.walletId,
          user_id: input.userId,
          type: input.type,
          amount: input.amount,
          status: "pending",
          description: input.description,
          reference_id: input.referenceId,
          reference_type: input.referenceType,
        })
        .select()
        .single();

      if (error) {
        console.error("[wallet.addTransaction] Database error:", error.message);
        throw new Error(`Failed to add transaction: ${error.message}`);
      }

      if (input.type !== "payout") {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("pending_balance, total_earned")
          .eq("id", input.walletId)
          .maybeSingle();

        if (wallet) {
          await supabase
            .from("wallets")
            .update({
              pending_balance: Number(wallet.pending_balance || 0) + input.amount,
              total_earned: Number(wallet.total_earned || 0) + input.amount,
            })
            .eq("id", input.walletId);
        }
      }

      return dbToTransaction(data);
    }),

  processMonthlyPayouts: publicProcedure
    .mutation(async () => {
      const now = new Date().toISOString();

      const { data: pendingTransactions, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("status", "pending")
        .neq("type", "payout");

      if (error) {
        console.error("[wallet.processMonthlyPayouts] Database error:", error.message);
        throw new Error(`Failed to fetch pending transactions: ${error.message}`);
      }

      const transactions = pendingTransactions || [];
      const userTotals: Record<string, { walletId: string; amount: number }> = {};

      for (const tx of transactions) {
        const userId = tx.user_id as string;
        if (!userTotals[userId]) {
          userTotals[userId] = { walletId: tx.wallet_id, amount: 0 };
        }
        userTotals[userId].amount += Number(tx.amount) || 0;

        await supabase
          .from("wallet_transactions")
          .update({ status: "completed", processed_at: now })
          .eq("id", tx.id);
      }

      for (const [, totals] of Object.entries(userTotals)) {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("available_balance, pending_balance")
          .eq("id", totals.walletId)
          .maybeSingle();

        if (wallet) {
          await supabase
            .from("wallets")
            .update({
              available_balance: Number(wallet.available_balance || 0) + totals.amount,
              pending_balance: Number(wallet.pending_balance || 0) - totals.amount,
              last_payout_date: now,
            })
            .eq("id", totals.walletId);
        }
      }

      return {
        processed: transactions.length,
        users: Object.keys(userTotals).length,
        processedAt: now,
      };
    }),

  processResidualIncome: publicProcedure
    .mutation(async () => {
      const now = new Date().toISOString();
      const currentMonth = new Date().toISOString().slice(0, 7);

      const { data: activeCSOs, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("status", "active")
        .or("tier.eq.cso_affiliate,plan.eq.cso_affiliate");

      if (error) {
        console.error("[wallet.processResidualIncome] Database error:", error.message);
        throw new Error(`Failed to fetch CSO affiliates: ${error.message}`);
      }

      let totalProcessed = 0;
      // Counts each referrer's active recruits in the order this run reaches
      // them, so the first CSO_RESIDUAL_BONUS_THRESHOLD get the standard rate
      // and the rest get the bonus rate.
      const referralOrdinals = new Map<string, number>();

      for (const cso of activeCSOs || []) {
        const referredBy = cso.referred_by as string | null;
        if (!referredBy) continue;

        const { data: referrerSub } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", referredBy)
          .eq("status", "active")
          .or("tier.eq.cso_affiliate,plan.eq.cso_affiliate")
          .maybeSingle();

        if (!referrerSub) continue;

        // A referred CSO Affiliate pays CSO_MONTHLY_FEE ($50) a month to stay
        // in the network, and a share of that goes to whoever signed them up,
        // every month for as long as they keep paying: 50% ($25) for each of
        // the first CSO_RESIDUAL_BONUS_THRESHOLD recruits, 75% ($37.50) for
        // every recruit past that.
        const ordinal = referralOrdinals.get(referredBy) ?? 0;
        referralOrdinals.set(referredBy, ordinal + 1);

        const residualAmount =
          ordinal < CSO_RESIDUAL_BONUS_THRESHOLD
            ? CSO_RESIDUAL_MONTHLY
            : CSO_RESIDUAL_BONUS_MONTHLY;

        const { data: wallet } = await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", referredBy)
          .maybeSingle();

        if (wallet) {
          await supabase.from("wallet_transactions").insert({
            wallet_id: wallet.id,
            user_id: referredBy,
            type: "residual_income",
            amount: residualAmount,
            status: "pending",
            description: `CSO Affiliate residual - ${Math.round(
              (residualAmount / CSO_MONTHLY_FEE) * 100
            )}% of ${CSO_MONTHLY_FEE} monthly dues - ${currentMonth}`,
            reference_id: cso.id,
            reference_type: "subscription",
          });

          await supabase
            .from("wallets")
            .update({
              pending_balance: Number(wallet.pending_balance || 0) + residualAmount,
              total_earned: Number(wallet.total_earned || 0) + residualAmount,
            })
            .eq("id", wallet.id);

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
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("id", input.walletId)
        .maybeSingle();

      if (walletError) {
        console.error("[wallet.requestPayout] Database error:", walletError.message);
        throw new Error(`Failed to fetch wallet: ${walletError.message}`);
      }

      if (!wallet || Number(wallet.available_balance) < input.amount) {
        throw new Error("Insufficient balance");
      }

      const { data: payoutRequest, error } = await supabase
        .from("payout_requests")
        .insert({
          user_id: input.userId,
          wallet_id: input.walletId,
          amount: input.amount,
          status: "pending",
          payment_method: input.paymentMethod,
          payment_details: input.paymentDetails,
        })
        .select()
        .single();

      if (error) {
        console.error("[wallet.requestPayout] Database error:", error.message);
        throw new Error(`Failed to request payout: ${error.message}`);
      }

      await supabase
        .from("wallets")
        .update({
          available_balance: Number(wallet.available_balance) - input.amount,
        })
        .eq("id", input.walletId);

      await supabase.from("wallet_transactions").insert({
        wallet_id: input.walletId,
        user_id: input.userId,
        type: "payout",
        amount: -input.amount,
        status: "pending",
        description: `Payout Request - ${input.paymentMethod}`,
        reference_id: payoutRequest.id,
      });

      return {
        id: payoutRequest.id,
        userId: payoutRequest.user_id,
        walletId: payoutRequest.wallet_id,
        amount: Number(payoutRequest.amount),
        status: payoutRequest.status,
        paymentMethod: payoutRequest.payment_method,
        paymentDetails: payoutRequest.payment_details,
        requestedAt: payoutRequest.requested_at,
      };
    }),

  getPayoutHistory: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("user_id", input.userId)
        .order("requested_at", { ascending: false });

      if (error) {
        console.error("[wallet.getPayoutHistory] Database error:", error.message);
        throw new Error(`Failed to fetch payout history: ${error.message}`);
      }

      return (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        walletId: row.wallet_id,
        amount: Number(row.amount),
        status: row.status,
        paymentMethod: row.payment_method,
        paymentDetails: row.payment_details,
        requestedAt: row.requested_at,
      }));
    }),
});
