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
import { Plus, Save, X } from "lucide-react-native";
import Colors from "@/constants/colors";
import { DocumentForm, initialDocumentForm } from "@/types/admin";
import { trpc } from "@/lib/trpc";
import DocumentCard from "@/components/admin/DocumentCard";

interface DocumentManagerProps {
  selectedCourseId: string;
  selectedSectionId: string;
  editingId: string | null;
  showAddForm: boolean;
  form: DocumentForm;
  onFormChange: (form: DocumentForm) => void;
  onEditingIdChange: (id: string | null) => void;
  onShowAddFormChange: (show: boolean) => void;
}

export default function DocumentManager({
  selectedCourseId,
  selectedSectionId,
  editingId,
  showAddForm,
  form,
  onFormChange,
  onEditingIdChange,
  onShowAddFormChange,
}: DocumentManagerProps) {
  const documentsQuery = trpc.documents.getAll.useQuery({
    courseId: selectedCourseId,
    sectionId: selectedSectionId,
  });

  const createMutation = trpc.documents.create.useMutation({
    onSuccess: () => {
      documentsQuery.refetch();
      onFormChange(initialDocumentForm);
      onShowAddFormChange(false);
      Alert.alert("Success", "Document added successfully");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const updateMutation = trpc.documents.update.useMutation({
    onSuccess: () => {
      documentsQuery.refetch();
      onEditingIdChange(null);
      onFormChange(initialDocumentForm);
      Alert.alert("Success", "Document updated successfully");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
      documentsQuery.refetch();
      Alert.alert("Success", "Document deleted successfully");
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

    if (form.type === "link" && !form.url) {
      Alert.alert("Error", "Share link URL is required");
      return;
    }

    if (form.type !== "link" && !form.url) {
      Alert.alert("Error", "Document URL is required");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        title: form.title,
        url: form.url,
        embedCode: form.embedCode,
        type: form.type,
        description: form.description,
      });
    } else {
      const docCount = documentsQuery.data?.length || 0;
      createMutation.mutate({
        courseId: selectedCourseId,
        sectionId: selectedSectionId,
        title: form.title,
        url: form.url,
        embedCode: form.embedCode,
        type: form.type,
        description: form.description,
        order: docCount,
      });
    }
  };

  const handleEdit = (doc: any) => {
    onEditingIdChange(doc.id);
    onFormChange({
      title: doc.title,
      url: doc.url || "",
      embedCode: doc.embedCode || "",
      type: doc.type || "pdf",
      description: doc.description || "",
    });
    onShowAddFormChange(false);
  };

  const handleDelete = useCallback((id: string) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this document?", [
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
    onFormChange(initialDocumentForm);
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
            <Text style={styles.addButtonText}>Add Document</Text>
          </TouchableOpacity>
        </View>
      )}

      {(editingId || showAddForm) && (
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>
              {editingId ? "Edit Document" : "Add New Document"}
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
              placeholder="Document title"
              placeholderTextColor={Colors.textLight}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{form.type === "link" ? "Share Link URL *" : "Document URL *"}</Text>
            <TextInput
              style={styles.input}
              value={form.url}
              onChangeText={(text) => onFormChange({ ...form, url: text })}
              placeholder={form.type === "link" ? "https://docs.google.com/document/d/..." : "https://example.com/document.pdf"}
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helperText}>
              {form.type === "link" 
                ? "Paste the share link from Google Docs, Canva, or any document hosting service"
                : "Direct link to PDF or form"}
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Document Type *</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeChip, form.type === "link" && styles.typeChipActive]}
                onPress={() => onFormChange({ ...form, type: "link" })}
              >
                <Text style={[styles.typeChipText, form.type === "link" && styles.typeChipTextActive]}>Link</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeChip, form.type === "pdf" && styles.typeChipActive]}
                onPress={() => onFormChange({ ...form, type: "pdf" })}
              >
                <Text style={[styles.typeChipText, form.type === "pdf" && styles.typeChipTextActive]}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeChip, form.type === "form" && styles.typeChipActive]}
                onPress={() => onFormChange({ ...form, type: "form" })}
              >
                <Text style={[styles.typeChipText, form.type === "form" && styles.typeChipTextActive]}>Form</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeChip, form.type === "other" && styles.typeChipActive]}
                onPress={() => onFormChange({ ...form, type: "other" })}
              >
                <Text style={[styles.typeChipText, form.type === "other" && styles.typeChipTextActive]}>Other</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(text) => onFormChange({ ...form, description: text })}
              placeholder="Document description (optional)"
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
                  {editingId ? "Update Document" : "Add Document"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Documents ({documentsQuery.data?.length || 0})
        </Text>

        {documentsQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : documentsQuery.data && documentsQuery.data.length > 0 ? (
          documentsQuery.data.map((doc: any) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No documents yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first document to get started
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
  typeSelector: {
    flexDirection: "row" as const,
    gap: 8,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center" as const,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.text,
  },
  typeChipTextActive: {
    color: Colors.white,
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
