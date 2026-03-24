import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import {
  TrendingUp,
  Briefcase,
  CreditCard,
  PiggyBank,
  Trophy,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Play,
  RefreshCw,
  DollarSign,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  Info,
  User,
  ShoppingBag,
  Crown,
  Sparkles,
  BookOpen,
  X,
  ChevronDown,
  ChevronUp,
  Rocket,
  Wallet,
  TrendingDown,
  Star,
  Coins,
  Users,
  GraduationCap,
  Building2,
  Vote,
  Bot,
  Globe,
  Radio,
  Compass,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useEducation } from '@/contexts/EducationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { getCreditTier, formatCurrency } from '@/utils/creditEngine';
import * as Haptics from 'expo-haptics';
import React from "react";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const QUICK_ACTIONS = [
  { id: 'profile', icon: User, label: 'My Profile', route: '/game/profile', color: '#EC4899' },
  { id: 'education', icon: GraduationCap, label: 'Education', route: '/game/education', color: '#10B981' },
  { id: 'community', icon: Users, label: 'Community', route: '/game/community', color: '#06B6D4' },
  { id: 'token-wallet', icon: Coins, label: 'MUSO Tokens', route: '/game/token-wallet', color: '#8B5CF6' },
  { id: 'marketplace', icon: ShoppingBag, label: 'Marketplace', route: '/game/marketplace', color: '#F59E0B' },
  { id: 'real-estate', icon: Building2, label: 'Real Estate', route: '/game/real-estate', color: '#0EA5E9' },
  { id: 'career', icon: Briefcase, label: 'Career', route: '/game/career', color: '#3B82F6' },
  { id: 'bank', icon: CreditCard, label: 'Bank', route: '/game/bank', color: '#10B981' },
  { id: 'budget', icon: PiggyBank, label: 'Budget', route: '/game/budget', color: '#6366F1' },
  { id: 'leaderboard', icon: Crown, label: 'Leaderboard', route: '/game/leaderboard', color: '#FFD700' },
  { id: 'elections', icon: Vote, label: 'Elections', route: '/game/elections', color: '#DC2626' },
  { id: 'achievements', icon: Trophy, label: 'Achievements', route: '/game/achievements', color: '#8B5CF6' },
  { id: 'go-virtual', icon: Globe, label: 'Go Virtual', route: '/game/go-virtual', color: '#FF6B35' },
  { id: 'run-simulator', icon: Bot, label: 'Run Simulator', route: '/game/run-simulator', color: '#2563EB' },
  { id: 'scavenger-hunt', icon: Compass, label: 'Treasure Hunt', route: '/game/scavenger-hunt', color: '#D946EF' },
  { id: 'live-feed', icon: Radio, label: 'Live Feed', route: '/game/live-feed', color: '#10B981' },
  { id: 'tutorial', icon: BookOpen, label: 'Full Tutorial', route: '/game/tutorial', color: '#14B8A6' },
] as const;

const GUIDE_STEPS = [
  {
    icon: Briefcase,
    title: 'Get a Job',
    description: 'Start your career to earn monthly income. Higher-paying jobs require better credit scores.',
    color: '#3B82F6',
  },
  {
    icon: GraduationCap,
    title: 'Get Educated',
    description: 'Enroll in college to unlock higher-paying careers. Apply for financial aid to reduce costs.',
    color: '#10B981',
  },
  {
    icon: CreditCard,
    title: 'Build Credit',
    description: 'Apply for credit cards and loans. Make payments on time to build your score.',
    color: '#8B5CF6',
  },
  {
    icon: PiggyBank,
    title: 'Manage Budget',
    description: 'Track expenses and save money. Keep credit utilization below 30% for best results.',
    color: '#6366F1',
  },
  {
    icon: Target,
    title: 'Reach Goals',
    description: 'Buy a car, own a home, and achieve an 850 credit score to win the game!',
    color: '#F59E0B',
  },
] as const;

const QUICK_TIPS = [
  { icon: CheckCircle, text: 'Pay all bills on time - Payment history is 35% of your score', color: '#10B981' },
  { icon: TrendingDown, text: 'Keep credit utilization under 30% of your limit', color: '#3B82F6' },
  { icon: GraduationCap, text: 'Education unlocks higher-paying jobs - invest in your future!', color: '#10B981' },
  { icon: Wallet, text: 'Build an emergency fund for unexpected expenses', color: '#8B5CF6' },
  { icon: Star, text: 'Unlock achievements for bonus rewards!', color: '#F59E0B' },
] as const;

