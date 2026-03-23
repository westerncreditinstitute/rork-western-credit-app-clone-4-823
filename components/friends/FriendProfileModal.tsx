import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { X, MessageCircle, Home, UserMinus, Calendar, Clock } from 'lucide-react-native';
import { Friend } from '@/types/friend';
import { useTheme } from '@/contexts/ThemeContext';

interface FriendProfileModalProps {
  visible: boolean;
  friend: Friend | null;
  onClose: () => void;
  onMessage: (friend: Friend) => void;
  onVisitHome: (friend: Friend) => void;
  onRemove: (friend: Friend) => void;
}

export const FriendProfileModal = memo(function FriendProfileModal({
  visible,
  friend,
  onClose,
  onMessage,
  onVisitHome,
  onRemove,
}: FriendProfileModalProps) {
  const { colors } = useTheme();

  const handleRemove = useCallback(() => {
    if (!friend) return;
    
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.user.username} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onRemove(friend);
            onClose();
          },
        },
      ]
    );
  }, [friend, onRemove, onClose]);

  if (!friend) return null;

  const getStatusColor = () => {
    if (friend.isOnline) return '#22C55E';
    return '#9CA3AF';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getLastSeenText = () => {
    if (friend.isOnline) return 'Online now';
    if (!friend.lastSeen) return 'Last seen unknown';
    
    const lastSeenDate = new Date(friend.lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / 60000);
    
    if (diffMinutes < 60) return `Last seen ${diffMinutes} minutes ago`;
    if (diffMinutes < 1440) return `Last seen ${Math.floor(diffMinutes / 60)} hours ago`;
    return `Last seen ${Math.floor(diffMinutes / 1440)} days ago`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: friend.user.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop' }}
                style={styles.avatar}
              />
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
            </View>

            <Text style={[styles.username, { color: colors.text }]}>
              {friend.user.username}
            </Text>

            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              <Text style={[styles.statusText, { color: friend.isOnline ? '#22C55E' : colors.textSecondary }]}>
                {friend.isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>

            {friend.currentActivity && friend.isOnline && (
              <Text style={[styles.activityText, { color: colors.textSecondary }]}>
                {friend.currentActivity}
              </Text>
            )}
          </View>

          <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
            <View style={styles.infoRow}>
              <Calendar size={18} color={colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Friends Since</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatDate(friend.friendsSince)}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.infoRow}>
              <Clock size={18} color={colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Status</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {getLastSeenText()}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                onMessage(friend);
                onClose();
              }}
            >
              <MessageCircle size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Send Message</Text>
            </TouchableOpacity>

            {friend.currentHomeId && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#22C55E' }]}
                onPress={() => {
                  onVisitHome(friend);
                  onClose();
                }}
              >
                <Home size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Visit Home</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButtonOutline, { borderColor: colors.error }]}
              onPress={handleRemove}
            >
              <UserMinus size={20} color={colors.error} />
              <Text style={[styles.actionButtonOutlineText, { color: colors.error }]}>
                Remove Friend
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#fff',
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '500',
  },
  activityText: {
    fontSize: 14,
    marginTop: 4,
  },
  infoSection: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  actionsSection: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1.5,
  },
  actionButtonOutlineText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FriendProfileModal;
