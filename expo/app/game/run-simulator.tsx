import React, { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Bot,
  Play,
  Pause,
  Square,
  RotateCcw,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Briefcase,
  GraduationCap,
  PiggyBank,
  ShoppingCart,
  Shield,
  Search,
  Calculator,
  Settings,
  Check,
  AlertTriangle,
  Award,
  Clock,
  Activity,
  BarChart3,
  Sliders,
  Brain,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useAIAgents } from '@/contexts/AIAgentContext';
import { AgentTask, SimulationLogEntry, AgentPriority, SimulationSpeed } from '@/types/aiAgent';
import { GOAL_OPTIONS, SPEED_LABELS } from '@/mocks/aiAgentData';
import { formatCurrency } from '@/utils/creditEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SimTab = 'configure' | 'running' | 'results';

const TASK_ICONS: Record<string, React.ComponentType<any>> = {
  'receipt': CreditCard,
  'briefcase': Briefcase,
  'graduation-cap': GraduationCap,
  'trending-down': TrendingDown,
  'piggy-bank': PiggyBank,
  'shield': Shield,
  'shopping-cart': ShoppingCart,
  'credit-card': CreditCard,
  'trending-up': TrendingUp,
  'search': Search,
  'calculator': Calculator,
};

const LOG_TYPE_COLORS: Record<string, string> = {
  action: '#3B82F6',
  event: '#EF4444',
  milestone: '#F59E0B',
  warning: '#F97316',
  error: '#DC2626',
};

interface TaskCardProps {
  task: AgentTask;
  onToggle: () => void;
  colors: any;
}

const TaskCard = memo(function TaskCard({ task, onToggle, colors }: TaskCardProps) {
  const IconComponent = TASK_ICONS[task.icon] || Zap;
  return (
    <TouchableOpacity
      style={[styles.taskCard, { backgroundColor: colors.surface, borderColor: task.enabled ? task.color + '40' : colors.border }]}
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      activeOpacity={0.8}
    >
      <View style={[styles.taskIconWrap, { backgroundColor: task.color + '18' }]}>
        <IconComponent size={20} color={task.enabled ? task.color : colors.textLight} />
      </View>
      <View style={styles.taskInfo}>
        <Text style={[styles.taskLabel, { color: task.enabled ? colors.text : colors.textLight }]}>{task.label}</Text>
        <Text style={[styles.taskDesc, { color: colors.textSecondary }]} numberOfLines={1}>{task.description}</Text>
      </View>
      <Switch
        value={task.enabled}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: task.color + '60' }}
        thumbColor={task.enabled ? task.color : colors.textLight}
      />
    </TouchableOpacity>
  );
});

interface LogEntryCardProps {
  entry: SimulationLogEntry;
  colors: any;
}

const LogEntryCard = memo(function LogEntryCard({ entry, colors }: LogEntryCardProps) {
  const typeColor = LOG_TYPE_COLORS[entry.type] || '#6B7280';
  const TypeIcon = entry.type === 'milestone' ? Award :
    entry.type === 'event' ? AlertTriangle :
    entry.type === 'warning' ? AlertTriangle :
    entry.type === 'error' ? AlertTriangle : Activity;

  return (
    <View style={[styles.logEntry, { backgroundColor: colors.surface }]}>
      <View style={[styles.logTypeDot, { backgroundColor: typeColor }]} />
      <View style={styles.logContent}>
        <View style={styles.logHeader}>
          <TypeIcon size={14} color={typeColor} />
          <Text style={[styles.logAction, { color: colors.text }]}>{entry.action}</Text>
          <Text style={[styles.logTime, { color: colors.textLight }]}>
            M{entry.month}/{entry.year}
          </Text>
        </View>
        <Text style={[styles.logDetail, { color: colors.textSecondary }]} numberOfLines={2}>
          {entry.detail}
        </Text>
      </View>
    </View>
  );
});

