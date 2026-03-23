import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Animated,
  Dimensions,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/contexts/GameContext';
import { ExchangeRateService } from '../../services/ExchangeRateService';
import { MUSOTokenStatsService, MUSOTokenStats } from '../../services/MUSOTokenStatsService';
import {
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Wallet,
  TrendingUp,
  TrendingDown,
  History,
  DollarSign,
  PiggyBank,
  Globe,
  Cpu,
  Flame,
  Users,
  BarChart3,
  Shield,
  ExternalLink,
  Zap,
  Activity,
  Clock,
  Hash,
  Layers,
  ArrowRightLeft,
  Target,
  Award,
  Info,
  ChevronRight,
  CircleDot,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================
// Helper Components
// ============================================================

const PulseDot = ({ color, size = 8 }: { color: string; size?: number }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: pulseAnim,
      }}
    />
  );
};

const StatRow = ({ icon: Icon, iconColor, label, value, subValue }: {
  icon: any; iconColor: string; label: string; value: string; subValue?: string;
}) => (
  <View style={styles.statRow}>
    <View style={[styles.statRowIcon, { backgroundColor: iconColor + '15' }]}>
      <Icon size={14} color={iconColor} />
    </View>
    <Text style={styles.statRowLabel}>{label}</Text>
    <View style={styles.statRowRight}>
      <Text style={styles.statRowValue}>{value}</Text>
      {subValue && <Text style={styles.statRowSubValue}>{subValue}</Text>}
    </View>
  </View>
);

const SectionCard = ({ title, icon: Icon, iconColor, children, onPress }: {
  title: string; icon: any; iconColor: string; children: React.ReactNode; onPress?: () => void;
}) => (
  <View style={styles.sectionCard}>
    <TouchableOpacity
      style={styles.sectionCardHeader}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.sectionIconWrap, { backgroundColor: iconColor + '15' }]}>
        <Icon size={16} color={iconColor} />
      </View>
      <Text style={styles.sectionCardTitle}>{title}</Text>
      {onPress && <ChevronRight size={16} color="#9CA3AF" />}
    </TouchableOpacity>
    {children}
  </View>
);

// ============================================================
// Main Component
// ============================================================

