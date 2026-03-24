import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  JointVentureData,
  formatPartnerRole,
  getVentureStatusColor,
  getTimeRemaining,
} from '@/types/multiplayer-business';
import { formatCurrency } from '@/types/business';

interface JointVentureCardProps {
  venture: JointVentureData;
  currentUserId: string;
  onPress?: () => void;
  onVotePress?: (decisionId: string) => void;
}

export default function JointVentureCard({
  venture,
  currentUserId,
  onPress,
  onVotePress,
}: JointVentureCardProps) {
  const { colors } = useTheme();

  const currentPartner = useMemo(() => 
    venture.partners.find(p => p.userId === currentUserId),
    [venture.partners, currentUserId]
  );

  const isProfitable = venture.monthlyProfit > 0;
  const statusColor = getVentureStatusColor(venture.status);
  const pendingDecisionCount = venture.pendingDecisions.length;

  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.name} numberOfLines={1}>{venture.name}</Text>
        </View>
        {pendingDecisionCount > 0 && (
          <View style={styles.pendingBadge}>
            <AlertCircle size={12} color={colors.warning} />
            <Text style={styles.pendingText}>{pendingDecisionCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.partnersRow}>
        <View style={styles.avatarStack}>
          {venture.partners.slice(0, 4).map((partner, index) => (
            <View
              key={partner.id}
              style={[
                styles.avatarWrapper,
                { marginLeft: index > 0 ? -12 : 0, zIndex: 4 - index },
              ]}
            >
              {partner.userAvatar ? (
                <Image
                  source={{ uri: partner.userAvatar }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>
                    {partner.userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          ))}
          {venture.partners.length > 4 && (
            <View style={[styles.avatarWrapper, { marginLeft: -12 }]}>
              <View style={[styles.avatar, styles.avatarMore]}>
                <Text style={styles.avatarMoreText}>
                  +{venture.partners.length - 4}
                </Text>
              </View>
            </View>
          )}
        </View>
        <Text style={styles.partnerCount}>
          {venture.partners.length} partner{venture.partners.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {currentPartner && (
        <View style={styles.ownershipSection}>
          <View style={styles.ownershipBar}>
            <View
              style={[
                styles.ownershipFill,
                { width: `${currentPartner.ownershipPercentage}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
          <View style={styles.ownershipInfo}>
            <Text style={styles.ownershipLabel}>Your stake</Text>
            <Text style={styles.ownershipValue}>
              {currentPartner.ownershipPercentage.toFixed(1)}%
            </Text>
          </View>
        </View>
      )}

      <View style={styles.financials}>
        <View style={styles.financialItem}>
          <DollarSign size={14} color={colors.textSecondary} />
          <Text style={styles.financialLabel}>Revenue</Text>
          <Text style={styles.financialValue}>{formatCurrency(venture.monthlyRevenue)}</Text>
        </View>
        <View style={styles.financialDivider} />
        <View style={styles.financialItem}>
          {isProfitable ? (
            <TrendingUp size={14} color={colors.success} />
          ) : (
            <TrendingDown size={14} color={colors.error} />
          )}
          <Text style={styles.financialLabel}>Profit</Text>
          <Text style={[styles.financialValue, { color: isProfitable ? colors.success : colors.error }]}>
            {formatCurrency(venture.monthlyProfit)}
          </Text>
        </View>
        <View style={styles.financialDivider} />
        <View style={styles.financialItem}>
          <Users size={14} color={colors.textSecondary} />
          <Text style={styles.financialLabel}>Your Share</Text>
          <Text style={styles.financialValue}>
            {currentPartner ? formatCurrency((venture.monthlyProfit * currentPartner.profitShare) / 100) : '$0'}
          </Text>
        </View>
      </View>

      {pendingDecisionCount > 0 && (
        <View style={styles.decisionsSection}>
          <Text style={styles.decisionsTitle}>Pending Decisions</Text>
          {venture.pendingDecisions.slice(0, 2).map((decision) => {
            const timeRemaining = getTimeRemaining(decision.deadline);
            const hasVoted = decision.votes.some(v => v.partnerId === currentUserId);
            
            return (
              <TouchableOpacity
                key={decision.id}
                style={styles.decisionItem}
                onPress={() => onVotePress?.(decision.id)}
                activeOpacity={0.7}
              >
                <View style={styles.decisionLeft}>
                  {hasVoted ? (
                    <CheckCircle2 size={16} color={colors.success} />
                  ) : (
                    <AlertCircle size={16} color={colors.warning} />
                  )}
                  <Text style={styles.decisionTitle} numberOfLines={1}>
                    {decision.title}
                  </Text>
                </View>
                <View style={styles.decisionRight}>
                  <Clock size={12} color={timeRemaining.isExpired ? colors.error : colors.textSecondary} />
                  <Text style={[
                    styles.decisionTime,
                    timeRemaining.isExpired && { color: colors.error }
                  ]}>
                    {timeRemaining.formatted}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          {currentPartner && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{formatPartnerRole(currentPartner.role)}</Text>
            </View>
          )}
          <Text style={styles.valuationText}>
            Valuation: {formatCurrency(venture.currentValuation)}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.textLight} />
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  name: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.text,
    flex: 1,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.warning,
  },
  partnersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarStack: {
    flexDirection: 'row',
    marginRight: 10,
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: colors.surface,
    borderRadius: 16,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  avatarMore: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMoreText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  partnerCount: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  ownershipSection: {
    marginBottom: 14,
  },
  ownershipBar: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  ownershipFill: {
    height: '100%',
    borderRadius: 3,
  },
  ownershipInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ownershipLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  ownershipValue: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.text,
  },
  financials: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  financialItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  financialDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  financialLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  financialValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text,
  },
  decisionsSection: {
    marginBottom: 12,
  },
  decisionsTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  decisionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  decisionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  decisionTitle: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  decisionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  decisionTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  valuationText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
