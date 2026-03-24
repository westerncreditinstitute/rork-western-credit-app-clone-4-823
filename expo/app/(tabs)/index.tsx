import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bell,
  BookOpen,
  Users,
  MessageCircle,
  ChevronRight,
  TrendingUp,
  Award,
  Lightbulb,
  Lock,
  Crown,
  Wallet,
  Sparkles,
  ArrowRight,
  Bot,
  Wrench,
  GraduationCap,
  FileText,
  Scale,
  Video,
  Gamepad2,
} from "lucide-react-native";

import { useTheme } from "@/contexts/ThemeContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useUser } from "@/contexts/UserContext";
import { courses, notifications } from "@/mocks/data";
import { getTipOfTheWeek, getRecentTips, TipCategory } from "@/mocks/creditTips";
import { trpc } from "@/lib/trpc";
import { BlogPost } from "@/types";
import { Card, Badge, Avatar, ProgressBar } from "@/components/ui";
import YouTubePlayer from "@/components/YouTubePlayer";

const { width } = Dimensions.get("window");

const DEFAULT_FEATURED_VIDEOS = [
  { id: "1", youtubeId: "dQw4w9WgXcQ", title: "Getting Started with Credit Repair", duration: "5:32" },
  { id: "2", youtubeId: "9bZkp7q19f0", title: "Understanding Credit Scores", duration: "8:15" },
  { id: "3", youtubeId: "kJQP7kiw5Fk", title: "Dispute Letter Basics", duration: "6:48" },
  { id: "4", youtubeId: "RgKAFK5djSk", title: "Building Business Credit", duration: "10:22" },
];

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { tier, isFree, isPremium, canAccessAIDispute, syncInitialEnrollments, isEnrolled } = useSubscription();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  
  const featuredVideosQuery = trpc.featuredVideos.getAll.useQuery({ activeOnly: true });
  
  const featuredVideos = useMemo(() => {
    if (featuredVideosQuery.data && featuredVideosQuery.data.length > 0) {
      return featuredVideosQuery.data.map((video: any) => ({
        id: video.id,
        youtubeId: video.youtubeId,
        title: video.title,
        duration: video.duration || "",
      }));
    }
    return DEFAULT_FEATURED_VIDEOS;
  }, [featuredVideosQuery.data]);
  
  const selectedVideo = featuredVideos[selectedVideoIndex] || featuredVideos[0];

  const handleVideoSelect = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedVideoIndex(index);
  }, []);
  
  // Sync mock enrolled courses on mount
  useEffect(() => {
    const mockEnrolledIds = courses.filter(c => c.enrolled).map(c => c.id);
    if (mockEnrolledIds.length > 0) {
      syncInitialEnrollments(mockEnrolledIds);
    }
  }, [syncInitialEnrollments]);

  const enrolledCourses = courses.filter((c) => c.enrolled || isEnrolled(c.id));
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const blogPostsQuery = trpc.blog.getPosts.useQuery({ limit: 5 });
  const tipOfTheWeekQuery = trpc.blog.getTipOfTheWeek.useQuery();

  const localTipOfTheWeek = getTipOfTheWeek();
  const localRecentTips = getRecentTips(3);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, logoAnim, scaleAnim]);

  const tipOfTheWeek = useMemo(() => {
    if (tipOfTheWeekQuery.data) {
      return {
        id: tipOfTheWeekQuery.data.id,
        title: tipOfTheWeekQuery.data.title,
        content: tipOfTheWeekQuery.data.content || tipOfTheWeekQuery.data.summary,
        category: tipOfTheWeekQuery.data.category as TipCategory,
        publishDate: tipOfTheWeekQuery.data.publishDate,
        isActive: true,
        createdAt: tipOfTheWeekQuery.data.publishDate,
        url: tipOfTheWeekQuery.data.url,
      };
    }
    return localTipOfTheWeek;
  }, [tipOfTheWeekQuery.data, localTipOfTheWeek]);

  const recentTips = useMemo(() => {
    if (blogPostsQuery.data && blogPostsQuery.data.length > 0) {
      return blogPostsQuery.data.slice(0, 3).map((post: BlogPost) => ({
        id: post.id,
        title: post.title,
        content: post.content || post.summary,
        category: post.category as TipCategory,
        publishDate: post.publishDate,
        isActive: true,
        createdAt: post.publishDate,
        url: post.url,
      }));
    }
    return localRecentTips;
  }, [blogPostsQuery.data, localRecentTips]);

  const quickActions = isFree
    ? [
        { id: "1", title: "Upgrade", icon: Crown, route: "/subscription-plans", locked: false, color: colors.warning },
        { id: "2", title: "Credit Tips", icon: Lightbulb, route: "/", locked: false, color: colors.info },
        { id: "3", title: "Courses", icon: BookOpen, route: "/courses", locked: true, color: colors.primary },
        { id: "4", title: "Support", icon: MessageCircle, route: "/profile", locked: false, color: colors.secondary },
      ]
    : [
        { id: "1", title: "My Courses", icon: BookOpen, route: "/courses", locked: false, color: colors.primary },
        { id: "2", title: "Wallet", icon: Wallet, route: "/wallet", locked: false, color: colors.secondary },
        { id: "3", title: "Refer & Earn", icon: Users, route: "/earnings", locked: false, color: colors.info },
        { id: "4", title: "Support", icon: MessageCircle, route: "/profile", locked: false, color: colors.accent },
      ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "repair": return colors.error;
      case "building": return colors.success;
      case "management": return colors.info;
      case "legal": return colors.warning;
      case "business": return colors.secondary;
      case "identity": return "#E67E22";
      default: return colors.primary;
    }
  };

  const handleQuickAction = (action: typeof quickActions[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (action.locked) {
      router.push("/subscription-plans" as any);
    } else {
      router.push(action.route as any);
    }
  };

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ['#0F172A', '#1E293B'] as [string, string] : ['#001F42', '#003D82'] as [string, string]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerPattern}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={[styles.patternCircle, { 
              left: (i % 3) * 120 - 30,
              top: Math.floor(i / 3) * 80 - 20,
              opacity: 0.03 + (i * 0.01),
            }]} />
          ))}
        </View>
        
        <Animated.View 
          style={[
            styles.brandingContainer,
            { 
              opacity: logoAnim, 
              transform: [{ scale: scaleAnim }] 
            }
          ]}
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoIconWrap}>
              <GraduationCap color="#FFFFFF" size={22} />
            </View>
            <View style={styles.brandTextContainer}>
              <Text style={styles.brandTitle}>Western Credit Institute</Text>
              <Text style={styles.brandSubtitle}>Advanced Credit Education</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.notificationBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/notifications" as any);
              }}
            >
              <Bell color="#FFFFFF" size={20} />
              {unreadNotifications > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadNotifications}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View 
          style={[
            styles.welcomeContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.welcomeRow}>
            <Avatar source={user.avatar} size="lg" showBorder borderColor="rgba(255,255,255,0.25)" />
            <View style={styles.welcomeText}>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>{user.name.split(" ")[0]}</Text>
            </View>
            {isFree && (
              <TouchableOpacity 
                style={styles.freeBadge}
                onPress={() => router.push("/subscription-plans" as any)}
              >
                <Crown size={14} color="#001F42" />
                <Text style={styles.freeBadgeText}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {isPremium && (
          <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Award color="#10B981" size={18} />
              </View>
              <View>
                <Text style={styles.statValue}>{user.coursesCompleted}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <TrendingUp color="#10B981" size={18} />
              </View>
              <View>
                <Text style={styles.statValue}>${user.totalEarnings.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Earnings</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Users color="#60A5FA" size={18} />
              </View>
              <View>
                <Text style={styles.statValue}>{user.referrals}</Text>
                <Text style={styles.statLabel}>Referrals</Text>
              </View>
            </View>
          </Animated.View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => {
            const IconComponent = action.icon;
            return (
              <Animated.View
                key={action.id}
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: Animated.multiply(slideAnim, (index + 1) * 0.3) }],
                }}
              >
                <TouchableOpacity
                  style={[styles.quickActionCard, action.locked && styles.lockedCard]}
                  onPress={() => handleQuickAction(action)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.color + '15' }, action.locked && styles.lockedIcon]}>
                    {action.locked ? (
                      <Lock color={colors.textLight} size={22} />
                    ) : (
                      <IconComponent color={action.color} size={22} />
                    )}
                  </View>
                  <Text style={[styles.quickActionText, action.locked && styles.lockedText]}>
                    {action.title}
                  </Text>
                  {action.locked && (
                    <Text style={styles.upgradeHint}>Upgrade</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Sparkles color={colors.secondary} size={20} />
              <Text style={styles.sectionTitle}>Featured Offers</Text>
            </View>
            <Badge text="NEW" variant="success" size="sm" />
          </View>
          <View style={styles.promoVideoContainer}>
            <YouTubePlayer
              videoId={selectedVideo?.youtubeId || "dQw4w9WgXcQ"}
              title={selectedVideo?.title || "Featured Video"}
            />
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.videoSelectorContainer}
          >
            {featuredVideos.map((video, index) => (
              <TouchableOpacity
                key={video.id}
                style={[
                  styles.videoSelectorItem,
                  selectedVideoIndex === index && styles.videoSelectorItemActive,
                ]}
                onPress={() => handleVideoSelect(index)}
                activeOpacity={0.7}
              >
                <View style={styles.videoThumbnailContainer}>
                  <Image
                    source={{ uri: `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg` }}
                    style={styles.videoThumbnail}
                  />
                  {selectedVideoIndex === index && (
                    <View style={styles.playingIndicator}>
                      <View style={styles.playingDot} />
                      <Text style={styles.playingText}>Playing</Text>
                    </View>
                  )}
                  {video.duration ? (
                    <View style={styles.videoDurationBadge}>
                      <Text style={styles.videoDurationText}>{video.duration}</Text>
                    </View>
                  ) : null}
                </View>
                <Text 
                  style={[
                    styles.videoSelectorTitle,
                    selectedVideoIndex === index && styles.videoSelectorTitleActive,
                  ]} 
                  numberOfLines={2}
                >
                  {video.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Wrench color={colors.secondary} size={20} />
              <Text style={styles.sectionTitle}>Credit Repair Tools</Text>
            </View>
          </View>

          <View style={styles.toolsGrid}>
            {/* AI Credit Repair Agent */}
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.toolCardWrapper}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (canAccessAIDispute) {
                  router.push("/ai-dispute-assistant" as any);
                } else {
                  router.push("/subscription-plans" as any);
                }
              }}
            >
              <LinearGradient
                colors={canAccessAIDispute ? ['#1A1A2E', '#16213E'] as [string, string] : ['#2D2D3A', '#1F1F2A'] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.toolCardCompact}
              >
                <View style={[styles.toolIconWrapCompact, { backgroundColor: 'rgba(45, 212, 191, 0.15)' }, !canAccessAIDispute && styles.toolIconLocked]}>
                  {canAccessAIDispute ? (
                    <Bot color="#2DD4BF" size={24} />
                  ) : (
                    <Lock color={colors.textLight} size={24} />
                  )}
                </View>
                <Text style={[styles.toolTitleCompact, !canAccessAIDispute && styles.toolTitleLocked]} numberOfLines={2}>AI Credit Repair Agent</Text>
                {!canAccessAIDispute && (
                  <View style={styles.premiumBadgeSmall}>
                    <Crown color={colors.warning} size={10} />
                    <Text style={styles.premiumBadgeTextSmall}>ACE-1</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Dispute Tracker */}
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.toolCardWrapper}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (canAccessAIDispute) {
                  router.push("/dispute-tracker" as any);
                } else {
                  router.push("/subscription-plans" as any);
                }
              }}
            >
              <LinearGradient
                colors={canAccessAIDispute ? ['#1A2E1A', '#16213E'] as [string, string] : ['#2D2D3A', '#1F1F2A'] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.toolCardCompact}
              >
                <View style={[styles.toolIconWrapCompact, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }, !canAccessAIDispute && styles.toolIconLocked]}>
                  {canAccessAIDispute ? (
                    <FileText color="#10B981" size={24} />
                  ) : (
                    <Lock color={colors.textLight} size={24} />
                  )}
                </View>
                <Text style={[styles.toolTitleCompact, !canAccessAIDispute && styles.toolTitleLocked]} numberOfLines={2}>Dispute Tracker</Text>
                {!canAccessAIDispute && (
                  <View style={styles.premiumBadgeSmall}>
                    <Crown color={colors.warning} size={10} />
                    <Text style={styles.premiumBadgeTextSmall}>ACE-1</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Lawsuit Assistant */}
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.toolCardWrapper}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (canAccessAIDispute) {
                  router.push("/lawsuit-assistant" as any);
                } else {
                  router.push("/subscription-plans" as any);
                }
              }}
            >
              <LinearGradient
                colors={canAccessAIDispute ? ['#2E1A2E', '#213E3E'] as [string, string] : ['#2D2D3A', '#1F1F2A'] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.toolCardCompact}
              >
                <View style={[styles.toolIconWrapCompact, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }, !canAccessAIDispute && styles.toolIconLocked]}>
                  {canAccessAIDispute ? (
                    <Scale color="#A855F7" size={24} />
                  ) : (
                    <Lock color={colors.textLight} size={24} />
                  )}
                </View>
                <Text style={[styles.toolTitleCompact, !canAccessAIDispute && styles.toolTitleLocked]} numberOfLines={2}>Lawsuit Assistant</Text>
                {!canAccessAIDispute && (
                  <View style={styles.premiumBadgeSmall}>
                    <Crown color={colors.warning} size={10} />
                    <Text style={styles.premiumBadgeTextSmall}>ACE-1</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Interactive Coach */}
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.toolCardWrapper}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (canAccessAIDispute) {
                  router.push("/interactive-coach" as any);
                } else {
                  router.push("/subscription-plans" as any);
                }
              }}
            >
              <LinearGradient
                colors={canAccessAIDispute ? ['#2E2A1A', '#3E3016'] as [string, string] : ['#2D2D3A', '#1F1F2A'] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.toolCardCompact}
              >
                <View style={[styles.toolIconWrapCompact, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }, !canAccessAIDispute && styles.toolIconLocked]}>
                  {canAccessAIDispute ? (
                    <Video color="#F59E0B" size={24} />
                  ) : (
                    <Lock color={colors.textLight} size={24} />
                  )}
                </View>
                <Text style={[styles.toolTitleCompact, !canAccessAIDispute && styles.toolTitleLocked]} numberOfLines={2}>Interactive Coach</Text>
                {!canAccessAIDispute && (
                  <View style={styles.premiumBadgeSmall}>
                    <Crown color={colors.warning} size={10} />
                    <Text style={styles.premiumBadgeTextSmall}>ACE-1</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Credit Life Simulator */}
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.toolCardWrapper}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/game" as any);
              }}
            >
              <LinearGradient
                colors={['#1A2E3E', '#162E16'] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.toolCardCompact}
              >
                <View style={[styles.toolIconWrapCompact, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Gamepad2 color="#3B82F6" size={24} />
                </View>
                <Text style={styles.toolTitleCompact} numberOfLines={2}>Credit Life Simulator</Text>
                <View style={[styles.premiumBadgeSmall, { backgroundColor: '#10B98120' }]}>
                  <Text style={[styles.premiumBadgeTextSmall, { color: '#10B981' }]}>FREE</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Lightbulb color={colors.warning} size={20} />
              <Text style={styles.sectionTitle}>Weekly Credit Tips</Text>
            </View>
            <Badge text="FREE" variant="success" size="sm" />
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/credit-tip?id=${tipOfTheWeek.id}` as any);
            }}
          >
            <Card variant="outlined" padding="lg" style={styles.tipOfWeekCard}>
              <View style={styles.tipHeader}>
                <Badge 
                  text={tipOfTheWeek.category.toUpperCase()} 
                  variant="default"
                  style={{ backgroundColor: getCategoryColor(tipOfTheWeek.category) + '20' }}
                  textStyle={{ color: getCategoryColor(tipOfTheWeek.category) }}
                />
                <Text style={[styles.tipOfWeekLabel, { color: colors.warning }]}>TIP OF THE WEEK</Text>
              </View>
              <Text style={styles.tipTitle}>{tipOfTheWeek.title}</Text>
              <Text style={styles.tipContent} numberOfLines={3}>
                {tipOfTheWeek.content}
              </Text>
            </Card>
          </TouchableOpacity>

          <View style={styles.recentTipsContainer}>
            {recentTips.slice(0, 2).map((tip) => (
              <TouchableOpacity
                key={tip.id}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/credit-tip?id=${tip.id}` as any);
                }}
              >
                <Card variant="default" padding="md" style={styles.recentTipCard}>
                  <View style={styles.recentTipRow}>
                    <View style={[styles.tipDot, { backgroundColor: getCategoryColor(tip.category) }]} />
                    <View style={styles.recentTipContent}>
                      <Text style={styles.recentTipTitle} numberOfLines={1}>{tip.title}</Text>
                      <Text style={styles.recentTipCategory}>{tip.category}</Text>
                    </View>
                    <ChevronRight color={colors.textLight} size={18} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isFree ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Unlock Premium Features</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/subscription-plans" as any);
              }}
            >
              <LinearGradient
                colors={colors.gradient.primary as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.upgradeCard}
              >
                <View style={styles.upgradeContent}>
                  <View style={styles.upgradeIconWrap}>
                    <Crown color={colors.warning} size={28} />
                  </View>
                  <Text style={styles.upgradeTitle}>Upgrade Your Account</Text>
                  <Text style={styles.upgradeDescription}>
                    Get access to all courses, AI Credit Repair Coach, referral program, and more!
                  </Text>
                  <View style={styles.planOptions}>
                    <View style={styles.planOption}>
                      <Text style={styles.planName}>ACE-1 Student</Text>
                      <Text style={styles.planPrice}>$25/mo</Text>
                    </View>
                    <View style={styles.planDivider} />
                    <View style={styles.planOption}>
                      <Text style={styles.planName}>CSO Affiliate</Text>
                      <Text style={styles.planPrice}>$49.99/mo</Text>
                    </View>
                  </View>
                  <View style={styles.upgradeButton}>
                    <Text style={styles.upgradeButtonText}>View Plans</Text>
                    <ArrowRight color={colors.primary} size={18} />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Continue Learning</Text>
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/(tabs)/courses" as any);
                  }}
                >
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              </View>

              {enrolledCourses.slice(0, 2).map((course) => (
                <Card 
                  key={course.id} 
                  variant="default" 
                  padding="md"
                  style={styles.courseCard}
                  onPress={() => router.push(`/course-detail?id=${course.id}` as any)}
                >
                  <View style={styles.courseRow}>
                    <Image source={{ uri: course.image }} style={styles.courseImage} />
                    <View style={styles.courseInfo}>
                      <View style={styles.courseMeta}>
                        <Badge text={course.category} variant="primary" size="sm" />
                        <Text style={styles.courseDuration}>{course.duration}</Text>
                      </View>
                      <Text style={styles.courseTitle} numberOfLines={2}>
                        {course.title}
                      </Text>
                      {course.progress !== undefined && (
                        <ProgressBar 
                          progress={course.progress} 
                          height={6} 
                          showLabel 
                          labelPosition="right"
                        />
                      )}
                    </View>
                  </View>
                </Card>
              ))}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Grow Your Income</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push("/(tabs)/earnings" as any);
                }}
              >
                <LinearGradient
                  colors={colors.gradient.secondary as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.promoCard}
                >
                  <View style={styles.promoContent}>
                    <Text style={styles.promoTitle}>Refer & Earn Program</Text>
                    <Text style={styles.promoDescription}>
                      {tier === "ace1_student"
                        ? "Earn $25 for every ACE-1 student you refer!"
                        : "Earn 50% residual on CSO referrals + 20% sales commission!"}
                    </Text>
                    <View style={styles.promoButton}>
                      <Text style={styles.promoButtonText}>Learn More</Text>
                      <ArrowRight color={colors.primary} size={16} />
                    </View>
                  </View>
                  <View style={styles.promoIconWrap}>
                    <TrendingUp color="rgba(255,255,255,0.2)" size={80} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden" as const,
  },
  headerPattern: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternCircle: {
    position: "absolute" as const,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#FFFFFF",
  },
  brandingContainer: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  logoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.9)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  brandTextContainer: {
    flexDirection: "column" as const,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#10B981",
    letterSpacing: 0.5,
    marginTop: 2,
    textTransform: "uppercase" as const,
  },
  headerActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  welcomeContainer: {
    marginBottom: 16,
  },
  welcomeRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
  },
  welcomeText: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 2,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  freeBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#001F42",
  },
  notificationBtn: {
    position: "relative" as const,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  badge: {
    position: "absolute" as const,
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderWidth: 2,
    borderColor: "#001F42",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700" as const,
  },
  statsRow: {
    flexDirection: "row" as const,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 16,
    justifyContent: "space-around" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  statItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.55)",
    marginTop: 1,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 24,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
  },
  quickActionCard: {
    width: (width - 52) / 2,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    shadowColor: colors.shadow.color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lockedCard: {
    backgroundColor: colors.surfaceAlt,
    opacity: 0.85,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  lockedIcon: {
    backgroundColor: colors.border,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
  },
  lockedText: {
    color: colors.textLight,
  },
  upgradeHint: {
    fontSize: 11,
    color: colors.warning,
    marginTop: 4,
    fontWeight: "500" as const,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.secondary,
  },
  tipOfWeekCard: {
    marginBottom: 12,
    borderColor: colors.warning + '30',
    backgroundColor: isDark ? colors.surface : colors.warning + '08',
  },
  tipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tipOfWeekLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },
  tipTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 8,
  },
  tipContent: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  recentTipsContainer: {
    gap: 10,
  },
  recentTipCard: {
    padding: 14,
  },
  recentTipRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  recentTipContent: {
    flex: 1,
  },
  recentTipTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 2,
  },
  recentTipCategory: {
    fontSize: 12,
    color: colors.textLight,
    textTransform: "capitalize" as const,
  },
  upgradeCard: {
    borderRadius: 24,
    padding: 28,
    overflow: "hidden",
  },
  upgradeContent: {
    alignItems: "center",
  },
  upgradeIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  upgradeTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: colors.white,
    marginBottom: 8,
  },
  upgradeDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center" as const,
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  planOptions: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 16,
    width: "100%",
    marginBottom: 20,
  },
  planOption: {
    flex: 1,
    alignItems: "center",
  },
  planName: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.white,
  },
  planDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 16,
  },
  upgradeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  courseCard: {
    marginBottom: 12,
  },
  courseRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  courseImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  courseInfo: {
    flex: 1,
    marginLeft: 14,
  },
  courseMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  courseDuration: {
    fontSize: 12,
    color: colors.textLight,
  },
  courseTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 10,
  },
  promoCard: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 24,
    minHeight: 140,
    overflow: "hidden",
  },
  promoContent: {
    flex: 1,
    justifyContent: "center",
  },
  promoTitle: {
    fontSize: 19,
    fontWeight: "700" as const,
    color: colors.white,
    marginBottom: 8,
  },
  promoDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 20,
    marginBottom: 16,
  },
  promoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  promoButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  promoIconWrap: {
    position: "absolute" as const,
    right: -20,
    bottom: -20,
    opacity: 0.5,
  },
  promoVideoContainer: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  videoSelectorContainer: {
    paddingTop: 14,
    paddingBottom: 4,
    gap: 12,
  },
  videoSelectorItem: {
    width: 140,
    opacity: 0.7,
  },
  videoSelectorItemActive: {
    opacity: 1,
  },
  videoThumbnailContainer: {
    position: "relative" as const,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 8,
  },
  videoThumbnail: {
    width: 140,
    height: 80,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
  },
  playingIndicator: {
    position: "absolute" as const,
    top: 6,
    left: 6,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  playingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
  },
  playingText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  videoDurationBadge: {
    position: "absolute" as const,
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoDurationText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  videoSelectorTitle: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  videoSelectorTitleActive: {
    color: colors.text,
    fontWeight: "600" as const,
  },
  toolsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 12,
  },
  toolCardWrapper: {
    width: (width - 52) / 2,
  },
  toolCardCompact: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center" as const,
    minHeight: 130,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  toolIconWrapCompact: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 12,
  },
  toolTitleCompact: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#FFFFFF",
    textAlign: "center" as const,
    marginBottom: 6,
  },
  toolCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  toolIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(45, 212, 191, 0.15)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  toolContent: {
    flex: 1,
    marginLeft: 16,
    marginRight: 12,
  },
  toolTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 18,
  },
  toolArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(45, 212, 191, 0.12)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  toolIconLocked: {
    backgroundColor: "rgba(128, 128, 128, 0.15)",
  },
  toolTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 4,
  },
  toolTitleLocked: {
    color: "rgba(255,255,255,0.5)",
  },
  toolDescriptionLocked: {
    color: "rgba(255,255,255,0.4)",
  },
  toolArrowLocked: {
    backgroundColor: "rgba(128, 128, 128, 0.12)",
  },
  premiumBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: colors.warning + "20",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.warning,
  },
  premiumBadgeSmall: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: colors.warning + "20",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  premiumBadgeTextSmall: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: colors.warning,
  },
});
