import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type ContentType = 'chat_message' | 'username' | 'business_name' | 'profile_bio' | 'report_reason';
export type ModerationAction = 'allow' | 'warn' | 'block' | 'review';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ModerationResult {
  action: ModerationAction;
  severity: SeverityLevel;
  flaggedTerms: string[];
  sanitizedContent: string;
  requiresReview: boolean;
  reasons: string[];
}

export interface ModerationRule {
  id: string;
  pattern: RegExp;
  category: string;
  severity: SeverityLevel;
  action: ModerationAction;
  replacement?: string;
}

const PROFANITY_PATTERNS: { pattern: string; category: string; severity: SeverityLevel }[] = [
  // Slurs and hate speech (critical)
  { pattern: '\\b(n[i1]gg[ae3]r?s?|f[a@]gg?[o0]ts?|r[e3]t[a@]rds?)\\b', category: 'hate_speech', severity: 'critical' },
  { pattern: '\\b(k[i1]k[e3]s?|sp[i1]cs?|ch[i1]nks?)\\b', category: 'hate_speech', severity: 'critical' },
  
  // Sexual content (high)
  { pattern: '\\b(p[o0]rn|xxx|s[e3]x\\s*chat)\\b', category: 'sexual', severity: 'high' },
  { pattern: '\\b(n[u\\*]d[e3]s?|d[i1]ck\\s*p[i1]cs?)\\b', category: 'sexual', severity: 'high' },
  
  // Common profanity (medium)
  { pattern: '\\b(f[u\\*@]c?k(ing|er|ed)?|sh[i1\\*]t(ty)?|b[i1]tch(es)?|a[s\\$]sh[o0]l[e3])\\b', category: 'profanity', severity: 'medium' },
  { pattern: '\\b(d[a@]mn(ed)?|h[e3]ll|cr[a@]p|p[i1]ss(ed)?)\\b', category: 'profanity', severity: 'low' },
  
  // Threats and violence (critical)
  { pattern: '\\b(k[i1]ll\\s*(you|yourself|ur\\s*self)|murder|bomb\\s*threat)\\b', category: 'threat', severity: 'critical' },
  { pattern: '\\b(shoot(ing)?\\s*(up|you)|stab(bing)?|attack)\\b', category: 'violence', severity: 'high' },
  
  // Harassment (high)
  { pattern: '\\b(k[i1]ll\\s*yourself|kys|go\\s*die)\\b', category: 'harassment', severity: 'critical' },
  { pattern: '\\b(ugly|fat|stupid|dumb|idiot|moron|loser)\\s*(a[s\\$]s|b[i1]tch)?\\b', category: 'harassment', severity: 'medium' },
  
  // Spam patterns (medium)
  { pattern: '(.)\\1{4,}', category: 'spam', severity: 'low' },
  { pattern: '\\b(buy\\s*now|click\\s*here|free\\s*money|make\\s*\\$\\d+)\\b', category: 'spam', severity: 'medium' },
  
  // Personal info solicitation (high)
  { pattern: '\\b(send\\s*(me)?\\s*(your)?\\s*(ssn|social\\s*security|credit\\s*card))\\b', category: 'scam', severity: 'high' },
  { pattern: '\\b(give\\s*me\\s*your\\s*(password|login|account))\\b', category: 'scam', severity: 'high' },
];

const LEET_SPEAK_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  '$': 's',
  '!': 'i',
  '*': '',
};

class ContentModerationService {
  private rules: ModerationRule[] = [];
  private customBlockedTerms: Set<string> = new Set();
  private allowedTerms: Set<string> = new Set();
  private initialized: boolean = false;

  constructor() {
    this.initializeRules();
  }

  private initializeRules(): void {
    this.rules = PROFANITY_PATTERNS.map((pattern, index) => ({
      id: `rule_${index}`,
      pattern: new RegExp(pattern.pattern, 'gi'),
      category: pattern.category,
      severity: pattern.severity,
      action: this.getActionForSeverity(pattern.severity),
      replacement: this.getReplacementForSeverity(pattern.severity),
    }));
    this.initialized = true;
    console.log('[ContentModerationService] Initialized with', this.rules.length, 'rules');
  }

  private getActionForSeverity(severity: SeverityLevel): ModerationAction {
    switch (severity) {
      case 'critical': return 'block';
      case 'high': return 'review';
      case 'medium': return 'warn';
      case 'low': return 'allow';
    }
  }

  private getReplacementForSeverity(severity: SeverityLevel): string {
    switch (severity) {
      case 'critical':
      case 'high':
        return '[removed]';
      case 'medium':
        return '***';
      case 'low':
        return '*';
    }
  }

  private normalizeLeetSpeak(text: string): string {
    let normalized = text.toLowerCase();
    Object.entries(LEET_SPEAK_MAP).forEach(([leet, char]) => {
      normalized = normalized.replace(new RegExp(`\\${leet}`, 'g'), char);
    });
    return normalized;
  }

