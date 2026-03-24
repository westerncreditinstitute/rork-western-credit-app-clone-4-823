import {
  FinancialAid,
  FinancialAidType,
  FinancialAidStatus,
  FinancialAidRequirement,
  StudentEducation,
  CompletedDegree,
} from '@/types/education';
import {
  SCHOOLS,
  AVAILABLE_FINANCIAL_AID,
} from '@/mocks/educationData';

export interface FinancialAidApplication {
  id: string;
  playerId: string;
  aidTemplateIndex: number;
  studentEducationId: string;
  schoolId: string;
  applicationDate: number;
  status: FinancialAidStatus;
  reviewDate?: number;
  approvedAmount?: number;
  denialReason?: string;
}

export interface EligibilityResult {
  isEligible: boolean;
  meetsAllRequirements: boolean;
  requirements: FinancialAidRequirement[];
  eligibilityScore: number;
  reasons: string[];
}

export interface WorkStudyJob {
  id: string;
  title: string;
  department: string;
  hoursPerWeek: number;
  hourlyRate: number;
  description: string;
  requirements: string[];
}

export interface FinancialAidManagerState {
  applications: FinancialAidApplication[];
  approvedAid: FinancialAid[];
  workStudyJobs: WorkStudyJob[];
  totalAidReceived: number;
  totalAidPending: number;
}

const WORK_STUDY_JOBS: WorkStudyJob[] = [
  {
    id: 'ws_library',
    title: 'Library Assistant',
    department: 'Library Services',
    hoursPerWeek: 15,
    hourlyRate: 12.50,
    description: 'Assist students with finding resources, shelving books, and maintaining quiet study areas.',
    requirements: ['Good organizational skills', 'Customer service experience helpful'],
  },
  {
    id: 'ws_tutoring',
    title: 'Peer Tutor',
    department: 'Academic Support Center',
    hoursPerWeek: 10,
    hourlyRate: 14.00,
    description: 'Help fellow students with coursework in your area of expertise.',
    requirements: ['3.5+ GPA in subject area', 'Completed relevant coursework'],
  },
  {
    id: 'ws_lab',
    title: 'Computer Lab Monitor',
    department: 'IT Services',
    hoursPerWeek: 12,
    hourlyRate: 13.00,
    description: 'Monitor computer labs, assist users with basic technical issues, and maintain equipment.',
    requirements: ['Basic computer skills', 'Patience with users'],
  },
  {
    id: 'ws_office',
    title: 'Office Assistant',
    department: 'Administrative Services',
    hoursPerWeek: 15,
    hourlyRate: 12.00,
    description: 'Answer phones, file documents, greet visitors, and assist with administrative tasks.',
    requirements: ['Professional demeanor', 'Basic office skills'],
  },
  {
    id: 'ws_research',
    title: 'Research Assistant',
    department: 'Various Departments',
    hoursPerWeek: 10,
    hourlyRate: 15.00,
    description: 'Assist professors with research projects, data collection, and analysis.',
    requirements: ['3.7+ GPA', 'Research methodology knowledge', 'Junior or Senior standing'],
  },
  {
    id: 'ws_recreation',
    title: 'Recreation Center Staff',
    department: 'Campus Recreation',
    hoursPerWeek: 12,
    hourlyRate: 11.50,
    description: 'Manage facility access, equipment checkout, and assist with intramural programs.',
    requirements: ['CPR/First Aid certification preferred', 'Active lifestyle'],
  },
];

const NEED_BASED_INCOME_THRESHOLDS = {
  full_aid: 30000,
  high_aid: 45000,
  moderate_aid: 60000,
  low_aid: 75000,
};

const MERIT_GPA_THRESHOLDS = {
  exceptional: 3.9,
  excellent: 3.7,
  good: 3.5,
  satisfactory: 3.0,
};

