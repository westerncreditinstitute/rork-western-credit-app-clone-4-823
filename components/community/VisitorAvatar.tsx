import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import { VisitorInfo } from '@/types/communityHomes';

interface VisitorAvatarProps {
  visitor: VisitorInfo;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
  showStatus?: boolean;
  animated?: boolean;
}

export default function VisitorAvatar({
  visitor,
  size = 'medium',
  showName = true,
  showStatus = true,
  animated = true,
}: VisitorAvatarProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const dimensions = {
    small: { avatar: 32, border: 2, fontSize: 9 },
    medium: { avatar: 44, border: 3, fontSize: 11 },
    large: { avatar: 56, border: 4, fontSize: 13 },
  };

  const { avatar: avatarSize, border, fontSize } = dimensions[size];

  useEffect(() => {
    if (!animated) return;

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
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

    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -4,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    floatAnimation.start();

    return () => {
      pulseAnimation.stop();
      floatAnimation.stop();
    };
  }, [animated, pulseAnim, floatAnim]);

  const getStatusColor = () => {
    switch (visitor.status) {
      case 'active':
        return '#22C55E';
      case 'idle':
        return '#F59E0B';
      case 'exploring':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const displayName = visitor.name.length > 10 
    ? visitor.name.substring(0, 10) + '...' 
    : visitor.name;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: floatAnim }],
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowRing,
          {
            width: avatarSize + 16,
            height: avatarSize + 16,
            borderRadius: (avatarSize + 16) / 2,
            backgroundColor: visitor.avatarColor + '30',
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      <View
        style={[
          styles.avatarContainer,
          {
            width: avatarSize + border * 2,
            height: avatarSize + border * 2,
            borderRadius: (avatarSize + border * 2) / 2,
            borderWidth: border,
            borderColor: visitor.avatarColor,
          },
        ]}
      >
        <Image
          source={{ uri: visitor.avatar }}
          style={[
            styles.avatar,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
            },
          ]}
        />

        {visitor.isHost && (
          <View style={[styles.hostBadge, { backgroundColor: '#F59E0B' }]}>
            <Text style={styles.hostBadgeText}>👑</Text>
          </View>
        )}

        {showStatus && (
          <View
            style={[
              styles.statusIndicator,
              {
                width: avatarSize * 0.28,
                height: avatarSize * 0.28,
                borderRadius: avatarSize * 0.14,
                backgroundColor: getStatusColor(),
                borderWidth: 2,
                borderColor: '#000',
              },
            ]}
          />
        )}
      </View>

      {showName && (
        <View style={[styles.nameContainer, { backgroundColor: visitor.avatarColor }]}>
          <Text style={[styles.name, { fontSize }]} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    top: -8,
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  avatar: {
    backgroundColor: '#374151',
  },
  hostBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  hostBadgeText: {
    fontSize: 10,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  nameContainer: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    maxWidth: 100,
  },
  name: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
});
