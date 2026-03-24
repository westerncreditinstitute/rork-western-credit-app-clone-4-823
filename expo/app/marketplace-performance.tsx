import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import MarketplaceLoadTestDashboard from '@/components/MarketplaceLoadTestDashboard';

export default function MarketplacePerformanceScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Performance Testing',
          headerStyle: { backgroundColor: '#0F172A' },
          headerTintColor: '#FFF',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />
      <MarketplaceLoadTestDashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});
