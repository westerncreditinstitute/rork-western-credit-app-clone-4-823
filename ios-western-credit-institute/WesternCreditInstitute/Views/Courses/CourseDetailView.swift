//
//  CourseDetailView.swift
//  WesternCreditInstitute
//

import SwiftUI

struct CourseDetailView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store

    let course: Course

    @State private var showEnrollConfirmation = false
    @State private var showEnrolledAlert = false

    private var liveCourse: Course {
        store.courses.first { $0.id == course.id } ?? course
    }

    private var isLocked: Bool {
        !course.requiresCompletedCourses.isEmpty && !store.hasCompletedACETrack
    }

    var body: some View {
        let colors = theme.colors
        let current = liveCourse

        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                hero(current)

                VStack(alignment: .leading, spacing: Spacing.lg) {
                    overview(current)
                    if isLocked { prerequisiteCard(current) }
                    if !current.learningObjectives.isEmpty { objectives(current) }
                    if !current.sections.isEmpty { curriculum(current) }
                    if !current.features.isEmpty { features(current) }
                    if current.autoDebitOnly { paymentPolicy(current) }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.bottom, 120)
            }
        }
        .scrollIndicators(.hidden)
        .background(colors.background)
        .ignoresSafeArea(edges: .top)
        .safeAreaInset(edge: .bottom) { enrollBar(current) }
        .navigationBarTitleDisplayMode(.inline)
        .alert("Enrolled!", isPresented: $showEnrolledAlert) {
            Button("Start Learning") {}
        } message: {
            Text("You now have access to \(current.title). Your progress will sync across devices.")
        }
        .confirmationDialog(
            enrollPriceLabel(current),
            isPresented: $showEnrollConfirmation,
            titleVisibility: .visible
        ) {
            Button("Confirm Enrollment") {
                Haptics.success()
                store.enroll(in: current.id)
                showEnrolledAlert = true
            }
            Button("Cancel", role: .cancel) {}
        }
    }

    // MARK: - Hero

    private func hero(_ current: Course) -> some View {
        RemoteImage(urlString: current.imageURL, height: 280)
            .overlay {
                LinearGradient(
                    colors: [.black.opacity(0.1), .black.opacity(0.78)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .allowsHitTesting(false)
            }
            .overlay(alignment: .bottomLeading) {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack(spacing: Spacing.sm) {
                        BadgeView(text: current.category, variant: .info, compact: false)
                        BadgeView(text: current.level.rawValue, variant: .warning, compact: false)
                        if current.isBundle {
                            BadgeView(text: "BUNDLE", variant: .success, compact: false)
                        }
                    }

                    Text(current.title)
                        .font(.system(size: 26, weight: .heavy))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.leading)

                    HStack(spacing: Spacing.md) {
                        heroMeta(symbol: "clock.fill", text: current.duration)
                        heroMeta(symbol: "book.fill", text: "\(current.lessons) lessons")
                        if current.enrolled {
                            heroMeta(symbol: "checkmark.seal.fill", text: "Enrolled")
                        }
                    }
                }
                .padding(Spacing.md)
                .padding(.bottom, Spacing.sm)
                .allowsHitTesting(false)
            }
    }

    private func heroMeta(symbol: String, text: String) -> some View {
        HStack(spacing: 5) {
            Image(systemName: symbol).font(.system(size: 11, weight: .semibold))
            Text(text).font(.system(size: 12, weight: .semibold))
        }
        .foregroundStyle(.white.opacity(0.86))
    }

    // MARK: - Sections

    private func overview(_ current: Course) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            if current.enrolled, let progress = current.progress {
                CardView {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        HStack {
                            Text("Your progress")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(theme.colors.text)
                            Spacer()
                            Text("\(progress)% complete")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(theme.colors.secondary)
                        }
                        ProgressBarView(progress: progress, height: 8)
                    }
                }
            }

            SectionHeader(title: "About this course", symbol: "info.circle.fill", symbolTint: theme.colors.info)

            Text(current.fullDescription ?? current.shortDescription)
                .font(.system(size: 15))
                .lineSpacing(4)
                .foregroundStyle(theme.colors.textSecondary)
        }
    }

    private func prerequisiteCard(_ current: Course) -> some View {
        CardView(variant: .outlined) {
            HStack(alignment: .top, spacing: Spacing.md) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(theme.colors.warning)
                    .frame(width: 42, height: 42)
                    .background(theme.colors.warning.opacity(0.14))
                    .clipShape(.circle)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Prerequisites required")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(theme.colors.text)
                    Text("Complete \(current.requiresCompletedCoursesNames.joined(separator: ", ")) to unlock this certification.")
                        .font(.system(size: 13))
                        .foregroundStyle(theme.colors.textSecondary)
                }
            }
        }
    }

    private func objectives(_ current: Course) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "What you'll learn", symbol: "target", symbolTint: theme.colors.secondary)

            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: 150), spacing: Spacing.sm)],
                alignment: .leading,
                spacing: Spacing.sm
            ) {
                ForEach(current.learningObjectives, id: \.self) { objective in
                    HStack(alignment: .top, spacing: 6) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(theme.colors.success)
                            .padding(.top, 2)
                        Text(objective)
                            .font(.system(size: 13))
                            .foregroundStyle(theme.colors.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                        Spacer(minLength: 0)
                    }
                }
            }
        }
    }

    private func curriculum(_ current: Course) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "Curriculum", symbol: "list.bullet.rectangle.fill", symbolTint: theme.colors.primary) {
                Text("\(current.totalSteps) steps")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(theme.colors.textLight)
            }

            VStack(spacing: Spacing.sm) {
                ForEach(Array(current.sections.enumerated()), id: \.element.id) { index, section in
                    // Tapping a module opens its lesson screen, matching the
                    // Expo course-detail push to section-detail.
                    NavigationLink(value: SectionRoute(
                        courseId: current.id,
                        courseTitle: current.title,
                        sectionId: section.id,
                        sectionTitle: section.title
                    )) {
                        CardView(variant: .outlined, padding: Spacing.md) {
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                HStack(spacing: Spacing.md) {
                                    Image(systemName: section.symbol)
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundStyle(theme.colors.primary)
                                        .frame(width: 40, height: 40)
                                        .background(theme.colors.primary.opacity(0.11))
                                        .clipShape(.rect(cornerRadius: Radius.sm))

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Module \(index + 1)")
                                            .font(.system(size: 10, weight: .heavy))
                                            .foregroundStyle(theme.colors.textLight)
                                        Text(section.title)
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(theme.colors.text)
                                            .multilineTextAlignment(.leading)
                                    }

                                    Spacer(minLength: 0)

                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundStyle(theme.colors.textLight)
                                }

                                HStack(spacing: Spacing.md) {
                                    BadgeView(text: "\(section.steps) steps", variant: .info, symbol: "square.stack.3d.up.fill")
                                    if current.enrolled {
                                        BadgeView(text: "\(section.completed)/\(section.steps) done", variant: .success, symbol: "checkmark")
                                    } else {
                                        BadgeView(text: "Locked", variant: .neutral, symbol: "lock.fill")
                                    }
                                }
                            }
                        }
                    }
                    .buttonStyle(PressableButtonStyle())
                }
            }
        }
    }

    private func features(_ current: Course) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "What's included", symbol: "gift.fill", symbolTint: theme.colors.accent)

            CardView {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    ForEach(current.features, id: \.self) { feature in
                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "sparkle")
                                .font(.system(size: 11))
                                .foregroundStyle(theme.colors.accent)
                            Text(feature)
                                .font(.system(size: 13))
                                .foregroundStyle(theme.colors.textSecondary)
                            Spacer(minLength: 0)
                        }
                    }
                }
            }
        }
    }

    private func paymentPolicy(_ current: Course) -> some View {
        CardView(variant: .outlined) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "creditcard.fill")
                        .foregroundStyle(theme.colors.info)
                    Text(current.isLifetime ? "One-time payment" : "Pricing")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(theme.colors.text)
                }

                if current.isLifetime {
                    Text("\(Pricing.format(current.price)) once for lifetime access. No monthly subscription, ever.")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(theme.colors.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                } else {
                    if let cert = current.certificationFee {
                        pricingLine("Certificate fee", Pricing.format(cert))
                    }
                    if let enrollment = current.enrollmentFee {
                        pricingLine("Enrollment fee", Pricing.format(enrollment))
                    }
                    pricingLine("Due today", Pricing.format(current.dueToday), emphasized: true)

                    if let days = current.freeTrialDays {
                        Text("Free for \(days) days — nothing is charged today. During the trial you get the course, your AI agent and your credit report analysis; the full dispute letter library opens when your subscription starts. When the trial ends: \(Pricing.format(current.certificationFee ?? Pricing.certificateFee)) certificate fee, then \(Pricing.format(current.monthlyFee ?? Pricing.monthlySubscription)) per month.")
                            .font(.system(size: 13))
                            .foregroundStyle(theme.colors.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    } else {
                        Text("Then \(Pricing.format(current.monthlyFee ?? Pricing.monthlySubscription)) per month to keep your subscription. There is no free trial for this course.")
                            .font(.system(size: 13))
                            .foregroundStyle(theme.colors.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }

                if let policy = current.autoDebitLockoutPolicy {
                    Text(policy)
                        .font(.system(size: 12))
                        .foregroundStyle(theme.colors.textLight)
                }
            }
        }
    }

    private func pricingLine(_ label: String, _ value: String, emphasized: Bool = false) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 13, weight: emphasized ? .bold : .regular))
                .foregroundStyle(emphasized ? theme.colors.text : theme.colors.textSecondary)
            Spacer(minLength: Spacing.sm)
            Text(value)
                .font(.system(size: 13, weight: emphasized ? .heavy : .semibold))
                .foregroundStyle(emphasized ? theme.colors.text : theme.colors.textSecondary)
                .monospacedDigit()
        }
    }

    // MARK: - Enroll bar

    private func enrollBar(_ current: Course) -> some View {
        HStack(spacing: Spacing.md) {
            VStack(alignment: .leading, spacing: 1) {
                if current.isFree {
                    Text("FREE")
                        .font(.system(size: 22, weight: .heavy))
                        .foregroundStyle(theme.colors.success)
                } else {
                    Text(Pricing.format(current.dueToday))
                        .font(.system(size: 22, weight: .heavy))
                        .foregroundStyle(theme.colors.text)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Text(enrollCaption(current))
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(theme.colors.textLight)
                }
            }

            Spacer(minLength: 0)

            Button {
                Haptics.medium()
                if current.enrolled {
                    let next = min(100, (current.progress ?? 0) + 10)
                    store.setProgress(next, for: current.id)
                } else if isLocked {
                    Haptics.warning()
                } else {
                    showEnrollConfirmation = true
                }
            } label: {
                Text(buttonTitle(current))
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, 14)
                    .background {
                        if isLocked && !current.enrolled {
                            theme.colors.textLight
                        } else {
                            LinearGradient(
                                colors: current.enrolled ? theme.colors.gradientSecondary : theme.colors.gradientPrimary,
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        }
                    }
                    .clipShape(.capsule)
            }
            .buttonStyle(PressableButtonStyle())
            .disabled(isLocked && !current.enrolled)
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.md)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) {
            Rectangle().fill(theme.colors.border).frame(height: 0.5)
        }
    }

    private func buttonTitle(_ current: Course) -> String {
        if current.enrolled { return "Continue" }
        if isLocked { return "Locked" }
        if current.isFree { return "Enroll Free" }
        return "Enroll Now"
    }

    /// Caption under the enroll-bar price, naming what the charge covers.
    private func enrollCaption(_ current: Course) -> String {
        if current.isLifetime { return "one time — lifetime access" }
        if current.freeTrialDays != nil { return "nothing due today" }
        if current.hasEnrollmentFee { return "certificate + enrollment" }
        return "due today"
    }

    private func enrollPriceLabel(_ current: Course) -> String {
        if current.isFree { return "Enroll in \(current.title) for free?" }
        if current.isLifetime {
            return "Buy \(current.title) for \(Pricing.format(current.price))? This is a one-time payment for lifetime access — there is no monthly subscription."
        }
        if let days = current.freeTrialDays {
            return "Start \(current.title) free for \(days) days? Nothing is charged today. When the trial ends it is a \(Pricing.format(current.certificationFee ?? Pricing.certificateFee)) certificate fee, then \(Pricing.format(current.monthlyFee ?? Pricing.monthlySubscription)) per month."
        }
        return "Enroll in \(current.title) for \(Pricing.format(current.dueToday)) today, then \(Pricing.format(current.monthlyFee ?? Pricing.monthlySubscription)) per month? There is no free trial for this course."
    }
}
