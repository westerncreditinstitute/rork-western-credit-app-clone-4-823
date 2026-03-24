import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

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

export const musoTokenRouter = createTRPCRouter({
  getWallet: publicProcedure
    .input(z.object({ playerId: z.string() }))
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
          query: `SELECT * FROM muso_wallets WHERE playerId = '${input.playerId}'`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch token wallet");
      }

      const data = await response.json();
      return data[0]?.result?.[0] || null;
    }),

  createWallet: publicProcedure
    .input(z.object({ 
      playerId: z.string(),
      initialBalance: z.number().optional().default(0),
    }))
    .mutation(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = Date.now();
      const walletAddress = `0x${input.playerId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40).padEnd(40, '0')}`;
      const id = `muso_wallets:${input.playerId}`;

      const wallet = {
        id,
        playerId: input.playerId,
        address: walletAddress,
        musoToken: {
          balance: input.initialBalance,
          totalMinted: input.initialBalance,
          totalBurned: 0,
          lastUpdated: now,
        },
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
        throw new Error("Failed to create token wallet");
      }

      const data = await response.json();
      return data[0]?.result?.[0] || wallet;
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
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = Date.now();
      const walletId = `muso_wallets:${input.playerId}`;

      const walletResponse = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `SELECT * FROM muso_wallets WHERE id = '${walletId}'`,
        }),
      });

      const walletData = await walletResponse.json();
      let wallet = walletData[0]?.result?.[0];

      if (!wallet) {
        const walletAddress = `0x${input.playerId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40).padEnd(40, '0')}`;
        wallet = {
          id: walletId,
          playerId: input.playerId,
          address: walletAddress,
          musoToken: {
            balance: 0,
            totalMinted: 0,
            totalBurned: 0,
            lastUpdated: now,
          },
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
            query: `CREATE ${walletId} CONTENT ${JSON.stringify(wallet)}`,
          }),
        });
      }

      const newBalance = wallet.musoToken.balance + input.amount;
      const newTotalMinted = wallet.musoToken.totalMinted + input.amount;

      await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `UPDATE ${walletId} SET 
            musoToken.balance = ${newBalance}, 
            musoToken.totalMinted = ${newTotalMinted}, 
            musoToken.lastUpdated = ${now},
            updatedAt = ${now}`,
        }),
      });

      const txId = `muso_transactions:${now}_${Math.random().toString(36).substr(2, 9)}`;
      const transaction = {
        id: txId,
        playerId: input.playerId,
        walletId,
        type: "mint",
        amount: input.amount,
        reason: input.reason,
        timestamp: now,
        balanceAfter: newBalance,
        metadata: input.metadata || {},
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

      return {
        success: true,
        newBalance,
        transaction,
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
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = Date.now();
      const walletId = `muso_wallets:${input.playerId}`;

      const walletResponse = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `SELECT * FROM muso_wallets WHERE id = '${walletId}'`,
        }),
      });

      const walletData = await walletResponse.json();
      const wallet = walletData[0]?.result?.[0];

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      if (wallet.musoToken.balance < input.amount) {
        throw new Error("Insufficient token balance");
      }

      const newBalance = wallet.musoToken.balance - input.amount;
      const newTotalBurned = wallet.musoToken.totalBurned + input.amount;

      await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `UPDATE ${walletId} SET 
            musoToken.balance = ${newBalance}, 
            musoToken.totalBurned = ${newTotalBurned}, 
            musoToken.lastUpdated = ${now},
            updatedAt = ${now}`,
        }),
      });

      const txId = `muso_transactions:${now}_${Math.random().toString(36).substr(2, 9)}`;
      const transaction = {
        id: txId,
        playerId: input.playerId,
        walletId,
        type: "burn",
        amount: input.amount,
        reason: input.reason,
        timestamp: now,
        balanceAfter: newBalance,
        metadata: input.metadata || {},
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

      return {
        success: true,
        newBalance,
        transaction,
      };
    }),

  getTransactions: publicProcedure
    .input(z.object({
      playerId: z.string(),
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
          query: `SELECT * FROM muso_transactions WHERE playerId = '${input.playerId}' ORDER BY timestamp DESC LIMIT ${input.limit} START ${input.offset}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();
      return data[0]?.result || [];
    }),

  syncWithGameBalance: publicProcedure
    .input(z.object({
      playerId: z.string(),
      gameBalance: z.number(),
    }))
    .mutation(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = Date.now();
      const walletId = `muso_wallets:${input.playerId}`;

      const walletResponse = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `SELECT * FROM muso_wallets WHERE id = '${walletId}'`,
        }),
      });

      const walletData = await walletResponse.json();
      let wallet = walletData[0]?.result?.[0];

      const targetBalance = Math.max(0, Math.round(input.gameBalance * TOKEN_CONFIG.exchangeRate * 100) / 100);

      if (!wallet) {
        const walletAddress = `0x${input.playerId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40).padEnd(40, '0')}`;
        wallet = {
          id: walletId,
          playerId: input.playerId,
          address: walletAddress,
          musoToken: {
            balance: targetBalance,
            totalMinted: targetBalance,
            totalBurned: 0,
            lastUpdated: now,
          },
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
            query: `CREATE ${walletId} CONTENT ${JSON.stringify(wallet)}`,
          }),
        });

        return { success: true, newBalance: targetBalance, synced: true };
      }

      const currentBalance = wallet.musoToken.balance;
      const difference = targetBalance - currentBalance;

      if (Math.abs(difference) < 0.01) {
        return { success: true, newBalance: currentBalance, synced: false };
      }

      const newTotalMinted = difference > 0 
        ? wallet.musoToken.totalMinted + difference 
        : wallet.musoToken.totalMinted;
      const newTotalBurned = difference < 0 
        ? wallet.musoToken.totalBurned + Math.abs(difference) 
        : wallet.musoToken.totalBurned;

      await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `UPDATE ${walletId} SET 
            musoToken.balance = ${targetBalance}, 
            musoToken.totalMinted = ${newTotalMinted},
            musoToken.totalBurned = ${newTotalBurned},
            musoToken.lastUpdated = ${now},
            updatedAt = ${now}`,
        }),
      });

      const txId = `muso_transactions:${now}_${Math.random().toString(36).substr(2, 9)}`;
      const transaction = {
        id: txId,
        playerId: input.playerId,
        walletId,
        type: difference > 0 ? "mint" : "burn",
        amount: Math.abs(difference),
        reason: "Game balance sync",
        timestamp: now,
        balanceAfter: targetBalance,
        metadata: { source: "game_sync", category: "automatic" },
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
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      if (!input.agreedToTerms) {
        throw new Error("Must agree to swap terms");
      }

      const now = Date.now();
      const registrationId = `muso_swap_registrations:${input.playerId}`;

      const walletResponse = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `SELECT * FROM muso_wallets WHERE playerId = '${input.playerId}'`,
        }),
      });

      const walletData = await walletResponse.json();
      const wallet = walletData[0]?.result?.[0];

      const currentBalance = wallet?.musoToken?.balance || 0;
      const totalMinted = wallet?.musoToken?.totalMinted || 0;

      const registration = {
        id: registrationId,
        playerId: input.playerId,
        email: input.email || null,
        agreedToTerms: true,
        registeredAt: now,
        snapshotBalance: currentBalance,
        snapshotTotalMinted: totalMinted,
        lastBalanceUpdate: now,
        status: "registered",
        eligible: currentBalance >= MAINNET_SWAP_CONFIG.minTokensForEligibility,
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
          query: `CREATE ${registrationId} CONTENT ${JSON.stringify(registration)} ON DUPLICATE KEY UPDATE 
            snapshotBalance = ${currentBalance},
            snapshotTotalMinted = ${totalMinted},
            lastBalanceUpdate = ${now},
            eligible = ${currentBalance >= MAINNET_SWAP_CONFIG.minTokensForEligibility}`,
        }),
      });

      return {
        success: true,
        registration,
        message: "Successfully registered for mainnet swap program",
      };
    }),

  getSwapRegistration: publicProcedure
    .input(z.object({ playerId: z.string() }))
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
          query: `SELECT * FROM muso_swap_registrations WHERE playerId = '${input.playerId}'`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch swap registration");
      }

      const data = await response.json();
      return data[0]?.result?.[0] || null;
    }),

  updateSwapSnapshot: publicProcedure
    .input(z.object({ playerId: z.string() }))
    .mutation(async ({ input }) => {
      const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
      const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
      const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

      if (!endpoint || !namespace || !token) {
        throw new Error("Database configuration missing");
      }

      const now = Date.now();
      const registrationId = `muso_swap_registrations:${input.playerId}`;

      const walletResponse = await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `SELECT * FROM muso_wallets WHERE playerId = '${input.playerId}'`,
        }),
      });

      const walletData = await walletResponse.json();
      const wallet = walletData[0]?.result?.[0];

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      const currentBalance = wallet.musoToken.balance;
      const totalMinted = wallet.musoToken.totalMinted;

      await fetch(`${endpoint}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "surreal-ns": namespace,
          "surreal-db": "app",
        },
        body: JSON.stringify({
          query: `UPDATE ${registrationId} SET 
            snapshotBalance = ${currentBalance},
            snapshotTotalMinted = ${totalMinted},
            lastBalanceUpdate = ${now},
            eligible = ${currentBalance >= MAINNET_SWAP_CONFIG.minTokensForEligibility}`,
        }),
      });

      return {
        success: true,
        snapshotBalance: currentBalance,
        eligible: currentBalance >= MAINNET_SWAP_CONFIG.minTokensForEligibility,
      };
    }),
});
