import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Trash2, Edit2 } from "lucide-react-native";
import Colors from "@/constants/colors";

interface Document {
  id: string;
  title?: string;
  url?: string;
  embedCode?: string;
  type?: string;
  description?: string;
}

interface DocumentCardProps {
  document: Document;
  onEdit: (document: Document) => void;
  onDelete: (id: string) => void;
}

const DocumentCard = React.memo(function DocumentCard({
  document,
  onEdit,
  onDelete,
}: DocumentCardProps) {
  return (
    <View style={styles.documentCard}>
      <View style={styles.documentInfo}>
        <View style={styles.docHeader}>
          <Text style={styles.documentTitle}>
            {document.title ? String(document.title) : "Untitled"}
          </Text>
          <View style={styles.docTypeBadge}>
            <Text style={styles.docTypeBadgeText}>
              {document.type ? String(document.type).toUpperCase() : "DOC"}
            </Text>
          </View>
        </View>
        {document.url && document.type !== "embed" ? (
          <Text style={styles.documentUrl} numberOfLines={1}>
            {"URL: "}{String(document.url)}
          </Text>
        ) : null}
        {document.embedCode ? (
          <Text style={styles.documentUrl} numberOfLines={1}>
            {"Embed: "}{String(document.embedCode).substring(0, 50)}{"..."}
          </Text>
        ) : null}
        {document.description ? (
          <Text style={styles.documentDescription} numberOfLines={2}>
            {String(document.description)}
          </Text>
        ) : null}
      </View>
      <View style={styles.documentActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onEdit(document)}
        >
          <Edit2 color={Colors.primary} size={20} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onDelete(document.id)}
        >
          <Trash2 color={Colors.error} size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.document.id === nextProps.document.id &&
    prevProps.document.title === nextProps.document.title &&
    prevProps.document.url === nextProps.document.url &&
    prevProps.document.embedCode === nextProps.document.embedCode &&
    prevProps.document.type === nextProps.document.type &&
    prevProps.document.description === nextProps.document.description
  );
});

const styles = StyleSheet.create({
  documentCard: {
    flexDirection: "row" as const,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  documentInfo: {
    flex: 1,
    marginRight: 12,
  },
  docHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 4,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  docTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  docTypeBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: Colors.white,
  },
  documentUrl: {
    fontSize: 12,
    color: Colors.primary,
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
  },
  documentActions: {
    justifyContent: "center" as const,
  },
  actionButton: {
    padding: 8,
    marginBottom: 8,
  },
});

export default DocumentCard;
