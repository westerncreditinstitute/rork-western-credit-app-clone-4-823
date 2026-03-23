import {
  StudentEducation,
  StudentLoan,
  FinancialAid,
  CompletedDegree,
  DegreeType,
} from '@/types/education';
import {
  SCHOOLS,
  DEGREES,
} from '@/mocks/educationData';

export interface EducationExpenses {
  tuitionPerSemester: number;
  booksAndSupplies: number;
  housingCost: number;
  livingExpenses: number;
  totalSemesterCost: number;
  monthlyEducationCost: number;
}

export interface EducationIncome {
  baseMonthlyIncome: number;
  adjustedMonthlyIncome: number;
  workStudyIncome: number;
  internshipIncome: number;
  incomeReductionPercent: number;
}

export interface EducationBudget {
  totalEducationSpending: number;
  totalTuitionPaid: number;
  totalBooksAndSupplies: number;
  totalLivingExpenses: number;
  totalFinancialAidReceived: number;
  totalStudentLoanBorrowed: number;
  totalStudentLoanPaid: number;
  currentStudentDebt: number;
  monthlyLoanPayment: number;
  debtToIncomeRatio: number;
  educationROI: number;
}

export interface EducationROI {
  totalEducationCost: number;
  projectedSalaryIncrease: number;
  yearsToBreakeven: number;
  lifetimeEarningsBoost: number;
  roiPercentage: number;
}

export interface MonthlyEducationProcessResult {
  tuitionDeducted: number;
  loanPaymentsProcessed: number;
  financialAidApplied: number;
  netCost: number;
  creditScoreImpact: number;
  warnings: string[];
  highlights: string[];
}

const LIVING_EXPENSES_BASE = 800;
const BOOKS_PER_SEMESTER = 500;
const PART_TIME_INCOME_REDUCTION = 0.6;
const FULL_TIME_STUDENT_INCOME_REDUCTION = 0.3;
const WORK_STUDY_HOURLY_RATE = 12.50;
const WORK_STUDY_HOURS_PER_WEEK = 15;
const INTERNSHIP_MONTHLY_INCOME = 2500;

export function calculateEducationExpenses(
  enrollment: StudentEducation | null,
  hasWorkStudy: boolean = false
): EducationExpenses {
  console.log('[EducationEconomyManager] Calculating education expenses');
  
  if (!enrollment) {
    return {
      tuitionPerSemester: 0,
      booksAndSupplies: 0,
      housingCost: 0,
      livingExpenses: 0,
      totalSemesterCost: 0,
      monthlyEducationCost: 0,
    };
  }
  
  const school = SCHOOLS.find(s => s.id === enrollment.schoolId);
  if (!school) {
    console.log('[EducationEconomyManager] School not found:', enrollment.schoolId);
    return {
      tuitionPerSemester: 0,
      booksAndSupplies: 0,
      housingCost: 0,
      livingExpenses: 0,
      totalSemesterCost: 0,
      monthlyEducationCost: 0,
    };
  }
  
  const creditsPerSemester = enrollment.isFullTime ? 15 : 9;
  const tuitionPerSemester = school.tuitionCostPerCredit * creditsPerSemester;
  const booksAndSupplies = school.booksCostPerSemester;
  const housingCost = enrollment.isOnCampus ? (school.housingCostPerSemester || 0) : 0;
  const livingExpenses = LIVING_EXPENSES_BASE * 4;
  
  const totalSemesterCost = tuitionPerSemester + booksAndSupplies + housingCost + livingExpenses;
  const monthlyEducationCost = totalSemesterCost / 4;
  
  console.log('[EducationEconomyManager] Education expenses calculated:', {
    tuitionPerSemester,
    booksAndSupplies,
    housingCost,
    livingExpenses,
    totalSemesterCost,
    monthlyEducationCost,
  });
  
  return {
    tuitionPerSemester,
    booksAndSupplies,
    housingCost,
    livingExpenses,
    totalSemesterCost,
    monthlyEducationCost,
  };
}

