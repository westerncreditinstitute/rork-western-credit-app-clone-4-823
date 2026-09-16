//
//  Pricing.swift
//  WesternCreditInstitute
//

import Foundation

/// Single source of truth for every course price, subscription fee and referral
/// payout in the app.
///
/// This is the iOS mirror of `expo/constants/pricing.ts`. The two files must be
/// changed together - a price that only moves on one platform means the apps
/// quote different numbers for the same product.
nonisolated enum Pricing {

    // MARK: - Course pricing

    /// Certificate fee, charged once per ACE course.
    ///
    /// For ACE-2 and ACE-3 this is due at enrollment. For ACE-1 it is
    /// deferred: the trial starts at no charge and the certificate is billed
    /// when the trial ends, which is when ACE-1 becomes a paid subscription.
    static let certificateFee: Double = 99.99

    /// Enrollment fee, charged once for ACE-2 and ACE-3 only. ACE-1 has none.
    static let enrollmentFee: Double = 100

    /// Monthly subscription that keeps any ACE course active.
    static let monthlySubscription: Double = 49.99

    /// Length of the ACE-1 free trial.
    ///
    /// The trial is a genuine preview, not the course: the AI agent runs on
    /// restricted topics and the full dispute-letter library stays closed.
    /// See `TrialAccess` for exactly what a trial member can reach.
    static let ace1TrialDays: Int = 7

    /// One-time price for the Complete ACE Bundle (ACE-4), lifetime access.
    static let bundlePrice: Double = 1299

    /// Monthly dues to stay in the CSO network and keep a Hire a Pro listing.
    static let csoMonthlyFee: Double = 50

    /// Residual paid every month to the CSO Affiliate who signed up another
    /// CSO Affiliate.
    ///
    /// The referred CSO pays `csoMonthlyFee` a month to stay in the network,
    /// and half of that flows straight back to whoever recruited them - for as
    /// long as that CSO keeps their membership active. Unlike every other
    /// payout here this one is recurring, not one-off, which is why the
    /// Earnings screen presents it separately: ten recruited CSOs is $250
    /// every month, not $250 once.
    static let csoResidualMonthly: Double = 25

    /// Share of a referred CSO's monthly dues paid out as residual income.
    static let csoResidualShare: Double = csoResidualMonthly / csoMonthlyFee

    /// Due today to start the ACE-1 trial: nothing.
    ///
    /// Enrollment is free and the certificate fee is not taken until the
    /// trial ends, so nothing may quote a charge on day one.
    static let ace1DueToday: Double = 0

    /// Charged when the ACE-1 trial ends, before the subscription starts.
    static let ace1DueAfterTrial: Double = certificateFee

    /// Due today to start ACE-2 or ACE-3: certificate + enrollment, no trial.
    static let ace23DueToday: Double = certificateFee + enrollmentFee

    // MARK: - Referral program

    /// A referral qualifies once the referred student keeps the account open
    /// past this many days.
    ///
    /// This now coincides with the end of the ACE-1 trial, which is when the
    /// certificate fee is actually collected — so a payout is never owed on a
    /// trial that lapsed without paying.
    static let referralQualifyingDays: Int = ace1TrialDays

    /// ACE-1 referral payout when the referrer is on the free tier.
    static let referralAce1Free: Double = 25

    /// ACE-1 referral payout when the referrer is an ACE-1 student or CSO.
    static let referralAce1Enrolled: Double = 50

    /// Flat bounty each time a referred student registers ACE-2 or ACE-3.
    static let referralAce23Bounty: Double = 99.99

    /// Share of an ACE-4 bundle sale paid to a CSO Affiliate referrer.
    static let bundleCommissionCSO: Double = 0.5

    /// Share of an ACE-4 bundle sale paid to a non-CSO referrer.
    static let bundleCommissionStandard: Double = 0.25

    /// Dollar value of one bundle sale to a CSO Affiliate.
    static let bundlePayoutCSO: Double = bundlePrice * bundleCommissionCSO

    /// Dollar value of one bundle sale to a non-CSO referrer.
    static let bundlePayoutStandard: Double = bundlePrice * bundleCommissionStandard

    /// Extra earned per bundle by being a CSO rather than a standard referrer.
    static let bundleCSOAdvantage: Double = bundlePayoutCSO - bundlePayoutStandard

    /// ACE-1 referral payout for a given referrer tier.
    ///
    /// Enrolled students earn double what free members earn - that gap is the
    /// strongest argument for enrolling, so it is computed once here.
    static func ace1ReferralBonus(for tier: SubscriptionTier) -> Double {
        tier == .free ? referralAce1Free : referralAce1Enrolled
    }

    /// Commission rate on an ACE-4 bundle sale for a given referrer tier.
    static func bundleCommissionRate(for tier: SubscriptionTier) -> Double {
        tier == .csoAffiliate ? bundleCommissionCSO : bundleCommissionStandard
    }

    /// Dollar payout on one ACE-4 bundle sale for a given referrer tier.
    static func bundleCommission(for tier: SubscriptionTier) -> Double {
        bundlePrice * bundleCommissionRate(for: tier)
    }

    /// Monthly residual income from CSO Affiliates this member recruited.
    ///
    /// Only CSO Affiliates earn this. Someone on the free or student tier can
    /// still refer a CSO, but the residual is a benefit of carrying the
    /// membership yourself.
    static func csoResidualIncome(for tier: SubscriptionTier, activeCSOReferrals: Int) -> Double {
        guard tier == .csoAffiliate else { return 0 }
        return Double(activeCSOReferrals) * csoResidualMonthly
    }

    /// Projects a month of referral income at a given tier.
    static func projectMonthlyEarnings(
        tier: SubscriptionTier,
        ace1Referrals: Int,
        advancedCourseRegistrations: Int,
        bundleSales: Int,
        activeCSOReferrals: Int = 0
    ) -> Double {
        let ace1 = Double(ace1Referrals) * ace1ReferralBonus(for: tier)
        let advanced = Double(advancedCourseRegistrations) * referralAce23Bounty
        let bundles = Double(bundleSales) * bundleCommission(for: tier)
        let residual = csoResidualIncome(for: tier, activeCSOReferrals: activeCSOReferrals)
        return ace1 + advanced + bundles + residual
    }

    /// Formats a price, dropping the cents on whole-dollar amounts.
    static func format(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.locale = Locale(identifier: "en_US")
        let hasCents = amount.truncatingRemainder(dividingBy: 1) != 0
        formatter.minimumFractionDigits = hasCents ? 2 : 0
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: amount)) ?? "$\(amount)"
    }

    /// Formats a commission rate as a whole-number percentage.
    static func formatRate(_ rate: Double) -> String {
        "\(Int(rate * 100))%"
    }
}

