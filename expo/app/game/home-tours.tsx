import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  Animated,
  Modal,
  TextInput,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MapPin,
  Home,
  X,
  Send,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  TrendingUp,
  Bed,
  Bath,
  Square,
  DollarSign,
  Eye,
  Star,
  Sparkles,
  Crown,
  Building2,
  Users,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  communityHomes,
  CommunityHomeProfile,
  homeComments,
  HomeComment,
  formatHomeValue,
  formatHomeViews,
  getHomeTimeAgo,
  getPropertyTypeIcon,
  getStyleColor,
} from '@/mocks/communityHomes';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type FeedTab = 'trending' | 'following' | 'newest';

export default function HomeToursScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<FeedTab>('trending');
  const [homes, setHomes] = useState<CommunityHomeProfile[]>(communityHomes);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedHomeComments, setSelectedHomeComments] = useState<HomeComment[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const heartScaleAnim = useRef(new Animated.Value(1)).current;
  const detailsSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const commentsSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
      setCurrentImageIndex(0);
    }
  }, []);

  const handleLike = useCallback((homeId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setHomes(prev =>
      prev.map(h =>
        h.id === homeId
          ? { ...h, isLiked: !h.isLiked, likes: h.isLiked ? h.likes - 1 : h.likes + 1 }
          : h
      )
    );
    Animated.sequence([
      Animated.timing(heartScaleAnim, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(heartScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heartScaleAnim]);

  const handleBookmark = useCallback((homeId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setHomes(prev =>
      prev.map(h =>
        h.id === homeId
          ? { ...h, isBookmarked: !h.isBookmarked }
          : h
      )
    );
  }, []);

  const handleFollow = useCallback((homeId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setHomes(prev =>
      prev.map(h =>
        h.id === homeId ? { ...h, isFollowing: !h.isFollowing } : h
      )
    );
  }, []);

  const openComments = useCallback((homeId: string) => {
    setSelectedHomeComments(homeComments[homeId] || []);
    setShowComments(true);
    Animated.spring(commentsSlideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [commentsSlideAnim]);

  const closeComments = useCallback(() => {
    Animated.timing(commentsSlideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowComments(false);
      setCommentText('');
    });
  }, [commentsSlideAnim]);

  const openDetails = useCallback(() => {
    setShowDetails(true);
    Animated.spring(detailsSlideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [detailsSlideAnim]);

  const closeDetails = useCallback(() => {
    Animated.timing(detailsSlideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setShowDetails(false));
  }, [detailsSlideAnim]);

  const loadMoreHomes = useCallback(() => {
    if (loadingMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      const moreHomes = communityHomes.map((h, i) => ({
        ...h,
        id: `${h.id}_${Date.now()}_${i}`,
      }));
      setHomes(prev => [...prev, ...moreHomes]);
      setLoadingMore(false);
    }, 500);
  }, [loadingMore]);

  const handleShare = useCallback((home: CommunityHomeProfile) => {
    console.log('Sharing home:', home.id);
  }, []);

  const nextImage = useCallback((home: CommunityHomeProfile) => {
    if (currentImageIndex < home.images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
  }, [currentImageIndex]);

  const prevImage = useCallback(() => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  }, [currentImageIndex]);

  const getCreditScoreColor = (score: number) => {
    if (score >= 800) return '#10B981';
    if (score >= 740) return '#22C55E';
    if (score >= 670) return '#F59E0B';
    if (score >= 580) return '#F97316';
    return '#EF4444';
  };

  const renderHomeItem = useCallback(({ item, index }: { item: CommunityHomeProfile; index: number }) => {
    const isCurrentItem = index === currentIndex;
    const displayImageIndex = isCurrentItem ? currentImageIndex : 0;

    return (
      <View style={[styles.homeContainer, { height: SCREEN_HEIGHT }]}>
        <Image
          source={{ uri: item.images[displayImageIndex] || item.coverImage }}
          style={styles.homeImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent', 'transparent', 'rgba(0,0,0,0.8)']}
          locations={[0, 0.2, 0.5, 1]}
          style={styles.homeOverlay}
        />

        {item.images.length > 1 && (
          <>
            <View style={[styles.imageIndicators, { top: insets.top + 60 }]}>
              {item.images.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.imageIndicator,
                    i === displayImageIndex && styles.imageIndicatorActive,
                  ]}
                />
              ))}
            </View>
            <TouchableOpacity
              style={[styles.imageNavButton, styles.imageNavLeft]}
              onPress={prevImage}
              activeOpacity={0.7}
            >
              <ChevronLeft size={32} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.imageNavButton, styles.imageNavRight]}
              onPress={() => nextImage(item)}
              activeOpacity={0.7}
            >
              <ChevronRight size={32} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </>
        )}

        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.tabContainer}>
            {(['trending', 'following', 'newest'] as FeedTab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={styles.tabButton}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
                {activeTab === tab && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ width: 44 }} />
        </View>

        <View style={[styles.rightActions, { bottom: insets.bottom + 100 }]}>
          <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: item.ownerAvatar }} style={styles.actionAvatar} />
              {!item.isFollowing && (
                <TouchableOpacity
                  style={styles.followBadge}
                  onPress={() => handleFollow(item.id)}
                >
                  <Users size={10} color="#FFF" strokeWidth={3} />
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
          >
            <Animated.View style={{ transform: [{ scale: item.isLiked ? heartScaleAnim : 1 }] }}>
              <Heart
                size={32}
                color={item.isLiked ? '#EF4444' : '#FFF'}
                fill={item.isLiked ? '#EF4444' : 'transparent'}
              />
            </Animated.View>
            <Text style={styles.actionText}>{formatHomeViews(item.likes)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openComments(item.id)}
          >
            <MessageCircle size={30} color="#FFF" />
            <Text style={styles.actionText}>{formatHomeViews(item.comments)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleBookmark(item.id)}
          >
            <Bookmark
              size={28}
              color={item.isBookmarked ? '#F59E0B' : '#FFF'}
              fill={item.isBookmarked ? '#F59E0B' : 'transparent'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShare(item)}
          >
            <Share2 size={28} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={openDetails}
          >
            <View style={styles.detailsButton}>
              <Home size={20} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.bottomInfo, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.ownerInfo}>
            <TouchableOpacity style={styles.ownerNameContainer}>
              <Text style={styles.ownerName}>@{item.ownerName}</Text>
              {item.isVerified && (
                <BadgeCheck size={16} color="#3B82F6" fill="#3B82F6" style={{ marginLeft: 4 }} />
              )}
              <View style={styles.levelBadge}>
                <Crown size={10} color="#FFD700" />
                <Text style={styles.levelText}>Lv.{item.ownerLevel}</Text>
              </View>
            </TouchableOpacity>
            <View style={[styles.creditScoreBadge, { backgroundColor: getCreditScoreColor(item.ownerCreditScore) + '30' }]}>
              <TrendingUp size={12} color={getCreditScoreColor(item.ownerCreditScore)} />
              <Text style={[styles.creditScoreText, { color: getCreditScoreColor(item.ownerCreditScore) }]}>
                {item.ownerCreditScore}
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={openDetails} activeOpacity={0.8}>
            <View style={styles.propertyHeader}>
              <Text style={styles.propertyIcon}>{getPropertyTypeIcon(item.propertyType)}</Text>
              <Text style={styles.propertyName}>{item.propertyName}</Text>
              {item.virtualTourAvailable && (
                <View style={styles.tourBadge}>
                  <Eye size={10} color="#FFF" />
                  <Text style={styles.tourBadgeText}>Tour</Text>
                </View>
              )}
            </View>

            <View style={styles.locationRow}>
              <MapPin size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.locationText}>{item.neighborhood}, {item.city}</Text>
            </View>

            <View style={styles.propertyStats}>
              <View style={styles.statItem}>
                <Bed size={14} color="#FFF" />
                <Text style={styles.statText}>{item.bedrooms}</Text>
              </View>
              <View style={styles.statItem}>
                <Bath size={14} color="#FFF" />
                <Text style={styles.statText}>{item.bathrooms}</Text>
              </View>
              <View style={styles.statItem}>
                <Square size={14} color="#FFF" />
                <Text style={styles.statText}>{item.squareFootage.toLocaleString()} sqft</Text>
              </View>
            </View>
          </TouchableOpacity>

          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>

          {item.netWorthGain && !item.isRenting && (
            <View style={styles.netWorthBadge}>
              <Sparkles size={14} color="#10B981" />
              <Text style={styles.netWorthText}>+{formatHomeValue(item.netWorthGain)} equity built</Text>
            </View>
          )}

          <View style={styles.priceRow}>
            {item.isRenting ? (
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Renting</Text>
                <Text style={styles.priceValue}>${item.monthlyRent?.toLocaleString()}/mo</Text>
              </View>
            ) : (
              <>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>Purchased</Text>
                  <Text style={styles.priceValue}>{formatHomeValue(item.purchasePrice)}</Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>Current Value</Text>
                  <Text style={[styles.priceValue, { color: '#10B981' }]}>{formatHomeValue(item.currentValue)}</Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.featuresRow}>
            {item.features.slice(0, 3).map((feature, i) => (
              <View key={i} style={[styles.featureTag, { backgroundColor: getStyleColor(item.style) + '40' }]}>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
            {item.features.length > 3 && (
              <View style={styles.featureTag}>
                <Text style={styles.featureText}>+{item.features.length - 3}</Text>
              </View>
            )}
          </View>

          <View style={styles.viewsRow}>
            <Eye size={14} color="rgba(255,255,255,0.6)" />
            <Text style={styles.viewsText}>{formatHomeViews(item.visits)} visits</Text>
            <Text style={styles.timeAgo}>• {getHomeTimeAgo(item.lastUpdated)}</Text>
          </View>
        </View>
      </View>
    );
  }, [activeTab, currentIndex, currentImageIndex, insets, heartScaleAnim, handleLike, handleBookmark, handleFollow, openComments, handleShare, openDetails, router, prevImage, nextImage]);

  const renderComment = ({ item }: { item: HomeComment }) => (
    <View style={styles.commentItem}>
      <Image source={{ uri: item.userAvatar }} style={styles.commentAvatar} />
      <View style={styles.commentContent}>
        <Text style={[styles.commentUsername, { color: colors.text }]}>{item.username}</Text>
        <Text style={[styles.commentText, { color: colors.textSecondary }]}>{item.content}</Text>
        <View style={styles.commentMeta}>
          <Text style={[styles.commentTime, { color: colors.textLight }]}>{getHomeTimeAgo(item.createdAt)}</Text>
          <TouchableOpacity style={styles.commentReplyButton}>
            <Text style={[styles.commentReplyText, { color: colors.textLight }]}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.commentLikeButton}>
        <Heart size={16} color={item.isLiked ? '#EF4444' : colors.textLight} fill={item.isLiked ? '#EF4444' : 'transparent'} />
        <Text style={[styles.commentLikeCount, { color: colors.textLight }]}>{item.likes}</Text>
      </TouchableOpacity>
    </View>
  );

  const currentHome = homes[currentIndex];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={homes}
          renderItem={renderHomeItem}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={SCREEN_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onEndReached={loadMoreHomes}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={3}
          windowSize={5}
          initialNumToRender={2}
          getItemLayout={(_, index) => ({
            length: SCREEN_HEIGHT,
            offset: SCREEN_HEIGHT * index,
            index,
          })}
        />

        <Modal visible={showComments} transparent animationType="none">
          <TouchableOpacity
            style={styles.commentsOverlay}
            activeOpacity={1}
            onPress={closeComments}
          />
          <Animated.View
            style={[
              styles.commentsSheet,
              {
                backgroundColor: colors.surface,
                transform: [{ translateY: commentsSlideAnim }],
                paddingBottom: insets.bottom,
              },
            ]}
          >
            <View style={styles.commentsHeader}>
              <View style={styles.commentsHandle} />
              <Text style={[styles.commentsTitle, { color: colors.text }]}>
                {selectedHomeComments.length} Comments
              </Text>
              <TouchableOpacity onPress={closeComments} style={styles.closeCommentsButton}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={selectedHomeComments}
              renderItem={renderComment}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.commentsList}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={10}
              initialNumToRender={10}
              ListEmptyComponent={
                <View style={styles.noComments}>
                  <MessageCircle size={48} color={colors.textLight} />
                  <Text style={[styles.noCommentsText, { color: colors.textSecondary }]}>
                    No comments yet. Be the first!
                  </Text>
                </View>
              }
            />
            <View style={[styles.commentInputContainer, { borderTopColor: colors.border }]}>
              <TextInput
                style={[styles.commentInput, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="Add a comment..."
                placeholderTextColor={colors.textLight}
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, { opacity: commentText.trim() ? 1 : 0.5 }]}
                disabled={!commentText.trim()}
              >
                <Send size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Modal>

        <Modal visible={showDetails} transparent animationType="none">
          <TouchableOpacity
            style={styles.detailsOverlay}
            activeOpacity={1}
            onPress={closeDetails}
          />
          <Animated.View
            style={[
              styles.detailsSheet,
              {
                backgroundColor: colors.surface,
                transform: [{ translateY: detailsSlideAnim }],
                paddingBottom: insets.bottom,
              },
            ]}
          >
            {currentHome && (
              <>
                <View style={styles.detailsHeader}>
                  <View style={styles.commentsHandle} />
                  <Text style={[styles.detailsTitle, { color: colors.text }]}>
                    {currentHome.propertyName}
                  </Text>
                  <TouchableOpacity onPress={closeDetails} style={styles.closeCommentsButton}>
                    <X size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.detailsContent} showsVerticalScrollIndicator={false}>
                  <View style={styles.detailsOwner}>
                    <Image source={{ uri: currentHome.ownerAvatar }} style={styles.detailsOwnerAvatar} />
                    <View style={styles.detailsOwnerInfo}>
                      <View style={styles.detailsOwnerNameRow}>
                        <Text style={[styles.detailsOwnerName, { color: colors.text }]}>@{currentHome.ownerName}</Text>
                        {currentHome.isVerified && <BadgeCheck size={18} color="#3B82F6" fill="#3B82F6" />}
                      </View>
                      <Text style={[styles.detailsOwnerScore, { color: getCreditScoreColor(currentHome.ownerCreditScore) }]}>
                        Credit Score: {currentHome.ownerCreditScore}
                      </Text>
                    </View>
                    {!currentHome.isFollowing && (
                      <TouchableOpacity
                        style={[styles.detailsFollowButton, { backgroundColor: colors.primary }]}
                        onPress={() => handleFollow(currentHome.id)}
                      >
                        <Text style={styles.detailsFollowText}>Follow</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={[styles.detailsSectionTitle, { color: colors.text }]}>Property Details</Text>
                    <View style={styles.detailsGrid}>
                      <View style={[styles.detailsGridItem, { backgroundColor: colors.background }]}>
                        <Building2 size={20} color={colors.primary} />
                        <Text style={[styles.detailsGridLabel, { color: colors.textSecondary }]}>Type</Text>
                        <Text style={[styles.detailsGridValue, { color: colors.text }]}>
                          {currentHome.propertyType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Text>
                      </View>
                      <View style={[styles.detailsGridItem, { backgroundColor: colors.background }]}>
                        <Bed size={20} color={colors.primary} />
                        <Text style={[styles.detailsGridLabel, { color: colors.textSecondary }]}>Bedrooms</Text>
                        <Text style={[styles.detailsGridValue, { color: colors.text }]}>{currentHome.bedrooms}</Text>
                      </View>
                      <View style={[styles.detailsGridItem, { backgroundColor: colors.background }]}>
                        <Bath size={20} color={colors.primary} />
                        <Text style={[styles.detailsGridLabel, { color: colors.textSecondary }]}>Bathrooms</Text>
                        <Text style={[styles.detailsGridValue, { color: colors.text }]}>{currentHome.bathrooms}</Text>
                      </View>
                      <View style={[styles.detailsGridItem, { backgroundColor: colors.background }]}>
                        <Square size={20} color={colors.primary} />
                        <Text style={[styles.detailsGridLabel, { color: colors.textSecondary }]}>Size</Text>
                        <Text style={[styles.detailsGridValue, { color: colors.text }]}>{currentHome.squareFootage.toLocaleString()} sqft</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={[styles.detailsSectionTitle, { color: colors.text }]}>Financial Info</Text>
                    {currentHome.isRenting ? (
                      <View style={[styles.detailsPriceCard, { backgroundColor: colors.background }]}>
                        <Text style={[styles.detailsPriceLabel, { color: colors.textSecondary }]}>Monthly Rent</Text>
                        <Text style={[styles.detailsPriceValue, { color: colors.text }]}>${currentHome.monthlyRent?.toLocaleString()}</Text>
                      </View>
                    ) : (
                      <>
                        <View style={[styles.detailsPriceCard, { backgroundColor: colors.background }]}>
                          <DollarSign size={20} color="#3B82F6" />
                          <View style={styles.detailsPriceInfo}>
                            <Text style={[styles.detailsPriceLabel, { color: colors.textSecondary }]}>Purchase Price</Text>
                            <Text style={[styles.detailsPriceValue, { color: colors.text }]}>{formatHomeValue(currentHome.purchasePrice)}</Text>
                          </View>
                        </View>
                        <View style={[styles.detailsPriceCard, { backgroundColor: colors.background }]}>
                          <TrendingUp size={20} color="#10B981" />
                          <View style={styles.detailsPriceInfo}>
                            <Text style={[styles.detailsPriceLabel, { color: colors.textSecondary }]}>Current Value</Text>
                            <Text style={[styles.detailsPriceValue, { color: '#10B981' }]}>{formatHomeValue(currentHome.currentValue)}</Text>
                          </View>
                        </View>
                        {currentHome.netWorthGain && (
                          <View style={[styles.detailsPriceCard, { backgroundColor: '#10B98115' }]}>
                            <Sparkles size={20} color="#10B981" />
                            <View style={styles.detailsPriceInfo}>
                              <Text style={[styles.detailsPriceLabel, { color: colors.textSecondary }]}>Equity Built</Text>
                              <Text style={[styles.detailsPriceValue, { color: '#10B981' }]}>+{formatHomeValue(currentHome.netWorthGain)}</Text>
                            </View>
                          </View>
                        )}
                      </>
                    )}
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={[styles.detailsSectionTitle, { color: colors.text }]}>Features</Text>
                    <View style={styles.detailsFeatures}>
                      {currentHome.features.map((feature, i) => (
                        <View key={i} style={[styles.detailsFeatureTag, { backgroundColor: colors.background }]}>
                          <Star size={12} color={colors.primary} />
                          <Text style={[styles.detailsFeatureText, { color: colors.text }]}>{feature}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={[styles.detailsSectionTitle, { color: colors.text }]}>About This Home</Text>
                    <Text style={[styles.detailsDescription, { color: colors.textSecondary }]}>
                      {currentHome.description}
                    </Text>
                  </View>

                  <View style={{ height: 20 }} />
                </ScrollView>
              </>
            )}
          </Animated.View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  homeContainer: {
    width: SCREEN_WIDTH,
    backgroundColor: '#000',
  },
  homeImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  homeOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  imageIndicators: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    zIndex: 20,
  },
  imageIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  imageIndicatorActive: {
    backgroundColor: '#FFF',
    width: 20,
  },
  imageNavButton: {
    position: 'absolute',
    top: '40%',
    padding: 12,
    zIndex: 15,
  },
  imageNavLeft: {
    left: 0,
  },
  imageNavRight: {
    right: 0,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  tabButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.6)',
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: '700' as const,
  },
  tabIndicator: {
    width: 24,
    height: 3,
    backgroundColor: '#FFF',
    borderRadius: 2,
    marginTop: 4,
  },
  backButton: {
    position: 'absolute',
    left: 12,
    padding: 8,
    zIndex: 10,
  },
  rightActions: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    gap: 18,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  actionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  followBadge: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600' as const,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  detailsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 80,
    paddingHorizontal: 16,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ownerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ownerName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700' as const,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255,215,0,0.3)',
    gap: 4,
  },
  levelText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  creditScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  creditScoreText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  propertyIcon: {
    fontSize: 20,
  },
  propertyName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800' as const,
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tourBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59,130,246,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  tourBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600' as const,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  propertyStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  description: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  netWorthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  netWorthText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginBottom: 2,
  },
  priceValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  featureTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  featureText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewsText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  timeAgo: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  commentsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  commentsSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.65,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    position: 'relative',
  },
  commentsHandle: {
    position: 'absolute',
    top: 8,
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 2,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  closeCommentsButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  commentsList: {
    padding: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
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
  commentUsername: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 16,
  },
  commentTime: {
    fontSize: 12,
  },
  commentReplyButton: {},
  commentReplyText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  commentLikeButton: {
    alignItems: 'center',
    marginLeft: 12,
    paddingTop: 10,
  },
  commentLikeCount: {
    fontSize: 11,
    marginTop: 2,
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noCommentsText: {
    marginTop: 16,
    fontSize: 15,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendButton: {
    padding: 8,
  },
  detailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  detailsSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    position: 'relative',
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  detailsContent: {
    flex: 1,
    padding: 16,
  },
  detailsOwner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  detailsOwnerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  detailsOwnerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  detailsOwnerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailsOwnerName: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  detailsOwnerScore: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  detailsFollowButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  detailsFollowText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailsSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailsGridItem: {
    width: (SCREEN_WIDTH - 52) / 2,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  detailsGridLabel: {
    fontSize: 12,
  },
  detailsGridValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  detailsPriceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  detailsPriceInfo: {
    flex: 1,
  },
  detailsPriceLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailsPriceValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  detailsFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailsFeatureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  detailsFeatureText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  detailsDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
});
