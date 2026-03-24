import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  MapPin,
  Home,
  Building2,
  Castle,
  Bed,
  Users,
  Star,
  Eye,
  Heart,
  Play,
  ArrowLeft,
  TrendingUp,
  Clock,
  Award,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useCommunityHomes } from '@/contexts/CommunityHomesContext';
import { useSocialFeed } from '@/contexts/SocialFeedContext';
import {
  formatHomeValue,
  formatCompactNumber,
  getPropertyTypeIcon,
  getStyleColor,
  HomeFeedSortOption,
  PropertyType,
  CommunityHome,
} from '@/types/communityHomes';



type HomeTierFilter = 'all' | 'studio' | 'apartment' | 'house' | 'mansion';

const CITIES = ['All Cities', 'New York', 'Los Angeles', 'Miami', 'San Francisco', 'Chicago', 'Austin'];

const TIER_OPTIONS: { value: HomeTierFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All Types', icon: null },
  { value: 'studio', label: 'Studio', icon: <Building2 size={16} /> },
  { value: 'apartment', label: 'Apartment', icon: <Building2 size={16} /> },
  { value: 'house', label: 'House', icon: <Home size={16} /> },
  { value: 'mansion', label: 'Mansion', icon: <Castle size={16} /> },
];

const SORT_OPTIONS: { value: HomeFeedSortOption; label: string; icon: React.ReactNode }[] = [
  { value: 'trending', label: 'Trending', icon: <TrendingUp size={16} /> },
  { value: 'newest', label: 'Newest', icon: <Clock size={16} /> },
  { value: 'most_visited', label: 'Most Visited', icon: <Eye size={16} /> },
  { value: 'most_liked', label: 'Highest Rated', icon: <Star size={16} /> },
];

const TIER_TO_PROPERTY_TYPES: Record<HomeTierFilter, PropertyType[] | null> = {
  all: null,
  studio: ['loft'],
  apartment: ['apartment', 'penthouse'],
  house: ['house', 'cottage', 'villa'],
  mansion: ['mansion', 'beach_house'],
};

function HomeCardSkeleton({ colors, isDark }: { colors: any; isDark: boolean }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.skeletonCard, { backgroundColor: colors.surface, opacity }]}>
      <View style={[styles.skeletonImage, { backgroundColor: colors.border }]} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonLine, { width: '70%', backgroundColor: colors.border }]} />
        <View style={[styles.skeletonLine, { width: '50%', backgroundColor: colors.border }]} />
        <View style={[styles.skeletonLine, { width: '40%', backgroundColor: colors.border }]} />
      </View>
    </Animated.View>
  );
}

interface HomeCardProps {
  home: CommunityHome;
  colors: any;
  isDark: boolean;
  onPress: () => void;
  onVisit: () => void;
  onToggleLike: () => void;
}

