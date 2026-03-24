import {
  StudentLoan,
  LoanType,
  LoanStatus,
  StudentEducation,
} from '@/types/education';
import {
  STUDENT_LOAN_OPTIONS,
  EDUCATION_CREDIT_IMPACTS,
  SCHOOLS,
} from '@/mocks/educationData';

export interface LoanApplicationResult {
  success: boolean;
  loan?: StudentLoan;
  error?: string;
  creditScoreImpact?: number;
}

export interface LoanPaymentResult {
  success: boolean;
  newBalance: number;
  principalPaid: number;
  interestPaid: number;
  creditScoreImpact: number;
  isPayoffComplete: boolean;
  error?: string;
}

export interface LoanOption {
  loanType: LoanType;
  name: string;
  description: string;
  interestRate: number;
  maxAmountPerYear: number;
  gracePeriodMonths: number;
  requiresCreditCheck: boolean;
  minimumCreditScore?: number;
  isEligible: boolean;
  eligibilityReason?: string;
}

export interface DefermentResult {
  success: boolean;
  loan?: StudentLoan;
  newDefermentEndDate?: number;
  interestAccrued?: number;
  error?: string;
}

export interface RefinanceResult {
  success: boolean;
  oldLoan?: StudentLoan;
  newLoan?: StudentLoan;
  newInterestRate?: number;
  newMonthlyPayment?: number;
  totalSavings?: number;
  error?: string;
}

export interface MonthlyPaymentProcessResult {
  loansProcessed: number;
  totalPaid: number;
  totalCreditImpact: number;
  missedPayments: string[];
  successfulPayments: string[];
  insufficientFunds: boolean;
}

export interface StudentLoanManagerState {
  activeLoans: StudentLoan[];
  paidOffLoans: StudentLoan[];
  totalDebt: number;
  totalInterestPaid: number;
  monthlyPaymentDue: number;
  nextPaymentDate?: number;
}

const FEDERAL_BASE_RATE = 3.4;
const PRIVATE_BASE_RATE = 5.5;
const REFINANCE_RATE_REDUCTION = 0.5;
const MAX_DEFERMENT_MONTHS = 36;
const MIN_TERM_YEARS = 10;
const MAX_TERM_YEARS = 25;

const CREDIT_SCORE_THRESHOLDS = {
  excellent: 750,
  good: 700,
  fair: 650,
  poor: 600,
};

export function getAvailableLoanOptions(
  schoolId: string,
  creditScore: number,
  currentEnrollment: StudentEducation | null,
  isGraduateStudent: boolean = false
): LoanOption[] {
  console.log('[StudentLoanManager] Getting loan options for school:', schoolId, 'Credit Score:', creditScore);
  
  const school = SCHOOLS.find(s => s.id === schoolId);
  if (!school) {
    console.log('[StudentLoanManager] School not found:', schoolId);
    return [];
  }
  
  const loanOptions: LoanOption[] = [];
  
  const federalSubsidized: LoanOption = {
    loanType: 'federal_subsidized',
    name: 'Federal Subsidized Loan',
    description: 'Government pays interest while in school and during grace period. Lower interest rate.',
    interestRate: FEDERAL_BASE_RATE,
    maxAmountPerYear: STUDENT_LOAN_OPTIONS.federal_subsidized.maxAmountPerYear,
    gracePeriodMonths: 6,
    requiresCreditCheck: false,
    isEligible: currentEnrollment !== null,
    eligibilityReason: currentEnrollment ? undefined : 'Must be enrolled in school',
  };
  loanOptions.push(federalSubsidized);
  
  const federalUnsubsidized: LoanOption = {
    loanType: 'federal_unsubsidized',
    name: 'Federal Unsubsidized Loan',
    description: 'Interest accrues immediately but no credit check required.',
    interestRate: FEDERAL_BASE_RATE + 1.0,
    maxAmountPerYear: STUDENT_LOAN_OPTIONS.federal_unsubsidized.maxAmountPerYear,
    gracePeriodMonths: 6,
    requiresCreditCheck: false,
    isEligible: currentEnrollment !== null,
    eligibilityReason: currentEnrollment ? undefined : 'Must be enrolled in school',
  };
  loanOptions.push(federalUnsubsidized);
  
  const privateMinCredit = STUDENT_LOAN_OPTIONS.private.minimumCreditScore || 650;
  const privateEligible = creditScore >= privateMinCredit;
  const privateLoan: LoanOption = {
    loanType: 'private',
    name: 'Private Student Loan',
    description: 'Higher borrowing limits but requires good credit. Variable rates based on creditworthiness.',
    interestRate: calculatePrivateRate(creditScore),
    maxAmountPerYear: STUDENT_LOAN_OPTIONS.private.maxAmountPerYear,
    gracePeriodMonths: 0,
    requiresCreditCheck: true,
    minimumCreditScore: privateMinCredit,
    isEligible: privateEligible,
    eligibilityReason: privateEligible ? undefined : `Minimum credit score of ${privateMinCredit} required (yours: ${creditScore})`,
  };
  loanOptions.push(privateLoan);
  
  if (isGraduateStudent) {
    const gradPlusMinCredit = STUDENT_LOAN_OPTIONS.grad_plus.minimumCreditScore || 620;
    const gradPlusEligible = creditScore >= gradPlusMinCredit && currentEnrollment !== null;
    const gradPlusLoan: LoanOption = {
      loanType: 'grad_plus',
      name: 'Grad PLUS Loan',
      description: 'For graduate and professional students. Higher limits available.',
      interestRate: STUDENT_LOAN_OPTIONS.grad_plus.interestRate,
      maxAmountPerYear: STUDENT_LOAN_OPTIONS.grad_plus.maxAmountPerYear,
      gracePeriodMonths: 6,
      requiresCreditCheck: true,
      minimumCreditScore: gradPlusMinCredit,
      isEligible: gradPlusEligible,
      eligibilityReason: gradPlusEligible ? undefined : 
        creditScore < gradPlusMinCredit ? `Minimum credit score of ${gradPlusMinCredit} required` : 'Must be enrolled as graduate student',
    };
    loanOptions.push(gradPlusLoan);
  }
  
  console.log('[StudentLoanManager] Found', loanOptions.length, 'loan options');
  return loanOptions;
}

