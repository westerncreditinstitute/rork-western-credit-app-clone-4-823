//
//  AdminView.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Admin console. Gated behind a passcode, mirroring the web/native admin panel
/// which requires a login on every visit.
struct AdminView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store

    @State private var isAuthenticated = false

    var body: some View {
        Group {
            if isAuthenticated {
                AdminDashboardView(onSignOut: {
                    withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
                        isAuthenticated = false
                    }
                })
            } else {
                AdminLoginView {
                    store.isAdminUnlocked = true
                    withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
                        isAuthenticated = true
                    }
                }
            }
        }
        .background(theme.colors.background)
    }
}

// MARK: - Login

private struct AdminLoginView: View {
    @Environment(ThemeManager.self) private var theme

    /// Demo passcode for the local admin console.
    private static let passcode = "2468"

    let onSuccess: () -> Void

    @State private var entry = ""
    @State private var errorMessage: String?
    @State private var shake: CGFloat = 0

    var body: some View {
        VStack(spacing: Spacing.lg) {
            Spacer()

            VStack(spacing: Spacing.md) {
                Image(systemName: "lock.shield.fill")
                    .font(.system(size: 34, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 88, height: 88)
                    .background(
                        LinearGradient(
                            colors: theme.colors.gradientHeader,
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .clipShape(.circle)
                    .shadow(color: theme.colors.shadow, radius: 14, y: 6)

                Text("Admin Console")
                    .font(.system(size: 26, weight: .heavy))
                    .foregroundStyle(theme.colors.text)

                Text("Enter the admin passcode to manage course content, videos and promos.")
                    .font(.system(size: 14))
                    .foregroundStyle(theme.colors.textSecondary)
                    .multilineTextAlignment(.center)
            }

            VStack(spacing: Spacing.sm) {
                SecureField("Passcode", text: $entry)
                    .font(.system(size: 18, weight: .semibold))
                    .multilineTextAlignment(.center)
                    .keyboardType(.numberPad)
                    .padding(.vertical, Spacing.md)
                    .background(theme.colors.surface)
                    .clipShape(.rect(cornerRadius: Radius.md))
                    .overlay {
                        RoundedRectangle(cornerRadius: Radius.md)
                            .stroke(errorMessage == nil ? theme.colors.border : theme.colors.error, lineWidth: 1.5)
                    }
                    .offset(x: shake)

                if let errorMessage {
                    Text(errorMessage)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(theme.colors.error)
                }

                Button {
                    authenticate()
                } label: {
                    Text("Unlock")
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

            Text("Session is not persisted — login is required on every visit.")
                .font(.system(size: 11))
                .foregroundStyle(theme.colors.textLight)
                .multilineTextAlignment(.center)

            Spacer()
            Spacer()
        }
        .padding(.horizontal, Spacing.lg)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(theme.colors.background)
    }

    private func authenticate() {
        guard entry == Self.passcode else {
            Haptics.error()
            errorMessage = "Incorrect passcode. Please try again."
            withAnimation(.default) { shake = -10 }
            withAnimation(.spring(response: 0.28, dampingFraction: 0.35).delay(0.05)) { shake = 0 }
            entry = ""
            return
        }
        Haptics.success()
        errorMessage = nil
        onSuccess()
    }
}

// MARK: - Dashboard

private struct AdminDashboardView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store

    let onSignOut: () -> Void

    @State private var mode: ManagementMode = .videos
    @State private var selectedCourseId = "3"
    @State private var sandboxMode = true

    private enum ManagementMode: String, CaseIterable, Identifiable {
        case videos
        case documents
        case promos
        case students

        var id: String { rawValue }

        var label: String {
            switch self {
            case .videos: return "Videos"
            case .documents: return "Docs"
            case .promos: return "Promos"
            case .students: return "Students"
            }
        }

        var symbol: String {
            switch self {
            case .videos: return "play.rectangle.fill"
            case .documents: return "doc.text.fill"
            case .promos: return "megaphone.fill"
            case .students: return "person.3.fill"
            }
        }
    }

    private var selectedCourse: Course? {
        store.courses.first { $0.id == selectedCourseId }
    }

    var body: some View {
        VStack(spacing: 0) {
            ScreenHeader(
                title: "Admin",
                subtitle: sandboxMode ? "Sandbox mode" : "Live mode",
                trailingSymbol: "rectangle.portrait.and.arrow.right",
                trailingAction: onSignOut
            )

            ScrollView {
                VStack(spacing: Spacing.lg) {
                    statsGrid
                    sandboxToggle
                    modePicker
                    coursePicker
                    contentSection
                }
                .padding(.horizontal, Spacing.md)
                .padding(.top, Spacing.md)
                .padding(.bottom, Spacing.xl)
            }
            .scrollIndicators(.hidden)
            .background(theme.colors.background)
        }
    }

    private var statsGrid: some View {
        LazyVGrid(columns: Array(repeating: GridItem(spacing: Spacing.sm), count: 2), spacing: Spacing.sm) {
            ForEach(MockData.adminStats) { stat in
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack {
                        Image(systemName: stat.symbol)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(theme.colors.primary)
                            .frame(width: 34, height: 34)
                            .background(theme.colors.primary.opacity(0.12))
                            .clipShape(.rect(cornerRadius: Radius.sm))

                        Spacer()

                        HStack(spacing: 2) {
                            Image(systemName: stat.trendUp ? "arrow.up.right" : "arrow.down.right")
                                .font(.system(size: 9, weight: .bold))
                            Text(stat.change)
                                .font(.system(size: 11, weight: .bold))
                        }
                        .foregroundStyle(stat.trendUp ? theme.colors.success : theme.colors.error)
                    }

                    Text(stat.value)
                        .font(.system(size: 20, weight: .heavy))
                        .foregroundStyle(theme.colors.text)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)

                    Text(stat.label)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(theme.colors.textLight)
                }
                .padding(Spacing.md)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(theme.colors.surface)
                .clipShape(.rect(cornerRadius: Radius.lg))
                .shadow(color: theme.colors.shadow, radius: 8, y: 3)
            }
        }
    }

    private var sandboxToggle: some View {
        CardView {
            Toggle(isOn: $sandboxMode) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Sandbox mode")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(theme.colors.text)
                    Text("Changes are previewed locally and never published.")
                        .font(.system(size: 12))
                        .foregroundStyle(theme.colors.textSecondary)
                }
            }
            .tint(theme.colors.secondary)
        }
    }

