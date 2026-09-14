//
//  CreditAnalysisView.swift
//  WesternCreditInstitute
//

import SwiftUI

/// A generated letter, held so it can be presented in its own sheet.
private struct GeneratedLetter: Identifiable {
    let id = UUID()
    let letterType: String
    let creditor: String
    let text: String
    let rationale: String
}

/// Analyze My Credit Report — every negative account the user's saved reports
/// contain, grouped by bureau, each one ready to dispute.
///
/// Mirrors the Expo `NegativeAccountsDashboard`, reading the same
/// `aiAgents.getBureauDashboard` data. Tapping "Prepare Dispute Letter" opens
/// the escalation questionnaire rather than generating immediately, so the
/// letter reflects the steps already taken and not just the item's type.
struct CreditAnalysisView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var viewModel: CreditAnalysisViewModel
    @State private var expandedBureau: String?
    @State private var expandedAccountId: String?
    @State private var questionnaireTarget: DisputeTarget?
    @State private var generatedLetter: GeneratedLetter?
    @State private var showEquifaxFetch = false

    init(userId: String) {
        _viewModel = State(initialValue: CreditAnalysisViewModel(userId: userId))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                switch viewModel.phase {
                case .loading:
                    loadingView
                case .failed(let message):
                    failureView(message: message)
                case .empty:
                    emptyView
                case .ready:
                    readyContent
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.md)
        }
        .background(theme.colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Analyze My Credit Report")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await viewModel.refresh() }
        .task { await viewModel.load() }
        .sheet(item: $questionnaireTarget) { target in
            DisputeQuestionnaireSheet(target: target) { result in
                questionnaireTarget = nil
                generateLetter(from: result)
            }
        }
        .sheet(item: $generatedLetter) { letter in
            DisputeLetterSheet(
                letterType: letter.letterType,
                creditor: letter.creditor,
                letterText: letter.text,
                rationale: letter.rationale
            )
        }
        .sheet(isPresented: $showEquifaxFetch) {
            EquifaxFetchSheet(userId: viewModel.userId) {
                // A live pull saves new analyses, so reload to show them.
                Task { await viewModel.refresh() }
            }
        }
    }

    // MARK: - Ready

    @ViewBuilder
    private var readyContent: some View {
        if let warning = viewModel.staleWarning {
            noticeBanner(warning)
        }

        summaryCard

        Text("Tap a bureau to see its negative accounts, then tap an account for the furnisher's details and a recommended dispute letter.")
            .font(.system(size: 13))
            .lineSpacing(3)
            .foregroundStyle(theme.colors.textSecondary)
            .fixedSize(horizontal: false, vertical: true)

        ForEach(viewModel.bureaus) { bureau in
            bureauCard(bureau)
        }

        refreshReportButton

        disputeOneAtATimeNote
    }

    private var summaryCard: some View {
        let colors = theme.colors
        let clean = viewModel.totalNegativeCount == 0

        return CardView(padding: Spacing.lg) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(spacing: Spacing.sm + 2) {
                    Image(systemName: clean ? "checkmark.circle.fill" : "chart.line.downtrend.xyaxis")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(clean ? colors.success : colors.warning)

                    Text(viewModel.headline)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(colors.text)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Text(viewModel.summaryDetail)
                    .font(.system(size: 14))
                    .lineSpacing(3)
                    .foregroundStyle(colors.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var disputeOneAtATimeNote: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 13))
                .foregroundStyle(theme.colors.warning)
            Text("Dispute one item at a time. Sending many letters at once can get them flagged as frivolous.")
                .font(.system(size: 12))
                .lineSpacing(2)
                .foregroundStyle(theme.colors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(theme.colors.warningLight.opacity(0.3), in: .rect(cornerRadius: Radius.md, style: .continuous))
    }

    // MARK: - Bureau

    private func bureauCard(_ bureau: BureauAnalysis) -> some View {
        let colors = theme.colors
        let isExpanded = expandedBureau == bureau.bureau

        return VStack(spacing: 0) {
            Button {
                Haptics.light()
                withAnimation(.snappy(duration: 0.25)) {
                    expandedBureau = isExpanded ? nil : bureau.bureau
                    expandedAccountId = nil
                }
            } label: {
                HStack(spacing: Spacing.sm + 2) {
                    Image(systemName: bureau.hasNegatives ? "building.columns.fill" : "checkmark.seal.fill")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(bureau.hasNegatives ? colors.warning : colors.success)

                    VStack(alignment: .leading, spacing: 1) {
                        Text(bureau.bureau)
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(colors.text)
                        Text(bureauSubtitle(bureau))
                            .font(.system(size: 12))
                            .foregroundStyle(colors.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    countBadge(bureau)

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(colors.textLight)
                }
                .padding(Spacing.md - 2)
                .contentShape(.rect)
            }
            .buttonStyle(PressableButtonStyle())
            .accessibilityLabel("\(bureau.bureau): \(bureau.negativeCount) negative accounts")

            if isExpanded {
                VStack(alignment: .leading, spacing: Spacing.sm + 2) {
                    Divider().overlay(colors.border)

                    if !bureau.summary.isEmpty {
                        Text(bureau.summary)
                            .font(.system(size: 13))
                            .lineSpacing(3)
                            .foregroundStyle(colors.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    if bureau.negativeAccounts.isEmpty {
                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(colors.success)
                            Text("No negative accounts on this report.")
                                .font(.system(size: 13))
                                .foregroundStyle(colors.text)
                        }
                        .padding(Spacing.md)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(colors.successLight.opacity(0.35), in: .rect(cornerRadius: Radius.md, style: .continuous))
                    } else {
                        ForEach(bureau.negativeAccounts) { account in
                            accountCard(account, bureau: bureau.bureau)
                        }
                    }
                }
                .padding(.horizontal, Spacing.md - 2)
                .padding(.bottom, Spacing.md - 2)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .background(colors.surface, in: .rect(cornerRadius: Radius.lg, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
                .strokeBorder(colors.border, lineWidth: 1)
        }
    }

    private func bureauSubtitle(_ bureau: BureauAnalysis) -> String {
        let accounts = "\(bureau.totalAccounts) account\(bureau.totalAccounts == 1 ? "" : "s") reviewed"
        guard let date = bureau.uploadedDateText else { return accounts }
        return "\(accounts) · \(date)"
    }

    private func countBadge(_ bureau: BureauAnalysis) -> some View {
        let colors = theme.colors
        let tint = bureau.hasNegatives ? colors.warning : colors.success

        return HStack(spacing: 5) {
            Image(systemName: bureau.hasNegatives ? "exclamationmark.triangle.fill" : "checkmark")
                .font(.system(size: 11, weight: .bold))
            Text("\(bureau.negativeCount)")
                .font(.system(size: 12, weight: .bold))
                .monospacedDigit()
        }
        .foregroundStyle(tint)
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(tint.opacity(0.15), in: .capsule)
    }

    // MARK: - Account

    private func accountCard(_ account: NegativeAccount, bureau: String) -> some View {
        let colors = theme.colors
        let isOpen = expandedAccountId == account.id

        return VStack(alignment: .leading, spacing: 0) {
            Button {
                Haptics.light()
                withAnimation(.snappy(duration: 0.22)) {
                    expandedAccountId = isOpen ? nil : account.id
                }
            } label: {
                HStack(spacing: Spacing.sm) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(account.creditor)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(colors.text)
                            .multilineTextAlignment(.leading)
                        Text(accountMeta(account))
                            .font(.system(size: 12))
                            .foregroundStyle(colors.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    Image(systemName: isOpen ? "chevron.up" : "chevron.down")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(colors.textLight)
                }
                .padding(Spacing.md - 4)
                .contentShape(.rect)
            }
            .buttonStyle(PressableButtonStyle())
            .accessibilityLabel("\(account.creditor) details")

            if isOpen {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Divider().overlay(colors.borderLight)

                    if !account.accountNumber.isEmpty {
                        detailRow(label: "Account #", value: account.accountNumber)
                    }
                    detailRow(label: "Status", value: account.negativeType)
                    if !account.balance.isEmpty {
                        detailRow(label: "Balance", value: account.balance)
                    }

                    addressBox(account.furnisherAddress)

                    HStack(spacing: 6) {
                        Image(systemName: "doc.text.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(colors.primary)
                        Text(account.letterType)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(colors.primary)
                    }

                    if !account.rationale.isEmpty {
                        Text(account.rationale)
                            .font(.system(size: 12))
                            .lineSpacing(3)
                            .foregroundStyle(colors.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    Button {
                        Haptics.medium()
                        questionnaireTarget = DisputeTarget(account: account, bureau: bureau)
                    } label: {
                        Text("Prepare Dispute Letter")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(colors.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 11)
                            .background(colors.primary.opacity(0.12), in: .rect(cornerRadius: Radius.sm, style: .continuous))
                    }
                    .buttonStyle(PressableButtonStyle())
                    .accessibilityLabel("Prepare dispute letter for \(account.creditor)")
                }
                .padding(.horizontal, Spacing.md - 4)
                .padding(.bottom, Spacing.md - 4)
                .transition(.opacity)
            }
        }
        .background(colors.background, in: .rect(cornerRadius: Radius.md, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.md, style: .continuous)
                .strokeBorder(colors.borderLight, lineWidth: 1)
        }
    }

    private func accountMeta(_ account: NegativeAccount) -> String {
        account.balance.isEmpty
            ? account.negativeType
            : "\(account.negativeType) · \(account.balance)"
    }

    private func detailRow(label: String, value: String) -> some View {
        HStack(alignment: .top) {
            Text(label)
                .font(.system(size: 12))
                .foregroundStyle(theme.colors.textSecondary)
            Spacer(minLength: Spacing.sm)
            Text(value)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(theme.colors.text)
                .multilineTextAlignment(.trailing)
        }
    }

    /// The furnisher's address, or an explicit warning when the report had
    /// none — a dispute mailed to the wrong address is simply never received.
    private func addressBox(_ address: String?) -> some View {
        let colors = theme.colors
        let hasAddress = !(address ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty

        return HStack(alignment: .top, spacing: 6) {
            Image(systemName: hasAddress ? "mappin.and.ellipse" : "exclamationmark.triangle.fill")
                .font(.system(size: 12))
                .foregroundStyle(hasAddress ? colors.textSecondary : colors.warning)
            Text(hasAddress
                 ? (address ?? "")
                 : "Address not available — please verify before mailing a dispute letter.")
                .font(.system(size: 12))
                .lineSpacing(2)
                .foregroundStyle(colors.text)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Spacing.sm + 2)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            (hasAddress ? colors.primary.opacity(0.08) : colors.warningLight.opacity(0.35)),
            in: .rect(cornerRadius: Radius.sm, style: .continuous)
        )
    }

    // MARK: - States

    private var loadingView: some View {
        VStack(spacing: Spacing.md) {
            ProgressView()
                .controlSize(.large)
                .tint(theme.colors.primary)
            Text("Loading your saved reports…")
                .font(.system(size: 15))
                .foregroundStyle(theme.colors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xxl)
    }

    /// Nothing saved yet. The live pull is offered first because it works
    /// entirely on device; uploading a PDF still happens in the web app.
    private var emptyView: some View {
        VStack(spacing: Spacing.md) {
            EmptyStateView(
                symbol: "doc.text.magnifyingglass",
                title: "No reports analyzed yet",
                message: "Pull your file from all three bureaus to see every negative account, grouped by bureau and ready to dispute."
            )

            pullReportButton

            HStack(alignment: .top, spacing: Spacing.sm) {
                Image(systemName: "info.circle.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(theme.colors.primary)
                Text("Already uploaded a report in the web app? It shows up here automatically for the same account.")
                    .font(.system(size: 12))
                    .lineSpacing(3)
                    .foregroundStyle(theme.colors.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(Spacing.md)
            .background(theme.colors.infoLight, in: .rect(cornerRadius: Radius.md, style: .continuous))
        }
    }

    /// Primary call to action on the empty state.
    private var pullReportButton: some View {
        let colors = theme.colors

        return Button {
            Haptics.medium()
            showEquifaxFetch = true
        } label: {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "arrow.down.doc.fill")
                    .font(.system(size: 15, weight: .semibold))
                Text("Pull My Credit Report")
                    .font(.system(size: 16, weight: .bold))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(
                LinearGradient(colors: colors.gradientSecondary, startPoint: .leading, endPoint: .trailing),
                in: .rect(cornerRadius: Radius.md, style: .continuous)
            )
        }
        .buttonStyle(PressableButtonStyle())
    }

    /// Secondary action once reports already exist.
    private var refreshReportButton: some View {
        let colors = theme.colors

        return Button {
            Haptics.light()
            showEquifaxFetch = true
        } label: {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 14, weight: .semibold))
                Text("Pull A Fresh Report")
                    .font(.system(size: 14, weight: .bold))
            }
            .foregroundStyle(colors.primary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md - 2)
            .background(colors.primary.opacity(0.08), in: .rect(cornerRadius: Radius.md, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: Radius.md, style: .continuous)
                    .strokeBorder(colors.primary.opacity(0.25), lineWidth: 1)
            }
        }
        .buttonStyle(PressableButtonStyle())
    }

    private func failureView(message: String) -> some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 34, weight: .semibold))
                .foregroundStyle(theme.colors.warning)
                .frame(width: 78, height: 78)
                .background(theme.colors.warningLight.opacity(0.3), in: .circle)

            Text("Couldn't load your reports")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(theme.colors.text)

            Text(message)
                .font(.system(size: 14))
                .lineSpacing(3)
                .multilineTextAlignment(.center)
                .foregroundStyle(theme.colors.textSecondary)

            Button {
                Haptics.light()
                Task { await viewModel.load() }
            } label: {
                Text("Try Again")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, Spacing.md - 2)
                    .background(theme.colors.primary, in: .rect(cornerRadius: Radius.md, style: .continuous))
            }
            .buttonStyle(PressableButtonStyle())
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xl)
    }

    private func noticeBanner(_ text: String) -> some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 14))
                .foregroundStyle(theme.colors.warning)
            Text(text)
                .font(.system(size: 12))
                .lineSpacing(2)
                .foregroundStyle(theme.colors.text)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(theme.colors.warningLight.opacity(0.3), in: .rect(cornerRadius: Radius.md, style: .continuous))
    }

    // MARK: - Letter

    private func generateLetter(from result: DisputeQuestionnaireResult) {
        let text = DisputeLetterComposer.compose(
            letterType: result.letterType,
            sender: DisputeLetterComposer.Sender(
                name: store.user.name,
                email: store.user.email,
                phone: store.user.phone
            ),
            creditorName: result.creditor,
            accountNumber: result.accountNumber,
            furnisherAddress: result.furnisherAddress,
            recipientKind: result.recipientKind
        )

        generatedLetter = GeneratedLetter(
            letterType: result.letterType,
            creditor: result.creditor,
            text: text,
            rationale: result.rationale
        )
    }
}

