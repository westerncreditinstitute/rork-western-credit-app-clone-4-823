import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Verified,
  Home,
  Users,
  Calendar,
  MessageCircle,
  UserPlus,
  UserCheck,
  Share2,
  TrendingUp,
  Eye,
  Heart,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useCommunityHomes } from '@/contexts/CommunityHomesContext';
import { useSocialFeed } from '@/contexts/SocialFeedContext';
import HomeCard from '@/components/community/HomeCard';
import {
  formatCompactNumber,
  getTimeAgo,
  getCreditScoreColor,
  getCreditScoreLabel,
  CommunityHome,
} from '@/types/communityHomes';

const { width } = Dimensions.get('window');

export default function OwnerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    getOwnerById,
    getHomesByOwner,
    followingIds,
    toggleFollow,
    toggleLike,
    toggleSave,
  } = useCommunityHomes();
  const { friends } = useSocialFeed();

  const communityOwner = getOwnerById(id || '');
  const socialFriend = !communityOwner ? friends.find(f => f.id === id) : null;

  const owner = communityOwner ?? (socialFriend ? {
    id: socialFriend.id,
    name: socialFriend.name,
    avatar: socialFriend.avatar,
    creditScore: socialFriend.creditScore,
    level: socialFriend.level,
    isOnline: socialFriend.isOnline,
    bio: socialFriend.city ? `Based in ${socialFriend.city}` : '',
    isVerified: socialFriend.level >= 40,
    totalHomes: 0,
    followers: Math.floor(Math.random() * 500) + 50,
    following: Math.floor(Math.random() * 200) + 20,
    joinedDate: new Date(socialFriend.addedAt).toISOString(),
    badges: [] as { id: string; name: string; icon: string; color: string; earnedAt: string }[],
  } : null);

  const ownerHomes = communityOwner ? getHomesByOwner(id || '') : [];
  const isFollowing = followingIds.includes(id || '');

  const [activeTab, setActiveTab] = useState<'homes' | 'about'>('homes');

  const handleFollow = useCallback(() => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFollow(id);
  }, [id, toggleFollow]);

  const handleHomePress = useCallback((home: CommunityHome) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/home-detail?id=${home.id}` as any);
  }, [router]);

  const handleVisitHome = useCallback((home: CommunityHome) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/home-visit?id=${home.id}` as any);
  }, [router]);

  const styles = createStyles(colors, isDark);

  if (!owner) {
    return (
      <View style={styles.notFoundContainer}>
        <Users color={colors.textLight} size={64} />
        <Text style={styles.notFoundText}>Profile not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalLikes = ownerHomes.reduce((sum, home) => sum + home.stats.likes, 0);
  const totalVisits = ownerHomes.reduce((sum, home) => sum + home.stats.visits, 0);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={isDark ? ['#0F172A', '#1E293B'] : ['#001F42', '#003D82']}
          style={[styles.header, { paddingTop: insets.top }]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <ArrowLeft color="#FFFFFF" size={24} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn}>
              <Share2 color="#FFFFFF" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: owner.avatar }} style={styles.avatar} />
              {owner.isOnline && <View style={styles.onlineIndicator} />}
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{owner.level}</Text>
              </View>
            </View>

            <View style={styles.nameRow}>
              <Text style={styles.ownerName}>{owner.name}</Text>
              {owner.isVerified && (
                <Verified color="#3B82F6" size={20} fill="#3B82F6" />
              )}
            </View>

            <View style={[styles.creditBadge, { backgroundColor: getCreditScoreColor(owner.creditScore) + '30' }]}>
              <Text style={[styles.creditScore, { color: getCreditScoreColor(owner.creditScore) }]}>
                {owner.creditScore} Credit Score
              </Text>
              <Text style={[styles.creditLabel, { color: getCreditScoreColor(owner.creditScore) }]}>
                {getCreditScoreLabel(owner.creditScore)}
              </Text>
            </View>

            {owner.bio && (
              <Text style={styles.bio}>{owner.bio}</Text>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{owner.totalHomes}</Text>
                <Text style={styles.statLabel}>Homes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCompactNumber(owner.followers)}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCompactNumber(owner.following)}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followingButton]}
                onPress={handleFollow}
              >
                {isFollowing ? (
                  <UserCheck color={colors.text} size={18} />
                ) : (
                  <UserPlus color="#FFFFFF" size={18} />
                )}
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.messageButton}>
                <MessageCircle color={colors.primary} size={18} />
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {owner.badges.length > 0 && (
            <View style={styles.badgesSection}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.badgesContainer}
              >
                {owner.badges.map((badge) => (
                  <View
                    key={badge.id}
                    style={[styles.badgeCard, { borderColor: badge.color + '40' }]}
                  >
                    <View style={[styles.badgeIconWrap, { backgroundColor: badge.color + '20' }]}>
                      <Text style={styles.badgeIcon}>{badge.icon}</Text>
                    </View>
                    <Text style={styles.badgeName}>{badge.name}</Text>
                    <Text style={styles.badgeDate}>{getTimeAgo(Number(badge.earnedAt))}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.statsCards}>
            <View style={styles.statsCard}>
              <Eye color={colors.primary} size={22} />
              <Text style={styles.statsCardValue}>{formatCompactNumber(totalVisits)}</Text>
              <Text style={styles.statsCardLabel}>Total Visits</Text>
            </View>
            <View style={styles.statsCard}>
              <Heart color="#EF4444" size={22} />
              <Text style={styles.statsCardValue}>{formatCompactNumber(totalLikes)}</Text>
              <Text style={styles.statsCardLabel}>Total Likes</Text>
            </View>
            <View style={styles.statsCard}>
              <Calendar color={colors.info} size={22} />
              <Text style={styles.statsCardValue}>{getTimeAgo(Number(owner.joinedDate))}</Text>
              <Text style={styles.statsCardLabel}>Member</Text>
            </View>
          </View>

          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'homes' && styles.tabActive]}
              onPress={() => setActiveTab('homes')}
            >
              <Home
                color={activeTab === 'homes' ? '#FFFFFF' : colors.textSecondary}
                size={18}
              />
              <Text style={[styles.tabText, activeTab === 'homes' && styles.tabTextActive]}>
                Homes ({ownerHomes.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'about' && styles.tabActive]}
              onPress={() => setActiveTab('about')}
            >
              <Users
                color={activeTab === 'about' ? '#FFFFFF' : colors.textSecondary}
                size={18}
              />
              <Text style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}>
                About
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'homes' && (
            <View style={styles.homesSection}>
              {ownerHomes.map((home) => (
                <HomeCard
                  key={home.id}
                  home={home}
                  onPress={() => handleHomePress(home)}
                  onLike={() => toggleLike(home.id)}
                  onSave={() => toggleSave(home.id)}
                  onComment={() => handleHomePress(home)}
                  onShare={() => console.log('Share', home.id)}
                  onVisit={() => handleVisitHome(home)}
                  onOwnerPress={() => {}}
                />
              ))}
              {ownerHomes.length === 0 && (
                <View style={styles.emptyHomes}>
                  <Home color={colors.textLight} size={48} />
                  <Text style={styles.emptyHomesText}>No homes yet</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'about' && (
            <View style={styles.aboutSection}>
              <View style={styles.aboutCard}>
                <Text style={styles.aboutTitle}>Credit Journey</Text>
                <View style={styles.journeyItem}>
                  <View style={[styles.journeyDot, { backgroundColor: getCreditScoreColor(owner.creditScore) }]} />
                  <View style={styles.journeyContent}>
                    <Text style={styles.journeyLabel}>Current Score</Text>
                    <Text style={[styles.journeyValue, { color: getCreditScoreColor(owner.creditScore) }]}>
                      {owner.creditScore}
                    </Text>
                  </View>
                </View>
                <View style={styles.journeyItem}>
                  <View style={[styles.journeyDot, { backgroundColor: colors.primary }]} />
                  <View style={styles.journeyContent}>
                    <Text style={styles.journeyLabel}>Level Progress</Text>
                    <Text style={styles.journeyValue}>Level {owner.level}</Text>
                  </View>
                </View>
                <View style={styles.journeyItem}>
                  <View style={[styles.journeyDot, { backgroundColor: colors.info }]} />
                  <View style={styles.journeyContent}>
                    <Text style={styles.journeyLabel}>Properties Owned</Text>
                    <Text style={styles.journeyValue}>{owner.totalHomes} homes</Text>
                  </View>
                </View>
              </View>

              <View style={styles.aboutCard}>
                <Text style={styles.aboutTitle}>Community Impact</Text>
                <Text style={styles.aboutText}>
                  {owner.name} has been an active member of our community, inspiring others with their credit journey and real estate achievements.
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: colors.background,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: isDark ? '#0F172A' : '#001F42',
  },
  levelBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: isDark ? '#0F172A' : '#001F42',
  },
  levelText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  ownerName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  creditBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 12,
  },
  creditScore: {
    fontSize: 16,
    fontWeight: '800',
  },
  creditLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  followButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  followingButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  followButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  followingButtonText: {
    color: '#FFFFFF',
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  messageButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  content: {
    padding: 20,
  },
  badgesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  badgesContainer: {
    gap: 12,
  },
  badgeCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: 110,
    borderWidth: 1,
  },
  badgeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgeIcon: {
    fontSize: 24,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDate: {
    fontSize: 10,
    color: colors.textLight,
  },
  statsCards: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statsCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statsCardValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
  },
  statsCardLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  homesSection: {},
  emptyHomes: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyHomesText: {
    fontSize: 16,
    color: colors.textLight,
    marginTop: 12,
  },
  aboutSection: {
    gap: 16,
  },
  aboutCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  journeyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  journeyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  journeyContent: {
    marginLeft: 14,
  },
  journeyLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 2,
  },
  journeyValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  aboutText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