/// A worked earnings example shown on the Earnings screen.
nonisolated struct EarningsScenario: Identifiable, Hashable, Sendable {
    let id: String
    let label: String
    let caption: String
    let ace1Referrals: Int
    let advancedCourseRegistrations: Int
    let bundleSales: Int

    /// CSO Affiliates recruited so far who are still paying their monthly dues.
    ///
    /// This one compounds: it is carried over month to month rather than
    /// earned fresh, which is the whole point of the residual.
    let activeCSOReferrals: Int

    /// Monthly total this scenario produces at CSO Affiliate rates.
    var csoTotal: Double {
        Pricing.projectMonthlyEarnings(
            tier: .csoAffiliate,
            ace1Referrals: ace1Referrals,
            advancedCourseRegistrations: advancedCourseRegistrations,
            bundleSales: bundleSales,
            activeCSOReferrals: activeCSOReferrals
        )
    }

    /// Monthly residual this scenario produces at CSO Affiliate rates.
    var csoResidual: Double {
        Pricing.csoResidualIncome(for: .csoAffiliate, activeCSOReferrals: activeCSOReferrals)
    }

    /// Monthly total this scenario produces at the given tier's rates.
    func total(for tier: SubscriptionTier) -> Double {
        Pricing.projectMonthlyEarnings(
            tier: tier,
            ace1Referrals: ace1Referrals,
            advancedCourseRegistrations: advancedCourseRegistrations,
            bundleSales: bundleSales,
            activeCSOReferrals: activeCSOReferrals
        )
    }

    /// Examples sized so the third clears $10,000/mo at CSO rates. All totals
    /// are computed, never hardcoded, so the screen is arithmetically honest.
    static let all: [EarningsScenario] = [
        EarningsScenario(
            id: "starter",
            label: "Getting started",
            caption: "A few referrals a week from your own network.",
            ace1Referrals: 10,
            advancedCourseRegistrations: 4,
            bundleSales: 1,
            activeCSOReferrals: 2
        ),
        EarningsScenario(
            id: "builder",
            label: "Building momentum",
            caption: "Posting consistently and following up with your students.",
            ace1Referrals: 25,
            advancedCourseRegistrations: 15,
            bundleSales: 3,
            activeCSOReferrals: 8
        ),
        EarningsScenario(
            id: "pro",
            label: "Full-time affiliate",
            caption: "Treating your affiliate business like a real business.",
            ace1Referrals: 40,
            advancedCourseRegistrations: 30,
            bundleSales: 8,
            activeCSOReferrals: 20
        ),
    ]
}
