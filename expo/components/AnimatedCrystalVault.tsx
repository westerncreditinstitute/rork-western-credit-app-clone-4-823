import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Image, Text } from 'react-native';

interface AnimatedCrystalVaultProps {
  imageUrl: string;
  size?: number;
  style?: object;
}

export default function AnimatedCrystalVault({ imageUrl, size = 40, style }: AnimatedCrystalVaultProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const crystalAnims = useRef(
    Array.from({ length: 7 }, () => ({
      opacity: new Animated.Value(0),
      y: new Animated.Value(0),
      x: new Animated.Value(0),
      scale: new Animated.Value(0.2),
      rotation: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );
    pulse.start();

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.2, duration: 2000, useNativeDriver: true }),
      ])
    );
    glow.start();

    const crystalAnimations = crystalAnims.map((crystal, i) => {
      const angle = (i / 7) * Math.PI * 2;
      const spreadX = Math.cos(angle) * size * 0.35;
      const riseHeight = -(size * 0.25 + Math.random() * size * 0.2);

      return Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(crystal.y, { toValue: riseHeight, duration: 700, useNativeDriver: true }),
              Animated.timing(crystal.y, { toValue: riseHeight * 0.6, duration: 400, useNativeDriver: true }),
              Animated.timing(crystal.y, { toValue: riseHeight * 0.8, duration: 300, useNativeDriver: true }),
            ]),
            Animated.timing(crystal.x, { toValue: spreadX, duration: 1400, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(crystal.opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
              Animated.delay(700),
              Animated.timing(crystal.opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.timing(crystal.scale, { toValue: 1, duration: 400, useNativeDriver: true }),
              Animated.delay(500),
              Animated.timing(crystal.scale, { toValue: 0.2, duration: 500, useNativeDriver: true }),
            ]),
            Animated.timing(crystal.rotation, { toValue: 1, duration: 1400, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(crystal.y, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(crystal.x, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(crystal.opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(crystal.scale, { toValue: 0.2, duration: 0, useNativeDriver: true }),
            Animated.timing(crystal.rotation, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
          Animated.delay(300),
        ])
      );
    });
    crystalAnimations.forEach(a => a.start());

    return () => {
      pulse.stop();
      glow.stop();
      crystalAnimations.forEach(a => a.stop());
    };
  }, [pulseAnim, glowAnim, crystalAnims, size]);

  const crystalEmojis = ['💎', '🔮', '💠', '✨', '💎', '🔮', '💠'];

  return (
    <View style={[styles.container, { width: size * 1.4, height: size * 1.4 }, style]}>
      <Animated.View
        style={[
          styles.glow,
          {
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: size * 0.75,
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.08, 0.35],
            }),
          },
        ]}
      />

      {crystalAnims.map((crystal, i) => {
        const spin = crystal.rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '180deg'],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.crystal,
              {
                width: size * 0.14,
                height: size * 0.14,
                transform: [
                  { translateY: crystal.y },
                  { translateX: crystal.x },
                  { scale: crystal.scale },
                  { rotate: spin },
                ],
                opacity: crystal.opacity,
              },
            ]}
          >
            <Text style={{ fontSize: size * 0.09 }}>{crystalEmojis[i]}</Text>
          </Animated.View>
        );
      })}

      <Animated.View
        style={{
          transform: [
            {
              scale: pulseAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 1.03, 1],
              }),
            },
          ],
          opacity: pulseAnim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.9, 1, 0.9],
          }),
        }}
      >
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size, borderRadius: size * 0.15 }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  glow: {
    position: 'absolute',
    backgroundColor: '#8B5CF6',
  },
  crystal: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
