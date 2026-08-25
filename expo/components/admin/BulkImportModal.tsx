import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { X, Video, Cloud, Check, Download, ChevronRight, AlertCircle } from "lucide-react-native";
import Colors from "@/constants/colors";
import { BunnyVideo, CloudflareVideo, VideoProvider, ConnectionStatus } from "@/types/admin";
import { trpc, warmUpApi } from "@/lib/trpc";

/** How many times a single video import is retried before giving up. */
const MAX_IMPORT_ATTEMPTS = 3;

interface ImportProgress {
  current: number;
  total: number;
  title: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Turns any thrown value into a message that is safe to show an admin. */
function toMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Unknown error";
}

interface BulkImportModalProps {
  selectedCourseId: string;
  selectedSectionId: string;
  selectedCourseName: string;
  selectedSectionName: string;
  onClose: () => void;
  onChangeDestination: () => void;
}

export default function BulkImportModal({
  selectedCourseId,
  selectedSectionId,
  selectedCourseName,
  selectedSectionName,
  onClose,
  onChangeDestination,
}: BulkImportModalProps) {
  const [videoProvider, setVideoProvider] = useState<VideoProvider>("bunny");
  const [bunnyLibraryIdInput, setBunnyLibraryIdInput] = useState("");
  const [cloudflareAccountIdInput, setCloudflareAccountIdInput] = useState("");
  const [selectedBunnyVideos, setSelectedBunnyVideos] = useState<Set<string>>(new Set());
  const [selectedCloudflareVideos, setSelectedCloudflareVideos] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);

  const videosQuery = trpc.videos.getAll.useQuery({
    courseId: selectedCourseId,
    sectionId: selectedSectionId,
  });

  const createMutation = trpc.videos.create.useMutation();

  const bunnyVideosQuery = trpc.bunny.listVideos.useQuery(
    { libraryId: bunnyLibraryIdInput, page: 1, itemsPerPage: 100 },
    { 
      enabled: videoProvider === "bunny" && bunnyLibraryIdInput.length > 0 && connectionStatus?.success === true,
      retry: 1,
      retryDelay: 500,
      staleTime: 0,
      refetchOnMount: true,
    }
  );

  const cloudflareVideosQuery = trpc.cloudflare.listVideos.useQuery(
    { accountId: cloudflareAccountIdInput, page: 1, itemsPerPage: 100 },
    { 
      enabled: videoProvider === "cloudflare" && cloudflareAccountIdInput.length > 0 && connectionStatus?.success === true,
      retry: 1,
      retryDelay: 500,
      staleTime: 0,
      refetchOnMount: true,
    }
  );

  const testBunnyConnectionQuery = trpc.bunny.testConnection.useQuery(
    { libraryId: bunnyLibraryIdInput },
    { enabled: false }
  );

  const testCloudflareConnectionQuery = trpc.cloudflare.testConnection.useQuery(
    { accountId: cloudflareAccountIdInput },
    { enabled: false }
  );

  const formatSecondsToTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTestConnection = async () => {
    setConnectionStatus(null);
    try {
      if (videoProvider === "bunny") {
        const result = await testBunnyConnectionQuery.refetch();
        if (result.data) {
          setConnectionStatus(result.data);
          if (result.data.success) {
            Alert.alert("Success", `Connected to Bunny! Found ${result.data.details.videoCount} videos in library.`);
            setTimeout(() => {
              bunnyVideosQuery.refetch();
            }, 100);
          } else {
            Alert.alert("Connection Failed", result.data.error || "Unknown error");
          }
        }
      } else {
        const result = await testCloudflareConnectionQuery.refetch();
        if (result.data) {
          setConnectionStatus(result.data);
          if (result.data.success) {
            Alert.alert("Success", `Connected to Cloudflare! Found ${result.data.details.totalVideos} videos.`);
            setTimeout(() => {
              cloudflareVideosQuery.refetch();
            }, 100);
          } else {
            Alert.alert("Connection Failed", result.data.error || "Unknown error");
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setConnectionStatus({ success: false, error: errorMessage, details: null });
      Alert.alert("Error", errorMessage);
    }
  };

  const toggleBunnyVideoSelection = (videoId: string) => {
    setSelectedBunnyVideos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  const toggleCloudflareVideoSelection = (videoId: string) => {
    setSelectedCloudflareVideos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  /**
   * Imports one video, retrying transient network/server failures with backoff
   * so a single blip doesn't abandon the whole batch.
   */
  const importOneVideo = async (
    video: BunnyVideo | CloudflareVideo,
    order: number,
    isBunny: boolean,
  ): Promise<void> => {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_IMPORT_ATTEMPTS; attempt++) {
      try {
        await createMutation.mutateAsync({
          courseId: selectedCourseId,
          sectionId: selectedSectionId,
          title: video.title,
          url: "",
          embedCode: "",
          bunnyVideoId: isBunny ? video.videoId : "",
          bunnyLibraryId: isBunny ? bunnyLibraryIdInput.trim() : "",
          cloudflareVideoId: isBunny ? "" : video.videoId,
          cloudflareAccountId: isBunny ? "" : cloudflareAccountIdInput.trim(),
          duration: formatSecondsToTime(video.length),
          description: "",
          order,
        });
        return;
      } catch (error) {
        lastError = error;
        console.error(
          `[Import] Attempt ${attempt}/${MAX_IMPORT_ATTEMPTS} failed for "${video.title}":`,
          error,
        );
        if (attempt < MAX_IMPORT_ATTEMPTS) {
          await sleep(800 * attempt);
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(toMessage(lastError));
  };

  const handleBulkImport = async () => {
    const isBunny = videoProvider === "bunny";

    if (isBunny && (selectedBunnyVideos.size === 0 || !bunnyLibraryIdInput)) {
      Alert.alert("Error", "Please select at least one video to import");
      return;
    }
    if (!isBunny && (selectedCloudflareVideos.size === 0 || !cloudflareAccountIdInput)) {
      Alert.alert("Error", "Please select at least one video to import");
      return;
    }

    setIsImporting(true);
    setImportProgress(null);

    try {
      // Wake a sleeping backend before the batch so the first video doesn't
      // burn its retries on a cold start. Advisory only - the import always
      // proceeds, and each video retries individually if the server is slow.
      await warmUpApi(3);

      const selected: (BunnyVideo | CloudflareVideo)[] = isBunny
        ? (bunnyVideosQuery.data?.videos ?? []).filter((v: BunnyVideo) =>
            selectedBunnyVideos.has(v.videoId),
          )
        : (cloudflareVideosQuery.data?.videos ?? []).filter((v: CloudflareVideo) =>
            selectedCloudflareVideos.has(v.videoId),
          );

      // Re-read the section first so retrying a partially-failed batch never
      // creates duplicate rows for videos that already landed.
      const refreshed = await videosQuery.refetch();
      const existing = refreshed.data ?? [];
      const existingIds = new Set(
        existing
          .map((v: { bunnyVideoId?: string; cloudflareVideoId?: string }) =>
            isBunny ? v.bunnyVideoId : v.cloudflareVideoId,
          )
          .filter((id): id is string => Boolean(id)),
      );

      const videosToImport = selected.filter((v) => !existingIds.has(v.videoId));
      const skippedCount = selected.length - videosToImport.length;

      if (videosToImport.length === 0) {
        Alert.alert(
          "Already Imported",
          "Every selected video is already in this section, so there is nothing to import.",
        );
        onClose();
        return;
      }

      let order = existing.length;
      let successCount = 0;
      const failed: { title: string; reason: string }[] = [];

      console.log("[Import] Starting import of", videosToImport.length, "videos");

      for (let i = 0; i < videosToImport.length; i++) {
        const video = videosToImport[i];
        setImportProgress({ current: i + 1, total: videosToImport.length, title: video.title });

        try {
          await importOneVideo(video, order, isBunny);
          order += 1;
          successCount += 1;
        } catch (error) {
          failed.push({ title: video.title, reason: toMessage(error) });
        }
      }

      await videosQuery.refetch();

      const skippedNote =
        skippedCount > 0 ? `\n\nSkipped ${skippedCount} already imported.` : "";

      if (failed.length === 0) {
        Alert.alert(
          "Success",
          `Imported ${successCount} video${successCount === 1 ? "" : "s"} successfully.${skippedNote}`,
        );
        onClose();
        return;
      }

      // Leave the modal open so the admin can retry just the failures. Videos
      // that already saved are skipped automatically on the next run.
      const failureList = failed
        .slice(0, 5)
        .map((f) => `\u2022 ${f.title}: ${f.reason}`)
        .join("\n");
      const more = failed.length > 5 ? `\n\u2026and ${failed.length - 5} more.` : "";

      Alert.alert(
        successCount > 0 ? "Partially Imported" : "Import Failed",
        `${successCount} of ${videosToImport.length} imported.${skippedNote}\n\n` +
          `Failed:\n${failureList}${more}\n\n` +
          "Tap Import again to retry only the ones that failed.",
      );
    } catch (error) {
      console.error("[Import] Bulk import error:", error);
      Alert.alert("Error", toMessage(error));
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  return (
    <View style={styles.formCard}>
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>Import Videos</Text>
        <TouchableOpacity onPress={onClose}>
          <X color={Colors.textLight} size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.importDestination}>
        <View style={styles.importDestinationHeader}>
          <AlertCircle color={Colors.primary} size={20} />
          <Text style={styles.importDestinationLabel}>Videos will be added to:</Text>
        </View>
        <View style={styles.importDestinationBox}>
          <Text style={styles.importDestinationCourse}>{selectedCourseName}</Text>
          <ChevronRight color={Colors.textLight} size={16} />
          <Text style={styles.importDestinationSection}>{selectedSectionName}</Text>
        </View>
        <TouchableOpacity 
          style={styles.changeDestinationButton}
          onPress={onChangeDestination}
        >
          <Text style={styles.changeDestinationText}>← Change destination section</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Video Provider</Text>
        <View style={styles.providerSelector}>
          <TouchableOpacity
            style={[styles.providerChip, videoProvider === "bunny" && styles.providerChipActive]}
            onPress={() => {
              setVideoProvider("bunny");
              setConnectionStatus(null);
            }}
          >
            <Video color={videoProvider === "bunny" ? Colors.white : Colors.text} size={16} />
            <Text style={[styles.providerChipText, videoProvider === "bunny" && styles.providerChipTextActive]}>Bunny.net</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.providerChip, videoProvider === "cloudflare" && styles.providerChipActive, { backgroundColor: videoProvider === "cloudflare" ? "#f48120" : Colors.background }]}
            onPress={() => {
              setVideoProvider("cloudflare");
              setConnectionStatus(null);
            }}
          >
            <Cloud color={videoProvider === "cloudflare" ? Colors.white : Colors.text} size={16} />
            <Text style={[styles.providerChipText, videoProvider === "cloudflare" && styles.providerChipTextActive]}>Cloudflare</Text>
          </TouchableOpacity>
        </View>
      </View>

      {videoProvider === "bunny" && (
        <View style={styles.formGroup}>
          <Text style={styles.label}>Bunny Library ID *</Text>
          <TextInput
            style={styles.input}
            value={bunnyLibraryIdInput}
            onChangeText={(text) => {
              setBunnyLibraryIdInput(text.trim());
              setConnectionStatus(null);
            }}
            placeholder="Enter your Bunny Stream Library ID"
            placeholderTextColor={Colors.textLight}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.helperText}>Find this in your Bunny.net Stream dashboard (e.g., 123456)</Text>
        </View>
      )}

      {videoProvider === "cloudflare" && (
        <View style={styles.formGroup}>
          <Text style={styles.label}>Cloudflare Account ID *</Text>
          <TextInput
            style={styles.input}
            value={cloudflareAccountIdInput}
            onChangeText={(text) => {
              setCloudflareAccountIdInput(text);
              setConnectionStatus(null);
            }}
            placeholder="Enter your Cloudflare Account ID"
            placeholderTextColor={Colors.textLight}
            autoCapitalize="none"
          />
          <Text style={styles.helperText}>Find this in your Cloudflare dashboard URL</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.testButton, (testBunnyConnectionQuery.isFetching || testCloudflareConnectionQuery.isFetching) && styles.testButtonDisabled]}
        onPress={handleTestConnection}
        disabled={(videoProvider === "bunny" ? testBunnyConnectionQuery.isFetching || !bunnyLibraryIdInput : testCloudflareConnectionQuery.isFetching || !cloudflareAccountIdInput)}
      >
        {(testBunnyConnectionQuery.isFetching || testCloudflareConnectionQuery.isFetching) ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <Text style={styles.testButtonText}>Test Connection</Text>
        )}
      </TouchableOpacity>

      {connectionStatus && (
        <View style={[styles.connectionStatus, connectionStatus.success ? styles.connectionSuccess : styles.connectionError]}>
          <Text style={styles.connectionStatusTitle}>
            {connectionStatus.success ? "✓ Connected" : "✗ Connection Failed"}
          </Text>
          {connectionStatus.error && (
            <Text style={styles.connectionStatusText}>{connectionStatus.error}</Text>
          )}
          {connectionStatus.details && (
            <View style={styles.connectionDetails}>
              {videoProvider === "bunny" && (
                <>
                  <Text style={styles.connectionDetailText}>Library ID: {connectionStatus.details.libraryId}</Text>
                  <Text style={styles.connectionDetailText}>API Key configured: {connectionStatus.details.apiKeyConfigured ? "Yes" : "No"}</Text>
                  {connectionStatus.details.apiKeyLength && (
                    <Text style={styles.connectionDetailText}>API Key length: {connectionStatus.details.apiKeyLength} chars</Text>
                  )}
                  {connectionStatus.success && connectionStatus.details.videoCount !== null && (
                    <Text style={styles.connectionDetailText}>Videos in library: {connectionStatus.details.videoCount}</Text>
                  )}
                </>
              )}
              {videoProvider === "cloudflare" && (
                <>
                  <Text style={styles.connectionDetailText}>Account ID: {connectionStatus.details.accountId}</Text>
                  <Text style={styles.connectionDetailText}>API Token configured: {connectionStatus.details.apiTokenConfigured ? "Yes" : "No"}</Text>
                  {connectionStatus.success && connectionStatus.details.totalVideos !== null && (
                    <Text style={styles.connectionDetailText}>Total videos: {connectionStatus.details.totalVideos}</Text>
                  )}
                </>
              )}
              {connectionStatus.details.httpStatus !== undefined && (
                <Text style={styles.connectionDetailText}>HTTP Status: {connectionStatus.details.httpStatus}</Text>
              )}
            </View>
          )}
        </View>
      )}

      {connectionStatus?.success && videoProvider === "bunny" && bunnyVideosQuery.isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading videos from Bunny...</Text>
        </View>
      )}

      {connectionStatus?.success && videoProvider === "cloudflare" && cloudflareVideosQuery.isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={"#f48120"} />
          <Text style={styles.loadingText}>Loading videos from Cloudflare...</Text>
        </View>
      )}

      {videoProvider === "bunny" && bunnyVideosQuery.isError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading videos</Text>
          <Text style={styles.errorSubtext}>
            {bunnyVideosQuery.error?.message || "Failed to connect to Bunny. Please check your Library ID and API key."}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => bunnyVideosQuery.refetch()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {videoProvider === "cloudflare" && cloudflareVideosQuery.isError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading videos</Text>
          <Text style={styles.errorSubtext}>
            {cloudflareVideosQuery.error?.message || "Failed to connect to Cloudflare. Please check your Account ID and API token."}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => cloudflareVideosQuery.refetch()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {videoProvider === "bunny" && bunnyVideosQuery.data && bunnyVideosQuery.data.videos.length > 0 && (
        <View style={styles.videosList}>
          <Text style={styles.sectionTitle}>
            Select Videos ({selectedBunnyVideos.size} selected)
          </Text>
          {bunnyVideosQuery.data.videos.map((video: BunnyVideo) => (
            <TouchableOpacity
              key={video.videoId}
              style={[
                styles.videoItem,
                selectedBunnyVideos.has(video.videoId) && styles.videoItemSelected,
              ]}
              onPress={() => toggleBunnyVideoSelection(video.videoId)}
            >
              <View style={styles.videoCheckbox}>
                {selectedBunnyVideos.has(video.videoId) && (
                  <Check color={Colors.white} size={16} />
                )}
              </View>
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle} numberOfLines={2}>
                  {video.title}
                </Text>
                <Text style={styles.videoDuration}>
                  {formatSecondsToTime(video.length)} • {video.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {videoProvider === "cloudflare" && cloudflareVideosQuery.data && cloudflareVideosQuery.data.videos.length > 0 && (
        <View style={styles.videosList}>
          <Text style={styles.sectionTitle}>
            Select Videos ({selectedCloudflareVideos.size} selected)
          </Text>
          {cloudflareVideosQuery.data.videos.map((video: CloudflareVideo) => (
            <TouchableOpacity
              key={video.videoId}
              style={[
                styles.videoItem,
                selectedCloudflareVideos.has(video.videoId) && styles.cloudflareVideoItemSelected,
              ]}
              onPress={() => toggleCloudflareVideoSelection(video.videoId)}
            >
              <View style={[styles.videoCheckbox, selectedCloudflareVideos.has(video.videoId) && styles.cloudflareCheckbox]}>
                {selectedCloudflareVideos.has(video.videoId) && (
                  <Check color={Colors.white} size={16} />
                )}
              </View>
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle} numberOfLines={2}>
                  {video.title}
                </Text>
                <Text style={styles.videoDuration}>
                  {formatSecondsToTime(video.length)} • {video.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {videoProvider === "bunny" && bunnyVideosQuery.data && bunnyVideosQuery.data.videos.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No videos found</Text>
          <Text style={styles.emptySubtext}>Check your Library ID or upload videos to Bunny</Text>
        </View>
      )}

      {videoProvider === "cloudflare" && cloudflareVideosQuery.data && cloudflareVideosQuery.data.videos.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No videos found</Text>
          <Text style={styles.emptySubtext}>Check your Account ID or upload videos to Cloudflare Stream</Text>
        </View>
      )}

      {videoProvider === "bunny" && selectedBunnyVideos.size > 0 && (
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleBulkImport}
          disabled={isImporting}
        >
          {isImporting ? (
            <>
              <ActivityIndicator color={Colors.white} />
              <Text style={styles.saveButtonText}>
                {importProgress
                  ? `Importing ${importProgress.current} of ${importProgress.total}\u2026`
                  : "Preparing\u2026"}
              </Text>
            </>
          ) : (
            <>
              <Download color={Colors.white} size={20} />
              <Text style={styles.saveButtonText}>
                Import {selectedBunnyVideos.size} Video{selectedBunnyVideos.size > 1 ? "s" : ""}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {videoProvider === "cloudflare" && selectedCloudflareVideos.size > 0 && (
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: "#f48120" }]}
          onPress={handleBulkImport}
          disabled={isImporting}
        >
          {isImporting ? (
            <>
              <ActivityIndicator color={Colors.white} />
              <Text style={styles.saveButtonText}>
                {importProgress
                  ? `Importing ${importProgress.current} of ${importProgress.total}\u2026`
                  : "Preparing\u2026"}
              </Text>
            </>
          ) : (
            <>
              <Download color={Colors.white} size={20} />
              <Text style={styles.saveButtonText}>
                Import {selectedCloudflareVideos.size} Video{selectedCloudflareVideos.size > 1 ? "s" : ""}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  formCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  importDestination: {
    backgroundColor: Colors.primary + "10",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: "dashed" as const,
  },
  importDestinationHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 12,
  },
  importDestinationLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  importDestinationBox: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  importDestinationCourse: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
  },
  importDestinationSection: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primary,
    flex: 1,
  },
  changeDestinationButton: {
    alignSelf: "flex-start" as const,
  },
  changeDestinationText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "500" as const,
  },
  providerSelector: {
    flexDirection: "row" as const,
    gap: 12,
  },
  providerChip: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  providerChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  providerChipText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.text,
  },
  providerChipTextActive: {
    color: Colors.white,
  },
  testButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center" as const,
    marginBottom: 16,
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  connectionStatus: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  connectionSuccess: {
    backgroundColor: "#d4edda",
    borderWidth: 1,
    borderColor: "#c3e6cb",
  },
  connectionError: {
    backgroundColor: "#f8d7da",
    borderWidth: 1,
    borderColor: "#f5c6cb",
  },
  connectionStatusTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: 8,
    color: Colors.text,
  },
  connectionStatusText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  connectionDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  connectionDetailText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center" as const,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 12,
  },
  errorContainer: {
    padding: 24,
    alignItems: "center" as const,
    backgroundColor: Colors.error + "10",
    borderRadius: 12,
    marginVertical: 12,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.error,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: "center" as const,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  videosList: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 12,
  },
  videoItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  videoItemSelected: {
    backgroundColor: Colors.primary + "15",
    borderColor: Colors.primary,
  },
  cloudflareVideoItemSelected: {
    backgroundColor: "#f4812015",
    borderColor: "#f48120",
  },
  videoCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginRight: 12,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.primary,
  },
  cloudflareCheckbox: {
    backgroundColor: "#f48120",
    borderColor: "#f48120",
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  videoDuration: {
    fontSize: 12,
    color: Colors.textLight,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center" as const,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
  },
  saveButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600" as const,
    marginLeft: 8,
  },
});
