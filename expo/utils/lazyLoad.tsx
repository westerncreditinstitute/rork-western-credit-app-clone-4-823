import React, { Suspense, lazy, ComponentType, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

type LazyComponentModule<T> = { default: ComponentType<T> };

export function createLazyComponent<T extends object>(
  importFn: () => Promise<LazyComponentModule<T>>,
  loadingMessage?: string
): ComponentType<T> {
  const LazyComponent = lazy(importFn);

  const WrappedComponent = (props: T) => (
    <Suspense
      fallback={
        <View style={styles.container}>
          <LoadingSpinner size="medium" message={loadingMessage} />
        </View>
      }
    >
      <LazyComponent {...props} />
    </Suspense>
  );

  WrappedComponent.displayName = `Lazy(${importFn.name || 'Component'})`;
  return WrappedComponent;
}

interface LazyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function LazyWrapper({ children, fallback }: LazyWrapperProps) {
  return (
    <Suspense
      fallback={
        fallback || (
          <View style={styles.container}>
            <LoadingSpinner size="medium" />
          </View>
        )
      }
    >
      {children}
    </Suspense>
  );
}

export function createConditionalProvider<T extends { children: ReactNode }>(
  Provider: ComponentType<T>,
  shouldRender: () => boolean
): ComponentType<T> {
  return function ConditionalProvider(props: T) {
    if (shouldRender()) {
      return <Provider {...props} />;
    }
    return <>{props.children}</>;
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
