/**
 * Credit Score Calculation Engine
 * 
 * Implements a FICO-based credit scoring model with the following components:
 * - Payment History (35%): On-time payments, late payments, collections
 * - Credit Utilization (30%): Balance-to-limit ratio on revolving accounts
 * - Credit Age (15%): Average age and oldest account age
 * - Credit Mix (10%): Diversity of account types
 * - New Credit (10%): Recent inquiries and new accounts
 * 
 * Score Range: 300-850 (standard FICO range)
 * 
 * Bureau Variance:
 * - Experian: Weighs recent payment behavior more heavily
 * - Equifax: Emphasizes account age
 * - TransUnion: Focuses on utilization and recent inquiries
 * 
 * @module creditEngine
 */

import {
  CreditScores,
  CreditAccount,
  HardInquiry,
  CreditScoreBreakdown,
  CreditBureau,
} from '@/types/game';

/** Minimum possible credit score (FICO standard) */
const BASE_SCORE = 300;

/** Maximum possible credit score (FICO standard) */
const MAX_SCORE = 850;

/** Total point range available for scoring calculations */
const SCORE_RANGE = MAX_SCORE - BASE_SCORE;

/**
 * FICO score component weights.
 * These weights determine how much each factor contributes to the final score.
 * 
 * @property paymentHistory - 35% weight, most important factor
 * @property creditUtilization - 30% weight, second most important
 * @property creditAge - 15% weight, rewards longer credit history
 * @property creditMix - 10% weight, rewards diverse account types
 * @property newCredit - 10% weight, penalizes recent credit-seeking behavior
 */
const FICO_WEIGHTS = {
  paymentHistory: 0.35,
  creditUtilization: 0.30,
  creditAge: 0.15,
  creditMix: 0.10,
  newCredit: 0.10,
} as const;

/**
 * Late payment penalty points based on severity and recency.
 * 
 * @property recent - Applied to delinquencies within 2 years
 * @property aged - Reduced penalty for older delinquencies (>2 years)
 * 
 * Severity levels:
 * - days30: 30 days late
 * - days60: 60 days late
 * - days90Plus: 90+ days late
 * - collections: Account sent to collections
 * - chargeOff: Account written off as loss
 */
const LATE_PAYMENT_PENALTIES = {
  days30: { recent: -60, aged: -20 },
  days60: { recent: -80, aged: -35 },
  days90Plus: { recent: -110, aged: -50 },
  collections: { recent: -150, aged: -75 },
  chargeOff: { recent: -175, aged: -90 },
} as const;

/**
 * Credit utilization tiers and their impact on score.
 * Optimal utilization is 1-9% (score multiplier: 1.0).
 * 
 * @property max - Maximum utilization percentage for this tier
 * @property score - Score multiplier (1.0 = full points, 0.1 = 10% of points)
 * @property label - Human-readable description
 */
const UTILIZATION_TIERS: { max: number; score: number; label: string }[] = [
  { max: 0, score: 0.85, label: 'No utilization (slightly impacts score)' },
  { max: 1, score: 0.95, label: 'Minimal utilization' },
  { max: 9, score: 1.0, label: 'Optimal utilization range (1-9%)' },
  { max: 29, score: 0.80, label: 'Good utilization (10-29%)' },
  { max: 49, score: 0.55, label: 'Moderate utilization (30-49%)' },
  { max: 74, score: 0.30, label: 'High utilization (50-74%)' },
  { max: 100, score: 0.10, label: 'Very high utilization (75%+)' },
  { max: Infinity, score: 0.05, label: 'Critical: Over limit' },
];

/**
 * Hard inquiry impact on score based on recency.
 * Inquiries gradually lose impact over 24 months.
 */
const INQUIRY_IMPACT = {
  withinMonth: -10,
  within6Months: -7,
  within12Months: -4,
  within24Months: -2,
} as const;

/**
 * Rate shopping windows (in days) for different loan types.
 * Multiple inquiries within these windows count as one inquiry,
 * allowing consumers to shop for the best rates without penalty.
 * 
 * @property mortgage - 45 days (extended due to complex process)
 * @property auto_loan - 14 days
 * @property student_loan - 14 days
 * @property personal_loan - 14 days
 */
const RATE_SHOPPING_WINDOWS = {
  mortgage: 45,
  auto_loan: 14,
  student_loan: 14,
  personal_loan: 14,
} as const;

