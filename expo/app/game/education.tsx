import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useEducation } from '@/contexts/EducationContext';
import { 
  GraduationCap, 
  Building2, 
  DollarSign, 
  CreditCard,
  Award,
  TrendingUp,
  X,
  ChevronLeft,
  BookOpen,
  Clock,
  Star,
  BarChart3,
} from 'lucide-react-native';
import { School, Degree, Major, LoanType } from '@/types/education';
import SchoolBrowser from '@/components/education/SchoolBrowser';
import DegreeSelector from '@/components/education/DegreeSelector';
import FinancialAidPanel from '@/components/education/FinancialAidPanel';
import StudentLoansPanel from '@/components/education/StudentLoansPanel';
import { STUDENT_LOAN_OPTIONS } from '@/mocks/educationData';

type TabType = 'schools' | 'enrollment' | 'aid' | 'loans';

const TAB_CONFIG: { key: TabType; label: string; icon: typeof GraduationCap }[] = [
  { key: 'schools', label: 'Schools', icon: Building2 },
  { key: 'enrollment', label: 'My Education', icon: GraduationCap },
  { key: 'aid', label: 'Financial Aid', icon: Award },
  { key: 'loans', label: 'Student Loans', icon: CreditCard },
];

export default function EducationScreen() {
  
  const { colors } = useTheme();
  const game = useGame();
  const education = useEducation();
  
  const [activeTab, setActiveTab] = useState<TabType>('schools');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [selectedDegree, setSelectedDegree] = useState<Degree | null>(null);
  const [selectedMajor, setSelectedMajor] = useState<Major | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollmentStep, setEnrollmentStep] = useState<'school' | 'program'>('school');

  const availableSchools = useMemo(() => {
    return education.getAvailableSchools();
  }, [education]);

  const currentEnrollment = education.getCurrentEnrollment();
  const progress = education.getEducationProgress();
  const bankBalance = game?.gameState?.bankBalance || 0;
  const creditScore = game?.gameState?.creditScores?.composite || 300;

  const handleSelectSchool = useCallback((school: School) => {
    setSelectedSchool(school);
    setSelectedDegree(null);
    setSelectedMajor(null);
    setEnrollmentStep('program');
  }, []);

  const handleSelectDegree = useCallback((degree: Degree) => {
    setSelectedDegree(degree);
    setSelectedMajor(null);
  }, []);

  const handleSelectMajor = useCallback((major: Major) => {
    setSelectedMajor(major);
  }, []);

  const handleEnroll = useCallback(() => {
    if (!selectedSchool || !selectedDegree || !selectedMajor) {
      Alert.alert('Selection Required', 'Please select a school, degree, and major.');
      return;
    }

    const result = education.applyToSchool(
      selectedSchool.id,
      selectedDegree.id,
      selectedMajor.id,
      true
    );

    if (result.success) {
      Alert.alert(
        'Enrollment Successful! 🎓',
        `Welcome to ${selectedSchool.name}!\n\nProgram: ${selectedDegree.name} in ${selectedMajor.name}\nFirst Semester Tuition: $${result.tuitionDue?.toLocaleString()}`,
        [{ text: 'Start Learning!', onPress: () => {
          setShowEnrollModal(false);
          setSelectedSchool(null);
          setSelectedDegree(null);
          setSelectedMajor(null);
          setEnrollmentStep('school');
          setActiveTab('enrollment');
        }}]
      );
    } else {
      Alert.alert('Enrollment Failed', result.error || 'Unable to enroll at this time.');
    }
  }, [selectedSchool, selectedDegree, selectedMajor, education]);

  const handleAdvanceSemester = useCallback(() => {
    const result = education.advanceSemester();
    
    if (result.success) {
      let message = `Semester completed!\n\nGPA: ${result.newGPA.toFixed(2)}\nCredits Earned: ${result.creditsEarned}`;
      if (result.tuitionDue > 0) {
        message += `\nTuition Paid: $${result.tuitionDue.toLocaleString()}`;
      }
      if (result.graduated) {
        message = '🎓 CONGRATULATIONS! 🎓\n\nYou have successfully graduated!\n' + message;
      }
      Alert.alert(result.graduated ? 'Graduation!' : 'Semester Complete', message);
    } else {
      Alert.alert('Cannot Advance', result.error || 'Unable to advance semester.');
    }
  }, [education]);

  const handleDropOut = useCallback(() => {
    Alert.alert(
      'Confirm Drop Out',
      'Are you sure you want to drop out? This will negatively impact your credit score and you may lose some tuition.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Drop Out',
          style: 'destructive',
          onPress: () => {
            const result = education.dropOut();
            if (result.success) {
              Alert.alert(
                'Dropped Out',
                `You have withdrawn from school.\n\nRefund: $${result.refund.toLocaleString()}\nCredit Impact: ${result.creditScoreImpact}`
              );
            }
          },
        },
      ]
    );
  }, [education]);

  const handleApplyForAid = useCallback((aidIndex: number) => {
    return education.applyForFinancialAid(aidIndex);
  }, [education]);

  const handleApplyForLoan = useCallback((loanType: LoanType, amount: number) => {
    return education.applyForStudentLoan(loanType, amount);
  }, [education]);

  const handleMakeLoanPayment = useCallback((loanId: string, amount: number) => {
    return education.makeStudentLoanPayment(loanId, amount);
  }, [education]);

  const renderTabBar = () => (
    <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {TAB_CONFIG.map(tab => {
        const isActive = activeTab === tab.key;
        const IconComponent = tab.icon;
        
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab(tab.key)}
            testID={`tab-${tab.key}`}
          >
            <IconComponent 
              size={18} 
              color={isActive ? colors.primary : colors.textSecondary} 
            />
            <Text
              style={[
                styles.tabText,
                { color: isActive ? colors.primary : colors.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderEnrollmentStatus = () => {
    if (!currentEnrollment) return null;

    const school = education.getSchoolDetails(currentEnrollment.schoolId);
    const degree = education.allDegrees.find(d => d.id === currentEnrollment.degreeId);
    const progressPercent = (currentEnrollment.creditsEarned / currentEnrollment.creditsRequired) * 100;

    return (
      <View style={[styles.statusBanner, { backgroundColor: colors.primary }]}>
        <View style={styles.statusContent}>
          <GraduationCap size={24} color="#FFFFFF" />
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>Currently Enrolled</Text>
            <Text style={styles.statusSubtitle} numberOfLines={1}>
              {degree?.name} at {school?.name}
            </Text>
          </View>
        </View>
        <View style={styles.statusProgress}>
          <Text style={styles.statusProgressText}>{progressPercent.toFixed(0)}%</Text>
        </View>
      </View>
    );
  };

  const renderSchoolsTab = () => (
    <View style={styles.tabContent}>
      {enrollmentStep === 'school' ? (
        <SchoolBrowser
          schools={availableSchools}
          selectedSchool={selectedSchool}
          onSelectSchool={handleSelectSchool}
          creditScore={creditScore}
          colors={colors}
        />
      ) : (
        <View style={styles.programSelection}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            onPress={() => {
              setEnrollmentStep('school');
              setSelectedSchool(null);
              setSelectedDegree(null);
              setSelectedMajor(null);
            }}
          >
            <ChevronLeft size={20} color={colors.text} />
            <Text style={[styles.backButtonText, { color: colors.text }]}>Back to Schools</Text>
          </TouchableOpacity>

          {selectedSchool && (
            <View style={[styles.selectedSchoolBanner, { backgroundColor: colors.surface }]}>
              <Building2 size={20} color={colors.primary} />
              <View style={styles.selectedSchoolInfo}>
                <Text style={[styles.selectedSchoolName, { color: colors.text }]}>
                  {selectedSchool.name}
                </Text>
                <Text style={[styles.selectedSchoolMeta, { color: colors.textSecondary }]}>
                  {selectedSchool.location} • ${selectedSchool.tuitionCostPerYear.toLocaleString()}/yr
                </Text>
              </View>
            </View>
          )}

          {selectedSchool && (
            <DegreeSelector
              school={selectedSchool}
              degrees={education.allDegrees}
              majors={education.allMajors}
              selectedDegree={selectedDegree}
              selectedMajor={selectedMajor}
              onSelectDegree={handleSelectDegree}
              onSelectMajor={handleSelectMajor}
              colors={colors}
            />
          )}

          {selectedSchool && selectedDegree && selectedMajor && (
            <TouchableOpacity
              style={[styles.enrollButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowEnrollModal(true)}
              testID="enroll-button"
            >
              <GraduationCap size={20} color="#FFFFFF" />
              <Text style={styles.enrollButtonText}>Apply to Enroll</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  const renderEnrollmentTab = () => {
    if (!currentEnrollment) {
      return (
        <View style={styles.emptyState}>
          <GraduationCap size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Not Currently Enrolled</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Visit the Schools tab to browse programs and enroll.
          </Text>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('schools')}
          >
            <Building2 size={18} color="#FFFFFF" />
            <Text style={styles.ctaButtonText}>Browse Schools</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const school = education.getSchoolDetails(currentEnrollment.schoolId);
    const degree = education.allDegrees.find(d => d.id === currentEnrollment.degreeId);
    const major = education.allMajors.find(m => m.id === currentEnrollment.majorId);
    const tuitionDue = education.calculateTuitionCost(currentEnrollment.schoolId, currentEnrollment.isFullTime ? 15 : 9);
    const progressPercent = (currentEnrollment.creditsEarned / currentEnrollment.creditsRequired) * 100;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.enrollmentCard, { backgroundColor: colors.surface }]}>
          <View style={styles.enrollmentHeader}>
            <View style={[styles.enrollmentIconContainer, { backgroundColor: colors.primary + '15' }]}>
              <GraduationCap size={32} color={colors.primary} />
            </View>
            <View style={styles.enrollmentTitleContainer}>
              <Text style={[styles.enrollmentSchool, { color: colors.text }]}>{school?.name}</Text>
              <Text style={[styles.enrollmentDegree, { color: colors.textSecondary }]}>
                {degree?.name} in {major?.name}
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: colors.background }]}>
              <Star size={18} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.primary }]}>{currentEnrollment.gpa.toFixed(2)}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>GPA</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.background }]}>
              <Clock size={18} color={colors.textSecondary} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {currentEnrollment.currentSemester}/{currentEnrollment.totalSemesters}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Semester</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.background }]}>
              <BookOpen size={18} color={colors.textSecondary} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {currentEnrollment.creditsEarned}/{currentEnrollment.creditsRequired}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Credits</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.text }]}>Degree Progress</Text>
              <Text style={[styles.progressPercent, { color: colors.primary }]}>{progressPercent.toFixed(0)}%</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.min(progressPercent, 100)}%` }]} />
            </View>
          </View>

          <View style={[styles.tuitionBox, { backgroundColor: colors.warning + '15' }]}>
            <DollarSign size={20} color={colors.warning} />
            <View style={styles.tuitionInfo}>
              <Text style={[styles.tuitionLabel, { color: colors.text }]}>Next Semester Tuition</Text>
              <Text style={[styles.tuitionAmount, { color: colors.warning }]}>${tuitionDue.toLocaleString()}</Text>
            </View>
            <View style={[styles.balanceChip, { backgroundColor: colors.background }]}>
              <Text style={[styles.balanceChipText, { color: bankBalance >= tuitionDue ? colors.success : colors.error }]}>
                Balance: ${bankBalance.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleAdvanceSemester}
              testID="advance-semester-button"
            >
              <TrendingUp size={18} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Advance Semester</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.dropOutButton, { backgroundColor: colors.error }]}
              onPress={handleDropOut}
            >
              <X size={18} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Drop Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {currentEnrollment.gpa >= 3.5 && (
          <View style={[styles.achievementBadge, { backgroundColor: '#FFD700' + '20' }]}>
            <Award size={24} color="#FFD700" />
            <View style={styles.achievementContent}>
              <Text style={[styles.achievementTitle, { color: colors.text }]}>Dean&apos;s List Student!</Text>
              <Text style={[styles.achievementSubtitle, { color: colors.textSecondary }]}>
                Maintaining excellent academic standing
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.overviewCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.overviewTitle, { color: colors.text }]}>Education Overview</Text>
          
          <View style={styles.overviewStats}>
            <View style={[styles.overviewStatItem, { backgroundColor: colors.background }]}>
              <BarChart3 size={20} color={colors.primary} />
              <Text style={[styles.overviewStatValue, { color: colors.text }]}>{progress.careerReadinessScore}</Text>
              <Text style={[styles.overviewStatLabel, { color: colors.textSecondary }]}>Career Score</Text>
            </View>
            <View style={[styles.overviewStatItem, { backgroundColor: colors.background }]}>
              <GraduationCap size={20} color={colors.primary} />
              <Text style={[styles.overviewStatValue, { color: colors.text }]}>{progress.completedDegrees.length}</Text>
              <Text style={[styles.overviewStatLabel, { color: colors.textSecondary }]}>Degrees</Text>
            </View>
            <View style={[styles.overviewStatItem, { backgroundColor: colors.background }]}>
              <BookOpen size={20} color={colors.primary} />
              <Text style={[styles.overviewStatValue, { color: colors.text }]}>{progress.totalCreditsEarned}</Text>
              <Text style={[styles.overviewStatLabel, { color: colors.textSecondary }]}>Total Credits</Text>
            </View>
          </View>

          <View style={styles.financialSummary}>
            <View style={styles.financialRow}>
              <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>Total Tuition Paid</Text>
              <Text style={[styles.financialValue, { color: colors.text }]}>${progress.lifetimeTuitionPaid.toLocaleString()}</Text>
            </View>
            <View style={styles.financialRow}>
              <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>Scholarships Received</Text>
              <Text style={[styles.financialValue, { color: colors.success }]}>${progress.totalScholarshipsReceived.toLocaleString()}</Text>
            </View>
            <View style={styles.financialRow}>
              <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>Student Debt</Text>
              <Text style={[styles.financialValue, { color: colors.error }]}>${progress.totalStudentDebt.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderAidTab = () => (
    <View style={styles.tabContent}>
      <FinancialAidPanel
        availableAid={education.availableFinancialAid}
        appliedAid={education.educationState.financialAid}
        isEnrolled={!!currentEnrollment}
        currentGPA={currentEnrollment?.gpa || 0}
        bankBalance={bankBalance}
        onApplyForAid={handleApplyForAid}
        colors={colors}
      />
    </View>
  );

  const renderLoansTab = () => (
    <View style={styles.tabContent}>
      <StudentLoansPanel
        loans={education.educationState.studentLoans}
        loanOptions={STUDENT_LOAN_OPTIONS}
        isEnrolled={!!currentEnrollment}
        creditScore={creditScore}
        bankBalance={bankBalance}
        onApplyForLoan={handleApplyForLoan}
        onMakePayment={handleMakeLoanPayment}
        colors={colors}
      />
    </View>
  );

  const renderEnrollModal = () => (
    <Modal visible={showEnrollModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Enrollment</Text>
            <TouchableOpacity onPress={() => setShowEnrollModal(false)}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.enrollmentSummary, { backgroundColor: colors.background }]}>
            <View style={styles.summarySection}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>School</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedSchool?.name}</Text>
            </View>
            
            <View style={styles.summarySection}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Program</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {selectedDegree?.name} in {selectedMajor?.name}
              </Text>
            </View>
            
            <View style={styles.summarySection}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Duration</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {selectedDegree?.durationYears} years ({selectedDegree?.creditHoursRequired} credits)
              </Text>
            </View>
            
            <View style={[styles.summarySection, styles.tuitionSection]}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>First Semester Tuition</Text>
              <Text style={[styles.summaryTuition, { color: colors.primary }]}>
                ${selectedSchool ? education.calculateTuitionCost(selectedSchool.id, 15).toLocaleString() : 0}
              </Text>
            </View>
          </View>

          {selectedMajor && (
            <View style={[styles.careerPreview, { backgroundColor: colors.primary + '10' }]}>
              <TrendingUp size={18} color={colors.primary} />
              <View style={styles.careerPreviewContent}>
                <Text style={[styles.careerPreviewTitle, { color: colors.text }]}>Career Potential</Text>
                <Text style={[styles.careerPreviewText, { color: colors.textSecondary }]}>
                  Starting salary: ${selectedMajor.averageStartingSalary.toLocaleString()}/yr
                </Text>
              </View>
            </View>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.background }]}
              onPress={() => setShowEnrollModal(false)}
            >
              <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.primary }]}
              onPress={handleEnroll}
            >
              <GraduationCap size={18} color="#FFFFFF" />
              <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Enroll Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (education.isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading education data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {renderEnrollmentStatus()}
      {renderTabBar()}

      {activeTab === 'schools' && renderSchoolsTab()}
      {activeTab === 'enrollment' && renderEnrollmentTab()}
      {activeTab === 'aid' && renderAidTab()}
      {activeTab === 'loans' && renderLoansTab()}

      {renderEnrollModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    marginLeft: 12,
    flex: 1,
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  statusProgress: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusProgressText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  programSelection: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 4,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedSchoolBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  selectedSchoolInfo: {
    marginLeft: 12,
    flex: 1,
  },
  selectedSchoolName: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedSchoolMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  enrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
    gap: 8,
  },
  enrollButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  enrollmentCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  enrollmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  enrollmentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enrollmentTitleContainer: {
    marginLeft: 14,
    flex: 1,
  },
  enrollmentSchool: {
    fontSize: 18,
    fontWeight: '700',
  },
  enrollmentDegree: {
    fontSize: 14,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  tuitionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  tuitionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  tuitionLabel: {
    fontSize: 13,
  },
  tuitionAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  balanceChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  balanceChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  dropOutButton: {
    flex: 1,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  achievementSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  overviewCard: {
    padding: 20,
    borderRadius: 16,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  overviewStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  overviewStatItem: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  overviewStatValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  overviewStatLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  financialSummary: {
    gap: 12,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  financialLabel: {
    fontSize: 14,
  },
  financialValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  enrollmentSummary: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summarySection: {
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  tuitionSection: {
    marginBottom: 0,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  summaryTuition: {
    fontSize: 24,
    fontWeight: '700',
  },
  careerPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  careerPreviewContent: {
    flex: 1,
  },
  careerPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  careerPreviewText: {
    fontSize: 12,
    marginTop: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  confirmButton: {
    flex: 2,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
