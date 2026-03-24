import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Trophy,
  Home,
  Users,
  Compass,
  Target,
  Sparkles,
  MessageCircle,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useCommunityHomes } from '@/contexts/CommunityHomesContext';
import { useChallenges } from '@/contexts/ChallengeContext';
import AchievementCard from '@/components/community/AchievementCard';
import { HomeAchievement } from '@/types/communityHomes';
import { HOME_ACHIEVEMENTS } from '@/mocks/achievementsData';

type AchievementCategory = 'all' | 'visiting' | 'hosting' | 'social' | 'exploration' | 'milestone';

const CATEGORIES: { id: AchievementCategory; label: string; icon: any }[] = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'visiting', label: 'Visiting', icon: Home },
  { id: 'hosting', label: 'Hosting', icon: Users },
  { id: 'social', label: 'Social', icon: Users },
  { id: 'exploration', label: 'Explore', icon: Compass },
  { id: 'milestone', label: 'Milestones', icon: Target },
];

export default function AchievementsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { visitedHomeIds, followingIds } = useCommunityHomes();
  const { shareAchievement } = useChallenges();
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory>('all');

  const achievementsWithProgress = useMemo(() => {
    return HOME_ACHIEVEMENTS.map((achievement) => {
      let progress = 0;
      let isUnlocked = false;

      switch (achievement.id) {
        case 'first_visit':
        case 'explorer_5':
        case 'explorer_25':
        case 'explorer_100':
          progress = visitedHomeIds.length;
          break;
        case 'social_butterfly':
          progress = followingIds.length;
          break;
        default:
          progress = achievement.progress;
      }

      isUnlocked = progress >= achievement.requirement;

      return {
        ...achievement,
        progress,
        isUnlocked,
        unlockedAt: isUnlocked ? Date.now() : undefined,
      };
    });
  }, [visitedHomeIds, followingIds]);

  const filteredAchievements = useMemo(() => {
    if (selectedCategory === 'all') {
      return achievementsWithProgress;
    }
    return achievementsWithProgress.filter(a => a.category === selectedCategory);
  }, [achievementsWithProgress, selectedCategory]);

  const stats = useMemo(() => {
    const unlocked = achievementsWithProgress.filter(a => a.isUnlocked).length;
    const total = achievementsWithProgress.length;
    const coinsEarned = achievementsWithProgress
      .filter(a => a.isUnlocked)
      .reduce((sum, a) => sum + a.rewardCoins, 0);
    return { unlocked, total, coinsEarned };
  }, [achievementsWithProgress]);

  const handleCategoryPress = useCallback((category: AchievementCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(category);
  }, []);

  const handleShareAchievement = useCallback(async (achievement: HomeAchievement & { isUnlocked: boolean }) => {
    if (!achievement.isUnlocked) {
      Alert.alert('Not Unlocked', 'You can only share achievements you have unlocked!');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await shareAchievement({
        achievementId: achievement.id,
        achievementName: achievement.name,
        achievementIcon: achievement.icon,
        achievementRarity: achievement.rarity,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Shared!', 'Your achievement has been shared with the community!');
    } catch (error) {
      console.error('[Achievements] Error sharing:', error);
      Alert.alert('Error', 'Failed to share achievement');
    }
  }, [shareAchievement]);

  const handleViewFeed = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/achievement-feed' as any);
  }, [router]);

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Achievements',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={isDark ? ['#1E1B4B', '#312E81'] : ['#4F46E5', '#7C3AED']}
          style={styles.headerGradient}
        >
          <View style={styles.statsContainer}>
            <View style={styles.trophyContainer}>
              <Trophy color="#FFD700" size={48} fill="#FFD700" />
            </View>
            <Text style={styles.statsTitle}>Your Progress</Text>
            <Text style={styles.statsMain}>
              {stats.unlocked}/{stats.total} Unlocked
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(stats.unlocked / stats.total) * 100}%` },
                ]}
              />
            </View>
            <View style={styles.coinsEarned}>
              <Text style={styles.coinsIcon}>🪙</Text>
              <Text style={styles.coinsText}>{stats.coinsEarned.toLocaleString()} coins earned</Text>
            </View>

            <TouchableOpacity style={styles.feedButton} onPress={handleViewFeed}>
              <MessageCircle color="#FFFFFF" size={18} />
              <Text style={styles.feedButtonText}>View Community Feed</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.categoriesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {CATEGORIES.map((cat) => {
              const IconComponent = cat.icon;
              const isSelected = selectedCategory === cat.id;
              const count = cat.id === 'all'
                ? achievementsWithProgress.length
                : achievementsWithProgress.filter(a => a.category === cat.id).length;

              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                  onPress={() => handleCategoryPress(cat.id)}
                >
                  <IconComponent
                    color={isSelected ? '#FFFFFF' : colors.textSecondary}
                    size={16}
                  />
                  <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                    {cat.label}
                  </Text>
                  <View style={[styles.categoryCount, isSelected && styles.categoryCountSelected]}>
                    <Text style={[styles.categoryCountText, isSelected && styles.categoryCountTextSelected]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.listContainer}>
          {filteredAchievements.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              onPress={() => handleShareAchievement(achievement)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  statsContainer: {
    alignItems: 'center',
  },
  trophyContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  statsMain: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  coinsEarned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  coinsIcon: {
    fontSize: 16,
  },
  coinsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  feedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
  },
  feedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoriesContainer: {
    marginTop: -15,
    marginBottom: 8,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryTextSelected: {
    color: '#FFFFFF',
  },
  categoryCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  categoryCountSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  categoryCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  categoryCountTextSelected: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
});
