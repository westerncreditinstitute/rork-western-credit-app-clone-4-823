//
//  PayoutSheet.swift
//  WesternCreditInstitute
//

import SwiftUI

struct PayoutSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var amountText: String = ""
    @State private var method: PayoutMethod = .paypal
    @State private var isProcessing = false
    @State private var errorMessage: String?
    @State private var showSuccess = false

    private var amount: Double { Double(amountText) ?? 0 }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    availableCard
                    amountField
                    methodPicker

                    if let errorMessage {
                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "exclamationmark.triangle.fill")
                            Text(errorMessage).font(.system(size: 13, weight: .medium))
                        }
                        .foregroundStyle(theme.colors.error)
                        .padding(Spacing.sm)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(theme.colors.error.opacity(0.11))
                        .clipShape(.rect(cornerRadius: Radius.sm))
                    }

                    submitButton

                    Text("Payouts are processed monthly. Funds arrive within 5-7 business days. Minimum payout is \(Format.currency(AppStore.minimumPayout)).")
                        .font(.system(size: 11))
                        .foregroundStyle(theme.colors.textLight)
                }
                .padding(Spacing.md)
            }
            .background(theme.colors.background)
            .navigationTitle("Request Payout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { dismiss() }
                }
            }
            .alert("Payout Requested", isPresented: $showSuccess) {
                Button("Done") { dismiss() }
            } message: {
                Text("Your payout request has been submitted. You'll receive your funds within 5-7 business days.")
            }
        }
        .presentationDetents([.large])
        .presentationContentInteraction(.scrolls)
    }

    private var availableCard: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Available to withdraw")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.white.opacity(0.72))
            Text(Format.currency(store.wallet.availableBalance))
                .font(.system(size: 30, weight: .heavy))
                .foregroundStyle(.white)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: theme.colors.gradientPrimary,
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .clipShape(.rect(cornerRadius: Radius.lg))
    }

    private var amountField: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Payout amount")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(theme.colors.text)

            HStack(spacing: Spacing.sm) {
                Text("$")
                    .font(.system(size: 24, weight: .heavy))
                    .foregroundStyle(theme.colors.textLight)

                TextField("0.00", text: $amountText)
                    .font(.system(size: 24, weight: .heavy))
                    .foregroundStyle(theme.colors.text)
                    .keyboardType(.decimalPad)
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, 14)
            .background(theme.colors.surface)
            .clipShape(.rect(cornerRadius: Radius.md))
            .overlay {
                RoundedRectangle(cornerRadius: Radius.md)
                    .stroke(theme.colors.border, lineWidth: 1)
            }

            HStack(spacing: Spacing.sm) {
                ForEach([100.0, 250.0, 500.0], id: \.self) { preset in
                    Button {
                        Haptics.selection()
                        amountText = String(format: "%.0f", preset)
                        errorMessage = nil
                    } label: {
                        Text(Format.compactCurrency(preset))
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(theme.colors.primary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(theme.colors.primary.opacity(0.1))
                            .clipShape(.capsule)
                    }
                    .buttonStyle(PressableButtonStyle())
                    .disabled(preset > store.wallet.availableBalance)
                    .opacity(preset > store.wallet.availableBalance ? 0.4 : 1)
                }

                Button {
                    Haptics.selection()
                    amountText = String(format: "%.2f", store.wallet.availableBalance)
                    errorMessage = nil
                } label: {
                    Text("Max")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(theme.colors.secondary)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(theme.colors.secondary.opacity(0.12))
                        .clipShape(.capsule)
                }
                .buttonStyle(PressableButtonStyle())
            }
        }
    }

    private var methodPicker: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Payment method")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(theme.colors.text)

            VStack(spacing: Spacing.sm) {
                ForEach(PayoutMethod.allCases) { option in
                    Button {
                        Haptics.selection()
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) { method = option }
                    } label: {
                        HStack(spacing: Spacing.md) {
                            Image(systemName: option.symbol)
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(method == option ? theme.colors.primary : theme.colors.textLight)
                                .frame(width: 42, height: 42)
                                .background((method == option ? theme.colors.primary : theme.colors.textLight).opacity(0.12))
                                .clipShape(.circle)

                            VStack(alignment: .leading, spacing: 1) {
                                Text(option.label)
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundStyle(theme.colors.text)
                                Text(option.detail)
                                    .font(.system(size: 12))
                                    .foregroundStyle(theme.colors.textSecondary)
                            }

                            Spacer(minLength: 0)

                            Image(systemName: method == option ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 19))
                                .foregroundStyle(method == option ? theme.colors.primary : theme.colors.border)
                        }
                        .padding(Spacing.md)
                        .background(theme.colors.surface)
                        .clipShape(.rect(cornerRadius: Radius.md))
                        .overlay {
                            RoundedRectangle(cornerRadius: Radius.md)
                                .stroke(method == option ? theme.colors.primary : theme.colors.border, lineWidth: method == option ? 2 : 1)
                        }
                    }
                    .buttonStyle(PressableButtonStyle())
                }
            }
        }
    }

    private var submitButton: some View {
        Button {
            submit()
        } label: {
            HStack(spacing: Spacing.sm) {
                if isProcessing {
                    ProgressView().tint(.white)
                }
                Text(isProcessing ? "Processing..." : "Submit Request")
                    .font(.system(size: 16, weight: .bold))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(
                LinearGradient(
                    colors: theme.colors.gradientSecondary,
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .clipShape(.rect(cornerRadius: Radius.md))
        }
        .buttonStyle(PressableButtonStyle())
        .disabled(isProcessing)
    }

    private func submit() {
        errorMessage = nil
        Haptics.medium()
        isProcessing = true

        Task {
            try? await Task.sleep(for: .milliseconds(900))
            do {
                try store.requestPayout(amount: amount, method: method)
                isProcessing = false
                Haptics.success()
                showSuccess = true
            } catch {
                isProcessing = false
                Haptics.error()
                errorMessage = error.localizedDescription
            }
        }
    }
}
