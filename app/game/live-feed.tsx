import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Radio,
  ArrowLeft,
  Filter,
  TrendingUp,
  Trophy,
  Home,
  Target,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  Heart,
  MessageCircle,
  Share2,
  Bot,
  Users,
  Zap,
  Clock,
  X,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useSocialFeed } from '@/contexts/SocialFeedContext';
import { SocialPost } from '@/types/socialFeed';

type CategoryFilter = 'all' | 'credit_score' | 'achievement' | 'home_purchase' | 'milestone' | 'tip' | 'question' | 'status';

interface CategoryOption {
  key: CategoryFilter;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  emoji: string;
}

const CATEGORIES: CategoryOption[] = [
  { key: 'all', label: 'All Activity', icon: Radio, color: '#6366F1', emoji: '📡' },
  { key: 'credit_score', label: 'Credit Score', icon: TrendingUp, color: '#10B981', emoji: '📊' },
  { key: 'achievement', label: 'Achievements', icon: Trophy, color: '#F59E0B', emoji: '🏆' },
  { key: 'home_purchase', label: 'Home Purchase', icon: Home, color: '#0EA5E9', emoji: '🏠' },
  { key: 'milestone', label: 'Milestones', icon: Target, color: '#EC4899', emoji: '🎯' },
  { key: 'tip', label: 'Tips', icon: Lightbulb, color: '#8B5CF6', emoji: '💡' },
  { key: 'question', label: 'Questions', icon: HelpCircle, color: '#F97316', emoji: '❓' },
  { key: 'status', label: 'Status', icon: MessageSquare, color: '#64748B', emoji: '💭' },
];

const CREDIT_SCORE_COLOR = (score: number): string => {
  if (score >= 800) return '#10B981';
  if (score >= 740) return '#34D399';
  if (score >= 670) return '#F59E0B';
  if (score >= 580) return '#F97316';
  return '#EF4444';
};

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function mapPostTypeToCategory(post: SocialPost): CategoryFilter {
  const pt = post.postType || post.type || 'status';
  if (pt === 'credit_score') return 'credit_score';
  if (pt === 'achievement') return 'achievement';
  if (pt === 'home_purchase' || pt === 'home') return 'home_purchase';
  if (pt === 'milestone') return 'milestone';
  if (pt === 'tip') return 'tip';
  if (pt === 'question') return 'question';
  return 'status';
}

const LiveActivityItem = React.memo(function LiveActivityItem({
  post,
  colors,
  isDark,
  onLike,
}: {
  post: SocialPost;
  colors: any;
  isDark: boolean;
  onLike: (id: string) => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const category = mapPostTypeToCategory(post);
  const categoryInfo = CATEGORIES.find(c => c.key === category) || CATEGORIES[0];
  const CategoryIcon = categoryInfo.icon;

  return (
    <Animated.View
      style={[
        styles.activityCard,
        {
          backgroundColor: isDark ? '#1E1E2E' : '#FFFFFF',
          borderLeftColor: categoryInfo.color,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          ...Platform.select({
            ios: {
              shadowColor: categoryInfo.color,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
            },
            android: { elevation: 2 },
            web: {
              boxShadow: `0 2px 8px ${categoryInfo.color}14`,
            },
          }),
        },
      ]}
    >
      <View style={styles.activityHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color + '18' }]}>
          <CategoryIcon size={12} color={categoryInfo.color} />
          <Text style={[styles.categoryLabel, { color: categoryInfo.color }]}>
            {categoryInfo.label}
          </Text>
        </View>
        <View style={styles.timeRow}>
          <Clock size={10} color={colors.textLight} />
          <Text style={[styles.timeText, { color: colors.textLight }]}>
            {getTimeAgo(post.createdAt)}
          </Text>
        </View>
      </View>

      <View style={styles.authorRow}>
        {post.authorAvatar ? (
          <Image source={{ uri: post.authorAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: categoryInfo.color + '30' }]}>
            <Text style={styles.avatarInitial}>
              {post.authorName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}
        <View style={styles.authorInfo}>
          <View style={styles.authorNameRow}>
            <Text style={[styles.authorName, { color: colors.text }]} numberOfLines={1}>
              {post.authorName}
            </Text>
            {post.isAIAgent && (
              <View style={[styles.agentTag, { backgroundColor: '#6366F1' + '20' }]}>
                <Bot size={9} color="#6366F1" />
                <Text style={styles.agentTagText}>AI</Text>
              </View>
            )}
          </View>
          {post.authorCity && (
            <Text style={[styles.authorMeta, { color: colors.textLight }]} numberOfLines={1}>
              {post.authorOccupation ? `${post.authorOccupation} · ` : ''}{post.authorCity}
              {post.authorCreditScore ? ` · ` : ''}
              {post.authorCreditScore && (
                <Text style={{ color: CREDIT_SCORE_COLOR(post.authorCreditScore), fontWeight: '700' as const }}>
                  {post.authorCreditScore}
                </Text>
              )}
            </Text>
          )}
        </View>
      </View>

      <Text style={[styles.postContent, { color: colors.text }]} numberOfLines={4}>
        {post.text || post.content || ''}
      </Text>

      {post.media && post.media.length > 0 && post.media[0]?.uri ? (
        <Image
          source={{ uri: post.media[0].uri }}
          style={styles.mediaPreview}
          resizeMode="cover"
        />
      ) : null}

      <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onLike(post.id);
          }}
          activeOpacity={0.7}
        >
          <Heart
            size={16}
            color={post.isLiked ? '#EF4444' : colors.textLight}
            fill={post.isLiked ? '#EF4444' : 'transparent'}
          />
          <Text style={[styles.actionText, { color: post.isLiked ? '#EF4444' : colors.textLight }]}>
            {post.likes || 0}
          </Text>
        </TouchableOpacity>
        <View style={styles.actionButton}>
          <MessageCircle size={16} color={colors.textLight} />
          <Text style={[styles.actionText, { color: colors.textLight }]}>
            {post.numComments || post.comments?.length || 0}
          </Text>
        </View>
        <View style={styles.actionButton}>
          <Share2 size={16} color={colors.textLight} />
          <Text style={[styles.actionText, { color: colors.textLight }]}>
            {post.numShares || 0}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
});

