import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  GraduationCap,
  BookOpen,
  TrendingUp,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Briefcase,
  Award,
  BarChart3,
  Zap,
} from 'lucide-react-native';
import { School, Degree, Major, CareerPath } from '@/types/education';

interface DegreeSelectorProps {
  school: School;
  degrees: Degree[];
  majors: Major[];
  selectedDegree: Degree | null;
  selectedMajor: Major | null;
  onSelectDegree: (degree: Degree) => void;
  onSelectMajor: (major: Major) => void;
  colors: {
    primary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#22C55E',
  moderate: '#F59E0B',
  challenging: '#EF4444',
  very_challenging: '#DC2626',
};

const DEMAND_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: 'Low Demand', color: '#94A3B8' },
  medium: { label: 'Medium Demand', color: '#F59E0B' },
  high: { label: 'High Demand', color: '#22C55E' },
  very_high: { label: 'Very High Demand', color: '#10B981' },
};

export default function DegreeSelector({
  school,
  degrees,
  majors,
  selectedDegree,
  selectedMajor,
  onSelectDegree,
  onSelectMajor,
  colors,
}: DegreeSelectorProps) {
  const [expandedCareerPath, setExpandedCareerPath] = useState<string | null>(null);

  const availableDegrees = useMemo(() => {
    return degrees.filter(d => school.availableDegrees.includes(d.id));
  }, [degrees, school.availableDegrees]);

  const availableMajors = useMemo(() => {
    if (!selectedDegree) return [];
    return majors.filter(
      m =>
        school.availableMajors.includes(m.id) &&
        m.degreeTypeIds.includes(selectedDegree.type)
    );
  }, [majors, school.availableMajors, selectedDegree]);

  const getDegreeIcon = (type: string) => {
    switch (type) {
      case 'certificate':
        return Award;
      case 'associate':
        return BookOpen;
      case 'bachelor':
        return GraduationCap;
      case 'master':
        return TrendingUp;
      case 'doctorate':
        return Zap;
      default:
        return GraduationCap;
    }
  };

  const renderCareerPath = (careerPath: CareerPath, index: number, majorId: string) => {
    const isExpanded = expandedCareerPath === `${majorId}-${index}`;
    const tierColors: Record<string, string> = {
      entry: '#94A3B8',
      mid: '#3B82F6',
      senior: '#8B5CF6',
      executive: '#F59E0B',
    };

    return (
      <View key={index} style={[styles.careerPathItem, { borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.careerPathHeader}
          onPress={() => setExpandedCareerPath(isExpanded ? null : `${majorId}-${index}`)}
        >
          <View style={styles.careerPathTitleRow}>
            <View style={[styles.tierIndicator, { backgroundColor: tierColors[careerPath.tier] }]} />
            <Text style={[styles.careerPathTitle, { color: colors.text }]}>
              {careerPath.jobTitle}
            </Text>
          </View>
          <View style={styles.careerPathMeta}>
            <Text style={[styles.careerPathSalary, { color: colors.primary }]}>
              ${careerPath.salaryRange.min.toLocaleString()} - ${careerPath.salaryRange.max.toLocaleString()}
            </Text>
            {isExpanded ? (
              <ChevronUp size={16} color={colors.textSecondary} />
            ) : (
              <ChevronDown size={16} color={colors.textSecondary} />
            )}
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={[styles.careerPathDetails, { backgroundColor: colors.background }]}>
            <View style={styles.careerDetailRow}>
              <Text style={[styles.careerDetailLabel, { color: colors.textSecondary }]}>Tier</Text>
              <View style={[styles.tierBadge, { backgroundColor: tierColors[careerPath.tier] + '20' }]}>
                <Text style={[styles.tierBadgeText, { color: tierColors[careerPath.tier] }]}>
                  {careerPath.tier.charAt(0).toUpperCase() + careerPath.tier.slice(1)}
                </Text>
              </View>
            </View>
            <View style={styles.careerDetailRow}>
              <Text style={[styles.careerDetailLabel, { color: colors.textSecondary }]}>
                Experience Required
              </Text>
              <Text style={[styles.careerDetailValue, { color: colors.text }]}>
                {careerPath.yearsExperienceRequired}+ years
              </Text>
            </View>
            <View style={styles.careerDetailRow}>
              <Text style={[styles.careerDetailLabel, { color: colors.textSecondary }]}>
                Avg. Salary
              </Text>
              <Text style={[styles.careerDetailValue, { color: colors.success }]}>
                ${Math.round((careerPath.salaryRange.min + careerPath.salaryRange.max) / 2).toLocaleString()}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderDegreeCard = (degree: Degree) => {
    const isSelected = selectedDegree?.id === degree.id;
    const IconComponent = getDegreeIcon(degree.type);

    return (
      <TouchableOpacity
        key={degree.id}
        style={[
          styles.degreeCard,
          {
            backgroundColor: isSelected ? colors.primary + '15' : colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
        onPress={() => onSelectDegree(degree)}
        testID={`degree-card-${degree.id}`}
      >
        <View style={[styles.degreeIconContainer, { backgroundColor: isSelected ? colors.primary + '20' : colors.background }]}>
          <IconComponent size={24} color={isSelected ? colors.primary : colors.textSecondary} />
        </View>
        
        <View style={styles.degreeContent}>
          <View style={styles.degreeHeader}>
            <Text style={[styles.degreeName, { color: colors.text }]}>{degree.name}</Text>
            {isSelected && <CheckCircle2 size={18} color={colors.primary} />}
          </View>
          
          <Text style={[styles.degreeDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {degree.description}
          </Text>
          
          <View style={styles.degreeStats}>
            <View style={styles.degreeStat}>
              <Clock size={12} color={colors.textSecondary} />
              <Text style={[styles.degreeStatText, { color: colors.textSecondary }]}>
                {degree.durationYears} {degree.durationYears === 1 ? 'year' : 'years'}
              </Text>
            </View>
            <View style={styles.degreeStat}>
              <BookOpen size={12} color={colors.textSecondary} />
              <Text style={[styles.degreeStatText, { color: colors.textSecondary }]}>
                {degree.creditHoursRequired} credits
              </Text>
            </View>
            <View style={styles.degreeStat}>
              <TrendingUp size={12} color={colors.success} />
              <Text style={[styles.degreeStatText, { color: colors.success }]}>
                +{degree.averageSalaryIncrease}% salary
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMajorCard = (major: Major) => {
    const isSelected = selectedMajor?.id === major.id;
    const demandInfo = DEMAND_LABELS[major.demandLevel];
    const difficultyColor = DIFFICULTY_COLORS[major.difficultyLevel];

    return (
      <View
        key={major.id}
        style={[
          styles.majorCard,
          {
            backgroundColor: isSelected ? colors.primary + '10' : colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.majorHeader}
          onPress={() => onSelectMajor(major)}
          testID={`major-card-${major.id}`}
        >
          <View style={styles.majorTitleRow}>
            <View style={[styles.majorIconContainer, { backgroundColor: isSelected ? colors.primary + '20' : colors.background }]}>
              <Briefcase size={20} color={isSelected ? colors.primary : colors.textSecondary} />
            </View>
            <View style={styles.majorTitleContent}>
              <Text style={[styles.majorName, { color: colors.text }]}>{major.name}</Text>
              <View style={styles.majorBadges}>
                <View style={[styles.demandBadge, { backgroundColor: demandInfo.color + '20' }]}>
                  <BarChart3 size={10} color={demandInfo.color} />
                  <Text style={[styles.demandBadgeText, { color: demandInfo.color }]}>
                    {demandInfo.label}
                  </Text>
                </View>
                <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor + '20' }]}>
                  <Text style={[styles.difficultyBadgeText, { color: difficultyColor }]}>
                    {major.difficultyLevel.replace('_', ' ')}
                  </Text>
                </View>
              </View>
            </View>
            {isSelected && <CheckCircle2 size={20} color={colors.primary} />}
          </View>
          
          <Text style={[styles.majorDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {major.description}
          </Text>
          
          <View style={styles.majorStats}>
            <View style={[styles.majorStatBox, { backgroundColor: colors.background }]}>
              <DollarSign size={14} color={colors.primary} />
              <Text style={[styles.majorStatValue, { color: colors.primary }]}>
                ${major.averageStartingSalary.toLocaleString()}
              </Text>
              <Text style={[styles.majorStatLabel, { color: colors.textSecondary }]}>Starting Salary</Text>
            </View>
            <View style={[styles.majorStatBox, { backgroundColor: colors.background }]}>
              <Briefcase size={14} color={colors.textSecondary} />
              <Text style={[styles.majorStatValue, { color: colors.text }]}>
                {major.careerPaths.length}
              </Text>
              <Text style={[styles.majorStatLabel, { color: colors.textSecondary }]}>Career Paths</Text>
            </View>
          </View>
        </TouchableOpacity>

        {isSelected && major.careerPaths.length > 0 && (
          <View style={styles.careerPathsContainer}>
            <Text style={[styles.careerPathsTitle, { color: colors.text }]}>
              Career Paths Available
            </Text>
            {major.careerPaths.map((path, index) => renderCareerPath(path, index, major.id))}
          </View>
        )}

        {isSelected && major.specializations && major.specializations.length > 0 && (
          <View style={styles.specializationsContainer}>
            <Text style={[styles.specializationsTitle, { color: colors.text }]}>
              Available Specializations
            </Text>
            {major.specializations.map(spec => (
              <View
                key={spec.id}
                style={[styles.specializationItem, { backgroundColor: colors.background }]}
              >
                <View style={styles.specHeader}>
                  <Text style={[styles.specName, { color: colors.text }]}>{spec.name}</Text>
                  <Text style={[styles.specBonus, { color: colors.success }]}>
                    +{spec.salaryBonus}% salary
                  </Text>
                </View>
                <Text style={[styles.specDescription, { color: colors.textSecondary }]}>
                  {spec.description}
                </Text>
                <Text style={[styles.specCredits, { color: colors.textSecondary }]}>
                  +{spec.additionalCredits} additional credits required
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <GraduationCap size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Degree Program</Text>
        </View>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Choose a degree level available at {school.name}
        </Text>
        
        {availableDegrees.map(renderDegreeCard)}
        
        {availableDegrees.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No degree programs available
            </Text>
          </View>
        )}
      </View>

      {selectedDegree && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BookOpen size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Your Major</Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Choose a field of study for your {selectedDegree.name}
          </Text>
          
          {availableMajors.map(renderMajorCard)}
          
          {availableMajors.length === 0 && (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No majors available for this degree at this school
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  degreeCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  degreeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  degreeContent: {
    flex: 1,
    marginLeft: 12,
  },
  degreeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  degreeName: {
    fontSize: 16,
    fontWeight: '700',
  },
  degreeDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  degreeStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  degreeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  degreeStatText: {
    fontSize: 11,
  },
  majorCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  majorHeader: {
    padding: 16,
  },
  majorTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  majorIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  majorTitleContent: {
    flex: 1,
    marginLeft: 12,
  },
  majorName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  majorBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  demandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  demandBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  difficultyBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  majorDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  majorStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  majorStatBox: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  majorStatValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  majorStatLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  careerPathsContainer: {
    padding: 16,
    paddingTop: 0,
  },
  careerPathsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  careerPathItem: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  careerPathHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  careerPathTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  careerPathTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  careerPathMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  careerPathSalary: {
    fontSize: 12,
    fontWeight: '600',
  },
  careerPathDetails: {
    padding: 12,
    gap: 8,
  },
  careerDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  careerDetailLabel: {
    fontSize: 12,
  },
  careerDetailValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  specializationsContainer: {
    padding: 16,
    paddingTop: 0,
  },
  specializationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  specializationItem: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  specHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  specName: {
    fontSize: 14,
    fontWeight: '600',
  },
  specBonus: {
    fontSize: 12,
    fontWeight: '600',
  },
  specDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  specCredits: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  emptyState: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
