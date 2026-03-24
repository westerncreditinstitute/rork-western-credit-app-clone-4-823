import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({
  text,
  variant = 'default',
  size = 'md',
  icon,
  style,
  textStyle,
}: BadgeProps) {
  const { colors } = useTheme();

  const sizeStyles: Record<BadgeSize, { paddingVertical: number; paddingHorizontal: number; fontSize: number; iconSize: number }> = {
    sm: { paddingVertical: 2, paddingHorizontal: 6, fontSize: 10, iconSize: 10 },
    md: { paddingVertical: 4, paddingHorizontal: 10, fontSize: 11, iconSize: 12 },
    lg: { paddingVertical: 6, paddingHorizontal: 14, fontSize: 13, iconSize: 14 },
  };

  const getVariantColors = (): { bg: string; text: string } => {
    switch (variant) {
      case 'success':
        return { bg: colors.success + '20', text: colors.success };
      case 'warning':
        return { bg: colors.warning + '20', text: colors.warning };
      case 'error':
        return { bg: colors.error + '20', text: colors.error };
      case 'info':
        return { bg: colors.info + '20', text: colors.info };
      case 'primary':
        return { bg: colors.primary + '20', text: colors.primary };
      case 'secondary':
        return { bg: colors.secondary + '20', text: colors.secondary };
      default:
        return { bg: colors.surfaceAlt, text: colors.textSecondary };
    }
  };

  const variantColors = getVariantColors();
  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: variantColors.bg,
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
        },
        style,
      ]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text
        style={[
          styles.text,
          {
            color: variantColors.text,
            fontSize: currentSize.fontSize,
          },
          textStyle,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  iconContainer: {
    marginRight: 4,
  },
});
