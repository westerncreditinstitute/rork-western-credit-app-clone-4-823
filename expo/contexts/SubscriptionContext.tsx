import { useEffect, useState, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export type SubscriptionTier = 'free' | 'ace1_student' | 'cso_affiliate';

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  price: number;
  features: string[];
  referralBonus?: string;
  residualRate?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  monthlyFee: number;
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
}

const getStorageKey = (baseKey: string, userId?: string) => {
  if (userId) {
    return `${baseKey}_${userId}`;
  }
  return baseKey;
};

const SUBSCRIPTION_STORAGE_KEY = 'wci_subscription_tier';
const SUBSCRIPTION_EXPIRY_KEY = 'wci_subscription_expiry';
const CSO_CERTIFIED_KEY = 'wci_cso_certified';
const COURSES_COMPLETED_KEY = 'wci_courses_completed';
const ENROLLED_COURSES_KEY = 'wci_enrolled_courses';
const COURSE_PROGRESS_KEY = 'wci_course_progress';

const PAID_COURSE_IDS = ['3', '4', '5', '9'];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      'Weekly credit tips',
      'Community forum access',
      'Basic resources',
    ],
  },
  {
    id: 'ace1_student',
    name: 'ACE-1 Student',
    price: 25,
    features: [
      'Full course access',
      'AI Credit Coach (60 days)',
      'AI Dispute Assistant',
      'Cloud dispute tracker',
      '$25 per ACE-1 referral',
      'Certificate of completion',
    ],
    referralBonus: '$25 per referral',
  },
  {
    id: 'cso_affiliate',
    name: 'CSO Affiliate',
    price: 49.99,
    features: [
      'Everything in ACE-1 Student',
      'All ACE courses included',
      '50-75% residual income',
      '20% sales commission',
      'Listed in Hire A Pro',
      'Priority support',
      'CSO certification path',
    ],
    referralBonus: '$25 + residual',
    residualRate: '50-75%',
  },
];

