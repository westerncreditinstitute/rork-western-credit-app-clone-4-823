import {
  School,
  Degree,
  Major,
  StudentEducation,
  FinancialAid,
  StudentLoan,
  CompletedDegree,
  EducationProgress,
  EducationEvent,
  DegreeType,
  LoanType,
  FinancialAidStatus,
} from '@/types/education';
import {
  SCHOOLS,
  DEGREES,
  MAJORS,
  COURSES,
  AVAILABLE_FINANCIAL_AID,
  STUDENT_LOAN_OPTIONS,
  EDUCATION_CREDIT_IMPACTS,
  GPA_GRADES,
} from '@/mocks/educationData';

export interface EducationManagerState {
  currentEnrollment: StudentEducation | null;
  completedDegrees: CompletedDegree[];
  financialAid: FinancialAid[];
  studentLoans: StudentLoan[];
  educationEvents: EducationEvent[];
  totalStudentDebt: number;
  totalScholarshipsReceived: number;
  lifetimeTuitionPaid: number;
}

export interface ApplyToSchoolResult {
  success: boolean;
  enrollment?: StudentEducation;
  error?: string;
  tuitionDue?: number;
}

export interface AdvanceSemesterResult {
  success: boolean;
  newGPA: number;
  creditsEarned: number;
  tuitionDue: number;
  graduated: boolean;
  events: EducationEvent[];
  error?: string;
}

export interface GraduationResult {
  success: boolean;
  degree?: CompletedDegree;
  creditScoreImpact: number;
  careerOpportunitiesUnlocked: string[];
  error?: string;
}

export function getAvailableSchools(
  playerGPA: number = 0,
  creditScore: number = 300,
  completedDegrees: CompletedDegree[] = []
): School[] {
  console.log('[EducationManager] Getting available schools for GPA:', playerGPA, 'Credit Score:', creditScore);
  
  return SCHOOLS.filter(school => {
    if (playerGPA > 0 && playerGPA < school.minimumGPA) {
      console.log('[EducationManager] School', school.name, 'requires GPA', school.minimumGPA);
      return false;
    }
    
    if (school.minimumCreditScore && creditScore < school.minimumCreditScore) {
      console.log('[EducationManager] School', school.name, 'requires credit score', school.minimumCreditScore);
      return false;
    }
    
    return true;
  });
}

export function getSchoolDetails(schoolId: string): School | null {
  console.log('[EducationManager] Getting school details for:', schoolId);
  const school = SCHOOLS.find(s => s.id === schoolId);
  
  if (!school) {
    console.log('[EducationManager] School not found:', schoolId);
    return null;
  }
  
  return school;
}

