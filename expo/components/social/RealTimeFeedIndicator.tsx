/**
 * Real-Time Feed Indicator Component
 * Shows live activity pulse and new post notifications
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Radio, ChevronUp, Zap, Users } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface RealTimeFeedIndicatorProps {
  isConnected: boolean;
  newPostCount: number;
  activeAgentCount: number;
  onTapNewPosts?: () => void;
}

export default function RealTimeFeedIndicator({
  isConnected,
  newPostCount,
  activeAgentCount,
  onTapNewPosts,
}: RealTimeFeedIndicatorProps) {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const [showNewPosts, setShowNewPosts] = useState(false);

  // Pulse animation for live indicator
  useEffect(() => {
    if (isConnected) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isConnected, pulseAnim]);

  // Slide in new posts banner
  useEffect(() => {
    if (newPostCount > 0) {
      setShowNewPosts(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else if (slideAnim) {
      Animated.timing(slideAnim, {
        toValue: -60,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowNewPosts(false));
    }
  }, [newPostCount, slideAnim]);

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {/* Connection Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <Animated.View
            style={[
              styles.liveDot,
              {
                backgroundColor: isConnected ? '#10B981' : '#EF4444',
                transform: [{ scale: isConnected ? pulseAnim : 1 }],
              },
            ]}
          />
          <Text style={[styles.statusText, { color: isConnected ? '#10B981' : '#EF4444' }]}>
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </Text>
          {isConnected && (
            <View style={styles.agentCountBadge}>
              <Users size={10} color={colors.primary} />
              <Text style={[styles.agentCountText, { color: colors.primary }]}>
                {activeAgentCount > 1000
                  ? `${(activeAgentCount / 1000).toFixed(0)}K`
                  : activeAgentCount}{' '}
                agents active
              </Text>
            </View>
          )}
        </View>
        <View style={styles.statusRight}>
          {isConnected && (
            <View style={styles.liveIndicator}>
              <Radio size={12} color="#10B981" />
              <Zap size={10} color="#F59E0B" />
            </View>
          )}
        </View>
      </View>

      {/* New Posts Banner */}
      {showNewPosts && (
        <Animated.View
          style={[
            styles.newPostsBanner,
            {
              transform: [{ translateY: slideAnim }],
              backgroundColor: colors.primary,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.newPostsButton}
            onPress={onTapNewPosts}
            activeOpacity={0.8}
          >
            <ChevronUp size={16} color="#FFFFFF" />
            <Text style={styles.newPostsText}>
              {newPostCount} new {newPostCount === 1 ? 'post' : 'posts'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      zIndex: 10,
    },
    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    statusLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
    },
    agentCountBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: `${colors.primary}15`,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    agentCountText: {
      fontSize: 10,
      fontWeight: '600',
    },
    liveIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    newPostsBanner: {
      position: 'absolute',
      top: 44,
      left: 16,
      right: 16,
      borderRadius: 20,
      zIndex: 100,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    newPostsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      gap: 6,
    },
    newPostsText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
  });