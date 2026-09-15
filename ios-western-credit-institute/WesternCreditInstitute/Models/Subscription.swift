//
//  Subscription.swift
//  WesternCreditInstitute
//

import Foundation

nonisolated enum SubscriptionTier: String, CaseIterable, Identifiable, Hashable, Sendable {
    case free
    case ace1Student
    case csoAffiliate

    var id: String { rawValue }

    var label: String {
        switch self {
        case .free: return "Free"
        case .ace1Student: return "ACE-1 Student"
        case .csoAffiliate: return "CSO Affiliate"
        }
    }

    var monthlyFee: Double {
        switch self {
        case .free: return 0
        case .ace1Student: return Pricing.monthlySubscription
        case .csoAffiliate: return Pricing.csoMonthlyFee
        }
    }

    var perks: [String] {
        switch self {
        case .free:
            return [
                "Weekly credit tips",
                "Course previews",
                "Community read access",
                "\(Pricing.format(Pricing.referralAce1Free)) per ACE-1 referral",
            ]
        case .ace1Student:
            return [
                "Full course access",
                "Free for \(Pricing.ace1FreeDays) days",
                "\(Pricing.format(Pricing.referralAce1Enrolled)) per ACE-1 referral",
                "\(Pricing.format(Pricing.referralAce23Bounty)) per ACE-2/ACE-3 referral",
                "Cloud dispute tracker",
            ]
        case .csoAffiliate:
            return [
                "Everything in ACE-1 Student",
                "\(Pricing.formatRate(Pricing.bundleCommissionCSO)) commission on bundle sales",
                "\(Pricing.format(Pricing.referralAce23Bounty)) per ACE-2/ACE-3 referral",
                "Listed in Hire A Pro",
            ]
        }
    }

    /// ACE-1 referral payout at this tier.
    var ace1ReferralBonus: Double { Pricing.ace1ReferralBonus(for: self) }

    /// Dollar payout on a single ACE-4 bundle sale at this tier.
    var bundleCommission: Double { Pricing.bundleCommission(for: self) }
}

nonisolated struct CreditTip: Identifiable, Hashable, Sendable {
    let id: String
    let title: String
    let content: String
    let category: TipCategory
    let publishDate: Date
}

nonisolated enum TipCategory: String, CaseIterable, Identifiable, Hashable, Sendable {
    case repair
    case building
    case management
    case legal
    case business
    case identity

    var id: String { rawValue }

    var label: String { rawValue.capitalized }

    var symbol: String {
        switch self {
        case .repair: return "wrench.and.screwdriver.fill"
        case .building: return "chart.line.uptrend.xyaxis"
        case .management: return "slider.horizontal.3"
        case .legal: return "scalemass.fill"
        case .business: return "briefcase.fill"
        case .identity: return "lock.shield.fill"
        }
    }
}

nonisolated struct AppNotification: Identifiable, Hashable, Sendable {
    let id: String
    let title: String
    let message: String
    let date: Date
    var read: Bool
    let type: NotificationType
}

nonisolated enum NotificationType: String, Hashable, Sendable {
    case course
    case earning
    case system

    var symbol: String {
        switch self {
        case .course: return "book.fill"
        case .earning: return "dollarsign.circle.fill"
        case .system: return "bell.fill"
        }
    }
}

nonisolated struct FeaturedVideo: Identifiable, Hashable, Sendable {
    let id: String
    let youtubeId: String
    let title: String
    let duration: String

    var thumbnailURL: String {
        "https://img.youtube.com/vi/\(youtubeId)/mqdefault.jpg"
    }
}
