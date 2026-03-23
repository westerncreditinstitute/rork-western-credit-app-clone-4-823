/**
 * OASIS Agent Discovery Screen
 * Browse, search, and follow AI agents in the Credit Life simulation.
 * Features: featured agents, search, filter by city/occupation, agent profiles.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  Dimensions,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Bot,
  Users,
  MapPin,
  Briefcase,
  Star,
  UserPlus,
  UserCheck,
  Filter,
  X,
  Sparkles,
  Globe,
  BarChart3,
  Shield,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useSocialFeed } from '@/contexts/SocialFeedContext';
import { useAIAgents } from '@/contexts/AIAgentContext';
import { Friend } from '@/types/socialFeed';

const { width: _SCREEN_WIDTH } = Dimensions.get('window');

const CITIES = [
  'All', 'Los Angeles', 'New York', 'Chicago', 'Houston', 'Phoenix',
  'San Francisco', 'Miami', 'Seattle', 'Denver', 'Atlanta',
  'Boston', 'Dallas', 'Portland', 'San Diego', 'Nashville',
];

const OCCUPATIONS = [
  'All', 'Software Engineer', 'Financial Analyst', 'Teacher', 'Nurse',
  'Small Business Owner', 'Real Estate Agent', 'Marketing Manager',
  'Accountant', 'Graphic Designer', 'Lawyer',
];

const CREDIT_RANGES = [
  { label: 'All Scores', min: 300, max: 850 },
  { label: 'Excellent (800+)', min: 800, max: 850 },
  { label: 'Very Good (740-799)', min: 740, max: 799 },
  { label: 'Good (670-739)', min: 670, max: 739 },
  { label: 'Fair (580-669)', min: 580, max: 669 },
  { label: 'Building (<580)', min: 300, max: 579 },
];

const CREDIT_SCORE_COLOR = (score: number): string => {
  if (score >= 800) return '#10B981';
  if (score >= 740) return '#34D399';
  if (score >= 670) return '#F59E0B';
  if (score >= 580) return '#F97316';
  return '#EF4444';
};

const CREDIT_LABEL = (score: number): string => {
  if (score >= 800) return 'Excellent';
  if (score >= 740) return 'Very Good';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Building';
};

const _LIFESTYLE_EMOJI: Record<string, string> = {
  frugal: '🏦',
  moderate: '⚖️',
  comfortable: '🏡',
  luxury: '💎',
};

export default function AgentDiscoveryScreen() {
  const { colors, isDark } = useTheme();
  const _router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    friends,
    friendSuggestions,
    isConnected,
    searchUsers,
    addFriend,
    removeFriend,
  } = useSocialFeed();

  const {
    featuredAgents,
    platformStats,
    searchAgents: _searchAgents,
    followAgent: _followAgent,
    unfollowAgent: _unfollowAgent,
  } = useAIAgents();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedOccupation, setSelectedOccupation] = useState('All');
  const [selectedCreditRange, setSelectedCreditRange] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [activeSection, setActiveSection] = useState<'featured' | 'all' | 'search'>('featured');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const friendIds = useMemo(() => new Set(friends.map(f => f.id)), [friends]);

  // Search handler
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      setIsSearching(true);
      setActiveSection('search');
      const results = await searchUsers(query);
      setSearchResults(results);
      setIsSearching(false);
    } else {
      setSearchResults([]);
      setActiveSection('featured');
    }
  }, [searchUsers]);

  // Filter agents
  const filteredSuggestions = useMemo(() => {
    let list = [...friendSuggestions];
    if (selectedCity !== 'All') {
      list = list.filter(a => a.bio?.includes(selectedCity));
    }
    if (selectedOccupation !== 'All') {
      list = list.filter(a => a.occupation === selectedOccupation);
    }
    return list;
  }, [friendSuggestions, selectedCity, selectedOccupation]);

  // Follow/unfollow toggle
  const handleToggleFollow = useCallback((agent: Friend) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (friendIds.has(agent.id)) {
      void removeFriend(agent.id);
    } else {
      void addFriend(agent as Friend);
    }
  }, [friendIds, addFriend, removeFriend]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsRefreshing(false);
  }, []);

  const styles = createStyles(colors, isDark, insets);

  // ── Stats Banner ──
  const renderStatsBanner = () => (
    <LinearGradient
      colors={isDark ? ['#1E1B4B', '#312E81'] : ['#4F46E5', '#7C3AED']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.statsBanner}
    >
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Bot size={20} color="#FFFFFF" />
          <Text style={styles.statValue}>
            {platformStats?.total_users
              ? `${(platformStats.total_users / 1000).toFixed(0)}K`
              : '1M'}
          </Text>
          <Text style={styles.statLabel}>AI Agents</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <BarChart3 size={20} color="#FFFFFF" />
          <Text style={styles.statValue}>
            {platformStats?.total_posts
              ? `${(platformStats.total_posts / 1000).toFixed(0)}K`
              : '30K'}
          </Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Globe size={20} color="#FFFFFF" />
          <Text style={styles.statValue}>20</Text>
          <Text style={styles.statLabel}>Cities</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Sparkles size={20} color="#FFFFFF" />
          <Text style={styles.statValue}>
            {isConnected ? 'LIVE' : 'OFF'}
          </Text>
          <Text style={styles.statLabel}>Status</Text>
        </View>
      </View>
    </LinearGradient>
  );

  // ── Agent Card ──
  const renderAgentCard = useCallback(({ item: agent }: { item: Friend }) => {
    const isFollowing = friendIds.has(agent.id);
    const creditScore = agent.numFollowers ? Math.min(850, 500 + agent.numFollowers) : 700;

    return (
      <View style={styles.agentCard}>
        <View style={styles.agentCardHeader}>
          <View style={styles.agentAvatarWrap}>
            <Image source={{ uri: agent.avatar }} style={styles.agentAvatar} />
            <View style={styles.agentAiBadge}>
              <Bot size={10} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>{agent.name}</Text>
            {agent.occupation && (
              <View style={styles.occupationRow}>
                <Briefcase size={11} color={colors.textLight} />
                <Text style={styles.occupationText}>{agent.occupation}</Text>
              </View>
            )}
            {agent.bio && (
              <View style={styles.locationRow}>
                <MapPin size={11} color={colors.textLight} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {agent.bio}
                </Text>
              </View>
            )}
          </View>

          {/* Credit Score */}
          <View style={styles.creditScoreCol}>
            <View
              style={[
                styles.creditScoreCircle,
                { borderColor: CREDIT_SCORE_COLOR(creditScore) },
              ]}
            >
              <Text
                style={[
                  styles.creditScoreValue,
                  { color: CREDIT_SCORE_COLOR(creditScore) },
                ]}
              >
                {creditScore}
              </Text>
            </View>
            <Text style={styles.creditScoreLabel}>
              {CREDIT_LABEL(creditScore)}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.agentStatsRow}>
          <View style={styles.agentStat}>
            <Text style={styles.agentStatValue}>{agent.numFollowers || 0}</Text>
            <Text style={styles.agentStatLabel}>Followers</Text>
          </View>
          <View style={styles.agentStat}>
            <Text style={styles.agentStatValue}>{agent.numFollowing || 0}</Text>
            <Text style={styles.agentStatLabel}>Following</Text>
          </View>
          <View style={styles.agentStat}>
            <Text style={styles.agentStatValue}>{agent.level || 1}</Text>
            <Text style={styles.agentStatLabel}>Level</Text>
          </View>
        </View>

        {/* Follow Button */}
        <TouchableOpacity
          style={[
            styles.followButton,
            isFollowing
              ? { backgroundColor: `${colors.primary}15`, borderWidth: 1, borderColor: colors.primary }
              : { backgroundColor: colors.primary },
          ]}
          onPress={() => handleToggleFollow(agent)}
          activeOpacity={0.7}
        >
          {isFollowing ? (
            <>
              <UserCheck size={16} color={colors.primary} />
              <Text style={[styles.followButtonText, { color: colors.primary }]}>
                Following
              </Text>
            </>
          ) : (
            <>
              <UserPlus size={16} color="#FFFFFF" />
              <Text style={styles.followButtonText}>Follow</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendIds, colors, handleToggleFollow, styles]);

  const renderFeaturedAgent = useCallback(({ item: agent }: { item: Friend }) => {
    const isFollowing = friendIds.has(agent.id);
    return (
      <TouchableOpacity style={styles.featuredCard} activeOpacity={0.8}>
        <LinearGradient
          colors={isDark ? ['#1F2937', '#374151'] : ['#F9FAFB', '#F3F4F6']}
          style={styles.featuredGradient}
        >
          <Image source={{ uri: agent.avatar }} style={styles.featuredAvatar} />
          <View style={styles.featuredAiBadge}>
            <Bot size={10} color="#FFFFFF" />
          </View>
          <Text style={styles.featuredName} numberOfLines={1}>
            {agent.name}
          </Text>
          {agent.occupation && (
            <Text style={styles.featuredOccupation} numberOfLines={1}>
              {agent.occupation}
            </Text>
          )}
          <View style={styles.featuredStatsRow}>
            <Users size={10} color={colors.textLight} />
            <Text style={styles.featuredStatText}>
              {agent.numFollowers || 0}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.featuredFollowBtn,
              {
                backgroundColor: isFollowing
                  ? `${colors.primary}15`
                  : colors.primary,
              },
            ]}
            onPress={() => handleToggleFollow(agent)}
          >
            <Text
              style={[
                styles.featuredFollowText,
                { color: isFollowing ? colors.primary : '#FFFFFF' },
              ]}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendIds, colors, isDark, handleToggleFollow, styles]);

  // ── Filter Bar ──
  const renderFilters = () => (
    <View style={styles.filterSection}>
      {/* City Filter */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>
          <MapPin size={12} color={colors.textLight} /> City
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterChipsRow}>
            {CITIES.slice(0, 10).map(city => (
              <TouchableOpacity
                key={city}
                style={[
                  styles.filterChip,
                  selectedCity === city && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => {
                  setSelectedCity(city);
                  void Haptics.selectionAsync();
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCity === city && { color: '#FFFFFF' },
                  ]}
                >
                  {city}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Occupation Filter */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>
          <Briefcase size={12} color={colors.textLight} /> Occupation
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterChipsRow}>
            {OCCUPATIONS.map(occ => (
              <TouchableOpacity
                key={occ}
                style={[
                  styles.filterChip,
                  selectedOccupation === occ && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => {
                  setSelectedOccupation(occ);
                  void Haptics.selectionAsync();
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedOccupation === occ && { color: '#FFFFFF' },
                  ]}
                >
                  {occ}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Credit Range Filter */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>
          <Shield size={12} color={colors.textLight} /> Credit Score
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterChipsRow}>
            {CREDIT_RANGES.map((range, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.filterChip,
                  selectedCreditRange === idx && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => {
                  setSelectedCreditRange(idx);
                  void Haptics.selectionAsync();
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCreditRange === idx && { color: '#FFFFFF' },
                  ]}
                >
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );

  // ── Main List Header ──
  const renderListHeader = () => (
    <View>
      {/* Stats Banner */}
      {renderStatsBanner()}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={16} color={colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, city, occupation..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <X size={16} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, showFilters && { backgroundColor: `${colors.primary}15` }]}
          onPress={() => {
            setShowFilters(!showFilters);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Filter size={18} color={showFilters ? colors.primary : colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && renderFilters()}

      {/* Featured Agents */}
      {activeSection !== 'search' && (
        <View style={styles.featuredSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Star size={16} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Featured Agents</Text>
            </View>
            <TouchableOpacity>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>
                See All
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={featuredAgents.length > 0 ? featuredAgents.map((a: any) => ({ ...a, id: a.id, name: a.displayName || a.name, avatar: a.avatarUrl || a.avatar, addedAt: 0 } as Friend)) : friendSuggestions.slice(0, 10)}
            keyExtractor={item => `featured-${item.id}`}
            renderItem={renderFeaturedAgent}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        </View>
      )}

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Users size={16} color={colors.primary} />
          <Text style={styles.sectionTitle}>
            {activeSection === 'search'
              ? `Search Results (${searchResults.length})`
              : 'All Agents'}
          </Text>
        </View>
        <Text style={styles.resultCount}>
          {activeSection === 'search'
            ? ''
            : `${filteredSuggestions.length} agents`}
        </Text>
      </View>
    </View>
  );

  const displayData = activeSection === 'search' ? searchResults : filteredSuggestions;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlatList
        data={displayData}
        keyExtractor={item => item.id}
        renderItem={renderAgentCard}
        ListHeaderComponent={renderListHeader}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isSearching ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <>
                <Bot size={48} color={colors.textLight} />
                <Text style={styles.emptyTitle}>
                  {activeSection === 'search' ? 'No agents found' : 'Loading agents...'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {activeSection === 'search'
                    ? 'Try a different search term'
                    : 'Connect to OASIS to discover AI agents'}
                </Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean, _insets: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingBottom: Platform.OS === 'ios' ? 100 : 80,
    },

    // ── Stats Banner ──
    statsBanner: {
      margin: 16,
      borderRadius: 16,
      padding: 16,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    statItem: {
      alignItems: 'center',
      gap: 4,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    statLabel: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.7)',
      fontWeight: '500',
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },

    // ── Search ──
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 12,
      gap: 8,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${colors.text}08`,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    filterBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${colors.text}08`,
    },

    // ── Filters ──
    filterSection: {
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      marginBottom: 12,
    },
    filterGroup: {
      marginBottom: 10,
    },
    filterLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textLight,
      paddingHorizontal: 16,
      marginBottom: 6,
    },
    filterChipsRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 6,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    filterChipText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text,
    },

    // ── Featured ──
    featuredSection: {
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    seeAllText: {
      fontSize: 13,
      fontWeight: '600',
    },
    resultCount: {
      fontSize: 12,
      color: colors.textLight,
    },
    featuredCard: {
      marginRight: 12,
      width: 130,
    },
    featuredGradient: {
      borderRadius: 16,
      padding: 14,
      alignItems: 'center',
    },
    featuredAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      marginBottom: 8,
    },
    featuredAiBadge: {
      position: 'absolute',
      top: 10,
      right: 32,
      backgroundColor: '#8B5CF6',
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: isDark ? '#1F2937' : '#F9FAFB',
    },
    featuredName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    featuredOccupation: {
      fontSize: 10,
      color: colors.textLight,
      textAlign: 'center',
      marginTop: 2,
    },
    featuredStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 6,
    },
    featuredStatText: {
      fontSize: 11,
      color: colors.textLight,
      fontWeight: '600',
    },
    featuredFollowBtn: {
      marginTop: 8,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 12,
    },
    featuredFollowText: {
      fontSize: 11,
      fontWeight: '700',
    },

    // ── Agent Card ──
    agentCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 16,
      padding: 14,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    agentCardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    agentAvatarWrap: {
      position: 'relative',
      marginRight: 12,
    },
    agentAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
    },
    agentAiBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      backgroundColor: '#8B5CF6',
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
    },
    agentInfo: {
      flex: 1,
    },
    agentName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    occupationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    occupationText: {
      fontSize: 12,
      color: colors.textLight,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    locationText: {
      fontSize: 11,
      color: colors.textLight,
    },
    creditScoreCol: {
      alignItems: 'center',
    },
    creditScoreCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    creditScoreValue: {
      fontSize: 14,
      fontWeight: '800',
    },
    creditScoreLabel: {
      fontSize: 9,
      fontWeight: '600',
      color: colors.textLight,
      marginTop: 2,
    },
    agentStatsRow: {
      flexDirection: 'row',
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    agentStat: {
      flex: 1,
      alignItems: 'center',
    },
    agentStatValue: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    agentStatLabel: {
      fontSize: 10,
      color: colors.textLight,
      marginTop: 1,
    },
    followButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 12,
      paddingVertical: 10,
      borderRadius: 12,
    },
    followButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // ── Empty ──
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textLight,
      textAlign: 'center',
      marginTop: 8,
    },
  });