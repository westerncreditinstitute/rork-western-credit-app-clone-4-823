// MUSO Token Economy System - TypeScript Types

export interface TokenConfig {
  musoPerDollar: number;
  dollarsPerMusso: number;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  network: string;
}

export interface PlayerBankAccount {
  id: string;
  playerId: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
  balance: number;
  overdraftLimit: number;
  availableBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerTokenWallet {
  id: string;
  playerId: string;
  walletAddress: string;
  musoBalance: number;
  totalMinted: number;
  totalBurned: number;
  pendingMint: number;
  pendingBurn: number;
  lastSyncedAt: string | null;
  syncStatus: 'synced' | 'pending' | 'failed';
  blockchainTxCount: number;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'mint' | 'burn' | 'transfer';

export type GameTransactionType = 'income' | 'expense' | 'transfer';

export type TokenSyncStatus = 'pending' | 'synced' | 'failed';

export type BlockchainStatus = 'pending' | 'confirmed' | 'failed';

export interface TokenTransaction {
  id: string;
  playerId: string;
  walletId: string;
  transactionType: TransactionType;
  amount: number;
  reason: string;
  metadata: {
    source?: string;
    category?: string;
    relatedId?: string;
    [key: string]: any;
  };
  balanceBefore: number;
  balanceAfter: number;
  gameTransactionId: string | null;
  blockchainTxHash: string | null;
  blockchainStatus: BlockchainStatus;
  blockchainConfirmations: number;
  createdAt: string;
}

export interface GameTransaction {
  id: string;
  playerId: string;
  transactionType: GameTransactionType;
  amount: number;
  category: string;
  description?: string;
  metadata: {
    source?: string;
    relatedId?: string;
    [key: string]: any;
  };
  tokenSyncStatus: TokenSyncStatus;
  tokenTransactionId: string | null;
  createdAt: string;
}

export interface TokenSyncLog {
  id: string;
  playerId: string;
  syncType: 'auto' | 'manual' | 'batch';
  gameBalance: number;
  tokenBalance: number;
  expectedTokenBalance: number;
  difference: number;
  actionTaken: 'mint' | 'burn' | 'none';
  amountAdjusted: number | null;
  status: 'success' | 'error' | 'warning';
  errorMessage: string | null;
  metadata: {
    [key: string]: any;
  };
  createdAt: string;
}

export interface PlayerTokenSummary {
  playerId: string;
  email: string | null;
  walletAddress: string | null;
  musoBalance: number;
  totalMinted: number;
  totalBurned: number;
  syncStatus: string;
  bankBalance: number;
  availableBalance: number;
  totalTransactions: number;
  confirmedTransactions: number;
}

// Income Sources (Mint Tokens)
export type IncomeSource =
  | 'salary'
  | 'bonus'
  | 'investment_returns'
  | 'side_hustles'
  | 'gifts'
  | 'refunds'
  | 'interest'
  | 'dividends'
  | 'rental_income'
  | 'business_income'
  | 'prizes'
  | 'inheritance'
  | 'lottery_winnings'
  | 'scholarships'
  | 'grants'
  | 'reimbursements'
  | 'commissions';

// Expense Categories (Burn Tokens)
export type ExpenseCategory =
  | 'rent_mortgage'
  | 'utilities'
  | 'groceries'
  | 'transportation'
  | 'entertainment'
  | 'loans'
  | 'credit_card_payments'
  | 'insurance'
  | 'healthcare'
  | 'education'
  | 'subscriptions'
  | 'shopping'
  | 'dining_out'
  | 'travel'
  | 'gifts'
  | 'charitable_donations'
  | 'taxes';

// Banking Operations
export type BankingOperation =
  | 'deposit'
  | 'withdrawal'
  | 'transfer'
  | 'balance_check'
  | 'account_statement'
  | 'overdraft_protection';

export interface ExchangeRateResult {
  musoAmount: bigint;
  dollarAmount: number;
  rate: number;
}

export interface MintTokensInput {
  playerId: string;
  amount: number;
  reason: string;
  metadata?: {
    source?: string;
    category?: string;
    relatedId?: string;
    [key: string]: any;
  };
}

export interface BurnTokensInput {
  playerId: string;
  amount: number;
  reason: string;
  metadata?: {
    source?: string;
    category?: string;
    relatedId?: string;
    [key: string]: any;
  };
}

export interface SyncWithGameBalanceInput {
  playerId: string;
  gameBalance: number;
  syncType?: 'auto' | 'manual';
}

export interface TokenSyncResult {
  success: boolean;
  newBalance: number;
  synced: boolean;
  transaction?: TokenTransaction;
  error?: string;
}

export interface WalletCreationInput {
  playerId: string;
  initialBalance?: number;
}

export interface WalletBalanceUpdate {
  currentBalance: number;
  newBalance: number;
  difference: number;
  totalMinted: number;
  totalBurned: number;
}