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
    @State private var showGame = false

    var body: some View {
        let colors = theme.colors

        ZStack(alignment: .bottom) {
            colors.background.ignoresSafeArea()

            Group {
                switch selection {
                case .home:
                    navigationStack { HomeView(selectedTab: $selection, showGame: $showGame) }
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

            // Full-screen cover for the Credit Life Simulator game module.
            Color.clear
                .fullScreenCover(isPresented: $showGame) {
                    NavigationStack {
                        GameHomeView()
                            .navigationBarTitleDisplayMode(.inline)
                            .toolbar {
                                ToolbarItem(placement: .topBarLeading) {
                                    Button { showGame = false } label: {
                                        HStack(spacing: 4) {
                                            Image(systemName: "chevron.left")
                                            Text("Back")
                                        }
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundStyle(theme.colors.primary)
                                    }
                                }
                            }

                    }
                    .tint(theme.colors.primary)
                }

            AppTabBar(
                selection: $selection,
                badgeCounts: [.home: store.unreadNotificationCount]
            )
            .padding(.bottom, 4)
        }
        .background(colors.background)
    }

    /// Wraps each tab in its own stack with shared brand chrome and destinations.
    private func navigationStack<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        NavigationStack {
            content()
                .safeAreaInset(edge: .bottom) {
                    // Reserve room for the floating tab bar so content clears it.
                    Color.clear.frame(height: AppTabBar.pillHeight + 14)
                }
                .navigationDestination(for: Course.self) { course in
                    CourseDetailView(course: course)
                }
                .navigationDestination(for: SectionRoute.self) { route in
                    SectionDetailView(
                        course: Course(id: route.courseId, title: route.courseTitle, shortDescription: "", duration: "", lessons: 0, price: 0, imageURL: "", category: "", level: .beginner),
                        section: CourseSection(id: route.sectionId, title: route.sectionTitle, steps: 0, symbol: "play.rectangle.fill")
                    )
                }
                .navigationDestination(for: CSOProvider.self) { provider in
                    ProviderDetailView(provider: provider)
                }
                .navigationDestination(for: GameRoute.self) { route in
                    GameRouteView(route: route)
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
