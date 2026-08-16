//
//  GameHomeView.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Credit Life Simulator dashboard — the landing screen for the game module.
struct GameHomeView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game

    @State private var showGuide = true
    @State private var guideExpanded = true
    @State private var showReport = false
    @State private var showEvent = false
    @State private var showResetAlert = false
    @State private var currentReport: MonthlyReport?
    @State private var currentEvent: RandomEvent?
    @State private var navigateTo: GameRoute?

    private let monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    private let guideSteps: [(symbol: String, title: String, description: String, color: Color)] = [
        ("briefcase.fill", "Get a Job", "Start your career to earn monthly income. Higher-paying jobs require better credit scores.", Color(hex: "#3B82F6")),
        ("graduationcap.fill", "Get Educated", "Enroll in college to unlock higher-paying careers. Apply for financial aid to reduce costs.", Color(hex: "#10B981")),
        ("creditcard.fill", "Build Credit", "Apply for credit cards and loans. Make payments on time to build your score.", Color(hex: "#8B5CF6")),
        ("piggybank.fill", "Manage Budget", "Track expenses and save money. Keep credit utilization below 30% for best results.", Color(hex: "#6366F1")),
        ("target", "Reach Goals", "Buy a car, own a home, and achieve an 850 credit score to win the game!", Color(hex: "#F59E0B")),
    ]

    private let quickTips: [(symbol: String, text: String, color: Color)] = [
        ("checkmark.circle.fill", "Pay all bills on time — Payment history is 35% of your score", Color(hex: "#10B981")),
        ("chart.line.downtrend.xyaxis", "Keep credit utilization under 30% of your limit", Color(hex: "#3B82F6")),
        ("graduationcap.fill", "Education unlocks higher-paying jobs — invest in your future!", Color(hex: "#10B981")),
        ("wallet.pass.fill", "Build an emergency fund for unexpected expenses", Color(hex: "#8B5CF6")),
        ("star.fill", "Unlock achievements for bonus rewards!", Color(hex: "#F59E0B")),
    ]

    private let quickActions: [(id: String, symbol: String, label: String, route: GameRoute, color: Color)] = [
        ("profile", "person.fill", "My Profile", .profile, Color(hex: "#EC4899")),
        ("education", "graduationcap.fill", "Education", .education, Color(hex: "#10B981")),
        ("community", "person.3.fill", "Community", .community, Color(hex: "#06B6D4")),
        ("token-wallet", "coins.fill", "MUSO Tokens", .tokenWallet, Color(hex: "#8B5CF6")),
        ("marketplace", "bag.fill", "Marketplace", .marketplace, Color(hex: "#F59E0B")),
        ("real-estate", "building.2.fill", "Real Estate", .realEstate, Color(hex: "#0EA5E9")),
        ("career", "briefcase.fill", "Career", .career, Color(hex: "#3B82F6")),
        ("bank", "creditcard.fill", "Bank", .bank, Color(hex: "#10B981")),
        ("budget", "piggybank.fill", "Budget", .budget, Color(hex: "#6366F1")),
        ("leaderboard", "crown.fill", "Leaderboard", .leaderboard, Color(hex: "#FFD700")),
        ("achievements", "trophy.fill", "Achievements", .achievements, Color(hex: "#8B5CF6")),
        ("run-simulator", "cpu.fill", "Run Simulator", .runSimulator, Color(hex: "#2563EB")),
        ("incidents", "exclamationmark.triangle.fill", "Incidents", .incidents, Color(hex: "#DC2626")),
        ("scavenger-hunt", "compass.fill", "Treasure Hunt", .scavengerHunt, Color(hex: "#D946EF")),
        ("city3d", "building.2.fill", "3D LA City", .city3d, Color(hex: "#FFD700")),
        ("avatar", "person.crop.circle.badge.fill", "Avatar", .avatarCustomization, Color(hex: "#EC4899")),
        ("investment-pools", "chart.bar.fill", "Investment Pools", .investmentPools, Color(hex: "#14B8A6")),
    ]

    var body: some View {
        let colors = theme.colors
        let tier = CreditTier.getTier(score: game.creditScores.composite)

        ScrollView {
            VStack(spacing: Spacing.md) {
                if showGuide && !game.guideDismissed { guideCard }
                if game.guideDismissed && !showGuide { guideButtonsRow }

                dateBar
                creditScoreCard(tier: tier)
                statsGrid
                quickActionsSection
                financialSummary
                advanceMonthButton
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Credit Life Simulator")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showResetAlert = true } label: {
                    Image(systemName: "arrow.counterclockwise")
                        .foregroundStyle(colors.primary)
                }
            }
        }
        .alert("Reset Game", isPresented: $showResetAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Reset", role: .destructive) {
                game.resetGame()
                Haptics.success()
            }
        } message: {
            Text("Are you sure you want to start over? All progress will be lost.")
        }
        .sheet(isPresented: $showReport) {
            if let report = currentReport { MonthlyReportSheet(report: report) }
        }
        .sheet(isPresented: $showEvent) {
            if let event = currentEvent { RandomEventSheet(event: event) }
        }
        .navigationDestination(item: $navigateTo) { route in
            GameRouteView(route: route)
        }
    }

    // MARK: - Guide

    private var guideCard: some View {
        VStack(spacing: 0) {
            HStack {
                Image(systemName: "rocket.fill")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(Color.white.opacity(0.2))
                    .clipShape(.rect(cornerRadius: Radius.md))

                VStack(alignment: .leading, spacing: 2) {
                    Text("Getting Started").font(.system(size: 20, weight: .heavy)).foregroundStyle(.white)
                    Text("Learn how to play Credit Life Simulator").font(.system(size: 13)).foregroundStyle(.white.opacity(0.8))
                }
                Spacer()
                Button {
                    Haptics.light()
                    withAnimation { guideExpanded.toggle() }
                } label: {
                    Image(systemName: guideExpanded ? "chevron.up" : "chevron.down")
                        .foregroundStyle(.white)
                        .frame(width: 32, height: 32)
                        .background(Color.white.opacity(0.2))
                        .clipShape(.circle)
                }
                .buttonStyle(.plain)
                Button {
                    Haptics.light()
                    UserDefaults.standard.set(true, forKey: "wci.game.guideDismissed")
                    withAnimation { showGuide = false }
                } label: {
                    Image(systemName: "xmark")
                        .foregroundStyle(.white)
                        .frame(width: 32, height: 32)
                        .background(Color.white.opacity(0.2))
                        .clipShape(.circle)
                }
                .buttonStyle(.plain)
            }
            .padding(Spacing.md)

            if guideExpanded {
                VStack(spacing: Spacing.md) {
                    ForEach(Array(guideSteps.enumerated()), id: \.offset) { index, step in
                        HStack(alignment: .top, spacing: Spacing.md) {
                            Image(systemName: step.symbol)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(.white)
                                .frame(width: 36, height: 36)
                                .background(step.color)
                                .clipShape(.rect(cornerRadius: Radius.md))

                            VStack(alignment: .leading, spacing: 2) {
                                Text(step.title).font(.system(size: 15, weight: .bold)).foregroundStyle(.white)
                                Text(step.description).font(.system(size: 13)).foregroundStyle(.white.opacity(0.85))
                            }
                        }
                    }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.bottom, Spacing.md)

                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "sparkles").foregroundStyle(Color(hex: "#FFD700"))
                        Text("Quick Tips").font(.system(size: 14, weight: .bold)).foregroundStyle(Color(hex: "#FFD700"))
                    }
                    ForEach(Array(quickTips.enumerated()), id: \.offset) { _, tip in
                        HStack(alignment: .top, spacing: Spacing.sm) {
                            Image(systemName: tip.symbol).font(.system(size: 12)).foregroundStyle(tip.color)
                            Text(tip.text).font(.system(size: 12)).foregroundStyle(.white.opacity(0.9))
                        }
                    }
                }
                .padding(Spacing.md)
                .background(Color.white.opacity(0.1))
                .clipShape(.rect(cornerRadius: Radius.md))
                .padding(.horizontal, Spacing.md)
                .padding(.bottom, Spacing.md)

                Button {
                    Haptics.medium()
                    withAnimation { guideExpanded = false }
                } label: {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "play.fill").font(.system(size: 14))
                        Text("Got it, let's play!").font(.system(size: 15, weight: .bold))
                    }
                    .foregroundStyle(theme.colors.primary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(.white)
                    .clipShape(.rect(cornerRadius: Radius.md))
                }
                .buttonStyle(PressableButtonStyle())
                .padding(.horizontal, Spacing.md)
                .padding(.bottom, Spacing.md)
            }
        }
        .background(LinearGradient(colors: theme.colors.gradientPrimary + [theme.colors.secondary], startPoint: .topLeading, endPoint: .bottomTrailing))
        .clipShape(.rect(cornerRadius: Radius.xl))
        .shadow(color: theme.colors.primary.opacity(0.3), radius: 16, y: 8)
    }

    private var guideButtonsRow: some View {
        HStack(spacing: Spacing.md) {
            Button {
                Haptics.light()
                withAnimation { showGuide = true; guideExpanded = true }
            } label: {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "rocket.fill").font(.system(size: 14))
                    Text("Quick Start").font(.system(size: 14, weight: .semibold))
                }
                .foregroundStyle(theme.colors.primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(theme.colors.surface)
                .clipShape(.rect(cornerRadius: Radius.md))
                .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(theme.colors.primary.opacity(0.3), lineWidth: 1))
            }
            .buttonStyle(PressableButtonStyle())

            Button {
                navigateTo = .tutorial
            } label: {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "book.fill").font(.system(size: 14))
                    Text("Full Tutorial").font(.system(size: 14, weight: .semibold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color(hex: "#14B8A6"))
                .clipShape(.rect(cornerRadius: Radius.md))
            }
            .buttonStyle(PressableButtonStyle())
        }
    }

    // MARK: - Date Bar

    private var dateBar: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "calendar").font(.system(size: 14)).foregroundStyle(theme.colors.textSecondary)
            Text("\(monthNames[Calendar.current.component(.month, from: game.currentDate) - 1]) \(Calendar.current.component(.year, from: game.currentDate))")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(theme.colors.text)
            Spacer()
            Text("Month \(game.monthsPlayed + 1)")
                .font(.system(size: 14))
                .foregroundStyle(theme.colors.textSecondary)
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm + 4)
        .background(theme.colors.surface)
        .clipShape(.rect(cornerRadius: Radius.md))
    }

    // MARK: - Credit Score Card

    private func creditScoreCard(tier: CreditTier) -> some View {
        CardView(padding: Spacing.lg) {
            VStack(spacing: Spacing.md) {
                HStack {
                    Text("Credit Score").font(.system(size: 14, weight: .medium)).foregroundStyle(theme.colors.textSecondary)
                    Spacer()
                    Button { navigateTo = .creditDetails } label: {
                        Image(systemName: "info.circle.fill").font(.system(size: 16)).foregroundStyle(theme.colors.primary)
                    }
                    .buttonStyle(.plain)
                }

                Text("\(game.creditScores.composite)")
                    .font(.system(size: 64, weight: .heavy))
                    .foregroundStyle(tier.color)

                Text(tier.name)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(tier.color)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, 6)
                    .background(tier.color.opacity(0.15))
                    .clipShape(.capsule)

                HStack(spacing: 0) {
                    bureauItem("Experian", game.creditScores.experian)
                    Rectangle().fill(theme.colors.border).frame(width: 1, height: 40)
                    bureauItem("Equifax", game.creditScores.equifax)
                    Rectangle().fill(theme.colors.border).frame(width: 1, height: 40)
                    bureauItem("TransUnion", game.creditScores.transunion)
                }
                .padding(.top, Spacing.sm)
            }
            .frame(maxWidth: .infinity)
        }
    }

    private func bureauItem(_ name: String, _ score: Int) -> some View {
        VStack(spacing: 4) {
            Text(name).font(.system(size: 11)).foregroundStyle(theme.colors.textSecondary)
            Text("\(score)").font(.system(size: 18, weight: .bold)).foregroundStyle(theme.colors.text)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Stats Grid

    private var statsGrid: some View {
        LazyVGrid(columns: [GridItem(spacing: Spacing.md), GridItem(spacing: Spacing.md)], spacing: Spacing.md) {
            statCard("Bank Balance", Format.compactCurrency(game.bankBalance), "dollarsign.circle.fill", Color(hex: "#10B981"))
            statCard("MUSO Tokens", String(format: "%.0f", game.tokenBalance), "coins.fill", Color(hex: "#8B5CF6"))
            statCard("Net Worth", Format.compactCurrency(game.totalNetWorth), "target", game.totalNetWorth >= 0 ? Color(hex: "#10B981") : Color(hex: "#EF4444"))
            statCard("Utilization", String(format: "%.0f%%", game.creditUtilization), "bolt.fill", game.creditUtilization > 30 ? Color(hex: "#EF4444") : Color(hex: "#10B981"))
        }
    }

    private func statCard(_ label: String, _ value: String, _ symbol: String, _ color: Color) -> some View {
        CardView(padding: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Image(systemName: symbol).font(.system(size: 18)).foregroundStyle(color)
                Text(label).font(.system(size: 12)).foregroundStyle(theme.colors.textSecondary)
                Text(value).font(.system(size: 20, weight: .bold)).foregroundStyle(theme.colors.text)
            }
        }
    }

    // MARK: - Quick Actions

    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Quick Actions").font(.system(size: 18, weight: .bold)).foregroundStyle(theme.colors.text)
            VStack(spacing: Spacing.sm) {
                ForEach(quickActions, id: \.id) { action in
                    Button {
                        Haptics.light()
                        navigateTo = action.route
                    } label: {
                        HStack(spacing: Spacing.md) {
                            Image(systemName: action.symbol)
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundStyle(action.color)
                                .frame(width: 48, height: 48)
                                .background(action.color.opacity(0.13))
                                .clipShape(.rect(cornerRadius: Radius.md))
                            Text(action.label).font(.system(size: 16, weight: .semibold)).foregroundStyle(theme.colors.text)
                            Spacer()
                            Image(systemName: "chevron.right").font(.system(size: 14)).foregroundStyle(theme.colors.textLight)
                        }
                        .padding(Spacing.md)
                        .background(theme.colors.surface)
                        .clipShape(.rect(cornerRadius: Radius.lg))
                    }
                    .buttonStyle(PressableButtonStyle())
                }
            }
        }
    }

    // MARK: - Financial Summary

    private var financialSummary: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Financial Summary").font(.system(size: 18, weight: .bold)).foregroundStyle(theme.colors.text)
            CardView {
                VStack(spacing: 0) {
                    summaryRow("Monthly Expenses", Format.compactCurrency(game.totalMonthlyExpenses), theme.colors.text)
                    summaryRow("Total Debt", Format.compactCurrency(game.totalDebt), game.totalDebt > 0 ? Color(hex: "#EF4444") : Color(hex: "#10B981"))
                    summaryRow("Credit Accounts", "\(game.creditAccounts.count)", theme.colors.text)
                    summaryRow("Payment Streak", "\(game.consecutiveOnTimePayments) months", Color(hex: "#10B981"))
                    summaryRow("Achievements", "\(game.unlockedAchievementCount)/\(game.totalAchievementCount)", Color(hex: "#8B5CF6"), isLast: true)
                }
            }
        }
    }

    private func summaryRow(_ label: String, _ value: String, _ valueColor: Color, isLast: Bool = false) -> some View {
        HStack {
            Text(label).font(.system(size: 14)).foregroundStyle(theme.colors.textSecondary)
            Spacer()
            Text(value).font(.system(size: 14, weight: .semibold)).foregroundStyle(valueColor)
        }
        .padding(.vertical, Spacing.md)
        .overlay(alignment: .bottom) {
            if !isLast { Rectangle().fill(theme.colors.border.opacity(0.5)).frame(height: 1) }
        }
    }

    // MARK: - Advance Month

    private var advanceMonthButton: some View {
        Button {
            Haptics.medium()
            let result = game.advanceMonth()
            if result.isBankrupt {
                Haptics.error()
                showResetAlert = true
                return
            }
            if let event = result.event {
                currentEvent = event
                showEvent = true
            } else if let report = result.report {
                currentReport = report
                showReport = true
            }
        } label: {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "play.fill").font(.system(size: 18))
                Text("Advance to Next Month").font(.system(size: 17, weight: .bold))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)
            .background(theme.colors.primary)
            .clipShape(.rect(cornerRadius: Radius.lg))
        }
        .buttonStyle(PressableButtonStyle())
    }
}

