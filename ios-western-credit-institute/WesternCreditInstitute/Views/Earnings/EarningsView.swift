//
//  EarningsView.swift
//  WesternCreditInstitute
//

import SwiftUI

struct EarningsView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store

    @State private var selectedType: EarningType?
    @State private var showPlans = false
    @State private var didCopyLink = false
    @State private var appeared = false

    private var filteredEarnings: [EarningRecord] {
        guard let selectedType else { return store.earnings }
        return store.earnings.filter { $0.type == selectedType }
    }

    var body: some View {
        let colors = theme.colors

        VStack(spacing: 0) {
            ScreenHeader(
                title: "Earnings",
                subtitle: store.isFree ? "Unlock earning potential" : "Track your income"
            )

            ScrollView {
                if store.isFree {
                    lockedState
                } else {
                    VStack(spacing: Spacing.lg) {
                        summaryCards
                        referralCard
                        if store.isCSO { residualTierCard }
                        typeFilter
                        historySection
                    }
                    .padding(.horizontal, Spacing.md)
                    .padding(.top, Spacing.md)
                    .padding(.bottom, Spacing.xl)
                }
            }
            .scrollIndicators(.hidden)
            .refreshable { try? await Task.sleep(for: .milliseconds(700)) }
            .background(colors.background)
        }
        .background(colors.background)
        .sheet(isPresented: $showPlans) { SubscriptionPlansView() }
        .task {
            guard !appeared else { return }
            withAnimation(.spring(response: 0.65, dampingFraction: 0.85)) { appeared = true }
        }
    }

    // MARK: - Locked (free tier)

    private var lockedState: some View {
        VStack(spacing: Spacing.lg) {
            CardView(padding: Spacing.lg) {
                VStack(spacing: Spacing.md) {
                    Image(systemName: "crown.fill")
                        .font(.system(size: 32, weight: .semibold))
                        .foregroundStyle(theme.colors.warning)
                        .frame(width: 82, height: 82)
                        .background(theme.colors.warning.opacity(0.14))
                        .clipShape(.circle)

                    Text("Upgrade to Start Earning")
                        .font(.system(size: 22, weight: .heavy))
                        .foregroundStyle(theme.colors.text)
                        .multilineTextAlignment(.center)

                    Text("Subscribe to ACE-1 Student or CSO Affiliate to unlock the referral program and start earning money!")
                        .font(.system(size: 14))
                        .foregroundStyle(theme.colors.textSecondary)
                        .multilineTextAlignment(.center)

                    VStack(spacing: Spacing.sm) {
                        ForEach([SubscriptionTier.ace1Student, .csoAffiliate]) { plan in
                            planRow(plan)
                        }
                    }

                    Button {
                        Haptics.medium()
                        showPlans = true
                    } label: {
                        Text("View Plans")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, Spacing.md)
                            .background(
                                LinearGradient(
                                    colors: theme.colors.gradientPrimary,
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .clipShape(.rect(cornerRadius: Radius.md))
                    }
                    .buttonStyle(PressableButtonStyle())
                }
            }
        }
        .padding(Spacing.md)
    }

    private func planRow(_ plan: SubscriptionTier) -> some View {
        CardView(variant: .outlined, padding: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Text(plan.label)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(theme.colors.text)
                    Spacer()
                    if plan == .csoAffiliate {
                        BadgeView(text: "BEST VALUE", variant: .success)
                    }
                }

                Text("\(Format.compactCurrency(plan.monthlyFee))/mo")
                    .font(.system(size: 20, weight: .heavy))
                    .foregroundStyle(theme.colors.primary)

                VStack(alignment: .leading, spacing: 4) {
                    ForEach(plan.perks, id: \.self) { perk in
                        Text("• \(perk)")
                            .font(.system(size: 12))
                            .foregroundStyle(theme.colors.textSecondary)
                    }
                }
            }
        }
    }

    // MARK: - Summary

    private var summaryCards: some View {
        HStack(spacing: Spacing.sm) {
            summaryCard(
                symbol: "chart.line.uptrend.xyaxis",
                tint: theme.colors.secondary,
                label: "This Month",
                value: Format.compactCurrency(store.thisMonthEarnings)
            )
            summaryCard(
                symbol: "clock.fill",
                tint: theme.colors.warning,
                label: "Pending",
                value: Format.compactCurrency(store.pendingEarnings)
            )
            summaryCard(
                symbol: "dollarsign.circle.fill",
                tint: theme.colors.primary,
                label: "All Time",
                value: Format.compactCurrency(store.user.totalEarnings)
            )
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 18)
    }

    private func summaryCard(symbol: String, tint: Color, label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Image(systemName: symbol)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(tint)
                .frame(width: 34, height: 34)
                .background(tint.opacity(0.13))
                .clipShape(.rect(cornerRadius: Radius.sm))

            Text(value)
                .font(.system(size: 18, weight: .heavy))
                .foregroundStyle(theme.colors.text)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(theme.colors.textLight)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(theme.colors.surface)
        .clipShape(.rect(cornerRadius: Radius.lg))
        .shadow(color: theme.colors.shadow, radius: 8, y: 3)
    }

    // MARK: - Referral

    private var referralCard: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "gift.fill")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(Color.white.opacity(0.18))
                    .clipShape(.circle)

                VStack(alignment: .leading, spacing: 1) {
                    Text("Refer & Earn")
                        .font(.system(size: 16, weight: .heavy))
                        .foregroundStyle(.white)
                    Text("Earn $25 for every ACE-1 student")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.white.opacity(0.75))
                }
                Spacer(minLength: 0)
            }

            HStack(spacing: Spacing.sm) {
                Text(store.referralLink)
                    .font(.system(size: 13, weight: .semibold, design: .monospaced))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .truncationMode(.middle)

                Spacer(minLength: Spacing.sm)

                Button {
                    Haptics.success()
                    UIPasteboard.general.string = "https://\(store.referralLink)"
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) { didCopyLink = true }
                    Task {
                        try? await Task.sleep(for: .seconds(2))
                        withAnimation { didCopyLink = false }
                    }
                } label: {
                    Image(systemName: didCopyLink ? "checkmark" : "doc.on.doc.fill")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Color(hex: "#001F42"))
                        .frame(width: 34, height: 34)
                        .background(.white.opacity(0.92))
                        .clipShape(.circle)
                }
                .buttonStyle(PressableButtonStyle())
                .accessibilityLabel("Copy referral link")
            }
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.sm)
            .background(Color.black.opacity(0.22))
            .clipShape(.rect(cornerRadius: Radius.md))

            ShareLink(
                item: URL(string: "https://\(store.referralLink)") ?? URL(string: "https://westerncredit.com")!,
                subject: Text("Western Credit Institute"),
                message: Text("Join Western Credit Institute and start your credit education journey!")
            ) {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 14, weight: .semibold))
                    Text("Share your link")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundStyle(Color(hex: "#001F42"))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
                .background(Color(hex: "#6EE7B7"))
                .clipShape(.rect(cornerRadius: Radius.md))
            }
            .buttonStyle(PressableButtonStyle())
        }
        .padding(Spacing.md)
        .background(
            LinearGradient(
                colors: theme.colors.gradientHeader,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(.rect(cornerRadius: Radius.lg))
        .shadow(color: theme.colors.shadow, radius: 12, y: 5)
    }

    // MARK: - Residual tier

    private var residualTierCard: some View {
        CardView {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "target")
                            .foregroundStyle(theme.colors.accent)
                        Text("Residual Tier")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(theme.colors.text)
                    }
                    Spacer()
                    BadgeView(text: "\(store.residualRate)% rate", variant: .success)
                }

                Text("\(store.csoReferrals) active referrals")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(theme.colors.textSecondary)

                ProgressBarView(progress: min(100, store.csoReferrals), height: 8, tint: theme.colors.accent)

                Text(store.referralsToNextTier > 0
                     ? "\(store.referralsToNextTier) more referrals to unlock the 75% residual tier."
                     : "You've unlocked the maximum 75% residual tier!")
                    .font(.system(size: 12))
                    .foregroundStyle(theme.colors.textLight)
            }
        }
    }

    // MARK: - Filter + history

    private var typeFilter: some View {
        ScrollView(.horizontal) {
            HStack(spacing: Spacing.sm) {
                filterChip(title: "All", isActive: selectedType == nil) { selectedType = nil }
                ForEach(EarningType.allCases) { type in
                    filterChip(title: type.label, isActive: selectedType == type) { selectedType = type }
                }
            }
        }
        .scrollIndicators(.hidden)
        .scrollClipDisabled()
    }

    private func filterChip(title: String, isActive: Bool, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.selection()
            withAnimation(.spring(response: 0.3, dampingFraction: 0.82)) { action() }
        } label: {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(isActive ? theme.colors.textInverse : theme.colors.textSecondary)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(isActive ? theme.colors.primary : theme.colors.surfaceAlt)
                .clipShape(.capsule)
        }
        .buttonStyle(PressableButtonStyle())
    }

    private var historySection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "History", symbol: "clock.arrow.circlepath", symbolTint: theme.colors.primary)

            if filteredEarnings.isEmpty {
                EmptyStateView(
                    symbol: "tray",
                    title: "Nothing here yet",
                    message: "Earnings of this type will appear once they're recorded."
                )
            } else {
                VStack(spacing: Spacing.sm) {
                    ForEach(filteredEarnings) { record in
                        CardView(padding: Spacing.md) {
                            HStack(spacing: Spacing.md) {
                                Image(systemName: record.type.symbol)
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(tintFor(record.type))
                                    .frame(width: 44, height: 44)
                                    .background(tintFor(record.type).opacity(0.13))
                                    .clipShape(.circle)

                                VStack(alignment: .leading, spacing: 3) {
                                    Text(record.detail)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(theme.colors.text)
                                        .lineLimit(2)

                                    HStack(spacing: Spacing.sm) {
                                        Text(Format.shortDate(record.date))
                                            .font(.system(size: 11, weight: .medium))
                                            .foregroundStyle(theme.colors.textLight)

                                        if record.status == .pending {
                                            BadgeView(text: "Pending", variant: .warning, symbol: "clock.fill")
                                        } else {
                                            BadgeView(text: "Paid", variant: .success, symbol: "checkmark")
                                        }
                                    }
                                }

                                Spacer(minLength: 0)

                                Text("+\(Format.compactCurrency(record.amount))")
                                    .font(.system(size: 15, weight: .heavy))
                                    .foregroundStyle(theme.colors.success)
                                    .monospacedDigit()
                            }
                        }
                    }
                }
            }
        }
    }

    private func tintFor(_ type: EarningType) -> Color {
        let colors = theme.colors
        switch type {
        case .referral: return colors.info
        case .commission: return colors.secondary
        case .residual: return colors.accent
        case .coaching: return colors.primary
        }
    }
}
