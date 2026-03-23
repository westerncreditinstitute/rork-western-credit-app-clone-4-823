import { useState, useCallback } from 'react';
import { rateLimitService, RateLimitResult } from '@/services/RateLimitService';
import { contentModerationService, ModerationResult, ContentType } from '@/services/ContentModerationService';
import { reportingService, Report, ReportSubmission, ReportCategory } from '@/services/ReportingService';
import { useAuth } from '@/contexts/AuthContext';

interface UseModerationReturn {
  checkRateLimit: (actionType: string) => Promise<RateLimitResult>;
  moderateContent: (content: string, contentType?: ContentType) => ModerationResult;
  isContentSafe: (content: string, contentType?: ContentType) => boolean;
  sanitizeContent: (content: string) => string;
  submitReport: (submission: ReportSubmission) => Promise<{ success: boolean; reportId?: string; error?: string }>;
  blockUser: (blockedUserId: string) => Promise<{ success: boolean }>;
  unblockUser: (blockedUserId: string) => Promise<{ success: boolean }>;
  isUserBlocked: (blockedUserId: string) => boolean;
  getBlockedUsers: () => Promise<string[]>;
  getMyReports: () => Promise<Report[]>;
  reportCategories: { value: ReportCategory; label: string; description: string }[];
  isRateLimited: boolean;
  rateLimitMessage: string | null;
}

export function useModeration(): UseModerationReturn {
  const { user } = useAuth();
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  const checkRateLimit = useCallback(async (actionType: string): Promise<RateLimitResult> => {
    if (!user) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now(),
        blocked: false,
      };
    }

    const result = await rateLimitService.consumeRateLimit(user.id, actionType);
    
    if (!result.allowed) {
      setIsRateLimited(true);
      if (result.blocked) {
        const expiresIn = result.blockExpiresAt 
          ? Math.ceil((result.blockExpiresAt - Date.now()) / 60000)
          : 0;
        setRateLimitMessage(`You have been temporarily blocked. Try again in ${expiresIn} minutes.`);
      } else {
        const resetIn = Math.ceil((result.resetAt - Date.now()) / 1000);
        setRateLimitMessage(`Rate limit exceeded. Try again in ${resetIn} seconds.`);
      }
    } else {
      setIsRateLimited(false);
      setRateLimitMessage(null);
    }

    return result;
  }, [user]);

  const moderateContent = useCallback((content: string, contentType: ContentType = 'chat_message'): ModerationResult => {
    return contentModerationService.moderateContent(content, contentType);
  }, []);

  const isContentSafe = useCallback((content: string, contentType: ContentType = 'chat_message'): boolean => {
    return contentModerationService.isContentSafe(content, contentType);
  }, []);

  const sanitizeContent = useCallback((content: string): string => {
    return contentModerationService.sanitizeForDisplay(content);
  }, []);

  const submitReport = useCallback(async (submission: ReportSubmission): Promise<{ success: boolean; reportId?: string; error?: string }> => {
    if (!user) {
      return { success: false, error: 'You must be logged in to submit a report' };
    }

    return reportingService.submitReport(user.id, user.name, submission);
  }, [user]);

  const blockUser = useCallback(async (blockedUserId: string): Promise<{ success: boolean }> => {
    if (!user) {
      return { success: false };
    }

    return reportingService.blockUser(user.id, blockedUserId);
  }, [user]);

  const unblockUser = useCallback(async (blockedUserId: string): Promise<{ success: boolean }> => {
    if (!user) {
      return { success: false };
    }

    return reportingService.unblockUser(user.id, blockedUserId);
  }, [user]);

  const isUserBlocked = useCallback((blockedUserId: string): boolean => {
    if (!user) {
      return false;
    }

    return reportingService.isUserBlocked(user.id, blockedUserId);
  }, [user]);

  const getBlockedUsers = useCallback(async (): Promise<string[]> => {
    if (!user) {
      return [];
    }

    return reportingService.getBlockedUsers(user.id);
  }, [user]);

  const getMyReports = useCallback(async (): Promise<Report[]> => {
    if (!user) {
      return [];
    }

    return reportingService.getReportsByUser(user.id);
  }, [user]);

  const reportCategories = reportingService.getReportCategories();

  return {
    checkRateLimit,
    moderateContent,
    isContentSafe,
    sanitizeContent,
    submitReport,
    blockUser,
    unblockUser,
    isUserBlocked,
    getBlockedUsers,
    getMyReports,
    reportCategories,
    isRateLimited,
    rateLimitMessage,
  };
}

export default useModeration;
