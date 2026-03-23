import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Check, X, Clock } from 'lucide-react-native';
import { FriendRequest } from '@/types/friend';
import { useTheme } from '@/contexts/ThemeContext';

interface FriendRequestCardProps {
  request: FriendRequest;
  type: 'received' | 'sent';
  onAccept?: (request: FriendRequest) => void;
  onReject?: (request: FriendRequest) => void;
  onCancel?: (request: FriendRequest) => void;
  isLoading?: boolean;
}

export const FriendRequestCard = memo(function FriendRequestCard({
  request,
  type,
  onAccept,
  onReject,
  onCancel,
  isLoading,
}: FriendRequestCardProps) {
  const { colors } = useTheme();

  const user = type === 'received' ? request.sender : request.receiver;
  const timeAgo = getTimeAgo(request.createdAt);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Image
        source={{ uri: user?.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop' }}
        style={styles.avatar}
      />

      <View style={styles.info}>
        <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
          {user?.username || 'Unknown User'}
        </Text>
        <View style={styles.metaRow}>
          <Clock size={12} color={colors.textSecondary} />
          <Text style={[styles.time, { color: colors.textSecondary }]}>{timeAgo}</Text>
        </View>
        {request.message && (
          <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
            &quot;{request.message}&quot;
          </Text>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : type === 'received' ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.acceptButton, { backgroundColor: '#22C55E' }]}
            onPress={() => onAccept?.(request)}
          >
            <Check size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rejectButton, { backgroundColor: colors.error }]}
            onPress={() => onReject?.(request)}
          >
            <X size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.sentBadge}>
          <Text style={[styles.sentText, { color: colors.textSecondary }]}>Pending</Text>
        </View>
      )}
    </View>
  );
});

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
  if (diffMinutes < 10080) return `${Math.floor(diffMinutes / 1440)}d ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  time: {
    fontSize: 12,
  },
  message: {
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  sentText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default FriendRequestCard;