export function getAvailableAid(schoolId: string): typeof AVAILABLE_FINANCIAL_AID {
  console.log('[FinancialAidManager] Getting available aid for school:', schoolId);
  
  const school = SCHOOLS.find(s => s.id === schoolId);
  if (!school) {
    console.log('[FinancialAidManager] School not found:', schoolId);
    return [];
  }
  
  if (!school.financialAidAvailable) {
    console.log('[FinancialAidManager] School does not offer financial aid:', school.name);
    return [];
  }
  
  console.log('[FinancialAidManager] Found', AVAILABLE_FINANCIAL_AID.length, 'aid options for', school.name);
  return AVAILABLE_FINANCIAL_AID;
}

export function getAvailableAidByType(
  schoolId: string,
  aidType: FinancialAidType
): typeof AVAILABLE_FINANCIAL_AID {
  const allAid = getAvailableAid(schoolId);
  return allAid.filter(aid => aid.aidType === aidType);
}

export function getNeedBasedGrants(schoolId: string): typeof AVAILABLE_FINANCIAL_AID {
  console.log('[FinancialAidManager] Getting need-based grants for school:', schoolId);
  const allAid = getAvailableAid(schoolId);
  return allAid.filter(aid => 
    aid.aidType === 'grant' && 
    aid.requirements.some(req => req.type === 'income')
  );
}

export function getMeritBasedScholarships(schoolId: string): typeof AVAILABLE_FINANCIAL_AID {
  console.log('[FinancialAidManager] Getting merit-based scholarships for school:', schoolId);
  const allAid = getAvailableAid(schoolId);
  return allAid.filter(aid => 
    aid.aidType === 'scholarship' && 
    aid.requirements.some(req => req.type === 'gpa')
  );
}

export function getWorkStudyPrograms(schoolId: string): typeof AVAILABLE_FINANCIAL_AID {
  console.log('[FinancialAidManager] Getting work-study programs for school:', schoolId);
  const allAid = getAvailableAid(schoolId);
  return allAid.filter(aid => aid.aidType === 'work_study');
}

export function getAvailableWorkStudyJobs(
  playerGPA: number,
  creditsEarned: number
): WorkStudyJob[] {
  console.log('[FinancialAidManager] Getting work-study jobs for GPA:', playerGPA, 'Credits:', creditsEarned);
  
  return WORK_STUDY_JOBS.filter(job => {
    if (job.id === 'ws_tutoring' && playerGPA < 3.5) return false;
    if (job.id === 'ws_research' && (playerGPA < 3.7 || creditsEarned < 60)) return false;
    return true;
  });
}

