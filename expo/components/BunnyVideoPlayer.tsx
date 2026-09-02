import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  Alert,
} from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";
import { Play, Lock, AlertCircle, RefreshCw, CheckCircle, Clock, ShieldAlert } from "lucide-react-native";
import * as ScreenCapture from "expo-screen-capture";
import { trpc } from "@/lib/trpc";
import Colors from "@/constants/colors";

interface BunnyVideoPlayerProps {
  videoId: string;
  libraryId: string;
  title?: string;
  isLocked?: boolean;
  onUnlockPress?: () => void;
  autoPlay?: boolean;
  userId?: string;
  courseId?: string;
  sectionId?: string;
  dbVideoId?: string;
  /**
   * Pre-signed embed URL (usually shipped with the course videos query) so the
   * player can mount without waiting on a signing round trip. When missing or
   * expired the component falls back to fetching its own signed URL.
   */
  embedUrl?: string | null;
  embedExpiresAt?: number | null;
  /** Duration in seconds from the video record - avoids a Bunny API call per view. */
  durationSeconds?: number;
  onProgressUpdate?: (progress: number, completed: boolean) => void;
}

/**
 * Builds the wrapper page around the Bunny iframe. The page loads Bunny's
 * player.js bridge so playback can be started instantly from React Native via
 * postMessage instead of reloading the iframe, and forwards real playback
 * events (play / timeupdate) back for accurate progress tracking.
 */
const buildEmbedHtml = (src: string): string => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
        iframe { width: 100%; height: 100%; border: none; }
      </style>
      <script type="text/javascript" src="//assets.mediadelivery.net/playerjs/playerjs-latest.min.js"></script>
    </head>
    <body>
      <iframe
        id="wciFrame"
        src="${src}"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowfullscreen
      ></iframe>
      <script>
        (function () {
          function post(obj) {
            try {
              window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ source: "wci-player" }, obj)));
            } catch (e) {}
          }
          var player = null;
          function init() {
            if (typeof playerjs === "undefined") { post({ event: "nolibrary" }); return; }
            try {
              player = new playerjs.Player(document.getElementById("wciFrame"));
              player.on("ready", function () { window.wciPlayerReady = true; });
              player.on("play", function () { post({ event: "play" }); });
              player.on("pause", function () { post({ event: "pause" }); });
              player.on("ended", function () { post({ event: "ended" }); });
              player.on("timeupdate", function (data) {
                post({ event: "timeupdate", currentTime: data && data.seconds });
              });
              window.wciPlay = function () {
                try { player.play(); } catch (e) { post({ event: "playerror" }); }
              };
            } catch (e) {
              post({ event: "initerror" });
            }
          }
          if (document.readyState === "complete" || document.readyState === "interactive") {
            init();
          } else {
            document.addEventListener("DOMContentLoaded", init);
          }
        })();
      </script>
    </body>
  </html>
