import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Send,
  Users,
  TrendingUp,
  Clock,
  DollarSign,
  MessageCircle,
  Vote,
  Bell,
  Circle,
  X,
  Plus,
  Percent,
  Target,
} from 'lucide-react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useGame } from '@/contexts/GameContext';
import { InvestmentPoolChatService } from '@/services/InvestmentPoolChatService';
import { InvestmentPoolService } from '@/services/InvestmentPoolService';
import { PoolMessage, PoolVote, PoolContributor, PoolUpdate } from '@/types/partnership';
import { InvestmentPoolData } from '@/types/business';
import { formatCurrency } from '@/mocks/businessCategories';
import * as Haptics from 'expo-haptics';

type TabType = 'chat' | 'contributors' | 'votes' | 'updates';

export default function PoolDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { poolId } = useLocalSearchParams<{ poolId: string }>();
  const auth = useAuth();
  const { gameState, updateBalance } = useGame();
  const { contributeToPool, refreshPools } = useBusiness();

  const userId = auth?.user?.id || '';
  const userName = auth?.user?.name || 'Investor';

  const [pool, setPool] = useState<InvestmentPoolData | null>(null);
  const [messages, setMessages] = useState<PoolMessage[]>([]);
  const [contributors, setContributors] = useState<PoolContributor[]>([]);
  const [votes, setVotes] = useState<PoolVote[]>([]);
  const [updates, setUpdates] = useState<PoolUpdate[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, boolean>>(new Map());

  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [investAmount, setInvestAmount] = useState('');
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [newVoteTitle, setNewVoteTitle] = useState('');
  const [newVoteOptions, setNewVoteOptions] = useState<string[]>(['', '']);

  const scrollViewRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const availableFunds = (gameState.bankBalance || 0) + (gameState.savingsBalance || 0);

  const loadPoolData = useCallback(async () => {
    if (!poolId) return;
    setIsLoading(true);

    try {
      const [poolData, messagesData, contributorsData, votesData, updatesData] = await Promise.all([
        InvestmentPoolService.getPoolDetails(poolId),
        InvestmentPoolChatService.getPoolMessages(poolId),
        InvestmentPoolChatService.getPoolContributors(poolId),
        InvestmentPoolChatService.getActiveVotes(poolId),
        InvestmentPoolChatService.getPoolUpdates(poolId),
      ]);

      if (poolData) {
        setPool(poolData);
      }
      setMessages(messagesData);
      setContributors(contributorsData);
      setVotes(votesData);
      setUpdates(updatesData);
    } catch (error) {
      console.error('[PoolDetail] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [poolId]);

  useEffect(() => {
    if (poolId) {
      loadPoolData();
    }
  }, [poolId, loadPoolData]);

  useEffect(() => {
    if (!poolId || !userId) return;

    const unsubscribe = InvestmentPoolChatService.subscribeToPool(
      poolId,
      userId,
      userName,
      {
        onMessage: (message) => {
          setMessages(prev => [...prev, message]);
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        },
        onPresenceSync: (users) => {
          const newOnlineUsers = new Map<string, boolean>();
          users.forEach(u => newOnlineUsers.set(u.id, u.isOnline));
          setOnlineUsers(newOnlineUsers);
        },
        onContributorJoin: (contributor) => {
          setOnlineUsers(prev => new Map(prev).set(contributor.id, true));
        },
        onContributorLeave: (contributorId) => {
          setOnlineUsers(prev => {
            const newMap = new Map(prev);
            newMap.set(contributorId, false);
            return newMap;
          });
        },
      }
    );

    return () => {
      unsubscribe();
    };
  }, [poolId, userId, userName]);

  useEffect(() => {
    if (pool) {
      const percentage = pool.fundingGoal > 0 ? (pool.currentAmount / pool.fundingGoal) * 100 : 0;
      Animated.timing(progressAnim, {
        toValue: Math.min(percentage, 100),
        duration: 800,
        useNativeDriver: false,
      }).start();
    }
  }, [pool, progressAnim]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !poolId || !userId) return;

    setIsSending(true);
    try {
      await InvestmentPoolChatService.sendMessage(poolId, userId, userName, messageText.trim());
      setMessageText('');
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('[PoolDetail] Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleInvest = async () => {
    if (!pool || !userId) return;

    const amount = parseFloat(investAmount.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid investment amount.');
      return;
    }

    if (amount < pool.minInvestment) {
      Alert.alert('Minimum Not Met', `Minimum investment is ${formatCurrency(pool.minInvestment)}`);
      return;
    }

    if (amount > availableFunds) {
      Alert.alert('Insufficient Funds', `You only have ${formatCurrency(availableFunds)} available.`);
      return;
    }

    try {
      const result = await contributeToPool(pool.id, amount, userId);

      if (result.success) {
        if (amount <= gameState.bankBalance) {
          updateBalance(-amount, 'bank');
        } else {
          const fromBank = gameState.bankBalance;
          const fromSavings = amount - fromBank;
          updateBalance(-fromBank, 'bank');
          updateBalance(-fromSavings, 'savings');
        }

        await InvestmentPoolChatService.sendMessage(
          pool.id,
          'system',
          'System',
          `${userName} invested ${formatCurrency(amount)}!`,
          'system'
        );

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        setShowInvestModal(false);
        setInvestAmount('');
        loadPoolData();
        refreshPools();

        Alert.alert('Investment Successful', `You invested ${formatCurrency(amount)}!`);
      } else {
        Alert.alert('Investment Failed', result.error || 'Failed to complete investment');
      }
    } catch (error) {
      console.error('[PoolDetail] Error investing:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleCreateVote = async () => {
    if (!newVoteTitle.trim() || !poolId || !userId) return;

    const validOptions = newVoteOptions.filter(o => o.trim());
    if (validOptions.length < 2) {
      Alert.alert('Invalid Vote', 'Please provide at least 2 options.');
      return;
    }

    try {
      const vote = await InvestmentPoolChatService.createVote(
        poolId,
        userId,
        newVoteTitle.trim(),
        '',
        validOptions
      );

      if (vote) {
        setVotes(prev => [vote, ...prev]);
        setShowVoteModal(false);
        setNewVoteTitle('');
        setNewVoteOptions(['', '']);

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.error('[PoolDetail] Error creating vote:', error);
    }
  };

  const handleCastVote = useCallback(async (voteId: string, optionId: string) => {
    if (!userId || !poolId) return;

    const success = await InvestmentPoolChatService.castVote(voteId, optionId, userId);
    if (success) {
      const updatedVotes = await InvestmentPoolChatService.getActiveVotes(poolId);
      setVotes(updatedVotes);

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  }, [userId, poolId]);

  const fundingPercentage = useMemo(() => {
    if (!pool || pool.fundingGoal === 0) return 0;
    return (pool.currentAmount / pool.fundingGoal) * 100;
  }, [pool]);

  const daysRemaining = useMemo(() => {
    if (!pool) return 0;
    return Math.max(0, Math.ceil((new Date(pool.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }, [pool]);

  const isPoolOpen = pool?.status === 'open' && daysRemaining > 0;

  const renderMessage = useCallback(({ item }: { item: PoolMessage }) => {
    const isOwn = item.senderId === userId;
    const isSystem = item.messageType === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemMessage}>
          <Text style={[styles.systemMessageText, { color: colors.textSecondary }]}>
            {item.message}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageContainer, isOwn && styles.ownMessageContainer]}>
        {!isOwn && (
          <View style={[styles.avatar, { backgroundColor: colors.primary + '30' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {item.senderName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isOwn ? { backgroundColor: colors.primary } : { backgroundColor: colors.surfaceAlt }
        ]}>
          {!isOwn && (
            <Text style={[styles.senderName, { color: colors.primary }]}>
              {item.senderName}
            </Text>
          )}
          <Text style={[styles.messageText, { color: isOwn ? '#FFF' : colors.text }]}>
            {item.message}
          </Text>
          <Text style={[styles.messageTime, { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textLight }]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  }, [userId, colors]);

  const renderContributor = useCallback(({ item }: { item: PoolContributor }) => {
    const isOnline = onlineUsers.get(item.userId) || false;

    return (
      <View style={[styles.contributorCard, { backgroundColor: colors.surface }]}>
        <View style={styles.contributorInfo}>
          <View style={[styles.contributorAvatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.contributorAvatarText, { color: colors.primary }]}>
              {item.userName.charAt(0).toUpperCase()}
            </Text>
            <View style={[styles.onlineIndicator, { backgroundColor: isOnline ? '#22C55E' : '#9CA3AF' }]} />
          </View>
          <View style={styles.contributorDetails}>
            <Text style={[styles.contributorName, { color: colors.text }]}>{item.userName}</Text>
            <Text style={[styles.contributorJoined, { color: colors.textSecondary }]}>
              Joined {new Date(item.joinedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={styles.contributorStats}>
          <Text style={[styles.contributorAmount, { color: colors.text }]}>
            {formatCurrency(item.contributionAmount)}
          </Text>
          <Text style={[styles.contributorOwnership, { color: colors.primary }]}>
            {item.ownershipPercentage.toFixed(1)}% ownership
          </Text>
        </View>
      </View>
    );
  }, [colors, onlineUsers]);

  const renderVote = useCallback(({ item }: { item: PoolVote }) => {
    const hasVoted = item.options.some(opt => opt.votes.includes(userId));
    const totalVotes = item.options.reduce((sum, opt) => sum + opt.votes.length, 0);

    return (
      <View style={[styles.voteCard, { backgroundColor: colors.surface }]}>
        <View style={styles.voteHeader}>
          <Vote size={18} color={colors.primary} />
          <Text style={[styles.voteTitle, { color: colors.text }]}>{item.title}</Text>
        </View>
        <Text style={[styles.voteDeadline, { color: colors.textSecondary }]}>
          Ends {new Date(item.votingDeadline).toLocaleDateString()}
        </Text>
        <View style={styles.voteOptions}>
          {item.options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.voteOption,
                { backgroundColor: colors.surfaceAlt },
                hasVoted && option.votes.includes(userId) && { borderColor: colors.primary, borderWidth: 2 }
              ]}
              onPress={() => !hasVoted && handleCastVote(item.id, option.id)}
              disabled={hasVoted}
            >
              <View style={styles.voteOptionContent}>
                <Text style={[styles.voteOptionLabel, { color: colors.text }]}>{option.label}</Text>
                <Text style={[styles.voteOptionCount, { color: colors.textSecondary }]}>
                  {option.votes.length} vote{option.votes.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={[styles.voteProgressBg, { backgroundColor: colors.background }]}>
                <View
                  style={[
                    styles.voteProgressFill,
                    { backgroundColor: colors.primary, width: `${option.percentage}%` }
                  ]}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.voteTotalVotes, { color: colors.textLight }]}>
          {totalVotes} total vote{totalVotes !== 1 ? 's' : ''}
        </Text>
      </View>
    );
  }, [colors, userId, handleCastVote]);

  const renderUpdate = useCallback(({ item }: { item: PoolUpdate }) => {
    const getUpdateIcon = () => {
      switch (item.updateType) {
        case 'contribution': return <DollarSign size={16} color="#22C55E" />;
        case 'profit': return <TrendingUp size={16} color="#10B981" />;
        case 'milestone': return <Target size={16} color="#F59E0B" />;
        case 'announcement': return <Bell size={16} color="#3B82F6" />;
        default: return <Bell size={16} color={colors.textSecondary} />;
      }
    };

    return (
      <View style={[styles.updateCard, { backgroundColor: colors.surface }]}>
        <View style={[styles.updateIcon, { backgroundColor: colors.surfaceAlt }]}>
          {getUpdateIcon()}
        </View>
        <View style={styles.updateContent}>
          <Text style={[styles.updateTitle, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.updateDescription, { color: colors.textSecondary }]}>
            {item.description}
          </Text>
          {item.amount && (
            <Text style={[styles.updateAmount, { color: '#22C55E' }]}>
              {formatCurrency(item.amount)}
            </Text>
          )}
          <Text style={[styles.updateTime, { color: colors.textLight }]}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    );
  }, [colors]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Investment Pool', headerShown: true }} />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading pool...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!pool) {
    return (
      <>
        <Stack.Screen options={{ title: 'Investment Pool', headerShown: true }} />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.text }]}>Pool not found</Text>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.primary }]}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: pool.poolName, headerShown: true }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
          <View style={[styles.poolHeader, { backgroundColor: colors.surface }]}>
            <View style={styles.poolHeaderTop}>
              <View style={[styles.statusBadge, { backgroundColor: isPoolOpen ? '#10B98120' : '#6B728020' }]}>
                <Circle size={8} color={isPoolOpen ? '#10B981' : '#6B7280'} fill={isPoolOpen ? '#10B981' : '#6B7280'} />
                <Text style={[styles.statusText, { color: isPoolOpen ? '#10B981' : '#6B7280' }]}>
                  {isPoolOpen ? 'Open' : pool.status === 'funded' ? 'Funded' : 'Closed'}
                </Text>
              </View>
              <View style={styles.onlineCount}>
                <Users size={14} color={colors.textSecondary} />
                <Text style={[styles.onlineCountText, { color: colors.textSecondary }]}>
                  {Array.from(onlineUsers.values()).filter(Boolean).length} online
                </Text>
              </View>
            </View>

            <View style={styles.fundingProgress}>
              <View style={styles.fundingHeader}>
                <Text style={[styles.fundingLabel, { color: colors.textSecondary }]}>Funding Progress</Text>
                <Text style={[styles.fundingPercentage, { color: colors.text }]}>
                  {fundingPercentage.toFixed(0)}%
                </Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceAlt }]}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: fundingPercentage >= 100 ? '#10B981' : colors.primary,
                      width: progressAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              <View style={styles.fundingStats}>
                <Text style={[styles.fundingCurrent, { color: colors.text }]}>
                  {formatCurrency(pool.currentAmount)}
                </Text>
                <Text style={[styles.fundingTarget, { color: colors.textSecondary }]}>
                  of {formatCurrency(pool.fundingGoal)}
                </Text>
              </View>
            </View>

            <View style={styles.poolStats}>
              <View style={styles.poolStat}>
                <Percent size={14} color="#10B981" />
                <Text style={[styles.poolStatValue, { color: colors.text }]}>
                  {pool.expectedRoiPercentage}% ROI
                </Text>
              </View>
              <View style={styles.poolStat}>
                <Users size={14} color="#3B82F6" />
                <Text style={[styles.poolStatValue, { color: colors.text }]}>
                  {contributors.length} investors
                </Text>
              </View>
              <View style={styles.poolStat}>
                <Clock size={14} color={daysRemaining <= 7 ? '#EF4444' : '#F59E0B'} />
                <Text style={[styles.poolStatValue, { color: daysRemaining <= 7 ? '#EF4444' : colors.text }]}>
                  {daysRemaining}d left
                </Text>
              </View>
            </View>

            {isPoolOpen && (
              <TouchableOpacity
                style={[styles.investButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowInvestModal(true)}
              >
                <DollarSign size={18} color="#FFF" />
                <Text style={styles.investButtonText}>Invest Now</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.tabBar}>
            {(['chat', 'contributors', 'votes', 'updates'] as TabType[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                onPress={() => setActiveTab(tab)}
              >
                {tab === 'chat' && <MessageCircle size={16} color={activeTab === tab ? colors.primary : colors.textSecondary} />}
                {tab === 'contributors' && <Users size={16} color={activeTab === tab ? colors.primary : colors.textSecondary} />}
                {tab === 'votes' && <Vote size={16} color={activeTab === tab ? colors.primary : colors.textSecondary} />}
                {tab === 'updates' && <Bell size={16} color={activeTab === tab ? colors.primary : colors.textSecondary} />}
                <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.tabContent}>
            {activeTab === 'chat' && (
              <>
                <FlatList
                  ref={scrollViewRef as any}
                  data={messages}
                  keyExtractor={(item) => item.id}
                  renderItem={renderMessage}
                  contentContainerStyle={styles.messagesList}
                  showsVerticalScrollIndicator={false}
                  onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
                />
                <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.textLight}
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, { backgroundColor: colors.primary, opacity: messageText.trim() ? 1 : 0.5 }]}
                    onPress={handleSendMessage}
                    disabled={!messageText.trim() || isSending}
                  >
                    {isSending ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Send size={20} color="#FFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {activeTab === 'contributors' && (
              <FlatList
                data={contributors}
                keyExtractor={(item) => item.id}
                renderItem={renderContributor}
                contentContainerStyle={styles.contributorsList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Users size={40} color={colors.textLight} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No contributors yet</Text>
                  </View>
                }
              />
            )}

            {activeTab === 'votes' && (
              <>
                <TouchableOpacity
                  style={[styles.createVoteButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowVoteModal(true)}
                >
                  <Plus size={18} color="#FFF" />
                  <Text style={styles.createVoteText}>Create Vote</Text>
                </TouchableOpacity>
                <FlatList
                  data={votes}
                  keyExtractor={(item) => item.id}
                  renderItem={renderVote}
                  contentContainerStyle={styles.votesList}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Vote size={40} color={colors.textLight} />
                      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active votes</Text>
                    </View>
                  }
                />
              </>
            )}

            {activeTab === 'updates' && (
              <FlatList
                data={updates}
                keyExtractor={(item) => item.id}
                renderItem={renderUpdate}
                contentContainerStyle={styles.updatesList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Bell size={40} color={colors.textLight} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No updates yet</Text>
                  </View>
                }
              />
            )}
          </View>

          {showInvestModal && (
            <View style={styles.modalOverlay}>
              <View style={[styles.modal, { backgroundColor: colors.surface }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Invest in Pool</Text>
                  <TouchableOpacity onPress={() => setShowInvestModal(false)}>
                    <X size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.modalInput, { backgroundColor: colors.surfaceAlt }]}>
                  <DollarSign size={18} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.modalTextInput, { color: colors.text }]}
                    placeholder="Enter amount"
                    placeholderTextColor={colors.textLight}
                    value={investAmount}
                    onChangeText={(text) => setInvestAmount(text.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.modalHints}>
                  <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
                    Min: {formatCurrency(pool.minInvestment)}
                  </Text>
                  <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
                    Available: {formatCurrency(availableFunds)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.primary }]}
                  onPress={handleInvest}
                >
                  <Text style={styles.modalButtonText}>Confirm Investment</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {showVoteModal && (
            <View style={styles.modalOverlay}>
              <View style={[styles.modal, { backgroundColor: colors.surface }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Create Vote</Text>
                  <TouchableOpacity onPress={() => setShowVoteModal(false)}>
                    <X size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.voteInput, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
                  placeholder="Vote question"
                  placeholderTextColor={colors.textLight}
                  value={newVoteTitle}
                  onChangeText={setNewVoteTitle}
                />
                {newVoteOptions.map((option, index) => (
                  <TextInput
                    key={index}
                    style={[styles.voteInput, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor={colors.textLight}
                    value={option}
                    onChangeText={(text) => {
                      const newOptions = [...newVoteOptions];
                      newOptions[index] = text;
                      setNewVoteOptions(newOptions);
                    }}
                  />
                ))}
                <TouchableOpacity
                  style={[styles.addOptionButton, { borderColor: colors.primary }]}
                  onPress={() => setNewVoteOptions([...newVoteOptions, ''])}
                >
                  <Plus size={16} color={colors.primary} />
                  <Text style={[styles.addOptionText, { color: colors.primary }]}>Add Option</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.primary }]}
                  onPress={handleCreateVote}
                >
                  <Text style={styles.modalButtonText}>Create Vote</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 20 },
  errorText: { fontSize: 18, fontWeight: '600' },
  backButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  poolHeader: { padding: 16, gap: 12 },
  poolHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  onlineCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineCountText: { fontSize: 12 },
  fundingProgress: { gap: 6 },
  fundingHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  fundingLabel: { fontSize: 12 },
  fundingPercentage: { fontSize: 14, fontWeight: '700' },
  progressBarBg: { height: 10, borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },
  fundingStats: { flexDirection: 'row', gap: 4 },
  fundingCurrent: { fontSize: 14, fontWeight: '600' },
  fundingTarget: { fontSize: 14 },
  poolStats: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  poolStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  poolStatValue: { fontSize: 12, fontWeight: '600' },
  investButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 8 },
  investButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB20' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  tabText: { fontSize: 13, fontWeight: '500' },
  tabContent: { flex: 1 },
  messagesList: { padding: 16, gap: 8 },
  messageContainer: { flexDirection: 'row', gap: 8, maxWidth: '80%' },
  ownMessageContainer: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: '600' },
  messageBubble: { padding: 10, borderRadius: 16, maxWidth: '100%' },
  senderName: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  messageText: { fontSize: 14, lineHeight: 20 },
  messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  systemMessage: { alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 12 },
  systemMessageText: { fontSize: 12, fontStyle: 'italic' },
  inputContainer: { flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB20' },
  textInput: { flex: 1, padding: 12, borderRadius: 20, fontSize: 15, maxHeight: 100 },
  sendButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  contributorsList: { padding: 16, gap: 10 },
  contributorCard: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderRadius: 12 },
  contributorInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contributorAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  contributorAvatarText: { fontSize: 18, fontWeight: '600' },
  onlineIndicator: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#FFF' },
  contributorDetails: { gap: 2 },
  contributorName: { fontSize: 15, fontWeight: '600' },
  contributorJoined: { fontSize: 12 },
  contributorStats: { alignItems: 'flex-end', gap: 2 },
  contributorAmount: { fontSize: 15, fontWeight: '700' },
  contributorOwnership: { fontSize: 12, fontWeight: '500' },
  createVoteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 16, padding: 12, borderRadius: 10, gap: 6 },
  createVoteText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  votesList: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  voteCard: { padding: 16, borderRadius: 14, gap: 10 },
  voteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voteTitle: { fontSize: 16, fontWeight: '600', flex: 1 },
  voteDeadline: { fontSize: 12 },
  voteOptions: { gap: 8 },
  voteOption: { padding: 12, borderRadius: 10, gap: 8 },
  voteOptionContent: { flexDirection: 'row', justifyContent: 'space-between' },
  voteOptionLabel: { fontSize: 14, fontWeight: '500' },
  voteOptionCount: { fontSize: 12 },
  voteProgressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  voteProgressFill: { height: '100%', borderRadius: 3 },
  voteTotalVotes: { fontSize: 11, textAlign: 'center' },
  updatesList: { padding: 16, gap: 10 },
  updateCard: { flexDirection: 'row', padding: 14, borderRadius: 12, gap: 12 },
  updateIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  updateContent: { flex: 1, gap: 2 },
  updateTitle: { fontSize: 14, fontWeight: '600' },
  updateDescription: { fontSize: 13 },
  updateAmount: { fontSize: 14, fontWeight: '700' },
  updateTime: { fontSize: 11, marginTop: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15 },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { borderRadius: 20, padding: 20, gap: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalInput: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, gap: 10 },
  modalTextInput: { flex: 1, fontSize: 16, fontWeight: '600' },
  modalHints: { flexDirection: 'row', justifyContent: 'space-between' },
  modalHint: { fontSize: 12 },
  modalButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  modalButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  voteInput: { padding: 14, borderRadius: 12, fontSize: 15 },
  addOptionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', gap: 6 },
  addOptionText: { fontSize: 14, fontWeight: '500' },
});
