// Business Category Types
export type BusinessCategoryType =
  | 'retail'
  | 'service'
  | 'manufacturing'
  | 'professional'
  | 'technology'
  | 'medical'
  | 'financial'
  | 'real_estate'
  | 'other';

export type RiskLevel = 'low' | 'medium' | 'high' | 'very_high';

export type BusinessStage =
  | 'planning'
  | 'funding'
  | 'operational'
  | 'profitable'
  | 'scaling'
  | 'struggling'
  | 'closed';

export type InvestmentStatus = 'active' | 'completed' | 'withdrawn';

export type PoolStatus = 'open' | 'funded' | 'closed' | 'cancelled';

export type ContributionStatus = 'active' | 'withdrawn' | 'refunded';

export type RecurrencePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type LoanStatus = 'active' | 'paid_off' | 'defaulted' | 'restructured';

export type LeaderboardPeriod = 'monthly' | 'quarterly' | 'yearly' | 'all_time';

export type BusinessEventType =
  | 'market_shift'
  | 'economic_cycle'
  | 'competitor_entry'
  | 'regulatory_change'
  | 'technological_change'
  | 'natural_disaster'
  | 'customer_spike'
  | 'supply_chain_issue'
  | 'other';

export type ImpactType = 'positive' | 'negative' | 'neutral';

// Business Category Data
export interface BusinessCategoryData {
  id: string;
  name: string;
  description: string;
  categoryType: BusinessCategoryType;
  isFeatured: boolean;
  minStartupCost: number;
  maxStartupCost: number;
  avgMonthlyRevenue: number;
  riskLevel: RiskLevel;
  timeToProfitabilityMonths: number;
  failureRate: number;
  minCreditScore: number;
  requiredEducationId: string | null;
  minExperienceLevel: number;
  createdAt: string;
  updatedAt: string;
}

// User Business Data
export interface UserBusinessData {
  id: string;
  userId: string;
  businessName: string;
  categoryId: string;
  businessType: string;
  startupCost: number;
  currentFunding: number;
  fundingGoal: number;
  totalStartupCost: number;
  ownershipPercentage: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  monthlyProfit: number;
  businessStage: BusinessStage;
  employeeCount: number;
  creditScoreImpact: number;
  reputationScore: number;
  location: string;
  foundedAt: string;
  operationalDate: string | null;
  lastProfitUpdate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  categoryData?: BusinessCategoryData;
  investments?: BusinessInvestmentData[];
  expenses?: BusinessExpenseData[];
  revenues?: BusinessRevenueData[];
  activeEvents?: BusinessEventData[];
}

// Business Investment Data
export interface BusinessInvestmentData {
  id: string;
  businessId: string;
  investorUserId: string;
  investmentAmount: number;
  ownershipPercentage: number;
  investmentDate: string;
  totalReturnReceived: number;
  expectedRoiPercentage: number;
  status: InvestmentStatus;
  createdAt: string;
  updatedAt: string;
}

// Investment Pool Data
export interface InvestmentPoolData {
  id: string;
  businessId: string;
  poolName: string;
  fundingGoal: number;
  currentAmount: number;
  minInvestment: number;
  maxInvestors: number;
  currentInvestorCount: number;
  expectedRoiPercentage: number;
  estimatedBreakEvenMonths: number;
  riskLevel: RiskLevel;
  description: string;
  businessPlan: string;
  financialProjections: string;
  status: PoolStatus;
  deadline: string;
  createdAt: string;
  updatedAt: string;
  contributions?: PoolContributionData[];
  businessData?: UserBusinessData;
}

// Pool Contribution Data
export interface PoolContributionData {
  id: string;
  poolId: string;
  investorUserId: string;
  contributionAmount: number;
  ownershipPercentage: number;
  contributionDate: string;
  totalReturnReceived: number;
  status: ContributionStatus;
  createdAt: string;
  updatedAt: string;
}

