import { memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAchievementsData } from '@/hooks/useGameSelectors';
import { formatCurrency } from '@/utils/creditEngine';
import { Achievement } from '@/types/game';

const CATEGORIES = [
  { id: 'credit', label: 'Credit Score', color: '#3B82F6' },
  { id: 'career', label: 'Career', color: '#10B981' },
  { id: 'savings', label: 'Savings', color: '#F59E0B' },
  { id: 'property', label: 'Property', color: '#8B5CF6' },
  { id: 'milestones', label: 'Milestones', color: '#EC4899' },
] as const;

interface AchievementCardProps {
  achievement: Achievement;
  isUnlocked: boolean;
  colors: {
    surface: string;
    surfaceAlt: string;
    text: string;
    textSecondary: string;
    textLight: string;
  };
}

const AchievementCard = memo(function AchievementCard({ achievement, isUnlocked, colors }: AchievementCardProps) {
  return (
    <View
      style={[
        styles.achievementCard,
        {
          backgroundColor: colors.surface,
          opacity: isUnlocked ? 1 : 0.6,
        }
      ]}
    >
      <View style={[
        styles.achievementIcon,
        { backgroundColor: isUnlocked ? '#10B98120' : colors.surfaceAlt }
      ]}>
        {isUnlocked ? (
          <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
        ) : (
          <Lock size={24} color={colors.textLight} />
        )}
      </View>
      
      <View style={styles.achievementInfo}>
        <Text style={[styles.achievementTitle, { color: colors.text }]}>
          {achievement.title}
        </Text>
        <Text style={[styles.achievementDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {achievement.description}
        </Text>
        {achievement.reward && (
          <View style={styles.rewardContainer}>
            <Text style={[styles.rewardText, { color: '#10B981' }]}>
              Reward: {formatCurrency(achievement.reward.amount)}
            </Text>
          </View>
        )}
      </View>
      
      {isUnlocked && (
        <CheckCircle size={24} color="#10B981" />
      )}
    </View>
  );
});

interface CategorySectionProps {
  category: typeof CATEGORIES[number];
  achievements: Achievement[];
  unlockedCount: number;
  isUnlocked: (id: string) => boolean;
  colors: {
    surface: string;
    surfaceAlt: string;
    text: string;
    textSecondary: string;
    textLight: string;
  };
}

const CategorySection = memo(function CategorySection({ 
  category, 
  achievements, 
  unlockedCount, 
  isUnlocked, 
  colors 
}: CategorySectionProps) {
  if (achievements.length === 0) return null;
  
  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
        <Text style={[styles.categoryTitle, { color: colors.text }]}>
          {category.label}
        </Text>
        <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>
          {unlockedCount}/{achievements.length}
        </Text>
      </View>
      
      <View style={styles.achievementsList}>
        {achievements.map((achievement) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            isUnlocked={isUnlocked(achievement.id)}
            colors={colors}
          />
        ))}
      </View>
    </View>
  );
});

export default function AchievementsScreen() {
  const { colors } = useTheme();
  const { 
    unlockedCount, 
    totalCount, 
    progress, 
    isUnlocked, 
    categorizedAchievements, 
    categoryStats 
  } = useAchievementsData();

  const colorsForCards = useMemo(() => ({
    surface: colors.surface,
    surfaceAlt: colors.surfaceAlt,
    text: colors.text,
    textSecondary: colors.textSecondary,
    textLight: colors.textLight,
  }), [colors.surface, colors.surfaceAlt, colors.text, colors.textSecondary, colors.textLight]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>Achievement Progress</Text>
            <Text style={[styles.progressCount, { color: colors.primary }]}>
              {unlockedCount}/{totalCount}
            </Text>
          </View>
          
          <View style={[styles.progressBar, { backgroundColor: colors.surfaceAlt }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%`, backgroundColor: colors.primary }
              ]}
            />
          </View>
          
          <Text style={[styles.progressPercent, { color: colors.textSecondary }]}>
            {progress.toFixed(0)}% Complete
          </Text>
        </View>

        {CATEGORIES.map((category) => {
          const categoryAchievements = categorizedAchievements[category.id] || [];
          const stats = categoryStats[category.id] || { total: 0, unlocked: 0 };
          
          return (
            <CategorySection
              key={category.id}
              category={category}
              achievements={categoryAchievements}
              unlockedCount={stats.unlocked}
              isUnlocked={isUnlocked}
              colors={colorsForCards}
            />
          );
        })}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressCard: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressCount: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressPercent: {
    fontSize: 13,
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  categoryCount: {
    fontSize: 14,
  },
  achievementsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementEmoji: {
    fontSize: 28,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  rewardContainer: {
    marginTop: 6,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});
