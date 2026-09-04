import { Tabs } from "expo-router";
import React from "react";
import { Image, StyleSheet } from "react-native";

import FloatingTabBar from "@/components/navigation/FloatingTabBar";
import { useNotifications } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const { unreadCount } = useNotifications();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerTitle: () => (
          <Image
            source={{
              uri: isDark
                ? "https://static.wixstatic.com/media/ec0146_ce8d0d3506564ee1841686216fee5650~mv2.png"
                : "https://static.wixstatic.com/media/ec0146_03bf3620526242a79ca153151cb09d7d~mv2.png",
            }}
            style={styles.logo}
            resizeMode="contain"
          />
        ),
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerShadowVisible: false,
        sceneStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen name="courses" options={{ title: "Courses" }} />

      {/* "My Agent" — the AI Credit Repair Agent, a primary destination. */}
      <Tabs.Screen
        name="my-agent"
        options={{ title: "My Agent", headerShown: false }}
      />

      {/* Wallet, Earnings, Hire Pro and Admin remain routable but are reached
          through the "More" tab so the bar stays readable on small screens. */}
      <Tabs.Screen name="wallet" options={{ href: null }} />
      <Tabs.Screen name="earnings" options={{ href: null }} />
      <Tabs.Screen name="hire-pro" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="admin" options={{ href: null }} />

      {/* "More" — hosts Wallet, Earnings, Hire Pro, Admin and credit tools. */}
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 160,
    height: 44,
  },
});
