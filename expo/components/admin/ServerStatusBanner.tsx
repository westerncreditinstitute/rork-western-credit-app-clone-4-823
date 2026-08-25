import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CloudOff, RefreshCw, CheckCircle2 } from "lucide-react-native";

import Colors from "@/constants/colors";
import { checkApiReachable } from "@/lib/trpc";

/** How often the banner silently re-checks while the server is down. */
const RETRY_INTERVAL_MS = 15000;

type Status = "checking" | "online" | "offline";

interface ServerStatusBannerProps {
  /** Extra bottom spacing, used when the banner sits above content. */
  style?: object;
}

/**
 * Persistent banner that warns admins when the API server can't be reached,
 * so uploads and saves fail with an explanation instead of a silent error.
 * Auto-retries in the background and confirms briefly once the server returns.
 */
export default function ServerStatusBanner({ style }: ServerStatusBannerProps) {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState<string>("");
  const [isManualRetry, setIsManualRetry] = useState<boolean>(false);
  const [showRecovered, setShowRecovered] = useState<boolean>(false);

  const slideAnim = useRef<Animated.Value>(new Animated.Value(0)).current;
  const spinAnim = useRef<Animated.Value>(new Animated.Value(0)).current;
  const isMounted = useRef<boolean>(true);
  const wasOffline = useRef<boolean>(false);
  const recoveredTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runCheck = useCallback(async (manual: boolean) => {
    if (manual) setIsManualRetry(true);

    try {
      const result = await checkApiReachable();
      if (!isMounted.current) return;

      if (result.ok) {
        setStatus("online");
        setMessage("");
        // Only celebrate if we were actually down before.
        if (wasOffline.current) {
          wasOffline.current = false;
          setShowRecovered(true);
          if (recoveredTimer.current) clearTimeout(recoveredTimer.current);
          recoveredTimer.current = setTimeout(() => {
            if (isMounted.current) setShowRecovered(false);
          }, 3000);
        }
      } else {
        wasOffline.current = true;
        setStatus("offline");
        setMessage(result.message ?? "The server is not responding.");
      }
    } catch {
      if (!isMounted.current) return;
      wasOffline.current = true;
      setStatus("offline");
      setMessage("The server is not responding.");
    } finally {
      if (isMounted.current) setIsManualRetry(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    runCheck(false);

    const interval = setInterval(() => {
      // Keep polling while down so the banner clears itself on recovery.
      if (wasOffline.current) runCheck(false);
    }, RETRY_INTERVAL_MS);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
      if (recoveredTimer.current) clearTimeout(recoveredTimer.current);
    };
  }, [runCheck]);

  const isVisible = status === "offline" || showRecovered;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isVisible ? 1 : 0,
      useNativeDriver: true,
      friction: 9,
      tension: 90,
    }).start();
  }, [isVisible, slideAnim]);

  useEffect(() => {
    if (!isManualRetry) {
      spinAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [isManualRetry, spinAnim]);

  if (!isVisible) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 0],
  });
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  if (showRecovered) {
    return (
      <Animated.View
        style={[
          styles.banner,
          styles.bannerOnline,
          { opacity: slideAnim, transform: [{ translateY }] },
          style,
        ]}
      >
        <CheckCircle2 color={Colors.success} size={18} />
        <Text style={[styles.title, styles.titleOnline]}>
          Server reconnected — you&apos;re good to upload.
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.banner,
        styles.bannerOffline,
        { opacity: slideAnim, transform: [{ translateY }] },
        style,
      ]}
      testID="server-status-banner"
    >
      <View style={styles.iconWrap}>
        <CloudOff color={Colors.error} size={20} />
      </View>

      <View style={styles.textWrap}>
        <Text style={styles.title}>Server unreachable</Text>
        <Text style={styles.message}>
          {message} Uploads and saves won&apos;t work until it&apos;s back.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => runCheck(true)}
        disabled={isManualRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry server connection"
      >
        {isManualRetry ? (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <RefreshCw color={Colors.white} size={14} />
          </Animated.View>
        ) : (
          <RefreshCw color={Colors.white} size={14} />
        )}
        <Text style={styles.retryText}>{isManualRetry ? "Checking" : "Retry"}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/** Small inline spinner shown while the very first check runs. */
export function ServerStatusCheckingDot() {
  return <ActivityIndicator size="small" color={Colors.textLight} />;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  bannerOffline: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error + "55",
  },
  bannerOnline: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success + "55",
    justifyContent: "center" as const,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.error + "1A",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.error,
    marginBottom: 2,
  },
  titleOnline: {
    color: Colors.success,
    marginBottom: 0,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  retryButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  retryText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600" as const,
  },
});