export function applyToSchool(
  schoolId: string,
  degreeId: string,
  majorId: string,
  playerId: string,
  playerGPA: number = 0,
  creditScore: number = 300,
  bankBalance: number = 0,
  completedDegrees: CompletedDegree[] = [],
  isFullTime: boolean = true
): ApplyToSchoolResult {
  console.log('[EducationManager] Applying to school:', { schoolId, degreeId, majorId, playerId });
  
  const school = SCHOOLS.find(s => s.id === schoolId);
  if (!school) {
    return { success: false, error: 'School not found' };
  }
  
  const degree = DEGREES.find(d => d.id === degreeId);
  if (!degree) {
    return { success: false, error: 'Degree program not found' };
  }
  
  const major = MAJORS.find(m => m.id === majorId);
  if (!major) {
    return { success: false, error: 'Major not found' };
  }
  
  if (!school.availableDegrees.includes(degreeId)) {
    return { success: false, error: `${school.name} does not offer this degree program` };
  }
  
  if (!school.availableMajors.includes(majorId)) {
    return { success: false, error: `${school.name} does not offer this major` };
  }
  
  if (!major.degreeTypeIds.includes(degree.type)) {
    return { success: false, error: `${major.name} is not available for ${degree.name}` };
  }
  
  if (playerGPA > 0 && playerGPA < school.minimumGPA) {
    return { success: false, error: `Minimum GPA of ${school.minimumGPA} required for admission` };
  }
  
  if (school.minimumCreditScore && creditScore < school.minimumCreditScore) {
    return { success: false, error: `Minimum credit score of ${school.minimumCreditScore} required` };
  }
  
  if (degree.prerequisites.length > 0) {
    const hasPrereqs = degree.prerequisites.every(prereqId => 
      completedDegrees.some(cd => cd.degreeId === prereqId)
    );
    if (!hasPrereqs) {
      const prereqDegree = DEGREES.find(d => d.id === degree.prerequisites[0]);
      return { success: false, error: `Must complete ${prereqDegree?.name || 'prerequisite degree'} first` };
    }
  }
  
  const acceptanceRoll = Math.random() * 100;
  if (acceptanceRoll > school.acceptanceRate) {
    return { success: false, error: 'Application was not accepted. Try improving your GPA or applying to other schools.' };
  }
  
  const now = Date.now();
  const totalSemesters = Math.ceil(degree.durationYears * 2);
  const expectedGraduationDate = now + (degree.durationYears * 365 * 24 * 60 * 60 * 1000);
  
  const tuitionDue = calculateTuitionCost(schoolId, isFullTime ? 15 : 9);
  
  const enrollment: StudentEducation = {
    id: `enrollment_${now}_${Math.random().toString(36).substr(2, 9)}`,
    playerId,
    schoolId,
    degreeId,
    majorId,
    enrollmentDate: now,
    expectedGraduationDate,
    currentSemester: 1,
    totalSemesters,
    gpa: 0,
    creditsEarned: 0,
    creditsRequired: degree.creditHoursRequired,
    status: 'active',
    tuitionPaid: 0,
    tuitionOwed: tuitionDue,
    completedCourses: [],
    currentCourses: [],
    isFullTime,
    isOnCampus: !school.isOnline,
    scholarshipsApplied: [],
    createdAt: now,
    updatedAt: now,
  };
  
  console.log('[EducationManager] Enrollment created:', enrollment.id);
  
  return {
    success: true,
    enrollment,
    tuitionDue,
  };
}

export function getCurrentEnrollment(state: EducationManagerState): StudentEducation | null {
  console.log('[EducationManager] Getting current enrollment');
  return state.currentEnrollment;
}