export function checkEligibility(
  aidIndex: number,
  playerIncome: number,
  playerSavings: number,
  playerGPA: number,
  currentEnrollment: StudentEducation | null,
  completedDegrees: CompletedDegree[] = [],
  communityServiceHours: number = 0,
  achievements: string[] = []
): EligibilityResult {
  console.log('[FinancialAidManager] Checking eligibility for aid index:', aidIndex);
  
  const aidTemplate = AVAILABLE_FINANCIAL_AID[aidIndex];
  if (!aidTemplate) {
    console.log('[FinancialAidManager] Aid not found at index:', aidIndex);
    return {
      isEligible: false,
      meetsAllRequirements: false,
      requirements: [],
      eligibilityScore: 0,
      reasons: ['Financial aid program not found'],
    };
  }
  
  const reasons: string[] = [];
  let eligibilityScore = 0;
  const maxScore = aidTemplate.requirements.length * 100;
  
  const evaluatedRequirements = aidTemplate.requirements.map(req => {
    let isMet = false;
    
    switch (req.type) {
      case 'income':
        const incomeThreshold = req.value || NEED_BASED_INCOME_THRESHOLDS.low_aid;
        isMet = playerIncome <= incomeThreshold;
        if (isMet) {
          eligibilityScore += 100;
          if (playerIncome <= NEED_BASED_INCOME_THRESHOLDS.full_aid) {
            eligibilityScore += 50;
            reasons.push('Qualifies for maximum need-based aid');
          }
        } else {
          reasons.push(`Income ($${playerIncome.toLocaleString()}) exceeds threshold ($${incomeThreshold.toLocaleString()})`);
        }
        break;
        
      case 'gpa':
        const gpaThreshold = req.value || MERIT_GPA_THRESHOLDS.satisfactory;
        isMet = playerGPA >= gpaThreshold;
        if (isMet) {
          eligibilityScore += 100;
          if (playerGPA >= MERIT_GPA_THRESHOLDS.exceptional) {
            eligibilityScore += 50;
            reasons.push('Exceptional academic performance recognized');
          } else if (playerGPA >= MERIT_GPA_THRESHOLDS.excellent) {
            eligibilityScore += 25;
            reasons.push('Excellent academic standing');
          }
        } else {
          reasons.push(`GPA (${playerGPA.toFixed(2)}) below required ${gpaThreshold.toFixed(2)}`);
        }
        break;
        
      case 'enrollment':
        isMet = currentEnrollment !== null && currentEnrollment.status === 'active';
        if (isMet) {
          eligibilityScore += 100;
          if (currentEnrollment?.isFullTime) {
            eligibilityScore += 25;
            reasons.push('Full-time enrollment verified');
          }
        } else {
          reasons.push('Must be actively enrolled');
        }
        break;
        
      case 'major':
        if (currentEnrollment) {
          const stemMajors = ['major_computer_science', 'major_engineering', 'major_healthcare', 'major_medicine'];
          isMet = stemMajors.includes(currentEnrollment.majorId);
          if (isMet) {
            eligibilityScore += 100;
            reasons.push('STEM major requirement met');
          } else {
            reasons.push('Must be enrolled in a STEM major');
          }
        } else {
          reasons.push('Must be enrolled to verify major');
        }
        break;
        
      case 'credits':
        const creditsRequired = req.value || 30;
        const currentCredits = currentEnrollment?.creditsEarned || 0;
        isMet = currentCredits >= creditsRequired;
        if (isMet) {
          eligibilityScore += 100;
        } else {
          reasons.push(`Need ${creditsRequired - currentCredits} more credits to qualify`);
        }
        break;
        
      case 'community_service':
        const hoursRequired = 100;
        isMet = communityServiceHours >= hoursRequired;
        if (isMet) {
          eligibilityScore += 100;
          reasons.push('Community service requirement met');
        } else {
          reasons.push(`Need ${hoursRequired - communityServiceHours} more community service hours`);
        }
        break;
        
      case 'essay':
        isMet = Math.random() > 0.2;
        if (isMet) {
          eligibilityScore += 100;
          reasons.push('Essay submission accepted');
        } else {
          reasons.push('Essay evaluation pending');
        }
        break;
        
      default:
        isMet = Math.random() > 0.3;
        if (isMet) eligibilityScore += 100;
    }
    
    return { ...req, isMet };
  });
  
  const meetsAllRequirements = evaluatedRequirements.every(r => r.isMet);
  const normalizedScore = maxScore > 0 ? (eligibilityScore / maxScore) * 100 : 0;
  
  const isEligible = meetsAllRequirements || normalizedScore >= 60;
  
  console.log('[FinancialAidManager] Eligibility result:', {
    aid: aidTemplate.name,
    isEligible,
    meetsAllRequirements,
    eligibilityScore: normalizedScore.toFixed(1) + '%',
  });
  
  return {
    isEligible,
    meetsAllRequirements,
    requirements: evaluatedRequirements,
    eligibilityScore: normalizedScore,
    reasons,
  };
}