  private removeSpacingTricks(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/(.)\1{2,}/g, '$1$1')
      .replace(/[.\-_]+/g, '');
  }

  addBlockedTerm(term: string): void {
    this.customBlockedTerms.add(term.toLowerCase());
    console.log('[ContentModerationService] Added blocked term:', term);
  }

  removeBlockedTerm(term: string): void {
    this.customBlockedTerms.delete(term.toLowerCase());
    console.log('[ContentModerationService] Removed blocked term:', term);
  }

  addAllowedTerm(term: string): void {
    this.allowedTerms.add(term.toLowerCase());
    console.log('[ContentModerationService] Added allowed term:', term);
  }

  moderateContent(content: string, contentType: ContentType = 'chat_message'): ModerationResult {
    if (!content || content.trim().length === 0) {
      return {
        action: 'allow',
        severity: 'low',
        flaggedTerms: [],
        sanitizedContent: content,
        requiresReview: false,
        reasons: [],
      };
    }

    const normalizedContent = this.normalizeLeetSpeak(this.removeSpacingTricks(content));
    const flaggedTerms: string[] = [];
    const reasons: string[] = [];
    let highestSeverity: SeverityLevel = 'low';
    let sanitizedContent = content;

    for (const allowed of this.allowedTerms) {
      if (normalizedContent.includes(allowed)) {
        return {
          action: 'allow',
          severity: 'low',
          flaggedTerms: [],
          sanitizedContent: content,
          requiresReview: false,
          reasons: [],
        };
      }
    }

    for (const blocked of this.customBlockedTerms) {
      if (normalizedContent.includes(blocked)) {
        flaggedTerms.push(blocked);
        reasons.push(`Custom blocked term: ${blocked}`);
        highestSeverity = 'high';
        const regex = new RegExp(blocked, 'gi');
        sanitizedContent = sanitizedContent.replace(regex, '[blocked]');
      }
    }

    for (const rule of this.rules) {
      rule.pattern.lastIndex = 0;
      const matches = normalizedContent.match(rule.pattern);
      
      if (matches && matches.length > 0) {
        matches.forEach(match => {
          if (!flaggedTerms.includes(match.toLowerCase())) {
            flaggedTerms.push(match.toLowerCase());
          }
        });
        reasons.push(`${rule.category}: ${matches.join(', ')}`);
        
        if (this.compareSeverity(rule.severity, highestSeverity) > 0) {
          highestSeverity = rule.severity;
        }

        if (rule.replacement) {
          sanitizedContent = sanitizedContent.replace(rule.pattern, rule.replacement);
        }
      }
    }

    const action = this.determineAction(highestSeverity, contentType, flaggedTerms.length);
    const requiresReview = action === 'review' || highestSeverity === 'critical';

    return {
      action,
      severity: highestSeverity,
      flaggedTerms,
      sanitizedContent,
      requiresReview,
      reasons,
    };
  }

  private compareSeverity(a: SeverityLevel, b: SeverityLevel): number {
    const order: Record<SeverityLevel, number> = {
      low: 0,
      medium: 1,
      high: 2,
      critical: 3,
    };
    return order[a] - order[b];
  }

  private determineAction(
    severity: SeverityLevel,
    contentType: ContentType,
    flagCount: number
  ): ModerationAction {
    if (contentType === 'username' || contentType === 'business_name') {
      if (severity === 'low' && flagCount <= 1) return 'allow';
      if (severity === 'medium') return 'warn';
      return 'block';
    }

    if (severity === 'critical') return 'block';
    if (severity === 'high') return 'review';
    if (severity === 'medium' && flagCount >= 2) return 'warn';
    if (severity === 'low' && flagCount >= 3) return 'warn';
    
    return 'allow';
  }

  async logModeration(
    userId: string,
    content: string,
    result: ModerationResult,
    contentType: ContentType
  ): Promise<void> {
    if (!isSupabaseConfigured) {
      console.log('[ContentModerationService] Moderation logged (demo):', {
        userId,
        contentType,
        action: result.action,
        severity: result.severity,
      });
      return;
    }

    try {
      await supabase.from('moderation_logs').insert({
        user_id: userId,
        content_type: contentType,
        original_content: content,
        sanitized_content: result.sanitizedContent,
        action: result.action,
        severity: result.severity,
        flagged_terms: result.flaggedTerms,
        reasons: result.reasons,
        requires_review: result.requiresReview,
        created_at: new Date().toISOString(),
      });
      console.log('[ContentModerationService] Moderation logged to database');
    } catch (error) {
      console.error('[ContentModerationService] Error logging moderation:', error);
    }
  }

  sanitizeForDisplay(content: string): string {
    const result = this.moderateContent(content);
    return result.sanitizedContent;
  }

  isContentSafe(content: string, contentType: ContentType = 'chat_message'): boolean {
    const result = this.moderateContent(content, contentType);
    return result.action === 'allow';
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    this.rules.forEach(rule => categories.add(rule.category));
    return Array.from(categories);
  }

  getRuleCount(): number {
    return this.rules.length + this.customBlockedTerms.size;
  }
}

export const contentModerationService = new ContentModerationService();
export default contentModerationService;
