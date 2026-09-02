import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Plus, Save, X, Download, AlertTriangle } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import { VideoForm, initialVideoForm } from "@/types/admin";
import { trpc, warmUpApi, OFFLINE_MESSAGE } from "@/lib/trpc";
import VideoCard from "@/components/admin/VideoCard";

/** Bunny Stream video GUIDs look like a1b2c3d4-e5f6-7890-abcd-ef1234567890. */
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Last-synced video lists per course+section, so the manager paints instantly. */
const videosCacheKey = (courseId: string, sectionId: string) =>
  `wci_admin_videos_${courseId}_${sectionId}`;

/** Pulls a Bunny library + video id out of a pasted embed/iframe URL. */
function parseBunnyEmbed(value: string): { libraryId: string; videoId: string } | null {
  const match = value.match(/mediadelivery\.net\/(?:embed|play)\/(\d+)\/([0-9a-f-]{36})/i);
  if (!match) return null;
  return { libraryId: match[1], videoId: match[2] };
}

interface VideoManagerProps {
  selectedCourseId: string;
  selectedSectionId: string;
  editingId: string | null;
  showAddForm: boolean;
  form: VideoForm;
  onFormChange: (form: VideoForm) => void;
  onEditingIdChange: (id: string | null) => void;
  onShowAddFormChange: (show: boolean) => void;
  onShowBulkImport: () => void;
}