/**
 * Calculates credit scores for all three major bureaus using FICO methodology.
 * 
 * The calculation process:
 * 1. Computes breakdown scores for each FICO component
 * 2. Sums component scores for base score
 * 3. Applies bureau-specific variance adjustments
 * 4. Returns scores for Experian, Equifax, TransUnion, and composite
 * 
 * @param accounts - Array of credit accounts (credit cards, loans, etc.)
 * @param inquiries - Array of hard credit inquiries
 * @param currentDate - Current timestamp in milliseconds for age calculations
 * @returns Credit scores for all three bureaus plus composite average
 * 
 * @example
 * ```typescript
 * const scores = calculateCreditScores(
 *   [{ id: '1', type: 'credit_card', balance: 500, creditLimit: 5000, ... }],
 *   [{ id: 'inq1', date: Date.now() - 90 * 24 * 60 * 60 * 1000, ... }],
 *   Date.now()
 * );
 * // Returns: { experian: 720, equifax: 715, transunion: 718, composite: 718 }
 * ```
 */
export function calculateCreditScores(
  accounts: CreditAccount[],
  inquiries: HardInquiry[],
  currentDate: number
): CreditScores {
  const breakdown = calculateCreditBreakdown(accounts, inquiries, currentDate);
  
  const baseScore = 
    breakdown.paymentHistory.score +
    breakdown.creditUtilization.score +
    breakdown.creditAge.score +
    breakdown.creditMix.score +
    breakdown.newCredit.score;

  const experian = Math.round(clampScore(baseScore + getBureauVariance('experian', accounts, inquiries, currentDate)));
  const equifax = Math.round(clampScore(baseScore + getBureauVariance('equifax', accounts, inquiries, currentDate)));
  const transunion = Math.round(clampScore(baseScore + getBureauVariance('transunion', accounts, inquiries, currentDate)));
  const composite = Math.round((experian + equifax + transunion) / 3);

  return { experian, equifax, transunion, composite };
}

function getBureauVariance(
  bureau: CreditBureau, 
  accounts: CreditAccount[],
  inquiries: HardInquiry[],
  currentDate: number
): number {
  const activeAccounts = accounts.filter(a => a.status !== 'closed');
  
  switch (bureau) {
    case 'experian':
      const recentPaymentScore = activeAccounts.reduce((sum, acc) => {
        const recent = acc.paymentHistory.slice(-6);
        const onTimeCount = recent.filter(p => p.onTime).length;
        return sum + (onTimeCount / Math.max(recent.length, 1)) * 3;
      }, 0);
      return Math.min(recentPaymentScore, 8) - 4;
      
    case 'equifax':
      const oldestAccount = Math.min(...activeAccounts.map(a => a.openedDate));
      const ageYears = isFinite(oldestAccount) 
        ? (currentDate - oldestAccount) / (365 * 24 * 60 * 60 * 1000) 
        : 0;
      const ageBonus = Math.min(ageYears * 1.5, 10);
      return ageBonus - 5;
      
    case 'transunion':
      const utilization = calculateTotalUtilization(activeAccounts);
      const recentInquiries = inquiries.filter(i => 
        (currentDate - i.date) < (6 * 30 * 24 * 60 * 60 * 1000)
      ).length;
      let variance = 0;
      if (utilization <= 10) variance += 4;
      else if (utilization > 50) variance -= 4;
      variance -= recentInquiries * 1.5;
      return Math.max(-8, Math.min(8, variance));
      
    default:
      return 0;
  }
}

/**
 * Calculates detailed breakdown of credit score components.
 * 
 * Provides granular insight into how each FICO factor contributes
 * to the overall score, useful for identifying improvement areas.
 * 
 * @param accounts - Array of credit accounts
 * @param inquiries - Array of hard credit inquiries  
 * @param currentDate - Current timestamp in milliseconds
 * @returns Breakdown with score, maxScore, and details for each component
 * 
 * @example
 * ```typescript
 * const breakdown = calculateCreditBreakdown(accounts, inquiries, Date.now());
 * console.log(breakdown.paymentHistory);
 * // { score: 175, maxScore: 192.5, details: '98% on-time payment rate...' }
 * ```
 */
export function calculateCreditBreakdown(
  accounts: CreditAccount[],
  inquiries: HardInquiry[],
  currentDate: number
): CreditScoreBreakdown {
  const activeAccounts = accounts.filter(a => a.status !== 'closed');
  const allAccounts = accounts;
  
  return {
    paymentHistory: calculatePaymentHistoryScore(allAccounts, currentDate),
    creditUtilization: calculateUtilizationScore(activeAccounts),
    creditAge: calculateCreditAgeScore(allAccounts, currentDate),
    creditMix: calculateCreditMixScore(allAccounts),
    newCredit: calculateNewCreditScore(inquiries, allAccounts, currentDate),
  };
}

