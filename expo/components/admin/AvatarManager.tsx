import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Trash2, Edit2, Plus, Save, X } from "lucide-react-native";
import Colors from "@/constants/colors";
import { AvatarForm, initialAvatarForm } from "@/types/admin";
import { trpc } from "@/lib/trpc";

interface AvatarManagerProps {
  selectedCourseId: string;
  selectedSectionId: string;
  editingId: string | null;
  showAddForm: boolean;
  form: AvatarForm;
  onFormChange: (form: AvatarForm) => void;
  onEditingIdChange: (id: string | null) => void;
  onShowAddFormChange: (show: boolean) => void;
}

export default function AvatarManager({
  selectedCourseId,
  selectedSectionId,
  editingId,
  showAddForm,
  form,
  onFormChange,
  onEditingIdChange,
  onShowAddFormChange,
}: AvatarManagerProps) {
  const avatarsQuery = trpc.avatars.getAll.useQuery({
    courseId: selectedCourseId,
    sectionId: selectedSectionId,
  }) as { data?: any[]; isLoading: boolean; refetch: () => void };

  const createMutation = trpc.avatars.create.useMutation({
    onSuccess: () => {
      avatarsQuery.refetch();
      onFormChange(initialAvatarForm);
      onShowAddFormChange(false);
      Alert.alert("Success", "Avatar added successfully");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const updateMutation = trpc.avatars.update.useMutation({
    onSuccess: () => {
      avatarsQuery.refetch();
      onEditingIdChange(null);
      onFormChange(initialAvatarForm);
      Alert.alert("Success", "Avatar updated successfully");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const deleteMutation = trpc.avatars.delete.useMutation({
    onSuccess: () => {
      avatarsQuery.refetch();
      Alert.alert("Success", "Avatar deleted successfully");
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

    if (!form.embedCode) {
      Alert.alert("Error", "Embed Code is required");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        title: form.title,
        embedCode: form.embedCode,
        apiKey: form.apiKey,
        description: form.description,
      });
    } else {
      const avatarCount = avatarsQuery.data?.length || 0;
      createMutation.mutate({
        courseId: selectedCourseId,
        sectionId: selectedSectionId,
        title: form.title,
        embedCode: form.embedCode,
        apiKey: form.apiKey,
        description: form.description,
        order: avatarCount,
      });
    }
  };

  const handleEdit = (avatar: any) => {
    onEditingIdChange(avatar.id);
    onFormChange({
      title: avatar.title,
      embedCode: avatar.embedCode || "",
      apiKey: avatar.apiKey || "",
      description: avatar.description || "",
    });
    onShowAddFormChange(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this avatar?", [
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
    onFormChange(initialAvatarForm);
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
            <Text style={styles.addButtonText}>Add Avatar</Text>
          </TouchableOpacity>
        </View>
      )}

      {(editingId || showAddForm) && (
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>
              {editingId ? "Edit Avatar" : "Add New Avatar"}
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
              placeholder="Avatar title"
              placeholderTextColor={Colors.textLight}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Embed Code *</Text>
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
            <Text style={styles.helperText}>Paste the LiveAvatar embed code</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>API Key (Optional)</Text>
            <TextInput
              style={styles.input}
              value={form.apiKey}
              onChangeText={(text) => onFormChange({ ...form, apiKey: text })}
              placeholder="0aa0993f-ec33-11f0-a99e-066a7fa2e369"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helperText}>Your LiveAvatar API key</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(text) => onFormChange({ ...form, description: text })}
              placeholder="Avatar description (optional)"
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
                  {editingId ? "Update Avatar" : "Add Avatar"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Interactive Avatars ({avatarsQuery.data?.length || 0})
        </Text>

        {avatarsQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : avatarsQuery.data && avatarsQuery.data.length > 0 ? (
          avatarsQuery.data.map((avatar: any) => (
            <View key={avatar.id} style={styles.videoCard}>
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle}>{avatar.title}</Text>
                {avatar.apiKey ? (
                  <Text style={styles.videoUrl} numberOfLines={1}>
                    {"API Key: "}{String(avatar.apiKey).substring(0, 20)}{"..."}
                  </Text>
                ) : null}
                {avatar.embedCode ? (
                  <Text style={styles.videoUrl} numberOfLines={1}>
                    {"Embed: "}{String(avatar.embedCode).substring(0, 50)}{"..."}
                  </Text>
                ) : null}
                {avatar.description ? (
                  <Text style={styles.videoDescription} numberOfLines={2}>
                    {String(avatar.description)}
                  </Text>
                ) : null}
              </View>
              <View style={styles.videoActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEdit(avatar)}
                >
                  <Edit2 color={Colors.primary} size={20} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(avatar.id)}
                >
                  <Trash2 color={Colors.error} size={20} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No avatars yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first interactive avatar to get started
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
  videoCard: {
    flexDirection: "row" as const,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
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
  videoUrl: {
    fontSize: 12,
    color: Colors.primary,
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
