import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Verified, Home, Users, Star } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  HomeOwnerProfile,
  formatCompactNumber,
  getCreditScoreColor,
  getCreditScoreLabel,
} from '@/types/communityHomes';

interface HomeOwnerCardProps {
  owner: HomeOwnerProfile;
  isFollowing: boolean;
  onPress: () => void;
  onFollow: () => void;
  compact?: boolean;
}

export default function HomeOwnerCard({
  owner,
  isFollowing,
  onPress,
  onFollow,
  compact = false,
}: HomeOwnerCardProps) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark, compact);

  const handleFollow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onFollow();
  };

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactContainer} onPress={onPress}>
        <View style={styles.compactAvatarContainer}>
          <Image source={{ uri: owner.avatar }} style={styles.compactAvatar} contentFit="cover" transition={150} cachePolicy="memory-disk" />
          {owner.isOnline && <View style={styles.compactOnlineIndicator} />}
        </View>
        <Text style={styles.compactName} numberOfLines={1}>{owner.name.split('_')[0]}</Text>
        {owner.isVerified && (
          <Verified color="#3B82F6" size={12} fill="#3B82F6" />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.avatarContainer}>
        <Image source={{ uri: owner.avatar }} style={styles.avatar} contentFit="cover" transition={150} cachePolicy="memory-disk" />
        {owner.isOnline && <View style={styles.onlineIndicator} />}
        <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.levelText}>{owner.level}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{owner.name}</Text>
          {owner.isVerified && (
            <Verified color="#3B82F6" size={16} fill="#3B82F6" />
          )}
        </View>

        <View style={styles.creditRow}>
          <View style={[styles.creditBadge, { backgroundColor: getCreditScoreColor(owner.creditScore) + '20' }]}>
            <Text style={[styles.creditScore, { color: getCreditScoreColor(owner.creditScore) }]}>
              {owner.creditScore}
            </Text>
            <Text style={[styles.creditLabel, { color: getCreditScoreColor(owner.creditScore) }]}>
              {getCreditScoreLabel(owner.creditScore)}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Home color={colors.textLight} size={14} />
            <Text style={styles.statText}>{owner.totalHomes}</Text>
          </View>
          <View style={styles.statItem}>
            <Users color={colors.textLight} size={14} />
            <Text style={styles.statText}>{formatCompactNumber(owner.followers)}</Text>
          </View>
        </View>

        {owner.badges.length > 0 && (
          <View style={styles.badgesRow}>
            {owner.badges.slice(0, 3).map((badge) => (
              <View
                key={badge.id}
                style={[styles.badge, { backgroundColor: badge.color + '20' }]}
              >
                <Text style={styles.badgeIcon}>{badge.icon}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.followButton, isFollowing && styles.followingButton]}
        onPress={handleFollow}
      >
        <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
          {isFollowing ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any, isDark: boolean, compact: boolean) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginRight: 12,
    width: 280,
    shadowColor: colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
  levelBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  creditRow: {
    marginBottom: 6,
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  creditScore: {
    fontSize: 13,
    fontWeight: '800',
  },
  creditLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIcon: {
    fontSize: 12,
  },
  followButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  followingButton: {
    backgroundColor: colors.border,
  },
  followButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  followingButtonText: {
    color: colors.textSecondary,
  },
  compactContainer: {
    alignItems: 'center',
    marginRight: 16,
    width: 70,
  },
  compactAvatarContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  compactAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  compactOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  compactName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
});
