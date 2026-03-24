/**
 * Credit Score Domain
 * 
 * Domain layer that orchestrates credit score operations and state management.
 * Acts as the business logic layer between the UI/Context and the calculation engine.
 * 
 * Responsibilities:
 * - Account lifecycle management (open, update, close)
 * - Payment processing with score recalculation
 * - Hard inquiry tracking
 * - Loan application evaluation
 * - Activity logging for user feedback
 * - Score history tracking
 * 
 * Uses CreditEngine (utils/creditEngine.ts) for actual score calculations.
 * 
 * @module CreditScoreDomain
 */

import {
  GameState,
  CreditAccount,
  HardInquiry,
  CreditScores,
  CreditScoreBreakdown,
  PaymentRecord,
  LoanApplication,
  ActivityLogEntry,
  ScoreHistoryEntry,
} from '@/types/game';
import {
  calculateCreditScores,
  calculateCreditBreakdown,
  getCreditTier,
  calculateInterestRate,
  calculateMonthlyPayment,
  simulatePaymentImpact,
  estimateCreditScoreChange,
} from '@/utils/creditEngine';

/**
 * Parameters for creating a new credit account.
 * 
 * @property type - Account type (credit_card, auto_loan, mortgage, etc.)
 * @property institutionId - Unique identifier of the financial institution
 * @property institutionName - Display name of the institution
 * @property creditLimit - Credit limit for revolving accounts, loan amount for installment
 * @property apr - Annual Percentage Rate
 * @property initialBalance - Starting balance (defaults to 0)
 * @property minimumPayment - Required monthly minimum (defaults to 2% of limit or $25)
 */
export interface CreditAccountCreationParams {
  type: CreditAccount['type'];
  institutionId: string;
  institutionName: string;
  creditLimit: number;
  apr: number;
  initialBalance?: number;
  minimumPayment?: number;
}

/**
 * Parameters for processing a payment.
 * 
 * @property accountId - ID of the account to pay
 * @property amount - Payment amount in dollars
 * @property onTime - Whether payment is on time (defaults to true)
 * @property daysLate - Days past due if late (defaults to 0)
 */
export interface PaymentParams {
  accountId: string;
  amount: number;
  onTime?: boolean;
  daysLate?: number;
}

/**
 * Result of a loan application evaluation.
 * 
 * @property approved - Whether the application was approved
 * @property offeredApr - Interest rate offered (if approved)
 * @property monthlyPayment - Calculated monthly payment (if approved)
 * @property denialReason - Explanation for denial (if not approved)
 * @property requiredCreditScore - Minimum score needed (if denied for score)
 */
export interface ApplicationResult {
  approved: boolean;
  offeredApr?: number;
  monthlyPayment?: number;
  denialReason?: string;
  requiredCreditScore?: number;
}

/**
 * Domain class for credit score operations.
 * 
 * Provides immutable state transformations - all methods return new GameState
 * objects rather than mutating existing state.
 * 
 * @example
 * ```typescript
 * const domain = new CreditScoreDomain();
 * 
 * // Add a new credit card
 * const newState = domain.addAccount({
 *   type: 'credit_card',
 *   institutionId: 'chase',
 *   institutionName: 'Chase',
 *   creditLimit: 5000,
 *   apr: 19.99,
 * }, currentState);
 * 
 * // Make a payment
 * const afterPayment = domain.makePayment({
 *   accountId: 'acc_123',
 *   amount: 500,
 *   onTime: true,
 * }, newState);
 * ```
 */
export class CreditScoreDomain {
  private createActivityLogEntry(
    type: ActivityLogEntry['type'],
    title: string,
    description: string,
    metadata?: ActivityLogEntry['metadata']
  ): ActivityLogEntry {
    return {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      title,
      description,
      metadata,
    };
  }

  private createScoreHistoryEntry(
    scores: CreditScores,
    reason?: string
  ): ScoreHistoryEntry {
    return {
      timestamp: Date.now(),
      experian: scores.experian,
      equifax: scores.equifax,
      transunion: scores.transunion,
      composite: scores.composite,
      reason,
    };
  }

  /**
   * Calculates credit scores for all three bureaus.
   * 
   * @param accounts - Array of credit accounts
   * @param inquiries - Array of hard inquiries
   * @param currentDate - Current timestamp in milliseconds
   * @returns Scores for Experian, Equifax, TransUnion, and composite
   */
  calculateScore(accounts: CreditAccount[], inquiries: HardInquiry[], currentDate: number): CreditScores {
    console.log('[CreditScoreDomain] Calculating credit scores', {
      accountsCount: accounts.length,
      inquiriesCount: inquiries.length,
    });
    return calculateCreditScores(accounts, inquiries, currentDate);
  }

