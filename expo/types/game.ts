export type CreditBureau = 'experian' | 'equifax' | 'transunion';

export interface CreditScores {
  experian: number;
  equifax: number;
  transunion: number;
  composite: number;
}

export interface CreditAccount {
  id: string;
  type: 'credit_card' | 'auto_loan' | 'mortgage' | 'personal_loan' | 'student_loan';
  institutionId: string;
  institutionName: string;
  balance: number;
  creditLimit: number;
  apr: number;
  minimumPayment: number;
  openedDate: number;
  lastPaymentDate: number;
  paymentHistory: PaymentRecord[];
  status: 'current' | 'late_30' | 'late_60' | 'late_90' | 'collections' | 'closed';
}

export interface PaymentRecord {
  date: number;
  amount: number;
  onTime: boolean;
  daysLate: number;
}

export interface HardInquiry {
  id: string;
  institutionName: string;
  date: number;
  type: 'credit_card' | 'auto_loan' | 'mortgage' | 'personal_loan';
}

export interface Job {
  id: string;
  title: string;
  company: string;
  tier: 'entry' | 'mid' | 'senior' | 'executive';
  baseSalary: number;
  commission?: number;
  benefits: JobBenefits;
  requirements: JobRequirements;
  description: string;
}

export interface JobBenefits {
  healthInsurance: boolean;
  retirement401k: boolean;
  retirementMatch: number;
  paidTimeOff: number;
  bonus: number;
}

export interface JobRequirements {
  minCreditScore?: number;
  minExperience: number;
  requiredDegree?: 'certificate' | 'associate' | 'bachelor' | 'master' | 'doctorate';
  requiredMajor?: string;
  minimumGPA?: number;
  preferredEducation?: ('certificate' | 'associate' | 'bachelor' | 'master' | 'doctorate')[];
  skills?: string[];
}

export interface PlayerJob {
  job: Job;
  startDate: number;
  experienceMonths: number;
  performanceRating: number;
  currentSalary: number;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  name: string;
  amount: number;
  frequency: 'monthly' | 'weekly' | 'annual' | 'one_time';
  isFixed: boolean;
  dueDay?: number;
}

export type ExpenseCategory = 
  | 'housing'
  | 'utilities'
  | 'transportation'
  | 'insurance'
  | 'groceries'
  | 'dining'
  | 'entertainment'
  | 'shopping'
  | 'healthcare'
  | 'education'
  | 'personal_care'
  | 'subscriptions'
  | 'debt_payment'
  | 'savings'
  | 'emergency'
  | 'other';

export interface Property {
  id: string;
  type: 'condo' | 'townhouse' | 'single_family' | 'multi_family' | 'luxury';
  name: string;
  address: string;
  price: number;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  hoaFee?: number;
  propertyTax: number;
  imageUrl: string;
  description: string;
}

export interface OwnedProperty extends Property {
  purchaseDate: number;
  purchasePrice: number;
  mortgageId?: string;
  currentValue: number;
  equity: number;
  hasSolarPanels: boolean;
  solarInstallDate?: number;
}

export interface Vehicle {
  id: string;
  type: 'economy' | 'compact' | 'midsize' | 'suv' | 'truck' | 'luxury';
  make: string;
  model: string;
  year: number;
  price: number;
  mpg: number;
  isNew: boolean;
  mileage: number;
  imageUrl: string;
  description: string;
  fuelType: 'gas' | 'electric';
  tankCapacity?: number; // gallons for gas, kWh for electric
  monthlyFuelCost?: number; // estimated monthly fuel/charging cost
}

export interface OwnedVehicle extends Vehicle {
  purchaseDate: number;
  purchasePrice: number;
  loanId?: string;
  currentValue: number;
  maintenanceHistory: MaintenanceRecord[];
  fuelLevel: number; // 0-100 percentage
  milesUntilEmpty: number;
}

export interface MaintenanceRecord {
  date: number;
  type: string;
  cost: number;
}

