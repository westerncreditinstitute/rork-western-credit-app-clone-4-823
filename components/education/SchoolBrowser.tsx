import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Star,
  MapPin,
  DollarSign,
  ChevronRight,
  Search,
  Filter,
  X,
  Wifi,
  GraduationCap,
  Users,
  CheckCircle2,
} from 'lucide-react-native';
import { School, SchoolType } from '@/types/education';

interface SchoolBrowserProps {
  schools: School[];
  selectedSchool: School | null;
  onSelectSchool: (school: School) => void;
  creditScore: number;
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

const SCHOOL_TYPE_LABELS: Record<SchoolType, string> = {
  community_college: 'Community College',
  state_university: 'State University',
  private_university: 'Private University',
  trade_school: 'Trade School',
  online_university: 'Online University',
};

const COST_RANGES = [
  { label: 'Under $5K', min: 0, max: 5000 },
  { label: '$5K - $15K', min: 5000, max: 15000 },
  { label: '$15K - $30K', min: 15000, max: 30000 },
  { label: '$30K+', min: 30000, max: Infinity },
];

export default function SchoolBrowser({
  schools,
  selectedSchool,
  onSelectSchool,
  creditScore,
  colors,
}: SchoolBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<SchoolType[]>([]);
  const [selectedCostRange, setSelectedCostRange] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'reputation' | 'cost' | 'acceptance'>('reputation');

  const toggleSchoolType = useCallback((type: SchoolType) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }, []);

  const filteredSchools = useMemo(() => {
    let result = [...schools];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        s =>
          s.name.toLowerCase().includes(query) ||
          s.location.toLowerCase().includes(query)
      );
    }

    if (selectedTypes.length > 0) {
      result = result.filter(s => selectedTypes.includes(s.type));
    }

