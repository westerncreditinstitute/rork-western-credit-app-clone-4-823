import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  Crown,
  Medal,
  TrendingUp,
  DollarSign,
  Home,
  Car,
  Shirt,
  User,
  Star,
  Briefcase,
  ChevronRight,
  X,
  ShoppingBag,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { getCreditTier, formatCurrency } from '@/utils/creditEngine';
import { MOCK_LEADERBOARD, PROPERTIES, VEHICLES } from '@/mocks/gameData';
import { LeaderboardEntry, LifestyleStats, OwnedClothing } from '@/types/game';

type SortBy = 'creditScore' | 'netWorth';
type ProfileTab = 'overview' | 'fashion';

export default function LeaderboardScreen() {
  const { colors } = useTheme();
  const { gameState } = useGame();
  
  const [sortBy, setSortBy] = useState<SortBy>('creditScore');
  const [selectedProfile, setSelectedProfile] = useState<LeaderboardEntry | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (selectedProfile) {
      setActiveTab('overview');
    }
  }, [selectedProfile]);

  const getPlayerEntry = (): LeaderboardEntry => ({
    rank: 0,
    playerId: gameState.playerId,
    playerName: gameState.playerName,
    avatar: gameState.avatar,
    profilePhotoUrl: gameState.profilePhotoUrl,
    useCustomPhoto: gameState.useCustomPhoto,
    creditScore: gameState.creditScores.composite,
    netWorth: gameState.totalNetWorth,
    monthsPlayed: gameState.monthsPlayed,
    lifestyle: gameState.lifestyle,
    jobTitle: gameState.currentJob?.job.title,
    company: gameState.currentJob?.job.company,
    ownedClothing: gameState.ownedClothing,
  });

  const canShowOnLeaderboard = gameState.isPublicProfile && gameState.gameMode !== 'real';

  const getSortedLeaderboard = () => {
    const allEntries = [...MOCK_LEADERBOARD];
    
    if (canShowOnLeaderboard) {
      const playerEntry = getPlayerEntry();
      allEntries.push(playerEntry);
    }

    allEntries.sort((a, b) => {
      if (sortBy === 'creditScore') {
        return b.creditScore - a.creditScore;
      }
      return b.netWorth - a.netWorth;
    });

    return allEntries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  };

  const leaderboard = getSortedLeaderboard();
  const playerRank = leaderboard.findIndex(e => e.playerId === gameState.playerId) + 1;

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return colors.textSecondary;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return Crown;
    if (rank === 2 || rank === 3) return Medal;
    return null;
  };

  const getLifestyleIcon = (style: LifestyleStats['fashionStyle']) => {
    switch (style) {
      case 'elite': return Crown;
      case 'luxury': return Star;
      case 'business': return Briefcase;
      case 'casual': return Shirt;
      default: return User;
    }
  };

  const getLifestyleColor = (style: LifestyleStats['fashionStyle']) => {
    switch (style) {
      case 'elite': return '#FFD700';
      case 'luxury': return '#9333EA';
      case 'business': return '#3B82F6';
      case 'casual': return '#10B981';
      default: return '#6B7280';
    }
  };

  const renderAvatarPreview = (entry: LeaderboardEntry, size: number = 50) => {
    if (entry.useCustomPhoto && entry.profilePhotoUrl) {
      return (
        <Image 
          source={{ uri: entry.profilePhotoUrl }} 
          style={[styles.avatarContainer, { width: size, height: size, borderRadius: size / 2 }]}
        />
      );
    }
    
    const avatar = entry.avatar;
    return (
      <View style={[styles.avatarContainer, { width: size, height: size, backgroundColor: avatar.skinTone + '40' }]}>
        <View style={[styles.avatarHead, { backgroundColor: avatar.skinTone, width: size * 0.6, height: size * 0.6 }]}>
          <View style={[styles.avatarHair, { backgroundColor: avatar.hairColor }]} />
          <View style={styles.avatarFace}>
            <View style={[styles.avatarEye, { backgroundColor: avatar.eyeColor }]} />
            <View style={[styles.avatarEye, { backgroundColor: avatar.eyeColor }]} />
          </View>
        </View>
      </View>
    );
  };

  const getPropertyImage = (housingName: string) => {
    const property = PROPERTIES.find(p => p.name === housingName);
    return property?.imageUrl || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400';
  };

  const getVehicleImage = (vehicleName: string) => {
    const vehicle = VEHICLES.find(v => `${v.make} ${v.model}` === vehicleName);
    return vehicle?.imageUrl || 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      top: 'Tops',
      bottom: 'Bottoms',
      shoes: 'Shoes',
      hat: 'Hats',
      jewelry: 'Jewelry',
      watch: 'Watches',
      bag: 'Bags',
      eyewear: 'Eyewear',
    };
    return labels[category] || category;
  };

  const groupClothingByCategory = (clothing: OwnedClothing[]) => {
    const grouped: Record<string, OwnedClothing[]> = {};
    clothing.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  };

  const renderLeaderboardItem = (entry: LeaderboardEntry, index: number) => {
    const isPlayer = entry.playerId === gameState.playerId;
    const RankIcon = getRankIcon(entry.rank);
    const creditTier = getCreditTier(entry.creditScore);
    const LifestyleIcon = getLifestyleIcon(entry.lifestyle.fashionStyle);

    return (
      <Animated.View
        key={entry.playerId}
        style={[
          styles.leaderboardItem,
          {
            backgroundColor: isPlayer ? colors.primary + '15' : colors.surface,
            borderColor: isPlayer ? colors.primary : 'transparent',
            borderWidth: isPlayer ? 2 : 0,
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20 * index, 0],
              }),
            }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.leaderboardItemContent}
          onPress={() => setSelectedProfile(entry)}
          activeOpacity={0.7}
        >
          <View style={styles.rankSection}>
            {RankIcon ? (
              <View style={[styles.rankBadge, { backgroundColor: getRankColor(entry.rank) + '20' }]}>
                <RankIcon size={18} color={getRankColor(entry.rank)} />
              </View>
            ) : (
              <View style={[styles.rankNumber, { backgroundColor: colors.background }]}>
                <Text style={[styles.rankText, { color: colors.textSecondary }]}>#{entry.rank}</Text>
              </View>
            )}
          </View>

          <View style={styles.avatarSection}>
            {renderAvatarPreview(entry)}
          </View>

          <View style={styles.playerInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.playerName, { color: colors.text }]} numberOfLines={1}>
                {entry.playerName}
                {isPlayer && <Text style={{ color: colors.primary }}> (You)</Text>}
              </Text>
            </View>
            <View style={styles.statsRow}>
              <View style={[styles.creditBadge, { backgroundColor: creditTier.color + '20' }]}>
                <Text style={[styles.creditBadgeText, { color: creditTier.color }]}>
                  {entry.creditScore}
                </Text>
              </View>
              <Text style={[styles.netWorthText, { color: colors.textSecondary }]}>
                {formatCurrency(entry.netWorth)}
              </Text>
            </View>
          </View>

          <View style={styles.lifestyleSection}>
            <View style={[styles.lifestyleBadge, { backgroundColor: getLifestyleColor(entry.lifestyle.fashionStyle) + '20' }]}>
              <LifestyleIcon size={14} color={getLifestyleColor(entry.lifestyle.fashionStyle)} />
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderOverviewTab = () => {
    if (!selectedProfile) return null;

    return (
      <>
        <View style={styles.profileScoreSection}>
          <View style={[styles.scoreCard, { backgroundColor: getCreditTier(selectedProfile.creditScore).color + '15', borderColor: getCreditTier(selectedProfile.creditScore).color }]}>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Credit Score</Text>
            <Text style={[styles.scoreValue, { color: getCreditTier(selectedProfile.creditScore).color }]}>
              {selectedProfile.creditScore}
            </Text>
            <View style={[styles.scoreTierBadge, { backgroundColor: getCreditTier(selectedProfile.creditScore).color + '20' }]}>
              <Text style={[styles.scoreTierText, { color: getCreditTier(selectedProfile.creditScore).color }]}>
                {getCreditTier(selectedProfile.creditScore).tier}
              </Text>
            </View>
          </View>

          <View style={[styles.scoreCard, { backgroundColor: '#10B98115', borderColor: '#10B981' }]}>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Net Worth</Text>
            <Text style={[styles.scoreValue, { color: '#10B981' }]}>
              {formatCurrency(selectedProfile.netWorth)}
            </Text>
            <View style={[styles.scoreTierBadge, { backgroundColor: '#10B98120' }]}>
              <TrendingUp size={12} color="#10B981" />
              <Text style={[styles.scoreTierText, { color: '#10B981' }]}>
                {selectedProfile.monthsPlayed} months
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Lifestyle</Text>

        <View style={[styles.lifestyleCard, { backgroundColor: colors.background }]}>
          <View style={styles.lifestyleItem}>
            <Image 
              source={{ uri: getPropertyImage(selectedProfile.lifestyle.housingName) }} 
              style={styles.lifestyleImage} 
            />
            <View style={styles.lifestyleInfo}>
              <View style={[styles.lifestyleIconBadge, { backgroundColor: '#3B82F620' }]}>
                <Home size={16} color="#3B82F6" />
              </View>
              <View style={styles.lifestyleDetails}>
                <Text style={[styles.lifestyleTitle, { color: colors.text }]}>
                  {selectedProfile.lifestyle.housingName}
                </Text>
                <Text style={[styles.lifestyleSubtitle, { color: colors.textSecondary }]}>
                  {selectedProfile.lifestyle.housingType === 'renting' ? 'Renting' : 
                   selectedProfile.lifestyle.housingType === 'owns_condo' ? 'Owns Condo' :
                   selectedProfile.lifestyle.housingType === 'owns_house' ? 'Owns House' : 'Owns Luxury Property'}
                </Text>
                <Text style={[styles.lifestyleValue, { color: '#3B82F6' }]}>
                  {formatCurrency(selectedProfile.lifestyle.totalPropertyValue)}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.lifestyleDivider, { backgroundColor: colors.border }]} />

          <View style={styles.lifestyleItem}>
            {selectedProfile.lifestyle.vehicleType !== 'none' ? (
              <Image 
                source={{ uri: getVehicleImage(selectedProfile.lifestyle.vehicleName) }} 
                style={styles.lifestyleImage} 
              />
            ) : (
              <View style={[styles.lifestyleImagePlaceholder, { backgroundColor: colors.border }]}>
                <Car size={24} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.lifestyleInfo}>
              <View style={[styles.lifestyleIconBadge, { backgroundColor: '#10B98120' }]}>
                <Car size={16} color="#10B981" />
              </View>
              <View style={styles.lifestyleDetails}>
                <Text style={[styles.lifestyleTitle, { color: colors.text }]}>
                  {selectedProfile.lifestyle.vehicleName}
                </Text>
                <Text style={[styles.lifestyleSubtitle, { color: colors.textSecondary }]}>
                  {selectedProfile.lifestyle.vehicleType === 'none' ? 'No Vehicle' :
                   selectedProfile.lifestyle.vehicleType === 'financed' ? 'Financed' : 'Owned Outright'}
                </Text>
                <Text style={[styles.lifestyleValue, { color: '#10B981' }]}>
                  {formatCurrency(selectedProfile.lifestyle.totalVehicleValue)}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.lifestyleDivider, { backgroundColor: colors.border }]} />

          <View style={styles.fashionSummary}>
            <View style={[styles.lifestyleIconBadge, { backgroundColor: '#9333EA20' }]}>
              <Shirt size={16} color="#9333EA" />
            </View>
            <View style={styles.fashionInfo}>
              <Text style={[styles.lifestyleTitle, { color: colors.text }]}>
                {selectedProfile.lifestyle.fashionStyle.charAt(0).toUpperCase() + selectedProfile.lifestyle.fashionStyle.slice(1)} Fashion
              </Text>
              <Text style={[styles.lifestyleValue, { color: '#9333EA' }]}>
                {formatCurrency(selectedProfile.lifestyle.totalClothingValue)}
              </Text>
            </View>
          </View>
        </View>
      </>
    );
  };

  const renderFashionTab = () => {
    if (!selectedProfile) return null;

    const ownedClothing = selectedProfile.ownedClothing || [];
    const groupedClothing = groupClothingByCategory(ownedClothing);
    const categories = Object.keys(groupedClothing);

    if (ownedClothing.length === 0) {
      return (
        <View style={[styles.emptyFashion, { backgroundColor: colors.background }]}>
          <ShoppingBag size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyFashionText, { color: colors.textSecondary }]}>
            No fashion items purchased yet
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.fashionContainer}>
        <View style={[styles.fashionStats, { backgroundColor: colors.background }]}>
          <View style={styles.fashionStatItem}>
            <Text style={[styles.fashionStatValue, { color: colors.text }]}>{ownedClothing.length}</Text>
            <Text style={[styles.fashionStatLabel, { color: colors.textSecondary }]}>Items</Text>
          </View>
          <View style={[styles.fashionStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.fashionStatItem}>
            <Text style={[styles.fashionStatValue, { color: '#9333EA' }]}>
              {formatCurrency(selectedProfile.lifestyle.totalClothingValue)}
            </Text>
            <Text style={[styles.fashionStatLabel, { color: colors.textSecondary }]}>Total Value</Text>
          </View>
        </View>

        {categories.map(category => (
          <View key={category} style={styles.fashionCategory}>
            <Text style={[styles.fashionCategoryTitle, { color: colors.text }]}>
              {getCategoryLabel(category)}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fashionItemsScroll}>
              {groupedClothing[category].map((item, index) => (
                <View 
                  key={`${item.id}-${index}`} 
                  style={[styles.fashionItem, { backgroundColor: colors.background }]}
                >
                  <Image source={{ uri: item.imageUrl }} style={styles.fashionItemImage} />
                  <Text style={[styles.fashionItemName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.fashionItemBrand, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.brand}
                  </Text>
                  <Text style={[styles.fashionItemPrice, { color: '#9333EA' }]}>
                    {formatCurrency(item.price)}
                  </Text>
                  {item.isEquipped && (
                    <View style={[styles.equippedBadge, { backgroundColor: '#10B981' }]}>
                      <Text style={styles.equippedBadgeText}>Wearing</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        ))}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Leaderboard' }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Crown size={24} color="#FFD700" />
              <Text style={[styles.headerTitle, { color: colors.text }]}>Global Rankings</Text>
            </View>
            {canShowOnLeaderboard && playerRank > 0 && (
              <View style={[styles.yourRankBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.yourRankText, { color: colors.primary }]}>
                  Your Rank: #{playerRank}
                </Text>
              </View>
            )}
            {gameState.gameMode === 'real' && (
              <View style={[styles.yourRankBadge, { backgroundColor: '#F59E0B20' }]}>
                <Text style={[styles.yourRankText, { color: '#F59E0B' }]}>
                  Personal Mode
                </Text>
              </View>
            )}
          </View>

          <View style={styles.sortTabs}>
            <TouchableOpacity
              style={[
                styles.sortTab,
                { backgroundColor: sortBy === 'creditScore' ? colors.primary : colors.background },
              ]}
              onPress={() => setSortBy('creditScore')}
            >
              <TrendingUp size={16} color={sortBy === 'creditScore' ? '#FFF' : colors.text} />
              <Text style={[styles.sortTabText, { color: sortBy === 'creditScore' ? '#FFF' : colors.text }]}>
                Credit Score
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortTab,
                { backgroundColor: sortBy === 'netWorth' ? colors.primary : colors.background },
              ]}
              onPress={() => setSortBy('netWorth')}
            >
              <DollarSign size={16} color={sortBy === 'netWorth' ? '#FFF' : colors.text} />
              <Text style={[styles.sortTabText, { color: sortBy === 'netWorth' ? '#FFF' : colors.text }]}>
                Net Worth
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.leaderboardList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.leaderboardContent}
        >
          {leaderboard.map((entry, index) => renderLeaderboardItem(entry, index))}
          <View style={styles.bottomPadding} />
        </ScrollView>

        <Modal visible={selectedProfile !== null} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              {selectedProfile && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.modalCloseButton, { backgroundColor: colors.background }]}
                    onPress={() => setSelectedProfile(null)}
                  >
                    <X size={20} color={colors.text} />
                  </TouchableOpacity>

                  <View style={[styles.profileHeader, { backgroundColor: getLifestyleColor(selectedProfile.lifestyle.fashionStyle) + '15' }]}>
                    <View style={styles.profileRankBadge}>
                      {getRankIcon(selectedProfile.rank) ? (
                        <View style={[styles.profileRankIcon, { backgroundColor: getRankColor(selectedProfile.rank) }]}>
                          {selectedProfile.rank === 1 && <Crown size={20} color="#FFF" />}
                          {(selectedProfile.rank === 2 || selectedProfile.rank === 3) && <Medal size={20} color="#FFF" />}
                        </View>
                      ) : (
                        <View style={[styles.profileRankNumber, { backgroundColor: colors.primary }]}>
                          <Text style={styles.profileRankText}>#{selectedProfile.rank}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.avatarWrapper}>
                      {renderAvatarPreview(selectedProfile, 80)}
                    </View>

                    <Text style={[styles.profileName, { color: colors.text }]}>
                      {selectedProfile.playerName}
                    </Text>

                    {selectedProfile.jobTitle && (
                      <View style={[styles.jobBadge, { backgroundColor: colors.background }]}>
                        <Briefcase size={14} color={colors.primary} />
                        <Text style={[styles.jobText, { color: colors.text }]}>
                          {selectedProfile.jobTitle}
                        </Text>
                        {selectedProfile.company && (
                          <Text style={[styles.companyText, { color: colors.textSecondary }]}>
                            at {selectedProfile.company}
                          </Text>
                        )}
                      </View>
                    )}

                    <View style={[styles.profileLifestyleBadge, { backgroundColor: getLifestyleColor(selectedProfile.lifestyle.fashionStyle) + '30' }]}>
                      {(() => {
                        const Icon = getLifestyleIcon(selectedProfile.lifestyle.fashionStyle);
                        return <Icon size={14} color={getLifestyleColor(selectedProfile.lifestyle.fashionStyle)} />;
                      })()}
                      <Text style={[styles.profileLifestyleText, { color: getLifestyleColor(selectedProfile.lifestyle.fashionStyle) }]}>
                        {selectedProfile.lifestyle.fashionStyle.charAt(0).toUpperCase() + selectedProfile.lifestyle.fashionStyle.slice(1)} Lifestyle
                      </Text>
                    </View>
                  </View>

                  <View style={styles.profileTabs}>
                    <TouchableOpacity
                      style={[
                        styles.profileTab,
                        { 
                          backgroundColor: activeTab === 'overview' ? colors.primary : colors.background,
                          borderColor: activeTab === 'overview' ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setActiveTab('overview')}
                    >
                      <User size={16} color={activeTab === 'overview' ? '#FFF' : colors.text} />
                      <Text style={[styles.profileTabText, { color: activeTab === 'overview' ? '#FFF' : colors.text }]}>
                        Overview
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.profileTab,
                        { 
                          backgroundColor: activeTab === 'fashion' ? colors.primary : colors.background,
                          borderColor: activeTab === 'fashion' ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setActiveTab('fashion')}
                    >
                      <ShoppingBag size={16} color={activeTab === 'fashion' ? '#FFF' : colors.text} />
                      <Text style={[styles.profileTabText, { color: activeTab === 'fashion' ? '#FFF' : colors.text }]}>
                        Fashion
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {activeTab === 'overview' ? renderOverviewTab() : renderFashionTab()}

                  <View style={styles.modalBottomPadding} />
                </ScrollView>
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
  header: {
    padding: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  yourRankBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  yourRankText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  sortTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  sortTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  sortTabText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  leaderboardList: {
    flex: 1,
  },
  leaderboardContent: {
    padding: 16,
  },
  leaderboardItem: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  leaderboardItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  rankSection: {
    marginRight: 10,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  avatarSection: {
    marginRight: 12,
  },
  avatarContainer: {
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarHead: {
    borderRadius: 15,
    position: 'relative',
  },
  avatarHair: {
    position: 'absolute',
    top: -3,
    left: 3,
    right: 3,
    height: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  avatarFace: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  avatarEye: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  playerInfo: {
    flex: 1,
  },
  nameRow: {
    marginBottom: 4,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  creditBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  creditBadgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  netWorthText: {
    fontSize: 12,
  },
  lifestyleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lifestyleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
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
    maxHeight: '90%',
  },
  modalCloseButton: {
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
  profileHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  profileRankBadge: {
    marginBottom: 12,
  },
  profileRankIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileRankNumber: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  profileRankText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  avatarWrapper: {
    marginBottom: 12,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  jobBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  jobText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  companyText: {
    fontSize: 13,
  },
  profileLifestyleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  profileLifestyleText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  profileTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  profileTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  profileTabText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  profileScoreSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 8,
  },
  scoreCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '800' as const,
    marginBottom: 6,
  },
  scoreTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  scoreTierText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  lifestyleCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  lifestyleItem: {
    flexDirection: 'row',
    padding: 12,
  },
  lifestyleImage: {
    width: 80,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  lifestyleImagePlaceholder: {
    width: 80,
    height: 60,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lifestyleInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  lifestyleIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lifestyleDetails: {
    flex: 1,
  },
  lifestyleTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  lifestyleSubtitle: {
    fontSize: 11,
    marginBottom: 2,
  },
  lifestyleValue: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  lifestyleDivider: {
    height: 1,
    marginHorizontal: 12,
  },
  fashionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  fashionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fashionContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  fashionStats: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  fashionStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  fashionStatDivider: {
    width: 1,
    marginHorizontal: 16,
  },
  fashionStatValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  fashionStatLabel: {
    fontSize: 12,
  },
  fashionCategory: {
    marginBottom: 20,
  },
  fashionCategoryTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  fashionItemsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  fashionItem: {
    width: 140,
    borderRadius: 12,
    padding: 10,
    marginRight: 12,
  },
  fashionItemImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#E5E7EB',
  },
  fashionItemName: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  fashionItemBrand: {
    fontSize: 11,
    marginBottom: 4,
  },
  fashionItemPrice: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  equippedBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  equippedBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600' as const,
  },
  emptyFashion: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginHorizontal: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  emptyFashionText: {
    fontSize: 14,
    marginTop: 12,
  },
  modalBottomPadding: {
    height: 40,
  },
});
