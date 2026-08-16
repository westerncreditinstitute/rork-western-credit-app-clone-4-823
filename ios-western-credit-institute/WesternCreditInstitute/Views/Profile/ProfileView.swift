//
//  ProfileView.swift
//  WesternCreditInstitute
//

import SwiftUI

struct ProfileView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store
    @Environment(\.openURL) private var openURL

    @Binding var selectedTab: AppTab

    @State private var showPlans = false
    @State private var showSignOutConfirmation = false
    @State private var showLegal: LegalDocument?
    @State private var showCertificates = false
    @State private var showPersonalInfo = false
    @State private var showPaymentMethods = false
    @State private var showDisputeAssistant = false
    @State private var showCreditCoach = false
    @State private var showLawsuitAssistant = false
    @State private var showDisputeTracker = false
    @State private var showChallenges = false

    var body: some View {
        let colors = theme.colors

        ScrollView {
            VStack(spacing: Spacing.lg) {
                profileHeader
                statsRow
                subscriptionCard
                appearanceSection
                accountSection
                aiToolsSection
                supportSection
                legalSection
                signOutButton
                versionFooter
            }
            .padding(.horizontal, Spacing.md)
            .padding(.top, Spacing.md)
            .padding(.bottom, Spacing.xl)
        }
        .scrollIndicators(.hidden)
        .background(colors.background)
        .sheet(isPresented: $showPlans) { SubscriptionPlansView() }
        .sheet(item: $showLegal) { document in
            LegalDocumentView(document: document)
        }
        .sheet(isPresented: $showCertificates) { NavigationStack { CertificatesView() } }
        .sheet(isPresented: $showPersonalInfo) { NavigationStack { PersonalInfoView() } }
        .sheet(isPresented: $showPaymentMethods) { NavigationStack { PaymentMethodsView() } }
        .sheet(isPresented: $showDisputeAssistant) { NavigationStack { AIDisputeAssistantView() } }
        .sheet(isPresented: $showCreditCoach) { AICreditCoachView() }
        .sheet(isPresented: $showLawsuitAssistant) { NavigationStack { LawsuitAssistantView() } }
        .sheet(isPresented: $showDisputeTracker) { NavigationStack { DisputeTrackerView() } }
        .sheet(isPresented: $showChallenges) { NavigationStack { ChallengesView() } }
        .confirmationDialog("Sign out of your account?", isPresented: $showSignOutConfirmation, titleVisibility: .visible) {
            Button("Sign Out", role: .destructive) {
                Haptics.warning()
                store.setTier(.free)
            }
            Button("Cancel", role: .cancel) {}
        }
    }

    // MARK: - Header

    private var profileHeader: some View {
        VStack(spacing: Spacing.md) {
            AvatarView(
                urlString: store.user.avatarURL,
                initials: store.user.initials,
                size: 96,
                borderColor: Color.white.opacity(0.3)
            )

            VStack(spacing: 3) {
                Text(store.user.name)
                    .font(.system(size: 23, weight: .heavy))
                    .foregroundStyle(.white)

                Text(store.user.email)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.white.opacity(0.72))

                HStack(spacing: Spacing.sm) {
                    BadgeView(text: store.user.role.rawValue, variant: .success, symbol: "checkmark.seal.fill")
                        .background(Color.white.opacity(0.12), in: .capsule)
                    Text("Member since \(store.user.memberSince)")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.white.opacity(0.6))
                }
                .padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.lg)
        .background(
            LinearGradient(
                colors: theme.colors.gradientHeader,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(.rect(cornerRadius: Radius.xl))
        .shadow(color: theme.colors.shadow, radius: 14, y: 6)
    }

    private var statsRow: some View {
        HStack(spacing: Spacing.sm) {
            statBox(value: "\(store.enrolledCourses.count)", label: "Courses", symbol: "book.fill", tint: theme.colors.primary)
            statBox(value: "\(store.certificateCount)", label: "Certificates", symbol: "rosette", tint: Color(hex: "#F59E0B"))
            statBox(value: "\(store.user.referrals)", label: "Referrals", symbol: "person.2.fill", tint: theme.colors.info)
        }
    }

    private func statBox(value: String, label: String, symbol: String, tint: Color) -> some View {
        VStack(spacing: 5) {
            Image(systemName: symbol)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(tint)
            Text(value)
                .font(.system(size: 20, weight: .heavy))
                .foregroundStyle(theme.colors.text)
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(theme.colors.textLight)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.md)
        .background(theme.colors.surface)
        .clipShape(.rect(cornerRadius: Radius.md))
        .shadow(color: theme.colors.shadow, radius: 8, y: 3)
    }

    // MARK: - Subscription

    private var subscriptionCard: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "Subscription", symbol: "crown.fill", symbolTint: theme.colors.warning)

            CardView {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(store.tier.label)
                                .font(.system(size: 18, weight: .heavy))
                                .foregroundStyle(theme.colors.text)
                            Text(store.isFree ? "No active subscription" : "\(Format.compactCurrency(store.tier.monthlyFee))/month • renews automatically")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(theme.colors.textSecondary)
                        }
                        Spacer(minLength: 0)
                        BadgeView(
                            text: store.isFree ? "Inactive" : "Active",
                            variant: store.isFree ? .neutral : .success,
                            symbol: store.isFree ? "xmark" : "checkmark"
                        )
                    }

                    if !store.isFree {
                        VStack(alignment: .leading, spacing: 6) {
                            ForEach(store.tier.perks, id: \.self) { perk in
                                HStack(spacing: Spacing.sm) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: 12))
                                        .foregroundStyle(theme.colors.success)
                                    Text(perk)
                                        .font(.system(size: 13))
                                        .foregroundStyle(theme.colors.textSecondary)
                                }
                            }
                        }
                    }

                    Button {
                        Haptics.medium()
                        showPlans = true
                    } label: {
                        Text(store.isFree ? "Choose a Plan" : store.isACE1 ? "Upgrade to CSO Affiliate" : "Manage Plan")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 13)
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
    }

    // MARK: - Appearance

    private var appearanceSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "Appearance", symbol: "paintbrush.fill", symbolTint: theme.colors.accent)

            CardView(padding: Spacing.sm) {
                HStack(spacing: Spacing.sm) {
                    ForEach(ThemeMode.allCases) { mode in
                        Button {
                            Haptics.selection()
                            withAnimation(.spring(response: 0.32, dampingFraction: 0.8)) {
                                theme.mode = mode
                            }
                        } label: {
                            VStack(spacing: 6) {
                                Image(systemName: mode.symbol)
                                    .font(.system(size: 17, weight: .semibold))
                                Text(mode.label)
                                    .font(.system(size: 12, weight: .semibold))
                            }
                            .foregroundStyle(theme.mode == mode ? theme.colors.textInverse : theme.colors.textSecondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, Spacing.md)
                            .background(theme.mode == mode ? theme.colors.primary : theme.colors.surfaceAlt)
                            .clipShape(.rect(cornerRadius: Radius.md))
                        }
                        .buttonStyle(PressableButtonStyle())
                    }
                }
            }
        }
    }

    // MARK: - Menus

    private var accountSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "Account", symbol: "person.crop.circle.fill", symbolTint: theme.colors.primary)

            CardView(padding: 0) {
                VStack(spacing: 0) {
                    menuRow(symbol: "person.fill", tint: theme.colors.primary, title: "Personal Info", subtitle: "Edit your details") {
                        showPersonalInfo = true
                    }
                    rowDivider
                    menuRow(symbol: "rosette", tint: Color(hex: "#F59E0B"), title: "Certificates", subtitle: "\(store.certificateCount) earned") {
                        showCertificates = true
                    }
                    rowDivider
                    menuRow(symbol: "creditcard.fill", tint: theme.colors.secondary, title: "Payment Methods", subtitle: "Manage cards & banks") {
                        showPaymentMethods = true
                    }
                    rowDivider
                    menuRow(symbol: "doc.text.fill", tint: theme.colors.info, title: "Dispute Tracker", subtitle: "Track credit disputes") {
                        showDisputeTracker = true
                    }
                    rowDivider
                    menuRow(symbol: "trophy.fill", tint: Color(hex: "#8B5CF6"), title: "Challenges", subtitle: "Earn rewards") {
                        showChallenges = true
                    }
                    rowDivider
                    menuRow(symbol: "book.fill", tint: theme.colors.primary, title: "My Courses", subtitle: "\(store.enrolledCourses.count) enrolled") {
                        selectedTab = .courses
                    }
                    rowDivider
                    menuRow(symbol: "wallet.pass.fill", tint: theme.colors.secondary, title: "Wallet", subtitle: Format.currency(store.wallet.availableBalance)) {
                        selectedTab = .wallet
                    }
                }
            }
        }
    }

    // MARK: - AI Tools

    private var aiToolsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "AI Tools", symbol: "sparkles", symbolTint: theme.colors.accent)

            CardView(padding: 0) {
                VStack(spacing: 0) {
                    menuRow(symbol: "doc.text.magnifyingglass.fill", tint: theme.colors.info, title: "AI Dispute Assistant", subtitle: "Generate dispute letters") {
                        showDisputeAssistant = true
                    }
                    rowDivider
                    menuRow(symbol: "person.wave.2.fill", tint: theme.colors.accent, title: "AI Credit Coach", subtitle: "Interactive avatar coach") {
                        showCreditCoach = true
                    }
                    rowDivider
                    menuRow(symbol: "scale.3d.fill", tint: theme.colors.error, title: "Lawsuit Assistant", subtitle: "Check violation grounds") {
                        showLawsuitAssistant = true
                    }
                }
            }
        }
    }

    private var supportSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "Support", symbol: "questionmark.circle.fill", symbolTint: theme.colors.info)

            CardView(padding: 0) {
                VStack(spacing: 0) {
                    menuRow(symbol: "phone.fill", tint: theme.colors.success, title: "Call Support", subtitle: "1-800-437-8557") {
                        openURL(URL(string: "tel:18004378557") ?? fallbackURL)
                    }
                    rowDivider
                    menuRow(symbol: "envelope.fill", tint: theme.colors.info, title: "Email Support", subtitle: "support@westerncreditinstitute.com") {
                        openURL(URL(string: "mailto:support@westerncreditinstitute.com") ?? fallbackURL)
                    }
                    rowDivider
                    menuRow(symbol: "globe", tint: theme.colors.primary, title: "Visit Website", subtitle: "westerncreditinstitute.com") {
                        openURL(URL(string: "https://www.westerncreditinstitute.com") ?? fallbackURL)
                    }
                }
            }
        }
    }

    private var legalSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "Legal", symbol: "doc.text.fill", symbolTint: theme.colors.textSecondary)

            CardView(padding: 0) {
                VStack(spacing: 0) {
                    menuRow(symbol: "doc.plaintext.fill", tint: theme.colors.textSecondary, title: "Terms & Conditions", subtitle: nil) {
                        showLegal = .terms
                    }
                    rowDivider
                    menuRow(symbol: "hand.raised.fill", tint: theme.colors.textSecondary, title: "Privacy Policy", subtitle: nil) {
                        showLegal = .privacy
                    }
                }
            }
        }
    }

    private var signOutButton: some View {
        Button {
            Haptics.light()
            showSignOutConfirmation = true
        } label: {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                    .font(.system(size: 15, weight: .semibold))
                Text("Sign Out")
                    .font(.system(size: 15, weight: .bold))
            }
            .foregroundStyle(theme.colors.error)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(theme.colors.error.opacity(0.1))
            .clipShape(.rect(cornerRadius: Radius.md))
        }
        .buttonStyle(PressableButtonStyle())
    }

    private var versionFooter: some View {
        VStack(spacing: 3) {
            Text("Western Credit Institute")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(theme.colors.textLight)
            Text("Version 1.0.0")
                .font(.system(size: 11))
                .foregroundStyle(theme.colors.textLight)
        }
        .padding(.top, Spacing.sm)
    }

    // MARK: - Helpers

    private var fallbackURL: URL {
        URL(string: "https://www.westerncreditinstitute.com") ?? URL(fileURLWithPath: "/")
    }

    private var rowDivider: some View {
        Rectangle()
            .fill(theme.colors.borderLight)
            .frame(height: 1)
            .padding(.leading, 68)
    }

    private func menuRow(
        symbol: String,
        tint: Color,
        title: String,
        subtitle: String?,
        action: @escaping () -> Void
    ) -> some View {
        Button {
            Haptics.light()
            action()
        } label: {
            HStack(spacing: Spacing.md) {
                Image(systemName: symbol)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(tint)
                    .frame(width: 38, height: 38)
                    .background(tint.opacity(0.13))
                    .clipShape(.rect(cornerRadius: Radius.sm))

                VStack(alignment: .leading, spacing: 1) {
                    Text(title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(theme.colors.text)
                    if let subtitle {
                        Text(subtitle)
                            .font(.system(size: 12))
                            .foregroundStyle(theme.colors.textSecondary)
                            .lineLimit(1)
                    }
                }

                Spacer(minLength: 0)

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(theme.colors.textLight)
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, 13)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Legal

nonisolated enum LegalDocument: String, Identifiable, Sendable {
    case terms
    case privacy

    var id: String { rawValue }

    var title: String {
        switch self {
        case .terms: return "Terms & Conditions"
        case .privacy: return "Privacy Policy"
        }
    }

    var sections: [(String, String)] {
        switch self {
        case .terms:
            return [
                ("Enrollment", "Course enrollment grants a single-user, non-transferable licence to the course materials. Sharing account credentials or redistributing materials terminates your access without refund."),
                ("Payments & auto debit", "ACE-2 and ACE-3 installment plans are auto debit only. If an auto debit payment fails, access to the course is suspended immediately until payment is received."),
                ("Certificates & certification", "Certificates of completion require finishing all course modules and paying any applicable certificate fee. CSO Certification additionally requires passing the CSOA exam."),
                ("Affiliate earnings", "Referral bonuses, residual income and commissions are paid monthly on balances above the $25 minimum. Fraudulent or self-referred signups are voided."),
                ("No legal advice", "Western Credit Institute provides education, not legal or financial advice. Outcomes vary and no specific credit score result is guaranteed."),
            ]
        case .privacy:
            return [
                ("What we collect", "Account details, course progress, referral activity and payout preferences. Credit report data you upload is processed only to power your dispute tooling."),
                ("How we use it", "To deliver courses, calculate affiliate earnings, provide support and improve the learning experience. We never sell your personal information."),
                ("Sharing", "Limited sharing with payment processors and infrastructure providers strictly to operate the service. CSO professionals only receive your contact details after you pay for a consultation."),
                ("Security", "Data is encrypted in transit and at rest. Sensitive credentials are stored in the device keychain and never in plain text."),
                ("Your rights", "Request a copy or deletion of your data at any time by emailing support@westerncreditinstitute.com."),
            ]
        }
    }
}

struct LegalDocumentView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss

    let document: LegalDocument

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    ForEach(document.sections, id: \.0) { section in
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text(section.0)
                                .font(.system(size: 17, weight: .bold))
                                .foregroundStyle(theme.colors.text)
                            Text(section.1)
                                .font(.system(size: 14))
                                .lineSpacing(4)
                                .foregroundStyle(theme.colors.textSecondary)
                        }
                    }

                    Text("Last updated August 2026")
                        .font(.system(size: 11))
                        .foregroundStyle(theme.colors.textLight)
                }
                .padding(Spacing.md)
            }
            .background(theme.colors.background)
            .navigationTitle(document.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .fontWeight(.semibold)
                }
            }
        }
    }
}
