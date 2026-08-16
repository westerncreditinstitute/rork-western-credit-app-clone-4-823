//
//  GameRemainingViews.swift
//  WesternCreditInstitute
//

import SwiftUI

// MARK: - Token Wallet View

struct GameTokenWalletView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game

    @State private var activeTab = 0
    @State private var showLockedWallet = false

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.md) {
                // Tab switcher
                HStack(spacing: 6) {
                    tabButton("Wallet", "wallet.pass.fill", 0)
                    tabButton("Network", "globe", 1)
                    tabButton("Economy", "chart.bar.fill", 2)
                }
                .padding(.horizontal, Spacing.md)

                if activeTab == 0 {
                    walletTab(colors: colors)
                } else if activeTab == 1 {
                    networkTab(colors: colors)
                } else {
                    economyTab(colors: colors)
                }
            }
            .padding(.bottom, 100)
        }
        .background(Color(hex: "#F9FAFB"))
        .scrollIndicators(.hidden)
        .navigationTitle("MUSO Token Wallet")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func tabButton(_ label: String, _ symbol: String, _ index: Int) -> some View {
        Button { Haptics.light(); activeTab = index } label: {
            HStack(spacing: 6) {
                Image(systemName: symbol).font(.system(size: 14))
                Text(label).font(.system(size: 13, weight: .semibold))
            }
            .foregroundStyle(activeTab == index ? Color(hex: "#8B5CF6") : Color(hex: "#9CA3AF"))
            .frame(maxWidth: .infinity).padding(.vertical, 8)
            .background(activeTab == index ? Color(hex: "#8B5CF6").opacity(0.10) : Color.clear)
            .clipShape(.rect(cornerRadius: Radius.md))
        }
        .buttonStyle(.plain)
    }

    private func walletTab(colors: AppTheme) -> some View {
        VStack(spacing: Spacing.md) {
            // Balance card
            VStack(spacing: Spacing.sm) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("MUSO Token Balance").font(.system(size: 13)).foregroundStyle(.white.opacity(0.75))
                        Text(String(format: "%.2f", game.tokenBalance)).font(.system(size: 38, weight: .heavy)).foregroundStyle(.white)
                        Text("MUSO").font(.system(size: 16, weight: .semibold)).foregroundStyle(.white.opacity(0.85))
                    }
                    Spacer()
                    Text(Format.compactCurrency(game.tokenBalance * 0.1))
                        .font(.system(size: 14, weight: .bold)).foregroundStyle(.white)
                        .padding(.horizontal, 10).padding(.vertical, 5)
                        .background(.white.opacity(0.2)).clipShape(.capsule)
                }
                HStack {
                    HStack(spacing: 6) { Circle().fill(Color(hex: "#10B981")).frame(width: 6, height: 6); Text("Synced with Game").font(.system(size: 12)).foregroundStyle(.white.opacity(0.8)) }
                    Spacer()
                    Text("Sepolia Testnet").font(.system(size: 11, weight: .semibold)).foregroundStyle(.white.opacity(0.6))
                }
            }
            .padding(Spacing.lg)
            .background(Color(hex: "#8B5CF6"))
            .clipShape(.rect(cornerRadius: Radius.xl))
            .shadow(color: Color(hex: "#8B5CF6").opacity(0.35), radius: 12, y: 6)

            // Bank balances
            gameCard {
                VStack(spacing: Spacing.sm) {
                    HStack {
                        Image(systemName: "dollarsign.circle.fill").foregroundStyle(.gray); Text("Checking").font(.system(size: 14)).foregroundStyle(colors.textSecondary); Spacer(); Text(Format.currency(game.bankBalance)).font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                    }
                    HStack {
                        Image(systemName: "piggybank.fill").foregroundStyle(.gray); Text("Savings").font(.system(size: 14)).foregroundStyle(colors.textSecondary); Spacer(); Text(Format.currency(game.savingsBalance)).font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                    }
                    Rectangle().fill(colors.border).frame(height: 1)
                    HStack {
                        Text("Total Balance").font(.system(size: 14, weight: .semibold)).foregroundStyle(colors.text); Spacer(); Text(Format.currency(game.bankBalance + game.savingsBalance + game.emergencyFund)).font(.system(size: 18, weight: .heavy)).foregroundStyle(colors.text)
                    }
                    Button { game.syncTokensWithBalance(); Haptics.light() } label: {
                        HStack(spacing: 6) { Image(systemName: "arrow.triangle.2.circlepath").font(.system(size: 16)); Text("Sync Tokens with Balance").font(.system(size: 14, weight: .semibold)) }
                            .foregroundStyle(Color(hex: "#8B5CF6")).frame(maxWidth: .infinity).padding(.vertical, 12).background(Color(hex: "#8B5CF6").opacity(0.08)).clipShape(.rect(cornerRadius: Radius.md))
                    }.buttonStyle(PressableButtonStyle())
                }
            }

            // Exchange rate
            gameCard {
                VStack(spacing: 4) {
                    Text("Exchange Rate").font(.system(size: 14, weight: .semibold)).foregroundStyle(colors.text)
                    Text("10 MUSO = $1").font(.system(size: 24, weight: .heavy)).foregroundStyle(Color(hex: "#8B5CF6"))
                    Text("Fixed rate maintained by the game economy").font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                }.frame(maxWidth: .infinity)
            }

            // Mini stats
            HStack(spacing: Spacing.md) {
                miniStatCard("You Minted", String(format: "%.0f", game.tokenWallet.totalMinted), "trending.up", Color(hex: "#10B981"))
                miniStatCard("You Burned", String(format: "%.0f", game.tokenWallet.totalBurned), "trending.down", Color(hex: "#EF4444"))
            }

            // Recent transactions
            gameCard {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack { Image(systemName: "clock.arrow.circleplay.fill").foregroundStyle(.gray); Text("Recent Transactions").font(.system(size: 14, weight: .semibold)).foregroundStyle(colors.text) }
                    if game.tokenTransactions.isEmpty {
                        Text("No transactions yet").font(.system(size: 14)).foregroundStyle(colors.textLight).frame(maxWidth: .infinity).padding(.vertical, Spacing.lg)
                    } else {
                        ForEach(Array(game.tokenTransactions.prefix(10)), id: \.id) { tx in
                            HStack(spacing: Spacing.sm) {
                                Image(systemName: tx.type == .mint ? "arrow.down.left" : "arrow.up.right")
                                    .foregroundStyle(tx.type == .mint ? Color(hex: "#10B981") : Color(hex: "#EF4444"))
                                    .frame(width: 32, height: 32).background((tx.type == .mint ? Color(hex: "#10B981") : Color(hex: "#EF4444")).opacity(0.10)).clipShape(.circle)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(tx.reason).font(.system(size: 13, weight: .medium)).foregroundStyle(colors.text).lineLimit(1)
                                    Text(Format.shortDate(tx.timestamp)).font(.system(size: 11)).foregroundStyle(colors.textLight)
                                }
                                Spacer()
                                Text("\(tx.type == .mint ? "+" : "-")\(String(format: "%.2f", tx.amount))")
                                    .font(.system(size: 14, weight: .bold)).foregroundStyle(tx.type == .mint ? Color(hex: "#10B981") : Color(hex: "#EF4444"))
                            }
                        }
                    }
                }
            }
        }
        .padding(.horizontal, Spacing.md)
    }

    private func networkTab(colors: AppTheme) -> some View {
        VStack(spacing: Spacing.md) {
            gameCard {
                VStack(spacing: Spacing.sm) {
                    HStack { Circle().fill(Color(hex: "#10B981")).frame(width: 10, height: 10); Text("Network Online").font(.system(size: 16, weight: .bold)).foregroundStyle(Color(hex: "#10B981")) }
                    Text("Sepolia Testnet").font(.system(size: 14, weight: .semibold)).foregroundStyle(colors.text)
                    LazyVGrid(columns: [GridItem(), GridItem()], spacing: Spacing.md) {
                        infoItem("Chain ID", "11155111", "cpu.fill", Color(hex: "#6366F1"))
                        infoItem("Latest Block", "5,241,302", "cube.fill", Color(hex: "#3B82F6"))
                        infoItem("Gas Price", "1.2 Gwei", "bolt.fill", Color(hex: "#F59E0B"))
                        infoItem("Standard", "ERC-20", "cube.box.fill", Color(hex: "#8B5CF6"))
                    }
                }
            }
            gameCard {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("Token Supply").font(.system(size: 14, weight: .semibold)).foregroundStyle(colors.text)
                    supplyRow("Total Supply", "1,250,000")
                    supplyRow("Circulating", "1,180,000")
                    supplyRow("Total Minted", "1,250,000")
                    supplyRow("Total Burned", "70,000")
                    supplyRow("Burn Rate", "5.6%")
                }
            }
        }
        .padding(.horizontal, Spacing.md)
    }

    private func economyTab(colors: AppTheme) -> some View {
        VStack(spacing: Spacing.md) {
            gameCard {
                VStack(spacing: 4) {
                    Text("Simulated Market Cap").font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                    Text("$125,000").font(.system(size: 32, weight: .heavy)).foregroundStyle(Color(hex: "#8B5CF6"))
                    HStack {
                        VStack { Text("Exchange Rate").font(.system(size: 11)).foregroundStyle(colors.textSecondary); Text("10 MUSO = $1").font(.system(size: 14, weight: .bold)).foregroundStyle(colors.text) }
                        Rectangle().fill(colors.border).frame(width: 1, height: 36)
                        VStack { Text("TVL").font(.system(size: 11)).foregroundStyle(colors.textSecondary); Text("$45,000").font(.system(size: 14, weight: .bold)).foregroundStyle(colors.text) }
                    }
                }.frame(maxWidth: .infinity)
            }

            gameCard {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("Mainnet Swap Program").font(.system(size: 14, weight: .bold)).foregroundStyle(colors.text)
                    Text("Earn MUSO now, swap for real tokens later!").font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                    HStack {
                        statBox("1,247", "Registered")
                        Rectangle().fill(colors.border).frame(width: 1, height: 40)
                        statBox("892", "Eligible")
                        Rectangle().fill(colors.border).frame(width: 1, height: 40)
                        statBox("1,000", "Min MUSO")
                    }
                    HStack(spacing: 6) {
                        Image(systemName: "info.circle.fill").foregroundStyle(Color(hex: "#6366F1"))
                        Text(game.tokenBalance >= 1000 ? "You are eligible for the mainnet swap!" : "Need \(String(format: "%.0f", 1000 - game.tokenBalance)) more MUSO to be eligible")
                            .font(.system(size: 13)).foregroundStyle(Color(hex: "#6366F1"))
                    }
                }
            }
        }
        .padding(.horizontal, Spacing.md)
    }

    private func gameCard<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        content().padding(Spacing.md).background(.white).clipShape(.rect(cornerRadius: Radius.lg)).shadow(color: .black.opacity(0.05), radius: 8, y: 3)
    }

    private func miniStatCard(_ label: String, _ value: String, _ symbol: String, _ color: Color) -> some View {
        VStack(spacing: Spacing.sm) {
            Image(systemName: symbol).font(.system(size: 18)).foregroundStyle(color)
            Text(value).font(.system(size: 18, weight: .bold)).foregroundStyle(.black)
            Text(label).font(.system(size: 12)).foregroundStyle(.gray)
        }.frame(maxWidth: .infinity).padding(Spacing.md).background(.white).clipShape(.rect(cornerRadius: Radius.lg)).shadow(color: .black.opacity(0.05), radius: 8, y: 3)
    }

    private func infoItem(_ label: String, _ value: String, _ symbol: String, _ color: Color) -> some View {
        VStack(spacing: 4) { Image(systemName: symbol).foregroundStyle(color); Text(label).font(.system(size: 11)).foregroundStyle(.gray); Text(value).font(.system(size: 14, weight: .bold)).foregroundStyle(.black) }
    }
    private func supplyRow(_ label: String, _ value: String) -> some View {
        HStack { Text(label).font(.system(size: 13)).foregroundStyle(.gray); Spacer(); Text(value).font(.system(size: 14, weight: .semibold)).foregroundStyle(.black) }
    }
    private func statBox(_ value: String, _ label: String) -> some View {
        VStack { Text(value).font(.system(size: 18, weight: .heavy)); Text(label).font(.system(size: 11)).foregroundStyle(.gray) }.frame(maxWidth: .infinity)
    }
}

