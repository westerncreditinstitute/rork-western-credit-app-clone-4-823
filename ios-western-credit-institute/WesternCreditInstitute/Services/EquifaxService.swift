//
//  EquifaxService.swift
//  WesternCreditInstitute
//

import Foundation

/// Live credit report retrieval (`equifax.*`).
///
/// Every procedure here is a `protectedProcedure`, so these calls only succeed
/// while a session exists — `TRPCClient` attaches the credential automatically
/// and a rejected one surfaces as `TRPCClientError.unauthorized`.
nonisolated final class EquifaxService: Sendable {
    static let shared = EquifaxService()

    private let client = TRPCClient.shared

    private init() {}

    var isConfigured: Bool { client.isConfigured }

    /// Pulls a fresh tri-bureau report for the signed-in user.
    ///
    /// The user id is NOT sent: the server reads it from the session, so the
    /// report always belongs to whoever is actually signed in.
    func fetchReport(
        consumerInfo: EquifaxConsumerInfo,
        forceRefresh: Bool = false
    ) async throws -> EquifaxFetchResponse {
        guard isConfigured else { throw TRPCClientError.notConfigured }

        var payload: [String: Any] = [
            "multiBureau": true,
            "forceRefresh": forceRefresh,
        ]
        let info = consumerInfo.payload
        if !info.isEmpty {
            payload["consumerInfo"] = info
        }

        return try await client.mutate("equifax.fetchCreditReport", input: ["json": payload])
    }

    /// Persists a fetched bureau report as a saved analysis.
    ///
    /// This is what makes a live fetch durable: `equifax.fetchCreditReport` is
    /// session-only and keeps nothing, so without this the report would vanish
    /// when the screen closed and the agent could never reference it. Saving
    /// puts it in the same `credit_report_analyses` table the upload flow
    /// writes to, which is exactly what the dashboard reads back.
    @discardableResult
    func saveAnalysis(
        userId: String,
        bureau: String,
        accounts: [EquifaxNegativeAccount]
    ) async throws -> SaveAnalysisResponse {
        guard isConfigured else { throw TRPCClientError.notConfigured }

        let rows: [[String: Any]] = accounts.map { account in
            var row: [String: Any] = [
                "creditor": account.creditorName,
                "accountNumber": account.accountNumber,
                // The analysis table stores balances as display strings.
                "balance": account.balance.map { Format.currency($0) } ?? "",
                "status": account.status,
                "openDate": "",
                "lastReported": account.dateReported ?? "",
                "negativeType": account.descriptiveNegativeType,
            ]
            if let address = account.creditorAddress, !address.isEmpty {
                row["furnisherAddress"] = address
            }
            return row
        }

        let payload: [String: Any] = [
            "userId": userId,
            "bureau": bureau,
            "accounts": rows,
        ]

        return try await client.mutate("aiAgents.saveCreditAnalysis", input: ["json": payload])
    }
}

/// Result of persisting an analysis.
///
/// `success` can be false while the computed figures are still returned — the
/// analysis ran but the row couldn't be written (e.g. a migration hasn't been
/// applied), which the UI reports rather than hides.
nonisolated struct SaveAnalysisResponse: Decodable, Sendable {
    let success: Bool?
    let error: String?
    let negativeCount: Int?
    let totalNegativeBalance: Double?
    let summary: String?
}