function calculatePaymentHistoryScore(
  accounts: CreditAccount[], 
  currentDate: number
): CreditScoreBreakdown['paymentHistory'] {
  const maxScore = SCORE_RANGE * FICO_WEIGHTS.paymentHistory;
  
  if (accounts.length === 0) {
    return {
      score: maxScore * 0.55,
      maxScore,
      details: 'No payment history yet. Establish credit accounts to build your payment history.',
    };
  }

  let totalPayments = 0;
  let onTimePayments = 0;
  let penaltyPoints = 0;
  const negativeItems: string[] = [];
  
  const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1000;
  const sevenYearsMs = 7 * 365 * 24 * 60 * 60 * 1000;

  accounts.forEach(account => {
    account.paymentHistory.forEach(payment => {
      totalPayments++;
      
      if (payment.onTime) {
        onTimePayments++;
      } else {
        const paymentAge = currentDate - payment.date;
        const isRecent = paymentAge < twoYearsMs;
        const recencyMultiplier = isRecent ? 1.0 : Math.max(0.3, 1 - (paymentAge / sevenYearsMs));
        
        if (payment.daysLate <= 30) {
          const penalty = isRecent ? LATE_PAYMENT_PENALTIES.days30.recent : LATE_PAYMENT_PENALTIES.days30.aged;
          penaltyPoints += Math.abs(penalty) * recencyMultiplier;
          if (isRecent) negativeItems.push('30-day late payment');
        } else if (payment.daysLate <= 60) {
          const penalty = isRecent ? LATE_PAYMENT_PENALTIES.days60.recent : LATE_PAYMENT_PENALTIES.days60.aged;
          penaltyPoints += Math.abs(penalty) * recencyMultiplier;
          if (isRecent) negativeItems.push('60-day late payment');
        } else if (payment.daysLate <= 90) {
          const penalty = isRecent ? LATE_PAYMENT_PENALTIES.days90Plus.recent : LATE_PAYMENT_PENALTIES.days90Plus.aged;
          penaltyPoints += Math.abs(penalty) * recencyMultiplier;
          if (isRecent) negativeItems.push('90-day late payment');
        } else {
          penaltyPoints += Math.abs(LATE_PAYMENT_PENALTIES.days90Plus.recent) * recencyMultiplier * 1.2;
          if (isRecent) negativeItems.push('90+ day late payment');
        }
      }
    });
    
    if (account.status === 'collections') {
      const accountAge = currentDate - account.openedDate;
      const isRecent = accountAge < twoYearsMs;
      penaltyPoints += isRecent 
        ? Math.abs(LATE_PAYMENT_PENALTIES.collections.recent)
        : Math.abs(LATE_PAYMENT_PENALTIES.collections.aged);
      negativeItems.push('Account in collections');
    }
    
    if (account.status === 'late_90') {
      const accountAge = currentDate - account.openedDate;
      const isRecent = accountAge < twoYearsMs;
      penaltyPoints += isRecent 
        ? Math.abs(LATE_PAYMENT_PENALTIES.chargeOff.recent) * 0.5
        : Math.abs(LATE_PAYMENT_PENALTIES.chargeOff.aged) * 0.5;
      negativeItems.push('Severely delinquent account (90+ days)');
    }
  });

  const onTimeRate = totalPayments > 0 ? onTimePayments / totalPayments : 1;
  
  let basePaymentScore = maxScore * Math.pow(onTimeRate, 0.5);
  
  const normalizedPenalty = Math.min(penaltyPoints / 2, maxScore * 0.9);
  let score = Math.max(0, basePaymentScore - normalizedPenalty);
  
  if (totalPayments >= 24 && onTimeRate >= 0.99) {
    score = Math.min(maxScore, score * 1.05);
  }
  
  score = Math.max(0, Math.min(maxScore, score));

  const rate = Math.round(onTimeRate * 100);
  let details = `${rate}% on-time payment rate across ${totalPayments} payments.`;
  
  if (negativeItems.length > 0) {
    const uniqueItems = [...new Set(negativeItems)];
    details += ` Negative items: ${uniqueItems.join(', ')}.`;
  } else if (totalPayments >= 12) {
    details += ' Excellent payment history!';
  }

  return { score: Math.round(score), maxScore, details };
}

