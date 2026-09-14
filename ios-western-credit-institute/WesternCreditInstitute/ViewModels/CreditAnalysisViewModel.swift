//
//  CreditAnalysisViewModel.swift
//  WesternCreditInstitute
//

import Foundation

/// Drives Analyze My Credit Report: loads the latest saved analysis for each
/// bureau and exposes the negative accounts the user can dispute.
///
/// Mirrors the Expo `NegativeAccountsDashboard` data flow, which reads the same
/// `aiAgents.getBureauDashboard` endpoint.
@MainActor
@Observable
final class CreditAnalysisViewModel {
    /// What the screen should render right now.
    enum Phase: Equatable {
        case loading
        case ready
        /// Loaded fine, but the user has never uploaded a report.
        case empty
        case failed(message: String)
    }

    let userId: String

    private(set) var dashboard: BureauDashboard?
    private(set) var phase: Phase = .loading
    /// Set when a refresh fails but cached data is still on screen, so the
    /// stale results can be labelled instead of silently presented as current.
    private(set) var staleWarning: String?

    private let service = AIAgentService.shared

    init(userId: String) {
        self.userId = userId

        // Instant paint from the persisted cache while the refresh runs.
        if let cached = service.cachedDashboard(userId: userId) {
            dashboard = cached
            phase = cached.bureaus.isEmpty ? .empty : .ready
        }
    }

    // MARK: - Loading

    func load() async {
        guard !userId.isEmpty else {
            phase = .failed(message: "We couldn't identify your account.")
            return
        }

        if dashboard == nil { phase = .loading }

        do {
            let result = try await service.fetchBureauDashboard(userId: userId)
            dashboard = result
            staleWarning = nil
            phase = result.bureaus.isEmpty ? .empty : .ready
            service.cacheDashboard(result, userId: userId)
        } catch {
            // Cached results keep the screen useful when the network fails —
            // but they are labelled, never passed off as fresh.
            if dashboard == nil {
                phase = .failed(message: Self.message(for: error))
            } else {
                staleWarning = "Showing your last saved analysis — we couldn't reach the server to check for updates."
                phase = (dashboard?.bureaus.isEmpty ?? true) ? .empty : .ready
            }
        }
    }

    func refresh() async {
        await load()
    }

    // MARK: - Derived state

    var bureaus: [BureauAnalysis] {
        dashboard?.sortedBureaus ?? []
    }

    var totalNegativeCount: Int {
        dashboard?.totalNegativeAcrossBureaus ?? 0
    }

    var totalAccountsReviewed: Int {
        bureaus.reduce(0) { $0 + $1.totalAccounts }
    }

    /// Combined reported balance of every negative item, across bureaus.
    var totalNegativeBalance: Double {
        bureaus.reduce(0) { $0 + $1.totalNegativeBalance }
    }

    /// Headline for the summary card.
    var headline: String {
        if totalNegativeCount == 0 {
            return "No Negative Items Found"
        }
        return "\(totalNegativeCount) Negative Item\(totalNegativeCount == 1 ? "" : "s") Found"
    }

    /// One-line explanation under the headline.
    var summaryDetail: String {
        guard totalNegativeCount > 0 else {
            return "Reviewed \(totalAccountsReviewed) account\(totalAccountsReviewed == 1 ? "" : "s") across \(bureaus.count) bureau\(bureaus.count == 1 ? "" : "s") and found no negative items. Focus now shifts to building positive history and keeping utilization low."
        }
        return "Reviewed \(totalAccountsReviewed) account\(totalAccountsReviewed == 1 ? "" : "s") across \(bureaus.count) bureau\(bureaus.count == 1 ? "" : "s"), totaling \(Format.currency(totalNegativeBalance)) in reported negative balances."
    }

    // MARK: - Helpers

    private static func message(for error: Error) -> String {
        if case TRPCClientError.server(let message) = error { return message }
        return error.localizedDescription
    }
}
