import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';

interface NotificationBadgeProps {
  size?: number;
  iconSize?: number;
  onPress?: () => void;
  showBell?: boolean;
  style?: object;
}

export function NotificationBadge({
  size = 40,
  iconSize = 24,
  onPress,
  showBell = true,
  style,
}: NotificationBadgeProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { unreadCount, newNotification, clearNewNotification } = useNotifications();
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (newNotification) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -5,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 5,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: -3,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
      ]).start();

      const timeout = setTimeout(() => {
        clearNewNotification();
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [newNotification, scaleAnim, bounceAnim, clearNewNotification]);

  const handlePress = () => {
    Haptics.selectionAsync();
    if (onPress) {
      onPress();
    } else {
      router.push('/game/notification-center' as any);
    }
  };

  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();

  const styles = createStyles(colors, size);

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {showBell && (
        <Animated.View style={{ transform: [{ translateX: bounceAnim }] }}>
          <Bell color={colors.text} size={iconSize} />
        </Animated.View>
      )}
      
      {unreadCount > 0 && (
        <Animated.View
          style={[
            styles.badge,
            {
              transform: [{ scale: scaleAnim }],
              minWidth: unreadCount > 9 ? 22 : 18,
            },
          ]}
        >
          <Text style={styles.badgeText}>{displayCount}</Text>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
}

interface NotificationDotProps {
  visible?: boolean;
  size?: number;
  color?: string;
  style?: object;
}

export function NotificationDot({
  visible = true,
  size = 10,
  color,
  style,
}: NotificationDotProps) {
  const { colors } = useTheme();
  const { unreadCount } = useNotifications();

  const isVisible = visible && unreadCount > 0;

  if (!isVisible) return null;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color || colors.error,
        },
        style,
      ]}
    />
  );
}

interface NotificationCountProps {
  style?: object;
  textStyle?: object;
}

export function NotificationCount({ style, textStyle }: NotificationCountProps) {
  const { colors } = useTheme();
  const { unreadCount } = useNotifications();

  if (unreadCount === 0) return null;

  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();

  return (
    <View
      style={[
        {
          backgroundColor: colors.error,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 12,
          minWidth: 24,
          alignItems: 'center',
        },
        style,
      ]}
    >
      <Text
        style={[
          {
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: '600',
          },
          textStyle,
        ]}
      >
        {displayCount}
      </Text>
    </View>
  );
}

const createStyles = (colors: any, size: number) =>
  StyleSheet.create({
    container: {
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: colors.error,
      borderRadius: 10,
      paddingHorizontal: 5,
      paddingVertical: 2,
      minWidth: 18,
      height: 18,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700' as const,
      textAlign: 'center',
    },
  });

export default NotificationBadge;