function calculateUtilizationScore(accounts: CreditAccount[]): CreditScoreBreakdown['creditUtilization'] {
  const maxScore = SCORE_RANGE * FICO_WEIGHTS.creditUtilization;
  const creditCards = accounts.filter(a => a.type === 'credit_card' && a.status !== 'closed');

  console.log('[CreditEngine] calculateUtilizationScore:', {
    totalAccounts: accounts.length,
    creditCardsFound: creditCards.length,
    creditCardDetails: creditCards.map(c => ({
      id: c.id,
      balance: c.balance,
      limit: c.creditLimit,
      status: c.status,
    })),
  });

  if (creditCards.length === 0) {
    console.log('[CreditEngine] No credit cards found, returning default utilization');
    return {
      score: maxScore * 0.45,
      maxScore,
      percentage: 0,
      details: 'No revolving credit accounts. Open a credit card to establish utilization history.',
    };
  }

  const totalBalance = creditCards.reduce((sum, card) => sum + card.balance, 0);
  const totalLimit = creditCards.reduce((sum, card) => sum + card.creditLimit, 0);
  const overallUtilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;

  console.log('[CreditEngine] Utilization calculated:', {
    totalBalance,
    totalLimit,
    overallUtilization: overallUtilization.toFixed(2) + '%',
  });

  let highUtilCards = 0;
  let maxCardUtilization = 0;
  
  creditCards.forEach(card => {
    const cardUtil = card.creditLimit > 0 ? (card.balance / card.creditLimit) * 100 : 0;
    maxCardUtilization = Math.max(maxCardUtilization, cardUtil);
    if (cardUtil > 50) highUtilCards++;
  });

  let utilizationTier = UTILIZATION_TIERS.find(tier => overallUtilization <= tier.max);
  if (!utilizationTier) utilizationTier = UTILIZATION_TIERS[UTILIZATION_TIERS.length - 1];
  
  let score = maxScore * utilizationTier.score;

  if (highUtilCards > 0) {
    const cardPenalty = highUtilCards * (maxScore * 0.03);
    score = Math.max(0, score - cardPenalty);
  }

  if (maxCardUtilization > 90) {
    score *= 0.85;
  }

  score = Math.max(0, Math.min(maxScore, score));

  let details = utilizationTier.label;
  if (highUtilCards > 0) {
    details += ` ${highUtilCards} card(s) over 50% utilized.`;
  }
  if (overallUtilization <= 9 && overallUtilization > 0 && highUtilCards === 0) {
    details = 'Excellent! Utilization in the optimal 1-9% range.';
  }

  return {
    score: Math.round(score),
    maxScore,
    percentage: Math.round(overallUtilization),
    details,
  };
}

function calculateCreditAgeScore(
  accounts: CreditAccount[], 
  currentDate: number
): CreditScoreBreakdown['creditAge'] {
  const maxScore = SCORE_RANGE * FICO_WEIGHTS.creditAge;

  if (accounts.length === 0) {
    return {
      score: 0,
      maxScore,
      averageAge: 0,
      oldestAccount: 0,
      details: 'No credit history yet. Open accounts to establish credit age.',
    };
  }

  const agesInMonths = accounts.map(a => 
    Math.max(0, (currentDate - a.openedDate) / (30 * 24 * 60 * 60 * 1000))
  );
  const averageAgeMonths = agesInMonths.reduce((sum, age) => sum + age, 0) / agesInMonths.length;
  const oldestAccountMonths = Math.max(...agesInMonths);
  const newestAccountMonths = Math.min(...agesInMonths);

  let score = 0;
  let details = '';

  if (averageAgeMonths >= 108) {
    score = maxScore;
    details = 'Exceptional credit history (9+ years average age).';
  } else if (averageAgeMonths >= 84) {
    score = maxScore * 0.95;
    details = 'Excellent credit history (7+ years average age).';
  } else if (averageAgeMonths >= 60) {
    score = maxScore * 0.85;
    details = 'Very good credit history (5+ years average age).';
  } else if (averageAgeMonths >= 36) {
    score = maxScore * 0.70;
    details = 'Good credit history (3+ years average age).';
  } else if (averageAgeMonths >= 24) {
    score = maxScore * 0.50;
    details = 'Fair credit history (2+ years average age).';
  } else if (averageAgeMonths >= 12) {
    score = maxScore * 0.30;
    details = 'Limited credit history (1+ year average age).';
  } else if (averageAgeMonths >= 6) {
    score = maxScore * 0.15;
    details = 'Very new credit history (6+ months).';
  } else {
    score = maxScore * 0.05;
    details = 'Brand new credit history. Time will help.';
  }

  if (oldestAccountMonths >= 120) {
    score = Math.min(maxScore, score * 1.08);
  }

  if (newestAccountMonths < 6 && accounts.length > 1) {
    score *= 0.92;
    details += ' Recent new account slightly lowered average age.';
  }

  return {
    score: Math.round(Math.max(0, Math.min(maxScore, score))),
    maxScore,
    averageAge: Math.round(averageAgeMonths),
    oldestAccount: Math.round(oldestAccountMonths),
    details,
  };
}

