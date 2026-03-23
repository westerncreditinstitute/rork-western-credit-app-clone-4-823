import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  style?: ViewStyle;
  compact?: boolean;
}

export function StatCard({
  label,
  value,
  change,
  trend,
  icon,
  style,
  compact = false,
}: StatCardProps) {
  const { colors } = useTheme();

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return colors.success;
      case 'down':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.surface }, style]}>
        {icon && (
          <View style={[styles.compactIcon, { backgroundColor: colors.surfaceAlt }]}>
            {icon}
          </View>
        )}
        <View style={styles.compactContent}>
          <Text style={[styles.compactValue, { color: colors.text }]}>{value}</Text>
          <Text style={[styles.compactLabel, { color: colors.textSecondary }]}>{label}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, style]}>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: colors.surfaceAlt }]}>
            {icon}
          </View>
        )}
        {change && trend && (
          <View style={[styles.trendBadge, { backgroundColor: getTrendColor() + '15' }]}>
            <TrendIcon size={12} color={getTrendColor()} />
            <Text style={[styles.trendText, { color: getTrendColor() }]}>{change}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  value: {
    fontSize: 28,
    fontWeight: '800' as const,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  compactIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
  },
  compactValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  compactLabel: {
    fontSize: 12,
  },
});
