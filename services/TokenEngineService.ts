// Token Engine Service - Handles minting and burning of MUSO tokens

import { supabase } from '../lib/supabase';
import { ExchangeRateService } from './ExchangeRateService';
import {
  PlayerTokenWallet,
  TokenTransaction,
  MintTokensInput,
  BurnTokensInput,
  WalletCreationInput,
  WalletBalanceUpdate,
} from '../types/token';

export class TokenEngineService {
  /**
   * Create a new token wallet for a player
   */
  static async createWallet(input: WalletCreationInput): Promise<PlayerTokenWallet> {
    const { playerId, initialBalance = 0 } = input;

    // Generate wallet address (in production, this would be from a real blockchain wallet)
    const walletAddress = `0x${playerId.replace(/-/g, '').substring(0, 40).padEnd(40, '0')}`;

    const { data, error } = await supabase
      .from('player_token_wallets')
      .insert({
        player_id: playerId,
        wallet_address: walletAddress,
        muso_balance: initialBalance,
        total_minted: initialBalance,
        total_burned: 0,
        pending_mint: 0,
        pending_burn: 0,
        sync_status: 'synced',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create wallet: ${error.message}`);
    }

    return this.mapToWallet(data);
  }

  /**
   * Get wallet by player ID
   */
  static async getWalletByPlayerId(playerId: string): Promise<PlayerTokenWallet | null> {
    const { data, error } = await supabase
      .from('player_token_wallets')
      .select('*')
      .eq('player_id', playerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Wallet not found
      }
      throw new Error(`Failed to fetch wallet: ${error.message}`);
    }

    return this.mapToWallet(data);
  }

  /**
   * Mint tokens for a player (earn money)
   */
  static async mintTokens(input: MintTokensInput): Promise<TokenTransaction> {
    const { playerId, amount, reason, metadata = {} } = input;

    // Get or create wallet
    let wallet = await this.getWalletByPlayerId(playerId);
    if (!wallet) {
      wallet = await this.createWallet({ playerId });
    }

    const newBalance = wallet.musoBalance + amount;
    const newTotalMinted = wallet.totalMinted + amount;

    // Update wallet balance
    const { error: walletError } = await supabase
      .from('player_token_wallets')
      .update({
        muso_balance: newBalance,
        total_minted: newTotalMinted,
        pending_mint: wallet.pendingMint + amount,
        sync_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);

    if (walletError) {
      throw new Error(`Failed to update wallet: ${walletError.message}`);
    }

    // Create token transaction record
    const { data: transactionData, error: transactionError } = await supabase
      .from('token_transactions')
      .insert({
        player_id: playerId,
        wallet_id: wallet.id,
        transaction_type: 'mint',
        amount,
        reason,
        metadata,
        balance_before: wallet.musoBalance,
        balance_after: newBalance,
        blockchain_status: 'pending',
        blockchain_confirmations: 0,
      })
      .select()
      .single();

    if (transactionError) {
      throw new Error(`Failed to create transaction: ${transactionError.message}`);
    }

    return this.mapToTransaction(transactionData);
  }

  /**
   * Burn tokens for a player (spend money)
   */
  static async burnTokens(input: BurnTokensInput): Promise<TokenTransaction> {
    const { playerId, amount, reason, metadata = {} } = input;

    // Get wallet
    const wallet = await this.getWalletByPlayerId(playerId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Check sufficient balance
    if (wallet.musoBalance < amount) {
      throw new Error(`Insufficient token balance. Available: ${wallet.musoBalance}, Required: ${amount}`);
    }

    const newBalance = wallet.musoBalance - amount;
    const newTotalBurned = wallet.totalBurned + amount;

    // Update wallet balance
    const { error: walletError } = await supabase
      .from('player_token_wallets')
      .update({
        muso_balance: newBalance,
        total_burned: newTotalBurned,
        pending_burn: wallet.pendingBurn + amount,
        sync_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);

    if (walletError) {
      throw new Error(`Failed to update wallet: ${walletError.message}`);
    }

    // Create token transaction record
    const { data: transactionData, error: transactionError } = await supabase
      .from('token_transactions')
      .insert({
        player_id: playerId,
        wallet_id: wallet.id,
        transaction_type: 'burn',
        amount,
        reason,
        metadata,
        balance_before: wallet.musoBalance,
        balance_after: newBalance,
        blockchain_status: 'pending',
        blockchain_confirmations: 0,
      })
      .select()
      .single();

    if (transactionError) {
      throw new Error(`Failed to create transaction: ${transactionError.message}`);
    }

    return this.mapToTransaction(transactionData);
  }

  /**
   * Get token transactions for a player
   */
  static async getTokenTransactions(
    playerId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<TokenTransaction[]> {
    const { data, error } = await supabase
      .from('token_transactions')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return data.map(this.mapToTransaction);
  }

  /**
   * Process pending token transactions (for batch syncing to blockchain)
   */
  static async processPendingTransactions(playerId: string): Promise<void> {
    const wallet = await this.getWalletByPlayerId(playerId);
    if (!wallet) {
      return;
    }

    // Get pending transactions
    const { data: pendingTxs } = await supabase
      .from('token_transactions')
      .select('*')
      .eq('player_id', playerId)
      .eq('blockchain_status', 'pending')
      .order('created_at', { ascending: true });

    if (!pendingTxs || pendingTxs.length === 0) {
      return;
    }

    // In a real implementation, this would batch transactions to the blockchain
    // For now, we'll mark them as confirmed
    for (const tx of pendingTxs) {
      await supabase
        .from('token_transactions')
        .update({
          blockchain_status: 'confirmed',
          blockchain_confirmations: 1,
          blockchain_tx_hash: `0x${Math.random().toString(16).substring(2)}`, // Mock hash
        })
        .eq('id', tx.id);
    }

    // Update wallet sync status
    await supabase
      .from('player_token_wallets')
      .update({
        pending_mint: 0,
        pending_burn: 0,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);
  }

  /**
   * Get wallet balance with statistics
   */
  static async getWalletStats(playerId: string): Promise<{
    balance: number;
    totalMinted: number;
    totalBurned: number;
    totalTransactions: number;
    pendingTransactions: number;
    syncStatus: string;
  }> {
    const wallet = await this.getWalletByPlayerId(playerId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const { count: totalTx } = await supabase
      .from('token_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId);

    const { count: pendingTx } = await supabase
      .from('token_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId)
      .eq('blockchain_status', 'pending');

    return {
      balance: wallet.musoBalance,
      totalMinted: wallet.totalMinted,
      totalBurned: wallet.totalBurned,
      totalTransactions: totalTx || 0,
      pendingTransactions: pendingTx || 0,
      syncStatus: wallet.syncStatus,
    };
  }

  // Helper methods to map database records to TypeScript types
  private static mapToWallet(data: any): PlayerTokenWallet {
    return {
      id: data.id,
      playerId: data.player_id,
      walletAddress: data.wallet_address,
      musoBalance: parseFloat(data.muso_balance),
      totalMinted: parseFloat(data.total_minted),
      totalBurned: parseFloat(data.total_burned),
      pendingMint: parseFloat(data.pending_mint),
      pendingBurn: parseFloat(data.pending_burn),
      lastSyncedAt: data.last_synced_at,
      syncStatus: data.sync_status,
      blockchainTxCount: data.blockchain_tx_count,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private static mapToTransaction(data: any): TokenTransaction {
    return {
      id: data.id,
      playerId: data.player_id,
      walletId: data.wallet_id,
      transactionType: data.transaction_type,
      amount: parseFloat(data.amount),
      reason: data.reason,
      metadata: data.metadata || {},
      balanceBefore: parseFloat(data.balance_before),
      balanceAfter: parseFloat(data.balance_after),
      gameTransactionId: data.game_transaction_id,
      blockchainTxHash: data.blockchain_tx_hash,
      blockchainStatus: data.blockchain_status,
      blockchainConfirmations: data.blockchain_confirmations,
      createdAt: data.created_at,
    };
  }
}