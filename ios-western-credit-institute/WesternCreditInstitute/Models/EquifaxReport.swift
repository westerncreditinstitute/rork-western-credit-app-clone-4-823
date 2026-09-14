//
//  EquifaxReport.swift
//  WesternCreditInstitute
//

import Foundation

/// A negative account as returned by `equifax.fetchCreditReport`.
///
/// This is the Equifax-derived classification, which is a different vocabulary
/// from the manual parser's descriptive `negativeType` strings — see
/// `descriptiveNegativeType` for the bridge between them.
nonisolated struct EquifaxNegativeAccount: Codable, Hashable, Sendable {
    let accountNumber: String
    let creditorName: String
    let creditorAddress: String?
    /// One of: charge-off, collection, late-payment, delinquent, unknown.
    let accountType: String
    let status: String
    let delinquency: String?
    let balance: Double?
    let dateReported: String?
    let bureau: String

    /// Maps the Equifax `accountType` onto the descriptive vocabulary the rest
    /// of the platform uses, so a fetched account and an uploaded one produce
    /// the same letter recommendation.
    ///
    /// Mirrors `determineLetterStrategyFromAccountType` in
    /// `expo/lib/dispute-letter-strategy.ts`, including its fallback of reading
    /// the raw status text when the type comes back "unknown".
    var descriptiveNegativeType: String {
        switch accountType {
        case "charge-off": return "Charge-off"
        case "collection": return "Collection Account"
        case "late-payment": return "Late Payments"
        case "delinquent": return "Derogatory Status"
        default: return Self.inferType(from: "\(status) \(delinquency ?? "")")
        }
    }

    /// Status-text scan used when the bureau didn't classify the item.
    private static func inferType(from text: String) -> String {
        let value = text.lowercased()
        if value.contains("charged off") || value.contains("charge-off") { return "Charge-off" }
        if value.contains("collection") { return "Collection Account" }
        if value.contains("late")
            || value.contains("30 days")
            || value.contains("60 days")
            || value.contains("90 days")
            || value.contains("120 days") { return "Late Payments" }
        if value.contains("foreclos") { return "Foreclosure" }
        if value.contains("repossess") { return "Repossession" }
        if value.contains("bankrupt") { return "Bankruptcy" }
        return "Derogatory Status"
    }
}

/// One bureau's slice of a fetched report.
nonisolated struct EquifaxBureauReport: Codable, Hashable, Sendable {
    let bureau: String
    let fetchedAt: String
    let totalAccounts: Int
    let negativeAccountCount: Int
    let negativeAccounts: [EquifaxNegativeAccount]
    let creditScore: Int?
}

/// Totals across every bureau that answered.
nonisolated struct EquifaxCombinedTotals: Codable, Hashable, Sendable {
    let totalBureaus: Int
    let totalAccounts: Int
    let totalNegativeAccounts: Int
    let averageCreditScore: Int?
}

/// The multi-bureau report body.
nonisolated struct EquifaxReport: Codable, Hashable, Sendable {
    nonisolated struct Bureaus: Codable, Hashable, Sendable {
        let equifax: EquifaxBureauReport?
        let experian: EquifaxBureauReport?
        let transunion: EquifaxBureauReport?
    }

    let fetchedAt: String
    let bureaus: Bureaus
    let combined: EquifaxCombinedTotals
    let allNegativeAccounts: [EquifaxNegativeAccount]

    /// Every bureau that returned data, in the platform's display order.
    var presentBureaus: [EquifaxBureauReport] {
        [bureaus.experian, bureaus.equifax, bureaus.transunion].compactMap { $0 }
    }
}

/// The full `equifax.fetchCreditReport` envelope.
///
/// The procedure reports failures in-band (`success: false` with a message)
/// rather than throwing, so this type carries both outcomes.
nonisolated struct EquifaxFetchResponse: Codable, Sendable {
    let success: Bool
    let report: EquifaxReport?
    let negativeAccounts: [EquifaxNegativeAccount]
    let error: String?
    let errorType: String?
}

/// Consumer details sent with a report request.
nonisolated struct EquifaxConsumerInfo: Hashable, Sendable {
    var firstName: String = ""
    var lastName: String = ""
    var ssn: String = ""
    var dateOfBirth: String = ""
    var address: String = ""
    var city: String = ""
    var state: String = ""
    var zip: String = ""

    /// The bureaus need at least a name or an SSN to match a file.
    var isSufficient: Bool {
        !firstName.trimmingCharacters(in: .whitespaces).isEmpty
            || !lastName.trimmingCharacters(in: .whitespaces).isEmpty
            || !ssn.trimmingCharacters(in: .whitespaces).isEmpty
    }

    /// Only non-empty fields are sent, so blanks never overwrite what the
    /// bureau already holds.
    var payload: [String: String] {
        let fields: [String: String] = [
            "firstName": firstName,
            "lastName": lastName,
            "ssn": ssn,
            "dateOfBirth": dateOfBirth,
            "address": address,
            "city": city,
            "state": state,
            "zip": zip,
        ]
        return fields.compactMapValues { value in
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? nil : trimmed
        }
    }
}