export function calculateEducationIncome(
  baseMonthlyIncome: number,
  enrollment: StudentEducation | null,
  hasWorkStudy: boolean = false,
  hasInternship: boolean = false
): EducationIncome {
  console.log('[EducationEconomyManager] Calculating education income adjustment');
  
  if (!enrollment || enrollment.status !== 'active') {
    return {
      baseMonthlyIncome,
      adjustedMonthlyIncome: baseMonthlyIncome,
      workStudyIncome: 0,
      internshipIncome: 0,
      incomeReductionPercent: 0,
    };
  }
  
  const incomeReductionPercent = enrollment.isFullTime 
    ? FULL_TIME_STUDENT_INCOME_REDUCTION 
    : PART_TIME_INCOME_REDUCTION;
  
  const reducedIncome = baseMonthlyIncome * (1 - incomeReductionPercent);
  
  const workStudyIncome = hasWorkStudy 
    ? WORK_STUDY_HOURLY_RATE * WORK_STUDY_HOURS_PER_WEEK * 4 
    : 0;
  
  const internshipIncome = hasInternship ? INTERNSHIP_MONTHLY_INCOME : 0;
  
  const adjustedMonthlyIncome = reducedIncome + workStudyIncome + internshipIncome;
  
  console.log('[EducationEconomyManager] Income adjustment calculated:', {
    baseMonthlyIncome,
    reducedIncome,
    workStudyIncome,
    internshipIncome,
    adjustedMonthlyIncome,
    incomeReductionPercent: (incomeReductionPercent * 100).toFixed(0) + '%',
  });
  
  return {
    baseMonthlyIncome,
    adjustedMonthlyIncome,
    workStudyIncome,
    internshipIncome,
    incomeReductionPercent: incomeReductionPercent * 100,
  };
}

export function calculateEducationBudget(
  enrollment: StudentEducation | null,
  completedDegrees: CompletedDegree[],
  studentLoans: StudentLoan[],
  financialAid: FinancialAid[],
  monthlyIncome: number,
  lifetimeTuitionPaid: number
): EducationBudget {
  console.log('[EducationEconomyManager] Calculating education budget');
  
  const totalStudentLoanBorrowed = studentLoans.reduce((sum, loan) => sum + loan.principalAmount, 0);
  const totalStudentLoanPaid = studentLoans.reduce((sum, loan) => sum + loan.totalInterestPaid + (loan.principalAmount - loan.currentBalance), 0);
  const currentStudentDebt = studentLoans
    .filter(loan => loan.status !== 'paid_off')
    .reduce((sum, loan) => sum + loan.currentBalance, 0);
  
  const monthlyLoanPayment = studentLoans
    .filter(loan => loan.status === 'active' || loan.status === 'in_repayment')
    .reduce((sum, loan) => sum + loan.minimumPayment, 0);
  
  const totalFinancialAidReceived = financialAid
    .filter(aid => aid.status === 'approved' || aid.status === 'disbursed')
    .reduce((sum, aid) => sum + aid.amount, 0);
  
  const expenses = calculateEducationExpenses(enrollment);
  const totalBooksAndSupplies = expenses.booksAndSupplies * (enrollment?.currentSemester || 0);
  const totalLivingExpenses = expenses.livingExpenses * (enrollment?.currentSemester || 0);
  
  const totalEducationSpending = lifetimeTuitionPaid + totalBooksAndSupplies + totalLivingExpenses;
  
  const annualIncome = monthlyIncome * 12;
  const debtToIncomeRatio = annualIncome > 0 ? (currentStudentDebt / annualIncome) * 100 : 0;
  
  const educationROI = calculateEducationROISimple(completedDegrees, totalEducationSpending, monthlyIncome);
  
  console.log('[EducationEconomyManager] Education budget calculated:', {
    totalEducationSpending,
    currentStudentDebt,
    monthlyLoanPayment,
    debtToIncomeRatio: debtToIncomeRatio.toFixed(1) + '%',
    educationROI: educationROI.toFixed(1) + '%',
  });
  
  return {
    totalEducationSpending,
    totalTuitionPaid: lifetimeTuitionPaid,
    totalBooksAndSupplies,
    totalLivingExpenses,
    totalFinancialAidReceived,
    totalStudentLoanBorrowed,
    totalStudentLoanPaid,
    currentStudentDebt,
    monthlyLoanPayment,
    debtToIncomeRatio,
    educationROI,
  };
}

