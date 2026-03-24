import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, InteractionManager } from "react-native";

import { trpc, trpcClient } from "@/lib/trpc";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FinancialIncidentsProvider } from "@/contexts/FinancialIncidentsContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { UserProvider } from "@/contexts/UserContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { DeferredProviders } from "@/components/DeferredProviders";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function useProtectedRoute() {
  const auth = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const isAuthenticated = auth?.isAuthenticated ?? false;
  const isLoading = auth?.isLoading ?? true;

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === ('register' as string) || segments[0] === ('forgot-password' as string);

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/register' as any);
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments, router]);
}

function RootLayoutNav() {
  const theme = useTheme();
  useProtectedRoute();

  const colors = theme?.colors;
  const isDark = theme?.isDark ?? false;

  if (!colors) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#001F42" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: "transparentModal",
            headerShown: false,
            animation: "fade",
          }}
        />
        <Stack.Screen 
          name="course-detail" 
          options={{ 
            headerShown: true,
            title: "Course Details",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="section-detail" 
          options={{ 
            headerShown: true,
            title: "Section",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="ai-dispute-assistant" 
          options={{ 
            headerShown: true,
            title: "AI Dispute Assistant",
            headerBackTitle: "Back",
            presentation: "modal",
          }} 
        />
        <Stack.Screen 
          name="interactive-coach" 
          options={{ 
            headerShown: true,
            title: "AI Credit Coach",
            headerBackTitle: "Back",
            presentation: "modal",
          }} 
        />
        <Stack.Screen 
          name="lawsuit-assistant" 
          options={{ 
            headerShown: true,
            title: "Lawsuit Assistant",
            headerBackTitle: "Back",
            presentation: "modal",
          }} 
        />
        <Stack.Screen 
          name="dispute-tracker" 
          options={{ 
            headerShown: true,
            title: "Dispute Tracker",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="subscription-plans" 
          options={{ 
            headerShown: true,
            title: "Choose Your Plan",
            headerBackTitle: "Back",
            presentation: "modal",
          }} 
        />
        <Stack.Screen 
          name="personal-info" 
          options={{ 
            headerShown: true,
            title: "Personal Information",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="certificates" 
          options={{ 
            headerShown: true,
            title: "My Certificates",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="payment-methods" 
          options={{ 
            headerShown: true,
            title: "Payment Methods",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="notifications" 
          options={{ 
            headerShown: true,
            title: "Notifications",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="credit-tip" 
          options={{ 
            headerShown: true,
            title: "Credit Tip",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="register" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="forgot-password" 
          options={{ 
            headerShown: false,
          }} 
        />

        <Stack.Screen 
          name="game" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="home-browser" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="home-detail" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="home-editor" 
          options={{ 
            headerShown: false,
            gestureEnabled: false,
          }} 
        />
        <Stack.Screen 
          name="home-creation" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="home-visit" 
          options={{ 
            headerShown: false,
            gestureEnabled: false,
          }} 
        />
        <Stack.Screen 
          name="owner-profile" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="home-3d-environment" 
          options={{ 
            headerShown: false,
            animation: 'fade',
          }} 
        />
        <Stack.Screen 
          name="home-lobby" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="achievements" 
          options={{ 
            headerShown: true,
            title: "Achievements",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="leaderboards" 
          options={{ 
            headerShown: true,
            title: "Leaderboards",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="marketplace" 
          options={{ 
            headerShown: true,
            title: "Marketplace",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="challenges" 
          options={{ 
            headerShown: true,
            title: "Challenges",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="challenge-detail" 
          options={{ 
            headerShown: true,
            title: "Challenge Details",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="achievement-feed" 
          options={{ 
            headerShown: true,
            title: "Achievement Feed",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="business-competitions" 
          options={{ 
            headerShown: true,
            title: "Competitions",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="joint-ventures" 
          options={{ 
            headerShown: true,
            title: "Joint Ventures",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="terms-conditions" 
          options={{ 
            headerShown: true,
            title: "Terms & Conditions",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="privacy-policy" 
          options={{ 
            headerShown: true,
            title: "Privacy Policy",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="help-center" 
          options={{ 
            headerShown: true,
            title: "Help Center",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="beta-testing" 
          options={{ 
            headerShown: true,
            title: "Beta Testing",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="marketplace-performance" 
          options={{ 
            headerShown: true,
            title: "Marketplace Performance",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="moderation-queue" 
          options={{ 
            headerShown: true,
            title: "Moderation Queue",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="uat-feedback" 
          options={{ 
            headerShown: true,
            title: "UAT Feedback",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen 
          name="protected-document" 
          options={{ 
            headerShown: true,
            title: "Document",
            headerBackTitle: "Back",
          }} 
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      SplashScreen.hideAsync();
    });
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <UserProvider>
                  <FinancialIncidentsProvider>
                    <NotificationProvider>
                      <DeferredProviders>
                        <GestureHandlerRootView style={{ flex: 1 }}>
                          <RootLayoutNav />
                        </GestureHandlerRootView>
                      </DeferredProviders>
                    </NotificationProvider>
                  </FinancialIncidentsProvider>
                </UserProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </ThemeProvider>
        </trpc.Provider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
