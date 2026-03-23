import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Trash2, Edit2 } from "lucide-react-native";
import Colors from "@/constants/colors";

interface Video {
  id: string;
  title: string;
  duration?: string;
  url?: string;
  embedCode?: string;
  bunnyVideoId?: string;
  cloudflareVideoId?: string;
  description?: string;
}

interface VideoCardProps {
  video: Video;
  onEdit: (video: Video) => void;
  onDelete: (id: string) => void;
}

const VideoCard = React.memo(function VideoCard({
  video,
  onEdit,
  onDelete,
}: VideoCardProps) {
  return (
    <View style={styles.videoCard}>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle}>{video.title}</Text>
        {video.duration && (
          <Text style={styles.videoDuration}>{video.duration}</Text>
        )}
        {video.url ? (
          <Text style={styles.videoUrl} numberOfLines={1}>
            {"URL: "}{String(video.url)}
          </Text>
        ) : null}
        {video.embedCode ? (
          <Text style={styles.videoUrl} numberOfLines={1}>
            {"Embed: "}{String(video.embedCode).substring(0, 50)}{"..."}
          </Text>
        ) : null}
        {video.bunnyVideoId ? (
          <View style={styles.bunnyBadge}>
            <Text style={styles.bunnyBadgeText}>Bunny Stream</Text>
            <Text style={styles.videoUrl} numberOfLines={1}>
              {String(video.bunnyVideoId)}
            </Text>
          </View>
        ) : null}
        {video.cloudflareVideoId ? (
          <View style={styles.bunnyBadge}>
            <Text style={[styles.bunnyBadgeText, { backgroundColor: "#f48120" }]}>Cloudflare</Text>
            <Text style={styles.videoUrl} numberOfLines={1}>
              {String(video.cloudflareVideoId)}
            </Text>
          </View>
        ) : null}
        {video.description ? (
          <Text style={styles.videoDescription} numberOfLines={2}>
            {String(video.description)}
          </Text>
        ) : null}
      </View>
      <View style={styles.videoActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onEdit(video)}
        >
          <Edit2 color={Colors.primary} size={20} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onDelete(video.id)}
        >
          <Trash2 color={Colors.error} size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.video.id === nextProps.video.id &&
    prevProps.video.title === nextProps.video.title &&
    prevProps.video.duration === nextProps.video.duration &&
    prevProps.video.url === nextProps.video.url &&
    prevProps.video.embedCode === nextProps.video.embedCode &&
    prevProps.video.bunnyVideoId === nextProps.video.bunnyVideoId &&
    prevProps.video.cloudflareVideoId === nextProps.video.cloudflareVideoId &&
    prevProps.video.description === nextProps.video.description
  );
});

const styles = StyleSheet.create({
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
  videoDuration: {
    fontSize: 12,
    color: Colors.textLight,
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
  bunnyBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginTop: 4,
  },
  bunnyBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: Colors.white,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

export default VideoCard;