export function calculateEducationROISimple(
  completedDegrees: CompletedDegree[],
  totalEducationCost: number,
  currentMonthlyIncome: number
): number {
  if (completedDegrees.length === 0 || totalEducationCost === 0) {
    return 0;
  }
  
  let projectedSalaryMultiplier = 1;
  completedDegrees.forEach(degree => {
    const degreeInfo = DEGREES.find(d => d.id === degree.degreeId);
    if (degreeInfo) {
      projectedSalaryMultiplier += degreeInfo.averageSalaryIncrease / 100;
    }
  });
  
  const baselineMonthlyIncome = currentMonthlyIncome / projectedSalaryMultiplier;
  const annualIncomeIncrease = (currentMonthlyIncome - baselineMonthlyIncome) * 12;
  
  const roi = totalEducationCost > 0 
    ? ((annualIncomeIncrease * 10 - totalEducationCost) / totalEducationCost) * 100 
    : 0;
  
  return Math.round(roi * 100) / 100;
}

export function calculateDetailedEducationROI(
  completedDegrees: CompletedDegree[],
  totalEducationCost: number,
  currentMonthlyIncome: number,
  baselineSalaryWithoutDegree: number = 30000
): EducationROI {
  console.log('[EducationEconomyManager] Calculating detailed education ROI');
  
  if (completedDegrees.length === 0) {
    return {
      totalEducationCost,
      projectedSalaryIncrease: 0,
      yearsToBreakeven: Infinity,
      lifetimeEarningsBoost: 0,
      roiPercentage: 0,
    };
  }
  
  const currentAnnualIncome = currentMonthlyIncome * 12;
  const projectedSalaryIncrease = currentAnnualIncome - baselineSalaryWithoutDegree;
  
  const yearsToBreakeven = projectedSalaryIncrease > 0 
    ? totalEducationCost / projectedSalaryIncrease 
    : Infinity;
  
  const workingYearsRemaining = 35;
  const lifetimeEarningsBoost = projectedSalaryIncrease * workingYearsRemaining;
  
  const roiPercentage = totalEducationCost > 0 
    ? ((lifetimeEarningsBoost - totalEducationCost) / totalEducationCost) * 100 
    : 0;
  
  console.log('[EducationEconomyManager] Detailed ROI calculated:', {
    totalEducationCost,
    projectedSalaryIncrease,
    yearsToBreakeven: yearsToBreakeven.toFixed(1),
    lifetimeEarningsBoost,
    roiPercentage: roiPercentage.toFixed(1) + '%',
  });
  
  return {
    totalEducationCost,
    projectedSalaryIncrease,
    yearsToBreakeven: Math.round(yearsToBreakeven * 10) / 10,
    lifetimeEarningsBoost,
    roiPercentage: Math.round(roiPercentage * 100) / 100,
  };
}

export function processMonthlyEducationExpenses(
  enrollment: StudentEducation | null,
  studentLoans: StudentLoan[],
  financialAid: FinancialAid[],
  bankBalance: number,
  isGracePeriod: boolean = false,
  currentDate: number
): MonthlyEducationProcessResult {
  console.log('[EducationEconomyManager] Processing monthly education expenses');
  
  const warnings: string[] = [];
  const highlights: string[] = [];
  let creditScoreImpact = 0;
  
  const expenses = calculateEducationExpenses(enrollment);
  let tuitionDeducted = 0;
  
  if (enrollment && enrollment.status === 'active') {
    const monthlyTuition = expenses.monthlyEducationCost;
    
    const activeAid = financialAid.filter(aid => 
      aid.status === 'approved' || aid.status === 'disbursed'
    );
    const monthlyAid = activeAid.reduce((sum, aid) => sum + (aid.amountPerSemester / 4), 0);
    
    tuitionDeducted = Math.max(0, monthlyTuition - monthlyAid);
    
    if (monthlyAid > 0) {
      highlights.push(`Financial aid applied: $${monthlyAid.toFixed(0)}`);
    }
    
    if (tuitionDeducted > bankBalance) {
      warnings.push('Insufficient funds for education expenses! Consider applying for financial aid or student loans.');
    }
  }
  
  let loanPaymentsProcessed = 0;
  const activeLoans = studentLoans.filter(loan => 
    loan.status === 'active' || loan.status === 'in_repayment'
  );
  
  if (!isGracePeriod) {
    activeLoans.forEach(loan => {
      loanPaymentsProcessed += loan.minimumPayment;
      
      if (bankBalance - tuitionDeducted < loan.minimumPayment) {
        warnings.push(`Unable to make student loan payment for ${loan.lenderName}. This may affect your credit score.`);
        creditScoreImpact -= 15;
      } else {
        creditScoreImpact += 2;
        highlights.push(`Student loan payment: $${loan.minimumPayment.toFixed(0)}`);
      }
    });
  } else {
    highlights.push('Student loans in grace period - no payments due');
  }
  
  const loansInGrace = studentLoans.filter(loan => loan.status === 'in_grace');
  loansInGrace.forEach(loan => {
    if (loan.gracePeriodEndDate && currentDate >= loan.gracePeriodEndDate) {
      warnings.push(`Grace period ending for ${loan.lenderName}. Payments will begin next month.`);
    }
  });
  
  const totalAidApplied = financialAid
    .filter(aid => aid.status === 'approved' || aid.status === 'disbursed')
    .reduce((sum, aid) => sum + (aid.amountPerSemester / 4), 0);
  
  const netCost = tuitionDeducted + loanPaymentsProcessed;
  
  console.log('[EducationEconomyManager] Monthly education expenses processed:', {
    tuitionDeducted,
    loanPaymentsProcessed,
    financialAidApplied: totalAidApplied,
    netCost,
    creditScoreImpact,
  });
  
  return {
    tuitionDeducted,
    loanPaymentsProcessed,
    financialAidApplied: totalAidApplied,
    netCost,
    creditScoreImpact,
    warnings,
    highlights,
  };
}

