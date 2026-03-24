import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { rateLimitService } from './RateLimitService';
import { contentModerationService } from './ContentModerationService';

export type ReportCategory = 
  | 'harassment'
  | 'hate_speech'
  | 'spam'
  | 'scam'
  | 'inappropriate_content'
  | 'impersonation'
  | 'cheating'
  | 'threats'
  | 'personal_info'
  | 'other';

export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed' | 'escalated';
export type ReportPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ReportedContentType = 'user' | 'message' | 'business' | 'home' | 'comment' | 'profile';

export interface Report {
  id: string;
  reporterId: string;
  reporterName?: string;
  reportedUserId: string;
  reportedUserName?: string;
  contentType: ReportedContentType;
  contentId?: string;
  category: ReportCategory;
  description: string;
  evidence?: string[];
  status: ReportStatus;
  priority: ReportPriority;
  moderatorId?: string;
  moderatorNotes?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface ReportSubmission {
  reportedUserId: string;
  reportedUserName?: string;
  contentType: ReportedContentType;
  contentId?: string;
  category: ReportCategory;
  description: string;
  evidence?: string[];
}

interface ReportStats {
  totalReports: number;
  pendingReports: number;
  resolvedToday: number;
  averageResolutionTime: number;
  topCategories: { category: ReportCategory; count: number }[];
}

const REPORTS_STORAGE_KEY = 'wci_user_reports';
const BLOCKED_USERS_KEY = 'wci_blocked_users';

const CATEGORY_PRIORITIES: Record<ReportCategory, ReportPriority> = {
  threats: 'urgent',
  hate_speech: 'urgent',
  personal_info: 'high',
  harassment: 'high',
  scam: 'high',
  impersonation: 'medium',
  inappropriate_content: 'medium',
  cheating: 'medium',
  spam: 'low',
  other: 'low',
};

class ReportingService {
  private localReports: Report[] = [];
  private blockedUsers: Set<string> = new Set();
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const [reportsData, blockedData] = await Promise.all([
        AsyncStorage.getItem(REPORTS_STORAGE_KEY),
        AsyncStorage.getItem(BLOCKED_USERS_KEY),
      ]);

      if (reportsData) {
        this.localReports = JSON.parse(reportsData);
      }
      if (blockedData) {
        this.blockedUsers = new Set(JSON.parse(blockedData));
      }

