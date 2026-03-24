import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Animated,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  const sizeStyles: Record<string, { paddingVertical: number; paddingHorizontal: number; fontSize: number; borderRadius: number }> = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 13, borderRadius: 10 },
    md: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 15, borderRadius: 12 },
    lg: { paddingVertical: 18, paddingHorizontal: 32, fontSize: 17, borderRadius: 14 },
  };

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    const baseOpacity = disabled ? 0.5 : 1;

    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: colors.primary,
            opacity: baseOpacity,
          },
          text: { color: colors.white },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: colors.secondary,
            opacity: baseOpacity,
          },
          text: { color: colors.white },
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: colors.primary,
            opacity: baseOpacity,
          },
          text: { color: colors.primary },
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: colors.surfaceAlt,
            opacity: baseOpacity,
          },
          text: { color: colors.text },
        };
      case 'danger':
        return {
          container: {
            backgroundColor: colors.error,
            opacity: baseOpacity,
          },
          text: { color: colors.white },
        };
      default:
        return {
          container: { backgroundColor: colors.primary },
          text: { color: colors.white },
        };
    }
  };

  const variantStyles = getVariantStyles();
  const currentSizeStyles = sizeStyles[size];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width: fullWidth ? '100%' : 'auto' }}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            paddingVertical: currentSizeStyles.paddingVertical,
            paddingHorizontal: currentSizeStyles.paddingHorizontal,
            borderRadius: currentSizeStyles.borderRadius,
          },
          variantStyles.container,
          fullWidth && styles.fullWidth,
          style,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
        testID={testID}
      >
        {loading ? (
          <ActivityIndicator color={variantStyles.text.color} size="small" />
        ) : (
          <View style={styles.content}>
            {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
            <Text
              style={[
                styles.text,
                { fontSize: currentSizeStyles.fontSize },
                variantStyles.text,
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