export function advanceSemester(
  enrollment: StudentEducation,
  bankBalance: number
): AdvanceSemesterResult {
  console.log('[EducationManager] Advancing semester for enrollment:', enrollment.id);
  
  if (enrollment.status !== 'active') {
    return {
      success: false,
      newGPA: enrollment.gpa,
      creditsEarned: 0,
      tuitionDue: 0,
      graduated: false,
      events: [],
      error: 'Cannot advance semester - not actively enrolled',
    };
  }
  
  const school = SCHOOLS.find(s => s.id === enrollment.schoolId);
  const degree = DEGREES.find(d => d.id === enrollment.degreeId);
  
  if (!school || !degree) {
    return {
      success: false,
      newGPA: enrollment.gpa,
      creditsEarned: 0,
      tuitionDue: 0,
      graduated: false,
      events: [],
      error: 'School or degree not found',
    };
  }
  
  const creditsThisSemester = enrollment.isFullTime ? 15 : 9;
  const tuitionDue = calculateTuitionCost(enrollment.schoolId, creditsThisSemester);
  
  if (bankBalance < tuitionDue && enrollment.tuitionOwed <= 0) {
    return {
      success: false,
      newGPA: enrollment.gpa,
      creditsEarned: 0,
      tuitionDue,
      graduated: false,
      events: [],
      error: `Insufficient funds for tuition. Need $${tuitionDue.toLocaleString()}`,
    };
  }
  
  const semesterGPA = simulateSemesterGPA(enrollment.gpa, school.reputationScore);
  const totalCredits = enrollment.creditsEarned + creditsThisSemester;
  const newGPA = enrollment.creditsEarned > 0
    ? ((enrollment.gpa * enrollment.creditsEarned) + (semesterGPA * creditsThisSemester)) / totalCredits
    : semesterGPA;
  
  const events: EducationEvent[] = [];
  const now = Date.now();
  
  events.push({
    id: `event_${now}_semester`,
    type: 'semester_completed',
    playerId: enrollment.playerId,
    timestamp: now,
    title: 'Semester Completed',
    description: `Completed semester ${enrollment.currentSemester} with ${semesterGPA.toFixed(2)} GPA`,
    metadata: {
      schoolId: enrollment.schoolId,
      gpa: semesterGPA,
    },
  });
  
  if (newGPA >= 3.5) {
    events.push({
      id: `event_${now}_dean`,
      type: 'dean_list',
      playerId: enrollment.playerId,
      timestamp: now,
      title: "Dean's List",
      description: `Made the Dean's List with a ${newGPA.toFixed(2)} GPA!`,
      metadata: { gpa: newGPA },
    });
  }
  
  if (newGPA < 2.0 && enrollment.gpa >= 2.0) {
    events.push({
      id: `event_${now}_probation`,
      type: 'academic_probation',
      playerId: enrollment.playerId,
      timestamp: now,
      title: 'Academic Probation',
      description: 'GPA dropped below 2.0 - placed on academic probation',
      metadata: { gpa: newGPA, previousValue: enrollment.gpa },
    });
  }
  
  const graduated = totalCredits >= enrollment.creditsRequired;
  
  if (graduated) {
    events.push({
      id: `event_${now}_graduation`,
      type: 'graduation',
      playerId: enrollment.playerId,
      timestamp: now,
      title: 'Graduation!',
      description: `Graduated with ${degree.name} in ${MAJORS.find(m => m.id === enrollment.majorId)?.name}`,
      metadata: {
        degreeId: enrollment.degreeId,
        majorId: enrollment.majorId,
        gpa: newGPA,
      },
    });
  }
  
  console.log('[EducationManager] Semester advanced:', {
    newSemester: enrollment.currentSemester + 1,
    newGPA: newGPA.toFixed(2),
    totalCredits,
    graduated,
  });
  
  return {
    success: true,
    newGPA: Math.round(newGPA * 100) / 100,
    creditsEarned: creditsThisSemester,
    tuitionDue,
    graduated,
    events,
  };
}

export function dropOut(enrollment: StudentEducation): {
  success: boolean;
  creditScoreImpact: number;
  refund: number;
  error?: string;
} {
  console.log('[EducationManager] Processing dropout for enrollment:', enrollment.id);
  
  if (enrollment.status !== 'active') {
    return {
      success: false,
      creditScoreImpact: 0,
      refund: 0,
      error: 'Not currently enrolled',
    };
  }
  
  const refundPercentage = enrollment.currentSemester === 1 ? 0.5 : 0.25;
  const refund = Math.round(enrollment.tuitionPaid * refundPercentage);
  
  console.log('[EducationManager] Dropout processed - Credit impact:', EDUCATION_CREDIT_IMPACTS.dropout, 'Refund:', refund);
  
  return {
    success: true,
    creditScoreImpact: EDUCATION_CREDIT_IMPACTS.dropout,
    refund,
  };
}