      this.initialized = true;
      console.log('[ReportingService] Initialized with', this.localReports.length, 'local reports');
    } catch (error) {
      console.error('[ReportingService] Error initializing:', error);
      this.initialized = true;
    }
  }

  private async persistReports(): Promise<void> {
    try {
      await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(this.localReports));
    } catch (error) {
      console.error('[ReportingService] Error persisting reports:', error);
    }
  }

  private async persistBlockedUsers(): Promise<void> {
    try {
      await AsyncStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(Array.from(this.blockedUsers)));
    } catch (error) {
      console.error('[ReportingService] Error persisting blocked users:', error);
    }
  }

  async submitReport(
    reporterId: string,
    reporterName: string,
    submission: ReportSubmission
  ): Promise<{ success: boolean; reportId?: string; error?: string }> {
    await this.initialize();

    const rateLimitResult = await rateLimitService.consumeRateLimit(reporterId, 'report');
    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: rateLimitResult.blocked
          ? 'You have been temporarily blocked from submitting reports. Please try again later.'
          : 'Too many reports submitted. Please wait before submitting another report.',
      };
    }

    const moderationResult = contentModerationService.moderateContent(
      submission.description,
      'report_reason'
    );

    if (moderationResult.action === 'block') {
      return {
        success: false,
        error: 'Your report description contains inappropriate content.',
      };
    }

    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const priority = CATEGORY_PRIORITIES[submission.category];

    const report: Report = {
      id: reportId,
      reporterId,
      reporterName,
      reportedUserId: submission.reportedUserId,
      reportedUserName: submission.reportedUserName,
      contentType: submission.contentType,
      contentId: submission.contentId,
      category: submission.category,
      description: moderationResult.sanitizedContent,
      evidence: submission.evidence,
      status: priority === 'urgent' ? 'under_review' : 'pending',
      priority,
      createdAt: now,
      updatedAt: now,
    };

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('user_reports').insert({
          id: reportId,
          reporter_id: reporterId,
          reporter_name: reporterName,
          reported_user_id: submission.reportedUserId,
          reported_user_name: submission.reportedUserName,
          content_type: submission.contentType,
          content_id: submission.contentId,
          category: submission.category,
          description: report.description,
          evidence: submission.evidence,
          status: report.status,
          priority: report.priority,
          created_at: now,
          updated_at: now,
        });

        if (error) throw error;
        console.log('[ReportingService] Report saved to database:', reportId);
      } catch (error) {
        console.error('[ReportingService] Error saving report to database:', error);
      }
    }

    this.localReports.push(report);
    await this.persistReports();

    console.log('[ReportingService] Report submitted:', {
      reportId,
      category: submission.category,
      priority,
    });

    return { success: true, reportId };
  }

  async getReportsByUser(reporterId: string): Promise<Report[]> {
    await this.initialize();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('user_reports')
          .select('*')
          .eq('reporter_id', reporterId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return this.mapDatabaseReports(data || []);
      } catch (error) {
        console.error('[ReportingService] Error fetching reports from database:', error);
      }
    }

    return this.localReports.filter(r => r.reporterId === reporterId);
  }

  async getReportsAgainstUser(reportedUserId: string): Promise<Report[]> {
    await this.initialize();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('user_reports')
          .select('*')
          .eq('reported_user_id', reportedUserId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return this.mapDatabaseReports(data || []);
      } catch (error) {
        console.error('[ReportingService] Error fetching reports:', error);
      }
    }

    return this.localReports.filter(r => r.reportedUserId === reportedUserId);
  }

  async getPendingReports(limit: number = 50): Promise<Report[]> {
    await this.initialize();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('user_reports')
          .select('*')
          .in('status', ['pending', 'under_review'])
          .order('priority', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(limit);

        if (error) throw error;
        return this.mapDatabaseReports(data || []);
      } catch (error) {
        console.error('[ReportingService] Error fetching pending reports:', error);
      }
    }

    return this.localReports
      .filter(r => r.status === 'pending' || r.status === 'under_review')
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })
      .slice(0, limit);
  }

  async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    moderatorId: string,
    notes?: string,
    resolution?: string
  ): Promise<{ success: boolean; error?: string }> {
    await this.initialize();

    const now = new Date().toISOString();
    const updates: Partial<Report> = {
      status,
      moderatorId,
      moderatorNotes: notes,
      resolution,
      updatedAt: now,
      resolvedAt: status === 'resolved' || status === 'dismissed' ? now : undefined,
    };

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('user_reports')
          .update({
            status,
            moderator_id: moderatorId,
            moderator_notes: notes,
            resolution,
            updated_at: now,
            resolved_at: updates.resolvedAt,
          })
          .eq('id', reportId);

        if (error) throw error;
        console.log('[ReportingService] Report status updated in database:', reportId, status);
      } catch (error) {
        console.error('[ReportingService] Error updating report status:', error);
        return { success: false, error: 'Failed to update report status' };
      }
    }

    const localIndex = this.localReports.findIndex(r => r.id === reportId);
    if (localIndex >= 0) {
      this.localReports[localIndex] = { ...this.localReports[localIndex], ...updates };
      await this.persistReports();
    }

    return { success: true };
  }

  async blockUser(userId: string, blockedUserId: string): Promise<{ success: boolean }> {
    await this.initialize();
    
    const key = `${userId}:${blockedUserId}`;
    this.blockedUsers.add(key);
    await this.persistBlockedUsers();

    if (isSupabaseConfigured) {
      try {
        await supabase.from('blocked_users').insert({
          user_id: userId,
          blocked_user_id: blockedUserId,
          created_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error('[ReportingService] Error saving blocked user:', error);
      }
    }

    console.log('[ReportingService] User blocked:', blockedUserId, 'by', userId);
    return { success: true };
  }

  async unblockUser(userId: string, blockedUserId: string): Promise<{ success: boolean }> {
    await this.initialize();
    
    const key = `${userId}:${blockedUserId}`;
    this.blockedUsers.delete(key);
    await this.persistBlockedUsers();

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('blocked_users')
          .delete()
          .eq('user_id', userId)
          .eq('blocked_user_id', blockedUserId);
      } catch (error) {
        console.error('[ReportingService] Error removing blocked user:', error);
      }
    }

    console.log('[ReportingService] User unblocked:', blockedUserId, 'by', userId);
    return { success: true };
  }

  isUserBlocked(userId: string, blockedUserId: string): boolean {
    const key = `${userId}:${blockedUserId}`;
    return this.blockedUsers.has(key);
  }

  async getBlockedUsers(userId: string): Promise<string[]> {
    await this.initialize();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('blocked_users')
          .select('blocked_user_id')
          .eq('user_id', userId);

        if (error) throw error;
        return (data || []).map(d => d.blocked_user_id);
      } catch (error) {
        console.error('[ReportingService] Error fetching blocked users:', error);
      }
    }

    const blocked: string[] = [];
    this.blockedUsers.forEach(key => {
      if (key.startsWith(`${userId}:`)) {
        blocked.push(key.split(':')[1]);
      }
    });
    return blocked;
  }

  async getReportStats(): Promise<ReportStats> {
    await this.initialize();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let reports = this.localReports;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('user_reports')
          .select('*');

        if (!error && data) {
          reports = this.mapDatabaseReports(data);
        }
      } catch (error) {
        console.error('[ReportingService] Error fetching report stats:', error);
      }
    }

    const pendingReports = reports.filter(
      r => r.status === 'pending' || r.status === 'under_review'
    ).length;

    const resolvedToday = reports.filter(
      r => r.resolvedAt && new Date(r.resolvedAt) >= today
    ).length;

    const resolvedReports = reports.filter(r => r.resolvedAt);
    const avgResolutionTime = resolvedReports.length > 0
      ? resolvedReports.reduce((acc, r) => {
          const created = new Date(r.createdAt).getTime();
          const resolved = new Date(r.resolvedAt!).getTime();
          return acc + (resolved - created);
        }, 0) / resolvedReports.length / (1000 * 60 * 60)
      : 0;

    const categoryCounts: Record<string, number> = {};
    reports.forEach(r => {
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    });

    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category: category as ReportCategory, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalReports: reports.length,
      pendingReports,
      resolvedToday,
      averageResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      topCategories,
    };
  }

  private mapDatabaseReports(data: any[]): Report[] {
    return data.map(r => ({
      id: r.id,
      reporterId: r.reporter_id,
      reporterName: r.reporter_name,
      reportedUserId: r.reported_user_id,
      reportedUserName: r.reported_user_name,
      contentType: r.content_type,
      contentId: r.content_id,
      category: r.category,
      description: r.description,
      evidence: r.evidence,
      status: r.status,
      priority: r.priority,
      moderatorId: r.moderator_id,
      moderatorNotes: r.moderator_notes,
      resolution: r.resolution,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      resolvedAt: r.resolved_at,
    }));
  }

  getReportCategories(): { value: ReportCategory; label: string; description: string }[] {
    return [
      { value: 'harassment', label: 'Harassment', description: 'Bullying, intimidation, or targeted abuse' },
      { value: 'hate_speech', label: 'Hate Speech', description: 'Discriminatory or hateful content' },
      { value: 'threats', label: 'Threats', description: 'Threats of violence or harm' },
      { value: 'spam', label: 'Spam', description: 'Unwanted promotional or repetitive content' },
      { value: 'scam', label: 'Scam/Fraud', description: 'Attempts to deceive or defraud' },
      { value: 'inappropriate_content', label: 'Inappropriate Content', description: 'Sexual or graphic content' },
      { value: 'impersonation', label: 'Impersonation', description: 'Pretending to be someone else' },
      { value: 'cheating', label: 'Cheating/Exploiting', description: 'Game exploits or unfair advantages' },
      { value: 'personal_info', label: 'Personal Info', description: 'Sharing private information' },
      { value: 'other', label: 'Other', description: 'Other violations not listed above' },
    ];
  }
}

export const reportingService = new ReportingService();
export default reportingService;
