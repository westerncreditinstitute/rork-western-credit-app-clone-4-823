import React, { memo, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Animated,
  ActivityIndicator,
  ListRenderItemInfo,
  ViewToken,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Users,
  Star,
  Eye,
  Heart,
  Play,
  TrendingUp,
  MapPin,
  Award,
  Bed,
} from 'lucide-react-native';

import { CommunityHome, formatHomeValue, formatCompactNumber, getStyleColor, getPropertyTypeIcon } from '@/types/communityHomes';

interface OptimizedHomeCardProps {
  home: CommunityHome;
  colors: any;
  isDark: boolean;
  onPress: () => void;
  onVisit: () => void;
  onToggleLike: () => void;
}

const HomeCardComponent = ({
  home,
  colors,
  isDark,
  onPress,
  onVisit,
  onToggleLike,
}: OptimizedHomeCardProps) => {
  const averageRating = home.stats.likes > 0 
    ? Math.min(5, 3.5 + (home.stats.likes / 10000) * 1.5) 
    : 0;

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleLike();
  }, [onToggleLike]);

  const handleVisit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onVisit();
  }, [onVisit]);

  return (
    <TouchableOpacity
      style={[styles.homeCard, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.cardImageContainer}>
        <Image 
          source={{ uri: home.coverImage }} 
          style={styles.cardImage}
          resizeMode="cover"
        />
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
        <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
          <Heart
            color={home.social.isLiked ? '#EF4444' : '#FFFFFF'}
            size={20}
            fill={home.social.isLiked ? '#EF4444' : 'transparent'}
          />
        </TouchableOpacity>
        <View style={styles.cardImageInfo}>
          <View style={[styles.tierBadge, { backgroundColor: getStyleColor(home.style) }]}>
            <Text style={styles.tierBadgeText}>
              {home.propertyType.replace('_', ' ')}
            </Text>
          </View>
          <Text style={styles.cardPrice}>
            {formatHomeValue(home.financials.currentValue)}
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {home.propertyName}
            </Text>
            <Text style={styles.propertyEmoji}>
              {getPropertyTypeIcon(home.propertyType)}
            </Text>
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

        <View style={[styles.cardStats, { borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Bed color={colors.textSecondary} size={14} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {home.details.bedrooms} beds
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Users color={colors.textSecondary} size={14} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {formatCompactNumber(home.stats.visits)} visits
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
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
            <TouchableOpacity style={styles.visitButton} onPress={handleVisit}>
              <Play color="#FFFFFF" size={16} fill="#FFFFFF" />
              <Text style={styles.visitButtonText}>Visit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const OptimizedHomeCard = memo(HomeCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.home.id === nextProps.home.id &&
    prevProps.home.social.isLiked === nextProps.home.social.isLiked &&
    prevProps.home.stats.visits === nextProps.home.stats.visits &&
    prevProps.isDark === nextProps.isDark
  );
});

interface OptimizedHomeListProps {
  homes: CommunityHome[];
  colors: any;
  isDark: boolean;
  onViewDetails: (homeId: string) => void;
  onVisit: (homeId: string) => void;
  onToggleLike: (homeId: string) => void;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  isRefreshing?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  ListHeaderComponent?: React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement | null;
  contentContainerStyle?: object;
}

const ITEM_HEIGHT = 380;
const WINDOW_SIZE = 5;
const MAX_TO_RENDER_PER_BATCH = 3;
const INITIAL_NUM_TO_RENDER = 5;

export function OptimizedHomeList({
  homes,
  colors,
  isDark,
  onViewDetails,
  onVisit,
  onToggleLike,
  onRefresh,
  onLoadMore,
  isRefreshing = false,
  isLoadingMore = false,
  hasMore = false,
  ListHeaderComponent,
  ListEmptyComponent,
  contentContainerStyle,
}: OptimizedHomeListProps) {
  const flatListRef = useRef<FlatList>(null);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100,
  }).current;

  const keyExtractor = useCallback((item: CommunityHome) => item.id, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<CommunityHome> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<CommunityHome>) => (
      <OptimizedHomeCard
        home={item}
        colors={colors}
        isDark={isDark}
        onPress={() => onViewDetails(item.id)}
        onVisit={() => onVisit(item.id)}
        onToggleLike={() => onToggleLike(item.id)}
      />
    ),
    [colors, isDark, onViewDetails, onVisit, onToggleLike]
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      console.log('[OptimizedHomeList] Visible items:', viewableItems.length);
    },
    []
  );

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore && onLoadMore) {
      console.log('[OptimizedHomeList] Loading more homes');
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  const ListFooterComponent = useMemo(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading more...
          </Text>
        </View>
      );
    }
    if (!hasMore && homes.length > 0) {
      return (
        <View style={styles.endFooter}>
          <Text style={[styles.endText, { color: colors.textLight }]}>
            You have seen all homes
          </Text>
        </View>
      );
    }
    return null;
  }, [isLoadingMore, hasMore, homes.length, colors]);

  return (
    <FlatList
      ref={flatListRef}
      data={homes}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      windowSize={WINDOW_SIZE}
      maxToRenderPerBatch={MAX_TO_RENDER_PER_BATCH}
      initialNumToRender={INITIAL_NUM_TO_RENDER}
      removeClippedSubviews={true}
      updateCellsBatchingPeriod={50}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={ListFooterComponent}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
    />
  );
}

interface HomeCardSkeletonProps {
  colors: any;
}

const SkeletonComponent = ({ colors }: HomeCardSkeletonProps) => {
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
};

export const HomeCardSkeleton = memo(SkeletonComponent);

const styles = StyleSheet.create({
  homeCard: {
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 16,
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
    fontWeight: '700' as const,
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
    fontWeight: '700' as const,
    textTransform: 'capitalize',
  },
  cardPrice: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800' as const,
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
    fontWeight: '700' as const,
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
  },
  statText: {
    fontSize: 12,
    fontWeight: '500' as const,
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
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
  },
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  endFooter: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  endText: {
    fontSize: 13,
  },
  skeletonCard: {
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 16,
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
});
