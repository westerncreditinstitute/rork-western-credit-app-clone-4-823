import React, { useState } from "react";
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
import { Play, Volume2 } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

interface YouTubePlayerProps {
  videoId: string;
  title?: string;
  thumbnailUrl?: string;
  autoPlay?: boolean;
}

const { width } = Dimensions.get("window");
const PLAYER_HEIGHT = (width - 40) * (9 / 16);

export default function YouTubePlayer({
  videoId,
  title,
  autoPlay = false,
}: YouTubePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(true);

  

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

  const handlePlay = () => {
    setIsPlaying(true);
  };

  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <View style={styles.playerContainer}>
          <iframe
            width="100%"
            height={PLAYER_HEIGHT}
            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ borderRadius: 16 }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.playerContainer}>
        {!isPlaying ? (
          <TouchableOpacity
            style={styles.thumbnailContainer}
            onPress={handlePlay}
            activeOpacity={0.9}
          >
            <View style={styles.thumbnailImageContainer}>
              <View style={[styles.thumbnailPlaceholder, { backgroundColor: "#1a1a2e" }]}>
                <Play color="#fff" size={48} />
              </View>
            </View>
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.8)"]}
              style={styles.thumbnailOverlay}
            >
              <View style={styles.playButton}>
                <Play color="#fff" size={32} fill="#fff" />
              </View>
              <View style={styles.videoInfo}>
                <View style={styles.liveTag}>
                  <Volume2 color="#fff" size={14} />
                  <Text style={styles.liveText}>PROMO</Text>
                </View>
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
    marginBottom: 16,
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
    backgroundColor: "#1a1a2e",
    height: PLAYER_HEIGHT,
  },
  thumbnailContainer: {
    flex: 1,
    position: "relative" as const,
  },
  thumbnailImageContainer: {
    flex: 1,
  },
  thumbnailPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  videoInfo: {
    position: "absolute" as const,
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,0,0,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 6,
  },
  liveText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#fff",
    letterSpacing: 0.5,
  },
  webviewContainer: {
    flex: 1,
    position: "relative" as const,
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
});
