export interface CourseSection {
  id: string;
  title: string;
  steps: number;
  completed?: number;
  icon?: string;
}

export interface Video {
  id: string;
  courseId: string;
  sectionId: string;
  title: string;
  url: string;
  bunnyVideoId?: string;
  bunnyLibraryId?: string;
  duration?: string;
  order: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  courseId: string;
  sectionId: string;
  title: string;
  url: string;
  type: "pdf" | "form" | "other";
  description?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  fullDescription?: string;
  duration: string;
  lessons: number;
  price: number;
  certificationFee?: number;
  freeTrialDays?: number;
  monthlyInstallment?: number;
  installmentMonths?: number;
  renewalFee?: number;
  limitedTimeOffer?: boolean;
  image: string;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  enrolled: boolean;
  progress?: number;
  sections?: CourseSection[];
  features?: string[];
  learningObjectives?: string[];
  comingSoon?: boolean;
  isBundle?: boolean;
  bundleIncludes?: string[];
  includesCertificates?: boolean;
  csoEligible?: boolean;
  noPaymentPlan?: boolean;
  isFree?: boolean;
  autoDebitOnly?: boolean;
  autoDebitLockoutPolicy?: string;
  requiresCompletedCourses?: string[];
  requiresCompletedCoursesNames?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar: string;
  memberSince: string;
  role: "Student" | "CSO" | "Affiliate";
  coursesCompleted: number;
  totalEarnings: number;
  referrals: number;
  driversLicenseNumber?: string;
  driversLicenseState?: string;
}

export interface EarningRecord {
  id: string;
  type: "referral" | "commission" | "residual" | "coaching";
  amount: number;
  date: string;
  description: string;
  status: "pending" | "completed";
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: "course" | "earning" | "system";
}

export interface Stat {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
}

export interface CSOProvider {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  avatar: string;
  bio: string;
  specialties: string[];
  yearsExperience: number;
  location: string;
  rating: number;
  reviewCount: number;
  consultationFee: number;
  isAvailable: boolean;
  certifiedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CSOReview {
  id: string;
  providerId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Consultation {
  id: string;
  providerId: string;
  providerName: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  platformFee: number;
  providerPayout: number;
  status: "pending" | "paid" | "completed" | "refunded";
  paymentDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionTier = "free" | "ace1_student" | "cso_affiliate";

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: "active" | "cancelled" | "expired" | "pending";
  monthlyFee: number;
  startDate: string;
  endDate?: string;
  initialRegistrationDate?: string;
  initialRegistrationExpiry?: string;
  autoRenew: boolean;
  referredBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  lastPayoutDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  userId: string;
  type: "referral_bonus" | "residual_income" | "commission" | "payout" | "consultation";
  amount: number;
  status: "pending" | "completed" | "cancelled";
  description: string;
  referenceId?: string;
  referenceType?: "subscription" | "sale" | "consultation";
  createdAt: string;
  processedAt?: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  referredUserName: string;
  referredUserEmail: string;
  referralType: "ace1_student" | "cso_affiliate" | "sale";
  status: "pending" | "active" | "cancelled";
  commissionRate: number;
  totalEarned: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralEarning {
  id: string;
  referralId: string;
  referrerId: string;
  amount: number;
  type: "signup_bonus" | "residual" | "commission";
  month?: string;
  status: "pending" | "processed" | "paid";
  createdAt: string;
  processedAt?: string;
}

export interface CreditTip {
  id: string;
  title: string;
  content: string;
  category: "repair" | "building" | "management" | "legal" | "business" | "identity";
  publishDate: string;
  expiryDate?: string;
  isActive: boolean;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  summary: string;
  content: string;
  url: string;
  category: "repair" | "building" | "management" | "legal" | "business" | "identity";
  publishDate: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface PayoutRequest {
  id: string;
  userId: string;
  walletId: string;
  amount: number;
  status: "pending" | "processing" | "completed" | "rejected";
  paymentMethod: "bank_transfer" | "paypal" | "check";
  paymentDetails?: string;
  requestedAt: string;
  processedAt?: string;
  notes?: string;
}
