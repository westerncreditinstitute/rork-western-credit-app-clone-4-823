//
//  HomeView.swift
//  WesternCreditInstitute
//

import SwiftUI

struct HomeView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store

    @Binding var selectedTab: AppTab
    @Binding var showGame: Bool

    @State private var selectedVideoIndex: Int = 0
    @State private var showNotifications = false
    @State private var showPlans = false
    @State private var appeared = false
    @State private var playingVideo: FeaturedVideo?
    @State private var expandedTip: CreditTip?

    private var quickActions: [QuickAction] {
        let colors = theme.colors
        if store.isFree {
            return [
                QuickAction(id: "1", title: "Upgrade", symbol: "crown.fill", color: colors.warning, locked: false, destination: .plans),
                QuickAction(id: "2", title: "Credit Tips", symbol: "lightbulb.fill", color: colors.info, locked: false, destination: .tips),
                QuickAction(id: "3", title: "Courses", symbol: "book.fill", color: colors.primary, locked: true, destination: .tab(.courses)),
                QuickAction(id: "4", title: "Support", symbol: "message.fill", color: colors.secondary, locked: false, destination: .tab(.profile)),
            ]
        }
        return [
            QuickAction(id: "1", title: "My Courses", symbol: "book.fill", color: colors.primary, locked: false, destination: .tab(.courses)),
            QuickAction(id: "2", title: "Wallet", symbol: "wallet.pass.fill", color: colors.secondary, locked: false, destination: .tab(.wallet)),
            QuickAction(id: "3", title: "Refer & Earn", symbol: "person.2.fill", color: colors.info, locked: false, destination: .tab(.earnings)),
            QuickAction(id: "4", title: "Support", symbol: "message.fill", color: colors.accent, locked: false, destination: .tab(.profile)),
        ]
    }

    var body: some View {
        let colors = theme.colors

        ScrollView {
            VStack(spacing: Spacing.lg) {
                header
                gameLauncherCard
                quickActionGrid
                featuredSection
                if !store.enrolledCourses.isEmpty { continueLearningSection }
                tipOfTheWeekSection
                recentTipsSection
                if store.isFree { upgradeBanner }
            }
            .padding(.bottom, Spacing.xl)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .ignoresSafeArea(edges: .top)
        .sheet(isPresented: $showNotifications) { NotificationsView() }
        .sheet(isPresented: $showPlans) { SubscriptionPlansView() }
        .sheet(item: $playingVideo) { video in
            YouTubeSheet(video: video)
        }
        .sheet(item: $expandedTip) { tip in
            CreditTipDetailView(tip: tip)
        }
        .task {
            guard !appeared else { return }
            withAnimation(.spring(response: 0.7, dampingFraction: 0.82)) { appeared = true }
        }
    }

    // MARK: - Header

    private var header: some View {
        ZStack(alignment: .top) {
            LinearGradient(
                colors: theme.colors.gradientHeader,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .overlay {
                // Soft decorative light blooms for depth.
                GeometryReader { geo in
                    ZStack {
                        Circle()
                            .fill(Color.white.opacity(0.055))
                            .frame(width: 220, height: 220)
                            .offset(x: geo.size.width * 0.62, y: -70)
                        Circle()
                            .fill(Color(hex: "#10B981").opacity(0.10))
                            .frame(width: 170, height: 170)
                            .offset(x: -60, y: geo.size.height * 0.45)
                        Circle()
                            .fill(Color.white.opacity(0.035))
                            .frame(width: 120, height: 120)
                            .offset(x: geo.size.width * 0.3, y: geo.size.height * 0.7)
                    }
                }
                .allowsHitTesting(false)
            }
            .clipShape(.rect(bottomLeadingRadius: Radius.xxl, bottomTrailingRadius: Radius.xxl))

            VStack(spacing: Spacing.md) {
                brandingRow
                welcomeRow
                if store.isPremium { statsRow }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.top, 56)
            .padding(.bottom, Spacing.lg)
        }
        .fixedSize(horizontal: false, vertical: true)
    }

    private var brandingRow: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "graduationcap.fill")
                .font(.system(size: 19, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 40, height: 40)
                .background(Color.white.opacity(0.16))
                .clipShape(.rect(cornerRadius: Radius.md))

            VStack(alignment: .leading, spacing: 1) {
                Text("Western Credit Institute")
                    .font(.system(size: 16, weight: .heavy))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
                Text("Advanced Credit Education")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Color.white.opacity(0.7))
            }

            Spacer(minLength: Spacing.sm)

            Button {
                Haptics.light()
                showNotifications = true
            } label: {
                Image(systemName: "bell.fill")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(Color.white.opacity(0.14))
                    .clipShape(.circle)
                    .overlay(alignment: .topTrailing) {
                        if store.unreadNotificationCount > 0 {
                            Text("\(store.unreadNotificationCount)")
                                .font(.system(size: 10, weight: .heavy))
                                .foregroundStyle(.white)
                                .frame(width: 18, height: 18)
                                .background(Color(hex: "#EF4444"))
                                .clipShape(.circle)
                                .overlay { Circle().stroke(Color(hex: "#001F42"), lineWidth: 1.5) }
                                .offset(x: 3, y: -3)
                        }
                    }
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Notifications")
        }
        .opacity(appeared ? 1 : 0)
        .scaleEffect(appeared ? 1 : 0.94)
    }

    private var welcomeRow: some View {
        HStack(spacing: Spacing.md) {
            AvatarView(
                urlString: store.user.avatarURL,
                initials: store.user.initials,
                size: 58,
                borderColor: Color.white.opacity(0.25)
            )

            VStack(alignment: .leading, spacing: 2) {
                Text("Welcome back,")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color.white.opacity(0.72))
                Text(store.user.firstName)
                    .font(.system(size: 26, weight: .heavy))
                    .foregroundStyle(.white)
            }

            Spacer(minLength: Spacing.sm)

            if store.isFree {
                Button {
                    Haptics.light()
                    showPlans = true
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "crown.fill").font(.system(size: 11, weight: .bold))
                        Text("Upgrade").font(.system(size: 13, weight: .bold))
                    }
                    .foregroundStyle(Color(hex: "#001F42"))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color(hex: "#FBBF24"))
                    .clipShape(.capsule)
                }
                .buttonStyle(.plain)
            } else {
                BadgeView(text: store.tier.label, variant: .success, symbol: "checkmark.seal.fill")
                    .background(Color.white.opacity(0.12), in: .capsule)
            }
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 22)
    }

    private var statsRow: some View {
        HStack(spacing: 0) {
            statItem(symbol: "rosette", tint: Color(hex: "#10B981"), value: "\(store.user.coursesCompleted)", label: "Completed")
            divider
            statItem(symbol: "chart.line.uptrend.xyaxis", tint: Color(hex: "#10B981"), value: Format.compactCurrency(store.user.totalEarnings), label: "Earnings")
            divider
            statItem(symbol: "person.2.fill", tint: Color(hex: "#60A5FA"), value: "\(store.user.referrals)", label: "Referrals")
        }
        .padding(.vertical, Spacing.md)
        .padding(.horizontal, Spacing.sm)
        .background(Color.white.opacity(0.09))
        .clipShape(.rect(cornerRadius: Radius.lg))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.lg)
                .stroke(Color.white.opacity(0.12), lineWidth: 1)
        }
        .opacity(appeared ? 1 : 0)
    }

    private var divider: some View {
        Rectangle()
            .fill(Color.white.opacity(0.14))
            .frame(width: 1, height: 34)
    }

    private func statItem(symbol: String, tint: Color, value: String, label: String) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: symbol)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(tint)
                .frame(width: 30, height: 30)
                .background(Color.white.opacity(0.12))
                .clipShape(.circle)

            VStack(alignment: .leading, spacing: 0) {
                Text(value)
                    .font(.system(size: 15, weight: .heavy))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Text(label)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(Color.white.opacity(0.6))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Game launcher

    private var gameLauncherCard: some View {
        Button {
            Haptics.medium()
            showGame = true
        } label: {
            HStack(spacing: Spacing.md) {
                Image(systemName: "gamecontroller.fill")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 52, height: 52)
                    .background(Color.white.opacity(0.2))
                    .clipShape(.rect(cornerRadius: Radius.md))

                VStack(alignment: .leading, spacing: 3) {
                    Text("Credit Life Simulator")
                        .font(.system(size: 17, weight: .heavy))
                        .foregroundStyle(.white)
                    Text("Play the game • Build credit • Earn MUSO tokens")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.white.opacity(0.75))
                }

                Spacer(minLength: 0)

                Image(systemName: "play.fill")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(Color(hex: "#001F42"))
                    .frame(width: 36, height: 36)
                    .background(.white)
                    .clipShape(.circle)
            }
            .padding(Spacing.md)
            .background(
                LinearGradient(
                    colors: [Color(hex: "#002B5C"), Color(hex: "#10B981")],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .clipShape(.rect(cornerRadius: Radius.lg))
            .shadow(color: Color(hex: "#002B5C").opacity(0.3), radius: 12, y: 5)
        }
        .buttonStyle(PressableButtonStyle())
        .padding(.horizontal, Spacing.md)
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 20)
    }

    // MARK: - Quick actions

    private var quickActionGrid: some View {
        LazyVGrid(columns: Array(repeating: GridItem(spacing: Spacing.sm), count: 4), spacing: Spacing.sm) {
            ForEach(Array(quickActions.enumerated()), id: \.element.id) { index, action in
                Button {
                    Haptics.light()
                    switch action.destination {
                    case .plans:
                        showPlans = true
                    case .tips:
                        expandedTip = MockData.tipOfTheWeek
                    case .tab(let tab):
                        if action.locked { showPlans = true } else { selectedTab = tab }
                    }
                } label: {
                    VStack(spacing: Spacing.sm) {
                        Image(systemName: action.locked ? "lock.fill" : action.symbol)
                            .font(.system(size: 19, weight: .semibold))
                            .foregroundStyle(action.locked ? theme.colors.textLight : action.color)
                            .frame(width: 46, height: 46)
                            .background((action.locked ? theme.colors.textLight : action.color).opacity(0.13))
                            .clipShape(.rect(cornerRadius: Radius.md))

                        Text(action.locked ? "Upgrade" : action.title)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(action.locked ? theme.colors.textLight : theme.colors.text)
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                    .background(theme.colors.surface)
                    .clipShape(.rect(cornerRadius: Radius.lg))
                    .shadow(color: theme.colors.shadow, radius: 8, y: 3)
                }
                .buttonStyle(PressableButtonStyle())
                .opacity(appeared ? 1 : 0)
                .offset(y: appeared ? 0 : CGFloat(14 + index * 4))
            }
        }
        .padding(.horizontal, Spacing.md)
    }

    // MARK: - Featured

    private var featuredSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "Featured Offers", symbol: "sparkles") {
                BadgeView(text: "NEW", variant: .success)
            }

            let selected = MockData.featuredVideos[min(selectedVideoIndex, MockData.featuredVideos.count - 1)]

            Button {
                Haptics.light()
                playingVideo = selected
            } label: {
                RemoteImage(urlString: "https://img.youtube.com/vi/\(selected.youtubeId)/maxresdefault.jpg", height: 200, cornerRadius: Radius.lg)
                    .overlay {
                        LinearGradient(
                            colors: [.clear, .black.opacity(0.55)],
                            startPoint: .center,
                            endPoint: .bottom
                        )
                        .clipShape(.rect(cornerRadius: Radius.lg))
                        .allowsHitTesting(false)
                    }
                    .overlay {
                        Image(systemName: "play.fill")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(Color(hex: "#001F42"))
                            .frame(width: 62, height: 62)
                            .background(.white.opacity(0.94))
                            .clipShape(.circle)
                            .shadow(radius: 12, y: 4)
                            .allowsHitTesting(false)
                    }
                    .overlay(alignment: .bottomLeading) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(selected.title)
                                .font(.system(size: 15, weight: .bold))
                                .foregroundStyle(.white)
                                .lineLimit(2)
                                .multilineTextAlignment(.leading)
                            Text(selected.duration)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(.white.opacity(0.8))
                        }
                        .padding(Spacing.md)
                        .allowsHitTesting(false)
                    }
            }
            .buttonStyle(PressableButtonStyle())
            .padding(.horizontal, Spacing.md)

            ScrollView(.horizontal) {
                HStack(spacing: Spacing.sm) {
                    ForEach(Array(MockData.featuredVideos.enumerated()), id: \.element.id) { index, video in
                        Button {
                            Haptics.light()
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                selectedVideoIndex = index
                            }
                        } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                RemoteImage(urlString: video.thumbnailURL, height: 68, cornerRadius: Radius.sm)
                                    .frame(width: 120)
                                    .overlay(alignment: .bottomTrailing) {
                                        Text(video.duration)
                                            .font(.system(size: 9, weight: .bold))
                                            .foregroundStyle(.white)
                                            .padding(.horizontal, 5)
                                            .padding(.vertical, 2)
                                            .background(.black.opacity(0.72))
                                            .clipShape(.rect(cornerRadius: 4))
                                            .padding(4)
                                    }
                                    .overlay(alignment: .topLeading) {
                                        if selectedVideoIndex == index {
                                            HStack(spacing: 3) {
                                                Circle().fill(Color(hex: "#10B981")).frame(width: 5, height: 5)
                                                Text("Playing").font(.system(size: 8, weight: .heavy))
                                            }
                                            .foregroundStyle(.white)
                                            .padding(.horizontal, 5)
                                            .padding(.vertical, 3)
                                            .background(.black.opacity(0.7))
                                            .clipShape(.capsule)
                                            .padding(4)
                                        }
                                    }

                                Text(video.title)
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(selectedVideoIndex == index ? theme.colors.primary : theme.colors.textSecondary)
                                    .lineLimit(2)
                                    .multilineTextAlignment(.leading)
                                    .frame(width: 120, alignment: .leading)
                            }
                            .padding(6)
                            .background(selectedVideoIndex == index ? theme.colors.primary.opacity(0.08) : .clear)
                            .clipShape(.rect(cornerRadius: Radius.md))
                        }
                        .buttonStyle(PressableButtonStyle())
                    }
                }
            }
            .scrollIndicators(.hidden)
            .contentMargins(.horizontal, Spacing.md, for: .scrollContent)
        }
    }

    // MARK: - Continue learning

    private var continueLearningSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "Continue Learning", symbol: "play.circle.fill", symbolTint: theme.colors.primary) {
                Button("See all") {
                    Haptics.light()
                    selectedTab = .courses
                }
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(theme.colors.primary)
            }
            .padding(.horizontal, Spacing.md)

            VStack(spacing: Spacing.sm) {
                ForEach(store.enrolledCourses) { course in
                    NavigationLink(value: course) {
                        CardView(padding: Spacing.md) {
                            HStack(spacing: Spacing.md) {
                                RemoteImage(urlString: course.imageURL, height: 62, cornerRadius: Radius.md)
                                    .frame(width: 62)

                                VStack(alignment: .leading, spacing: 6) {
                                    Text(course.title)
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundStyle(theme.colors.text)
                                        .lineLimit(2)
                                        .multilineTextAlignment(.leading)
                                    ProgressBarView(progress: course.progress ?? 0, showLabel: true)
                                }

                                Image(systemName: "chevron.right")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundStyle(theme.colors.textLight)
                            }
                        }
                    }
                    .buttonStyle(PressableButtonStyle())
                }
            }
            .padding(.horizontal, Spacing.md)
        }
    }

    // MARK: - Tips

    private var tipOfTheWeekSection: some View {
        let tip = MockData.tipOfTheWeek
        return VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "Tip of the Week", symbol: "lightbulb.fill", symbolTint: theme.colors.warning)
                .padding(.horizontal, Spacing.md)

            Button {
                Haptics.light()
                expandedTip = tip
            } label: {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack {
                        BadgeView(text: tip.category.label.uppercased(), variant: .warning, symbol: tip.category.symbol)
                        Spacer()
                        Text(Format.shortDate(tip.publishDate))
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(.white.opacity(0.65))
                    }

                    Text(tip.title)
                        .font(.system(size: 18, weight: .heavy))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.leading)

                    Text(tip.content)
                        .font(.system(size: 13))
                        .foregroundStyle(.white.opacity(0.82))
                        .lineLimit(3)
                        .multilineTextAlignment(.leading)

                    HStack(spacing: 5) {
                        Text("Read more").font(.system(size: 13, weight: .bold))
                        Image(systemName: "arrow.right").font(.system(size: 11, weight: .bold))
                    }
                    .foregroundStyle(Color(hex: "#6EE7B7"))
                    .padding(.top, 2)
                }
                .padding(Spacing.md)
                .frame(maxWidth: .infinity, alignment: .leading)
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
            .buttonStyle(PressableButtonStyle())
            .padding(.horizontal, Spacing.md)
        }
    }

    private var recentTipsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "Credit Insights", symbol: "newspaper.fill", symbolTint: theme.colors.info)
                .padding(.horizontal, Spacing.md)

            VStack(spacing: Spacing.sm) {
                ForEach(MockData.recentTips) { tip in
                    Button {
                        Haptics.light()
                        expandedTip = tip
                    } label: {
                        CardView(padding: Spacing.md) {
                            HStack(spacing: Spacing.md) {
                                Image(systemName: tip.category.symbol)
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundStyle(categoryColor(tip.category))
                                    .frame(width: 44, height: 44)
                                    .background(categoryColor(tip.category).opacity(0.13))
                                    .clipShape(.rect(cornerRadius: Radius.md))

                                VStack(alignment: .leading, spacing: 3) {
                                    Text(tip.title)
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundStyle(theme.colors.text)
                                        .lineLimit(2)
                                        .multilineTextAlignment(.leading)
                                    Text(tip.category.label.capitalized)
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundStyle(categoryColor(tip.category))
                                }

                                Spacer(minLength: 0)

                                Image(systemName: "chevron.right")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundStyle(theme.colors.textLight)
                            }
                        }
                    }
                    .buttonStyle(PressableButtonStyle())
                }
            }
            .padding(.horizontal, Spacing.md)
        }
    }

    private var upgradeBanner: some View {
        Button {
            Haptics.medium()
            showPlans = true
        } label: {
            HStack(spacing: Spacing.md) {
                Image(systemName: "crown.fill")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(Color(hex: "#78350F"))
                    .frame(width: 48, height: 48)
                    .background(Color.white.opacity(0.35))
                    .clipShape(.circle)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Unlock every ACE course")
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundStyle(Color(hex: "#78350F"))
                    Text("Plans from $25/mo — cancel anytime")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color(hex: "#78350F").opacity(0.75))
                }

                Spacer(minLength: 0)

                Image(systemName: "arrow.right")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Color(hex: "#78350F"))
            }
            .padding(Spacing.md)
            .background(
                LinearGradient(
                    colors: [Color(hex: "#FBBF24"), Color(hex: "#F59E0B")],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .clipShape(.rect(cornerRadius: Radius.lg))
        }
        .buttonStyle(PressableButtonStyle())
        .padding(.horizontal, Spacing.md)
    }

    private func categoryColor(_ category: TipCategory) -> Color {
        let colors = theme.colors
        switch category {
        case .repair: return colors.error
        case .building: return colors.success
        case .management: return colors.info
        case .legal: return colors.warning
        case .business: return colors.secondary
        case .identity: return Color(hex: "#E67E22")
        }
    }
}

// MARK: - Supporting types

private nonisolated struct QuickAction: Identifiable, Sendable {
    enum Destination: Sendable {
        case tab(AppTab)
        case plans
        case tips
    }

    let id: String
    let title: String
    let symbol: String
    let color: Color
    let locked: Bool
    let destination: Destination
}

/// Scale-on-press feedback used across tappable cards.
struct PressableButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.965 : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
            .animation(.spring(response: 0.28, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

extension View {
    /// `sheet(item:)` convenience for optional bindings of identifiable values.
    func sheet<Item: Identifiable, SheetContent: View>(
        item: Binding<Item?>,
        @ViewBuilder content: @escaping (Item) -> SheetContent
    ) -> some View {
        sheet(isPresented: Binding(
            get: { item.wrappedValue != nil },
            set: { if !$0 { item.wrappedValue = nil } }
        )) {
            if let value = item.wrappedValue {
                content(value)
            }
        }
    }
}