// MARK: - Real Estate View

struct RealEstateView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.md) {
                if !game.ownedProperties.isEmpty {
                    SectionHeader(title: "My Portfolio", symbol: "building.2.fill")
                    ForEach(game.ownedProperties, id: \.id) { prop in
                        CardView {
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                RemoteImage(urlString: prop.imageURL, height: 120, cornerRadius: Radius.md)
                                Text(prop.address).font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                                HStack { Text(prop.city + ", " + prop.state).font(.system(size: 13)).foregroundStyle(colors.textSecondary); Spacer(); Text(Format.compactCurrency(prop.price)).font(.system(size: 16, weight: .bold)).foregroundStyle(colors.primary) }
                                HStack(spacing: Spacing.md) {
                                    Label("\(prop.bedrooms) bd", systemImage: "bed.double.fill").font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                                    Label("\(prop.bathrooms) ba", systemImage: "shower.fill").font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                                    Label("\(prop.squareFeet) sqft", systemImage: "ruler.fill").font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                                }
                            }
                        }
                    }
                }

                SectionHeader(title: "Available Properties", symbol: "house.fill")
                ForEach(GameMockData.properties.filter { !$0.owned }, id: \.id) { prop in
                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            RemoteImage(urlString: prop.imageURL, height: 160, cornerRadius: Radius.md)
                            HStack {
                                Text(prop.type.label.uppercased()).font(.system(size: 11, weight: .bold)).foregroundStyle(colors.primary).padding(.horizontal, 8).padding(.vertical, 3).background(colors.primary.opacity(0.10)).clipShape(.rect(cornerRadius: 6))
                                Spacer()
                                Text(Format.compactCurrency(prop.monthlyRent) + "/mo").font(.system(size: 13, weight: .semibold)).foregroundStyle(Color(hex: "#10B981"))
                            }
                            Text(prop.address).font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                            Text(prop.city + ", " + prop.state).font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                            Text(prop.description).font(.system(size: 13)).foregroundStyle(colors.textLight).lineLimit(2)
                            HStack(spacing: Spacing.md) {
                                Label("\(prop.bedrooms) bd", systemImage: "bed.double.fill").font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                                Label("\(prop.bathrooms) ba", systemImage: "shower.fill").font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                                Label("\(prop.squareFeet) sqft", systemImage: "ruler.fill").font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                            }
                            HStack {
                                Text(Format.compactCurrency(prop.price)).font(.system(size: 20, weight: .heavy)).foregroundStyle(colors.primary)
                                Spacer()
                                Button {
                                    if game.bankBalance >= prop.price {
                                        game.buyProperty(prop); Haptics.success()
                                    } else {
                                        Haptics.error()
                                    }
                                } label: {
                                    Text(game.bankBalance >= prop.price ? "Buy" : "Insufficient Funds")
                                        .font(.system(size: 14, weight: .bold)).foregroundStyle(.white)
                                        .padding(.horizontal, Spacing.lg).padding(.vertical, 10)
                                        .background(game.bankBalance >= prop.price ? colors.primary : colors.textLight)
                                        .clipShape(.rect(cornerRadius: Radius.md))
                                }.buttonStyle(PressableButtonStyle()).disabled(game.bankBalance < prop.price)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Real Estate")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Achievements View

struct GameAchievementsView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.md) {
                HStack {
                    VStack { Text("\(game.unlockedAchievementCount)").font(.system(size: 32, weight: .heavy)).foregroundStyle(colors.primary); Text("Unlocked").font(.system(size: 13)).foregroundStyle(colors.textSecondary) }.frame(maxWidth: .infinity)
                    Rectangle().fill(colors.border).frame(width: 1, height: 50)
                    VStack { Text("\(game.totalAchievementCount)").font(.system(size: 32, weight: .heavy)).foregroundStyle(colors.text); Text("Total").font(.system(size: 13)).foregroundStyle(colors.textSecondary) }.frame(maxWidth: .infinity)
                    Rectangle().fill(colors.border).frame(width: 1, height: 50)
                    VStack { Text(Format.compactCurrency(game.achievements.filter(\.unlocked).reduce(0) { $0 + $1.reward })).font(.system(size: 24, weight: .heavy)).foregroundStyle(Color(hex: "#10B981")); Text("Tokens Earned").font(.system(size: 13)).foregroundStyle(colors.textSecondary) }.frame(maxWidth: .infinity)
                }.padding(Spacing.lg).background(colors.surface).clipShape(.rect(cornerRadius: Radius.lg))

                ForEach(game.achievements, id: \.id) { achievement in
                    let color = Color(hex: achievement.color)
                    CardView {
                        HStack(spacing: Spacing.md) {
                            Image(systemName: achievement.symbol).font(.system(size: 22, weight: .semibold)).foregroundStyle(achievement.unlocked ? color : colors.textLight)
                                .frame(width: 52, height: 52).background((achievement.unlocked ? color : colors.textLight).opacity(0.12)).clipShape(.rect(cornerRadius: Radius.md))
                            VStack(alignment: .leading, spacing: 4) {
                                Text(achievement.title).font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                                Text(achievement.description).font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                                HStack(spacing: 4) {
                                    Image(systemName: "coins.fill").font(.system(size: 11)).foregroundStyle(color)
                                    Text("+\(Int(achievement.reward)) MUSO").font(.system(size: 12, weight: .semibold)).foregroundStyle(color)
                                }
                            }
                            Spacer()
                            if achievement.unlocked {
                                Image(systemName: "checkmark.circle.fill").font(.system(size: 24)).foregroundStyle(Color(hex: "#10B981"))
                            } else {
                                Image(systemName: "lock.fill").font(.system(size: 20)).foregroundStyle(colors.textLight)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Achievements")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Community View

struct CommunityView: View {
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.md) {
                SectionHeader(title: "Community Feed", symbol: "newspaper.fill")
                ForEach(GameMockData.socialPosts, id: \.id) { post in
                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            HStack(spacing: Spacing.sm) {
                                RemoteImage(urlString: post.authorAvatarURL, height: 40, cornerRadius: 20).frame(width: 40)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(post.authorName).font(.system(size: 14, weight: .bold)).foregroundStyle(colors.text)
                                    Text(Format.shortDate(post.timestamp)).font(.system(size: 11)).foregroundStyle(colors.textLight)
                                }
                                Spacer()
                                Text(post.tag).font(.system(size: 11, weight: .bold)).foregroundStyle(colors.primary).padding(.horizontal, 8).padding(.vertical, 3).background(colors.primary.opacity(0.10)).clipShape(.capsule)
                            }
                            Text(post.content).font(.system(size: 14)).foregroundStyle(colors.text)
                            HStack(spacing: Spacing.lg) {
                                HStack(spacing: 4) { Image(systemName: "heart.fill").foregroundStyle(Color(hex: "#EF4444")); Text("\(post.likes)").font(.system(size: 13)).foregroundStyle(colors.textSecondary) }
                                HStack(spacing: 4) { Image(systemName: "bubble.left.fill").foregroundStyle(colors.textLight); Text("\(post.comments)").font(.system(size: 13)).foregroundStyle(colors.textSecondary) }
                            }
                        }
                    }
                }

                SectionHeader(title: "Top Members", symbol: "person.3.fill")
                ForEach(GameMockData.communityMembers, id: \.id) { member in
                    CardView {
                        HStack(spacing: Spacing.md) {
                            RemoteImage(urlString: member.avatarURL, height: 48, cornerRadius: 24).frame(width: 48)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(member.name).font(.system(size: 15, weight: .bold)).foregroundStyle(colors.text)
                                Text("Level \(member.level) • Score: \(member.creditScore)").font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 2) {
                                Text(Format.compactCurrency(member.netWorth)).font(.system(size: 15, weight: .bold)).foregroundStyle(Color(hex: "#10B981"))
                                Text("\(member.achievements) achievements").font(.system(size: 11)).foregroundStyle(colors.textLight)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Community")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Education View

struct EducationView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.md) {
                if let enrollment = game.currentEnrollment {
                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            HStack { Image(systemName: "graduationcap.fill").foregroundStyle(.white).frame(width: 40, height: 40).background(Color(hex: "#10B981")).clipShape(.rect(cornerRadius: Radius.md)); VStack(alignment: .leading, spacing: 2) { Text("Currently Enrolled").font(.system(size: 14, weight: .bold)).foregroundStyle(.white); Text("GPA: \(String(format: "%.2f", enrollment.gpa))").font(.system(size: 12)).foregroundStyle(.white.opacity(0.85)) }; Spacer() }
                                .padding(.horizontal, Spacing.md).padding(.vertical, Spacing.md)
                                .background(Color(hex: "#10B981")).clipShape(.rect(cornerRadius: Radius.md))
                            ProgressBarView(progress: Int(Double(enrollment.creditsEarned) / Double(enrollment.creditsRequired) * 100), showLabel: true)
                        }
                    }
                }

                SectionHeader(title: "Available Degrees", symbol: "graduationcap.fill")
                ForEach(GameMockData.degrees, id: \.id) { degree in
                    let isCompleted = game.completedDegrees.contains { $0.degreeId == degree.id }
                    let isEnrolled = game.enrollments.contains { $0.degreeId == degree.id }
                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            HStack {
                                Image(systemName: "graduationcap.fill").foregroundStyle(Color(hex: "#8B5CF6")).frame(width: 44, height: 44).background(Color(hex: "#8B5CF6").opacity(0.12)).clipShape(.rect(cornerRadius: Radius.md))
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(degree.name).font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                                    Text(degree.degreeType.label + " • \(degree.durationMonths) months").font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                                }
                                Spacer()
                                if isCompleted { BadgeView(text: "Completed", variant: .success, symbol: "checkmark.seal.fill") }
                                else if isEnrolled { BadgeView(text: "Enrolled", variant: .info) }
                            }
                            Text("Tuition: \(Format.compactCurrency(degree.tuition))").font(.system(size: 14, weight: .semibold)).foregroundStyle(colors.text)
                            if degree.financialAidAvailable { Text("Financial aid available").font(.system(size: 12)).foregroundStyle(Color(hex: "#10B981")) }
                            if !isCompleted && !isEnrolled {
                                Button {
                                    game.enrollInDegree(degree); Haptics.success()
                                } label: {
                                    Text("Enroll Now").font(.system(size: 14, weight: .bold)).foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 12).background(colors.primary).clipShape(.rect(cornerRadius: Radius.md))
                                }.buttonStyle(PressableButtonStyle())
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Education Center")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Run Simulator View

struct RunSimulatorView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game

    @State private var activeTab = 0
    @State private var showTasks = true
    @State private var showAdvanced = false

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.md) {
                // Tab bar
                HStack(spacing: 6) {
                    simTab("Configure", "slider.horizontal.3", 0)
                    simTab("Running", "waveform", 1)
                    simTab("Results", "chart.bar.fill", 2)
                }.padding(.horizontal, Spacing.md)

                if activeTab == 0 { configTab(colors: colors) }
                else if activeTab == 1 { runningTab(colors: colors) }
                else { resultsTab(colors: colors) }
            }
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Run Simulator")
        .navigationBarTitleDisplayMode(.inline)
        .onChange(of: game.isRunning) { _, running in
            if running { activeTab = 1 }
        }
        .onChange(of: game.simulationResult) { _, result in
            if result != nil && !game.isRunning { activeTab = 2 }
        }
    }

    private func simTab(_ label: String, _ symbol: String, _ index: Int) -> some View {
        Button { Haptics.light(); activeTab = index } label: {
            HStack(spacing: 6) { Image(systemName: symbol).font(.system(size: 16)); Text(label).font(.system(size: 13, weight: .semibold)) }
                .foregroundStyle(activeTab == index ? theme.colors.primary : theme.colors.textLight)
                .frame(maxWidth: .infinity).padding(.vertical, 10)
                .background(activeTab == index ? theme.colors.primary.opacity(0.12) : .clear)
                .clipShape(.rect(cornerRadius: Radius.md))
        }.buttonStyle(.plain)
    }

    private func configTab(colors: AppTheme) -> some View {
        VStack(spacing: Spacing.md) {
            // Agent hero
            VStack(spacing: Spacing.md) {
                HStack(spacing: Spacing.md) {
                    Image(systemName: "brain.head.profile.fill").font(.system(size: 28)).foregroundStyle(Color(hex: "#3B82F6")).frame(width: 56, height: 56).background(Color(hex: "#3B82F6").opacity(0.12)).clipShape(.rect(cornerRadius: Radius.md))
                    VStack(alignment: .leading, spacing: 2) {
                        Text("AI Financial Agent").font(.system(size: 20, weight: .heavy)).foregroundStyle(colors.text)
                        Text("Your dedicated AI assistant • \(game.agentTasks.filter(\.enabled).count) tasks active").font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                    }
                    Spacer()
                    Image(systemName: "sparkles").foregroundStyle(Color(hex: "#F59E0B"))
                }
                HStack {
                    VStack { Text("\(game.creditScores.composite)").font(.system(size: 17, weight: .bold)).foregroundStyle(Color(hex: "#10B981")); Text("Credit").font(.system(size: 11)).foregroundStyle(colors.textLight) }.frame(maxWidth: .infinity)
                    Rectangle().fill(colors.border).frame(width: 1, height: 28)
                    VStack { Text(Format.compactCurrency(game.bankBalance)).font(.system(size: 17, weight: .bold)).foregroundStyle(Color(hex: "#3B82F6")); Text("Balance").font(.system(size: 11)).foregroundStyle(colors.textLight) }.frame(maxWidth: .infinity)
                    Rectangle().fill(colors.border).frame(width: 1, height: 28)
                    VStack { Text(Format.compactCurrency(game.totalNetWorth)).font(.system(size: 17, weight: .bold)).foregroundStyle(Color(hex: "#8B5CF6")); Text("Net Worth").font(.system(size: 11)).foregroundStyle(colors.textLight) }.frame(maxWidth: .infinity)
                }
            }.padding(Spacing.lg).background(LinearGradient(colors: [Color(hex: "#EFF6FF"), Color(hex: "#DBEAFE")], startPoint: .topLeading, endPoint: .bottomTrailing)).clipShape(.rect(cornerRadius: Radius.xl))

            // Primary goal
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("Primary Goal").font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                ScrollView(.horizontal) { HStack(spacing: Spacing.sm) {
                    ForEach(AgentPriority.allCases, id: \.self) { goal in
                        Button { Haptics.light(); game.primaryGoal = goal } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "target").font(.system(size: 14))
                                Text(goal.label).font(.system(size: 13, weight: .semibold))
                                if game.primaryGoal == goal { Image(systemName: "checkmark").font(.system(size: 12)) }
                            }
                            .foregroundStyle(game.primaryGoal == goal ? Color(hex: "#3B82F6") : colors.textSecondary)
                            .padding(.horizontal, 14).padding(.vertical, 10)
                            .background(game.primaryGoal == goal ? Color(hex: "#3B82F6").opacity(0.12) : colors.surface)
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(game.primaryGoal == goal ? Color(hex: "#3B82F6") : colors.border, lineWidth: 1.5))
                            .clipShape(.rect(cornerRadius: Radius.md))
                        }.buttonStyle(PressableButtonStyle())
                    }
                }}.scrollIndicators(.hidden)
            }

            // Duration
            CardView {
                VStack(spacing: Spacing.sm) {
                    HStack { Image(systemName: "clock.fill").foregroundStyle(Color(hex: "#3B82F6")); VStack(alignment: .leading) { Text("1 Month").font(.system(size: 18, weight: .bold)).foregroundStyle(colors.text); Text("Maximum 1 month per 24 hours").font(.system(size: 12)).foregroundStyle(colors.textSecondary) }; Spacer() }
                    HStack(spacing: Spacing.sm) {
                        if game.isOnCooldown { Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(Color(hex: "#F59E0B")); Text("Cooldown active — try again later").font(.system(size: 13)).foregroundStyle(Color(hex: "#F59E0B")) }
                        else { Image(systemName: "checkmark.circle.fill").foregroundStyle(Color(hex: "#10B981")); Text("Ready to simulate").font(.system(size: 13)).foregroundStyle(Color(hex: "#10B981")) }
                    }.padding(Spacing.md).background((game.isOnCooldown ? Color(hex: "#F59E0B") : Color(hex: "#10B981")).opacity(0.08)).clipShape(.rect(cornerRadius: Radius.md))
                }
            }

            // Speed
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("Speed").font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                HStack(spacing: Spacing.sm) {
                    ForEach(SimulationSpeed.allCases, id: \.self) { speed in
                        Button { Haptics.light(); game.simulationSpeed = speed } label: {
                            HStack(spacing: 4) { Image(systemName: "clock").font(.system(size: 12)); Text(speed.label).font(.system(size: 12, weight: .semibold)) }
                                .foregroundStyle(game.simulationSpeed == speed ? .white : colors.textSecondary)
                                .padding(.horizontal, 12).padding(.vertical, 10)
                                .background(game.simulationSpeed == speed ? Color(hex: "#8B5CF6") : colors.surface)
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(game.simulationSpeed == speed ? Color.clear : colors.border, lineWidth: 1.5))
                                .clipShape(.rect(cornerRadius: Radius.md))
                        }.buttonStyle(PressableButtonStyle())
                    }
                }
            }

            // Tasks
            Button { Haptics.light(); showTasks.toggle() } label: {
                HStack { Text("Agent Tasks (\(game.agentTasks.filter(\.enabled).count))").font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text); Spacer(); Image(systemName: showTasks ? "chevron.up" : "chevron.down").foregroundStyle(colors.textLight) }
            }.buttonStyle(.plain)

            if showTasks {
                ForEach(game.agentTasks, id: \.id) { task in
                    Button { Haptics.light(); if let idx = game.agentTasks.firstIndex(where: { $0.id == task.id }) { game.agentTasks[idx].enabled.toggle() } } label: {
                        HStack(spacing: Spacing.md) {
                            Image(systemName: task.icon).foregroundStyle(task.enabled ? task.color : theme.colors.textLight).frame(width: 40, height: 40).background((task.enabled ? task.color : theme.colors.textLight).opacity(0.12)).clipShape(.rect(cornerRadius: Radius.md))
                            VStack(alignment: .leading, spacing: 2) { Text(task.label).font(.system(size: 14, weight: .semibold)).foregroundStyle(task.enabled ? colors.text : colors.textLight); Text(task.description).font(.system(size: 11)).foregroundStyle(colors.textSecondary).lineLimit(1) }
                            Spacer()
                            Image(systemName: task.enabled ? "checkmark.circle.fill" : "circle").foregroundStyle(task.enabled ? task.color : colors.textLight).font(.system(size: 22))
                        }.padding(Spacing.md).background(colors.surface).clipShape(.rect(cornerRadius: Radius.md)).overlay(RoundedRectangle(cornerRadius: 14).stroke(task.enabled ? task.color.opacity(0.3) : colors.border, lineWidth: 1))
                    }.buttonStyle(PressableButtonStyle())
                }
            }

            // Advanced
            Button { Haptics.light(); showAdvanced.toggle() } label: {
                HStack { Image(systemName: "slider.horizontal.3").font(.system(size: 16)); Text("Advanced Settings").font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text); Spacer(); Image(systemName: showAdvanced ? "chevron.up" : "chevron.down").foregroundStyle(colors.textLight) }
            }.buttonStyle(.plain)

            if showAdvanced {
                CardView {
                    VStack(spacing: Spacing.sm) {
                        HStack { Text("Debt Payoff Strategy").font(.system(size: 14, weight: .medium)).foregroundStyle(colors.text); Spacer(); Text(game.debtStrategy.capitalized).font(.system(size: 14, weight: .semibold)).foregroundStyle(Color(hex: "#EF4444")) }
                        HStack { Text("Auto Pay Bills").font(.system(size: 14, weight: .medium)).foregroundStyle(colors.text); Spacer(); Image(systemName: game.autoPayBills ? "checkmark.circle.fill" : "circle").foregroundStyle(game.autoPayBills ? Color(hex: "#10B981") : colors.textLight) }
                        HStack { Text("Auto Invest Surplus").font(.system(size: 14, weight: .medium)).foregroundStyle(colors.text); Spacer(); Image(systemName: game.autoInvest ? "checkmark.circle.fill" : "circle").foregroundStyle(game.autoInvest ? Color(hex: "#14B8A6") : colors.textLight) }
                    }
                }
            }

            // Start button
            Button { Haptics.medium(); game.runSimulation() } label: {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "cpu.fill").font(.system(size: 20))
                    Text("Run Simulator").font(.system(size: 18, weight: .bold))
                    Text("1 month").font(.system(size: 13))
                }.foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 18)
                .background(LinearGradient(colors: [Color(hex: "#3B82F6"), Color(hex: "#2563EB")], startPoint: .leading, endPoint: .trailing))
                .clipShape(.rect(cornerRadius: Radius.lg))
            }.buttonStyle(PressableButtonStyle()).disabled(game.isOnCooldown)
        }.padding(.horizontal, Spacing.md)
    }

    private func runningTab(colors: AppTheme) -> some View {
        VStack(spacing: Spacing.md) {
            VStack(spacing: Spacing.md) {
                HStack(spacing: Spacing.md) {
                    Image(systemName: "cpu.fill").font(.system(size: 24)).foregroundStyle(Color(hex: "#60A5FA")).frame(width: 52, height: 52).background(Color(hex: "#60A5FA").opacity(0.12)).clipShape(.rect(cornerRadius: Radius.md))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(game.isPaused ? "Paused" : game.isRunning ? "Simulating..." : "Idle").font(.system(size: 20, weight: .heavy)).foregroundStyle(.white)
                        Text("Month \(game.currentMonth) of \(game.totalMonths)").font(.system(size: 13)).foregroundStyle(.white.opacity(0.7))
                    }
                    Spacer()
                }
                ProgressView(value: game.totalMonths > 0 ? Double(game.currentMonth) / Double(game.totalMonths) : 0).tint(Color(hex: "#60A5FA"))
                if !game.snapshots.isEmpty {
                    HStack {
                        VStack { Text("\(game.snapshots.last!.creditScore)").font(.system(size: 16, weight: .bold)).foregroundStyle(Color(hex: "#34D399")); Text("Credit").font(.system(size: 11)).foregroundStyle(.white.opacity(0.5)) }.frame(maxWidth: .infinity)
                        VStack { Text(Format.compactCurrency(game.snapshots.last!.bankBalance)).font(.system(size: 16, weight: .bold)).foregroundStyle(Color(hex: "#60A5FA")); Text("Balance").font(.system(size: 11)).foregroundStyle(.white.opacity(0.5)) }.frame(maxWidth: .infinity)
                        VStack { Text(Format.compactCurrency(game.snapshots.last!.netWorth)).font(.system(size: 16, weight: .bold)).foregroundStyle(Color(hex: "#A78BFA")); Text("Net Worth").font(.system(size: 11)).foregroundStyle(.white.opacity(0.5)) }.frame(maxWidth: .infinity)
                    }
                }
            }.padding(Spacing.lg).background(LinearGradient(colors: [Color(hex: "#1E3A5F"), Color(hex: "#2563EB")], startPoint: .topLeading, endPoint: .bottomTrailing)).clipShape(.rect(cornerRadius: Radius.xl))

            SectionHeader(title: "Activity Log", symbol: "waveform")
            if game.logs.isEmpty {
                Text("Waiting for simulation to start...").font(.system(size: 14)).foregroundStyle(colors.textLight).padding(.vertical, Spacing.xl)
            } else {
                ForEach(Array(game.logs.suffix(20).reversed()), id: \.id) { entry in
                    let typeColor = colorForLogType(entry.type)
                    HStack(spacing: Spacing.sm) {
                        Rectangle().fill(typeColor).frame(width: 4).clipShape(.rect(cornerRadius: 2))
                        VStack(alignment: .leading, spacing: 2) {
                            HStack { Image(systemName: "activity").font(.system(size: 12)).foregroundStyle(typeColor); Text(entry.action).font(.system(size: 13, weight: .semibold)).foregroundStyle(colors.text); Spacer(); Text("M\(entry.month)").font(.system(size: 10)).foregroundStyle(colors.textLight) }
                            Text(entry.detail).font(.system(size: 12)).foregroundStyle(colors.textSecondary).lineLimit(2)
                        }
                    }.padding(Spacing.md).background(colors.surface).clipShape(.rect(cornerRadius: Radius.md))
                }
            }
        }.padding(.horizontal, Spacing.md)
    }

    private func resultsTab(colors: AppTheme) -> some View {
        if let result = game.simulationResult {
            return AnyView(
                VStack(spacing: Spacing.md) {
                    VStack(spacing: Spacing.sm) {
                        Image(systemName: "award.fill").font(.system(size: 32)).foregroundStyle(Color(hex: "#34D399")).frame(width: 64, height: 64).background(.white.opacity(0.1)).clipShape(.circle)
                        Text("Simulation Complete").font(.system(size: 22, weight: .heavy)).foregroundStyle(.white)
                        Text("\(result.monthsSimulated) months simulated").font(.system(size: 14)).foregroundStyle(.white.opacity(0.7))
                    }.padding(Spacing.xl).frame(maxWidth: .infinity).background(LinearGradient(colors: [Color(hex: "#064E3B"), Color(hex: "#065F46")], startPoint: .topLeading, endPoint: .bottomTrailing)).clipShape(.rect(cornerRadius: Radius.xl))

                    LazyVGrid(columns: [GridItem(spacing: Spacing.md), GridItem(spacing: Spacing.md)], spacing: Spacing.md) {
                        resultCard("Credit Score", "\(result.startSnapshot.creditScore) → \(result.endSnapshot.creditScore)", Double(result.endSnapshot.creditScore - result.startSnapshot.creditScore), "trending.up")
                        resultCard("Bank Balance", Format.compactCurrency(result.endSnapshot.bankBalance), result.endSnapshot.bankBalance - result.startSnapshot.bankBalance, "dollarsign.circle.fill")
                        resultCard("Net Worth", Format.compactCurrency(result.endSnapshot.netWorth), result.endSnapshot.netWorth - result.startSnapshot.netWorth, "chart.bar.fill")
                        resultCard("Total Debt", Format.compactCurrency(result.endSnapshot.totalDebt), result.startSnapshot.totalDebt - result.endSnapshot.totalDebt, "creditcard.fill")
                    }

                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            HStack { Image(systemName: "cpu.fill").foregroundStyle(Color(hex: "#3B82F6")); Text("AI Summary").font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text) }
                            Text(result.summary).font(.system(size: 14)).foregroundStyle(colors.textSecondary)
                        }
                    }

                    Button { Haptics.medium(); game.resetSimulation(); activeTab = 0 } label: {
                        HStack(spacing: 6) { Image(systemName: "arrow.counterclockwise"); Text("Run Again") }.font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 14).background(Color(hex: "#3B82F6")).clipShape(.rect(cornerRadius: Radius.md))
                    }.buttonStyle(PressableButtonStyle())
                }.padding(.horizontal, Spacing.md)
            )
        } else {
            return AnyView(
                VStack(spacing: Spacing.md) {
                    Image(systemName: "cpu").font(.system(size: 48)).foregroundStyle(colors.textLight)
                    Text("No Results Yet").font(.system(size: 20, weight: .bold)).foregroundStyle(colors.text)
                    Text("Run a simulation to see results here").font(.system(size: 14)).foregroundStyle(colors.textLight)
                    Button { activeTab = 0 } label: { Text("Configure & Run").font(.system(size: 15, weight: .semibold)).foregroundStyle(.white).padding(.horizontal, Spacing.lg).padding(.vertical, 14).background(colors.primary).clipShape(.rect(cornerRadius: Radius.md)) }.buttonStyle(PressableButtonStyle())
                }.frame(maxWidth: .infinity).padding(.top, 80)
            )
        }
    }

    private func resultCard(_ label: String, _ value: String, _ change: Double, _ symbol: String) -> some View {
        CardView {
            VStack(spacing: 4) {
                Image(systemName: symbol).font(.system(size: 18)).foregroundStyle(change >= 0 ? Color(hex: "#10B981") : Color(hex: "#EF4444"))
                Text(label).font(.system(size: 12)).foregroundStyle(theme.colors.textSecondary)
                Text(value).font(.system(size: 15, weight: .bold)).foregroundStyle(theme.colors.text)
                Text("\(change >= 0 ? "+" : "")\(Format.compactCurrency(change))").font(.system(size: 12, weight: .semibold)).foregroundStyle(change >= 0 ? Color(hex: "#10B981") : Color(hex: "#EF4444"))
            }.frame(maxWidth: .infinity)
        }
    }

    private func colorForLogType(_ type: String) -> Color {
        switch type {
        case "action": Color(hex: "#3B82F6")
        case "event": Color(hex: "#EF4444")
        case "milestone": Color(hex: "#F59E0B")
        case "warning": Color(hex: "#F97316")
        default: Color(hex: "#6B7280")
        }
    }
}