// Business Expense Data
export interface BusinessExpenseData {
  id: string;
  businessId: string;
  expenseCategory: string;
  amount: number;
  description: string;
  isRecurring: boolean;
  recurrencePeriod: RecurrencePeriod;
  dueDate: string | null;
  isPaid: boolean;
  paidDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// Business Revenue Data
export interface BusinessRevenueData {
  id: string;
  businessId: string;
  revenueCategory: string;
  amount: number;
  description: string;
  isRecurring: boolean;
  recurrencePeriod: RecurrencePeriod;
  expectedDate: string;
  actualDate: string | null;
  isCollected: boolean;
  createdAt: string;
  updatedAt: string;
}

// Business Event Data
export interface BusinessEventData {
  id: string;
  businessId: string;
  eventType: BusinessEventType;
  eventTitle: string;
  eventDescription: string;
  impactType: ImpactType;
  revenueImpact: number;
  expenseImpact: number;
  reputationImpact: number;
  employeeImpact: number;
  isActive: boolean;
  eventStartDate: string;
  eventEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// Business Achievement Data
export interface BusinessAchievementData {
  id: string;
  userId: string;
  businessId: string;
  achievementType: string;
  achievementTitle: string;
  achievementDescription: string;
  achievementDate: string;
  rewardAmount: number;
  rewardType: string;
  iconPath: string | null;
  createdAt: string;
}

// Business Loan Data
export interface BusinessLoanData {
  id: string;
  businessId: string;
  lenderUserId: string | null;
  loanAmount: number;
  interestRate: number;
  loanTermMonths: number;
  monthlyPayment: number;
  remainingBalance: number;
  startDate: string;
  endDate: string;
  nextPaymentDate: string;
  missedPayments: number;
  status: LoanStatus;
  createdAt: string;
  updatedAt: string;
}

// Business Leaderboard Data
export interface BusinessLeaderboardData {
  id: string;
  businessId: string;
  userId: string;
  businessName: string;
  categoryName: string;
  totalRevenue: number;
  totalProfit: number;
  investorCount: number;
  monthsOperational: number;
  reputationScore: number;
  rank: number;
  period: LeaderboardPeriod;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
}

// Request Types
export interface BusinessStartupRequest {
  userId: string;
  categoryId: string;
  businessName: string;
  businessType: string;
  location: string;
  startupCost: number;
  fundingGoal: number;
  usePersonalFunds: boolean;
  createInvestmentPool: boolean;
  poolMinInvestment: number;
  poolMaxInvestors: number;
  businessPlan: string;
}

export interface InvestmentPoolRequest {
  businessId: string;
  poolName: string;
  fundingGoal: number;
  minInvestment: number;
  maxInvestors: number;
  expectedRoiPercentage: number;
  estimatedBreakEvenMonths: number;
  description: string;
  businessPlan: string;
  deadline: string;
}

export interface ContributionRequest {
  poolId: string;
  amount: number;
  userId: string;
}

// Result Types
export interface BusinessOperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: BusinessErrorCode;
}

export type BusinessErrorCode =
  | 'INSUFFICIENT_FUNDS'
  | 'BUSINESS_NOT_FOUND'
  | 'CATEGORY_NOT_FOUND'
  | 'POOL_NOT_FOUND'
  | 'POOL_NOT_OPEN'
  | 'POOL_FULL'
  | 'MINIMUM_INVESTMENT_NOT_MET'
  | 'CREDIT_SCORE_TOO_LOW'
  | 'EDUCATION_REQUIREMENT_NOT_MET'
  | 'EXPERIENCE_REQUIREMENT_NOT_MET'
  | 'NETWORK_ERROR'
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'ALREADY_INVESTED'
  | 'CANNOT_INVEST_OWN_BUSINESS'
  | 'DATABASE_ERROR'
  | 'EXCEPTION'
  | 'BELOW_MINIMUM_INVESTMENT'
  | 'MAX_INVESTORS_REACHED'
  | 'FUNDING_GOAL_REACHED'
  | 'INVALID_USER_ID';

// Manager State Types
export interface BusinessManagerState {
  isLoading: boolean;
  isInitialized: boolean;
  businessCategories: Record<string, BusinessCategoryData>;
  userBusinesses: Record<string, UserBusinessData>;
  investmentPools: Record<string, InvestmentPoolData>;
  lastSyncTime: string | null;
  errorMessage: string | null;
}

export interface BusinessManagerEvents {
  onBusinessCreated: (business: UserBusinessData) => void;
  onBusinessUpdated: (business: UserBusinessData) => void;
  onBusinessStageChanged: (businessId: string, newStage: BusinessStage) => void;
  onPoolCreated: (pool: InvestmentPoolData) => void;
  onPoolUpdated: (pool: InvestmentPoolData) => void;
  onContributionMade: (poolId: string, contribution: PoolContributionData) => void;
  onProfitsDistributed: (businessId: string, totalProfit: number) => void;
  onAchievementUnlocked: (achievement: BusinessAchievementData) => void;
  onError: (error: string, errorCode?: BusinessErrorCode) => void;
}

export interface BusinessManager {
  state: BusinessManagerState;
  events: Partial<BusinessManagerEvents>;

