import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  source?: string;
  name?: string;
  size?: AvatarSize;
  showBorder?: boolean;
  borderColor?: string;
  style?: ViewStyle;
}

export function Avatar({
  source,
  name,
  size = 'md',
  showBorder = false,
  borderColor,
  style,
}: AvatarProps) {
  const { colors } = useTheme();

  const sizeValues: Record<AvatarSize, { container: number; fontSize: number; borderWidth: number }> = {
    xs: { container: 28, fontSize: 10, borderWidth: 1 },
    sm: { container: 36, fontSize: 12, borderWidth: 1.5 },
    md: { container: 48, fontSize: 16, borderWidth: 2 },
    lg: { container: 64, fontSize: 20, borderWidth: 2.5 },
    xl: { container: 96, fontSize: 28, borderWidth: 3 },
  };

  const currentSize = sizeValues[size];

  const getInitials = (fullName: string): string => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0]?.substring(0, 2).toUpperCase() || '?';
  };

  const containerStyle: ViewStyle = {
    width: currentSize.container,
    height: currentSize.container,
    borderRadius: currentSize.container / 2,
    ...(showBorder && {
      borderWidth: currentSize.borderWidth,
      borderColor: borderColor || colors.primary,
    }),
  };

  const imageContainerStyle: ImageStyle = {
    width: currentSize.container,
    height: currentSize.container,
    borderRadius: currentSize.container / 2,
    ...(showBorder && {
      borderWidth: currentSize.borderWidth,
      borderColor: borderColor || colors.primary,
    }),
  };

  if (source) {
    return (
      <Image
        source={{ uri: source }}
        style={[styles.image, imageContainerStyle, style as ImageStyle]}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        containerStyle,
        { backgroundColor: colors.primary },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize: currentSize.fontSize }]}>
        {name ? getInitials(name) : '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
});
