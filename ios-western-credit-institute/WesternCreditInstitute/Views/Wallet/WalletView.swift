//
//  WalletView.swift
//  WesternCreditInstitute
//

import SwiftUI

struct WalletView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store

    @State private var showPayoutSheet = false
    @State private var appeared = false

    var body: some View {
        let colors = theme.colors

        VStack(spacing: 0) {
            ScreenHeader(title: "Wallet", subtitle: "Manage your earnings")

            ScrollView {
                VStack(spacing: Spacing.lg) {
                    balanceCard
                    payoutRow
                    transactionsSection
                }
                .padding(.horizontal, Spacing.md)
                .padding(.top, Spacing.md)
                .padding(.bottom, Spacing.xl)
            }
            .scrollIndicators(.hidden)
            .refreshable {
                try? await Task.sleep(for: .milliseconds(700))
            }
            .background(colors.background)
        }
        .background(colors.background)
        .sheet(isPresented: $showPayoutSheet) { PayoutSheet() }
        .task {
            guard !appeared else { return }
            withAnimation(.spring(response: 0.65, dampingFraction: 0.85)) { appeared = true }
        }
    }

    // MARK: - Balance

    private var balanceCard: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "wallet.pass.fill")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .background(Color.white.opacity(0.16))
                    .clipShape(.rect(cornerRadius: Radius.md))

                Text("Available Balance")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.75))

                Spacer()
            }

            Text(Format.currency(store.wallet.availableBalance))
                .font(.system(size: 40, weight: .heavy))
                .foregroundStyle(.white)
                .monospacedDigit()
                .contentTransition(.numericText())

            HStack(spacing: 0) {
                balanceStat(symbol: "clock.fill", label: "Pending", value: store.wallet.pendingBalance)
                statDivider
                balanceStat(symbol: "arrow.down.circle.fill", label: "Total Earned", value: store.wallet.totalEarned)
                statDivider
                balanceStat(symbol: "arrow.up.circle.fill", label: "Withdrawn", value: store.wallet.totalWithdrawn)
            }
            .padding(.top, Spacing.xs)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: theme.colors.gradientPrimary,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .overlay {
            // Subtle sheen for depth.
            LinearGradient(
                colors: [.white.opacity(0.10), .clear],
                startPoint: .topLeading,
                endPoint: .center
            )
            .allowsHitTesting(false)
        }
        .clipShape(.rect(cornerRadius: Radius.xl))
        .shadow(color: theme.colors.primary.opacity(0.28), radius: 18, y: 8)
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 24)
    }

    private var statDivider: some View {
        Rectangle()
            .fill(Color.white.opacity(0.16))
            .frame(width: 1, height: 32)
    }

    private func balanceStat(symbol: String, label: String, value: Double) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Image(systemName: symbol)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.white.opacity(0.6))
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(.white.opacity(0.6))
            Text(Format.compactCurrency(value))
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, Spacing.sm)
    }

    // MARK: - Payout

    private var payoutRow: some View {
        HStack(spacing: Spacing.sm) {
            Button {
                Haptics.medium()
                showPayoutSheet = true
            } label: {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 15, weight: .semibold))
                    Text("Request Payout")
                        .font(.system(size: 15, weight: .bold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
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
            .disabled(store.wallet.availableBalance < AppStore.minimumPayout)
            .opacity(store.wallet.availableBalance < AppStore.minimumPayout ? 0.55 : 1)
        }
    }

    // MARK: - Transactions

    private var transactionsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "Transactions", symbol: "list.bullet.rectangle.fill", symbolTint: theme.colors.primary) {
                Text("\(store.transactions.count) total")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(theme.colors.textLight)
            }

            if store.transactions.isEmpty {
                EmptyStateView(
                    symbol: "tray",
                    title: "No transactions yet",
                    message: "Referral bonuses and commissions will appear here."
                )
            } else {
                VStack(spacing: Spacing.sm) {
                    ForEach(store.transactions) { transaction in
                        transactionRow(transaction)
                    }
                }
            }
        }
    }

    private func transactionRow(_ transaction: WalletTransaction) -> some View {
        let tint = tintFor(transaction.type)
        let isDebit = transaction.amount < 0

        return CardView(padding: Spacing.md) {
            HStack(spacing: Spacing.md) {
                Image(systemName: transaction.type.symbol)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(tint)
                    .frame(width: 44, height: 44)
                    .background(tint.opacity(0.13))
                    .clipShape(.circle)

                VStack(alignment: .leading, spacing: 3) {
                    Text(transaction.type.label)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(theme.colors.text)

                    Text(transaction.detail)
                        .font(.system(size: 12))
                        .foregroundStyle(theme.colors.textSecondary)
                        .lineLimit(2)

                    HStack(spacing: Spacing.sm) {
                        Text(Format.mediumDate(transaction.createdAt))
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(theme.colors.textLight)

                        if transaction.status == .pending {
                            BadgeView(text: "Pending", variant: .warning, symbol: "clock.fill")
                        } else if transaction.status == .cancelled {
                            BadgeView(text: "Cancelled", variant: .error)
                        }
                    }
                }

                Spacer(minLength: 0)

                Text("\(isDebit ? "-" : "+")\(Format.currency(abs(transaction.amount)))")
                    .font(.system(size: 15, weight: .heavy))
                    .foregroundStyle(isDebit ? theme.colors.error : theme.colors.success)
                    .monospacedDigit()
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }
        }
    }

    private func tintFor(_ type: WalletTransactionType) -> Color {
        let colors = theme.colors
        switch type {
        case .referralBonus: return colors.info
        case .residualIncome: return colors.accent
        case .commission: return colors.secondary
        case .payout: return colors.error
        case .consultation: return colors.primary
        }
    }
}