  initialize: () => Promise<BusinessOperationResult>;
  dispose: () => void;

  getAllBusinessCategories: () => Promise<BusinessOperationResult<BusinessCategoryData[]>>;
  getFeaturedCategories: () => Promise<BusinessOperationResult<BusinessCategoryData[]>>;
  getCategoryById: (categoryId: string) => BusinessCategoryData | null;

  createBusiness: (request: BusinessStartupRequest) => Promise<BusinessOperationResult<UserBusinessData>>;
  getUserBusinesses: (userId: string) => Promise<BusinessOperationResult<UserBusinessData[]>>;
  getBusinessById: (businessId: string) => Promise<BusinessOperationResult<UserBusinessData>>;
  updateBusinessStage: (businessId: string, newStage: BusinessStage) => Promise<BusinessOperationResult<boolean>>;

  createInvestmentPool: (request: InvestmentPoolRequest) => Promise<BusinessOperationResult<InvestmentPoolData>>;
  getOpenInvestmentPools: (limit?: number, offset?: number) => Promise<BusinessOperationResult<InvestmentPoolData[]>>;
  getInvestmentPoolById: (poolId: string) => Promise<BusinessOperationResult<InvestmentPoolData>>;
  contributeToPool: (request: ContributionRequest) => Promise<BusinessOperationResult<boolean>>;

  canStartBusiness: (userId: string, categoryId: string) => boolean;
  canInvestInPool: (userId: string, poolId: string) => boolean;
  validateBusinessQualifications: (categoryId: string, userId: string) => boolean;