export interface FinancialInstitution {
  id: string;
  name: string;
  type: 'bank' | 'credit_union' | 'online_bank' | 'subprime' | 'credit_builder';
  logo: string;
  products: FinancialProduct[];
  minCreditScore: number;
}

export interface FinancialProduct {
  id: string;
  type: 'credit_card' | 'auto_loan' | 'mortgage' | 'personal_loan' | 'savings';
  name: string;
  minCreditScore: number;
  baseApr: number;
  maxApr: number;
  annualFee?: number;
  rewards?: string;
  maxAmount?: number;
  termMonths?: number[];
  isSecured?: boolean;
  securityDeposit?: number;
}

export interface LoanApplication {
  id: string;
  productId: string;
  institutionId: string;
  amount: number;
  termMonths: number;
  status: 'pending' | 'approved' | 'denied' | 'accepted';
  offeredApr?: number;
  monthlyPayment?: number;
  denialReason?: string;
  applicationDate: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'credit' | 'savings' | 'career' | 'property' | 'education' | 'milestones';
  requirement: AchievementRequirement;
  reward?: AchievementReward;
  unlockedAt?: number;
}

export interface AchievementRequirement {
  type: 'credit_score' | 'net_worth' | 'income' | 'savings' | 'property' | 'debt_free' | 'streak' | 'accounts' | 'education_enrolled' | 'gpa' | 'degrees_completed' | 'master_degree' | 'doctorate_degree' | 'debt_free_graduation' | 'total_financial_aid' | 'perfect_semester' | 'student_loans_paid' | 'first_rental' | 'first_vehicle' | 'first_business' | 'first_house';
  value: number;
  comparison: 'gte' | 'lte' | 'eq';
}

export interface AchievementReward {
  type: 'cash' | 'credit_boost' | 'multiplier';
  amount: number;
}

export interface EmergencyEvent {
  id: string;
  title: string;
  description: string;
  category: 'medical' | 'vehicle' | 'home' | 'job' | 'legal' | 'natural_disaster';
  cost: number;
  creditImpact?: number;
  incomeImpact?: number;
  duration?: number;
}

export type GameMode = 'simulation' | 'real';

export interface Alert {
  id: string;
  type: 'bill_due' | 'groceries_low' | 'payment_due' | 'payday' | 'low_fuel' | 'custom' | 'random_incident';
  name: string;
  enabled: boolean;
  dayOfMonth?: number;
  message?: string;
  incidentId?: string;
  severity?: 'minor' | 'moderate' | 'severe' | 'catastrophic';
}

export interface HealthStatus {
  level: number; // 0-100
  lastFoodPurchaseMonth: number;
  isHospitalized: boolean;
  hospitalDebt: number;
}

export interface PaidExpenseRecord {
  paidAt: number;
  method: string;
  monthKey: string;
}

export interface GameState {
  playerId: string;
  playerName: string;
  avatar: PlayerAvatar;
  profilePhotoUrl?: string;
  useCustomPhoto: boolean;
  gameMode: GameMode;
  alerts: Alert[];
  healthStatus: HealthStatus;
  gameStartDate: number;
  currentDate: number;
  creditScores: CreditScores;
  creditAccounts: CreditAccount[];
  hardInquiries: HardInquiry[];
  currentJob?: PlayerJob;
  jobHistory: PlayerJob[];
  monthlyIncome: number;
  expenses: Expense[];
  bankBalance: number;
  savingsBalance: number;
  emergencyFund: number;
  investments: number;
  ownedProperties: OwnedProperty[];
  ownedVehicles: OwnedVehicle[];
  ownedClothing: OwnedClothing[];
  pendingApplications: LoanApplication[];
  achievements: Achievement[];
  unlockedAchievements: string[];
  totalNetWorth: number;
  monthsPlayed: number;
  consecutiveOnTimePayments: number;
  lifetimeEarnings: number;
  lifetimeSpending: number;
  tutorialCompleted: boolean;
  lastEventDate: number;
  lifestyle: LifestyleStats;
  isPublicProfile: boolean;
  activityLog: ActivityLogEntry[];
  scoreHistory: ScoreHistoryEntry[];
  lastLoginDate: number;
  consecutiveLoginDays: number;
  pendingIncidents: RandomIncident[];
  tokenWallet: TokenWallet;
  citySelectionCompleted: boolean;
  paidExpenses: Record<string, PaidExpenseRecord>;
  lastUpdated: number;
}

