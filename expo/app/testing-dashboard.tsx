import React from "react";
import { View, StyleSheet, useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { useTheme } from "@react-navigation/native";
import { EnhancedTestingDashboard } from "@/components/EnhancedTestingDashboard";
import Colors from "@/constants/colors";

export default function TestingDashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = useTheme().colors as any;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Testing Dashboard",
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTitleStyle: {
            color: colors.text,
          },
          headerTintColor: colors.text,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EnhancedTestingDashboard />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
  },
});
