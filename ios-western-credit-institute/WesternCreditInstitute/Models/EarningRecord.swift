//
//  EarningRecord.swift
//  WesternCreditInstitute
//

import Foundation

nonisolated enum EarningType: String, CaseIterable, Identifiable, Hashable, Sendable {
    case referral
    case commission
    case residual
    case coaching

    var id: String { rawValue }

    var label: String {
        switch self {
        case .referral: return "Referral"
        case .commission: return "Commission"
        case .residual: return "Residual"
        case .coaching: return "Coaching"
        }
    }

    var symbol: String {
        switch self {
        case .referral: return "person.2.fill"
        case .commission: return "dollarsign.circle.fill"
        case .residual: return "chart.line.uptrend.xyaxis"
        case .coaching: return "briefcase.fill"
        }
    }
}

nonisolated enum EarningStatus: String, Hashable, Sendable {
    case pending
    case completed
}

nonisolated struct EarningRecord: Identifiable, Hashable, Sendable {
    let id: String
    let type: EarningType
    let amount: Double
    let date: Date
    let detail: String
    let status: EarningStatus
}