  processMonthlyBusinessCycle: () => Promise<BusinessOperationResult<boolean>>;
  getBusinessLeaderboard: (period: LeaderboardPeriod, limit?: number) => Promise<BusinessOperationResult<BusinessLeaderboardData[]>>;
}

// Computed Properties Helper Functions
export function getInvestmentRemainingAmount(investment: BusinessInvestmentData): number {
  return investment.investmentAmount - investment.totalReturnReceived;
}

export function getPoolFundingPercentage(pool: InvestmentPoolData): number {
  return pool.fundingGoal > 0 ? (pool.currentAmount / pool.fundingGoal) * 100 : 0;
}

export function getPoolRemainingInvestorSlots(pool: InvestmentPoolData): number {
  return pool.maxInvestors - pool.currentInvestorCount;
}

export function isPoolOpen(pool: InvestmentPoolData): boolean {
  return pool.status === 'open' && new Date() < new Date(pool.deadline);
}

export function getContributionRemainingReturn(contribution: PoolContributionData): number {
  return contribution.contributionAmount - contribution.totalReturnReceived;
}

// Factory Functions
export function createEmptyBusinessManagerState(): BusinessManagerState {
  return {
    isLoading: false,
    isInitialized: false,
    businessCategories: {},
    userBusinesses: {},
    investmentPools: {},
    lastSyncTime: null,
    errorMessage: null,
  };
}

export function createDefaultUserBusinessData(
  userId: string,
  categoryId: string,
  businessName: string
): Partial<UserBusinessData> {
  return {
    userId,
    categoryId,
    businessName,
    startupCost: 0,
    currentFunding: 0,
    fundingGoal: 0,
    totalStartupCost: 0,
    ownershipPercentage: 100,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    monthlyProfit: 0,
    businessStage: 'planning',
    employeeCount: 0,
    creditScoreImpact: 0,
    reputationScore: 50,
    isActive: true,
  };
}

export function createDefaultInvestmentPoolData(
  businessId: string,
  poolName: string
): Partial<InvestmentPoolData> {
  return {
    businessId,
    poolName,
    fundingGoal: 0,
    currentAmount: 0,
    minInvestment: 0,
    maxInvestors: 10,
    currentInvestorCount: 0,
    expectedRoiPercentage: 15,
    estimatedBreakEvenMonths: 12,
    riskLevel: 'medium',
    description: '',
    businessPlan: '',
    financialProjections: '{}',
    status: 'open',
  };
}

// Validation Functions
export function validateBusinessStartupRequest(request: BusinessStartupRequest): BusinessOperationResult {
  if (!request.businessName || request.businessName.trim().length === 0) {
    return { success: false, error: 'Business name is required', errorCode: 'VALIDATION_ERROR' };
  }

  if (!request.categoryId) {
    return { success: false, error: 'Category is required', errorCode: 'VALIDATION_ERROR' };
  }

  if (request.startupCost < 0) {
    return { success: false, error: 'Startup cost cannot be negative', errorCode: 'VALIDATION_ERROR' };
  }

  if (request.createInvestmentPool && request.poolMinInvestment <= 0) {
    return { success: false, error: 'Minimum investment must be greater than 0', errorCode: 'VALIDATION_ERROR' };
  }

  return { success: true };
}

export function validateContributionRequest(
  request: ContributionRequest,
  pool: InvestmentPoolData,
  availableFunds: number
): BusinessOperationResult {
  if (!isPoolOpen(pool)) {
    return { success: false, error: 'Pool is not open for contributions', errorCode: 'POOL_NOT_OPEN' };
  }

  if (request.amount < pool.minInvestment) {
    return {
      success: false,
      error: `Minimum investment is $${pool.minInvestment.toLocaleString()}`,
      errorCode: 'MINIMUM_INVESTMENT_NOT_MET',
    };
  }

  if (pool.currentInvestorCount >= pool.maxInvestors) {
    return { success: false, error: 'Pool is at maximum investor capacity', errorCode: 'POOL_FULL' };
  }

  if (availableFunds < request.amount) {
    return { success: false, error: 'Insufficient funds', errorCode: 'INSUFFICIENT_FUNDS' };
  }

  return { success: true };
}

// Display Formatters
export function formatBusinessStage(stage: BusinessStage): string {
  switch (stage) {
    case 'planning':
      return 'Planning';
    case 'funding':
      return 'Seeking Funding';
    case 'operational':
      return 'Operational';
    case 'profitable':
      return 'Profitable';
    case 'struggling':
      return 'Struggling';
    case 'closed':
      return 'Closed';
    default:
      return 'Unknown';
  }
}

export function formatRiskLevel(risk: RiskLevel): string {
  switch (risk) {
    case 'low':
      return 'Low Risk';
    case 'medium':
      return 'Medium Risk';
    case 'high':
      return 'High Risk';
    case 'very_high':
      return 'Very High Risk';
    default:
      return 'Unknown';
  }
}

export function formatCategoryType(type: BusinessCategoryType): string {
  switch (type) {
    case 'retail':
      return 'Retail';
    case 'service':
      return 'Service';
    case 'manufacturing':
      return 'Manufacturing';
    case 'professional':
      return 'Professional';
    case 'technology':
      return 'Technology';
    case 'medical':
      return 'Medical';
    case 'financial':
      return 'Financial';
    case 'real_estate':
      return 'Real Estate';
    case 'other':
      return 'Other';
    default:
      return 'Unknown';
  }
}

export function formatPoolStatus(status: PoolStatus): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'funded':
      return 'Fully Funded';
    case 'closed':
      return 'Closed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

export function formatLeaderboardPeriod(period: LeaderboardPeriod): string {
  switch (period) {
    case 'monthly':
      return 'This Month';
    case 'quarterly':
      return 'This Quarter';
    case 'yearly':
      return 'This Year';
    case 'all_time':
      return 'All Time';
    default:
      return 'Unknown';
  }
}

export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Color Helpers
export function getRiskLevelColor(risk: RiskLevel): string {
  switch (risk) {
    case 'low':
      return '#22C55E';
    case 'medium':
      return '#F59E0B';
    case 'high':
      return '#EF4444';
    case 'very_high':
      return '#DC2626';
    default:
      return '#6B7280';
  }
}

export function getBusinessStageColor(stage: BusinessStage): string {
  switch (stage) {
    case 'planning':
      return '#6B7280';
    case 'funding':
      return '#3B82F6';
    case 'operational':
      return '#22C55E';
    case 'profitable':
      return '#10B981';
    case 'struggling':
      return '#F59E0B';
    case 'closed':
      return '#EF4444';
    default:
      return '#6B7280';
  }
}

export function getPoolStatusColor(status: PoolStatus): string {
  switch (status) {
    case 'open':
      return '#22C55E';
    case 'funded':
      return '#3B82F6';
    case 'closed':
      return '#6B7280';
    case 'cancelled':
      return '#EF4444';
    default:
      return '#6B7280';
  }
}

export function getCategoryTypeColor(type: BusinessCategoryType): string {
  switch (type) {
    case 'retail':
      return '#3B82F6';
    case 'service':
      return '#8B5CF6';
    case 'manufacturing':
      return '#78716C';
    case 'professional':
      return '#6366F1';
    case 'technology':
      return '#06B6D4';
    case 'medical':
      return '#EF4444';
    case 'financial':
      return '#8B5CF6';
    case 'real_estate':
      return '#10B981';
    case 'other':
      return '#6B7280';
    default:
      return '#6B7280';
  }
}

// Calculation Helpers
export function calculateOwnershipPercentage(
  investmentAmount: number,
  totalFundingGoal: number
): number {
  return totalFundingGoal > 0 ? (investmentAmount / totalFundingGoal) * 100 : 0;
}

export function calculateMonthlyProfit(
  monthlyRevenue: number,
  monthlyExpenses: number
): number {
  return monthlyRevenue - monthlyExpenses;
}

export function calculateROI(
  totalReturns: number,
  initialInvestment: number
): number {
  return initialInvestment > 0 ? ((totalReturns - initialInvestment) / initialInvestment) * 100 : 0;
}

export function calculateBreakEvenMonths(
  totalInvestment: number,
  monthlyProfit: number
): number {
  return monthlyProfit > 0 ? Math.ceil(totalInvestment / monthlyProfit) : Infinity;
}

export function estimateMonthlyRevenue(
  category: BusinessCategoryData,
  variancePercent: number = 0
): number {
  const baseRevenue = category.avgMonthlyRevenue;
  const variance = baseRevenue * (variancePercent / 100);
  return baseRevenue + variance;
}

export function estimateMonthlyExpenses(
  startupCost: number,
  expenseRatio: number = 0.05
): number {
  return startupCost * expenseRatio;
}

// UI Display Types
export interface BusinessCategoryCardData {
  category: BusinessCategoryData;
  displayName: string;
  costRange: string;
  avgRevenue: string;
  riskLabel: string;
  riskColor: string;
  profitTime: string;
  isFeatured: boolean;
}

export interface UserBusinessCardData {
  business: UserBusinessData;
  displayName: string;
  stage: string;
  stageColor: string;
  monthlyProfit: string;
  isProfitable: boolean;
  fundingProgress: number;
  ownershipDisplay: string;
}

export interface InvestmentPoolCardData {
  pool: InvestmentPoolData;
  displayName: string;
  fundingProgress: number;
  fundingProgressText: string;
  minInvestmentText: string;
  expectedRoiText: string;
  deadlineText: string;
  investorCountText: string;
  riskLabel: string;
  riskColor: string;
  statusLabel: string;
  statusColor: string;
  isOpen: boolean;
}

export function createBusinessCategoryCardData(
  category: BusinessCategoryData
): BusinessCategoryCardData {
  return {
    category,
    displayName: category.name,
    costRange: `${formatCurrency(category.minStartupCost)} - ${formatCurrency(category.maxStartupCost)}`,
    avgRevenue: `${formatCurrency(category.avgMonthlyRevenue)}/mo`,
    riskLabel: formatRiskLevel(category.riskLevel),
    riskColor: getRiskLevelColor(category.riskLevel),
    profitTime: `${category.timeToProfitabilityMonths} months to profit`,
    isFeatured: category.isFeatured,
  };
}

export function createUserBusinessCardData(
  business: UserBusinessData
): UserBusinessCardData {
  const fundingProgress =
    business.fundingGoal > 0
      ? (business.currentFunding / business.fundingGoal) * 100
      : 100;

  return {
    business,
    displayName: business.businessName,
    stage: formatBusinessStage(business.businessStage),
    stageColor: getBusinessStageColor(business.businessStage),
    monthlyProfit: formatCurrency(business.monthlyProfit),
    isProfitable: business.monthlyProfit > 0,
    fundingProgress,
    ownershipDisplay: `${business.ownershipPercentage.toFixed(1)}% ownership`,
  };
}

export function createInvestmentPoolCardData(
  pool: InvestmentPoolData
): InvestmentPoolCardData {
  const fundingProgress = getPoolFundingPercentage(pool);
  const deadline = new Date(pool.deadline);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    pool,
    displayName: pool.poolName,
    fundingProgress,
    fundingProgressText: `${formatCurrency(pool.currentAmount)} of ${formatCurrency(pool.fundingGoal)}`,
    minInvestmentText: `Min: ${formatCurrency(pool.minInvestment)}`,
    expectedRoiText: `${pool.expectedRoiPercentage}% expected ROI`,
    deadlineText: daysRemaining > 0 ? `${daysRemaining} days left` : 'Deadline passed',
    investorCountText: `${pool.currentInvestorCount}/${pool.maxInvestors} investors`,
    riskLabel: formatRiskLevel(pool.riskLevel),
    riskColor: getRiskLevelColor(pool.riskLevel),
    statusLabel: formatPoolStatus(pool.status),
    statusColor: getPoolStatusColor(pool.status),
    isOpen: isPoolOpen(pool),
  };
}

