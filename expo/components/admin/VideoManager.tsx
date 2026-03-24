import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Plus, Save, X, Download } from "lucide-react-native";
import Colors from "@/constants/colors";
import { VideoForm, initialVideoForm } from "@/types/admin";
import { trpc } from "@/lib/trpc";
import VideoCard from "@/components/admin/VideoCard";

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
  const videosQuery = trpc.videos.getAll.useQuery({
    courseId: selectedCourseId,
    sectionId: selectedSectionId,
  });

  const createMutation = trpc.videos.create.useMutation({
    onSuccess: () => {
      videosQuery.refetch();
      onFormChange(initialVideoForm);
      onShowAddFormChange(false);
      Alert.alert("Success", "Video added successfully");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
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
      Alert.alert("Error", error.message);
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

  const handleSave = () => {
    if (!form.title) {
      Alert.alert("Error", "Title is required");
      return;
    }

    if (!form.url && !form.embedCode && !form.bunnyVideoId) {
      Alert.alert("Error", "Either Video URL, Embed Code, or Bunny Video ID is required");
      return;
    }

    if (form.bunnyVideoId && !form.bunnyLibraryId) {
      Alert.alert("Error", "Bunny Library ID is required when using Bunny Video ID");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        title: form.title,
        url: form.url,
        embedCode: form.embedCode,
        bunnyVideoId: form.bunnyVideoId,
        bunnyLibraryId: form.bunnyLibraryId,
        cloudflareVideoId: form.cloudflareVideoId,
        cloudflareAccountId: form.cloudflareAccountId,
        duration: form.duration,
        description: form.description,
      });
    } else {
      const videoCount = videosQuery.data?.length || 0;
      createMutation.mutate({
        courseId: selectedCourseId,
        sectionId: selectedSectionId,
        title: form.title,
        url: form.url,
        embedCode: form.embedCode,
        bunnyVideoId: form.bunnyVideoId,
        bunnyLibraryId: form.bunnyLibraryId,
        cloudflareVideoId: form.cloudflareVideoId,
        cloudflareAccountId: form.cloudflareAccountId,
        duration: form.duration,
        description: form.description,
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
        <Text style={styles.sectionTitle}>
          Videos ({videosQuery.data?.length || 0})
        </Text>

        {videosQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : videosQuery.data && videosQuery.data.length > 0 ? (
          videosQuery.data.map((video: any) => (
            <VideoCard
              key={video.id}
              video={video}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No videos yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first video to get started
            </Text>
          </View>
        )}
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