export function getEducationDebtSummary(
  studentLoans: StudentLoan[]
): {
  totalDebt: number;
  federalDebt: number;
  privateDebt: number;
  monthlyPayment: number;
  averageInterestRate: number;
  estimatedPayoffYears: number;
  loansCount: number;
  loansInRepayment: number;
  loansInGrace: number;
  loansDeferred: number;
} {
  const activeLoans = studentLoans.filter(loan => loan.status !== 'paid_off');
  
  const totalDebt = activeLoans.reduce((sum, loan) => sum + loan.currentBalance, 0);
  
  const federalDebt = activeLoans
    .filter(loan => loan.loanType.startsWith('federal') || loan.loanType === 'grad_plus' || loan.loanType === 'parent_plus')
    .reduce((sum, loan) => sum + loan.currentBalance, 0);
  
  const privateDebt = activeLoans
    .filter(loan => loan.loanType === 'private')
    .reduce((sum, loan) => sum + loan.currentBalance, 0);
  
  const repaymentLoans = activeLoans.filter(loan => 
    loan.status === 'active' || loan.status === 'in_repayment'
  );
  const monthlyPayment = repaymentLoans.reduce((sum, loan) => sum + loan.minimumPayment, 0);
  
  let averageInterestRate = 0;
  if (activeLoans.length > 0 && totalDebt > 0) {
    const weightedRate = activeLoans.reduce((sum, loan) => 
      sum + (loan.interestRate * loan.currentBalance), 0
    );
    averageInterestRate = weightedRate / totalDebt;
  }
  
  const estimatedPayoffYears = monthlyPayment > 0 
    ? totalDebt / (monthlyPayment * 12) 
    : 0;
  
  return {
    totalDebt: Math.round(totalDebt * 100) / 100,
    federalDebt: Math.round(federalDebt * 100) / 100,
    privateDebt: Math.round(privateDebt * 100) / 100,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    averageInterestRate: Math.round(averageInterestRate * 100) / 100,
    estimatedPayoffYears: Math.round(estimatedPayoffYears * 10) / 10,
    loansCount: activeLoans.length,
    loansInRepayment: repaymentLoans.length,
    loansInGrace: activeLoans.filter(loan => loan.status === 'in_grace').length,
    loansDeferred: activeLoans.filter(loan => loan.status === 'deferred').length,
  };
}

export function shouldEnterGracePeriod(
  enrollment: StudentEducation | null,
  previousEnrollmentStatus: string | null
): boolean {
  if (!enrollment && previousEnrollmentStatus === 'active') {
    return true;
  }
  
  if (enrollment?.status === 'graduated' && previousEnrollmentStatus === 'active') {
    return true;
  }
  
  return false;
}

