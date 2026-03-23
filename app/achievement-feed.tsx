import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Sparkles } from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useChallenges } from '@/contexts/ChallengeContext';
import AchievementShareCard from '@/components/community/AchievementShareCard';

export default function AchievementFeedScreen() {
  const { colors, isDark } = useTheme();
  const {
    achievementFeed,
    isLoadingAchievementFeed,
    refreshAchievementFeed,
    likeShare,
    isLikingShare,
    congratulate,
    isCongratulating,
  } = useChallenges();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    refreshAchievementFeed();
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, [refreshAchievementFeed]);

  const handleLike = useCallback(async (shareId: string) => {
    try {
      await likeShare(shareId);
    } catch (error) {
      console.error('[AchievementFeed] Error liking share:', error);
    }
  }, [likeShare]);

  const handleCongratulate = useCallback(async (shareId: string, message: string, emoji?: string) => {
    try {
      await congratulate({ shareId, message, emoji });
    } catch (error) {
      console.error('[AchievementFeed] Error congratulating:', error);
    }
  }, [congratulate]);

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Achievement Feed',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <LinearGradient
          colors={isDark ? ['#7C3AED', '#4F46E5'] : ['#8B5CF6', '#6366F1']}
          style={styles.header}
        >
          <Sparkles color="#FFD700" size={40} />
          <Text style={styles.headerTitle}>Community Achievements</Text>
          <Text style={styles.headerSubtitle}>
            Celebrate your friends' accomplishments and share your own!
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          {isLoadingAchievementFeed ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading achievements...</Text>
            </View>
          ) : achievementFeed.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Trophy color={colors.textLight} size={48} />
              <Text style={styles.emptyTitle}>No Achievements Yet</Text>
              <Text style={styles.emptyText}>
                Be the first to share an achievement with the community
              </Text>
            </View>
          ) : (
            achievementFeed.map((share) => (
              <AchievementShareCard
                key={share.id}
                share={share}
                onLike={handleLike}
                onCongratulate={handleCongratulate}
                isLiking={isLikingShare}
                isCongratulating={isCongratulating}
              />
            ))
          )}
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
  header: {
    padding: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
