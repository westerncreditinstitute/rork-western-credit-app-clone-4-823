import React, { ReactNode, useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

import { ChallengeProvider } from '@/contexts/ChallengeContext';
import { HomeProvider } from '@/contexts/HomeContext';
import { CommunityHomesProvider } from '@/contexts/CommunityHomesContext';
import { GameProvider } from '@/contexts/GameContext';
import { BusinessProvider } from '@/contexts/BusinessContext';
import { TokenProvider } from '@/contexts/TokenContext';
import { DisputesProvider } from '@/contexts/DisputesContext';
import { SocialFeedProvider } from '@/contexts/SocialFeedContext';
import { WalletUnlockProvider } from '@/contexts/WalletUnlockContext';

interface Props {
  children: ReactNode;
}

export function DeferredProviders({ children }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#001F42" />
      </View>
    );
  }

  return (
    <ChallengeProvider>
      <HomeProvider>
        <CommunityHomesProvider>
          <GameProvider>
            <BusinessProvider>
              <TokenProvider>
                <DisputesProvider>
                  <WalletUnlockProvider>
                    <SocialFeedProvider>
                      {children}
                    </SocialFeedProvider>
                  </WalletUnlockProvider>
                </DisputesProvider>
              </TokenProvider>
            </BusinessProvider>
          </GameProvider>
        </CommunityHomesProvider>
      </HomeProvider>
    </ChallengeProvider>
  );
}
