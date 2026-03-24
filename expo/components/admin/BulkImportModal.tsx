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
import { trpc } from "@/lib/trpc";

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

  const handleBulkImport = async () => {
    if (videoProvider === "bunny") {
      if (selectedBunnyVideos.size === 0 || !bunnyLibraryIdInput) {
        Alert.alert("Error", "Please select at least one video to import");
        return;
      }

      setIsImporting(true);
      const bunnyVideos = bunnyVideosQuery.data?.videos || [];
      const videosToImport = bunnyVideos.filter((v: BunnyVideo) => selectedBunnyVideos.has(v.videoId));
      const existingCount = videosQuery.data?.length || 0;
      let successCount = 0;
      let failedVideos: string[] = [];

      console.log("[Import] Starting import of", videosToImport.length, "videos");

      try {
        for (let i = 0; i < videosToImport.length; i++) {
          const video = videosToImport[i];
          console.log(`[Import] Importing video ${i + 1}/${videosToImport.length}:`, video.title);
          
          try {
            await createMutation.mutateAsync({
              courseId: selectedCourseId,
              sectionId: selectedSectionId,
              title: video.title,
              url: "",
              embedCode: "",
              bunnyVideoId: video.videoId,
              bunnyLibraryId: bunnyLibraryIdInput.trim(),
              cloudflareVideoId: "",
              cloudflareAccountId: "",
              duration: formatSecondsToTime(video.length),
              description: "",
              order: existingCount + i,
            });
            successCount++;
          } catch (err) {
            console.error(`[Import] Failed to import ${video.title}:`, err);
            failedVideos.push(video.title);
          }
        }
        
        if (successCount === videosToImport.length) {
          Alert.alert("Success", `Imported ${successCount} videos successfully`);
        } else if (successCount > 0) {
          Alert.alert(
            "Partial Success", 
            `Imported ${successCount} of ${videosToImport.length} videos.\n\nFailed: ${failedVideos.join(", ")}`
          );
        } else {
          Alert.alert("Error", `Failed to import all videos. Please check your database connection.`);
        }
        
        onClose();
        videosQuery.refetch();
      } catch (error) {
        console.error("[Import] Bulk import error:", error);
        Alert.alert("Error", error instanceof Error ? error.message : "Failed to import videos");
      } finally {
        setIsImporting(false);
      }
    } else {
      if (selectedCloudflareVideos.size === 0 || !cloudflareAccountIdInput) {
        Alert.alert("Error", "Please select at least one video to import");
        return;
      }

      setIsImporting(true);
      const cloudflareVideos = cloudflareVideosQuery.data?.videos || [];
      const videosToImport = cloudflareVideos.filter((v: CloudflareVideo) => selectedCloudflareVideos.has(v.videoId));
      const existingCount = videosQuery.data?.length || 0;

      try {
        for (let i = 0; i < videosToImport.length; i++) {
          const video = videosToImport[i];
          await createMutation.mutateAsync({
            courseId: selectedCourseId,
            sectionId: selectedSectionId,
            title: video.title,
            url: "",
            embedCode: "",
            bunnyVideoId: "",
            bunnyLibraryId: "",
            cloudflareVideoId: video.videoId,
            cloudflareAccountId: cloudflareAccountIdInput,
            duration: formatSecondsToTime(video.length),
            description: "",
            order: existingCount + i,
          });
        }
        Alert.alert("Success", `Imported ${videosToImport.length} videos successfully`);
        onClose();
        videosQuery.refetch();
      } catch {
        Alert.alert("Error", "Failed to import some videos");
      } finally {
        setIsImporting(false);
      }
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
            <ActivityIndicator color={Colors.white} />
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
            <ActivityIndicator color={Colors.white} />
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
