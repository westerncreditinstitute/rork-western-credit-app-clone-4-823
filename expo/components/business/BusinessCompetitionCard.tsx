import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Trophy,
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  Zap,
  Target,
  BarChart3,
  ChevronRight,
  Crown,
  Medal,
  Award,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  BusinessCompetition,
  formatCompetitionType,
  getCompetitionTypeColor,
  getCompetitionStatusColor,
  getTimeRemaining,
} from '@/types/multiplayer-business';
import { formatCurrency } from '@/types/business';

interface BusinessCompetitionCardProps {
  competition: BusinessCompetition;
  currentUserId?: string;
  onPress?: () => void;
  onJoinPress?: () => void;
  isParticipating?: boolean;
  userRank?: number;
}

export default function BusinessCompetitionCard({
  competition,
  currentUserId,
  onPress,
  onJoinPress,
  isParticipating = false,
  userRank,
}: BusinessCompetitionCardProps) {
  const { colors } = useTheme();

  const typeColor = getCompetitionTypeColor(competition.type);
  const statusColor = getCompetitionStatusColor(competition.status);
  const timeRemaining = getTimeRemaining(competition.endDate);
  const isActive = competition.status === 'active';
  const isUpcoming = competition.status === 'upcoming';
  const participantProgress = (competition.currentParticipants / competition.maxParticipants) * 100;

  const getTypeIcon = () => {
    switch (competition.type) {
      case 'sales':
        return <DollarSign size={20} color={colors.white} />;
      case 'profit':
        return <TrendingUp size={20} color={colors.white} />;
      case 'revenue_growth':
        return <BarChart3 size={20} color={colors.white} />;
      case 'market_share':
        return <Target size={20} color={colors.white} />;
      case 'innovation':
        return <Zap size={20} color={colors.white} />;
      default:
        return <Trophy size={20} color={colors.white} />;
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown size={14} color="#FFD700" />;
      case 2:
        return <Medal size={14} color="#C0C0C0" />;
      case 3:
        return <Medal size={14} color="#CD7F32" />;
      default:
        return <Award size={14} color={colors.textSecondary} />;
    }
  };

  const topLeaders = useMemo(() => 
    competition.leaderboard.slice(0, 3),
    [competition.leaderboard]
  );

  const styles = createStyles(colors, typeColor);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[typeColor, typeColor + 'CC']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.typeIconWrap}>
            {getTypeIcon()}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.competitionName} numberOfLines={1}>
              {competition.name}
            </Text>
            <Text style={styles.competitionType}>
              {formatCompetitionType(competition.type)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '30' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {competition.status.charAt(0).toUpperCase() + competition.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.prizeRow}>
          <Trophy size={16} color="rgba(255,255,255,0.8)" />
          <Text style={styles.prizeText}>
            Prize Pool: {formatCurrency(competition.prizePool)}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Users size={16} color={colors.textSecondary} />
            <Text style={styles.statValue}>
              {competition.currentParticipants}/{competition.maxParticipants}
            </Text>
            <Text style={styles.statLabel}>Participants</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Clock size={16} color={timeRemaining.isExpired ? colors.error : colors.textSecondary} />
            <Text style={[styles.statValue, timeRemaining.isExpired && { color: colors.error }]}>
              {timeRemaining.formatted}
            </Text>
            <Text style={styles.statLabel}>
              {isActive ? 'Remaining' : isUpcoming ? 'Until Start' : 'Ended'}
            </Text>
          </View>
          {competition.entryFee > 0 && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <DollarSign size={16} color={colors.textSecondary} />
                <Text style={styles.statValue}>{formatCurrency(competition.entryFee)}</Text>
                <Text style={styles.statLabel}>Entry Fee</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.participantProgress}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${participantProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {Math.round(participantProgress)}% filled
          </Text>
        </View>

        {isActive && topLeaders.length > 0 && (
          <View style={styles.leaderboardPreview}>
            <Text style={styles.leaderboardTitle}>Leaderboard</Text>
            {topLeaders.map((leader, index) => (
              <View 
                key={leader.userId} 
                style={[
                  styles.leaderItem,
                  leader.userId === currentUserId && styles.currentUserLeader
                ]}
              >
                <View style={styles.leaderRank}>
                  {getRankIcon(index + 1)}
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <Text style={styles.leaderName} numberOfLines={1}>
                  {leader.userName}
                  {leader.userId === currentUserId && ' (You)'}
                </Text>
                <Text style={styles.leaderScore}>{formatCurrency(leader.score)}</Text>
              </View>
            ))}
          </View>
        )}

        {isParticipating && userRank && (
          <View style={styles.userPosition}>
            <View style={styles.userPositionLeft}>
              {getRankIcon(userRank)}
              <Text style={styles.userPositionText}>Your Position</Text>
            </View>
            <Text style={styles.userRankText}>#{userRank}</Text>
          </View>
        )}

        <View style={styles.footer}>
          {!isParticipating && (isUpcoming || isActive) && (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={(e) => {
                e.stopPropagation();
                onJoinPress?.();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.joinButtonText}>Join Competition</Text>
            </TouchableOpacity>
          )}
          {isParticipating && (
            <View style={styles.participatingBadge}>
              <Trophy size={14} color={colors.success} />
              <Text style={styles.participatingText}>Participating</Text>
            </View>
          )}
          <ChevronRight size={20} color={colors.textLight} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any, typeColor: string) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  headerGradient: {
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  competitionName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.white,
    marginBottom: 2,
  },
  competitionType: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prizeText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.white,
  },
  body: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  participantProgress: {
    marginBottom: 14,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: typeColor,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right' as const,
  },
  leaderboardPreview: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  leaderboardTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  leaderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  currentUserLeader: {
    backgroundColor: colors.primary + '10',
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  leaderRank: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 50,
    gap: 4,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  leaderName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  leaderScore: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
  userPosition: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary + '15',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  userPositionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userPositionText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500' as const,
  },
  userRankText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  joinButton: {
    flex: 1,
    backgroundColor: typeColor,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 12,
  },
  joinButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.white,
  },
  participatingBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.success + '15',
    borderRadius: 10,
    paddingVertical: 12,
    marginRight: 12,
  },
  participatingText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.success,
  },
});
