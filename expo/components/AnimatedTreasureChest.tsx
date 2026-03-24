import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Image, Text } from 'react-native';

interface AnimatedTreasureChestProps {
  imageUrl: string;
  size?: number;
  style?: object;
}

export default function AnimatedTreasureChest({ imageUrl, size = 40, style }: AnimatedTreasureChestProps) {
  const lidAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const coinAnims = useRef(
    Array.from({ length: 5 }, () => ({
      y: new Animated.Value(0),
      x: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.3),
    }))
  ).current;

  useEffect(() => {
    const lidAnimation = Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(lidAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(lidAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.delay(800),
      ])
    );

    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.2, duration: 1000, useNativeDriver: true }),
      ])
    );

    lidAnimation.start();
    glowAnimation.start();

    const coinAnimations = coinAnims.map((coin, i) => {
      const xTarget = (i - 2) * (size * 0.15);
      return Animated.loop(
        Animated.sequence([
          Animated.delay(500 + i * 100),
          Animated.parallel([
            Animated.timing(coin.y, { toValue: -(size * 0.4 + i * 4), duration: 500, useNativeDriver: true }),
            Animated.timing(coin.x, { toValue: xTarget, duration: 500, useNativeDriver: true }),
            Animated.timing(coin.opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(coin.scale, { toValue: 1, duration: 400, useNativeDriver: true }),
          ]),
          Animated.delay(600),
          Animated.parallel([
            Animated.timing(coin.y, { toValue: 0, duration: 400, useNativeDriver: true }),
            Animated.timing(coin.x, { toValue: 0, duration: 400, useNativeDriver: true }),
            Animated.timing(coin.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(coin.scale, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          ]),
          Animated.delay(800 - i * 50),
        ])
      );
    });

    coinAnimations.forEach(a => a.start());

    return () => {
      lidAnimation.stop();
      glowAnimation.stop();
      coinAnimations.forEach(a => a.stop());
    };
  }, [lidAnim, glowAnim, coinAnims, size]);

  const lidRotation = lidAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-25deg'],
  });

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Animated.View
        style={[
          styles.glow,
          {
            width: size * 1.3,
            height: size * 1.3,
            borderRadius: size * 0.65,
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.1, 0.4],
            }),
          },
        ]}
      />

      {coinAnims.map((coin, i) => (
        <Animated.View
          key={i}
          style={[
            styles.coin,
            {
              width: size * 0.15,
              height: size * 0.15,
              borderRadius: size * 0.075,
              transform: [
                { translateY: coin.y },
                { translateX: coin.x },
                { scale: coin.scale },
              ],
              opacity: coin.opacity,
            },
          ]}
        >
          <Text style={[styles.coinText, { fontSize: size * 0.08 }]}>M</Text>
        </Animated.View>
      ))}

      <Animated.View
        style={[
          styles.imageWrap,
          {
            width: size,
            height: size,
            transform: [
              { perspective: 300 },
              { rotateX: lidRotation },
            ],
          },
        ]}
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
  imageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
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