interface QuickActionItemProps {
  action: typeof QUICK_ACTIONS[number];
  badge?: string;
  colors: { surface: string; text: string; textLight: string };
  onPress: () => void;
}

const QuickActionItem = memo(function QuickActionItem({ action, badge, colors, onPress }: QuickActionItemProps) {
  const IconComponent = action.icon;
  return (
    <TouchableOpacity
      style={[styles.quickActionCard, { backgroundColor: colors.surface }]}
      onPress={onPress}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
        <IconComponent size={24} color={action.color} />
      </View>
      <Text style={[styles.quickActionLabel, { color: colors.text }]}>{action.label}</Text>
      {badge && (
        <View style={[styles.actionBadge, { backgroundColor: action.color }]}>
          <Text style={styles.actionBadgeText}>{badge}</Text>
        </View>
      )}
      <ChevronRight size={16} color={colors.textLight} />
    </TouchableOpacity>
  );
});

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor: string;
  colors: { surface: string; textSecondary: string };
}

const StatCard = memo(function StatCard({ icon, label, value, valueColor, colors }: StatCardProps) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
      {icon}
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
});

export default function GameDashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    gameState,
    isLoading,
    lastReport,
    totalMonthlyExpenses,
    totalDebt,
    creditUtilization,
    advanceMonth,
    triggerRandomEvent,
    resetGame,
    tokenWallet,
    forceSyncToUser,
  } = useGame();

  const education = useEducation();
  const { isAuthenticated, user } = useAuth();

  const [showReport, setShowReport] = useState(false);
  const [showEvent, setShowEvent] = useState<any>(null);
  const [showGuide, setShowGuide] = useState(true);
  const [guideExpanded, setGuideExpanded] = useState(true);
  const [guideDismissed, setGuideDismissed] = useState(false);
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const guideAnim = useRef(new Animated.Value(1)).current;

  const currentEnrollment = useMemo(() => education?.getCurrentEnrollment?.(), [education]);
  const educationBadge = currentEnrollment ? 'Enrolled' : undefined;

  useEffect(() => {
    const checkGuideDismissed = async () => {
      try {
        const dismissed = await AsyncStorage.getItem('credit_sim_guide_dismissed');
        if (dismissed === 'true') {
          setGuideDismissed(true);
          setShowGuide(false);
        }
      } catch (error) {
        console.log('[GameDashboard] Error checking guide status:', error);
      }
    };
    checkGuideDismissed();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.id && !isLoading) {
      console.log('[GameDashboard] User authenticated, ensuring game data is synced');
      forceSyncToUser();
    }
  }, [isAuthenticated, user?.id, isLoading, forceSyncToUser]);

  useEffect(() => {
    Animated.timing(scoreAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [scoreAnim, pulseAnim]);

  const handleAdvanceMonth = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const { isBankrupt } = advanceMonth();
    if (isBankrupt) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert(
        'BANKRUPTCY',
        'Your net worth has fallen below -$150,000. You are forced into bankruptcy. All assets have been liquidated and you must start over.',
        [
          {
            text: 'Start Over',
            style: 'destructive',
            onPress: () => {
              resetGame();
              console.log('[GameDashboard] Player went bankrupt - game reset');
            },
          },
        ],
        { cancelable: false }
      );
      return;
    }
    const event = triggerRandomEvent();
    if (event) {
      setShowEvent(event);
    } else {
      setShowReport(true);
    }
  };

  const handleDismissGuide = async () => {
    Animated.timing(guideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(async () => {
      setShowGuide(false);
      setGuideDismissed(true);
      try {
        await AsyncStorage.setItem('credit_sim_guide_dismissed', 'true');
      } catch (error) {
        console.log('[GameDashboard] Error saving guide status:', error);
      }
    });
  };

  const handleShowGuide = () => {
    setShowGuide(true);
    setGuideExpanded(true);
    guideAnim.setValue(1);
  };

  const toggleGuideExpanded = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setGuideExpanded(!guideExpanded);
  };

  const handleResetGame = () => {
    Alert.alert(
      'Reset Game',
      'Are you sure you want to start over? All progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetGame();
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  const creditTier = useMemo(() => getCreditTier(gameState.creditScores.composite), [gameState.creditScores.composite]);
  const currentDate = useMemo(() => new Date(gameState.currentDate), [gameState.currentDate]);

  const formattedStats = useMemo(() => ({
    bankBalance: formatCurrency(gameState.bankBalance),
    tokenBalance: tokenWallet.musoToken.balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    netWorth: formatCurrency(gameState.totalNetWorth),
    utilization: creditUtilization.toFixed(0) + '%',
    monthlyExpenses: formatCurrency(totalMonthlyExpenses),
    totalDebtFormatted: formatCurrency(totalDebt),
    creditAccountsCount: gameState.creditAccounts.length,
    paymentStreak: gameState.consecutiveOnTimePayments,
    achievementsCount: `${gameState.unlockedAchievements.length}/${gameState.achievements.length}`,
  }), [
    gameState.bankBalance,
    tokenWallet.musoToken.balance,
    gameState.totalNetWorth,
    creditUtilization,
    totalMonthlyExpenses,
    totalDebt,
    gameState.creditAccounts.length,
    gameState.consecutiveOnTimePayments,
    gameState.unlockedAchievements.length,
    gameState.achievements.length,
  ]);

  const handleNavigate = useCallback((route: string) => {
    router.push(route as any);
  }, [router]);



  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading game...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Credit Life Simulator',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ChevronLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleResetGame} style={styles.headerButton}>
              <RefreshCw size={20} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Getting Started Guide */}
          {showGuide && (
            <Animated.View style={[styles.guideContainer, { opacity: guideAnim, transform: [{ scale: guideAnim }] }]}>
              <LinearGradient
                colors={[colors.primary, colors.primaryLight, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.guideGradient}
              >
                <View style={styles.guideHeader}>
                  <View style={styles.guideTitleRow}>
                    <View style={styles.guideIconBadge}>
                      <Rocket size={20} color="#FFF" />
                    </View>
                    <View style={styles.guideTitleContainer}>
                      <Text style={styles.guideTitle}>Getting Started</Text>
                      <Text style={styles.guideSubtitle}>Learn how to play Credit Life Simulator</Text>
                    </View>
                  </View>
                  <View style={styles.guideHeaderButtons}>
                    <TouchableOpacity onPress={toggleGuideExpanded} style={styles.guideToggleButton}>
                      {guideExpanded ? (
                        <ChevronUp size={20} color="#FFF" />
                      ) : (
                        <ChevronDown size={20} color="#FFF" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDismissGuide} style={styles.guideDismissButton}>
                      <X size={18} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                {guideExpanded && (
                  <>
                    <View style={styles.guideStepsContainer}>
                      {GUIDE_STEPS.map((step, index) => {
                        const StepIcon = step.icon;
                        return (
                          <View key={index} style={styles.guideStep}>
                            <View style={[styles.guideStepIcon, { backgroundColor: step.color }]}>
                              <StepIcon size={18} color="#FFF" />
                            </View>
                            <View style={styles.guideStepContent}>
                              <Text style={styles.guideStepTitle}>{step.title}</Text>
                              <Text style={styles.guideStepDescription}>{step.description}</Text>
                            </View>
                            {index < GUIDE_STEPS.length - 1 && <View style={styles.guideStepConnector} />}
                          </View>
                        );
                      })}
                    </View>

                    <View style={styles.quickTipsContainer}>
                      <View style={styles.quickTipsHeader}>
                        <Sparkles size={16} color="#FFD700" />
                        <Text style={styles.quickTipsTitle}>Quick Tips</Text>
                      </View>
                      {QUICK_TIPS.map((tip, index) => {
                        const TipIcon = tip.icon;
                        return (
                          <View key={index} style={styles.quickTipRow}>
                            <TipIcon size={14} color={tip.color} />
                            <Text style={styles.quickTipText}>{tip.text}</Text>
                          </View>
                        );
                      })}
                    </View>

                    <TouchableOpacity
                      style={styles.guideStartButton}
                      onPress={() => {
                        setGuideExpanded(false);
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                      }}
                    >
                      <Play size={16} color={colors.primary} />
                      <Text style={styles.guideStartButtonText}>Got it, let&apos;s play!</Text>
                    </TouchableOpacity>
                  </>
                )}
              </LinearGradient>
            </Animated.View>
          )}

          {/* Show Guide Button when dismissed */}
          {guideDismissed && !showGuide && (
            <View style={styles.guideButtonsRow}>
              <TouchableOpacity
                style={[styles.showGuideButton, { backgroundColor: colors.surface, flex: 1 }]}
                onPress={handleShowGuide}
              >
                <Rocket size={18} color={colors.primary} />
                <Text style={[styles.showGuideButtonText, { color: colors.primary }]}>Quick Start</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.showGuideButton, { backgroundColor: '#14B8A6', flex: 1 }]}
                onPress={() => router.push('/game/tutorial' as any)}
              >
                <BookOpen size={18} color="#FFFFFF" />
                <Text style={[styles.showGuideButtonText, { color: '#FFFFFF' }]}>Full Tutorial</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.dateBar, { backgroundColor: colors.surface }]}>
            <Calendar size={16} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.text }]}>
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Text>
            <Text style={[styles.monthsPlayed, { color: colors.textSecondary }]}>
              Month {gameState.monthsPlayed + 1}
            </Text>
          </View>

          {currentEnrollment && (
            <TouchableOpacity
              style={[styles.educationStatusBanner, { backgroundColor: '#10B981' }]}
              onPress={() => router.push('/game/education' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.educationStatusContent}>
                <View style={styles.educationStatusIcon}>
                  <GraduationCap size={20} color="#FFFFFF" />
                </View>
                <View style={styles.educationStatusText}>
                  <Text style={styles.educationStatusTitle}>Currently Enrolled</Text>
                  <Text style={styles.educationStatusSubtitle} numberOfLines={1}>
                    {education?.allDegrees?.find(d => d.id === currentEnrollment.degreeId)?.name || 'Degree'} • GPA: {currentEnrollment.gpa.toFixed(2)}
                  </Text>
                </View>
              </View>
              <View style={styles.educationStatusProgress}>
                <Text style={styles.educationStatusProgressText}>
                  {((currentEnrollment.creditsEarned / currentEnrollment.creditsRequired) * 100).toFixed(0)}%
                </Text>
              </View>
              <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}

          <Animated.View
            style={[
              styles.creditScoreCard,
              {
                backgroundColor: colors.surface,
                transform: [{ scale: pulseAnim }],
                opacity: scoreAnim,
              },
            ]}
          >
            <View style={styles.scoreHeader}>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Credit Score</Text>
              <TouchableOpacity
                onPress={() => router.push('/game/credit-details' as any)}
                style={styles.detailsButton}
              >
                <Info size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.scoreValue, { color: creditTier.color }]}>
              {gameState.creditScores.composite}
            </Text>
            
            <View style={[styles.tierBadge, { backgroundColor: creditTier.color + '20' }]}>
              <Text style={[styles.tierText, { color: creditTier.color }]}>{creditTier.tier}</Text>
            </View>

            <View style={styles.bureauScores}>
              <View style={styles.bureauItem}>
                <Text style={[styles.bureauLabel, { color: colors.textSecondary }]}>Experian</Text>
                <Text style={[styles.bureauValue, { color: colors.text }]}>
                  {gameState.creditScores.experian}
                </Text>
              </View>
              <View style={[styles.bureauDivider, { backgroundColor: colors.border }]} />
              <View style={styles.bureauItem}>
                <Text style={[styles.bureauLabel, { color: colors.textSecondary }]}>Equifax</Text>
                <Text style={[styles.bureauValue, { color: colors.text }]}>
                  {gameState.creditScores.equifax}
                </Text>
              </View>
              <View style={[styles.bureauDivider, { backgroundColor: colors.border }]} />
              <View style={styles.bureauItem}>
                <Text style={[styles.bureauLabel, { color: colors.textSecondary }]}>TransUnion</Text>
                <Text style={[styles.bureauValue, { color: colors.text }]}>
                  {gameState.creditScores.transunion}
                </Text>
              </View>
            </View>
          </Animated.View>

          <View style={styles.statsGrid}>
            <StatCard
              icon={<DollarSign size={20} color="#10B981" />}
              label="Bank Balance"
              value={formattedStats.bankBalance}
              valueColor={colors.text}
              colors={{ surface: colors.surface, textSecondary: colors.textSecondary }}
            />
            <StatCard
              icon={<Coins size={20} color="#8B5CF6" />}
              label="MUSO Tokens"
              value={formattedStats.tokenBalance}
              valueColor="#8B5CF6"
              colors={{ surface: colors.surface, textSecondary: colors.textSecondary }}
            />
            <StatCard
              icon={<Target size={20} color="#3B82F6" />}
              label="Net Worth"
              value={formattedStats.netWorth}
              valueColor={gameState.totalNetWorth >= 0 ? '#10B981' : '#EF4444'}
              colors={{ surface: colors.surface, textSecondary: colors.textSecondary }}
            />
            <StatCard
              icon={<Zap size={20} color="#F59E0B" />}
              label="Utilization"
              value={formattedStats.utilization}
              valueColor={creditUtilization > 30 ? '#EF4444' : '#10B981'}
              colors={{ surface: colors.surface, textSecondary: colors.textSecondary }}
            />
          </View>

          <View style={styles.quickActionsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {QUICK_ACTIONS.map((action) => (
                <QuickActionItem
                  key={action.id}
                  action={action}
                  badge={action.id === 'education' ? educationBadge : undefined}
                  colors={{ surface: colors.surface, text: colors.text, textLight: colors.textLight }}
                  onPress={() => handleNavigate(action.route)}
                />
              ))}
            </View>
          </View>

          <View style={styles.summarySection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Financial Summary</Text>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Monthly Expenses</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {formattedStats.monthlyExpenses}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Debt</Text>
                <Text style={[styles.summaryValue, { color: totalDebt > 0 ? '#EF4444' : '#10B981' }]}>
                  {formattedStats.totalDebtFormatted}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Credit Accounts</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {formattedStats.creditAccountsCount}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Payment Streak</Text>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                  {formattedStats.paymentStreak} months
                </Text>
              </View>
              <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Achievements</Text>
                <Text style={[styles.summaryValue, { color: '#8B5CF6' }]}>
                  {formattedStats.achievementsCount}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.advanceButton, { backgroundColor: colors.primary }]}
            onPress={handleAdvanceMonth}
          >
            <Play size={20} color="#FFF" />
            <Text style={styles.advanceButtonText}>Advance to Next Month</Text>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>

        <Modal visible={showReport && lastReport !== null} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Monthly Report</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {MONTH_NAMES[(lastReport?.month || 1) - 1]} {lastReport?.year}
              </Text>

              <View style={styles.reportStats}>
                <View style={styles.reportStatRow}>
                  <Text style={[styles.reportLabel, { color: colors.textSecondary }]}>Income</Text>
                  <Text style={[styles.reportValue, { color: '#10B981' }]}>
                    +{formatCurrency(lastReport?.income || 0)}
                  </Text>
                </View>
                <View style={styles.reportStatRow}>
                  <Text style={[styles.reportLabel, { color: colors.textSecondary }]}>Expenses</Text>
                  <Text style={[styles.reportValue, { color: '#EF4444' }]}>
                    -{formatCurrency(lastReport?.expenses || 0)}
                  </Text>
                </View>
                <View style={[styles.reportStatRow, styles.reportTotal]}>
                  <Text style={[styles.reportLabel, { color: colors.text, fontWeight: '600' as const }]}>Net</Text>
                  <Text style={[styles.reportValue, { color: (lastReport?.savings || 0) >= 0 ? '#10B981' : '#EF4444', fontWeight: '600' as const }]}>
                    {(lastReport?.savings || 0) >= 0 ? '+' : ''}{formatCurrency(lastReport?.savings || 0)}
                  </Text>
                </View>
              </View>

              <View style={styles.scoreChangeContainer}>
                <TrendingUp size={20} color={(lastReport?.creditScoreChange || 0) >= 0 ? '#10B981' : '#EF4444'} />
                <Text style={[styles.scoreChangeText, { color: (lastReport?.creditScoreChange || 0) >= 0 ? '#10B981' : '#EF4444' }]}>
                  Credit Score: {(lastReport?.creditScoreChange || 0) >= 0 ? '+' : ''}{lastReport?.creditScoreChange || 0} points
                </Text>
              </View>

              {lastReport?.highlights && lastReport.highlights.length > 0 && (
                <View style={styles.highlightsContainer}>
                  {lastReport.highlights.map((h, i) => (
                    <View key={i} style={styles.highlightRow}>
                      <CheckCircle size={16} color="#10B981" />
                      <Text style={[styles.highlightText, { color: colors.text }]}>{h}</Text>
                    </View>
                  ))}
                </View>
              )}

              {lastReport?.warnings && lastReport.warnings.length > 0 && (
                <View style={styles.warningsContainer}>
                  {lastReport.warnings.map((w, i) => (
                    <View key={i} style={styles.warningRow}>
                      <AlertTriangle size={16} color="#F59E0B" />
                      <Text style={[styles.warningText, { color: colors.text }]}>{w}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowReport(false)}
              >
                <Text style={styles.modalButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showEvent !== null} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={[styles.eventIconContainer, { backgroundColor: '#EF444420' }]}>
                <AlertTriangle size={32} color="#EF4444" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{showEvent?.title}</Text>
              <Text style={[styles.eventDescription, { color: colors.textSecondary }]}>
                {showEvent?.description}
              </Text>
              
              {showEvent?.cost > 0 && (
                <View style={styles.eventCostContainer}>
                  <Text style={[styles.eventCostLabel, { color: colors.textSecondary }]}>Cost</Text>
                  <Text style={styles.eventCostValue}>-{formatCurrency(showEvent?.cost || 0)}</Text>
                </View>
              )}

              {showEvent?.creditImpact && (
                <View style={styles.eventCostContainer}>
                  <Text style={[styles.eventCostLabel, { color: colors.textSecondary }]}>Credit Impact</Text>
                  <Text style={[styles.eventCostValue, { color: '#EF4444' }]}>
                    {showEvent.creditImpact} points
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setShowEvent(null);
                  setShowReport(true);
                }}
              >
                <Text style={styles.modalButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
  },
  headerButton: {
    padding: 8,
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  monthsPlayed: {
    fontSize: 14,
  },
  creditScoreCard: {
    padding: 24,
    borderRadius: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailsButton: {
    padding: 4,
  },
  scoreValue: {
    fontSize: 72,
    fontWeight: '800',
    letterSpacing: -2,
  },
  tierBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  tierText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bureauScores: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  bureauItem: {
    flex: 1,
    alignItems: 'center',
  },
  bureauDivider: {
    width: 1,
    height: '100%',
  },
  bureauLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  bureauValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  quickActionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  quickActionsGrid: {
    gap: 12,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  summarySection: {
    marginBottom: 24,
  },
  summaryCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  advanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 10,
  },
  advanceButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 40,
  },
  guideContainer: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#002B5C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  guideGradient: {
    padding: 20,
  },
  guideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  guideTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  guideIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  guideTitleContainer: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  guideSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  guideHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guideToggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideDismissButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideStepsContainer: {
    marginTop: 20,
    gap: 16,
  },
  guideStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  guideStepIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  guideStepContent: {
    flex: 1,
  },
  guideStepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  guideStepDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  guideStepConnector: {
    position: 'absolute',
    left: 17,
    top: 40,
    width: 2,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  quickTipsContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
  },
  quickTipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  quickTipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD700',
  },
  quickTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  quickTipText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
    lineHeight: 17,
  },
  guideStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  guideStartButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#002B5C',
  },
  guideButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  showGuideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 43, 92, 0.3)',
  },
  showGuideButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  reportStats: {
    width: '100%',
    marginBottom: 20,
  },
  reportStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  reportTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    marginTop: 8,
    paddingTop: 16,
  },
  reportLabel: {
    fontSize: 15,
  },
  reportValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  scoreChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  scoreChangeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  highlightsContainer: {
    width: '100%',
    marginBottom: 16,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  highlightText: {
    fontSize: 14,
    flex: 1,
  },
  warningsContainer: {
    width: '100%',
    marginBottom: 16,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  warningText: {
    fontSize: 14,
    flex: 1,
  },
  modalButton: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  eventIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventDescription: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  eventCostContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  eventCostLabel: {
    fontSize: 15,
  },
  eventCostValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  educationStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  educationStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  educationStatusIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  educationStatusText: {
    flex: 1,
  },
  educationStatusTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  educationStatusSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 2,
  },
  educationStatusProgress: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 8,
  },
  educationStatusProgressText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 4,
  },
  actionBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