export function applyForStudentLoan(
  loanType: LoanType,
  amount: number,
  termYears: number,
  schoolId: string,
  playerId: string,
  studentEducationId: string,
  creditScore: number,
  isGraduateStudent: boolean = false
): LoanApplicationResult {
  console.log('[StudentLoanManager] Applying for loan:', { loanType, amount, termYears, schoolId });
  
  const loanConfig = STUDENT_LOAN_OPTIONS[loanType];
  if (!loanConfig) {
    return { success: false, error: 'Invalid loan type' };
  }
  
  const school = SCHOOLS.find(s => s.id === schoolId);
  if (!school) {
    return { success: false, error: 'School not found' };
  }
  
  if (amount > loanConfig.maxAmountPerYear) {
    return { 
      success: false, 
      error: `Maximum loan amount is $${loanConfig.maxAmountPerYear.toLocaleString()} per year` 
    };
  }
  
  if (amount < 1000) {
    return { success: false, error: 'Minimum loan amount is $1,000' };
  }
  
  if (termYears < MIN_TERM_YEARS || termYears > MAX_TERM_YEARS) {
    return { 
      success: false, 
      error: `Loan term must be between ${MIN_TERM_YEARS} and ${MAX_TERM_YEARS} years` 
    };
  }
  
  if ('minimumCreditScore' in loanConfig && loanConfig.minimumCreditScore) {
    if (creditScore < loanConfig.minimumCreditScore) {
      return { 
        success: false, 
        error: `Credit score of ${loanConfig.minimumCreditScore} required. Your score: ${creditScore}` 
      };
    }
  }
  
  if (loanType === 'grad_plus' && !isGraduateStudent) {
    return { success: false, error: 'Grad PLUS loans are only available for graduate students' };
  }
  
  let interestRate: number;
  if (loanType === 'federal_subsidized') {
    interestRate = FEDERAL_BASE_RATE;
  } else if (loanType === 'federal_unsubsidized') {
    interestRate = FEDERAL_BASE_RATE + 1.0;
  } else if (loanType === 'private') {
    interestRate = calculatePrivateRate(creditScore);
  } else {
    interestRate = loanConfig.interestRate;
  }
  
  const termMonths = termYears * 12;
  const monthlyPayment = calculateMonthlyPaymentAmount(amount, interestRate, termMonths);
  
  const now = Date.now();
  const gracePeriodMonths = loanConfig.gracePeriodMonths;
  const gracePeriodEndDate = gracePeriodMonths > 0 
    ? now + (gracePeriodMonths * 30 * 24 * 60 * 60 * 1000) 
    : undefined;
  
  const loan: StudentLoan = {
    id: `loan_${now}_${Math.random().toString(36).substr(2, 9)}`,
    playerId,
    studentEducationId,
    loanType,
    lenderName: loanConfig.name,
    principalAmount: amount,
    currentBalance: amount,
    interestRate,
    termMonths,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    minimumPayment: Math.round(monthlyPayment * 100) / 100,
    status: gracePeriodMonths > 0 ? 'in_grace' : 'active',
    originationDate: now,
    gracePeriodEndDate,
    totalInterestPaid: 0,
    paymentsMade: 0,
    paymentsRemaining: termMonths,
    isSubsidized: loanType === 'federal_subsidized',
  };
  
  const creditScoreImpact = EDUCATION_CREDIT_IMPACTS.studentLoanOpened;
  
  console.log('[StudentLoanManager] Loan approved:', {
    id: loan.id,
    amount,
    interestRate,
    monthlyPayment: loan.monthlyPayment,
    termMonths,
    creditScoreImpact,
  });
  
  return {
    success: true,
    loan,
    creditScoreImpact,
  };
}

