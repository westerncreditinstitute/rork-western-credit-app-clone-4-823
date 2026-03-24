import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Image, Text } from 'react-native';

interface AnimatedTokenFountainProps {
  imageUrl: string;
  size?: number;
  style?: object;
}

export default function AnimatedTokenFountain({ imageUrl, size = 40, style }: AnimatedTokenFountainProps) {
  const sprayAnims = useRef(
    Array.from({ length: 8 }, () => ({
      y: new Animated.Value(0),
      x: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.2),
      rotation: new Animated.Value(0),
    }))
  ).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const baseGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );
    shimmer.start();

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(baseGlow, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(baseGlow, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    );
    glow.start();

    const tokenAnimations = sprayAnims.map((token, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const spreadX = Math.cos(angle) * size * 0.35;
      const riseHeight = -(size * 0.3 + Math.random() * size * 0.25);
      const delay = i * 150;

      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(token.y, { toValue: riseHeight, duration: 600, useNativeDriver: true }),
              Animated.timing(token.y, { toValue: size * 0.1, duration: 500, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.timing(token.x, { toValue: spreadX * 0.7, duration: 400, useNativeDriver: true }),
              Animated.timing(token.x, { toValue: spreadX, duration: 700, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.timing(token.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
              Animated.delay(600),
              Animated.timing(token.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.timing(token.scale, { toValue: 1, duration: 300, useNativeDriver: true }),
              Animated.delay(400),
              Animated.timing(token.scale, { toValue: 0.2, duration: 400, useNativeDriver: true }),
            ]),
            Animated.timing(token.rotation, { toValue: 1, duration: 1100, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(token.y, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(token.x, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(token.opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(token.scale, { toValue: 0.2, duration: 0, useNativeDriver: true }),
            Animated.timing(token.rotation, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
          Animated.delay(200),
        ])
      );
    });

    tokenAnimations.forEach(a => a.start());

    return () => {
      shimmer.stop();
      glow.stop();
      tokenAnimations.forEach(a => a.stop());
    };
  }, [sprayAnims, shimmerAnim, baseGlow, size]);

  return (
    <View style={[styles.container, { width: size * 1.4, height: size * 1.4 }, style]}>
      <Animated.View
        style={[
          styles.glow,
          {
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: size * 0.75,
            opacity: baseGlow.interpolate({
              inputRange: [0, 1],
              outputRange: [0.08, 0.3],
            }),
          },
        ]}
      />

      {sprayAnims.map((token, i) => {
        const spin = token.rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.token,
              {
                width: size * 0.14,
                height: size * 0.14,
                borderRadius: size * 0.07,
                transform: [
                  { translateY: token.y },
                  { translateX: token.x },
                  { scale: token.scale },
                  { rotate: spin },
                ],
                opacity: token.opacity,
              },
            ]}
          >
            <Text style={[styles.tokenText, { fontSize: size * 0.07 }]}>M</Text>
          </Animated.View>
        );
      })}

      <Animated.View
        style={{
          opacity: shimmerAnim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.85, 1, 0.85],
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
    backgroundColor: '#10B981',
  },
  token: {
    position: 'absolute',
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },
  tokenText: {
    color: '#FFF',
    fontWeight: '900' as const,
  },
});
