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
import { WebView } from "react-native-webview";
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
  onProgressUpdate?: (progress: number, completed: boolean) => void;
}

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
  onProgressUpdate,
}: BunnyVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScreenCaptureProtected, setIsScreenCaptureProtected] = useState(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
          console.log("[BunnyPlayer] Screen capture protection is ACTIVE for video:", videoId);
        }
      } catch (err) {
        console.log("[BunnyPlayer] Error checking screen capture availability:", err);
      }
    };

    checkProtection();
  }, [videoId, isLocked]);

  const signedUrlQuery = trpc.bunny.getSignedUrl.useQuery(
    { videoId, libraryId },
    {
      enabled: !isLocked && isPlaying,
      staleTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  const videoInfoQuery = trpc.bunny.getVideoInfo.useQuery(
    { videoId, libraryId },
    {
      enabled: !isLocked,
      staleTime: 5 * 60 * 1000,
    }
  );

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
    if (autoPlay && !isLocked) {
      setIsPlaying(true);
    }
  }, [autoPlay, isLocked]);

  useEffect(() => {
    if (signedUrlQuery.error) {
      console.error("Error getting signed URL:", signedUrlQuery.error);
      setError("Failed to load video. Please try again.");
    }
  }, [signedUrlQuery.error]);

  useEffect(() => {
    if (isPlaying && userId && dbVideoId && courseId && sectionId) {
      const videoDuration = videoInfoQuery.data?.length || 0;
      const currentTime = progressQuery.data?.currentTime || 0;
      
      progressIntervalRef.current = setInterval(() => {
        if (videoDuration > 0) {
          const estimatedProgress = Math.min(currentTime + 30, videoDuration);
          
          updateProgressMutation.mutate({
            userId,
            videoId: dbVideoId,
            courseId,
            sectionId,
            currentTime: estimatedProgress,
            duration: videoDuration,
          });
        }
      }, 30000);

      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, userId, dbVideoId, courseId, sectionId, videoInfoQuery.data?.length]);

  const handlePlay = useCallback(() => {
    if (isLocked) {
      onUnlockPress?.();
      return;
    }
    setError(null);
    setIsPlaying(true);
  }, [isLocked, onUnlockPress]);

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

  if (!isPlaying) {
    return (
      <TouchableOpacity
        style={styles.thumbnailContainer}
        onPress={handlePlay}
        activeOpacity={0.9}
      >
        {videoInfoQuery.data?.thumbnailUrl ? (
          <View style={styles.thumbnailImage}>
            <View style={styles.thumbnailOverlay} />
          </View>
        ) : (
          <View style={styles.placeholderThumbnail} />
        )}
        <View style={styles.playOverlay}>
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
          {title && <Text style={styles.videoTitle}>{title}</Text>}
          {videoInfoQuery.data?.length ? (
            <Text style={styles.videoDuration}>
              {formatDuration(videoInfoQuery.data.length)}
            </Text>
          ) : null}
        </View>
        {progressPercent > 0 && !isCompleted && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (signedUrlQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading video...</Text>
      </View>
    );
  }

  if (!signedUrlQuery.data?.embedUrl) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle color={Colors.error} size={32} />
        <Text style={styles.errorText}>Video not available</Text>
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <View style={styles.playerWrapper}>
        <View style={styles.playerContainer}>
          <iframe
            src={signedUrlQuery.data.embedUrl + "&autoplay=true&preload=true"}
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
        </View>
        <View style={styles.protectionNotice}>
          <ShieldAlert color={Colors.warning} size={14} />
          <Text style={styles.protectionNoticeText}>Content protected - Screen recording disabled on mobile</Text>
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

  const embedHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
          iframe { width: 100%; height: 100%; border: none; }
        </style>
      </head>
      <body>
        <iframe 
          src="${signedUrlQuery.data.embedUrl}&autoplay=true&preload=true"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
        ></iframe>
      </body>
    </html>
  `;

  return (
    <View style={styles.playerWrapper}>
      {isScreenCaptureProtected && (
        <View style={styles.protectionBadge}>
          <ShieldAlert color={Colors.surface} size={12} />
          <Text style={styles.protectionBadgeText}>Protected</Text>
        </View>
      )}
      <View style={styles.playerContainer}>
        <WebView
          source={{ html: embedHtml }}
          style={styles.webView}
          allowsFullscreenVideo={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error("[BunnyPlayer] WebView error:", nativeEvent);
            setError("Failed to load video. Please try again.");
          }}
        />
      </View>
      <View style={styles.protectionNotice}>
        <ShieldAlert color={Colors.secondary} size={14} />
        <Text style={styles.protectionNoticeTextActive}>Screen recording protection active</Text>
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
  thumbnailImage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1a1a2e",
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
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
  webViewLoading: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center" as const,
    alignItems: "center" as const,
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
  protectionBadge: {
    position: "absolute" as const,
    top: 8,
    left: 8,
    zIndex: 10,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: Colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  protectionBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.surface,
    textTransform: "uppercase" as const,
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
