export type HomeStyle = 'modern' | 'classic' | 'minimalist' | 'luxury' | 'bohemian' | 'industrial' | 'coastal' | 'farmhouse';
export type PropertyType = 'apartment' | 'house' | 'mansion' | 'beach_house' | 'penthouse' | 'loft' | 'villa' | 'cottage';
export type VisitStatus = 'waiting' | 'touring' | 'ended';
export type RoomType = 'living_room' | 'bedroom' | 'bathroom' | 'kitchen' | 'dining_room' | 'office' | 'garage' | 'pool' | 'garden' | 'balcony';

export interface HomeOwnerProfile {
  id: string;
  name: string;
  avatar: string;
  level: number;
  creditScore: number;
  isVerified: boolean;
  isOnline: boolean;
  joinedDate: number;
  totalHomes: number;
  followers: number;
  following: number;
  bio?: string;
  badges: OwnerBadge[];
}

export interface OwnerBadge {
  id: string;
  name: string;
  icon: string;
  color: string;
  earnedAt: number;
}

export interface Home3DModel {
  modelId: string;
  modelUrl: string;
  thumbnailUrl: string;
  floorPlanUrl?: string;
  rooms: Room3D[];
  exteriorViews: ExteriorView[];
  hotspots: Hotspot[];
  lightingPreset: 'day' | 'night' | 'sunset' | 'dramatic';
  weatherEffect?: 'clear' | 'rain' | 'snow' | 'fog';
}

