import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Briefcase,
  DollarSign,
  Clock,
  Star,
  CheckCircle,
  Lock,
  TrendingUp,
  Award,
  GraduationCap,
  Filter,
  Sparkles,
  AlertCircle,
  Building2,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useEducation } from '@/contexts/EducationContext';
import { JOBS } from '@/mocks/gameData';
import { formatCurrency } from '@/utils/creditEngine';
import { Job, PlayerJob } from '@/types/game';
import { DegreeType } from '@/types/education';
import { useBusiness } from '@/contexts/BusinessContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const DEGREE_LABELS: Record<string, string> = {
  certificate: 'Certificate',
  associate: "Associate's",
  bachelor: "Bachelor's",
  master: "Master's",
  doctorate: 'Doctorate',
};

const DEGREE_ORDER: DegreeType[] = ['certificate', 'associate', 'bachelor', 'master', 'doctorate'];

const EDUCATION_SALARY_BONUS: Record<DegreeType, { min: number; max: number }> = {
  certificate: { min: 0.05, max: 0.10 },
  associate: { min: 0.10, max: 0.15 },
  bachelor: { min: 0.20, max: 0.30 },
  master: { min: 0.40, max: 0.60 },
  doctorate: { min: 0.80, max: 1.20 },
};

export default function CareerScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { gameState, setCurrentJob } = useGame();
  const education = useEducation();
  const { getBusinessStats } = useBusiness();
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedEducation, setSelectedEducation] = useState<string>('all');
  const [showQualifiedOnly, setShowQualifiedOnly] = useState(false);

  const businessStats = useMemo(() => getBusinessStats(), [getBusinessStats]);

  const completedDegrees = useMemo(() => 
    education?.educationState?.completedDegrees || [], 
    [education?.educationState?.completedDegrees]
  );
  const currentEnrollment = education?.educationState?.currentEnrollment;

  const tiers = [
    { id: 'all', label: 'All Jobs' },
    { id: 'entry', label: 'Entry Level' },
    { id: 'mid', label: 'Mid Level' },
    { id: 'senior', label: 'Senior' },
    { id: 'executive', label: 'Executive' },
  ];

  const educationFilters = [
    { id: 'all', label: 'All Education' },
    { id: 'none', label: 'No Degree' },
    { id: 'associate', label: "Associate's" },
    { id: 'bachelor', label: "Bachelor's" },
    { id: 'master', label: "Master's" },
    { id: 'doctorate', label: 'Doctorate' },
  ];

  const getHighestDegree = useCallback((): DegreeType | null => {
    if (completedDegrees.length === 0) return null;
    
    let highest: DegreeType | null = null;
    let highestIndex = -1;
    
    completedDegrees.forEach((degree) => {
      const index = DEGREE_ORDER.indexOf(degree.degreeType);
      if (index > highestIndex) {
        highestIndex = index;
        highest = degree.degreeType;
      }
    });
    
    return highest;
  }, [completedDegrees]);

  const hasDegreeOrHigher = useCallback((requiredDegree: DegreeType): boolean => {
    const requiredIndex = DEGREE_ORDER.indexOf(requiredDegree);
    return completedDegrees.some((degree) => {
      const degreeIndex = DEGREE_ORDER.indexOf(degree.degreeType);
      return degreeIndex >= requiredIndex;
    });
  }, [completedDegrees]);

  const hasMajor = useCallback((requiredMajorId: string): boolean => {
    return completedDegrees.some((degree) => degree.majorId === requiredMajorId);
  }, [completedDegrees]);

  const getHighestGPA = useCallback((): number => {
    if (completedDegrees.length === 0) return 0;
    return Math.max(...completedDegrees.map((d) => d.finalGPA));
  }, [completedDegrees]);

  const checkEducationRequirements = useCallback((job: Job): { 
    eligible: boolean; 
    reasons: string[];
    hasPreferredEducation: boolean;
  } => {
    const reasons: string[] = [];
    let eligible = true;
    let hasPreferredEducation = false;
    const req = job.requirements;

    if (req.requiredDegree) {
      if (!hasDegreeOrHigher(req.requiredDegree)) {
        eligible = false;
        reasons.push(`Requires ${DEGREE_LABELS[req.requiredDegree]} degree`);
      }
    }

    if (req.requiredMajor && eligible) {
      if (!hasMajor(req.requiredMajor)) {
        const majorName = req.requiredMajor.replace('major_', '').replace(/_/g, ' ');
        const formattedMajor = majorName.charAt(0).toUpperCase() + majorName.slice(1);
        eligible = false;
        reasons.push(`Requires ${formattedMajor} major`);
      }
    }

    if (req.minimumGPA && eligible) {
      const highestGPA = getHighestGPA();
      if (highestGPA < req.minimumGPA) {
        eligible = false;
        reasons.push(`Requires ${req.minimumGPA.toFixed(1)} GPA`);
      }
    }

    if (req.preferredEducation && req.preferredEducation.length > 0) {
      hasPreferredEducation = req.preferredEducation.some((edu) => hasDegreeOrHigher(edu));
    }

    return { eligible, reasons, hasPreferredEducation };
  }, [hasDegreeOrHigher, hasMajor, getHighestGPA]);

  const canApply = useCallback((job: Job): { eligible: boolean; reason?: string; educationMissing?: boolean } => {
    const experience = gameState.currentJob?.experienceMonths || 0;
    
    if (job.requirements.minExperience > experience) {
      return { 
        eligible: false, 
        reason: `Requires ${job.requirements.minExperience} months experience` 
      };
    }
    
    if (job.requirements.minCreditScore && gameState.creditScores.composite < job.requirements.minCreditScore) {
      return { 
        eligible: false, 
        reason: `Requires ${job.requirements.minCreditScore} credit score` 
      };
    }

    const eduCheck = checkEducationRequirements(job);
    if (!eduCheck.eligible) {
      return {
        eligible: false,
        reason: eduCheck.reasons[0],
        educationMissing: true,
      };
    }
    
    return { eligible: true };
  }, [gameState.currentJob?.experienceMonths, gameState.creditScores.composite, checkEducationRequirements]);

  const calculateSalaryWithEducation = useCallback((baseSalary: number): { 
    adjustedSalary: number; 
    bonus: number;
    bonusPercent: number;
  } => {
    const highestDegree = getHighestDegree();
    if (!highestDegree) {
      return { adjustedSalary: baseSalary, bonus: 0, bonusPercent: 0 };
    }

    const bonusRange = EDUCATION_SALARY_BONUS[highestDegree];
    const avgBonus = (bonusRange.min + bonusRange.max) / 2;
    const bonus = Math.round(baseSalary * avgBonus);
    
    return {
      adjustedSalary: baseSalary + bonus,
      bonus,
      bonusPercent: Math.round(avgBonus * 100),
    };
  }, [getHighestDegree]);

  const filteredJobs = useMemo(() => {
    let jobs = JOBS;
    
    if (selectedTier !== 'all') {
      jobs = jobs.filter(job => job.tier === selectedTier);
    }
    
    if (selectedEducation !== 'all') {
      if (selectedEducation === 'none') {
        jobs = jobs.filter(job => !job.requirements.requiredDegree);
      } else {
        jobs = jobs.filter(job => job.requirements.requiredDegree === selectedEducation);
      }
    }
    
    if (showQualifiedOnly) {
      jobs = jobs.filter(job => canApply(job).eligible);
    }
    
    return jobs;
  }, [selectedTier, selectedEducation, showQualifiedOnly, canApply]);

  const handleApply = useCallback((job: Job) => {
    const eligibility = canApply(job);
    
    if (!eligibility.eligible) {
      Alert.alert('Not Eligible', eligibility.reason);
      return;
    }

    const salaryInfo = calculateSalaryWithEducation(job.baseSalary);
    const salaryDisplay = salaryInfo.bonus > 0 
      ? `${formatCurrency(salaryInfo.adjustedSalary)}/year (+${salaryInfo.bonusPercent}% education bonus)`
      : `${formatCurrency(job.baseSalary)}/year`;

    Alert.alert(
      'Apply for Position',
      `Apply for ${job.title} at ${job.company}?\n\nSalary: ${salaryDisplay}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: () => {
            const successRate = 0.7 + (gameState.creditScores.composite / 850) * 0.3;
            const hired = Math.random() < successRate;

            if (hired) {
              const newJob: PlayerJob = {
                job,
                startDate: gameState.currentDate,
                experienceMonths: gameState.currentJob?.experienceMonths || 0,
                performanceRating: 3,
                currentSalary: salaryInfo.adjustedSalary,
              };
              
              setCurrentJob(newJob);
              
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              
              Alert.alert(
                'Congratulations!',
                `You've been hired as ${job.title} at ${job.company}!`
              );
            } else {
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
              
              Alert.alert(
                'Application Unsuccessful',
                'Unfortunately, you were not selected for this position. Keep trying!'
              );
            }
          },
        },
      ]
    );
  }, [canApply, calculateSalaryWithEducation, gameState, setCurrentJob]);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'entry': return '#10B981';
      case 'mid': return '#3B82F6';
      case 'senior': return '#8B5CF6';
      case 'executive': return '#F59E0B';
      default: return colors.textSecondary;
    }
  };

  const highestDegree = getHighestDegree();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Start A Business Section */}
        <TouchableOpacity
          style={[styles.businessBanner, { backgroundColor: '#10B98115' }]}
          onPress={() => router.push('/game/start-business' as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.businessBannerIcon, { backgroundColor: '#10B98125' }]}>
            <Building2 size={24} color="#10B981" />
          </View>
          <View style={styles.businessBannerContent}>
            <Text style={[styles.businessBannerTitle, { color: colors.text }]}>Start A Business</Text>
            <Text style={[styles.businessBannerSubtitle, { color: colors.textSecondary }]}>
              {businessStats.totalBusinesses > 0 
                ? `You own ${businessStats.totalBusinesses} business${businessStats.totalBusinesses > 1 ? 'es' : ''}`
                : 'Become an entrepreneur today'
              }
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {highestDegree && (
          <View style={[styles.educationBanner, { backgroundColor: '#8B5CF620' }]}>
            <GraduationCap size={20} color="#8B5CF6" />
            <View style={styles.educationBannerText}>
              <Text style={[styles.educationBannerTitle, { color: colors.text }]}>
                {DEGREE_LABELS[highestDegree]} Degree Holder
              </Text>
              <Text style={[styles.educationBannerSubtitle, { color: colors.textSecondary }]}>
                +{Math.round((EDUCATION_SALARY_BONUS[highestDegree].min + EDUCATION_SALARY_BONUS[highestDegree].max) / 2 * 100)}% salary bonus on eligible positions
              </Text>
            </View>
          </View>
        )}

        {currentEnrollment && (
          <View style={[styles.enrollmentBanner, { backgroundColor: '#3B82F620' }]}>
            <GraduationCap size={20} color="#3B82F6" />
            <Text style={[styles.enrollmentText, { color: colors.text }]}>
              Currently enrolled - Graduate to unlock more jobs!
            </Text>
          </View>
        )}

        {gameState.currentJob && (
          <View style={[styles.currentJobCard, { backgroundColor: colors.surface }]}>
            <View style={styles.currentJobHeader}>
              <View style={[styles.jobIconContainer, { backgroundColor: '#10B98120' }]}>
                <Briefcase size={24} color="#10B981" />
              </View>
              <View style={styles.currentJobInfo}>
                <Text style={[styles.currentJobLabel, { color: colors.textSecondary }]}>
                  Current Position
                </Text>
                <Text style={[styles.currentJobTitle, { color: colors.text }]}>
                  {gameState.currentJob.job.title}
                </Text>
                <Text style={[styles.currentJobCompany, { color: colors.textSecondary }]}>
                  {gameState.currentJob.job.company}
                </Text>
              </View>
            </View>
            
            <View style={styles.currentJobStats}>
              <View style={styles.statItem}>
                <DollarSign size={16} color="#10B981" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {formatCurrency(gameState.currentJob.currentSalary)}/yr
                </Text>
              </View>
              <View style={styles.statItem}>
                <Clock size={16} color="#3B82F6" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {gameState.currentJob.experienceMonths} months
                </Text>
              </View>
              <View style={styles.statItem}>
                <Star size={16} color="#F59E0B" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {gameState.currentJob.performanceRating}/5
                </Text>
              </View>
            </View>
          </View>
        )}

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tierFilter}
          contentContainerStyle={styles.tierFilterContent}
        >
          {tiers.map((tier) => (
            <TouchableOpacity
              key={tier.id}
              style={[
                styles.tierButton,
                { 
                  backgroundColor: selectedTier === tier.id ? colors.primary : colors.surface,
                  borderColor: colors.border,
                }
              ]}
              onPress={() => setSelectedTier(tier.id)}
            >
              <Text style={[
                styles.tierButtonText,
                { color: selectedTier === tier.id ? '#FFF' : colors.text }
              ]}>
                {tier.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.educationFilter}
          contentContainerStyle={styles.tierFilterContent}
        >
          <TouchableOpacity
            style={[
              styles.qualifiedButton,
              { 
                backgroundColor: showQualifiedOnly ? '#10B981' : colors.surface,
                borderColor: colors.border,
              }
            ]}
            onPress={() => setShowQualifiedOnly(!showQualifiedOnly)}
          >
            <Filter size={14} color={showQualifiedOnly ? '#FFF' : colors.textSecondary} />
            <Text style={[
              styles.tierButtonText,
              { color: showQualifiedOnly ? '#FFF' : colors.text }
            ]}>
              Qualified Only
            </Text>
          </TouchableOpacity>
          {educationFilters.map((edu) => (
            <TouchableOpacity
              key={edu.id}
              style={[
                styles.tierButton,
                { 
                  backgroundColor: selectedEducation === edu.id ? '#8B5CF6' : colors.surface,
                  borderColor: colors.border,
                }
              ]}
              onPress={() => setSelectedEducation(edu.id)}
            >
              <Text style={[
                styles.tierButtonText,
                { color: selectedEducation === edu.id ? '#FFF' : colors.text }
              ]}>
                {edu.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.jobsList}>
          {filteredJobs.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <AlertCircle size={48} color={colors.textLight} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                No Jobs Found
              </Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Try adjusting your filters or complete more education to unlock higher positions.
              </Text>
            </View>
          ) : (
            filteredJobs.map((job) => {
              const eligibility = canApply(job);
              const isCurrentJob = gameState.currentJob?.job.id === job.id;
              const eduCheck = checkEducationRequirements(job);
              const salaryInfo = calculateSalaryWithEducation(job.baseSalary);
              
              return (
                <View 
                  key={job.id} 
                  style={[
                    styles.jobCard, 
                    { 
                      backgroundColor: colors.surface,
                      opacity: eligibility.eligible ? 1 : 0.7,
                    }
                  ]}
                >
                  <View style={styles.jobHeader}>
                    <View style={[styles.tierBadge, { backgroundColor: getTierColor(job.tier) + '20' }]}>
                      <Text style={[styles.tierBadgeText, { color: getTierColor(job.tier) }]}>
                        {job.tier.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.jobHeaderRight}>
                      {eligibility.eligible && !isCurrentJob && (
                        <View style={[styles.qualifiedBadge, { backgroundColor: '#10B98120' }]}>
                          <CheckCircle size={12} color="#10B981" />
                          <Text style={styles.qualifiedBadgeText}>Qualified</Text>
                        </View>
                      )}
                      {!eligibility.eligible && eligibility.educationMissing && (
                        <View style={[styles.educationRequiredBadge, { backgroundColor: '#EF444420' }]}>
                          <GraduationCap size={12} color="#EF4444" />
                          <Text style={styles.educationRequiredText}>Education Required</Text>
                        </View>
                      )}
                      {isCurrentJob && (
                        <View style={[styles.currentBadge, { backgroundColor: '#10B98120' }]}>
                          <CheckCircle size={12} color="#10B981" />
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Text style={[styles.jobTitle, { color: colors.text }]}>{job.title}</Text>
                  <Text style={[styles.jobCompany, { color: colors.textSecondary }]}>{job.company}</Text>
                  <Text style={[styles.jobDescription, { color: colors.textLight }]} numberOfLines={2}>
                    {job.description}
                  </Text>

                  <View style={styles.salaryContainer}>
                    <DollarSign size={18} color="#10B981" />
                    <Text style={styles.salaryText}>{formatCurrency(job.baseSalary)}/year</Text>
                    {salaryInfo.bonus > 0 && eligibility.eligible && (
                      <View style={styles.salaryBonusContainer}>
                        <Sparkles size={14} color="#8B5CF6" />
                        <Text style={styles.salaryBonusText}>
                          +{salaryInfo.bonusPercent}% edu bonus
                        </Text>
                      </View>
                    )}
                    {job.commission && (
                      <Text style={[styles.commissionText, { color: colors.textSecondary }]}>
                        + up to {formatCurrency(job.commission)} commission
                      </Text>
                    )}
                  </View>

                  <View style={styles.benefitsContainer}>
                    {job.benefits.healthInsurance && (
                      <View style={[styles.benefitBadge, { backgroundColor: colors.surfaceAlt }]}>
                        <Text style={[styles.benefitText, { color: colors.textSecondary }]}>Health</Text>
                      </View>
                    )}
                    {job.benefits.retirement401k && (
                      <View style={[styles.benefitBadge, { backgroundColor: colors.surfaceAlt }]}>
                        <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                          401k {job.benefits.retirementMatch}%
                        </Text>
                      </View>
                    )}
                    {job.benefits.paidTimeOff > 0 && (
                      <View style={[styles.benefitBadge, { backgroundColor: colors.surfaceAlt }]}>
                        <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                          {job.benefits.paidTimeOff} PTO
                        </Text>
                      </View>
                    )}
                  </View>

                  {job.requirements.requiredDegree && (
                    <View style={styles.requirementRow}>
                      <GraduationCap size={14} color={eduCheck.eligible ? '#10B981' : '#EF4444'} />
                      <Text style={[
                        styles.requirementText, 
                        { color: eduCheck.eligible ? '#10B981' : '#EF4444' }
                      ]}>
                        {DEGREE_LABELS[job.requirements.requiredDegree]} degree required
                        {job.requirements.requiredMajor && ` in ${job.requirements.requiredMajor.replace('major_', '').replace(/_/g, ' ')}`}
                      </Text>
                    </View>
                  )}

                  {job.requirements.minimumGPA && (
                    <View style={styles.requirementRow}>
                      <Award size={14} color={getHighestGPA() >= job.requirements.minimumGPA ? '#10B981' : '#EF4444'} />
                      <Text style={[
                        styles.requirementText, 
                        { color: getHighestGPA() >= job.requirements.minimumGPA ? '#10B981' : '#EF4444' }
                      ]}>
                        {job.requirements.minimumGPA.toFixed(1)} minimum GPA required
                      </Text>
                    </View>
                  )}

                  {job.requirements.preferredEducation && job.requirements.preferredEducation.length > 0 && !job.requirements.requiredDegree && (
                    <View style={styles.requirementRow}>
                      <Sparkles size={14} color={eduCheck.hasPreferredEducation ? '#8B5CF6' : colors.textLight} />
                      <Text style={[styles.requirementText, { color: colors.textLight }]}>
                        Preferred: {job.requirements.preferredEducation.map(e => DEGREE_LABELS[e]).join(', ')}
                      </Text>
                    </View>
                  )}

                  {job.requirements.minExperience > 0 && (
                    <View style={styles.requirementRow}>
                      <Clock size={14} color={colors.textLight} />
                      <Text style={[styles.requirementText, { color: colors.textLight }]}>
                        {job.requirements.minExperience} months experience required
                      </Text>
                    </View>
                  )}

                  {job.requirements.minCreditScore && (
                    <View style={styles.requirementRow}>
                      <TrendingUp size={14} color={colors.textLight} />
                      <Text style={[styles.requirementText, { color: colors.textLight }]}>
                        {job.requirements.minCreditScore} credit score required
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.applyButton,
                      { 
                        backgroundColor: eligibility.eligible && !isCurrentJob 
                          ? colors.primary 
                          : colors.surfaceAlt 
                      }
                    ]}
                    onPress={() => handleApply(job)}
                    disabled={!eligibility.eligible || isCurrentJob}
                  >
                    {!eligibility.eligible ? (
                      <>
                        <Lock size={16} color={colors.textLight} />
                        <Text style={[styles.applyButtonText, { color: colors.textLight }]}>
                          {eligibility.reason}
                        </Text>
                      </>
                    ) : isCurrentJob ? (
                      <>
                        <CheckCircle size={16} color={colors.textLight} />
                        <Text style={[styles.applyButtonText, { color: colors.textLight }]}>
                          Current Position
                        </Text>
                      </>
                    ) : (
                      <>
                        <Award size={16} color="#FFF" />
                        <Text style={[styles.applyButtonText, { color: '#FFF' }]}>
                          Apply Now
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  educationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  educationBannerText: {
    flex: 1,
  },
  educationBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  educationBannerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  enrollmentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  enrollmentText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  currentJobCard: {
    margin: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 20,
  },
  currentJobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  jobIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  currentJobInfo: {
    flex: 1,
  },
  currentJobLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  currentJobTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  currentJobCompany: {
    fontSize: 14,
    marginTop: 2,
  },
  currentJobStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  tierFilter: {
    marginBottom: 8,
  },
  educationFilter: {
    marginBottom: 16,
  },
  tierFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tierButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  qualifiedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  tierButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  jobsList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  emptyState: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  jobCard: {
    padding: 20,
    borderRadius: 20,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobHeaderRight: {
    flexDirection: 'row',
    gap: 8,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  qualifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  qualifiedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  educationRequiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  educationRequiredText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  jobCompany: {
    fontSize: 14,
    marginBottom: 8,
  },
  jobDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  salaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
    flexWrap: 'wrap',
  },
  salaryText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  salaryBonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#8B5CF620',
    borderRadius: 8,
    gap: 4,
  },
  salaryBonusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  commissionText: {
    fontSize: 13,
    marginLeft: 8,
  },
  benefitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  benefitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  benefitText: {
    fontSize: 11,
    fontWeight: '500',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  requirementText: {
    fontSize: 12,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
  businessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  businessBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessBannerContent: {
    flex: 1,
  },
  businessBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  businessBannerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
