import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LeaderboardEntry } from '@/types/communityHomes';
import { formatCompactNumber } from '@/types/communityHomes';

interface LeaderboardCardProps {
  entry: LeaderboardEntry;
  onPress?: () => void;
}

export default function LeaderboardCard({ entry, onPress }: LeaderboardCardProps) {
  const { colors, isDark } = useTheme();

  const getRankStyle = () => {
    switch (entry.rank) {
      case 1:
        return { bg: '#FFD700', text: '#1A1A1A' };
      case 2:
        return { bg: '#C0C0C0', text: '#1A1A1A' };
      case 3:
        return { bg: '#CD7F32', text: '#FFFFFF' };
      default:
        return { bg: colors.surfaceAlt, text: colors.text };
    }
  };

  const rankStyle = getRankStyle();
  const styles = createStyles(colors, isDark);

  return (
    <TouchableOpacity
      style={[styles.container, entry.isCurrentUser && styles.containerHighlight]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.rankBadge, { backgroundColor: rankStyle.bg }]}>
        <Text style={[styles.rankText, { color: rankStyle.text }]}>
          {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
        </Text>
      </View>

      <Image source={{ uri: entry.avatar }} style={styles.avatar} contentFit="cover" transition={150} cachePolicy="memory-disk" />

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{entry.name}</Text>
        <Text style={styles.score}>{formatCompactNumber(entry.score)} pts</Text>
      </View>

      <View style={styles.changeContainer}>
        {entry.change > 0 ? (
          <>
            <TrendingUp color="#22C55E" size={14} />
            <Text style={[styles.changeText, styles.changeUp]}>+{entry.change}</Text>
          </>
        ) : entry.change < 0 ? (
          <>
            <TrendingDown color="#EF4444" size={14} />
            <Text style={[styles.changeText, styles.changeDown]}>{entry.change}</Text>
          </>
        ) : (
          <>
            <Minus color={colors.textLight} size={14} />
            <Text style={[styles.changeText, styles.changeNeutral]}>0</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  containerHighlight: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '800',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  score: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  changeUp: {
    color: '#22C55E',
  },
  changeDown: {
    color: '#EF4444',
  },
  changeNeutral: {
    color: colors.textLight,
  },
});