// MARK: - Monthly Report Sheet

private struct MonthlyReportSheet: View {
    @Environment(ThemeManager.self) private var theme
    let report: MonthlyReport

    var body: some View {
        let colors = theme.colors
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    Text("Monthly Report").font(.system(size: 24, weight: .heavy)).foregroundStyle(colors.text)
                    Text("\(Calendar.current.shortMonthSymbols[report.month - 1]) \(report.year)")
                        .font(.system(size: 14)).foregroundStyle(colors.textSecondary)

                    CardView {
                        VStack(spacing: Spacing.sm) {
                            reportRow("Income", "+\(Format.currency(report.income))", Color(hex: "#10B981"))
                            reportRow("Expenses", "-\(Format.currency(report.expenses))", Color(hex: "#EF4444"))
                            Rectangle().fill(colors.border).frame(height: 1)
                            reportRow("Net", "\(report.savings >= 0 ? "+" : "")\(Format.currency(report.savings))", report.savings >= 0 ? Color(hex: "#10B981") : Color(hex: "#EF4444"))
                        }
                    }

                    HStack(spacing: Spacing.sm) {
                        Image(systemName: report.creditScoreChange >= 0 ? "trending.up" : "trending.down")
                            .foregroundStyle(report.creditScoreChange >= 0 ? Color(hex: "#10B981") : Color(hex: "#EF4444"))
                        Text("Credit Score: \(report.creditScoreChange >= 0 ? "+" : "")\(report.creditScoreChange) points")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(report.creditScoreChange >= 0 ? Color(hex: "#10B981") : Color(hex: "#EF4444"))
                    }

                    if !report.highlights.isEmpty {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            ForEach(report.highlights, id: \.self) { h in
                                HStack(spacing: Spacing.sm) {
                                    Image(systemName: "checkmark.circle.fill").foregroundStyle(Color(hex: "#10B981"))
                                    Text(h).font(.system(size: 14)).foregroundStyle(colors.text)
                                }
                            }
                        }
                    }