export default function LiveFeedScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    posts,
    isLoading,
    isRefreshing,
    isConnected,
    aiAgentCount,
    hasMore,
    refreshFeed,
    loadMorePosts,
    toggleLikePost,
  } = useSocialFeed();

  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const filterPanelAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const toggleFilterPanel = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !showFilterPanel;
    setShowFilterPanel(next);
    Animated.spring(filterPanelAnim, {
      toValue: next ? 1 : 0,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [showFilterPanel, filterPanelAnim]);

  const selectFilter = useCallback((key: CategoryFilter) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveFilter(key);
    setShowFilterPanel(false);
    Animated.timing(filterPanelAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [filterPanelAnim]);

  const filteredPosts = useMemo(() => {
    if (activeFilter === 'all') return posts;
    return posts.filter(p => mapPostTypeToCategory(p) === activeFilter);
  }, [posts, activeFilter]);

  const handleLike = useCallback((postId: string) => {
    void toggleLikePost(postId);
  }, [toggleLikePost]);

  const handleRefresh = useCallback(() => {
    void refreshFeed();
  }, [refreshFeed]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      void loadMorePosts();
    }
  }, [hasMore, isLoading, loadMorePosts]);

  const activeCategoryInfo = CATEGORIES.find(c => c.key === activeFilter) || CATEGORIES[0];

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: posts.length };
    posts.forEach(p => {
      const cat = mapPostTypeToCategory(p);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [posts]);

  const renderItem = useCallback(({ item }: { item: SocialPost }) => (
    <LiveActivityItem
      post={item}
      colors={colors}
      isDark={isDark}
      onLike={handleLike}
    />
  ), [colors, isDark, handleLike]);

  const keyExtractor = useCallback((item: SocialPost) => item.id, []);

  const ListHeader = useMemo(() => (
    <View style={styles.feedHeader}>
      <View style={[styles.statsRow, { backgroundColor: isDark ? '#1A1A2E' : '#F8FAFC' }]}>
        <View style={styles.statItem}>
          <Users size={14} color="#6366F1" />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {aiAgentCount > 1000 ? `${(aiAgentCount / 1000).toFixed(0)}K` : aiAgentCount || '—'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textLight }]}>Active Agents</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Zap size={14} color="#F59E0B" />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {filteredPosts.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textLight }]}>Posts</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Radio size={14} color={isConnected ? '#10B981' : '#EF4444'} />
          <Text style={[styles.statValue, { color: isConnected ? '#10B981' : '#EF4444' }]}>
            {isConnected ? 'Live' : 'Offline'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textLight }]}>Status</Text>
        </View>
      </View>
    </View>
  ), [isDark, colors, aiAgentCount, filteredPosts.length, isConnected]);

  const ListEmpty = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.textLight }]}>Loading live feed...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📡</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Activity Yet</Text>
        <Text style={[styles.emptyText, { color: colors.textLight }]}>
          {activeFilter !== 'all'
            ? `No ${activeCategoryInfo.label.toLowerCase()} posts found. Try a different filter.`
            : 'Pull down to refresh and check for new activity.'}
        </Text>
      </View>
    );
  }, [isLoading, colors, activeFilter, activeCategoryInfo.label]);

  const ListFooter = useMemo(() => {
    if (!hasMore || filteredPosts.length === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.footerText, { color: colors.textLight }]}>Loading more...</Text>
      </View>
    );
  }, [hasMore, filteredPosts.length, colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: isDark ? '#0F0F1A' : '#FFFFFF' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: isDark ? '#1E1E2E' : '#F1F5F9' }]}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleGroup}>
            <View style={styles.liveBadge}>
              <Animated.View
                style={[
                  styles.liveDot,
                  { backgroundColor: isConnected ? '#10B981' : '#EF4444', transform: [{ scale: pulseAnim }] },
                ]}
              />
              <Text style={styles.liveText}>{isConnected ? 'LIVE' : 'OFFLINE'}</Text>
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Live Feed</Text>
          </View>

          <TouchableOpacity
            onPress={toggleFilterPanel}
            style={[
              styles.filterButton,
              {
                backgroundColor: activeFilter !== 'all'
                  ? activeCategoryInfo.color + '18'
                  : isDark ? '#1E1E2E' : '#F1F5F9',
              },
            ]}
            activeOpacity={0.7}
          >
            <Filter size={18} color={activeFilter !== 'all' ? activeCategoryInfo.color : colors.text} />
            {activeFilter !== 'all' && (
              <View style={[styles.filterDot, { backgroundColor: activeCategoryInfo.color }]} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.chipRow}>
          {CATEGORIES.map(cat => {
            const isActive = activeFilter === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => selectFilter(cat.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive ? cat.color + '20' : isDark ? '#1A1A2E' : '#F1F5F9',
                    borderColor: isActive ? cat.color : 'transparent',
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12 }}>{cat.emoji}</Text>
                <Text
                  style={[
                    styles.chipText,
                    { color: isActive ? cat.color : colors.textLight },
                  ]}
                >
                  {cat.label}
                </Text>
                {(categoryCounts[cat.key] ?? 0) > 0 && (
                  <View style={[styles.chipCount, { backgroundColor: isActive ? cat.color : colors.textLight + '30' }]}>
                    <Text style={[styles.chipCountText, { color: isActive ? '#FFF' : colors.textLight }]}>
                      {categoryCounts[cat.key]}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {showFilterPanel && (
        <Animated.View
          style={[
            styles.filterPanel,
            {
              backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF',
              opacity: filterPanelAnim,
              transform: [{ translateY: filterPanelAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
              ...Platform.select({
                ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
                android: { elevation: 8 },
              }),
            },
          ]}
        >
          <View style={styles.filterPanelHeader}>
            <Text style={[styles.filterPanelTitle, { color: colors.text }]}>Filter by Category</Text>
            <TouchableOpacity onPress={toggleFilterPanel}>
              <X size={18} color={colors.textLight} />
            </TouchableOpacity>
          </View>
          {CATEGORIES.map(cat => {
            const isActive = activeFilter === cat.key;
            const Icon = cat.icon;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => selectFilter(cat.key)}
                style={[
                  styles.filterOption,
                  { backgroundColor: isActive ? cat.color + '12' : 'transparent' },
                ]}
                activeOpacity={0.7}
              >
                <View style={[styles.filterOptionIcon, { backgroundColor: cat.color + '20' }]}>
                  <Icon size={16} color={cat.color} />
                </View>
                <Text style={[styles.filterOptionLabel, { color: isActive ? cat.color : colors.text }]}>
                  {cat.label}
                </Text>
                <Text style={[styles.filterOptionCount, { color: colors.textLight }]}>
                  {categoryCounts[cat.key] ?? 0}
                </Text>
                {isActive && <View style={[styles.filterActiveIndicator, { backgroundColor: cat.color }]} />}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      )}

      <FlatList
        data={filteredPosts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        testID="live-feed-list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    alignItems: 'center',
    gap: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#10B981',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  filterButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  chipCount: {
    minWidth: 18,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chipCountText: {
    fontSize: 9,
    fontWeight: '700' as const,
  },
  filterPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 16,
  },
  filterPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterPanelTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  filterOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  filterOptionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  filterOptionCount: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginRight: 8,
  },
  filterActiveIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  feedHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 14,
    borderRadius: 16,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  activityCard: {
    borderRadius: 16,
    borderLeftWidth: 3,
    padding: 14,
    marginTop: 10,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#6366F1',
  },
  authorInfo: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  agentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  agentTagText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#6366F1',
  },
  authorMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  mediaPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerText: {
    fontSize: 13,
  },
});
