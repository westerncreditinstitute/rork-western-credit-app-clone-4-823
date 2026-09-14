//
//  CreditSummaryViewModel.swift
//  WesternCreditInstitute
//

import Foundation

/// One bureau's slot in the summary grid. Bureaus with no saved report are
/// still represented (`analysis == nil`) so a missing bureau reads as an
/// explicit gap rather than silently vanishing from the totals.
nonisolated struct BureauTile: Identifiable, Sendable {
    let bureau: String
    let analysis: BureauAnalysis?

    var id: String { bureau }
    var hasReport: Bool { analysis != nil }
    var negativeCount: Int { analysis?.negativeCount ?? 0 }
}

/// How often one classification of negative item appears across every bureau.
nonisolated struct NegativeTypeCount: Identifiable, Sendable {
    let type: String
    let count: Int

    var id: String { type }
}

/// Drives the Credit Summary screen: the combined picture across every bureau
/// the user has a saved report for.
///
/// Mirrors the Expo `CreditSummaryDashboard`, reading the same
/// `aiAgents.getBureauDashboard` endpoint that powers `CreditAnalysisView`.
/// That screen answers "what do I dispute next"; this one answers "where do I
/// stand overall".
@MainActor
@Observable
final class CreditSummaryViewModel {
    /// What the screen should render right now.
    enum Phase: Equatable {
        case loading
        case ready
        /// Loaded fine, but the user has never saved a report.
        case empty
        case failed(message: String)
    }

    /// Every bureau the summary accounts for, in report order.
    static let allBureaus = ["Experian", "Equifax", "TransUnion"]

    let userId: String

    private(set) var dashboard: BureauDashboard?
    private(set) var phase: Phase = .loading
    /// Set when a refresh fails but cached data is still on screen, so stale
    /// results are labelled instead of presented as current.
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

    /// A tile per bureau, including the ones with nothing on file.
    var bureauTiles: [BureauTile] {
        Self.allBureaus.map { name in
            let match = bureaus.first {
                $0.bureau.caseInsensitiveCompare(name) == .orderedSame
            }
            return BureauTile(bureau: name, analysis: match)
        }
    }

    /// Reports actually on file — the denominator behind the totals.
    var reportsOnFile: Int { bureaus.count }

    var missingBureauCount: Int {
        max(0, Self.allBureaus.count - reportsOnFile)
    }

    /// Total negative items across every saved report. The backend already
    /// sums this, so the server's figure wins and the local reduce is only a
    /// fallback for cached payloads written before that field existed.
    var totalNegativeCount: Int {
        if let total = dashboard?.totalNegativeAcrossBureaus, total > 0 { return total }
        return bureaus.reduce(0) { $0 + $1.negativeCount }
    }

    var totalAccountsReviewed: Int {
        bureaus.reduce(0) { $0 + $1.totalAccounts }
    }

    var totalNegativeBalance: Double {
        bureaus.reduce(0) { $0 + $1.totalNegativeBalance }
    }

    /// Most recent upload across all bureaus, so the user can judge how
    /// current the combined picture is.
    var lastUpdatedText: String? {
        bureaus
            .compactMap(\.uploadedDate)
            .max()
            .map { Format.mediumDate($0) }
    }

    /// Negative items tallied by classification across every bureau — shows
    /// at a glance whether collections or late payments dominate the file.
    var typeBreakdown: [NegativeTypeCount] {
        var counts: [String: Int] = [:]
        for bureau in bureaus {
            for account in bureau.negativeAccounts {
                let type = account.negativeType.isEmpty ? "Other" : account.negativeType
                counts[type, default: 0] += 1
            }
        }
        // Count descending, then alphabetical so ties keep a stable order.
        return counts
            .map { NegativeTypeCount(type: $0.key, count: $0.value) }
            .sorted { lhs, rhs in
                lhs.count == rhs.count ? lhs.type < rhs.type : lhs.count > rhs.count
            }
    }

    /// Largest single type count, used to scale the breakdown bars.
    var maxTypeCount: Int {
        typeBreakdown.first?.count ?? 0
    }

    /// Caption under the hero number.
    var heroCaption: String {
        guard totalNegativeCount > 0 else {
            return "Nothing negative found in any saved report"
        }
        return "across \(reportsOnFile) report\(reportsOnFile == 1 ? "" : "s") on file"
    }

    /// Warning shown when the total only covers part of the file.
    var missingBureauNote: String? {
        guard missingBureauCount > 0 else { return nil }
        let verb = missingBureauCount == 1 ? "has" : "have"
        return "\(missingBureauCount) of \(Self.allBureaus.count) bureaus \(verb) no report on file — the total only covers what you've pulled so far."
    }

    // MARK: - Helpers

    private static func message(for error: Error) -> String {
        if case TRPCClientError.server(let message) = error { return message }
        return error.localizedDescription
    }
}