    if (selectedCostRange !== null) {
      const range = COST_RANGES[selectedCostRange];
      result = result.filter(
        s => s.tuitionCostPerYear >= range.min && s.tuitionCostPerYear < range.max
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'reputation':
          return b.reputationScore - a.reputationScore;
        case 'cost':
          return a.tuitionCostPerYear - b.tuitionCostPerYear;
        case 'acceptance':
          return b.acceptanceRate - a.acceptanceRate;
        default:
          return 0;
      }
    });

    return result;
  }, [schools, searchQuery, selectedTypes, selectedCostRange, sortBy]);

  const clearFilters = useCallback(() => {
    setSelectedTypes([]);
    setSelectedCostRange(null);
    setSearchQuery('');
  }, []);

  const hasActiveFilters = selectedTypes.length > 0 || selectedCostRange !== null || searchQuery.trim();

  const canApply = useCallback((school: School) => {
    if (school.minimumCreditScore && creditScore < school.minimumCreditScore) {
      return false;
    }
    return true;
  }, [creditScore]);

  const renderSchoolCard = (school: School) => {
    const isSelected = selectedSchool?.id === school.id;
    const eligible = canApply(school);

    return (
      <TouchableOpacity
        key={school.id}
        style={[
          styles.schoolCard,
          {
            backgroundColor: colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
            borderWidth: isSelected ? 2 : 1,
            opacity: eligible ? 1 : 0.6,
          },
        ]}
        onPress={() => eligible && onSelectSchool(school)}
        activeOpacity={eligible ? 0.7 : 1}
        testID={`school-card-${school.id}`}
      >
        <Image source={{ uri: school.imageUrl }} style={styles.schoolImage} contentFit="cover" transition={200} cachePolicy="memory-disk" />
        
        <View style={styles.schoolContent}>
          <View style={styles.schoolHeader}>
            <View style={styles.schoolTitleContainer}>
              <Text style={[styles.schoolName, { color: colors.text }]} numberOfLines={1}>
                {school.name}
              </Text>
              {school.isOnline && (
                <View style={[styles.onlineBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Wifi size={10} color={colors.primary} />
                  <Text style={[styles.onlineBadgeText, { color: colors.primary }]}>Online</Text>
                </View>
              )}
            </View>
            {isSelected && <CheckCircle2 size={20} color={colors.primary} />}
          </View>

          <View style={styles.schoolMeta}>
            <View style={styles.metaRow}>
              <MapPin size={12} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{school.location}</Text>
            </View>
            <View style={styles.metaRow}>
              <Star size={12} color="#FFD700" />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {school.reputationScore}/10
              </Text>
            </View>
          </View>

          <View style={styles.schoolStats}>
            <View style={styles.statItem}>
              <DollarSign size={14} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.primary }]}>
                ${school.tuitionCostPerYear.toLocaleString()}/yr
              </Text>
            </View>
            <View style={styles.statItem}>
              <Users size={14} color={colors.textSecondary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {school.acceptanceRate}% accept
              </Text>
            </View>
          </View>

          <View style={styles.schoolFooter}>
            <View style={[styles.typeBadge, { backgroundColor: colors.background }]}>
              <Text style={[styles.typeBadgeText, { color: colors.textSecondary }]}>
                {SCHOOL_TYPE_LABELS[school.type]}
              </Text>
            </View>
            {school.minimumCreditScore && (
              <View style={[
                styles.creditBadge,
                { backgroundColor: eligible ? colors.success + '20' : colors.error + '20' }
              ]}>
                <Text style={[
                  styles.creditBadgeText,
                  { color: eligible ? colors.success : colors.error }
                ]}>
                  {eligible ? '✓ Eligible' : `Min ${school.minimumCreditScore} Credit`}
                </Text>
              </View>
            )}
          </View>
        </View>

        <ChevronRight size={20} color={colors.textSecondary} style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Search size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search schools..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          testID="school-search-input"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: hasActiveFilters ? colors.primary : colors.background }
          ]}
          onPress={() => setShowFilters(!showFilters)}
          testID="filter-toggle"
        >
          <Filter size={16} color={hasActiveFilters ? '#FFFFFF' : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={[styles.filtersPanel, { backgroundColor: colors.surface }]}>
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>School Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterChips}>
                {(Object.keys(SCHOOL_TYPE_LABELS) as SchoolType[]).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selectedTypes.includes(type)
                          ? colors.primary
                          : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => toggleSchoolType(type)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: selectedTypes.includes(type) ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {SCHOOL_TYPE_LABELS[type]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Tuition Range</Text>
            <View style={styles.filterChips}>
              {COST_RANGES.map((range, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: selectedCostRange === index
                        ? colors.primary
                        : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCostRange(selectedCostRange === index ? null : index)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: selectedCostRange === index ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Sort By</Text>
            <View style={styles.sortOptions}>
              {[
                { key: 'reputation', label: 'Reputation' },
                { key: 'cost', label: 'Lowest Cost' },
                { key: 'acceptance', label: 'Acceptance Rate' },
              ].map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.sortOption,
                    {
                      backgroundColor: sortBy === option.key ? colors.primary : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setSortBy(option.key as typeof sortBy)}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      { color: sortBy === option.key ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {hasActiveFilters && (
            <TouchableOpacity
              style={[styles.clearFiltersButton, { borderColor: colors.error }]}
              onPress={clearFilters}
            >
              <X size={14} color={colors.error} />
              <Text style={[styles.clearFiltersText, { color: colors.error }]}>Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
          {filteredSchools.length} school{filteredSchools.length !== 1 ? 's' : ''} found
        </Text>
        <Text style={[styles.creditScoreInfo, { color: colors.textSecondary }]}>
          Your Credit: {creditScore}
        </Text>
      </View>

      <ScrollView
        style={styles.schoolsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.schoolsListContent}
      >
        {filteredSchools.map(renderSchoolCard)}
        {filteredSchools.length === 0 && (
          <View style={styles.emptyState}>
            <GraduationCap size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Schools Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Try adjusting your filters or search query
            </Text>
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersPanel: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sortOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  sortOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsCount: {
    fontSize: 13,
  },
  creditScoreInfo: {
    fontSize: 12,
  },
  schoolsList: {
    flex: 1,
  },
  schoolsListContent: {
    paddingBottom: 20,
  },
  schoolCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  schoolImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  schoolContent: {
    flex: 1,
    marginLeft: 12,
  },
  schoolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  schoolTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  schoolName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
    marginTop: 2,
  },
  onlineBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  schoolMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  schoolStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statText: {
    fontSize: 12,
  },
  schoolFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  creditBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  creditBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  chevron: {
    alignSelf: 'center',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