export function applyForFinancialAid(
  aidIndex: number,
  playerId: string,
  studentEducationId: string,
  schoolId: string,
  playerIncome: number,
  playerSavings: number,
  playerGPA: number,
  currentEnrollment: StudentEducation | null
): {
  success: boolean;
  application?: FinancialAidApplication;
  aid?: FinancialAid;
  error?: string;
} {
  console.log('[FinancialAidManager] Applying for financial aid:', { aidIndex, playerId, studentEducationId });
  
  const aidTemplate = AVAILABLE_FINANCIAL_AID[aidIndex];
  if (!aidTemplate) {
    return { success: false, error: 'Financial aid program not found' };
  }
  
  const school = SCHOOLS.find(s => s.id === schoolId);
  if (!school || !school.financialAidAvailable) {
    return { success: false, error: 'School does not offer financial aid' };
  }
  
  const eligibility = checkEligibility(
    aidIndex,
    playerIncome,
    playerSavings,
    playerGPA,
    currentEnrollment
  );
  
  const now = Date.now();
  
  const application: FinancialAidApplication = {
    id: `aid_app_${now}_${Math.random().toString(36).substr(2, 9)}`,
    playerId,
    aidTemplateIndex: aidIndex,
    studentEducationId,
    schoolId,
    applicationDate: now,
    status: 'pending',
  };
  
  if (eligibility.isEligible && eligibility.meetsAllRequirements) {
    application.status = 'approved';
    application.reviewDate = now;
    application.approvedAmount = aidTemplate.amount;
    
    const approvedAid: FinancialAid = {
      id: `aid_${now}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      studentEducationId,
      aidType: aidTemplate.aidType,
      name: aidTemplate.name,
      amount: aidTemplate.amount,
      amountPerSemester: aidTemplate.amountPerSemester,
      description: aidTemplate.description,
      requirements: eligibility.requirements,
      status: 'approved',
      applicationDate: now,
      approvalDate: now,
      isRenewable: aidTemplate.isRenewable,
      renewalRequirements: aidTemplate.renewalRequirements,
      minimumGPARequired: aidTemplate.minimumGPARequired,
    };
    
    console.log('[FinancialAidManager] Aid application approved:', approvedAid.name, approvedAid.amount);
    
    return {
      success: true,
      application,
      aid: approvedAid,
    };
  } else if (eligibility.isEligible) {
    console.log('[FinancialAidManager] Aid application submitted for review:', aidTemplate.name);
    return {
      success: true,
      application,
    };
  } else {
    application.status = 'rejected';
    application.reviewDate = now;
    application.denialReason = eligibility.reasons.filter(r => !r.includes('met')).join('; ');
    
    console.log('[FinancialAidManager] Aid application rejected:', application.denialReason);
    
    return {
      success: false,
      application,
      error: application.denialReason || 'Does not meet eligibility requirements',
    };
  }
}

export function approveAidApplication(
  application: FinancialAidApplication,
  playerId: string,
  studentEducationId: string,
  approvedAmount?: number
): {
  success: boolean;
  aid?: FinancialAid;
  error?: string;
} {
  console.log('[FinancialAidManager] Admin approving aid application:', application.id);
  
  if (application.status !== 'pending') {
    return { success: false, error: 'Application is not pending review' };
  }
  
  const aidTemplate = AVAILABLE_FINANCIAL_AID[application.aidTemplateIndex];
  if (!aidTemplate) {
    return { success: false, error: 'Aid template not found' };
  }
  
  const now = Date.now();
  const finalAmount = approvedAmount || aidTemplate.amount;
  
  const approvedAid: FinancialAid = {
    id: `aid_${now}_${Math.random().toString(36).substr(2, 9)}`,
    playerId,
    studentEducationId,
    aidType: aidTemplate.aidType,
    name: aidTemplate.name,
    amount: finalAmount,
    amountPerSemester: (finalAmount / aidTemplate.amount) * aidTemplate.amountPerSemester,
    description: aidTemplate.description,
    requirements: aidTemplate.requirements.map(r => ({ ...r, isMet: true })),
    status: 'approved',
    applicationDate: application.applicationDate,
    approvalDate: now,
    isRenewable: aidTemplate.isRenewable,
    renewalRequirements: aidTemplate.renewalRequirements,
    minimumGPARequired: aidTemplate.minimumGPARequired,
  };
  
  console.log('[FinancialAidManager] Aid approved by admin:', approvedAid.name, finalAmount);
  
  return {
    success: true,
    aid: approvedAid,
  };
}

export function rejectAidApplication(
  application: FinancialAidApplication,
  reason: string
): FinancialAidApplication {
  console.log('[FinancialAidManager] Admin rejecting aid application:', application.id, reason);
  
  return {
    ...application,
    status: 'rejected',
    reviewDate: Date.now(),
    denialReason: reason,
  };
}

export function getActiveAid(
  approvedAidList: FinancialAid[],
  playerId: string
): FinancialAid[] {
  console.log('[FinancialAidManager] Getting active aid for player:', playerId);
  
  const activeAid = approvedAidList.filter(aid => 
    aid.playerId === playerId && 
    (aid.status === 'approved' || aid.status === 'disbursed')
  );
  
  console.log('[FinancialAidManager] Found', activeAid.length, 'active aid packages');
  return activeAid;
}

export function getAidByType(
  approvedAidList: FinancialAid[],
  playerId: string,
  aidType: FinancialAidType
): FinancialAid[] {
  const activeAid = getActiveAid(approvedAidList, playerId);
  return activeAid.filter(aid => aid.aidType === aidType);
}

export function calculateTotalAidAmount(
  approvedAidList: FinancialAid[],
  playerId: string
): {
  totalAnnual: number;
  totalPerSemester: number;
  byType: Record<FinancialAidType, number>;
} {
  console.log('[FinancialAidManager] Calculating total aid for player:', playerId);
  
  const activeAid = getActiveAid(approvedAidList, playerId);
  
  const byType: Record<FinancialAidType, number> = {
    grant: 0,
    scholarship: 0,
    work_study: 0,
    fellowship: 0,
  };
  
  let totalAnnual = 0;
  let totalPerSemester = 0;
  
  activeAid.forEach(aid => {
    totalAnnual += aid.amount;
    totalPerSemester += aid.amountPerSemester;
    byType[aid.aidType] += aid.amount;
  });
  
  console.log('[FinancialAidManager] Total aid calculated:', {
    totalAnnual,
    totalPerSemester,
    byType,
  });
  
  return {
    totalAnnual,
    totalPerSemester,
    byType,
  };
}

export function calculateNetTuitionCost(
  tuitionCost: number,
  approvedAidList: FinancialAid[],
  playerId: string,
  isSemester: boolean = true
): {
  grossCost: number;
  totalAid: number;
  netCost: number;
  aidCoverage: number;
} {
  const aidTotals = calculateTotalAidAmount(approvedAidList, playerId);
  const aidAmount = isSemester ? aidTotals.totalPerSemester : aidTotals.totalAnnual;
  
  const netCost = Math.max(0, tuitionCost - aidAmount);
  const aidCoverage = tuitionCost > 0 ? (Math.min(aidAmount, tuitionCost) / tuitionCost) * 100 : 0;
  
  console.log('[FinancialAidManager] Net tuition calculated:', {
    grossCost: tuitionCost,
    totalAid: aidAmount,
    netCost,
    aidCoverage: aidCoverage.toFixed(1) + '%',
  });
  
  return {
    grossCost: tuitionCost,
    totalAid: aidAmount,
    netCost,
    aidCoverage,
  };
}

export function checkAidRenewal(
  aid: FinancialAid,
  currentGPA: number,
  isEnrolled: boolean
): {
  canRenew: boolean;
  reasons: string[];
} {
  console.log('[FinancialAidManager] Checking aid renewal for:', aid.name);
  
  const reasons: string[] = [];
  
  if (!aid.isRenewable) {
    return { canRenew: false, reasons: ['This aid is not renewable'] };
  }
  
  if (!isEnrolled) {
    reasons.push('Must be actively enrolled');
  }
  
  if (aid.minimumGPARequired && currentGPA < aid.minimumGPARequired) {
    reasons.push(`GPA (${currentGPA.toFixed(2)}) below minimum ${aid.minimumGPARequired.toFixed(2)}`);
  }
  
  const canRenew = reasons.length === 0;
  
  if (canRenew) {
    reasons.push('Meets all renewal requirements');
  }
  
  console.log('[FinancialAidManager] Renewal check result:', { canRenew, reasons });
  
  return { canRenew, reasons };
}

export function disburseAid(
  aid: FinancialAid
): FinancialAid {
  console.log('[FinancialAidManager] Disbursing aid:', aid.name, aid.amountPerSemester);
  
  return {
    ...aid,
    status: 'disbursed',
    disbursementDate: Date.now(),
  };
}

export function estimateAidPackage(
  schoolId: string,
  playerIncome: number,
  playerGPA: number,
  isFullTime: boolean
): {
  estimatedGrants: number;
  estimatedScholarships: number;
  estimatedWorkStudy: number;
  totalEstimated: number;
  recommendations: string[];
} {
  console.log('[FinancialAidManager] Estimating aid package for school:', schoolId);
  
  const recommendations: string[] = [];
  let estimatedGrants = 0;
  let estimatedScholarships = 0;
  let estimatedWorkStudy = 0;
  
  if (playerIncome <= NEED_BASED_INCOME_THRESHOLDS.full_aid) {
    estimatedGrants = 7395;
    recommendations.push('Likely eligible for maximum Pell Grant');
  } else if (playerIncome <= NEED_BASED_INCOME_THRESHOLDS.high_aid) {
    estimatedGrants = 5500;
    recommendations.push('May qualify for partial Pell Grant');
  } else if (playerIncome <= NEED_BASED_INCOME_THRESHOLDS.moderate_aid) {
    estimatedGrants = 3000;
    recommendations.push('Consider applying for need-based grants');
  }
  
  if (playerGPA >= MERIT_GPA_THRESHOLDS.exceptional) {
    estimatedScholarships = 15000;
    recommendations.push('Exceptional GPA - apply for top merit scholarships');
  } else if (playerGPA >= MERIT_GPA_THRESHOLDS.excellent) {
    estimatedScholarships = 8000;
    recommendations.push('Strong GPA - eligible for multiple scholarships');
  } else if (playerGPA >= MERIT_GPA_THRESHOLDS.good) {
    estimatedScholarships = 5000;
    recommendations.push('Good GPA - apply for merit scholarships');
  } else if (playerGPA >= MERIT_GPA_THRESHOLDS.satisfactory) {
    estimatedScholarships = 2000;
    recommendations.push('Consider improving GPA for more scholarship options');
  }
  
  if (playerIncome <= NEED_BASED_INCOME_THRESHOLDS.low_aid) {
    estimatedWorkStudy = isFullTime ? 4500 : 2250;
    recommendations.push('May qualify for Federal Work-Study');
  }
  
  const totalEstimated = estimatedGrants + estimatedScholarships + estimatedWorkStudy;
  
  console.log('[FinancialAidManager] Aid package estimate:', {
    grants: estimatedGrants,
    scholarships: estimatedScholarships,
    workStudy: estimatedWorkStudy,
    total: totalEstimated,
  });
  
  return {
    estimatedGrants,
    estimatedScholarships,
    estimatedWorkStudy,
    totalEstimated,
    recommendations,
  };
}

export function calculateWorkStudyEarnings(
  job: WorkStudyJob,
  weeksWorked: number = 16
): number {
  return job.hoursPerWeek * job.hourlyRate * weeksWorked;
}

export function getAidSummary(
  approvedAidList: FinancialAid[],
  playerId: string
): {
  grants: FinancialAid[];
  scholarships: FinancialAid[];
  workStudy: FinancialAid[];
  fellowships: FinancialAid[];
  renewableAid: FinancialAid[];
  totalByCategory: Record<string, number>;
} {
  const activeAid = getActiveAid(approvedAidList, playerId);
  
  return {
    grants: activeAid.filter(a => a.aidType === 'grant'),
    scholarships: activeAid.filter(a => a.aidType === 'scholarship'),
    workStudy: activeAid.filter(a => a.aidType === 'work_study'),
    fellowships: activeAid.filter(a => a.aidType === 'fellowship'),
    renewableAid: activeAid.filter(a => a.isRenewable),
    totalByCategory: {
      grants: activeAid.filter(a => a.aidType === 'grant').reduce((sum, a) => sum + a.amount, 0),
      scholarships: activeAid.filter(a => a.aidType === 'scholarship').reduce((sum, a) => sum + a.amount, 0),
      workStudy: activeAid.filter(a => a.aidType === 'work_study').reduce((sum, a) => sum + a.amount, 0),
      fellowships: activeAid.filter(a => a.aidType === 'fellowship').reduce((sum, a) => sum + a.amount, 0),
    },
  };
}

export {
  WORK_STUDY_JOBS,
  NEED_BASED_INCOME_THRESHOLDS,
  MERIT_GPA_THRESHOLDS,
};
