import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Animated,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Crown,
  Vote,
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  MapPin,
  TrendingUp,
  Award,
  X,
  ChevronRight,
  Star,
  Building2,
  Briefcase,
  Home,
  AlertCircle,
  Info,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { ElectionService } from '@/services/ElectionService';
import { CITIES } from '@/mocks/cityData';
import { MOCK_LEADERBOARD } from '@/mocks/gameData';
import { 
  Election, 
  MayorCandidate, 
  Mayor, 
  ELECTION_CONFIG 
} from '@/types/election';
import { formatCurrency } from '@/utils/creditEngine';

export default function ElectionsScreen() {
  const { colors, isDark } = useTheme();
  const { gameState, updateBalance, burnTokens, setHomeResidence } = useGame();
  
  const [elections, setElections] = useState<Election[]>([]);
  const [mayors, setMayors] = useState<Mayor[]>([]);
  const [, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [campaignPlatform, setCampaignPlatform] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<MayorCandidate | null>(null);
  const [showHomeResidenceModal, setShowHomeResidenceModal] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const playerCityId = gameState.lifestyle.homeResidenceCityId || gameState.lifestyle.cityId || 'city_los_angeles';
  const hasMultipleProperties = gameState.ownedProperties.length > 1;
  const homeResidenceCityId = gameState.lifestyle.homeResidenceCityId;
  const playerMayor = ElectionService.isPlayerMayor(gameState.playerId);

  const loadElections = useCallback(async () => {
    try {
      await ElectionService.initialize();
      await ElectionService.checkAndUpdateElections();
      
      const activeElections = ElectionService.getAllActiveElections();
      const currentMayors = ElectionService.getAllMayors();
      
      setElections(activeElections);
      setMayors(currentMayors);
    } catch (error) {
      console.error('[Elections] Error loading:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadElections();
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [loadElections, fadeAnim, scaleAnim]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadElections();
  }, [loadElections]);

  const getPlayerLeaderboardRank = useCallback(() => {
    const allEntries = [...MOCK_LEADERBOARD, {
      playerId: gameState.playerId,
      creditScore: gameState.creditScores.composite,
      netWorth: gameState.totalNetWorth,
    }];
    
    allEntries.sort((a, b) => b.creditScore - a.creditScore);
    const rank = allEntries.findIndex(e => e.playerId === gameState.playerId) + 1;
    return rank > 0 ? rank : allEntries.length;
  }, [gameState.playerId, gameState.creditScores.composite, gameState.totalNetWorth]);

  const handleApply = useCallback(async () => {
    if (!selectedElection) return;
    
    const canApply = ElectionService.canApplyForMayor(
      gameState.playerId,
      selectedElection.cityId,
      gameState.bankBalance
    );

    if (!canApply.canApply) {
      Alert.alert('Cannot Apply', canApply.reason || 'Unable to apply at this time');
      return;
    }

    if (!campaignPlatform.trim()) {
      Alert.alert('Campaign Platform Required', 'Please enter your campaign platform');
      return;
    }

    Alert.alert(
      'Confirm Application',
      `Apply to become Mayor of ${selectedElection.cityName}?\n\nApplication Fee: ${formatCurrency(ELECTION_CONFIG.APPLICATION_FEE)}\nAnnual Salary: ${formatCurrency(ELECTION_CONFIG.ANNUAL_SALARY)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              const result = await ElectionService.applyForMayor(
                {
                  playerId: gameState.playerId,
                  cityId: selectedElection.cityId,
                  applicationFee: ELECTION_CONFIG.APPLICATION_FEE,
                  campaignPlatform: campaignPlatform.trim(),
                  appliedAt: Date.now(),
                },
                {
                  playerName: gameState.playerName,
                  avatar: gameState.avatar,
                  profilePhotoUrl: gameState.profilePhotoUrl,
                  useCustomPhoto: gameState.useCustomPhoto,
                  creditScore: gameState.creditScores.composite,
                  netWorth: gameState.totalNetWorth,
                },
                getPlayerLeaderboardRank()
              );

              if (result.success) {
                updateBalance(-ELECTION_CONFIG.APPLICATION_FEE, 'bank');
                burnTokens(ELECTION_CONFIG.APPLICATION_FEE * 10, `Mayor application fee - ${selectedElection.cityName}`);
                
                Alert.alert(
                  'Application Submitted!',
                  `Your application for Mayor of ${selectedElection.cityName} has been submitted. The top 5 candidates by leaderboard ranking will be selected for voting.`
                );
                
                setShowApplyModal(false);
                setCampaignPlatform('');
                loadElections();
              } else {
                Alert.alert('Application Failed', result.error || 'Unknown error');
              }
            } catch (error) {
              console.error('[Elections] Apply error:', error);
              Alert.alert('Error', 'Failed to submit application');
            }
          },
        },
      ]
    );
  }, [selectedElection, campaignPlatform, gameState, getPlayerLeaderboardRank, updateBalance, burnTokens, loadElections]);

  const handleVote = useCallback(async () => {
    if (!selectedElection || !selectedCandidate) return;

    const canVote = ElectionService.canVote(
      gameState.playerId,
      selectedElection.id,
      playerCityId
    );

    if (!canVote.canVote) {
      Alert.alert('Cannot Vote', canVote.reason || 'Unable to vote at this time');
      return;
    }

    Alert.alert(
      'Confirm Vote',
      `Vote for ${selectedCandidate.playerName} as Mayor of ${selectedElection.cityName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Vote',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              const result = await ElectionService.castVote(
                gameState.playerId,
                selectedElection.id,
                selectedCandidate.id
              );

              if (result.success) {
                Alert.alert('Vote Cast!', `You voted for ${selectedCandidate.playerName}`);
                setShowVoteModal(false);
                setSelectedCandidate(null);
                loadElections();
              } else {
                Alert.alert('Vote Failed', result.error || 'Unknown error');
              }
            } catch (error) {
              console.error('[Elections] Vote error:', error);
              Alert.alert('Error', 'Failed to cast vote');
            }
          },
        },
      ]
    );
  }, [selectedElection, selectedCandidate, gameState.playerId, playerCityId, loadElections]);

  const getTimeRemaining = (endDate: number) => {
    const now = Date.now();
    const diff = endDate - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  const getStatusColor = (status: Election['status']) => {
    switch (status) {
      case 'accepting_applications': return '#10B981';
      case 'voting': return '#3B82F6';
      case 'completed': return '#6B7280';
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: Election['status']) => {
    switch (status) {
      case 'accepting_applications': return 'Accepting Applications';
      case 'voting': return 'Voting Open';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const renderMayorCard = (mayor: Mayor) => {
    const city = CITIES.find(c => c.id === mayor.cityId);
    const isPlayer = mayor.playerId === gameState.playerId;
    
    return (
      <Animated.View
        key={mayor.playerId}
        style={[
          styles.mayorCard,
          {
            backgroundColor: colors.surface,
            borderColor: isPlayer ? '#FFD700' : colors.border,
            borderWidth: isPlayer ? 2 : 1,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={isPlayer ? ['#FFD70015', '#FFD70005'] : [colors.surface, colors.surface]}
          style={styles.mayorGradient}
        >
          <View style={styles.mayorHeader}>
            <View style={[styles.mayorBadge, { backgroundColor: '#FFD70020' }]}>
              <Crown size={20} color="#FFD700" />
            </View>
            <View style={styles.mayorInfo}>
              <Text style={[styles.mayorName, { color: colors.text }]}>
                {mayor.playerName}
                {isPlayer && <Text style={{ color: '#FFD700' }}> (You)</Text>}
              </Text>
              <View style={styles.mayorCityRow}>
                <MapPin size={12} color={colors.textSecondary} />
                <Text style={[styles.mayorCity, { color: colors.textSecondary }]}>
                  Mayor of {mayor.cityName}
                </Text>
              </View>
            </View>
            {city && (
              <Image source={{ uri: city.imageUrl }} style={styles.cityThumbnail} />
            )}
          </View>
          
          <View style={styles.mayorStats}>
            <View style={styles.mayorStat}>
              <DollarSign size={14} color="#10B981" />
              <Text style={[styles.mayorStatValue, { color: '#10B981' }]}>
                {formatCurrency(mayor.annualSalary)}/yr
              </Text>
            </View>
            <View style={styles.mayorStat}>
              <Star size={14} color="#F59E0B" />
              <Text style={[styles.mayorStatValue, { color: '#F59E0B' }]}>
                {mayor.approvalRating}% approval
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderElectionCard = (election: Election) => {
    const city = CITIES.find(c => c.id === election.cityId);
    const isPlayerCity = election.cityId === playerCityId;
    const hasApplied = election.candidates.some(c => c.playerId === gameState.playerId);
    const hasVoted = ElectionService.hasPlayerVotedInElection(gameState.playerId, election.id);
    const canApply = election.status === 'accepting_applications' && 
                     gameState.bankBalance >= ELECTION_CONFIG.APPLICATION_FEE &&
                     !hasApplied;
    
    const eligibility = ElectionService.checkVotingEligibility(
      gameState.playerId,
      election.cityId,
      gameState.lifestyle.housingType,
      homeResidenceCityId,
      hasMultipleProperties
    );
    const canVote = election.status === 'voting' && eligibility.canVote && !hasVoted;
    const cannotVoteReason = !eligibility.canVote ? eligibility.reason : null;
    
    return (
      <Animated.View
        key={election.id}
        style={[
          styles.electionCard,
          {
            backgroundColor: colors.surface,
            borderColor: isPlayerCity ? colors.primary : colors.border,
            borderWidth: isPlayerCity ? 2 : 1,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedElection(election);
            if (canVote) {
              setShowVoteModal(true);
            } else if (canApply) {
              setShowApplyModal(true);
            }
          }}
        >
          {city && (
            <Image source={{ uri: city.imageUrl }} style={styles.electionCityImage} />
          )}
          
          <View style={styles.electionContent}>
            <View style={styles.electionHeader}>
              <View>
                <Text style={[styles.electionCity, { color: colors.text }]}>
                  {election.cityName}
                </Text>
                {isPlayerCity && (
                  <View style={[styles.yourCityBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.yourCityText, { color: colors.primary }]}>Your City</Text>
                  </View>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(election.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(election.status) }]}>
                  {getStatusLabel(election.status)}
                </Text>
              </View>
            </View>

            <View style={styles.electionStats}>
              <View style={styles.electionStat}>
                <Users size={14} color={colors.textSecondary} />
                <Text style={[styles.electionStatText, { color: colors.textSecondary }]}>
                  {election.status === 'voting' 
                    ? `${election.selectedCandidates.length} candidates` 
                    : `${election.candidates.length} applicants`}
                </Text>
              </View>
              <View style={styles.electionStat}>
                <Clock size={14} color={colors.textSecondary} />
                <Text style={[styles.electionStatText, { color: colors.textSecondary }]}>
                  {election.status === 'accepting_applications'
                    ? getTimeRemaining(election.applicationEndDate)
                    : getTimeRemaining(election.votingEndDate)}
                </Text>
              </View>
              {election.status === 'voting' && (
                <View style={styles.electionStat}>
                  <Vote size={14} color={colors.textSecondary} />
                  <Text style={[styles.electionStatText, { color: colors.textSecondary }]}>
                    {election.totalVotes} votes
                  </Text>
                </View>
              )}
            </View>

            {hasApplied && (
              <View style={[styles.appliedBadge, { backgroundColor: '#10B98120' }]}>
                <CheckCircle size={14} color="#10B981" />
                <Text style={[styles.appliedText, { color: '#10B981' }]}>Applied</Text>
              </View>
            )}

            {hasVoted && (
              <View style={[styles.appliedBadge, { backgroundColor: '#3B82F620' }]}>
                <CheckCircle size={14} color="#3B82F6" />
                <Text style={[styles.appliedText, { color: '#3B82F6' }]}>Voted</Text>
              </View>
            )}

            {cannotVoteReason && election.status === 'voting' && !hasVoted && (
              <View style={[styles.ineligibleBadge, { backgroundColor: '#F5920820' }]}>
                <AlertCircle size={14} color="#F59208" />
                <Text style={[styles.ineligibleText, { color: '#F59208' }]} numberOfLines={2}>
                  {cannotVoteReason}
                </Text>
              </View>
            )}

            {(canApply || canVote) && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setSelectedElection(election);
                  if (canVote) {
                    setShowVoteModal(true);
                  } else {
                    setShowApplyModal(true);
                  }
                }}
              >
                <Text style={styles.actionButtonText}>
                  {canVote ? 'Vote Now' : 'Apply to Run'}
                </Text>
                <ChevronRight size={18} color="#FFF" />
              </TouchableOpacity>
            )}

            {hasMultipleProperties && !homeResidenceCityId && election.status === 'voting' && !hasVoted && (
              <TouchableOpacity
                style={[styles.setHomeButton, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowHomeResidenceModal(true);
                }}
              >
                <Home size={16} color={colors.primary} />
                <Text style={[styles.setHomeButtonText, { color: colors.primary }]}>
                  Set Home Residence to Vote
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderCandidateCard = (candidate: MayorCandidate, index: number) => {
    const isSelected = selectedCandidate?.id === candidate.id;
    const isPlayer = candidate.playerId === gameState.playerId;
    
    return (
      <TouchableOpacity
        key={candidate.id}
        style={[
          styles.candidateCard,
          {
            backgroundColor: isSelected ? colors.primary + '15' : colors.background,
            borderColor: isSelected ? colors.primary : colors.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedCandidate(candidate);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.candidateRank}>
          <Text style={[styles.candidateRankText, { color: colors.textSecondary }]}>
            #{index + 1}
          </Text>
        </View>
        
        <View style={styles.candidateInfo}>
          <Text style={[styles.candidateName, { color: colors.text }]}>
            {candidate.playerName}
            {isPlayer && <Text style={{ color: colors.primary }}> (You)</Text>}
          </Text>
          <View style={styles.candidateStats}>
            <View style={styles.candidateStat}>
              <TrendingUp size={12} color="#10B981" />
              <Text style={[styles.candidateStatText, { color: colors.textSecondary }]}>
                {candidate.creditScore} score
              </Text>
            </View>
            <View style={styles.candidateStat}>
              <Award size={12} color="#F59E0B" />
              <Text style={[styles.candidateStatText, { color: colors.textSecondary }]}>
                Rank #{candidate.leaderboardRank}
              </Text>
            </View>
          </View>
          <Text style={[styles.candidatePlatform, { color: colors.textSecondary }]} numberOfLines={2}>
            &ldquo;{candidate.campaignPlatform}&rdquo;
          </Text>
        </View>

        <View style={styles.candidateVotes}>
          <Text style={[styles.voteCount, { color: colors.primary }]}>
            {candidate.voteCount}
          </Text>
          <Text style={[styles.voteLabel, { color: colors.textSecondary }]}>votes</Text>
        </View>

        {isSelected && (
          <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]}>
            <CheckCircle size={16} color="#FFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'City Elections' }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          <LinearGradient
            colors={isDark ? ['#1E3A5F', '#0F172A'] : ['#3B82F6', '#1D4ED8']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerIcon}>
                <Building2 size={32} color="#FFF" />
              </View>
              <Text style={styles.headerTitle}>City Elections</Text>
              <Text style={styles.headerSubtitle}>
                Run for mayor and lead your city!
              </Text>
              
              <View style={styles.infoCards}>
                <View style={[styles.infoCard, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <DollarSign size={18} color="#FFF" />
                  <View>
                    <Text style={styles.infoCardLabel}>Application Fee</Text>
                    <Text style={styles.infoCardValue}>
                      {formatCurrency(ELECTION_CONFIG.APPLICATION_FEE)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.infoCard, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <Briefcase size={18} color="#FFF" />
                  <View>
                    <Text style={styles.infoCardLabel}>Annual Salary</Text>
                    <Text style={styles.infoCardValue}>
                      {formatCurrency(ELECTION_CONFIG.ANNUAL_SALARY)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>

          {playerMayor && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Your Mayorship
              </Text>
              {renderMayorCard(playerMayor)}
            </View>
          )}

          {mayors.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Current Mayors
              </Text>
              {mayors.filter(m => m.playerId !== gameState.playerId).map(renderMayorCard)}
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Active Elections
            </Text>
            {elections.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                <Vote size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No active elections at the moment
                </Text>
              </View>
            ) : (
              elections.map(renderElectionCard)
            )}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        <Modal visible={showApplyModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={[styles.modalClose, { backgroundColor: colors.background }]}
                onPress={() => {
                  setShowApplyModal(false);
                  setCampaignPlatform('');
                }}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>

              <View style={styles.modalHeader}>
                <View style={[styles.modalIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Crown size={28} color={colors.primary} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Run for Mayor
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {selectedElection?.cityName}
                </Text>
              </View>

              <View style={[styles.feeInfo, { backgroundColor: colors.background }]}>
                <View style={styles.feeRow}>
                  <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>
                    Application Fee
                  </Text>
                  <Text style={[styles.feeValue, { color: colors.text }]}>
                    {formatCurrency(ELECTION_CONFIG.APPLICATION_FEE)}
                  </Text>
                </View>
                <View style={styles.feeRow}>
                  <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>
                    Your Balance
                  </Text>
                  <Text style={[
                    styles.feeValue, 
                    { color: gameState.bankBalance >= ELECTION_CONFIG.APPLICATION_FEE ? '#10B981' : '#EF4444' }
                  ]}>
                    {formatCurrency(gameState.bankBalance)}
                  </Text>
                </View>
                <View style={[styles.feeDivider, { backgroundColor: colors.border }]} />
                <View style={styles.feeRow}>
                  <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>
                    Annual Salary (if elected)
                  </Text>
                  <Text style={[styles.feeValue, { color: '#10B981' }]}>
                    {formatCurrency(ELECTION_CONFIG.ANNUAL_SALARY)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Campaign Platform
              </Text>
              <TextInput
                style={[
                  styles.platformInput,
                  { 
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  }
                ]}
                placeholder="What will you do as mayor?"
                placeholderTextColor={colors.textSecondary}
                value={campaignPlatform}
                onChangeText={setCampaignPlatform}
                multiline
                maxLength={200}
              />
              <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                {campaignPlatform.length}/200
              </Text>

              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Top {ELECTION_CONFIG.MAX_CANDIDATES} candidates by leaderboard ranking will be selected for voting
              </Text>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { 
                    backgroundColor: gameState.bankBalance >= ELECTION_CONFIG.APPLICATION_FEE 
                      ? colors.primary 
                      : colors.textSecondary 
                  }
                ]}
                onPress={handleApply}
                disabled={gameState.bankBalance < ELECTION_CONFIG.APPLICATION_FEE}
              >
                <Text style={styles.submitButtonText}>Submit Application</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showVoteModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={[styles.modalClose, { backgroundColor: colors.background }]}
                onPress={() => {
                  setShowVoteModal(false);
                  setSelectedCandidate(null);
                }}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>

              <View style={styles.modalHeader}>
                <View style={[styles.modalIcon, { backgroundColor: '#3B82F620' }]}>
                  <Vote size={28} color="#3B82F6" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Cast Your Vote
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {selectedElection?.cityName} Mayoral Election
                </Text>
              </View>

              <ScrollView style={styles.candidatesList} showsVerticalScrollIndicator={false}>
                {selectedElection?.selectedCandidates.map((candidate, index) => 
                  renderCandidateCard(candidate, index)
                )}
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: selectedCandidate ? colors.primary : colors.textSecondary }
                ]}
                onPress={handleVote}
                disabled={!selectedCandidate}
              >
                <Text style={styles.submitButtonText}>
                  {selectedCandidate 
                    ? `Vote for ${selectedCandidate.playerName}` 
                    : 'Select a Candidate'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showHomeResidenceModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={[styles.modalClose, { backgroundColor: colors.background }]}
                onPress={() => setShowHomeResidenceModal(false)}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>

              <View style={styles.modalHeader}>
                <View style={[styles.modalIcon, { backgroundColor: '#10B98120' }]}>
                  <Home size={28} color="#10B981" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Select Home Residence
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Choose your primary residence for voting eligibility
                </Text>
              </View>

              <View style={[styles.homeResidenceInfo, { backgroundColor: colors.background }]}>
                <Info size={16} color={colors.textSecondary} />
                <Text style={[styles.homeResidenceInfoText, { color: colors.textSecondary }]}>
                  You can only vote in the city where your Home Residence is located. You may only have one Home Residence at a time.
                </Text>
              </View>

              <ScrollView style={styles.propertiesList} showsVerticalScrollIndicator={false}>
                {gameState.ownedProperties.map((property) => {
                  const propertyCity = CITIES.find(c => 
                    property.address.toLowerCase().includes(c.name.toLowerCase())
                  );
                  const isCurrentHome = gameState.lifestyle.homeResidencePropertyId === property.id;
                  
                  return (
                    <TouchableOpacity
                      key={property.id}
                      style={[
                        styles.propertyCard,
                        {
                          backgroundColor: isCurrentHome ? colors.primary + '15' : colors.background,
                          borderColor: isCurrentHome ? colors.primary : colors.border,
                          borderWidth: isCurrentHome ? 2 : 1,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Alert.alert(
                          'Set as Home Residence?',
                          `Make ${property.name} your Home Residence? This will allow you to vote in ${propertyCity?.name || 'this city'}.`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Confirm',
                              onPress: () => {
                                setHomeResidence(property.id, propertyCity?.id || '', propertyCity?.name || 'Unknown');
                                setShowHomeResidenceModal(false);
                                loadElections();
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <View style={styles.propertyInfo}>
                        <Text style={[styles.propertyName, { color: colors.text }]}>
                          {property.name}
                        </Text>
                        <View style={styles.propertyLocation}>
                          <MapPin size={12} color={colors.textSecondary} />
                          <Text style={[styles.propertyAddress, { color: colors.textSecondary }]}>
                            {propertyCity?.name || 'Unknown City'}
                          </Text>
                        </View>
                      </View>
                      {isCurrentHome && (
                        <View style={[styles.currentHomeBadge, { backgroundColor: colors.primary }]}>
                          <CheckCircle size={14} color="#FFF" />
                          <Text style={styles.currentHomeText}>Home</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

                {gameState.ownedProperties.length === 0 && (
                  <View style={[styles.emptyProperties, { backgroundColor: colors.background }]}>
                    <Building2 size={32} color={colors.textSecondary} />
                    <Text style={[styles.emptyPropertiesText, { color: colors.textSecondary }]}>
                      You don&apos;t own any properties yet. Purchase a property to set a Home Residence.
                    </Text>
                  </View>
                )}
              </ScrollView>
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
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#FFF',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
  },
  infoCards: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  infoCardLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  mayorCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  mayorGradient: {
    padding: 16,
  },
  mayorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mayorBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mayorInfo: {
    flex: 1,
  },
  mayorName: {
    fontSize: 17,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  mayorCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mayorCity: {
    fontSize: 13,
  },
  cityThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  mayorStats: {
    flexDirection: 'row',
    gap: 20,
  },
  mayorStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mayorStatValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  electionCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  electionCityImage: {
    width: '100%',
    height: 120,
  },
  electionContent: {
    padding: 16,
  },
  electionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  electionCity: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  yourCityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  yourCityText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  electionStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  electionStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  electionStatText: {
    fontSize: 13,
  },
  appliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  appliedText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 15,
    marginTop: 12,
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '85%',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 15,
  },
  feeInfo: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 14,
  },
  feeValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  feeDivider: {
    height: 1,
    marginVertical: 8,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  platformInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  candidatesList: {
    maxHeight: 400,
    marginBottom: 16,
  },
  candidateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  candidateRank: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  candidateRankText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  candidateInfo: {
    flex: 1,
  },
  candidateName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  candidateStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  candidateStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  candidateStatText: {
    fontSize: 12,
  },
  candidatePlatform: {
    fontSize: 12,
    fontStyle: 'italic' as const,
  },
  candidateVotes: {
    alignItems: 'center',
    marginLeft: 12,
  },
  voteCount: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  voteLabel: {
    fontSize: 11,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ineligibleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  ineligibleText: {
    fontSize: 12,
    flex: 1,
  },
  setHomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
  },
  setHomeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  homeResidenceInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  homeResidenceInfoText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  propertiesList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  propertyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  propertyLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  propertyAddress: {
    fontSize: 13,
  },
  currentHomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  currentHomeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  emptyProperties: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
  },
  emptyPropertiesText: {
    fontSize: 14,
    textAlign: 'center' as const,
    marginTop: 12,
  },
});