export function getEducationFinancialSummary(
  enrollment: StudentEducation | null,
  completedDegrees: CompletedDegree[],
  studentLoans: StudentLoan[],
  financialAid: FinancialAid[],
  monthlyIncome: number,
  lifetimeTuitionPaid: number
): {
  isCurrentlyEnrolled: boolean;
  monthlyEducationCost: number;
  monthlyLoanPayment: number;
  totalMonthlyEducationExpense: number;
  financialAidCoverage: number;
  educationAsPercentOfIncome: number;
  debtToIncomeRatio: number;
  hasHighDebtRatio: boolean;
  recommendations: string[];
} {
  const isCurrentlyEnrolled = enrollment !== null && enrollment.status === 'active';
  const expenses = calculateEducationExpenses(enrollment);
  const debtSummary = getEducationDebtSummary(studentLoans);
  
  const monthlyEducationCost = expenses.monthlyEducationCost;
  const monthlyLoanPayment = debtSummary.monthlyPayment;
  const totalMonthlyEducationExpense = monthlyEducationCost + monthlyLoanPayment;
  
  const monthlyAid = financialAid
    .filter(aid => aid.status === 'approved' || aid.status === 'disbursed')
    .reduce((sum, aid) => sum + (aid.amountPerSemester / 4), 0);
  
  const financialAidCoverage = monthlyEducationCost > 0 
    ? (monthlyAid / monthlyEducationCost) * 100 
    : 0;
  
  const educationAsPercentOfIncome = monthlyIncome > 0 
    ? (totalMonthlyEducationExpense / monthlyIncome) * 100 
    : 0;
  
  const annualIncome = monthlyIncome * 12;
  const debtToIncomeRatio = annualIncome > 0 
    ? (debtSummary.totalDebt / annualIncome) * 100 
    : 0;
  
  const hasHighDebtRatio = debtToIncomeRatio > 50;
  
  const recommendations: string[] = [];
  
  if (isCurrentlyEnrolled && financialAidCoverage < 50) {
    recommendations.push('Consider applying for more scholarships or grants to reduce out-of-pocket costs.');
  }
  
  if (hasHighDebtRatio) {
    recommendations.push('Your student debt-to-income ratio is high. Consider income-driven repayment plans.');
  }
  
  if (educationAsPercentOfIncome > 30) {
    recommendations.push('Education expenses exceed 30% of income. Consider part-time enrollment or additional income sources.');
  }
  
  if (debtSummary.loansInGrace > 0) {
    recommendations.push('You have loans in grace period. Start planning for payments before grace period ends.');
  }
  
  if (isCurrentlyEnrolled && monthlyIncome === 0) {
    recommendations.push('Consider work-study or part-time employment to help cover education costs.');
  }
  
  return {
    isCurrentlyEnrolled,
    monthlyEducationCost,
    monthlyLoanPayment,
    totalMonthlyEducationExpense,
    financialAidCoverage,
    educationAsPercentOfIncome,
    debtToIncomeRatio,
    hasHighDebtRatio,
    recommendations,
  };
}

export function calculateDegreeWorth(
  degreeType: DegreeType,
  majorId: string,
  schoolReputationScore: number
): {
  expectedSalaryPremium: number;
  careerAdvancementScore: number;
  employabilityScore: number;
  recommendation: string;
} {
  const degree = DEGREES.find(d => d.type === degreeType);
  
  const basePremiums: Record<DegreeType, number> = {
    certificate: 15,
    associate: 25,
    bachelor: 45,
    master: 70,
    doctorate: 100,
  };
  
  const reputationMultiplier = 0.8 + (schoolReputationScore / 10) * 0.4;
  const expectedSalaryPremium = (basePremiums[degreeType] || 0) * reputationMultiplier;
  
  const careerAdvancementScore = Math.min(100, (degree?.careerAdvancementBonus || 0) * 20 + schoolReputationScore * 5);
  
  const employabilityScore = Math.min(100, 50 + (basePremiums[degreeType] || 0) / 2 + schoolReputationScore * 3);
  
  let recommendation = '';
  if (expectedSalaryPremium > 60) {
    recommendation = 'Excellent investment with high salary potential and career advancement.';
  } else if (expectedSalaryPremium > 40) {
    recommendation = 'Good investment with solid return on education costs.';
  } else if (expectedSalaryPremium > 20) {
    recommendation = 'Moderate investment. Consider costs carefully against potential earnings.';
  } else {
    recommendation = 'Entry-level credential. Good for getting started but consider advancement options.';
  }
  
  return {
    expectedSalaryPremium: Math.round(expectedSalaryPremium * 10) / 10,
    careerAdvancementScore: Math.round(careerAdvancementScore),
    employabilityScore: Math.round(employabilityScore),
    recommendation,
  };
}

export {
  LIVING_EXPENSES_BASE,
  BOOKS_PER_SEMESTER,
  PART_TIME_INCOME_REDUCTION,
  FULL_TIME_STUDENT_INCOME_REDUCTION,
  WORK_STUDY_HOURLY_RATE,
  WORK_STUDY_HOURS_PER_WEEK,
  INTERNSHIP_MONTHLY_INCOME,
};
