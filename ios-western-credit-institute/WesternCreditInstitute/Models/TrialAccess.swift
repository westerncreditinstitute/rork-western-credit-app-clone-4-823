//
//  TrialAccess.swift
//  WesternCreditInstitute
//

import Foundation

/// Billing state of an ACE-1 membership.
nonisolated enum ACE1Status: String, Hashable, Sendable {
    case none
    case trial
    case trialExpired
    case paid
}

/// What an ACE-1 free-trial member can and cannot reach.
///
/// This is the iOS mirror of `expo/constants/trial-access.ts` and must be
/// changed together with it.
///
/// ACE-1 has two distinct states that must not be collapsed into one tier:
///
/// - **Trial** — 7 days, costs nothing, nothing has been billed yet. A genuine
///   preview: the AI agent answers on its normal ACE-1 topics, but the full
///   dispute-letter library stays closed.
/// - **Paid** — the certificate fee has been collected and the monthly
///   subscription is running. Everything is open.
///
/// The distinction matters commercially: the letter library *is* the product,
/// so handing it over during a free trial leaves nothing to subscribe for. A
/// trial member can still act on their credit — but only through the letter
/// their agent specifically recommends after analysing their report, never by
/// browsing the catalogue.
nonisolated enum TrialAccess {

    /// Whether the full dispute-letter library (Credit Repair Tool) is open.
    ///
    /// Paid subscribers only. This is the single check every letter surface
    /// must use, so the tool cannot be reached from one screen while blocked
    /// on another.
    static func canBrowseAllLetters(_ status: ACE1Status) -> Bool {
        status == .paid
    }

    /// Whether the member may generate the one letter their agent recommended.
    ///
    /// Open during the trial on purpose: the recommendation comes out of the
    /// "Analyze My Credit Report" questionnaire, which names a single letter
    /// type for a single account. That is a guided outcome, not catalogue
    /// access, so it demonstrates the product without giving it away.
    static func canUseRecommendedLetter(_ status: ACE1Status) -> Bool {
        status == .trial || status == .paid
    }

    /// Whether course material and the AI agent are reachable at all.
    static func hasActiveAccess(_ status: ACE1Status) -> Bool {
        status == .trial || status == .paid
    }

    /// Shown when a trial member taps the Credit Repair Tool.
    static let lettersLockedTitle = "Included with your subscription"

    /// Explains the lock honestly: it names what is still usable during the
    /// trial, so the message reads as a boundary rather than a dead end.
    static let lettersLockedMessage = """
        The full dispute letter library opens when your subscription starts. \
        During your trial, run "Analyze My Credit Report" and your agent will \
        prepare the specific letter your situation calls for.
        """

    /// Short caption for the locked Credit Repair Tool row.
    static let lettersLockedCaption = "Unlocks when your subscription starts"
}