export interface Room3D {
  id: string;
  name: string;
  type: RoomType;
  position: Vector3;
  size: Vector3;
  furnitureItems: FurnitureItem[];
  decorItems: DecorItem[];
  wallColor: string;
  floorType: string;
  ceilingHeight: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface FurnitureItem {
  id: string;
  name: string;
  modelId: string;
  position: Vector3;
  rotation: Vector3;
  scale: number;
  color?: string;
  material?: string;
  brand?: string;
  price?: number;
}

export interface DecorItem {
  id: string;
  name: string;
  type: 'art' | 'plant' | 'rug' | 'lighting' | 'accessory';
  position: Vector3;
  rotation: Vector3;
  thumbnailUrl: string;
}

export interface ExteriorView {
  id: string;
  name: string;
  cameraPosition: Vector3;
  cameraTarget: Vector3;
  thumbnailUrl: string;
}

export interface Hotspot {
  id: string;
  position: Vector3;
  type: 'info' | 'navigation' | 'interaction' | 'feature';
  label: string;
  description?: string;
  targetRoomId?: string;
  action?: string;
}

export interface VirtualTour {
  id: string;
  homeId: string;
  isLive: boolean;
  currentVisitors: number;
  maxVisitors: number;
  hostId?: string;
  hostAvatar?: string;
  startTime?: number;
  scheduledTime?: number;
  duration?: number;
  waypoints: TourWaypoint[];
  audioGuideUrl?: string;
  chatEnabled: boolean;
  guestListEnabled: boolean;
}

export interface TourWaypoint {
  id: string;
  roomId: string;
  position: Vector3;
  lookAt: Vector3;
  duration: number;
  narration?: string;
  highlightFeatures?: string[];
}

export interface MultiplayerVisitSession {
  id: string;
  homeId: string;
  hostId: string;
  status: VisitStatus;
  visitors: VisitorInfo[];
  maxVisitors: number;
  startTime: number;
  endTime?: number;
  chatMessages: VisitChatMessage[];
  isPrivate: boolean;
  inviteCode?: string;
  currentRoom?: string;
}

export interface VisitorInfo {
  id: string;
  name: string;
  avatar: string;
  position: Vector3;
  rotation: number;
  isHost: boolean;
  joinedAt: number;
  avatarColor: string;
  status: 'active' | 'idle' | 'exploring';
}

export interface VisitChatMessage {
  id: string;
  visitorId: string;
  visitorName: string;
  visitorAvatar: string;
  content: string;
  timestamp: number;
  type: 'text' | 'emoji' | 'system';
}

export interface CommunityHome {
  id: string;
  owner: HomeOwnerProfile;
  propertyName: string;
  propertyType: PropertyType;
  style: HomeStyle;
  city: string;
  neighborhood: string;
  description: string;
  coverImage: string;
  images: string[];
  model3D?: Home3DModel;
  virtualTour?: VirtualTour;
  stats: HomeStats;
  details: HomeDetails;
  features: string[];
  financials: HomeFinancials;
  social: HomeSocial;
  settings: HomeSettings;
  createdAt: number;
  lastUpdated: number;
}

export interface HomeStats {
  likes: number;
  visits: number;
  saves: number;
  shares: number;
  comments: number;
  averageVisitDuration: number;
  weeklyVisitors: number;
  trending: boolean;
  trendingRank?: number;
}

export interface HomeDetails {
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  yearBuilt?: number;
  lotSize?: number;
  parkingSpaces?: number;
  floors?: number;
}

export interface HomeFinancials {
  purchasePrice: number;
  currentValue: number;
  monthlyRent?: number;
  isRenting: boolean;
  isForSale: boolean;
  isForRent: boolean;
  askingPrice?: number;
  monthlyRentPrice?: number;
  netWorthGain?: number;
  appreciationRate?: number;
}

export interface HomeSocial {
  isLiked: boolean;
  isSaved: boolean;
  isFollowingOwner: boolean;
  hasVisited: boolean;
  lastVisitDate?: number;
  userRating?: number;
}

export interface HomeSettings {
  isOpenForVisits: boolean;
  virtualTourAvailable: boolean;
  multiplayerEnabled: boolean;
  chatEnabled: boolean;
  guestBookEnabled: boolean;
  allowPhotography: boolean;
  visitSchedule?: VisitSchedule;
}

export interface VisitSchedule {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  startHour: number;
  endHour: number;
}

export interface HomeComment {
  id: string;
  homeId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userLevel: number;
  content: string;
  likes: number;
  isLiked: boolean;
  createdAt: number;
  replies?: HomeComment[];
  parentId?: string;
}

export interface GuestBookEntry {
  id: string;
  homeId: string;
  visitorId: string;
  visitorName: string;
  visitorAvatar: string;
  message: string;
  rating: number;
  visitDate: number;
  isPublic: boolean;
}

export interface HomeFeedFilter {
  propertyTypes?: PropertyType[];
  styles?: HomeStyle[];
  cities?: string[];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minCreditScore?: number;
  openForVisits?: boolean;
  virtualTourAvailable?: boolean;
  followingOnly?: boolean;
  trendingOnly?: boolean;
}

export type HomeFeedSortOption = 
  | 'trending'
  | 'newest'
  | 'most_visited'
  | 'most_liked'
  | 'highest_value'
  | 'nearby'
  | 'following';

export interface HomeFeedState {
  homes: CommunityHome[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  currentPage: number;
  filter: HomeFeedFilter;
  sortBy: HomeFeedSortOption;
  searchQuery: string;
}

export interface HomeVisitRequest {
  id: string;
  homeId: string;
  visitorId: string;
  visitorName: string;
  visitorAvatar: string;
  requestedTime: number;
  status: 'pending' | 'approved' | 'declined' | 'expired';
  message?: string;
  createdAt: number;
}

export interface HomeNotification {
  id: string;
  type: HomeNotificationType;
  homeId?: string;
  homeName?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  message: string;
  isRead: boolean;
  createdAt: number;
  data?: Record<string, unknown>;
}

export type HomeNotificationType = 
  | 'new_like'
  | 'new_comment'
  | 'new_visit'
  | 'new_follower'
  | 'visit_request'
  | 'visit_approved'
  | 'live_tour_started'
  | 'home_trending'
  | 'milestone_reached';

export function formatHomeValue(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}

export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w`;
  return `${Math.floor(seconds / 2592000)}mo`;
}

export function getPropertyTypeIcon(type: PropertyType): string {
  const icons: Record<PropertyType, string> = {
    apartment: '🏢',
    house: '🏠',
    mansion: '🏰',
    beach_house: '🏖️',
    penthouse: '🌆',
    loft: '🏙️',
    villa: '🏡',
    cottage: '🛖',
  };
  return icons[type] || '🏠';
}

export function getStyleColor(style: HomeStyle): string {
  const colors: Record<HomeStyle, string> = {
    modern: '#3B82F6',
    classic: '#8B5CF6',
    minimalist: '#6B7280',
    luxury: '#F59E0B',
    bohemian: '#EC4899',
    industrial: '#78716C',
    coastal: '#06B6D4',
    farmhouse: '#84CC16',
  };
  return colors[style] || '#6B7280';
}

export function getStyleLabel(style: HomeStyle): string {
  const labels: Record<HomeStyle, string> = {
    modern: 'Modern',
    classic: 'Classic',
    minimalist: 'Minimalist',
    luxury: 'Luxury',
    bohemian: 'Bohemian',
    industrial: 'Industrial',
    coastal: 'Coastal',
    farmhouse: 'Farmhouse',
  };
  return labels[style] || style;
}

export function getCreditScoreColor(score: number): string {
  if (score >= 800) return '#22C55E';
  if (score >= 740) return '#84CC16';
  if (score >= 670) return '#EAB308';
  if (score >= 580) return '#F97316';
  return '#EF4444';
}

export function getCreditScoreLabel(score: number): string {
  if (score >= 800) return 'Excellent';
  if (score >= 740) return 'Very Good';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Poor';
}

export interface HomeAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'visiting' | 'hosting' | 'social' | 'exploration' | 'milestone';
  requirement: number;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: number;
  rewardCoins: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  avatar: string;
  score: number;
  change: number;
  isCurrentUser?: boolean;
}

export interface HomeLeaderboard {
  id: string;
  title: string;
  type: 'most_visited' | 'top_hosts' | 'most_liked' | 'most_tours' | 'rising_stars';
  entries: LeaderboardEntry[];
  lastUpdated: number;
}

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  category: 'furniture' | 'decor' | 'lighting' | 'outdoor' | 'art' | 'rugs' | 'plants';
  price: number;
  currency: 'coins' | 'gems';
  thumbnailUrl: string;
  modelId: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isOwned: boolean;
  isPurchasable: boolean;
  requiredLevel?: number;
  tags: string[];
  rating: number;
  purchases: number;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  icon: string;
  itemCount: number;
}

export interface UserHomeStats {
  totalVisits: number;
  uniqueHomesVisited: number;
  toursHosted: number;
  toursAttended: number;
  likesGiven: number;
  likesReceived: number;
  commentsGiven: number;
  guestBookSignings: number;
  totalCoinsEarned: number;
  currentCoins: number;
  currentGems: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export interface LiveTourNotification {
  id: string;
  homeId: string;
  homeName: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  type: 'tour_starting' | 'tour_live' | 'friend_joined' | 'achievement_unlocked';
  message: string;
  timestamp: number;
  isRead: boolean;
  actionUrl?: string;
}

export type ApplicationType = 'rental' | 'purchase';
export type ApplicationStatus = 'pending' | 'under_review' | 'approved' | 'denied' | 'withdrawn';

export interface ApplicantProfile {
  playerId: string;
  playerName: string;
  avatar: string;
  creditScore: number;
  currentAddress: string;
  cityName: string;
  employer: string;
  jobTitle: string;
  monthlyIncome: number;
  annualIncome: number;
  bankBalance: number;
  savingsBalance: number;
  totalAssets: number;
  totalDebt: number;
  monthsEmployed: number;
}

export interface RealEstateApplication {
  id: string;
  homeId: string;
  homeName: string;
  homeAddress: string;
  ownerId: string;
  ownerName: string;
  applicationType: ApplicationType;
  applicant: ApplicantProfile;
  requestedAmount: number;
  monthlyAmount: number;
  securityDeposit?: number;
  downPayment?: number;
  status: ApplicationStatus;
  termsAccepted: RentalTermsAccepted | PurchaseTermsAccepted;
  submittedAt: number;
  reviewedAt?: number;
  reviewNotes?: string;
  moveInDate?: number;
  closingDate?: number;
}

export interface RentalTermsAccepted {
  leaseAgreement: boolean;
  creditCheck: boolean;
  backgroundCheck: boolean;
  petPolicy: boolean;
  moveInInspection: boolean;
  rentResponsibility: boolean;
  maintenancePolicy: boolean;
  noisePolicy: boolean;
}

export interface PurchaseTermsAccepted {
  purchaseAgreement: boolean;
  creditCheck: boolean;
  titleSearch: boolean;
  homeInspection: boolean;
  appraisalContingency: boolean;
  financingContingency: boolean;
  escrowTerms: boolean;
  closingCosts: boolean;
  propertyTaxes: boolean;
  insuranceRequirement: boolean;
}

export interface ApplicationTransaction {
  id: string;
  applicationId: string;
  type: 'application_fee' | 'security_deposit' | 'first_month_rent' | 'down_payment' | 'closing_costs' | 'escrow_deposit';
  amount: number;
  fromPlayerId: string;
  toPlayerId: string;
  status: 'pending' | 'completed' | 'refunded';
  timestamp: number;
  description: string;
}