// MARK: - Financial Incidents View

struct FinancialIncidentsView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game
    @State private var selectedFilter = "all"

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.md) {
                // Stats
                HStack(spacing: Spacing.md) {
                    statCard("Total Cost", Format.compactCurrency(game.incidents.reduce(0) { $0 + $1.actualCost }), "dollarsign.circle.fill", Color(hex: "#EF4444"))
                    statCard("Incidents", "\(game.incidents.count)", "shield.fill", Color(hex: "#22C55E"))
                    statCard("Mitigated", Format.compactCurrency(game.incidents.reduce(0) { $0 + $1.savingsFromMitigation }), "trending.down", Color(hex: "#6366F1"))
                }

                // Filters
                ScrollView(.horizontal) { HStack(spacing: Spacing.sm) {
                    ForEach(["all", "minor", "moderate", "major"], id: \.self) { filter in
                        Button { Haptics.light(); selectedFilter = filter } label: {
                            Text(filter.capitalized).font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(selectedFilter == filter ? .white : colors.text)
                                .padding(.horizontal, Spacing.md).padding(.vertical, 8)
                                .background(selectedFilter == filter ? colors.primary : colors.surface).clipShape(.capsule)
                        }.buttonStyle(PressableButtonStyle())
                    }
                }}.scrollIndicators(.hidden)

                // Generate button
                Button { Haptics.medium(); _ = game.generateIncident() } label: {
                    HStack(spacing: 6) { Image(systemName: "arrow.clockwise.circle.fill"); Text("Generate Incidents").font(.system(size: 15, weight: .semibold)) }
                        .foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 14)
                        .background(Color(hex: "#6366F1")).clipShape(.rect(cornerRadius: Radius.md))
                }.buttonStyle(PressableButtonStyle())

                // Incident list
                let filtered = selectedFilter == "all" ? game.incidents : game.incidents.filter { $0.severity.rawValue == selectedFilter }
                if filtered.isEmpty {
                    EmptyStateView(symbol: "shield.checkered", title: "No Incidents", message: "Generate incidents to see potential financial events")
                } else {
                    ForEach(Array(filtered.reversed()), id: \.id) { incident in
                        CardView {
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                HStack {
                                    Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(incident.severity.color)
                                    Text(incident.incidentName).font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                                    Spacer()
                                    Text(incident.severity.label).font(.system(size: 11, weight: .bold)).foregroundStyle(incident.severity.color).padding(.horizontal, 8).padding(.vertical, 4).background(incident.severity.color.opacity(0.12)).clipShape(.capsule)
                                }
                                Text(incident.description).font(.system(size: 14)).foregroundStyle(colors.textSecondary)
                                HStack(spacing: Spacing.lg) {
                                    Label("Month \(incident.monthNumber)", systemImage: "calendar").font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                                    Label("Base: \(Format.compactCurrency(incident.baseCost))", systemImage: "dollarsign.circle").font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                                    if incident.savingsFromMitigation > 0 { Label("Saved: \(Format.compactCurrency(incident.savingsFromMitigation))", systemImage: "trending.down").font(.system(size: 12)).foregroundStyle(Color(hex: "#22C55E")) }
                                }
                                HStack {
                                    Text(Format.compactCurrency(incident.actualCost)).font(.system(size: 16, weight: .bold)).foregroundStyle(incident.actualCost == 0 ? Color(hex: "#065F46") : Color(hex: "#92400E")).padding(.horizontal, 12).padding(.vertical, 6).background(incident.actualCost == 0 ? Color(hex: "#D1FAE5") : Color(hex: "#FEF3C7")).clipShape(.rect(cornerRadius: 8))
                                    Spacer()
                                    if let mit = incident.mitigationApplied {
                                        HStack(spacing: 4) { Image(systemName: "shield.fill").font(.system(size: 12)).foregroundStyle(Color(hex: "#6366F1")); Text(mit.name).font(.system(size: 11, weight: .semibold)).foregroundStyle(Color(hex: "#4338CA")) }.padding(.horizontal, 10).padding(.vertical, 4).background(Color(hex: "#E0E7FF")).clipShape(.rect(cornerRadius: 8))
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Financial Incidents")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func statCard(_ label: String, _ value: String, _ symbol: String, _ color: Color) -> some View {
        CardView { VStack(spacing: 4) { Image(systemName: symbol).font(.system(size: 20)).foregroundStyle(color); Text(label).font(.system(size: 12)).foregroundStyle(theme.colors.textSecondary); Text(value).font(.system(size: 18, weight: .bold)).foregroundStyle(theme.colors.text) }.frame(maxWidth: .infinity) }
    }
}

// MARK: - Credit Details View

struct CreditDetailsView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game

    var body: some View {
        let colors = theme.colors
        let tier = CreditTier.getTier(score: game.creditScores.composite)
        ScrollView {
            VStack(spacing: Spacing.md) {
                CardView(padding: Spacing.lg) {
                    VStack(spacing: Spacing.md) {
                        Text("\(game.creditScores.composite)").font(.system(size: 64, weight: .heavy)).foregroundStyle(tier.color)
                        Text(tier.name).font(.system(size: 16, weight: .bold)).foregroundStyle(tier.color).padding(.horizontal, Spacing.md).padding(.vertical, 6).background(tier.color.opacity(0.15)).clipShape(.capsule)
                        HStack(spacing: 0) {
                            bureauItem("Experian", game.creditScores.experian, colors)
                            Rectangle().fill(colors.border).frame(width: 1, height: 50)
                            bureauItem("Equifax", game.creditScores.equifax, colors)
                            Rectangle().fill(colors.border).frame(width: 1, height: 50)
                            bureauItem("TransUnion", game.creditScores.transunion, colors)
                        }
                    }.frame(maxWidth: .infinity)
                }

                SectionHeader(title: "Score Factors", symbol: "chart.pie.fill")
                CardView {
                    VStack(spacing: Spacing.sm) {
                        factorRow("Payment History", 35, "checkmark.circle.fill", Color(hex: "#10B981"))
                        factorRow("Credit Utilization", 30, "chart.pie.fill", Color(hex: "#3B82F6"))
                        factorRow("Length of History", 15, "clock.fill", Color(hex: "#8B5CF6"))
                        factorRow("Credit Mix", 10, "creditcard.fill", Color(hex: "#F59E0B"))
                        factorRow("New Credit", 10, "plus.circle.fill", Color(hex: "#06B6D4"))
                    }
                }

                SectionHeader(title: "Hard Inquiries", symbol: "magnifyingglass")
                if game.hardInquiries.isEmpty {
                    EmptyStateView(symbol: "checkmark.shield", title: "No Inquiries", message: "You haven't applied for any credit recently")
                } else {
                    ForEach(game.hardInquiries, id: \.id) { inquiry in
                        CardView {
                            HStack {
                                Image(systemName: "magnifyingglass.circle.fill").foregroundStyle(Color(hex: "#F59E0B"))
                                VStack(alignment: .leading, spacing: 2) { Text(inquiry.institutionName).font(.system(size: 14, weight: .semibold)).foregroundStyle(colors.text); Text(Format.shortDate(inquiry.date)).font(.system(size: 12)).foregroundStyle(colors.textSecondary) }
                                Spacer()
                                Text("-3 pts").font(.system(size: 14, weight: .bold)).foregroundStyle(Color(hex: "#EF4444"))
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Credit Details")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func bureauItem(_ name: String, _ score: Int, _ colors: AppTheme) -> some View {
        VStack(spacing: 4) { Text(name).font(.system(size: 11)).foregroundStyle(colors.textSecondary); Text("\(score)").font(.system(size: 20, weight: .bold)).foregroundStyle(colors.text) }.frame(maxWidth: .infinity)
    }
    private func factorRow(_ name: String, _ weight: Int, _ symbol: String, _ color: Color) -> some View {
        HStack { Image(systemName: symbol).foregroundStyle(color).frame(width: 32, height: 32).background(color.opacity(0.10)).clipShape(.circle); Text(name).font(.system(size: 14, weight: .medium)).foregroundStyle(theme.colors.text); Spacer(); Text("\(weight)%").font(.system(size: 14, weight: .bold)).foregroundStyle(theme.colors.text) }
    }
}

// MARK: - Leaderboard View

struct LeaderboardView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game

    var body: some View {
        let colors = theme.colors
        let sorted = GameMockData.communityMembers.sorted { $0.creditScore > $1.creditScore }
        ScrollView {
            VStack(spacing: Spacing.md) {
                // Your rank
                CardView {
                    HStack {
                        Image(systemName: "crown.fill").font(.system(size: 22)).foregroundStyle(Color(hex: "#FFD700")).frame(width: 48, height: 48).background(Color(hex: "#FFD700").opacity(0.12)).clipShape(.circle)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Your Score").font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                            Text("\(game.creditScores.composite)").font(.system(size: 24, weight: .heavy)).foregroundStyle(colors.text)
                        }
                        Spacer()
                        BadgeView(text: "#\(sorted.count + 1)", variant: .warning, symbol: "number.fill")
                    }
                }

                ForEach(Array(sorted.enumerated()), id: \.element.id) { index, member in
                    let medalColor: Color = index == 0 ? Color(hex: "#FFD700") : index == 1 ? Color(hex: "#C0C0C0") : index == 2 ? Color(hex: "#CD7F32") : colors.textLight
                    CardView {
                        HStack(spacing: Spacing.md) {
                            Text("#\(index + 1)").font(.system(size: 18, weight: .heavy)).foregroundStyle(medalColor).frame(width: 40)
                            RemoteImage(urlString: member.avatarURL, height: 44, cornerRadius: 22).frame(width: 44)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(member.name).font(.system(size: 15, weight: .bold)).foregroundStyle(colors.text)
                                Text("Level \(member.level) • \(Format.compactCurrency(member.netWorth))").font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 2) {
                                Text("\(member.creditScore)").font(.system(size: 20, weight: .heavy)).foregroundStyle(Color(hex: "#10B981"))
                                Text("\(member.achievements) achievements").font(.system(size: 10)).foregroundStyle(colors.textLight)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Leaderboard")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Game Profile View

struct GameProfileView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.md) {
                // Profile header
                VStack(spacing: Spacing.sm) {
                    Image(systemName: "person.circle.fill").font(.system(size: 64)).foregroundStyle(.white)
                    Text("Player Profile").font(.system(size: 22, weight: .heavy)).foregroundStyle(.white)
                    Text("Month \(game.monthsPlayed + 1)").font(.system(size: 14)).foregroundStyle(.white.opacity(0.7))
                }.padding(Spacing.lg).frame(maxWidth: .infinity).background(LinearGradient(colors: theme.colors.gradientPrimary, startPoint: .topLeading, endPoint: .bottomTrailing)).clipShape(.rect(cornerRadius: Radius.xl))

                // Stats
                LazyVGrid(columns: [GridItem(), GridItem(), GridItem()], spacing: Spacing.md) {
                    profileStat("\(game.creditScores.composite)", "Credit Score", "chart.line.uptrend.xyaxis")
                    profileStat(Format.compactCurrency(game.totalNetWorth), "Net Worth", "dollarsign.circle.fill")
                    profileStat("\(game.unlockedAchievementCount)", "Achievements", "trophy.fill")
                }

                // Job info
                if let job = game.currentJob {
                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text("Current Job").font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                            HStack { Image(systemName: "briefcase.fill").foregroundStyle(Color(hex: "#10B981")); Text(job.job.title).font(.system(size: 14, weight: .semibold)).foregroundStyle(colors.text) }
                            HStack { Image(systemName: "building.2.fill").foregroundStyle(colors.textSecondary); Text(job.job.company).font(.system(size: 13)).foregroundStyle(colors.textSecondary) }
                            HStack { Image(systemName: "dollarsign.circle.fill").foregroundStyle(Color(hex: "#10B981")); Text(Format.compactCurrency(job.currentSalary) + "/yr").font(.system(size: 14, weight: .semibold)).foregroundStyle(colors.text) }
                        }
                    }
                }

                // Education
                if !game.completedDegrees.isEmpty {
                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text("Completed Degrees").font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                            ForEach(game.completedDegrees, id: \.degreeId) { degree in
                                HStack { Image(systemName: "graduationcap.fill").foregroundStyle(Color(hex: "#8B5CF6")); Text("\(degree.degreeType.label) - GPA: \(String(format: "%.2f", degree.finalGPA))").font(.system(size: 14)).foregroundStyle(colors.text) }
                            }
                        }
                    }
                }

                // Properties
                if !game.ownedProperties.isEmpty {
                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text("Properties (\(game.ownedProperties.count))").font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                            ForEach(game.ownedProperties, id: \.id) { prop in
                                HStack { Image(systemName: "house.fill").foregroundStyle(Color(hex: "#0EA5E9")); Text("\(prop.address), \(prop.city)").font(.system(size: 14)).foregroundStyle(colors.text); Spacer(); Text(Format.compactCurrency(prop.price)).font(.system(size: 13, weight: .semibold)).foregroundStyle(colors.primary) }
                            }
                        }
                    }
                }

                // Businesses
                if !game.ownedBusinesses.isEmpty {
                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text("Businesses (\(game.ownedBusinesses.count))").font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                            ForEach(game.ownedBusinesses, id: \.id) { biz in
                                HStack { Image(systemName: biz.type.symbol).foregroundStyle(Color(hex: "#F59E0B")); Text(biz.name).font(.system(size: 14)).foregroundStyle(colors.text); Spacer(); Text("\(Format.compactCurrency(biz.monthlyRevenue - biz.monthlyExpenses))/mo").font(.system(size: 13, weight: .semibold)).foregroundStyle(Color(hex: "#10B981")) }
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Game Profile")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func profileStat(_ value: String, _ label: String, _ symbol: String) -> some View {
        CardView { VStack(spacing: 4) { Image(systemName: symbol).font(.system(size: 18)).foregroundStyle(theme.colors.primary); Text(value).font(.system(size: 18, weight: .bold)).foregroundStyle(theme.colors.text); Text(label).font(.system(size: 11)).foregroundStyle(theme.colors.textSecondary) }.frame(maxWidth: .infinity) }
    }
}

// MARK: - Marketplace View

struct MarketplaceView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.md) {
                SectionHeader(title: "Start a Business", symbol: "briefcase.fill")
                ForEach(GameMockData.businesses, id: \.id) { business in
                    let owned = game.ownedBusinesses.contains { $0.id == business.id }
                    let canAfford = game.bankBalance >= business.initialCost
                    let eligible = game.creditScores.composite >= business.minCreditScore
                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            HStack {
                                Image(systemName: business.type.symbol).font(.system(size: 22)).foregroundStyle(Color(hex: "#F59E0B")).frame(width: 48, height: 48).background(Color(hex: "#F59E0B").opacity(0.12)).clipShape(.rect(cornerRadius: Radius.md))
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(business.name).font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                                    Text(business.type.label).font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                                }
                                Spacer()
                                if owned { BadgeView(text: "Owned", variant: .success, symbol: "checkmark.seal.fill") }
                            }
                            Text(business.description).font(.system(size: 13)).foregroundStyle(colors.textLight).lineLimit(2)
                            HStack(spacing: Spacing.lg) {
                                VStack { Text(Format.compactCurrency(business.initialCost)).font(.system(size: 16, weight: .bold)).foregroundStyle(colors.primary); Text("Startup Cost").font(.system(size: 11)).foregroundStyle(colors.textSecondary) }
                                VStack { Text(Format.compactCurrency(business.monthlyRevenue)).font(.system(size: 16, weight: .bold)).foregroundStyle(Color(hex: "#10B981")); Text("Revenue/mo").font(.system(size: 11)).foregroundStyle(colors.textSecondary) }
                                VStack { Text(Format.compactCurrency(business.monthlyExpenses)).font(.system(size: 16, weight: .bold)).foregroundStyle(Color(hex: "#EF4444")); Text("Expenses/mo").font(.system(size: 11)).foregroundStyle(colors.textSecondary) }
                            }
                            if !owned {
                                HStack { Image(systemName: "chart.line.uptrend.xyaxis").font(.system(size: 12)); Text("Min credit: \(business.minCreditScore)").font(.system(size: 12)).foregroundStyle(eligible ? Color(hex: "#10B981") : Color(hex: "#EF4444")) }
                                Button {
                                    if canAfford && eligible { game.startBusiness(business); Haptics.success() } else { Haptics.error() }
                                } label: {
                                    Text(!eligible ? "Credit Score Too Low" : !canAfford ? "Insufficient Funds" : "Start Business")
                                        .font(.system(size: 14, weight: .bold)).foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 12)
                                        .background(canAfford && eligible ? colors.primary : colors.textLight).clipShape(.rect(cornerRadius: Radius.md))
                                }.buttonStyle(PressableButtonStyle()).disabled(!canAfford || !eligible)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Marketplace")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Tutorial View

struct TutorialView: View {
    @Environment(ThemeManager.self) private var theme

    private let steps: [(symbol: String, title: String, description: String, color: Color)] = [
        ("rocket.fill", "Welcome", "Credit Life Simulator is a game where you learn real-world financial skills by living a virtual financial life.", Color(hex: "#3B82F6")),
        ("briefcase.fill", "Get a Job", "Start at the Career Center. Entry-level jobs require no experience. As your skills grow, better-paying jobs unlock.", Color(hex: "#10B981")),
        ("creditcard.fill", "Build Credit", "Visit the Bank to apply for credit cards and loans. Make payments on time to increase your score.", Color(hex: "#8B5CF6")),
        ("piggybank.fill", "Manage Budget", "Track your expenses in the Budget Manager. Keep credit utilization below 30% for optimal score growth.", Color(hex: "#6366F1")),
        ("graduationcap.fill", "Get Educated", "Enroll in degree programs at the Education Center to unlock higher-paying career opportunities.", Color(hex: "#10B981")),
        ("building.2.fill", "Invest", "Buy real estate and start businesses to build wealth. Your net worth is the key metric for winning.", Color(hex: "#0EA5E9")),
        ("cpu.fill", "AI Agent", "Use the Run Simulator to let your AI agent manage finances automatically and learn from its decisions.", Color(hex: "#2563EB")),
        ("target", "Win", "Achieve an 850 credit score, own properties, build businesses, and reach $100,000+ net worth!", Color(hex: "#F59E0B")),
    ]

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.md) {
                ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                    CardView {
                        HStack(alignment: .top, spacing: Spacing.md) {
                            Image(systemName: step.symbol).font(.system(size: 20, weight: .semibold)).foregroundStyle(.white).frame(width: 48, height: 48).background(step.color).clipShape(.rect(cornerRadius: Radius.md))
                            VStack(alignment: .leading, spacing: 4) {
                                HStack { Text("Step \(index + 1)").font(.system(size: 11, weight: .bold)).foregroundStyle(step.color); Text(step.title).font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text) }
                                Text(step.description).font(.system(size: 14)).foregroundStyle(colors.textSecondary)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Full Tutorial")
        .navigationBarTitleDisplayMode(.inline)
    }
}
