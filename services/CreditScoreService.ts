import {
  GameState,
  CreditAccount,
  HardInquiry,
  CreditScores,
  CreditScoreBreakdown,
} from '@/types/game';
import {
  calculateCreditScores,
  calculateCreditBreakdown,
  getCreditTier,
  simulatePaymentImpact,
  estimateCreditScoreChange,
} from '@/utils/creditEngine';

export class CreditScoreService {
  static calculateScore(
    accounts: CreditAccount[],
    inquiries: HardInquiry[],
    date: number
  ): CreditScores {
    console.log('[CreditScoreService] Calculating credit scores', {
      accountsCount: accounts.length,
      inquiriesCount: inquiries.length,
    });
    return calculateCreditScores(accounts, inquiries, date);
  }

  static getScoreBreakdown(
    accounts: CreditAccount[],
    inquiries: HardInquiry[],
    date: number
  ): CreditScoreBreakdown {
    return calculateCreditBreakdown(accounts, inquiries, date);
  }

  static getTier(score: number): {
    tier: string;
    color: string;
    description: string;
    approvalOdds: string;
  } {
    return getCreditTier(score);
  }

  static calculateUtilization(accounts: CreditAccount[]): number {
    const cards = accounts.filter(a => a.type === 'credit_card' && a.status !== 'closed');
    if (cards.length === 0) return 0;

    const totalBalance = cards.reduce((sum, c) => sum + c.balance, 0);
    const totalLimit = cards.reduce((sum, c) => sum + c.creditLimit, 0);

    return totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;
  }

  static getTotalDebt(accounts: CreditAccount[]): number {
    return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  }

  static getActiveAccounts(accounts: CreditAccount[]): CreditAccount[] {
    return accounts.filter(a => a.status !== 'closed');
  }

  static getDelinquentAccounts(accounts: CreditAccount[]): CreditAccount[] {
    return accounts.filter(a =>
      a.status === 'late_30' ||
      a.status === 'late_60' ||
      a.status === 'late_90' ||
      a.status === 'collections'
    );
  }

  static calculateMinimumPaymentDue(accounts: CreditAccount[]): number {
    return accounts
      .filter(a => a.status !== 'closed' && a.balance > 0)
      .reduce((sum, acc) => sum + acc.minimumPayment, 0);
  }

  static simulatePaymentImpact(
    currentScore: number,
    onTime: boolean,
    daysLate?: number,
    isFirstLate?: boolean
  ): number {
    return simulatePaymentImpact(currentScore, onTime, daysLate, isFirstLate);
  }

  static estimateScoreChange(
    action: 'open_account' | 'close_account' | 'pay_on_time' | 'late_payment' | 'reduce_balance' | 'increase_limit',
    currentScore: number,
    details?: { utilizationChange?: number; accountAge?: number; isFirstNegative?: boolean }
  ): { min: number; max: number; description: string } {
    return estimateCreditScoreChange(action, currentScore, details);
  }

  static recalculateFromState(state: GameState): CreditScores {
    return this.calculateScore(
      state.creditAccounts,
      state.hardInquiries,
      state.currentDate
    );
  }

  static getBreakdownFromState(state: GameState): CreditScoreBreakdown {
    return this.getScoreBreakdown(
      state.creditAccounts,
      state.hardInquiries,
      state.currentDate
    );
  }
}
