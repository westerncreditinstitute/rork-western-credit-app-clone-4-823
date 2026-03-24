import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { Radio, X, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { LiveTourNotification } from '@/types/communityHomes';

interface LiveTourNotificationBannerProps {
  notification: LiveTourNotification;
  onPress: () => void;
  onDismiss: () => void;
}

export default function LiveTourNotificationBanner({
  notification,
  onPress,
  onDismiss,
}: LiveTourNotificationBannerProps) {
  const { colors, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  const styles = createStyles(colors, isDark);

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <TouchableOpacity style={styles.content} onPress={handlePress} activeOpacity={0.9}>
        <View style={styles.liveIndicator}>
          <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>

        <Image source={{ uri: notification.hostAvatar }} style={styles.avatar} contentFit="cover" transition={150} cachePolicy="memory-disk" />

        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.hostName}
          </Text>
          <Text style={styles.message} numberOfLines={1}>
            {notification.message}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.joinButton} onPress={handlePress}>
            <Text style={styles.joinText}>Join</Text>
            <ChevronRight color="#FFFFFF" size={16} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
          <X color="rgba(255,255,255,0.7)" size={18} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#1E293B' : '#1F2937',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  actions: {
    marginRight: 8,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 2,
  },
  joinText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dismissButton: {
    padding: 4,
  },
});
