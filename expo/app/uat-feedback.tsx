import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  MessageSquare,
  Bug,
  Star,
  Send,
  ChevronDown,
  ChevronUp,
  CheckCircle,
} from 'lucide-react-native';
import { uatService } from '@/services/UATService';
import { UATFeedbackCategory, UATSession } from '@/types/uat';

const CATEGORIES: { value: UATFeedbackCategory; label: string }[] = [
  { value: 'multiplayer', label: 'Multiplayer' },
  { value: 'chat', label: 'Chat' },
  { value: 'presence', label: 'Presence/Online Status' },
  { value: 'leaderboard', label: 'Leaderboards' },
  { value: 'business', label: 'Business Features' },
  { value: 'home_visit', label: 'Home Visits' },
  { value: 'performance', label: 'Performance' },
  { value: 'ui_ux', label: 'UI/UX Design' },
  { value: 'navigation', label: 'Navigation' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_OPTIONS = [
  { value: 'critical', label: 'Critical', color: '#EF4444' },
  { value: 'major', label: 'Major', color: '#F97316' },
  { value: 'minor', label: 'Minor', color: '#EAB308' },
  { value: 'cosmetic', label: 'Cosmetic', color: '#6B7280' },
] as const;

type TabType = 'feedback' | 'bug' | 'rating';

export default function UATFeedbackScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('feedback');
  const [, setSession] = useState<UATSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [category, setCategory] = useState<UATFeedbackCategory>('multiplayer');
  const [feature, setFeature] = useState('');
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [comment, setComment] = useState('');

  const [bugTitle, setBugTitle] = useState('');
  const [bugDescription, setBugDescription] = useState('');
  const [bugSeverity, setBugSeverity] = useState<'critical' | 'major' | 'minor' | 'cosmetic'>('minor');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');

  const [featureToRate, setFeatureToRate] = useState('');
  const [usabilityRating, setUsabilityRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [performanceRating, setPerformanceRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [designRating, setDesignRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [ratingComments, setRatingComments] = useState('');

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  useEffect(() => {
    const currentSession = uatService.getCurrentSession();
    if (currentSession) {
      setSession(currentSession);
    } else {
      uatService.startSession('beta-user', 'Beta Tester').then(setSession);
    }
  }, []);

  const handleSubmitFeedback = useCallback(async () => {
    if (!feature.trim() || !comment.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      await uatService.submitFeedback(category, feature, rating, comment);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      
      setFeature('');
      setComment('');
      setRating(3);
    } catch {
      Alert.alert('Error', 'Failed to submit feedback');
    } finally {
      setIsLoading(false);
    }
  }, [category, feature, rating, comment]);

  const handleSubmitBug = useCallback(async () => {
    if (!bugTitle.trim() || !bugDescription.trim()) {
      Alert.alert('Error', 'Please fill in title and description');
      return;
    }

    setIsLoading(true);
    try {
      const steps = stepsToReproduce.split('\n').filter(s => s.trim());
      await uatService.submitBugReport(
        bugSeverity,
        bugTitle,
        bugDescription,
        steps,
        expectedBehavior,
        actualBehavior,
        category
      );
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      
      setBugTitle('');
      setBugDescription('');
      setStepsToReproduce('');
      setExpectedBehavior('');
      setActualBehavior('');
    } catch {
      Alert.alert('Error', 'Failed to submit bug report');
    } finally {
      setIsLoading(false);
    }
  }, [bugTitle, bugDescription, bugSeverity, stepsToReproduce, expectedBehavior, actualBehavior, category]);

  const handleSubmitRating = useCallback(async () => {
    if (!featureToRate.trim()) {
      Alert.alert('Error', 'Please enter the feature name');
      return;
    }

    setIsLoading(true);
    try {
      await uatService.submitFeatureRating(
        featureToRate,
        rating,
        usabilityRating,
        performanceRating,
        designRating,
        ratingComments
      );
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      
      setFeatureToRate('');
      setRatingComments('');
      setRating(3);
      setUsabilityRating(3);
      setPerformanceRating(3);
      setDesignRating(3);
    } catch {
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setIsLoading(false);
    }
  }, [featureToRate, rating, usabilityRating, performanceRating, designRating, ratingComments]);

  const renderStars = (
    value: 1 | 2 | 3 | 4 | 5,
    onChange: (val: 1 | 2 | 3 | 4 | 5) => void,
    label?: string
  ) => (
    <View style={styles.starsContainer}>
      {label && <Text style={styles.starsLabel}>{label}</Text>}
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onChange(star as 1 | 2 | 3 | 4 | 5)}
            testID={`star-${star}`}
          >
            <Star
              size={28}
              color={star <= value ? '#F59E0B' : '#374151'}
              fill={star <= value ? '#F59E0B' : 'none'}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderFeedbackForm = () => (
    <View style={styles.form}>
      <Text style={styles.formTitle}>General Feedback</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
        >
          <Text style={styles.dropdownText}>
            {CATEGORIES.find(c => c.value === category)?.label}
          </Text>
          {showCategoryDropdown ? (
            <ChevronUp size={20} color="#9CA3AF" />
          ) : (
            <ChevronDown size={20} color="#9CA3AF" />
          )}
        </TouchableOpacity>
        {showCategoryDropdown && (
          <View style={styles.dropdownList}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.dropdownItem,
                  category === cat.value && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  setCategory(cat.value);
                  setShowCategoryDropdown(false);
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  category === cat.value && styles.dropdownItemTextActive,
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Feature Name *</Text>
        <TextInput
          style={styles.input}
          value={feature}
          onChangeText={setFeature}
          placeholder="e.g., Home Visit Chat"
          placeholderTextColor="#6B7280"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Rating</Text>
        {renderStars(rating, setRating)}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Comments *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={comment}
          onChangeText={setComment}
          placeholder="Share your thoughts..."
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={4}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
        onPress={handleSubmitFeedback}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Send size={18} color="#FFF" />
            <Text style={styles.submitButtonText}>Submit Feedback</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderBugForm = () => (
    <View style={styles.form}>
      <Text style={styles.formTitle}>Report a Bug</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Severity</Text>
        <View style={styles.severityContainer}>
          {SEVERITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.severityOption,
                bugSeverity === opt.value && { borderColor: opt.color, backgroundColor: `${opt.color}20` },
              ]}
              onPress={() => setBugSeverity(opt.value)}
            >
              <View style={[styles.severityDot, { backgroundColor: opt.color }]} />
              <Text style={[
                styles.severityText,
                bugSeverity === opt.value && { color: opt.color },
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Bug Title *</Text>
        <TextInput
          style={styles.input}
          value={bugTitle}
          onChangeText={setBugTitle}
          placeholder="Brief description of the issue"
          placeholderTextColor="#6B7280"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bugDescription}
          onChangeText={setBugDescription}
          placeholder="Detailed description of what happened"
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Steps to Reproduce</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={stepsToReproduce}
          onChangeText={setStepsToReproduce}
          placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Expected Behavior</Text>
        <TextInput
          style={styles.input}
          value={expectedBehavior}
          onChangeText={setExpectedBehavior}
          placeholder="What should happen"
          placeholderTextColor="#6B7280"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Actual Behavior</Text>
        <TextInput
          style={styles.input}
          value={actualBehavior}
          onChangeText={setActualBehavior}
          placeholder="What actually happened"
          placeholderTextColor="#6B7280"
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, styles.submitButtonBug, isLoading && styles.submitButtonDisabled]}
        onPress={handleSubmitBug}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Bug size={18} color="#FFF" />
            <Text style={styles.submitButtonText}>Submit Bug Report</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderRatingForm = () => (
    <View style={styles.form}>
      <Text style={styles.formTitle}>Feature Rating</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Feature Name *</Text>
        <TextInput
          style={styles.input}
          value={featureToRate}
          onChangeText={setFeatureToRate}
          placeholder="e.g., Leaderboard System"
          placeholderTextColor="#6B7280"
        />
      </View>

      <View style={styles.inputGroup}>
        {renderStars(rating, setRating, 'Overall Rating')}
      </View>

      <View style={styles.inputGroup}>
        {renderStars(usabilityRating, setUsabilityRating, 'Usability')}
      </View>

      <View style={styles.inputGroup}>
        {renderStars(performanceRating, setPerformanceRating, 'Performance')}
      </View>

      <View style={styles.inputGroup}>
        {renderStars(designRating, setDesignRating, 'Design')}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Additional Comments</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={ratingComments}
          onChangeText={setRatingComments}
          placeholder="Any additional thoughts..."
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, styles.submitButtonRating, isLoading && styles.submitButtonDisabled]}
        onPress={handleSubmitRating}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Star size={18} color="#FFF" />
            <Text style={styles.submitButtonText}>Submit Rating</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Beta Feedback',
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#FFF',
        }}
      />
      
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {showSuccess && (
          <View style={styles.successBanner}>
            <CheckCircle size={20} color="#10B981" />
            <Text style={styles.successText}>Submitted successfully!</Text>
          </View>
        )}

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'feedback' && styles.tabActive]}
            onPress={() => setActiveTab('feedback')}
          >
            <MessageSquare size={18} color={activeTab === 'feedback' ? '#3B82F6' : '#9CA3AF'} />
            <Text style={[styles.tabText, activeTab === 'feedback' && styles.tabTextActive]}>
              Feedback
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'bug' && styles.tabActive]}
            onPress={() => setActiveTab('bug')}
          >
            <Bug size={18} color={activeTab === 'bug' ? '#EF4444' : '#9CA3AF'} />
            <Text style={[styles.tabText, activeTab === 'bug' && styles.tabTextActive]}>
              Bug Report
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'rating' && styles.tabActive]}
            onPress={() => setActiveTab('rating')}
          >
            <Star size={18} color={activeTab === 'rating' ? '#F59E0B' : '#9CA3AF'} />
            <Text style={[styles.tabText, activeTab === 'rating' && styles.tabTextActive]}>
              Rate Feature
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'feedback' && renderFeedbackForm()}
          {activeTab === 'bug' && renderBugForm()}
          {activeTab === 'rating' && renderRatingForm()}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  safeArea: {
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#064E3B',
    paddingVertical: 12,
    gap: 8,
  },
  successText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#111827',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  form: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
    color: '#FFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#374151',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dropdown: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#374151',
  },
  dropdownText: {
    color: '#FFF',
    fontSize: 15,
  },
  dropdownList: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#374151',
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  dropdownItemActive: {
    backgroundColor: '#1E40AF20',
  },
  dropdownItemText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  dropdownItemTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  starsContainer: {
    marginVertical: 4,
  },
  starsLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  severityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 6,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  submitButtonBug: {
    backgroundColor: '#DC2626',
  },
  submitButtonRating: {
    backgroundColor: '#F59E0B',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
