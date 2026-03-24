import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Clock,
  CreditCard,
  TrendingUp,
  Layers,
  Search,
  Info,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { getCreditTier } from '@/utils/creditEngine';
import { useEffect } from 'react';

export default function CreditDetailsScreen() {
  const { colors } = useTheme();
  const { gameState, creditBreakdown, creditUtilization } = useGame();

  const creditTier = getCreditTier(gameState.creditScores.composite);

  useEffect(() => {
    console.log('[CreditDetails] Credit breakdown utilization:', {
      score: creditBreakdown.creditUtilization.score,
      maxScore: creditBreakdown.creditUtilization.maxScore,
      percentage: creditBreakdown.creditUtilization.percentage,
      contextUtilization: creditUtilization,
      details: creditBreakdown.creditUtilization.details,
    });
  }, [creditBreakdown, creditUtilization]);

  const factors = [
    {
      id: 'payment',
      title: 'Payment History',
      icon: Clock,
      weight: '35%',
      score: creditBreakdown.paymentHistory.score,
      maxScore: creditBreakdown.paymentHistory.maxScore,
      details: creditBreakdown.paymentHistory.details,
      color: '#3B82F6',
    },
    {
      id: 'utilization',
      title: 'Credit Utilization',
      icon: CreditCard,
      weight: '30%',
      score: creditBreakdown.creditUtilization.score,
      maxScore: creditBreakdown.creditUtilization.maxScore,
      details: creditBreakdown.creditUtilization.details,
      extra: `${Math.round(creditUtilization)}% of credit used`,
      color: '#10B981',
    },
    {
      id: 'age',
      title: 'Credit Age',
      icon: TrendingUp,
      weight: '15%',
      score: creditBreakdown.creditAge.score,
      maxScore: creditBreakdown.creditAge.maxScore,
      details: creditBreakdown.creditAge.details,
      extra: `${creditBreakdown.creditAge.averageAge} months avg`,
      color: '#8B5CF6',
    },
    {
      id: 'mix',
      title: 'Credit Mix',
      icon: Layers,
      weight: '10%',
      score: creditBreakdown.creditMix.score,
      maxScore: creditBreakdown.creditMix.maxScore,
      details: creditBreakdown.creditMix.details,
      extra: `${creditBreakdown.creditMix.accountTypes.length} types`,
      color: '#F59E0B',
    },
    {
      id: 'inquiries',
      title: 'New Credit',
      icon: Search,
      weight: '10%',
      score: creditBreakdown.newCredit.score,
      maxScore: creditBreakdown.newCredit.maxScore,
      details: creditBreakdown.newCredit.details,
      extra: `${creditBreakdown.newCredit.recentInquiries} inquiries`,
      color: '#EC4899',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.scoreCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
            Your Credit Score
          </Text>
          <Text style={[styles.scoreValue, { color: creditTier.color }]}>
            {gameState.creditScores.composite}
          </Text>
          <View style={[styles.tierBadge, { backgroundColor: creditTier.color + '20' }]}>
            <Text style={[styles.tierText, { color: creditTier.color }]}>{creditTier.tier}</Text>
          </View>
          <Text style={[styles.tierDescription, { color: colors.textSecondary }]}>
            {creditTier.description}
          </Text>

          <View style={styles.scoreRange}>
            <Text style={[styles.rangeLabel, { color: colors.textLight }]}>300</Text>
            <View style={[styles.rangeBar, { backgroundColor: colors.surfaceAlt }]}>
              <View
                style={[
                  styles.rangeFill,
                  {
                    width: `${((gameState.creditScores.composite - 300) / 550) * 100}%`,
                    backgroundColor: creditTier.color,
                  }
                ]}
              />
              <View
                style={[
                  styles.rangeMarker,
                  {
                    left: `${((gameState.creditScores.composite - 300) / 550) * 100}%`,
                    backgroundColor: creditTier.color,
                  }
                ]}
              />
            </View>
            <Text style={[styles.rangeLabel, { color: colors.textLight }]}>850</Text>
          </View>
        </View>

        <View style={[styles.bureauCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Credit Bureau Scores</Text>
          <Text style={[styles.bureauNote, { color: colors.textSecondary }]}>
            Each bureau may weigh factors slightly differently
          </Text>
          
          <View style={styles.bureauGrid}>
            <View style={styles.bureauItem}>
              <Text style={[styles.bureauName, { color: colors.textSecondary }]}>Experian</Text>
              <Text style={[styles.bureauScore, { color: colors.text }]}>
                {gameState.creditScores.experian}
              </Text>
            </View>
            <View style={[styles.bureauDivider, { backgroundColor: colors.border }]} />
            <View style={styles.bureauItem}>
              <Text style={[styles.bureauName, { color: colors.textSecondary }]}>Equifax</Text>
              <Text style={[styles.bureauScore, { color: colors.text }]}>
                {gameState.creditScores.equifax}
              </Text>
            </View>
            <View style={[styles.bureauDivider, { backgroundColor: colors.border }]} />
            <View style={styles.bureauItem}>
              <Text style={[styles.bureauName, { color: colors.textSecondary }]}>TransUnion</Text>
              <Text style={[styles.bureauScore, { color: colors.text }]}>
                {gameState.creditScores.transunion}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.factorsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text, paddingHorizontal: 16 }]}>
            Score Factors
          </Text>

          {factors.map((factor) => {
            const percentage = factor.maxScore > 0 ? (factor.score / factor.maxScore) * 100 : 0;
            const Icon = factor.icon;

            return (
              <View key={factor.id} style={[styles.factorCard, { backgroundColor: colors.surface }]}>
                <View style={styles.factorHeader}>
                  <View style={[styles.factorIcon, { backgroundColor: factor.color + '20' }]}>
                    <Icon size={20} color={factor.color} />
                  </View>
                  <View style={styles.factorInfo}>
                    <Text style={[styles.factorTitle, { color: colors.text }]}>{factor.title}</Text>
                    <Text style={[styles.factorWeight, { color: colors.textSecondary }]}>
                      {factor.weight} of your score
                    </Text>
                  </View>
                  <View style={styles.factorScore}>
                    <Text style={[styles.factorScoreValue, { color: factor.color }]}>
                      {percentage.toFixed(0)}%
                    </Text>
                  </View>
                </View>

                <View style={[styles.factorBar, { backgroundColor: colors.surfaceAlt }]}>
                  <View
                    style={[
                      styles.factorBarFill,
                      { width: `${percentage}%`, backgroundColor: factor.color }
                    ]}
                  />
                </View>

                <Text style={[styles.factorDetails, { color: colors.textSecondary }]}>
                  {factor.details}
                </Text>

                {factor.extra && (
                  <View style={[styles.factorExtra, { backgroundColor: colors.surfaceAlt }]}>
                    <Text style={[styles.factorExtraText, { color: colors.text }]}>
                      {factor.extra}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={[styles.tipsCard, { backgroundColor: colors.surface }]}>
          <View style={styles.tipsHeader}>
            <Info size={20} color={colors.primary} />
            <Text style={[styles.tipsTitle, { color: colors.text }]}>Tips to Improve</Text>
          </View>
          
          <View style={styles.tipsList}>
            <Text style={[styles.tipItem, { color: colors.textSecondary }]}>
              • Always pay bills on time to build payment history
            </Text>
            <Text style={[styles.tipItem, { color: colors.textSecondary }]}>
              • Keep credit utilization below 30% (ideally under 10%)
            </Text>
            <Text style={[styles.tipItem, { color: colors.textSecondary }]}>
              • Avoid opening too many new accounts at once
            </Text>
            <Text style={[styles.tipItem, { color: colors.textSecondary }]}>
              • Keep old accounts open to maintain credit age
            </Text>
            <Text style={[styles.tipItem, { color: colors.textSecondary }]}>
              • Have a mix of credit types (cards, loans, etc.)
            </Text>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scoreCard: {
    margin: 16,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: -2,
  },
  tierBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  tierText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tierDescription: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  scoreRange: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 10,
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  rangeBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    position: 'relative',
  },
  rangeFill: {
    height: '100%',
    borderRadius: 4,
  },
  rangeMarker: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  bureauCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  bureauNote: {
    fontSize: 13,
    marginBottom: 16,
  },
  bureauGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bureauItem: {
    flex: 1,
    alignItems: 'center',
  },
  bureauDivider: {
    width: 1,
  },
  bureauName: {
    fontSize: 12,
    marginBottom: 6,
  },
  bureauScore: {
    fontSize: 24,
    fontWeight: '700',
  },
  factorsSection: {
    marginBottom: 16,
  },
  factorCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
  },
  factorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  factorIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  factorInfo: {
    flex: 1,
  },
  factorTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  factorWeight: {
    fontSize: 12,
    marginTop: 2,
  },
  factorScore: {
    alignItems: 'flex-end',
  },
  factorScoreValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  factorBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  factorBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  factorDetails: {
    fontSize: 13,
    lineHeight: 18,
  },
  factorExtra: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  factorExtraText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tipsCard: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  tipsTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  tipsList: {
    gap: 10,
  },
  tipItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
});
