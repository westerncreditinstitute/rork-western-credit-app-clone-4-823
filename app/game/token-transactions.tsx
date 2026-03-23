import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/contexts/GameContext';
import { ExchangeRateService } from '../../services/ExchangeRateService';
import { ArrowDownLeft, ArrowUpRight, RefreshCw, History, Filter, ChevronDown } from 'lucide-react-native';
import { TokenTransaction as GameTokenTransaction } from '@/types/game';

type FilterType = 'all' | 'mint' | 'burn';

export default function TokenTransactionsScreen() {
  const insets = useSafeAreaInsets();
  const { gameState, syncTokensWithBalance, isLoading } = useGame();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const spinValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [isLoading, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    syncTokensWithBalance();
    setTimeout(() => setRefreshing(false), 500);
  }, [syncTokensWithBalance]);

  const filteredTransactions = React.useMemo(() => {
    const txList = gameState.tokenWallet?.transactions || [];
    if (filter === 'all') return txList;
    return txList.filter((tx) => tx.type === filter);
  }, [gameState.tokenWallet?.transactions, filter]);

  const filters: { type: FilterType; label: string }[] = [
    { type: 'all', label: 'All Transactions' },
    { type: 'mint', label: 'Minted (Income)' },
    { type: 'burn', label: 'Burned (Expenses)' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <History size={24} color="#8B5CF6" />
          <Text style={styles.headerTitle}>Transaction History</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} disabled={isLoading}>
          <Animated.View style={{ transform: [{ rotate: isLoading ? spin : '0deg' }] }}>
            <RefreshCw size={24} color="#6B7280" />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterMenu(!showFilterMenu)}
        >
          <Filter size={20} color="#6B7280" />
          <Text style={styles.filterButtonText}>{filters.find((f) => f.type === filter)?.label}</Text>
          <ChevronDown size={20} color="#6B7280" />
        </TouchableOpacity>

        {showFilterMenu && (
          <View style={styles.filterMenu}>
            {filters.map((f) => (
              <TouchableOpacity
                key={f.type}
                style={[styles.filterMenuItem, filter === f.type && styles.filterMenuItemActive]}
                onPress={() => {
                  setFilter(f.type);
                  setShowFilterMenu(false);
                }}
              >
                <Text
                  style={[
                    styles.filterMenuItemText,
                    filter === f.type && styles.filterMenuItemTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <History size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No Transactions Found</Text>
            <Text style={styles.emptyStateText}>
              {filter === 'all'
                ? 'You have no transactions yet'
                : `No ${filter === 'mint' ? 'income' : 'expenses'} transactions yet`}
            </Text>
          </View>
        ) : (
          filteredTransactions.map((tx, index) => (
            <TransactionItem key={tx.id} transaction={tx} isLast={index === filteredTransactions.length - 1} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function TransactionItem({ transaction, isLast }: { transaction: GameTokenTransaction; isLast: boolean }) {
  const isMint = transaction.type === 'mint';

  return (
    <View style={[styles.transactionItem, isLast && styles.transactionItemLast]}>
      <View
        style={[
          styles.txIconContainer,
          { backgroundColor: isMint ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' },
        ]}
      >
        {isMint ? <ArrowDownLeft size={24} color="#10B981" /> : <ArrowUpRight size={24} color="#EF4444" />}
      </View>

      <View style={styles.txDetails}>
        <Text style={styles.txReason}>{transaction.reason}</Text>
        <View style={styles.txMetadata}>
          <Text style={styles.txDate}>{new Date(transaction.timestamp).toLocaleDateString()}</Text>
          <Text style={styles.txTime}>{new Date(transaction.timestamp).toLocaleTimeString()}</Text>
        </View>

        {transaction.metadata?.category && (
          <View style={styles.txCategory}>
            <Text style={styles.txCategoryText}>
              {String(transaction.metadata.category)
                .split('_')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.txAmountContainer}>
        <Text style={[styles.txAmount, isMint ? styles.txAmountPositive : styles.txAmountNegative]}>
          {isMint ? '+' : '-'}
          {ExchangeRateService.formatMusos(transaction.amount, 2)}
        </Text>
        <Text style={styles.txBalanceAfter}>
          Balance: {ExchangeRateService.formatMusos(transaction.balanceAfter, 2)}
        </Text>
      </View>
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
    fontWeight: '700' as const,
    color: '#111827',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#111827',
    flex: 1,
  },
  filterMenu: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 100,
  },
  filterMenuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterMenuItemActive: {
    backgroundColor: '#F3F4F6',
  },
  filterMenuItemText: {
    fontSize: 14,
    color: '#111827',
  },
  filterMenuItemTextActive: {
    fontWeight: '600' as const,
    color: '#8B5CF6',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  transactionItemLast: {
    marginBottom: 0,
  },
  txIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  txDetails: {
    flex: 1,
  },
  txReason: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 4,
  },
  txMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  txDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  txTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  txCategory: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  txCategoryText: {
    fontSize: 11,
    color: '#6B7280',
  },
  txAmountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  txAmount: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  txAmountPositive: {
    color: '#10B981',
  },
  txAmountNegative: {
    color: '#EF4444',
  },
  txBalanceAfter: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  txStatusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  txStatusText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#92400E',
  },
});
