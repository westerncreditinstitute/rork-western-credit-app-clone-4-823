import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Trophy,
  Crown,
  ShoppingBag,
  Bell,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';

interface QuickAction {
  id: string;
  label: string;
  icon: any;
  route: string;
  color: string;
  badge?: number;
}

interface CommunityQuickActionsProps {
  unreadNotifications?: number;
}

export default function CommunityQuickActions({ unreadNotifications = 0 }: CommunityQuickActionsProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const actions: QuickAction[] = [
    {
      id: 'achievements',
      label: 'Achievements',
      icon: Trophy,
      route: '/achievements',
      color: '#F59E0B',
    },
    {
      id: 'leaderboards',
      label: 'Leaderboards',
      icon: Crown,
      route: '/leaderboards',
      color: '#8B5CF6',
    },
    {
      id: 'marketplace',
      label: 'Marketplace',
      icon: ShoppingBag,
      route: '/marketplace',
      color: '#14B8A6',
    },
    {
      id: 'notifications',
      label: 'Alerts',
      icon: Bell,
      route: '/notifications',
      color: '#EF4444',
      badge: unreadNotifications,
    },
  ];

  const handleActionPress = (action: QuickAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(action.route as any);
  };

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {actions.map((action) => {
          const IconComponent = action.icon;
          return (
            <TouchableOpacity
              key={action.id}
              style={styles.actionButton}
              onPress={() => handleActionPress(action)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: action.color + '20' }]}>
                <IconComponent color={action.color} size={22} />
                {action.badge && action.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {action.badge > 9 ? '9+' : action.badge}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  actionButton: {
    alignItems: 'center',
    width: 72,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
