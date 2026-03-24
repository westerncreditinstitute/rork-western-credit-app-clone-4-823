export type SchoolType = 'community_college' | 'state_university' | 'private_university' | 'trade_school' | 'online_university';

export type DegreeType = 'certificate' | 'associate' | 'bachelor' | 'master' | 'doctorate';

export type EnrollmentStatus = 'active' | 'graduated' | 'dropout' | 'suspended' | 'on_leave';

export type FinancialAidType = 'grant' | 'scholarship' | 'work_study' | 'fellowship';

export type FinancialAidStatus = 'pending' | 'approved' | 'rejected' | 'disbursed' | 'expired';

export type LoanType = 'federal_subsidized' | 'federal_unsubsidized' | 'private' | 'parent_plus' | 'grad_plus';

export type LoanStatus = 'active' | 'in_grace' | 'in_repayment' | 'deferred' | 'defaulted' | 'paid_off';

export interface School {
  id: string;
  name: string;
  type: SchoolType;
  location: string;
  tuitionCostPerYear: number;
  tuitionCostPerCredit: number;
  reputationScore: number; // 1-10
  acceptanceRate: number; // 0-100
  minimumGPA: number;
  minimumCreditScore?: number;
  availableDegrees: string[]; // degree IDs
  availableMajors: string[]; // major IDs
  housingCostPerSemester?: number;
  booksCostPerSemester: number;
  imageUrl: string;
  description: string;
  isOnline: boolean;
  financialAidAvailable: boolean;
}

export interface Degree {
  id: string;
  name: string;
  type: DegreeType;
  durationYears: number;
  creditHoursRequired: number;
  prerequisites: string[]; // degree IDs required before this
  description: string;
  averageSalaryIncrease: number; // percentage increase in salary potential
  careerAdvancementBonus: number; // bonus to job tier eligibility
}

export interface Major {
  id: string;
  name: string;
  degreeTypeIds: DegreeType[]; // which degree types this major is available for
  careerPaths: CareerPath[];
  averageStartingSalary: number;
  requiredCourses: string[];
  electiveCourses: string[];
  specializations: Specialization[];
  description: string;
  demandLevel: 'low' | 'medium' | 'high' | 'very_high';
  difficultyLevel: 'easy' | 'moderate' | 'challenging' | 'very_challenging';
}

export interface CareerPath {
  jobTitle: string;
  tier: 'entry' | 'mid' | 'senior' | 'executive';
  salaryRange: {
    min: number;
    max: number;
  };
  yearsExperienceRequired: number;
}

export interface Specialization {
  id: string;
  name: string;
  description: string;
  additionalCredits: number;
  salaryBonus: number; // percentage
  requiredCourses: string[];
}

export interface StudentEducation {
  id: string;
  playerId: string;
  schoolId: string;
  degreeId: string;
  majorId: string;
  specializationId?: string;
  enrollmentDate: number;
  expectedGraduationDate: number;
  actualGraduationDate?: number;
  currentSemester: number;
  totalSemesters: number;
  gpa: number;
  creditsEarned: number;
  creditsRequired: number;
  status: EnrollmentStatus;
  tuitionPaid: number;
  tuitionOwed: number;
  completedCourses: string[];
  currentCourses: string[];
  isFullTime: boolean;
  isOnCampus: boolean;
  scholarshipsApplied: string[];
  createdAt: number;
  updatedAt: number;
}

export interface FinancialAid {
  id: string;
  playerId: string;
  studentEducationId: string;
  aidType: FinancialAidType;
  name: string;
  amount: number;
  amountPerSemester: number;
  description: string;
  requirements: FinancialAidRequirement[];
  status: FinancialAidStatus;
  applicationDate: number;
  approvalDate?: number;
  disbursementDate?: number;
  expirationDate?: number;
  isRenewable: boolean;
  renewalRequirements?: string;
  minimumGPARequired?: number;
}

export interface FinancialAidRequirement {
  type: 'gpa' | 'income' | 'enrollment' | 'major' | 'credits' | 'essay' | 'community_service';
  description: string;
  value?: number;
  isMet: boolean;
}

