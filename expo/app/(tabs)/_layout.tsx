import { Tabs } from "expo-router";
import { Home, BookOpen, DollarSign, User, Settings, UserCheck, Wallet } from "lucide-react-native";
import React from "react";
import { Image, StyleSheet, View, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/contexts/ThemeContext";

const TAB_COLORS = {
  home: { active: '#FF6B6B', inactive: '#9CA3AF' },
  courses: { active: '#4ECDC4', inactive: '#9CA3AF' },
  wallet: { active: '#45B7D1', inactive: '#9CA3AF' },
  earnings: { active: '#96CEB4', inactive: '#9CA3AF' },
  hirePro: { active: '#DDA0DD', inactive: '#9CA3AF' },
  profile: { active: '#FFB347', inactive: '#9CA3AF' },
  admin: { active: '#87CEEB', inactive: '#9CA3AF' },
};
export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        headerShown: true,
        headerTitle: () => (
          <Image
            source={{ 
              uri: isDark 
                ? "https://static.wixstatic.com/media/ec0146_ce8d0d3506564ee1841686216fee5650~mv2.png"
                : "https://static.wixstatic.com/media/ec0146_03bf3620526242a79ca153151cb09d7d~mv2.png"
            }}
            style={styles.logo}
            resizeMode="contain"
          />
        ),
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerShadowVisible: false,
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} />
          )
        ),
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 88 : 72,
          position: Platform.OS === 'ios' ? 'absolute' : 'relative',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600" as const,
          marginTop: 4,
          marginBottom: Platform.OS === 'ios' ? 0 : 8,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, size }) => (
            <Home 
              color={focused ? TAB_COLORS.home.active : TAB_COLORS.home.inactive} 
              size={size - 2} 
              strokeWidth={2.5} 
              fill={focused ? TAB_COLORS.home.active + '20' : 'transparent'}
            />
          ),
          tabBarActiveTintColor: TAB_COLORS.home.active,
        }}
      />

      <Tabs.Screen
        name="courses"
        options={{
          title: "Courses",
          tabBarIcon: ({ focused, size }) => (
            <BookOpen 
              color={focused ? TAB_COLORS.courses.active : TAB_COLORS.courses.inactive} 
              size={size - 2} 
              strokeWidth={2.5}
              fill={focused ? TAB_COLORS.courses.active + '20' : 'transparent'}
            />
          ),
          tabBarActiveTintColor: TAB_COLORS.courses.active,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          tabBarIcon: ({ focused, size }) => (
            <Wallet 
              color={focused ? TAB_COLORS.wallet.active : TAB_COLORS.wallet.inactive} 
              size={size - 2} 
              strokeWidth={2.5}
              fill={focused ? TAB_COLORS.wallet.active + '20' : 'transparent'}
            />
          ),
          tabBarActiveTintColor: TAB_COLORS.wallet.active,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          tabBarIcon: ({ focused, size }) => (
            <DollarSign 
              color={focused ? TAB_COLORS.earnings.active : TAB_COLORS.earnings.inactive} 
              size={size - 2} 
              strokeWidth={2.5}
            />
          ),
          tabBarActiveTintColor: TAB_COLORS.earnings.active,
        }}
      />
      <Tabs.Screen
        name="hire-pro"
        options={{
          title: "Hire Pro",
          tabBarIcon: ({ focused, size }) => (
            <UserCheck 
              color={focused ? TAB_COLORS.hirePro.active : TAB_COLORS.hirePro.inactive} 
              size={size - 2} 
              strokeWidth={2.5}
            />
          ),
          tabBarActiveTintColor: TAB_COLORS.hirePro.active,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, size }) => (
            <User 
              color={focused ? TAB_COLORS.profile.active : TAB_COLORS.profile.inactive} 
              size={size - 2} 
              strokeWidth={2.5}
              fill={focused ? TAB_COLORS.profile.active + '20' : 'transparent'}
            />
          ),
          tabBarActiveTintColor: TAB_COLORS.profile.active,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          tabBarIcon: ({ focused, size }) => (
            <Settings 
              color={focused ? TAB_COLORS.admin.active : TAB_COLORS.admin.inactive} 
              size={size - 2} 
              strokeWidth={2.5}
            />
          ),
          tabBarActiveTintColor: TAB_COLORS.admin.active,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 160,
    height: 44,
  },
});
