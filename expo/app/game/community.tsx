import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Animated,
  RefreshControl,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  SlidersHorizontal,
  Radio,
  Home,
  Sparkles,
  X,
  DollarSign,
  Star,
  Users,
  ChevronLeft,
  Plus,
  MapPin,
  Flame,
  Heart,
  Bookmark,
  MessageCircle,
  Eye,
  Play,
  Bed,
  Bath,
  Maximize,
  Verified,
  Trophy,
  Crown,
  ShoppingBag,
  Bell,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useCommunityHomes } from '@/contexts/CommunityHomesContext';
import {
  HomeFeedSortOption,
  PropertyType,
  HomeStyle,
  CommunityHome,
  HomeOwnerProfile,
  formatHomeValue,
  formatCompactNumber,
  getCreditScoreColor,
  getPropertyTypeIcon,
} from '@/types/communityHomes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SORT_OPTIONS: { value: HomeFeedSortOption; label: string; icon: React.ComponentType<any> }[] = [
  { value: 'trending', label: 'Trending', icon: Flame },
  { value: 'newest', label: 'Newest', icon: Sparkles },
  { value: 'most_visited', label: 'Popular', icon: Users },
  { value: 'most_liked', label: 'Top Rated', icon: Star },
  { value: 'highest_value', label: 'High Value', icon: DollarSign },
  { value: 'following', label: 'Following', icon: Users },
];

const PROPERTY_TYPES: { value: PropertyType; label: string; emoji: string }[] = [
  { value: 'apartment', label: 'Apartment', emoji: '🏢' },
  { value: 'house', label: 'House', emoji: '🏠' },
  { value: 'mansion', label: 'Mansion', emoji: '🏰' },
  { value: 'beach_house', label: 'Beach', emoji: '🏖️' },
  { value: 'penthouse', label: 'Penthouse', emoji: '🌆' },
  { value: 'loft', label: 'Loft', emoji: '🏙️' },
  { value: 'villa', label: 'Villa', emoji: '🏡' },
  { value: 'cottage', label: 'Cottage', emoji: '🛖' },
];

const STYLES: { value: HomeStyle; label: string }[] = [
  { value: 'modern', label: 'Modern' },
  { value: 'classic', label: 'Classic' },
  { value: 'minimalist', label: 'Minimal' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'bohemian', label: 'Boho' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'coastal', label: 'Coastal' },
  { value: 'farmhouse', label: 'Farmhouse' },
];

const QUICK_ACTIONS = [
  { id: 'leaderboards', label: 'Leaders', icon: Trophy, route: '/leaderboards', color: '#F59E0B' },
  { id: 'achievements', label: 'Awards', icon: Crown, route: '/achievements', color: '#8B5CF6' },
  { id: 'marketplace', label: 'Market', icon: ShoppingBag, route: '/marketplace', color: '#06B6D4' },
];

