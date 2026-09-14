//
//  EquifaxFetchSheet.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Pulls a live tri-bureau report for the signed-in user.
///
/// This is the first screen that depends on a real session — the endpoint is a
/// `protectedProcedure`, so the request only works while signed in. Results are
/// saved as analyses, which is what makes them show up in the dashboard behind
/// this sheet.
struct EquifaxFetchSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss

    @State private var viewModel: EquifaxFetchViewModel
    @FocusState private var focusedField: Field?

    /// Called after a successful pull so the dashboard can reload.
    let onCompleted: () -> Void

    private enum Field: Hashable {
        case firstName, lastName, ssn, dateOfBirth, address, city, state, zip
    }

    init(userId: String, onCompleted: @escaping () -> Void) {
        _viewModel = State(initialValue: EquifaxFetchViewModel(userId: userId))
        self.onCompleted = onCompleted
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    switch viewModel.phase {
                    case .form, .failed:
                        intro
                        if case .failed(let message) = viewModel.phase {
                            errorBanner(message)
                        }
                        form
                        privacyNote
                        fetchButton
                    case .fetching, .saving:
                        progressState
                    case .done:
                        resultState
                    }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.md)
            }
            .scrollIndicators(.hidden)
            .scrollDismissesKeyboard(.interactively)
            .background(theme.colors.background)
            .navigationTitle("Pull My Credit Report")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") { dismiss() }
                        .disabled(viewModel.isBusy)
                }
            }
        }
        .presentationDetents([.large])
        .presentationContentInteraction(.scrolls)
    }

    // MARK: - Form

    private var intro: some View {
        let colors = theme.colors

        return VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Request your file from all three bureaus")
                .font(.system(size: 17, weight: .bold))
                .foregroundStyle(colors.text)

            Text("We'll ask Experian, Equifax and TransUnion for your current file. Every negative account that comes back is saved to your analyses, ready to dispute.")
                .font(.system(size: 13))
                .lineSpacing(3)
                .foregroundStyle(colors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var form: some View {
        VStack(spacing: Spacing.sm + 2) {
            HStack(spacing: Spacing.sm) {
                field("First Name", text: $viewModel.consumerInfo.firstName, field: .firstName, contentType: .givenName, capitalization: .words)
                field("Last Name", text: $viewModel.consumerInfo.lastName, field: .lastName, contentType: .familyName, capitalization: .words)
            }

            field("Social Security Number", text: $viewModel.consumerInfo.ssn, field: .ssn, keyboard: .numberPad)
            field("Date of Birth (YYYY-MM-DD)", text: $viewModel.consumerInfo.dateOfBirth, field: .dateOfBirth, keyboard: .numbersAndPunctuation)
            field("Street Address", text: $viewModel.consumerInfo.address, field: .address, contentType: .fullStreetAddress, capitalization: .words)

            HStack(spacing: Spacing.sm) {
                field("City", text: $viewModel.consumerInfo.city, field: .city, contentType: .addressCity, capitalization: .words)
                field("State", text: $viewModel.consumerInfo.state, field: .state, contentType: .addressState, capitalization: .characters)
            }

            field("ZIP Code", text: $viewModel.consumerInfo.zip, field: .zip, contentType: .postalCode, keyboard: .numberPad)
        }
    }

    private func field(
        _ placeholder: String,
        text: Binding<String>,
        field: Field,
        contentType: UITextContentType? = nil,
        keyboard: UIKeyboardType = .default,
        capitalization: TextInputAutocapitalization = .never
    ) -> some View {
        let colors = theme.colors

        return TextField(placeholder, text: text)
            .font(.system(size: 15))
            .foregroundStyle(colors.text)
            .keyboardType(keyboard)
            .textContentType(contentType)
            .textInputAutocapitalization(capitalization)
            .autocorrectionDisabled()
            .focused($focusedField, equals: field)
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, 14)
            .background(colors.surface)
            .clipShape(.rect(cornerRadius: Radius.md))
            .overlay {
                RoundedRectangle(cornerRadius: Radius.md)
                    .stroke(
                        focusedField == field ? colors.primary.opacity(0.55) : colors.border,
                        lineWidth: 1
                    )
            }
    }

    private var privacyNote: some View {
        let colors = theme.colors

        return HStack(alignment: .top, spacing: Spacing.sm) {
            Image(systemName: "lock.shield.fill")
                .font(.system(size: 14))
                .foregroundStyle(colors.primary)

            Text("Your details are sent over an encrypted connection to request your file and are not stored on this device.")
                .font(.system(size: 12))
                .lineSpacing(3)
                .foregroundStyle(colors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(colors.infoLight, in: .rect(cornerRadius: Radius.md, style: .continuous))
    }

    private var fetchButton: some View {
        let colors = theme.colors

        return Button {
            focusedField = nil
            Haptics.medium()
            Task {
                await viewModel.fetch()
                if viewModel.phase == .done {
                    Haptics.success()
                    onCompleted()
                } else {
                    Haptics.error()
                }
            }
        } label: {
            Text("Request My Report")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.md)
                .background(
                    LinearGradient(colors: colors.gradientSecondary, startPoint: .leading, endPoint: .trailing),
                    in: .rect(cornerRadius: Radius.md, style: .continuous)
                )
        }
        .buttonStyle(PressableButtonStyle())
        .padding(.top, Spacing.xs)
    }

    // MARK: - States

    private var progressState: some View {
        VStack(spacing: Spacing.md) {
            ProgressView()
                .controlSize(.large)
                .tint(theme.colors.primary)

            Text(viewModel.phase == .saving ? "Saving your report…" : "Requesting your file…")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(theme.colors.text)

            Text(viewModel.phase == .saving
                 ? "Storing each bureau's results so your agent can reference them later."
                 : "This can take up to a minute while all three bureaus respond.")
                .font(.system(size: 13))
                .multilineTextAlignment(.center)
                .foregroundStyle(theme.colors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xxl)
    }

    private var resultState: some View {
        let colors = theme.colors

        return VStack(alignment: .leading, spacing: Spacing.md) {
            VStack(spacing: Spacing.sm) {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 40, weight: .semibold))
                    .foregroundStyle(colors.success)

                Text("Report retrieved")
                    .font(.system(size: 19, weight: .bold))
                    .foregroundStyle(colors.text)

                Text(viewModel.totalNegatives == 0
                     ? "No negative accounts came back from any bureau."
                     : "\(viewModel.totalNegatives) negative item\(viewModel.totalNegatives == 1 ? "" : "s") found across \(viewModel.bureauResults.count) bureau\(viewModel.bureauResults.count == 1 ? "" : "s").")
                    .font(.system(size: 14))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(colors.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)

            if let warning = viewModel.saveWarning {
                warningBanner(warning)
            }

            ForEach(viewModel.bureauResults, id: \.bureau) { bureau in
                bureauRow(bureau)
            }

            Button {
                Haptics.light()
                dismiss()
            } label: {
                Text("View My Analysis")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                    .background(colors.primary, in: .rect(cornerRadius: Radius.md, style: .continuous))
            }
            .buttonStyle(PressableButtonStyle())
            .padding(.top, Spacing.xs)
        }
    }

    private func bureauRow(_ bureau: EquifaxBureauReport) -> some View {
        let colors = theme.colors
        let hasNegatives = bureau.negativeAccountCount > 0

        return HStack(spacing: Spacing.sm + 2) {
            Image(systemName: hasNegatives ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(hasNegatives ? colors.warning : colors.success)

            VStack(alignment: .leading, spacing: 1) {
                Text(bureau.bureau)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(colors.text)

                Text("\(bureau.totalAccounts) account\(bureau.totalAccounts == 1 ? "" : "s") · \(bureau.negativeAccountCount) negative")
                    .font(.system(size: 12))
                    .foregroundStyle(colors.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            if let score = bureau.creditScore {
                VStack(spacing: 0) {
                    Text("\(score)")
                        .font(.system(size: 17, weight: .bold))
                        .monospacedDigit()
                        .foregroundStyle(colors.primary)
                    Text("score")
                        .font(.system(size: 10))
                        .foregroundStyle(colors.textLight)
                }
            }
        }
        .padding(Spacing.md - 2)
        .background(colors.surface, in: .rect(cornerRadius: Radius.md, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.md, style: .continuous)
                .strokeBorder(colors.border, lineWidth: 1)
        }
    }

    private func errorBanner(_ message: String) -> some View {
        banner(message, symbol: "exclamationmark.triangle.fill", tint: theme.colors.error)
    }

    private func warningBanner(_ message: String) -> some View {
        banner(message, symbol: "externaldrive.badge.exclamationmark", tint: theme.colors.warning)
    }

    private func banner(_ message: String, symbol: String, tint: Color) -> some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Image(systemName: symbol)
                .font(.system(size: 14))
                .foregroundStyle(tint)

            Text(message)
                .font(.system(size: 13))
                .lineSpacing(2)
                .foregroundStyle(theme.colors.text)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.1), in: .rect(cornerRadius: Radius.md, style: .continuous))
    }
}