// Achievement Types
export type BusinessAchievementType =
  | 'first_business'
  | 'profitable_month'
  | 'hundred_investors'
  | 'million_dollar_revenue'
  | 'five_years_operational'
  | 'expansion'
  | 'industry_leader';

export const BUSINESS_ACHIEVEMENT_TITLES: Record<BusinessAchievementType, string> = {
  first_business: 'Entrepreneur',
  profitable_month: 'In the Black',
  hundred_investors: 'Crowd Favorite',
  million_dollar_revenue: 'Millionaire Maker',
  five_years_operational: 'Established Business',
  expansion: 'Growing Empire',
  industry_leader: 'Industry Leader',
};

export const BUSINESS_ACHIEVEMENT_DESCRIPTIONS: Record<BusinessAchievementType, string> = {
  first_business: 'Started your first business',
  profitable_month: 'Had your first profitable month',
  hundred_investors: 'Attracted 100 investors across all businesses',
  million_dollar_revenue: 'Generated $1,000,000 in total revenue',
  five_years_operational: 'Kept a business running for 5 years',
  expansion: 'Opened multiple locations or businesses',
  industry_leader: 'Reached #1 on the leaderboard',
};

// Expense Categories
export const EXPENSE_CATEGORIES = [
  'rent',
  'utilities',
  'inventory',
  'payroll',
  'marketing',
  'insurance',
  'taxes',
  'maintenance',
  'other',
] as const;