export function graduate(
  enrollment: StudentEducation
): GraduationResult {
  console.log('[EducationManager] Processing graduation for enrollment:', enrollment.id);
  
  if (enrollment.creditsEarned < enrollment.creditsRequired) {
    return {
      success: false,
      creditScoreImpact: 0,
      careerOpportunitiesUnlocked: [],
      error: `Need ${enrollment.creditsRequired - enrollment.creditsEarned} more credits to graduate`,
    };
  }
  
  const school = SCHOOLS.find(s => s.id === enrollment.schoolId);
  const degree = DEGREES.find(d => d.id === enrollment.degreeId);
  const major = MAJORS.find(m => m.id === enrollment.majorId);
  
  if (!school || !degree || !major) {
    return {
      success: false,
      creditScoreImpact: 0,
      careerOpportunitiesUnlocked: [],
      error: 'Education data not found',
    };
  }
  
  let honors: CompletedDegree['honors'] = undefined;
  if (enrollment.gpa >= 3.9) honors = 'summa_cum_laude';
  else if (enrollment.gpa >= 3.7) honors = 'magna_cum_laude';
  else if (enrollment.gpa >= 3.5) honors = 'cum_laude';
  
  const completedDegree: CompletedDegree = {
    degreeId: enrollment.degreeId,
    degreeName: degree.name,
    degreeType: degree.type,
    majorId: enrollment.majorId,
    majorName: major.name,
    specializationId: enrollment.specializationId,
    schoolId: enrollment.schoolId,
    schoolName: school.name,
    graduationDate: Date.now(),
    finalGPA: enrollment.gpa,
    honors,
    totalCost: enrollment.tuitionPaid,
  };
  
  const creditScoreImpact = EDUCATION_CREDIT_IMPACTS.graduation[degree.type];
  
  const careerOpportunitiesUnlocked = major.careerPaths
    .filter(cp => {
      if (degree.type === 'certificate') return cp.tier === 'entry';
      if (degree.type === 'associate') return ['entry', 'mid'].includes(cp.tier);
      if (degree.type === 'bachelor') return ['entry', 'mid', 'senior'].includes(cp.tier);
      return true;
    })
    .map(cp => cp.jobTitle);
  
  console.log('[EducationManager] Graduation completed:', {
    degree: degree.name,
    major: major.name,
    gpa: enrollment.gpa,
    honors,
    creditScoreImpact,
    careers: careerOpportunitiesUnlocked.length,
  });
  
  return {
    success: true,
    degree: completedDegree,
    creditScoreImpact,
    careerOpportunitiesUnlocked,
  };
}

export function calculateTuitionCost(schoolId: string, credits: number): number {
  const school = SCHOOLS.find(s => s.id === schoolId);
  if (!school) {
    console.log('[EducationManager] School not found for tuition calculation:', schoolId);
    return 0;
  }
  
  const tuition = school.tuitionCostPerCredit * credits;
  const books = school.booksCostPerSemester;
  const housing = school.housingCostPerSemester || 0;
  
  const total = tuition + books + housing;
  
  console.log('[EducationManager] Tuition calculated:', {
    school: school.name,
    credits,
    tuition,
    books,
    housing,
    total,
  });
  
  return total;
}

export function getAvailableMajors(degreeId: string): Major[] {
  const degree = DEGREES.find(d => d.id === degreeId);
  if (!degree) {
    console.log('[EducationManager] Degree not found:', degreeId);
    return [];
  }
  
  const majors = MAJORS.filter(m => m.degreeTypeIds.includes(degree.type));
  console.log('[EducationManager] Found', majors.length, 'majors for degree:', degree.name);
  
  return majors;
}

export function getDegreeRequirements(degreeId: string): {
  degree: Degree | null;
  prerequisites: Degree[];
  requiredCredits: number;
  estimatedCost: { min: number; max: number };
  estimatedDuration: string;
} {
  const degree = DEGREES.find(d => d.id === degreeId);
  
  if (!degree) {
    console.log('[EducationManager] Degree not found:', degreeId);
    return {
      degree: null,
      prerequisites: [],
      requiredCredits: 0,
      estimatedCost: { min: 0, max: 0 },
      estimatedDuration: '',
    };
  }
  
  const prerequisites = degree.prerequisites
    .map(prereqId => DEGREES.find(d => d.id === prereqId))
    .filter((d): d is Degree => d !== undefined);
  
  const schoolsOffering = SCHOOLS.filter(s => s.availableDegrees.includes(degreeId));
  const costs = schoolsOffering.map(s => s.tuitionCostPerYear * degree.durationYears);
  
  const result = {
    degree,
    prerequisites,
    requiredCredits: degree.creditHoursRequired,
    estimatedCost: {
      min: Math.min(...costs, 0),
      max: Math.max(...costs, 0),
    },
    estimatedDuration: `${degree.durationYears} year${degree.durationYears !== 1 ? 's' : ''}`,
  };
  
  console.log('[EducationManager] Degree requirements:', result);
  
  return result;
}

