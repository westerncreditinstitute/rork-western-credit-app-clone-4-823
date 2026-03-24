import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  AlertTriangle,
  MessageSquare,
  Ban,
  User,
  Shield,
  Eye,
  TrendingUp,
  Flag,
  AlertOctagon,
  Check,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { reportingService, ReportCategory, ReportedContentType } from '@/services/ReportingService';

interface ReportUserModalProps {
  visible: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUserName?: string;
  contentType?: ReportedContentType;
  contentId?: string;
}

const CATEGORIES: {
  value: ReportCategory;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  { value: 'harassment', label: 'Harassment', description: 'Bullying, intimidation, or targeted abuse', icon: <AlertTriangle size={20} color="#F97316" /> },
  { value: 'hate_speech', label: 'Hate Speech', description: 'Discriminatory or hateful content', icon: <AlertOctagon size={20} color="#EF4444" /> },
  { value: 'threats', label: 'Threats', description: 'Threats of violence or harm', icon: <AlertOctagon size={20} color="#EF4444" /> },
  { value: 'spam', label: 'Spam', description: 'Unwanted promotional or repetitive content', icon: <MessageSquare size={20} color="#6B7280" /> },
  { value: 'scam', label: 'Scam/Fraud', description: 'Attempts to deceive or defraud', icon: <Ban size={20} color="#EF4444" /> },
  { value: 'inappropriate_content', label: 'Inappropriate Content', description: 'Sexual or graphic content', icon: <Eye size={20} color="#F97316" /> },
  { value: 'impersonation', label: 'Impersonation', description: 'Pretending to be someone else', icon: <User size={20} color="#8B5CF6" /> },
  { value: 'cheating', label: 'Cheating/Exploiting', description: 'Game exploits or unfair advantages', icon: <TrendingUp size={20} color="#EAB308" /> },
  { value: 'personal_info', label: 'Personal Info', description: 'Sharing private information', icon: <Shield size={20} color="#3B82F6" /> },
  { value: 'other', label: 'Other', description: 'Other violations not listed above', icon: <Flag size={20} color="#6B7280" /> },
];

export default function ReportUserModal({
  visible,
  onClose,
  reportedUserId,
  reportedUserName,
  contentType = 'user',
  contentId,
}: ReportUserModalProps) {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'category' | 'details'>('category');

  const handleCategorySelect = (category: ReportCategory) => {
    setSelectedCategory(category);
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!user || !selectedCategory) return;

    if (description.trim().length < 10) {
      Alert.alert('Error', 'Please provide a more detailed description (at least 10 characters)');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await reportingService.submitReport(user.id, user.name, {
        reportedUserId,
        reportedUserName,
        contentType,
        contentId,
        category: selectedCategory,
        description: description.trim(),
      });

      if (result.success) {
        Alert.alert(
          'Report Submitted',
          'Thank you for your report. Our moderation team will review it shortly.',
          [{ text: 'OK', onPress: handleClose }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit report. Please try again.');
      }
    } catch (error) {
      console.error('[ReportUserModal] Error submitting report:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedCategory(null);
    setDescription('');
    setStep('category');
    onClose();
  };

  const handleBack = () => {
    setStep('category');
  };

  const renderCategoryStep = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>What is the issue?</Text>
      <Text style={styles.stepSubtitle}>Select the category that best describes the problem</Text>

      <View style={styles.categoriesContainer}>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.value}
            style={styles.categoryCard}
            onPress={() => handleCategorySelect(category.value)}
            activeOpacity={0.7}
          >
            <View style={styles.categoryIcon}>{category.icon}</View>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryLabel}>{category.label}</Text>
              <Text style={styles.categoryDescription}>{category.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderDetailsStep = () => {
    const selectedCategoryData = CATEGORIES.find(c => c.value === selectedCategory);

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Change category</Text>
        </TouchableOpacity>

        <View style={styles.selectedCategoryCard}>
          {selectedCategoryData?.icon}
          <Text style={styles.selectedCategoryText}>{selectedCategoryData?.label}</Text>
        </View>

        <Text style={styles.stepTitle}>Tell us more</Text>
        <Text style={styles.stepSubtitle}>
          Please provide details about what happened. Be as specific as possible.
        </Text>

        <View style={styles.reportingUser}>
          <Text style={styles.reportingLabel}>Reporting:</Text>
          <View style={styles.reportingUserInfo}>
            <User size={16} color="#EF4444" />
            <Text style={styles.reportingUserName}>{reportedUserName || 'Unknown User'}</Text>
          </View>
        </View>

        <TextInput
          style={styles.descriptionInput}
          placeholder="Describe the issue in detail..."
          placeholderTextColor="#6B7280"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={1000}
        />

        <Text style={styles.charCount}>{description.length}/1000</Text>

        <View style={styles.guidelines}>
          <Text style={styles.guidelinesTitle}>Reporting Guidelines</Text>
          <Text style={styles.guidelinesText}>
            • Be specific about what happened{'\n'}
            • Include relevant details like time/context{'\n'}
            • False reports may result in action against your account
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (!description.trim() || isSubmitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!description.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Check size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Report</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#9CA3AF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report User</Text>
          <View style={{ width: 40 }} />
        </View>

        {step === 'category' ? renderCategoryStep() : renderDetailsStep()}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 24,
    lineHeight: 20,
  },
  categoriesContainer: {
    gap: 12,
    paddingBottom: 24,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    gap: 14,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    color: '#3B82F6',
  },
  selectedCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1F2937',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  selectedCategoryText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  reportingUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  reportingLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  reportingUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reportingUserName: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500' as const,
  },
  descriptionInput: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    minHeight: 150,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 20,
  },
  guidelines: {
    backgroundColor: '#1E3A5F',
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  guidelinesTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#93C5FD',
    marginBottom: 8,
  },
  guidelinesText: {
    fontSize: 12,
    color: '#BFDBFE',
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
