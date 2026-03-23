import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Search, Users, UserPlus, Bell, X } from 'lucide-react-native';
import { useFriends } from '@/contexts/FriendContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FriendCard } from '@/components/friends/FriendCard';
import { FriendRequestCard } from '@/components/friends/FriendRequestCard';
import { UserSearchCard } from '@/components/friends/UserSearchCard';
import { QuickMessageModal } from '@/components/friends/QuickMessageModal';
import { Friend, FriendRequest, FriendUser } from '@/types/friend';

type TabType = 'friends' | 'requests' | 'search';

export default function FriendsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    friends,
    receivedRequests,
    sentRequests,
    stats,
    isLoading,
    isRefreshing,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    searchUsers,
    sendMessage,
    refreshFriends,
    isSendingRequest,
    isSearching,
  } = useFriends();

  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [localSearchResults, setLocalSearchResults] = useState<FriendUser[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [loadingRequestId, setLoadingRequestId] = useState<string | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const results = await searchUsers(query);
      setLocalSearchResults(results);
    } else {
      setLocalSearchResults([]);
    }
  }, [searchUsers]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setLocalSearchResults([]);
  }, []);

  const handleSendRequest = useCallback(async (user: FriendUser) => {
    const result = await sendFriendRequest(user.id);
    if (result.success) {
      Alert.alert('Success', `Friend request sent to ${user.username}`);
      setLocalSearchResults(prev => prev.filter(u => u.id !== user.id));
    } else {
      Alert.alert('Error', result.error || 'Failed to send request');
    }
  }, [sendFriendRequest]);

  const handleAcceptRequest = useCallback(async (request: FriendRequest) => {
    setLoadingRequestId(request.id);
    const result = await acceptRequest(request.id);
    setLoadingRequestId(null);
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to accept request');
    }
  }, [acceptRequest]);

  const handleRejectRequest = useCallback(async (request: FriendRequest) => {
    setLoadingRequestId(request.id);
    const result = await rejectRequest(request.id);
    setLoadingRequestId(null);
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to reject request');
    }
  }, [rejectRequest]);

  const handleRemoveFriend = useCallback(async (friend: Friend) => {
    const result = await removeFriend(friend.friendshipId);
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to remove friend');
    }
  }, [removeFriend]);

  const handleMessage = useCallback((friend: Friend) => {
    setSelectedFriend(friend);
    setMessageModalVisible(true);
  }, []);

  const handleVisitHome = useCallback((friend: Friend) => {
    if (friend.currentHomeId) {
      router.push(`/home-visit?homeId=${friend.currentHomeId}` as any);
    }
  }, [router]);

  const handleViewProfile = useCallback((friend: Friend) => {
    router.push(`/owner-profile?userId=${friend.id}` as any);
  }, [router]);

  const handleSendMessage = useCallback(async (friendId: string, content: string) => {
    return sendMessage(friendId, content);
  }, [sendMessage]);

  const onlineFriends = useMemo(() => friends.filter(f => f.isOnline), [friends]);
  const offlineFriends = useMemo(() => friends.filter(f => !f.isOnline), [friends]);

  const friendIds = useMemo(() => new Set(friends.map(f => f.id)), [friends]);
  const pendingIds = useMemo(() => new Set(sentRequests.map(r => r.receiverId)), [sentRequests]);

  const renderFriendItem = useCallback(({ item }: { item: Friend }) => (
    <FriendCard
      friend={item}
      onMessage={handleMessage}
      onVisitHome={handleVisitHome}
      onRemove={handleRemoveFriend}
      onViewProfile={handleViewProfile}
    />
  ), [handleMessage, handleVisitHome, handleRemoveFriend, handleViewProfile]);

  const renderRequestItem = useCallback(({ item }: { item: FriendRequest }) => (
    <FriendRequestCard
      request={item}
      type="received"
      onAccept={handleAcceptRequest}
      onReject={handleRejectRequest}
      isLoading={loadingRequestId === item.id}
    />
  ), [handleAcceptRequest, handleRejectRequest, loadingRequestId]);

  const renderSentRequestItem = useCallback(({ item }: { item: FriendRequest }) => (
    <FriendRequestCard
      request={item}
      type="sent"
    />
  ), []);

  const renderSearchResultItem = useCallback(({ item }: { item: FriendUser }) => (
    <UserSearchCard
      user={item}
      onSendRequest={handleSendRequest}
      isSending={isSendingRequest}
      alreadyFriend={friendIds.has(item.id)}
      requestPending={pendingIds.has(item.id)}
    />
  ), [handleSendRequest, isSendingRequest, friendIds, pendingIds]);

  const renderFriendsList = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (friends.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Users size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Friends Yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Search for users to add them as friends
          </Text>
          <TouchableOpacity
            style={[styles.addFriendButton, { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('search')}
          >
            <UserPlus size={20} color="#fff" />
            <Text style={styles.addFriendButtonText}>Find Friends</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={[...onlineFriends, ...offlineFriends]}
        renderItem={renderFriendItem}
        keyExtractor={(item) => item.friendshipId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshFriends}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          onlineFriends.length > 0 ? (
            <View style={styles.sectionHeader}>
              <View style={[styles.onlineDot, { backgroundColor: '#22C55E' }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Online ({onlineFriends.length})
              </Text>
            </View>
          ) : null
        }
      />
    );
  };

  const renderRequestsList = () => {
    const hasRequests = receivedRequests.length > 0 || sentRequests.length > 0;

    if (!hasRequests) {
      return (
        <View style={styles.emptyContainer}>
          <Bell size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Requests</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Friend requests will appear here
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={[...receivedRequests, ...sentRequests]}
        renderItem={({ item, index }) => 
          index < receivedRequests.length
            ? renderRequestItem({ item })
            : renderSentRequestItem({ item })
        }
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshFriends}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          receivedRequests.length > 0 ? (
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Received ({receivedRequests.length})
              </Text>
            </View>
          ) : null
        }
      />
    );
  };

  const renderSearchList = () => {
    if (isSearching) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.searchingText, { color: colors.textSecondary }]}>
            Searching...
          </Text>
        </View>
      );
    }

    if (searchQuery.length < 2) {
      return (
        <View style={styles.emptyContainer}>
          <Search size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Search Users</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Type at least 2 characters to search
          </Text>
        </View>
      );
    }

    if (localSearchResults.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Search size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Results</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No users found matching &quot;{searchQuery}&quot;
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={localSearchResults}
        renderItem={renderSearchResultItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Friends',
          headerRight: () => (
            <View style={styles.statsRow}>
              <View style={[styles.statBadge, { backgroundColor: '#22C55E20' }]}>
                <View style={[styles.statDot, { backgroundColor: '#22C55E' }]} />
                <Text style={[styles.statText, { color: '#22C55E' }]}>
                  {stats.onlineFriends}
                </Text>
              </View>
            </View>
          ),
        }}
      />

      <View style={[styles.tabsContainer, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('friends')}
        >
          <Users size={20} color={activeTab === 'friends' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'friends' ? colors.primary : colors.textSecondary }]}>
            Friends
          </Text>
          {friends.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.tabBadgeText, { color: colors.primary }]}>{friends.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('requests')}
        >
          <Bell size={20} color={activeTab === 'requests' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'requests' ? colors.primary : colors.textSecondary }]}>
            Requests
          </Text>
          {receivedRequests.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: colors.error }]}>
              <Text style={styles.tabBadgeTextWhite}>{receivedRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('search')}
        >
          <UserPlus size={20} color={activeTab === 'search' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'search' ? colors.primary : colors.textSecondary }]}>
            Add
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'search' && (
        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by username or email..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.content}>
        {activeTab === 'friends' && renderFriendsList()}
        {activeTab === 'requests' && renderRequestsList()}
        {activeTab === 'search' && renderSearchList()}
      </View>

      <QuickMessageModal
        visible={messageModalVisible}
        friend={selectedFriend}
        onClose={() => {
          setMessageModalVisible(false);
          setSelectedFriend(null);
        }}
        onSend={handleSendMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabBadgeTextWhite: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchingText: {
    marginTop: 12,
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
  },
  addFriendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
