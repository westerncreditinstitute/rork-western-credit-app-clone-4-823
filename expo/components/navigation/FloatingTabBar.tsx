import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import {
  BadgeCheck,
  CircleUser,
  GraduationCap,
  Home,
  ShieldCheck,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/contexts/ThemeContext";

const ACTIVE_WEIGHT = "800" as const;
const INACTIVE_WEIGHT = "600" as const;

interface TabConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

/** Vivid per-tab accents tuned to read against the frosted navy bar. */
const TAB_CONFIG: Record<string, TabConfig> = {
  index: { label: "Home", color: "#10B981", icon: Home },
  courses: { label: "Courses", color: "#3B82F6", icon: GraduationCap },
  wallet: { label: "Wallet", color: "#06B6D4", icon: WalletCards },
  earnings: { label: "Earnings", color: "#F59E0B", icon: TrendingUp },
  "hire-pro": { label: "Hire Pro", color: "#8B5CF6", icon: BadgeCheck },
  profile: { label: "Profile", color: "#F43F5E", icon: CircleUser },
  admin: { label: "Admin", color: "#14B8A6", icon: ShieldCheck },
};

const FALLBACK: TabConfig = { label: "Tab", color: "#3B82F6", icon: Home };

interface TabItemProps {
  config: TabConfig;
  focused: boolean;
  inactiveColor: string;
  ringColor: string;
  badge?: string;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel: string;
  testID: string;
}

function TabItem({
  config,
  focused,
  inactiveColor,
  ringColor,
  badge,
  onPress,
  onLongPress,
  accessibilityLabel,
  testID,
}: TabItemProps) {
  const focusAnim = useRef<Animated.Value>(new Animated.Value(focused ? 1 : 0)).current;
  const pressAnim = useRef<Animated.Value>(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start();
  }, [focused, focusAnim]);

  const handlePressIn = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 300,
    }).start();
  }, [pressAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 5,
      tension: 220,
    }).start();
  }, [pressAnim]);

  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    onPress();
  }, [onPress]);

  const pressScale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.88],
  });
  const bubbleScale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });
  const haloScale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });
  const haloOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.85],
  });
  const iconLift = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -1.5],
  });

  const Icon = config.icon;
  const tint = focused ? config.color : inactiveColor;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.item}
    >
      <Animated.View style={[styles.itemInner, { transform: [{ scale: pressScale }] }]}>
        <View style={styles.iconWrap}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.halo,
              {
                backgroundColor: `${config.color}1A`,
                opacity: haloOpacity,
                transform: [{ scale: haloScale }],
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.bubble,
              {
                backgroundColor: `${config.color}2B`,
                borderColor: `${config.color}59`,
                opacity: focusAnim,
                transform: [{ scale: bubbleScale }],
              },
            ]}
          />
          <Animated.View style={{ transform: [{ translateY: iconLift }] }}>
            <Icon
              size={20}
              color={tint}
              strokeWidth={focused ? 2.4 : 2}
              fill={focused ? `${config.color}40` : "transparent"}
            />
          </Animated.View>

          {badge ? (
            <View style={[styles.badge, { borderColor: ringColor }]}>
              <Text style={styles.badgeText} numberOfLines={1}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          numberOfLines={1}
          style={[
            styles.label,
            { color: tint, fontWeight: focused ? ACTIVE_WEIGHT : INACTIVE_WEIGHT },
          ]}
        >
          {config.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const MemoTabItem = React.memo(TabItem);

/**
 * Floating, frosted pill tab bar with per-tab accent colors and an animated
 * glow bubble behind the selected destination.
 */
export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const surfaceTint = isDark ? "rgba(11, 18, 32, 0.82)" : "rgba(255, 255, 255, 0.76)";
  const borderTint = isDark ? "rgba(148, 163, 184, 0.18)" : "rgba(0, 43, 92, 0.10)";
  const inactiveColor = isDark ? "#64748B" : "#94A3B8";
  const ringColor = isDark ? "#0B1220" : "#FFFFFF";

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom, 10), backgroundColor: colors.background },
      ]}
    >
      <View
        style={[
          styles.shadowLayer,
          {
            shadowColor: isDark ? "#000000" : "#002B5C",
            shadowOpacity: isDark ? 0.5 : 0.16,
          },
        ]}
      >
        <View style={[styles.pill, { borderColor: borderTint }]}>
          <BlurView
            intensity={Platform.OS === "android" ? 24 : 60}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: surfaceTint }]} />

          <View style={styles.row}>
            {state.routes.map((route, index) => {
              const descriptor = descriptors[route.key];
              const options = descriptor?.options;
              const config = TAB_CONFIG[route.name] ?? {
                ...FALLBACK,
                label: options?.title ?? route.name,
              };
              const focused = state.index === index;
              const rawBadge = options?.tabBarBadge;
              const badge =
                rawBadge === undefined || rawBadge === null || rawBadge === ""
                  ? undefined
                  : typeof rawBadge === "number"
                    ? rawBadge > 9
                      ? "9+"
                      : String(rawBadge)
                    : String(rawBadge);

              const onPress = () => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              const onLongPress = () => {
                navigation.emit({ type: "tabLongPress", target: route.key });
              };

              return (
                <MemoTabItem
                  key={route.key}
                  config={config}
                  focused={focused}
                  inactiveColor={inactiveColor}
                  ringColor={ringColor}
                  badge={badge}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  accessibilityLabel={options?.tabBarAccessibilityLabel ?? config.label}
                  testID={`tab-${route.name}`}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  shadowLayer: {
    borderRadius: 26,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 14,
  },
  pill: {
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  itemInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 42,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  bubble: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  label: {
    fontSize: 9.5,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: 1,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 12,
  },
});
