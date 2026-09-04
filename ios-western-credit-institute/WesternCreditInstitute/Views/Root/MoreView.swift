//
//  MoreView.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Hosts the destinations that no longer live in the tab bar — Wallet,
/// Earnings, Hire Pro and Admin — mirroring the "More" tab on the native app.
struct MoreView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store

    @Binding var selectedTab: AppTab

    private struct MoreItem: Identifiable {
        let id: String
        let tab: AppTab
        let symbol: String
        let title: String
        let subtitle: String
        let tint: Color
    }

    private var financialItems: [MoreItem] {
        [
            MoreItem(
                id: "wallet",
                tab: .wallet,
                symbol: "wallet.bifold.fill",
                title: "Wallet",
                subtitle: "Manage your balance, transactions and MUSO tokens",
                tint: AppTab.wallet.activeColor
            ),
            MoreItem(
                id: "earnings",
                tab: .earnings,
                symbol: "chart.line.uptrend.xyaxis.circle.fill",
                title: "Earnings",
                subtitle: "Track referral earnings and commission payouts",
                tint: AppTab.earnings.activeColor
            ),
            MoreItem(
                id: "hirePro",
                tab: .hirePro,
                symbol: "checkmark.seal.fill",
                title: "Hire a Pro",
                subtitle: "Connect with a certified credit repair professional",
                tint: AppTab.hirePro.activeColor
            ),
        ]
    }

    private var adminItems: [MoreItem] {
        [
            MoreItem(
                id: "admin",
                tab: .admin,
                symbol: "checkmark.shield.fill",
                title: "Admin Panel",
                subtitle: "Manage users, courses and platform settings",
                tint: AppTab.admin.activeColor
            )
        ]
    }

    var body: some View {
        let colors = theme.colors

        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                header

                group(title: "Financial", items: financialItems)
                group(title: "Administration", items: adminItems)

                Text("Western Credit Institute")
                    .font(.system(size: 13))
                    .foregroundStyle(colors.textLight)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.top, Spacing.sm)
            }
            .padding(.horizontal, Spacing.md)
            .padding(.top, Spacing.md)
            .padding(.bottom, Spacing.lg)
        }
        .background(colors.background)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text("More")
                .font(.system(size: 32, weight: .bold))
                .foregroundStyle(theme.colors.text)
            Text(store.user.name)
                .font(.system(size: 15))
                .foregroundStyle(theme.colors.textSecondary)
        }
    }

    private func group(title: String, items: [MoreItem]) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(title.uppercased())
                .font(.system(size: 13, weight: .bold))
                .kerning(0.8)
                .foregroundStyle(theme.colors.textLight)
                .padding(.leading, Spacing.xs)

            CardView(padding: 0) {
                VStack(spacing: 0) {
                    ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                        row(for: item)

                        if index < items.count - 1 {
                            Divider()
                                .overlay(theme.colors.border)
                                .padding(.leading, 74)
                        }
                    }
                }
            }
        }
    }

    private func row(for item: MoreItem) -> some View {
        Button {
            Haptics.light()
            withAnimation(.spring(response: 0.34, dampingFraction: 0.8)) {
                selectedTab = item.tab
            }
        } label: {
            HStack(spacing: Spacing.md) {
                Image(systemName: item.symbol)
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(item.tint)
                    .frame(width: 44, height: 44)
                    .background(item.tint.opacity(0.12), in: .rect(cornerRadius: Radius.md, style: .continuous))

                VStack(alignment: .leading, spacing: 2) {
                    Text(item.title)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(theme.colors.text)
                        .multilineTextAlignment(.leading)
                    Text(item.subtitle)
                        .font(.system(size: 13))
                        .foregroundStyle(theme.colors.textSecondary)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(theme.colors.textLight)
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.md)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(item.title)
        .accessibilityHint(item.subtitle)
    }
}