export function makeLoanPayment(
  loan: StudentLoan,
  paymentAmount: number,
  currentDate: number
): LoanPaymentResult {
  console.log('[StudentLoanManager] Making payment:', { loanId: loan.id, amount: paymentAmount });
  
  if (loan.status === 'paid_off') {
    return {
      success: false,
      newBalance: 0,
      principalPaid: 0,
      interestPaid: 0,
      creditScoreImpact: 0,
      isPayoffComplete: true,
      error: 'Loan is already paid off',
    };
  }
  
  if (loan.status === 'deferred') {
    return {
      success: false,
      newBalance: loan.currentBalance,
      principalPaid: 0,
      interestPaid: 0,
      creditScoreImpact: 0,
      isPayoffComplete: false,
      error: 'Loan is currently in deferment. Resume payments after deferment ends.',
    };
  }
  
  if (paymentAmount <= 0) {
    return {
      success: false,
      newBalance: loan.currentBalance,
      principalPaid: 0,
      interestPaid: 0,
      creditScoreImpact: 0,
      isPayoffComplete: false,
      error: 'Payment amount must be greater than zero',
    };
  }
  
  const monthlyRate = loan.interestRate / 100 / 12;
  const interestDue = loan.currentBalance * monthlyRate;
  
  let interestPaid = 0;
  let principalPaid = 0;
  
  if (paymentAmount >= interestDue) {
    interestPaid = interestDue;
    principalPaid = Math.min(paymentAmount - interestDue, loan.currentBalance);
  } else {
    interestPaid = paymentAmount;
    principalPaid = 0;
  }
  
  const newBalance = Math.max(0, loan.currentBalance - principalPaid);
  const isOnTime = paymentAmount >= loan.minimumPayment;
  const creditScoreImpact = isOnTime 
    ? EDUCATION_CREDIT_IMPACTS.loanPaymentOnTime 
    : EDUCATION_CREDIT_IMPACTS.loanPaymentLate;
  
  const isPayoffComplete = newBalance === 0;
  
  console.log('[StudentLoanManager] Payment processed:', {
    interestPaid: Math.round(interestPaid * 100) / 100,
    principalPaid: Math.round(principalPaid * 100) / 100,
    newBalance: Math.round(newBalance * 100) / 100,
    isOnTime,
    creditScoreImpact,
    isPayoffComplete,
  });
  
  return {
    success: true,
    newBalance: Math.round(newBalance * 100) / 100,
    principalPaid: Math.round(principalPaid * 100) / 100,
    interestPaid: Math.round(interestPaid * 100) / 100,
    creditScoreImpact,
    isPayoffComplete,
  };
}

export function getActiveLoans(
  allLoans: StudentLoan[],
  playerId: string
): StudentLoan[] {
  console.log('[StudentLoanManager] Getting active loans for player:', playerId);
  
  const activeLoans = allLoans.filter(loan => 
    loan.playerId === playerId && 
    loan.status !== 'paid_off'
  );
  
  console.log('[StudentLoanManager] Found', activeLoans.length, 'active loans');
  return activeLoans;
}

export function getLoansByStatus(
  allLoans: StudentLoan[],
  playerId: string,
  status: LoanStatus
): StudentLoan[] {
  return allLoans.filter(loan => 
    loan.playerId === playerId && 
    loan.status === status
  );
}

