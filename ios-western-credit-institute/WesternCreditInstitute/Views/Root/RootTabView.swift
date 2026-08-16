//
//  RootTabView.swift
//  WesternCreditInstitute
//

import SwiftUI

/// App shell: seven destinations with a custom blurred tab bar so every
/// tab stays visible, matching the cross-platform navigation design.
struct RootTabView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store

    @State private var selection: AppTab = .home

    var body: some View {
        let colors = theme.colors

        ZStack(alignment: .bottom) {
            colors.background.ignoresSafeArea()

            Group {
                switch selection {
                case .home:
                    navigationStack { HomeView(selectedTab: $selection) }
                case .courses:
                    navigationStack { CoursesView() }
                case .wallet:
                    navigationStack { WalletView() }
                case .earnings:
                    navigationStack { EarningsView() }
                case .hirePro:
                    navigationStack { HireProView() }
                case .profile:
                    navigationStack { ProfileView(selectedTab: $selection) }
                case .admin:
                    navigationStack { AdminView() }
                }
            }
            .transition(.opacity)

            AppTabBar(
                selection: $selection,
                badgeCounts: [.home: store.unreadNotificationCount]
            )
        }
        .background(colors.background)
    }

    /// Wraps each tab in its own stack with shared brand chrome and destinations.
    private func navigationStack<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        NavigationStack {
            content()
                .safeAreaInset(edge: .bottom) {
                    // Reserve room for the custom tab bar.
                    Color.clear.frame(height: 58)
                }
                .navigationDestination(for: Course.self) { course in
                    CourseDetailView(course: course)
                }
                .navigationDestination(for: CSOProvider.self) { provider in
                    ProviderDetailView(provider: provider)
                }
                .toolbar {
                    ToolbarItem(placement: .principal) {
                        BrandLogo()
                    }
                }
                .toolbarBackground(theme.colors.surface, for: .navigationBar)
                .toolbarBackground(.visible, for: .navigationBar)
        }
        .tint(theme.colors.primary)
    }
}
