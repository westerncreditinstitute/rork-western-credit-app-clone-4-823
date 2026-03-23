import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Building2,
  MapPin,
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
  Check,
  ChevronRight,
  Briefcase,
  Target,
  Clock,
  Shield,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  BusinessCategoryData,
  BusinessStartupRequest,
  formatCurrency,
  formatRiskLevel,
  getRiskLevelColor,
  POOL_CONSTRAINTS,
} from '@/types/business';
import { Button, Card } from '@/components/ui';

interface BusinessCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onBusinessCreated?: (businessId: string) => void;
  initialCategory?: BusinessCategoryData | null;
  availableFunds?: number;
  userCreditScore?: number;
}

type Step = 'category' | 'details' | 'funding' | 'review';

export default function BusinessCreationModal({
  visible,
  onClose,
  onBusinessCreated,
  initialCategory,
  availableFunds = 50000,
  userCreditScore = 700,
}: BusinessCreationModalProps) {
  const { colors } = useTheme();
  const { categories, featuredCategories, createBusiness, validateBusinessQualifications } = useBusiness();
  const auth = useAuth();
  const userId = auth?.user?.id || 'anonymous';

  const [currentStep, setCurrentStep] = useState<Step>(initialCategory ? 'details' : 'category');
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategoryData | null>(initialCategory || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    businessName: '',
    location: '',
    startupCost: '',
    usePersonalFunds: true,
    createInvestmentPool: false,
    poolMinInvestment: POOL_CONSTRAINTS.defaultMinInvestment.toString(),
    poolMaxInvestors: POOL_CONSTRAINTS.defaultMaxInvestors.toString(),
    businessPlan: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = useCallback(() => {
    setCurrentStep(initialCategory ? 'details' : 'category');
    setSelectedCategory(initialCategory || null);
    setFormData({
      businessName: '',
      location: '',
      startupCost: '',
      usePersonalFunds: true,
      createInvestmentPool: false,
      poolMinInvestment: POOL_CONSTRAINTS.defaultMinInvestment.toString(),
      poolMaxInvestors: POOL_CONSTRAINTS.defaultMaxInvestors.toString(),
      businessPlan: '',
    });
    setErrors({});
  }, [initialCategory]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const validation = useMemo(() => {
    if (!selectedCategory) return { eligible: false, reasons: ['Select a category'] };
    return validateBusinessQualifications(selectedCategory.id, userCreditScore);
  }, [selectedCategory, userCreditScore, validateBusinessQualifications]);

  const validateStep = useCallback((step: Step): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 'details') {
      if (!formData.businessName.trim()) {
        newErrors.businessName = 'Business name is required';
      }
      if (!formData.location.trim()) {
        newErrors.location = 'Location is required';
      }
    }

    if (step === 'funding') {
      const cost = parseFloat(formData.startupCost.replace(/,/g, ''));
      if (isNaN(cost) || cost <= 0) {
        newErrors.startupCost = 'Enter a valid startup cost';
      } else if (selectedCategory) {
        if (cost < selectedCategory.minStartupCost) {
          newErrors.startupCost = `Minimum is ${formatCurrency(selectedCategory.minStartupCost)}`;
        } else if (cost > selectedCategory.maxStartupCost) {
          newErrors.startupCost = `Maximum is ${formatCurrency(selectedCategory.maxStartupCost)}`;
        }
      }

      if (formData.createInvestmentPool) {
        const minInv = parseFloat(formData.poolMinInvestment.replace(/,/g, ''));
        if (isNaN(minInv) || minInv < POOL_CONSTRAINTS.minInvestment) {
          newErrors.poolMinInvestment = `Minimum is ${formatCurrency(POOL_CONSTRAINTS.minInvestment)}`;
        }
        const maxInv = parseInt(formData.poolMaxInvestors, 10);
        if (isNaN(maxInv) || maxInv < 2 || maxInv > 20) {
          newErrors.poolMaxInvestors = 'Must be between 2-20 investors';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, selectedCategory]);

  const handleNext = useCallback(() => {
    if (currentStep === 'category' && selectedCategory) {
      if (!validation.eligible) {
        Alert.alert('Not Eligible', validation.reasons[0]);
        return;
      }
      setCurrentStep('details');
    } else if (currentStep === 'details' && validateStep('details')) {
      setCurrentStep('funding');
    } else if (currentStep === 'funding' && validateStep('funding')) {
      setCurrentStep('review');
    }
  }, [currentStep, selectedCategory, validation, validateStep]);

  const handleBack = useCallback(() => {
    if (currentStep === 'details') setCurrentStep('category');
    else if (currentStep === 'funding') setCurrentStep('details');
    else if (currentStep === 'review') setCurrentStep('funding');
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    if (!selectedCategory || isSubmitting) return;

    setIsSubmitting(true);
    const startupCost = parseFloat(formData.startupCost.replace(/,/g, ''));

    const request: BusinessStartupRequest = {
      userId,
      categoryId: selectedCategory.id,
      businessName: formData.businessName.trim(),
      businessType: selectedCategory.name,
      location: formData.location.trim(),
      startupCost,
      fundingGoal: formData.createInvestmentPool ? startupCost : 0,
      usePersonalFunds: formData.usePersonalFunds,
      createInvestmentPool: formData.createInvestmentPool,
      poolMinInvestment: parseFloat(formData.poolMinInvestment.replace(/,/g, '')) || POOL_CONSTRAINTS.defaultMinInvestment,
      poolMaxInvestors: parseInt(formData.poolMaxInvestors, 10) || POOL_CONSTRAINTS.defaultMaxInvestors,
      businessPlan: formData.businessPlan.trim(),
    };

    try {
      const result = await createBusiness(request, availableFunds, userCreditScore);
      
      if (result.success && result.data) {
        console.log('[BusinessCreationModal] Business created:', result.data.id);
        onBusinessCreated?.(result.data.id);
        handleClose();
        Alert.alert('Success!', `${formData.businessName} has been created successfully!`);
      } else {
        Alert.alert('Error', result.error || 'Failed to create business');
      }
    } catch (error) {
      console.error('[BusinessCreationModal] Error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCategory, formData, userId, availableFunds, userCreditScore, createBusiness, onBusinessCreated, handleClose, isSubmitting]);

  const styles = createStyles(colors);

  const renderCategoryStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Choose Your Business Type</Text>
      <Text style={styles.stepSubtitle}>Select a category that matches your entrepreneurial goals</Text>

      {featuredCategories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Categories</Text>
          {featuredCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryCard,
                selectedCategory?.id === cat.id && styles.categoryCardSelected,
              ]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.7}
            >
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Building2 size={24} color={colors.primary} />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <Text style={styles.categoryType}>{cat.categoryType}</Text>
                </View>
                {selectedCategory?.id === cat.id && (
                  <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                    <Check size={16} color={colors.white} />
                  </View>
                )}
              </View>
              <Text style={styles.categoryDesc} numberOfLines={2}>{cat.description}</Text>
              <View style={styles.categoryStats}>
                <View style={styles.categoryStat}>
                  <DollarSign size={14} color={colors.textSecondary} />
                  <Text style={styles.categoryStatText}>
                    {formatCurrency(cat.minStartupCost)} - {formatCurrency(cat.maxStartupCost)}
                  </Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: getRiskLevelColor(cat.riskLevel) + '20' }]}>
                  <Text style={[styles.riskBadgeText, { color: getRiskLevelColor(cat.riskLevel) }]}>
                    {formatRiskLevel(cat.riskLevel)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Categories</Text>
        {categories.filter(c => !c.isFeatured).map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryCardCompact,
              selectedCategory?.id === cat.id && styles.categoryCardSelected,
            ]}
            onPress={() => setSelectedCategory(cat)}
            activeOpacity={0.7}
          >
            <View style={[styles.categoryIconSmall, { backgroundColor: colors.surfaceAlt }]}>
              <Building2 size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.categoryInfoCompact}>
              <Text style={styles.categoryNameCompact}>{cat.name}</Text>
              <Text style={styles.categoryStatText}>
                {formatCurrency(cat.minStartupCost)} - {formatCurrency(cat.maxStartupCost)}
              </Text>
            </View>
            <View style={[styles.riskDot, { backgroundColor: getRiskLevelColor(cat.riskLevel) }]} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderDetailsStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Business Details</Text>
      <Text style={styles.stepSubtitle}>Tell us about your new {selectedCategory?.name}</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Business Name</Text>
        <View style={[styles.inputContainer, errors.businessName && styles.inputError]}>
          <Briefcase size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.input}
            value={formData.businessName}
            onChangeText={(text) => setFormData(prev => ({ ...prev, businessName: text }))}
            placeholder="Enter business name"
            placeholderTextColor={colors.textLight}
          />
        </View>
        {errors.businessName && <Text style={styles.errorText}>{errors.businessName}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Location</Text>
        <View style={[styles.inputContainer, errors.location && styles.inputError]}>
          <MapPin size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.input}
            value={formData.location}
            onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
            placeholder="City, State"
            placeholderTextColor={colors.textLight}
          />
        </View>
        {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Business Plan (Optional)</Text>
        <View style={styles.textAreaContainer}>
          <TextInput
            style={styles.textArea}
            value={formData.businessPlan}
            onChangeText={(text) => setFormData(prev => ({ ...prev, businessPlan: text }))}
            placeholder="Describe your business vision and strategy..."
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </View>

      {selectedCategory && (
        <Card variant="outlined" padding="md" style={styles.requirementsCard}>
          <Text style={styles.requirementsTitle}>Requirements</Text>
          <View style={styles.requirementRow}>
            <Shield size={16} color={validation.eligible ? colors.success : colors.error} />
            <Text style={[styles.requirementText, { color: validation.eligible ? colors.success : colors.error }]}>
              Min Credit Score: {selectedCategory.minCreditScore} (You: {userCreditScore})
            </Text>
          </View>
          <View style={styles.requirementRow}>
            <Clock size={16} color={colors.textSecondary} />
            <Text style={styles.requirementText}>
              Est. Time to Profit: {selectedCategory.timeToProfitabilityMonths} months
            </Text>
          </View>
        </Card>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderFundingStep = () => {
    const startupCost = parseFloat(formData.startupCost.replace(/,/g, '')) || 0;
    const canAfford = startupCost <= availableFunds;

    return (
      <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>Funding Strategy</Text>
        <Text style={styles.stepSubtitle}>Choose how to fund your business</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Startup Cost</Text>
          <View style={[styles.inputContainer, errors.startupCost && styles.inputError]}>
            <DollarSign size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              value={formData.startupCost}
              onChangeText={(text) => setFormData(prev => ({ ...prev, startupCost: text.replace(/[^0-9]/g, '') }))}
              placeholder="50,000"
              placeholderTextColor={colors.textLight}
              keyboardType="number-pad"
            />
          </View>
          {errors.startupCost && <Text style={styles.errorText}>{errors.startupCost}</Text>}
          {selectedCategory && (
            <Text style={styles.hintText}>
              Range: {formatCurrency(selectedCategory.minStartupCost)} - {formatCurrency(selectedCategory.maxStartupCost)}
            </Text>
          )}
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your Available Funds</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(availableFunds)}</Text>
        </View>

        <View style={styles.fundingOptions}>
          <TouchableOpacity
            style={[styles.fundingOption, formData.usePersonalFunds && styles.fundingOptionSelected]}
            onPress={() => setFormData(prev => ({ ...prev, usePersonalFunds: true, createInvestmentPool: false }))}
          >
            <View style={[styles.fundingOptionIcon, { backgroundColor: colors.success + '20' }]}>
              <DollarSign size={24} color={colors.success} />
            </View>
            <Text style={styles.fundingOptionTitle}>Personal Funds</Text>
            <Text style={styles.fundingOptionDesc}>Use your own capital</Text>
            {formData.usePersonalFunds && (
              <View style={[styles.checkmarkSmall, { backgroundColor: colors.success }]}>
                <Check size={12} color={colors.white} />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fundingOption, formData.createInvestmentPool && styles.fundingOptionSelected]}
            onPress={() => setFormData(prev => ({ ...prev, usePersonalFunds: false, createInvestmentPool: true }))}
          >
            <View style={[styles.fundingOptionIcon, { backgroundColor: colors.info + '20' }]}>
              <Users size={24} color={colors.info} />
            </View>
            <Text style={styles.fundingOptionTitle}>Investment Pool</Text>
            <Text style={styles.fundingOptionDesc}>Raise funds from investors</Text>
            {formData.createInvestmentPool && (
              <View style={[styles.checkmarkSmall, { backgroundColor: colors.info }]}>
                <Check size={12} color={colors.white} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {formData.createInvestmentPool && (
          <View style={styles.poolSettings}>
            <Text style={styles.poolSettingsTitle}>Pool Settings</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Minimum Investment</Text>
              <View style={[styles.inputContainer, errors.poolMinInvestment && styles.inputError]}>
                <DollarSign size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={formData.poolMinInvestment}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, poolMinInvestment: text.replace(/[^0-9]/g, '') }))}
                  placeholder="500"
                  placeholderTextColor={colors.textLight}
                  keyboardType="number-pad"
                />
              </View>
              {errors.poolMinInvestment && <Text style={styles.errorText}>{errors.poolMinInvestment}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Max Investors</Text>
              <View style={[styles.inputContainer, errors.poolMaxInvestors && styles.inputError]}>
                <Users size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={formData.poolMaxInvestors}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, poolMaxInvestors: text.replace(/[^0-9]/g, '') }))}
                  placeholder="10"
                  placeholderTextColor={colors.textLight}
                  keyboardType="number-pad"
                />
              </View>
              {errors.poolMaxInvestors && <Text style={styles.errorText}>{errors.poolMaxInvestors}</Text>}
            </View>
          </View>
        )}

        {!canAfford && formData.usePersonalFunds && startupCost > 0 && (
          <View style={styles.warningCard}>
            <AlertTriangle size={20} color={colors.warning} />
            <Text style={styles.warningText}>
              Insufficient funds. Consider creating an investment pool or reducing startup cost.
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  const renderReviewStep = () => {
    const startupCost = parseFloat(formData.startupCost.replace(/,/g, '')) || 0;

    return (
      <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>Review & Create</Text>
        <Text style={styles.stepSubtitle}>Confirm your business details</Text>

        <Card variant="elevated" padding="lg" style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={[styles.reviewIcon, { backgroundColor: colors.primary + '20' }]}>
              <Building2 size={32} color={colors.primary} />
            </View>
            <View style={styles.reviewHeaderInfo}>
              <Text style={styles.reviewBusinessName}>{formData.businessName}</Text>
              <Text style={styles.reviewCategory}>{selectedCategory?.name}</Text>
            </View>
          </View>

          <View style={styles.reviewDivider} />

          <View style={styles.reviewItem}>
            <MapPin size={18} color={colors.textSecondary} />
            <Text style={styles.reviewLabel}>Location</Text>
            <Text style={styles.reviewValue}>{formData.location}</Text>
          </View>

          <View style={styles.reviewItem}>
            <DollarSign size={18} color={colors.textSecondary} />
            <Text style={styles.reviewLabel}>Startup Cost</Text>
            <Text style={styles.reviewValue}>{formatCurrency(startupCost)}</Text>
          </View>

          <View style={styles.reviewItem}>
            <Target size={18} color={colors.textSecondary} />
            <Text style={styles.reviewLabel}>Funding Method</Text>
            <Text style={styles.reviewValue}>
              {formData.createInvestmentPool ? 'Investment Pool' : 'Personal Funds'}
            </Text>
          </View>

          {formData.createInvestmentPool && (
            <>
              <View style={styles.reviewItem}>
                <DollarSign size={18} color={colors.textSecondary} />
                <Text style={styles.reviewLabel}>Min Investment</Text>
                <Text style={styles.reviewValue}>{formatCurrency(parseFloat(formData.poolMinInvestment) || 500)}</Text>
              </View>
              <View style={styles.reviewItem}>
                <Users size={18} color={colors.textSecondary} />
                <Text style={styles.reviewLabel}>Max Investors</Text>
                <Text style={styles.reviewValue}>{formData.poolMaxInvestors}</Text>
              </View>
            </>
          )}

          <View style={styles.reviewItem}>
            <TrendingUp size={18} color={colors.textSecondary} />
            <Text style={styles.reviewLabel}>Est. Profit Time</Text>
            <Text style={styles.reviewValue}>{selectedCategory?.timeToProfitabilityMonths} months</Text>
          </View>
        </Card>

        {formData.businessPlan && (
          <Card variant="outlined" padding="md" style={styles.planCard}>
            <Text style={styles.planTitle}>Business Plan</Text>
            <Text style={styles.planText}>{formData.businessPlan}</Text>
          </Card>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  const renderStepIndicator = () => {
    const steps: Step[] = ['category', 'details', 'funding', 'review'];
    const currentIndex = steps.indexOf(currentStep);

    return (
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <View style={[
              styles.stepDot,
              index <= currentIndex && { backgroundColor: colors.primary },
            ]} />
            {index < steps.length - 1 && (
              <View style={[
                styles.stepLine,
                index < currentIndex && { backgroundColor: colors.primary },
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Start a Business</Text>
          <View style={styles.closeButton} />
        </View>

        {renderStepIndicator()}

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {currentStep === 'category' && renderCategoryStep()}
          {currentStep === 'details' && renderDetailsStep()}
          {currentStep === 'funding' && renderFundingStep()}
          {currentStep === 'review' && renderReviewStep()}
        </KeyboardAvoidingView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {currentStep !== 'category' && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>Back</Text>
            </TouchableOpacity>
          )}
          
          {currentStep === 'review' ? (
            <Button
              title={isSubmitting ? 'Creating...' : 'Create Business'}
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              loading={isSubmitting}
              disabled={isSubmitting}
              style={styles.nextButton}
            />
          ) : (
            <TouchableOpacity
              style={[
                styles.nextButtonPrimary,
                { backgroundColor: colors.primary },
                (currentStep === 'category' && !selectedCategory) && styles.buttonDisabled,
              ]}
              onPress={handleNext}
              disabled={currentStep === 'category' && !selectedCategory}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <ChevronRight size={20} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 12,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  categoryType: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'capitalize' as const,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  categoryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryStatText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  categoryCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfoCompact: {
    flex: 1,
    marginLeft: 12,
  },
  categoryNameCompact: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.text,
    marginBottom: 2,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  inputError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 14,
  },
  textAreaContainer: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  textArea: {
    fontSize: 16,
    color: colors.text,
    minHeight: 100,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 6,
  },
  hintText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  requirementsCard: {
    marginTop: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 12,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  balanceCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: colors.primary,
  },
  fundingOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  fundingOption: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fundingOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  fundingOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  fundingOptionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  fundingOptionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center' as const,
  },
  checkmarkSmall: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poolSettings: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  poolSettingsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 16,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '15',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  reviewCard: {
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewHeaderInfo: {
    flex: 1,
    marginLeft: 16,
  },
  reviewBusinessName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 4,
  },
  reviewCategory: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  reviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  reviewLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 12,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
  planCard: {
    marginBottom: 16,
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 8,
  },
  planText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  nextButton: {
    flex: 1,
  },
  nextButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