export function calculateMonthlyPayment(loan: StudentLoan): number {
  return calculateMonthlyPaymentAmount(
    loan.currentBalance,
    loan.interestRate,
    loan.paymentsRemaining
  );
}

export function calculateMonthlyPaymentAmount(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  
  if (monthlyRate === 0) {
    return principal / termMonths;
  }
  
  const payment = (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                  (Math.pow(1 + monthlyRate, termMonths) - 1);
  
  return Math.round(payment * 100) / 100;
}

export function deferLoan(
  loan: StudentLoan,
  months: number,
  currentDate: number
): DefermentResult {
  console.log('[StudentLoanManager] Deferring loan:', loan.id, 'for', months, 'months');
  
  if (loan.status === 'paid_off') {
    return { success: false, error: 'Cannot defer a paid off loan' };
  }
  
  if (loan.status === 'defaulted') {
    return { success: false, error: 'Cannot defer a defaulted loan. Contact lender for options.' };
  }
  
  if (months < 1 || months > MAX_DEFERMENT_MONTHS) {
    return { 
      success: false, 
      error: `Deferment period must be between 1 and ${MAX_DEFERMENT_MONTHS} months` 
    };
  }
  
  if (loan.loanType === 'private') {
    return { 
      success: false, 
      error: 'Private loans do not qualify for deferment. Contact your lender for hardship options.' 
    };
  }
  
  const defermentEndDate = currentDate + (months * 30 * 24 * 60 * 60 * 1000);
  
  let interestAccrued = 0;
  if (!loan.isSubsidized) {
    const monthlyRate = loan.interestRate / 100 / 12;
    interestAccrued = loan.currentBalance * monthlyRate * months;
  }
  
  const updatedLoan: StudentLoan = {
    ...loan,
    status: 'deferred',
    defermentEndDate,
    currentBalance: loan.currentBalance + interestAccrued,
  };
  
  console.log('[StudentLoanManager] Loan deferred:', {
    defermentEndDate: new Date(defermentEndDate).toLocaleDateString(),
    interestAccrued: Math.round(interestAccrued * 100) / 100,
    isSubsidized: loan.isSubsidized,
  });
  
  return {
    success: true,
    loan: updatedLoan,
    newDefermentEndDate: defermentEndDate,
    interestAccrued: Math.round(interestAccrued * 100) / 100,
  };
}

export function refinanceLoan(
  loan: StudentLoan,
  newTermYears: number,
  currentCreditScore: number,
  currentDate: number
): RefinanceResult {
  console.log('[StudentLoanManager] Refinancing loan:', loan.id, 'to', newTermYears, 'years');
  
  if (loan.status === 'paid_off') {
    return { success: false, error: 'Cannot refinance a paid off loan' };
  }
  
  if (loan.status === 'defaulted') {
    return { success: false, error: 'Cannot refinance a defaulted loan' };
  }
  
  if (currentCreditScore < CREDIT_SCORE_THRESHOLDS.fair) {
    return { 
      success: false, 
      error: `Credit score of at least ${CREDIT_SCORE_THRESHOLDS.fair} required to refinance. Your score: ${currentCreditScore}` 
    };
  }
  
  if (newTermYears < MIN_TERM_YEARS || newTermYears > MAX_TERM_YEARS) {
    return { 
      success: false, 
      error: `New term must be between ${MIN_TERM_YEARS} and ${MAX_TERM_YEARS} years` 
    };
  }
  
  let newRate = calculateRefinanceRate(currentCreditScore, loan.loanType);
  
  if (newRate >= loan.interestRate - 0.25) {
    return { 
      success: false, 
      error: 'Current rates do not offer significant savings. Try again when your credit improves or rates drop.' 
    };
  }
  
  const newTermMonths = newTermYears * 12;
  const newMonthlyPayment = calculateMonthlyPaymentAmount(
    loan.currentBalance,
    newRate,
    newTermMonths
  );
  
  const oldTotalPayments = loan.monthlyPayment * loan.paymentsRemaining;
  const newTotalPayments = newMonthlyPayment * newTermMonths;
  const totalSavings = oldTotalPayments - newTotalPayments;
  
  const oldLoan: StudentLoan = {
    ...loan,
    status: 'paid_off',
    payoffDate: currentDate,
  };
  
  const newLoan: StudentLoan = {
    id: `loan_refi_${currentDate}_${Math.random().toString(36).substr(2, 9)}`,
    playerId: loan.playerId,
    studentEducationId: loan.studentEducationId,
    loanType: 'private',
    lenderName: 'Refinanced Loan',
    principalAmount: loan.currentBalance,
    currentBalance: loan.currentBalance,
    interestRate: newRate,
    termMonths: newTermMonths,
    monthlyPayment: newMonthlyPayment,
    minimumPayment: newMonthlyPayment,
    status: 'in_repayment',
    originationDate: currentDate,
    firstPaymentDate: currentDate + (30 * 24 * 60 * 60 * 1000),
    totalInterestPaid: 0,
    paymentsMade: 0,
    paymentsRemaining: newTermMonths,
    isSubsidized: false,
  };
  
  console.log('[StudentLoanManager] Loan refinanced:', {
    oldRate: loan.interestRate,
    newRate,
    oldPayment: loan.monthlyPayment,
    newPayment: newMonthlyPayment,
    totalSavings: Math.round(totalSavings * 100) / 100,
  });
  
  return {
    success: true,
    oldLoan,
    newLoan,
    newInterestRate: newRate,
    newMonthlyPayment,
    totalSavings: Math.round(totalSavings * 100) / 100,
  };
}

export function processMonthlyPayments(
  loans: StudentLoan[],
  playerId: string,
  availableBalance: number,
  currentDate: number
): {
  result: MonthlyPaymentProcessResult;
  updatedLoans: StudentLoan[];
  newBalance: number;
} {
  console.log('[StudentLoanManager] Processing monthly payments for player:', playerId);
  
  const activeLoans = loans.filter(loan => 
    loan.playerId === playerId && 
    (loan.status === 'active' || loan.status === 'in_repayment')
  );
  
  let remainingBalance = availableBalance;
  const updatedLoans: StudentLoan[] = [];
  const result: MonthlyPaymentProcessResult = {
    loansProcessed: 0,
    totalPaid: 0,
    totalCreditImpact: 0,
    missedPayments: [],
    successfulPayments: [],
    insufficientFunds: false,
  };
  
  const sortedLoans = [...activeLoans].sort((a, b) => b.interestRate - a.interestRate);
  
  for (const loan of sortedLoans) {
    const paymentDue = loan.minimumPayment;
    
    if (remainingBalance >= paymentDue) {
      const paymentResult = makeLoanPayment(loan, paymentDue, currentDate);
      
      if (paymentResult.success) {
        const updatedLoan: StudentLoan = {
          ...loan,
          currentBalance: paymentResult.newBalance,
          totalInterestPaid: loan.totalInterestPaid + paymentResult.interestPaid,
          paymentsMade: loan.paymentsMade + 1,
          paymentsRemaining: Math.max(0, loan.paymentsRemaining - 1),
          lastPaymentDate: currentDate,
          lastPaymentAmount: paymentDue,
          status: paymentResult.isPayoffComplete ? 'paid_off' : loan.status,
          payoffDate: paymentResult.isPayoffComplete ? currentDate : undefined,
        };
        
        updatedLoans.push(updatedLoan);
        remainingBalance -= paymentDue;
        result.totalPaid += paymentDue;
        result.totalCreditImpact += paymentResult.creditScoreImpact;
        result.successfulPayments.push(loan.id);
        result.loansProcessed++;
        
        console.log('[StudentLoanManager] Payment successful for loan:', loan.id);
      }
    } else {
      result.missedPayments.push(loan.id);
      result.insufficientFunds = true;
      result.totalCreditImpact += EDUCATION_CREDIT_IMPACTS.loanPaymentLate;
      
      const updatedLoan: StudentLoan = {
        ...loan,
        status: loan.status === 'active' ? 'active' : 'in_repayment',
      };
      updatedLoans.push(updatedLoan);
      
      console.log('[StudentLoanManager] Missed payment for loan:', loan.id, 'Insufficient funds');
    }
  }
  
  console.log('[StudentLoanManager] Monthly processing complete:', {
    loansProcessed: result.loansProcessed,
    totalPaid: result.totalPaid,
    missedPayments: result.missedPayments.length,
    totalCreditImpact: result.totalCreditImpact,
  });
  
  return {
    result,
    updatedLoans,
    newBalance: Math.round(remainingBalance * 100) / 100,
  };
}

export function accrueInterest(
  loan: StudentLoan,
  monthsElapsed: number = 1
): StudentLoan {
  if (loan.status === 'paid_off') {
    return loan;
  }
  
  if (loan.isSubsidized && (loan.status === 'in_grace' || loan.status === 'deferred')) {
    console.log('[StudentLoanManager] Subsidized loan - no interest accrued during grace/deferment');
    return loan;
  }
  
  const monthlyRate = loan.interestRate / 100 / 12;
  const interestAccrued = loan.currentBalance * monthlyRate * monthsElapsed;
  
  const newBalance = loan.currentBalance + interestAccrued;
  
  console.log('[StudentLoanManager] Interest accrued:', {
    loanId: loan.id,
    monthsElapsed,
    interestAccrued: Math.round(interestAccrued * 100) / 100,
    newBalance: Math.round(newBalance * 100) / 100,
  });
  
  return {
    ...loan,
    currentBalance: Math.round(newBalance * 100) / 100,
  };
}

export function checkGracePeriodExpiry(
  loan: StudentLoan,
  currentDate: number
): StudentLoan {
  if (loan.status !== 'in_grace') {
    return loan;
  }
  
  if (loan.gracePeriodEndDate && currentDate >= loan.gracePeriodEndDate) {
    console.log('[StudentLoanManager] Grace period expired for loan:', loan.id);
    return {
      ...loan,
      status: 'in_repayment',
      firstPaymentDate: currentDate + (30 * 24 * 60 * 60 * 1000),
    };
  }
  
  return loan;
}

export function checkDefermentExpiry(
  loan: StudentLoan,
  currentDate: number
): StudentLoan {
  if (loan.status !== 'deferred') {
    return loan;
  }
  
  if (loan.defermentEndDate && currentDate >= loan.defermentEndDate) {
    console.log('[StudentLoanManager] Deferment expired for loan:', loan.id);
    return {
      ...loan,
      status: 'in_repayment',
      defermentEndDate: undefined,
    };
  }
  
  return loan;
}

export function calculateTotalDebt(loans: StudentLoan[], playerId: string): number {
  const playerLoans = loans.filter(l => l.playerId === playerId && l.status !== 'paid_off');
  return playerLoans.reduce((sum, loan) => sum + loan.currentBalance, 0);
}

export function calculateTotalMonthlyPayment(loans: StudentLoan[], playerId: string): number {
  const activeLoans = loans.filter(l => 
    l.playerId === playerId && 
    (l.status === 'active' || l.status === 'in_repayment')
  );
  return activeLoans.reduce((sum, loan) => sum + loan.minimumPayment, 0);
}

export function getLoanSummary(
  loans: StudentLoan[],
  playerId: string
): {
  totalDebt: number;
  totalMonthlyPayment: number;
  federalDebt: number;
  privateDebt: number;
  loansInGrace: number;
  loansInRepayment: number;
  loansDeferred: number;
  averageInterestRate: number;
  estimatedPayoffDate: number | null;
  totalInterestPaid: number;
} {
  const playerLoans = loans.filter(l => l.playerId === playerId);
  const activeLoans = playerLoans.filter(l => l.status !== 'paid_off');
  
  const totalDebt = activeLoans.reduce((sum, l) => sum + l.currentBalance, 0);
  const totalMonthlyPayment = activeLoans
    .filter(l => l.status === 'active' || l.status === 'in_repayment')
    .reduce((sum, l) => sum + l.minimumPayment, 0);
  
  const federalDebt = activeLoans
    .filter(l => l.loanType.startsWith('federal') || l.loanType === 'grad_plus' || l.loanType === 'parent_plus')
    .reduce((sum, l) => sum + l.currentBalance, 0);
  
  const privateDebt = activeLoans
    .filter(l => l.loanType === 'private')
    .reduce((sum, l) => sum + l.currentBalance, 0);
  
  const loansInGrace = activeLoans.filter(l => l.status === 'in_grace').length;
  const loansInRepayment = activeLoans.filter(l => l.status === 'active' || l.status === 'in_repayment').length;
  const loansDeferred = activeLoans.filter(l => l.status === 'deferred').length;
  
  const totalInterestPaid = playerLoans.reduce((sum, l) => sum + l.totalInterestPaid, 0);
  
  let averageInterestRate = 0;
  if (activeLoans.length > 0) {
    const weightedRate = activeLoans.reduce((sum, l) => sum + (l.interestRate * l.currentBalance), 0);
    averageInterestRate = totalDebt > 0 ? weightedRate / totalDebt : 0;
  }
  
  let estimatedPayoffDate: number | null = null;
  if (activeLoans.length > 0 && totalMonthlyPayment > 0) {
    const maxPaymentsRemaining = Math.max(...activeLoans.map(l => l.paymentsRemaining));
    estimatedPayoffDate = Date.now() + (maxPaymentsRemaining * 30 * 24 * 60 * 60 * 1000);
  }
  
  return {
    totalDebt: Math.round(totalDebt * 100) / 100,
    totalMonthlyPayment: Math.round(totalMonthlyPayment * 100) / 100,
    federalDebt: Math.round(federalDebt * 100) / 100,
    privateDebt: Math.round(privateDebt * 100) / 100,
    loansInGrace,
    loansInRepayment,
    loansDeferred,
    averageInterestRate: Math.round(averageInterestRate * 100) / 100,
    estimatedPayoffDate,
    totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
  };
}

export function checkForDefault(
  loan: StudentLoan,
  consecutiveMissedPayments: number
): {
  isDefaulted: boolean;
  loan: StudentLoan;
  creditScoreImpact: number;
} {
  const MISSED_PAYMENTS_THRESHOLD = 9;
  
  if (consecutiveMissedPayments >= MISSED_PAYMENTS_THRESHOLD && loan.status !== 'defaulted') {
    console.log('[StudentLoanManager] Loan defaulted:', loan.id);
    return {
      isDefaulted: true,
      loan: { ...loan, status: 'defaulted' },
      creditScoreImpact: EDUCATION_CREDIT_IMPACTS.loanDefault,
    };
  }
  
  return {
    isDefaulted: false,
    loan,
    creditScoreImpact: 0,
  };
}

function calculatePrivateRate(creditScore: number): number {
  if (creditScore >= CREDIT_SCORE_THRESHOLDS.excellent) {
    return PRIVATE_BASE_RATE;
  } else if (creditScore >= CREDIT_SCORE_THRESHOLDS.good) {
    return PRIVATE_BASE_RATE + 1.0;
  } else if (creditScore >= CREDIT_SCORE_THRESHOLDS.fair) {
    return PRIVATE_BASE_RATE + 2.5;
  } else {
    return PRIVATE_BASE_RATE + 4.0;
  }
}

function calculateRefinanceRate(creditScore: number, originalLoanType: LoanType): number {
  let baseRate: number;
  
  if (originalLoanType === 'private') {
    baseRate = PRIVATE_BASE_RATE - REFINANCE_RATE_REDUCTION;
  } else {
    baseRate = FEDERAL_BASE_RATE + 0.5;
  }
  
  if (creditScore >= CREDIT_SCORE_THRESHOLDS.excellent) {
    return baseRate;
  } else if (creditScore >= CREDIT_SCORE_THRESHOLDS.good) {
    return baseRate + 0.5;
  } else if (creditScore >= CREDIT_SCORE_THRESHOLDS.fair) {
    return baseRate + 1.5;
  } else {
    return baseRate + 3.0;
  }
}

export function estimateLoanPayoff(
  loan: StudentLoan,
  extraMonthlyPayment: number = 0
): {
  monthsToPayoff: number;
  totalInterest: number;
  totalPaid: number;
  payoffDate: number;
} {
  const monthlyPayment = loan.minimumPayment + extraMonthlyPayment;
  const monthlyRate = loan.interestRate / 100 / 12;
  
  let balance = loan.currentBalance;
  let months = 0;
  let totalInterest = 0;
  const maxMonths = 360;
  
  while (balance > 0 && months < maxMonths) {
    const interestThisMonth = balance * monthlyRate;
    totalInterest += interestThisMonth;
    
    const principalPayment = Math.min(monthlyPayment - interestThisMonth, balance);
    balance = Math.max(0, balance - principalPayment);
    months++;
  }
  
  const totalPaid = loan.currentBalance + totalInterest;
  const payoffDate = Date.now() + (months * 30 * 24 * 60 * 60 * 1000);
  
  return {
    monthsToPayoff: months,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    payoffDate,
  };
}

export {
  FEDERAL_BASE_RATE,
  PRIVATE_BASE_RATE,
  CREDIT_SCORE_THRESHOLDS,
  MIN_TERM_YEARS,
  MAX_TERM_YEARS,
  MAX_DEFERMENT_MONTHS,
};
