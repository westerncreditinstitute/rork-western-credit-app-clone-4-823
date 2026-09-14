//
//  CreditAnalysis.swift
//  WesternCreditInstitute
//

import Foundation

/// One negative account from a saved credit report analysis, together with the
/// letter the backend's strategy table recommends for it.
///
/// Mirrors an entry of `negativeAccounts` from `aiAgents.getBureauDashboard`
/// (see `analyzeCreditAccounts` in `backend/trpc/routes/ai-agents.ts`).
nonisolated struct NegativeAccount: Codable, Hashable, Sendable, Identifiable {
    let creditor: String
    /// Mailing address for the dispute letter, when the report carried one.
    let furnisherAddress: String?
    let accountNumber: String
    /// Classification, e.g. "Collection Account" or "Charge-off".
    let negativeType: String
    /// Letter the backend recommends for this KIND of negative item. The
    /// questionnaire can override it based on steps already taken.
    let letterType: String
    let rationale: String
    /// Reported balance as printed on the report, e.g. "$1,204.00".
    let balance: String

    /// Stable within a bureau: the same creditor can appear twice with
    /// different account numbers.
    var id: String { "\(creditor)-\(accountNumber)-\(negativeType)" }

    private enum CodingKeys: String, CodingKey {
        case creditor, furnisherAddress, accountNumber, negativeType
        case letterType, rationale, balance
    }

    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        creditor = try container.decodeIfPresent(String.self, forKey: .creditor) ?? "Unknown Creditor"
        furnisherAddress = try container.decodeIfPresent(String.self, forKey: .furnisherAddress)
        accountNumber = try container.decodeIfPresent(String.self, forKey: .accountNumber) ?? ""
        negativeType = try container.decodeIfPresent(String.self, forKey: .negativeType) ?? "Derogatory Status"
        letterType = try container.decodeIfPresent(String.self, forKey: .letterType) ?? "609 Letter"
        rationale = try container.decodeIfPresent(String.self, forKey: .rationale) ?? ""
        balance = try container.decodeIfPresent(String.self, forKey: .balance) ?? ""
    }
}

/// The most recent saved analysis for one bureau.
nonisolated struct BureauAnalysis: Codable, Hashable, Sendable, Identifiable {
    let analysisId: Int
    let bureau: String
    let createdAt: String
    let totalAccounts: Int
    let negativeCount: Int
    let totalNegativeBalance: Double
    let summary: String
    let negativeAccounts: [NegativeAccount]

    var id: String { bureau }

    var hasNegatives: Bool { negativeCount > 0 }

    /// Upload date, shown so the user knows how current the report is.
    var uploadedDate: Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFraction.date(from: createdAt) { return date }
        return ISO8601DateFormatter().date(from: createdAt)
    }

    var uploadedDateText: String? {
        uploadedDate.map { Format.mediumDate($0) }
    }

    private enum CodingKeys: String, CodingKey {
        case analysisId, bureau, createdAt, totalAccounts
        case negativeCount, totalNegativeBalance, summary, negativeAccounts
    }

    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        analysisId = try container.decodeIfPresent(Int.self, forKey: .analysisId) ?? 0
        bureau = try container.decodeIfPresent(String.self, forKey: .bureau) ?? "Unknown"
        createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt) ?? ""
        totalAccounts = try container.decodeIfPresent(Int.self, forKey: .totalAccounts) ?? 0
        negativeCount = try container.decodeIfPresent(Int.self, forKey: .negativeCount) ?? 0
        totalNegativeBalance = try container.decodeIfPresent(Double.self, forKey: .totalNegativeBalance) ?? 0
        summary = try container.decodeIfPresent(String.self, forKey: .summary) ?? ""
        negativeAccounts = try container.decodeIfPresent([NegativeAccount].self, forKey: .negativeAccounts) ?? []
    }
}

/// Envelope returned by `aiAgents.getBureauDashboard`.
nonisolated struct BureauDashboard: Codable, Sendable {
    let bureaus: [BureauAnalysis]
    let totalNegativeAcrossBureaus: Int

    private enum CodingKeys: String, CodingKey {
        case bureaus, totalNegativeAcrossBureaus
    }

    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        bureaus = try container.decodeIfPresent([BureauAnalysis].self, forKey: .bureaus) ?? []
        totalNegativeAcrossBureaus = try container
            .decodeIfPresent(Int.self, forKey: .totalNegativeAcrossBureaus) ?? 0
    }

    nonisolated init(bureaus: [BureauAnalysis], totalNegativeAcrossBureaus: Int) {
        self.bureaus = bureaus
        self.totalNegativeAcrossBureaus = totalNegativeAcrossBureaus
    }

    /// Experian, Equifax, TransUnion first; anything else alphabetical after.
    /// Matches the Expo dashboard's `sortBureaus`.
    static let bureauOrder = ["Experian", "Equifax", "TransUnion"]

    var sortedBureaus: [BureauAnalysis] {
        bureaus.sorted { a, b in
            let ai = Self.bureauOrder.firstIndex(of: a.bureau)
            let bi = Self.bureauOrder.firstIndex(of: b.bureau)
            switch (ai, bi) {
            case let (x?, y?): return x < y
            case (_?, nil): return true
            case (nil, _?): return false
            default: return a.bureau < b.bureau
            }
        }
    }
}

/// The account the user chose to dispute, carried into the questionnaire and
/// then into the letter generator.
nonisolated struct DisputeTarget: Hashable, Sendable, Identifiable {
    let creditor: String
    let accountNumber: String
    let furnisherAddress: String?
    /// The type-based recommendation, kept so the UI can show what changed
    /// when the questionnaire lands somewhere else.
    let suggestedLetterType: String
    let negativeType: String
    let bureau: String

    var id: String { "\(bureau)-\(creditor)-\(accountNumber)" }

    init(account: NegativeAccount, bureau: String) {
        creditor = account.creditor
        accountNumber = account.accountNumber
        furnisherAddress = account.furnisherAddress
        suggestedLetterType = account.letterType
        negativeType = account.negativeType
        self.bureau = bureau
    }
}