// MARK: - Generated letter sheet

/// Shows a composed dispute letter with copy and share actions.
private struct DisputeLetterSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss

    let letterType: String
    let creditor: String
    let letterText: String
    let rationale: String

    @State private var didCopy = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    header

                    if !rationale.isEmpty {
                        HStack(alignment: .top, spacing: Spacing.sm) {
                            Image(systemName: "info.circle.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(theme.colors.primary)
                            Text(rationale)
                                .font(.system(size: 13))
                                .lineSpacing(2)
                                .foregroundStyle(theme.colors.text)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(Spacing.md)
                        .background(theme.colors.infoLight, in: .rect(cornerRadius: Radius.md, style: .continuous))
                    }

                    Text(letterText)
                        .font(.system(size: 14, design: .serif))
                        .lineSpacing(4)
                        .foregroundStyle(theme.colors.text)
                        .textSelection(.enabled)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(Spacing.md)
                        .background(theme.colors.surface, in: .rect(cornerRadius: Radius.md, style: .continuous))

                    actions
                }
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.md)
            }
            .background(theme.colors.background)
            .scrollIndicators(.hidden)
            .navigationTitle(letterType)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(theme.colors.primary)
                }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(theme.colors.success)
                Text("Letter ready")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(theme.colors.text)
            }
            Text("Addressed to \(creditor). Review it, then copy or share to send.")
                .font(.system(size: 13))
                .lineSpacing(2)
                .foregroundStyle(theme.colors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var actions: some View {
        HStack(spacing: Spacing.sm) {
            Button {
                UIPasteboard.general.string = letterText
                Haptics.success()
                withAnimation(.snappy(duration: 0.2)) { didCopy = true }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: didCopy ? "checkmark" : "doc.on.doc.fill")
                    Text(didCopy ? "Copied" : "Copy")
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(theme.colors.primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(theme.colors.primary.opacity(0.1), in: .rect(cornerRadius: Radius.md, style: .continuous))
            }
            .buttonStyle(PressableButtonStyle())

            ShareLink(item: letterText) {
                HStack(spacing: 6) {
                    Image(systemName: "square.and.arrow.up")
                    Text("Share")
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(theme.colors.primary, in: .rect(cornerRadius: Radius.md, style: .continuous))
            }
        }
    }
}