`;

export default function BunnyVideoPlayer({
  videoId,
  libraryId,
  title,
  isLocked = false,
  onUnlockPress,
  autoPlay = false,
  userId,
  courseId,
  sectionId,
  dbVideoId,
  embedUrl,
  embedExpiresAt,
  durationSeconds,
  onProgressUpdate,
}: BunnyVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay && !isLocked);
  const [error, setError] = useState<string | null>(null);
  const [isScreenCaptureProtected, setIsScreenCaptureProtected] = useState(false);
  const [autoplayRequested, setAutoplayRequested] = useState(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackConfirmedRef = useRef(false);
  const latestTimeRef = useRef(0);
  const estimateRef = useRef(0);
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const screenCaptureKey = `bunny-video-protection-${videoId}`;

  // Screen capture protection - only on native platforms
  useEffect(() => {
    if (Platform.OS === "web" || isLocked) return;

    let subscription: { remove: () => void } | null = null;

    const enableProtection = async () => {
      try {
        // Prevent screen capture
        await ScreenCapture.preventScreenCaptureAsync(screenCaptureKey);
        console.log("[BunnyPlayer] Screen capture prevention ENABLED");

        // Add screenshot listener
        subscription = ScreenCapture.addScreenshotListener(() => {
          console.log("[BunnyPlayer] Screenshot detected! Content is protected.");
          Alert.alert(
            "Screenshot Blocked",
            "This content is protected. Screenshots and screen recordings are not allowed.",
            [{ text: "OK" }]
          );
        });
      } catch (err) {
        console.log("[BunnyPlayer] Screen capture protection not available:", err);
      }
    };

    enableProtection();

    return () => {
      ScreenCapture.allowScreenCaptureAsync(screenCaptureKey).catch(() => {});
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isLocked, screenCaptureKey]);

  // Enable iOS app switcher blur protection on mount
  useEffect(() => {
    if (Platform.OS !== "ios" || isLocked) return;

    const enableAppSwitcherProtection = async () => {
      try {
        await ScreenCapture.enableAppSwitcherProtectionAsync(1.0);
        setIsScreenCaptureProtected(true);
        console.log("[BunnyPlayer] iOS app switcher blur protection ENABLED");
      } catch (err) {
        console.log("[BunnyPlayer] App switcher protection not available:", err);
      }
    };

    enableAppSwitcherProtection();

    return () => {
      ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
    };
  }, [isLocked]);

  // Additional protection check - verify protection is active
  useEffect(() => {
    if (Platform.OS === "web" || isLocked) return;

    const checkProtection = async () => {
      try {
        const isAvailable = await ScreenCapture.isAvailableAsync();
        if (isAvailable) {
          setIsScreenCaptureProtected(true);
        }
      } catch (err) {
        console.log("[BunnyPlayer] Error checking screen capture availability:", err);
      }
    };

    checkProtection();
  }, [videoId, isLocked]);

  // A prop URL is only used while its signature is comfortably unexpired.
  const hasValidPropUrl = Boolean(
    embedUrl && (!embedExpiresAt || embedExpiresAt > Date.now() + 60_000)
  );

  // The signed URL is fetched on mount (not on play) so it is already cached
  // by the time the user presses play. Skipped entirely when a pre-signed URL
  // arrived with the course videos query.
  const signedUrlQuery = trpc.bunny.getSignedUrl.useQuery(
    { videoId, libraryId },
    {
      enabled: !isLocked && !hasValidPropUrl,
      staleTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  const resolvedEmbedUrl =
    hasValidPropUrl && embedUrl ? embedUrl : signedUrlQuery.data?.embedUrl;

  const progressQuery = trpc.videoProgress.getProgress.useQuery(
    { userId: userId || "", videoId: dbVideoId || "" },
    { enabled: !!userId && !!dbVideoId }
  );

  const updateProgressMutation = trpc.videoProgress.updateProgress.useMutation({
    onSuccess: (data) => {
      if (data && onProgressUpdate) {
        const progressData = data as { progressPercent?: number; completed?: boolean };
        onProgressUpdate(progressData.progressPercent || 0, progressData.completed || false);
      }
    },
  });

  const markCompletedMutation = trpc.videoProgress.markCompleted.useMutation({
    onSuccess: () => {
      if (onProgressUpdate) {
        onProgressUpdate(100, true);
      }
    },
  });

  useEffect(() => {
    if (autoPlay && !isLocked && !isPlaying) {
      setIsPlaying(true);
    }
  }, [autoPlay, isLocked, isPlaying]);

  useEffect(() => {
    if (signedUrlQuery.error) {
      console.error("Error getting signed URL:", signedUrlQuery.error);
      setError("Failed to load video. Please try again.");
    }
  }, [signedUrlQuery.error]);

  const confirmPlayback = useCallback(() => {
    playbackConfirmedRef.current = true;
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const handleWebViewMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data) as {
          source?: string;
          event?: string;
          currentTime?: number;
        };
        if (msg?.source !== "wci-player") return;
        if (msg.event === "play") {
          confirmPlayback();
        }
        if (msg.event === "timeupdate" && typeof msg.currentTime === "number") {
          latestTimeRef.current = msg.currentTime;
          confirmPlayback();
        }
      } catch {
        // Non-JSON message from the embedded page - ignore.
      }
    },
    [confirmPlayback]
  );

  // On web the iframe talks to us through window messages (Bunny posts events
  // with a status payload), so the same confirm/track logic runs there.
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const onMessage = (e: MessageEvent) => {
      try {
        const msg = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (!msg || typeof msg !== "object") return;
        const event = (msg as { event?: string }).event;
        const time = (msg as { status?: { currentTime?: number } }).status?.currentTime;
        if (event === "play" || event === "timeupdate") {
          confirmPlayback();
        }
        if (typeof time === "number") {
          latestTimeRef.current = time;
        }
      } catch {
        // Ignore malformed messages.
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [confirmPlayback]);

  useEffect(() => {
    if (isPlaying && userId && dbVideoId && courseId && sectionId) {
      const videoDuration = durationSeconds ?? 0;

      progressIntervalRef.current = setInterval(() => {
        if (videoDuration <= 0) return;

        // Real playback time from the player.js bridge wins; otherwise fall
        // back to a monotonic 30s estimate like before.
        const realTime = latestTimeRef.current;
        estimateRef.current =
          realTime > estimateRef.current
            ? realTime
            : Math.min(estimateRef.current + 30, videoDuration);

        updateProgressMutation.mutate({
          userId,
          videoId: dbVideoId,
          courseId,
          sectionId,
          currentTime: Math.round(estimateRef.current),
          duration: videoDuration,
        });
      }, 30000);

      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, userId, dbVideoId, courseId, sectionId, durationSeconds]);

  const attemptPlay = useCallback(() => {
    if (Platform.OS === "web") {
      // Raw player.js protocol: the parent posts JSON commands to the iframe.
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ method: "play", value: "" }),
        "*"
      );
      return;
    }
    webViewRef.current?.injectJavaScript("if (window.wciPlay) { window.wciPlay(); } true;");
  }, []);

  const handlePlay = useCallback(() => {
    if (isLocked) {
      onUnlockPress?.();
      return;
    }
    setError(null);
    if (isPlaying) return;
    playbackConfirmedRef.current = false;
    setIsPlaying(true);

    // The player shell is usually already mounted and preloaded, so start it
    // directly through the player.js bridge. If the bridge is not ready or
    // does not confirm playback, fall back to reloading with autoplay.
    if (resolvedEmbedUrl && !autoPlay) {
      attemptPlay();
      fallbackTimerRef.current = setTimeout(() => {
        if (!playbackConfirmedRef.current) {
          console.log("[BunnyPlayer] Bridge play not confirmed, reloading with autoplay");
          setAutoplayRequested(true);
        }
      }, 1800);
    }
  }, [isLocked, onUnlockPress, isPlaying, resolvedEmbedUrl, autoPlay, attemptPlay]);

  const handleRetry = useCallback(() => {
    setError(null);
    signedUrlQuery.refetch();
  }, [signedUrlQuery]);

  const handleMarkComplete = useCallback(() => {
    if (userId && dbVideoId && courseId && sectionId) {
      markCompletedMutation.mutate({
        userId,
        videoId: dbVideoId,
        courseId,
        sectionId,
      });
    }
  }, [userId, dbVideoId, courseId, sectionId, markCompletedMutation]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const savedProgress = progressQuery.data;
  const isCompleted = savedProgress?.completed;
  const progressPercent = savedProgress?.progressPercent || 0;

  const buildPlayerSrc = (url: string, withAutoplay: boolean): string => {
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}preload=true${withAutoplay ? "&autoplay=true" : ""}`;
  };

  const withAutoplay = isPlaying && (autoPlay || autoplayRequested);
  const playerSrc = resolvedEmbedUrl
    ? buildPlayerSrc(resolvedEmbedUrl, withAutoplay)
    : null;

  const posterOverlay = (
    <>
      {Platform.OS !== "web" && !isLocked && (
        <View style={styles.protectionActiveBadge}>
          <ShieldAlert color={Colors.surface} size={12} />
          <Text style={styles.protectionActiveBadgeText}>Protected</Text>
        </View>
      )}
      {isCompleted ? (
        <View style={styles.completedBadge}>
          <CheckCircle color={Colors.surface} size={24} />
          <Text style={styles.completedBadgeText}>Completed</Text>
        </View>
      ) : progressPercent > 0 ? (
        <View style={styles.progressBadge}>
          <Clock color={Colors.surface} size={16} />
          <Text style={styles.progressBadgeText}>{progressPercent}% watched</Text>
        </View>
      ) : null}
      <View style={[styles.playButton, isCompleted && styles.playButtonCompleted]}>
        <Play color={Colors.surface} size={32} fill={Colors.surface} />
      </View>
      {title ? <Text style={styles.videoTitle}>{title}</Text> : null}
      {durationSeconds && durationSeconds > 0 ? (
        <Text style={styles.videoDuration}>{formatDuration(durationSeconds)}</Text>
      ) : null}
    </>
  );

  if (isLocked) {
    return (
      <TouchableOpacity
        style={styles.lockedContainer}
        onPress={onUnlockPress}
        activeOpacity={0.8}
      >
        <View style={styles.lockedOverlay}>
          <View style={styles.lockIconContainer}>
            <Lock color={Colors.surface} size={32} />
          </View>
          <Text style={styles.lockedTitle}>{title || "Video Locked"}</Text>
          <Text style={styles.lockedSubtitle}>
            Enroll in this course to watch
          </Text>
          <View style={styles.unlockButton}>
            <Text style={styles.unlockButtonText}>Unlock Access</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle color={Colors.error} size={32} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <RefreshCw color={Colors.surface} size={16} />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // The user asked to play but the embed URL is still resolving.
  if (!resolvedEmbedUrl && isPlaying) {
    if (signedUrlQuery.isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      );
    }
    return (
      <View style={styles.errorContainer}>
        <AlertCircle color={Colors.error} size={32} />
        <Text style={styles.errorText}>Video not available</Text>
      </View>
    );
  }

  // Embed URL not ready yet - plain poster shell while the (mount-time) signed
  // URL request finishes in the background.
  if (!resolvedEmbedUrl || !playerSrc) {
    return (
      <TouchableOpacity
        style={styles.thumbnailContainer}
        onPress={handlePlay}
        activeOpacity={0.9}
      >
        <View style={styles.placeholderThumbnail} />
        <View style={styles.playOverlay}>{posterOverlay}</View>
        {progressPercent > 0 && !isCompleted && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // Embed URL available: the player shell mounts once and stays mounted. While
  // paused it shows the Bunny poster behind our overlay, so pressing play
  // starts playback through the bridge with no reload and no network wait.
  return (
    <View style={styles.playerWrapper}>
      <View style={styles.playerContainer}>
        {Platform.OS === "web" ? (
          <iframe
            ref={iframeRef}
            src={playerSrc}
            style={{
              border: "none",
              width: "100%",
              height: "100%",
              position: "absolute" as const,
              top: 0,
              left: 0,
            }}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <WebView
            ref={webViewRef}
            source={{ html: buildEmbedHtml(playerSrc) }}
            style={styles.webView}
            allowsFullscreenVideo={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onMessage={handleWebViewMessage}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error("[BunnyPlayer] WebView error:", nativeEvent);
              setError("Failed to load video. Please try again.");
            }}
          />
        )}
        {!isPlaying && (
          <>
            {/* Touch catcher above the player so taps start playback instead
                of reaching the (paused) Bunny controls. */}
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={handlePlay}
            >
              <View style={styles.playOverlay}>{posterOverlay}</View>
              {progressPercent > 0 && !isCompleted && (
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
                </View>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
      <View style={styles.protectionNotice}>
        <ShieldAlert color={Platform.OS === "web" ? Colors.warning : Colors.secondary} size={14} />
        <Text style={Platform.OS === "web" ? styles.protectionNoticeText : styles.protectionNoticeTextActive}>
          {Platform.OS === "web"
            ? "Content protected - Screen recording disabled on mobile"
            : "Screen recording protection active"}
        </Text>
      </View>
      {userId && dbVideoId && !isCompleted && (
        <TouchableOpacity
          style={styles.markCompleteButton}
          onPress={handleMarkComplete}
          disabled={markCompletedMutation.isPending}
        >
          {markCompletedMutation.isPending ? (
            <ActivityIndicator size="small" color={Colors.surface} />
          ) : (
            <>
              <CheckCircle color={Colors.surface} size={18} />
              <Text style={styles.markCompleteText}>Mark as Complete</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const { width } = Dimensions.get("window");
const playerHeight = (width * 9) / 16;

const styles = StyleSheet.create({
  playerWrapper: {
    width: "100%",
  },
  playerContainer: {
    width: "100%",
    height: playerHeight,
    backgroundColor: "#000",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative" as const,
  },
  loadingContainer: {
    width: "100%",
    height: playerHeight,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorContainer: {
    width: "100%",
    height: playerHeight,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.surface,
  },
  lockedContainer: {
    width: "100%",
    height: playerHeight,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    overflow: "hidden",
  },
  lockedOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 12,
  },
  lockIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.surface,
    textAlign: "center",
  },
  lockedSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
  unlockButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  unlockButtonText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.surface,
  },
  thumbnailContainer: {
    width: "100%",
    height: playerHeight,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative" as const,
  },
  placeholderThumbnail: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1a1a2e",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playButtonCompleted: {
    backgroundColor: Colors.secondary,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.surface,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  videoDuration: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  webView: {
    flex: 1,
    backgroundColor: "#000",
  },
  completedBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.surface,
  },
  progressBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.surface,
  },
  progressBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  progressBar: {
    height: "100%",
    backgroundColor: Colors.primary,
  },
  markCompleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.secondary,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  markCompleteText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.surface,
  },
  protectionNotice: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.warning + "15",
    borderRadius: 8,
    marginTop: 8,
  },
  protectionNoticeText: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: "500" as const,
  },
  protectionNoticeTextActive: {
    fontSize: 11,
    color: Colors.secondary,
    fontWeight: "600" as const,
  },
  protectionActiveBadge: {
    position: "absolute" as const,
    top: 12,
    left: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: Colors.error,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 10,
  },
  protectionActiveBadgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.surface,
    textTransform: "uppercase" as const,
  },
});