export default function VideoManager({
  selectedCourseId,
  selectedSectionId,
  editingId,
  showAddForm,
  form,
  onFormChange,
  onEditingIdChange,
  onShowAddFormChange,
  onShowBulkImport,
}: VideoManagerProps) {
  const videosQuery = trpc.videos.getAll.useQuery(
    {
      courseId: selectedCourseId,
      sectionId: selectedSectionId,
    },
    {
      // Keep the list snappy: a short stale window avoids refetching every
      // time the admin switches between sections, and failures retry quickly.
      staleTime: 60_000,
      retry: 2,
      refetchOnReconnect: true,
    },
  );

  const [cachedVideos, setCachedVideos] = useState<any[] | null>(null);

  // Load the last synced list for this section so it paints instantly, even
  // before (or instead of) the network answer.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(videosCacheKey(selectedCourseId, selectedSectionId))
      .then((stored) => {
        if (!cancelled) setCachedVideos(stored ? JSON.parse(stored) : null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedCourseId, selectedSectionId]);

  // Persist every successful fetch so the next visit is instant.
  useEffect(() => {
    const data = videosQuery.data as any[] | undefined;
    if (data && data.length > 0) {
      AsyncStorage.setItem(
        videosCacheKey(selectedCourseId, selectedSectionId),
        JSON.stringify(data),
      ).catch(() => {});
    }
  }, [videosQuery.data, selectedCourseId, selectedSectionId]);

  // Server data wins once it arrives; the saved list covers loading and
  // failures so the admin never stares at an empty section after a hiccup.
  const videos: any[] = videosQuery.data ?? cachedVideos ?? [];

  const createMutation = trpc.videos.create.useMutation({
    onSuccess: () => {
      videosQuery.refetch();
      onFormChange(initialVideoForm);
      onShowAddFormChange(false);
      Alert.alert("Success", "Video added successfully");
    },
    onError: (error) => {
      Alert.alert("Could Not Save Video", error.message);
    },
  });

  const updateMutation = trpc.videos.update.useMutation({
    onSuccess: () => {
      videosQuery.refetch();
      onEditingIdChange(null);
      onFormChange(initialVideoForm);
      Alert.alert("Success", "Video updated successfully");
    },
    onError: (error) => {
      Alert.alert("Could Not Update Video", error.message);
    },
  });

  const deleteMutation = trpc.videos.delete.useMutation({
    onSuccess: () => {
      videosQuery.refetch();
      Alert.alert("Success", "Video deleted successfully");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const handleSave = async () => {
    // Trim everything so a stray copy-paste space can't break playback later.
    const title = form.title.trim();
    const url = form.url.trim();
    const embedCode = form.embedCode.trim();
    let bunnyVideoId = form.bunnyVideoId.trim();
    let bunnyLibraryId = form.bunnyLibraryId.trim();
    const cloudflareVideoId = form.cloudflareVideoId.trim();
    const cloudflareAccountId = form.cloudflareAccountId.trim();

    // Admins often paste the whole Bunny embed URL - accept it and split it out.
    const pasted = parseBunnyEmbed(bunnyVideoId) ?? parseBunnyEmbed(url);
    if (pasted) {
      bunnyVideoId = pasted.videoId;
      bunnyLibraryId = bunnyLibraryId || pasted.libraryId;
    }

    if (!title) {
      Alert.alert("Missing Title", "Please enter a title for this video.");
      return;
    }

    if (!url && !embedCode && !bunnyVideoId && !cloudflareVideoId) {
      Alert.alert(
        "Missing Video Source",
        "Add a Video URL, an Embed Code, or a Bunny Library ID + Video ID.",
      );
      return;
    }

    if (bunnyVideoId && !bunnyLibraryId) {
      Alert.alert("Missing Library ID", "A Bunny Library ID is required with a Bunny Video ID.");
      return;
    }

    if (bunnyLibraryId && !/^\d+$/.test(bunnyLibraryId)) {
      Alert.alert("Invalid Library ID", "The Bunny Library ID should be numbers only, e.g. 123456.");
      return;
    }

    if (bunnyVideoId && !GUID_PATTERN.test(bunnyVideoId)) {
      Alert.alert(
        "Invalid Video ID",
        "The Bunny Video ID should be a GUID like a1b2c3d4-e5f6-7890-abcd-ef1234567890.",
      );
      return;
    }

    if (url && !/^https?:\/\//i.test(url)) {
      Alert.alert("Invalid URL", "The Video URL must start with http:// or https://");
      return;
    }

    // Wake a sleeping backend so the save doesn't burn its retries on a cold
    // start. Advisory only - the save is always attempted regardless of the
    // result, because the mutation itself is the real source of truth.
    await warmUpApi(2);

    const payload = {
      title,
      url,
      embedCode,
      bunnyVideoId,
      bunnyLibraryId,
      cloudflareVideoId,
      cloudflareAccountId,
      duration: form.duration.trim(),
      description: form.description.trim(),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      const videoCount = videos.length;
      createMutation.mutate({
        courseId: selectedCourseId,
        sectionId: selectedSectionId,
        ...payload,
        order: videoCount,
      });
    }
  };

  const handleEdit = (video: any) => {
    onEditingIdChange(video.id);
    onFormChange({
      title: video.title,
      url: video.url || "",
      embedCode: video.embedCode || "",
      bunnyVideoId: video.bunnyVideoId || "",
      bunnyLibraryId: video.bunnyLibraryId || "",
      cloudflareVideoId: video.cloudflareVideoId || "",
      cloudflareAccountId: video.cloudflareAccountId || "",
      duration: video.duration || "",
      description: video.description || "",
    });
    onShowAddFormChange(false);
  };

  const handleDelete = useCallback((id: string) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this video?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate({ id }),
      },
    ]);
  }, [deleteMutation]);

  const handleCancel = () => {
    onEditingIdChange(null);
    onShowAddFormChange(false);
    onFormChange(initialVideoForm);
  };

  return (
    <>
      {!editingId && !showAddForm && (
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => onShowAddFormChange(true)}
          >
            <Plus color={Colors.white} size={20} />
            <Text style={styles.addButtonText}>Add Manually</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, styles.importButton]}
            onPress={onShowBulkImport}
          >
            <Download color={Colors.white} size={20} />
            <Text style={styles.addButtonText}>Import from CDN</Text>
          </TouchableOpacity>
        </View>
      )}

      {(editingId || showAddForm) && (
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>
              {editingId ? "Edit Video" : "Add New Video"}
            </Text>
            <TouchableOpacity onPress={handleCancel}>
              <X color={Colors.textLight} size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(text) => onFormChange({ ...form, title: text })}
              placeholder="Video title"
              placeholderTextColor={Colors.textLight}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Video URL</Text>
            <TextInput
              style={styles.input}
              value={form.url}
              onChangeText={(text) => onFormChange({ ...form, url: text })}
              placeholder="https://example.com/video.mp4"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helperText}>For direct video files (mp4, etc.)</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Embed Code</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.embedCode}
              onChangeText={(text) => onFormChange({ ...form, embedCode: text })}
              placeholder="<iframe src=...></iframe>"
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={4}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helperText}>For HeyGen or other embed codes</Text>
          </View>

          <View style={styles.bunnySection}>
            <Text style={styles.bunnySectionTitle}>Bunny.net Stream (Recommended)</Text>
            <Text style={styles.bunnySectionSubtitle}>Secure video hosting with token authentication</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Bunny Library ID</Text>
              <TextInput
                style={styles.input}
                value={form.bunnyLibraryId}
                onChangeText={(text) => onFormChange({ ...form, bunnyLibraryId: text })}
                placeholder="e.g., 123456"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.helperText}>Found in your Bunny Stream library settings</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bunny Video ID</Text>
              <TextInput
                style={styles.input}
                value={form.bunnyVideoId}
                onChangeText={(text) => onFormChange({ ...form, bunnyVideoId: text })}
                placeholder="e.g., a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.helperText}>The video GUID from Bunny Stream</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Duration</Text>
            <TextInput
              style={styles.input}
              value={form.duration}
              onChangeText={(text) => onFormChange({ ...form, duration: text })}
              placeholder="e.g., 5:30"
              placeholderTextColor={Colors.textLight}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(text) => onFormChange({ ...form, description: text })}
              placeholder="Video description (optional)"
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Save color={Colors.white} size={20} />
                <Text style={styles.saveButtonText}>
                  {editingId ? "Update Video" : "Add Video"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Videos ({videos.length})</Text>

        {videosQuery.isError && (
          <View style={styles.errorCard}>
            <AlertTriangle color={Colors.error} size={18} />
            <View style={styles.errorTextWrap}>
              <Text style={styles.errorTitle}>
                {cachedVideos && cachedVideos.length > 0
                  ? "Couldn\u2019t refresh \u2014 showing your saved list"
                  : "Couldn\u2019t load videos"}
              </Text>
              <Text style={styles.errorMessage} numberOfLines={2}>
                {videosQuery.error?.message || OFFLINE_MESSAGE}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => videosQuery.refetch()}
              accessibilityRole="button"
              accessibilityLabel="Retry loading videos"
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {videosQuery.isLoading && !videos.length ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : videos.length > 0 ? (
          videos.map((video: any) => (
            <VideoCard
              key={video.id}
              video={video}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        ) : !videosQuery.isError ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No videos yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first video to get started
            </Text>
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 12,
  },
  actionButtonsRow: {
    flexDirection: "row" as const,
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  addButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  importButton: {
    backgroundColor: Colors.secondary,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600" as const,
    marginLeft: 8,
  },
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
  textArea: {
    height: 100,
    textAlignVertical: "top" as const,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  bunnySection: {
    backgroundColor: Colors.primary + "10",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  bunnySectionTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.primary,
    marginBottom: 4,
  },
  bunnySectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
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
  loadingContainer: {
    padding: 40,
    alignItems: "center" as const,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center" as const,
  },
  errorCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.error + "55",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  errorTextWrap: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.error,
    marginBottom: 2,
  },
  errorMessage: {
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  retryButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600" as const,
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
});
