import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Platform,
  Switch,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  Building2,
  Store,
  Briefcase,
  TrendingUp,
  DollarSign,
  Clock,
  Shield,
  Users,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Star,
  Search,
  X,
  Zap,
  Target,
  MapPin,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { BusinessCategoryData, BusinessStartupRequest } from '@/types/business';
import { getRiskColor, getRiskLabel, formatCurrency } from '@/mocks/businessCategories';
import * as Haptics from 'expo-haptics';

const getCategoryIcon = (categoryType: string, color: string) => {
  const size = 24;
  switch (categoryType) {
    case 'retail': return <Store size={size} color={color} />;
    case 'service': return <Briefcase size={size} color={color} />;
    case 'manufacturing': return <Building2 size={size} color={color} />;
    case 'professional': return <Briefcase size={size} color={color} />;
    case 'technology': return <Zap size={size} color={color} />;
    case 'medical': return <Shield size={size} color={color} />;
    case 'financial': return <TrendingUp size={size} color={color} />;
    case 'real_estate': return <Building2 size={size} color={color} />;
    default: return <Building2 size={size} color={color} />;
  }
};

interface CategoryCardProps {
  category: BusinessCategoryData;
  isSelected: boolean;
  onSelect: () => void;
  userCreditScore: number;
}

const CategoryCard = ({ category, isSelected, onSelect, userCreditScore }: CategoryCardProps) => {
  const { colors } = useTheme();
  const meetsRequirements = userCreditScore >= category.minCreditScore;
  const riskColor = getRiskColor(category.riskLevel);

  return (
    <TouchableOpacity
      style={[
        styles.categoryCard,
        { 
          backgroundColor: colors.surface,
          borderColor: isSelected ? colors.primary : 'transparent',
          borderWidth: isSelected ? 2 : 0,
          opacity: meetsRequirements ? 1 : 0.6,
        }
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.categoryCardHeader}>
        <View style={[styles.categoryIconContainer, { backgroundColor: riskColor + '20' }]}>
          {getCategoryIcon(category.categoryType, riskColor)}
        </View>
        <View style={styles.categoryBadges}>
          {category.isFeatured && (
            <View style={[styles.featuredBadge, { backgroundColor: '#F59E0B20' }]}>
              <Star size={10} color="#F59E0B" />
              <Text style={styles.featuredBadgeText}>Featured</Text>
            </View>
          )}
          <View style={[styles.riskBadge, { backgroundColor: riskColor + '20' }]}>
            <Text style={[styles.riskBadgeText, { color: riskColor }]}>
              {getRiskLabel(category.riskLevel)}
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>
        {category.name}
      </Text>
      <Text style={[styles.categoryDescription, { color: colors.textSecondary }]} numberOfLines={2}>
        {category.description}
      </Text>

      <View style={styles.categoryStats}>
        <View style={styles.categoryStat}>
          <DollarSign size={12} color={colors.textSecondary} />
          <Text style={[styles.categoryStatText, { color: colors.textSecondary }]}>
            {formatCurrency(category.minStartupCost)} - {formatCurrency(category.maxStartupCost)}
          </Text>
        </View>
        <View style={styles.categoryStat}>
          <TrendingUp size={12} color="#10B981" />
          <Text style={[styles.categoryStatText, { color: '#10B981' }]}>
            ~{formatCurrency(category.avgMonthlyRevenue)}/mo
          </Text>
        </View>
      </View>

      <View style={styles.categoryRequirements}>
        <View style={[
          styles.requirementBadge, 
          { backgroundColor: meetsRequirements ? '#10B98120' : '#EF444420' }
        ]}>
          {meetsRequirements ? (
            <CheckCircle size={12} color="#10B981" />
          ) : (
            <AlertCircle size={12} color="#EF4444" />
          )}
          <Text style={[
            styles.requirementText, 
            { color: meetsRequirements ? '#10B981' : '#EF4444' }
          ]}>
            {category.minCreditScore} credit score
          </Text>
        </View>
        <View style={styles.requirementBadge}>
          <Clock size={12} color={colors.textSecondary} />
          <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
            {category.timeToProfitabilityMonths}mo to profit
          </Text>
        </View>
      </View>

      {isSelected && (
        <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]}>
          <CheckCircle size={16} color="#FFF" />
        </View>
      )}
    </TouchableOpacity>
  );
};

