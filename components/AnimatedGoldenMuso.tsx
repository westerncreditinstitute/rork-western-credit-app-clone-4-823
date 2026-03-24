import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Image, Text } from 'react-native';

interface AnimatedGoldenMusoProps {
  imageUrl: string;
  size?: number;
  style?: object;
}

export default function AnimatedGoldenMuso({ imageUrl, size = 40, style }: AnimatedGoldenMusoProps) {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnims = useRef(
    Array.from({ length: 6 }, () => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.3),
      x: new Animated.Value(0),
      y: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.2, duration: 1200, useNativeDriver: true }),
      ])
    );
    glow.start();

    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -size * 0.06, duration: 800, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    bounce.start();

    const rotate = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: -1, duration: 2000, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    rotate.start();

    const sparkleAnimations = sparkleAnims.map((sparkle, i) => {
      const angle = (i / 6) * Math.PI * 2;
      const dist = size * 0.45;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(i * 300),
          Animated.parallel([
            Animated.timing(sparkle.opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(sparkle.scale, { toValue: 1.2, duration: 400, useNativeDriver: true }),
            Animated.timing(sparkle.x, { toValue: Math.cos(angle) * dist, duration: 500, useNativeDriver: true }),
            Animated.timing(sparkle.y, { toValue: Math.sin(angle) * dist, duration: 500, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(sparkle.opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
            Animated.timing(sparkle.scale, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(sparkle.x, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(sparkle.y, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
          Animated.delay(600),
        ])
      );
    });
    sparkleAnimations.forEach(a => a.start());

    return () => {
      glow.stop();
      bounce.stop();
      rotate.stop();
      sparkleAnimations.forEach(a => a.stop());
    };
  }, [glowAnim, bounceAnim, rotateAnim, sparkleAnims, size]);

  const rotation = rotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-4deg', '0deg', '4deg'],
  });

  return (
    <View style={[styles.container, { width: size * 1.2, height: size * 1.2 }, style]}>
      <Animated.View
        style={[
          styles.glow,
          {
            width: size * 1.4,
            height: size * 1.4,
            borderRadius: size * 0.7,
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.1, 0.45],
            }),
          },
        ]}
      />

      {sparkleAnims.map((sparkle, i) => (
        <Animated.View
          key={i}
          style={[
            styles.sparkle,
            {
              width: size * 0.1,
              height: size * 0.1,
              borderRadius: size * 0.05,
              transform: [
                { translateX: sparkle.x },
                { translateY: sparkle.y },
                { scale: sparkle.scale },
              ],
              opacity: sparkle.opacity,
            },
          ]}
        >
          <Text style={{ fontSize: size * 0.08, color: '#FFD700' }}>✦</Text>
        </Animated.View>
      ))}

      <Animated.View
        style={{
          transform: [
            { translateY: bounceAnim },
            { rotate: rotation },
          ],
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
    backgroundColor: '#FFD700',
  },
  sparkle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
