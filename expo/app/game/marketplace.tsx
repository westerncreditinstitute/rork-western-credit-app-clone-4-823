import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  ShoppingBag,
  Home,
  Car,
  Shirt,
  Coffee,
  Check,
  X,
  ChevronRight,
  DollarSign,
  Star,
  Heart,
  AlertTriangle,
  Banknote,
  CreditCard,
  Building2,
  Fuel,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { formatCurrency } from '@/utils/creditEngine';
import { CLOTHING_ITEMS, FOOD_ITEMS, PROPERTIES, VEHICLES } from '@/mocks/gameData';
import { ClothingItem, FoodItem, Property, Vehicle, ClothingCategory } from '@/types/game';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type MarketCategory = 'clothing' | 'food' | 'properties' | 'vehicles';
type ClothingFilter = 'all' | ClothingCategory;
type VehiclePurchaseType = 'cash' | 'finance' | 'auto_loan';

export default function MarketplaceScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { gameState, purchaseClothing, purchaseFood } = useGame();
  
  const [activeCategory, setActiveCategory] = useState<MarketCategory>('clothing');
  const [clothingFilter, setClothingFilter] = useState<ClothingFilter>('all');
  const [selectedItem, setSelectedItem] = useState<ClothingItem | FoodItem | Property | Vehicle | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [activeCategory, fadeAnim]);

  const categories: { key: MarketCategory; label: string; icon: typeof ShoppingBag }[] = [
    { key: 'clothing', label: 'Fashion', icon: Shirt },
    { key: 'food', label: 'Food', icon: Coffee },
    { key: 'properties', label: 'Homes', icon: Home },
    { key: 'vehicles', label: 'Cars', icon: Car },
  ];

  const getFilteredClothing = () => {
    let items = CLOTHING_ITEMS;
    if (clothingFilter !== 'all') {
      items = items.filter(item => item.category === clothingFilter);
    }
    return items;
  };

  const isItemOwned = (itemId: string) => {
    return gameState.ownedClothing.some(c => c.id === itemId);
  };

  const handlePurchaseClothing = (item: ClothingItem) => {
    if (gameState.bankBalance < item.price) {
      Alert.alert('Insufficient Funds', `You need ${formatCurrency(item.price - gameState.bankBalance)} more to purchase this item.`);
      return;
    }
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    purchaseClothing(item);
    Alert.alert('Purchase Complete!', `You bought ${item.name} for ${formatCurrency(item.price)}`);
    setSelectedItem(null);
  };

  const handlePurchaseFood = (item: FoodItem) => {
    if (gameState.bankBalance < item.price) {
      Alert.alert('Insufficient Funds', `You need ${formatCurrency(item.price - gameState.bankBalance)} more to purchase this item.`);
      return;
    }
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    purchaseFood(item);
    const healthMessage = item.healthImpact > 0 
      ? `Health improved by ${item.healthImpact + 20} points!` 
      : item.healthImpact < 0 
        ? `Health decreased by ${Math.abs(item.healthImpact)} points` 
        : 'Health restored!';
    Alert.alert('Purchase Complete!', `You bought ${item.name} for ${formatCurrency(item.price)}\n\n${healthMessage}`);
    setSelectedItem(null);
  };

  const renderClothingItem = (item: ClothingItem) => {
    const owned = isItemOwned(item.id);
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.itemCard, { backgroundColor: colors.surface }]}
        onPress={() => setSelectedItem(item)}
        disabled={owned}
      >
        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
        {owned && (
          <View style={styles.ownedBadge}>
            <Check size={12} color="#FFF" />
            <Text style={styles.ownedText}>Owned</Text>
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={[styles.itemBrand, { color: colors.textSecondary }]}>{item.brand}</Text>
          <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <View style={styles.itemMeta}>
            <View style={[styles.styleBadge, { backgroundColor: getStyleColor(item.style) + '20' }]}>
              <Text style={[styles.styleBadgeText, { color: getStyleColor(item.style) }]}>
                {item.style}
              </Text>
            </View>
            <Text style={[styles.itemPrice, { color: colors.primary }]}>
              {formatCurrency(item.price)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFoodItem = (item: FoodItem) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.foodCard, { backgroundColor: colors.surface }]}
      onPress={() => handlePurchaseFood(item)}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.foodImage} />
      <View style={styles.foodInfo}>
        <Text style={[styles.foodName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.foodDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.foodMeta}>
          <Text style={[styles.foodPrice, { color: colors.primary }]}>{formatCurrency(item.price)}</Text>
          <View style={[styles.healthBadge, { backgroundColor: item.healthImpact >= 0 ? '#10B98120' : '#EF444420' }]}>
            <Heart size={12} color={item.healthImpact >= 0 ? '#10B981' : '#EF4444'} />
            <Text style={[styles.healthBadgeText, { color: item.healthImpact >= 0 ? '#10B981' : '#EF4444' }]}>
              {item.healthImpact >= 0 ? '+' : ''}{item.healthImpact + 20}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPropertyItem = (item: Property) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.propertyCard, { backgroundColor: colors.surface }]}
      onPress={() => router.push('/game/bank' as any)}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.propertyImage} />
      <View style={styles.propertyInfo}>
        <Text style={[styles.propertyName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.propertyAddress, { color: colors.textSecondary }]}>{item.address}</Text>
        <View style={styles.propertyMeta}>
          <Text style={[styles.propertySpecs, { color: colors.textSecondary }]}>
            {item.bedrooms} bed • {item.bathrooms} bath • {item.squareFeet.toLocaleString()} sqft
          </Text>
        </View>
        <Text style={[styles.propertyPrice, { color: colors.primary }]}>{formatCurrency(item.price)}</Text>
      </View>
      <ChevronRight size={20} color={colors.textSecondary} style={styles.propertyArrow} />
    </TouchableOpacity>
  );

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowVehicleModal(true);
  };

  const handleVehiclePurchase = (purchaseType: VehiclePurchaseType) => {
    if (!selectedVehicle) return;

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setShowVehicleModal(false);
    setSelectedVehicle(null);

    if (purchaseType === 'cash') {
      if (gameState.bankBalance < selectedVehicle.price) {
        Alert.alert(
          'Insufficient Funds',
          `You need ${formatCurrency(selectedVehicle.price - gameState.bankBalance)} more to buy this vehicle with cash.`
        );
        return;
      }
      Alert.alert(
        'Confirm Purchase',
        `Buy ${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} for ${formatCurrency(selectedVehicle.price)} cash?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Buy Now', 
            onPress: () => router.push('/game/bank' as any)
          }
        ]
      );
    } else {
      router.push('/game/bank' as any);
    }
  };

  const calculateMonthlyPayment = (price: number, termMonths: number, apr: number) => {
    const monthlyRate = apr / 100 / 12;
    const payment = (price * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                    (Math.pow(1 + monthlyRate, termMonths) - 1);
    return payment;
  };

  const renderVehicleItem = (item: Vehicle) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.vehicleCard, { backgroundColor: colors.surface }]}
      onPress={() => handleVehicleSelect(item)}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.vehicleImage} />
      <View style={styles.vehicleInfo}>
        <View style={styles.vehicleHeader}>
          <Text style={[styles.vehicleYear, { color: colors.textSecondary }]}>{item.year}</Text>
          {item.isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
          {item.fuelType === 'electric' && (
            <View style={[styles.electricBadge]}>
              <Zap size={10} color="#FFF" />
              <Text style={styles.electricBadgeText}>EV</Text>
            </View>
          )}
        </View>
        <Text style={[styles.vehicleName, { color: colors.text }]}>{item.make} {item.model}</Text>
        <Text style={[styles.vehicleSpecs, { color: colors.textSecondary }]}>
          {item.fuelType === 'electric' ? `${item.mpg} MPGe` : `${item.mpg} MPG`} • {item.mileage.toLocaleString()} miles
        </Text>
        <Text style={[styles.vehiclePrice, { color: colors.primary }]}>{formatCurrency(item.price)}</Text>
      </View>
      <ChevronRight size={20} color={colors.textSecondary} style={styles.vehicleArrow} />
    </TouchableOpacity>
  );

  const getStyleColor = (style: string) => {
    switch (style) {
      case 'luxury': return '#9333EA';
      case 'business': return '#3B82F6';
      case 'formal': return '#1F2937';
      case 'athletic': return '#10B981';
      default: return '#F59E0B';
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Marketplace' }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={[styles.balanceBar, { backgroundColor: colors.surface }]}>
          <DollarSign size={18} color="#10B981" />
          <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Balance:</Text>
          <Text style={[styles.balanceValue, { color: colors.text }]}>
            {formatCurrency(gameState.bankBalance)}
          </Text>
          <View style={styles.healthIndicator}>
            <Heart size={16} color={gameState.healthStatus.level > 50 ? '#10B981' : '#EF4444'} />
            <Text style={[styles.healthText, { color: gameState.healthStatus.level > 50 ? '#10B981' : '#EF4444' }]}>
              {gameState.healthStatus.level}%
            </Text>
          </View>
        </View>
        
        {gameState.healthStatus.isHospitalized && (
          <View style={[styles.warningBanner, { backgroundColor: '#EF444420' }]}>
            <AlertTriangle size={16} color="#EF4444" />
            <Text style={[styles.warningText, { color: '#EF4444' }]}>
              You were hospitalized! Buy food to restore health.
            </Text>
          </View>
        )}
        
        {!gameState.healthStatus.isHospitalized && gameState.healthStatus.level < 50 && (
          <View style={[styles.warningBanner, { backgroundColor: '#F59E0B20' }]}>
            <AlertTriangle size={16} color="#F59E0B" />
            <Text style={[styles.warningText, { color: '#F59E0B' }]}>
              Low health! Buy groceries to avoid hospitalization.
            </Text>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryTabs}
          contentContainerStyle={styles.categoryTabsContent}
        >
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryTab,
                { backgroundColor: activeCategory === cat.key ? colors.primary : colors.surface },
              ]}
              onPress={() => {
                setActiveCategory(cat.key);
                fadeAnim.setValue(0);
              }}
            >
              <cat.icon size={18} color={activeCategory === cat.key ? '#FFF' : colors.text} />
              <Text
                style={[
                  styles.categoryTabText,
                  { color: activeCategory === cat.key ? '#FFF' : colors.text },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {activeCategory === 'clothing' && (
          <View style={styles.filtersRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(['all', 'top', 'bottom', 'shoes', 'hat', 'jewelry', 'watch', 'bag', 'eyewear'] as ClothingFilter[]).map(filter => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterChip,
                    { backgroundColor: clothingFilter === filter ? colors.primary + '20' : colors.surface },
                    clothingFilter === filter && { borderColor: colors.primary },
                  ]}
                  onPress={() => setClothingFilter(filter)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: clothingFilter === filter ? colors.primary : colors.text },
                    ]}
                  >
                    {filter === 'all' ? 'All' : 
                     filter === 'top' ? 'Tops' :
                     filter === 'bottom' ? 'Bottoms' :
                     filter === 'shoes' ? 'Shoes' :
                     filter === 'hat' ? 'Hats' :
                     filter === 'jewelry' ? 'Jewelry' :
                     filter === 'watch' ? 'Watches' :
                     filter === 'bag' ? 'Bags' :
                     filter === 'eyewear' ? 'Eyewear' : filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <Animated.ScrollView
          style={[styles.itemsContainer, { opacity: fadeAnim }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.itemsContent}
        >
          {activeCategory === 'clothing' && (
            <View style={styles.clothingGrid}>
              {getFilteredClothing().map(renderClothingItem)}
            </View>
          )}

          {activeCategory === 'food' && (
            <View style={styles.foodList}>
              {FOOD_ITEMS.map(renderFoodItem)}
            </View>
          )}

          {activeCategory === 'properties' && (
            <View style={styles.propertyList}>
              {PROPERTIES.map(renderPropertyItem)}
            </View>
          )}

          {activeCategory === 'vehicles' && (
            <View style={styles.vehicleList}>
              {VEHICLES.map(renderVehicleItem)}
            </View>
          )}

          <View style={styles.bottomPadding} />
        </Animated.ScrollView>

        <Modal visible={selectedItem !== null && 'category' in (selectedItem || {})} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              {selectedItem && 'category' in selectedItem && (
                <>
                  <TouchableOpacity
                    style={[styles.modalCloseIcon, { backgroundColor: colors.background }]}
                    onPress={() => setSelectedItem(null)}
                  >
                    <X size={20} color={colors.text} />
                  </TouchableOpacity>

                  <Image source={{ uri: (selectedItem as ClothingItem).imageUrl }} style={styles.modalImage} />
                  
                  <View style={styles.modalInfo}>
                    <Text style={[styles.modalBrand, { color: colors.textSecondary }]}>
                      {(selectedItem as ClothingItem).brand}
                    </Text>
                    <Text style={[styles.modalName, { color: colors.text }]}>
                      {(selectedItem as ClothingItem).name}
                    </Text>
                    <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                      {(selectedItem as ClothingItem).description}
                    </Text>

                    <View style={styles.modalMeta}>
                      <View style={[styles.styleBadgeLarge, { backgroundColor: getStyleColor((selectedItem as ClothingItem).style) + '20' }]}>
                        <Star size={14} color={getStyleColor((selectedItem as ClothingItem).style)} />
                        <Text style={[styles.styleBadgeLargeText, { color: getStyleColor((selectedItem as ClothingItem).style) }]}>
                          {(selectedItem as ClothingItem).style.charAt(0).toUpperCase() + (selectedItem as ClothingItem).style.slice(1)} Style
                        </Text>
                      </View>
                      <View style={[styles.colorPreview, { backgroundColor: (selectedItem as ClothingItem).color }]} />
                    </View>

                    <View style={styles.modalPriceRow}>
                      <Text style={[styles.modalPrice, { color: colors.primary }]}>
                        {formatCurrency((selectedItem as ClothingItem).price)}
                      </Text>
                      {gameState.bankBalance < (selectedItem as ClothingItem).price && (
                        <Text style={styles.insufficientText}>Insufficient funds</Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.purchaseButton,
                      { backgroundColor: gameState.bankBalance >= (selectedItem as ClothingItem).price ? colors.primary : '#9CA3AF' },
                    ]}
                    onPress={() => handlePurchaseClothing(selectedItem as ClothingItem)}
                    disabled={gameState.bankBalance < (selectedItem as ClothingItem).price}
                  >
                    <ShoppingBag size={20} color="#FFF" />
                    <Text style={styles.purchaseButtonText}>Purchase</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        <Modal visible={showVehicleModal && selectedVehicle !== null} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.vehicleModalContent, { backgroundColor: colors.surface }]}>
              {selectedVehicle && (
                <>
                  <TouchableOpacity
                    style={[styles.modalCloseIcon, { backgroundColor: colors.background }]}
                    onPress={() => {
                      setShowVehicleModal(false);
                      setSelectedVehicle(null);
                    }}
                  >
                    <X size={20} color={colors.text} />
                  </TouchableOpacity>

                  <Image source={{ uri: selectedVehicle.imageUrl }} style={styles.vehicleModalImage} />
                  
                  <View style={styles.vehicleModalInfo}>
                    <View style={styles.vehicleModalHeader}>
                      <Text style={[styles.vehicleModalYear, { color: colors.textSecondary }]}>
                        {selectedVehicle.year} {selectedVehicle.isNew ? '• New' : '• Used'}
                      </Text>
                      {selectedVehicle.fuelType === 'electric' && (
                        <View style={styles.electricBadgeLarge}>
                          <Zap size={14} color="#FFF" />
                          <Text style={styles.electricBadgeLargeText}>Electric</Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={[styles.vehicleModalName, { color: colors.text }]}>
                      {selectedVehicle.make} {selectedVehicle.model}
                    </Text>
                    
                    <Text style={[styles.vehicleModalDescription, { color: colors.textSecondary }]}>
                      {selectedVehicle.description}
                    </Text>

                    <View style={styles.vehicleModalSpecs}>
                      <View style={[styles.specItem, { backgroundColor: colors.background }]}>
                        {selectedVehicle.fuelType === 'electric' ? (
                          <Zap size={16} color="#10B981" />
                        ) : (
                          <Fuel size={16} color="#F59E0B" />
                        )}
                        <Text style={[styles.specValue, { color: colors.text }]}>
                          {selectedVehicle.fuelType === 'electric' ? `${selectedVehicle.mpg} MPGe` : `${selectedVehicle.mpg} MPG`}
                        </Text>
                      </View>
                      <View style={[styles.specItem, { backgroundColor: colors.background }]}>
                        <Car size={16} color={colors.primary} />
                        <Text style={[styles.specValue, { color: colors.text }]}>
                          {selectedVehicle.mileage.toLocaleString()} mi
                        </Text>
                      </View>
                      <View style={[styles.specItem, { backgroundColor: colors.background }]}>
                        <DollarSign size={16} color="#10B981" />
                        <Text style={[styles.specValue, { color: colors.text }]}>
                          ${selectedVehicle.monthlyFuelCost}/mo fuel
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.vehicleModalPrice, { color: colors.primary }]}>
                      {formatCurrency(selectedVehicle.price)}
                    </Text>

                    <Text style={[styles.purchaseOptionsTitle, { color: colors.text }]}>
                      How would you like to pay?
                    </Text>

                    <View style={styles.purchaseOptions}>
                      <TouchableOpacity
                        style={[
                          styles.purchaseOptionCard,
                          { 
                            backgroundColor: colors.background,
                            borderColor: gameState.bankBalance >= selectedVehicle.price ? '#10B981' : colors.border,
                            opacity: gameState.bankBalance >= selectedVehicle.price ? 1 : 0.5,
                          },
                        ]}
                        onPress={() => handleVehiclePurchase('cash')}
                        disabled={gameState.bankBalance < selectedVehicle.price}
                      >
                        <View style={[styles.purchaseOptionIcon, { backgroundColor: '#10B98120' }]}>
                          <Banknote size={24} color="#10B981" />
                        </View>
                        <Text style={[styles.purchaseOptionTitle, { color: colors.text }]}>Pay Cash</Text>
                        <Text style={[styles.purchaseOptionDesc, { color: colors.textSecondary }]}>
                          Full payment now
                        </Text>
                        <Text style={[styles.purchaseOptionAmount, { color: '#10B981' }]}>
                          {formatCurrency(selectedVehicle.price)}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.purchaseOptionCard,
                          { backgroundColor: colors.background, borderColor: colors.primary },
                        ]}
                        onPress={() => handleVehiclePurchase('finance')}
                      >
                        <View style={[styles.purchaseOptionIcon, { backgroundColor: colors.primary + '20' }]}>
                          <CreditCard size={24} color={colors.primary} />
                        </View>
                        <Text style={[styles.purchaseOptionTitle, { color: colors.text }]}>Finance</Text>
                        <Text style={[styles.purchaseOptionDesc, { color: colors.textSecondary }]}>
                          60 months @ 6.9% APR
                        </Text>
                        <Text style={[styles.purchaseOptionAmount, { color: colors.primary }]}>
                          ~{formatCurrency(calculateMonthlyPayment(selectedVehicle.price, 60, 6.9))}/mo
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.purchaseOptionCard,
                          { backgroundColor: colors.background, borderColor: '#9333EA' },
                        ]}
                        onPress={() => handleVehiclePurchase('auto_loan')}
                      >
                        <View style={[styles.purchaseOptionIcon, { backgroundColor: '#9333EA20' }]}>
                          <Building2 size={24} color="#9333EA" />
                        </View>
                        <Text style={[styles.purchaseOptionTitle, { color: colors.text }]}>Auto Loan</Text>
                        <Text style={[styles.purchaseOptionDesc, { color: colors.textSecondary }]}>
                          Compare bank rates
                        </Text>
                        <Text style={[styles.purchaseOptionAmount, { color: '#9333EA' }]}>
                          View Options
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
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
  balanceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  balanceLabel: {
    fontSize: 14,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  healthIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  healthText: {
    fontSize: 13,
    fontWeight: '600',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    gap: 10,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  categoryTabs: {
    maxHeight: 50,
  },
  categoryTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filtersRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  itemsContainer: {
    flex: 1,
  },
  itemsContent: {
    padding: 16,
  },
  clothingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#E5E7EB',
  },
  ownedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ownedText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  itemInfo: {
    padding: 12,
  },
  itemBrand: {
    fontSize: 11,
    marginBottom: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  styleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  styleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  foodList: {
    gap: 12,
  },
  foodCard: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
  },
  foodImage: {
    width: 100,
    height: 100,
    backgroundColor: '#E5E7EB',
  },
  foodInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  foodDescription: {
    fontSize: 13,
    marginBottom: 8,
  },
  foodPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  foodMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  healthBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  propertyList: {
    gap: 12,
  },
  propertyCard: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
  },
  propertyImage: {
    width: 100,
    height: 100,
    backgroundColor: '#E5E7EB',
  },
  propertyInfo: {
    flex: 1,
    padding: 12,
  },
  propertyName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  propertyAddress: {
    fontSize: 12,
    marginBottom: 4,
  },
  propertyMeta: {
    marginBottom: 4,
  },
  propertySpecs: {
    fontSize: 12,
  },
  propertyPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  propertyArrow: {
    marginRight: 12,
  },
  vehicleList: {
    gap: 12,
  },
  vehicleCard: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
  },
  vehicleImage: {
    width: 120,
    height: 90,
    backgroundColor: '#E5E7EB',
  },
  vehicleInfo: {
    flex: 1,
    padding: 12,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  vehicleYear: {
    fontSize: 12,
  },
  newBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  vehicleName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  vehicleSpecs: {
    fontSize: 12,
    marginBottom: 4,
  },
  vehiclePrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  vehicleArrow: {
    marginRight: 12,
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  modalCloseIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#E5E7EB',
  },
  modalInfo: {
    padding: 20,
  },
  modalBrand: {
    fontSize: 13,
    marginBottom: 4,
  },
  modalName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  modalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  styleBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  styleBadgeLargeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalPrice: {
    fontSize: 28,
    fontWeight: '800',
  },
  insufficientText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  purchaseButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  electricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  electricBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  vehicleModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  vehicleModalImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#E5E7EB',
  },
  vehicleModalInfo: {
    padding: 20,
  },
  vehicleModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  vehicleModalYear: {
    fontSize: 14,
  },
  electricBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  electricBadgeLargeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  vehicleModalName: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  vehicleModalDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  vehicleModalSpecs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  specItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  vehicleModalPrice: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  purchaseOptionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  purchaseOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  purchaseOptionCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
  },
  purchaseOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  purchaseOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  purchaseOptionDesc: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 6,
  },
  purchaseOptionAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
});
