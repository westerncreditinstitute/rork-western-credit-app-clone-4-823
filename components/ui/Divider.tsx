import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface DividerProps {
  text?: string;
  orientation?: 'horizontal' | 'vertical';
  spacing?: number;
  style?: ViewStyle;
}

export function Divider({
  text,
  orientation = 'horizontal',
  spacing = 16,
  style,
}: DividerProps) {
  const { colors } = useTheme();

  if (orientation === 'vertical') {
    return (
      <View
        style={[
          styles.vertical,
          {
            backgroundColor: colors.border,
            marginHorizontal: spacing,
          },
          style,
        ]}
      />
    );
  }

  if (text) {
    return (
      <View style={[styles.container, { marginVertical: spacing }, style]}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <Text style={[styles.text, { color: colors.textLight }]}>{text}</Text>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.horizontal,
        {
          backgroundColor: colors.border,
          marginVertical: spacing,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  horizontal: {
    height: 1,
    width: '100%',
  },
  vertical: {
    width: 1,
    height: '100%',
  },
  line: {
    flex: 1,
    height: 1,
  },
  text: {
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: '500' as const,
  },
});
