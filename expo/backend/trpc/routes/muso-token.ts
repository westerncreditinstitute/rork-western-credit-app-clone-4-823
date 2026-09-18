import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
// Replaces the old SurrealDB HTTP client (process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT),
// which no longer exists after the Railway migration. Backed by the new
// `muso_wallets` / `muso_transactions` / `muso_swap_registrations` Supabase
// tables (see migrations/029_providers_avatars_muso_supabase.sql).
// NOTE: as of this fix, no UI code calls this router (it is separate from the
// in-game `GameContext` `musoToken` local state), but it is fixed for
// correctness per explicit request.
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

const TOKEN_CONFIG = {
  name: "Moola Social",
  symbol: "MUSO",
  decimals: 18,
  network: "sepolia",
  exchangeRate: 1.0,
};

const MAINNET_SWAP_CONFIG = {
  enabled: true,
  status: "accumulating",
  announcedSplitRatio: null,
  estimatedLaunchDate: null,
  minTokensForEligibility: 100,
  description: "Testnet MUSO tokens will be eligible for mainnet token swap when MUSO launches on major exchanges. The swap ratio will be announced prior to mainnet launch.",
};

interface DbWallet {
  id: string;
  player_id: string;
  address: string;
  balance: number;
  total_minted: number;
  total_burned: number;
  last_updated: number | null;
  created_at: string;
  updated_at: string;
}

interface DbTransaction {
  id: string;
  player_id: string;
  wallet_id: string | null;
  type: string;
  amount: number;
  reason: string | null;
  balance_after: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface DbSwapRegistration {
  id: string;
  player_id: string;
  email: string | null;
  agreed_to_terms: boolean;
  registered_at: number | null;
  snapshot_balance: number;
  snapshot_total_minted: number;
  last_balance_update: number | null;
  status: string;
  eligible: boolean;
  created_at: string;
  updated_at: string;
}

function dbToWallet(db: DbWallet) {
  return {
    id: db.id,
    playerId: db.player_id,
    address: db.address,
    musoToken: {
      balance: Number(db.balance) || 0,
      totalMinted: Number(db.total_minted) || 0,
      totalBurned: Number(db.total_burned) || 0,
      lastUpdated: db.last_updated ?? Date.parse(db.updated_at),
    },
    createdAt: Date.parse(db.created_at),
    updatedAt: Date.parse(db.updated_at),
  };
}

function dbToTransaction(db: DbTransaction) {
  return {
    id: db.id,
    playerId: db.player_id,
    walletId: db.wallet_id,
    type: db.type as "mint" | "burn",
    amount: Number(db.amount) || 0,
    reason: db.reason ?? "",
    timestamp: Date.parse(db.created_at),
    balanceAfter: Number(db.balance_after) || 0,
    metadata: db.metadata ?? {},
  };
}

function dbToRegistration(db: DbSwapRegistration) {
  return {
    id: db.id,
    playerId: db.player_id,
    email: db.email,
    agreedToTerms: db.agreed_to_terms,
    registeredAt: db.registered_at ?? Date.parse(db.created_at),
    snapshotBalance: Number(db.snapshot_balance) || 0,
    snapshotTotalMinted: Number(db.snapshot_total_minted) || 0,
    lastBalanceUpdate: db.last_balance_update ?? Date.parse(db.updated_at),
    status: db.status,
    eligible: db.eligible,
  };
}

function makeWalletAddress(playerId: string): string {
  return `0x${playerId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40).padEnd(40, "0")}`;
}

async function getOrCreateWallet(playerId: string, initialBalance = 0): Promise<DbWallet> {
  const { data: existing, error: fetchError } = await supabase
    .from("muso_wallets")
    .select("*")
    .eq("player_id", playerId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to fetch wallet: ${fetchError.message}`);
  }

  if (existing) {
    return existing as DbWallet;
  }

  const now = Date.now();
  const { data: created, error: createError } = await supabase
    .from("muso_wallets")
    .insert({
      player_id: playerId,
      address: makeWalletAddress(playerId),
      balance: initialBalance,
      total_minted: initialBalance,
      total_burned: 0,
      last_updated: now,
    })
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create wallet: ${createError.message}`);
  }

  return created as DbWallet;
}

