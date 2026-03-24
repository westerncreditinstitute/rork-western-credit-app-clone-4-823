import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Image, Text } from 'react-native';

interface AnimatedCoinPileProps {
  imageUrl: string;
  size?: number;
  style?: object;
}

export default function AnimatedCoinPile({ imageUrl, size = 40, style }: AnimatedCoinPileProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const coinAnims = useRef(
    Array.from({ length: 6 }, () => ({
      y: new Animated.Value(0),
      x: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.3),
      rotation: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    shimmer.start();

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.2, duration: 1500, useNativeDriver: true }),
      ])
    );
    glow.start();

    const coinAnimations = coinAnims.map((coin, i) => {
      const xTarget = (i - 2.5) * (size * 0.12);
      const yTarget = -(size * 0.15 + Math.random() * size * 0.25);

      return Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(coin.y, { toValue: yTarget, duration: 450, useNativeDriver: true }),
              Animated.timing(coin.y, { toValue: size * 0.05, duration: 350, useNativeDriver: true }),
            ]),
            Animated.timing(coin.x, { toValue: xTarget, duration: 800, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(coin.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
              Animated.delay(350),
              Animated.timing(coin.opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
            ]),
            Animated.timing(coin.scale, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(coin.rotation, { toValue: 1, duration: 800, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(coin.y, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(coin.x, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(coin.opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(coin.scale, { toValue: 0.3, duration: 0, useNativeDriver: true }),
            Animated.timing(coin.rotation, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
          Animated.delay(400),
        ])
      );
    });
    coinAnimations.forEach(a => a.start());

    return () => {
      shimmer.stop();
      glow.stop();
      coinAnimations.forEach(a => a.stop());
    };
  }, [shimmerAnim, glowAnim, coinAnims, size]);

  return (
    <View style={[styles.container, { width: size * 1.3, height: size * 1.3 }, style]}>
      <Animated.View
        style={[
          styles.glow,
          {
            width: size * 1.4,
            height: size * 1.4,
            borderRadius: size * 0.7,
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.1, 0.4],
            }),
          },
        ]}
      />

      {coinAnims.map((coin, i) => {
        const spin = coin.rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.coin,
              {
                width: size * 0.13,
                height: size * 0.13,
                borderRadius: size * 0.065,
                transform: [
                  { translateY: coin.y },
                  { translateX: coin.x },
                  { scale: coin.scale },
                  { rotate: spin },
                ],
                opacity: coin.opacity,
              },
            ]}
          >
            <Text style={[styles.coinText, { fontSize: size * 0.07 }]}>M</Text>
          </Animated.View>
        );
      })}

      <Animated.View
        style={{
          opacity: shimmerAnim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.88, 1, 0.88],
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
    backgroundColor: '#F59E0B',
  },
  coin: {
    position: 'absolute',
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 3,
  },
  coinText: {
    color: '#FFF',
    fontWeight: '900' as const,
  },
});