function calculateCreditMixScore(accounts: CreditAccount[]): CreditScoreBreakdown['creditMix'] {
  const maxScore = SCORE_RANGE * FICO_WEIGHTS.creditMix;
  const accountTypes = [...new Set(accounts.filter(a => a.status !== 'closed').map(a => a.type))];

  const hasRevolvingCredit = accounts.some(a => a.type === 'credit_card' && a.status !== 'closed');
  const hasAutoLoan = accounts.some(a => a.type === 'auto_loan' && a.status !== 'closed');
  const hasPersonalLoan = accounts.some(a => a.type === 'personal_loan' && a.status !== 'closed');
  const hasStudentLoan = accounts.some(a => a.type === 'student_loan' && a.status !== 'closed');
  const hasMortgage = accounts.some(a => a.type === 'mortgage' && a.status !== 'closed');
  
  const hasInstallmentLoans = hasAutoLoan || hasPersonalLoan || hasStudentLoan;
  const installmentCount = [hasAutoLoan, hasPersonalLoan, hasStudentLoan].filter(Boolean).length;

  let score: number;
  let details: string;

  if (accountTypes.length === 0) {
    score = 0;
    details = 'No credit accounts. Establish different types for better mix.';
  } else if (hasMortgage && hasRevolvingCredit && installmentCount >= 2) {
    score = maxScore;
    details = 'Excellent credit mix: mortgage, revolving credit, and multiple installment loans.';
  } else if (hasMortgage && hasRevolvingCredit && hasInstallmentLoans) {
    score = maxScore * 0.95;
    details = 'Excellent credit mix with mortgage, credit card, and installment loan.';
  } else if (hasRevolvingCredit && installmentCount >= 2) {
    score = maxScore * 0.85;
    details = 'Very good mix: revolving credit and multiple installment loans.';
  } else if (hasRevolvingCredit && hasInstallmentLoans) {
    score = maxScore * 0.75;
    details = 'Good mix of revolving and installment credit.';
  } else if (hasMortgage && hasRevolvingCredit) {
    score = maxScore * 0.80;
    details = 'Good mix with mortgage and revolving credit.';
  } else if (accountTypes.length >= 2) {
    score = maxScore * 0.55;
    details = 'Fair credit mix. Consider diversifying account types.';
  } else if (hasRevolvingCredit) {
    score = maxScore * 0.35;
    details = 'Only revolving credit. An installment loan would improve mix.';
  } else if (hasInstallmentLoans) {
    score = maxScore * 0.30;
    details = 'Only installment loans. A credit card would improve mix.';
  } else {
    score = maxScore * 0.20;
    details = 'Limited credit mix. Diversifying would help your score.';
  }

  return {
    score: Math.round(score),
    maxScore,
    accountTypes,
    details,
  };
}

