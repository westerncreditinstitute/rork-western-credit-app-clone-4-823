//
//  UpgradeOfferView.swift
//  WesternCreditInstitute
//

import SwiftUI

/// The upgrade offer shown once, immediately after registration.
///
/// Mirror of `expo/components/UpgradeOfferModal.tsx`. Everyone signs up free,
/// so this is the first and best moment to explain what the paid courses are.
/// It is deliberately dismissible with a single obvious X — a new member who
/// feels trapped behind a paywall churns before they ever see the product.
struct UpgradeOfferView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss

    /// Called with the course the member picked, so the host can route to it.
    var onSelectCourse: (String) -> Void

    private nonisolated struct Offer: Identifiable {
        /// Course id in `MockData.courses`.
        let id: String
        let code: String
        let title: String
        let tagline: String
        /// Large headline figure — what they pay today.
        let dueToday: Double
        let dueTodayCaption: String
        /// Recurring cost after any free period. Nil for the lifetime bundle.
        let monthlyCaption: String?
        let perks: [String]
        let accent: Color
        let gradient: [Color]
        var badge: String?
        var featured: Bool = false
    }

    /// The four things a new member can buy, in the order we want them
    /// weighed: ACE-1 first because it is the cheapest way in, the bundle
    /// last because it anchors the monthly courses as the small option.
    private var offers: [Offer] {
        [
            Offer(
                id: CourseID.ace1,
                code: "ACE-1",
                title: "Advanced Credit Repair",
                tagline: "Remove negative items and take back your report.",
                dueToday: Pricing.certificateFee,
                dueTodayCaption: "Certificate fee — then free for \(Pricing.ace1FreeDays) days",
                monthlyCaption: "\(Pricing.format(Pricing.monthlySubscription))/mo after \(Pricing.ace1FreeDays) days",
                perks: [
                    "Free for your first \(Pricing.ace1FreeDays) days",
                    "Your own AI Credit Repair Agent",
                    "AI Dispute & Lawsuit Assistants",
                    "Cloud Dispute Tracker",
                    "\(Pricing.format(Pricing.referralAce1Enrolled)) per student you refer",
                ],
                accent: Color(hex: "#10B981"),
                gradient: [Color(hex: "#064E3B"), Color(hex: "#065F46")],
                badge: "BEST START"
            ),
            Offer(
                id: CourseID.ace2,
                code: "ACE-2",
                title: "Advanced Credit Building",
                tagline: "Build toward an 800+ FICO score in as little as 90 days.",
                dueToday: Pricing.ace23DueToday,
                dueTodayCaption: "\(Pricing.format(Pricing.certificateFee)) certificate + \(Pricing.format(Pricing.enrollmentFee)) enrollment",
                monthlyCaption: "\(Pricing.format(Pricing.monthlySubscription))/mo — no free trial",
                perks: [
                    "Establish an 800+ FICO score",
                    "AI agent trained on score building",
                    "Interactive Coach access",
                    "Credit chain & authorized user strategies",
                    "\(Pricing.format(Pricing.referralAce23Bounty)) per ACE-2/3 referral",
                ],
                accent: Color(hex: "#3B82F6"),
                gradient: [Color(hex: "#1E3A8A"), Color(hex: "#1E40AF")]
            ),
            Offer(
                id: CourseID.ace3,
                code: "ACE-3",
                title: "Advanced Business Credit",
                tagline: "Build corporate credit and unlock business funding.",
                dueToday: Pricing.ace23DueToday,
                dueTodayCaption: "\(Pricing.format(Pricing.certificateFee)) certificate + \(Pricing.format(Pricing.enrollmentFee)) enrollment",
                monthlyCaption: "\(Pricing.format(Pricing.monthlySubscription))/mo — no free trial",
                perks: [
                    "Establish a business credit profile",
                    "Trade lines & vendor accounts",
                    "SBA loans and business funding",
                    "Interactive Coach access",
                    "Separate personal & business credit",
                ],
                accent: Color(hex: "#A855F7"),
                gradient: [Color(hex: "#4C1D95"), Color(hex: "#5B21B6")]
            ),
            Offer(
                id: CourseID.bundle,
                code: "ACE-4",
                title: "Complete ACE Bundle",
                tagline: "All three courses. One payment. Yours for life.",
                dueToday: Pricing.bundlePrice,
                dueTodayCaption: "One time — lifetime access, no subscription ever",
                monthlyCaption: nil,
                perks: [
                    "ACE-1, ACE-2 and ACE-3 included",
                    "Every AI tool with no topic limits",
                    "All three certificates",
                    "Affiliate network + all future updates",
                    "\(Pricing.formatRate(Pricing.bundleCommissionCSO)) commission as a CSO Affiliate",
                ],
                accent: Color(hex: "#D4AF37"),
                gradient: [Color(hex: "#78350F"), Color(hex: "#92400E")],
                badge: "BEST VALUE",
                featured: true
            ),
        ]
    }

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: "#0A1628"), Color(hex: "#1A365D"), Color(hex: "#0A1628")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    header

                    ForEach(offers) { offer in
                        card(for: offer)
                    }

                    Button {
                        Haptics.light()
                        dismiss()
                    } label: {
                        Text("Maybe later — keep exploring free")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Color(hex: "#D4AF37"))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, Spacing.md)
                    }
                    .buttonStyle(PressableButtonStyle())

                    Text("You can enroll any time from the Courses tab. Your free account never expires.")
                        .font(.system(size: 12))
                        .foregroundStyle(Color(hex: "#64748B"))
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                        .padding(.horizontal, Spacing.md)
                }
                .padding(.horizontal, Spacing.md)
                .padding(.bottom, Spacing.xl)
            }
            .scrollIndicators(.hidden)
        }
        .overlay(alignment: .topTrailing) {
            Button {
                Haptics.light()
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(.white.opacity(0.12), in: .circle)
                    .overlay {
                        Circle().stroke(.white.opacity(0.18), lineWidth: 1)
                    }
            }
            .buttonStyle(PressableButtonStyle())
            .padding(.trailing, Spacing.md)
            .padding(.top, Spacing.sm)
            .accessibilityLabel("Close upgrade offer")
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: Spacing.sm + 2) {
            HStack(spacing: Spacing.xs + 2) {
                Image(systemName: "sparkles")
                    .font(.system(size: 12, weight: .bold))
                Text("YOUR ACCOUNT IS READY")
                    .font(.system(size: 10, weight: .heavy))
                    .kerning(1)
            }
            .foregroundStyle(Color(hex: "#D4AF37"))
            .padding(.horizontal, Spacing.sm + 4)
            .padding(.vertical, 6)
            .background(Color(hex: "#D4AF37").opacity(0.14), in: .capsule)
            .overlay {
                Capsule().stroke(Color(hex: "#D4AF37").opacity(0.3), lineWidth: 1)
            }

            Text("Pick the course that fits your goal")
                .font(.system(size: 28, weight: .heavy))
                .foregroundStyle(.white)
                .fixedSize(horizontal: false, vertical: true)

            Text("Your free account is active and you can start referring today. Add a course whenever you're ready — or skip this and look around first.")
                .font(.system(size: 14))
                .foregroundStyle(Color(hex: "#94A3B8"))
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.top, Spacing.xl + Spacing.sm)
        .padding(.bottom, Spacing.sm)
    }

    // MARK: - Offer card

    private func card(for offer: Offer) -> some View {
        Button {
            Haptics.medium()
            onSelectCourse(offer.id)
            dismiss()
        } label: {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .center, spacing: Spacing.sm) {
                    Text(offer.code)
                        .font(.system(size: 12, weight: .heavy))
                        .kerning(0.5)
                        .foregroundStyle(offer.accent)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(offer.accent.opacity(0.15), in: .rect(cornerRadius: Radius.sm))

                    if let badge = offer.badge {
                        Text(badge)
                            .font(.system(size: 9, weight: .heavy))
                            .kerning(0.8)
                            .foregroundStyle(Color(hex: "#0A1628"))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(offer.accent, in: .rect(cornerRadius: 6))
                    }

                    Spacer(minLength: 0)

                    if offer.featured {
                        Image(systemName: "crown.fill")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(offer.accent)
                    }
                }
                .padding(.bottom, Spacing.sm + 4)

                Text(offer.title)
                    .font(.system(size: 20, weight: .heavy))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)

                Text(offer.tagline)
                    .font(.system(size: 13))
                    .foregroundStyle(.white.opacity(0.7))
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, 4)
                    .padding(.bottom, Spacing.md)

                HStack(alignment: .firstTextBaseline, spacing: Spacing.sm + 2) {
                    Text(Pricing.format(offer.dueToday))
                        .font(.system(size: 30, weight: .heavy))
                        .foregroundStyle(offer.accent)

                    if offer.monthlyCaption == nil {
                        HStack(spacing: 4) {
                            Image(systemName: "infinity")
                                .font(.system(size: 10, weight: .bold))
                            Text("LIFETIME")
                                .font(.system(size: 9, weight: .heavy))
                                .kerning(0.8)
                        }
                        .foregroundStyle(offer.accent)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(.white.opacity(0.1), in: .rect(cornerRadius: 6))
                    }

                    Spacer(minLength: 0)
                }

                Text(offer.dueTodayCaption)
                    .font(.system(size: 12))
                    .foregroundStyle(.white.opacity(0.65))
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, 2)

                if let monthlyCaption = offer.monthlyCaption {
                    Text(monthlyCaption)
                        .font(.system(size: 12))
                        .foregroundStyle(.white.opacity(0.5))
                        .padding(.top, 2)
                }

                Divider()
                    .overlay(.white.opacity(0.1))
                    .padding(.vertical, Spacing.md)

                VStack(alignment: .leading, spacing: 9) {
                    ForEach(offer.perks, id: \.self) { perk in
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: "checkmark")
                                .font(.system(size: 11, weight: .heavy))
                                .foregroundStyle(offer.accent)
                                .padding(.top, 3)
                            Text(perk)
                                .font(.system(size: 13))
                                .foregroundStyle(.white.opacity(0.88))
                                .multilineTextAlignment(.leading)
                                .fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: 0)
                        }
                    }
                }

                HStack(spacing: Spacing.sm) {
                    Text(offer.featured ? "Get lifetime access" : "View \(offer.code)")
                        .font(.system(size: 15, weight: .heavy))
                    Image(systemName: "arrow.right")
                        .font(.system(size: 13, weight: .bold))
                }
                .foregroundStyle(Color(hex: "#0A1628"))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
                .background(offer.accent, in: .rect(cornerRadius: Radius.md))
                .padding(.top, Spacing.md)
            }
            .padding(Spacing.md + 4)
            .background(
                LinearGradient(
                    colors: offer.gradient,
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(.rect(cornerRadius: Radius.xl))
            .overlay {
                RoundedRectangle(cornerRadius: Radius.xl)
                    .stroke(
                        offer.featured ? offer.accent : .white.opacity(0.1),
                        lineWidth: 1
                    )
            }
        }
        .buttonStyle(PressableButtonStyle())
        .accessibilityLabel("\(offer.code), \(offer.title)")
        .accessibilityHint(offer.dueTodayCaption)
    }
}
