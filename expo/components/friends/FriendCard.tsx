import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { MessageCircle, Home, UserMinus } from 'lucide-react-native';
import { Friend } from '@/types/friend';
import { useTheme } from '@/contexts/ThemeContext';

interface FriendCardProps {
  friend: Friend;
  onMessage: (friend: Friend) => void;
  onVisitHome: (friend: Friend) => void;
  onRemove: (friend: Friend) => void;
  onViewProfile: (friend: Friend) => void;
}

export const FriendCard = memo(function FriendCard({
  friend,
  onMessage,
  onVisitHome,
  onRemove,
  onViewProfile,
}: FriendCardProps) {
  const { colors } = useTheme();

  const handleRemove = useCallback(() => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.user.username} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onRemove(friend) },
      ]
    );
  }, [friend, onRemove]);

  const getStatusColor = () => {
    if (friend.isOnline) return '#22C55E';
    return '#9CA3AF';
  };

  const getActivityText = () => {
    if (!friend.isOnline) {
      if (friend.lastSeen) {
        const lastSeenDate = new Date(friend.lastSeen);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / 60000);
        
        if (diffMinutes < 60) return `Last seen ${diffMinutes}m ago`;
        if (diffMinutes < 1440) return `Last seen ${Math.floor(diffMinutes / 60)}h ago`;
        return `Last seen ${Math.floor(diffMinutes / 1440)}d ago`;
      }
      return 'Offline';
    }
    if (friend.currentActivity) return friend.currentActivity;
    return 'Online';
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => onViewProfile(friend)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: friend.user.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop' }}
          style={styles.avatar}
        />
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
      </View>

      <View style={styles.info}>
        <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
          {friend.user.username}
        </Text>
        <Text style={[styles.status, { color: colors.textSecondary }]} numberOfLines={1}>
          {getActivityText()}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
          onPress={() => onMessage(friend)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MessageCircle size={18} color={colors.primary} />
        </TouchableOpacity>

        {friend.currentHomeId && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#22C55E15' }]}
            onPress={() => onVisitHome(friend)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Home size={18} color="#22C55E" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.error + '15' }]}
          onPress={handleRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <UserMinus size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

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
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    fontSize: 13,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FriendCard;
