/**
 * OASIS AI Agent Profile Screen
 * Comprehensive profile view for AI agents with financial data,
 * activity history, and social stats. Links from Live Feed and Agent Discovery.
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Animated,
  FlatList,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Bot,
  MapPin,
  Briefcase,
  TrendingUp,
  Star,
  UserPlus,
  UserCheck,
  Heart,
  MessageCircle,
  ChevronRight,
  Shield,
  Award,
  DollarSign,
  Home,
  GraduationCap,
  BarChart3,
  Clock,
  Zap,
  Crown,
  Target,
  Activity,
  CreditCard,
  PiggyBank,
  Building2,
  Wallet,
  Users,
  ThumbsUp,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { aiAgentLiveFeed, AI_AGENT_PROFILES } from '@/services/AIAgentLiveFeedService';
import OasisAPI from '@/services/OasisAPIService';
import type { AgentProfileResponse } from '@/services/OasisAPIService';
import type { SocialPost } from '@/types/socialFeed';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================
// Type Definitions
// ============================================================

interface AgentProfile {
  user_id: number;
  display_name: string;
  user_name?: string;
  age?: number;
  city: string;
  occupation: string;
  education_level?: string;
  credit_score: number;
  credit_tier: string;
  credit_rank: number;
  net_worth: number;
  net_worth_rank: number;
  total_agents?: number;
  total_users?: number;
  num_followers: number;
  num_following: number;
  num_posts: number;
  avatar_url?: string;
  tier?: string;
  agent_tier?: string;
  bio?: string;
  lifestyle?: string;
  personality_type?: string;
  level?: number;
  monthly_income?: number;
  is_online?: boolean;
  created_at?: string;
  last_active_at?: string;
  agent_id?: string;
  career?: { current_job?: string; salary?: number; company?: string };
  current_job?: { job_title?: string; company_name?: string; salary_monthly?: number };
  education: any;
  investments: any;
  properties: any;
  credit_events: any;
  activity_breakdown: Record<string, number>;
  [key: string]: any; // Allow extra fields from API
}

interface LiveFeedActivity {
  post_id: number;
  user_id?: number;
  display_name?: string;
  post_type: string;
  content: string;
  created_at: string;
  category?: string;
  icon?: string;
  label?: string;
  badge?: string | null;
  num_likes?: number;
  num_comments?: number;
  activity_category?: string;
  activity_icon?: string;
  activity_label?: string;
  [key: string]: any; // Allow extra fields from API
}

// ============================================================
// Utility Functions
// ============================================================

const CREDIT_SCORE_COLOR = (score: number): string => {
  if (score >= 800) return '#10B981';
  if (score >= 740) return '#34D399';
  if (score >= 670) return '#F59E0B';
  if (score >= 580) return '#F97316';
  return '#EF4444';
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

const formatNumber = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
};

const timeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
};

const getTierBadge = (tier: string): { label: string; color: string; icon: string } => {
  switch (tier) {
    case 'live':
      return { label: 'LIVE', color: '#EF4444', icon: '🔴' };
    case 'warm':
      return { label: 'ACTIVE', color: '#F59E0B', icon: '🟡' };
    case 'cold':
      return { label: 'IDLE', color: '#6B7280', icon: '⚪' };
    default:
      return { label: 'AGENT', color: '#8B5CF6', icon: '🤖' };
  }
};

const getActivityIcon = (postType: string): string => {
  const icons: Record<string, string> = {
    job: '💼', education: '🎓', investment: '📊',
    loan: '💳', real_estate: '🏠', budget: '📋',
    credit: '⬆️', wealth: '💎',
    achievement: '🏆', milestone: '🎯',
    status: '💬', tip: '💡', question: '❓',
    home: '🏠',
  };
  return icons[postType] || '📌';
};

const getActivityLabel = (postType: string): string => {
  const labels: Record<string, string> = {
    job: 'Career Update', education: 'Education', investment: 'Investment',
    loan: 'Loan Activity', real_estate: 'Real Estate', budget: 'Budget',
    credit: 'Credit Activity', wealth: 'Wealth Update',
    achievement: 'Achievement', milestone: 'Milestone',
    status: 'Status Update', tip: 'Shared a Tip', question: 'Question',
    home: 'Home Update',
  };
  return labels[postType] || 'Activity';
};

// ============================================================
// Profile Tab Type
// ============================================================
type ProfileTab = 'activity' | 'financial' | 'about';

// ============================================================
// Sub-Components
// ============================================================

const CreditScoreGauge = React.memo(({ score, tier, colors }: {
  score: number; tier: string; colors: any;
}) => {
  const scoreColor = CREDIT_SCORE_COLOR(score);
  const percentage = Math.min(Math.max((score - 300) / 550, 0), 1);

  return (
    <View style={[styles.gaugeContainer, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <Text style={[styles.gaugeTitle, { color: colors.textSecondary }]}>Credit Score</Text>
      <View style={styles.gaugeRow}>
        <View style={styles.gaugeVisual}>
          <Text style={[styles.gaugeScore, { color: scoreColor }]}>{score}</Text>
          <View style={[styles.gaugeBarBg, { backgroundColor: colors.borderLight }]}>
            <View style={[styles.gaugeBarFill, { width: `${percentage * 100}%`, backgroundColor: scoreColor }]} />
          </View>
          <View style={styles.gaugeLabels}>
            <Text style={[styles.gaugeLabelText, { color: colors.textLight }]}>300</Text>
            <Text style={[styles.gaugeLabelText, { color: colors.textLight }]}>850</Text>
          </View>
        </View>
        <View style={[styles.gaugeTierBadge, { backgroundColor: scoreColor + '20' }]}>
          <Text style={[styles.gaugeTierText, { color: scoreColor }]}>{tier}</Text>
        </View>
      </View>
    </View>
  );
});

const StatCard = React.memo(({ icon: Icon, label, value, color, colors }: {
  icon: any; label: string; value: string; color: string; colors: any;
}) => (
  <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
    <View style={[styles.statIconWrap, { backgroundColor: color + '15' }]}>
      <Icon size={16} color={color} />
    </View>
    <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
  </View>
));

const ActivityItem = React.memo(({ activity, colors }: {
  activity: LiveFeedActivity; colors: any;
}) => {
  const postType = activity.post_type || 'status';

  return (
    <View style={[styles.activityItem, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={styles.activityHeader}>
        <Text style={styles.activityEmoji}>{getActivityIcon(postType)}</Text>
        <View style={styles.activityMeta}>
          <Text style={[styles.activityType, { color: colors.text }]}>
            {getActivityLabel(postType)}
          </Text>
          <Text style={[styles.activityTime, { color: colors.textLight }]}>
            {timeAgo(activity.created_at)}
          </Text>
        </View>
        {activity.badge && (
          <Text style={styles.activityBadge}>{activity.badge}</Text>
        )}
      </View>
      <Text style={[styles.activityContent, { color: colors.textSecondary }]} numberOfLines={3}>
        {activity.content}
      </Text>
      <View style={styles.activityFooter}>
        <View style={styles.activityStat}>
          <ThumbsUp size={12} color={colors.textLight} />
          <Text style={[styles.activityStatText, { color: colors.textLight }]}>
            {activity.num_likes}
          </Text>
        </View>
        <View style={styles.activityStat}>
          <MessageCircle size={12} color={colors.textLight} />
          <Text style={[styles.activityStatText, { color: colors.textLight }]}>
            {activity.num_comments}
          </Text>
        </View>
      </View>
    </View>
  );
});

const FinancialSection = React.memo(({ title, icon: Icon, iconColor, children, colors }: {
  title: string; icon: any; iconColor: string; children: React.ReactNode; colors: any;
}) => (
  <View style={[styles.financialSection, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
    <View style={styles.financialSectionHeader}>
      <View style={[styles.financialSectionIcon, { backgroundColor: iconColor + '15' }]}>
        <Icon size={16} color={iconColor} />
      </View>
      <Text style={[styles.financialSectionTitle, { color: colors.text }]}>{title}</Text>
    </View>
    {children}
  </View>
));

// ============================================================
// Main Component
// ============================================================

export default function AgentProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ agentId?: string; userId?: string }>();
  const agentId = params.agentId || '';
  const userId = parseInt(params.userId || '0', 10);
  const { colors, isDark } = useTheme();

  // State
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [activities, setActivities] = useState<LiveFeedActivity[]>([]);
  const [activeTab, setActiveTab] = useState<ProfileTab>('activity');
  const [loading, setLoading] = useState(true);
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivity, setHasMoreActivity] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLocalAgent, setIsLocalAgent] = useState(false);

  // Animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Build profile from local mock agent data
  const buildLocalProfile = useCallback((agent: typeof AI_AGENT_PROFILES[0]): AgentProfile => {
    const posts = aiAgentLiveFeed.getAgentPosts(agent.id);
    const creditScore = agent.creditScore;
    const creditTier = creditScore >= 800 ? 'Exceptional' : creditScore >= 740 ? 'Very Good' : creditScore >= 670 ? 'Good' : creditScore >= 580 ? 'Fair' : 'Poor';
    return {
      user_id: 0,
      display_name: agent.name,
      user_name: agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      age: 25 + Math.floor(Math.random() * 20),
      city: agent.city,
      occupation: agent.occupation,
      education_level: 'College',
      credit_score: creditScore,
      credit_tier: creditTier,
      credit_rank: Math.floor(Math.random() * 5000) + 1,
      net_worth: Math.floor(Math.random() * 500000) + 10000,
      net_worth_rank: Math.floor(Math.random() * 5000) + 1,
      total_agents: 10000,
      total_users: 10000,
      num_followers: Math.floor(Math.random() * 500) + 50,
      num_following: Math.floor(Math.random() * 200) + 20,
      num_posts: posts.length,
      avatar_url: agent.avatar,
      tier: 'Standard',
      agent_tier: 'warm',
      bio: `${agent.name} is an AI agent in the Credit Life Simulator, living in ${agent.city} and working as a ${agent.occupation}.`,
      lifestyle: 'moderate',
      level: agent.level,
      monthly_income: Math.floor(Math.random() * 8000) + 3000,
      is_online: Math.random() > 0.3,
      agent_id: agent.id,
      current_job: { job_title: agent.occupation, company_name: 'OASIS Corp', salary_monthly: Math.floor(Math.random() * 8000) + 3000 },
      education: [],
      investments: { count: 0, total_value: 0, holdings: [] },
      properties: [],
      credit_events: [],
      activity_breakdown: {},
    };
  }, []);

  // Load profile - try OASIS API first, fall back to local data
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      // Try OASIS API if we have a userId
      if (userId > 0) {
        try {
          const [profileRes, activityRes] = await Promise.all([
            OasisAPI.getAgentProfile(userId),
            OasisAPI.getAgentActivity(userId, 1, 20),
          ]);
          setProfile(profileRes as unknown as AgentProfile);
          setActivities((activityRes.activities || []) as unknown as LiveFeedActivity[]);
          setHasMoreActivity(activityRes.has_more);
          setActivityPage(1);
          setIsLocalAgent(false);

          Animated.parallel([
            Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(contentOpacity, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
          ]).start();
          return;
        } catch (apiErr) {
          console.warn('OASIS API failed, trying local data:', apiErr);
        }
      }

      // Fall back to local mock agent data
      if (agentId) {
        const localAgent = aiAgentLiveFeed.getAgentById(agentId);
        if (localAgent) {
          const localProfile = buildLocalProfile(localAgent);
          setProfile(localProfile);
          // Convert local posts to activity items
          const posts = aiAgentLiveFeed.getAgentPosts(agentId);
          const localActivities: LiveFeedActivity[] = posts.map((p, i) => ({
            post_id: parseInt(p.id.replace(/\D/g, '') || String(i), 10),
            user_id: 0,
            display_name: p.authorName,
            post_type: p.postType || 'status',
            content: p.text || p.content || '',
            created_at: new Date(p.createdAt).toISOString(),
            category: 'general',
            icon: '📋',
            label: p.postType || 'Update',
            num_likes: p.likes || 0,
            num_comments: p.comments?.length || 0,
          }));
          setActivities(localActivities);
          setHasMoreActivity(false);
          setIsLocalAgent(true);

          Animated.parallel([
            Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(contentOpacity, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
          ]).start();
          return;
        }
      }

      console.error('No agent found for agentId:', agentId, 'userId:', userId);
    } catch (err) {
      console.error('Failed to load agent profile:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, agentId, buildLocalProfile]);

  // Load more activity (OASIS only)
  const loadMoreActivity = useCallback(async () => {
    if (isLocalAgent || !userId || loadingMore || !hasMoreActivity) return;
    setLoadingMore(true);
    try {
      const nextPage = activityPage + 1;
      const res = await OasisAPI.getAgentActivity(userId, nextPage, 20);
      setActivities(prev => [...prev, ...((res.activities || []) as unknown as LiveFeedActivity[])]);
      setHasMoreActivity(res.has_more);
      setActivityPage(nextPage);
    } catch (err) {
      console.error('Failed to load more activity:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [isLocalAgent, userId, activityPage, loadingMore, hasMoreActivity]);

  // Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, [loadProfile]);

  // Follow/Unfollow via OasisAPI (OASIS agents only)
  const handleFollowToggle = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isLocalAgent) {
      // Toggle local follow state
      setIsFollowing(prev => !prev);
      if (profile) {
        setProfile({
          ...profile,
          num_followers: isFollowing
            ? Math.max(0, profile.num_followers - 1)
            : profile.num_followers + 1,
        });
      }
      return;
    }
    if (!userId) return;
    try {
      if (isFollowing) {
        await OasisAPI.unfollowUser(0, userId);
        setIsFollowing(false);
        if (profile) {
          setProfile({ ...profile, num_followers: Math.max(0, profile.num_followers - 1) });
        }
      } else {
        await OasisAPI.followUser(0, userId);
        setIsFollowing(true);
        if (profile) {
          setProfile({ ...profile, num_followers: profile.num_followers + 1 });
        }
      }
    } catch (err) {
      console.error('Follow toggle failed:', err);
    }
  }, [userId, isFollowing, isLocalAgent, profile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ============================================================
  // Render Tabs
  // ============================================================

  const renderActivityTab = useMemo(() => {
    if (activities.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Activity size={40} color={colors.textLight} />
          <Text style={[styles.emptyText, { color: colors.textLight }]}>No activity yet</Text>
        </View>
      );
    }
    return (
      <View>
        {activities.map((activity, index) => (
          <ActivityItem key={`${activity.post_id}-${index}`} activity={activity} colors={colors} />
        ))}
        {hasMoreActivity && (
          <TouchableOpacity
            style={[styles.loadMoreBtn, { borderColor: colors.borderLight }]}
            onPress={loadMoreActivity}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load More Activity</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  }, [activities, hasMoreActivity, loadingMore, colors]);

  const renderFinancialTab = useMemo(() => {
    if (!profile) return null;

    return (
      <View>
        {/* Credit Score Details */}
        <CreditScoreGauge score={profile.credit_score} tier={profile.credit_tier} colors={colors} />

        {/* Credit Rank */}
        <View style={[styles.rankCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.rankRow}>
            <View style={styles.rankItem}>
              <Text style={[styles.rankValue, { color: colors.primary }]}>
                #{profile.credit_rank.toLocaleString()}
              </Text>
              <Text style={[styles.rankLabel, { color: colors.textSecondary }]}>Credit Rank</Text>
            </View>
            <View style={[styles.rankDivider, { backgroundColor: colors.borderLight }]} />
            <View style={styles.rankItem}>
              <Text style={[styles.rankValue, { color: '#10B981' }]}>
                #{profile.net_worth_rank.toLocaleString()}
              </Text>
              <Text style={[styles.rankLabel, { color: colors.textSecondary }]}>Wealth Rank</Text>
            </View>
            <View style={[styles.rankDivider, { backgroundColor: colors.borderLight }]} />
            <View style={styles.rankItem}>
              <Text style={[styles.rankValue, { color: colors.textSecondary }]}>
                {formatNumber(profile.total_users || 10000)}
              </Text>
              <Text style={[styles.rankLabel, { color: colors.textSecondary }]}>Total Players</Text>
            </View>
          </View>
        </View>

        {/* Current Job */}
        {profile.current_job && (
          <FinancialSection title="Career" icon={Briefcase} iconColor="#3B82F6" colors={colors}>
            <Text style={[styles.financialValue, { color: colors.text }]}>
              {profile.current_job.job_title}
            </Text>
            <Text style={[styles.financialSubvalue, { color: colors.textSecondary }]}>
              {profile.current_job.company_name}
            </Text>
            <Text style={[styles.financialDetail, { color: '#10B981' }]}>
              {formatCurrency(profile.current_job.salary_monthly || 0)}/mo
            </Text>
          </FinancialSection>
        )}

        {/* Education */}
        {profile.education.length > 0 && (
          <FinancialSection title="Education" icon={GraduationCap} iconColor="#8B5CF6" colors={colors}>
            {profile.education.map((edu: any, i: number) => (
              <View key={i} style={[styles.financialListItem, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
                <Text style={[styles.financialValue, { color: colors.text }]}>
                  {edu.program_name}
                </Text>
                <Text style={[styles.financialSubvalue, { color: colors.textSecondary }]}>
                  {edu.institution}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: edu.status === 'completed' ? '#10B98120' : '#F59E0B20' }]}>
                  <Text style={{ color: edu.status === 'completed' ? '#10B981' : '#F59E0B', fontSize: 11, fontWeight: '600' }}>
                    {edu.status === 'completed' ? '✅ Completed' : '📖 In Progress'}
                  </Text>
                </View>
              </View>
            ))}
          </FinancialSection>
        )}

        {/* Investments */}
        {profile.investments.count > 0 && (
          <FinancialSection title="Investments" icon={TrendingUp} iconColor="#14B8A6" colors={colors}>
            <View style={styles.investmentSummary}>
              <Text style={[styles.financialValue, { color: colors.text }]}>
                {profile.investments.count} Holdings
              </Text>
              <Text style={[styles.financialDetail, { color: '#10B981' }]}>
                Total: {formatCurrency(profile.investments.total_value)}
              </Text>
            </View>
            {profile.investments.holdings.map((inv: any, i: number) => (
              <View key={i} style={[styles.financialListItem, { borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
                <Text style={[styles.financialValue, { color: colors.text }]}>
                  {inv.asset_name}
                </Text>
                <Text style={[styles.financialSubvalue, { color: colors.textSecondary }]}>
                  {inv.asset_type} · {inv.shares_or_units} shares
                </Text>
                <Text style={[styles.financialDetail, { color: '#10B981' }]}>
                  {formatCurrency(inv.current_value)}
                </Text>
              </View>
            ))}
          </FinancialSection>
        )}

        {/* Properties */}
        {profile.properties.length > 0 && (
          <FinancialSection title="Real Estate" icon={Building2} iconColor="#0EA5E9" colors={colors}>
            {profile.properties.map((prop: any, i: number) => (
              <View key={i} style={[styles.financialListItem, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
                <Text style={[styles.financialValue, { color: colors.text }]}>
                  {prop.property_type}
                </Text>
                <Text style={[styles.financialSubvalue, { color: colors.textSecondary }]}>
                  {prop.address}
                </Text>
                <Text style={[styles.financialDetail, { color: '#10B981' }]}>
                  Value: {formatCurrency(prop.current_value)}
                </Text>
              </View>
            ))}
          </FinancialSection>
        )}

        {/* Credit Events */}
        {profile.credit_events.length > 0 && (
          <FinancialSection title="Credit History" icon={Shield} iconColor="#EC4899" colors={colors}>
            {profile.credit_events.slice(0, 5).map((evt: any, i: number) => (
              <View key={i} style={[styles.financialListItem, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
                <View style={styles.creditEventRow}>
                  <Text style={[styles.financialValue, { color: colors.text, flex: 1 }]}>
                    {evt.event_type.replace(/_/g, ' ')}
                  </Text>
                  <Text style={[styles.creditImpact, {
                    color: evt.score_impact >= 0 ? '#10B981' : '#EF4444'
                  }]}>
                    {evt.score_impact >= 0 ? '+' : ''}{evt.score_impact}
                  </Text>
                </View>
                <Text style={[styles.financialSubvalue, { color: colors.textSecondary }]}>
                  {evt.description}
                </Text>
              </View>
            ))}
          </FinancialSection>
        )}

        {/* Activity Breakdown */}
        {Object.keys(profile.activity_breakdown).length > 0 && (
          <FinancialSection title="Activity Breakdown" icon={BarChart3} iconColor="#6366F1" colors={colors}>
            <View style={styles.breakdownGrid}>
              {Object.entries(profile.activity_breakdown)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([type, count]) => (
                  <View key={type} style={[styles.breakdownItem, { backgroundColor: colors.background }]}>
                    <Text style={styles.breakdownEmoji}>{getActivityIcon(type)}</Text>
                    <Text style={[styles.breakdownCount, { color: colors.text }]}>{count}</Text>
                    <Text style={[styles.breakdownType, { color: colors.textLight }]}>
                      {getActivityLabel(type)}
                    </Text>
                  </View>
                ))}
            </View>
          </FinancialSection>
        )}
      </View>
    );
  }, [profile, colors]);

  const renderAboutTab = useMemo(() => {
    if (!profile) return null;
    const tierBadge = getTierBadge(profile.agent_tier || '');

    return (
      <View>
        {/* Bio */}
        <View style={[styles.aboutSection, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.aboutSectionTitle, { color: colors.text }]}>Bio</Text>
          <Text style={[styles.aboutBio, { color: colors.textSecondary }]}>
            {profile.bio || `${profile.display_name} is an AI agent in the Credit Life Simulator, living in ${profile.city} and working as a ${profile.occupation}.`}
          </Text>
        </View>

        {/* Details */}
        <View style={[styles.aboutSection, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.aboutSectionTitle, { color: colors.text }]}>Details</Text>

          <View style={styles.aboutRow}>
            <MapPin size={16} color={colors.textLight} />
            <Text style={[styles.aboutRowLabel, { color: colors.textSecondary }]}>Location</Text>
            <Text style={[styles.aboutRowValue, { color: colors.text }]}>{profile.city}</Text>
          </View>

          <View style={styles.aboutRow}>
            <Briefcase size={16} color={colors.textLight} />
            <Text style={[styles.aboutRowLabel, { color: colors.textSecondary }]}>Occupation</Text>
            <Text style={[styles.aboutRowValue, { color: colors.text }]}>{profile.occupation}</Text>
          </View>

          <View style={styles.aboutRow}>
            <Star size={16} color={colors.textLight} />
            <Text style={[styles.aboutRowLabel, { color: colors.textSecondary }]}>Lifestyle</Text>
            <Text style={[styles.aboutRowValue, { color: colors.text }]}>
              {(profile.lifestyle || 'moderate').charAt(0).toUpperCase() + (profile.lifestyle || 'moderate').slice(1)}
            </Text>
          </View>

          {profile.personality_type ? (
            <View style={styles.aboutRow}>
              <Zap size={16} color={colors.textLight} />
              <Text style={[styles.aboutRowLabel, { color: colors.textSecondary }]}>Personality</Text>
              <Text style={[styles.aboutRowValue, { color: colors.text }]}>{profile.personality_type}</Text>
            </View>
          ) : null}

          <View style={styles.aboutRow}>
            <Bot size={16} color={colors.textLight} />
            <Text style={[styles.aboutRowLabel, { color: colors.textSecondary }]}>Agent Tier</Text>
            <View style={[styles.tierBadgeSmall, { backgroundColor: tierBadge.color + '20' }]}>
              <Text style={{ color: tierBadge.color, fontSize: 11, fontWeight: '700' }}>
                {tierBadge.icon} {tierBadge.label}
              </Text>
            </View>
          </View>

          <View style={styles.aboutRow}>
            <Target size={16} color={colors.textLight} />
            <Text style={[styles.aboutRowLabel, { color: colors.textSecondary }]}>Level</Text>
            <Text style={[styles.aboutRowValue, { color: colors.text }]}>{profile.level || 1}</Text>
          </View>

          <View style={styles.aboutRow}>
            <Clock size={16} color={colors.textLight} />
            <Text style={[styles.aboutRowLabel, { color: colors.textSecondary }]}>Joined</Text>
            <Text style={[styles.aboutRowValue, { color: colors.text }]}>
              {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
            </Text>
          </View>

          {profile.last_active_at && (
            <View style={styles.aboutRow}>
              <Activity size={16} color={colors.textLight} />
              <Text style={[styles.aboutRowLabel, { color: colors.textSecondary }]}>Last Active</Text>
              <Text style={[styles.aboutRowValue, { color: colors.text }]}>
                {timeAgo(profile.last_active_at || new Date().toISOString())}
              </Text>
            </View>
          )}
        </View>

        {/* Agent ID */}
        <View style={[styles.aboutSection, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.aboutSectionTitle, { color: colors.text }]}>Agent Info</Text>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutRowLabel, { color: colors.textSecondary }]}>Agent ID</Text>
            <Text style={[styles.aboutRowValue, { color: colors.textLight, fontSize: 11 }]}>
              {profile.agent_id}
            </Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutRowLabel, { color: colors.textSecondary }]}>User ID</Text>
            <Text style={[styles.aboutRowValue, { color: colors.textLight, fontSize: 11 }]}>
              #{profile.user_id}
            </Text>
          </View>
        </View>
      </View>
    );
  }, [profile, colors]);

  // ============================================================
  // Loading State
  // ============================================================

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>Agent not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const tierBadge = getTierBadge(profile.agent_tier || '');
  const scoreColor = CREDIT_SCORE_COLOR(profile.credit_score);

  // ============================================================
  // Main Render
  // ============================================================

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── Header ── */}
        <Animated.View style={{ opacity: headerOpacity }}>
          <LinearGradient
            colors={isDark ? ['#1a1a2e', '#16213e'] : [scoreColor + '20', colors.background]}
            style={styles.headerGradient}
          >
            {/* Nav Bar */}
            <View style={styles.navBar}>
              <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
                <ArrowLeft size={22} color={colors.text} />
              </TouchableOpacity>
              <View style={[styles.aiBadge, { backgroundColor: tierBadge.color + '20' }]}>
                <Bot size={14} color={tierBadge.color} />
                <Text style={[styles.aiBadgeText, { color: tierBadge.color }]}>
                  {tierBadge.label} AI
                </Text>
              </View>
            </View>

            {/* Avatar & Name */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: profile.avatar_url || 'https://via.placeholder.com/100' }}
                  style={styles.avatar}
                />
                {profile.is_online && <View style={[styles.onlineDot, { borderColor: colors.background }]} />}
              </View>
              <Text style={[styles.displayName, { color: colors.text }]}>{profile.display_name}</Text>
              <Text style={[styles.userName, { color: colors.textSecondary }]}>@{profile.user_name}</Text>

              <View style={styles.locationRow}>
                <MapPin size={13} color={colors.textLight} />
                <Text style={[styles.locationText, { color: colors.textLight }]}>{profile.city}</Text>
                <Text style={[styles.dotSeparator, { color: colors.textLight }]}>·</Text>
                <Briefcase size={13} color={colors.textLight} />
                <Text style={[styles.locationText, { color: colors.textLight }]}>{profile.occupation}</Text>
              </View>
            </View>

            {/* Social Stats Row */}
            <View style={styles.socialRow}>
              <View style={styles.socialItem}>
                <Text style={[styles.socialNumber, { color: colors.text }]}>
                  {formatNumber(profile.num_posts)}
                </Text>
                <Text style={[styles.socialLabel, { color: colors.textSecondary }]}>Posts</Text>
              </View>
              <View style={[styles.socialDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.socialItem}>
                <Text style={[styles.socialNumber, { color: colors.text }]}>
                  {formatNumber(profile.num_followers)}
                </Text>
                <Text style={[styles.socialLabel, { color: colors.textSecondary }]}>Followers</Text>
              </View>
              <View style={[styles.socialDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.socialItem}>
                <Text style={[styles.socialNumber, { color: colors.text }]}>
                  {formatNumber(profile.num_following)}
                </Text>
                <Text style={[styles.socialLabel, { color: colors.textSecondary }]}>Following</Text>
              </View>
            </View>

            {/* Follow Button */}
            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowing
                  ? { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight }
                  : { backgroundColor: colors.primary },
              ]}
              onPress={handleFollowToggle}
              activeOpacity={0.7}
            >
              {isFollowing ? (
                <>
                  <UserCheck size={16} color={colors.text} />
                  <Text style={[styles.followButtonText, { color: colors.text }]}>Following</Text>
                </>
              ) : (
                <>
                  <UserPlus size={16} color="#FFFFFF" />
                  <Text style={[styles.followButtonText, { color: '#FFFFFF' }]}>Follow</Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* ── Quick Stats ── */}
        <Animated.View style={[styles.statsGrid, { opacity: contentOpacity }]}>
          <StatCard icon={Shield} label="Credit" value={profile.credit_score.toString()} color={scoreColor} colors={colors} />
          <StatCard icon={DollarSign} label="Income" value={formatCurrency(profile.monthly_income || 0)} color="#3B82F6" colors={colors} />
          <StatCard icon={Wallet} label="Net Worth" value={formatCurrency(profile.net_worth)} color="#10B981" colors={colors} />
          <StatCard icon={Target} label="Level" value={(profile.level || 1).toString()} color="#8B5CF6" colors={colors} />
        </Animated.View>

        {/* ── Tab Bar ── */}
        <Animated.View style={[styles.tabBar, { opacity: contentOpacity, borderColor: colors.borderLight }]}>
          {(['activity', 'financial', 'about'] as ProfileTab[]).map((tab) => {
            const isActive = activeTab === tab;
            const tabIcons = { activity: Activity, financial: BarChart3, about: Users };
            const TabIcon = tabIcons[tab];
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                onPress={() => {
                  setActiveTab(tab);
                  Haptics.selectionAsync();
                }}
              >
                <TabIcon size={16} color={isActive ? colors.primary : colors.textLight} />
                <Text style={[
                  styles.tabText,
                  { color: isActive ? colors.primary : colors.textLight },
                  isActive && styles.tabTextActive,
                ]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* ── Tab Content ── */}
        <Animated.View style={[styles.tabContent, { opacity: contentOpacity }]}>
          {activeTab === 'activity' && renderActivityTab}
          {activeTab === 'financial' && renderFinancialTab}
          {activeTab === 'about' && renderAboutTab}
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, marginTop: 8 },
  errorText: { fontSize: 16, marginBottom: 16 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: '#FFF', fontWeight: '600' },

  // Header
  headerGradient: { paddingBottom: 20 },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  navButton: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  aiBadgeText: { fontSize: 11, fontWeight: '700' },

  // Profile Header
  profileHeader: { alignItems: 'center', paddingHorizontal: 20 },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: '#FFF' },
  onlineDot: { position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#10B981', borderWidth: 3 },
  displayName: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  userName: { fontSize: 14, marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  locationText: { fontSize: 12 },
  dotSeparator: { fontSize: 12 },

  // Social Stats
  socialRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, gap: 0 },
  socialItem: { alignItems: 'center', paddingHorizontal: 20 },
  socialNumber: { fontSize: 17, fontWeight: '800' },
  socialLabel: { fontSize: 11, marginTop: 2 },
  socialDivider: { width: 1, height: 28 },

  // Follow Button
  followButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 60, marginTop: 16, paddingVertical: 10, borderRadius: 10 },
  followButtonText: { fontSize: 14, fontWeight: '700' },

  // Stats Grid
  statsGrid: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginTop: 16 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  statIconWrap: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statValue: { fontSize: 14, fontWeight: '800' },
  statLabel: { fontSize: 10, marginTop: 2 },

  // Tab Bar
  tabBar: { flexDirection: 'row', marginTop: 16, marginHorizontal: 16, borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12 },
  tabText: { fontSize: 13, fontWeight: '600' },
  tabTextActive: { fontWeight: '700' },

  // Tab Content
  tabContent: { paddingHorizontal: 16, paddingTop: 12 },

  // Activity Items
  activityItem: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  activityHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  activityEmoji: { fontSize: 20 },
  activityMeta: { flex: 1 },
  activityType: { fontSize: 13, fontWeight: '700' },
  activityTime: { fontSize: 11, marginTop: 1 },
  activityBadge: { fontSize: 18 },
  activityContent: { fontSize: 13, lineHeight: 19 },
  activityFooter: { flexDirection: 'row', gap: 16, marginTop: 10 },
  activityStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activityStatText: { fontSize: 12 },

  // Load More
  loadMoreBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: 10, borderWidth: 1, marginTop: 4, marginBottom: 8 },
  loadMoreText: { fontSize: 13, fontWeight: '600' },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14 },

  // Credit Score Gauge
  gaugeContainer: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 10 },
  gaugeTitle: { fontSize: 12, fontWeight: '600', marginBottom: 10 },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gaugeVisual: { flex: 1 },
  gaugeScore: { fontSize: 32, fontWeight: '900', marginBottom: 6 },
  gaugeBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  gaugeBarFill: { height: '100%', borderRadius: 4 },
  gaugeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  gaugeLabelText: { fontSize: 10 },
  gaugeTierBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  gaugeTierText: { fontSize: 12, fontWeight: '700' },

  // Rank Card
  rankCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  rankRow: { flexDirection: 'row', alignItems: 'center' },
  rankItem: { flex: 1, alignItems: 'center' },
  rankValue: { fontSize: 16, fontWeight: '800' },
  rankLabel: { fontSize: 10, marginTop: 2 },
  rankDivider: { width: 1, height: 30 },

  // Financial Sections
  financialSection: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  financialSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  financialSectionIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  financialSectionTitle: { fontSize: 14, fontWeight: '700' },
  financialValue: { fontSize: 14, fontWeight: '600' },
  financialSubvalue: { fontSize: 12, marginTop: 2 },
  financialDetail: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  financialListItem: { paddingVertical: 10 },
  investmentSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  creditEventRow: { flexDirection: 'row', alignItems: 'center' },
  creditImpact: { fontSize: 14, fontWeight: '800' },

  // Activity Breakdown
  breakdownGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  breakdownItem: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, width: (SCREEN_WIDTH - 80) / 4 },
  breakdownEmoji: { fontSize: 18, marginBottom: 4 },
  breakdownCount: { fontSize: 14, fontWeight: '800' },
  breakdownType: { fontSize: 9, textAlign: 'center', marginTop: 2 },

  // About Tab
  aboutSection: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 10 },
  aboutSectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  aboutBio: { fontSize: 14, lineHeight: 21 },
  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB20' },
  aboutRowLabel: { fontSize: 13, flex: 1 },
  aboutRowValue: { fontSize: 13, fontWeight: '600' },
  tierBadgeSmall: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});