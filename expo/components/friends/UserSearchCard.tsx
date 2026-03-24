import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { UserPlus, Check } from 'lucide-react-native';
import { FriendUser } from '@/types/friend';
import { useTheme } from '@/contexts/ThemeContext';

interface UserSearchCardProps {
  user: FriendUser;
  onSendRequest: (user: FriendUser) => void;
  isSending?: boolean;
  alreadyFriend?: boolean;
  requestPending?: boolean;
}

export const UserSearchCard = memo(function UserSearchCard({
  user,
  onSendRequest,
  isSending,
  alreadyFriend,
  requestPending,
}: UserSearchCardProps) {
  const { colors } = useTheme();

  const renderAction = () => {
    if (alreadyFriend) {
      return (
        <View style={[styles.friendBadge, { backgroundColor: '#22C55E15' }]}>
          <Check size={16} color="#22C55E" />
          <Text style={styles.friendText}>Friend</Text>
        </View>
      );
    }

    if (requestPending) {
      return (
        <View style={[styles.pendingBadge, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.pendingText, { color: colors.primary }]}>Pending</Text>
        </View>
      );
    }

    if (isSending) {
      return <ActivityIndicator size="small" color={colors.primary} />;
    }

    return (
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => onSendRequest(user)}
      >
        <UserPlus size={18} color="#fff" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Image
        source={{ uri: user.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop' }}
        style={styles.avatar}
      />

      <View style={styles.info}>
        <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
          {user.username}
        </Text>
        {user.email && (
          <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>
            {user.email}
          </Text>
        )}
      </View>

      {renderAction()}
    </View>
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
  },
  email: {
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  friendText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#22C55E',
  },
  pendingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default UserSearchCard;
