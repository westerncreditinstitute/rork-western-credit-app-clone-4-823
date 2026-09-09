import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// ============================================================
// WarpTunnel — the My Agent "entering hyperspace" intro.
//
// A starfield streaks outward from the center while a mission-
// control boot sequence runs underneath. Tapping anywhere skips.
// Shown once per app session, before the agent console paints.
// ============================================================

/** Star streak: a thin bright bar that flies outward and stretches. */
interface StarSpec {
  angle: number;
  delay: number;
  duration: number;
  distance: number;
  width: number;
  hue: string;
}

const STAR_COLORS = ["#A78BFA", "#67E8F9", "#E9D5FF", "#FFFFFF", "#5EEAD4"];

/** Deterministic pseudo-random so re-renders keep the same tunnel. */
function makeStars(count: number): StarSpec[] {
  const stars: StarSpec[] = [];
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < count; i++) {
    stars.push({
      angle: rand() * Math.PI * 2,
      delay: rand() * 900,
      duration: 900 + rand() * 700,
      distance: 0.55 + rand() * 0.75,
      width: 1.5 + rand() * 2,
      hue: STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)],
    });
  }
  return stars;
}

const BOOT_LINES = [
  "AUTHENTICATING OPERATOR ........ OK",
  "SYNCING DISPUTE VAULT ......... OK",
  "LOADING FDCPA / FCRA MODULES .. OK",
  "AGENT HANDSHAKE ............... LIVE",
];

const TUNNEL_MS = 2600;

export interface WarpTunnelProps {
  /** Called once the tunnel finishes (or the user taps to skip). */
  onDone: () => void;
}

export default function WarpTunnel({ onDone }: WarpTunnelProps) {
  const screen = Dimensions.get("window");
  const maxRadius = Math.hypot(screen.width, screen.height) / 2;
  const stars = useMemo(() => makeStars(34), []);

  const fade = useRef<Animated.Value>(new Animated.Value(1)).current;
  const flash = useRef<Animated.Value>(new Animated.Value(0)).current;
  const ring = useRef<Animated.Value>(new Animated.Value(0)).current;
  const progress = useRef<Animated.Value>(new Animated.Value(0)).current;
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    // White flash + fade to black, then hand off to the console.
    Animated.sequence([
      Animated.timing(flash, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 0,
        duration: 420,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => onDone());
  };

  useEffect(() => {
    Animated.parallel([
      // Center ring pulses outward continuously.
      Animated.loop(
        Animated.sequence([
          Animated.timing(ring, {
            toValue: 1,
            duration: 1100,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ring, {
            toValue: 0,
            duration: 1,
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.timing(progress, {
        toValue: 1,
        duration: TUNNEL_MS - 200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.delay(TUNNEL_MS),
    ]).start();

    const timer = setTimeout(finish, TUNNEL_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringScale = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 2.4],
  });
  const ringOpacity = ring.interpolate({
    inputRange: [0, 0.15, 0.85, 1],
    outputRange: [0, 0.9, 0.9, 0],
  });

  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={finish}
      accessibilityRole="button"
      accessibilityLabel="Skip intro"
      testID="warp-tunnel"
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        {/* Deep space base */}
        <View style={[StyleSheet.absoluteFill, styles.space]} />

        {/* Radial glow at the vanishing point */}
        <View pointerEvents="none" style={styles.centerGlowWrap}>
          <View style={styles.centerGlow} />
        </View>

        {/* Star streaks */}
        <View pointerEvents="none" style={styles.starsWrap}>
          {stars.map((star, index) => (
            <WarpStar
              key={index}
              spec={star}
              maxRadius={maxRadius}
            />
          ))}
        </View>

        {/* HUD boot sequence */}
        <View pointerEvents="none" style={styles.hud}>
          <View style={styles.ringWrap}>
            <Animated.View
              style={[
                styles.pulseRing,
                { transform: [{ scale: ringScale }], opacity: ringOpacity },
              ]}
            />
            <View style={styles.coreDot} />
          </View>

          <Text style={styles.title}>ESTABLISHING AGENT LINK</Text>

          <View style={styles.bootBox}>
            {BOOT_LINES.map((line, index) => (
              <BootLine key={line} text={line} delay={300 + index * 520} />
            ))}
          </View>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["4%", "100%"],
                  }),
                },
              ]}
            />
          </View>

          <Text style={styles.skipHint}>TAP TO SKIP</Text>
        </View>
      </Animated.View>

      {/* Exit flash sits above everything */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]}
      />
    </Pressable>
  );
}

/** One star: a rotated bar accelerating outward from the screen center. */
function WarpStar({ spec, maxRadius }: { spec: StarSpec; maxRadius: number }) {
  const t = useRef<Animated.Value>(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: spec.duration,
          delay: spec.delay,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: 1,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [spec, t]);

  const translateX = t.interpolate({
    inputRange: [0, 1],
    outputRange: [18, maxRadius * spec.distance],
  });
  const scaleX = t.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [1, 1.4, 9],
  });
  const opacity = t.interpolate({
    inputRange: [0, 0.12, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: spec.width,
        height: 2,
        borderRadius: 1,
        backgroundColor: spec.hue,
        opacity,
        transform: [
          { translateX: -spec.width / 2 },
          { translateY: -1 },
          { rotate: `${spec.angle}rad` },
          { translateX },
          { scaleX },
        ],
      }}
    />
  );
}

/** A boot line that fades in after its delay. */
function BootLine({ text, delay }: { text: string; delay: number }) {
  const opacity = useRef<Animated.Value>(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 240,
      delay,
      useNativeDriver: true,
    }).start();
  }, [delay, opacity, text]);

  return (
    <Animated.View style={{ opacity }} accessible>
      <Text style={styles.bootLine}>{text}</Text>
    </Animated.View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  space: {
    backgroundColor: "#05010F",
  },
  centerGlowWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  centerGlow: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#A78BFA",
    opacity: 0.14,
  },
  starsWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  hud: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  ringWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  pulseRing: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: "#A78BFA",
  },
  coreDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#C4B5FD",
  },
  title: {
    color: "#E9D5FF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 4,
    marginBottom: 22,
    textAlign: "center",
  },
  bootBox: {
    backgroundColor: "rgba(167, 139, 250, 0.07)",
    borderColor: "rgba(167, 139, 250, 0.25)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 6,
    marginBottom: 22,
  },
  bootLine: {
    color: "#8BE9D9",
    fontSize: 11,
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },
  progressTrack: {
    width: "70%",
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(167, 139, 250, 0.18)",
    overflow: "hidden",
    marginBottom: 18,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#A78BFA",
  },
  skipHint: {
    color: "rgba(233, 213, 255, 0.4)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 3,
  },
  flash: {
    backgroundColor: "#EDE9FE",
  },
});
