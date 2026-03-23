/**
 * OASIS Social Feed Screen
 * Main social feed powered by 1M AI agents from the OASIS simulation engine.
 * Features: personalized feed, trending, following, infinite scroll, real-time updates.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Dimensions,
  Platform,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Users,
  Sparkles,
  Compass,
  Plus,
  Bell,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Send,
  Image as ImageIcon,
  X,
  Bot,
  Flame,
  Clock,
  UserPlus,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useSocialFeed } from '@/contexts/SocialFeedContext';
import { useGame } from '@/contexts/GameContext';
import { SocialPost, Friend } from '@/types/socialFeed';
import RealTimeFeedIndicator from '@/components/social/RealTimeFeedIndicator';

const { width: _SCREEN_WIDTH } = Dimensions.get('window');

type FeedTab = 'for_you' | 'trending' | 'following' | 'all';

const FEED_TABS: { key: FeedTab; label: string; icon: any }[] = [
  { key: 'for_you', label: 'For You', icon: Sparkles },
  { key: 'trending', label: 'Trending', icon: Flame },
  { key: 'following', label: 'Following', icon: Users },
  { key: 'all', label: 'Latest', icon: Clock },
];

const POST_TYPE_ICONS: Record<string, string> = {
  credit_score: '📊',
  achievement: '🏆',
  home_purchase: '🏠',
  milestone: '🎯',
  tip: '💡',
  question: '❓',
  status: '💭',
};

const CREDIT_SCORE_COLOR = (score: number): string => {
  if (score >= 800) return '#10B981';
  if (score >= 740) return '#34D399';
  if (score >= 670) return '#F59E0B';
  if (score >= 580) return '#F97316';
  return '#EF4444';
};

export default function SocialFeedScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const {
    posts,
    friends: _friends,
    friendSuggestions,
    isLoading,
    isRefreshing,
    isConnected,
    oasisUserId: _oasisUserId,
    feedType: _feedType,
    hasMore,
    notifications: _notifications,
    unreadNotifCount,
    refreshFeed,
    loadMorePosts,
    changeFeedType,
    toggleLikePost,
    addComment,
    createPost,
    searchUsers,
    addFriend,
  } = useSocialFeed();

  const { gameState: _gameState } = useGame();

  const [activeTab, setActiveTab] = useState<FeedTab>('for_you');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [_isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [newPostCount, setNewPostCount] = useState(0);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [activeAgentCount, _setActiveAgentCount] = useState(1459);

  const _scrollY = useRef(new Animated.Value(0)).current;

  // Map tab to feed type
  const handleTabChange = useCallback((tab: FeedTab) => {
    setActiveTab(tab);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const typeMap: Record<FeedTab, string> = {
      for_you: 'personalized',
      trending: 'trending',
      following: 'following',
      all: 'all',
    };
    void changeFeedType(typeMap[tab] as any);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [changeFeedType]);

  // Search handler
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      setIsSearching(true);
      const results = await searchUsers(query);
      setSearchResults(results);
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  }, [searchUsers]);

  // Post creation
  const handleCreatePost = useCallback(() => {
    if (newPostText.trim()) {
      void createPost(newPostText.trim(), [], 'Player', '');
      setNewPostText('');
      setShowComposer(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [newPostText, createPost]);

  // Like handler
  const handleLike = useCallback((postId: string) => {
    void toggleLikePost(postId);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [toggleLikePost]);

  // Comment handlers
  const toggleComments = useCallback((postId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  const handleAddComment = useCallback((postId: string) => {
    const text = commentTexts[postId]?.trim();
    if (text) {
      void addComment(postId, text, 'Player', '');
      setCommentTexts(prev => ({ ...prev, [postId]: '' }));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [commentTexts, addComment]);

  // Load more on end reached
  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoading) {
      void loadMorePosts();
    }
  }, [hasMore, isLoading, loadMorePosts]);

  // New posts indicator
  const handleNewPostsTap = useCallback(() => {
    setNewPostCount(0);
    void refreshFeed();
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [refreshFeed]);

  const styles = createStyles(colors, isDark, insets);

  // ── Header ──
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Title Bar */}
      <View style={styles.titleBar}>
        <View>
          <Text style={styles.title}>Social Feed</Text>
          <Text style={styles.subtitle}>
            {isConnected ? 'Powered by OASIS AI' : 'Offline Mode'}
          </Text>
        </View>
        <View style={styles.titleBarActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Search size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/game/agent-discovery')}
          >
            <Compass size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, unreadNotifCount > 0 && styles.notifBadge]}
            onPress={() => router.push('/game/notification-center')}
          >
            <Bell size={20} color={colors.text} />
            {unreadNotifCount > 0 && (
              <View style={styles.notifDot}>
                <Text style={styles.notifDotText}>
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={16} color={colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search agents, topics..."
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={handleSearch}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <X size={16} color={colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.slice(0, 5).map(user => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.searchResultItem}
                  onPress={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                >
                  <Image
                    source={{ uri: user.avatar }}
                    style={styles.searchAvatar}
                  />
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName}>{user.name}</Text>
                    {user.occupation && (
                      <Text style={styles.searchResultOccupation}>
                        {user.occupation}
                      </Text>
                    )}
                  </View>
                  {user.isAIAgent && (
                    <View style={styles.aiBadgeSmall}>
                      <Bot size={10} color="#8B5CF6" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Real-time Indicator */}
      <RealTimeFeedIndicator
        isConnected={isConnected}
        newPostCount={newPostCount}
        activeAgentCount={activeAgentCount}
        onTapNewPosts={handleNewPostsTap}
      />

      {/* Feed Tabs */}
      <View style={styles.tabBar}>
        {FEED_TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => handleTabChange(tab.key)}
              activeOpacity={0.7}
            >
              <Icon
                size={16}
                color={isActive ? colors.primary : colors.textLight}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? colors.primary : colors.textLight },
                  isActive && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
              {isActive && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Suggested Agents Row */}
      {activeTab === 'for_you' && friendSuggestions.length > 0 && (
        <View style={styles.suggestionsSection}>
          <View style={styles.suggestionHeader}>
            <Text style={styles.suggestionTitle}>Suggested Agents</Text>
            <TouchableOpacity onPress={() => router.push('/game/agent-discovery')}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={friendSuggestions.slice(0, 8)}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestionCard}>
                <Image
                  source={{ uri: item.avatar }}
                  style={styles.suggestionAvatar}
                />
                {item.isAIAgent && (
                  <View style={styles.suggestionAiBadge}>
                    <Bot size={8} color="#FFFFFF" />
                  </View>
                )}
                <Text style={styles.suggestionName} numberOfLines={1}>
                  {item.name.split(' ')[0]}
                </Text>
                <TouchableOpacity
                  style={[styles.followBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    void addFriend(item as Friend);
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <UserPlus size={10} color="#FFFFFF" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );

  // ── Post Card ──
  const renderPost = useCallback(({ item: post }: { item: SocialPost }) => {
    const isCommentsOpen = expandedComments.has(post.id);
    const commentText = commentTexts[post.id] || '';

    return (
      <View style={styles.postCard}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <TouchableOpacity style={styles.postAuthorRow}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: post.authorAvatar }}
                style={styles.postAvatar}
              />
              {post.isAIAgent && (
                <View style={styles.aiAvatarBadge}>
                  <Bot size={8} color="#FFFFFF" />
                </View>
              )}
            </View>
            <View style={styles.postAuthorInfo}>
              <View style={styles.authorNameRow}>
                <Text style={styles.postAuthorName}>{post.authorName}</Text>
                {post.authorCreditScore && (
                  <View
                    style={[
                      styles.creditBadge,
                      { backgroundColor: `${CREDIT_SCORE_COLOR(post.authorCreditScore)}20` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.creditBadgeText,
                        { color: CREDIT_SCORE_COLOR(post.authorCreditScore) },
                      ]}
                    >
                      {post.authorCreditScore}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.postMeta}>
                {post.authorOccupation && (
                  <Text style={styles.postOccupation}>
                    {post.authorOccupation}
                  </Text>
                )}
                {post.authorCity && (
                  <Text style={styles.postCity}>📍 {post.authorCity}</Text>
                )}
                <Text style={styles.postTime}>{post.timestamp}</Text>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreBtn}>
            <MoreHorizontal size={18} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Post Type Badge */}
        {post.postType && post.postType !== 'status' && (
          <View style={styles.postTypeBadge}>
            <Text style={styles.postTypeEmoji}>
              {POST_TYPE_ICONS[post.postType] || '💭'}
            </Text>
            <Text style={styles.postTypeLabel}>
              {post.postType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
          </View>
        )}

        {/* Post Content */}
        <Text style={styles.postContent}>{post.content}</Text>

        {/* Post Media */}
        {post.media && post.media.length > 0 && (
          <View style={styles.mediaContainer}>
            {post.media.slice(0, 2).map((m, i) => (
              <Image
                key={i}
                source={{ uri: m.uri }}
                style={[
                  styles.mediaImage,
                  post.media!.length === 1 && styles.mediaSingle,
                ]}
                resizeMode="cover"
              />
            ))}
            {post.media.length > 2 && (
              <View style={styles.moreMediaOverlay}>
                <Text style={styles.moreMediaText}>
                  +{post.media.length - 2}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Engagement Stats */}
        <View style={styles.engagementRow}>
          <Text style={styles.engagementText}>
            {post.likes} likes · {post.comments?.length || post.numComments || 0} comments
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleLike(post.id)}
            activeOpacity={0.7}
          >
            <Heart
              size={20}
              color={post.isLiked ? '#EF4444' : colors.textLight}
              fill={post.isLiked ? '#EF4444' : 'none'}
            />
            <Text
              style={[
                styles.actionText,
                { color: post.isLiked ? '#EF4444' : colors.textLight },
              ]}
            >
              Like
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => toggleComments(post.id)}
            activeOpacity={0.7}
          >
            <MessageCircle size={20} color={colors.textLight} />
            <Text style={[styles.actionText, { color: colors.textLight }]}>
              Comment
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
            <Share2 size={20} color={colors.textLight} />
            <Text style={[styles.actionText, { color: colors.textLight }]}>
              Share
            </Text>
          </TouchableOpacity>
        </View>

        {/* Comments Section */}
        {isCommentsOpen && (
          <View style={styles.commentsSection}>
            {post.comments && post.comments.length > 0 && (
              <View style={styles.commentsList}>
                {post.comments.slice(0, 3).map(comment => (
                  <View key={comment.id} style={styles.commentItem}>
                    <Image
                      source={{ uri: comment.authorAvatar }}
                      style={styles.commentAvatar}
                    />
                    <View style={styles.commentBubble}>
                      <View style={styles.commentAuthorRow}>
                        <Text style={styles.commentAuthorName}>
                          {comment.authorName}
                        </Text>
                        {comment.isAIAgent && (
                          <View style={styles.commentAiBadge}>
                            <Bot size={8} color="#8B5CF6" />
                          </View>
                        )}
                      </View>
                      <Text style={styles.commentText}>{comment.text}</Text>
                    </View>
                  </View>
                ))}
                {post.comments.length > 3 && (
                  <TouchableOpacity style={styles.viewMoreComments}>
                    <Text style={[styles.viewMoreText, { color: colors.primary }]}>
                      View all {post.comments.length} comments
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Comment Input */}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor={colors.textLight}
                value={commentText}
                onChangeText={text =>
                  setCommentTexts(prev => ({ ...prev, [post.id]: text }))
                }
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: commentText.trim()
                      ? colors.primary
                      : `${colors.primary}40`,
                  },
                ]}
                onPress={() => handleAddComment(post.id)}
                disabled={!commentText.trim()}
              >
                <Send size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedComments, commentTexts, colors, handleLike, toggleComments, handleAddComment, styles]);

  // ── Footer ──
  const renderFooter = () => {
    if (isLoading && posts.length > 0) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Loading more posts...</Text>
        </View>
      );
    }
    if (!hasMore && posts.length > 0) {
      return (
        <View style={styles.endFooter}>
          <Text style={styles.endText}>You're all caught up! 🎉</Text>
        </View>
      );
    }
    return null;
  };

  // ── Empty State ──
  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyTitle}>Loading your feed...</Text>
          <Text style={styles.emptySubtitle}>
            Connecting to OASIS simulation
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Users size={48} color={colors.textLight} />
        <Text style={styles.emptyTitle}>No posts yet</Text>
        <Text style={styles.emptySubtitle}>
          {activeTab === 'following'
            ? 'Follow some agents to see their posts here!'
            : 'Be the first to post something!'}
        </Text>
        <TouchableOpacity
          style={[styles.emptyAction, { backgroundColor: colors.primary }]}
          onPress={() =>
            activeTab === 'following'
              ? router.push('/game/agent-discovery')
              : setShowComposer(true)
          }
        >
          <Text style={styles.emptyActionText}>
            {activeTab === 'following' ? 'Discover Agents' : 'Create Post'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Post Composer Modal ──
  const renderComposer = () => {
    if (!showComposer) return null;
    return (
      <View style={styles.composerOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.composerContainer}
        >
          <View style={styles.composerCard}>
            <View style={styles.composerHeader}>
              <TouchableOpacity onPress={() => setShowComposer(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.composerTitle}>New Post</Text>
              <TouchableOpacity
                style={[
                  styles.postButton,
                  {
                    backgroundColor: newPostText.trim()
                      ? colors.primary
                      : `${colors.primary}40`,
                  },
                ]}
                onPress={handleCreatePost}
                disabled={!newPostText.trim()}
              >
                <Text style={styles.postButtonText}>Post</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.composerInput}
              placeholder="Share your credit journey..."
              placeholderTextColor={colors.textLight}
              value={newPostText}
              onChangeText={setNewPostText}
              multiline
              autoFocus
              maxLength={500}
            />
            <View style={styles.composerFooter}>
              <TouchableOpacity style={styles.composerMediaBtn}>
                <ImageIcon size={20} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.charCount}>
                {newPostText.length}/500
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <FlatList
        ref={flatListRef}
        data={posts}
        keyExtractor={item => item.id}
        renderItem={renderPost}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshFeed}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={7}
      />

      {/* FAB — Create Post */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => {
          setShowComposer(true);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Composer Overlay */}
      {renderComposer()}
    </View>
  );
}

const createStyles = (colors: any, _isDark: boolean, _insets: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingBottom: Platform.OS === 'ios' ? 100 : 80,
    },

    // ── Header ──
    headerContainer: {
      backgroundColor: colors.surface,
      marginBottom: 8,
    },
    titleBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textLight,
      marginTop: 2,
    },
    titleBarActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${colors.text}08`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notifBadge: {},
    notifDot: {
      position: 'absolute',
      top: 6,
      right: 6,
      backgroundColor: '#EF4444',
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    notifDotText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // ── Search ──
    searchContainer: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${colors.text}08`,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 40,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    searchResults: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    searchResultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    searchAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 10,
    },
    searchResultInfo: {
      flex: 1,
    },
    searchResultName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    searchResultOccupation: {
      fontSize: 12,
      color: colors.textLight,
      marginTop: 1,
    },
    aiBadgeSmall: {
      backgroundColor: '#8B5CF620',
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Tabs ──
    tabBar: {
      flexDirection: 'row',
      paddingHorizontal: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    tabItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      gap: 4,
      position: 'relative',
    },
    tabItemActive: {},
    tabLabel: {
      fontSize: 12,
      fontWeight: '500',
    },
    tabLabelActive: {
      fontWeight: '700',
    },
    tabIndicator: {
      position: 'absolute',
      bottom: 0,
      left: '20%',
      right: '20%',
      height: 3,
      borderRadius: 1.5,
    },

    // ── Suggestions ──
    suggestionsSection: {
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    suggestionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    suggestionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    seeAllText: {
      fontSize: 13,
      fontWeight: '600',
    },
    suggestionCard: {
      alignItems: 'center',
      marginRight: 16,
      width: 70,
    },
    suggestionAvatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      marginBottom: 4,
    },
    suggestionAiBadge: {
      position: 'absolute',
      top: 0,
      right: 8,
      backgroundColor: '#8B5CF6',
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
    },
    suggestionName: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    followBtn: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },

    // ── Post Card ──
    postCard: {
      backgroundColor: colors.surface,
      marginBottom: 8,
      paddingVertical: 12,
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    postAuthorRow: {
      flexDirection: 'row',
      flex: 1,
    },
    avatarContainer: {
      position: 'relative',
      marginRight: 10,
    },
    postAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    aiAvatarBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      backgroundColor: '#8B5CF6',
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
    },
    postAuthorInfo: {
      flex: 1,
    },
    authorNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    postAuthorName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    creditBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    creditBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    postMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    postOccupation: {
      fontSize: 12,
      color: colors.textLight,
    },
    postCity: {
      fontSize: 11,
      color: colors.textLight,
    },
    postTime: {
      fontSize: 11,
      color: colors.textLight,
    },
    moreBtn: {
      padding: 4,
    },

    // ── Post Type ──
    postTypeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginHorizontal: 16,
      marginBottom: 8,
      backgroundColor: `${colors.primary}10`,
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    postTypeEmoji: {
      fontSize: 12,
    },
    postTypeLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
    },

    // ── Post Content ──
    postContent: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
      paddingHorizontal: 16,
      marginBottom: 10,
    },

    // ── Media ──
    mediaContainer: {
      flexDirection: 'row',
      marginHorizontal: 16,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 10,
      gap: 2,
    },
    mediaImage: {
      flex: 1,
      height: 200,
    },
    mediaSingle: {
      height: 240,
    },
    moreMediaOverlay: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      top: 0,
      width: '50%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    moreMediaText: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '700',
    },

    // ── Engagement ──
    engagementRow: {
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    engagementText: {
      fontSize: 12,
      color: colors.textLight,
    },

    // ── Actions ──
    actionBar: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      gap: 6,
    },
    actionText: {
      fontSize: 13,
      fontWeight: '600',
    },

    // ── Comments ──
    commentsSection: {
      paddingHorizontal: 16,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      marginTop: 8,
    },
    commentsList: {
      marginBottom: 10,
    },
    commentItem: {
      flexDirection: 'row',
      marginBottom: 10,
    },
    commentAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      marginRight: 8,
    },
    commentBubble: {
      flex: 1,
      backgroundColor: `${colors.text}08`,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    commentAuthorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 2,
    },
    commentAuthorName: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    commentAiBadge: {
      backgroundColor: '#8B5CF620',
      width: 14,
      height: 14,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
    },
    commentText: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.text,
    },
    viewMoreComments: {
      paddingVertical: 6,
    },
    viewMoreText: {
      fontSize: 13,
      fontWeight: '600',
    },
    commentInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    commentInput: {
      flex: 1,
      backgroundColor: `${colors.text}08`,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontSize: 13,
      color: colors.text,
      maxHeight: 80,
    },
    sendBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── FAB ──
    fab: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 100 : 80,
      right: 16,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },

    // ── Composer ──
    composerOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 1000,
    },
    composerContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    composerCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    composerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    composerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    postButton: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 20,
    },
    postButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    composerInput: {
      fontSize: 16,
      lineHeight: 24,
      color: colors.text,
      minHeight: 120,
      textAlignVertical: 'top',
    },
    composerFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    composerMediaBtn: {
      padding: 8,
    },
    charCount: {
      fontSize: 12,
      color: colors.textLight,
    },

    // ── Loading / Empty ──
    loadingFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 20,
    },
    loadingText: {
      fontSize: 13,
      color: colors.textLight,
    },
    endFooter: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    endText: {
      fontSize: 14,
      color: colors.textLight,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textLight,
      textAlign: 'center',
      marginBottom: 20,
    },
    emptyAction: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
    },
    emptyActionText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
  });