function InlineHomeCard({
  home,
  onPress,
  onLike,
  onSave,
  onVisit,
  onOwnerPress,
  colors,
  isDark,
}: {
  home: CommunityHome;
  onPress: () => void;
  onLike: () => void;
  onSave: () => void;
  onVisit: () => void;
  onOwnerPress: () => void;
  colors: any;
  isDark: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, friction: 8, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={[cardStyles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[cardStyles.container, { backgroundColor: colors.surface }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        testID={`home-card-${home.id}`}
      >
        <View style={cardStyles.imageContainer}>
          <Image
            source={{ uri: home.coverImage }}
            style={cardStyles.image}
            contentFit="cover"
            transition={200}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={cardStyles.imageGradient}
            pointerEvents="none"
          />
          {home.stats.trending && (
            <View style={cardStyles.trendingBadge} pointerEvents="none">
              <Flame color="#FFF" size={10} />
              <Text style={cardStyles.trendingText}>Trending</Text>
            </View>
          )}
          {home.virtualTour?.isLive && (
            <View style={cardStyles.liveBadge} pointerEvents="none">
              <View style={cardStyles.liveDot} />
              <Text style={cardStyles.liveText}>LIVE</Text>
            </View>
          )}
          <View style={cardStyles.priceTag} pointerEvents="none">
            <Text style={cardStyles.priceText}>{formatHomeValue(home.financials.currentValue)}</Text>
          </View>
          <View style={cardStyles.imageActions}>
            <TouchableOpacity style={cardStyles.imageActionBtn} onPress={onLike}>
              <Heart
                color={home.social.isLiked ? '#EF4444' : '#FFF'}
                size={18}
                fill={home.social.isLiked ? '#EF4444' : 'transparent'}
              />
            </TouchableOpacity>
            <TouchableOpacity style={cardStyles.imageActionBtn} onPress={onSave}>
              <Bookmark
                color={home.social.isSaved ? '#3B82F6' : '#FFF'}
                size={18}
                fill={home.social.isSaved ? '#3B82F6' : 'transparent'}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={cardStyles.content}>
          <TouchableOpacity style={cardStyles.ownerRow} onPress={onOwnerPress} activeOpacity={0.7}>
            <Image source={{ uri: home.owner.avatar }} style={cardStyles.ownerAvatar} />
            <View style={cardStyles.ownerInfo}>
              <View style={cardStyles.ownerNameRow}>
                <Text style={[cardStyles.ownerName, { color: colors.text }]} numberOfLines={1}>
                  {home.owner.name}
                </Text>
                {home.owner.isVerified && <Verified color="#3B82F6" size={13} fill="#3B82F6" />}
              </View>
              <Text style={[cardStyles.ownerLevel, { color: colors.textLight }]}>
                Level {home.owner.level}
              </Text>
            </View>
            <View style={[cardStyles.creditBadge, { backgroundColor: getCreditScoreColor(home.owner.creditScore) + '20' }]}>
              <Text style={[cardStyles.creditText, { color: getCreditScoreColor(home.owner.creditScore) }]}>
                {home.owner.creditScore}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={[cardStyles.propertyName, { color: colors.text }]} numberOfLines={1}>
            {home.propertyName}
          </Text>

          <View style={cardStyles.locationRow}>
            <MapPin color={colors.textLight} size={12} />
            <Text style={[cardStyles.locationText, { color: colors.textLight }]} numberOfLines={1}>
              {home.neighborhood}, {home.city}
            </Text>
            <Text style={[cardStyles.typeTag, { color: colors.textLight }]}>
              {getPropertyTypeIcon(home.propertyType)} {home.style}
            </Text>
          </View>

          <View style={cardStyles.detailsRow}>
            <View style={cardStyles.detailItem}>
              <Bed color={colors.textLight} size={13} />
              <Text style={[cardStyles.detailText, { color: colors.textSecondary }]}>{home.details.bedrooms}</Text>
            </View>
            <View style={cardStyles.detailItem}>
              <Bath color={colors.textLight} size={13} />
              <Text style={[cardStyles.detailText, { color: colors.textSecondary }]}>{home.details.bathrooms}</Text>
            </View>
            <View style={cardStyles.detailItem}>
              <Maximize color={colors.textLight} size={13} />
              <Text style={[cardStyles.detailText, { color: colors.textSecondary }]}>
                {home.details.squareFootage.toLocaleString()} sqft
              </Text>
            </View>
          </View>

          <View style={[cardStyles.statsRow, { borderTopColor: colors.border }]}>
            <View style={cardStyles.statItem}>
              <Heart color={colors.textLight} size={13} />
              <Text style={[cardStyles.statText, { color: colors.textLight }]}>
                {formatCompactNumber(home.stats.likes)}
              </Text>
            </View>
            <View style={cardStyles.statItem}>
              <Eye color={colors.textLight} size={13} />
              <Text style={[cardStyles.statText, { color: colors.textLight }]}>
                {formatCompactNumber(home.stats.visits)}
              </Text>
            </View>
            <View style={cardStyles.statItem}>
              <MessageCircle color={colors.textLight} size={13} />
              <Text style={[cardStyles.statText, { color: colors.textLight }]}>
                {formatCompactNumber(home.stats.comments)}
              </Text>
            </View>
            {home.settings.isOpenForVisits && (
              <TouchableOpacity style={cardStyles.visitBtn} onPress={onVisit}>
                <Play color="#FFF" size={12} fill="#FFF" />
                <Text style={cardStyles.visitBtnText}>Visit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const MemoizedHomeCard = React.memo(InlineHomeCard);

function InlineOwnerCard({
  owner,
  isFollowing,
  onPress,
  onFollow,
  colors,
}: {
  owner: HomeOwnerProfile;
  isFollowing: boolean;
  onPress: () => void;
  onFollow: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[ownerStyles.card, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image source={{ uri: owner.avatar }} style={ownerStyles.avatar} />
      <View style={ownerStyles.nameRow}>
        <Text style={[ownerStyles.name, { color: colors.text }]} numberOfLines={1}>{owner.name}</Text>
        {owner.isVerified && <Verified color="#3B82F6" size={11} fill="#3B82F6" />}
      </View>
      <Text style={[ownerStyles.stats, { color: colors.textLight }]}>
        {formatCompactNumber(owner.followers)} followers
      </Text>
      <TouchableOpacity
        style={[ownerStyles.followBtn, isFollowing && ownerStyles.followBtnActive]}
        onPress={(e) => {
          e.stopPropagation?.();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onFollow();
        }}
      >
        <Text style={[ownerStyles.followText, isFollowing && ownerStyles.followTextActive]}>
          {isFollowing ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const MemoizedOwnerCard = React.memo(InlineOwnerCard);

export default function CommunityScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    homes,
    trendingHomes,
    liveTourHomes,
    featuredOwners,
    isRefreshing,
    filter,
    sortBy,
    searchQuery,
    followingIds,
    unreadNotifications,
    setFilter,
    setSortBy,
    setSearchQuery,
    toggleLike,
    toggleSave,
    toggleFollow,
    refreshFeed,
    clearFilters,
  } = useCommunityHomes();

  const [showFilters, setShowFilters] = useState(false);
  const filterAnim = useRef(new Animated.Value(0)).current;

  const toggleFiltersPanel = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowFilters(prev => {
      Animated.spring(filterAnim, {
        toValue: prev ? 0 : 1,
        friction: 8,
        useNativeDriver: false,
      }).start();
      return !prev;
    });
  }, [filterAnim]);

  const handleHomePress = useCallback((home: CommunityHome) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/home-detail?id=${home.id}` as any);
  }, [router]);

  const handleVisitHome = useCallback((home: CommunityHome) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/home-visit?id=${home.id}` as any);
  }, [router]);

  const handleOwnerPress = useCallback((ownerId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/owner-profile?id=${ownerId}` as any);
  }, [router]);

  const handleSortChange = useCallback((value: HomeFeedSortOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSortBy(value);
  }, [setSortBy]);

  const handlePropertyTypeToggle = useCallback((type: PropertyType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter((prev: any) => {
      const types = prev.propertyTypes || [];
      if (types.includes(type)) {
        return { ...prev, propertyTypes: types.filter((t: PropertyType) => t !== type) };
      }
      return { ...prev, propertyTypes: [...types, type] };
    });
  }, [setFilter]);

  const handleStyleToggle = useCallback((style: HomeStyle) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter((prev: any) => {
      const s = prev.styles || [];
      if (s.includes(style)) {
        return { ...prev, styles: s.filter((x: HomeStyle) => x !== style) };
      }
      return { ...prev, styles: [...s, style] };
    });
  }, [setFilter]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filter.propertyTypes?.length) count += filter.propertyTypes.length;
    if (filter.styles?.length) count += filter.styles.length;
    if (filter.openForVisits) count++;
    if (filter.virtualTourAvailable) count++;
    if (filter.followingOnly) count++;
    return count;
  }, [filter]);

  const filterPanelHeight = filterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 320],
  });

  const renderHomeCard = useCallback(({ item }: { item: CommunityHome }) => (
    <MemoizedHomeCard
      home={item}
      onPress={() => handleHomePress(item)}
      onLike={() => toggleLike(item.id)}
      onSave={() => toggleSave(item.id)}
      onVisit={() => handleVisitHome(item)}
      onOwnerPress={() => handleOwnerPress(item.owner.id)}
      colors={colors}
      isDark={isDark}
    />
  ), [handleHomePress, toggleLike, toggleSave, handleVisitHome, handleOwnerPress, colors, isDark]);

  const renderHeader = useCallback(() => (
    <View style={styles.headerContent}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActionsRow}
        style={styles.quickActionsScroll}
      >
        {QUICK_ACTIONS.map((action) => {
          const ActionIcon = action.icon;
          return (
            <TouchableOpacity
              key={action.id}
              style={[styles.quickActionCard, { backgroundColor: colors.surface }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(action.route as any);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.color + '18' }]}>
                <ActionIcon color={action.color} size={18} />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>{action.label}</Text>
            </TouchableOpacity>
          );
        })}
        {unreadNotifications > 0 && (
          <TouchableOpacity
            style={[styles.quickActionCard, { backgroundColor: colors.surface }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/notifications' as any);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#EF444418' }]}>
              <Bell color="#EF4444" size={18} />
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadNotifications}</Text>
              </View>
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.text }]}>Alerts</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {liveTourHomes.length > 0 && (
        <View style={styles.liveSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDotPulse} />
              <Radio color="#EF4444" size={13} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
            <Text style={[styles.liveTourCount, { color: colors.textLight }]}>
              {liveTourHomes.length} active
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.liveHomesScroll}
          >
            {liveTourHomes.map((home) => (
              <TouchableOpacity
                key={home.id}
                style={styles.liveCard}
                onPress={() => handleVisitHome(home)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: home.coverImage }} style={styles.liveCardImage} contentFit="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.85)']}
                  style={styles.liveCardGradient}
                  pointerEvents="none"
                />
                <View style={styles.liveCardContent} pointerEvents="none">
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDotSmall} />
                    <Text style={styles.liveViewerCount}>
                      {home.virtualTour?.currentVisitors ?? 0} watching
                    </Text>
                  </View>
                  <Text style={styles.liveCardName} numberOfLines={1}>{home.propertyName}</Text>
                  <View style={styles.liveLocationRow}>
                    <MapPin color="rgba(255,255,255,0.7)" size={10} />
                    <Text style={styles.liveCardLocation}>
                      {home.neighborhood}, {home.city}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {featuredOwners.length > 0 && (
        <View style={styles.ownersSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Players</Text>
            <Text style={styles.seeAll}>See all</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ownersScroll}
          >
            {featuredOwners.map((owner: HomeOwnerProfile) => (
              <MemoizedOwnerCard
                key={owner.id}
                owner={owner}
                isFollowing={followingIds.includes(owner.id)}
                onPress={() => handleOwnerPress(owner.id)}
                onFollow={() => toggleFollow(owner.id)}
                colors={colors}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {trendingHomes.length > 0 && (
        <View style={styles.trendingHeader}>
          <Flame color="#F97316" size={16} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Trending Properties</Text>
        </View>
      )}
    </View>
  ), [
    colors, liveTourHomes, featuredOwners,
    trendingHomes, followingIds, unreadNotifications, router,
    handleVisitHome, handleOwnerPress, toggleFollow,
  ]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={isDark ? ['#0C1220', '#162033'] : ['#0A1628', '#163058']}
          style={[styles.searchHeader, { paddingTop: insets.top }]}
        >
          <View style={styles.topNav}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              testID="community-back"
            >
              <ChevronLeft size={26} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Community</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/home-creation' as any);
              }}
              testID="community-share"
            >
              <Plus color="#FFF" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Search color="rgba(255,255,255,0.5)" size={17} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search homes, owners, cities..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                testID="community-search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X color="rgba(255,255,255,0.5)" size={17} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={toggleFiltersPanel}
              testID="community-filter"
            >
              <SlidersHorizontal color="#FFF" size={19} />
              {activeFiltersCount > 0 && (
                <View style={styles.filterCountBadge}>
                  <Text style={styles.filterCountText}>{activeFiltersCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortRow}
            style={styles.sortScroll}
          >
            {SORT_OPTIONS.map((option) => {
              const SortIcon = option.icon;
              const isActive = sortBy === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.sortChip, isActive && styles.sortChipActive]}
                  onPress={() => handleSortChange(option.value)}
                >
                  <SortIcon color={isActive ? '#FFF' : 'rgba(255,255,255,0.55)'} size={13} />
                  <Text style={[styles.sortChipText, isActive && styles.sortChipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </LinearGradient>

        <Animated.View
          style={[
            styles.filterPanel,
            {
              height: filterPanelHeight,
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
          pointerEvents={showFilters ? 'auto' : 'none'}
        >
          <ScrollView style={styles.filterPanelScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Property Type</Text>
            <View style={styles.filterChipsWrap}>
              {PROPERTY_TYPES.map((type) => {
                const isSelected = filter.propertyTypes?.includes(type.value);
                return (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.filterChip,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                      isSelected && styles.filterChipSelected,
                    ]}
                    onPress={() => handlePropertyTypeToggle(type.value)}
                  >
                    <Text style={styles.filterChipEmoji}>{type.emoji}</Text>
                    <Text style={[styles.filterChipLabel, { color: isSelected ? '#FFF' : colors.text }]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Style</Text>
            <View style={styles.filterChipsWrap}>
              {STYLES.map((style) => {
                const isSelected = filter.styles?.includes(style.value);
                return (
                  <TouchableOpacity
                    key={style.value}
                    style={[
                      styles.filterChip,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                      isSelected && styles.filterChipSelected,
                    ]}
                    onPress={() => handleStyleToggle(style.value)}
                  >
                    <Text style={[styles.filterChipLabel, { color: isSelected ? '#FFF' : colors.text }]}>
                      {style.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.filterTogglesRow}>
              <TouchableOpacity
                style={[
                  styles.filterToggle,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                  filter.openForVisits && styles.filterToggleActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFilter((prev: any) => ({ ...prev, openForVisits: !prev.openForVisits }));
                }}
              >
                <Home color={filter.openForVisits ? '#FFF' : colors.textLight} size={15} />
                <Text style={[styles.filterToggleText, { color: filter.openForVisits ? '#FFF' : colors.textSecondary }]}>
                  Open Visits
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterToggle,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                  filter.followingOnly && styles.filterToggleActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFilter((prev: any) => ({ ...prev, followingOnly: !prev.followingOnly }));
                }}
              >
                <Users color={filter.followingOnly ? '#FFF' : colors.textLight} size={15} />
                <Text style={[styles.filterToggleText, { color: filter.followingOnly ? '#FFF' : colors.textSecondary }]}>
                  Following
                </Text>
              </TouchableOpacity>
            </View>

            {activeFiltersCount > 0 && (
              <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearFilters}>
                <X color="#EF4444" size={15} />
                <Text style={styles.clearFiltersText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>

        <FlatList
          data={homes}
          renderItem={renderHomeCard}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshFeed}
              tintColor={colors.primary}
            />
          }
          removeClippedSubviews={Platform.OS !== 'web'}
          maxToRenderPerBatch={6}
          windowSize={7}
          initialNumToRender={4}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Home color={colors.textLight} size={44} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No homes found</Text>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>
                Try adjusting your filters or search query
              </Text>
            </View>
          }
          testID="community-feed"
        />
      </View>
    </>
  );
}

const cardStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    height: 200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  trendingBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249,115,22,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  trendingText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  liveBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  priceTag: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: '#FFF',
  },
  imageActions: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
  },
  imageActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 14,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ownerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  ownerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  ownerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ownerName: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  ownerLevel: {
    fontSize: 11,
  },
  creditBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  creditText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  locationText: {
    fontSize: 12,
    flex: 1,
  },
  typeTag: {
    fontSize: 11,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  visitBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  visitBtnText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFF',
  },
});

const ownerStyles = StyleSheet.create({
  card: {
    width: 110,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    marginRight: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  name: {
    fontSize: 12,
    fontWeight: '600' as const,
    maxWidth: 75,
  },
  stats: {
    fontSize: 10,
    marginBottom: 6,
  },
  followBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  followBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  followText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#2563EB',
  },
  followTextActive: {
    color: '#FFF',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchHeader: {
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  backButton: {
    padding: 4,
  },
  navTitle: {
    fontSize: 19,
    fontWeight: '700' as const,
    color: '#FFF',
    letterSpacing: 0.3,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFF',
  },
  filterBtn: {
    width: 42,
    height: 42,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#EF4444',
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  sortScroll: {
    marginTop: 2,
  },
  sortRow: {
    gap: 7,
    paddingRight: 16,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    gap: 5,
  },
  sortChipActive: {
    backgroundColor: '#2563EB',
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.6)',
  },
  sortChipTextActive: {
    color: '#FFF',
  },
  filterPanel: {
    overflow: 'hidden',
    borderBottomWidth: 1,
  },
  filterPanelScroll: {
    padding: 16,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
  },
  filterChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 14,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 5,
  },
  filterChipSelected: {
    backgroundColor: '#2563EB',
  },
  filterChipEmoji: {
    fontSize: 13,
  },
  filterChipLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  filterTogglesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 7,
  },
  filterToggleActive: {
    backgroundColor: '#2563EB',
  },
  filterToggleText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 5,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
  headerContent: {
    paddingBottom: 12,
  },
  quickActionsScroll: {
    marginBottom: 14,
  },
  quickActionsRow: {
    gap: 10,
  },
  quickActionCard: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    minWidth: 80,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  liveSection: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 7,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  seeAll: {
    marginLeft: 'auto',
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#2563EB',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  liveTourCount: {
    fontSize: 12,
    marginLeft: 4,
  },
  liveDotPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveHomesScroll: {
    gap: 10,
  },
  liveCard: {
    width: 190,
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
  },
  liveCardImage: {
    width: '100%',
    height: '100%',
  },
  liveCardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '75%',
  },
  liveCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 5,
  },
  liveDotSmall: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveViewerCount: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.85)',
  },
  liveCardName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFF',
    marginBottom: 2,
  },
  liveLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  liveCardLocation: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
  },
  ownersSection: {
    marginBottom: 18,
  },
  ownersScroll: {
    paddingRight: 16,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    marginTop: 14,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center' as const,
    lineHeight: 19,
  },
});
