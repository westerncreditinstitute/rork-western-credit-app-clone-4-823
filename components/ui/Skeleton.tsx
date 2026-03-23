import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  variant?: 'text' | 'circular' | 'rectangular';
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
  variant = 'rectangular',
}: SkeletonProps) {
  const { colors } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'circular':
        return {
          borderRadius: typeof height === 'number' ? height / 2 : 50,
        };
      case 'text':
        return {
          borderRadius: 4,
        };
      default:
        return {
          borderRadius,
        };
    }
  };

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: colors.border,
          opacity,
        },
        getVariantStyles(),
        style,
      ]}
    />
  );
}

interface SkeletonGroupProps {
  count?: number;
  gap?: number;
  children?: React.ReactNode;
}

export function SkeletonGroup({ count = 3, gap = 12, children }: SkeletonGroupProps) {
  if (children) {
    return <View style={{ gap }}>{children}</View>;
  }

  return (
    <View style={{ gap }}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} />
      ))}
    </View>
  );
}

export function SkeletonCard() {
  const { colors } = useTheme();

  return (
    <View style={[skeletonCardStyles.container, { backgroundColor: colors.surface }]}>
      <Skeleton height={160} borderRadius={16} style={skeletonCardStyles.image} />
      <View style={skeletonCardStyles.content}>
        <Skeleton width={80} height={20} />
        <Skeleton height={20} style={skeletonCardStyles.title} />
        <Skeleton height={14} width="70%" />
        <View style={skeletonCardStyles.meta}>
          <Skeleton width={60} height={14} />
          <Skeleton width={80} height={14} />
        </View>
      </View>
    </View>
  );
}



const skeletonCardStyles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  image: {
    marginBottom: 0,
  },
  content: {
    padding: 16,
    gap: 8,
  },
  title: {
    marginVertical: 4,
  },
  meta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
});
