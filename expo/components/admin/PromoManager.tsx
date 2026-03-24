import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Trash2, Edit2, Plus, Save, X, Youtube, Info } from "lucide-react-native";
import Colors from "@/constants/colors";
import { FeaturedVideoForm, initialFeaturedVideoForm } from "@/types/admin";
import { trpc } from "@/lib/trpc";

interface PromoManagerProps {
  editingId: string | null;
  showAddForm: boolean;
  form: FeaturedVideoForm;
  onFormChange: (form: FeaturedVideoForm) => void;
  onEditingIdChange: (id: string | null) => void;
  onShowAddFormChange: (show: boolean) => void;
}

export default function PromoManager({
  editingId,
  showAddForm,
  form,
  onFormChange,
  onEditingIdChange,
  onShowAddFormChange,
}: PromoManagerProps) {
  const featuredVideosQuery = trpc.featuredVideos.getAll.useQuery({ activeOnly: false });

  const createMutation = trpc.featuredVideos.create.useMutation({
    onSuccess: () => {
      featuredVideosQuery.refetch();
      onFormChange(initialFeaturedVideoForm);
      onShowAddFormChange(false);
      Alert.alert("Success", "Featured video added successfully");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const updateMutation = trpc.featuredVideos.update.useMutation({
    onSuccess: () => {
      featuredVideosQuery.refetch();
      onEditingIdChange(null);
      onFormChange(initialFeaturedVideoForm);
      Alert.alert("Success", "Featured video updated successfully");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const deleteMutation = trpc.featuredVideos.delete.useMutation({
    onSuccess: () => {
      featuredVideosQuery.refetch();
      Alert.alert("Success", "Featured video deleted successfully");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const handleSave = () => {
    if (!form.youtubeId) {
      Alert.alert("Error", "YouTube Video ID is required");
      return;
    }
    if (!form.title) {
      Alert.alert("Error", "Title is required");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        youtubeId: form.youtubeId,
        title: form.title,
        duration: form.duration,
        description: form.description,
        isActive: form.isActive,
      });
    } else {
      const videoCount = featuredVideosQuery.data?.length || 0;
      createMutation.mutate({
        youtubeId: form.youtubeId,
        title: form.title,
        duration: form.duration,
        description: form.description,
        isActive: form.isActive,
        order: videoCount,
      });
    }
  };

  const handleEdit = (video: any) => {
    onEditingIdChange(video.id);
    onFormChange({
      youtubeId: video.youtubeId || "",
      title: video.title || "",
      duration: video.duration || "",
      description: video.description || "",
      isActive: video.isActive ?? true,
    });
    onShowAddFormChange(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this featured video?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate({ id }),
      },
    ]);
  };

  const handleCancel = () => {
    onEditingIdChange(null);
    onShowAddFormChange(false);
    onFormChange(initialFeaturedVideoForm);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Youtube color="#FF0000" size={22} />
          <Text style={styles.sectionTitle}>Featured Videos</Text>
        </View>
      </View>
      <Text style={[styles.sectionHint, { marginBottom: 16, marginLeft: 0 }]}>
        Manage YouTube videos displayed in the Featured Offers section on the homepage. Users can switch between these videos.
      </Text>

      {!editingId && !showAddForm && (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: "#FF0000", marginHorizontal: 0, marginBottom: 16 }]}
          onPress={() => onShowAddFormChange(true)}
        >
          <Plus color={Colors.white} size={20} />
          <Text style={styles.addButtonText}>Add Featured Video</Text>
        </TouchableOpacity>
      )}

      {(editingId || showAddForm) && (
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>
              {editingId ? "Edit Featured Video" : "Add Featured Video"}
            </Text>
            <TouchableOpacity onPress={handleCancel}>
              <X color={Colors.textLight} size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>YouTube Video ID *</Text>
            <TextInput
              style={styles.input}
              value={form.youtubeId}
              onChangeText={(text) => onFormChange({ ...form, youtubeId: text })}
              placeholder="e.g., dQw4w9WgXcQ"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helperText}>
              The video ID from the YouTube URL (youtube.com/watch?v=VIDEO_ID)
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Video Title *</Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(text) => onFormChange({ ...form, title: text })}
              placeholder="Getting Started with Credit Repair"
              placeholderTextColor={Colors.textLight}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Duration</Text>
            <TextInput
              style={styles.input}
              value={form.duration}
              onChangeText={(text) => onFormChange({ ...form, duration: text })}
              placeholder="e.g., 5:32"
              placeholderTextColor={Colors.textLight}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(text) => onFormChange({ ...form, description: text })}
              placeholder="Brief description of the video"
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Active</Text>
              <Switch
                value={form.isActive}
                onValueChange={(value) => onFormChange({ ...form, isActive: value })}
                trackColor={{ false: Colors.border, true: Colors.success + "60" }}
                thumbColor={form.isActive ? Colors.success : Colors.textLight}
              />
            </View>
            <Text style={styles.helperText}>
              Only active videos are shown on the homepage
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: "#FF0000" }]}
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

      <View style={styles.promoHelpSection}>
        <Info color={Colors.primary} size={18} />
        <View style={styles.promoHelpContent}>
          <Text style={styles.promoHelpTitle}>How to get a YouTube Video ID</Text>
          <Text style={styles.promoHelpText}>
            {"1. Go to the YouTube video you want to use\n"}
            {"2. Copy the URL (e.g., https://youtube.com/watch?v=dQw4w9WgXcQ)\n"}
            {"3. The video ID is the part after \"v=\" (dQw4w9WgXcQ)"}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
        Featured Videos ({featuredVideosQuery.data?.length || 0})
      </Text>

      {featuredVideosQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF0000" />
        </View>
      ) : featuredVideosQuery.data && featuredVideosQuery.data.length > 0 ? (
        featuredVideosQuery.data.map((video: any, index: number) => (
          <View key={video.id} style={[styles.videoCard, !video.isActive && styles.inactiveCard]}>
            <View style={styles.videoInfo}>
              <View style={styles.featuredVideoHeader}>
                <Text style={styles.featuredVideoOrder}>#{index + 1}</Text>
                {!video.isActive && (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText}>INACTIVE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.videoTitle}>{video.title}</Text>
              <View style={styles.featuredVideoMeta}>
                <Youtube color="#FF0000" size={14} />
                <Text style={styles.featuredVideoId}>{video.youtubeId}</Text>
                {video.duration && (
                  <Text style={styles.videoDuration}>• {video.duration}</Text>
                )}
              </View>
              {video.description ? (
                <Text style={styles.videoDescription} numberOfLines={2}>
                  {video.description}
                </Text>
              ) : null}
            </View>
            <View style={styles.videoActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleEdit(video)}
              >
                <Edit2 color={Colors.primary} size={20} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDelete(video.id)}
              >
                <Trash2 color={Colors.error} size={20} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No featured videos yet</Text>
          <Text style={styles.emptySubtext}>
            Add your first featured video to display on the homepage
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.textLight,
    marginLeft: 30,
  },
  addButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600" as const,
    marginLeft: 8,
  },
  formCard: {
    backgroundColor: Colors.surface,
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
  switchRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
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
  promoHelpSection: {
    flexDirection: "row" as const,
    backgroundColor: Colors.primary + "08",
    padding: 14,
    borderRadius: 10,
    gap: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
  },
  promoHelpContent: {
    flex: 1,
  },
  promoHelpTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 6,
  },
  promoHelpText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  videoCard: {
    flexDirection: "row" as const,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inactiveCard: {
    opacity: 0.6,
    backgroundColor: Colors.background,
  },
  videoInfo: {
    flex: 1,
    marginRight: 12,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  videoDuration: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  videoDescription: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
  },
  videoActions: {
    justifyContent: "center" as const,
  },
  actionButton: {
    padding: 8,
    marginBottom: 8,
  },
  featuredVideoHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 4,
  },
  featuredVideoOrder: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#FF0000",
    backgroundColor: "#FF000015",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadge: {
    backgroundColor: Colors.textLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: Colors.white,
  },
  featuredVideoMeta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 4,
  },
  featuredVideoId: {
    fontSize: 12,
    color: Colors.textLight,
    fontFamily: "monospace",
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
