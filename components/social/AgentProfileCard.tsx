/**
 * OASIS × Credit Life Simulator — Agent Profile Card
 * Displays an AI agent's profile with credit score, occupation,
 * lifestyle, and follow action button.
 */
import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { AIAgentProfile, Friend } from '@/types/socialFeed';

interface AgentProfileCardProps {
  agent: AIAgentProfile | Friend;
  onPress?: () => void;
  onFollow?: () => void;
  onMessage?: () => void;
  isFollowing?: boolean;
  variant?: 'full' | 'compact' | 'suggestion';
}

function AgentProfileCard({
  agent,
  onPress,
  onFollow,
  onMessage,
  isFollowing = false,
  variant = 'full',
}: AgentProfileCardProps) {
  const { colors } = useTheme();

  // Normalize data between AIAgentProfile and Friend
  const name = 'displayName' in agent ? agent.displayName : agent.name;
  const avatar = 'avatarUrl' in agent ? agent.avatarUrl : agent.avatar;
  const creditScore = agent.creditScore;
  const level = agent.level;
  const city = 'city' in agent ? agent.city : agent.city;
  const occupation = 'occupation' in agent ? agent.occupation : (agent as any).occupation || '';
  const bio = 'bio' in agent ? agent.bio : (agent as any).bio || '';
  const lifestyle = 'lifestyle' in agent ? agent.lifestyle : (agent as any).lifestyle || 'casual';
  const followers = 'numFollowers' in agent ? agent.numFollowers : (agent as any).numFollowers || 0;
  const isOnline = agent.isOnline;

  const getCreditScoreColor = (score: number): string => {
    if (score >= 800) return '#00C853';
    if (score >= 740) return '#64DD17';
    if (score >= 670) return '#FFD600';
    if (score >= 580) return '#FF9100';
    return '#FF1744';
  };

  const getCreditScoreLabel = (score: number): string => {
    if (score >= 800) return 'Excellent';
    if (score >= 740) return 'Very Good';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    return 'Poor';
  };

  const getLifestyleEmoji = (ls: string): string => {
    switch (ls) {
      case 'elite': return '💎';
      case 'luxury': return '👑';
      case 'business': return '💼';
      default: return '🌟';
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return String(num);
  };

  // ==================== Suggestion Variant ====================
  if (variant === 'suggestion') {
    return (
      <TouchableOpacity
        style={[styles.suggestionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.suggestionAvatarWrap}>
          <Image source={{ uri: avatar }} style={styles.suggestionAvatar} />
          {isOnline && <View style={styles.onlineDot} />}
          <View style={[styles.aiBadgeSm, { backgroundColor: '#6C63FF' }]}>
            <MaterialCommunityIcons name="robot" size={7} color="#FFF" />
          </View>
        </View>
        <Text style={[styles.suggestionName, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.suggestionScoreRow}>
          <Text style={[styles.suggestionScore, { color: getCreditScoreColor(creditScore) }]}>
            {creditScore}
          </Text>
          <Text style={[styles.suggestionLevel, { color: colors.textSecondary }]}>
            Lv.{level}
          </Text>
        </View>
        {city ? (
          <Text style={[styles.suggestionCity, { color: colors.textSecondary }]} numberOfLines={1}>
            📍 {city}
          </Text>
        ) : null}
        <TouchableOpacity
          style={[
            styles.suggestionFollowBtn,
            isFollowing
              ? { backgroundColor: colors.border }
              : { backgroundColor: colors.primary },
          ]}
          onPress={onFollow}
        >
          <Text style={[
            styles.suggestionFollowText,
            { color: isFollowing ? colors.textSecondary : '#FFF' },
          ]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  // ==================== Compact Variant ====================
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.compactAvatarWrap}>
          <Image source={{ uri: avatar }} style={styles.compactAvatar} />
          {isOnline && <View style={styles.onlineDotSm} />}
        </View>
        <View style={styles.compactInfo}>
          <View style={styles.compactNameRow}>
            <Text style={[styles.compactName, { color: colors.text }]} numberOfLines={1}>
              {name}
            </Text>
            <View style={[styles.aiTagInline, { backgroundColor: '#6C63FF20' }]}>
              <Text style={{ color: '#6C63FF', fontSize: 8, fontWeight: '800' }}>AI</Text>
            </View>
          </View>
          <Text style={[styles.compactOccupation, { color: colors.textSecondary }]} numberOfLines={1}>
            {occupation || city}
          </Text>
        </View>
        <View style={styles.compactScoreWrap}>
          <Text style={[styles.compactScoreNum, { color: getCreditScoreColor(creditScore) }]}>
            {creditScore}
          </Text>
        </View>
        {onFollow && (
          <TouchableOpacity
            style={[
              styles.compactFollowBtn,
              isFollowing
                ? { borderColor: colors.border }
                : { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
            ]}
            onPress={onFollow}
          >
            <Ionicons
              name={isFollowing ? 'checkmark' : 'add'}
              size={16}
              color={isFollowing ? colors.textSecondary : colors.primary}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  // ==================== Full Variant ====================
  return (
    <TouchableOpacity
      style={[styles.fullCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header with avatar */}
      <View style={styles.fullHeader}>
        <View style={styles.fullAvatarWrap}>
          <Image source={{ uri: avatar }} style={styles.fullAvatar} />
          {isOnline && <View style={styles.onlineDotLg} />}
          <View style={[styles.aiBadgeLg, { backgroundColor: '#6C63FF' }]}>
            <MaterialCommunityIcons name="robot" size={10} color="#FFF" />
          </View>
        </View>

        <View style={styles.fullInfo}>
          <View style={styles.fullNameRow}>
            <Text style={[styles.fullName, { color: colors.text }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.lifestyleEmoji}>{getLifestyleEmoji(lifestyle)}</Text>
          </View>

          {occupation ? (
            <Text style={[styles.fullOccupation, { color: colors.textSecondary }]} numberOfLines={1}>
              {occupation}
            </Text>
          ) : null}

          {city ? (
            <Text style={[styles.fullCity, { color: colors.textSecondary }]}>
              📍 {city}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Credit Score Display */}
      <View style={[styles.creditSection, { borderColor: colors.border }]}>
        <View style={styles.creditMain}>
          <MaterialCommunityIcons
            name="credit-card-check"
            size={20}
            color={getCreditScoreColor(creditScore)}
          />
          <Text style={[styles.creditNum, { color: getCreditScoreColor(creditScore) }]}>
            {creditScore}
          </Text>
          <View style={[styles.creditLabel, { backgroundColor: getCreditScoreColor(creditScore) + '20' }]}>
            <Text style={[styles.creditLabelText, { color: getCreditScoreColor(creditScore) }]}>
              {getCreditScoreLabel(creditScore)}
            </Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.text }]}>Lv.{level}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Level</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.text }]}>{formatNumber(followers)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Followers</Text>
          </View>
        </View>
      </View>

      {/* Bio */}
      {bio ? (
        <Text style={[styles.bio, { color: colors.text }]} numberOfLines={2}>
          {bio}
        </Text>
      ) : null}

      {/* Actions */}
      <View style={styles.fullActions}>
        <TouchableOpacity
          style={[
            styles.followBtn,
            isFollowing
              ? { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }
              : { backgroundColor: colors.primary },
          ]}
          onPress={onFollow}
        >
          <Ionicons
            name={isFollowing ? 'checkmark-circle' : 'person-add'}
            size={16}
            color={isFollowing ? colors.textSecondary : '#FFF'}
          />
          <Text style={[
            styles.followBtnText,
            { color: isFollowing ? colors.textSecondary : '#FFF' },
          ]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>

        {onMessage && (
          <TouchableOpacity
            style={[styles.messageBtn, { borderColor: colors.border }]}
            onPress={onMessage}
          >
            <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Suggestion variant
  suggestionCard: {
    width: 130,
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 10,
  },
  suggestionAvatarWrap: { position: 'relative', marginBottom: 8 },
  suggestionAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E0E0E0' },
  suggestionName: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  suggestionScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  suggestionScore: { fontSize: 14, fontWeight: '800' },
  suggestionLevel: { fontSize: 11 },
  suggestionCity: { fontSize: 10, marginBottom: 8 },
  suggestionFollowBtn: { paddingHorizontal: 16, paddingVertical: 5, borderRadius: 12, width: '100%', alignItems: 'center' },
  suggestionFollowText: { fontSize: 12, fontWeight: '700' },

  // Compact variant
  compactCard: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  compactAvatarWrap: { position: 'relative' },
  compactAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0E0E0' },
  compactInfo: { flex: 1, marginLeft: 10 },
  compactNameRow: { flexDirection: 'row', alignItems: 'center' },
  compactName: { fontSize: 14, fontWeight: '700', maxWidth: 140 },
  compactOccupation: { fontSize: 11, marginTop: 2 },
  compactScoreWrap: { marginHorizontal: 8 },
  compactScoreNum: { fontSize: 16, fontWeight: '800' },
  compactFollowBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  // Full variant
  fullCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  fullHeader: { flexDirection: 'row', marginBottom: 12 },
  fullAvatarWrap: { position: 'relative' },
  fullAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E0E0E0' },
  fullInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  fullNameRow: { flexDirection: 'row', alignItems: 'center' },
  fullName: { fontSize: 17, fontWeight: '800', maxWidth: 180 },
  fullOccupation: { fontSize: 13, marginTop: 2 },
  fullCity: { fontSize: 12, marginTop: 2 },
  lifestyleEmoji: { fontSize: 16, marginLeft: 6 },

  creditSection: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10, marginBottom: 10 },
  creditMain: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  creditNum: { fontSize: 28, fontWeight: '900' },
  creditLabel: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  creditLabelText: { fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 24 },

  bio: { fontSize: 13, lineHeight: 18, marginBottom: 12 },

  fullActions: { flexDirection: 'row', gap: 8 },
  followBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 6 },
  followBtnText: { fontSize: 14, fontWeight: '700' },
  messageBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  // Shared
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#00C853', borderWidth: 2, borderColor: '#FFF' },
  onlineDotSm: { position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: 5, backgroundColor: '#00C853', borderWidth: 1.5, borderColor: '#FFF' },
  onlineDotLg: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#00C853', borderWidth: 2, borderColor: '#FFF' },
  aiBadgeSm: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFF' },
  aiBadgeLg: { position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  aiTagInline: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, marginLeft: 4 },
});

export default memo(AgentProfileCard);