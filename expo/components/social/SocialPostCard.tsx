/**
 * OASIS × Credit Life Simulator — Social Post Card
 * Enhanced post card showing AI agent indicators, credit scores,
 * and real-time engagement from the OASIS social platform.
 */
import React, { memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { SocialPost } from '@/types/socialFeed';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SocialPostCardProps {
  post: SocialPost;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare?: (postId: string) => void;
  onAuthorPress?: (authorId: string, oasisUserId?: number) => void;
  onLoadComments?: (postId: string) => void;
}

function SocialPostCard({
  post,
  onLike,
  onComment,
  onShare,
  onAuthorPress,
  onLoadComments,
}: SocialPostCardProps) {
  const { colors } = useTheme();
  const [showComments, setShowComments] = useState(false);
  const [_imageError, setImageError] = useState<Set<string>>(new Set());

  const timeAgo = useCallback((timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return String(num);
  };

  const getCreditScoreColor = (score: number): string => {
    if (score >= 800) return '#00C853';
    if (score >= 740) return '#64DD17';
    if (score >= 670) return '#FFD600';
    if (score >= 580) return '#FF9100';
    return '#FF1744';
  };

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'achievement': return { name: 'trophy', color: '#FFD700' };
      case 'milestone': return { name: 'flag', color: '#4CAF50' };
      case 'home': return { name: 'home', color: '#2196F3' };
      case 'tip': return { name: 'bulb', color: '#FF9800' };
      case 'question': return { name: 'help-circle', color: '#9C27B0' };
      default: return null;
    }
  };

  const handleToggleComments = () => {
    if (!showComments && post.comments.length === 0 && onLoadComments) {
      onLoadComments(post.id);
    }
    setShowComments(!showComments);
  };

  const typeIcon = getPostTypeIcon(post.type);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => onAuthorPress?.(post.authorId, post.oasisUserId)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: post.authorAvatar }}
            style={styles.avatar}
            defaultSource={{ uri: 'https://via.placeholder.com/40' }}
          />
          {post.isAIAgent && (
            <View style={[styles.aiBadge, { backgroundColor: '#6C63FF' }]}>
              <MaterialCommunityIcons name="robot" size={8} color="#FFF" />
            </View>
          )}
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.authorName, { color: colors.text }]} numberOfLines={1}>
              {post.authorName}
            </Text>
            {post.isAIAgent && (
              <View style={[styles.aiTag, { backgroundColor: '#6C63FF20' }]}>
                <Text style={[styles.aiTagText, { color: '#6C63FF' }]}>AI</Text>
              </View>
            )}
            {typeIcon && (
              <Ionicons
                name={typeIcon.name as any}
                size={14}
                color={typeIcon.color}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
          <View style={styles.metaRow}>
            {post.authorCreditScore && (
              <View style={styles.creditBadge}>
                <MaterialCommunityIcons
                  name="credit-card"
                  size={10}
                  color={getCreditScoreColor(post.authorCreditScore)}
                />
                <Text style={[styles.creditScore, { color: getCreditScoreColor(post.authorCreditScore) }]}>
                  {post.authorCreditScore}
                </Text>
              </View>
            )}
            {post.authorCity && (
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                📍 {post.authorCity}
              </Text>
            )}
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              • {timeAgo(post.createdAt)}
            </Text>
          </View>
        </View>

        {post.badge && (
          <Text style={styles.badge}>{post.badge}</Text>
        )}
      </TouchableOpacity>

      {/* Content */}
      <Text style={[styles.content, { color: colors.text }]}>{post.text}</Text>

      {/* Media */}
      {post.media.length > 0 && (
        <View style={styles.mediaContainer}>
          {post.media.length === 1 ? (
            <Image
              source={{ uri: post.media[0].uri }}
              style={styles.singleMedia}
              resizeMode="cover"
              onError={() => setImageError(prev => new Set(prev).add(post.media[0].id))}
            />
          ) : (
            <FlatList
              data={post.media}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item.uri }}
                  style={styles.carouselMedia}
                  resizeMode="cover"
                />
              )}
            />
          )}
          {post.media.length > 1 && (
            <View style={styles.mediaCount}>
              <Text style={styles.mediaCountText}>{post.media.length} photos</Text>
            </View>
          )}
        </View>
      )}

      {/* Engagement Stats */}
      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.statText, { color: colors.textSecondary }]}>
          {formatNumber(post.likes)} likes
        </Text>
        <Text style={[styles.statText, { color: colors.textSecondary }]}>
          {formatNumber(post.numComments || post.comments.length)} comments
        </Text>
        {(post.numShares || 0) > 0 && (
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {formatNumber(post.numShares || 0)} shares
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onLike(post.id)}
          activeOpacity={0.6}
        >
          <Ionicons
            name={post.isLiked ? 'heart' : 'heart-outline'}
            size={22}
            color={post.isLiked ? '#FF4757' : colors.textSecondary}
          />
          <Text style={[
            styles.actionText,
            { color: post.isLiked ? '#FF4757' : colors.textSecondary }
          ]}>
            {post.isLiked ? 'Liked' : 'Like'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleToggleComments}
          activeOpacity={0.6}
        >
          <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>
            Comment
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onShare?.(post.id)}
          activeOpacity={0.6}
        >
          <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>
            Share
          </Text>
        </TouchableOpacity>
      </View>

      {/* Comments Section */}
      {showComments && (
        <View style={[styles.commentsSection, { borderTopColor: colors.border }]}>
          {post.comments.length === 0 ? (
            <Text style={[styles.noComments, { color: colors.textSecondary }]}>
              No comments yet. Be the first!
            </Text>
          ) : (
            post.comments.slice(0, 5).map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Image source={{ uri: comment.authorAvatar }} style={styles.commentAvatar} />
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={[styles.commentAuthor, { color: colors.text }]}>
                      {comment.authorName}
                    </Text>
                    {comment.isAIAgent && (
                      <View style={[styles.aiTagSmall, { backgroundColor: '#6C63FF20' }]}>
                        <Text style={{ color: '#6C63FF', fontSize: 8, fontWeight: '700' }}>AI</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.commentText, { color: colors.text }]}>
                    {comment.text}
                  </Text>
                  <View style={styles.commentMeta}>
                    <Text style={[styles.commentTime, { color: colors.textSecondary }]}>
                      {timeAgo(comment.createdAt)}
                    </Text>
                    {comment.likes > 0 && (
                      <Text style={[styles.commentLikes, { color: colors.textSecondary }]}>
                        ❤️ {comment.likes}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
          {post.comments.length > 5 && (
            <TouchableOpacity style={styles.viewMoreBtn}>
              <Text style={[styles.viewMoreText, { color: colors.primary }]}>
                View all {post.comments.length} comments
              </Text>
            </TouchableOpacity>
          )}

          {/* Comment input */}
          <TouchableOpacity
            style={[styles.commentInput, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => onComment(post.id)}
          >
            <Text style={[styles.commentInputText, { color: colors.textSecondary }]}>
              Write a comment...
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E0E0',
  },
  aiBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    maxWidth: 160,
  },
  aiTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  aiTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  creditScore: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 2,
  },
  metaText: {
    fontSize: 11,
    marginRight: 4,
  },
  badge: {
    fontSize: 24,
    marginLeft: 8,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  mediaContainer: {
    position: 'relative',
  },
  singleMedia: {
    width: '100%',
    height: 220,
    backgroundColor: '#F0F0F0',
  },
  carouselMedia: {
    width: SCREEN_WIDTH - 26,
    height: 220,
    backgroundColor: '#F0F0F0',
  },
  mediaCount: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  mediaCountText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 5,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  commentsSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  noComments: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
    fontStyle: 'italic',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    marginRight: 8,
    marginTop: 2,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
  },
  aiTagSmall: {
    paddingHorizontal: 4,
    paddingVertical: 0.5,
    borderRadius: 3,
    marginLeft: 4,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
  commentMeta: {
    flexDirection: 'row',
    marginTop: 3,
    gap: 10,
  },
  commentTime: {
    fontSize: 11,
  },
  commentLikes: {
    fontSize: 11,
  },
  viewMoreBtn: {
    paddingVertical: 6,
  },
  viewMoreText: {
    fontSize: 13,
    fontWeight: '600',
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 6,
  },
  commentInputText: {
    fontSize: 13,
  },
});

export default memo(SocialPostCard);