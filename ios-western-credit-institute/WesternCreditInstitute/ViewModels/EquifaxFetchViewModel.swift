//
//  EquifaxFetchViewModel.swift
//  WesternCreditInstitute
//

import Foundation

/// Drives the live tri-bureau report pull.
///
/// The endpoint is a `protectedProcedure`, so this is the first screen that
/// depends on a real session: the credential rides along automatically and a
/// rejected one is reported as an expiry rather than a generic failure.
@MainActor
@Observable
final class EquifaxFetchViewModel {
    enum Phase: Equatable {
        case form
        case fetching
        case saving
        case done
        case failed(message: String)
    }

    let userId: String

    var consumerInfo = EquifaxConsumerInfo()
    private(set) var phase: Phase = .form
    private(set) var report: EquifaxReport?
    /// Set when the report arrived but couldn't be stored for later use.
    private(set) var saveWarning: String?

    private let service = EquifaxService.shared

    init(userId: String) {
        self.userId = userId
    }

    var isBusy: Bool {
        phase == .fetching || phase == .saving
    }

    /// Bureaus that returned data, for the result summary.
    var bureauResults: [EquifaxBureauReport] {
        report?.presentBureaus ?? []
    }

    var totalNegatives: Int {
        report?.combined.totalNegativeAccounts ?? 0
    }

    /// Pulls the report, then saves each bureau's slice so it persists.
    func fetch() async {
        guard consumerInfo.isSufficient else {
            phase = .failed(message: "Enter at least your name or SSN so the bureaus can match your file.")
            return
        }

        phase = .fetching
        saveWarning = nil

        do {
            let response = try await service.fetchReport(consumerInfo: consumerInfo)

            // The procedure reports failure in-band rather than throwing.
            guard response.success, let fetched = response.report else {
                phase = .failed(message: response.error ?? "We couldn't retrieve your report. Please try again.")
                return
            }

            report = fetched

            guard fetched.combined.totalAccounts > 0 else {
                phase = .failed(message: "No credit data came back for your details. Double-check your name, SSN and address, then try again.")
                return
            }

            await persist(fetched)
            phase = .done
        } catch {
            phase = .failed(message: Self.message(for: error))
        }
    }

    /// Saves each bureau separately so the dashboard shows them apart, exactly
    /// as an uploaded report would.
    private func persist(_ report: EquifaxReport) async {
        // A demo/seed account has no database-backed id, and `user_id` is a
        // Postgres `uuid` column: every save below would be rejected by the
        // server one round-trip later. Checking up front turns a stack of
        // opaque per-bureau failures into a single, accurate explanation.
        guard Validation.isValidUUID(userId) else {
            saveWarning = Validation.accountNotSetUpMessage
            return
        }

        phase = .saving

        var failures: [String] = []

        for bureau in report.presentBureaus where !bureau.negativeAccounts.isEmpty {
            do {
                let result = try await service.saveAnalysis(
                    userId: userId,
                    bureau: bureau.bureau,
                    accounts: bureau.negativeAccounts
                )
                if result.success == false {
                    failures.append(bureau.bureau)
                }
            } catch {
                failures.append(bureau.bureau)
            }
        }

        guard !failures.isEmpty else { return }

        // Saying so is important: the report is on screen either way, but an
        // unsaved one won't be there next launch and the agent can't cite it.
        saveWarning = failures.count == report.presentBureaus.count
            ? "Your report was retrieved but couldn't be saved, so it won't appear in your saved analyses yet."
            : "Saved \(report.presentBureaus.count - failures.count) of \(report.presentBureaus.count) bureau reports. \(failures.joined(separator: ", ")) couldn't be stored."
    }

    func reset() {
        phase = .form
        report = nil
        saveWarning = nil
    }

    private static func message(for error: Error) -> String {
        guard let clientError = error as? TRPCClientError else {
            return "Something went wrong. Please try again."
        }
        switch clientError {
        case .unauthorized:
            return "Your session expired before the report could be pulled. Sign in again and retry."
        case .server(let message):
            return message
        default:
            return clientError.errorDescription ?? "Something went wrong. Please try again."
        }
    }
}
