//
//  WalletModels.swift
//  WesternCreditInstitute
//

import Foundation

nonisolated enum WalletTransactionType: String, CaseIterable, Identifiable, Hashable, Sendable {
    case referralBonus
    case residualIncome
    case commission
    case payout
    case consultation

    var id: String { rawValue }

    var label: String {
        switch self {
        case .referralBonus: return "Referral Bonus"
        case .residualIncome: return "Residual Income"
        case .commission: return "Commission"
        case .payout: return "Payout"
        case .consultation: return "Consultation"
        }
    }

    var symbol: String {
        switch self {
        case .referralBonus: return "person.2.fill"
        case .residualIncome: return "chart.line.uptrend.xyaxis"
        case .commission: return "dollarsign.circle.fill"
        case .payout: return "arrow.up.circle.fill"
        case .consultation: return "briefcase.fill"
        }
    }
}

nonisolated enum WalletTransactionStatus: String, Hashable, Sendable {
    case pending
    case completed
    case cancelled
}

nonisolated struct WalletTransaction: Identifiable, Hashable, Sendable {
    let id: String
    let type: WalletTransactionType
    let amount: Double
    let status: WalletTransactionStatus
    let detail: String
    let createdAt: Date
}

nonisolated struct WalletSummary: Hashable, Sendable {
    var availableBalance: Double
    var pendingBalance: Double
    var totalEarned: Double
    var totalWithdrawn: Double
}

nonisolated enum PayoutMethod: String, CaseIterable, Identifiable, Hashable, Sendable {
    case paypal
    case bankTransfer

    var id: String { rawValue }

    var label: String {
        switch self {
        case .paypal: return "PayPal"
        case .bankTransfer: return "Bank Transfer"
        }
    }

    var symbol: String {
        switch self {
        case .paypal: return "creditcard.fill"
        case .bankTransfer: return "building.columns.fill"
        }
    }

    var detail: String {
        switch self {
        case .paypal: return "Sent to your PayPal email"
        case .bankTransfer: return "ACH to your linked bank"
        }
    }
}