  /**
   * Calculates detailed breakdown of score components.
   * 
   * @param accounts - Array of credit accounts
   * @param inquiries - Array of hard inquiries
   * @param currentDate - Current timestamp in milliseconds
   * @returns Breakdown with payment history, utilization, age, mix, and new credit scores
   */
  calculateBreakdown(accounts: CreditAccount[], inquiries: HardInquiry[], currentDate: number): CreditScoreBreakdown {
    return calculateCreditBreakdown(accounts, inquiries, currentDate);
  }

  /**
   * Gets the credit tier (Exceptional, Very Good, Good, Fair, Poor) for a score.
   * 
   * @param score - Credit score (300-850)
   * @returns Tier info with label, color, description, and approval odds
   */
  getCreditTier(score: number) {
    return getCreditTier(score);
  }

  /**
   * Calculates overall credit utilization percentage.
   * 
   * @param accounts - Array of credit accounts (filters to credit cards)
   * @returns Utilization as percentage (0-100+)
   */
  calculateUtilization(accounts: CreditAccount[]): number {
    const cards = accounts.filter(a => a.type === 'credit_card' && a.status !== 'closed');
    if (cards.length === 0) return 0;
    
    const totalBalance = cards.reduce((sum, c) => sum + c.balance, 0);
    const totalLimit = cards.reduce((sum, c) => sum + c.creditLimit, 0);
    
    return totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;
  }

  /**
   * Gets total debt across all accounts.
   * 
   * @param accounts - Array of credit accounts
   * @returns Total balance in dollars
   */
  getTotalDebt(accounts: CreditAccount[]): number {
    return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  }

  /**
   * Adds a new credit account to the game state.
   * 
   * Creates the account, recalculates scores, and logs the activity.
   * Opening a new account typically causes a small score drop due to
   * reduced average account age.
   * 
   * @param params - Account creation parameters
   * @param state - Current game state
   * @returns Updated game state with new account
   */
  addAccount(params: CreditAccountCreationParams, state: GameState): GameState {
    const now = Date.now();
    const newAccount: CreditAccount = {
      id: `acc_${now}_${Math.random().toString(36).substr(2, 9)}`,
      type: params.type,
      institutionId: params.institutionId,
      institutionName: params.institutionName,
      balance: params.initialBalance || 0,
      creditLimit: params.creditLimit,
      apr: params.apr,
      minimumPayment: params.minimumPayment || Math.max(25, params.creditLimit * 0.02),
      openedDate: state.currentDate,
      lastPaymentDate: state.currentDate,
      paymentHistory: [],
      status: 'current',
    };

    console.log('[CreditScoreDomain] Adding new account:', {
      type: newAccount.type,
      institution: newAccount.institutionName,
      limit: newAccount.creditLimit,
    });

    const newAccounts = [...state.creditAccounts, newAccount];
    const newScores = this.calculateScore(newAccounts, state.hardInquiries, state.currentDate);
    const scoreChange = newScores.composite - state.creditScores.composite;

    const activity = this.createActivityLogEntry(
      'account_opened',
      'New Account Opened',
      `Opened ${newAccount.type.replace('_', ' ')} with ${newAccount.institutionName}`,
      { accountId: newAccount.id, institutionName: newAccount.institutionName, amount: newAccount.creditLimit }
    );

    const newActivityLog = [...state.activityLog, activity];
    let newScoreHistory = state.scoreHistory;

    if (scoreChange !== 0) {
      const scoreActivity = this.createActivityLogEntry(
        'score_change',
        'Credit Score Changed',
        `Score ${scoreChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(scoreChange)} points`,
        { previousScore: state.creditScores.composite, newScore: newScores.composite }
      );
      newActivityLog.push(scoreActivity);
      newScoreHistory = [...newScoreHistory, this.createScoreHistoryEntry(newScores, 'New account opened')];
    }

    return {
      ...state,
      creditAccounts: newAccounts,
      creditScores: newScores,
      activityLog: newActivityLog,
      scoreHistory: newScoreHistory,
      lastUpdated: now,
    };
  }

