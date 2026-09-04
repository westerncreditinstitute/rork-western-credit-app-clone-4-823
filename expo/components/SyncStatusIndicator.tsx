import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/contexts/ThemeContext";
import { useSyncStatus, type SyncStatus } from "@/hooks/useSyncStatus";
import { checkApiReachable } from "@/lib/trpc";

/**
 * Small header pill reporting whether local changes have reached the server.
 *
 * States: Synced (everything is on the server), Syncing (a save is in flight or
 * queued), Offline (the API is unreachable - work stays safe locally).
 *
 * Tapping while Offline re-probes the server, which makes the state actionable
 * instead of leaving the user waiting for a background retry.
 */
function SyncStatusIndicator() {
  const { colors } = useTheme();
  const { status, label } = useSyncStatus();
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const pulse = useRef(new Animated.Value(1)).current;
  const isCheckingRef = useRef<boolean>(false);

  // Breathing dot while syncing. Stopped (and reset) in every other state so an
  // idle pill is completely static and doesn't burn a frame loop forever.
  useEffect(() => {
    if (status !== "syncing") {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 620,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 620,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => {
      loop.stop();
    };
  }, [status, pulse]);

  useEffect(() => {
    return () => {
      isCheckingRef.current = false;
    };
  }, []);

  const handlePress = useCallback(async () => {
    if (status !== "offline" || isCheckingRef.current) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    isCheckingRef.current = true;
    setIsChecking(true);
    try {
      // A successful probe resets the transport circuit breaker, which flips
      // this pill back to Synced on its own - no local state to reconcile.
      const result = await checkApiReachable();
      console.log(
        `[SyncStatus] Manual reachability check: ${result.ok ? "reachable" : "unreachable"}`,
      );
    } catch (error) {
      console.log("[SyncStatus] Manual reachability check failed:", error);
    } finally {
      if (isCheckingRef.current) {
        isCheckingRef.current = false;
        setIsChecking(false);
      }
    }
  }, [status]);

  const tone = TONES[status];
  const foreground = colors[tone.fg];
  const background = colors[tone.bg];

  const accessibilityHint =
    status === "offline"
      ? "Your changes are saved on this device. Tap to check the connection again."
      : status === "syncing"
        ? "Saving your latest changes to the server."
        : "All changes are saved to the server.";

  return (
    <Pressable
      onPress={handlePress}
      disabled={status !== "offline" || isChecking}
      hitSlop={8}
      accessibilityRole={status === "offline" ? "button" : "text"}
      accessibilityLabel={`Sync status: ${label}`}
      accessibilityHint={accessibilityHint}
      testID="sync-status-indicator"
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: background,
          borderColor: foreground,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {isChecking ? (
        <ActivityIndicator size="small" color={foreground} style={styles.spinner} />
      ) : (
        <Animated.View
          style={[styles.dot, { backgroundColor: foreground, opacity: pulse }]}
        />
      )}
      <Text style={[styles.label, { color: foreground }]} numberOfLines={1}>
        {isChecking ? "Checking" : label}
      </Text>
    </Pressable>
  );
}

/** Colour pairing per state, resolved against the active theme. */
const TONES: Record<SyncStatus, { fg: "success" | "warning" | "error"; bg: "successLight" | "warningLight" | "errorLight" }> = {
  synced: { fg: "success", bg: "successLight" },
  syncing: { fg: "warning", bg: "warningLight" },
  offline: { fg: "error", bg: "errorLight" },
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 16,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  spinner: {
    width: 7,
    height: 7,
    transform: [{ scale: 0.7 }],
  },
  label: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 0.2,
  },
});

export default React.memo(SyncStatusIndicator);