export function applyForFinancialAid(
  aidIndex: number,
  playerId: string,
  studentEducationId: string,
  playerIncome: number,
  playerGPA: number
): FinancialAid | null {
  const aidTemplate = AVAILABLE_FINANCIAL_AID[aidIndex];
  if (!aidTemplate) {
    console.log('[EducationManager] Financial aid not found at index:', aidIndex);
    return null;
  }
  
  const now = Date.now();
  const requirements = aidTemplate.requirements.map(req => {
    let isMet = false;
    
    switch (req.type) {
      case 'income':
        isMet = playerIncome <= (req.value || 0);
        break;
      case 'gpa':
        isMet = playerGPA >= (req.value || 0);
        break;
      case 'enrollment':
        isMet = true;
        break;
      default:
        isMet = Math.random() > 0.3;
    }
    
    return { ...req, isMet };
  });
  
  const allRequirementsMet = requirements.every(r => r.isMet);
  const status: FinancialAidStatus = allRequirementsMet ? 'approved' : 'rejected';
  
  const financialAid: FinancialAid = {
    id: `aid_${now}_${Math.random().toString(36).substr(2, 9)}`,
    playerId,
    studentEducationId,
    aidType: aidTemplate.aidType,
    name: aidTemplate.name,
    amount: aidTemplate.amount,
    amountPerSemester: aidTemplate.amountPerSemester,
    description: aidTemplate.description,
    requirements,
    status,
    applicationDate: now,
    approvalDate: allRequirementsMet ? now : undefined,
    isRenewable: aidTemplate.isRenewable,
    renewalRequirements: aidTemplate.renewalRequirements,
    minimumGPARequired: aidTemplate.minimumGPARequired,
  };
  
  console.log('[EducationManager] Financial aid application:', {
    name: aidTemplate.name,
    status,
    amount: aidTemplate.amount,
  });
  
  return financialAid;
}