                    if !report.warnings.isEmpty {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            ForEach(report.warnings, id: \.self) { w in
                                HStack(spacing: Spacing.sm) {
                                    Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(Color(hex: "#F59E0B"))
                                    Text(w).font(.system(size: 14)).foregroundStyle(colors.text)
                                }
                            }
                        }
                    }
                }
                .padding(Spacing.lg)
            }
            .background(colors.background)
            .navigationTitle("Monthly Report")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func reportRow(_ label: String, _ value: String, _ color: Color) -> some View {
        HStack {
            Text(label).font(.system(size: 15)).foregroundStyle(theme.colors.textSecondary)
            Spacer()
            Text(value).font(.system(size: 15, weight: .semibold)).foregroundStyle(color)
        }
    }
}

// MARK: - Random Event Sheet

private struct RandomEventSheet: View {
    @Environment(ThemeManager.self) private var theme
    let event: RandomEvent

    var body: some View {
        let colors = theme.colors
        NavigationStack {
            VStack(spacing: Spacing.lg) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(Color(hex: "#EF4444"))
                    .frame(width: 72, height: 72)
                    .background(Color(hex: "#EF4444").opacity(0.12))
                    .clipShape(.circle)

                Text(event.title).font(.system(size: 24, weight: .heavy)).foregroundStyle(colors.text)
                Text(event.description).font(.system(size: 15)).foregroundStyle(colors.textSecondary).multilineTextAlignment(.center)

                if event.cost > 0 {
                    HStack { Text("Cost").font(.system(size: 15)).foregroundStyle(colors.textSecondary); Spacer(); Text("-\(Format.currency(event.cost))").font(.system(size: 15, weight: .bold)).foregroundStyle(Color(hex: "#EF4444")) }
                    .padding(.horizontal, Spacing.lg)
                }
                if let impact = event.creditImpact {
                    HStack { Text("Credit Impact").font(.system(size: 15)).foregroundStyle(colors.textSecondary); Spacer(); Text("\(impact) points").font(.system(size: 15, weight: .bold)).foregroundStyle(Color(hex: "#EF4444")) }
                    .padding(.horizontal, Spacing.lg)
                }
            }
            .padding(Spacing.lg)
            .frame(maxHeight: .infinity)
            .background(colors.background)
            .navigationTitle("Event")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

// MARK: - Game Route

enum GameRoute: Hashable, Identifiable {
    case profile, education, community, tokenWallet, marketplace
    case realEstate, career, bank, budget, leaderboard
    case achievements, runSimulator, incidents, creditDetails, tutorial
    case scavengerHunt, city3d, avatarCustomization, investmentPools

    var id: Self { self }
}

struct GameRouteView: View {
    let route: GameRoute

    var body: some View {
        switch route {
        case .career: CareerView()
        case .bank: BankView()
        case .budget: BudgetView()
        case .tokenWallet: GameTokenWalletView()
        case .realEstate: RealEstateView()
        case .achievements: GameAchievementsView()
        case .community: CommunityView()
        case .education: EducationView()
        case .runSimulator: RunSimulatorView()
        case .incidents: FinancialIncidentsView()
        case .creditDetails: CreditDetailsView()
        case .leaderboard: LeaderboardView()
        case .profile: GameProfileView()
        case .marketplace: MarketplaceView()
        case .tutorial: TutorialView()
        case .scavengerHunt: ScavengerHuntView()
        case .city3d: City3DView()
        case .avatarCustomization: AvatarCustomizationView()
        case .investmentPools: InvestmentPoolsView()
        }
    }
}
