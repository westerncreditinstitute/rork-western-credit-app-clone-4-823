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

export interface ModerationStats {
  totalReports: number;
  pendingReports: number;
  resolvedToday: number;
  averageResolutionTime: number;
  topCategories: { category: ReportCategory; count: number }[];
}

export interface UserWarning {
  id: string;
  userId: string;
  warningType: 'content_violation' | 'spam' | 'harassment' | 'cheating' | 'other';
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  relatedReportId?: string;
  issuedBy?: string;
  acknowledgedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface UserBan {
  id: string;
  userId: string;
  banType: 'temporary' | 'permanent' | 'shadow';
  reason: string;
  relatedReportId?: string;
  issuedBy?: string;
  startsAt: string;
  endsAt?: string;
  isActive: boolean;
  appealStatus?: 'none' | 'pending' | 'approved' | 'denied';
  appealReason?: string;
  createdAt: string;
}

export interface ModeratorAction {
  id: string;
  moderatorId: string;
  actionType: 'report_review' | 'ban_user' | 'unban_user' | 'warn_user' | 'delete_content' | 'edit_content' | 'approve_content' | 'escalate';
  targetUserId?: string;
  targetContentType?: string;
  targetContentId?: string;
  relatedReportId?: string;
  details?: Record<string, any>;
  notes?: string;
  createdAt: string;
}