export const musoTokenRouter = createTRPCRouter({
  getWallet: publicProcedure
    .input(z.object({ playerId: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("muso_wallets")
        .select("*")
        .eq("player_id", input.playerId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch token wallet: ${error.message}`);
      }

      return data ? dbToWallet(data as DbWallet) : null;
    }),

  createWallet: publicProcedure
    .input(z.object({
      playerId: z.string(),
      initialBalance: z.number().optional().default(0),
    }))
    .mutation(async ({ input }) => {
      const wallet = await getOrCreateWallet(input.playerId, input.initialBalance);
      return dbToWallet(wallet);
    }),

  mintTokens: publicProcedure
    .input(z.object({
      playerId: z.string(),
      amount: z.number().positive(),
      reason: z.string(),
      metadata: z.object({
        source: z.string().optional(),
        category: z.string().optional(),
        relatedId: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const now = Date.now();
      const wallet = await getOrCreateWallet(input.playerId);

      const newBalance = Number(wallet.balance) + input.amount;
      const newTotalMinted = Number(wallet.total_minted) + input.amount;

      const { error: updateError } = await supabase
        .from("muso_wallets")
        .update({
          balance: newBalance,
          total_minted: newTotalMinted,
          last_updated: now,
        })
        .eq("id", wallet.id);

      if (updateError) {
        throw new Error(`Failed to update wallet: ${updateError.message}`);
      }

      const { data: txData, error: txError } = await supabase
        .from("muso_transactions")
        .insert({
          player_id: input.playerId,
          wallet_id: wallet.id,
          type: "mint",
          amount: input.amount,
          reason: input.reason,
          balance_after: newBalance,
          metadata: input.metadata ?? {},
        })
        .select()
        .single();

      if (txError) {
        throw new Error(`Failed to record transaction: ${txError.message}`);
      }

      return {
        success: true,
        newBalance,
        transaction: dbToTransaction(txData as DbTransaction),
      };
    }),

  burnTokens: publicProcedure
    .input(z.object({
      playerId: z.string(),
      amount: z.number().positive(),
      reason: z.string(),
      metadata: z.object({
        source: z.string().optional(),
        category: z.string().optional(),
        relatedId: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const now = Date.now();

      const { data: existing, error: fetchError } = await supabase
        .from("muso_wallets")
        .select("*")
        .eq("player_id", input.playerId)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Failed to fetch wallet: ${fetchError.message}`);
      }

      if (!existing) {
        throw new Error("Wallet not found");
      }

      const wallet = existing as DbWallet;

      if (Number(wallet.balance) < input.amount) {
        throw new Error("Insufficient token balance");
      }

      const newBalance = Number(wallet.balance) - input.amount;
      const newTotalBurned = Number(wallet.total_burned) + input.amount;

      const { error: updateError } = await supabase
        .from("muso_wallets")
        .update({
          balance: newBalance,
          total_burned: newTotalBurned,
          last_updated: now,
        })
        .eq("id", wallet.id);

      if (updateError) {
        throw new Error(`Failed to update wallet: ${updateError.message}`);
      }

      const { data: txData, error: txError } = await supabase
        .from("muso_transactions")
        .insert({
          player_id: input.playerId,
          wallet_id: wallet.id,
          type: "burn",
          amount: input.amount,
          reason: input.reason,
          balance_after: newBalance,
          metadata: input.metadata ?? {},
        })
        .select()
        .single();

      if (txError) {
        throw new Error(`Failed to record transaction: ${txError.message}`);
      }

      return {
        success: true,
        newBalance,
        transaction: dbToTransaction(txData as DbTransaction),
      };
    }),

  getTransactions: publicProcedure
    .input(z.object({
      playerId: z.string(),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("muso_transactions")
        .select("*")
        .eq("player_id", input.playerId)
        .order("created_at", { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (error) {
        throw new Error(`Failed to fetch transactions: ${error.message}`);
      }

      return ((data ?? []) as DbTransaction[]).map(dbToTransaction);
    }),

  syncWithGameBalance: publicProcedure
    .input(z.object({
      playerId: z.string(),
      gameBalance: z.number(),
    }))
    .mutation(async ({ input }) => {
      const now = Date.now();
      const targetBalance = Math.max(0, Math.round(input.gameBalance * TOKEN_CONFIG.exchangeRate * 100) / 100);

      const { data: existing, error: fetchError } = await supabase
        .from("muso_wallets")
        .select("*")
        .eq("player_id", input.playerId)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Failed to fetch wallet: ${fetchError.message}`);
      }

      if (!existing) {
        await supabase.from("muso_wallets").insert({
          player_id: input.playerId,
          address: makeWalletAddress(input.playerId),
          balance: targetBalance,
          total_minted: targetBalance,
          total_burned: 0,
          last_updated: now,
        });

        return { success: true, newBalance: targetBalance, synced: true };
      }

      const wallet = existing as DbWallet;
      const currentBalance = Number(wallet.balance);
      const difference = targetBalance - currentBalance;

      if (Math.abs(difference) < 0.01) {
        return { success: true, newBalance: currentBalance, synced: false };
      }

      const newTotalMinted = difference > 0
        ? Number(wallet.total_minted) + difference
        : Number(wallet.total_minted);
      const newTotalBurned = difference < 0
        ? Number(wallet.total_burned) + Math.abs(difference)
        : Number(wallet.total_burned);

      const { error: updateError } = await supabase
        .from("muso_wallets")
        .update({
          balance: targetBalance,
          total_minted: newTotalMinted,
          total_burned: newTotalBurned,
          last_updated: now,
        })
        .eq("id", wallet.id);

      if (updateError) {
        throw new Error(`Failed to update wallet: ${updateError.message}`);
      }

      await supabase.from("muso_transactions").insert({
        player_id: input.playerId,
        wallet_id: wallet.id,
        type: difference > 0 ? "mint" : "burn",
        amount: Math.abs(difference),
        reason: "Game balance sync",
        balance_after: targetBalance,
        metadata: { source: "game_sync", category: "automatic" },
      });

      return { success: true, newBalance: targetBalance, synced: true };
    }),

  getTokenInfo: publicProcedure.query(() => {
    return TOKEN_CONFIG;
  }),

  getMainnetSwapInfo: publicProcedure.query(() => {
    return {
      ...MAINNET_SWAP_CONFIG,
      tokenConfig: TOKEN_CONFIG,
    };
  }),

  registerForMainnetSwap: publicProcedure
    .input(z.object({
      playerId: z.string(),
      email: z.string().email().optional(),
      agreedToTerms: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      if (!input.agreedToTerms) {
        throw new Error("Must agree to swap terms");
      }

      const now = Date.now();

      const { data: walletData } = await supabase
        .from("muso_wallets")
        .select("*")
        .eq("player_id", input.playerId)
        .maybeSingle();

      const wallet = walletData as DbWallet | null;
      const currentBalance = wallet ? Number(wallet.balance) : 0;
      const totalMinted = wallet ? Number(wallet.total_minted) : 0;
      const eligible = currentBalance >= MAINNET_SWAP_CONFIG.minTokensForEligibility;

      const { data, error } = await supabase
        .from("muso_swap_registrations")
        .upsert(
          {
            player_id: input.playerId,
            email: input.email ?? null,
            agreed_to_terms: true,
            registered_at: now,
            snapshot_balance: currentBalance,
            snapshot_total_minted: totalMinted,
            last_balance_update: now,
            status: "registered",
            eligible,
          },
          { onConflict: "player_id" }
        )
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to register for swap: ${error.message}`);
      }

      return {
        success: true,
        registration: dbToRegistration(data as DbSwapRegistration),
        message: "Successfully registered for mainnet swap program",
      };
    }),

  getSwapRegistration: publicProcedure
    .input(z.object({ playerId: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("muso_swap_registrations")
        .select("*")
        .eq("player_id", input.playerId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch swap registration: ${error.message}`);
      }

      return data ? dbToRegistration(data as DbSwapRegistration) : null;
    }),

  updateSwapSnapshot: publicProcedure
    .input(z.object({ playerId: z.string() }))
    .mutation(async ({ input }) => {
      const now = Date.now();

      const { data: walletData, error: walletError } = await supabase
        .from("muso_wallets")
        .select("*")
        .eq("player_id", input.playerId)
        .maybeSingle();

      if (walletError) {
        throw new Error(`Failed to fetch wallet: ${walletError.message}`);
      }

      if (!walletData) {
        throw new Error("Wallet not found");
      }

      const wallet = walletData as DbWallet;
      const currentBalance = Number(wallet.balance);
      const totalMinted = Number(wallet.total_minted);
      const eligible = currentBalance >= MAINNET_SWAP_CONFIG.minTokensForEligibility;

      const { error: updateError } = await supabase
        .from("muso_swap_registrations")
        .update({
          snapshot_balance: currentBalance,
          snapshot_total_minted: totalMinted,
          last_balance_update: now,
          eligible,
        })
        .eq("player_id", input.playerId);

      if (updateError) {
        throw new Error(`Failed to update swap snapshot: ${updateError.message}`);
      }

      return {
        success: true,
        snapshotBalance: currentBalance,
        eligible,
      };
    }),
});
