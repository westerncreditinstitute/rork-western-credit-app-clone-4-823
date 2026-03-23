/**
 * OASIS × Credit Life Simulator — AI Agent Context
 * Manages AI agent interactions, profiles, and discovery.
 * Provides agent-specific features separate from the main social feed.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'; // eslint-disable-line @typescript-eslint/no-unused-vars
import createContextHook from '@nkzw/create-context-hook';
import {
  AIAgentProfile,
  oasisUserToAgentProfile,
} from '@/types/socialFeed';
import { OasisAPI, OasisUser } from '@/services/OasisAPIService';
import { useSocialFeed } from '@/contexts/SocialFeedContext';

export const [AIAgentProvider, useAIAgents] = createContextHook(() => { // eslint-disable-line rork/general-context-optimization
  const { isConnected, oasisUserId } = useSocialFeed();

  // Agent discovery state
  const [featuredAgents, setFeaturedAgents] = useState<AIAgentProfile[]>([]);
  const [nearbyAgents, _setNearbyAgents] = useState<AIAgentProfile[]>([]);
  const [similarAgents, _setSimilarAgents] = useState<AIAgentProfile[]>([]);
  const [searchResults, setSearchResults] = useState<AIAgentProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  // Selected agent profile (for detail view)
  const [selectedAgent, setSelectedAgent] = useState<AIAgentProfile | null>(null);
  const [selectedAgentPosts, setSelectedAgentPosts] = useState<any[]>([]);
  const [isFollowingSelected, setIsFollowingSelected] = useState(false);

  // Platform stats
  const [platformStats, setPlatformStats] = useState<any>(null);

  // ==================== Load Featured/Suggested Agents ====================

  const loadFeaturedAgents = useCallback(async () => {
    if (!oasisUserId || !isConnected) return;
    setIsLoadingAgents(true);

    try {
      const response = await OasisAPI.getSuggestions(oasisUserId, 20);
      const agents = response.suggestions.map(oasisUserToAgentProfile);
      setFeaturedAgents(agents);
    } catch (error) {
      console.warn('[AIAgent] Load featured failed:', error);
    } finally {
      setIsLoadingAgents(false);
    }
  }, [oasisUserId, isConnected]);

  const loadPlatformStats = useCallback(async () => {
    if (!isConnected) return;
    try {
      const stats = await OasisAPI.getStats();
      setPlatformStats(stats);
    } catch (error) {
      console.warn('[AIAgent] Load stats failed:', error);
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected && oasisUserId) {
      void loadFeaturedAgents();
      void loadPlatformStats();
    }
  }, [isConnected, oasisUserId, loadFeaturedAgents, loadPlatformStats]);

  // ==================== Search Agents ====================

  const searchAgents = useCallback(async (query: string) => {
    if (!isConnected || !query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await OasisAPI.searchUsers(query, 30);
      const agents = response.users
        .filter((u: OasisUser) => u.is_ai_agent)
        .map(oasisUserToAgentProfile);
      setSearchResults(agents);
    } catch (error) {
      console.warn('[AIAgent] Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [isConnected]);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  // ==================== Agent Profile Detail ====================

  const loadAgentProfile = useCallback(async (userId: number) => {
    if (!isConnected) return null;

    try {
      const [profileData, postsData] = await Promise.all([
        OasisAPI.getPlayerProfile(userId),
        OasisAPI.getUserPosts(userId, 1, 10),
      ]);

      const profile = oasisUserToAgentProfile(profileData);
      setSelectedAgent(profile);
      setSelectedAgentPosts(postsData.posts);

      // Check if player follows this agent
      if (oasisUserId) {
        const followData = await OasisAPI.isFollowing(oasisUserId, userId);
        setIsFollowingSelected(followData.is_following);
      }

      return profile;
    } catch (error) {
      console.warn('[AIAgent] Load profile failed:', error);
      return null;
    }
  }, [isConnected, oasisUserId]);

  const clearSelectedAgent = useCallback(() => {
    setSelectedAgent(null);
    setSelectedAgentPosts([]);
    setIsFollowingSelected(false);
  }, []);

  // ==================== Follow/Unfollow Agent ====================

  const followAgent = useCallback(async (agentUserId: number) => {
    if (!isConnected || !oasisUserId) return false;

    try {
      await OasisAPI.followUser(oasisUserId, agentUserId);
      setIsFollowingSelected(true);

      // Update featured agents list
      setFeaturedAgents(prev =>
        prev.filter(a => a.userId !== agentUserId)
      );

      return true;
    } catch (error) {
      console.warn('[AIAgent] Follow failed:', error);
      return false;
    }
  }, [isConnected, oasisUserId]);

  const unfollowAgent = useCallback(async (agentUserId: number) => {
    if (!isConnected || !oasisUserId) return false;

    try {
      await OasisAPI.unfollowUser(oasisUserId, agentUserId);
      setIsFollowingSelected(false);
      return true;
    } catch (error) {
      console.warn('[AIAgent] Unfollow failed:', error);
      return false;
    }
  }, [isConnected, oasisUserId]);

  // ==================== Agent Followers/Following ====================

  const getAgentFollowers = useCallback(async (agentUserId: number) => {
    if (!isConnected) return [];
    try {
      const response = await OasisAPI.getFollowers(agentUserId, 50);
      return response.followers.map(oasisUserToAgentProfile);
    } catch (error) {
      console.warn('[AIAgent] Get followers failed:', error);
      return [];
    }
  }, [isConnected]);

  const getAgentFollowing = useCallback(async (agentUserId: number) => {
    if (!isConnected) return [];
    try {
      const response = await OasisAPI.getFollowing(agentUserId, 50);
      return response.following.map(oasisUserToAgentProfile);
    } catch (error) {
      console.warn('[AIAgent] Get following failed:', error);
      return [];
    }
  }, [isConnected]);

  // ==================== Agent Discovery by Category ====================

  const getAgentsByCity = useCallback(async (city: string) => {
    if (!isConnected) return [];
    try {
      const response = await OasisAPI.searchUsers(city, 20);
      return response.users
        .filter((u: OasisUser) => u.is_ai_agent && u.city === city)
        .map(oasisUserToAgentProfile);
    } catch (error) {
      console.warn('[AIAgent] Get by city failed:', error);
      return [];
    }
  }, [isConnected]);

  const getAgentsByOccupation = useCallback(async (occupation: string) => {
    if (!isConnected) return [];
    try {
      const response = await OasisAPI.searchUsers(occupation, 20);
      return response.users
        .filter((u: OasisUser) => u.is_ai_agent)
        .map(oasisUserToAgentProfile);
    } catch (error) {
      console.warn('[AIAgent] Get by occupation failed:', error);
      return [];
    }
  }, [isConnected]);

  // ==================== Computed Values ====================

  const totalAgents = useMemo(() => {
    return platformStats?.ai_agents || 0;
  }, [platformStats]);

  const simulationActive = useMemo(() => {
    return platformStats?.simulation?.is_running || false;
  }, [platformStats]);

  return {
    // State
    featuredAgents,
    nearbyAgents,
    similarAgents,
    searchResults,
    isSearching,
    isLoadingAgents,
    selectedAgent,
    selectedAgentPosts,
    isFollowingSelected,
    platformStats,
    totalAgents,
    simulationActive,

    // Actions
    loadFeaturedAgents,
    searchAgents,
    clearSearch,
    loadAgentProfile,
    clearSelectedAgent,
    followAgent,
    unfollowAgent,
    getAgentFollowers,
    getAgentFollowing,
    getAgentsByCity,
    getAgentsByOccupation,
    loadPlatformStats,
  };
});