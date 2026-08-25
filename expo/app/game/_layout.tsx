import { Stack, useRouter } from 'expo-router';
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Gamepad2, Clock, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { BudgetProvider } from '@/contexts/BudgetContext';
import { EducationProvider } from '@/contexts/EducationContext';
import { RealEstateProvider } from '@/contexts/RealEstateContext';
import { MultiplayerProvider } from '@/contexts/MultiplayerContext';
import { FriendProvider } from '@/contexts/FriendContext';
import { PartnershipProvider } from '@/contexts/PartnershipContext';
import { MapProvider } from '@/contexts/MapContext';
import { AIAgentProvider } from '@/contexts/AIAgentContext';
import { SocialFeedProvider } from '@/contexts/SocialFeedContext';
import { ScavengerHuntProvider } from '@/contexts/ScavengerHuntContext';
import { City3DProvider } from '@/contexts/City3DContext';

const GameProviders = memo(function GameProviders({ children }: { children: React.ReactNode }) {
  return (
    <BudgetProvider>
      <EducationProvider>
        <RealEstateProvider>
          <MultiplayerProvider>
            <FriendProvider>
              <PartnershipProvider>
                <MapProvider>
                  <SocialFeedProvider>
                    <AIAgentProvider>
                      <ScavengerHuntProvider>
                        <City3DProvider>
                          {children}
                        </City3DProvider>
                      </ScavengerHuntProvider>
                    </AIAgentProvider>
                  </SocialFeedProvider>
                </MapProvider>
              </PartnershipProvider>
            </FriendProvider>
          </MultiplayerProvider>
        </RealEstateProvider>
      </EducationProvider>
    </BudgetProvider>
  );
});

export default function GameLayout() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  // Credit Life Simulator is in early access — administrators only for now.
  if (!isAdmin) {
    return (
      <View style={[styles.comingSoonContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
          <ChevronLeft color={colors.primary} size={20} />
        </TouchableOpacity>
        <View style={[styles.comingSoonIconWrap, { backgroundColor: colors.surface }]}>
          <Gamepad2 color={colors.primary} size={40} />
        </View>
        <View style={styles.comingSoonBadge}>
          <Clock color={colors.warning} size={14} />
          <Text style={[styles.comingSoonBadgeText, { color: colors.warning }]}>COMING SOON</Text>
        </View>
        <Text style={[styles.comingSoonTitle, { color: colors.text }]}>Credit Life Simulator</Text>
        <Text style={[styles.comingSoonMessage, { color: colors.textLight }]}>
          The Credit Life Simulator is currently in early access and available to administrators only. It will open to everyone in a future update.
        </Text>
      </View>
    );
  }

  return (
    <GameProviders>
      <Stack
        screenOptions={{
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
        <Stack.Screen name="index" options={{ title: 'Credit Life Simulator' }} />
        <Stack.Screen name="career" options={{ title: 'Career Center' }} />
        <Stack.Screen name="bank" options={{ title: 'Financial Center' }} />
        <Stack.Screen name="budget" options={{ title: 'Budget Manager' }} />
        <Stack.Screen name="achievements" options={{ title: 'Achievements' }} />
        <Stack.Screen name="credit-details" options={{ title: 'Credit Details' }} />
        <Stack.Screen name="token-wallet" options={{ title: 'MUSO Token Wallet' }} />
        <Stack.Screen name="community" options={{ title: 'Community' }} />
        <Stack.Screen name="friends" options={{ title: 'Friends' }} />
        <Stack.Screen name="guilds" options={{ title: 'Guilds' }} />
        <Stack.Screen name="tournaments" options={{ title: 'Tournaments' }} />
        <Stack.Screen name="events" options={{ title: 'Events & Challenges' }} />
        <Stack.Screen name="chat" options={{ title: 'Chat' }} />
        <Stack.Screen name="mentorship" options={{ title: 'Mentorship' }} />
        <Stack.Screen name="education" options={{ title: 'Education Center' }} />
        <Stack.Screen name="home-browser" options={{ title: 'Visit Homes' }} />
        <Stack.Screen name="community-homes" options={{ title: 'Community Homes' }} />
        <Stack.Screen name="home-editor" options={{ title: 'Decorate Home' }} />
        <Stack.Screen name="home-creation" options={{ title: 'Create Home', headerShown: false }} />
        <Stack.Screen name="real-estate" options={{ title: 'Real Estate' }} />
        <Stack.Screen name="property-detail" options={{ title: 'Property Details' }} />
        <Stack.Screen name="property-portfolio" options={{ title: 'My Portfolio' }} />
        <Stack.Screen name="start-business" options={{ title: 'Start A Business' }} />
        <Stack.Screen name="business-dashboard" options={{ title: 'My Businesses' }} />
        <Stack.Screen name="financial-incidents" options={{ title: 'Financial Incidents' }} />
        <Stack.Screen name="incident-detail" options={{ title: 'Incident Details' }} />
        <Stack.Screen name="investment-pools" options={{ title: 'Investment Pools' }} />
        <Stack.Screen name="pool-detail" options={{ title: 'Pool Details' }} />
        <Stack.Screen name="partnerships" options={{ title: 'Partnerships' }} />
        <Stack.Screen name="map" options={{ title: 'Property Map' }} />
        <Stack.Screen name="go-virtual" options={{ title: 'Go Virtual', headerShown: false }} />
        <Stack.Screen name="run-simulator" options={{ title: 'Run Simulator' }} />
        <Stack.Screen name="social-feed" options={{ title: 'Social Feed', headerShown: false }} />
        <Stack.Screen name="agent-discovery" options={{ title: 'Discover Agents', headerShown: false }} />
        <Stack.Screen name="live-feed" options={{ title: 'Live Feed', headerShown: false }} />
        <Stack.Screen name="scavenger-hunt" options={{ title: 'Treasure Hunt', headerShown: false }} />
        <Stack.Screen name="city3d" options={{ title: '3D LA City', headerShown: false }} />
      </Stack>
    </GameProviders>
  );
}

const styles = StyleSheet.create({
  comingSoonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    marginBottom: 12,
  },
  comingSoonBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  comingSoonMessage: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 300,
  },
});


