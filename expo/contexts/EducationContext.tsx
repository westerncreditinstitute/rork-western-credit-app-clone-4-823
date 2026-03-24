import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import {
  StudentEducation,
  EducationProgress,
  EducationEvent,
  DegreeType,
  LoanType,
} from '@/types/education';
import {
  EducationManagerState,
  getAvailableSchools,
  getSchoolDetails,
  applyToSchool,
  advanceSemester,
  dropOut,
  graduate,
  calculateTuitionCost,
  getAvailableMajors,
  getDegreeRequirements,
  applyForFinancialAid,
  applyForStudentLoan,
  makeStudentLoanPayment,
  getEducationProgress,
  calculateEducationCreditImpact,
  getSchoolsForMajor,
  getDegreesForSchool,
  getMajorsForSchool,
  estimateSalaryWithEducation,
  SCHOOLS,
  DEGREES,
  MAJORS,
  AVAILABLE_FINANCIAL_AID,
} from '@/utils/educationManager';
import {
  calculateEducationExpenses,
  calculateEducationIncome,
  calculateEducationBudget,
  calculateDetailedEducationROI,
  processMonthlyEducationExpenses,
  getEducationDebtSummary,
  getEducationFinancialSummary,
  calculateDegreeWorth,
} from '@/utils/educationEconomyManager';

const EDUCATION_STORAGE_KEY = 'credit_life_simulator_education_';

export interface EducationEconomyState {
  hasWorkStudy: boolean;
  hasInternship: boolean;
  isInGracePeriod: boolean;
  gracePeriodStartDate: number | null;
  lastMonthlyProcessDate: number | null;
  totalBooksAndSuppliesPaid: number;
  totalLivingExpensesPaid: number;
}

interface ExtendedEducationState extends EducationManagerState {
  economyState: EducationEconomyState;
}

const createInitialEducationState = (): ExtendedEducationState => ({
  currentEnrollment: null,
  completedDegrees: [],
  financialAid: [],
  studentLoans: [],
  educationEvents: [],
  totalStudentDebt: 0,
  totalScholarshipsReceived: 0,
  lifetimeTuitionPaid: 0,
  economyState: {
    hasWorkStudy: false,
    hasInternship: false,
    isInGracePeriod: false,
    gracePeriodStartDate: null,
    lastMonthlyProcessDate: null,
    totalBooksAndSuppliesPaid: 0,
    totalLivingExpensesPaid: 0,
  },
});

