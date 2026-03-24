import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Heart, MessageCircle, Send } from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { AchievementShare, Congratulation } from '@/types/challenges';
import { getTimeAgo } from '@/types/communityHomes';
import { getRarityColor } from '@/mocks/achievementsData';

interface AchievementShareCardProps {
  share: AchievementShare;
  onLike: (shareId: string) => void;
  onCongratulate: (shareId: string, message: string, emoji?: string) => void;
  isLiking?: boolean;
  isCongratulating?: boolean;
}

const QUICK_EMOJIS = ['🎉', '👏', '🔥', '💪', '⭐', '🏆'];

export default function AchievementShareCard({
  share,
  onLike,
  onCongratulate,
  isLiking,
  isCongratulating,
}: AchievementShareCardProps) {
  const { colors, isDark } = useTheme();
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<string | undefined>();

  const rarityColor = getRarityColor(share.achievementRarity);

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike(share.id);
  }, [share.id, onLike]);

  const handleToggleComment = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCommentInput(!showCommentInput);
    setComment('');
    setSelectedEmoji(undefined);
  }, [showCommentInput]);

  const handleSelectEmoji = useCallback((emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEmoji(emoji === selectedEmoji ? undefined : emoji);
  }, [selectedEmoji]);

  const handleSendCongrats = useCallback(() => {
    if (!comment.trim() && !selectedEmoji) {
      Alert.alert('Empty Message', 'Please write a message or select an emoji');
      return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCongratulate(share.id, comment.trim() || `${selectedEmoji}`, selectedEmoji);
    setShowCommentInput(false);
    setComment('');
    setSelectedEmoji(undefined);
  }, [share.id, comment, selectedEmoji, onCongratulate]);

  const styles = createStyles(colors, isDark, rarityColor);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: share.playerAvatar }}
          style={styles.avatar}
          contentFit="cover"
          transition={150}
        />
        <View style={styles.headerContent}>
          <Text style={styles.playerName}>{share.playerName}</Text>
          <Text style={styles.timeAgo}>{getTimeAgo(share.sharedAt)} ago</Text>
        </View>
      </View>

      <View style={styles.achievementCard}>
        <View style={styles.achievementIcon}>
          <Text style={styles.achievementIconText}>{share.achievementIcon}</Text>
        </View>
        <View style={styles.achievementContent}>
          <View style={styles.achievementHeader}>
            <Text style={styles.unlockedText}>Unlocked Achievement!</Text>
            <View style={[styles.rarityBadge, { backgroundColor: rarityColor + '20' }]}>
              <Text style={[styles.rarityText, { color: rarityColor }]}>
                {share.achievementRarity.charAt(0).toUpperCase() + share.achievementRarity.slice(1)}
              </Text>
            </View>
          </View>
          <Text style={styles.achievementName}>{share.achievementName}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, share.isLiked && styles.actionButtonActive]}
          onPress={handleLike}
          disabled={isLiking}
        >
          <Heart
            color={share.isLiked ? '#EF4444' : colors.textSecondary}
            size={18}
            fill={share.isLiked ? '#EF4444' : 'transparent'}
          />
          <Text style={[styles.actionText, share.isLiked && styles.actionTextActive]}>
            {share.likes}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, showCommentInput && styles.actionButtonActive]}
          onPress={handleToggleComment}
        >
          <MessageCircle
            color={showCommentInput ? colors.primary : colors.textSecondary}
            size={18}
          />
          <Text style={[styles.actionText, showCommentInput && styles.actionTextPrimary]}>
            Congratulate
          </Text>
        </TouchableOpacity>
      </View>

      {share.congratulations.length > 0 && (
        <View style={styles.congratsList}>
          {share.congratulations.slice(0, 3).map((congrat) => (
            <View key={congrat.id} style={styles.congratItem}>
              <Image
                source={{ uri: congrat.playerAvatar }}
                style={styles.congratAvatar}
                contentFit="cover"
                transition={150}
              />
              <View style={styles.congratContent}>
                <Text style={styles.congratName}>{congrat.playerName}</Text>
                <Text style={styles.congratMessage}>
                  {congrat.emoji && <Text>{congrat.emoji} </Text>}
                  {congrat.message}
                </Text>
              </View>
            </View>
          ))}
          {share.congratulations.length > 3 && (
            <Text style={styles.moreComments}>
              +{share.congratulations.length - 3} more congratulations
            </Text>
          )}
        </View>
      )}

      {showCommentInput && (
        <View style={styles.commentInputContainer}>
          <View style={styles.emojiRow}>
            {QUICK_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.emojiButton,
                  selectedEmoji === emoji && styles.emojiButtonSelected,
                ]}
                onPress={() => handleSelectEmoji(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Write a congratulation..."
              placeholderTextColor={colors.textLight}
              value={comment}
              onChangeText={setComment}
              maxLength={200}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!comment.trim() && !selectedEmoji) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendCongrats}
              disabled={isCongratulating || (!comment.trim() && !selectedEmoji)}
            >
              <Send color="#FFFFFF" size={18} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean, rarityColor: string) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  headerContent: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  timeAgo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: rarityColor + '40',
    marginBottom: 14,
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: rarityColor + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  achievementIconText: {
    fontSize: 28,
  },
  achievementContent: {
    flex: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  unlockedText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  achievementName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
  },
  actionButtonActive: {
    backgroundColor: colors.surfaceAlt,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionTextActive: {
    color: '#EF4444',
  },
  actionTextPrimary: {
    color: colors.primary,
  },
  congratsList: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  congratItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  congratAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
  },
  congratContent: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 10,
  },
  congratName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  congratMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  moreComments: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  commentInputContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  emojiButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonSelected: {
    backgroundColor: colors.primary + '30',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  emojiText: {
    fontSize: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    backgroundColor: colors.textLight,
  },
});
