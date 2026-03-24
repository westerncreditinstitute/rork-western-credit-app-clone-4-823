// Bank System Service - Handles player bank account operations

import { supabase } from '../lib/supabase';
import { PlayerBankAccount } from '../types/token';

export class BankSystemService {
  /**
   * Create a new bank account for a player
   */
  static async createBankAccount(
    playerId: string,
    accountType: 'checking' | 'savings' = 'checking',
    initialBalance: number = 0
  ): Promise<PlayerBankAccount> {
    // Generate account number
    const accountNumber = this.generateAccountNumber();

    const { data, error } = await supabase
      .from('player_bank_accounts')
      .insert({
        player_id: playerId,
        account_number: accountNumber,
        account_type: accountType,
        balance: initialBalance,
        overdraft_limit: accountType === 'checking' ? 100.0 : 0.0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create bank account: ${error.message}`);
    }

    return this.mapToBankAccount(data);
  }

  /**
   * Get bank account by player ID
   */
  static async getBankAccount(playerId: string): Promise<PlayerBankAccount | null> {
    const { data, error } = await supabase
      .from('player_bank_accounts')
      .select('*')
      .eq('player_id', playerId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Account not found
      }
      throw new Error(`Failed to fetch bank account: ${error.message}`);
    }

    return this.mapToBankAccount(data);
  }

  /**
   * Get account balance
   */
  static async getBalance(playerId: string): Promise<{ balance: number; availableBalance: number }> {
    const account = await this.getBankAccount(playerId);
    if (!account) {
      throw new Error('Bank account not found');
    }

    return {
      balance: account.balance,
      availableBalance: account.availableBalance,
    };
  }

  /**
   * Deposit money into account
   */
  static async deposit(playerId: string, amount: number): Promise<PlayerBankAccount> {
    if (amount <= 0) {
      throw new Error('Deposit amount must be positive');
    }

    const account = await this.getBankAccount(playerId);
    if (!account) {
      throw new Error('Bank account not found');
    }

    const newBalance = account.balance + amount;

    const { data, error } = await supabase
      .from('player_bank_accounts')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to deposit: ${error.message}`);
    }

    return this.mapToBankAccount(data);
  }

  /**
   * Withdraw money from account
   */
  static async withdraw(playerId: string, amount: number): Promise<PlayerBankAccount> {
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be positive');
    }

    const account = await this.getBankAccount(playerId);
    if (!account) {
      throw new Error('Bank account not found');
    }

    // Check available balance (including overdraft)
    if (amount > account.availableBalance) {
      throw new Error(
        `Insufficient funds. Available: $${account.availableBalance.toFixed(2)}, Requested: $${amount.toFixed(2)}`
      );
    }

    let newBalance = account.balance - amount;
    let overdraftFee = 0;

    // Apply overdraft fee if balance goes negative
    if (newBalance < 0) {
      overdraftFee = 35.0;
      newBalance -= overdraftFee;
    }

    const { data, error } = await supabase
      .from('player_bank_accounts')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to withdraw: ${error.message}`);
    }

    return this.mapToBankAccount(data);
  }

  /**
   * Transfer money between players (for multiplayer)
   */
  static async transfer(
    fromPlayerId: string,
    toPlayerId: string,
    amount: number
  ): Promise<{ fromAccount: PlayerBankAccount; toAccount: PlayerBankAccount }> {
    if (amount <= 0) {
      throw new Error('Transfer amount must be positive');
    }

    if (fromPlayerId === toPlayerId) {
      throw new Error('Cannot transfer to same account');
    }

    // Get both accounts
    const fromAccount = await this.getBankAccount(fromPlayerId);
    const toAccount = await this.getBankAccount(toPlayerId);

    if (!fromAccount) {
      throw new Error('Sender account not found');
    }

    if (!toAccount) {
      throw new Error('Recipient account not found');
    }

    // Check available balance
    if (amount > fromAccount.availableBalance) {
      throw new Error('Insufficient funds for transfer');
    }

    // Perform transfer
    const newFromBalance = fromAccount.balance - amount;
    const newToBalance = toAccount.balance + amount;

    const [{ data: fromData, error: fromError }, { data: toData, error: toError }] = await Promise.all([
      supabase
        .from('player_bank_accounts')
        .update({
          balance: newFromBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fromAccount.id)
        .select()
        .single(),
      supabase
        .from('player_bank_accounts')
        .update({
          balance: newToBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', toAccount.id)
        .select()
        .single(),
    ]);

    if (fromError || toError) {
      throw new Error('Transfer failed');
    }

    return {
      fromAccount: this.mapToBankAccount(fromData),
      toAccount: this.mapToBankAccount(toData),
    };
  }

  /**
   * Get account statement (transaction history)
   */
  static async getAccountStatement(
    playerId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from('game_transactions')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch account statement: ${error.message}`);
    }

    return data;
  }

  // Helper method to generate account number
  private static generateAccountNumber(): string {
    const prefix = 'CRD';
    const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    const checkDigit = Math.floor(Math.random() * 10);
    return `${prefix}-${random}-${checkDigit}`;
  }

  // Helper method to map database record to TypeScript type
  private static mapToBankAccount(data: any): PlayerBankAccount {
    return {
      id: data.id,
      playerId: data.player_id,
      accountNumber: data.account_number,
      accountType: data.account_type,
      balance: parseFloat(data.balance),
      overdraftLimit: parseFloat(data.overdraft_limit),
      availableBalance: parseFloat(data.available_balance),
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}