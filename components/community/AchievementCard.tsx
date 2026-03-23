import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Lock, Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { HomeAchievement } from '@/types/communityHomes';
import { getRarityColor } from '@/mocks/achievementsData';

interface AchievementCardProps {
  achievement: HomeAchievement;
  onPress?: () => void;
}

export default function AchievementCard({ achievement, onPress }: AchievementCardProps) {
  const { colors, isDark } = useTheme();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const rarityColor = getRarityColor(achievement.rarity);
  const progressPercent = Math.min((achievement.progress / achievement.requirement) * 100, 100);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPercent,
      duration: 800,
      useNativeDriver: false,
    }).start();

    if (achievement.isUnlocked) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
        ])
      ).start();
    }
  }, [progressPercent, achievement.isUnlocked]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const styles = createStyles(colors, isDark, rarityColor);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        achievement.isUnlocked && styles.containerUnlocked,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {achievement.isUnlocked && (
        <Animated.View style={[styles.glow, { opacity: glowOpacity }]} pointerEvents="none" />
      )}

      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{achievement.icon}</Text>
        {achievement.isUnlocked ? (
          <View style={styles.checkBadge}>
            <Check color="#FFFFFF" size={10} strokeWidth={3} />
          </View>
        ) : (
          <View style={styles.lockOverlay}>
            <Lock color="rgba(255,255,255,0.8)" size={16} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{achievement.name}</Text>
          <View style={[styles.rarityBadge, { backgroundColor: rarityColor + '20' }]}>
            <Text style={[styles.rarityText, { color: rarityColor }]}>
              {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
            </Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {achievement.description}
        </Text>

        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                { width: progressWidth, backgroundColor: rarityColor },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {achievement.progress}/{achievement.requirement}
          </Text>
        </View>

        <View style={styles.rewardContainer}>
          <Text style={styles.rewardIcon}>🪙</Text>
          <Text style={styles.rewardText}>{achievement.rewardCoins}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any, isDark: boolean, rarityColor: string) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  containerUnlocked: {
    borderColor: rarityColor,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: rarityColor,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 28,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  rewardIcon: {
    fontSize: 12,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
});