export default function StartBusinessScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { gameState, updateBalance } = useGame();
  const { 
    categories, 
    featuredCategories, 
    createBusiness, 
    validateBusinessQualifications 
  } = useBusiness();

  const [selectedCategory, setSelectedCategory] = useState<BusinessCategoryData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    businessName: '',
    location: '',
    startupCost: '',
    usePersonalFunds: true,
    createInvestmentPool: false,
    poolMinInvestment: '500',
    poolMaxInvestors: '10',
    businessPlan: '',
  });

  const userCreditScore = gameState.creditScores?.composite || 650;
  const availableFunds = gameState.bankBalance + gameState.savingsBalance;

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    const query = searchQuery.toLowerCase();
    return categories.filter(
      c => c.name.toLowerCase().includes(query) || 
           c.description.toLowerCase().includes(query) ||
           c.categoryType.toLowerCase().includes(query)
    );
  }, [categories, searchQuery]);

  const handleCategorySelect = useCallback((category: BusinessCategoryData) => {
    setSelectedCategory(category);
    setFormData(prev => ({
      ...prev,
      startupCost: category.minStartupCost.toString(),
    }));
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleContinue = useCallback(() => {
    if (!selectedCategory) {
      Alert.alert('Select Category', 'Please select a business category first.');
      return;
    }

    const validation = validateBusinessQualifications(
      selectedCategory.id,
      userCreditScore
    );

    if (!validation.eligible) {
      Alert.alert('Not Eligible', validation.reasons.join('\n'));
      return;
    }

    setShowFormModal(true);
  }, [selectedCategory, validateBusinessQualifications, userCreditScore]);

  const validateForm = useCallback((): boolean => {
    if (!formData.businessName.trim()) {
      Alert.alert('Required', 'Please enter a business name.');
      return false;
    }
    if (!formData.location.trim()) {
      Alert.alert('Required', 'Please enter a location.');
      return false;
    }

    const startupCost = parseFloat(formData.startupCost.replace(/,/g, ''));
    if (isNaN(startupCost) || startupCost <= 0) {
      Alert.alert('Invalid', 'Please enter a valid startup cost.');
      return false;
    }

    if (selectedCategory) {
      if (startupCost < selectedCategory.minStartupCost) {
        Alert.alert('Too Low', `Minimum startup cost is ${formatCurrency(selectedCategory.minStartupCost)}`);
        return false;
      }
      if (startupCost > selectedCategory.maxStartupCost) {
        Alert.alert('Too High', `Maximum startup cost is ${formatCurrency(selectedCategory.maxStartupCost)}`);
        return false;
      }
    }

    if (formData.usePersonalFunds && startupCost > availableFunds && !formData.createInvestmentPool) {
      Alert.alert('Insufficient Funds', `You need ${formatCurrency(startupCost)} but only have ${formatCurrency(availableFunds)} available. Consider creating an investment pool.`);
      return false;
    }

    return true;
  }, [formData, selectedCategory, availableFunds]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm() || !selectedCategory) return;

    setIsSubmitting(true);

    try {
      const startupCost = parseFloat(formData.startupCost.replace(/,/g, ''));
      const poolMinInvestment = parseFloat(formData.poolMinInvestment.replace(/,/g, '')) || 500;
      const poolMaxInvestors = parseInt(formData.poolMaxInvestors, 10) || 10;

      const request: BusinessStartupRequest = {
        userId: gameState.playerId,
        categoryId: selectedCategory.id,
        businessName: formData.businessName.trim(),
        businessType: selectedCategory.name,
        location: formData.location.trim(),
        startupCost,
        fundingGoal: startupCost,
        usePersonalFunds: formData.usePersonalFunds,
        createInvestmentPool: formData.createInvestmentPool,
        poolMinInvestment,
        poolMaxInvestors,
        businessPlan: formData.businessPlan.trim(),
      };

      const result = await createBusiness(request, availableFunds, userCreditScore);

      if (result.success && result.data) {
        if (formData.usePersonalFunds) {
          const deduction = Math.min(startupCost, availableFunds);
          if (deduction <= gameState.bankBalance) {
            updateBalance(-deduction, 'bank');
          } else {
            const fromBank = gameState.bankBalance;
            const fromSavings = deduction - fromBank;
            updateBalance(-fromBank, 'bank');
            updateBalance(-fromSavings, 'savings');
          }
        }

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        Alert.alert(
          'Business Created!',
          `Congratulations! "${result.data.businessName}" has been created successfully!${
            formData.createInvestmentPool 
              ? '\n\nAn investment pool has been created for other players to invest in your business.'
              : ''
          }`,
          [
            {
              text: 'View Dashboard',
              onPress: () => {
                setShowFormModal(false);
                router.push(`/game/business-dashboard?id=${result.data?.id}` as any);
              },
            },
            {
              text: 'Done',
              onPress: () => {
                setShowFormModal(false);
                router.back();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create business. Please try again.');
      }
    } catch (error) {
      console.error('[StartBusiness] Error:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, selectedCategory, formData, gameState, createBusiness, availableFunds, userCreditScore, updateBalance, router]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Start A Business',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Available Funds</Text>
              <Text style={[styles.statValue, { color: '#10B981' }]}>
                {formatCurrency(availableFunds)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Credit Score</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {userCreditScore}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={[styles.searchInput, { backgroundColor: colors.surface }]}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchTextInput, { color: colors.text }]}
              placeholder="Search business categories..."
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {!searchQuery && featuredCategories.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Star size={18} color="#F59E0B" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Markets</Text>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredList}
              >
                {featuredCategories.map(category => (
                  <View key={category.id} style={styles.featuredCardWrapper}>
                    <CategoryCard
                      category={category}
                      isSelected={selectedCategory?.id === category.id}
                      onSelect={() => handleCategorySelect(category)}
                      userCreditScore={userCreditScore}
                    />
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          <View style={styles.sectionHeader}>
            <Building2 size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {searchQuery ? 'Search Results' : 'All Categories'}
            </Text>
            <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
              {filteredCategories.length}
            </Text>
          </View>

          <View style={styles.categoriesGrid}>
            {filteredCategories.map(category => (
              <CategoryCard
                key={category.id}
                category={category}
                isSelected={selectedCategory?.id === category.id}
                onSelect={() => handleCategorySelect(category)}
                userCreditScore={userCreditScore}
              />
            ))}
          </View>

          {filteredCategories.length === 0 && (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <AlertCircle size={48} color={colors.textLight} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Categories Found</Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Try adjusting your search terms.
              </Text>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        {selectedCategory && (
          <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
            <View style={styles.selectedInfo}>
              <Text style={[styles.selectedLabel, { color: colors.textSecondary }]}>Selected</Text>
              <Text style={[styles.selectedName, { color: colors.text }]} numberOfLines={1}>
                {selectedCategory.name}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: colors.primary }]}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
              <ChevronRight size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

        <Modal visible={showFormModal} animationType="slide" transparent>
          <KeyboardAvoidingView 
            style={styles.modalOverlay} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={[styles.formModalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Business Details</Text>
                <TouchableOpacity onPress={() => setShowFormModal(false)}>
                  <X size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedCategory && (
                  <View style={[styles.selectedCategoryBanner, { backgroundColor: getRiskColor(selectedCategory.riskLevel) + '15' }]}>
                    <View style={[styles.bannerIcon, { backgroundColor: getRiskColor(selectedCategory.riskLevel) + '30' }]}>
                      {getCategoryIcon(selectedCategory.categoryType, getRiskColor(selectedCategory.riskLevel))}
                    </View>
                    <View style={styles.bannerInfo}>
                      <Text style={[styles.bannerName, { color: colors.text }]}>{selectedCategory.name}</Text>
                      <Text style={[styles.bannerCost, { color: colors.textSecondary }]}>
                        {formatCurrency(selectedCategory.minStartupCost)} - {formatCurrency(selectedCategory.maxStartupCost)}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Business Name *</Text>
                  <View style={[styles.formInput, { backgroundColor: colors.surfaceAlt }]}>
                    <Building2 size={18} color={colors.textSecondary} />
                    <TextInput
                      style={[styles.formTextInput, { color: colors.text }]}
                      placeholder="Enter business name"
                      placeholderTextColor={colors.textLight}
                      value={formData.businessName}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, businessName: text }))}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Location *</Text>
                  <View style={[styles.formInput, { backgroundColor: colors.surfaceAlt }]}>
                    <MapPin size={18} color={colors.textSecondary} />
                    <TextInput
                      style={[styles.formTextInput, { color: colors.text }]}
                      placeholder="City, State"
                      placeholderTextColor={colors.textLight}
                      value={formData.location}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Startup Cost *</Text>
                  <View style={[styles.formInput, { backgroundColor: colors.surfaceAlt }]}>
                    <DollarSign size={18} color={colors.textSecondary} />
                    <TextInput
                      style={[styles.formTextInput, { color: colors.text }]}
                      placeholder="Enter amount"
                      placeholderTextColor={colors.textLight}
                      value={formData.startupCost}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, startupCost: text.replace(/[^0-9]/g, '') }))}
                      keyboardType="numeric"
                    />
                  </View>
                  {selectedCategory && (
                    <Text style={[styles.formHint, { color: colors.textSecondary }]}>
                      Range: {formatCurrency(selectedCategory.minStartupCost)} - {formatCurrency(selectedCategory.maxStartupCost)}
                    </Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchInfo}>
                      <Text style={[styles.formLabel, { color: colors.text }]}>Use Personal Funds</Text>
                      <Text style={[styles.switchHint, { color: colors.textSecondary }]}>
                        Available: {formatCurrency(availableFunds)}
                      </Text>
                    </View>
                    <Switch
                      value={formData.usePersonalFunds}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, usePersonalFunds: value }))}
                      trackColor={{ false: colors.surfaceAlt, true: colors.primary + '60' }}
                      thumbColor={formData.usePersonalFunds ? colors.primary : colors.textLight}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchInfo}>
                      <Text style={[styles.formLabel, { color: colors.text }]}>Create Investment Pool</Text>
                      <Text style={[styles.switchHint, { color: colors.textSecondary }]}>
                        Let others invest in your business
                      </Text>
                    </View>
                    <Switch
                      value={formData.createInvestmentPool}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, createInvestmentPool: value }))}
                      trackColor={{ false: colors.surfaceAlt, true: colors.primary + '60' }}
                      thumbColor={formData.createInvestmentPool ? colors.primary : colors.textLight}
                    />
                  </View>
                </View>

                {formData.createInvestmentPool && (
                  <View style={[styles.poolSettings, { backgroundColor: colors.surfaceAlt }]}>
                    <View style={styles.poolSettingsHeader}>
                      <Users size={16} color={colors.primary} />
                      <Text style={[styles.poolSettingsTitle, { color: colors.text }]}>Pool Settings</Text>
                    </View>
                    <View style={styles.poolSettingsRow}>
                      <View style={styles.poolSettingItem}>
                        <Text style={[styles.poolSettingLabel, { color: colors.textSecondary }]}>Min Investment</Text>
                        <View style={[styles.poolInput, { backgroundColor: colors.surface }]}>
                          <Text style={[styles.poolInputPrefix, { color: colors.textSecondary }]}>$</Text>
                          <TextInput
                            style={[styles.poolInputText, { color: colors.text }]}
                            value={formData.poolMinInvestment}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, poolMinInvestment: text.replace(/[^0-9]/g, '') }))}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                      <View style={styles.poolSettingItem}>
                        <Text style={[styles.poolSettingLabel, { color: colors.textSecondary }]}>Max Investors</Text>
                        <View style={[styles.poolInput, { backgroundColor: colors.surface }]}>
                          <TextInput
                            style={[styles.poolInputText, { color: colors.text }]}
                            value={formData.poolMaxInvestors}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, poolMaxInvestors: text.replace(/[^0-9]/g, '') }))}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Business Plan (Optional)</Text>
                  <View style={[styles.formTextArea, { backgroundColor: colors.surfaceAlt }]}>
                    <TextInput
                      style={[styles.textAreaInput, { color: colors.text }]}
                      placeholder="Describe your business strategy..."
                      placeholderTextColor={colors.textLight}
                      value={formData.businessPlan}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, businessPlan: text }))}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    { backgroundColor: isSubmitting ? colors.surfaceAlt : colors.primary }
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Text style={[styles.submitButtonText, { color: colors.textSecondary }]}>Creating...</Text>
                  ) : (
                    <>
                      <Target size={18} color="#FFF" />
                      <Text style={styles.submitButtonText}>Create Business</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.formBottomPadding} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 15,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  featuredList: {
    paddingRight: 16,
    gap: 12,
  },
  featuredCardWrapper: {
    width: 280,
  },
  categoriesGrid: {
    gap: 12,
  },
  categoryCard: {
    padding: 16,
    borderRadius: 16,
    position: 'relative',
  },
  categoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F59E0B',
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  categoryStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  categoryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryStatText: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryRequirements: {
    flexDirection: 'row',
    gap: 8,
  },
  requirementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    backgroundColor: '#F3F4F620',
  },
  requirementText: {
    fontSize: 11,
    fontWeight: '500',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 100,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 32,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  selectedName: {
    fontSize: 16,
    fontWeight: '700',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  formModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  selectedCategoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    gap: 12,
  },
  bannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerInfo: {
    flex: 1,
  },
  bannerName: {
    fontSize: 16,
    fontWeight: '700',
  },
  bannerCost: {
    fontSize: 13,
    marginTop: 2,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  formTextInput: {
    flex: 1,
    fontSize: 15,
  },
  formHint: {
    fontSize: 12,
    marginTop: 6,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchInfo: {
    flex: 1,
  },
  switchHint: {
    fontSize: 12,
    marginTop: 2,
  },
  poolSettings: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  poolSettingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  poolSettingsTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  poolSettingsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  poolSettingItem: {
    flex: 1,
  },
  poolSettingLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  poolInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  poolInputPrefix: {
    fontSize: 14,
    marginRight: 4,
  },
  poolInputText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  formTextArea: {
    borderRadius: 12,
    padding: 14,
    minHeight: 100,
  },
  textAreaInput: {
    fontSize: 15,
    minHeight: 80,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  formBottomPadding: {
    height: 40,
  },
});