  /**
   * Updates an existing credit account.
   * 
   * @param accountId - ID of account to update
   * @param updates - Partial account object with fields to update
   * @param state - Current game state
   * @returns Updated game state
   */
  updateAccount(accountId: string, updates: Partial<CreditAccount>, state: GameState): GameState {
    const newAccounts = state.creditAccounts.map(acc =>
      acc.id === accountId ? { ...acc, ...updates } : acc
    );
    const newScores = this.calculateScore(newAccounts, state.hardInquiries, state.currentDate);

    console.log('[CreditScoreDomain] Updated account:', accountId);

    return {
      ...state,
      creditAccounts: newAccounts,
      creditScores: newScores,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Closes a credit account.
   * 
   * Account must have zero balance to close. Closing an account can
   * negatively impact score by reducing available credit and potentially
   * lowering average account age.
   * 
   * @param accountId - ID of account to close
   * @param state - Current game state
   * @returns Updated game state (unchanged if account has balance)
   */
  closeAccount(accountId: string, state: GameState): GameState {
    const account = state.creditAccounts.find(a => a.id === accountId);
    if (!account) {
      console.warn('[CreditScoreDomain] Account not found:', accountId);
      return state;
    }

    if (account.balance > 0) {
      console.warn('[CreditScoreDomain] Cannot close account with balance:', account.balance);
      return state;
    }

    return this.updateAccount(accountId, { status: 'closed' }, state);
  }

  /**
   * Adds a hard inquiry to credit history.
   * 
   * Hard inquiries occur when applying for credit. They typically
   * reduce score by 5-10 points and remain on report for 2 years.
   * Rate shopping (multiple inquiries for same loan type within
   * 14-45 days) counts as single inquiry.
   * 
   * @param inquiry - Inquiry details (without ID, which is generated)
   * @param state - Current game state
   * @returns Updated game state with new inquiry
   */
  addInquiry(inquiry: Omit<HardInquiry, 'id'>, state: GameState): GameState {
    const now = Date.now();
    const newInquiry: HardInquiry = {
      ...inquiry,
      id: `inq_${now}_${Math.random().toString(36).substr(2, 9)}`,
    };

    console.log('[CreditScoreDomain] Adding hard inquiry:', {
      institution: newInquiry.institutionName,
      type: newInquiry.type,
    });

    const newInquiries = [...state.hardInquiries, newInquiry];
    const newScores = this.calculateScore(state.creditAccounts, newInquiries, state.currentDate);
    const scoreChange = newScores.composite - state.creditScores.composite;

    const activity = this.createActivityLogEntry(
      'inquiry_added',
      'Hard Inquiry Added',
      `${newInquiry.institutionName} checked your credit for ${newInquiry.type.replace('_', ' ')}`,
      { inquiryId: newInquiry.id, institutionName: newInquiry.institutionName }
    );

    const newActivityLog = [...state.activityLog, activity];
    let newScoreHistory = state.scoreHistory;

    if (scoreChange !== 0) {
      const scoreActivity = this.createActivityLogEntry(
        'score_change',
        'Credit Score Changed',
        `Score ${scoreChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(scoreChange)} points due to inquiry`,
        { previousScore: state.creditScores.composite, newScore: newScores.composite }
      );
      newActivityLog.push(scoreActivity);
      newScoreHistory = [...newScoreHistory, this.createScoreHistoryEntry(newScores, 'Hard inquiry added')];
    }

    return {
      ...state,
      hardInquiries: newInquiries,
      creditScores: newScores,
      activityLog: newActivityLog,
      scoreHistory: newScoreHistory,
      lastUpdated: now,
    };
  }

  /**
   * Processes a payment on a credit account.
   * 
   * On-time payments build credit over time. Late payments (30+ days)
   * cause significant score drops, especially for first-time late payers.
   * Payment is deducted from bank balance.
   * 
   * @param params - Payment parameters
   * @param state - Current game state
   * @returns Updated game state (unchanged if insufficient funds)
   */
  makePayment(params: PaymentParams, state: GameState): GameState {
    const { accountId, amount, onTime = true, daysLate = 0 } = params;
    const account = state.creditAccounts.find(a => a.id === accountId);
    
    if (!account) {
      console.warn('[CreditScoreDomain] Account not found for payment:', accountId);
      return state;
    }

    if (state.bankBalance < amount) {
      console.warn('[CreditScoreDomain] Insufficient funds for payment');
      return state;
    }

    console.log('[CreditScoreDomain] Processing payment:', {
      accountId,
      amount,
      onTime,
      currentBalance: account.balance,
    });

    const payment: PaymentRecord = {
      date: state.currentDate,
      amount,
      onTime,
      daysLate: onTime ? 0 : daysLate,
    };

    const newBalance = Math.max(0, account.balance - amount);
    const newPaymentHistory = [...account.paymentHistory, payment];

    let newStatus: CreditAccount['status'] = 'current';
    if (!onTime) {
      if (daysLate >= 90) newStatus = 'late_90';
      else if (daysLate >= 60) newStatus = 'late_60';
      else if (daysLate >= 30) newStatus = 'late_30';
    }

    const newAccounts = state.creditAccounts.map(acc =>
      acc.id === accountId
        ? {
            ...acc,
            balance: newBalance,
            paymentHistory: newPaymentHistory,
            lastPaymentDate: state.currentDate,
            status: newStatus,
          }
        : acc
    );

    const newScores = this.calculateScore(newAccounts, state.hardInquiries, state.currentDate);
    const newStreak = onTime ? state.consecutiveOnTimePayments + 1 : 0;
    const scoreChange = newScores.composite - state.creditScores.composite;

    const activity = this.createActivityLogEntry(
      'payment_made',
      'Payment Made',
      `Paid ${amount.toLocaleString()} to ${account.institutionName}${onTime ? ' (on time)' : ' (late)'}`,
      { accountId, amount, institutionName: account.institutionName }
    );

    const newActivityLog = [...state.activityLog, activity];
    let newScoreHistory = state.scoreHistory;

    if (scoreChange !== 0) {
      const scoreActivity = this.createActivityLogEntry(
        'score_change',
        'Credit Score Changed',
        `Score ${scoreChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(scoreChange)} points`,
        { previousScore: state.creditScores.composite, newScore: newScores.composite }
      );
      newActivityLog.push(scoreActivity);
      newScoreHistory = [...newScoreHistory, this.createScoreHistoryEntry(newScores, onTime ? 'On-time payment' : 'Late payment')];
    }

    return {
      ...state,
      creditAccounts: newAccounts,
      creditScores: newScores,
      bankBalance: state.bankBalance - amount,
      consecutiveOnTimePayments: newStreak,
      lifetimeSpending: state.lifetimeSpending + amount,
      activityLog: newActivityLog,
      scoreHistory: newScoreHistory,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Evaluates a loan application and determines approval/terms.
   * 
   * Approval based on:
   * - Credit score vs minimum requirement
   * - Debt-to-income ratio (max 43%)
   * 
   * If approved, calculates offered APR based on credit tier and loan type,
   * then computes monthly payment using amortization formula.
   * 
   * @param application - Loan application details
   * @param creditScore - Applicant's credit score
   * @param monthlyIncome - Applicant's monthly income
   * @param minCreditScore - Product's minimum score requirement
   * @param baseApr - Best rate for exceptional credit
   * @param maxApr - Maximum rate cap
   * @returns Application result with approval status and terms/denial reason
   */
  evaluateApplication(
    application: LoanApplication,
    creditScore: number,
    monthlyIncome: number,
    minCreditScore: number,
    baseApr: number,
    maxApr: number
  ): ApplicationResult {
    console.log('[CreditScoreDomain] Evaluating application:', {
      amount: application.amount,
      creditScore,
      minRequired: minCreditScore,
    });

    if (creditScore < minCreditScore) {
      return {
        approved: false,
        denialReason: `Credit score of ${creditScore} does not meet minimum requirement of ${minCreditScore}`,
        requiredCreditScore: minCreditScore,
      };
    }

    const debtToIncomeRatio = application.monthlyPayment 
      ? application.monthlyPayment / monthlyIncome 
      : (application.amount / application.termMonths) / monthlyIncome;

    if (debtToIncomeRatio > 0.43) {
      return {
        approved: false,
        denialReason: 'Debt-to-income ratio exceeds acceptable limits',
      };
    }

    const loanType = application.productId.includes('mortgage') 
      ? 'mortgage' 
      : application.productId.includes('auto') 
        ? 'auto' 
        : 'personal';

    const offeredApr = calculateInterestRate(baseApr, maxApr, creditScore, loanType);
    const monthlyPayment = calculateMonthlyPayment(application.amount, offeredApr, application.termMonths);

    return {
      approved: true,
      offeredApr,
      monthlyPayment,
    };
  }

  /**
   * Simulates the score impact of a payment.
   * 
   * @param currentScore - Current credit score
   * @param onTime - Whether payment would be on time
   * @param daysLate - Days late if not on time
   * @param isFirstLate - Whether this would be first late payment
   * @returns Estimated score change (positive or negative)
   */
  simulatePaymentImpact(currentScore: number, onTime: boolean, daysLate?: number, isFirstLate?: boolean): number {
    return simulatePaymentImpact(currentScore, onTime, daysLate, isFirstLate);
  }

  /**
   * Estimates score impact range for a credit action.
   * 
   * @param action - Type of action (open_account, close_account, etc.)
   * @param currentScore - Current credit score
   * @param details - Optional context for better estimates
   * @returns Min/max score change and description
   */
  estimateScoreChange(
    action: 'open_account' | 'close_account' | 'pay_on_time' | 'late_payment' | 'reduce_balance' | 'increase_limit',
    currentScore: number,
    details?: { utilizationChange?: number; accountAge?: number; isFirstNegative?: boolean }
  ) {
    return estimateCreditScoreChange(action, currentScore, details);
  }

  /**
   * Applies monthly interest charges to credit card balances.
   * 
   * Interest is calculated as: balance * (APR / 12).
   * Only applies to credit cards with positive balances.
   * 
   * @param state - Current game state
   * @returns Updated game state with interest applied
   */
  applyMonthlyInterest(state: GameState): GameState {
    const newAccounts = state.creditAccounts.map(account => {
      if (account.type === 'credit_card' && account.balance > 0) {
        const interest = account.balance * (account.apr / 100 / 12);
        console.log('[CreditScoreDomain] Applying monthly interest:', {
          accountId: account.id,
          balance: account.balance,
          apr: account.apr,
          interest,
        });
        return {
          ...account,
          balance: Math.round((account.balance + interest) * 100) / 100,
        };
      }
      return account;
    });

    return {
      ...state,
      creditAccounts: newAccounts,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Forces recalculation of credit scores.
   * 
   * Useful after external state changes or time advancement.
   * 
   * @param state - Current game state
   * @returns Updated game state with recalculated scores
   */
  recalculateScores(state: GameState): GameState {
    const newScores = this.calculateScore(state.creditAccounts, state.hardInquiries, state.currentDate);
    return {
      ...state,
      creditScores: newScores,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Filters accounts by type (excluding closed accounts).
   * 
   * @param accounts - Array of credit accounts
   * @param type - Account type to filter for
   * @returns Filtered array of active accounts of specified type
   */
  getAccountsByType(accounts: CreditAccount[], type: CreditAccount['type']): CreditAccount[] {
    return accounts.filter(a => a.type === type && a.status !== 'closed');
  }

  /**
   * Gets all non-closed accounts.
   * 
   * @param accounts - Array of credit accounts
   * @returns Filtered array of active accounts
   */
  getActiveAccounts(accounts: CreditAccount[]): CreditAccount[] {
    return accounts.filter(a => a.status !== 'closed');
  }

  /**
   * Gets accounts that are past due or in collections.
   * 
   * @param accounts - Array of credit accounts
   * @returns Filtered array of delinquent accounts
   */
  getDelinquentAccounts(accounts: CreditAccount[]): CreditAccount[] {
    return accounts.filter(a => 
      a.status === 'late_30' || 
      a.status === 'late_60' || 
      a.status === 'late_90' || 
      a.status === 'collections'
    );
  }

  /**
   * Calculates total minimum payment due across all accounts.
   * 
   * @param accounts - Array of credit accounts
   * @returns Total minimum payment in dollars
   */
  calculateMinimumPaymentDue(accounts: CreditAccount[]): number {
    return accounts
      .filter(a => a.status !== 'closed' && a.balance > 0)
      .reduce((sum, acc) => sum + acc.minimumPayment, 0);
  }

  /**
   * Gets the payment due date for an account.
   * 
   * Due date is 30 days after last payment.
   * 
   * @param account - Credit account
   * @returns Due date as timestamp in milliseconds
   */
  getPaymentDueDate(account: CreditAccount): number {
    const lastPayment = account.lastPaymentDate;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    return lastPayment + thirtyDaysMs;
  }

  /**
   * Checks if an account payment is overdue.
   * 
   * @param account - Credit account to check
   * @param currentDate - Current timestamp in milliseconds
   * @returns True if payment is past due and balance exists
   */
  isPaymentOverdue(account: CreditAccount, currentDate: number): boolean {
    const dueDate = this.getPaymentDueDate(account);
    return currentDate > dueDate && account.balance > 0;
  }

  /**
   * Gets days until payment is due (negative if overdue).
   * 
   * @param account - Credit account
   * @param currentDate - Current timestamp in milliseconds
   * @returns Days until due (negative = days overdue)
   */
  getDaysUntilPaymentDue(account: CreditAccount, currentDate: number): number {
    const dueDate = this.getPaymentDueDate(account);
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((dueDate - currentDate) / msPerDay);
  }
}

/** Singleton instance of CreditScoreDomain for use throughout the application */
export const creditScoreDomain = new CreditScoreDomain();