export const [EducationProvider, useEducation] = createContextHook(() => {
  const auth = useAuth();
  const game = useGame();
  const userId = auth?.user?.id;
  
  const [educationState, setEducationState] = useState<ExtendedEducationState>(createInitialEducationState());
  const [isLoading, setIsLoading] = useState(true);

  const getStorageKey = useCallback(() => {
    return `${EDUCATION_STORAGE_KEY}${userId || 'anonymous'}`;
  }, [userId]);

  useEffect(() => {
    const loadEducationState = async () => {
      console.log('[EducationContext] Loading education state');
      setIsLoading(true);
      
      try {
        const storageKey = getStorageKey();
        const saved = await AsyncStorage.getItem(storageKey);
        
        if (saved) {
          const parsed = JSON.parse(saved);
          setEducationState({
            ...createInitialEducationState(),
            ...parsed,
          });
          console.log('[EducationContext] Education state loaded from storage');
        }
      } catch (error) {
        console.log('[EducationContext] Error loading education state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEducationState();
  }, [getStorageKey]);

  useEffect(() => {
    if (!isLoading) {
      const saveEducationState = async () => {
        try {
          const storageKey = getStorageKey();
          await AsyncStorage.setItem(storageKey, JSON.stringify(educationState));
          console.log('[EducationContext] Education state saved');
        } catch (error) {
          console.log('[EducationContext] Error saving education state:', error);
        }
      };

      saveEducationState();
    }
  }, [educationState, isLoading, getStorageKey]);

  const addEducationEvent = useCallback((event: EducationEvent) => {
    setEducationState(prev => ({
      ...prev,
      educationEvents: [event, ...prev.educationEvents].slice(0, 50),
    }));
  }, []);

  const handleGetAvailableSchools = useCallback(() => {
    const playerGPA = educationState.currentEnrollment?.gpa || 0;
    const creditScore = game?.gameState?.creditScores?.composite || 300;
    return getAvailableSchools(playerGPA, creditScore, educationState.completedDegrees);
  }, [educationState.currentEnrollment?.gpa, educationState.completedDegrees, game?.gameState?.creditScores?.composite]);

  const handleGetSchoolDetails = useCallback((schoolId: string) => {
    return getSchoolDetails(schoolId);
  }, []);

  const handleApplyToSchool = useCallback((
    schoolId: string,
    degreeId: string,
    majorId: string,
    isFullTime: boolean = true
  ) => {
    const playerId = game?.gameState?.playerId || 'player_unknown';
    const playerGPA = educationState.currentEnrollment?.gpa || 0;
    const creditScore = game?.gameState?.creditScores?.composite || 300;
    const bankBalance = game?.gameState?.bankBalance || 0;

    if (educationState.currentEnrollment) {
      return { success: false, error: 'Already enrolled in a program. Must drop out or graduate first.' };
    }

    const result = applyToSchool(
      schoolId,
      degreeId,
      majorId,
      playerId,
      playerGPA,
      creditScore,
      bankBalance,
      educationState.completedDegrees,
      isFullTime
    );

    if (result.success && result.enrollment) {
      const creditImpact = calculateEducationCreditImpact('enrollment');
      
      setEducationState(prev => ({
        ...prev,
        currentEnrollment: result.enrollment!,
      }));

      const school = SCHOOLS.find(s => s.id === schoolId);
      const degree = DEGREES.find(d => d.id === degreeId);
      const major = MAJORS.find(m => m.id === majorId);

      const event: EducationEvent = {
        id: `event_${Date.now()}_enrollment`,
        type: 'enrollment',
        playerId,
        timestamp: Date.now(),
        title: 'Enrolled in School',
        description: `Started ${degree?.name} in ${major?.name} at ${school?.name}`,
        metadata: { schoolId, degreeId, majorId },
      };
      addEducationEvent(event);

      console.log('[EducationContext] Enrollment successful, credit impact:', creditImpact);
      
      return { ...result, creditImpact };
    }

    return result;
  }, [educationState.currentEnrollment, educationState.completedDegrees, game?.gameState, addEducationEvent]);

  const handleGetCurrentEnrollment = useCallback(() => {
    return educationState.currentEnrollment;
  }, [educationState.currentEnrollment]);

  const handleAdvanceSemester = useCallback(() => {
    if (!educationState.currentEnrollment) {
      return { success: false, error: 'Not currently enrolled', newGPA: 0, creditsEarned: 0, tuitionDue: 0, graduated: false, events: [] };
    }

    const bankBalance = game?.gameState?.bankBalance || 0;
    const result = advanceSemester(educationState.currentEnrollment, bankBalance);

    if (result.success) {
      const creditImpact = calculateEducationCreditImpact('semester');

      if (result.tuitionDue > 0 && game?.updateBalance) {
        game.updateBalance(-result.tuitionDue, 'bank');
      }

      setEducationState(prev => {
        if (!prev.currentEnrollment) return prev;

        const updatedEnrollment: StudentEducation = {
          ...prev.currentEnrollment,
          gpa: result.newGPA,
          creditsEarned: prev.currentEnrollment.creditsEarned + result.creditsEarned,
          currentSemester: prev.currentEnrollment.currentSemester + 1,
          tuitionPaid: prev.currentEnrollment.tuitionPaid + result.tuitionDue,
          tuitionOwed: 0,
          updatedAt: Date.now(),
          status: result.graduated ? 'graduated' : 'active',
        };

        return {
          ...prev,
          currentEnrollment: result.graduated ? null : updatedEnrollment,
          lifetimeTuitionPaid: prev.lifetimeTuitionPaid + result.tuitionDue,
          educationEvents: [...result.events, ...prev.educationEvents].slice(0, 50),
        };
      });

      if (result.graduated) {
        handleGraduate();
      }

      console.log('[EducationContext] Semester advanced, credit impact:', creditImpact);
      
      return { ...result, creditImpact };
    }

    return result;
  }, [educationState.currentEnrollment, game]);

  const handleDropOut = useCallback(() => {
    if (!educationState.currentEnrollment) {
      return { success: false, creditScoreImpact: 0, refund: 0, error: 'Not currently enrolled' };
    }

    const result = dropOut(educationState.currentEnrollment);

    if (result.success) {
      const enrollment = educationState.currentEnrollment;
      
      if (result.refund > 0 && game?.updateBalance) {
        game.updateBalance(result.refund, 'bank');
      }

      const event: EducationEvent = {
        id: `event_${Date.now()}_dropout`,
        type: 'dropout',
        playerId: enrollment.playerId,
        timestamp: Date.now(),
        title: 'Dropped Out',
        description: `Withdrew from ${SCHOOLS.find(s => s.id === enrollment.schoolId)?.name || 'school'}`,
        metadata: { schoolId: enrollment.schoolId },
      };

      setEducationState(prev => ({
        ...prev,
        currentEnrollment: null,
        educationEvents: [event, ...prev.educationEvents].slice(0, 50),
      }));

      console.log('[EducationContext] Dropout processed, credit impact:', result.creditScoreImpact);
    }

    return result;
  }, [educationState.currentEnrollment, game]);

  const handleGraduate = useCallback(() => {
    if (!educationState.currentEnrollment) {
      return { success: false, creditScoreImpact: 0, careerOpportunitiesUnlocked: [], error: 'Not currently enrolled' };
    }

    const result = graduate(educationState.currentEnrollment);

    if (result.success && result.degree) {
      const event: EducationEvent = {
        id: `event_${Date.now()}_graduation`,
        type: 'graduation',
        playerId: educationState.currentEnrollment.playerId,
        timestamp: Date.now(),
        title: 'Graduation!',
        description: `Earned ${result.degree.degreeName} in ${result.degree.majorName} from ${result.degree.schoolName}`,
        metadata: {
          degreeId: result.degree.degreeId,
          majorId: result.degree.majorId,
          gpa: result.degree.finalGPA,
        },
      };

      setEducationState(prev => ({
        ...prev,
        currentEnrollment: null,
        completedDegrees: [...prev.completedDegrees, result.degree!],
        educationEvents: [event, ...prev.educationEvents].slice(0, 50),
      }));

      console.log('[EducationContext] Graduation completed, credit impact:', result.creditScoreImpact);
    }

    return result;
  }, [educationState.currentEnrollment]);

  const handleCalculateTuitionCost = useCallback((schoolId: string, credits: number) => {
    return calculateTuitionCost(schoolId, credits);
  }, []);

  const handleGetAvailableMajors = useCallback((degreeId: string) => {
    return getAvailableMajors(degreeId);
  }, []);

  const handleGetDegreeRequirements = useCallback((degreeId: string) => {
    return getDegreeRequirements(degreeId);
  }, []);

  const handleApplyForFinancialAid = useCallback((aidIndex: number) => {
    if (!educationState.currentEnrollment) {
      console.log('[EducationContext] Cannot apply for aid - not enrolled');
      return null;
    }

    const playerIncome = game?.gameState?.monthlyIncome ? game.gameState.monthlyIncome * 12 : 0;
    const playerGPA = educationState.currentEnrollment.gpa;

    const aid = applyForFinancialAid(
      aidIndex,
      educationState.currentEnrollment.playerId,
      educationState.currentEnrollment.id,
      playerIncome,
      playerGPA
    );

    if (aid) {
      setEducationState(prev => ({
        ...prev,
        financialAid: [...prev.financialAid, aid],
        totalScholarshipsReceived: aid.status === 'approved' 
          ? prev.totalScholarshipsReceived + aid.amount 
          : prev.totalScholarshipsReceived,
      }));

      if (aid.status === 'approved') {
        const event: EducationEvent = {
          id: `event_${Date.now()}_scholarship`,
          type: 'scholarship_awarded',
          playerId: educationState.currentEnrollment.playerId,
          timestamp: Date.now(),
          title: 'Financial Aid Approved',
          description: `Awarded ${aid.name} - $${aid.amount.toLocaleString()}`,
          metadata: { amount: aid.amount },
        };
        addEducationEvent(event);
      }
    }

    return aid;
  }, [educationState.currentEnrollment, game?.gameState?.monthlyIncome, addEducationEvent]);

  const handleApplyForStudentLoan = useCallback((loanType: LoanType, amount: number) => {
    if (!educationState.currentEnrollment) {
      console.log('[EducationContext] Cannot apply for loan - not enrolled');
      return null;
    }

    const creditScore = game?.gameState?.creditScores?.composite || 300;

    const loan = applyForStudentLoan(
      loanType,
      amount,
      educationState.currentEnrollment.playerId,
      educationState.currentEnrollment.id,
      creditScore
    );

    if (loan) {
      if (game?.updateBalance) {
        game.updateBalance(amount, 'bank');
      }

      setEducationState(prev => ({
        ...prev,
        studentLoans: [...prev.studentLoans, loan],
        totalStudentDebt: prev.totalStudentDebt + amount,
      }));

      const event: EducationEvent = {
        id: `event_${Date.now()}_loan`,
        type: 'loan_disbursed',
        playerId: educationState.currentEnrollment.playerId,
        timestamp: Date.now(),
        title: 'Student Loan Disbursed',
        description: `Received $${amount.toLocaleString()} ${loan.lenderName}`,
        metadata: { amount },
      };
      addEducationEvent(event);
    }

    return loan;
  }, [educationState.currentEnrollment, game, addEducationEvent]);

  const handleMakeStudentLoanPayment = useCallback((loanId: string, paymentAmount: number) => {
    const loan = educationState.studentLoans.find(l => l.id === loanId);
    if (!loan) {
      return { success: false, newBalance: 0, interestPaid: 0, principalPaid: 0, creditScoreImpact: 0, isPayoffComplete: false, error: 'Loan not found' };
    }

    const bankBalance = game?.gameState?.bankBalance || 0;
    if (bankBalance < paymentAmount) {
      return { success: false, newBalance: loan.currentBalance, interestPaid: 0, principalPaid: 0, creditScoreImpact: 0, isPayoffComplete: false, error: 'Insufficient funds' };
    }

    const result = makeStudentLoanPayment(loan, paymentAmount, Date.now());

    if (result.success) {
      if (game?.updateBalance) {
        game.updateBalance(-paymentAmount, 'bank');
      }

      setEducationState(prev => ({
        ...prev,
        studentLoans: prev.studentLoans.map(l => 
          l.id === loanId 
            ? {
                ...l,
                currentBalance: result.newBalance,
                totalInterestPaid: l.totalInterestPaid + result.interestPaid,
                paymentsMade: l.paymentsMade + 1,
                paymentsRemaining: l.paymentsRemaining - 1,
                lastPaymentDate: Date.now(),
                lastPaymentAmount: paymentAmount,
                status: result.isPayoffComplete ? 'paid_off' : l.status,
              }
            : l
        ),
        totalStudentDebt: prev.totalStudentDebt - result.principalPaid,
      }));
    }

    return result;
  }, [educationState.studentLoans, game]);

  const handleGetEducationProgress = useCallback((): EducationProgress => {
    return getEducationProgress(educationState);
  }, [educationState]);

  const resetEducation = useCallback(async () => {
    const newState = createInitialEducationState();
    setEducationState(newState);
    const storageKey = getStorageKey();
    await AsyncStorage.removeItem(storageKey);
    console.log('[EducationContext] Education state reset');
  }, [getStorageKey]);

  const handleProcessMonthlyEducationExpenses = useCallback(() => {
    const currentDate = game?.gameState?.currentDate || Date.now();
    const bankBalance = game?.gameState?.bankBalance || 0;
    
    const result = processMonthlyEducationExpenses(
      educationState.currentEnrollment,
      educationState.studentLoans,
      educationState.financialAid,
      bankBalance,
      educationState.economyState.isInGracePeriod,
      currentDate
    );
    
    if (result.netCost > 0 && game?.updateBalance) {
      const deductAmount = Math.min(result.netCost, bankBalance);
      if (deductAmount > 0) {
        game.updateBalance(-deductAmount, 'bank');
      }
    }
    
    if (result.loanPaymentsProcessed > 0) {
      setEducationState(prev => {
        const updatedLoans = prev.studentLoans.map(loan => {
          if (loan.status === 'active' || loan.status === 'in_repayment') {
            const monthlyRate = loan.interestRate / 100 / 12;
            const interestPaid = loan.currentBalance * monthlyRate;
            const principalPaid = Math.max(0, loan.minimumPayment - interestPaid);
            const newBalance = Math.max(0, loan.currentBalance - principalPaid);
            
            return {
              ...loan,
              currentBalance: newBalance,
              totalInterestPaid: loan.totalInterestPaid + interestPaid,
              paymentsMade: loan.paymentsMade + 1,
              paymentsRemaining: Math.max(0, loan.paymentsRemaining - 1),
              lastPaymentDate: currentDate,
              lastPaymentAmount: loan.minimumPayment,
              status: newBalance === 0 ? 'paid_off' as const : loan.status,
            };
          }
          return loan;
        });
        
        const newTotalDebt = updatedLoans
          .filter(l => l.status !== 'paid_off')
          .reduce((sum, l) => sum + l.currentBalance, 0);
        
        return {
          ...prev,
          studentLoans: updatedLoans,
          totalStudentDebt: newTotalDebt,
          economyState: {
            ...prev.economyState,
            lastMonthlyProcessDate: currentDate,
          },
        };
      });
    }
    
    console.log('[EducationContext] Monthly education expenses processed:', result);
    return result;
  }, [educationState, game]);

  const handleSetWorkStudy = useCallback((hasWorkStudy: boolean) => {
    setEducationState(prev => ({
      ...prev,
      economyState: {
        ...prev.economyState,
        hasWorkStudy,
      },
    }));
    
    if (hasWorkStudy) {
      const event: EducationEvent = {
        id: `event_${Date.now()}_workstudy`,
        type: 'scholarship_awarded',
        playerId: educationState.currentEnrollment?.playerId || '',
        timestamp: Date.now(),
        title: 'Work-Study Program',
        description: 'Enrolled in work-study program - earn while you learn!',
        metadata: {},
      };
      addEducationEvent(event);
    }
  }, [educationState.currentEnrollment?.playerId, addEducationEvent]);

  const handleSetInternship = useCallback((hasInternship: boolean) => {
    setEducationState(prev => ({
      ...prev,
      economyState: {
        ...prev.economyState,
        hasInternship,
      },
    }));
    
    if (hasInternship) {
      const event: EducationEvent = {
        id: `event_${Date.now()}_internship`,
        type: 'scholarship_awarded',
        playerId: educationState.currentEnrollment?.playerId || '',
        timestamp: Date.now(),
        title: 'Internship Started',
        description: 'Started paid internship - gaining experience and income!',
        metadata: {},
      };
      addEducationEvent(event);
    }
  }, [educationState.currentEnrollment?.playerId, addEducationEvent]);

  const handleStartGracePeriod = useCallback(() => {
    const now = Date.now();
    setEducationState(prev => {
      const updatedLoans = prev.studentLoans.map(loan => {
        if (loan.status === 'active' || loan.status === 'in_repayment') {
          const gracePeriodEndDate = now + (6 * 30 * 24 * 60 * 60 * 1000);
          return {
            ...loan,
            status: 'in_grace' as const,
            gracePeriodEndDate,
          };
        }
        return loan;
      });
      
      return {
        ...prev,
        studentLoans: updatedLoans,
        economyState: {
          ...prev.economyState,
          isInGracePeriod: true,
          gracePeriodStartDate: now,
        },
      };
    });
    
    console.log('[EducationContext] Grace period started');
  }, []);

  const handleGetEducationExpenses = useCallback(() => {
    return calculateEducationExpenses(
      educationState.currentEnrollment,
      educationState.economyState.hasWorkStudy
    );
  }, [educationState.currentEnrollment, educationState.economyState.hasWorkStudy]);

  const handleGetEducationIncome = useCallback(() => {
    const baseMonthlyIncome = game?.gameState?.monthlyIncome || 0;
    return calculateEducationIncome(
      baseMonthlyIncome,
      educationState.currentEnrollment,
      educationState.economyState.hasWorkStudy,
      educationState.economyState.hasInternship
    );
  }, [game?.gameState?.monthlyIncome, educationState.currentEnrollment, educationState.economyState]);

  const handleGetEducationBudget = useCallback(() => {
    const monthlyIncome = game?.gameState?.monthlyIncome || 0;
    return calculateEducationBudget(
      educationState.currentEnrollment,
      educationState.completedDegrees,
      educationState.studentLoans,
      educationState.financialAid,
      monthlyIncome,
      educationState.lifetimeTuitionPaid
    );
  }, [educationState, game?.gameState?.monthlyIncome]);

  const handleGetEducationROI = useCallback(() => {
    const monthlyIncome = game?.gameState?.monthlyIncome || 0;
    const totalCost = educationState.lifetimeTuitionPaid + 
      educationState.economyState.totalBooksAndSuppliesPaid + 
      educationState.economyState.totalLivingExpensesPaid;
    
    return calculateDetailedEducationROI(
      educationState.completedDegrees,
      totalCost,
      monthlyIncome
    );
  }, [educationState, game?.gameState?.monthlyIncome]);

  const handleGetDebtSummary = useCallback(() => {
    return getEducationDebtSummary(educationState.studentLoans);
  }, [educationState.studentLoans]);

  const handleGetFinancialSummary = useCallback(() => {
    const monthlyIncome = game?.gameState?.monthlyIncome || 0;
    return getEducationFinancialSummary(
      educationState.currentEnrollment,
      educationState.completedDegrees,
      educationState.studentLoans,
      educationState.financialAid,
      monthlyIncome,
      educationState.lifetimeTuitionPaid
    );
  }, [educationState, game?.gameState?.monthlyIncome]);

  const handleCalculateDegreeWorth = useCallback((degreeType: DegreeType, majorId: string, schoolReputationScore: number) => {
    return calculateDegreeWorth(degreeType, majorId, schoolReputationScore);
  }, []);

  const educationExpenses = useMemo(() => handleGetEducationExpenses(), [handleGetEducationExpenses]);
  const educationIncome = useMemo(() => handleGetEducationIncome(), [handleGetEducationIncome]);
  const educationBudget = useMemo(() => handleGetEducationBudget(), [handleGetEducationBudget]);
  const debtSummary = useMemo(() => handleGetDebtSummary(), [handleGetDebtSummary]);
  const financialSummary = useMemo(() => handleGetFinancialSummary(), [handleGetFinancialSummary]);

  const allSchools = useMemo(() => SCHOOLS, []);
  const allDegrees = useMemo(() => DEGREES, []);
  const allMajors = useMemo(() => MAJORS, []);
  const availableFinancialAid = useMemo(() => AVAILABLE_FINANCIAL_AID, []);

  return {
    educationState,
    isLoading,
    
    getAvailableSchools: handleGetAvailableSchools,
    getSchoolDetails: handleGetSchoolDetails,
    applyToSchool: handleApplyToSchool,
    getCurrentEnrollment: handleGetCurrentEnrollment,
    advanceSemester: handleAdvanceSemester,
    dropOut: handleDropOut,
    graduate: handleGraduate,
    calculateTuitionCost: handleCalculateTuitionCost,
    getAvailableMajors: handleGetAvailableMajors,
    getDegreeRequirements: handleGetDegreeRequirements,
    
    applyForFinancialAid: handleApplyForFinancialAid,
    applyForStudentLoan: handleApplyForStudentLoan,
    makeStudentLoanPayment: handleMakeStudentLoanPayment,
    
    getEducationProgress: handleGetEducationProgress,
    resetEducation,
    
    getSchoolsForMajor,
    getDegreesForSchool,
    getMajorsForSchool,
    estimateSalaryWithEducation,
    
    allSchools,
    allDegrees,
    allMajors,
    availableFinancialAid,
    
    processMonthlyEducationExpenses: handleProcessMonthlyEducationExpenses,
    setWorkStudy: handleSetWorkStudy,
    setInternship: handleSetInternship,
    startGracePeriod: handleStartGracePeriod,
    
    getEducationExpenses: handleGetEducationExpenses,
    getEducationIncome: handleGetEducationIncome,
    getEducationBudget: handleGetEducationBudget,
    getEducationROI: handleGetEducationROI,
    getDebtSummary: handleGetDebtSummary,
    getFinancialSummary: handleGetFinancialSummary,
    calculateDegreeWorth: handleCalculateDegreeWorth,
    
    educationExpenses,
    educationIncome,
    educationBudget,
    debtSummary,
    financialSummary,
    economyState: educationState.economyState,
  };
});