export function applyForStudentLoan(
  loanType: LoanType,
  amount: number,
  playerId: string,
  studentEducationId: string,
  creditScore: number
): StudentLoan | null {
  const loanOption = STUDENT_LOAN_OPTIONS[loanType];
  if (!loanOption) {
    console.log('[EducationManager] Loan type not found:', loanType);
    return null;
  }
  
  if (amount > loanOption.maxAmountPerYear) {
    console.log('[EducationManager] Loan amount exceeds maximum:', amount, '>', loanOption.maxAmountPerYear);
    return null;
  }
  
  if ('minimumCreditScore' in loanOption && creditScore < (loanOption.minimumCreditScore || 0)) {
    console.log('[EducationManager] Credit score too low for loan:', creditScore, '<', loanOption.minimumCreditScore);
    return null;
  }
  
  const now = Date.now();
  const termMonths = 120;
  const monthlyRate = loanOption.interestRate / 100 / 12;
  const monthlyPayment = (amount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                         (Math.pow(1 + monthlyRate, termMonths) - 1);
  
  const gracePeriodMonths = loanOption.gracePeriodMonths;
  const gracePeriodEndDate = now + (gracePeriodMonths * 30 * 24 * 60 * 60 * 1000);
  
  const loan: StudentLoan = {
    id: `loan_${now}_${Math.random().toString(36).substr(2, 9)}`,
    playerId,
    studentEducationId,
    loanType,
    lenderName: loanOption.name,
    principalAmount: amount,
    currentBalance: amount,
    interestRate: loanOption.interestRate,
    termMonths,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    minimumPayment: Math.round(monthlyPayment * 100) / 100,
    status: gracePeriodMonths > 0 ? 'in_grace' : 'active',
    originationDate: now,
    gracePeriodEndDate: gracePeriodMonths > 0 ? gracePeriodEndDate : undefined,
    totalInterestPaid: 0,
    paymentsMade: 0,
    paymentsRemaining: termMonths,
    isSubsidized: loanType === 'federal_subsidized',
  };
  
  console.log('[EducationManager] Student loan created:', {
    type: loanType,
    amount,
    monthlyPayment: loan.monthlyPayment,
    interestRate: loanOption.interestRate,
  });
  
  return loan;
}

export function makeStudentLoanPayment(
  loan: StudentLoan,
  paymentAmount: number,
  currentDate: number
): {
  success: boolean;
  newBalance: number;
  interestPaid: number;
  principalPaid: number;
  creditScoreImpact: number;
  isPayoffComplete: boolean;
  error?: string;
} {
  if (loan.status === 'paid_off') {
    return {
      success: false,
      newBalance: 0,
      interestPaid: 0,
      principalPaid: 0,
      creditScoreImpact: 0,
      isPayoffComplete: true,
      error: 'Loan is already paid off',
    };
  }
  
  const monthlyRate = loan.interestRate / 100 / 12;
  const interestDue = loan.currentBalance * monthlyRate;
  
  let interestPaid = 0;
  let principalPaid = 0;
  
  if (paymentAmount >= interestDue) {
    interestPaid = interestDue;
    principalPaid = paymentAmount - interestDue;
  } else {
    interestPaid = paymentAmount;
    principalPaid = 0;
  }
  
  const newBalance = Math.max(0, loan.currentBalance - principalPaid);
  const isOnTime = paymentAmount >= loan.minimumPayment;
  const creditScoreImpact = isOnTime 
    ? EDUCATION_CREDIT_IMPACTS.loanPaymentOnTime 
    : EDUCATION_CREDIT_IMPACTS.loanPaymentLate;
  
  console.log('[EducationManager] Loan payment processed:', {
    payment: paymentAmount,
    interestPaid,
    principalPaid,
    newBalance,
    creditScoreImpact,
  });
  
  return {
    success: true,
    newBalance: Math.round(newBalance * 100) / 100,
    interestPaid: Math.round(interestPaid * 100) / 100,
    principalPaid: Math.round(principalPaid * 100) / 100,
    creditScoreImpact,
    isPayoffComplete: newBalance === 0,
  };
}

export function getEducationProgress(state: EducationManagerState): EducationProgress {
  const highestDegree = state.completedDegrees.length > 0
    ? state.completedDegrees.reduce((highest, current) => {
        const degreeOrder: DegreeType[] = ['certificate', 'associate', 'bachelor', 'master', 'doctorate'];
        return degreeOrder.indexOf(current.degreeType) > degreeOrder.indexOf(highest.degreeType)
          ? current
          : highest;
      }).degreeType
    : undefined;
  
  const totalCredits = state.completedDegrees.reduce((sum, d) => {
    const degree = DEGREES.find(deg => deg.id === d.degreeId);
    return sum + (degree?.creditHoursRequired || 0);
  }, 0) + (state.currentEnrollment?.creditsEarned || 0);
  
  let careerReadinessScore = 0;
  if (state.completedDegrees.length > 0) {
    careerReadinessScore += 25;
    if (highestDegree === 'bachelor') careerReadinessScore += 25;
    if (highestDegree === 'master') careerReadinessScore += 40;
    if (highestDegree === 'doctorate') careerReadinessScore += 50;
    
    const avgGPA = state.completedDegrees.reduce((sum, d) => sum + d.finalGPA, 0) / state.completedDegrees.length;
    careerReadinessScore += Math.round(avgGPA * 5);
  }
  
  return {
    playerId: state.currentEnrollment?.playerId || '',
    completedDegrees: state.completedDegrees,
    currentEnrollments: state.currentEnrollment ? [state.currentEnrollment] : [],
    totalStudentDebt: state.totalStudentDebt,
    totalScholarshipsReceived: state.totalScholarshipsReceived,
    lifetimeTuitionPaid: state.lifetimeTuitionPaid,
    highestDegreeEarned: highestDegree,
    totalCreditsEarned: totalCredits,
    careerReadinessScore: Math.min(100, careerReadinessScore),
  };
}

export function calculateEducationCreditImpact(
  event: 'enrollment' | 'semester' | 'graduation' | 'dropout' | 'loan_payment',
  degreeType?: DegreeType,
  isOnTime?: boolean
): number {
  switch (event) {
    case 'enrollment':
      return EDUCATION_CREDIT_IMPACTS.enrollment;
    case 'semester':
      return EDUCATION_CREDIT_IMPACTS.semesterCompleted;
    case 'graduation':
      return degreeType ? EDUCATION_CREDIT_IMPACTS.graduation[degreeType] : 0;
    case 'dropout':
      return EDUCATION_CREDIT_IMPACTS.dropout;
    case 'loan_payment':
      return isOnTime 
        ? EDUCATION_CREDIT_IMPACTS.loanPaymentOnTime 
        : EDUCATION_CREDIT_IMPACTS.loanPaymentLate;
    default:
      return 0;
  }
}

function simulateSemesterGPA(previousGPA: number, schoolReputation: number): number {
  const baseGPA = previousGPA > 0 ? previousGPA : 2.8;
  const difficultyFactor = (schoolReputation - 5) * 0.05;
  const randomFactor = (Math.random() - 0.5) * 0.6;
  
  let newGPA = baseGPA - difficultyFactor + randomFactor;
  
  newGPA = Math.max(0, Math.min(4.0, newGPA));
  
  return Math.round(newGPA * 100) / 100;
}

export function getGradeFromPoints(points: number): string {
  const grade = GPA_GRADES.find(g => points >= g.points - 0.15);
  return grade?.letter || 'F';
}

export function getSchoolsForMajor(majorId: string): School[] {
  return SCHOOLS.filter(s => s.availableMajors.includes(majorId));
}

export function getDegreesForSchool(schoolId: string): Degree[] {
  const school = SCHOOLS.find(s => s.id === schoolId);
  if (!school) return [];
  
  return DEGREES.filter(d => school.availableDegrees.includes(d.id));
}

export function getMajorsForSchool(schoolId: string): Major[] {
  const school = SCHOOLS.find(s => s.id === schoolId);
  if (!school) return [];
  
  return MAJORS.filter(m => school.availableMajors.includes(m.id));
}

export function estimateSalaryWithEducation(
  baseSalary: number,
  completedDegrees: CompletedDegree[]
): number {
  let multiplier = 1;
  
  completedDegrees.forEach(degree => {
    const degreeInfo = DEGREES.find(d => d.id === degree.degreeId);
    if (degreeInfo) {
      multiplier += degreeInfo.averageSalaryIncrease / 100;
    }
    
    if (degree.honors === 'summa_cum_laude') multiplier += 0.05;
    else if (degree.honors === 'magna_cum_laude') multiplier += 0.03;
    else if (degree.honors === 'cum_laude') multiplier += 0.02;
  });
  
  return Math.round(baseSalary * multiplier);
}

export {
  SCHOOLS,
  DEGREES,
  MAJORS,
  COURSES,
  AVAILABLE_FINANCIAL_AID,
  STUDENT_LOAN_OPTIONS,
  EDUCATION_CREDIT_IMPACTS,
};
