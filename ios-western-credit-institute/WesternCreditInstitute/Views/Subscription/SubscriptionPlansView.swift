//
//  SubscriptionPlansView.swift
//  WesternCreditInstitute
//

import SwiftUI

struct SubscriptionPlansView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var selected: SubscriptionTier = .ace1Student

    private let plans: [SubscriptionTier] = [.ace1Student, .csoAffiliate]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    VStack(spacing: Spacing.sm) {
                        Image(systemName: "crown.fill")
                            .font(.system(size: 30, weight: .semibold))
                            .foregroundStyle(theme.colors.warning)
                            .frame(width: 74, height: 74)
                            .background(theme.colors.warning.opacity(0.14))
                            .clipShape(.circle)

                        Text("Choose your plan")
                            .font(.system(size: 26, weight: .heavy))
                            .foregroundStyle(theme.colors.text)

                        Text("Unlock the full Advanced Credit Education library and start earning with referrals.")
                            .font(.system(size: 14))
                            .foregroundStyle(theme.colors.textSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, Spacing.sm)

                    VStack(spacing: Spacing.md) {
                        ForEach(plans) { plan in
                            planCard(plan)
                        }
                    }

                    Button {
                        Haptics.success()
                        store.setTier(selected)
                        dismiss()
                    } label: {
                        Text("Continue with \(selected.label)")
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

                    Text("Subscriptions renew monthly. Cancel anytime from your profile.")
                        .font(.system(size: 11))
                        .foregroundStyle(theme.colors.textLight)
                        .multilineTextAlignment(.center)
                }
                .padding(Spacing.md)
            }
            .background(theme.colors.background)
            .navigationTitle("Plans")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                        .fontWeight(.semibold)
                }
            }
        }
    }

    private func planCard(_ plan: SubscriptionTier) -> some View {
        let isSelected = selected == plan
        let isBest = plan == .csoAffiliate

        return Button {
            Haptics.selection()
            withAnimation(.spring(response: 0.32, dampingFraction: 0.78)) { selected = plan }
        } label: {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Text(plan.label)
                        .font(.system(size: 18, weight: .heavy))
                        .foregroundStyle(theme.colors.text)
                    Spacer()
                    if isBest {
                        BadgeView(text: "BEST VALUE", variant: .success)
                    }
                }

                HStack(alignment: .firstTextBaseline, spacing: 2) {
                    Text(Format.compactCurrency(plan.monthlyFee))
                        .font(.system(size: 30, weight: .heavy))
                        .foregroundStyle(theme.colors.primary)
                    Text("/mo")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(theme.colors.textLight)
                }

                VStack(alignment: .leading, spacing: 6) {
                    ForEach(plan.perks, id: \.self) { perk in
                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 13))
                                .foregroundStyle(theme.colors.success)
                            Text(perk)
                                .font(.system(size: 13))
                                .foregroundStyle(theme.colors.textSecondary)
                        }
                    }
                }
            }
            .padding(Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(theme.colors.surface)
            .clipShape(.rect(cornerRadius: Radius.lg))
            .overlay {
                RoundedRectangle(cornerRadius: Radius.lg)
                    .stroke(isSelected ? theme.colors.primary : theme.colors.border, lineWidth: isSelected ? 2 : 1)
            }
            .shadow(color: isSelected ? theme.colors.primary.opacity(0.18) : .clear, radius: 12, y: 4)
        }
        .buttonStyle(PressableButtonStyle())
    }
}