export type ExpenseCategoryType = (typeof EXPENSE_CATEGORIES)[number];

export function getExpenseCategoryLabel(category: ExpenseCategoryType): string {
  switch (category) {
    case 'rent':
      return 'Rent';
    case 'utilities':
      return 'Utilities';
    case 'inventory':
      return 'Inventory';
    case 'payroll':
      return 'Payroll';
    case 'marketing':
      return 'Marketing';
    case 'insurance':
      return 'Insurance';
    case 'taxes':
      return 'Taxes';
    case 'maintenance':
      return 'Maintenance';
    case 'other':
      return 'Other';
    default:
      return 'Unknown';
  }
}

export function getExpenseCategoryIcon(category: ExpenseCategoryType): string {
  switch (category) {
    case 'rent':
      return 'Building2';
    case 'utilities':
      return 'Zap';
    case 'inventory':
      return 'Package';
    case 'payroll':
      return 'Users';
    case 'marketing':
      return 'Megaphone';
    case 'insurance':
      return 'Shield';
    case 'taxes':
      return 'Receipt';
    case 'maintenance':
      return 'Wrench';
    case 'other':
      return 'MoreHorizontal';
    default:
      return 'Circle';
  }
}

// =============================================
// Business Selection UI Types
// =============================================

export interface BusinessSelectionFormData {
  businessName: string;
  businessType: string;
  location: string;
  startupCost: string;
  usePersonalFunds: boolean;
  createInvestmentPool: boolean;
  poolMinInvestment: string;
  poolMaxInvestors: string;
  businessPlan: string;
}

