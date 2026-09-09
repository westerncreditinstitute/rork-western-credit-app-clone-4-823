import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { Play, Sparkles } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

interface HeyGenPlayerProps {
  /** The HeyGen embed id, i.e. the last path segment of app.heygen.com/embeds/<id> */
  embedId: string;
  title?: string;
  /** Skip the poster and mount the player immediately. */
  autoPlay?: boolean;
}

const { width } = Dimensions.get("window");
const PLAYER_HEIGHT = (width - 40) * (9 / 16);

/**
 * Plays a HeyGen AI-avatar video.
 *
 * On web the embed renders as a native iframe. On native it shows a branded
 * poster first and only mounts the WebView once tapped, so the home screen
 * doesn't pay the cost of a live web view on every mount.
 */
export default function HeyGenPlayer({
  embedId,
  title,
  autoPlay = false,
}: HeyGenPlayerProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const embedUrl = `https://app.heygen.com/embeds/${embedId}`;

  const handlePlay = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsPlaying(true);
  }, []);

  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <View style={styles.playerContainer}>
          <iframe
            width="100%"
            height={PLAYER_HEIGHT}
            src={embedUrl}
            title={title ?? "Featured video"}
            frameBorder="0"
            allow="encrypted-media; fullscreen;"
            allowFullScreen
            style={{ borderRadius: 16, border: "none", display: "block" }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.playerContainer}>
        {!isPlaying ? (
          <TouchableOpacity
            style={styles.posterContainer}
            onPress={handlePlay}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={`Play video${title ? `: ${title}` : ""}`}
          >
            <LinearGradient
              colors={["#0F2027", "#16324A", "#0B1F2E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.posterGradient}
            >
              <View style={styles.playButton}>
                <Play color="#0B1F2E" size={30} fill="#0B1F2E" />
              </View>
              <View style={styles.aiTag}>
                <Sparkles color="#2DD4BF" size={13} />
                <Text style={styles.aiTagText}>AI VIDEO</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.webviewContainer}>
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#2DD4BF" />
              </View>
            )}
            <WebView
              source={{ uri: embedUrl }}
              style={styles.webview}
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              onLoadEnd={() => setIsLoading(false)}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#fff",
    marginBottom: 12,
  },
  playerContainer: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#0B1F2E",
    height: PLAYER_HEIGHT,
  },
  posterContainer: {
    flex: 1,
  },
  posterGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#2DD4BF",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 4,
    shadowColor: "#2DD4BF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  aiTag: {
    position: "absolute" as const,
    bottom: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(45, 212, 191, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.35)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
  },
  aiTagText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#2DD4BF",
    letterSpacing: 0.6,
  },
  webviewContainer: {
    flex: 1,
    position: "relative" as const,
  },
  webview: {
    flex: 1,
    backgroundColor: "#0B1F2E",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0B1F2E",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
});
