import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Award,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  AlertCircle,
  FileText,
  GraduationCap,
  Wallet,
  X,
  Info,
  Users,
  Heart,
} from 'lucide-react-native';
import { FinancialAid, FinancialAidType, FinancialAidStatus } from '@/types/education';

interface AvailableAid {
  aidType: FinancialAidType;
  name: string;
  amount: number;
  amountPerSemester: number;
  description: string;
  requirements: {
    type: string;
    description: string;
    value?: number;
    isMet: boolean;
  }[];
  isRenewable: boolean;
  renewalRequirements?: string;
  minimumGPARequired?: number;
}

interface FinancialAidPanelProps {
  availableAid: AvailableAid[];
  appliedAid: FinancialAid[];
  isEnrolled: boolean;
  currentGPA: number;
  bankBalance: number;
  onApplyForAid: (aidIndex: number) => FinancialAid | null;
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

const AID_TYPE_ICONS: Record<FinancialAidType, typeof Award> = {
  grant: Award,
  scholarship: GraduationCap,
  work_study: Users,
  fellowship: Heart,
};

const STATUS_CONFIG: Record<FinancialAidStatus, { color: string; icon: typeof CheckCircle2; label: string }> = {
  pending: { color: '#F59E0B', icon: Clock, label: 'Pending Review' },
  approved: { color: '#22C55E', icon: CheckCircle2, label: 'Approved' },
  rejected: { color: '#EF4444', icon: XCircle, label: 'Rejected' },
  disbursed: { color: '#3B82F6', icon: DollarSign, label: 'Disbursed' },
  expired: { color: '#94A3B8', icon: AlertCircle, label: 'Expired' },
};

export default function FinancialAidPanel({
  availableAid,
  appliedAid,
  isEnrolled,
  currentGPA,
  bankBalance,
  onApplyForAid,
  colors,
}: FinancialAidPanelProps) {
  const [selectedAidIndex, setSelectedAidIndex] = useState<number | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [essayText, setEssayText] = useState('');

  const totalApprovedAid = appliedAid
    .filter(a => a.status === 'approved' || a.status === 'disbursed')
    .reduce((sum, a) => sum + a.amount, 0);

  const handleOpenApplication = useCallback((index: number) => {
    if (!isEnrolled) {
      Alert.alert(
        'Enrollment Required',
        'You must be enrolled in a school to apply for financial aid.'
      );
      return;
    }
    setSelectedAidIndex(index);
    setEssayText('');
    setShowApplicationModal(true);
  }, [isEnrolled]);

  const handleSubmitApplication = useCallback(async () => {
    if (selectedAidIndex === null) return;
    
    setIsApplying(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = onApplyForAid(selectedAidIndex);
    
    setIsApplying(false);
    setShowApplicationModal(false);
    
    if (result) {
      if (result.status === 'approved') {
        Alert.alert(
          'Application Approved! 🎉',
          `Congratulations! You've been awarded ${result.name} - $${result.amount.toLocaleString()}`,
          [{ text: 'Awesome!' }]
        );
      } else {
        Alert.alert(
          'Application Submitted',
          `Your application for ${result.name} has been submitted. You will be notified of the decision.`,
          [{ text: 'OK' }]
        );
      }
    } else {
      Alert.alert(
        'Application Not Approved',
        'Unfortunately, you did not meet the requirements for this financial aid.',
        [{ text: 'OK' }]
      );
    }
  }, [selectedAidIndex, onApplyForAid]);

  const checkRequirementsMet = useCallback((aid: AvailableAid) => {
    let metCount = 0;
    const requirements = aid.requirements.map(req => {
      let isMet = false;
      
      if (req.type === 'gpa' && req.value) {
        isMet = currentGPA >= req.value;
      } else if (req.type === 'enrollment') {
        isMet = isEnrolled;
      } else {
        isMet = Math.random() > 0.3;
      }
      
      if (isMet) metCount++;
      return { ...req, isMet };
    });
    
    return {
      requirements,
      metCount,
      totalCount: requirements.length,
      allMet: metCount === requirements.length,
    };
  }, [currentGPA, isEnrolled]);

  const renderAvailableAidCard = (aid: AvailableAid, index: number) => {
    const IconComponent = AID_TYPE_ICONS[aid.aidType];
    const reqCheck = checkRequirementsMet(aid);
    const hasApplied = appliedAid.some(a => a.name === aid.name);

    return (
      <View
        key={index}
        style={[styles.aidCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.aidCardHeader}>
          <View style={[styles.aidIconContainer, { backgroundColor: colors.primary + '15' }]}>
            <IconComponent size={24} color={colors.primary} />
          </View>
          <View style={styles.aidHeaderContent}>
            <Text style={[styles.aidName, { color: colors.text }]}>{aid.name}</Text>
            <View style={styles.aidTypeBadge}>
              <Text style={[styles.aidTypeText, { color: colors.textSecondary }]}>
                {aid.aidType.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.aidAmountContainer}>
            <Text style={[styles.aidAmountLabel, { color: colors.textSecondary }]}>Award</Text>
            <Text style={[styles.aidAmount, { color: colors.primary }]}>
              ${aid.amount.toLocaleString()}
            </Text>
          </View>
        </View>

        <Text style={[styles.aidDescription, { color: colors.textSecondary }]}>
          {aid.description}
        </Text>

        <View style={[styles.requirementsSection, { backgroundColor: colors.background }]}>
          <View style={styles.requirementsHeader}>
            <Text style={[styles.requirementsTitle, { color: colors.text }]}>Requirements</Text>
            <Text style={[
              styles.requirementsMet,
              { color: reqCheck.allMet ? colors.success : colors.warning }
            ]}>
              {reqCheck.metCount}/{reqCheck.totalCount} met
            </Text>
          </View>
          
          {reqCheck.requirements.map((req, idx) => (
            <View key={idx} style={styles.requirementItem}>
              {req.isMet ? (
                <CheckCircle2 size={16} color={colors.success} />
              ) : (
                <XCircle size={16} color={colors.error} />
              )}
              <Text style={[
                styles.requirementText,
                { color: req.isMet ? colors.text : colors.textSecondary }
              ]}>
                {req.description}
              </Text>
            </View>
          ))}
        </View>

        {aid.isRenewable && (
          <View style={styles.renewableInfo}>
            <Info size={14} color={colors.textSecondary} />
            <Text style={[styles.renewableText, { color: colors.textSecondary }]}>
              Renewable: {aid.renewalRequirements}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.applyButton,
            {
              backgroundColor: hasApplied
                ? colors.textSecondary + '20'
                : reqCheck.allMet
                  ? colors.primary
                  : colors.primary + '50',
            },
          ]}
          onPress={() => handleOpenApplication(index)}
          disabled={hasApplied}
          testID={`apply-aid-${index}`}
        >
          <Text style={[
            styles.applyButtonText,
            { color: hasApplied ? colors.textSecondary : '#FFFFFF' }
          ]}>
            {hasApplied ? 'Already Applied' : 'Apply Now'}
          </Text>
          {!hasApplied && <ChevronRight size={18} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>
    );
  };

  const renderAppliedAidCard = (aid: FinancialAid) => {
    const statusConfig = STATUS_CONFIG[aid.status];
    const StatusIcon = statusConfig.icon;

    return (
      <View
        key={aid.id}
        style={[styles.appliedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.appliedHeader}>
          <View style={styles.appliedTitleRow}>
            <Text style={[styles.appliedName, { color: colors.text }]}>{aid.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
              <StatusIcon size={12} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
          <Text style={[styles.appliedAmount, { color: colors.primary }]}>
            ${aid.amount.toLocaleString()}
          </Text>
        </View>
        
        <View style={styles.appliedDetails}>
          <View style={styles.appliedDetailRow}>
            <Text style={[styles.appliedDetailLabel, { color: colors.textSecondary }]}>
              Per Semester
            </Text>
            <Text style={[styles.appliedDetailValue, { color: colors.text }]}>
              ${aid.amountPerSemester.toLocaleString()}
            </Text>
          </View>
          <View style={styles.appliedDetailRow}>
            <Text style={[styles.appliedDetailLabel, { color: colors.textSecondary }]}>
              Applied
            </Text>
            <Text style={[styles.appliedDetailValue, { color: colors.text }]}>
              {new Date(aid.applicationDate).toLocaleDateString()}
            </Text>
          </View>
          {aid.minimumGPARequired && (
            <View style={styles.appliedDetailRow}>
              <Text style={[styles.appliedDetailLabel, { color: colors.textSecondary }]}>
                GPA Required
              </Text>
              <Text style={[
                styles.appliedDetailValue,
                { color: currentGPA >= aid.minimumGPARequired ? colors.success : colors.error }
              ]}>
                {aid.minimumGPARequired.toFixed(1)} (Yours: {currentGPA.toFixed(2)})
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
        <Wallet size={28} color="#FFFFFF" />
        <View style={styles.summaryContent}>
          <Text style={styles.summaryLabel}>Total Financial Aid</Text>
          <Text style={styles.summaryAmount}>${totalApprovedAid.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatValue}>{appliedAid.length}</Text>
            <Text style={styles.summaryStatLabel}>Applied</Text>
          </View>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatValue}>
              {appliedAid.filter(a => a.status === 'approved').length}
            </Text>
            <Text style={styles.summaryStatLabel}>Approved</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {!isEnrolled && (
          <View style={[styles.warningBanner, { backgroundColor: colors.warning + '20' }]}>
            <AlertCircle size={20} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>
              You must be enrolled in a school to apply for financial aid
            </Text>
          </View>
        )}

        {appliedAid.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Applications</Text>
            {appliedAid.map(renderAppliedAidCard)}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Financial Aid</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Apply for grants, scholarships, and work-study programs
          </Text>
          {availableAid.map((aid, index) => renderAvailableAidCard(aid, index))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showApplicationModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Apply for Financial Aid
              </Text>
              <TouchableOpacity onPress={() => setShowApplicationModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedAidIndex !== null && (
              <>
                <View style={[styles.applicationSummary, { backgroundColor: colors.background }]}>
                  <Text style={[styles.applicationAidName, { color: colors.text }]}>
                    {availableAid[selectedAidIndex].name}
                  </Text>
                  <Text style={[styles.applicationAidAmount, { color: colors.primary }]}>
                    ${availableAid[selectedAidIndex].amount.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.applicationForm}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>
                    Why do you deserve this aid? (Optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.essayInput,
                      { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }
                    ]}
                    placeholder="Share your story..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={4}
                    value={essayText}
                    onChangeText={setEssayText}
                    textAlignVertical="top"
                  />

                  <View style={[styles.formInfo, { backgroundColor: colors.background }]}>
                    <Info size={16} color={colors.textSecondary} />
                    <Text style={[styles.formInfoText, { color: colors.textSecondary }]}>
                      Applications are reviewed based on your GPA, financial need, and eligibility requirements.
                    </Text>
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.background }]}
                    onPress={() => setShowApplicationModal(false)}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.submitButton, { backgroundColor: colors.primary }]}
                    onPress={handleSubmitApplication}
                    disabled={isApplying}
                  >
                    {isApplying ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <FileText size={18} color="#FFFFFF" />
                        <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Submit</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  summaryContent: {
    flex: 1,
    marginLeft: 12,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  summaryAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 2,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryStatItem: {
    alignItems: 'center',
  },
  summaryStatValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  summaryStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  aidCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  aidCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  aidIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aidHeaderContent: {
    flex: 1,
    marginLeft: 12,
  },
  aidName: {
    fontSize: 16,
    fontWeight: '700',
  },
  aidTypeBadge: {
    marginTop: 4,
  },
  aidTypeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  aidAmountContainer: {
    alignItems: 'flex-end',
  },
  aidAmountLabel: {
    fontSize: 10,
  },
  aidAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  aidDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
  requirementsSection: {
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  requirementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  requirementsMet: {
    fontSize: 12,
    fontWeight: '600',
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  requirementText: {
    flex: 1,
    fontSize: 12,
  },
  renewableInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  renewableText: {
    flex: 1,
    fontSize: 11,
    fontStyle: 'italic',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    marginTop: 16,
    gap: 6,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  appliedCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  appliedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appliedTitleRow: {
    flex: 1,
  },
  appliedName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  appliedAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  appliedDetails: {
    marginTop: 12,
    gap: 6,
  },
  appliedDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  appliedDetailLabel: {
    fontSize: 12,
  },
  appliedDetailValue: {
    fontSize: 12,
    fontWeight: '500',
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
    maxHeight: '85%',
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
  applicationSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  applicationAidName: {
    fontSize: 16,
    fontWeight: '600',
  },
  applicationAidAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  applicationForm: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  essayInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
  },
  formInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  formInfoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
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
  submitButton: {
    flex: 2,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
