import React, { lazy, Suspense, ReactNode, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const LazyRealEstateProvider = lazy(() => 
  import('@/contexts/RealEstateContext').then(module => ({
    default: module.RealEstateProvider
  }))
);

const LazyMultiplayerProvider = lazy(() => 
  import('@/contexts/MultiplayerContext').then(module => ({
    default: module.MultiplayerProvider
  }))
);

interface LazyProviderWrapperProps {
  children: ReactNode;
}

function ProviderFallback() {
  return (
    <View style={styles.fallback}>
      <LoadingSpinner size="large" message="Loading..." fullScreen />
    </View>
  );
}

export function LazyRealEstateProviderWrapper({ children }: LazyProviderWrapperProps) {
  return (
    <Suspense fallback={<ProviderFallback />}>
      <LazyRealEstateProvider>{children}</LazyRealEstateProvider>
    </Suspense>
  );
}

export function LazyMultiplayerProviderWrapper({ children }: LazyProviderWrapperProps) {
  return (
    <Suspense fallback={<ProviderFallback />}>
      <LazyMultiplayerProvider>{children}</LazyMultiplayerProvider>
    </Suspense>
  );
}

interface CombinedLazyProvidersProps {
  children: ReactNode;
  enableRealEstate?: boolean;
  enableMultiplayer?: boolean;
}

export function CombinedLazyProviders({ 
  children,
  enableRealEstate = true,
  enableMultiplayer = true,
}: CombinedLazyProvidersProps) {
  let content = <>{children}</>;

  if (enableMultiplayer) {
    content = (
      <Suspense fallback={<ProviderFallback />}>
        <LazyMultiplayerProvider>{content}</LazyMultiplayerProvider>
      </Suspense>
    );
  }

  if (enableRealEstate) {
    content = (
      <Suspense fallback={<ProviderFallback />}>
        <LazyRealEstateProvider>{content}</LazyRealEstateProvider>
      </Suspense>
    );
  }

  return content;
}

interface DeferredProviderProps {
  children: ReactNode;
  delay?: number;
}

export function DeferredProviders({ children, delay = 100 }: DeferredProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (!isReady) {
    return <ProviderFallback />;
  }

  return (
    <CombinedLazyProviders>
      {children}
    </CombinedLazyProviders>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