export interface StudentLoan {
  id: string;
  playerId: string;
  studentEducationId?: string;
  loanType: LoanType;
  lenderName: string;
  principalAmount: number;
  currentBalance: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  minimumPayment: number;
  status: LoanStatus;
  originationDate: number;
  firstPaymentDate?: number;
  gracePeriodEndDate?: number;
  payoffDate?: number;
  totalInterestPaid: number;
  paymentsMade: number;
  paymentsRemaining: number;
  isSubsidized: boolean;
  defermentEndDate?: number;
  lastPaymentDate?: number;
  lastPaymentAmount?: number;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  creditHours: number;
  description: string;
  prerequisites: string[]; // course IDs
  difficulty: 'introductory' | 'intermediate' | 'advanced' | 'graduate';
  majorIds: string[];
  isRequired: boolean;
  semestersOffered: ('fall' | 'spring' | 'summer')[];
}

export interface CompletedCourse {
  courseId: string;
  grade: string;
  gradePoints: number;
  creditHours: number;
  semester: number;
  completedDate: number;
}

export interface EducationProgress {
  playerId: string;
  completedDegrees: CompletedDegree[];
  currentEnrollments: StudentEducation[];
  totalStudentDebt: number;
  totalScholarshipsReceived: number;
  lifetimeTuitionPaid: number;
  highestDegreeEarned?: DegreeType;
  totalCreditsEarned: number;
  careerReadinessScore: number; // 0-100
}

export interface CompletedDegree {
  degreeId: string;
  degreeName: string;
  degreeType: DegreeType;
  majorId: string;
  majorName: string;
  specializationId?: string;
  specializationName?: string;
  schoolId: string;
  schoolName: string;
  graduationDate: number;
  finalGPA: number;
  honors?: 'cum_laude' | 'magna_cum_laude' | 'summa_cum_laude';
  totalCost: number;
}

export interface EducationEvent {
  id: string;
  type: 'enrollment' | 'graduation' | 'dropout' | 'scholarship_awarded' | 'loan_disbursed' | 'semester_completed' | 'course_completed' | 'gpa_change' | 'academic_probation' | 'dean_list';
  playerId: string;
  timestamp: number;
  title: string;
  description: string;
  metadata?: {
    schoolId?: string;
    degreeId?: string;
    majorId?: string;
    courseId?: string;
    gpa?: number;
    amount?: number;
    previousValue?: number;
    newValue?: number;
  };
}

export interface EducationStats {
  totalStudentsEnrolled: number;
  averageStudentDebt: number;
  graduationRate: number;
  averageGPA: number;
  mostPopularMajor: string;
  mostPopularSchool: string;
  averageTimeToGraduation: number;
}

export interface EducationBudgetTracking {
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

export interface EducationExpenseBreakdown {
  tuitionPerSemester: number;
  booksAndSupplies: number;
  housingCost: number;
  livingExpenses: number;
  totalSemesterCost: number;
  monthlyEducationCost: number;
}

export interface EducationIncomeAdjustment {
  baseMonthlyIncome: number;
  adjustedMonthlyIncome: number;
  workStudyIncome: number;
  internshipIncome: number;
  incomeReductionPercent: number;
}

export interface EducationROIAnalysis {
  totalEducationCost: number;
  projectedSalaryIncrease: number;
  yearsToBreakeven: number;
  lifetimeEarningsBoost: number;
  roiPercentage: number;
}

export interface EducationFinancialSummary {
  isCurrentlyEnrolled: boolean;
  monthlyEducationCost: number;
  monthlyLoanPayment: number;
  totalMonthlyEducationExpense: number;
  financialAidCoverage: number;
  educationAsPercentOfIncome: number;
  debtToIncomeRatio: number;
  hasHighDebtRatio: boolean;
  recommendations: string[];
}

export interface StudentLoanSummary {
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
}

export interface MonthlyEducationReport {
  tuitionDeducted: number;
  loanPaymentsProcessed: number;
  financialAidApplied: number;
  netCost: number;
  creditScoreImpact: number;
  warnings: string[];
  highlights: string[];
}
