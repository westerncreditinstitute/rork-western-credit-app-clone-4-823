import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Heart,
  Bookmark,
  MessageCircle,
  Share2,
  Play,
  MapPin,
  Bed,
  Bath,
  Maximize,
  TrendingUp,
  Verified,
  Users,
  ArrowLeft,
  Send,
  Star,
  Calendar,
  Eye,
  ChevronRight,
  Home,
  Award,
  BookOpen,
  Tag,
  FileText,
  DollarSign,
  Key,
  Shield,
  Clock,
  UserCheck,
  AlertCircle,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useCommunityHomes } from '@/contexts/CommunityHomesContext';
import { useGame } from '@/contexts/GameContext';
import {
  formatHomeValue,
  formatCompactNumber,
  getTimeAgo,
  getPropertyTypeIcon,
  getStyleColor,
  getCreditScoreColor,
  getCreditScoreLabel,
  HomeComment,
  ApplicantProfile,
  RentalTermsAccepted,
  PurchaseTermsAccepted,
} from '@/types/communityHomes';

const { width } = Dimensions.get('window');

export default function HomeDetailScreen() {
  const { id, listingType } = useLocalSearchParams<{ id: string; listingType?: 'sale' | 'rent' }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const {
    getHomeById,
    getCommentsForHome,
    getGuestBookForHome,
    followingIds,
    toggleLike,
    toggleSave,
    toggleFollow,
    addComment,
    likeComment,
  } = useCommunityHomes();

  const home = getHomeById(id || '');
  const comments = getCommentsForHome(id || '');
  const guestBook = getGuestBookForHome(id || '');

  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'guestbook' | 'visitors'>('details');
  const [showVisitorLimitModal, setShowVisitorLimitModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showListingModal, setShowListingModal] = useState(!!listingType);
  const [selectedListingType, setSelectedListingType] = useState<'rent' | 'sale' | null>(listingType || null);
  const [applicationStep, setApplicationStep] = useState<'info' | 'terms' | 'submitted'>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState<{ id: string; type: string } | null>(null);
  
  const [rentalTerms, setRentalTerms] = useState<RentalTermsAccepted>({
    leaseAgreement: false,
    creditCheck: false,
    backgroundCheck: false,
    petPolicy: false,
    moveInInspection: false,
    rentResponsibility: false,
    maintenancePolicy: false,
    noisePolicy: false,
  });
  
  const [purchaseTerms, setPurchaseTerms] = useState<PurchaseTermsAccepted>({
    purchaseAgreement: false,
    creditCheck: false,
    titleSearch: false,
    homeInspection: false,
    appraisalContingency: false,
    financingContingency: false,
    escrowTerms: false,
    closingCosts: false,
    propertyTaxes: false,
    insuranceRequirement: false,
  });

  const { gameState, recordBudgetTransaction, updateBalance } = useGame();
  const { submitApplication, recordApplicationTransaction } = useCommunityHomes();

  const buildApplicantProfile = useCallback((): ApplicantProfile => {
    const currentAddress = gameState.lifestyle.sharedRental 
      ? `${gameState.lifestyle.housingName}, Unit ${gameState.lifestyle.sharedRental.unitNumber}`
      : gameState.lifestyle.housingName || 'Not specified';
    
    const cityName = gameState.lifestyle.cityName || 'Los Angeles';
    const employer = gameState.currentJob?.job.company || 'Not employed';
    const jobTitle = gameState.currentJob?.job.title || 'Unemployed';
    const monthsEmployed = gameState.currentJob?.experienceMonths || 0;
    const monthlyIncome = gameState.monthlyIncome;
    const annualIncome = monthlyIncome * 12;
    
    const totalDebt = gameState.creditAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const propertyValue = gameState.ownedProperties.reduce((sum, p) => sum + p.currentValue, 0);
    const vehicleValue = gameState.ownedVehicles.reduce((sum, v) => sum + v.currentValue, 0);
    const totalAssets = gameState.bankBalance + gameState.savingsBalance + gameState.emergencyFund + 
                        gameState.investments + propertyValue + vehicleValue;

    return {
      playerId: gameState.playerId,
      playerName: gameState.playerName,
      avatar: gameState.profilePhotoUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      creditScore: gameState.creditScores.composite,
      currentAddress,
      cityName,
      employer,
      jobTitle,
      monthlyIncome,
      annualIncome,
      bankBalance: gameState.bankBalance,
      savingsBalance: gameState.savingsBalance,
      totalAssets,
      totalDebt,
      monthsEmployed,
    };
  }, [gameState]);

  const applicantProfile = useMemo(() => buildApplicantProfile(), [buildApplicantProfile]);

  const styles = createStyles(colors, isDark);

  const maxVisitors = home?.virtualTour?.maxVisitors || 20;
  const currentVisitors = home?.virtualTour?.currentVisitors || 0;
  const canVisit = currentVisitors < maxVisitors;

  const handleVisit = useCallback(() => {
    if (!id) return;
    
    if (!canVisit) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowVisitorLimitModal(true);
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/home-visit?id=${id}` as any);
  }, [id, router, canVisit]);

  const handleAddComment = useCallback(() => {
    if (!id || !commentText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addComment(id, commentText.trim());
    setCommentText('');
  }, [id, commentText, addComment]);

  const handleProceedToTerms = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setApplicationStep('terms');
  }, []);

  const isRentalApplication = useMemo(() => {
    return selectedListingType === 'rent' || (!selectedListingType && home?.financials.isForRent && !home?.financials.isForSale);
  }, [selectedListingType, home]);

  const allRentalTermsAccepted = useMemo(() => {
    return Object.values(rentalTerms).every(v => v);
  }, [rentalTerms]);

  const allPurchaseTermsAccepted = useMemo(() => {
    return Object.values(purchaseTerms).every(v => v);
  }, [purchaseTerms]);

  const toggleRentalTerm = useCallback((key: keyof RentalTermsAccepted) => {
    setRentalTerms(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const togglePurchaseTerm = useCallback((key: keyof PurchaseTermsAccepted) => {
    setPurchaseTerms(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSubmitApplication = useCallback(() => {
    if (!home) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    const applicationType = isRentalApplication ? 'rental' : 'purchase';
    const termsAccepted = isRentalApplication ? rentalTerms : purchaseTerms;

    try {
      const application = submitApplication(home, applicantProfile, applicationType, termsAccepted);
      console.log('[HomeDetail] Application submitted:', application.id, applicationType);
      
      const applicationFee = isRentalApplication ? 50 : 500;
      const feeDescription = isRentalApplication 
        ? `Rental Application Fee - ${home.propertyName}` 
        : `Purchase Application Fee - ${home.propertyName}`;
      
      recordBudgetTransaction(
        'expense_payment',
        applicationFee,
        feeDescription,
        {
          expenseId: application.id,
          expenseName: `${applicationType} application`,
          category: 'real_estate',
        }
      );
      
      updateBalance(-applicationFee, 'bank');
      
      recordApplicationTransaction(
        application.id,
        'application_fee',
        applicationFee,
        applicantProfile.playerId,
        home.owner.id,
        feeDescription
      );
      
      console.log('[HomeDetail] Transaction recorded for applicant and owner');
      
      setSubmittedApplication({ id: application.id, type: applicationType });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setApplicationStep('submitted');
    } catch (error) {
      console.error('[HomeDetail] Error submitting application:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  }, [home, isRentalApplication, rentalTerms, purchaseTerms, applicantProfile, submitApplication, recordBudgetTransaction, updateBalance, recordApplicationTransaction]);

  const handleCloseListingModal = useCallback(() => {
    setShowListingModal(false);
    setSelectedListingType(null);
    setApplicationStep('info');
    setSubmittedApplication(null);
    setRentalTerms({
      leaseAgreement: false,
      creditCheck: false,
      backgroundCheck: false,
      petPolicy: false,
      moveInInspection: false,
      rentResponsibility: false,
      maintenancePolicy: false,
      noisePolicy: false,
    });
    setPurchaseTerms({
      purchaseAgreement: false,
      creditCheck: false,
      titleSearch: false,
      homeInspection: false,
      appraisalContingency: false,
      financingContingency: false,
      escrowTerms: false,
      closingCosts: false,
      propertyTaxes: false,
      insuranceRequirement: false,
    });
  }, []);

  if (!home) {
    return (
      <View style={styles.notFoundContainer}>
        <Home color={colors.textLight} size={64} />
        <Text style={styles.notFoundText}>Home not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const renderComment = (comment: HomeComment) => (
    <View key={comment.id} style={styles.commentItem}>
      <Image source={{ uri: comment.userAvatar }} style={styles.commentAvatar} />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUserName}>{comment.userName}</Text>
          <Text style={styles.commentLevel}>Lvl {comment.userLevel}</Text>
          <Text style={styles.commentTime}>{getTimeAgo(comment.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{comment.content}</Text>
        <View style={styles.commentActions}>
          <TouchableOpacity
            style={styles.commentAction}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              likeComment(id || '', comment.id);
            }}
          >
            <Heart
              color={comment.isLiked ? '#EF4444' : colors.textLight}
              size={16}
              fill={comment.isLiked ? '#EF4444' : 'transparent'}
            />
            <Text style={[styles.commentActionText, comment.isLiked && { color: '#EF4444' }]}>
              {comment.likes}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.commentAction}>
            <MessageCircle color={colors.textLight} size={16} />
            <Text style={styles.commentActionText}>Reply</Text>
          </TouchableOpacity>
        </View>
        {comment.replies?.map(reply => (
          <View key={reply.id} style={styles.replyItem}>
            <Image source={{ uri: reply.userAvatar }} style={styles.replyAvatar} />
            <View style={styles.replyContent}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentUserName}>{reply.userName}</Text>
                <Text style={styles.commentTime}>{getTimeAgo(reply.createdAt)}</Text>
              </View>
              <Text style={styles.commentText}>{reply.content}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <Animated.View style={[styles.headerOverlay, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={isDark ? ['#0F172A', '#0F172A'] : ['#001F42', '#001F42']}
          style={[styles.headerGradient, { paddingTop: insets.top }]}
        >
          <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
            <ArrowLeft color="#FFFFFF" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{home.propertyName}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => toggleSave(home.id)}>
              <Bookmark
                color="#FFFFFF"
                size={22}
                fill={home.social.isSaved ? '#FFFFFF' : 'transparent'}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.imageGallery}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setSelectedImageIndex(index);
            }}
          >
            {home.images.map((image, index) => (
              <Image key={index} source={{ uri: image }} style={styles.galleryImage} />
            ))}
          </ScrollView>
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent', 'transparent', 'rgba(0,0,0,0.7)']}
            style={styles.galleryGradient}
          />
          <TouchableOpacity
            style={[styles.backButtonOverlay, { top: insets.top + 10 }]}
            onPress={() => router.back()}
          >
            <ArrowLeft color="#FFFFFF" size={24} />
          </TouchableOpacity>
          <View style={styles.galleryPagination}>
            {home.images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  selectedImageIndex === index && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
          {home.settings.virtualTourAvailable && (
            <TouchableOpacity style={styles.visitButtonLarge} onPress={handleVisit}>
              <Play color="#FFFFFF" size={20} fill="#FFFFFF" />
              <Text style={styles.visitButtonText}>Enter Virtual Home</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.content}>
          <TouchableOpacity
            style={styles.ownerSection}
            onPress={() => router.push(`/owner-profile?id=${home.owner.id}` as any)}
          >
            <View style={styles.ownerAvatarContainer}>
              <Image source={{ uri: home.owner.avatar }} style={styles.ownerAvatar} />
              {home.owner.isOnline && <View style={styles.onlineIndicator} />}
            </View>
            <View style={styles.ownerInfo}>
              <View style={styles.ownerNameRow}>
                <Text style={styles.ownerName}>{home.owner.name}</Text>
                {home.owner.isVerified && <Verified color="#3B82F6" size={16} fill="#3B82F6" />}
              </View>
              <View style={styles.ownerMeta}>
                <Text style={styles.ownerLevel}>Level {home.owner.level}</Text>
                <View style={[styles.creditBadge, { backgroundColor: getCreditScoreColor(home.owner.creditScore) + '20' }]}>
                  <Text style={[styles.creditScoreText, { color: getCreditScoreColor(home.owner.creditScore) }]}>
                    {home.owner.creditScore} • {getCreditScoreLabel(home.owner.creditScore)}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.followButton, followingIds.includes(home.owner.id) && styles.followingButton]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleFollow(home.owner.id);
              }}
            >
              <Text style={[styles.followButtonText, followingIds.includes(home.owner.id) && styles.followingButtonText]}>
                {followingIds.includes(home.owner.id) ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>

          <View style={styles.propertyHeader}>
            <View style={styles.propertyTypeRow}>
              <Text style={styles.propertyTypeEmoji}>{getPropertyTypeIcon(home.propertyType)}</Text>
              <View style={[styles.styleBadge, { backgroundColor: getStyleColor(home.style) + '20' }]}>
                <Text style={[styles.styleText, { color: getStyleColor(home.style) }]}>{home.style}</Text>
              </View>
            </View>
            <Text style={styles.propertyName}>{home.propertyName}</Text>
            <View style={styles.locationRow}>
              <MapPin color={colors.textLight} size={16} />
              <Text style={styles.locationText}>{home.neighborhood}, {home.city}</Text>
            </View>
          </View>

          <Text style={styles.description}>{home.description}</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Eye color={colors.primary} size={20} />
              <Text style={styles.statValue}>{formatCompactNumber(home.stats.visits)}</Text>
              <Text style={styles.statLabel}>Visits</Text>
            </View>
            <View style={styles.statCard}>
              <Heart color="#EF4444" size={20} />
              <Text style={styles.statValue}>{formatCompactNumber(home.stats.likes)}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
            <View style={styles.statCard}>
              <Bookmark color="#F59E0B" size={20} />
              <Text style={styles.statValue}>{formatCompactNumber(home.stats.saves)}</Text>
              <Text style={styles.statLabel}>Saves</Text>
            </View>
            <View style={styles.statCard}>
              <Users color="#8B5CF6" size={20} />
              <Text style={styles.statValue}>{formatCompactNumber(home.stats.weeklyVisitors)}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Property Details</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Bed color={colors.textSecondary} size={22} />
                <Text style={styles.detailValue}>{home.details.bedrooms}</Text>
                <Text style={styles.detailLabel}>Bedrooms</Text>
              </View>
              <View style={styles.detailItem}>
                <Bath color={colors.textSecondary} size={22} />
                <Text style={styles.detailValue}>{home.details.bathrooms}</Text>
                <Text style={styles.detailLabel}>Bathrooms</Text>
              </View>
              <View style={styles.detailItem}>
                <Maximize color={colors.textSecondary} size={22} />
                <Text style={styles.detailValue}>{home.details.squareFootage.toLocaleString()}</Text>
                <Text style={styles.detailLabel}>Sq Ft</Text>
              </View>
              {home.details.yearBuilt && (
                <View style={styles.detailItem}>
                  <Calendar color={colors.textSecondary} size={22} />
                  <Text style={styles.detailValue}>{home.details.yearBuilt}</Text>
                  <Text style={styles.detailLabel}>Year Built</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.financialSection}>
            <Text style={styles.sectionTitle}>Financial Info</Text>
            <View style={styles.financialCard}>
              {home.financials.isRenting ? (
                <View style={styles.financialRow}>
                  <Text style={styles.financialLabel}>Monthly Rent</Text>
                  <Text style={styles.financialValue}>${home.financials.monthlyRent?.toLocaleString()}/mo</Text>
                </View>
              ) : (
                <>
                  <View style={styles.financialRow}>
                    <Text style={styles.financialLabel}>Purchase Price</Text>
                    <Text style={styles.financialValue}>{formatHomeValue(home.financials.purchasePrice)}</Text>
                  </View>
                  <View style={styles.financialRow}>
                    <Text style={styles.financialLabel}>Current Value</Text>
                    <Text style={[styles.financialValue, { color: colors.success }]}>
                      {formatHomeValue(home.financials.currentValue)}
                    </Text>
                  </View>
                  {home.financials.netWorthGain && (
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Net Gain</Text>
                      <View style={styles.gainRow}>
                        <TrendingUp color="#10B981" size={16} />
                        <Text style={styles.gainValue}>+{formatHomeValue(home.financials.netWorthGain)}</Text>
                        <Text style={styles.gainPercent}>({home.financials.appreciationRate}%)</Text>
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>

          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Features</Text>
            <View style={styles.featuresGrid}>
              {home.features.map((feature, index) => (
                <View key={index} style={styles.featureChip}>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'details' && styles.tabActive]}
              onPress={() => setActiveTab('details')}
            >
              <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>
                3D Model
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'visitors' && styles.tabActive]}
              onPress={() => setActiveTab('visitors')}
            >
              <Text style={[styles.tabText, activeTab === 'visitors' && styles.tabTextActive]}>
                Visitors
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'comments' && styles.tabActive]}
              onPress={() => setActiveTab('comments')}
            >
              <Text style={[styles.tabText, activeTab === 'comments' && styles.tabTextActive]}>
                Comments ({comments.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'guestbook' && styles.tabActive]}
              onPress={() => setActiveTab('guestbook')}
            >
              <Text style={[styles.tabText, activeTab === 'guestbook' && styles.tabTextActive]}>
                Guest Book ({guestBook.length})
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'details' && home.model3D && (
            <View style={styles.modelSection}>
              <View style={styles.roomsList}>
                {home.model3D.rooms.map((room) => (
                  <View key={room.id} style={styles.roomCard}>
                    <Text style={styles.roomName}>{room.name}</Text>
                    <Text style={styles.roomDetails}>
                      {room.size.x}x{room.size.z} ft • {room.ceilingHeight} ft ceiling
                    </Text>
                    <Text style={styles.roomFloor}>{room.floorType.replace('_', ' ')}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {activeTab === 'visitors' && (
            <View style={styles.visitorsSection}>
              <View style={styles.visitorStatsCard}>
                <View style={styles.visitorStatRow}>
                  <View style={styles.visitorStatItem}>
                    <Users color={colors.primary} size={24} />
                    <Text style={styles.visitorStatValue}>{currentVisitors}/{maxVisitors}</Text>
                    <Text style={styles.visitorStatLabel}>Current Visitors</Text>
                  </View>
                  <View style={styles.visitorStatDivider} />
                  <View style={styles.visitorStatItem}>
                    <Eye color="#F59E0B" size={24} />
                    <Text style={styles.visitorStatValue}>{formatCompactNumber(home.stats.visits)}</Text>
                    <Text style={styles.visitorStatLabel}>Total Visits</Text>
                  </View>
                  <View style={styles.visitorStatDivider} />
                  <View style={styles.visitorStatItem}>
                    <Clock color="#8B5CF6" size={24} />
                    <Text style={styles.visitorStatValue}>{home.stats.averageVisitDuration || 12}m</Text>
                    <Text style={styles.visitorStatLabel}>Avg. Duration</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.visitorHistoryTitle}>Recent Visitors</Text>
              {guestBook.length > 0 ? (
                guestBook.slice(0, 10).map((entry, index) => (
                  <View key={entry.id} style={styles.visitorHistoryItem}>
                    <View style={styles.visitorRankBadge}>
                      <Text style={styles.visitorRankText}>#{index + 1}</Text>
                    </View>
                    <Image source={{ uri: entry.visitorAvatar }} style={styles.visitorHistoryAvatar} />
                    <View style={styles.visitorHistoryInfo}>
                      <Text style={styles.visitorHistoryName}>{entry.visitorName}</Text>
                      <View style={styles.visitorHistoryMeta}>
                        <Clock color={colors.textLight} size={12} />
                        <Text style={styles.visitorHistoryDate}>{getTimeAgo(entry.visitDate)}</Text>
                        <View style={styles.visitorHistoryDuration}>
                          <Text style={styles.visitorDurationText}>
                            {Math.floor(Math.random() * 20 + 5)}min visit
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.visitorHistoryRating}>
                      <Star color="#F59E0B" size={14} fill="#F59E0B" />
                      <Text style={styles.visitorRatingText}>{entry.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyVisitors}>
                  <UserCheck color={colors.textLight} size={40} />
                  <Text style={styles.emptyVisitorsText}>No visitors yet</Text>
                  <Text style={styles.emptyVisitorsSubtext}>Be the first to visit this home!</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'comments' && (
            <View style={styles.commentsSection}>
              {comments.map(renderComment)}
              {comments.length === 0 && (
                <View style={styles.emptyComments}>
                  <MessageCircle color={colors.textLight} size={40} />
                  <Text style={styles.emptyCommentsText}>No comments yet</Text>
                  <Text style={styles.emptyCommentsSubtext}>Be the first to comment!</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'guestbook' && (
            <View style={styles.guestbookSection}>
              {guestBook.map((entry) => (
                <View key={entry.id} style={styles.guestbookEntry}>
                  <View style={styles.guestbookHeader}>
                    <Image source={{ uri: entry.visitorAvatar }} style={styles.guestbookAvatar} />
                    <View style={styles.guestbookInfo}>
                      <Text style={styles.guestbookName}>{entry.visitorName}</Text>
                      <Text style={styles.guestbookDate}>{getTimeAgo(entry.visitDate)}</Text>
                    </View>
                    <View style={styles.ratingContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          color="#F59E0B"
                          size={14}
                          fill={star <= entry.rating ? '#F59E0B' : 'transparent'}
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.guestbookMessage}>{entry.message}</Text>
                </View>
              ))}
              {guestBook.length === 0 && (
                <View style={styles.emptyComments}>
                  <BookOpen color={colors.textLight} size={40} />
                  <Text style={styles.emptyCommentsText}>Guest book is empty</Text>
                  <Text style={styles.emptyCommentsSubtext}>Visit the home to leave a message!</Text>
                </View>
              )}
            </View>
          )}

          {(home.financials.isForSale || home.financials.isForRent) && (
            <View style={styles.listingActionsSection}>
              <Text style={styles.sectionTitle}>Listing Options</Text>
              <View style={styles.listingActionsCard}>
                {home.financials.isForSale && (
                  <TouchableOpacity
                    style={styles.listingActionButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setSelectedListingType('sale');
                      setShowListingModal(true);
                    }}
                  >
                    <View style={[styles.listingActionIcon, { backgroundColor: '#10B98120' }]}>
                      <Tag color="#10B981" size={22} />
                    </View>
                    <View style={styles.listingActionContent}>
                      <Text style={styles.listingActionTitle}>Start Escrow Process</Text>
                      <Text style={styles.listingActionSubtitle}>
                        Purchase this property for {formatHomeValue(home.financials.askingPrice || home.financials.currentValue)}
                      </Text>
                    </View>
                    <ChevronRight color={colors.textLight} size={20} />
                  </TouchableOpacity>
                )}
                {home.financials.isForRent && (
                  <TouchableOpacity
                    style={styles.listingActionButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setSelectedListingType('rent');
                      setShowListingModal(true);
                    }}
                  >
                    <View style={[styles.listingActionIcon, { backgroundColor: '#3B82F620' }]}>
                      <Key color="#3B82F6" size={22} />
                    </View>
                    <View style={styles.listingActionContent}>
                      <Text style={styles.listingActionTitle}>Apply to Rent</Text>
                      <Text style={styles.listingActionSubtitle}>
                        ${home.financials.monthlyRentPrice?.toLocaleString() || '---'}/month
                      </Text>
                    </View>
                    <ChevronRight color={colors.textLight} size={20} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <View style={{ height: 120 }} />
        </View>
      </Animated.ScrollView>

      {showListingModal && (
        <View style={styles.listingModalOverlay}>
          <TouchableOpacity 
            style={styles.listingModalBackdrop} 
            onPress={handleCloseListingModal}
            activeOpacity={1}
          />
          <Animated.View style={styles.listingModalContent}>
            <View style={styles.listingModalHeader}>
              <Text style={styles.listingModalTitle}>
                {isRentalApplication ? 'Rental Application' : 'Purchase Property'}
              </Text>
              <TouchableOpacity onPress={handleCloseListingModal}>
                <ArrowLeft color={colors.text} size={24} />
              </TouchableOpacity>
            </View>

            {applicationStep === 'info' && (
              <ScrollView style={styles.listingModalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.listingPropertySummary}>
                  <Image source={{ uri: home.coverImage }} style={styles.listingSummaryImage} />
                  <View style={styles.listingSummaryInfo}>
                    <Text style={styles.listingSummaryName}>{home.propertyName}</Text>
                    <Text style={styles.listingSummaryLocation}>{home.neighborhood}, {home.city}</Text>
                    <Text style={styles.listingSummaryPrice}>
                      {isRentalApplication
                        ? `${home.financials.monthlyRentPrice?.toLocaleString()}/mo`
                        : formatHomeValue(home.financials.askingPrice || home.financials.currentValue)}
                    </Text>
                  </View>
                </View>

                <View style={styles.applicantSection}>
                  <Text style={styles.applicantSectionTitle}>Applicant Information</Text>
                  <View style={styles.applicantCard}>
                    <View style={styles.applicantHeader}>
                      <Image source={{ uri: applicantProfile.avatar }} style={styles.applicantAvatar} />
                      <View style={styles.applicantNameSection}>
                        <Text style={styles.applicantName}>{applicantProfile.playerName}</Text>
                        <View style={[styles.creditBadgeSmall, { backgroundColor: getCreditScoreColor(applicantProfile.creditScore) + '20' }]}>
                          <Text style={[styles.creditBadgeText, { color: getCreditScoreColor(applicantProfile.creditScore) }]}>
                            Credit Score: {applicantProfile.creditScore}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.applicantDetailsList}>
                      <View style={styles.applicantDetailRow}>
                        <MapPin color={colors.textLight} size={16} />
                        <View style={styles.applicantDetailContent}>
                          <Text style={styles.applicantDetailLabel}>Current Address</Text>
                          <Text style={styles.applicantDetailValue}>{applicantProfile.currentAddress}</Text>
                          <Text style={styles.applicantDetailSub}>{applicantProfile.cityName}</Text>
                        </View>
                      </View>

                      <View style={styles.applicantDetailRow}>
                        <Award color={colors.textLight} size={16} />
                        <View style={styles.applicantDetailContent}>
                          <Text style={styles.applicantDetailLabel}>Employment</Text>
                          <Text style={styles.applicantDetailValue}>{applicantProfile.jobTitle}</Text>
                          <Text style={styles.applicantDetailSub}>{applicantProfile.employer} • {applicantProfile.monthsEmployed} months</Text>
                        </View>
                      </View>

                      <View style={styles.applicantDetailRow}>
                        <DollarSign color={colors.textLight} size={16} />
                        <View style={styles.applicantDetailContent}>
                          <Text style={styles.applicantDetailLabel}>Income</Text>
                          <Text style={styles.applicantDetailValue}>${applicantProfile.monthlyIncome.toLocaleString()}/mo</Text>
                          <Text style={styles.applicantDetailSub}>${applicantProfile.annualIncome.toLocaleString()}/year</Text>
                        </View>
                      </View>

                      <View style={styles.applicantFinancialGrid}>
                        <View style={styles.applicantFinancialItem}>
                          <Text style={styles.applicantFinancialLabel}>Bank Balance</Text>
                          <Text style={styles.applicantFinancialValue}>${applicantProfile.bankBalance.toLocaleString()}</Text>
                        </View>
                        <View style={styles.applicantFinancialItem}>
                          <Text style={styles.applicantFinancialLabel}>Savings</Text>
                          <Text style={styles.applicantFinancialValue}>${applicantProfile.savingsBalance.toLocaleString()}</Text>
                        </View>
                        <View style={styles.applicantFinancialItem}>
                          <Text style={styles.applicantFinancialLabel}>Total Assets</Text>
                          <Text style={[styles.applicantFinancialValue, { color: colors.success }]}>${applicantProfile.totalAssets.toLocaleString()}</Text>
                        </View>
                        <View style={styles.applicantFinancialItem}>
                          <Text style={styles.applicantFinancialLabel}>Total Debt</Text>
                          <Text style={[styles.applicantFinancialValue, { color: applicantProfile.totalDebt > 0 ? '#EF4444' : colors.text }]}>${applicantProfile.totalDebt.toLocaleString()}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.listingInfoSection}>
                  <View style={styles.listingInfoItem}>
                    <FileText color={colors.primary} size={20} />
                    <View style={styles.listingInfoText}>
                      <Text style={styles.listingInfoTitle}>Application Review</Text>
                      <Text style={styles.listingInfoDesc}>Your application will be reviewed within 24-48 hours</Text>
                    </View>
                  </View>
                  <View style={styles.listingInfoItem}>
                    <Shield color={colors.primary} size={20} />
                    <View style={styles.listingInfoText}>
                      <Text style={styles.listingInfoTitle}>Secure Process</Text>
                      <Text style={styles.listingInfoDesc}>All transactions are protected and verified</Text>
                    </View>
                  </View>
                  <View style={styles.listingInfoItem}>
                    <DollarSign color={colors.primary} size={20} />
                    <View style={styles.listingInfoText}>
                      <Text style={styles.listingInfoTitle}>
                        {isRentalApplication ? 'Security Deposit Required' : 'Down Payment Options'}
                      </Text>
                      <Text style={styles.listingInfoDesc}>
                        {isRentalApplication
                          ? `First month (${home.financials.monthlyRentPrice?.toLocaleString()}) + security deposit`
                          : `20% down payment: ${Math.round((home.financials.askingPrice || home.financials.currentValue) * 0.20).toLocaleString()}`}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.listingStartButton} 
                  onPress={handleProceedToTerms}
                >
                  <Text style={styles.listingStartButtonText}>Continue to Terms & Conditions</Text>
                </TouchableOpacity>
                <View style={{ height: 20 }} />
              </ScrollView>
            )}

            {applicationStep === 'terms' && (
              <ScrollView style={styles.listingModalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.termsHeader}>
                  <FileText color={colors.primary} size={32} />
                  <Text style={styles.termsTitle}>
                    {isRentalApplication ? 'Rental Agreement Terms' : 'Purchase Agreement Terms'}
                  </Text>
                  <Text style={styles.termsSubtitle}>
                    Please review and accept all terms to proceed with your application
                  </Text>
                </View>

                {isRentalApplication ? (
                  <View style={styles.termsCheckboxList}>
                    <TouchableOpacity 
                      style={styles.termCheckboxItem} 
                      onPress={() => toggleRentalTerm('leaseAgreement')}
                    >
                      <View style={[styles.checkbox, rentalTerms.leaseAgreement && styles.checkboxChecked]}>
                        {rentalTerms.leaseAgreement && <Shield color="#FFFFFF" size={14} />}
                      </View>
                      <View style={styles.termTextContainer}>
                        <Text style={styles.termLabel}>Lease Agreement</Text>
                        <Text style={styles.termDescription}>I agree to sign a 12-month lease agreement with the property owner</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.termCheckboxItem} 
                      onPress={() => toggleRentalTerm('creditCheck')}
                    >
                      <View style={[styles.checkbox, rentalTerms.creditCheck && styles.checkboxChecked]}>
                        {rentalTerms.creditCheck && <Shield color="#FFFFFF" size={14} />}
                      </View>
                      <View style={styles.termTextContainer}>
                        <Text style={styles.termLabel}>Credit Check Authorization</Text>
                        <Text style={styles.termDescription}>I authorize the landlord to check my credit history</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.termCheckboxItem} 
                      onPress={() => toggleRentalTerm('backgroundCheck')}
                    >
                      <View style={[styles.checkbox, rentalTerms.backgroundCheck && styles.checkboxChecked]}>
                        {rentalTerms.backgroundCheck && <Shield color="#FFFFFF" size={14} />}
                      </View>
                      <View style={styles.termTextContainer}>
                        <Text style={styles.termLabel}>Background Check</Text>
                        <Text style={styles.termDescription}>I consent to a background verification check</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.termCheckboxItem} 
                      onPress={() => toggleRentalTerm('petPolicy')}
                    >
                      <View style={[styles.checkbox, rentalTerms.petPolicy && styles.checkboxChecked]}>
                        {rentalTerms.petPolicy && <Shield color="#FFFFFF" size={14} />}
                      </View>
                      <View style={styles.termTextContainer}>
                        <Text style={styles.termLabel}>Pet Policy</Text>
                        <Text style={styles.termDescription}>I understand and agree to the property pet policy</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.termCheckboxItem} 
                      onPress={() => toggleRentalTerm('moveInInspection')}
                    >
                      <View style={[styles.checkbox, rentalTerms.moveInInspection && styles.checkboxChecked]}>
                        {rentalTerms.moveInInspection && <Shield color="#FFFFFF" size={14} />}
                      </View>
                      <View style={styles.termTextContainer}>
                        <Text style={styles.termLabel}>Move-In Inspection</Text>
                        <Text style={styles.termDescription}>I agree to complete a move-in inspection checklist</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.termCheckboxItem} 
                      onPress={() => toggleRentalTerm('rentResponsibility')}
                    >
                      <View style={[styles.checkbox, rentalTerms.rentResponsibility && styles.checkboxChecked]}>
                        {rentalTerms.rentResponsibility && <Shield color="#FFFFFF" size={14} />}
                      </View>
                      <View style={styles.termTextContainer}>
                        <Text style={styles.termLabel}>Rent Payment Responsibility</Text>
                        <Text style={styles.termDescription}>I understand rent is due on the 1st of each month with late fees after the 5th</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.termCheckboxItem} 
                      onPress={() => toggleRentalTerm('maintenancePolicy')}
                    >
                      <View style={[styles.checkbox, rentalTerms.maintenancePolicy && styles.checkboxChecked]}>
                        {rentalTerms.maintenancePolicy && <Shield color="#FFFFFF" size={14} />}
                      </View>
                      <View style={styles.termTextContainer}>
                        <Text style={styles.termLabel}>Maintenance Policy</Text>
                        <Text style={styles.termDescription}>I agree to report maintenance issues promptly and maintain the property</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.termCheckboxItem} 
                      onPress={() => toggleRentalTerm('noisePolicy')}
                    >
                      <View style={[styles.checkbox, rentalTerms.noisePolicy && styles.checkboxChecked]}>
                        {rentalTerms.noisePolicy && <Shield color="#FFFFFF" size={14} />}
                      </View>
                      <View style={styles.termTextContainer}>
                        <Text style={styles.termLabel}>Noise & Community Policy</Text>
                        <Text style={styles.termDescription}>I agree to respect quiet hours and community guidelines</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.termsCheckboxList}>
                    <TouchableOpacity 
                      style={styles.termCheckboxItem} 
                      onPress={() => togglePurchaseTerm('purchaseAgreement')}
                    >
                      <View style={[styles.checkbox, purchaseTerms.purchaseAgreement && styles.checkboxChecked]}>
                        {purchaseTerms.purchaseAgreement && <Shield color="#FFFFFF" size={14} />}
                      </View>
                      <View style={styles.termTextContainer}>
                        <Text style={styles.termLabel}>Purchase Agreement</Text>
                        <Text style={styles.termDescription}>I agree to the terms of the residential purchase agreement</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.termCheckboxItem} 
                      onPress={() => togglePurchaseTerm('creditCheck')}
                    >
                      <View style={[styles.checkbox, purchaseTerms.creditCheck && styles.checkboxChecked]}>
                        {purchaseTerms.creditCheck && <Shield color="#FFFFFF" size={14} />}
                      </View>
                      <View style={styles.termTextContainer}>
                        <Text style={styles.termLabel}>Credit Check Authorization</Text>
                        <Text style={styles.termDescription}>I authorize credit verification for mortgage pre-approval</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.termCheckboxItem} 
                      onPress={() => togglePurchaseTerm('titleSearch')}
                    >
                      <View style={[styles.checkbox, purchaseTerms.titleSearch && styles.checkboxChecked]}>
                        {purchaseTerms.titleSearch && <Shield color="#FFFFFF" size={14} />}
                      </View>
                      <View style={styles.termTextContainer}>
                        <Text style={styles.termLabel}>Title Search</Text>
                        <Text style={styles.termDescription}>I understand a title search will be conducted to verify ownership</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.termCheckboxItem} 
                      onPress={() => togglePurchaseTerm('homeInspection')}
                    >
                      <View style={[styles.checkbox, purchaseTerms.homeInspection && styles.checkboxChecked]}>
                        {purchaseTerms.homeInspection && <Shield color="#FFFFFF" size={14} />}
                      </View>
                      <View style={styles.termTextContainer}>
                        <Text style={styles.termLabel}>Home Inspection Contingency</Text>
                        <Text style={styles.termDescription}>I have the right to a professional home inspection within 10 days</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.termCheckboxItem} 
                      onPress={() => togglePurchaseTerm('appraisalContingency')}
                    >
                      <View style={[styles.checkbox, purchaseTerms.appraisalContingency && styles.checkboxChecked]}>
                        {purchaseTerms.appraisalContingency && <Shield color="#FFFFFF" size={14} />}
                      </View>
                      <View style={styles.termTextContainer}>
                        <Text style={styles.termLabel}>Appraisal Contingency</Text>
                        <Text style={styles.termDescription}>Purchase is contingent on property appraising at or above sale price</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.termCheckboxItem} 
                      onPress={() => togglePurchaseTerm('financingContingency')}
                    >
                      <View style={[styles.checkbox, purchaseTerms.financingContingency && styles.checkboxChecked]}>
                        {purchaseTerms.financingContingency && <Shield color="#FFFFFF" size={14} />}
                      </View>
                      <View style={styles.termTextContainer}>
                        <Text style={styles.termLabel}>Financing Contingency</Text>
                        <Text style={styles.termDescription}>Purchase is contingent on obtaining mortgage financing approval</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.termCheckboxItem} 
                      onPress={() => togglePurchaseTerm('escrowTerms')}
                    >
                      <View style={[styles.checkbox, purchaseTerms.escrowTerms && styles.checkboxChecked]}>
                        {purchaseTerms.escrowTerms && <Shield color="#FFFFFF" size={14} />}
                      </View>
                      <View style={styles.termTextContainer}>
                        <Text style={styles.termLabel}>Escrow Terms</Text>
                        <Text style={styles.termDescription}>I agree to deposit earnest money into escrow within 3 business days</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.termCheckboxItem} 
                      onPress={() => togglePurchaseTerm('closingCosts')}
                    >
                      <View style={[styles.checkbox, purchaseTerms.closingCosts && styles.checkboxChecked]}>
                        {purchaseTerms.closingCosts && <Shield color="#FFFFFF" size={14} />}
                      </View>
                      <View style={styles.termTextContainer}>
                        <Text style={styles.termLabel}>Closing Costs</Text>
                        <Text style={styles.termDescription}>I understand I am responsible for buyer closing costs (2-5% of purchase price)</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.termCheckboxItem} 
                      onPress={() => togglePurchaseTerm('propertyTaxes')}
                    >
                      <View style={[styles.checkbox, purchaseTerms.propertyTaxes && styles.checkboxChecked]}>
                        {purchaseTerms.propertyTaxes && <Shield color="#FFFFFF" size={14} />}
                      </View>
                      <View style={styles.termTextContainer}>
                        <Text style={styles.termLabel}>Property Taxes</Text>
                        <Text style={styles.termDescription}>I understand I will be responsible for property taxes from closing date</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.termCheckboxItem} 
                      onPress={() => togglePurchaseTerm('insuranceRequirement')}
                    >
                      <View style={[styles.checkbox, purchaseTerms.insuranceRequirement && styles.checkboxChecked]}>
                        {purchaseTerms.insuranceRequirement && <Shield color="#FFFFFF" size={14} />}
                      </View>
                      <View style={styles.termTextContainer}>
                        <Text style={styles.termLabel}>Homeowner Insurance</Text>
                        <Text style={styles.termDescription}>I agree to obtain homeowner insurance before closing</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.applicationFeeNotice}>
                  <DollarSign color={colors.warning} size={20} />
                  <Text style={styles.applicationFeeText}>
                    Application fee: ${isRentalApplication ? '50' : '500'} (non-refundable)
                  </Text>
                </View>

                <TouchableOpacity 
                  style={[
                    styles.listingStartButton, 
                    (isSubmitting || (isRentalApplication ? !allRentalTermsAccepted : !allPurchaseTermsAccepted)) && styles.listingStartButtonDisabled
                  ]} 
                  onPress={handleSubmitApplication}
                  disabled={isSubmitting || (isRentalApplication ? !allRentalTermsAccepted : !allPurchaseTermsAccepted)}
                >
                  <Text style={styles.listingStartButtonText}>
                    {isSubmitting 
                      ? 'Submitting Application...' 
                      : isRentalApplication
                        ? 'Submit Rental Application'
                        : 'Submit Purchase Application'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.backToInfoButton} 
                  onPress={() => setApplicationStep('info')}
                >
                  <Text style={styles.backToInfoText}>Back to Application Info</Text>
                </TouchableOpacity>
                <View style={{ height: 20 }} />
              </ScrollView>
            )}

            {applicationStep === 'submitted' && submittedApplication && (
              <View style={styles.listingModalBody}>
                <View style={styles.successContainer}>
                  <View style={styles.successIconContainer}>
                    <Shield color="#10B981" size={48} />
                  </View>
                  <Text style={styles.successTitle}>Application Submitted!</Text>
                  <Text style={styles.successApplicationId}>Application ID: {submittedApplication.id.slice(0, 16)}...</Text>
                  
                  <View style={styles.successSummaryCard}>
                    <Text style={styles.successSummaryTitle}>Application Summary</Text>
                    <View style={styles.successSummaryRow}>
                      <Text style={styles.successSummaryLabel}>Type:</Text>
                      <Text style={styles.successSummaryValue}>{submittedApplication.type === 'rental' ? 'Rental Application' : 'Purchase Application'}</Text>
                    </View>
                    <View style={styles.successSummaryRow}>
                      <Text style={styles.successSummaryLabel}>Property:</Text>
                      <Text style={styles.successSummaryValue}>{home.propertyName}</Text>
                    </View>
                    <View style={styles.successSummaryRow}>
                      <Text style={styles.successSummaryLabel}>Credit Score:</Text>
                      <Text style={[styles.successSummaryValue, { color: getCreditScoreColor(applicantProfile.creditScore) }]}>
                        {applicantProfile.creditScore}
                      </Text>
                    </View>
                    <View style={styles.successSummaryRow}>
                      <Text style={styles.successSummaryLabel}>Monthly Income:</Text>
                      <Text style={styles.successSummaryValue}>${applicantProfile.monthlyIncome.toLocaleString()}</Text>
                    </View>
                    <View style={styles.successSummaryRow}>
                      <Text style={styles.successSummaryLabel}>Status:</Text>
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>Pending Review</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.successText}>
                    {submittedApplication.type === 'rental'
                      ? 'Your rental application has been submitted with your current employment and financial information. The property owner will review your application and contact you within 24-48 hours.'
                      : 'Your purchase request has been submitted. Our escrow team will contact you within 24 hours to begin the process. Your credit and financial details have been securely transmitted.'}
                  </Text>
                  <TouchableOpacity style={styles.listingStartButton} onPress={handleCloseListingModal}>
                    <Text style={styles.listingStartButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        </View>
      )}

      {showVisitorLimitModal && (
        <View style={styles.visitorLimitModalOverlay}>
          <TouchableOpacity
            style={styles.visitorLimitModalBackdrop}
            onPress={() => setShowVisitorLimitModal(false)}
            activeOpacity={1}
          />
          <View style={styles.visitorLimitModalContent}>
            <View style={styles.visitorLimitIconContainer}>
              <AlertCircle color="#F59E0B" size={48} />
            </View>
            <Text style={styles.visitorLimitTitle}>Home is Full</Text>
            <Text style={styles.visitorLimitText}>
              This home has reached its maximum visitor capacity of {maxVisitors} visitors.
              Please try again later when some visitors leave.
            </Text>
            <View style={styles.visitorLimitStats}>
              <View style={styles.visitorLimitStatItem}>
                <Text style={styles.visitorLimitStatValue}>{currentVisitors}</Text>
                <Text style={styles.visitorLimitStatLabel}>Current</Text>
              </View>
              <View style={styles.visitorLimitStatDivider} />
              <View style={styles.visitorLimitStatItem}>
                <Text style={styles.visitorLimitStatValue}>{maxVisitors}</Text>
                <Text style={styles.visitorLimitStatLabel}>Maximum</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.visitorLimitButton}
              onPress={() => setShowVisitorLimitModal(false)}
            >
              <Text style={styles.visitorLimitButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}
      >
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              toggleLike(home.id);
            }}
          >
            <Heart
              color={home.social.isLiked ? '#EF4444' : colors.text}
              size={24}
              fill={home.social.isLiked ? '#EF4444' : 'transparent'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleSave(home.id);
            }}
          >
            <Bookmark
              color={home.social.isSaved ? '#F59E0B' : colors.text}
              size={24}
              fill={home.social.isSaved ? '#F59E0B' : 'transparent'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Share2 color={colors.text} size={24} />
          </TouchableOpacity>
          {home.settings.virtualTourAvailable && (
            <TouchableOpacity 
              style={[styles.enterButton, !canVisit && styles.enterButtonDisabled]} 
              onPress={handleVisit}
            >
              <Play color="#FFFFFF" size={18} fill="#FFFFFF" />
              <Text style={styles.enterButtonText}>
                {canVisit ? 'Enter Home' : `Full (${currentVisitors}/${maxVisitors})`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {activeTab === 'comments' && (
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textLight}
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
              onPress={handleAddComment}
              disabled={!commentText.trim()}
            >
              <Send color={commentText.trim() ? '#FFFFFF' : colors.textLight} size={18} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: colors.background,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginHorizontal: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  scrollView: {
    flex: 1,
  },
  imageGallery: {
    width,
    height: 350,
    position: 'relative',
  },
  galleryImage: {
    width,
    height: 350,
  },
  galleryGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backButtonOverlay: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryPagination: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  visitButtonLarge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.95)',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  visitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  ownerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
  },
  ownerAvatarContainer: {
    position: 'relative',
  },
  ownerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.border,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  ownerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ownerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  ownerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ownerLevel: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '500',
  },
  creditBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  creditScoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  followButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  followingButton: {
    backgroundColor: colors.border,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  followingButtonText: {
    color: colors.textSecondary,
  },
  propertyHeader: {
    marginBottom: 16,
  },
  propertyTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  propertyTypeEmoji: {
    fontSize: 24,
  },
  styleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  styleText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  propertyName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 15,
    color: colors.textLight,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: 14,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    width: (width - 64) / 4,
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 14,
    borderRadius: 14,
  },
  detailValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
  },
  detailLabel: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 2,
    textAlign: 'center',
  },
  financialSection: {
    marginBottom: 24,
  },
  financialCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  financialLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  financialValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  gainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gainValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  gainPercent: {
    fontSize: 13,
    color: '#10B981',
  },
  featuresSection: {
    marginBottom: 24,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  featureText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  modelSection: {
    marginBottom: 20,
  },
  roomsList: {
    gap: 10,
  },
  roomCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  roomDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  roomFloor: {
    fontSize: 12,
    color: colors.textLight,
    textTransform: 'capitalize',
  },
  commentsSection: {
    marginBottom: 20,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  commentContent: {
    flex: 1,
    marginLeft: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  commentLevel: {
    fontSize: 11,
    color: colors.textLight,
  },
  commentTime: {
    fontSize: 11,
    color: colors.textLight,
  },
  commentText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    color: colors.textLight,
  },
  replyItem: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  replyContent: {
    flex: 1,
    marginLeft: 10,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCommentsText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptyCommentsSubtext: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 4,
  },
  guestbookSection: {
    marginBottom: 20,
  },
  guestbookEntry: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  guestbookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  guestbookAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  guestbookInfo: {
    flex: 1,
    marginLeft: 12,
  },
  guestbookName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  guestbookDate: {
    fontSize: 12,
    color: colors.textLight,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  guestbookMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  listingActionsSection: {
    marginBottom: 24,
  },
  listingActionsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  listingActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listingActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  listingActionContent: {
    flex: 1,
  },
  listingActionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  listingActionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  listingModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  listingModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  listingModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  listingModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listingModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  listingModalBody: {
    padding: 20,
  },
  listingPropertySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  listingSummaryImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  listingSummaryInfo: {
    flex: 1,
    marginLeft: 14,
  },
  listingSummaryName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  listingSummaryLocation: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 4,
  },
  listingSummaryPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  listingInfoSection: {
    marginBottom: 24,
  },
  listingInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  listingInfoText: {
    flex: 1,
    marginLeft: 14,
  },
  listingInfoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  listingInfoDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  listingStartButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  listingStartButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  applicantSection: {
    marginBottom: 20,
  },
  applicantSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  applicantCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  applicantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  applicantAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
  },
  applicantNameSection: {
    flex: 1,
  },
  applicantName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  creditBadgeSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  creditBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  applicantDetailsList: {
    gap: 14,
  },
  applicantDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  applicantDetailContent: {
    flex: 1,
  },
  applicantDetailLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 2,
  },
  applicantDetailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  applicantDetailSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  applicantFinancialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 10,
  },
  applicantFinancialItem: {
    width: '47%',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 10,
  },
  applicantFinancialLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginBottom: 4,
  },
  applicantFinancialValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  listingStartButtonDisabled: {
    opacity: 0.6,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B98120',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  successText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  successApplicationId: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  successSummaryCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  successSummaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  successSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  successSummaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  successSummaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  pendingBadge: {
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#F59E0B',
  },
  termsHeader: {
    alignItems: 'center' as const,
    marginBottom: 24,
  },
  termsTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
    marginTop: 12,
    textAlign: 'center' as const,
  },
  termsSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: 8,
    paddingHorizontal: 20,
  },
  termsCheckboxList: {
    gap: 12,
    marginBottom: 20,
  },
  termCheckboxItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    backgroundColor: colors.surfaceAlt,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termTextContainer: {
    flex: 1,
  },
  termLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  termDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  applicationFeeNotice: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#F59E0B15',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  applicationFeeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#F59E0B',
  },
  backToInfoButton: {
    alignItems: 'center' as const,
    paddingVertical: 14,
    marginTop: 8,
  },
  backToInfoText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500' as const,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  enterButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  enterButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  visitorsSection: {
    marginBottom: 20,
  },
  visitorStatsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  visitorStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visitorStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  visitorStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
  },
  visitorStatLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 4,
  },
  visitorStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  visitorHistoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  visitorHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  visitorRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  visitorRankText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  visitorHistoryAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  visitorHistoryInfo: {
    flex: 1,
  },
  visitorHistoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  visitorHistoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  visitorHistoryDate: {
    fontSize: 12,
    color: colors.textLight,
  },
  visitorHistoryDuration: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  visitorDurationText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  visitorHistoryRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  visitorRatingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  emptyVisitors: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyVisitorsText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptyVisitorsSubtext: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 4,
  },
  visitorLimitModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  visitorLimitModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  visitorLimitModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 32,
    alignItems: 'center',
  },
  visitorLimitIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F59E0B20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  visitorLimitTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  visitorLimitText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  visitorLimitStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  visitorLimitStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  visitorLimitStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  visitorLimitStatLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },
  visitorLimitStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  visitorLimitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  visitorLimitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    fontSize: 14,
    color: colors.text,
    maxHeight: 80,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
});
