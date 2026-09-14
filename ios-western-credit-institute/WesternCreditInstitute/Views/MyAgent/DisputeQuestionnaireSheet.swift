//
//  DisputeQuestionnaireSheet.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Everything the caller needs once the questionnaire resolves to a letter.
nonisolated struct DisputeQuestionnaireResult: Sendable {
    let letterType: String
    let creditor: String
    let accountNumber: String
    let furnisherAddress: String?
    let rationale: String
    /// Raw answers, so the flow can be audited or resumed later.
    let answers: [String: String]
    /// What the recipient is to the consumer, for the letter's opening.
    let recipientKind: DisputeLetterComposer.RecipientKind
}

/// Asks the AI Dispute Assistant's escalation questions before recommending a
/// letter for a specific negative account.
///
/// WHY THE QUESTIONS COME FIRST
/// ----------------------------
/// Analyze My Credit Report knows WHAT each negative item is (collection,
/// charge-off, late payment) and the backend maps that to a suggested letter.
/// But the correct letter also depends on HOW FAR the consumer has escalated:
/// a method-of-verification request is wrong if the bureau was never disputed,
/// and a second 609 is wasted effort. Jumping straight from an account to a
/// letter would confidently produce the wrong instrument, so these questions
/// run first and may override the type-based suggestion.
///
/// Mirrors `expo/components/MyAgent/DisputeQuestionnaireModal.tsx`.
struct DisputeQuestionnaireSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss

    let target: DisputeTarget
    let onComplete: (DisputeQuestionnaireResult) -> Void

    @State private var questionIndex = 0
    @State private var answers: [String: String] = [:]
    /// Set once the ladder resolves, which can happen before the last
    /// question: the first step answered "no" IS the recommendation.
    @State private var recommendation: String?

    private let questions = DisputeQuestionnaire.questions

    private var resolved: RecommendedLetter? {
        recommendation == nil ? nil : DisputeQuestionnaire.resolveRecommendedLetter(answers)
    }

    private var progress: Double {
        if recommendation != nil { return 1 }
        return Double(questionIndex + 1) / Double(questions.count)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    accountCard
                    progressBar

                    if let recommendation, let resolved {
                        recommendationCard(recommendation: recommendation, resolved: resolved)
                    } else {
                        questionCard
                    }

                    backButton
                }
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.md)
            }
            .background(theme.colors.background)
            .scrollIndicators(.hidden)
            .navigationTitle("Dispute Strategy")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                        .foregroundStyle(theme.colors.textSecondary)
                }
            }
        }
    }

    // MARK: - Account context

    private var accountCard: some View {
        CardView {
            VStack(alignment: .leading, spacing: 4) {
                Text(target.creditor)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(theme.colors.text)

                if !target.accountNumber.isEmpty {
                    Text("Account \(target.accountNumber)")
                        .font(.system(size: 12))
                        .foregroundStyle(theme.colors.textSecondary)
                }

                Text("\(target.negativeType) · \(target.bureau)")
                    .font(.system(size: 12))
                    .foregroundStyle(theme.colors.textSecondary)

                if let picked = answers["disputeType"] {
                    Text("Disputing: \(DisputeQuestionnaire.disputeTypeLabel(picked))")
                        .font(.system(size: 12))
                        .foregroundStyle(theme.colors.textSecondary)
                }

                Text("Based on the account type alone this looks like a \(target.suggestedLetterType). Your answers below confirm or override that.")
                    .font(.system(size: 11))
                    .italic()
                    .lineSpacing(2)
                    .foregroundStyle(theme.colors.textLight)
                    .padding(.top, Spacing.xs)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var progressBar: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(theme.colors.surfaceAlt)
                Capsule()
                    .fill(theme.colors.primary)
                    .frame(width: max(6, geo.size.width * progress))
            }
        }
        .frame(height: 6)
        .animation(.snappy(duration: 0.25), value: progress)
        .accessibilityLabel("Question \(min(questionIndex + 1, questions.count)) of \(questions.count)")
    }

    // MARK: - Question

    private var questionCard: some View {
        let question = questions[questionIndex]

        return CardView(padding: Spacing.lg) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                Text("QUESTION \(questionIndex + 1) OF \(questions.count)")
                    .font(.system(size: 11, weight: .bold))
                    .kerning(1.2)
                    .foregroundStyle(theme.colors.textLight)

                Text(question.title)
                    .font(.system(size: 17, weight: .bold))
                    .lineSpacing(3)
                    .foregroundStyle(theme.colors.text)
                    .fixedSize(horizontal: false, vertical: true)

                VStack(spacing: Spacing.sm) {
                    ForEach(question.options) { option in
                        optionRow(question: question, option: option)
                    }
                }

                Text("Your answers decide which letter comes next — the right letter depends on how far you have already escalated, not just on what the account is.")
                    .font(.system(size: 12))
                    .lineSpacing(3)
                    .foregroundStyle(theme.colors.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func optionRow(question: DisputeQuestion, option: DisputeQuestionOption) -> some View {
        let isSelected = answers[question.id] == option.value
        let colors = theme.colors

        return Button {
            Haptics.selection()
            answer(questionId: question.id, value: option.value)
        } label: {
            HStack(spacing: Spacing.sm + 2) {
                ZStack {
                    Circle()
                        .strokeBorder(isSelected ? colors.primary : colors.border, lineWidth: 2)
                        .frame(width: 22, height: 22)
                    if isSelected {
                        Circle()
                            .fill(colors.primary)
                            .frame(width: 11, height: 11)
                    }
                }

                Text(option.label)
                    .font(.system(size: 15, weight: isSelected ? .semibold : .regular))
                    .foregroundStyle(isSelected ? colors.primary : colors.text)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)

                Spacer(minLength: 0)
            }
            .padding(Spacing.md - 2)
            .background(
                isSelected ? colors.primary.opacity(0.08) : colors.surfaceAlt,
                in: .rect(cornerRadius: Radius.md, style: .continuous)
            )
            .overlay {
                RoundedRectangle(cornerRadius: Radius.md, style: .continuous)
                    .strokeBorder(isSelected ? colors.primary.opacity(0.5) : .clear, lineWidth: 1)
            }
            .contentShape(.rect)
        }
        .buttonStyle(PressableButtonStyle())
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    // MARK: - Recommendation

    @ViewBuilder
    private func recommendationCard(recommendation: String, resolved: RecommendedLetter) -> some View {
        let colors = theme.colors

        CardView(padding: Spacing.lg) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(colors.success)
                    Text("RECOMMENDED NEXT STEP")
                        .font(.system(size: 12, weight: .bold))
                        .kerning(0.8)
                        .foregroundStyle(colors.success)
                }

                Text(recommendation)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 7)
                    .background(colors.primary, in: .capsule)

                Text(DisputeQuestionnaire.description(for: recommendation))
                    .font(.system(size: 15))
                    .lineSpacing(3)
                    .foregroundStyle(colors.text)
                    .fixedSize(horizontal: false, vertical: true)

                if !resolved.rationale.isEmpty {
                    HStack(alignment: .top, spacing: Spacing.sm) {
                        Image(systemName: "info.circle.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(colors.primary)
                        Text(resolved.rationale)
                            .font(.system(size: 13))
                            .lineSpacing(2)
                            .foregroundStyle(colors.text)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(Spacing.md)
                    .background(colors.infoLight, in: .rect(cornerRadius: Radius.md, style: .continuous))
                }

                if resolved.isGeneratable, let letterType = resolved.letterType {
                    // Worth calling out when the questions changed the answer:
                    // otherwise the user sees a different letter than the card
                    // promised, with no explanation.
                    if letterType != target.suggestedLetterType {
                        Text("This differs from the \(target.suggestedLetterType) suggested by the account type, because of the steps you have already taken.")
                            .font(.system(size: 12))
                            .lineSpacing(2)
                            .foregroundStyle(colors.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    Button {
                        Haptics.medium()
                        complete(letterType: letterType, rationale: resolved.rationale)
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "doc.text.fill")
                            Text("Generate \(letterType)")
                        }
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(colors.primary, in: .rect(cornerRadius: Radius.md, style: .continuous))
                    }
                    .buttonStyle(PressableButtonStyle())
                    .accessibilityLabel("Generate \(letterType)")
                } else if let guidance = resolved.guidance {
                    Text(guidance)
                        .font(.system(size: 14))
                        .lineSpacing(3)
                        .foregroundStyle(colors.text)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(Spacing.md)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(colors.warningLight.opacity(0.35), in: .rect(cornerRadius: Radius.md, style: .continuous))

                    Button {
                        Haptics.light()
                        dismiss()
                    } label: {
                        Text("Got it")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(colors.textSecondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 13)
                            .background(colors.surfaceAlt, in: .rect(cornerRadius: Radius.md, style: .continuous))
                    }
                    .buttonStyle(PressableButtonStyle())
                }
            }
        }
    }

    private var backButton: some View {
        Button {
            Haptics.light()
            goBack()
        } label: {
            HStack(spacing: 5) {
                Image(systemName: "arrow.left")
                    .font(.system(size: 13, weight: .semibold))
                Text(recommendation == nil && questionIndex == 0 ? "Cancel" : "Back")
                    .font(.system(size: 14, weight: .semibold))
            }
            .foregroundStyle(theme.colors.textSecondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
        }
        .buttonStyle(PressableButtonStyle())
    }

    // MARK: - Flow

    private func answer(questionId: String, value: String) {
        answers[questionId] = value

        if let rec = DisputeQuestionnaire.recommendationForAnswer(
            questionId: questionId,
            value: value,
            answers: answers
        ) {
            withAnimation(.snappy(duration: 0.25)) { recommendation = rec }
            return
        }

        withAnimation(.snappy(duration: 0.25)) {
            questionIndex = min(questionIndex + 1, questions.count - 1)
        }
    }

    private func goBack() {
        if recommendation != nil {
            withAnimation(.snappy(duration: 0.25)) { recommendation = nil }
            return
        }
        if questionIndex > 0 {
            withAnimation(.snappy(duration: 0.25)) { questionIndex -= 1 }
            return
        }
        dismiss()
    }

    private func complete(letterType: String, rationale: String) {
        onComplete(
            DisputeQuestionnaireResult(
                letterType: letterType,
                creditor: target.creditor,
                accountNumber: target.accountNumber,
                furnisherAddress: target.furnisherAddress,
                rationale: rationale,
                answers: answers,
                recipientKind: .from(answers["disputeType"])
            )
        )
    }
}
