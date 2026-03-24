// Transaction Processor - Processes income and expense transactions and syncs with tokens

import { supabase } from '../lib/supabase';
import { TokenEngineService } from './TokenEngineService';
import { BankSystemService } from './BankSystemService';
import { ExchangeRateService } from './ExchangeRateService';
import {
  GameTransaction,
  GameTransactionType,
  IncomeSource,
  ExpenseCategory,
} from '../types/token';

export class TransactionProcessor {
  /**
   * Process an income transaction (earns money = mints tokens)
   */
  static async processIncome(
    playerId: string,
    amount: number,
    category: IncomeSource,
    description?: string,
    metadata: any = {}
  ): Promise<{ gameTx: GameTransaction; tokenTx?: any }> {
    if (amount <= 0) {
      throw new Error('Income amount must be positive');
    }

    // Create game transaction
    const { data: gameTxData, error: gameTxError } = await supabase
      .from('game_transactions')
      .insert({
        player_id: playerId,
        transaction_type: 'income',
        amount,
        category,
        description,
        metadata: {
          ...metadata,
          source: 'game',
        },
        token_sync_status: 'pending',
      })
      .select()
      .single();

    if (gameTxError) {
      throw new Error(`Failed to create game transaction: ${gameTxError.message}`);
    }

    // Deposit to bank account
    try {
      await BankSystemService.deposit(playerId, amount);
    } catch (bankError) {
      console.error('Bank deposit failed:', bankError);
    }

    // Mint equivalent tokens
    const musoAmount = ExchangeRateService.dollarsToMusos(amount);
    const tokenTx = await TokenEngineService.mintTokens({
      playerId,
      amount: musoAmount,
      reason: `Income: ${category}`,
      metadata: {
        source: 'game_transaction',
        category,
        relatedId: gameTxData.id,
      },
    });

    // Update game transaction with token transaction ID
    await supabase
      .from('game_transactions')
      .update({
        token_transaction_id: tokenTx.id,
        token_sync_status: 'synced',
      })
      .eq('id', gameTxData.id);

    return {
      gameTx: this.mapToGameTransaction(gameTxData),
      tokenTx,
    };
  }

  /**
   * Process an expense transaction (spends money = burns tokens)
   */
  static async processExpense(
    playerId: string,
    amount: number,
    category: ExpenseCategory,
    description?: string,
    metadata: any = {}
  ): Promise<{ gameTx: GameTransaction; tokenTx?: any }> {
    if (amount <= 0) {
      throw new Error('Expense amount must be positive');
    }

    // Create game transaction
    const { data: gameTxData, error: gameTxError } = await supabase
      .from('game_transactions')
      .insert({
        player_id: playerId,
        transaction_type: 'expense',
        amount,
        category,
        description,
        metadata: {
          ...metadata,
          source: 'game',
        },
        token_sync_status: 'pending',
      })
      .select()
      .single();

    if (gameTxError) {
      throw new Error(`Failed to create game transaction: ${gameTxError.message}`);
    }

    // Withdraw from bank account
    try {
      await BankSystemService.withdraw(playerId, amount);
    } catch (bankError) {
      console.error('Bank withdrawal failed:', bankError);
      // Continue even if bank fails - token burn should still happen
    }

    // Burn equivalent tokens
    const musoAmount = ExchangeRateService.dollarsToMusos(amount);
    const tokenTx = await TokenEngineService.burnTokens({
      playerId,
      amount: musoAmount,
      reason: `Expense: ${category}`,
      metadata: {
        source: 'game_transaction',
        category,
        relatedId: gameTxData.id,
      },
    });

    // Update game transaction with token transaction ID
    await supabase
      .from('game_transactions')
      .update({
        token_transaction_id: tokenTx.id,
        token_sync_status: 'synced',
      })
      .eq('id', gameTxData.id);

    return {
      gameTx: this.mapToGameTransaction(gameTxData),
      tokenTx,
    };
  }