export default function TokenWalletScreen() {
  const insets = useSafeAreaInsets();
  const { gameState, syncTokensWithBalance, isLoading } = useGame();
  const [refreshing, setRefreshing] = useState(false);
  const [tokenStats, setTokenStats] = useState<MUSOTokenStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'wallet' | 'network' | 'economy'>('wallet');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Get values from game state
  const tokenBalance = gameState.tokenWallet?.musoToken?.balance || 0;
  const bankBalance = gameState.bankBalance || 0;
  const savingsBalance = gameState.savingsBalance || 0;
  const emergencyFund = gameState.emergencyFund || 0;
  const totalBalance = bankBalance + savingsBalance + emergencyFund;
  const totalMinted = gameState.tokenWallet?.musoToken?.totalMinted || 0;
  const totalBurned = gameState.tokenWallet?.musoToken?.totalBurned || 0;
  const transactions = gameState.tokenWallet?.transactions || [];

  // Load token stats
  const loadTokenStats = useCallback(async (force: boolean = false) => {
    try {
      if (!tokenStats) setStatsLoading(true);
      const stats = await MUSOTokenStatsService.getStats(force);
      setTokenStats(stats);
    } catch (err) {
      console.warn('Failed to load token stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [tokenStats]);

  useEffect(() => {
    loadTokenStats();
    MUSOTokenStatsService.startAutoRefresh(30_000);

    const unsubscribe = MUSOTokenStatsService.subscribe((stats) => {
      setTokenStats(stats);
    });

    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    return () => {
      MUSOTokenStatsService.stopAutoRefresh();
      unsubscribe();
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    syncTokensWithBalance();
    await loadTokenStats(true);
    setTimeout(() => setRefreshing(false), 500);
  }, [syncTokensWithBalance, loadTokenStats]);

  const handleSync = useCallback(() => {
    syncTokensWithBalance();
    Alert.alert('Success', 'Token balance synced with bank balance successfully');
  }, [syncTokensWithBalance]);

  const openExplorer = useCallback(() => {
    const url = MUSOTokenStatsService.getExplorerTokenUrl();
    Linking.openURL(url).catch(() => {});
  }, []);

  const fmt = MUSOTokenStatsService.formatNumber.bind(MUSOTokenStatsService);

  const networkStatus = tokenStats?.network.status || 'offline';
  const networkColor = networkStatus === 'online' ? '#10B981' : networkStatus === 'degraded' ? '#F59E0B' : '#EF4444';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Wallet size={24} color="#8B5CF6" />
          <Text style={styles.headerTitle}>MUSO Token Wallet</Text>
        </View>
        <View style={styles.headerRight}>
          {tokenStats && (
            <View style={styles.networkBadge}>
              <PulseDot color={networkColor} size={6} />
              <Text style={[styles.networkBadgeText, { color: networkColor }]}>
                {networkStatus === 'online' ? 'Sepolia' : 'Offline'}
              </Text>
            </View>
          )}
          <TouchableOpacity onPress={onRefresh} disabled={isLoading}>
            <RefreshCw size={22} color={isLoading ? "#D1D5DB" : "#6B7280"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        {(['wallet', 'network', 'economy'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeSection === tab && styles.tabActive]}
            onPress={() => setActiveSection(tab)}
          >
            {tab === 'wallet' && <Wallet size={14} color={activeSection === tab ? '#8B5CF6' : '#9CA3AF'} />}
            {tab === 'network' && <Globe size={14} color={activeSection === tab ? '#8B5CF6' : '#9CA3AF'} />}
            {tab === 'economy' && <BarChart3 size={14} color={activeSection === tab ? '#8B5CF6' : '#9CA3AF'} />}
            <Text style={[styles.tabText, activeSection === tab && styles.tabTextActive]}>
              {tab === 'wallet' ? 'Wallet' : tab === 'network' ? 'Network' : 'Economy'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ============================================================ */}
          {/* WALLET TAB */}
          {/* ============================================================ */}
          {activeSection === 'wallet' && (
            <>
              {/* Token Balance Card */}
              <View style={styles.balanceCard}>
                <View style={styles.balanceCardTop}>
                  <View>
                    <Text style={styles.balanceLabel}>MUSO Token Balance</Text>
                    <Text style={styles.balanceValue}>
                      {ExchangeRateService.formatMusos(tokenBalance, 2)}
                    </Text>
                    <Text style={styles.balanceSubtext}>MUSO</Text>
                  </View>
                  <View style={styles.balanceRight}>
                    <View style={styles.balanceDollarBadge}>
                      <DollarSign size={12} color="#FFFFFF" />
                      <Text style={styles.balanceDollarText}>
                        {ExchangeRateService.formatDollars(tokenBalance * 0.1)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.syncStatusRow}>
                  <View style={styles.syncStatus}>
                    <PulseDot color="#10B981" />
                    <Text style={styles.statusText}>Synced with Game</Text>
                  </View>
                  <Text style={styles.networkLabel}>Sepolia Testnet</Text>
                </View>
              </View>

              {/* Token Contract Info */}
              {tokenStats && (
                <SectionCard title="Token Contract" icon={Shield} iconColor="#6366F1" onPress={openExplorer}>
                  <StatRow icon={Hash} iconColor="#8B5CF6" label="Contract" value={`${tokenStats.contract.address.slice(0, 6)}...${tokenStats.contract.address.slice(-4)}`} />
                  <StatRow icon={Layers} iconColor="#3B82F6" label="Standard" value={tokenStats.contract.standard} />
                  <StatRow icon={Info} iconColor="#6B7280" label="Decimals" value={`${tokenStats.contract.decimals}`} />
                  <StatRow icon={Globe} iconColor="#10B981" label="Network" value="Sepolia Testnet" subValue={`Chain ID: ${tokenStats.network.chainId}`} />
                  <TouchableOpacity style={styles.explorerButton} onPress={openExplorer}>
                    <ExternalLink size={14} color="#8B5CF6" />
                    <Text style={styles.explorerButtonText}>View on Etherscan</Text>
                  </TouchableOpacity>
                </SectionCard>
              )}

              {/* Bank Balance Card */}
              <View style={styles.bankCard}>
                <View style={styles.bankBalanceRow}>
                  <View style={styles.bankBalanceItem}>
                    <View style={styles.bankLabelRow}>
                      <DollarSign size={16} color="#6B7280" />
                      <Text style={styles.bankLabel}>Checking</Text>
                    </View>
                    <Text style={styles.bankValue}>
                      {ExchangeRateService.formatDollars(bankBalance)}
                    </Text>
                  </View>
                  <View style={styles.bankBalanceItem}>
                    <View style={styles.bankLabelRow}>
                      <PiggyBank size={16} color="#6B7280" />
                      <Text style={styles.bankLabel}>Savings</Text>
                    </View>
                    <Text style={styles.bankInfoValue}>
                      {ExchangeRateService.formatDollars(savingsBalance)}
                    </Text>
                  </View>
                </View>
                <View style={styles.totalBalanceRow}>
                  <Text style={styles.totalBalanceLabel}>Total Balance</Text>
                  <Text style={styles.totalBalanceValue}>
                    {ExchangeRateService.formatDollars(totalBalance)}
                  </Text>
                </View>
                <TouchableOpacity style={styles.syncButton} onPress={handleSync}>
                  <RefreshCw size={18} color="#8B5CF6" />
                  <Text style={styles.syncButtonText}>Sync Tokens with Balance</Text>
                </TouchableOpacity>
              </View>

              {/* Exchange Rate & Personal Stats */}
              <View style={styles.exchangeRateCard}>
                <Text style={styles.exchangeRateTitle}>Exchange Rate</Text>
                <Text style={styles.exchangeRateValue}>10 MUSO = $1</Text>
                <Text style={styles.exchangeRateSubtext}>
                  Fixed rate maintained by the game economy
                </Text>
              </View>

              <View style={styles.miniStatsRow}>
                <View style={styles.miniStatCard}>
                  <TrendingUp size={20} color="#10B981" />
                  <Text style={styles.miniStatValue}>
                    {ExchangeRateService.formatMusos(totalMinted, 0)}
                  </Text>
                  <Text style={styles.miniStatLabel}>You Minted</Text>
                </View>
                <View style={styles.miniStatCard}>
                  <TrendingDown size={20} color="#EF4444" />
                  <Text style={styles.miniStatValue}>
                    {ExchangeRateService.formatMusos(totalBurned, 0)}
                  </Text>
                  <Text style={styles.miniStatLabel}>You Burned</Text>
                </View>
              </View>

              {/* Recent Transactions */}
              <SectionCard title="Recent Transactions" icon={History} iconColor="#6B7280">
                {transactions.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No transactions yet</Text>
                  </View>
                ) : (
                  transactions.slice(0, 10).map((tx: any) => (
                    <View key={tx.id} style={styles.transactionItem}>
                      <View
                        style={[
                          styles.txIconContainer,
                          {
                            backgroundColor:
                              tx.type === 'mint'
                                ? 'rgba(16, 185, 129, 0.1)'
                                : 'rgba(239, 68, 68, 0.1)',
                          },
                        ]}
                      >
                        {tx.type === 'mint' ? (
                          <ArrowDownLeft size={18} color="#10B981" />
                        ) : (
                          <ArrowUpRight size={18} color="#EF4444" />
                        )}
                      </View>
                      <View style={styles.txDetails}>
                        <Text style={styles.txReason}>{tx.reason}</Text>
                        <Text style={styles.txDate}>
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.txAmountContainer}>
                        <Text
                          style={[
                            styles.txAmount,
                            tx.type === 'mint' ? styles.txAmountPositive : styles.txAmountNegative,
                          ]}
                        >
                          {tx.type === 'mint' ? '+' : '-'}
                          {ExchangeRateService.formatMusos(tx.amount, 2)}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </SectionCard>
            </>
          )}

          {/* ============================================================ */}
          {/* NETWORK TAB */}
          {/* ============================================================ */}
          {activeSection === 'network' && (
            <>
              {statsLoading && !tokenStats ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#8B5CF6" />
                  <Text style={styles.loadingText}>Loading network data...</Text>
                </View>
              ) : tokenStats ? (
                <>
                  {/* Network Status */}
                  <View style={styles.networkStatusCard}>
                    <View style={styles.networkStatusHeader}>
                      <PulseDot color={networkColor} size={10} />
                      <Text style={[styles.networkStatusTitle, { color: networkColor }]}>
                        {networkStatus === 'online' ? 'Network Online' : networkStatus === 'degraded' ? 'Degraded' : 'Network Offline'}
                      </Text>
                    </View>
                    <Text style={styles.networkStatusName}>{tokenStats.network.name}</Text>
                    <View style={styles.networkInfoGrid}>
                      <View style={styles.networkInfoItem}>
                        <Cpu size={16} color="#6366F1" />
                        <Text style={styles.networkInfoLabel}>Chain ID</Text>
                        <Text style={styles.networkInfoValue}>{tokenStats.network.chainId}</Text>
                      </View>
                      <View style={styles.networkInfoItem}>
                        <Layers size={16} color="#3B82F6" />
                        <Text style={styles.networkInfoLabel}>Latest Block</Text>
                        <Text style={styles.networkInfoValue}>
                          {tokenStats.network.latestBlock > 0 ? fmt(tokenStats.network.latestBlock) : '—'}
                        </Text>
                      </View>
                      <View style={styles.networkInfoItem}>
                        <Zap size={16} color="#F59E0B" />
                        <Text style={styles.networkInfoLabel}>Gas Price</Text>
                        <Text style={styles.networkInfoValue}>{tokenStats.network.gasPrice} Gwei</Text>
                      </View>
                      <View style={styles.networkInfoItem}>
                        <Clock size={16} color="#10B981" />
                        <Text style={styles.networkInfoLabel}>Updated</Text>
                        <Text style={styles.networkInfoValue}>
                          {tokenStats.network.lastUpdated ? new Date(tokenStats.network.lastUpdated).toLocaleTimeString() : '—'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Token Supply */}
                  <SectionCard title="Token Supply" icon={Layers} iconColor="#8B5CF6">
                    <StatRow icon={CircleDot} iconColor="#8B5CF6" label="Total Supply" value={fmt(tokenStats.supply.totalSupply)} subValue="MUSO" />
                    <StatRow icon={Activity} iconColor="#3B82F6" label="Circulating" value={fmt(tokenStats.supply.circulatingSupply)} subValue="MUSO" />
                    <StatRow icon={TrendingUp} iconColor="#10B981" label="Total Minted" value={fmt(tokenStats.supply.totalMinted)} subValue="MUSO" />
                    <StatRow icon={Flame} iconColor="#EF4444" label="Total Burned" value={fmt(tokenStats.supply.totalBurned)} subValue="MUSO" />
                    <StatRow icon={TrendingDown} iconColor="#F97316" label="Burn Rate" value={`${tokenStats.supply.burnRate}%`} />
                    <View style={styles.supplyBarContainer}>
                      <View style={styles.supplyBarLabel}>
                        <Text style={styles.supplyBarLabelText}>Supply Distribution</Text>
                      </View>
                      <View style={styles.supplyBar}>
                        <View
                          style={[
                            styles.supplyBarFill,
                            {
                              width: `${Math.min(100, (tokenStats.supply.circulatingSupply / tokenStats.supply.totalMinted) * 100)}%`,
                              backgroundColor: '#8B5CF6',
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.supplyBarFill,
                            {
                              width: `${Math.min(100, (tokenStats.supply.totalBurned / tokenStats.supply.totalMinted) * 100)}%`,
                              backgroundColor: '#EF4444',
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.supplyBarLegend}>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                          <Text style={styles.legendText}>Circulating</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                          <Text style={styles.legendText}>Burned</Text>
                        </View>
                      </View>
                    </View>
                  </SectionCard>

                  {/* Transaction Activity */}
                  <SectionCard title="Transaction Activity" icon={ArrowRightLeft} iconColor="#3B82F6">
                    <StatRow icon={Hash} iconColor="#6366F1" label="Total Transactions" value={fmt(tokenStats.transactions.totalTransactions)} />
                    <StatRow icon={Zap} iconColor="#F59E0B" label="Last 24h" value={fmt(tokenStats.transactions.transactions24h)} />
                    <StatRow icon={Clock} iconColor="#3B82F6" label="Last 7 Days" value={fmt(tokenStats.transactions.transactions7d)} />
                    <StatRow icon={BarChart3} iconColor="#8B5CF6" label="24h Volume" value={fmt(tokenStats.transactions.volume24h)} subValue="MUSO" />
                    <StatRow icon={Target} iconColor="#10B981" label="Avg Tx Size" value={fmt(tokenStats.transactions.averageTransactionSize)} subValue="MUSO" />
                    <View style={styles.txSplitRow}>
                      <View style={[styles.txSplitItem, { backgroundColor: '#10B98115' }]}>
                        <TrendingUp size={16} color="#10B981" />
                        <Text style={[styles.txSplitValue, { color: '#10B981' }]}>
                          {fmt(tokenStats.transactions.mintTransactions)}
                        </Text>
                        <Text style={styles.txSplitLabel}>Mints</Text>
                      </View>
                      <View style={[styles.txSplitItem, { backgroundColor: '#EF444415' }]}>
                        <TrendingDown size={16} color="#EF4444" />
                        <Text style={[styles.txSplitValue, { color: '#EF4444' }]}>
                          {fmt(tokenStats.transactions.burnTransactions)}
                        </Text>
                        <Text style={styles.txSplitLabel}>Burns</Text>
                      </View>
                    </View>
                  </SectionCard>

                  {/* Holder Stats */}
                  <SectionCard title="Token Holders" icon={Users} iconColor="#10B981">
                    <StatRow icon={Users} iconColor="#10B981" label="Total Holders" value={fmt(tokenStats.holders.totalHolders)} />
                    <StatRow icon={Activity} iconColor="#3B82F6" label="Active (24h)" value={fmt(tokenStats.holders.activeHolders24h)} />
                    <StatRow icon={TrendingUp} iconColor="#8B5CF6" label="New (7d)" value={`+${fmt(tokenStats.holders.newHolders7d)}`} />
                    <StatRow icon={BarChart3} iconColor="#F59E0B" label="Avg Balance" value={fmt(tokenStats.holders.averageBalance)} subValue="MUSO" />
                    <StatRow icon={Target} iconColor="#6B7280" label="Median Balance" value={fmt(tokenStats.holders.medianBalance)} subValue="MUSO" />
                  </SectionCard>

                  {/* View on Explorer */}
                  <TouchableOpacity style={styles.explorerCard} onPress={openExplorer}>
                    <ExternalLink size={18} color="#8B5CF6" />
                    <Text style={styles.explorerCardText}>View Full Details on Etherscan</Text>
                    <ChevronRight size={16} color="#8B5CF6" />
                  </TouchableOpacity>
                </>
              ) : null}
            </>
          )}

          {/* ============================================================ */}
          {/* ECONOMY TAB */}
          {/* ============================================================ */}
          {activeSection === 'economy' && (
            <>
              {statsLoading && !tokenStats ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#8B5CF6" />
                  <Text style={styles.loadingText}>Loading economy data...</Text>
                </View>
              ) : tokenStats ? (
                <>
                  {/* Token Economics Overview */}
                  <View style={styles.economyHeroCard}>
                    <Text style={styles.economyHeroLabel}>Simulated Market Cap</Text>
                    <Text style={styles.economyHeroValue}>
                      ${fmt(tokenStats.economy.marketCapSimulated)}
                    </Text>
                    <View style={styles.economyHeroMeta}>
                      <View style={styles.economyHeroMetaItem}>
                        <Text style={styles.economyHeroMetaLabel}>Exchange Rate</Text>
                        <Text style={styles.economyHeroMetaValue}>10 MUSO = $1</Text>
                      </View>
                      <View style={styles.economyHeroDivider} />
                      <View style={styles.economyHeroMetaItem}>
                        <Text style={styles.economyHeroMetaLabel}>TVL</Text>
                        <Text style={styles.economyHeroMetaValue}>${fmt(tokenStats.economy.totalValueLocked)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Player Activity */}
                  <SectionCard title="Player Activity" icon={Users} iconColor="#3B82F6">
                    <StatRow icon={Users} iconColor="#3B82F6" label="Total Players" value={fmt(tokenStats.economy.totalPlayers)} />
                    <StatRow icon={Zap} iconColor="#10B981" label="Daily Active" value={fmt(tokenStats.economy.dailyActiveUsers)} />
                    <StatRow icon={Activity} iconColor="#8B5CF6" label="Weekly Active" value={fmt(tokenStats.economy.weeklyActiveUsers)} />
                    <StatRow icon={Clock} iconColor="#F59E0B" label="Monthly Active" value={fmt(tokenStats.economy.monthlyActiveUsers)} />
                    <StatRow icon={DollarSign} iconColor="#6366F1" label="Avg Player Balance" value={fmt(tokenStats.economy.averagePlayerBalance)} subValue="MUSO" />
                  </SectionCard>

                  {/* Mainnet Swap Program */}
                  <View style={styles.mainnetSwapCard}>
                    <View style={styles.mainnetSwapHeader}>
                      <View style={styles.mainnetSwapBadge}>
                        <Award size={14} color="#F59E0B" />
                        <Text style={styles.mainnetSwapBadgeText}>MAINNET SWAP</Text>
                      </View>
                      <View style={[styles.swapStatusBadge, { backgroundColor: '#10B98120' }]}>
                        <Text style={[styles.swapStatusText, { color: '#10B981' }]}>
                          {tokenStats.mainnetSwap.status === 'accumulating' ? 'Accumulating' : tokenStats.mainnetSwap.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.mainnetSwapTitle}>
                      Earn MUSO Now, Swap for Real Tokens Later
                    </Text>
                    <Text style={styles.mainnetSwapDescription}>
                      {tokenStats.mainnetSwap.description}
                    </Text>

                    <View style={styles.mainnetSwapStats}>
                      <View style={styles.mainnetSwapStatItem}>
                        <Text style={styles.mainnetSwapStatValue}>
                          {fmt(tokenStats.mainnetSwap.totalRegistered)}
                        </Text>
                        <Text style={styles.mainnetSwapStatLabel}>Registered</Text>
                      </View>
                      <View style={styles.mainnetSwapStatDivider} />
                      <View style={styles.mainnetSwapStatItem}>
                        <Text style={styles.mainnetSwapStatValue}>
                          {fmt(tokenStats.mainnetSwap.totalEligible)}
                        </Text>
                        <Text style={styles.mainnetSwapStatLabel}>Eligible</Text>
                      </View>
                      <View style={styles.mainnetSwapStatDivider} />
                      <View style={styles.mainnetSwapStatItem}>
                        <Text style={styles.mainnetSwapStatValue}>
                          {tokenStats.mainnetSwap.minTokensForEligibility}
                        </Text>
                        <Text style={styles.mainnetSwapStatLabel}>Min MUSO</Text>
                      </View>
                    </View>

                    <View style={styles.mainnetSwapEligibility}>
                      <Info size={14} color="#6366F1" />
                      <Text style={styles.mainnetSwapEligibilityText}>
                        {tokenBalance >= tokenStats.mainnetSwap.minTokensForEligibility
                          ? '✅ You are eligible for the mainnet swap!'
                          : `Need ${tokenStats.mainnetSwap.minTokensForEligibility - tokenBalance} more MUSO to be eligible`
                        }
                      </Text>
                    </View>
                  </View>

                  {/* Token Info Summary */}
                  <SectionCard title="Token Details" icon={Info} iconColor="#6B7280">
                    <StatRow icon={Shield} iconColor="#8B5CF6" label="Token Name" value={tokenStats.contract.name} />
                    <StatRow icon={Hash} iconColor="#3B82F6" label="Symbol" value={tokenStats.contract.symbol} />
                    <StatRow icon={Globe} iconColor="#10B981" label="Network" value={tokenStats.network.name} />
                    <StatRow icon={Layers} iconColor="#F59E0B" label="Max Supply" value="Uncapped" />
                    <StatRow icon={Shield} iconColor="#EF4444" label="Paused" value={tokenStats.contract.isPaused ? 'Yes' : 'No'} />
                  </SectionCard>
                </>
              ) : null}
            </>
          )}

          {/* Last Refreshed */}
          {tokenStats && (
            <View style={styles.lastRefreshed}>
              <Clock size={12} color="#9CA3AF" />
              <Text style={styles.lastRefreshedText}>
                Last updated: {new Date(tokenStats.lastRefreshed).toLocaleTimeString()}
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  networkBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },
  tabActive: {
    backgroundColor: '#8B5CF615',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#8B5CF6',
  },

  content: {
    flex: 1,
    padding: 16,
  },

  // Balance Card
  balanceCard: {
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  balanceCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 6,
  },
  balanceValue: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  balanceSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  balanceRight: {
    alignItems: 'flex-end',
  },
  balanceDollarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  balanceDollarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  syncStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  networkLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },

  // Section Cards
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  // Stat Row
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  statRowIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRowLabel: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  statRowRight: {
    alignItems: 'flex-end',
  },
  statRowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  statRowSubValue: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },

  // Explorer Button
  explorerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#8B5CF608',
  },
  explorerButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },

  // Bank Card
  bankCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bankBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bankLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  bankValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  bankBalanceItem: {
    flex: 1,
  },
  bankLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  totalBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginBottom: 16,
  },
  totalBalanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  totalBalanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  bankInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },

  // Exchange Rate
  exchangeRateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  exchangeRateTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  exchangeRateValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  exchangeRateSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  // Mini Stats
  miniStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  miniStatValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginVertical: 6,
  },
  miniStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Transactions
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  txIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
  },
  txReason: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  txDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  txAmountContainer: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  txAmountPositive: {
    color: '#10B981',
  },
  txAmountNegative: {
    color: '#EF4444',
  },

  // Network Status
  networkStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  networkStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  networkStatusTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  networkStatusName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  networkInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  networkInfoItem: {
    width: (SCREEN_WIDTH - 74) / 2,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  networkInfoLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  networkInfoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  // Supply Bar
  supplyBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  supplyBarLabel: {
    marginBottom: 8,
  },
  supplyBarLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  supplyBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  supplyBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  supplyBarLegend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
  },

  // Tx Split
  txSplitRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  txSplitItem: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  txSplitValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  txSplitLabel: {
    fontSize: 11,
    color: '#6B7280',
  },

  // Explorer Card
  explorerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  explorerCardText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  // Economy Hero
  economyHeroCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#1E1B4B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  economyHeroLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  economyHeroValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 16,
  },
  economyHeroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  economyHeroMetaItem: {
    flex: 1,
  },
  economyHeroMetaLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 2,
  },
  economyHeroMetaValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  economyHeroDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 16,
  },

  // Mainnet Swap
  mainnetSwapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#F59E0B40',
  },
  mainnetSwapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mainnetSwapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F59E0B15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  mainnetSwapBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 1,
  },
  swapStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  swapStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  mainnetSwapTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  mainnetSwapDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    marginBottom: 16,
  },
  mainnetSwapStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  mainnetSwapStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  mainnetSwapStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  mainnetSwapStatLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  mainnetSwapStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
  },
  mainnetSwapEligibility: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6366F108',
    padding: 12,
    borderRadius: 10,
  },
  mainnetSwapEligibilityText: {
    flex: 1,
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '600',
  },

  // Last Refreshed
  lastRefreshed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  lastRefreshedText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
});