export interface RandomIncident {
  id: string;
  event: EmergencyEvent;
  occurredAt: number;
  wasNotified: boolean;
  severity: 'minor' | 'moderate' | 'severe' | 'catastrophic';
  daysAbsent: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  avatar: PlayerAvatar;
  profilePhotoUrl?: string;
  useCustomPhoto?: boolean;
  creditScore: number;
  netWorth: number;
  monthsPlayed: number;
  lifestyle: LifestyleStats;
  jobTitle?: string;
  company?: string;
  ownedClothing?: OwnedClothing[];
}

export interface PlayerAvatar {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  facialHair?: string;
  glasses?: string;
  outfit: AvatarOutfit;
}

export interface AvatarOutfit {
  top: ClothingItem | null;
  bottom: ClothingItem | null;
  shoes: ClothingItem | null;
  hat: ClothingItem | null;
  jewelry: ClothingItem | null;
  watch: ClothingItem | null;
  bag: ClothingItem | null;
  eyewear: ClothingItem | null;
}

export type ClothingCategory = 'top' | 'bottom' | 'shoes' | 'hat' | 'jewelry' | 'watch' | 'bag' | 'eyewear' | 'full_outfit';

export interface ClothingItem {
  id: string;
  name: string;
  category: ClothingCategory;
  style: 'casual' | 'business' | 'formal' | 'athletic' | 'luxury';
  price: number;
  imageUrl: string;
  color: string;
  brand: string;
  description: string;
}

export interface FoodItem {
  id: string;
  name: string;
  category: 'groceries' | 'fast_food' | 'restaurant' | 'fine_dining' | 'coffee';
  price: number;
  healthImpact: number;
  imageUrl: string;
  description: string;
}

export interface OwnedClothing extends ClothingItem {
  purchaseDate: number;
  isEquipped: boolean;
}

export interface SharedRentalRoommate {
  id: string;
  name: string;
  age: number;
  occupation: string;
  personality: string;
  avatar: string;
  rentPaidOnTime: boolean;
  cleanliness: number;
  noisiness: number;
}

export interface SharedRentalInfo {
  apartmentId: string;
  apartmentNumber: string;
  unitNumber: string;
  roommates: SharedRentalRoommate[];
  moveInDate: number;
  monthlyShare: number;
  securityDeposit: number;
}

export interface LifestyleStats {
  housingType: 'homeless' | 'shared_rental' | 'renting' | 'owns_condo' | 'owns_house' | 'owns_luxury';
  housingName: string;
  vehicleType: 'none' | 'financed' | 'owned';
  vehicleName: string;
  fashionStyle: 'basic' | 'casual' | 'business' | 'luxury' | 'elite';
  totalClothingValue: number;
  totalPropertyValue: number;
  totalVehicleValue: number;
  cityId?: string;
  cityName?: string;
  sharedRental?: SharedRentalInfo;
  rentalPropertyType?: string;
  rentalNeighborhood?: string;
  monthlyRent?: number;
  homeResidencePropertyId?: string;
  homeResidenceCityId?: string;
  homeResidenceCityName?: string;
}

export type GameScreen = 
  | 'dashboard'
  | 'bank'
  | 'career'
  | 'shopping'
  | 'properties'
  | 'vehicles'
  | 'budget'
  | 'achievements'
  | 'leaderboard'
  | 'education';

export interface CreditScoreBreakdown {
  paymentHistory: {
    score: number;
    maxScore: number;
    details: string;
  };
  creditUtilization: {
    score: number;
    maxScore: number;
    percentage: number;
    details: string;
  };
  creditAge: {
    score: number;
    maxScore: number;
    averageAge: number;
    oldestAccount: number;
    details: string;
  };
  creditMix: {
    score: number;
    maxScore: number;
    accountTypes: string[];
    details: string;
  };
  newCredit: {
    score: number;
    maxScore: number;
    recentInquiries: number;
    details: string;
  };
}