function calculateNewCreditScore(
  inquiries: HardInquiry[],
  accounts: CreditAccount[],
  currentDate: number
): CreditScoreBreakdown['newCredit'] {
  const maxScore = SCORE_RANGE * FICO_WEIGHTS.newCredit;
  
  const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
  const sixMonthsMs = 6 * 30 * 24 * 60 * 60 * 1000;
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1000;
  
  const groupedInquiries = groupInquiriesByRateShopping(inquiries, currentDate);
  
  let penaltyPoints = 0;
  
  groupedInquiries.forEach(inquiry => {
    const age = currentDate - inquiry.date;
    
    if (age <= oneMonthMs) {
      penaltyPoints += Math.abs(INQUIRY_IMPACT.withinMonth);
    } else if (age <= sixMonthsMs) {
      penaltyPoints += Math.abs(INQUIRY_IMPACT.within6Months);
    } else if (age <= oneYearMs) {
      penaltyPoints += Math.abs(INQUIRY_IMPACT.within12Months);
    } else if (age <= twoYearsMs) {
      penaltyPoints += Math.abs(INQUIRY_IMPACT.within24Months);
    }
  });

  const newAccountsLast6Months = accounts.filter(a => 
    (currentDate - a.openedDate) < sixMonthsMs
  ).length;
  
  const newAccountsLastYear = accounts.filter(a => 
    (currentDate - a.openedDate) < oneYearMs
  ).length;

  penaltyPoints += newAccountsLast6Months * 5;
  penaltyPoints += Math.max(0, newAccountsLastYear - 2) * 3;

  const inquiriesLast24Months = inquiries.filter(i => 
    (currentDate - i.date) < twoYearsMs
  ).length;

  let score = maxScore - (penaltyPoints * 0.9);
  score = Math.max(0, Math.min(maxScore, score));

  let details: string;
  if (inquiriesLast24Months === 0 && newAccountsLastYear === 0) {
    details = 'No recent credit inquiries or new accounts. Excellent!';
  } else if (groupedInquiries.length <= 1 && newAccountsLast6Months <= 1) {
    details = `${inquiriesLast24Months} inquiry in past 2 years. Minimal impact.`;
  } else if (groupedInquiries.length <= 3) {
    details = `${inquiriesLast24Months} inquiries in past 2 years. Moderate impact on score.`;
  } else if (groupedInquiries.length <= 5) {
    details = `${inquiriesLast24Months} inquiries. Multiple applications may concern lenders.`;
  } else {
    details = `${inquiriesLast24Months} inquiries suggests credit-seeking behavior. Major impact.`;
  }

  if (newAccountsLast6Months >= 3) {
    details += ` ${newAccountsLast6Months} new accounts in 6 months is concerning.`;
  }

  return {
    score: Math.round(score),
    maxScore,
    recentInquiries: inquiriesLast24Months,
    details,
  };
}

function groupInquiriesByRateShopping(
  inquiries: HardInquiry[],
  currentDate: number
): HardInquiry[] {
  const twoYearsAgo = currentDate - (2 * 365 * 24 * 60 * 60 * 1000);
  const recentInquiries = inquiries.filter(i => i.date > twoYearsAgo);
  
  const grouped: HardInquiry[] = [];
  const processed = new Set<string>();
  
  recentInquiries.forEach(inquiry => {
    if (processed.has(inquiry.id)) return;
    
    const loanType = inquiry.type;
    const window = RATE_SHOPPING_WINDOWS[loanType as keyof typeof RATE_SHOPPING_WINDOWS] || 14;
    const windowMs = window * 24 * 60 * 60 * 1000;
    
    const relatedInquiries = recentInquiries.filter(i => 
      i.type === loanType &&
      Math.abs(i.date - inquiry.date) <= windowMs &&
      !processed.has(i.id)
    );
    
    if (relatedInquiries.length > 0) {
      const earliestInquiry = relatedInquiries.reduce((earliest, i) => 
        i.date < earliest.date ? i : earliest
      );
      grouped.push(earliestInquiry);
      relatedInquiries.forEach(i => processed.add(i.id));
    }
    
    processed.add(inquiry.id);
  });
  
  return grouped;
}

function calculateTotalUtilization(accounts: CreditAccount[]): number {
  const creditCards = accounts.filter(a => a.type === 'credit_card' && a.status !== 'closed');
  if (creditCards.length === 0) return 0;
  
  const totalBalance = creditCards.reduce((sum, card) => sum + card.balance, 0);
  const totalLimit = creditCards.reduce((sum, card) => sum + card.creditLimit, 0);
  
  return totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;
}

function clampScore(score: number): number {
  return Math.max(BASE_SCORE, Math.min(MAX_SCORE, score));
}

/**
 * Determines the credit tier based on score.
 * 
 * Tiers align with industry-standard FICO score ranges:
 * - Exceptional: 800-850
 * - Very Good: 740-799
 * - Good: 670-739
 * - Fair: 580-669
 * - Poor: 300-579
 * 
 * @param score - Credit score (300-850)
 * @returns Tier information including label, color, description, and approval odds
 * 
 * @example
 * ```typescript
 * const tier = getCreditTier(750);
 * // Returns: { tier: 'Very Good', color: '#34D399', ... }
 * ```
 */
