import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/contexts/GameContext';
import { ExchangeRateService } from '../../services/ExchangeRateService';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Wallet, TrendingUp, TrendingDown, History, DollarSign, PiggyBank } from 'lucide-react-native';

export default function TokenWalletScreen() {
  const insets = useSafeAreaInsets();
  const { gameState, syncTokensWithBalance, isLoading } = useGame();
  const [refreshing, setRefreshing] = useState(false);

  // Get values from game state
  const tokenBalance = gameState.tokenWallet?.musoToken?.balance || 0;
  const bankBalance = gameState.bankBalance || 0;
  const savingsBalance = gameState.savingsBalance || 0;
  const emergencyFund = gameState.emergencyFund || 0;
  const totalBalance = bankBalance + savingsBalance + emergencyFund;
  const totalMinted = gameState.tokenWallet?.musoToken?.totalMinted || 0;
  const totalBurned = gameState.tokenWallet?.musoToken?.totalBurned || 0;
  const transactions = gameState.tokenWallet?.transactions || [];
  const exchangeRate = { musoPerDollar: 10, dollarsPerMusso: 0.1 };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    syncTokensWithBalance();
    setTimeout(() => setRefreshing(false), 500);
  }, [syncTokensWithBalance]);

  const handleSync = useCallback(() => {
    syncTokensWithBalance();
    Alert.alert('Success', 'Token balance synced with bank balance successfully');
  }, [syncTokensWithBalance]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Wallet size={24} color="#8B5CF6" />
          <Text style={styles.headerTitle}>MUSO Token Wallet</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} disabled={isLoading}>
          <RefreshCw size={24} color={isLoading ? "#D1D5DB" : "#6B7280"} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Token Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>MUSO Token Balance</Text>
          <Text style={styles.balanceValue}>
            {ExchangeRateService.formatMusos(tokenBalance, 2)}
          </Text>
          <Text style={styles.balanceSubtext}>MUSO</Text>

          <View style={styles.syncStatus}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: '#10B981' },
              ]}
            />
            <Text style={styles.statusText}>Synced</Text>
          </View>
        </View>

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
            <RefreshCw size={20} color="#8B5CF6" />
            <Text style={styles.syncButtonText}>Sync Tokens with Balance</Text>
          </TouchableOpacity>
        </View>

        {/* Exchange Rate Info */}
        <View style={styles.exchangeRateCard}>
          <Text style={styles.exchangeRateTitle}>Exchange Rate</Text>
          <Text style={styles.exchangeRateValue}>
            {exchangeRate.musoPerDollar} MUSO = $1
          </Text>
          <Text style={styles.exchangeRateSubtext}>
            Fixed rate maintained by the game economy
          </Text>
        </View>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <TrendingUp size={24} color="#10B981" />
            <Text style={styles.statValue}>
              {ExchangeRateService.formatMusos(totalMinted, 0)}
            </Text>
            <Text style={styles.statLabel}>Total Minted</Text>
          </View>

          <View style={styles.statCard}>
            <TrendingDown size={24} color="#EF4444" />
            <Text style={styles.statValue}>
              {ExchangeRateService.formatMusos(totalBurned, 0)}
            </Text>
            <Text style={styles.statLabel}>Total Burned</Text>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <History size={20} color="#6B7280" />
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No transactions yet</Text>
            </View>
          ) : (
            transactions.slice(0, 10).map((tx) => (
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
                    <ArrowDownLeft size={20} color="#10B981" />
                  ) : (
                    <ArrowUpRight size={20} color="#EF4444" />
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
        </View>


      </ScrollView>
    </View>
  );
}

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
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  balanceCard: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  balanceSubtext: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
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
  bankInfoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
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
  exchangeRateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  exchangeRateTitle: {
    fontSize: 14,
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
    fontSize: 12,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  transactionsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
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
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  txIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    color: '#6B7280',
  },
  txAmountContainer: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  txAmountPositive: {
    color: '#10B981',
  },
  txAmountNegative: {
    color: '#EF4444',
  },
  errorContainer: {
    marginTop: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    fontSize: 14,
    color: '#991B1B',
  },
});