  /**
   * Sync token balance with game balance (for reconciliation)
   */
  static async syncTokenBalance(
    playerId: string,
    gameBalance: number,
    syncType: 'auto' | 'manual' = 'auto'
  ): Promise<{
    success: boolean;
    newTokenBalance: number;
    synced: boolean;
    action: 'mint' | 'burn' | 'none';
    amountAdjusted: number;
  }> {
    // Get current token wallet
    const wallet = await TokenEngineService.getWalletByPlayerId(playerId);
    if (!wallet) {
      // Create wallet if it doesn't exist
      await TokenEngineService.createWallet({ playerId, initialBalance: 0 });
      return this.syncTokenBalance(playerId, gameBalance, syncType);
    }

    // Calculate expected token balance
    const expectedBalance = ExchangeRateService.calculateExpectedMussoBalance(gameBalance);
    const currentBalance = wallet.musoBalance;
    const difference = ExchangeRateService.calculateBalanceDifference(currentBalance, expectedBalance);

    // Log sync attempt
    await supabase.from('token_sync_log').insert({
      player_id: playerId,
      sync_type: syncType,
      game_balance: gameBalance,
      token_balance: currentBalance,
      expected_token_balance: expectedBalance,
      difference,
      action_taken: 'none',
      status: 'success',
      metadata: {},
    });

    // Check if sync is needed
    if (!ExchangeRateService.isSyncNeeded(difference)) {
      return {
        success: true,
        newTokenBalance: currentBalance,
        synced: false,
        action: 'none',
        amountAdjusted: 0,
      };
    }

    // Perform mint or burn
    if (difference > 0) {
      // Need to mint tokens
      await TokenEngineService.mintTokens({
        playerId,
        amount: difference,
        reason: 'Game balance sync',
        metadata: { source: 'game_sync', category: 'automatic' },
      });
      return {
        success: true,
        newTokenBalance: currentBalance + difference,
        synced: true,
        action: 'mint',
        amountAdjusted: difference,
      };
    } else {
      // Need to burn tokens
      await TokenEngineService.burnTokens({
        playerId,
        amount: Math.abs(difference),
        reason: 'Game balance sync',
        metadata: { source: 'game_sync', category: 'automatic' },
      });
      return {
        success: true,
        newTokenBalance: currentBalance + difference,
        synced: true,
        action: 'burn',
        amountAdjusted: Math.abs(difference),
      };
    }
  }

  /**
   * Get transaction summary for a player
   */
  static async getTransactionSummary(playerId: string): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    totalTransactions: number;
    recentTransactions: GameTransaction[];
  }> {
    const { data: incomeData } = await supabase
      .from('game_transactions')
      .select('amount')
      .eq('player_id', playerId)
      .eq('transaction_type', 'income');

    const { data: expenseData } = await supabase
      .from('game_transactions')
      .select('amount')
      .eq('player_id', playerId)
      .eq('transaction_type', 'expense');

    const { count } = await supabase
      .from('game_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId);

    const { data: recentTxs } = await supabase
      .from('game_transactions')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(10);

    const totalIncome = incomeData?.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0;
    const totalExpenses = expenseData?.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0;

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      totalTransactions: count || 0,
      recentTransactions: recentTxs?.map(this.mapToGameTransaction) || [],
    };
  }

  /**
   * Process pending game transactions that haven't been synced
   */
  static async processPendingSyncs(playerId: string): Promise<number> {
    const { data: pendingTxs } = await supabase
      .from('game_transactions')
      .select('*')
      .eq('player_id', playerId)
      .eq('token_sync_status', 'pending');

    if (!pendingTxs || pendingTxs.length === 0) {
      return 0;
    }

    let processed = 0;

    for (const tx of pendingTxs) {
      try {
        if (tx.transaction_type === 'income') {
          const musoAmount = ExchangeRateService.dollarsToMusos(parseFloat(tx.amount));
          await TokenEngineService.mintTokens({
            playerId,
            amount: musoAmount,
            reason: `Income: ${tx.category}`,
            metadata: {
              source: 'game_transaction_sync',
              category: tx.category,
              relatedId: tx.id,
            },
          });
        } else if (tx.transaction_type === 'expense') {
          const musoAmount = ExchangeRateService.dollarsToMusos(parseFloat(tx.amount));
          await TokenEngineService.burnTokens({
            playerId,
            amount: musoAmount,
            reason: `Expense: ${tx.category}`,
            metadata: {
              source: 'game_transaction_sync',
              category: tx.category,
              relatedId: tx.id,
            },
          });
        }

        // Mark as synced
        await supabase
          .from('game_transactions')
          .update({ token_sync_status: 'synced' })
          .eq('id', tx.id);

        processed++;
      } catch (error) {
        console.error(`Failed to process transaction ${tx.id}:`, error);
      }
    }

    return processed;
  }

  // Helper method to map database record to TypeScript type
  private static mapToGameTransaction(data: any): GameTransaction {
    return {
      id: data.id,
      playerId: data.player_id,
      transactionType: data.transaction_type,
      amount: parseFloat(data.amount),
      category: data.category,
      description: data.description,
      metadata: data.metadata || {},
      tokenSyncStatus: data.token_sync_status,
      tokenTransactionId: data.token_transaction_id,
      createdAt: data.created_at,
    };
  }
}