function HomeCard({ home, colors, isDark, onPress, onVisit, onToggleLike }: HomeCardProps) {
  const averageRating = home.stats.likes > 0 ? Math.min(5, 3.5 + (home.stats.likes / 10000) * 1.5) : 0;
  
  return (
    <TouchableOpacity
      style={[styles.homeCard, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.cardImageContainer}>
        <Image source={{ uri: home.coverImage }} style={styles.cardImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.cardImageGradient}
        />
        {home.stats.trending && (
          <View style={styles.trendingBadge}>
            <TrendingUp color="#FFFFFF" size={12} />
            <Text style={styles.trendingText}>Trending</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.likeButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleLike();
          }}
        >
          <Heart
            color={home.social.isLiked ? '#EF4444' : '#FFFFFF'}
            size={20}
            fill={home.social.isLiked ? '#EF4444' : 'transparent'}
          />
        </TouchableOpacity>
        <View style={styles.cardImageInfo}>
          <View style={[styles.tierBadge, { backgroundColor: getStyleColor(home.style) }]}>
            <Text style={styles.tierBadgeText}>{home.propertyType.replace('_', ' ')}</Text>
          </View>
          <Text style={styles.cardPrice}>{formatHomeValue(home.financials.currentValue)}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {home.propertyName}
            </Text>
            <Text style={styles.propertyEmoji}>{getPropertyTypeIcon(home.propertyType)}</Text>
          </View>
          <View style={styles.ownerRow}>
            <Image source={{ uri: home.owner.avatar }} style={styles.ownerAvatar} />
            <Text style={[styles.ownerName, { color: colors.textSecondary }]} numberOfLines={1}>
              {home.owner.name}
            </Text>
            {home.owner.isVerified && (
              <View style={styles.verifiedBadge}>
                <Award color="#3B82F6" size={12} fill="#3B82F6" />
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardLocation}>
          <MapPin color={colors.textLight} size={14} />
          <Text style={[styles.locationText, { color: colors.textLight }]}>
            {home.neighborhood}, {home.city}
          </Text>
        </View>

        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <Bed color={colors.textSecondary} size={14} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {home.details.bedrooms} beds
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Users color={colors.textSecondary} size={14} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {formatCompactNumber(home.stats.visits)} visits
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Star color="#F59E0B" size={14} fill="#F59E0B" />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {averageRating.toFixed(1)}
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: colors.surfaceAlt }]}
            onPress={onPress}
          >
            <Eye color={colors.text} size={16} />
            <Text style={[styles.viewButtonText, { color: colors.text }]}>View Details</Text>
          </TouchableOpacity>
          {home.settings.virtualTourAvailable && (
            <TouchableOpacity
              style={styles.visitButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onVisit();
              }}
            >
              <Play color="#FFFFFF" size={16} fill="#FFFFFF" />
              <Text style={styles.visitButtonText}>Visit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeBrowserScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    homes,
    isLoading,
    isRefreshing,
    searchQuery,
    filter,
    setSearchQuery,
    setSortBy,
    setFilter,
    toggleLike,
    refreshFeed,
    recordVisit,
  } = useCommunityHomes();

  const { friends } = useSocialFeed();

  const [showFilters, setShowFilters] = useState(false);
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedTier, setSelectedTier] = useState<HomeTierFilter>('all');
  const [selectedSort, setSelectedSort] = useState<HomeFeedSortOption>('trending');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showTierDropdown, setShowTierDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const ITEMS_PER_PAGE = 10;

  const friendOwnerIds = useMemo(() => {
    const ownerNameSet = new Set(friends.map(f => f.name));
    return ownerNameSet;
  }, [friends]);

  const filteredHomes = useMemo(() => {
    let result = homes.filter(h => friendOwnerIds.has(h.owner.name));

    if (selectedCity !== 'All Cities') {
      result = result.filter(h => h.city === selectedCity);
    }

    const propertyTypes = TIER_TO_PROPERTY_TYPES[selectedTier];
    if (propertyTypes) {
      result = result.filter(h => propertyTypes.includes(h.propertyType));
    }

    return result;
  }, [homes, selectedCity, selectedTier, friendOwnerIds]);

  const paginatedHomes = useMemo(() => {
    return filteredHomes.slice(0, page * ITEMS_PER_PAGE);
  }, [filteredHomes, page]);

  const hasMore = paginatedHomes.length < filteredHomes.length;

  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPage(1);
    await refreshFeed();
  }, [refreshFeed]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      setPage(p => p + 1);
      setLoadingMore(false);
    }, 500);
  }, [loadingMore, hasMore]);

  const handleCitySelect = useCallback((city: string) => {
    Haptics.selectionAsync();
    setSelectedCity(city);
    setShowCityDropdown(false);
    setPage(1);
    if (city === 'All Cities') {
      setFilter({ ...filter, cities: undefined });
    } else {
      setFilter({ ...filter, cities: [city] });
    }
  }, [filter, setFilter]);

  const handleTierSelect = useCallback((tier: HomeTierFilter) => {
    Haptics.selectionAsync();
    setSelectedTier(tier);
    setShowTierDropdown(false);
    setPage(1);
    const propertyTypes = TIER_TO_PROPERTY_TYPES[tier];
    setFilter({ ...filter, propertyTypes: propertyTypes || undefined });
  }, [filter, setFilter]);

  const handleSortSelect = useCallback((sort: HomeFeedSortOption) => {
    Haptics.selectionAsync();
    setSelectedSort(sort);
    setShowSortDropdown(false);
    setSortBy(sort);
  }, [setSortBy]);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    setPage(1);
  }, [setSearchQuery]);

  const handleViewDetails = useCallback((homeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/home-detail?id=${homeId}` as any);
  }, [router]);

  const handleVisit = useCallback((homeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    recordVisit(homeId);
    router.push(`/home-visit?id=${homeId}` as any);
  }, [router, recordVisit]);

  const clearFilters = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCity('All Cities');
    setSelectedTier('all');
    setSelectedSort('trending');
    setSearchQuery('');
    setFilter({});
    setSortBy('trending');
    setPage(1);
  }, [setFilter, setSearchQuery, setSortBy]);

  const hasActiveFilters = selectedCity !== 'All Cities' || selectedTier !== 'all' || searchQuery.length > 0;

  const dynamicStyles = createStyles(colors, isDark);

  const isNearBottom = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 100;
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  }, []);

  return (
    <View style={[dynamicStyles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={dynamicStyles.header}>
        <TouchableOpacity
          style={dynamicStyles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Friends&apos; Homes</Text>
        <TouchableOpacity
          style={[dynamicStyles.filterToggle, showFilters && dynamicStyles.filterToggleActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFilters(!showFilters);
          }}
        >
          <SlidersHorizontal color={showFilters ? '#FFFFFF' : colors.text} size={20} />
        </TouchableOpacity>
      </View>

      <View style={dynamicStyles.searchContainer}>
        <View style={dynamicStyles.searchInputWrapper}>
          <Search color={colors.textLight} size={18} />
          <TextInput
            style={dynamicStyles.searchInput}
            placeholder="Search homes or owners..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <X color={colors.textLight} size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showFilters && (
        <View style={dynamicStyles.filtersContainer}>
          <View style={dynamicStyles.filterRow}>
            <TouchableOpacity
              style={dynamicStyles.filterDropdown}
              onPress={() => {
                setShowCityDropdown(!showCityDropdown);
                setShowTierDropdown(false);
                setShowSortDropdown(false);
              }}
            >
              <MapPin color={colors.textSecondary} size={16} />
              <Text style={dynamicStyles.filterDropdownText} numberOfLines={1}>
                {selectedCity}
              </Text>
              <ChevronDown color={colors.textLight} size={16} />
            </TouchableOpacity>

            <TouchableOpacity
              style={dynamicStyles.filterDropdown}
              onPress={() => {
                setShowTierDropdown(!showTierDropdown);
                setShowCityDropdown(false);
                setShowSortDropdown(false);
              }}
            >
              <Home color={colors.textSecondary} size={16} />
              <Text style={dynamicStyles.filterDropdownText} numberOfLines={1}>
                {TIER_OPTIONS.find(t => t.value === selectedTier)?.label}
              </Text>
              <ChevronDown color={colors.textLight} size={16} />
            </TouchableOpacity>

            <TouchableOpacity
              style={dynamicStyles.filterDropdown}
              onPress={() => {
                setShowSortDropdown(!showSortDropdown);
                setShowCityDropdown(false);
                setShowTierDropdown(false);
              }}
            >
              {SORT_OPTIONS.find(s => s.value === selectedSort)?.icon}
              <Text style={dynamicStyles.filterDropdownText} numberOfLines={1}>
                {SORT_OPTIONS.find(s => s.value === selectedSort)?.label}
              </Text>
              <ChevronDown color={colors.textLight} size={16} />
            </TouchableOpacity>
          </View>

          {showCityDropdown && (
            <View style={dynamicStyles.dropdownMenu}>
              {CITIES.map(city => (
                <TouchableOpacity
                  key={city}
                  style={[
                    dynamicStyles.dropdownItem,
                    selectedCity === city && dynamicStyles.dropdownItemActive,
                  ]}
                  onPress={() => handleCitySelect(city)}
                >
                  <Text
                    style={[
                      dynamicStyles.dropdownItemText,
                      selectedCity === city && dynamicStyles.dropdownItemTextActive,
                    ]}
                  >
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showTierDropdown && (
            <View style={dynamicStyles.dropdownMenu}>
              {TIER_OPTIONS.map(tier => (
                <TouchableOpacity
                  key={tier.value}
                  style={[
                    dynamicStyles.dropdownItem,
                    selectedTier === tier.value && dynamicStyles.dropdownItemActive,
                  ]}
                  onPress={() => handleTierSelect(tier.value)}
                >
                  {tier.icon && <View style={{ marginRight: 8 }}>{tier.icon}</View>}
                  <Text
                    style={[
                      dynamicStyles.dropdownItemText,
                      selectedTier === tier.value && dynamicStyles.dropdownItemTextActive,
                    ]}
                  >
                    {tier.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showSortDropdown && (
            <View style={dynamicStyles.dropdownMenu}>
              {SORT_OPTIONS.map(sort => (
                <TouchableOpacity
                  key={sort.value}
                  style={[
                    dynamicStyles.dropdownItem,
                    selectedSort === sort.value && dynamicStyles.dropdownItemActive,
                  ]}
                  onPress={() => handleSortSelect(sort.value)}
                >
                  {sort.icon}
                  <Text
                    style={[
                      dynamicStyles.dropdownItemText,
                      { marginLeft: 8 },
                      selectedSort === sort.value && dynamicStyles.dropdownItemTextActive,
                    ]}
                  >
                    {sort.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {hasActiveFilters && (
            <TouchableOpacity style={dynamicStyles.clearFiltersButton} onPress={clearFilters}>
              <X color={colors.primary} size={14} />
              <Text style={dynamicStyles.clearFiltersText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={dynamicStyles.resultsHeader}>
        <Text style={dynamicStyles.resultsCount}>
          {filteredHomes.length} {filteredHomes.length === 1 ? 'home' : 'homes'} found
        </Text>
      </View>

      <ScrollView
        style={dynamicStyles.scrollView}
        contentContainerStyle={dynamicStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        onScroll={({ nativeEvent }) => {
          if (isNearBottom({ nativeEvent })) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {isLoading ? (
          <>
            <HomeCardSkeleton colors={colors} isDark={isDark} />
            <HomeCardSkeleton colors={colors} isDark={isDark} />
            <HomeCardSkeleton colors={colors} isDark={isDark} />
          </>
        ) : paginatedHomes.length === 0 ? (
          <View style={dynamicStyles.emptyState}>
            <Home color={colors.textLight} size={64} />
            <Text style={dynamicStyles.emptyStateTitle}>No friends&apos; homes found</Text>
            <Text style={dynamicStyles.emptyStateText}>
              {friends.length === 0 ? 'Add friends from your profile to see their homes here' : 'Try adjusting your filters or search query'}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity style={dynamicStyles.emptyStateClearButton} onPress={clearFilters}>
                <Text style={dynamicStyles.emptyStateClearText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {paginatedHomes.map(home => (
              <HomeCard
                key={home.id}
                home={home}
                colors={colors}
                isDark={isDark}
                onPress={() => handleViewDetails(home.id)}
                onVisit={() => handleVisit(home.id)}
                onToggleLike={() => toggleLike(home.id)}
              />
            ))}
            {loadingMore && (
              <View style={dynamicStyles.loadingMore}>
                <ActivityIndicator color={colors.primary} />
                <Text style={dynamicStyles.loadingMoreText}>Loading more...</Text>
              </View>
            )}
            {!hasMore && paginatedHomes.length > 0 && (
              <View style={dynamicStyles.endOfList}>
                <Text style={dynamicStyles.endOfListText}>You have seen all homes</Text>
              </View>
            )}
          </>
        )}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  skeletonImage: {
    width: '100%',
    height: 180,
  },
  skeletonContent: {
    padding: 16,
    gap: 10,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
  },
  homeCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardImageContainer: {
    position: 'relative',
    height: 180,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  trendingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  trendingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  likeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageInfo: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  tierBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  cardPrice: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  cardContent: {
    padding: 14,
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  propertyEmoji: {
    fontSize: 18,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  ownerName: {
    fontSize: 13,
    flex: 1,
  },
  verifiedBadge: {
    marginLeft: 2,
  },
  cardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(128,128,128,0.15)',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  visitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  visitButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    headerTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginLeft: 12,
    },
    filterToggle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    filterToggleActive: {
      backgroundColor: colors.primary,
    },
    searchContainer: {
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    searchInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    filtersContainer: {
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
    },
    filterDropdown: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 10,
      gap: 6,
    },
    filterDropdownText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '500',
      color: colors.text,
    },
    dropdownMenu: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginTop: 8,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownItemActive: {
      backgroundColor: colors.primary,
    },
    dropdownItemText: {
      fontSize: 14,
      color: colors.text,
    },
    dropdownItemTextActive: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    clearFiltersButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
      paddingVertical: 8,
      gap: 4,
    },
    clearFiltersText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    resultsHeader: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    resultsCount: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginTop: 16,
    },
    emptyStateText: {
      fontSize: 14,
      color: colors.textLight,
      marginTop: 6,
      textAlign: 'center',
    },
    emptyStateClearButton: {
      marginTop: 20,
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
    },
    emptyStateClearText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    loadingMore: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    loadingMoreText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    endOfList: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    endOfListText: {
      fontSize: 13,
      color: colors.textLight,
    },
  });
