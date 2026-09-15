/**
 * Single source of truth for every course price, subscription fee and referral
 * payout in the app.
 *
 * These numbers used to be copy-pasted across screens, mock data, the backend
 * and the iOS app - which is how ACE-1 ended up advertised at $499.99, $99.99
 * and "$25/mo" simultaneously. Everything now derives from this file: change a
 * number here and every screen, alert, and payout calculation follows.
 *
 * The iOS mirror lives in
 * `ios-western-credit-institute/WesternCreditInstitute/Models/Pricing.swift`
 * and must be kept in step with this file.
 */

// MARK: - Course pricing

/** Certificate fee, charged once at enrollment for every ACE course. */
export const CERTIFICATE_FEE = 99.99;

/** Enrollment fee, charged once for ACE-2 and ACE-3 only. ACE-1 has none. */
export const ENROLLMENT_FEE = 100;

/** Monthly subscription that keeps any ACE course active. */
export const MONTHLY_SUBSCRIPTION = 49.99;

/** ACE-1 is free for this many days; the subscription starts afterwards. */
export const ACE1_FREE_DAYS = 60;

/** One-time price for the Complete ACE Bundle (ACE-4), lifetime access. */
export const BUNDLE_PRICE = 1299;

/** Monthly dues to stay listed in the CSO Affiliate network / Hire a Pro. */
export const CSO_MONTHLY_FEE = 50;

/** Due today to start ACE-1: certificate only, then free for 60 days. */
export const ACE1_DUE_TODAY = CERTIFICATE_FEE;

/** Due today to start ACE-2 or ACE-3: certificate + enrollment, no trial. */
export const ACE23_DUE_TODAY = CERTIFICATE_FEE + ENROLLMENT_FEE;

// MARK: - Referral program

/**
 * A referral qualifies once the referred student keeps their account open
 * past this many days. This is the refund/chargeback window on the
 * certificate fee, not the length of the ACE-1 free period.
 */
export const REFERRAL_QUALIFYING_DAYS = 7;

/** ACE-1 referral payout when the referrer is on the free tier. */
export const REFERRAL_ACE1_FREE = 25;

/** ACE-1 referral payout when the referrer is an ACE-1 student or CSO. */
export const REFERRAL_ACE1_ENROLLED = 50;

/** Flat bounty each time a referred student registers ACE-2 or ACE-3. */
export const REFERRAL_ACE23_BOUNTY = 99.99;

/** Share of an ACE-4 bundle sale paid to a CSO Affiliate referrer. */
export const BUNDLE_COMMISSION_CSO = 0.5;

/** Share of an ACE-4 bundle sale paid to a non-CSO referrer. */
export const BUNDLE_COMMISSION_STANDARD = 0.25;

/** Dollar value of one bundle sale to a CSO Affiliate. */
export const BUNDLE_PAYOUT_CSO = BUNDLE_PRICE * BUNDLE_COMMISSION_CSO;

/** Dollar value of one bundle sale to a non-CSO referrer. */
export const BUNDLE_PAYOUT_STANDARD = BUNDLE_PRICE * BUNDLE_COMMISSION_STANDARD;

/** Extra earned per bundle by being a CSO rather than a standard referrer. */
export const BUNDLE_CSO_ADVANTAGE = BUNDLE_PAYOUT_CSO - BUNDLE_PAYOUT_STANDARD;

export type ReferrerTier = 'free' | 'ace1_student' | 'cso_affiliate';

/**
 * ACE-1 referral payout for a given referrer tier.
 *
 * Enrolled students earn double what free members earn - that gap is the
 * single strongest argument for enrolling, so it is computed rather than
 * hardcoded per screen.
 */
export function ace1ReferralBonus(tier: ReferrerTier): number {
  return tier === 'free' ? REFERRAL_ACE1_FREE : REFERRAL_ACE1_ENROLLED;
}

/** Commission rate on an ACE-4 bundle sale for a given referrer tier. */
export function bundleCommissionRate(tier: ReferrerTier): number {
  return tier === 'cso_affiliate' ? BUNDLE_COMMISSION_CSO : BUNDLE_COMMISSION_STANDARD;
}

/** Dollar payout on one ACE-4 bundle sale for a given referrer tier. */
export function bundleCommission(tier: ReferrerTier): number {
  return BUNDLE_PRICE * bundleCommissionRate(tier);
}

/**
 * Projects a month of referral income.
 *
 * Kept here rather than in the view so the Earnings screen, the plan
 * comparison and the iOS app can never drift into quoting different totals
 * for the same activity.
 */
export function projectMonthlyEarnings(input: {
  tier: ReferrerTier;
  ace1Referrals: number;
  advancedCourseRegistrations: number;
  bundleSales: number;
}): number {
  const ace1 = input.ace1Referrals * ace1ReferralBonus(input.tier);
  const advanced = input.advancedCourseRegistrations * REFERRAL_ACE23_BOUNTY;
  const bundles = input.bundleSales * bundleCommission(input.tier);
  return ace1 + advanced + bundles;
}

/** Formats a price, dropping the cents on whole-dollar amounts. */
export function formatPrice(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const hasCents = rounded % 1 !== 0;
  return `$${rounded.toLocaleString('en-US', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export interface EarningsScenario {
  id: string;
  label: string;
  caption: string;
  ace1Referrals: number;
  advancedCourseRegistrations: number;
  bundleSales: number;
}

/**
 * Worked examples shown on the Earnings screen, sized so the third one clears
 * $10,000/mo. All three are computed through `projectMonthlyEarnings`, so the
 * totals on screen are always arithmetically true rather than marketing copy.
 */
export const EARNINGS_SCENARIOS: EarningsScenario[] = [
  {
    id: 'starter',
    label: 'Getting started',
    caption: 'A few referrals a week from your own network.',
    ace1Referrals: 10,
    advancedCourseRegistrations: 4,
    bundleSales: 1,
  },
  {
    id: 'builder',
    label: 'Building momentum',
    caption: 'Posting consistently and following up with your students.',
    ace1Referrals: 25,
    advancedCourseRegistrations: 15,
    bundleSales: 3,
  },
  {
    id: 'pro',
    label: 'Full-time affiliate',
    caption: 'Treating your affiliate business like a real business.',
    ace1Referrals: 40,
    advancedCourseRegistrations: 30,
    bundleSales: 8,
  },
];