    private var modePicker: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "Manage", symbol: "square.grid.2x2.fill", symbolTint: theme.colors.primary)

            HStack(spacing: Spacing.sm) {
                ForEach(ManagementMode.allCases) { option in
                    Button {
                        Haptics.selection()
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.82)) { mode = option }
                    } label: {
                        VStack(spacing: 6) {
                            Image(systemName: option.symbol)
                                .font(.system(size: 16, weight: .semibold))
                            Text(option.label)
                                .font(.system(size: 11, weight: .semibold))
                        }
                        .foregroundStyle(mode == option ? theme.colors.textInverse : theme.colors.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                        .background(mode == option ? theme.colors.primary : theme.colors.surfaceAlt)
                        .clipShape(.rect(cornerRadius: Radius.md))
                    }
                    .buttonStyle(PressableButtonStyle())
                }
            }
        }
    }

    private var coursePicker: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "Course", symbol: "book.fill", symbolTint: theme.colors.secondary)

            ScrollView(.horizontal) {
                HStack(spacing: Spacing.sm) {
                    ForEach(store.courses) { course in
                        Button {
                            Haptics.selection()
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.82)) {
                                selectedCourseId = course.id
                            }
                        } label: {
                            Text(course.title)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(selectedCourseId == course.id ? theme.colors.textInverse : theme.colors.textSecondary)
                                .lineLimit(1)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 9)
                                .background(selectedCourseId == course.id ? theme.colors.secondary : theme.colors.surfaceAlt)
                                .clipShape(.capsule)
                        }
                        .buttonStyle(PressableButtonStyle())
                    }
                }
            }
            .scrollIndicators(.hidden)
            .scrollClipDisabled()
        }
    }

    @ViewBuilder
    private var contentSection: some View {
        switch mode {
        case .videos, .documents:
            sectionList
        case .promos:
            promoList
        case .students:
            studentList
        }
    }

    private var sectionList: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(
                title: mode == .videos ? "Video slots" : "Document slots",
                symbol: mode.symbol,
                symbolTint: theme.colors.info
            ) {
                Text("\(selectedCourse?.sections.count ?? 0) sections")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(theme.colors.textLight)
            }

            if let sections = selectedCourse?.sections, !sections.isEmpty {
                VStack(spacing: Spacing.sm) {
                    ForEach(Array(sections.enumerated()), id: \.element.id) { index, section in
                        CardView(padding: Spacing.md) {
                            HStack(spacing: Spacing.md) {
                                Image(systemName: section.symbol)
                                    .font(.system(size: 14, weight: .semibold))
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
                                        .lineLimit(2)
                                }

                                Spacer(minLength: 0)

                                BadgeView(text: "\(section.steps)", variant: .info)
                            }
                        }
                    }
                }
            } else {
                EmptyStateView(
                    symbol: "tray",
                    title: "No sections",
                    message: "This course has no modules configured yet."
                )
            }
        }
    }

    private var promoList: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "Featured videos", symbol: "megaphone.fill", symbolTint: theme.colors.warning)

            VStack(spacing: Spacing.sm) {
                ForEach(MockData.featuredVideos) { video in
                    CardView(padding: Spacing.sm) {
                        HStack(spacing: Spacing.md) {
                            RemoteImage(urlString: video.thumbnailURL, height: 54, cornerRadius: Radius.sm)
                                .frame(width: 92)

                            VStack(alignment: .leading, spacing: 3) {
                                Text(video.title)
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(theme.colors.text)
                                    .lineLimit(2)
                                Text(video.duration)
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundStyle(theme.colors.textLight)
                            }

                            Spacer(minLength: 0)

                            BadgeView(text: "Active", variant: .success, symbol: "checkmark")
                        }
                    }
                }
            }
        }
    }

    private var studentList: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "Recent activity", symbol: "person.3.fill", symbolTint: theme.colors.accent)

            VStack(spacing: Spacing.sm) {
                ForEach(store.transactions.prefix(5)) { transaction in
                    CardView(padding: Spacing.md) {
                        HStack(spacing: Spacing.md) {
                            Image(systemName: transaction.type.symbol)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(theme.colors.accent)
                                .frame(width: 40, height: 40)
                                .background(theme.colors.accent.opacity(0.12))
                                .clipShape(.circle)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(transaction.detail)
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(theme.colors.text)
                                    .lineLimit(2)
                                Text(Format.mediumDate(transaction.createdAt))
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundStyle(theme.colors.textLight)
                            }

                            Spacer(minLength: 0)
                        }
                    }
                }
            }
        }
    }
}
