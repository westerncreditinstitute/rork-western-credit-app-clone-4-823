import React, { Component, ErrorInfo, ReactNode, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, RefreshCw, Gamepad2, Home, ArrowLeft, Settings } from 'lucide-react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface GameErrorProps extends Props {
  onReturnToLobby?: () => void;
}

interface FeatureErrorProps extends Props {
  featureName?: string;
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logError(error, errorInfo, 'App');
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <AlertTriangle color="#DC2626" size={48} />
            </View>
            
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              We encountered an unexpected error. Please try again.
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleReset}
              activeOpacity={0.8}
            >
              <RefreshCw color="#FFFFFF" size={20} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorDetails} showsVerticalScrollIndicator={false}>
                <Text style={styles.errorTitle}>Error Details (Dev Only)</Text>
                <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                {this.state.errorInfo?.componentStack && (
                  <Text style={styles.stackText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#001F42',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorDetails: {
    marginTop: 24,
    maxHeight: 200,
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  stackText: {
    fontSize: 10,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
});

export function logError(error: Error, errorInfo: ErrorInfo, context?: string): void {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    context: context || 'Unknown',
    message: error.message,
    name: error.name,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
  };
  
  console.error('[ErrorLog]', JSON.stringify(errorLog, null, 2));
}

export class GameErrorBoundary extends Component<GameErrorProps, State> {
  constructor(props: GameErrorProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logError(error, errorInfo, 'GameScreen');
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={gameStyles.container}>
          <View style={gameStyles.content}>
            <View style={gameStyles.iconContainer}>
              <Gamepad2 color="#F59E0B" size={48} />
            </View>
            
            <Text style={gameStyles.title}>Game Error</Text>
            <Text style={gameStyles.message}>
              Something went wrong in the game. Your progress has been saved.
            </Text>

            <View style={gameStyles.buttonRow}>
              <TouchableOpacity
                style={gameStyles.primaryButton}
                onPress={this.handleReset}
                activeOpacity={0.8}
              >
                <RefreshCw color="#FFFFFF" size={18} />
                <Text style={gameStyles.primaryButtonText}>Retry</Text>
              </TouchableOpacity>

              {this.props.onReturnToLobby && (
                <TouchableOpacity
                  style={gameStyles.secondaryButton}
                  onPress={this.props.onReturnToLobby}
                  activeOpacity={0.8}
                >
                  <Home color="#374151" size={18} />
                  <Text style={gameStyles.secondaryButtonText}>Lobby</Text>
                </TouchableOpacity>
              )}
            </View>

            {__DEV__ && this.state.error && (
              <ScrollView style={gameStyles.errorDetails} showsVerticalScrollIndicator={false}>
                <Text style={gameStyles.errorText}>{this.state.error.toString()}</Text>
              </ScrollView>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

export class FeatureErrorBoundary extends Component<FeatureErrorProps, State> {
  constructor(props: FeatureErrorProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logError(error, errorInfo, this.props.featureName || 'Feature');
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.props.compact) {
        return (
          <View style={featureStyles.compactContainer}>
            <AlertTriangle color="#DC2626" size={20} />
            <Text style={featureStyles.compactText}>
              {this.props.featureName || 'Feature'} unavailable
            </Text>
            <TouchableOpacity onPress={this.handleReset}>
              <RefreshCw color="#6B7280" size={16} />
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <View style={featureStyles.container}>
          <View style={featureStyles.iconContainer}>
            <Settings color="#9CA3AF" size={32} />
          </View>
          <Text style={featureStyles.title}>
            {this.props.featureName || 'Feature'} Error
          </Text>
          <Text style={featureStyles.message}>
            This section could not load properly.
          </Text>
          <TouchableOpacity
            style={featureStyles.retryButton}
            onPress={this.handleReset}
            activeOpacity={0.8}
          >
            <RefreshCw color="#001F42" size={16} />
            <Text style={featureStyles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export function GameErrorScreen({ onRetry, onGoBack }: { onRetry?: () => void; onGoBack?: () => void }) {
  const router = useRouter();
  
  const handleGoBack = useCallback(() => {
    if (onGoBack) {
      onGoBack();
    } else {
      router.back();
    }
  }, [onGoBack, router]);

  return (
    <View style={gameStyles.container}>
      <View style={gameStyles.content}>
        <View style={gameStyles.iconContainer}>
          <Gamepad2 color="#F59E0B" size={48} />
        </View>
        <Text style={gameStyles.title}>Game Crashed</Text>
        <Text style={gameStyles.message}>
          Your progress is safe. Try again or return to the lobby.
        </Text>
        <View style={gameStyles.buttonRow}>
          {onRetry && (
            <TouchableOpacity style={gameStyles.primaryButton} onPress={onRetry} activeOpacity={0.8}>
              <RefreshCw color="#FFFFFF" size={18} />
              <Text style={gameStyles.primaryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={gameStyles.secondaryButton} onPress={handleGoBack} activeOpacity={0.8}>
            <ArrowLeft color="#374151" size={18} />
            <Text style={gameStyles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const gameStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  errorDetails: {
    marginTop: 20,
    maxHeight: 120,
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    fontFamily: 'monospace',
  },
});

const featureStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    margin: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#001F42',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  compactText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
});

export default ErrorBoundary;