export function getCreditTier(score: number): {
  tier: string;
  color: string;
  description: string;
  approvalOdds: string;
} {
  if (score >= 800) {
    return {
      tier: 'Exceptional',
      color: '#10B981',
      description: 'Top-tier credit. Best rates and terms available. Only ~21% of consumers achieve this.',
      approvalOdds: '95%+ approval for all products',
    };
  } else if (score >= 740) {
    return {
      tier: 'Very Good',
      color: '#34D399',
      description: 'Excellent credit. Qualify for most products with competitive rates.',
      approvalOdds: '85%+ approval with favorable terms',
    };
  } else if (score >= 670) {
    return {
      tier: 'Good',
      color: '#60A5FA',
      description: 'Above average credit. Most lenders consider you a reliable borrower.',
      approvalOdds: '70%+ approval at standard rates',
    };
  } else if (score >= 580) {
    return {
      tier: 'Fair',
      color: '#FBBF24',
      description: 'Below average credit. You may face higher rates and some restrictions.',
      approvalOdds: '40-60% approval with higher rates',
    };
  } else {
    return {
      tier: 'Poor',
      color: '#EF4444',
      description: 'Limited credit options. Focus on rebuilding with secured products.',
      approvalOdds: 'Limited options, secured products recommended',
    };
  }
}

/**
 * Calculates the interest rate offered based on credit score and loan type.
 * 
 * Higher credit scores receive lower rates. Each loan type has different
 * rate spreads reflecting industry risk models:
 * - Mortgages: Tightest spreads (0-2.5% above base)
 * - Auto loans: Moderate spreads (0-12% above base)
 * - Personal loans: Widest spreads (0-18% above base)
 * 
 * @param baseRate - Best available rate for exceptional credit
 * @param maxRate - Maximum rate cap
 * @param creditScore - Applicant's credit score
 * @param loanType - Type of loan product
 * @returns Offered interest rate as annual percentage
 * 
 * @example
 * ```typescript
 * const rate = calculateInterestRate(3.5, 8.0, 720, 'mortgage');
 * // Returns: 4.25 (base + 0.75 for 'good' tier)
 * ```
 */
export function calculateInterestRate(
  baseRate: number,
  maxRate: number,
  creditScore: number,
  loanType: 'mortgage' | 'auto' | 'personal' | 'credit_card' = 'personal'
): number {
  const tierMultipliers: Record<string, Record<string, number>> = {
    mortgage: {
      exceptional: 0,
      veryGood: 0.25,
      good: 0.75,
      fair: 1.5,
      poor: 2.5,
    },
    auto: {
      exceptional: 0,
      veryGood: 1.0,
      good: 3.0,
      fair: 6.0,
      poor: 12.0,
    },
    personal: {
      exceptional: 0,
      veryGood: 2.0,
      good: 5.0,
      fair: 10.0,
      poor: 18.0,
    },
    credit_card: {
      exceptional: 0,
      veryGood: 3.0,
      good: 6.0,
      fair: 9.0,
      poor: 12.0,
    },
  };

  let tier: string;
  if (creditScore >= 800) tier = 'exceptional';
  else if (creditScore >= 740) tier = 'veryGood';
  else if (creditScore >= 670) tier = 'good';
  else if (creditScore >= 580) tier = 'fair';
  else tier = 'poor';

  const multiplier = tierMultipliers[loanType]?.[tier] ?? tierMultipliers.personal[tier];
  const rate = baseRate + multiplier;
  
  return Math.min(maxRate, Math.round(rate * 100) / 100);
}

/**
 * Calculates monthly payment for an amortizing loan.
 * 
 * Uses standard amortization formula:
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 * 
 * Where:
 * - M = monthly payment
 * - P = principal (loan amount)
 * - r = monthly interest rate
 * - n = number of payments (term in months)
 * 
 * @param principal - Loan amount in dollars
 * @param annualRate - Annual interest rate as percentage (e.g., 5.5 for 5.5%)
 * @param termMonths - Loan term in months
 * @returns Monthly payment amount rounded to cents
 * 
 * @example
 * ```typescript
 * const payment = calculateMonthlyPayment(25000, 6.5, 60);
 * // Returns: 489.15 (monthly payment for $25k auto loan at 6.5% for 5 years)
 * ```
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  
  return Math.round(payment * 100) / 100;
}

/**
 * Simulates the impact of a payment on credit score.
 * 
 * On-time payments provide gradual recovery, while late payments
 * cause immediate drops. Impact varies by:
 * - Current score (higher scores drop more from negatives)
 * - Days late (30/60/90+ day thresholds)
 * - Payment history (first late payment hurts more)
 * 
 * @param currentScore - Current credit score before payment
 * @param onTime - Whether payment was made on time
 * @param daysLate - Number of days late (if not on time)
 * @param isFirstLatePayment - Whether this is the first late payment on file
 * @returns Estimated score change (positive for on-time, negative for late)
 * 
 * @example
 * ```typescript
 * // On-time payment with low score
 * simulatePaymentImpact(620, true);  // Returns: ~4-5 points
 * 
 * // First 30-day late payment with high score
 * simulatePaymentImpact(780, false, 30, true);  // Returns: ~-72 points
 * ```
 */
