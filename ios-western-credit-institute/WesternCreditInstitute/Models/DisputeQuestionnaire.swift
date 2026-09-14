//
//  DisputeQuestionnaire.swift
//  WesternCreditInstitute
//

import Foundation

/// A single selectable answer.
nonisolated struct DisputeQuestionOption: Sendable, Identifiable {
    let value: String
    let label: String
    var id: String { value }
}

/// One rung of the escalation ladder.
nonisolated struct DisputeQuestion: Sendable, Identifiable {
    let id: String
    let title: String
    let options: [DisputeQuestionOption]
}

/// Everything the letter generator needs once the questionnaire is complete.
nonisolated struct RecommendedLetter: Sendable {
    /// The raw recommendation, e.g. "611 Letter" or "Legal Action".
    let recommendation: String
    /// Template to generate, or `nil` when this is guidance rather than a letter.
    let letterType: String?
    /// Why this was recommended, including what the consumer already did.
    let rationale: String
    /// False when the recommendation is advice rather than a mailable letter.
    let isGeneratable: Bool
    /// Extra instruction shown when the recommendation is guidance-only.
    let guidance: String?
}

/// Single source of truth for the AI Dispute Assistant's escalation questions
/// and for turning answers into a concrete letter type.
///
/// WHY THIS EXISTS
/// ---------------
/// Picking a letter from WHAT the negative item is (collection, charge-off,
/// late payment...) is only half the story. The correct letter also depends on
/// HOW FAR the consumer has already escalated: a 611 method-of-verification
/// request is wrong if the bureau was never disputed in the first place, and a
/// 609 is wasted if they already sent one. Recommending from the account type
/// alone means the agent is guessing about steps already taken.
///
/// Mirrors `expo/lib/dispute-questionnaire.ts` one-for-one. The two apps must
/// ask the same questions and reach the same recommendation, so any change
/// here belongs in that file too.
nonisolated enum DisputeQuestionnaire {

    private static let yesNo: [DisputeQuestionOption] = [
        DisputeQuestionOption(value: "yes", label: "Yes"),
        DisputeQuestionOption(value: "no", label: "No"),
    ]

    /// The escalation ladder, in order. Question one establishes who is being
    /// disputed; steps 1-6 establish how far the consumer has already
    /// escalated. The FIRST step answered "no" is the next action to take.
    static let questions: [DisputeQuestion] = [
        DisputeQuestion(
            id: "disputeType",
            title: "Are you disputing Original Creditor or Debt Collector?",
            options: [
                DisputeQuestionOption(value: "originalCreditorOpen", label: "Original Creditor (Open Account)"),
                DisputeQuestionOption(value: "originalCreditorClosed", label: "Original Creditor (Closed Account)"),
                DisputeQuestionOption(value: "debtCollector", label: "Debt Collector"),
            ]
        ),
        DisputeQuestion(
            id: "step1",
            title: "Did you dispute with the Credit Reporting Agency Online?",
            options: yesNo
        ),
        DisputeQuestion(
            id: "step2",
            title: "Did you send a certified mail dispute to the information furnisher?",
            options: yesNo
        ),
        DisputeQuestion(
            id: "step3",
            title: "Did you send an Intent to sue letter to the information furnisher?",
            options: yesNo
        ),
        DisputeQuestion(
            id: "step4",
            title: "Did you request the method of verification from the Credit Reporting Agency?",
            options: yesNo
        ),
        DisputeQuestion(
            id: "step5",
            title: "Did you send 609 Letter to the Credit Reporting Agency demanding removal?",
            options: yesNo
        ),
        DisputeQuestion(
            id: "step6",
            title: "Did you try advanced dispute method for the Credit Reporting Agency?",
            options: yesNo
        ),
    ]

    /// Plain-language description of each completed step, for the rationale.
    /// Ordered, because the rationale reads them back as a sequence.
    private static let stepCompletedLabels: [(id: String, label: String)] = [
        ("step1", "disputed online with the credit reporting agency"),
        ("step2", "sent a certified-mail dispute to the furnisher"),
        ("step3", "sent an Intent to Sue letter to the furnisher"),
        ("step4", "requested the method of verification"),
        ("step5", "sent a 609 letter demanding removal"),
        ("step6", "tried an advanced dispute method"),
    ]

    private static let disputeTypeLabels: [String: String] = [
        "originalCreditorOpen": "Original Creditor (Open Account)",
        "originalCreditorClosed": "Original Creditor (Closed Account)",
        "debtCollector": "Debt Collector",
    ]

    /// Human-readable label for the selected dispute target.
    static func disputeTypeLabel(_ disputeType: String?) -> String {
        disputeTypeLabels[disputeType ?? ""] ?? "Unspecified"
    }

    /// Determines the recommended next action from a complete (or partial) set
    /// of answers. The first escalation step answered "no" wins, because that
    /// is the next rung on the ladder the consumer has not yet climbed.
    static func recommendation(for answers: [String: String]) -> String {
        let disputeType = answers["disputeType"]

        if answers["step1"] == "no" { return "Online Disputes" }

        if answers["step2"] == "no" {
            if disputeType == "originalCreditorClosed" { return "623 Letter" }
            if disputeType == "originalCreditorOpen" { return "Open Account Dispute" }
            if disputeType == "debtCollector" { return "809 Letter" }
        }

        if answers["step3"] == "no" {
            if disputeType == "originalCreditorOpen" || disputeType == "originalCreditorClosed" {
                return "Intent to Sue Creditor"
            }
            if disputeType == "debtCollector" { return "Intent to Sue Debt Collector" }
        }

        if answers["step4"] == "no" { return "611 Letter" }
        if answers["step5"] == "no" { return "609 Letter" }
        if answers["step6"] == "no" { return "Hand Written Dispute Letter" }

        return "Legal Action"
    }

    /// Given the question just answered, returns the recommendation to show
    /// now, or `nil` when the questionnaire should advance to the next
    /// question.
    ///
    /// Answering "no" ends the questionnaire early: that unclimbed rung IS the
    /// recommendation, so there is no value in asking about later escalations.
    static func recommendationForAnswer(
        questionId: String,
        value: String,
        answers: [String: String]
    ) -> String? {
        if questionId == "step6" {
            return value == "no" ? "Hand Written Dispute Letter" : "Legal Action"
        }
        guard value == "no" else { return nil }
        guard questionId != "disputeType" else { return nil }
        return recommendation(for: answers)
    }

    private static let recommendationDescriptions: [String: String] = [
        "Online Disputes": "We recommend you first dispute with the Credit Reporting Agency online. This is the quickest way to start the dispute process.",
        "623 Letter": "We recommend sending a 623 Letter to the original creditor requesting verification and correction of inaccurate information.",
        "Open Account Dispute": "We recommend sending an Open Account Dispute letter challenging the accuracy of the information for your open account.",
        "809 Letter": "We recommend sending an 809 Letter to the debt collector requesting validation of the debt within 30 days.",
        "Intent to Sue Creditor": "We recommend sending an Intent to Sue letter informing them of your intention to take legal action.",
        "Intent to Sue Debt Collector": "We recommend sending an Intent to Sue letter to the debt collector.",
        "611 Letter": "We recommend sending a 611 Letter to request the method of verification from the Credit Reporting Agency.",
        "609 Letter": "We recommend sending a 609 Letter demanding removal and requesting all verification documents.",
        "Hand Written Dispute Letter": "We recommend trying an advanced dispute method with a hand-written letter.",
        "Legal Action": "You have exhausted all standard dispute options. Consider consulting with a consumer law attorney.",
    ]

    /// Plain-language explanation of a recommendation.
    static func description(for recommendation: String) -> String {
        recommendationDescriptions[recommendation] ?? ""
    }

    /// Letter types the generator can actually produce.
    ///
    /// Recommendations outside this set are real advice but not a mailable
    /// letter, or need mapping onto the closest template.
    private static let generatableLetterTypes: Set<String> = [
        "609 Letter",
        "611 Letter",
        "623 Letter",
        "809 Letter",
        "Intent to Sue Creditor",
        "Intent to Sue Debt Collector",
    ]

    /// Recommendations that are guidance rather than a letter to mail. Sending
    /// the user into the letter generator here would be wrong.
    private static let guidanceOnly: [String: String] = [
        "Online Disputes": "Start by filing the dispute on the bureau's website - it is free, takes minutes, and the 30-day clock it starts is what makes every later letter enforceable. Come back here once it comes back verified.",
        "Legal Action": "You have worked through every standard escalation. The next step is a consumer-law attorney, who can pursue FCRA/FDCPA statutory damages on your behalf. Most offer free consultations and work on contingency.",
    ]

    /// Recommendations that map onto a different template than their display
    /// name. Each carries a note so the substitution is visible, not silent.
    private static let letterTypeAliases: [String: (letterType: String, note: String)] = [
        "Open Account Dispute": (
            "623 Letter",
            "Sent as an FCRA §623 furnisher dispute, which is the governing statute for disputing an open account directly with the creditor."
        ),
        "Hand Written Dispute Letter": (
            "609 Letter",
            "Drafted as an FCRA §609 disclosure request. For this advanced-method step, copy the text out and hand-write it before mailing - hand-written letters are less likely to be routed to automated processing."
        ),
    ]

    /// Summarises what the consumer has already done, so the rationale can
    /// state the reasoning rather than assert a conclusion. Returns an empty
    /// string when nothing has been completed yet.
    static func summarizePriorSteps(_ answers: [String: String]) -> String {
        let completed = stepCompletedLabels
            .filter { answers[$0.id] == "yes" }
            .map(\.label)

        if completed.isEmpty { return "" }
        if completed.count == 1 { return "You have already \(completed[0])." }

        let last = completed[completed.count - 1]
        let leading = completed.dropLast().joined(separator: ", ")
        return "You have already \(leading) and \(last)."
    }

    /// Turns a completed questionnaire into everything the letter generator
    /// needs: which template to use, and a rationale reflecting steps taken.
    static func resolveRecommendedLetter(_ answers: [String: String]) -> RecommendedLetter {
        let recommendation = recommendation(for: answers)
        let priorSteps = summarizePriorSteps(answers)
        let description = description(for: recommendation)

        if let guidance = guidanceOnly[recommendation] {
            return RecommendedLetter(
                recommendation: recommendation,
                letterType: nil,
                rationale: [priorSteps, description].filter { !$0.isEmpty }.joined(separator: " "),
                isGeneratable: false,
                guidance: guidance
            )
        }

        let alias = letterTypeAliases[recommendation]
        let letterType = alias?.letterType ?? recommendation
        let rationale = [priorSteps, description, alias?.note ?? ""]
            .filter { !$0.isEmpty }
            .joined(separator: " ")

        return RecommendedLetter(
            recommendation: recommendation,
            letterType: generatableLetterTypes.contains(letterType) ? letterType : "609 Letter",
            rationale: rationale,
            isGeneratable: true,
            guidance: nil
        )
    }
}