export interface BusinessSelectionFormErrors {
  businessName?: string;
  businessType?: string;
  location?: string;
  startupCost?: string;
  poolMinInvestment?: string;
  poolMaxInvestors?: string;
  businessPlan?: string;
  general?: string;
}

export interface BusinessSelectionUIState {
  selectedCategory: BusinessCategoryData | null;
  allCategories: BusinessCategoryData[];
  featuredCategories: BusinessCategoryData[];
  formData: BusinessSelectionFormData;
  formErrors: BusinessSelectionFormErrors;
  isLoading: boolean;
  isSubmitting: boolean;
  isValid: boolean;
}

export interface BusinessCategoryCardProps {
  category: BusinessCategoryData;
  isSelected: boolean;
  onSelect: (category: BusinessCategoryData) => void;
  showFeaturedBadge?: boolean;
}

export interface BusinessSelectionUIProps {
  visible: boolean;
  onClose: () => void;
  onBusinessCreated?: (business: UserBusinessData) => void;
  userId: string;
  availableFunds?: number;
  userCreditScore?: number;
}

export interface CategoryDetailsDisplayData {
  estimatedStartupCost: string;
  avgMonthlyRevenue: string;
  riskLevel: string;
  riskColor: string;
  timeToProfitability: string;
  requirements: CategoryRequirements;
}

export interface CategoryRequirements {
  minCreditScore: number;
  hasEducationRequirement: boolean;
  educationDescription?: string;
  minExperienceLevel: number;
  meetsAllRequirements: boolean;
}

export interface RiskColorConfig {
  low: string;
  medium: string;
  high: string;
  very_high: string;
}

export const DEFAULT_RISK_COLORS: RiskColorConfig = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#EF4444',
  very_high: '#DC2626',
};

export const POOL_CONSTRAINTS = {
  minInvestment: 100,
  maxInvestment: 1000000,
  minInvestors: 2,
  maxInvestors: 20,
  defaultMinInvestment: 500,
  defaultMaxInvestors: 10,
} as const;

export function createDefaultBusinessSelectionFormData(): BusinessSelectionFormData {
  return {
    businessName: '',
    businessType: '',
    location: '',
    startupCost: '',
    usePersonalFunds: false,
    createInvestmentPool: false,
    poolMinInvestment: POOL_CONSTRAINTS.defaultMinInvestment.toString(),
    poolMaxInvestors: POOL_CONSTRAINTS.defaultMaxInvestors.toString(),
    businessPlan: '',
  };
}

export function createDefaultBusinessSelectionUIState(): BusinessSelectionUIState {
  return {
    selectedCategory: null,
    allCategories: [],
    featuredCategories: [],
    formData: createDefaultBusinessSelectionFormData(),
    formErrors: {},
    isLoading: true,
    isSubmitting: false,
    isValid: false,
  };
}

export function validateBusinessSelectionForm(
  formData: BusinessSelectionFormData,
  selectedCategory: BusinessCategoryData | null
): BusinessSelectionFormErrors {
  const errors: BusinessSelectionFormErrors = {};

  if (!formData.businessName.trim()) {
    errors.businessName = 'Business name is required';
  } else if (formData.businessName.length < 2) {
    errors.businessName = 'Business name must be at least 2 characters';
  } else if (formData.businessName.length > 100) {
    errors.businessName = 'Business name must be less than 100 characters';
  }

  if (!formData.location.trim()) {
    errors.location = 'Location is required';
  }

  const startupCost = parseFloat(formData.startupCost.replace(/,/g, ''));
  if (isNaN(startupCost) || startupCost <= 0) {
    errors.startupCost = 'Valid startup cost is required';
  } else if (selectedCategory) {
    if (startupCost < selectedCategory.minStartupCost) {
      errors.startupCost = `Minimum startup cost is ${formatCurrency(selectedCategory.minStartupCost)}`;
    } else if (startupCost > selectedCategory.maxStartupCost) {
      errors.startupCost = `Maximum startup cost is ${formatCurrency(selectedCategory.maxStartupCost)}`;
    }
  }

  if (formData.createInvestmentPool) {
    const minInvestment = parseFloat(formData.poolMinInvestment.replace(/,/g, ''));
    if (isNaN(minInvestment) || minInvestment < POOL_CONSTRAINTS.minInvestment) {
      errors.poolMinInvestment = `Minimum investment must be at least ${formatCurrency(POOL_CONSTRAINTS.minInvestment)}`;
    }

    const maxInvestors = parseInt(formData.poolMaxInvestors, 10);
    if (isNaN(maxInvestors) || maxInvestors < POOL_CONSTRAINTS.minInvestors) {
      errors.poolMaxInvestors = `Must have at least ${POOL_CONSTRAINTS.minInvestors} investors`;
    } else if (maxInvestors > POOL_CONSTRAINTS.maxInvestors) {
      errors.poolMaxInvestors = `Cannot exceed ${POOL_CONSTRAINTS.maxInvestors} investors`;
    }
  }

  return errors;
}