export function simulatePaymentImpact(
  currentScore: number,
  onTime: boolean,
  daysLate: number = 0,
  isFirstLatePayment: boolean = true
): number {
  if (onTime) {
    const recoveryRate = currentScore < 650 ? 0.015 : 0.008;
    return Math.min(5, (850 - currentScore) * recoveryRate);
  }
  
  let basePenalty: number;
  if (daysLate <= 30) basePenalty = isFirstLatePayment ? -60 : -40;
  else if (daysLate <= 60) basePenalty = isFirstLatePayment ? -80 : -55;
  else if (daysLate <= 90) basePenalty = isFirstLatePayment ? -100 : -70;
  else basePenalty = isFirstLatePayment ? -130 : -90;

  const scoreMultiplier = currentScore >= 750 ? 1.2 : currentScore >= 670 ? 1.0 : 0.7;
  
  return Math.round(basePenalty * scoreMultiplier);
}

/**
 * Estimates the score impact range for common credit actions.
 * 
 * Provides min/max estimates and educational description for:
 * - Opening new accounts (short-term negative)
 * - Closing accounts (varies by account age)
 * - On-time payments (gradual positive)
 * - Late payments (significant negative)
 * - Reducing balances (immediate positive if utilization drops)
 * - Increasing limits (positive via lower utilization)
 * 
 * @param action - Type of credit action being taken
 * @param currentScore - Current credit score
 * @param details - Optional context for more accurate estimates
 * @param details.utilizationChange - Percentage point change in utilization
 * @param details.accountAge - Age of account in months (for close_account)
 * @param details.isFirstNegative - Whether this is first negative mark on file
 * @returns Estimated min/max score change and explanation
 * 
 * @example
 * ```typescript
 * const impact = estimateCreditScoreChange('reduce_balance', 650, { utilizationChange: -20 });
 * // Returns: { min: 5, max: 30, description: 'Lower utilization can provide...' }
 * ```
 */
export function estimateCreditScoreChange(
  action: 'open_account' | 'close_account' | 'pay_on_time' | 'late_payment' | 'reduce_balance' | 'increase_limit',
  currentScore: number,
  details?: { utilizationChange?: number; accountAge?: number; isFirstNegative?: boolean }
): { min: number; max: number; description: string } {
  switch (action) {
    case 'open_account':
      return {
        min: -10,
        max: -5,
        description: 'New account will temporarily lower score due to hard inquiry and reduced average age.',
      };
    case 'close_account':
      const agePenalty = (details?.accountAge ?? 0) > 60 ? -15 : -5;
      return {
        min: agePenalty,
        max: 0,
        description: 'Closing may reduce average age and available credit. Keep older accounts open.',
      };
    case 'pay_on_time':
      const onTimeBonus = currentScore < 700 ? 5 : 3;
      return {
        min: 1,
        max: onTimeBonus,
        description: 'On-time payments consistently build your score over time.',
      };
    case 'late_payment':
      const latePenalty = details?.isFirstNegative ? -110 : -60;
      return {
        min: latePenalty,
        max: -30,
        description: 'Late payments have severe impact, especially on excellent credit.',
      };
    case 'reduce_balance':
      return {
        min: 5,
        max: 30,
        description: 'Lower utilization can provide immediate score improvement.',
      };
    case 'increase_limit':
      return {
        min: 5,
        max: 20,
        description: 'Higher limit with same balance lowers utilization ratio.',
      };
    default:
      return { min: 0, max: 0, description: '' };
  }
}

/**
 * Formats a number as USD currency without cents.
 * 
 * @param amount - Dollar amount
 * @returns Formatted string (e.g., "$1,234")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a number as USD currency with cents.
 * 
 * @param amount - Dollar amount
 * @returns Formatted string (e.g., "$1,234.56")
 */
export function formatCurrencyDetailed(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
