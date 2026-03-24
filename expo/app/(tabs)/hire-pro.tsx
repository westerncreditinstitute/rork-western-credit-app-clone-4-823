import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Star,
  Search,
  X,
  MapPin,
  Clock,
  Award,
  Phone,
  Mail,
  MessageCircle,
  ChevronRight,
  Shield,
  DollarSign,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import type { CSOProvider, CSOReview } from '@/types';
import { mockProviders, mockReviews } from '@/mocks/providers';

const CONSULTATION_FEE = 99.99;
const PLATFORM_FEE = 25.00;

const SPECIALTIES = [
  'Credit Repair',
  'Debt Settlement',
  'Identity Theft',
  'Credit Building',
  'Bankruptcy Recovery',
  'Student Loans',
  'Business Credit',
];

export default function HireProScreen() {
  const { colors } = useTheme();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<CSOProvider | null>(null);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [paidProviders, setPaidProviders] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [localReviews, setLocalReviews] = useState<CSOReview[]>(mockReviews);

  const filteredProviders = useMemo(() => {
    let filtered = [...mockProviders];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.location.toLowerCase().includes(query)
      );
    }
    
    if (selectedSpecialty) {
      filtered = filtered.filter((p) =>
        p.specialties.includes(selectedSpecialty)
      );
    }
    
    return filtered;
  }, [searchQuery, selectedSpecialty]);

  const providerReviews = useMemo(() => {
    if (!selectedProvider) return [];
    return localReviews.filter((r) => r.providerId === selectedProvider.id);
  }, [selectedProvider, localReviews]);

  const hasAccess = selectedProvider ? paidProviders.has(selectedProvider.id) : false;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleProviderPress = (provider: CSOProvider) => {
    setSelectedProvider(provider);
    setShowProviderModal(true);
  };

  const handlePayForConsultation = async () => {
    if (!selectedProvider || !user) {
      Alert.alert('Error', 'Please sign in to hire a professional.');
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      setPaidProviders((prev) => new Set([...prev, selectedProvider.id]));
      setShowPaymentModal(false);
      Alert.alert(
        'Payment Successful!',
        `You now have access to ${selectedProvider.name}'s contact information. A receipt has been sent to your email.`,
        [{ text: 'View Contact Info', onPress: () => {} }]
      );
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', 'There was an error processing your payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedProvider || !user) return;

    if (!reviewComment.trim()) {
      Alert.alert('Error', 'Please enter a review comment.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const newReview: CSOReview = {
        id: `review-${Date.now()}`,
        providerId: selectedProvider.id,
        reviewerId: user.id,
        reviewerName: user.name,
        reviewerAvatar: user.avatar,
        rating: reviewRating,
        comment: reviewComment,
        createdAt: new Date().toISOString(),
      };
      
      setLocalReviews((prev) => [newReview, ...prev]);
      setShowReviewModal(false);
      setReviewComment('');
      setReviewRating(5);
      Alert.alert('Success', 'Your review has been submitted!');
    } catch (error) {
      console.error('Review error:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleContact = (type: 'phone' | 'email' | 'message') => {
    if (!selectedProvider) return;

    if (type === 'phone' && selectedProvider.phone) {
      Linking.openURL(`tel:${selectedProvider.phone}`);
    } else if (type === 'email') {
      Linking.openURL(`mailto:${selectedProvider.email}?subject=Consultation Request`);
    } else if (type === 'message') {
      Alert.alert('Direct Message', 'Direct messaging feature coming soon!');
    }
  };

  const renderStars = (rating: number, size: number = 16, interactive: boolean = false, onPress?: (rating: number) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            disabled={!interactive}
            onPress={() => onPress?.(star)}
            style={styles.starButton}
          >
            <Star
              size={size}
              color={star <= rating ? '#FFD700' : colors.border}
              fill={star <= rating ? '#FFD700' : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderProviderCard = (provider: CSOProvider) => (
    <TouchableOpacity
      key={provider.id}
      style={[styles.providerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => handleProviderPress(provider)}
      activeOpacity={0.7}
    >
      <View style={styles.providerHeader}>
        <Image source={{ uri: provider.avatar }} style={styles.providerAvatar} contentFit="cover" transition={150} cachePolicy="memory-disk" />
        <View style={styles.providerInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.providerName, { color: colors.text }]}>{provider.name}</Text>
            <View style={[styles.csoBadge, { backgroundColor: colors.secondary }]}>
              <Shield size={12} color={colors.white} />
              <Text style={styles.csoBadgeText}>CSO</Text>
            </View>
          </View>
          <View style={styles.ratingRow}>
            {renderStars(provider.rating)}
            <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
              {provider.rating.toFixed(1)} ({provider.reviewCount} reviews)
            </Text>
          </View>
          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.textLight} />
            <Text style={[styles.locationText, { color: colors.textLight }]}>{provider.location}</Text>
          </View>
        </View>
        <ChevronRight size={20} color={colors.textLight} />
      </View>
      <Text style={[styles.providerBio, { color: colors.textSecondary }]} numberOfLines={2}>
        {provider.bio}
      </Text>
      <View style={styles.specialtiesRow}>
        {provider.specialties?.slice(0, 3).map((specialty, index) => (
          <View key={index} style={[styles.specialtyTag, { backgroundColor: colors.primaryLight + '20' }]}>
            <Text style={[styles.specialtyTagText, { color: colors.primary }]}>{specialty}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.priceRow, { borderTopColor: colors.border }]}>
        <View style={styles.experienceInfo}>
          <Clock size={14} color={colors.textLight} />
          <Text style={[styles.experienceText, { color: colors.textLight }]}>
            {provider.yearsExperience} years exp.
          </Text>
        </View>
        <View style={styles.priceInfo}>
          <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Consultation</Text>
          <Text style={[styles.priceValue, { color: colors.primary }]}>${CONSULTATION_FEE}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderReviewCard = (review: CSOReview) => (
    <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.surfaceAlt }]}>
      <View style={styles.reviewHeader}>
        <Image source={{ uri: review.reviewerAvatar }} style={styles.reviewerAvatar} contentFit="cover" transition={150} cachePolicy="memory-disk" />
        <View style={styles.reviewerInfo}>
          <Text style={[styles.reviewerName, { color: colors.text }]}>{review.reviewerName}</Text>
          <Text style={[styles.reviewDate, { color: colors.textLight }]}>
            {new Date(review.createdAt).toLocaleDateString()}
          </Text>
        </View>
        {renderStars(review.rating, 14)}
      </View>
      <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>{review.comment}</Text>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      paddingTop: 10,
    },
    title: {
      fontSize: 28,
      fontWeight: '700' as const,
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    searchContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 10,
      fontSize: 16,
      color: colors.text,
    },
    filterSection: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    filterLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      marginBottom: 10,
    },
    filterScroll: {
      flexDirection: 'row' as const,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 10,
      borderWidth: 1,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    listContainer: {
      paddingHorizontal: 20,
      paddingBottom: 100,
    },
    providerCard: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
    },
    providerHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 12,
    },
    providerAvatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      marginRight: 12,
    },
    providerInfo: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 4,
    },
    providerName: {
      fontSize: 17,
      fontWeight: '600' as const,
      marginRight: 8,
    },
    csoBadge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    csoBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700' as const,
      marginLeft: 4,
    },
    ratingRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 4,
    },
    starsContainer: {
      flexDirection: 'row' as const,
    },
    starButton: {
      marginRight: 2,
    },
    ratingText: {
      fontSize: 13,
      marginLeft: 6,
    },
    locationRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    locationText: {
      fontSize: 13,
      marginLeft: 4,
    },
    providerBio: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 12,
    },
    specialtiesRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      marginBottom: 12,
    },
    specialtyTag: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 8,
      marginBottom: 4,
    },
    specialtyTagText: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    priceRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingTop: 12,
      borderTopWidth: 1,
    },
    experienceInfo: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    experienceText: {
      fontSize: 13,
      marginLeft: 6,
    },
    priceInfo: {
      alignItems: 'flex-end' as const,
    },
    priceLabel: {
      fontSize: 12,
    },
    priceValue: {
      fontSize: 18,
      fontWeight: '700' as const,
    },
    emptyState: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center' as const,
      marginTop: 8,
      paddingHorizontal: 40,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end' as const,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.text,
    },
    closeButton: {
      padding: 8,
    },
    modalScroll: {
      paddingHorizontal: 20,
    },
    profileSection: {
      alignItems: 'center' as const,
      paddingVertical: 24,
    },
    profileAvatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      marginBottom: 16,
    },
    profileName: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
      marginBottom: 4,
    },
    profileBadge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.secondary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginBottom: 12,
    },
    profileBadgeText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '600' as const,
      marginLeft: 6,
    },
    profileRating: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    profileRatingText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
      marginLeft: 8,
    },
    profileReviews: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 4,
    },
    infoSection: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
    },
    infoRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 12,
    },
    infoText: {
      fontSize: 15,
      color: colors.textSecondary,
      marginLeft: 12,
      flex: 1,
    },
    bioSection: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 12,
    },
    bioText: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    specialtiesSection: {
      marginBottom: 20,
    },
    specialtiesList: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
    },
    specialtyItem: {
      backgroundColor: colors.primaryLight + '20',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 10,
      marginBottom: 10,
    },
    specialtyItemText: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.primary,
    },
    contactSection: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
    },
    contactLocked: {
      alignItems: 'center' as const,
    },
    lockIcon: {
      marginBottom: 12,
    },
    contactLockedTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 4,
    },
    contactLockedText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center' as const,
      marginBottom: 16,
    },
    payButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 12,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    payButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600' as const,
      marginLeft: 8,
    },
    contactUnlocked: {
      gap: 12,
    },
    contactButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.surface,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    contactButtonText: {
      fontSize: 15,
      fontWeight: '500' as const,
      color: colors.text,
      marginLeft: 12,
      flex: 1,
    },
    reviewsSection: {
      marginBottom: 20,
    },
    reviewsHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 16,
    },
    addReviewButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
    },
    addReviewText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '600' as const,
      marginLeft: 6,
    },
    reviewCard: {
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    reviewHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 10,
    },
    reviewerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 10,
    },
    reviewerInfo: {
      flex: 1,
    },
    reviewerName: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    reviewDate: {
      fontSize: 12,
    },
    reviewComment: {
      fontSize: 14,
      lineHeight: 20,
    },
    noReviews: {
      alignItems: 'center' as const,
      paddingVertical: 20,
    },
    noReviewsText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    paymentModalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
    },
    paymentTitle: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: colors.text,
      textAlign: 'center' as const,
      marginBottom: 8,
    },
    paymentSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center' as const,
      marginBottom: 24,
    },
    paymentDetails: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
    },
    paymentRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      marginBottom: 12,
    },
    paymentLabel: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    paymentValue: {
      fontSize: 15,
      fontWeight: '500' as const,
      color: colors.text,
    },
    paymentTotal: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    paymentTotalLabel: {
      fontSize: 17,
      fontWeight: '600' as const,
      color: colors.text,
    },
    paymentTotalValue: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.primary,
    },
    paymentNote: {
      fontSize: 13,
      color: colors.textLight,
      textAlign: 'center' as const,
      marginBottom: 20,
    },
    confirmPayButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center' as const,
      marginBottom: 12,
    },
    confirmPayButtonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '600' as const,
    },
    cancelButton: {
      paddingVertical: 12,
      alignItems: 'center' as const,
    },
    cancelButtonText: {
      color: colors.textSecondary,
      fontSize: 15,
    },
    reviewModalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
    },
    reviewModalTitle: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: colors.text,
      textAlign: 'center' as const,
      marginBottom: 24,
    },
    ratingSelector: {
      alignItems: 'center' as const,
      marginBottom: 24,
    },
    ratingLabel: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    reviewInput: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      padding: 16,
      fontSize: 15,
      color: colors.text,
      minHeight: 120,
      textAlignVertical: 'top' as const,
      marginBottom: 20,
    },
    submitReviewButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center' as const,
      marginBottom: 12,
    },
    submitReviewButtonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '600' as const,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
  });

  

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Hire A Pro</Text>
          <Text style={styles.subtitle}>Connect with certified credit professionals</Text>
          <View style={styles.searchContainer}>
            <Search size={20} color={colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or location..."
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={20} color={colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Filter by Specialty</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedSpecialty === null ? colors.primary : colors.surface,
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => setSelectedSpecialty(null)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: selectedSpecialty === null ? colors.white : colors.primary },
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {SPECIALTIES.map((specialty) => (
              <TouchableOpacity
                key={specialty}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedSpecialty === specialty ? colors.primary : colors.surface,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setSelectedSpecialty(selectedSpecialty === specialty ? null : specialty)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: selectedSpecialty === specialty ? colors.white : colors.primary },
                  ]}
                >
                  {specialty}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.listContainer}>
          {filteredProviders.length === 0 ? (
            <View style={styles.emptyState}>
              <Award size={48} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No Professionals Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || selectedSpecialty
                  ? 'Try adjusting your search or filters'
                  : 'Check back soon for certified CSO professionals'}
              </Text>
            </View>
          ) : (
            filteredProviders.map((provider: CSOProvider) => renderProviderCard(provider))
          )}
        </View>
      </ScrollView>

      <Modal visible={showProviderModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Professional Profile</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowProviderModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {selectedProvider && (
                <>
                  <View style={styles.profileSection}>
                    <Image source={{ uri: selectedProvider.avatar }} style={styles.profileAvatar} />
                    <Text style={styles.profileName}>{selectedProvider.name}</Text>
                    <View style={styles.profileBadge}>
                      <Shield size={14} color="#fff" />
                      <Text style={styles.profileBadgeText}>CSO Certified Professional</Text>
                    </View>
                    <View style={styles.profileRating}>
                      {renderStars(selectedProvider.rating, 20)}
                      <Text style={styles.profileRatingText}>{selectedProvider.rating.toFixed(1)}</Text>
                      <Text style={styles.profileReviews}>({selectedProvider.reviewCount} reviews)</Text>
                    </View>
                  </View>

                  <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                      <MapPin size={18} color={colors.primary} />
                      <Text style={styles.infoText}>{selectedProvider.location}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Clock size={18} color={colors.primary} />
                      <Text style={styles.infoText}>{selectedProvider.yearsExperience} years of experience</Text>
                    </View>
                    <View style={[styles.infoRow, { marginBottom: 0 }]}>
                      <Award size={18} color={colors.primary} />
                      <Text style={styles.infoText}>
                        Certified since {new Date(selectedProvider.certifiedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.bioSection}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <Text style={styles.bioText}>{selectedProvider.bio}</Text>
                  </View>

                  <View style={styles.specialtiesSection}>
                    <Text style={styles.sectionTitle}>Specialties</Text>
                    <View style={styles.specialtiesList}>
                      {selectedProvider.specialties?.map((specialty, index) => (
                        <View key={index} style={styles.specialtyItem}>
                          <Text style={styles.specialtyItemText}>{specialty}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.contactSection}>
                    <Text style={styles.sectionTitle}>Contact Information</Text>
                    {!hasAccess ? (
                      <View style={styles.contactLocked}>
                        <DollarSign size={32} color={colors.primary} style={styles.lockIcon} />
                        <Text style={styles.contactLockedTitle}>Unlock Contact Details</Text>
                        <Text style={styles.contactLockedText}>
                          Pay the consultation fee to access {selectedProvider.name}&apos;s contact information
                        </Text>
                        <TouchableOpacity style={styles.payButton} onPress={() => setShowPaymentModal(true)}>
                          <DollarSign size={18} color="#fff" />
                          <Text style={styles.payButtonText}>Pay ${CONSULTATION_FEE}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.contactUnlocked}>
                        {selectedProvider.phone && (
                          <TouchableOpacity
                            style={styles.contactButton}
                            onPress={() => handleContact('phone')}
                          >
                            <Phone size={20} color={colors.primary} />
                            <Text style={styles.contactButtonText}>{selectedProvider.phone}</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.contactButton} onPress={() => handleContact('email')}>
                          <Mail size={20} color={colors.primary} />
                          <Text style={styles.contactButtonText}>{selectedProvider.email}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.contactButton}
                          onPress={() => handleContact('message')}
                        >
                          <MessageCircle size={20} color={colors.primary} />
                          <Text style={styles.contactButtonText}>Send Direct Message</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <View style={styles.reviewsSection}>
                    <View style={styles.reviewsHeader}>
                      <Text style={styles.sectionTitle}>Reviews</Text>
                      {hasAccess && (
                        <TouchableOpacity
                          style={styles.addReviewButton}
                          onPress={() => setShowReviewModal(true)}
                        >
                          <Star size={14} color="#fff" />
                          <Text style={styles.addReviewText}>Write Review</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {providerReviews.length === 0 ? (
                      <View style={styles.noReviews}>
                        <Text style={styles.noReviewsText}>No reviews yet</Text>
                      </View>
                    ) : (
                      providerReviews.map((review: CSOReview) => renderReviewCard(review))
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalContent}>
            <Text style={styles.paymentTitle}>Complete Payment</Text>
            <Text style={styles.paymentSubtitle}>
              Unlock access to {selectedProvider?.name}&apos;s contact information
            </Text>
            <View style={styles.paymentDetails}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Consultation Fee</Text>
                <Text style={styles.paymentValue}>${CONSULTATION_FEE.toFixed(2)}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Platform Fee (WCI)</Text>
                <Text style={styles.paymentValue}>${PLATFORM_FEE.toFixed(2)}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Provider Payout</Text>
                <Text style={styles.paymentValue}>${(CONSULTATION_FEE - PLATFORM_FEE).toFixed(2)}</Text>
              </View>
              <View style={styles.paymentTotal}>
                <Text style={styles.paymentTotalLabel}>Total</Text>
                <Text style={styles.paymentTotalValue}>${CONSULTATION_FEE.toFixed(2)}</Text>
              </View>
            </View>
            <Text style={styles.paymentNote}>
              After payment, you&apos;ll receive the provider&apos;s contact details instantly.
            </Text>
            <TouchableOpacity
              style={styles.confirmPayButton}
              onPress={handlePayForConsultation}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmPayButtonText}>Pay ${CONSULTATION_FEE}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowPaymentModal(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.reviewModalContent}>
            <Text style={styles.reviewModalTitle}>Write a Review</Text>
            <View style={styles.ratingSelector}>
              <Text style={styles.ratingLabel}>How was your experience?</Text>
              {renderStars(reviewRating, 32, true, setReviewRating)}
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="Share your experience with this professional..."
              placeholderTextColor={colors.textLight}
              multiline
              value={reviewComment}
              onChangeText={setReviewComment}
            />
            <TouchableOpacity
              style={styles.submitReviewButton}
              onPress={handleSubmitReview}
              disabled={isSubmittingReview}
            >
              {isSubmittingReview ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitReviewButtonText}>Submit Review</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowReviewModal(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