export interface MonthlyReport {
  month: number;
  year: number;
  income: number;
  expenses: number;
  savings: number;
  creditScoreChange: number;
  netWorthChange: number;
  highlights: string[];
  warnings: string[];
}

export type ActivityType = 
  | 'inquiry_added'
  | 'application_submitted'
  | 'application_approved'
  | 'application_denied'
  | 'account_opened'
  | 'payment_made'
  | 'score_change'
  | 'job_change'
  | 'property_purchased'
  | 'vehicle_purchased'
  | 'clothing_purchased'
  | 'expense_added'
  | 'expense_removed'
  | 'achievement_unlocked'
  | 'month_advanced'
  | 'emergency_event'
  | 'profile_updated'
  | 'health_event'
  | 'random_incident';

export interface ActivityLogEntry {
  id: string;
  type: ActivityType;
  timestamp: number;
  title: string;
  description: string;
  metadata?: {
    previousScore?: number;
    newScore?: number;
    amount?: number;
    accountId?: string;
    institutionName?: string;
    applicationId?: string;
    inquiryId?: string;
    jobTitle?: string;
    propertyName?: string;
    vehicleName?: string;
    itemName?: string;
    achievementId?: string;
    eventType?: string;
  };
}

export interface ScoreHistoryEntry {
  timestamp: number;
  experian: number;
  equifax: number;
  transunion: number;
  composite: number;
  reason?: string;
}

export interface MUSOToken {
  balance: number;
  totalMinted: number;
  totalBurned: number;
  lastUpdated: number;
}

export interface TokenTransaction {
  id: string;
  type: 'mint' | 'burn' | 'transfer';
  amount: number;
  reason: string;
  timestamp: number;
  balanceAfter: number;
  metadata?: {
    source?: string;
    category?: string;
    relatedId?: string;
  };
}

export interface TokenWallet {
  address: string;
  musoToken: MUSOToken;
  transactions: TokenTransaction[];
  createdAt: number;
}

// Business Types
export interface BusinessCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  isPrimary: boolean;
  color: string;
}

export interface BusinessType {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  startupCostMin: number;
  startupCostMax: number;
  monthlyExpenses: number;
  potentialRevenue: { min: number; max: number };
  requirements: BusinessRequirements;
  riskLevel: 'low' | 'medium' | 'high';
  timeToProfit: number;
  employeesNeeded: number;
  imageUrl: string;
}

export interface BusinessRequirements {
  minCreditScore?: number;
  minExperience?: number;
  requiredDegree?: 'certificate' | 'associate' | 'bachelor' | 'master' | 'doctorate';
  requiredLicense?: string;
  minCapital?: number;
}

export interface OwnedBusiness {
  id: string;
  businessType: BusinessType;
  name: string;
  startDate: number;
  initialInvestment: number;
  currentValue: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  employees: number;
  investmentPool?: InvestmentPool;
  ownershipPercent: number;
  status: 'starting' | 'operating' | 'profitable' | 'struggling' | 'closed';
  monthsOperating: number;
  performanceRating: number;
}

export interface InvestmentPool {
  id: string;
  businessId: string;
  businessName: string;
  creatorId: string;
  creatorName: string;
  targetAmount: number;
  currentAmount: number;
  minimumInvestment: number;
  maximumInvestment: number;
  investorCount: number;
  investors: PoolInvestor[];
  equityPerDollar: number;
  expectedReturn: number;
  status: 'open' | 'funded' | 'closed' | 'cancelled';
  createdAt: number;
  deadline: number;
  description: string;
}

export interface PoolInvestor {
  playerId: string;
  playerName: string;
  amount: number;
  equityPercent: number;
  investedAt: number;
}

export interface BusinessInvestment {
  id: string;
  poolId: string;
  businessName: string;
  amount: number;
  equityPercent: number;
  investedAt: number;
  status: 'active' | 'returned' | 'lost';
  returns: number;
}
