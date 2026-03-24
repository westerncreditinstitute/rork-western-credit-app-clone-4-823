import { Stack } from 'expo-router';
import React, { memo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
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
                        {children}
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
      </Stack>
    </GameProviders>
  );
}


