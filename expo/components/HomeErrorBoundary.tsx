import React, { Component, ReactNode, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react-native';

interface HomeErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
  showDetails?: boolean;
}

interface HomeErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCount: number;
}

export class HomeErrorBoundary extends Component<HomeErrorBoundaryProps, HomeErrorBoundaryState> {
  constructor(props: HomeErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<HomeErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[HomeErrorBoundary] Error caught:', error);
    console.error('[HomeErrorBoundary] Component stack:', errorInfo.componentStack);
    
    this.setState(prev => ({
      errorInfo,
      errorCount: prev.errorCount + 1,
    }));

    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    console.log('[HomeErrorBoundary] Resetting error state');
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
        <HomeErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorCount={this.state.errorCount}
          onReset={this.handleReset}
          showDetails={this.props.showDetails}
        />
      );
    }

    return this.props.children;
  }
}

interface HomeErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCount: number;
  onReset: () => void;
  showDetails?: boolean;
}

function HomeErrorFallback({ 
  error, 
  errorInfo, 
  errorCount, 
  onReset, 
  showDetails = false 
}: HomeErrorFallbackProps) {
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  const toggleDetails = useCallback(() => {
    setExpanded(prev => !prev);
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotateAnim]);

  const getErrorMessage = (): string => {
    if (!error) return 'An unexpected error occurred';
    
    if (error.message.includes('Network')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    if (error.message.includes('timeout')) {
      return 'The request timed out. Please try again.';
    }
    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return 'You don\'t have permission to access this home.';
    }
    if (error.message.includes('not found')) {
      return 'The home you\'re looking for could not be found.';
    }
    
    return error.message || 'Something went wrong with the Home feature.';
  };

  const getErrorSuggestion = (): string => {
    if (!error) return 'Try refreshing the page.';
    
    if (error.message.includes('Network') || error.message.includes('timeout')) {
      return 'Check your internet connection and try again.';
    }
    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return 'Please sign in or contact the home owner for access.';
    }
    if (error.message.includes('not found')) {
      return 'The home may have been deleted or moved.';
    }
    if (errorCount > 2) {
      return 'This error keeps occurring. Please try again later or contact support.';
    }
    
    return 'Try refreshing or go back to the home browser.';
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <AlertTriangle size={48} color="#EF4444" />
        </View>
        
        <Text style={styles.title}>Oops! Something went wrong</Text>
        <Text style={styles.message}>{getErrorMessage()}</Text>
        <Text style={styles.suggestion}>{getErrorSuggestion()}</Text>

        {errorCount > 1 && (
          <View style={styles.errorCountBadge}>
            <Text style={styles.errorCountText}>
              Error occurred {errorCount} times
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={onReset}
            activeOpacity={0.8}
          >
            <RefreshCw size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            activeOpacity={0.8}
          >
            <Home size={18} color="#374151" />
            <Text style={styles.secondaryButtonText}>Go to Home Browser</Text>
          </TouchableOpacity>
        </View>

        {(showDetails || __DEV__) && error && (
          <View style={styles.detailsContainer}>
            <TouchableOpacity 
              style={styles.detailsHeader} 
              onPress={toggleDetails}
              activeOpacity={0.7}
            >
              <Text style={styles.detailsTitle}>Technical Details</Text>
              {expanded ? (
                <ChevronUp size={20} color="#6B7280" />
              ) : (
                <ChevronDown size={20} color="#6B7280" />
              )}
            </TouchableOpacity>

            {expanded && (
              <ScrollView style={styles.detailsContent} nestedScrollEnabled>
                <Text style={styles.detailsLabel}>Error Type:</Text>
                <Text style={styles.detailsValue}>{error.name}</Text>
                
                <Text style={styles.detailsLabel}>Message:</Text>
                <Text style={styles.detailsValue}>{error.message}</Text>
                
                {error.stack && (
                  <>
                    <Text style={styles.detailsLabel}>Stack Trace:</Text>
                    <Text style={styles.stackTrace}>{error.stack}</Text>
                  </>
                )}
                
                {errorInfo?.componentStack && (
                  <>
                    <Text style={styles.detailsLabel}>Component Stack:</Text>
                    <Text style={styles.stackTrace}>{errorInfo.componentStack}</Text>
                  </>
                )}
              </ScrollView>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

interface ServiceErrorDisplayProps {
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: number;
  } | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function ServiceErrorDisplay({ error, onDismiss, onRetry }: ServiceErrorDisplayProps) {
  if (!error) return null;

  const getErrorIcon = () => {
    if (error.code.includes('NETWORK') || error.code.includes('FETCH')) {
      return <RefreshCw size={20} color="#EF4444" />;
    }
    return <AlertTriangle size={20} color="#EF4444" />;
  };

  return (
    <View style={styles.serviceErrorContainer}>
      <View style={styles.serviceErrorContent}>
        {getErrorIcon()}
        <View style={styles.serviceErrorTextContainer}>
          <Text style={styles.serviceErrorCode}>{error.code}</Text>
          <Text style={styles.serviceErrorMessage}>{error.message}</Text>
        </View>
      </View>
      
      <View style={styles.serviceErrorActions}>
        {onRetry && (
          <TouchableOpacity 
            style={styles.serviceErrorButton} 
            onPress={onRetry}
            activeOpacity={0.7}
          >
            <Text style={styles.serviceErrorButtonText}>Retry</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity 
            style={[styles.serviceErrorButton, styles.serviceErrorDismiss]} 
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.serviceErrorDismissText}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

interface ErrorToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

export function ErrorToast({ message, visible, onHide, duration = 4000 }: ErrorToastProps) {
  const translateY = React.useRef(new Animated.Value(-100)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => onHide());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide, translateY, opacity]);

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.toastContainer,
        { 
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <AlertTriangle size={18} color="#FFFFFF" />
      <Text style={styles.toastMessage}>{message}</Text>
      <TouchableOpacity onPress={onHide} activeOpacity={0.7}>
        <Text style={styles.toastDismiss}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
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
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  suggestion: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  errorCountBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 16,
  },
  errorCountText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500' as const,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500' as const,
  },
  detailsContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  detailsContent: {
    marginTop: 12,
    maxHeight: 200,
  },
  detailsLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#9CA3AF',
    marginTop: 8,
    marginBottom: 4,
  },
  detailsValue: {
    fontSize: 13,
    color: '#374151',
  },
  stackTrace: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'monospace',
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
  },
  serviceErrorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  serviceErrorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  serviceErrorTextContainer: {
    flex: 1,
  },
  serviceErrorCode: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#B91C1C',
    marginBottom: 4,
  },
  serviceErrorMessage: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
  },
  serviceErrorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  serviceErrorButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
  },
  serviceErrorButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  serviceErrorDismiss: {
    backgroundColor: 'transparent',
  },
  serviceErrorDismissText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1000,
  },
  toastMessage: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  toastDismiss: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300' as const,
    lineHeight: 24,
  },
});

export default HomeErrorBoundary;
