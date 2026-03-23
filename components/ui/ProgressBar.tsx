import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ProgressBarProps {
  progress: number;
  height?: number;
  showLabel?: boolean;
  labelPosition?: 'right' | 'top' | 'inside';
  variant?: 'default' | 'success' | 'warning' | 'gradient';
  animated?: boolean;
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  height = 8,
  showLabel = false,
  labelPosition = 'right',
  variant = 'default',
  animated = true,
  style,
}: ProgressBarProps) {
  const { colors } = useTheme();
  const animatedWidth = useRef(new Animated.Value(0)).current;

  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  useEffect(() => {
    if (animated) {
      Animated.spring(animatedWidth, {
        toValue: clampedProgress,
        useNativeDriver: false,
        friction: 10,
        tension: 40,
      }).start();
    } else {
      animatedWidth.setValue(clampedProgress);
    }
  }, [clampedProgress, animated, animatedWidth]);

  const getProgressColor = (): string => {
    switch (variant) {
      case 'success':
        return colors.success;
      case 'warning':
        return clampedProgress < 30 ? colors.error : clampedProgress < 70 ? colors.warning : colors.success;
      default:
        return colors.secondary;
    }
  };

  const width = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const progressColor = getProgressColor();

  const renderLabel = () => {
    if (!showLabel) return null;

    return (
      <Text
        style={[
          styles.label,
          {
            color: labelPosition === 'inside' ? colors.white : colors.textSecondary,
            fontSize: labelPosition === 'inside' ? 10 : 12,
          },
        ]}
      >
        {Math.round(clampedProgress)}%
      </Text>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {showLabel && labelPosition === 'top' && (
        <View style={styles.topLabelContainer}>{renderLabel()}</View>
      )}
      <View style={styles.row}>
        <View
          style={[
            styles.track,
            {
              height,
              backgroundColor: colors.surfaceAlt,
              borderRadius: height / 2,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.fill,
              {
                width,
                height,
                backgroundColor: progressColor,
                borderRadius: height / 2,
              },
            ]}
          >
            {showLabel && labelPosition === 'inside' && clampedProgress > 15 && (
              <View style={styles.insideLabelContainer}>{renderLabel()}</View>
            )}
          </Animated.View>
        </View>
        {showLabel && labelPosition === 'right' && (
          <View style={styles.rightLabelContainer}>{renderLabel()}</View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  track: {
    flex: 1,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
  },
  label: {
    fontWeight: '600' as const,
  },
  topLabelContainer: {
    marginBottom: 6,
    alignItems: 'flex-end',
  },
  rightLabelContainer: {
    marginLeft: 12,
    minWidth: 40,
    alignItems: 'flex-end',
  },
  insideLabelContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 8,
  },
});
