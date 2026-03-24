// Scavenger Hunt Types - MUSO Token Treasure Hunt in Los Angeles

export interface TreasureLocation {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  neighborhood: string;
  landmark: string;
  locationName: string;
  locationAddress: string;
  searchHint: string;
  isRealPlace: boolean;
  treasureType: TreasureType;
  placeType: PlaceType;
  tokenReward: number;
  rarity: TreasureRarity;
  icon: string;
  hint: string;
  radiusMeters: number;
  distanceFromPlayer?: number;
  modelColor: string;
  glowColor: string;
  particleEffect: ParticleEffect;
}

export type TreasureType = 'coin_pile' | 'treasure_chest' | 'golden_muso' | 'crystal_vault' | 'token_fountain';

export type PlaceType = 'park' | 'gas_station' | 'restaurant' | 'landmark' | 'shopping' | 'entertainment';

export type TreasureRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type ParticleEffect = 'sparkle' | 'glow' | 'fire' | 'ice' | 'rainbow';

export interface TreasureClaim {
  id: string;
  treasureId: string;
  playerId: string;
  claimedAt: number;
  tokensAwarded: number;
  dayKey: string; // YYYY-MM-DD format for daily tracking
  bonusMultiplier: number;
  streakDay: number;
}

export interface DailyHuntProgress {
  dayKey: string;
  totalTreasures: number;
  claimedTreasures: number;
  totalTokensEarned: number;
  claimedIds: string[];
  streakCount: number;
  bonusTokensEarned: number;
  completedAt: number | null;
}

export interface HuntStreak {
  currentStreak: number;
  longestStreak: number;
  lastHuntDate: string | null; // YYYY-MM-DD
  totalDaysHunted: number;
}

export interface ScavengerHuntState {
  treasureLocations: TreasureLocation[];
  dailyProgress: DailyHuntProgress;
  huntStreak: HuntStreak;
  claims: TreasureClaim[];
  totalTokensEarned: number;
  totalTreasuresClaimed: number;
  isLoading: boolean;
  selectedTreasure: TreasureLocation | null;
  showARView: boolean;
  playerLocation: PlayerLocation | null;
  nearbyTreasures: TreasureLocation[];
  huntActive: boolean;
}

export interface PlayerLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export interface TreasureDistance {
  treasure: TreasureLocation;
  distanceMeters: number;
  isInRange: boolean;
  bearing: number;
  direction: string;
}

export const RARITY_CONFIG: Record<TreasureRarity, {
  color: string;
  glowIntensity: number;
  label: string;
  multiplier: number;
  bgColor: string;
}> = {
  common: { color: '#9CA3AF', glowIntensity: 0.3, label: 'Common', multiplier: 1.0, bgColor: '#9CA3AF20' },
  uncommon: { color: '#10B981', glowIntensity: 0.5, label: 'Uncommon', multiplier: 1.25, bgColor: '#10B98120' },
  rare: { color: '#3B82F6', glowIntensity: 0.7, label: 'Rare', multiplier: 1.5, bgColor: '#3B82F620' },
  epic: { color: '#8B5CF6', glowIntensity: 0.85, label: 'Epic', multiplier: 2.0, bgColor: '#8B5CF620' },
  legendary: { color: '#F59E0B', glowIntensity: 1.0, label: 'Legendary', multiplier: 3.0, bgColor: '#F59E0B20' },
};

export const TREASURE_TYPE_CONFIG: Record<TreasureType, {
  label: string;
  icon: string;
  baseReward: number;
  imageUrl?: string;
  isGif?: boolean;
}> = {
  coin_pile: { label: 'Coin Pile', icon: '🪙', baseReward: 25 },
  treasure_chest: { label: 'Treasure Chest', icon: '📦', baseReward: 50, imageUrl: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/sxoyt6evwrnj9ec9e7xa2' },
  golden_muso: { label: 'Golden MUSO', icon: '🏆', baseReward: 100 },
  crystal_vault: { label: 'Crystal Vault', icon: '💎', baseReward: 150 },
  token_fountain: { label: 'Token Fountain', icon: '⛲', baseReward: 200, imageUrl: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/h81re9sgu9wthtq0rtnvy', isGif: true },
};

export const STREAK_BONUSES: Record<number, { multiplier: number; label: string }> = {
  3: { multiplier: 1.25, label: '3-Day Streak! +25%' },
  5: { multiplier: 1.5, label: '5-Day Streak! +50%' },
  7: { multiplier: 2.0, label: 'Weekly Warrior! 2x' },
  14: { multiplier: 2.5, label: '2-Week Legend! 2.5x' },
  30: { multiplier: 3.0, label: 'Monthly Master! 3x' },
};

export const MAX_DAILY_TREASURES = 10;
export const TREASURE_RADIUS_MILES = 5;
export const TREASURE_RADIUS_METERS = TREASURE_RADIUS_MILES * 1609.34;

export const PLACE_TYPE_CONFIG: Record<PlaceType, {
  label: string;
  icon: string;
  priority: number;
}> = {
  park: { label: 'Park', icon: '🌳', priority: 1 },
  gas_station: { label: 'Gas Station', icon: '⛽', priority: 1 },
  restaurant: { label: 'Restaurant', icon: '🍽️', priority: 1 },
  landmark: { label: 'Landmark', icon: '🏛️', priority: 2 },
  shopping: { label: 'Shopping', icon: '🛍️', priority: 3 },
  entertainment: { label: 'Entertainment', icon: '🎭', priority: 3 },
};