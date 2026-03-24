import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Info,
  Navigation,
  Hand,
  Star,
  ArrowRight,
  Sparkles,
} from 'lucide-react-native';
import { Hotspot } from '@/types/communityHomes';
import { useTheme } from '@/contexts/ThemeContext';

interface RoomHotspotProps {
  hotspot: Hotspot;
  onPress: (hotspot: Hotspot) => void;
  isActive?: boolean;
  showLabel?: boolean;
}

const HOTSPOT_COLORS = {
  info: '#3B82F6',
  navigation: '#22C55E',
  interaction: '#F59E0B',
  feature: '#8B5CF6',
};

const HOTSPOT_ICONS = {
  info: Info,
  navigation: Navigation,
  interaction: Hand,
  feature: Star,
};

export default function RoomHotspot({
  hotspot,
  onPress,
  isActive = false,
  showLabel = true,
}: RoomHotspotProps) {
  const { colors, isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    if (hotspot.type === 'navigation') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -5,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [pulseAnim, glowAnim, bounceAnim, hotspot.type]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress(hotspot);
  }, [hotspot, onPress]);

  const hotspotColor = HOTSPOT_COLORS[hotspot.type];
  const IconComponent = HOTSPOT_ICONS[hotspot.type];

  const styles = createStyles(colors, isDark, hotspotColor, isActive);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.outerPulse,
          {
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.2, 0],
            }),
            transform: [
              {
                scale: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 2],
                }),
              },
            ],
          },
        ]}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.middlePulse,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.6],
            }),
            transform: [
              {
                scale: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.3],
                }),
              },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.hotspotCore,
          {
            transform: [{ translateY: bounceAnim }],
          },
        ]}
      >
        <IconComponent color="#FFFFFF" size={14} />
      </Animated.View>

      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={styles.labelText}>{hotspot.label}</Text>
          {hotspot.type === 'navigation' && (
            <ArrowRight color="#FFFFFF" size={12} />
          )}
          {hotspot.type === 'feature' && (
            <Sparkles color="#FFFFFF" size={12} />
          )}
        </View>
      )}

      {hotspot.description && isActive && (
        <View style={styles.descriptionTooltip}>
          <Text style={styles.descriptionText}>{hotspot.description}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface InteractiveHotspotGroupProps {
  hotspots: Hotspot[];
  onHotspotPress: (hotspot: Hotspot) => void;
  activeHotspotId?: string;
}

export function InteractiveHotspotGroup({
  hotspots,
  onHotspotPress,
  activeHotspotId,
}: InteractiveHotspotGroupProps) {
  const groupedByType = hotspots.reduce((acc, hotspot) => {
    if (!acc[hotspot.type]) {
      acc[hotspot.type] = [];
    }
    acc[hotspot.type].push(hotspot);
    return acc;
  }, {} as Record<string, Hotspot[]>);

  return (
    <View style={groupStyles.container}>
      {Object.entries(groupedByType).map(([type, typeHotspots]) => (
        <View key={type} style={groupStyles.typeGroup}>
          {typeHotspots.map((hotspot, index) => (
            <View
              key={hotspot.id}
              style={[
                groupStyles.hotspotWrapper,
                {
                  left: 40 + index * 90,
                  top: 80 + (index % 3) * 70,
                },
              ]}
            >
              <RoomHotspot
                hotspot={hotspot}
                onPress={onHotspotPress}
                isActive={activeHotspotId === hotspot.id}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean, hotspotColor: string, isActive: boolean) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      position: 'relative',
    },
    outerPulse: {
      position: 'absolute',
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: hotspotColor,
    },
    middlePulse: {
      position: 'absolute',
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: hotspotColor,
    },
    hotspotCore: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: hotspotColor,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.8)',
      shadowColor: hotspotColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
      elevation: 6,
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 8,
      backgroundColor: 'rgba(0,0,0,0.75)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
    },
    labelText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    descriptionTooltip: {
      position: 'absolute',
      top: -60,
      backgroundColor: 'rgba(0,0,0,0.9)',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      maxWidth: 200,
      borderWidth: 1,
      borderColor: hotspotColor,
    },
    descriptionText: {
      fontSize: 12,
      color: '#FFFFFF',
      lineHeight: 18,
      textAlign: 'center',
    },
  });

const groupStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  typeGroup: {
    position: 'relative',
  },
  hotspotWrapper: {
    position: 'absolute',
  },
});
