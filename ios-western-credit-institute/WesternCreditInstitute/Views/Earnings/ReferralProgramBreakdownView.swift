//
//  ReferralProgramBreakdownView.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Plain-language explanation of the referral program.
///
/// Every dollar figure is computed from `Pricing`, so the worked examples can
/// never drift out of step with what the payout code actually pays. This is the
/// iOS mirror of `expo/components/earnings/ReferralProgramBreakdown.tsx`.
struct ReferralProgramBreakdownView: View {
    @Environment(ThemeManager.self) private var theme

    /// The signed-in user's tier - drives which rate is marked as theirs.
    let tier: SubscriptionTier

    private var isCSO: Bool { tier == .csoAffiliate }
    private var isEnrolled: Bool { tier != .free }

    var body: some View {
        VStack(spacing: Spacing.lg) {
            payoutsCard
            scenariosCard
            if !isCSO { csoUpsellCard }
        }
    }

    // MARK: - How you get paid

    private var payoutsCard: some View {
        CardView(padding: Spacing.lg) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                SectionHeader(
                    title: "How You Get Paid",
                    symbol: "person.2.fill",
                    symbolTint: theme.colors.info
                )

                Text("Share your link. When someone signs up through it, you earn. There is no cap on how many people you can refer.")
                    .font(.system(size: 14))
                    .foregroundStyle(theme.colors.textSecondary)

                payoutRow(
                    symbol: "person.2.fill",
                    tint: theme.colors.info,
                    title: "They sign up for ACE-1",
                    amount: Pricing.format(Pricing.referralAce1Free),
                    subtitle: "Paid once they keep the account open past \(Pricing.referralQualifyingDays) days.",
                    tag: "If you're on the Free plan",
                    isYours: tier == .free
                )

                Divider().overlay(theme.colors.border)

                payoutRow(
                    symbol: "graduationcap.fill",
                    tint: theme.colors.secondary,
                    title: "They sign up for ACE-1",
                    amount: Pricing.format(Pricing.referralAce1Enrolled),
                    subtitle: "Double the free rate, for the same referral. Paid after \(Pricing.referralQualifyingDays) days.",
                    tag: "If you're an ACE student or CSO",
                    isYours: isEnrolled
                )

                Divider().overlay(theme.colors.border)

                payoutRow(
                    symbol: "chart.line.uptrend.xyaxis",
                    tint: theme.colors.accent,
                    title: "That same person adds ACE-2 or ACE-3",
                    amount: "\(Pricing.format(Pricing.referralAce23Bounty)) each",
                    subtitle: "No trial on these courses, so it pays as soon as they register. Both courses means you get paid twice.",
                    tag: "Everyone earns this rate",
                    isYours: true
                )

                Divider().overlay(theme.colors.border)

                payoutRow(
                    symbol: "shippingbox.fill",
                    tint: theme.colors.warning,
                    title: "They buy the Complete ACE Bundle",
                    amount: Pricing.format(
                        isCSO ? Pricing.bundlePayoutCSO : Pricing.bundlePayoutStandard
                    ),
                    subtitle: isCSO
                        ? "\(Pricing.formatRate(Pricing.bundleCommissionCSO)) of the sale because you're a CSO Affiliate."
                        : "\(Pricing.formatRate(Pricing.bundleCommissionStandard)) of the sale. CSO Affiliates get \(Pricing.formatRate(Pricing.bundleCommissionCSO)) — \(Pricing.format(Pricing.bundlePayoutCSO)) — on the exact same sale.",
                    tag: isCSO ? "Your CSO rate" : "Your current rate",
                    isYours: true
                )

                Divider().overlay(theme.colors.border)

                payoutRow(
                    symbol: "arrow.triangle.2.circlepath",
                    tint: theme.colors.secondary,
                    title: "You sign up another CSO Affiliate",
                    amount: "\(Pricing.format(Pricing.csoResidualMonthly))/mo",
                    subtitle: "Every month, for as long as they stay. They pay \(Pricing.format(Pricing.csoMonthlyFee))/month to be in the network and half of it comes back to you.",
                    tag: isCSO ? "Your CSO residual" : "CSO Affiliates only",
                    isYours: isCSO
                )

                HStack(alignment: .top, spacing: Spacing.sm) {
                    Image(systemName: "clock.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(theme.colors.textSecondary)
                    Text("One person can earn you money more than once — the ACE-1 bonus, then again for every course they add on top.")
                        .font(.system(size: 13))
                        .foregroundStyle(theme.colors.textSecondary)
                }
                .padding(Spacing.sm)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(theme.colors.surfaceAlt)
                .clipShape(.rect(cornerRadius: Radius.sm))

                HStack(alignment: .top, spacing: Spacing.sm) {
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.system(size: 12))
                        .foregroundStyle(theme.colors.secondary)
                    Group {
                        Text("The residual is the only one that repeats. ")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(theme.colors.text)
                        + Text("Every other payout here is earned once. Sign up 10 CSO Affiliates and that is \(Pricing.format(Pricing.csoResidualMonthly * 10)) arriving every month without referring anyone new.")
                            .font(.system(size: 13))
                            .foregroundStyle(theme.colors.textSecondary)
                    }
                    .fixedSize(horizontal: false, vertical: true)
                }
                .padding(Spacing.sm)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(theme.colors.secondary.opacity(0.1))
                .clipShape(.rect(cornerRadius: Radius.sm))
            }
        }
    }

    private func payoutRow(
        symbol: String,
        tint: Color,
        title: String,
        amount: String,
        subtitle: String,
        tag: String,
        isYours: Bool
    ) -> some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            Image(systemName: symbol)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(tint)
                .frame(width: 44, height: 44)
                .background(tint.opacity(0.12))
                .clipShape(.rect(cornerRadius: Radius.md))

            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .firstTextBaseline, spacing: Spacing.sm) {
                    Text(title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(theme.colors.text)
                        .fixedSize(horizontal: false, vertical: true)

                    Spacer(minLength: 0)

                    Text(amount)
                        .font(.system(size: 17, weight: .heavy))
                        .foregroundStyle(tint)
                        .monospacedDigit()
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }

                Text(subtitle)
                    .font(.system(size: 13))
                    .foregroundStyle(theme.colors.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)

                HStack(spacing: Spacing.sm) {
                    Text(tag)
                        .font(.system(size: 12, weight: isYours ? .bold : .regular))
                        .foregroundStyle(isYours ? theme.colors.secondary : theme.colors.textLight)

                    if isYours {
                        Text("YOU")
                            .font(.system(size: 10, weight: .heavy))
                            .foregroundStyle(theme.colors.secondary)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 2)
                            .background(theme.colors.secondary.opacity(0.12))
                            .clipShape(.rect(cornerRadius: Radius.sm))
                    }
                }
            }
        }
    }

    // MARK: - Worked examples

    private var scenariosCard: some View {
        CardView(padding: Spacing.lg) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                SectionHeader(
                    title: "What This Adds Up To",
                    symbol: "chart.line.uptrend.xyaxis",
                    symbolTint: theme.colors.secondary
                )

                Text("Real math at CSO Affiliate rates — not projections. Here is what a month looks like at three levels of activity. The residual line is the part that carries over to next month on its own.")
                    .font(.system(size: 14))
                    .foregroundStyle(theme.colors.textSecondary)

                ForEach(EarningsScenario.all) { scenario in
                    scenarioCard(scenario)
                }
            }
        }
    }

    private func scenarioCard(_ scenario: EarningsScenario) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(alignment: .firstTextBaseline) {
                Text(scenario.label)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(theme.colors.text)

                Spacer(minLength: Spacing.sm)

                HStack(alignment: .firstTextBaseline, spacing: 1) {
                    Text(Pricing.format(scenario.csoTotal))
                        .font(.system(size: 22, weight: .heavy))
                        .foregroundStyle(theme.colors.secondary)
                        .monospacedDigit()
                    Text("/mo")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(theme.colors.textSecondary)
                }
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            }

            Text(scenario.caption)
                .font(.system(size: 13))
                .foregroundStyle(theme.colors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            VStack(alignment: .leading, spacing: 5) {
                Text("\(scenario.ace1Referrals) ACE-1 referrals × \(Pricing.format(Pricing.referralAce1Enrolled)) = \(Pricing.format(Double(scenario.ace1Referrals) * Pricing.referralAce1Enrolled))")
                Text("\(scenario.advancedCourseRegistrations) ACE-2/ACE-3 registrations × \(Pricing.format(Pricing.referralAce23Bounty)) = \(Pricing.format(Double(scenario.advancedCourseRegistrations) * Pricing.referralAce23Bounty))")
                Text("\(scenario.bundleSales) bundle sales × \(Pricing.format(Pricing.bundlePayoutCSO)) = \(Pricing.format(Double(scenario.bundleSales) * Pricing.bundlePayoutCSO))")
                Text("\(scenario.activeCSOReferrals) CSO Affiliates × \(Pricing.format(Pricing.csoResidualMonthly)) residual = \(Pricing.format(scenario.csoResidual)) — every month")
                    .foregroundStyle(theme.colors.secondary)
            }
            .font(.system(size: 12))
            .foregroundStyle(theme.colors.textLight)
            .fixedSize(horizontal: false, vertical: true)

            if !isCSO {
                Divider().overlay(theme.colors.border)

                HStack(spacing: Spacing.sm) {
                    Text("At your current rate: \(Pricing.format(scenario.total(for: tier)))/mo")
                        .font(.system(size: 12))
                        .foregroundStyle(theme.colors.textSecondary)

                    Spacer(minLength: 0)

                    BadgeView(
                        text: "+\(Pricing.format(scenario.csoTotal - scenario.total(for: tier))) as CSO",
                        variant: .success
                    )
                }
            }
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(theme.colors.surfaceAlt)
        .clipShape(.rect(cornerRadius: Radius.lg))
    }

    // MARK: - CSO upsell

    private var csoUpsellCard: some View {
        CardView(padding: Spacing.lg) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "crown.fill")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(theme.colors.warning)
                    Text("Become a CSO Affiliate")
                        .font(.system(size: 20, weight: .heavy))
                        .foregroundStyle(theme.colors.text)
                }

                Text("This is where the money is. CSO Affiliates keep \(Pricing.formatRate(Pricing.bundleCommissionCSO)) of every bundle sale instead of \(Pricing.formatRate(Pricing.bundleCommissionStandard)).")
                    .font(.system(size: 14))
                    .foregroundStyle(theme.colors.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)

                HStack(spacing: 0) {
                    compareColumn(
                        label: "You now",
                        value: Pricing.format(Pricing.bundleCommission(for: tier)),
                        tint: theme.colors.text
                    )

                    Rectangle()
                        .fill(theme.colors.border)
                        .frame(width: 0.5)
                        .frame(maxHeight: .infinity)

                    compareColumn(
                        label: "As a CSO",
                        value: Pricing.format(Pricing.bundlePayoutCSO),
                        tint: theme.colors.warning
                    )
                }
                .padding(Spacing.md)
                .background(theme.colors.surfaceAlt)
                .clipShape(.rect(cornerRadius: Radius.lg))

                Text("That is \(Pricing.format(Pricing.bundleCSOAdvantage)) more on every single bundle you sell. Two bundles a month more than covers your CSO dues.")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(theme.colors.text)
                    .fixedSize(horizontal: false, vertical: true)

                VStack(alignment: .leading, spacing: Spacing.sm) {
                    ForEach(csoBenefits, id: \.self) { benefit in
                        HStack(alignment: .top, spacing: Spacing.sm) {
                            Image(systemName: "checkmark")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(theme.colors.secondary)
                            Text(benefit)
                                .font(.system(size: 13))
                                .foregroundStyle(theme.colors.textSecondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }

                Text("CSO Affiliate membership is \(Pricing.format(Pricing.csoMonthlyFee))/month to stay in the network and keep your Hire a Pro listing.")
                    .font(.system(size: 13))
                    .foregroundStyle(theme.colors.text)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(Spacing.sm)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(theme.colors.warning.opacity(0.1))
                    .clipShape(.rect(cornerRadius: Radius.sm))
            }
        }
        .overlay {
            RoundedRectangle(cornerRadius: Radius.lg)
                .stroke(theme.colors.warning.opacity(0.35), lineWidth: 2)
        }
    }

    private var csoBenefits: [String] {
        [
            "\(Pricing.formatRate(Pricing.bundleCommissionCSO)) commission on every bundle sale",
            "\(Pricing.format(Pricing.referralAce1Enrolled)) per ACE-1 referral",
            "\(Pricing.format(Pricing.referralAce23Bounty)) per ACE-2/ACE-3 registration",
            "\(Pricing.format(Pricing.csoResidualMonthly))/month residual for every CSO Affiliate you sign up",
            "Listed publicly on the Hire a Pro page",
            "Paid client consultations through the network",
        ]
    }

    private func compareColumn(label: String, value: String, tint: Color) -> some View {
        VStack(spacing: 4) {
            Text(label)
                .font(.system(size: 12))
                .foregroundStyle(tint == theme.colors.text ? theme.colors.textSecondary : tint)
            Text(value)
                .font(.system(size: 22, weight: .heavy))
                .foregroundStyle(tint)
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text("per bundle sale")
                .font(.system(size: 11))
                .foregroundStyle(theme.colors.textLight)
        }
        .frame(maxWidth: .infinity)
    }
}
