import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  X,
  Users,
  Handshake,
  DollarSign,
  Percent,
  FileText,
  Send,
  Building2,
  User,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { JointVentureService } from '@/services/JointVentureService';
import { JointVentureProposal } from '@/types/multiplayer-business';
import Slider from '@react-native-community/slider';

interface JointVentureProposalModalProps {
  visible: boolean;
  onClose: () => void;
  onProposalSent?: (proposal: JointVentureProposal) => void;
  targetUserId?: string;
  targetUserName?: string;
  existingBusinessId?: string;
  existingBusinessName?: string;
  currentUserId: string;
  currentUserName: string;
}

export default function JointVentureProposalModal({
  visible,
  onClose,
  onProposalSent,
  targetUserId,
  targetUserName,
  existingBusinessId,
  existingBusinessName,
  currentUserId,
  currentUserName,
}: JointVentureProposalModalProps) {
  const { colors } = useTheme();
  const { categories } = useBusiness();

  const [ventureName, setVentureName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [ownershipSplit, setOwnershipSplit] = useState(50);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [terms, setTerms] = useState('');
  const [message, setMessage] = useState('');
  const [recipientId, setRecipientId] = useState(targetUserId || '');
  const [recipientName, setRecipientName] = useState(targetUserName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setVentureName('');
    setSelectedCategory('');
    setOwnershipSplit(50);
    setInvestmentAmount('');
    setTerms('');
    setMessage('');
    if (!targetUserId) {
      setRecipientId('');
      setRecipientName('');
    }
  }, [targetUserId]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const validateForm = (): boolean => {
    if (!recipientId.trim()) {
      Alert.alert('Error', 'Please enter a recipient ID');
      return false;
    }
    if (!ventureName.trim() && !existingBusinessId) {
      Alert.alert('Error', 'Please enter a venture name');
      return false;
    }
    if (!selectedCategory && !existingBusinessId) {
      Alert.alert('Error', 'Please select a business category');
      return false;
    }
    const amount = parseFloat(investmentAmount.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid investment amount');
      return false;
    }
    return true;
  };

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await JointVentureService.sendProposal(
        currentUserId,
        currentUserName,
        recipientId,
        recipientName || 'Partner',
        {
          businessId: existingBusinessId,
          businessName: existingBusinessName,
          proposedName: ventureName || existingBusinessName || 'Joint Venture',
          proposedCategory: selectedCategory,
          proposedOwnershipSplit: ownershipSplit,
          proposedInvestment: parseFloat(investmentAmount.replace(/,/g, '')),
          proposedTerms: terms,
          message,
        }
      );

      if (result.success && result.data) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onProposalSent?.(result.data);
        handleClose();
        Alert.alert('Success', 'Partnership proposal sent!');
      } else {
        Alert.alert('Error', result.error || 'Failed to send proposal');
      }
    } catch (error) {
      console.error('[JointVentureProposalModal] Error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    currentUserId,
    currentUserName,
    recipientId,
    recipientName,
    existingBusinessId,
    existingBusinessName,
    ventureName,
    selectedCategory,
    ownershipSplit,
    investmentAmount,
    terms,
    message,
    onProposalSent,
    handleClose,
  ]);

  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Propose Partnership</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={colors.gradient.primary as [string, string]}
            style={styles.heroCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroIcon}>
              <Handshake size={32} color={colors.white} />
            </View>
            <Text style={styles.heroTitle}>Joint Business Venture</Text>
            <Text style={styles.heroSubtitle}>
              Partner with another player to build and manage a business together
            </Text>
          </LinearGradient>

          {!targetUserId && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Partner Details</Text>
              <View style={styles.inputGroup}>
                <View style={styles.inputIcon}>
                  <User size={20} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Partner User ID"
                  placeholderTextColor={colors.textLight}
                  value={recipientId}
                  onChangeText={setRecipientId}
                />
              </View>
              <View style={styles.inputGroup}>
                <View style={styles.inputIcon}>
                  <Users size={20} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Partner Name (optional)"
                  placeholderTextColor={colors.textLight}
                  value={recipientName}
                  onChangeText={setRecipientName}
                />
              </View>
            </View>
          )}

          {targetUserId && (
            <View style={styles.partnerPreview}>
              <Users size={20} color={colors.primary} />
              <Text style={styles.partnerPreviewText}>
                Proposing to: <Text style={styles.partnerName}>{targetUserName}</Text>
              </Text>
            </View>
          )}

          {!existingBusinessId && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Venture Details</Text>
              <View style={styles.inputGroup}>
                <View style={styles.inputIcon}>
                  <Building2 size={20} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Venture Name"
                  placeholderTextColor={colors.textLight}
                  value={ventureName}
                  onChangeText={setVentureName}
                />
              </View>

              <Text style={styles.label}>Business Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesScroll}
              >
                {categories.slice(0, 6).map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      selectedCategory === category.id && styles.categoryChipSelected,
                    ]}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === category.id && styles.categoryChipTextSelected,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {existingBusinessId && (
            <View style={styles.existingBusiness}>
              <Building2 size={20} color={colors.info} />
              <Text style={styles.existingBusinessText}>
                Existing Business: <Text style={styles.existingBusinessName}>{existingBusinessName}</Text>
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financial Terms</Text>
            
            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <DollarSign size={20} color={colors.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Your Investment Amount"
                placeholderTextColor={colors.textLight}
                value={investmentAmount}
                onChangeText={setInvestmentAmount}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.sliderSection}>
              <View style={styles.sliderHeader}>
                <View style={styles.sliderLabelRow}>
                  <Percent size={16} color={colors.textSecondary} />
                  <Text style={styles.sliderLabel}>Your Ownership Share</Text>
                </View>
                <Text style={styles.sliderValue}>{ownershipSplit}%</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={10}
                maximumValue={90}
                step={5}
                value={ownershipSplit}
                onValueChange={setOwnershipSplit}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.surfaceAlt}
                thumbTintColor={colors.primary}
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderMinMax}>10%</Text>
                <Text style={styles.sliderMinMax}>90%</Text>
              </View>
            </View>

            <View style={styles.splitPreview}>
              <View style={styles.splitItem}>
                <Text style={styles.splitName}>You</Text>
                <Text style={styles.splitPercent}>{ownershipSplit}%</Text>
              </View>
              <View style={styles.splitDivider} />
              <View style={styles.splitItem}>
                <Text style={styles.splitName}>{recipientName || 'Partner'}</Text>
                <Text style={styles.splitPercent}>{100 - ownershipSplit}%</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Details</Text>
            
            <View style={styles.textAreaGroup}>
              <View style={styles.textAreaHeader}>
                <FileText size={18} color={colors.textSecondary} />
                <Text style={styles.textAreaLabel}>Terms & Conditions</Text>
              </View>
              <TextInput
                style={styles.textArea}
                placeholder="Describe profit sharing, decision making rules, exit conditions..."
                placeholderTextColor={colors.textLight}
                value={terms}
                onChangeText={setTerms}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.textAreaGroup}>
              <View style={styles.textAreaHeader}>
                <Send size={18} color={colors.textSecondary} />
                <Text style={styles.textAreaLabel}>Personal Message</Text>
              </View>
              <TextInput
                style={styles.textArea}
                placeholder="Add a personal message to your partner..."
                placeholderTextColor={colors.textLight}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Handshake size={20} color={colors.white} />
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Sending...' : 'Send Proposal'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  heroCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.white,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center' as const,
    lineHeight: 20,
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
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  inputIcon: {
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: colors.text,
    paddingRight: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  categoriesScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: colors.text,
  },
  categoryChipTextSelected: {
    color: colors.white,
    fontWeight: '600' as const,
  },
  partnerPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  partnerPreviewText: {
    fontSize: 14,
    color: colors.text,
  },
  partnerName: {
    fontWeight: '600' as const,
    color: colors.primary,
  },
  existingBusiness: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info + '15',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  existingBusinessText: {
    fontSize: 14,
    color: colors.text,
  },
  existingBusinessName: {
    fontWeight: '600' as const,
    color: colors.info,
  },
  sliderSection: {
    marginBottom: 16,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sliderValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderMinMax: {
    fontSize: 12,
    color: colors.textLight,
  },
  splitPreview: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
  },
  splitItem: {
    flex: 1,
    alignItems: 'center',
  },
  splitDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  splitName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  splitPercent: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
  },
  textAreaGroup: {
    marginBottom: 16,
  },
  textAreaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  textAreaLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    minHeight: 80,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.white,
  },
});