export default function RunSimulatorScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { gameState } = useGame();
  const agentContext = useAIAgents() as any;

  const noopRef = useRef(() => {});
  const asyncNoopRef = useRef(async () => {});

  const config = agentContext?.config ?? {
    name: 'AI Financial Agent',
    tasks: [],
    primaryGoal: 'credit_score',
    speed: 'normal',
    debtPayoffStrategy: 'avalanche',
    autoPayBills: true,
    autoInvest: false,
  };
  const isRunning = agentContext?.isRunning ?? false;
  const isPaused = agentContext?.isPaused ?? false;
  const currentMonth = agentContext?.currentMonth ?? 0;
  const totalMonths = agentContext?.totalMonths ?? 1;
  const logs = agentContext?.logs ?? [];
  const snapshots = agentContext?.snapshots ?? [];
  const result = agentContext?.result ?? null;
  const updateConfig = agentContext?.updateConfig ?? noopRef.current;
  const toggleTask = agentContext?.toggleTask ?? noopRef.current;
  const setPrimaryGoal = agentContext?.setPrimaryGoal ?? noopRef.current;
  const setSpeed = agentContext?.setSpeed ?? noopRef.current;
  const setDebtStrategy = agentContext?.setDebtStrategy ?? noopRef.current;
  const isOnCooldown = agentContext?.isOnCooldown ?? false;
  const lastSimulationTimestamp = agentContext?.lastSimulationTimestamp ?? null;
  const runSimulation = agentContext?.runSimulation ?? noopRef.current;
  const pauseSimulation = agentContext?.pauseSimulation ?? noopRef.current;
  const resumeSimulation = agentContext?.resumeSimulation ?? noopRef.current;
  const cancelSimulation = agentContext?.cancelSimulation ?? noopRef.current;
  const resetSimulation = agentContext?.resetSimulation ?? noopRef.current;
  const loadConfig = agentContext?.loadConfig ?? noopRef.current;
  const saveConfig = agentContext?.saveConfig ?? asyncNoopRef.current;

  const [activeTab, setActiveTab] = useState<SimTab>('configure');
  const [showTasks, setShowTasks] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [cooldownDisplay, setCooldownDisplay] = useState('');

  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadConfig();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [loadConfig, fadeAnim]);

  useEffect(() => {
    if (!isOnCooldown) {
      setCooldownDisplay('');
      return;
    }
    const updateCooldown = () => {
      if (!lastSimulationTimestamp) return;
      const remaining = Math.max(0, 24 * 60 * 60 * 1000 - (Date.now() - lastSimulationTimestamp));
      if (remaining <= 0) {
        setCooldownDisplay('');
        return;
      }
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      setCooldownDisplay(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };
    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [isOnCooldown, lastSimulationTimestamp]);

  useEffect(() => {
    if (isRunning) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isRunning, pulseAnim]);

  useEffect(() => {
    if (totalMonths > 0) {
      Animated.timing(progressAnim, {
        toValue: currentMonth / totalMonths,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [currentMonth, totalMonths, progressAnim]);

  useEffect(() => {
    if (isRunning && activeTab === 'configure') {
      setActiveTab('running');
    }
    if (result && !isRunning) {
      setActiveTab('results');
    }
  }, [isRunning, result, activeTab]);

  const handleStart = useCallback(async () => {
    if (isOnCooldown) {
      Alert.alert(
        'Cooldown Active',
        `You can only run 1 month of simulation per 24 hours. Next simulation available in ${cooldownDisplay}.`,
        [{ text: 'OK' }]
      );
      return;
    }
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await saveConfig();
    runSimulation();
  }, [saveConfig, runSimulation, isOnCooldown, cooldownDisplay]);

  const handlePauseResume = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPaused) {
      resumeSimulation();
    } else {
      pauseSimulation();
    }
  }, [isPaused, pauseSimulation, resumeSimulation]);

  const handleCancel = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    cancelSimulation();
  }, [cancelSimulation]);

  const handleReset = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetSimulation();
    setActiveTab('configure');
  }, [resetSimulation]);

  const enabledTaskCount = useMemo(() => config.tasks.filter((t: any) => t.enabled).length, [config.tasks]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const renderConfigTab = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      <LinearGradient
        colors={isDark ? ['#0C1A2E', '#162640'] as [string, string] : ['#EFF6FF', '#DBEAFE'] as [string, string]}
        style={styles.agentHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.agentHeroInner}>
          <View style={[styles.agentAvatarWrap, { backgroundColor: isDark ? '#1E3A5F' : '#BFDBFE' }]}>
            <Brain size={32} color="#3B82F6" />
          </View>
          <View style={styles.agentHeroText}>
            <Text style={[styles.agentName, { color: colors.text }]}>{config.name}</Text>
            <Text style={[styles.agentSub, { color: colors.textSecondary }]}>
              Your dedicated AI assistant • {enabledTaskCount} tasks active
            </Text>
          </View>
          <Sparkles size={24} color="#F59E0B" />
        </View>

        <View style={styles.currentStatsRow}>
          <View style={styles.currentStatItem}>
            <Text style={[styles.currentStatValue, { color: '#10B981' }]}>{gameState.creditScores.composite}</Text>
            <Text style={[styles.currentStatLabel, { color: colors.textLight }]}>Credit</Text>
          </View>
          <View style={[styles.currentStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.currentStatItem}>
            <Text style={[styles.currentStatValue, { color: '#3B82F6' }]}>{formatCurrency(gameState.bankBalance)}</Text>
            <Text style={[styles.currentStatLabel, { color: colors.textLight }]}>Balance</Text>
          </View>
          <View style={[styles.currentStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.currentStatItem}>
            <Text style={[styles.currentStatValue, { color: '#8B5CF6' }]}>{formatCurrency(gameState.totalNetWorth)}</Text>
            <Text style={[styles.currentStatLabel, { color: colors.textLight }]}>Net Worth</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Primary Goal</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goalsRow}>
          {GOAL_OPTIONS.map(goal => {
            const isActive = config.primaryGoal === goal.id;
            return (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.goalChip,
                  { backgroundColor: isActive ? goal.color + '20' : colors.surface, borderColor: isActive ? goal.color : colors.border },
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPrimaryGoal(goal.id as AgentPriority);
                }}
              >
                <Target size={16} color={isActive ? goal.color : colors.textLight} />
                <Text style={[styles.goalChipText, { color: isActive ? goal.color : colors.textSecondary }]}>{goal.label}</Text>
                {isActive && <Check size={14} color={goal.color} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Simulation Duration</Text>
        <View style={[styles.durationInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.durationRow}>
            <View style={[styles.durationIconWrap, { backgroundColor: '#3B82F620' }]}>
              <Clock size={20} color="#3B82F6" />
            </View>
            <View style={styles.durationTextWrap}>
              <Text style={[styles.durationValue, { color: colors.text }]}>1 Month</Text>
              <Text style={[styles.durationLimit, { color: colors.textSecondary }]}>Maximum 1 month simulation per 24 hours</Text>
            </View>
          </View>
          {isOnCooldown && cooldownDisplay ? (
            <View style={[styles.cooldownBanner, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B40' }]}>
              <AlertTriangle size={16} color="#F59E0B" />
              <View style={styles.cooldownTextWrap}>
                <Text style={[styles.cooldownTitle, { color: '#F59E0B' }]}>Cooldown Active</Text>
                <Text style={[styles.cooldownTimer, { color: colors.textSecondary }]}>Next simulation in {cooldownDisplay}</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.cooldownBanner, { backgroundColor: '#10B98118', borderColor: '#10B98140' }]}>
              <Check size={16} color="#10B981" />
              <Text style={[styles.cooldownReady, { color: '#10B981' }]}>Ready to simulate</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Speed</Text>
        <View style={styles.speedRow}>
          {(['slow', 'normal', 'fast', 'turbo'] as SimulationSpeed[]).map(s => {
            const isActive = config.speed === s;
            const speedInfo = SPEED_LABELS[s];
            return (
              <TouchableOpacity
                key={s}
                style={[styles.speedChip, { backgroundColor: isActive ? '#8B5CF6' : colors.surface, borderColor: isActive ? '#8B5CF6' : colors.border }]}
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSpeed(s);
                }}
              >
                <Clock size={14} color={isActive ? '#FFFFFF' : colors.textLight} />
                <Text style={[styles.speedChipText, { color: isActive ? '#FFFFFF' : colors.textSecondary }]}>{speedInfo.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.sectionHeaderToggle} onPress={() => setShowTasks(!showTasks)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Agent Tasks ({enabledTaskCount})</Text>
          {showTasks ? <ChevronUp size={20} color={colors.textLight} /> : <ChevronDown size={20} color={colors.textLight} />}
        </TouchableOpacity>
        {showTasks && (
          <View style={styles.tasksList}>
            {config.tasks.map((task: any) => (
              <TaskCard key={task.id} task={task} onToggle={() => toggleTask(task.id)} colors={colors} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.sectionHeaderToggle} onPress={() => setShowAdvanced(!showAdvanced)}>
          <View style={styles.sectionTitleRow}>
            <Sliders size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Advanced Settings</Text>
          </View>
          {showAdvanced ? <ChevronUp size={20} color={colors.textLight} /> : <ChevronDown size={20} color={colors.textLight} />}
        </TouchableOpacity>
        {showAdvanced && (
          <View style={styles.advancedSettings}>
            <View style={[styles.settingRow, { backgroundColor: colors.surface }]}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Debt Payoff Strategy</Text>
              <View style={styles.strategyRow}>
                {(['avalanche', 'snowball', 'minimum'] as const).map(s => {
                  const isActive = config.debtPayoffStrategy === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.strategyChip, { backgroundColor: isActive ? '#EF4444' + '20' : 'transparent', borderColor: isActive ? '#EF4444' : colors.border }]}
                      onPress={() => setDebtStrategy(s)}
                    >
                      <Text style={[styles.strategyChipText, { color: isActive ? '#EF4444' : colors.textSecondary }]}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.settingRow, { backgroundColor: colors.surface }]}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Auto Pay Bills</Text>
              <Switch
                value={config.autoPayBills}
                onValueChange={v => updateConfig({ autoPayBills: v })}
                trackColor={{ false: colors.border, true: '#10B98160' }}
                thumbColor={config.autoPayBills ? '#10B981' : colors.textLight}
              />
            </View>

            <View style={[styles.settingRow, { backgroundColor: colors.surface }]}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Auto Invest Surplus</Text>
              <Switch
                value={config.autoInvest}
                onValueChange={v => updateConfig({ autoInvest: v })}
                trackColor={{ false: colors.border, true: '#14B8A660' }}
                thumbColor={config.autoInvest ? '#14B8A6' : colors.textLight}
              />
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.startButton, isOnCooldown && styles.startButtonDisabled]}
        onPress={handleStart}
        activeOpacity={isOnCooldown ? 0.5 : 0.85}
        disabled={isOnCooldown}
      >
        <LinearGradient
          colors={isOnCooldown ? ['#6B7280', '#4B5563'] as [string, string] : ['#3B82F6', '#2563EB'] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.startButtonGradient}
        >
          {isOnCooldown ? (
            <>
              <Clock size={22} color="#FFFFFF" />
              <Text style={styles.startButtonText}>On Cooldown</Text>
              <Text style={styles.startButtonSub}>{cooldownDisplay}</Text>
            </>
          ) : (
            <>
              <Bot size={22} color="#FFFFFF" />
              <Text style={styles.startButtonText}>Run Simulator</Text>
              <Text style={styles.startButtonSub}>1 month</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderRunningTab = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      <Animated.View style={[styles.runningHero, { transform: [{ scale: pulseAnim }] }]}>
        <LinearGradient
          colors={isDark ? ['#0F172A', '#1E293B'] as [string, string] : ['#1E3A5F', '#2563EB'] as [string, string]}
          style={styles.runningHeroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.runningStatusRow}>
            <View style={styles.runningBotWrap}>
              <Bot size={28} color="#60A5FA" />
              {isRunning && !isPaused && <View style={styles.runningDot} />}
            </View>
            <View style={styles.runningStatusText}>
              <Text style={styles.runningTitle}>
                {isPaused ? 'Paused' : isRunning ? 'Simulating...' : 'Idle'}
              </Text>
              <Text style={styles.runningSubtitle}>
                Month {currentMonth} of {totalMonths}
              </Text>
            </View>
          </View>

          <View style={styles.progressBarOuter}>
            <Animated.View style={[styles.progressBarInner, { width: progressWidth }]} />
          </View>
          <Text style={styles.progressText}>
            {totalMonths > 0 ? Math.round((currentMonth / totalMonths) * 100) : 0}% Complete
          </Text>

          {snapshots.length > 0 && (
            <View style={styles.liveStatsRow}>
              <View style={styles.liveStat}>
                <Text style={styles.liveStatLabel}>Credit</Text>
                <Text style={[styles.liveStatValue, { color: '#34D399' }]}>
                  {snapshots[snapshots.length - 1]?.creditScore ?? '--'}
                </Text>
              </View>
              <View style={styles.liveStat}>
                <Text style={styles.liveStatLabel}>Balance</Text>
                <Text style={[styles.liveStatValue, { color: '#60A5FA' }]}>
                  {formatCurrency(snapshots[snapshots.length - 1]?.bankBalance ?? 0)}
                </Text>
              </View>
              <View style={styles.liveStat}>
                <Text style={styles.liveStatLabel}>Net Worth</Text>
                <Text style={[styles.liveStatValue, { color: '#A78BFA' }]}>
                  {formatCurrency(snapshots[snapshots.length - 1]?.netWorth ?? 0)}
                </Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </Animated.View>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: isPaused ? '#10B981' : '#F59E0B' }]}
          onPress={handlePauseResume}
          disabled={!isRunning}
        >
          {isPaused ? <Play size={20} color="#FFFFFF" /> : <Pause size={20} color="#FFFFFF" />}
          <Text style={styles.controlButtonText}>{isPaused ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: '#EF4444' }]}
          onPress={handleCancel}
          disabled={!isRunning}
        >
          <Square size={20} color="#FFFFFF" />
          <Text style={styles.controlButtonText}>Stop</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Activity size={18} color={colors.textSecondary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity Log</Text>
          <Text style={[styles.logCount, { color: colors.textLight }]}>{logs.length}</Text>
        </View>
        <View style={styles.logsList}>
          {logs.slice(-20).reverse().map((entry: any) => (
            <LogEntryCard key={entry.id} entry={entry} colors={colors} />
          ))}
          {logs.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textLight }]}>Waiting for simulation to start...</Text>
          )}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderResultsTab = () => {
    if (!result) {
      return (
        <View style={styles.emptyResults}>
          <Bot size={48} color={colors.textLight} />
          <Text style={[styles.emptyResultsTitle, { color: colors.text }]}>No Results Yet</Text>
          <Text style={[styles.emptyResultsText, { color: colors.textLight }]}>Run a simulation to see results here</Text>
          <TouchableOpacity
            style={[styles.goConfigButton, { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('configure')}
          >
            <Text style={styles.goConfigButtonText}>Configure & Run</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const scoreChange = result.endSnapshot.creditScore - result.startSnapshot.creditScore;
    const balanceChange = result.endSnapshot.bankBalance - result.startSnapshot.bankBalance;
    const netWorthChange = result.endSnapshot.netWorth - result.startSnapshot.netWorth;
    const debtChange = result.endSnapshot.totalDebt - result.startSnapshot.totalDebt;

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        <LinearGradient
          colors={scoreChange >= 0 ? ['#064E3B', '#065F46'] as [string, string] : ['#7F1D1D', '#991B1B'] as [string, string]}
          style={styles.resultHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.resultHeroIcon}>
            <Award size={36} color={scoreChange >= 0 ? '#34D399' : '#FCA5A5'} />
          </View>
          <Text style={styles.resultHeroTitle}>Simulation Complete</Text>
          <Text style={styles.resultHeroSub}>
            {result.monthsSimulated} months simulated
          </Text>
        </LinearGradient>

        <View style={styles.resultCardsGrid}>
          <View style={[styles.resultCard, { backgroundColor: colors.surface }]}>
            <TrendingUp size={20} color={scoreChange >= 0 ? '#10B981' : '#EF4444'} />
            <Text style={[styles.resultCardLabel, { color: colors.textSecondary }]}>Credit Score</Text>
            <Text style={[styles.resultCardValue, { color: colors.text }]}>
              {result.startSnapshot.creditScore} → {result.endSnapshot.creditScore}
            </Text>
            <Text style={[styles.resultCardChange, { color: scoreChange >= 0 ? '#10B981' : '#EF4444' }]}>
              {scoreChange >= 0 ? '+' : ''}{scoreChange} pts
            </Text>
          </View>

          <View style={[styles.resultCard, { backgroundColor: colors.surface }]}>
            <DollarSign size={20} color={balanceChange >= 0 ? '#10B981' : '#EF4444'} />
            <Text style={[styles.resultCardLabel, { color: colors.textSecondary }]}>Bank Balance</Text>
            <Text style={[styles.resultCardValue, { color: colors.text }]}>
              {formatCurrency(result.endSnapshot.bankBalance)}
            </Text>
            <Text style={[styles.resultCardChange, { color: balanceChange >= 0 ? '#10B981' : '#EF4444' }]}>
              {balanceChange >= 0 ? '+' : ''}{formatCurrency(balanceChange)}
            </Text>
          </View>

          <View style={[styles.resultCard, { backgroundColor: colors.surface }]}>
            <BarChart3 size={20} color={netWorthChange >= 0 ? '#10B981' : '#EF4444'} />
            <Text style={[styles.resultCardLabel, { color: colors.textSecondary }]}>Net Worth</Text>
            <Text style={[styles.resultCardValue, { color: colors.text }]}>
              {formatCurrency(result.endSnapshot.netWorth)}
            </Text>
            <Text style={[styles.resultCardChange, { color: netWorthChange >= 0 ? '#10B981' : '#EF4444' }]}>
              {netWorthChange >= 0 ? '+' : ''}{formatCurrency(netWorthChange)}
            </Text>
          </View>

          <View style={[styles.resultCard, { backgroundColor: colors.surface }]}>
            <CreditCard size={20} color={debtChange <= 0 ? '#10B981' : '#EF4444'} />
            <Text style={[styles.resultCardLabel, { color: colors.textSecondary }]}>Total Debt</Text>
            <Text style={[styles.resultCardValue, { color: colors.text }]}>
              {formatCurrency(result.endSnapshot.totalDebt)}
            </Text>
            <Text style={[styles.resultCardChange, { color: debtChange <= 0 ? '#10B981' : '#EF4444' }]}>
              {debtChange <= 0 ? '' : '+'}{formatCurrency(debtChange)}
            </Text>
          </View>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryCardHeader}>
            <Bot size={18} color="#3B82F6" />
            <Text style={[styles.summaryCardTitle, { color: colors.text }]}>AI Summary</Text>
          </View>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>{result.summary}</Text>
        </View>

        <View style={styles.resultActions}>
          <TouchableOpacity
            style={[styles.resultActionBtn, { backgroundColor: '#3B82F6' }]}
            onPress={handleReset}
          >
            <RotateCcw size={18} color="#FFFFFF" />
            <Text style={styles.resultActionText}>Run Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.resultActionBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => setActiveTab('running')}
          >
            <Activity size={18} color={colors.text} />
            <Text style={[styles.resultActionText, { color: colors.text }]}>View Logs</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Run Simulator',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ChevronLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <Animated.View style={[styles.container, { backgroundColor: colors.background, opacity: fadeAnim }]}>
        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {([
            { key: 'configure' as SimTab, label: 'Configure', icon: Settings },
            { key: 'running' as SimTab, label: 'Running', icon: Activity },
            { key: 'results' as SimTab, label: 'Results', icon: BarChart3 },
          ]).map(tab => {
            const isActive = activeTab === tab.key;
            const TabIcon = tab.icon;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, isActive && { backgroundColor: colors.primary + '15' }]}
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(tab.key);
                }}
              >
                <TabIcon size={18} color={isActive ? colors.primary : colors.textLight} />
                <Text style={[styles.tabLabel, { color: isActive ? colors.primary : colors.textLight }]}>{tab.label}</Text>
                {tab.key === 'running' && isRunning && (
                  <View style={styles.runningIndicator} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === 'configure' && renderConfigTab()}
        {activeTab === 'running' && renderRunningTab()}
        {activeTab === 'results' && renderResultsTab()}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
  },
  tabBar: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  runningIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  tabContent: {
    padding: 16,
  },
  agentHero: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  agentHeroInner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  agentAvatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 14,
  },
  agentHeroText: {
    flex: 1,
  },
  agentName: {
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
  },
  agentSub: {
    fontSize: 13,
    marginTop: 2,
  },
  currentStatsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-around' as const,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  currentStatItem: {
    alignItems: 'center' as const,
  },
  currentStatValue: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  currentStatLabel: {
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  currentStatDivider: {
    width: 1,
    height: 28,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 10,
  },
  sectionHeaderToggle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  sectionTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  goalsRow: {
    gap: 10,
    paddingVertical: 4,
  },
  goalChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  goalChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  durationInfoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  durationRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  durationIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  durationTextWrap: {
    flex: 1,
  },
  durationValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  durationLimit: {
    fontSize: 12,
    marginTop: 2,
  },
  cooldownBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  cooldownTextWrap: {
    flex: 1,
  },
  cooldownTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  cooldownTimer: {
    fontSize: 12,
    marginTop: 1,
  },
  cooldownReady: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  speedRow: {
    flexDirection: 'row' as const,
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  speedChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  speedChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  tasksList: {
    gap: 8,
    marginTop: 4,
  },
  taskCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  taskIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  taskInfo: {
    flex: 1,
  },
  taskLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  taskDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  advancedSettings: {
    gap: 8,
    marginTop: 8,
  },
  settingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 14,
    borderRadius: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  strategyRow: {
    flexDirection: 'row' as const,
    gap: 6,
  },
  strategyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  strategyChipText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  startButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden' as const,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonDisabled: {
    shadowColor: '#6B7280',
    shadowOpacity: 0.15,
  },
  startButtonGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 18,
    gap: 10,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  startButtonSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500' as const,
  },
  runningHero: {
    borderRadius: 20,
    overflow: 'hidden' as const,
    marginBottom: 16,
  },
  runningHeroGradient: {
    padding: 24,
  },
  runningStatusRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  runningBotWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(96,165,250,0.15)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 14,
  },
  runningDot: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  runningStatusText: {
    flex: 1,
  },
  runningTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  runningSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  progressBarOuter: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    overflow: 'hidden' as const,
    marginBottom: 8,
  },
  progressBarInner: {
    height: '100%',
    backgroundColor: '#60A5FA',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right' as const,
    marginBottom: 16,
  },
  liveStatsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  liveStat: {
    alignItems: 'center' as const,
  },
  liveStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  liveStatValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  controlsRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 20,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  logsList: {
    gap: 6,
    marginTop: 4,
  },
  logEntry: {
    flexDirection: 'row' as const,
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  logTypeDot: {
    width: 4,
    borderRadius: 2,
    marginTop: 4,
    alignSelf: 'stretch' as const,
  },
  logContent: {
    flex: 1,
  },
  logHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 2,
  },
  logAction: {
    fontSize: 13,
    fontWeight: '600' as const,
    flex: 1,
  },
  logTime: {
    fontSize: 10,
  },
  logDetail: {
    fontSize: 12,
    lineHeight: 16,
  },
  logCount: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginLeft: 'auto',
  },
  emptyText: {
    textAlign: 'center' as const,
    fontSize: 14,
    paddingVertical: 24,
  },
  emptyResults: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyResultsTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 16,
  },
  emptyResultsText: {
    fontSize: 14,
    textAlign: 'center' as const,
    marginTop: 8,
    lineHeight: 20,
  },
  goConfigButton: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  goConfigButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  resultHero: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  resultHeroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 14,
  },
  resultHeroTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  resultHeroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  resultCardsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    marginBottom: 20,
  },
  resultCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    padding: 16,
    borderRadius: 16,
    gap: 6,
  },
  resultCardLabel: {
    fontSize: 12,
  },
  resultCardValue: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  resultCardChange: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  summaryCard: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
  },
  summaryCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 12,
  },
  summaryCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
  },
  resultActions: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  resultActionBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  resultActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