export function isBusinessSelectionFormValid(
  formData: BusinessSelectionFormData,
  selectedCategory: BusinessCategoryData | null
): boolean {
  if (!selectedCategory) return false;
  const errors = validateBusinessSelectionForm(formData, selectedCategory);
  return Object.keys(errors).length === 0;
}

export function createCategoryDetailsDisplayData(
  category: BusinessCategoryData,
  userCreditScore?: number,
  hasRequiredEducation?: boolean
): CategoryDetailsDisplayData {
  const meetsCredit = userCreditScore ? userCreditScore >= category.minCreditScore : false;
  const meetsEducation = category.requiredEducationId ? (hasRequiredEducation ?? false) : true;

  return {
    estimatedStartupCost: `${formatCurrency(category.minStartupCost)} - ${formatCurrency(category.maxStartupCost)}`,
    avgMonthlyRevenue: `${formatCurrency(category.avgMonthlyRevenue)}/month`,
    riskLevel: formatRiskLevel(category.riskLevel),
    riskColor: getRiskLevelColor(category.riskLevel),
    timeToProfitability: `${category.timeToProfitabilityMonths} months`,
    requirements: {
      minCreditScore: category.minCreditScore,
      hasEducationRequirement: !!category.requiredEducationId,
      educationDescription: category.requiredEducationId ? 'Required degree/certification' : undefined,
      minExperienceLevel: category.minExperienceLevel,
      meetsAllRequirements: meetsCredit && meetsEducation,
    },
  };
}

export function buildBusinessStartupRequestFromForm(
  formData: BusinessSelectionFormData,
  categoryId: string,
  userId: string
): BusinessStartupRequest {
  const startupCost = parseFloat(formData.startupCost.replace(/,/g, '')) || 0;
  const poolMinInvestment = parseFloat(formData.poolMinInvestment.replace(/,/g, '')) || POOL_CONSTRAINTS.defaultMinInvestment;
  const poolMaxInvestors = parseInt(formData.poolMaxInvestors, 10) || POOL_CONSTRAINTS.defaultMaxInvestors;

  return {
    userId,
    categoryId,
    businessName: formData.businessName.trim(),
    businessType: formData.businessType.trim(),
    location: formData.location.trim(),
    startupCost,
    fundingGoal: formData.usePersonalFunds ? 0 : startupCost,
    usePersonalFunds: formData.usePersonalFunds,
    createInvestmentPool: formData.createInvestmentPool,
    poolMinInvestment: formData.createInvestmentPool ? poolMinInvestment : POOL_CONSTRAINTS.defaultMinInvestment,
    poolMaxInvestors: formData.createInvestmentPool ? poolMaxInvestors : POOL_CONSTRAINTS.defaultMaxInvestors,
    businessPlan: formData.businessPlan.trim(),
  };
}

// Featured Category Icons
export function getCategoryIcon(categoryType: BusinessCategoryType): string {
  switch (categoryType) {
    case 'retail':
      return 'Store';
    case 'service':
      return 'Wrench';
    case 'manufacturing':
      return 'Factory';
    case 'professional':
      return 'Briefcase';
    case 'technology':
      return 'Laptop';
    case 'medical':
      return 'Stethoscope';
    case 'financial':
      return 'TrendingUp';
    case 'real_estate':
      return 'Building';
    case 'other':
      return 'MoreHorizontal';
    default:
      return 'Building2';
  }
}