const TOTAL_COURSES = 4;

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const auth = useAuth();
  
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isCSOCertified, setIsCSOCertified] = useState(false);
  const [completedCourses, setCompletedCourses] = useState<string[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);
  const [courseProgress, setCourseProgress] = useState<Record<string, number>>({});
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  const authUser = auth?.user ?? null;
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const userId = authUser?.id || null;

  const utils = trpc.useUtils();

  const subscriptionQuery = trpc.subscriptions.getByUserId.useQuery(
    { userId: userId || '' },
    { enabled: !!userId, retry: 1, staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: true }
  );

  const progressQuery = trpc.progress.getAllByUser.useQuery(
    { userId: userId || '' },
    { enabled: !!userId, retry: 1, staleTime: 30 * 1000 }
  );

  const enrollMutation = trpc.progress.enroll.useMutation();
  const createSubscriptionMutation = trpc.subscriptions.create.useMutation();

  // Unified data loading - handles user changes and initial load
  useEffect(() => {
    const loadData = async () => {
      const userChanged = lastUserId !== userId;
      
      if (userChanged) {
        console.log('[Subscription] User changed from', lastUserId, 'to', userId);
        if (lastUserId !== null) {
          setEnrolledCourses([]);
          setCourseProgress({});
          setCompletedCourses([]);
          setTier('free');
          setExpiryDate(null);
          setIsExpired(false);
          setIsCSOCertified(false);
          setSubscription(null);
        }
        setLastUserId(userId);
      }

      setIsLoading(true);
      
      try {
        const tierKey = getStorageKey(SUBSCRIPTION_STORAGE_KEY, userId || undefined);
        const expiryKey = getStorageKey(SUBSCRIPTION_EXPIRY_KEY, userId || undefined);
        const csoKey = getStorageKey(CSO_CERTIFIED_KEY, userId || undefined);
        const coursesKey = getStorageKey(COURSES_COMPLETED_KEY, userId || undefined);
        const enrolledKey = getStorageKey(ENROLLED_COURSES_KEY, userId || undefined);
        const progressKey = getStorageKey(COURSE_PROGRESS_KEY, userId || undefined);

        const [stored, storedExpiry, storedCSOCert, storedCourses, storedEnrolled, storedProgress] = await Promise.all([
          AsyncStorage.getItem(tierKey),
          AsyncStorage.getItem(expiryKey),
          AsyncStorage.getItem(csoKey),
          AsyncStorage.getItem(coursesKey),
          AsyncStorage.getItem(enrolledKey),
          AsyncStorage.getItem(progressKey),
        ]);

        if (stored && ['free', 'ace1_student', 'cso_affiliate'].includes(stored)) {
          setTier(stored as SubscriptionTier);
        }

        if (storedExpiry) {
          const expiry = new Date(storedExpiry);
          setExpiryDate(expiry);
          setIsExpired(expiry < new Date());
        }

        if (storedCSOCert === 'true') {
          setIsCSOCertified(true);
        }

        if (storedCourses) {
          try {
            const parsed = JSON.parse(storedCourses);
            if (Array.isArray(parsed)) setCompletedCourses(parsed);
          } catch { /* ignore */ }
        }

        if (storedEnrolled) {
          try {
            const parsed = JSON.parse(storedEnrolled);
            if (Array.isArray(parsed)) setEnrolledCourses(parsed);
          } catch { /* ignore */ }
        }

        if (storedProgress) {
          try {
            const parsed = JSON.parse(storedProgress);
            if (typeof parsed === 'object') setCourseProgress(parsed);
          } catch { /* ignore */ }
        }
      } catch (error) {
        console.log('[Subscription] Error loading from storage:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [userId, lastUserId]);

  // Sync from database when authenticated - database is source of truth
  useEffect(() => {
    if (!userId || subscriptionQuery.isLoading || progressQuery.isLoading) return;
    if (createSubscriptionMutation.isPending || enrollMutation.isPending) return;

    // Sync subscription from database
    if (subscriptionQuery.data) {
      const data = subscriptionQuery.data as Subscription;
      console.log('[Subscription] Syncing from database:', data.tier, data.status);
      setSubscription(data);
      
      if (data.status === 'active') {
        setTier(data.tier);
        const tierKey = getStorageKey(SUBSCRIPTION_STORAGE_KEY, userId);
        AsyncStorage.setItem(tierKey, data.tier).catch(console.error);
        
        const expiryDate = data.endDate || (data as any).initialRegistrationExpiry;
        if (expiryDate) {
          const expiry = new Date(expiryDate);
          setExpiryDate(expiry);
          setIsExpired(expiry < new Date());
          const expiryKey = getStorageKey(SUBSCRIPTION_EXPIRY_KEY, userId);
          AsyncStorage.setItem(expiryKey, expiry.toISOString()).catch(console.error);
        }
      }
    }

    // Sync enrollments from database
    if (progressQuery.data && Array.isArray(progressQuery.data)) {
      const dbEnrollments = progressQuery.data
        .filter((p: { enrolled?: boolean }) => p.enrolled)
        .map((p: { courseId: string }) => p.courseId);
      
      const dbProgress: Record<string, number> = {};
      progressQuery.data.forEach((p: { courseId: string; overallProgress?: number }) => {
        if (p.overallProgress !== undefined) {
          dbProgress[p.courseId] = p.overallProgress;
        }
      });

      if (dbEnrollments.length > 0) {
        setEnrolledCourses(prev => {
          const merged = [...new Set([...dbEnrollments, ...prev])];
          const enrolledKey = getStorageKey(ENROLLED_COURSES_KEY, userId);
          AsyncStorage.setItem(enrolledKey, JSON.stringify(merged)).catch(console.error);
          return merged;
        });
        
        setCourseProgress(prev => {
          const merged = { ...dbProgress, ...prev };
          const progressKey = getStorageKey(COURSE_PROGRESS_KEY, userId);
          AsyncStorage.setItem(progressKey, JSON.stringify(merged)).catch(console.error);
          return merged;
        });
      }
    }
  }, [
    userId,
    subscriptionQuery.data,
    subscriptionQuery.isLoading,
    progressQuery.data,
    progressQuery.isLoading,
    createSubscriptionMutation.isPending,
    enrollMutation.isPending,
  ]);

  const updateTier = useCallback(async (newTier: SubscriptionTier, durationDays?: number) => {
    try {
      setTier(newTier);
      const tierKey = getStorageKey(SUBSCRIPTION_STORAGE_KEY, userId || undefined);
      await AsyncStorage.setItem(tierKey, newTier);
      
      if (durationDays && newTier !== 'free') {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + durationDays);
        setExpiryDate(expiry);
        setIsExpired(false);
        const expiryKey = getStorageKey(SUBSCRIPTION_EXPIRY_KEY, userId || undefined);
        await AsyncStorage.setItem(expiryKey, expiry.toISOString());
      }
    } catch (error) {
      console.log('Error saving subscription tier:', error);
    }
  }, [userId]);

  const renewSubscription = useCallback(async () => {
    try {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      setExpiryDate(expiry);
      setIsExpired(false);
      setTier('ace1_student');
      const tierKey = getStorageKey(SUBSCRIPTION_STORAGE_KEY, userId || undefined);
      const expiryKey = getStorageKey(SUBSCRIPTION_EXPIRY_KEY, userId || undefined);
      await AsyncStorage.setItem(tierKey, 'ace1_student');
      await AsyncStorage.setItem(expiryKey, expiry.toISOString());
      return true;
    } catch (error) {
      console.log('Error renewing subscription:', error);
      return false;
    }
  }, [userId]);

  const markCourseCompleted = useCallback(async (courseId: string) => {
    try {
      const updated = [...completedCourses];
      if (!updated.includes(courseId)) {
        updated.push(courseId);
        setCompletedCourses(updated);
        const coursesKey = getStorageKey(COURSES_COMPLETED_KEY, userId || undefined);
        await AsyncStorage.setItem(coursesKey, JSON.stringify(updated));
      }
    } catch (error) {
      console.log('Error marking course completed:', error);
    }
  }, [completedCourses, userId]);

  const enrollInCourse = useCallback(async (courseId: string, isACE1Course: boolean = false) => {
    try {
      console.log('[Subscription] Enrolling in course:', courseId, 'isACE1:', isACE1Course);
      
      // Update local state immediately
      const updated = [...enrolledCourses];
      if (!updated.includes(courseId)) {
        updated.push(courseId);
        setEnrolledCourses(updated);
        const enrolledKey = getStorageKey(ENROLLED_COURSES_KEY, userId || undefined);
        await AsyncStorage.setItem(enrolledKey, JSON.stringify(updated));
      }

      // Set initial progress
      if (courseProgress[courseId] === undefined) {
        const newProgress = { ...courseProgress, [courseId]: 0 };
        setCourseProgress(newProgress);
        const progressKey = getStorageKey(COURSE_PROGRESS_KEY, userId || undefined);
        await AsyncStorage.setItem(progressKey, JSON.stringify(newProgress));
      }

      // Save to database if authenticated
      if (userId) {
        enrollMutation.mutate({ userId, courseId });
      }

      // Update subscription for paid courses
      const isPaidCourse = PAID_COURSE_IDS.includes(courseId);
      if (isPaidCourse && tier === 'free') {
        const trialDays = isACE1Course ? 60 : 30;
        const newTier: SubscriptionTier = 'ace1_student';
        
        setTier(newTier);
        const tierKey = getStorageKey(SUBSCRIPTION_STORAGE_KEY, userId || undefined);
        await AsyncStorage.setItem(tierKey, newTier);
        
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + trialDays);
        setExpiryDate(expiry);
        setIsExpired(false);
        const expiryKey = getStorageKey(SUBSCRIPTION_EXPIRY_KEY, userId || undefined);
        await AsyncStorage.setItem(expiryKey, expiry.toISOString());
        
        console.log('[Subscription] Updated tier to ace1_student with', trialDays, 'day trial');

        // Create subscription in database
        if (userId) {
          createSubscriptionMutation.mutate(
            { userId, tier: 'ace1_student', isInitialRegistration: true },
            {
              onSuccess: (newSub) => {
                if (newSub) {
                  setSubscription(newSub as Subscription);
                  utils.subscriptions.getByUserId.invalidate({ userId });
                }
              },
            }
          );
        }
      }

      return true;
    } catch (error) {
      console.log('[Subscription] Error enrolling in course:', error);
      return false;
    }
  }, [enrolledCourses, courseProgress, tier, userId, enrollMutation, createSubscriptionMutation, utils]);

  const syncInitialEnrollments = useCallback(async (mockEnrolledIds: string[]) => {
    // Only sync mock data if user is not authenticated (demo mode)
    if (isAuthenticated && userId) {
      console.log('[Subscription] User is authenticated, skipping mock sync');
      return;
    }

    try {
      console.log('[Subscription] Syncing initial enrollments for demo mode:', mockEnrolledIds);
      const currentEnrolled = [...enrolledCourses];
      let hasChanges = false;

      for (const courseId of mockEnrolledIds) {
        if (!currentEnrolled.includes(courseId)) {
          currentEnrolled.push(courseId);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        setEnrolledCourses(currentEnrolled);
        const enrolledKey = getStorageKey(ENROLLED_COURSES_KEY, userId || undefined);
        await AsyncStorage.setItem(enrolledKey, JSON.stringify(currentEnrolled));
        console.log('[Subscription] Synced enrolled courses:', currentEnrolled);

        // Update tier if any paid courses are enrolled
        const hasPaidCourse = currentEnrolled.some(id => PAID_COURSE_IDS.includes(id));
        if (hasPaidCourse && tier === 'free') {
          await updateTier('ace1_student', 60);
          console.log('[Subscription] Updated tier due to enrolled paid courses');
        }
      }
    } catch (error) {
      console.log('Error syncing initial enrollments:', error);
    }
  }, [enrolledCourses, tier, updateTier, isAuthenticated, userId]);

  const isEnrolled = useCallback((courseId: string): boolean => {
    return enrolledCourses.includes(courseId);
  }, [enrolledCourses]);

  const getCourseProgress = useCallback((courseId: string): number => {
    return courseProgress[courseId] || 0;
  }, [courseProgress]);

  const updateCourseProgress = useCallback(async (courseId: string, progress: number) => {
    try {
      const newProgress = { ...courseProgress, [courseId]: progress };
      setCourseProgress(newProgress);
      const progressKey = getStorageKey(COURSE_PROGRESS_KEY, userId || undefined);
      await AsyncStorage.setItem(progressKey, JSON.stringify(newProgress));
      
      // If progress reaches 100, mark as completed
      if (progress >= 100 && !completedCourses.includes(courseId)) {
        await markCourseCompleted(courseId);
      }
    } catch (error) {
      console.log('Error updating course progress:', error);
    }
  }, [courseProgress, completedCourses, markCourseCompleted, userId]);

  const setCSOCertification = useCallback(async (certified: boolean) => {
    try {
      setIsCSOCertified(certified);
      const csoKey = getStorageKey(CSO_CERTIFIED_KEY, userId || undefined);
      await AsyncStorage.setItem(csoKey, certified.toString());
    } catch (error) {
      console.log('Error setting CSO certification:', error);
    }
  }, [userId]);

  const upgradeToCSOAffiliate = useCallback(async () => {
    try {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      setExpiryDate(expiry);
      setIsExpired(false);
      setTier('cso_affiliate');
      const tierKey = getStorageKey(SUBSCRIPTION_STORAGE_KEY, userId || undefined);
      const expiryKey = getStorageKey(SUBSCRIPTION_EXPIRY_KEY, userId || undefined);
      await AsyncStorage.setItem(tierKey, 'cso_affiliate');
      await AsyncStorage.setItem(expiryKey, expiry.toISOString());
      return true;
    } catch (error) {
      console.log('Error upgrading to CSO:', error);
      return false;
    }
  }, [userId]);

  const currentPlan = useMemo(() => {
    return SUBSCRIPTION_PLANS.find(plan => plan.id === tier) || SUBSCRIPTION_PLANS[0];
  }, [tier]);

  const hasCompletedAllCourses = completedCourses.length >= TOTAL_COURSES;
  const canAccessCSOAffiliate = hasCompletedAllCourses && isCSOCertified;

  const daysUntilExpiry = useMemo(() => {
    if (!expiryDate) return null;
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [expiryDate]);

  const isFree = tier === 'free';
  const isACE1 = tier === 'ace1_student';
  const isCSO = tier === 'cso_affiliate';
  const isPremium = (isACE1 || isCSO) && !isExpired;

  const canAccessCourses = isPremium;
  const canAccessAICoach = isPremium;
  const canAccessAIDispute = isPremium;
  const canAccessEarnings = isPremium;
  const canAccessHirePro = isCSO && !isExpired;

  const getReferralBonus = useCallback((): number => {
    if (isCSO) return 25;
    if (isACE1) return 25;
    return 0;
  }, [isCSO, isACE1]);

  const getResidualRate = useCallback((csoReferrals: number = 0): number => {
    if (!isCSO) return 0;
    return csoReferrals >= 100 ? 75 : 50;
  }, [isCSO]);

  return {
    tier,
    subscription,
    currentPlan,
    isLoading,
    updateTier,
    renewSubscription,
    upgradeToCSOAffiliate,
    isFree,
    isACE1,
    isCSO,
    isPremium,
    isExpired,
    expiryDate,
    daysUntilExpiry,
    canAccessCourses,
    canAccessAICoach,
    canAccessAIDispute,
    canAccessEarnings,
    canAccessHirePro,
    getReferralBonus,
    getResidualRate,
    plans: SUBSCRIPTION_PLANS,
    refetch: subscriptionQuery.refetch,
    isCSOCertified,
    completedCourses,
    hasCompletedAllCourses,
    canAccessCSOAffiliate,
    markCourseCompleted,
    setCSOCertification,
    enrolledCourses,
    enrollInCourse,
    isEnrolled,
    getCourseProgress,
    updateCourseProgress,
    syncInitialEnrollments,
  };
});
