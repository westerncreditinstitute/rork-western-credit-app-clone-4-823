// Token Context - Manages MUSO token state and operations

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { TokenEngineService } from '../services/TokenEngineService';
import { BankSystemService } from '../services/BankSystemService';
import { TransactionProcessor } from '../services/TransactionProcessor';
import { ExchangeRateService } from '../services/ExchangeRateService';
import {
  PlayerTokenWallet,
  TokenTransaction,
  PlayerBankAccount,
  GameTransaction,
} from '../types/token';

interface TokenContextType {
  // State
  wallet: PlayerTokenWallet | null;
  bankAccount: PlayerBankAccount | null;
  transactions: TokenTransaction[];
  gameTransactions: GameTransaction[];
  isLoading: boolean;
  error: string | null;

  // Computed values
  tokenBalance: number;
  bankBalance: number;
  availableBalance: number;
  totalMinted: number;
  totalBurned: number;
  exchangeRate: { musoPerDollar: number; dollarsPerMusso: number };

  // Actions
  initializeWallet: () => Promise<void>;
  loadTransactions: () => Promise<void>;
  loadGameTransactions: () => Promise<void>;
  refreshData: () => Promise<void>;
  processIncome: (amount: number, category: string, description?: string) => Promise<void>;
  processExpense: (amount: number, category: string, description?: string) => Promise<void>;
  syncTokenBalance: () => Promise<void>;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export function TokenProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [wallet, setWallet] = useState<PlayerTokenWallet | null>(null);
  const [bankAccount, setBankAccount] = useState<PlayerBankAccount | null>(null);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [gameTransactions, setGameTransactions] = useState<GameTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed values
  const tokenBalance = wallet?.musoBalance || 0;
  const bankBalance = bankAccount?.balance || 0;
  const availableBalance = bankAccount?.availableBalance || 0;
  const totalMinted = wallet?.totalMinted || 0;
  const totalBurned = wallet?.totalBurned || 0;
  const exchangeRate = ExchangeRateService.getExchangeRate();

  // Initialize session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Load token transactions
   */
  const loadTransactionsInternal = useCallback(async (userId: string) => {
    try {
      const txs = await TokenEngineService.getTokenTransactions(userId, 50, 0);
      setTransactions(txs);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    }
  }, []);

  /**
   * Load game transactions
   */
  const loadGameTransactionsInternal = useCallback(async (userId: string) => {
    try {
      const txs = await BankSystemService.getAccountStatement(userId, 50, 0);
      setGameTransactions(txs);
    } catch (err) {
      console.error('Failed to load game transactions:', err);
    }
  }, []);

  /**
   * Initialize token wallet and bank account
   */
  const initializeWallet = useCallback(async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get or create token wallet
      let tokenWallet = await TokenEngineService.getWalletByPlayerId(session.user.id);
      if (!tokenWallet) {
        tokenWallet = await TokenEngineService.createWallet({
          playerId: session.user.id,
          initialBalance: 0,
        });
      }
      setWallet(tokenWallet);

      // Get or create bank account
      let bankAcc = await BankSystemService.getBankAccount(session.user.id);
      if (!bankAcc) {
        bankAcc = await BankSystemService.createBankAccount(session.user.id, 'checking', 0);
      }
      setBankAccount(bankAcc);

      // Load initial transactions
      await loadTransactionsInternal(session.user.id);
      await loadGameTransactionsInternal(session.user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize wallet');
      console.error('Wallet initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, loadTransactionsInternal, loadGameTransactionsInternal]);

  // Initialize wallet when session changes
  useEffect(() => {
    if (session?.user) {
      initializeWallet();
    } else {
      setWallet(null);
      setBankAccount(null);
      setTransactions([]);
      setGameTransactions([]);
    }
  }, [session, initializeWallet]);

  const loadTransactions = useCallback(async () => {
    if (!session?.user?.id) return;
    await loadTransactionsInternal(session.user.id);
  }, [session?.user?.id, loadTransactionsInternal]);

  const loadGameTransactions = useCallback(async () => {
    if (!session?.user?.id) return;
    await loadGameTransactionsInternal(session.user.id);
  }, [session?.user?.id, loadGameTransactionsInternal]);

  /**
   * Refresh all data
   */
  const refreshData = useCallback(async () => {
    await initializeWallet();
  }, [initializeWallet]);

  /**
   * Process income transaction
   */
  const processIncome = useCallback(async (amount: number, category: string, description?: string) => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      await TransactionProcessor.processIncome(session.user.id, amount, category as any, description);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process income');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, refreshData]);

  /**
   * Process expense transaction
   */
  const processExpense = useCallback(async (amount: number, category: string, description?: string) => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      await TransactionProcessor.processExpense(session.user.id, amount, category as any, description);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process expense');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, refreshData]);

  /**
   * Sync token balance with game balance
   */
  const syncTokenBalance = useCallback(async () => {
    if (!session?.user?.id || !bankAccount) return;

    setIsLoading(true);
    setError(null);

    try {
      await TransactionProcessor.syncTokenBalance(session.user.id, bankAccount.balance, 'manual');
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync balance');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, bankAccount, refreshData]);

  const value: TokenContextType = {
    // State
    wallet,
    bankAccount,
    transactions,
    gameTransactions,
    isLoading,
    error,

    // Computed values
    tokenBalance,
    bankBalance,
    availableBalance,
    totalMinted,
    totalBurned,
    exchangeRate,

    // Actions
    initializeWallet,
    loadTransactions,
    loadGameTransactions,
    refreshData,
    processIncome,
    processExpense,
    syncTokenBalance,
  };

  return <TokenContext.Provider value={value}>{children}</TokenContext.Provider>;
}

export function useToken() {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error('useToken must be used within a TokenProvider');
  }
  return context;
}