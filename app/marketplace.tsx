import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Search,
  X,
  ShoppingBag,
  Star,
  Check,
  Wallet,
  CreditCard,
  Building2,
  ChevronRight,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import MarketplaceItemCard from '@/components/community/MarketplaceItemCard';
import { MarketplaceItem } from '@/types/communityHomes';
import { MARKETPLACE_ITEMS, MARKETPLACE_CATEGORIES, getRarityColor } from '@/mocks/achievementsData';

type PaymentMethod = {
  id: string;
  type: 'bank' | 'debit' | 'credit_card';
  name: string;
  balance: number;
  availableCredit?: number;
  icon: 'bank' | 'debit' | 'credit';
};

type CategoryFilter = 'all' | MarketplaceItem['category'];

export default function MarketplaceScreen() {
  const { colors, isDark } = useTheme();
  const { gameState, recordBudgetTransaction, updateCreditAccount } = useGame();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [ownedItems, setOwnedItems] = useState<string[]>(['item_4']);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingPurchaseItem, setPendingPurchaseItem] = useState<MarketplaceItem | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  const userCoins = Math.floor(gameState.bankBalance);
  const userGems = Math.floor(gameState.savingsBalance / 100);
  const userLevel = Math.max(1, Math.floor(gameState.monthsPlayed / 3) + 1);

  const paymentMethods = useMemo((): PaymentMethod[] => {
    const methods: PaymentMethod[] = [
      {
        id: 'bank_account',
        type: 'bank',
        name: 'Bank Account',
        balance: gameState.bankBalance,
        icon: 'bank',
      },
      {
        id: 'debit_card',
        type: 'debit',
        name: 'Debit Card',
        balance: gameState.bankBalance,
        icon: 'debit',
      },
    ];

    const creditCards = gameState.creditAccounts.filter(
      acc => acc.type === 'credit_card' && acc.status !== 'closed'
    );

    creditCards.forEach(card => {
      methods.push({
        id: card.id,
        type: 'credit_card',
        name: card.institutionName,
        balance: card.balance,
        availableCredit: card.creditLimit - card.balance,
        icon: 'credit',
      });
    });

    return methods;
  }, [gameState.bankBalance, gameState.creditAccounts]);

  const filteredItems = useMemo(() => {
    let items = MARKETPLACE_ITEMS.map(item => ({
      ...item,
      isOwned: ownedItems.includes(item.id),
    }));

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (selectedCategory !== 'all') {
      items = items.filter(item => item.category === selectedCategory);
    }

    return items;
  }, [searchQuery, selectedCategory, ownedItems]);

  const handleCategoryPress = useCallback((category: CategoryFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(category);
  }, []);

  const handleItemPress = useCallback((item: MarketplaceItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedItem({ ...item, isOwned: ownedItems.includes(item.id) });
  }, [ownedItems]);

  const handleInitiatePurchase = useCallback((item: MarketplaceItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPendingPurchaseItem(item);
    setSelectedPaymentMethod(null);
    setShowPaymentModal(true);
  }, []);

  const handleConfirmPurchase = useCallback(() => {
    if (!pendingPurchaseItem || !selectedPaymentMethod) return;

    const item = pendingPurchaseItem;
    const method = selectedPaymentMethod;
    const price = item.price;

    if (method.type === 'bank' || method.type === 'debit') {
      if (gameState.bankBalance < price) {
        Alert.alert('Insufficient Funds', 'You don\'t have enough money in your bank account.');
        return;
      }
      
      recordBudgetTransaction(
        'purchase',
        price,
        `Marketplace: ${item.name}`,
        {
          category: 'shopping',
          paymentMethod: method.type === 'bank' ? 'Bank Account' : 'Debit Card',
        }
      );
    } else if (method.type === 'credit_card') {
      const card = gameState.creditAccounts.find(acc => acc.id === method.id);
      if (!card) {
        Alert.alert('Error', 'Credit card not found.');
        return;
      }
      
      const availableCredit = card.creditLimit - card.balance;
      if (availableCredit < price) {
        Alert.alert('Credit Limit Exceeded', 'You don\'t have enough available credit on this card.');
        return;
      }

      updateCreditAccount(card.id, {
        balance: card.balance + price,
      });

      recordBudgetTransaction(
        'credit_card_charge',
        price,
        `Marketplace: ${item.name}`,
        {
          category: 'shopping',
          creditCardId: card.id,
          creditCardName: card.institutionName,
          paymentMethod: card.institutionName,
        }
      );
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOwnedItems(prev => [...prev, item.id]);
    setSelectedItem(null);
    setShowPaymentModal(false);
    setPendingPurchaseItem(null);
    setSelectedPaymentMethod(null);
    
    Alert.alert(
      'Purchase Complete!',
      `${item.name} has been added to your inventory.\n\nPaid with: ${method.name}`
    );
  }, [pendingPurchaseItem, selectedPaymentMethod, gameState.bankBalance, gameState.creditAccounts, recordBudgetTransaction, updateCreditAccount]);

  const handleCancelPayment = useCallback(() => {
    setShowPaymentModal(false);
    setPendingPurchaseItem(null);
    setSelectedPaymentMethod(null);
  }, []);

  const renderPaymentMethodIcon = useCallback((iconType: 'bank' | 'debit' | 'credit') => {
    switch (iconType) {
      case 'bank':
        return <Building2 color={colors.primary} size={24} />;
      case 'debit':
        return <Wallet color={colors.success || '#22C55E'} size={24} />;
      case 'credit':
        return <CreditCard color={colors.warning || '#F59E0B'} size={24} />;
    }
  }, [colors]);

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Marketplace',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={isDark ? ['#134E4A', '#0D9488'] : ['#14B8A6', '#2DD4BF']}
          style={styles.walletHeader}
        >
          <View style={styles.walletContainer}>
            <ShoppingBag color="#FFFFFF" size={24} />
            <Text style={styles.walletTitle}>Your Wallet</Text>
          </View>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.currencyIcon}>🪙</Text>
              <Text style={styles.balanceAmount}>{userCoins.toLocaleString()}</Text>
              <Text style={styles.balanceLabel}>Coins</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.currencyIcon}>💎</Text>
              <Text style={styles.balanceAmount}>{userGems}</Text>
              <Text style={styles.balanceLabel}>Gems</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.currencyIcon}>⭐</Text>
              <Text style={styles.balanceAmount}>{userLevel}</Text>
              <Text style={styles.balanceLabel}>Level</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search color={colors.textLight} size={18} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search items..."
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X color={colors.textLight} size={18} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          <TouchableOpacity
            style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryChipSelected]}
            onPress={() => handleCategoryPress('all')}
          >
            <Text style={styles.categoryEmoji}>🏪</Text>
            <Text style={[styles.categoryText, selectedCategory === 'all' && styles.categoryTextSelected]}>
              All
            </Text>
          </TouchableOpacity>
          {MARKETPLACE_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipSelected,
              ]}
              onPress={() => handleCategoryPress(cat.id as CategoryFilter)}
            >
              <Text style={styles.categoryEmoji}>{cat.icon}</Text>
              <Text style={[
                styles.categoryText,
                selectedCategory === cat.id && styles.categoryTextSelected,
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.itemsGrid}>
          {filteredItems.map((item) => (
            <MarketplaceItemCard
              key={item.id}
              item={item}
              onPress={() => handleItemPress(item)}
              onPurchase={() => handleInitiatePurchase(item)}
              userLevel={userLevel}
              userCoins={userCoins}
              userGems={userGems}
            />
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={!!selectedItem}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedItem(null)}
      >
        {selectedItem && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setSelectedItem(null)}
              >
                <X color={colors.text} size={24} />
              </TouchableOpacity>

              <Image
                source={{ uri: selectedItem.thumbnailUrl }}
                style={styles.modalImage}
              />

              <View style={[
                styles.modalRarityStrip,
                { backgroundColor: getRarityColor(selectedItem.rarity) },
              ]} />

              <View style={styles.modalBody}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedItem.name}</Text>
                  <View style={[
                    styles.modalRarityBadge,
                    { backgroundColor: getRarityColor(selectedItem.rarity) + '20' },
                  ]}>
                    <Text style={[
                      styles.modalRarityText,
                      { color: getRarityColor(selectedItem.rarity) },
                    ]}>
                      {selectedItem.rarity.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.modalDescription}>{selectedItem.description}</Text>

                <View style={styles.modalStats}>
                  <View style={styles.modalStatItem}>
                    <Star color="#F59E0B" size={16} fill="#F59E0B" />
                    <Text style={styles.modalStatText}>{selectedItem.rating.toFixed(1)}</Text>
                  </View>
                  <View style={styles.modalStatItem}>
                    <ShoppingBag color={colors.textSecondary} size={16} />
                    <Text style={styles.modalStatText}>
                      {selectedItem.purchases.toLocaleString()} sold
                    </Text>
                  </View>
                </View>

                <View style={styles.modalTags}>
                  {selectedItem.tags.map((tag) => (
                    <View key={tag} style={styles.modalTag}>
                      <Text style={styles.modalTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>

                {selectedItem.isOwned ? (
                  <View style={styles.ownedButton}>
                    <Check color="#22C55E" size={20} />
                    <Text style={styles.ownedButtonText}>Owned</Text>
                  </View>
                ) : selectedItem.requiredLevel && userLevel < selectedItem.requiredLevel ? (
                  <View style={styles.lockedButton}>
                    <Text style={styles.lockedButtonText}>
                      Requires Level {selectedItem.requiredLevel}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.purchaseButton}
                    onPress={() => handleInitiatePurchase(selectedItem)}
                  >
                    <Text style={styles.purchaseCurrency}>
                      {selectedItem.currency === 'coins' ? '🪙' : '💎'}
                    </Text>
                    <Text style={styles.purchasePrice}>
                      {selectedItem.price.toLocaleString()}
                    </Text>
                    <Text style={styles.purchaseText}>Purchase</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
      </Modal>

      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent
        onRequestClose={handleCancelPayment}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalContent}>
            <View style={styles.paymentModalHeader}>
              <Text style={styles.paymentModalTitle}>Select Payment Method</Text>
              <TouchableOpacity
                style={styles.paymentModalClose}
                onPress={handleCancelPayment}
              >
                <X color={colors.text} size={24} />
              </TouchableOpacity>
            </View>

            {pendingPurchaseItem && (
              <View style={styles.purchaseSummary}>
                <Image
                  source={{ uri: pendingPurchaseItem.thumbnailUrl }}
                  style={styles.purchaseSummaryImage}
                />
                <View style={styles.purchaseSummaryInfo}>
                  <Text style={styles.purchaseSummaryName}>{pendingPurchaseItem.name}</Text>
                  <Text style={styles.purchaseSummaryPrice}>
                    ${pendingPurchaseItem.price.toLocaleString()}
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.paymentMethodsLabel}>Choose how to pay:</Text>

            <ScrollView style={styles.paymentMethodsList}>
              {paymentMethods.map((method) => {
                const isSelected = selectedPaymentMethod?.id === method.id;
                const canAfford = method.type === 'credit_card'
                  ? (method.availableCredit || 0) >= (pendingPurchaseItem?.price || 0)
                  : method.balance >= (pendingPurchaseItem?.price || 0);

                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.paymentMethodItem,
                      isSelected && styles.paymentMethodItemSelected,
                      !canAfford && styles.paymentMethodItemDisabled,
                    ]}
                    onPress={() => {
                      if (canAfford) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedPaymentMethod(method);
                      }
                    }}
                    disabled={!canAfford}
                  >
                    <View style={styles.paymentMethodIcon}>
                      {renderPaymentMethodIcon(method.icon)}
                    </View>
                    <View style={styles.paymentMethodDetails}>
                      <Text style={[
                        styles.paymentMethodName,
                        !canAfford && styles.paymentMethodNameDisabled,
                      ]}>
                        {method.name}
                      </Text>
                      <Text style={[
                        styles.paymentMethodBalance,
                        !canAfford && styles.paymentMethodBalanceInsufficient,
                      ]}>
                        {method.type === 'credit_card'
                          ? `Available: ${(method.availableCredit || 0).toLocaleString()}`
                          : `Balance: ${method.balance.toLocaleString()}`
                        }
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.paymentMethodCheck}>
                        <Check color={colors.primary} size={20} />
                      </View>
                    )}
                    {!canAfford && (
                      <Text style={styles.insufficientFundsLabel}>Insufficient</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.paymentModalFooter}>
              <TouchableOpacity
                style={styles.cancelPaymentButton}
                onPress={handleCancelPayment}
              >
                <Text style={styles.cancelPaymentText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmPaymentButton,
                  !selectedPaymentMethod && styles.confirmPaymentButtonDisabled,
                ]}
                onPress={handleConfirmPurchase}
                disabled={!selectedPaymentMethod}
              >
                <Text style={styles.confirmPaymentText}>Confirm Purchase</Text>
                <ChevronRight color="#FFFFFF" size={18} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  walletHeader: {
    padding: 20,
  },
  walletContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  walletTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 16,
  },
  balanceItem: {
    alignItems: 'center',
  },
  currencyIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  balanceLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  balanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryTextSelected: {
    color: '#FFFFFF',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: 250,
  },
  modalRarityStrip: {
    height: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  modalRarityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalRarityText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  modalStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  modalStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalStatText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  modalTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  modalTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
  },
  modalTagText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
  },
  purchaseCurrency: {
    fontSize: 18,
  },
  purchasePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  purchaseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  ownedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  ownedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22C55E',
  },
  lockedButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingVertical: 16,
  },
  lockedButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textLight,
  },
  paymentModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  paymentModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  paymentModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    gap: 12,
  },
  purchaseSummaryImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  purchaseSummaryInfo: {
    flex: 1,
  },
  purchaseSummaryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  purchaseSummaryPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  paymentMethodsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  paymentMethodsList: {
    maxHeight: 280,
    paddingHorizontal: 16,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  paymentMethodItemSelected: {
    borderColor: colors.primary,
    backgroundColor: isDark ? 'rgba(20, 184, 166, 0.1)' : 'rgba(20, 184, 166, 0.05)',
  },
  paymentMethodItemDisabled: {
    opacity: 0.5,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentMethodDetails: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  paymentMethodNameDisabled: {
    color: colors.textLight,
  },
  paymentMethodBalance: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  paymentMethodBalanceInsufficient: {
    color: '#EF4444',
  },
  paymentMethodCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: isDark ? 'rgba(20, 184, 166, 0.2)' : 'rgba(20, 184, 166, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insufficientFundsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  paymentModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 16,
  },
  cancelPaymentButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  cancelPaymentText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  confirmPaymentButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmPaymentButtonDisabled: {
    backgroundColor: colors.border,
  },
  confirmPaymentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
