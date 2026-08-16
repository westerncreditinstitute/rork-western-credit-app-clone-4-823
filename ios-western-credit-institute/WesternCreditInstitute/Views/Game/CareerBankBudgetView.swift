//
//  CareerView.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Career Center — browse and apply for jobs with education & credit requirements.
struct CareerView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game

    @State private var selectedTier = "all"
    @State private var showQualifiedOnly = false
    @State private var showApplyAlert = false
    @State private var pendingJob: Job?
    @State private var alertTitle = ""
    @State private var alertMessage = ""

    private let tiers = [
        ("all", "All Jobs"), ("entry", "Entry Level"), ("mid", "Mid Level"),
        ("senior", "Senior"), ("executive", "Executive")
    ]

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.md) {
                // Start A Business banner
                NavigationLink(value: GameRoute.marketplace) {
                    HStack(spacing: Spacing.md) {
                        Image(systemName: "building.2.fill")
                            .font(.system(size: 22))
                            .foregroundStyle(Color(hex: "#10B981"))
                            .frame(width: 48, height: 48)
                            .background(Color(hex: "#10B981").opacity(0.12))
                            .clipShape(.rect(cornerRadius: Radius.md))
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Start A Business").font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                            Text(game.ownedBusinesses.isEmpty ? "Become an entrepreneur today" : "You own \(game.ownedBusinesses.count) business\(game.ownedBusinesses.count > 1 ? "es" : "")")
                                .font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right").font(.system(size: 16)).foregroundStyle(colors.textSecondary)
                    }
                    .padding(Spacing.md)
                    .background(Color(hex: "#10B981").opacity(0.08))
                    .clipShape(.rect(cornerRadius: Radius.lg))
                }
                .buttonStyle(PressableButtonStyle())

                // Current job card
                if let job = game.currentJob {
                    currentJobCard(job: job, colors: colors)
                }

                // Tier filters
                ScrollView(.horizontal) { HStack(spacing: Spacing.sm) {
                    ForEach(tiers, id: \.0) { id, label in
                        Button { Haptics.light(); selectedTier = id } label: {
                            Text(label).font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(selectedTier == id ? .white : colors.text)
                                .padding(.horizontal, Spacing.md).padding(.vertical, 10)
                                .background(selectedTier == id ? colors.primary : colors.surface)
                                .clipShape(.capsule)
                        }
                        .buttonStyle(PressableButtonStyle())
                    }
                }}
                .scrollIndicators(.hidden)

                // Qualified only toggle
                Button { Haptics.light(); showQualifiedOnly.toggle() } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "line.3.horizontal.decrease.circle.fill").font(.system(size: 14))
                        Text("Qualified Only").font(.system(size: 14, weight: .semibold))
                    }
                    .foregroundStyle(showQualifiedOnly ? .white : colors.text)
                    .padding(.horizontal, Spacing.md).padding(.vertical, 10)
                    .background(showQualifiedOnly ? Color(hex: "#10B981") : colors.surface)
                    .clipShape(.capsule)
                }
                .buttonStyle(PressableButtonStyle())

                // Jobs list
                ForEach(filteredJobs, id: \.id) { job in
                    jobCard(job: job, colors: colors)
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Career Center")
        .navigationBarTitleDisplayMode(.inline)
        .alert(alertTitle, isPresented: $showApplyAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Apply") { applyForJob(pendingJob!) }
        } message: { Text(alertMessage) }
    }

    private var filteredJobs: [Job] {
        var jobs = GameMockData.jobs
        if selectedTier != "all" { jobs = jobs.filter { $0.tier == selectedTier } }
        if showQualifiedOnly { jobs = jobs.filter { canApply($0).eligible } }
        return jobs
    }

    private func canApply(_ job: Job) -> (eligible: Bool, reason: String?) {
        let experience = game.currentJob?.experienceMonths ?? 0
        if job.requirements.minExperience > experience {
            return (false, "Requires \(job.requirements.minExperience) months experience")
        }
        if let minScore = job.requirements.minCreditScore, game.creditScores.composite < minScore {
            return (false, "Requires \(minScore) credit score")
        }
        if let degree = job.requirements.requiredDegree {
            let has = game.completedDegrees.contains { $0.degreeType.rawValue >= degree }
            if !has { return (false, "Requires \(degree.capitalized) degree") }
        }
        return (true, nil)
    }

    private func tierColor(_ tier: String) -> Color {
        switch tier {
        case "entry": Color(hex: "#10B981")
        case "mid": Color(hex: "#3B82F6")
        case "senior": Color(hex: "#8B5CF6")
        case "executive": Color(hex: "#F59E0B")
        default: theme.colors.textSecondary
        }
    }

    private func currentJobCard(job: PlayerJob, colors: AppTheme) -> some View {
        CardView(padding: Spacing.lg) {
            VStack(spacing: Spacing.md) {
                HStack(spacing: Spacing.md) {
                    Image(systemName: "briefcase.fill").font(.system(size: 22)).foregroundStyle(Color(hex: "#10B981"))
                        .frame(width: 56, height: 56).background(Color(hex: "#10B981").opacity(0.12)).clipShape(.rect(cornerRadius: Radius.md))
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Current Position").font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                        Text(job.job.title).font(.system(size: 18, weight: .bold)).foregroundStyle(colors.text)
                        Text(job.job.company).font(.system(size: 14)).foregroundStyle(colors.textSecondary)
                    }
                    Spacer()
                }
                HStack(spacing: Spacing.lg) {
                    HStack(spacing: 6) { Image(systemName: "dollarsign.circle.fill").foregroundStyle(Color(hex: "#10B981")); Text(Format.compactCurrency(job.currentSalary) + "/yr").font(.system(size: 14, weight: .semibold)) }
                    HStack(spacing: 6) { Image(systemName: "clock.fill").foregroundStyle(Color(hex: "#3B82F6")); Text("\(job.experienceMonths) months").font(.system(size: 14, weight: .semibold)) }
                    HStack(spacing: 6) { Image(systemName: "star.fill").foregroundStyle(Color(hex: "#F59E0B")); Text("\(job.performanceRating)/5").font(.system(size: 14, weight: .semibold)) }
                    Spacer()
                }
            }
        }
    }

    private func jobCard(job: Job, colors: AppTheme) -> some View {
        let eligibility = canApply(job)
        let isCurrent = game.currentJob?.job.id == job.id
        let tierColor = tierColor(job.tier)

        return CardView(padding: Spacing.lg) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Text(job.tier.uppercased()).font(.system(size: 11, weight: .bold)).foregroundStyle(tierColor)
                        .padding(.horizontal, 10).padding(.vertical, 4).background(tierColor.opacity(0.15)).clipShape(.rect(cornerRadius: Radius.sm))
                    Spacer()
                    if isCurrent {
                        BadgeView(text: "Current", variant: .success, symbol: "checkmark.circle.fill")
                    } else if eligibility.eligible {
                        BadgeView(text: "Qualified", variant: .success, symbol: "checkmark.circle.fill")
                    } else {
                        BadgeView(text: "Locked", variant: .error, symbol: "lock.fill")
                    }
                }

                Text(job.title).font(.system(size: 18, weight: .bold)).foregroundStyle(colors.text)
                Text(job.company).font(.system(size: 14)).foregroundStyle(colors.textSecondary)
                Text(job.description).font(.system(size: 13)).foregroundStyle(colors.textLight).lineLimit(2)

                HStack(spacing: Spacing.sm) {
                    Image(systemName: "dollarsign.circle.fill").foregroundStyle(Color(hex: "#10B981"))
                    Text(Format.compactCurrency(job.baseSalary) + "/year").font(.system(size: 18, weight: .bold)).foregroundStyle(Color(hex: "#10B981"))
                    if let commission = job.commission {
                        Text("+ up to \(Format.compactCurrency(commission)) commission").font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                    }
                }

                // Benefits
                HStack(spacing: Spacing.sm) {
                    if job.benefits.healthInsurance { benefitChip("Health") }
                    if job.benefits.retirement401k { benefitChip("401k \(Int(job.benefits.retirementMatch))%") }
                    if job.benefits.paidTimeOff > 0 { benefitChip("\(job.benefits.paidTimeOff) PTO") }
                }

                // Requirements
                if let degree = job.requirements.requiredDegree {
                    HStack(spacing: 6) {
                        Image(systemName: "graduationcap.fill").font(.system(size: 12)).foregroundStyle(eligibility.eligible ? Color(hex: "#10B981") : Color(hex: "#EF4444"))
                        Text("\(degree.capitalized) degree required").font(.system(size: 12)).foregroundStyle(eligibility.eligible ? Color(hex: "#10B981") : Color(hex: "#EF4444"))
                    }
                }
                if job.requirements.minExperience > 0 {
                    HStack(spacing: 6) {
                        Image(systemName: "clock.fill").font(.system(size: 12)).foregroundStyle(colors.textLight)
                        Text("\(job.requirements.minExperience) months experience").font(.system(size: 12)).foregroundStyle(colors.textLight)
                    }
                }
                if let minScore = job.requirements.minCreditScore {
                    HStack(spacing: 6) {
                        Image(systemName: "chart.line.uptrend.xyaxis").font(.system(size: 12)).foregroundStyle(colors.textLight)
                        Text("\(minScore) credit score required").font(.system(size: 12)).foregroundStyle(colors.textLight)
                    }
                }

                Button {
                    if eligibility.eligible && !isCurrent {
                        pendingJob = job
                        alertTitle = "Apply for Position"
                        alertMessage = "Apply for \(job.title) at \(job.company)?\n\nSalary: \(Format.compactCurrency(job.baseSalary))/year"
                        showApplyAlert = true
                    }
                } label: {
                    HStack(spacing: Spacing.sm) {
                        if !eligibility.eligible {
                            Image(systemName: "lock.fill").font(.system(size: 14))
                            Text(eligibility.reason ?? "Not eligible").font(.system(size: 14, weight: .semibold))
                        } else if isCurrent {
                            Image(systemName: "checkmark.circle.fill").font(.system(size: 14))
                            Text("Current Position").font(.system(size: 14, weight: .semibold))
                        } else {
                            Image(systemName: "award.fill").font(.system(size: 14))
                            Text("Apply Now").font(.system(size: 14, weight: .bold))
                        }
                    }
                    .foregroundStyle(eligibility.eligible && !isCurrent ? .white : colors.textLight)
                    .frame(maxWidth: .infinity).padding(.vertical, 14)
                    .background(eligibility.eligible && !isCurrent ? colors.primary : colors.surfaceAlt)
                    .clipShape(.rect(cornerRadius: Radius.md))
                }
                .buttonStyle(PressableButtonStyle())
                .disabled(!eligibility.eligible || isCurrent)
            }
        }
    }

    private func benefitChip(_ text: String) -> some View {
        Text(text).font(.system(size: 11, weight: .medium)).foregroundStyle(theme.colors.textSecondary)
            .padding(.horizontal, 10).padding(.vertical, 4)
            .background(theme.colors.surfaceAlt).clipShape(.rect(cornerRadius: Radius.sm))
    }

    private func applyForJob(_ job: Job) {
        let successRate = 0.7 + (Double(game.creditScores.composite) / 850.0) * 0.3
        let hired = Double.random(in: 0...1) < successRate
        if hired {
            let newJob = PlayerJob(
                job: job, startDate: game.currentDate,
                experienceMonths: game.currentJob?.experienceMonths ?? 0,
                performanceRating: 3, currentSalary: job.baseSalary
            )
            game.setCurrentJob(newJob)
            Haptics.success()
            alertTitle = "Congratulations!"
            alertMessage = "You've been hired as \(job.title) at \(job.company)!"
        } else {
            Haptics.error()
            alertTitle = "Application Unsuccessful"
            alertMessage = "Unfortunately, you were not selected for this position. Keep trying!"
        }
        showApplyAlert = true
    }
}

// MARK: - Bank View

struct BankView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game

    @State private var showAccounts = true
    @State private var selectedProduct: FinancialProduct?
    @State private var selectedInstitution: FinancialInstitution?
    @State private var loanAmount = ""
    @State private var loanTerm: Int?

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.md) {
                HStack(spacing: Spacing.sm) {
                    Button { showAccounts = true } label: {
                        Text("My Accounts").font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(showAccounts ? .white : colors.text)
                            .frame(maxWidth: .infinity).padding(.vertical, 12)
                            .background(showAccounts ? colors.primary : colors.surface)
                            .clipShape(.rect(cornerRadius: Radius.md))
                    }.buttonStyle(PressableButtonStyle())
                    Button { showAccounts = false } label: {
                        Text("Apply").font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(!showAccounts ? .white : colors.text)
                            .frame(maxWidth: .infinity).padding(.vertical, 12)
                            .background(!showAccounts ? colors.primary : colors.surface)
                            .clipShape(.rect(cornerRadius: Radius.md))
                    }.buttonStyle(PressableButtonStyle())
                }

                if showAccounts {
                    bankAccountsSection(colors: colors)
                    creditAccountsSection(colors: colors)
                } else {
                    productsSection(colors: colors)
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Financial Center")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $selectedProduct) { product in
            if let inst = selectedInstitution { ApplyForCreditSheet(product: product, institution: inst, loanAmount: $loanAmount, loanTerm: $loanTerm) }
        }
    }

    private func bankAccountsSection(colors: AppTheme) -> some View {
        VStack(spacing: Spacing.sm) {
            SectionHeader(title: "Bank Accounts", symbol: "building.fill")
            accountCard("Checking Account", "Primary Account", game.bankBalance, "wallet.pass.fill", Color(hex: "#10B981"), colors)
            accountCard("Savings Account", "High Yield Savings", game.savingsBalance, "piggybank.fill", Color(hex: "#3B82F6"), colors)
            if game.emergencyFund > 0 {
                accountCard("Emergency Fund", "Reserved Savings", game.emergencyFund, "shield.fill", Color(hex: "#F59E0B"), colors)
            }
        }
    }

    private func accountCard(_ name: String, _ subtitle: String, _ balance: Double, _ symbol: String, _ color: Color, _ colors: AppTheme) -> some View {
        CardView {
            HStack(spacing: Spacing.md) {
                Image(systemName: symbol).font(.system(size: 20)).foregroundStyle(color)
                    .frame(width: 48, height: 48).background(color.opacity(0.12)).clipShape(.rect(cornerRadius: Radius.md))
                VStack(alignment: .leading, spacing: 2) {
                    Text(name).font(.system(size: 16, weight: .semibold)).foregroundStyle(colors.text)
                    Text(subtitle).font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                }
                Spacer()
                Text(Format.currency(balance)).font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
            }
        }
    }

    private func creditAccountsSection(colors: AppTheme) -> some View {
        VStack(spacing: Spacing.sm) {
            SectionHeader(title: "Credit Accounts", symbol: "creditcard.fill")
            if game.creditAccounts.isEmpty {
                EmptyStateView(symbol: "creditcard", title: "No Credit Accounts", message: "Apply for a credit card or loan to start building credit.")
            } else {
                ForEach(game.creditAccounts, id: \.id) { account in
                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            HStack {
                                Image(systemName: productSymbol(account.type)).foregroundStyle(productColor(account.type))
                                    .frame(width: 48, height: 48).background(productColor(account.type).opacity(0.12)).clipShape(.rect(cornerRadius: Radius.md))
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(account.institutionName).font(.system(size: 16, weight: .semibold)).foregroundStyle(colors.text)
                                    Text(account.type.rawValue.replacingOccurrences(of: "_", with: " ").capitalized).font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                                }
                                Spacer()
                                BadgeView(text: account.status == .current ? "Current" : "Late", variant: account.status == .current ? .success : .error)
                            }
                            detailRow("Balance", Format.currency(account.balance))
                            detailRow(account.type == .creditCard ? "Credit Limit" : "Original Amount", Format.currency(account.creditLimit))
                            detailRow("APR", String(format: "%.1f%%", account.apr))
                            if account.balance > 0 {
                                Button { game.makePayment(accountId: account.id, amount: account.minimumPayment) ; Haptics.light() } label: {
                                    HStack(spacing: 6) { Image(systemName: "dollarsign.circle.fill").font(.system(size: 14)); Text("Make Payment").font(.system(size: 15, weight: .semibold)) }
                                        .foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 14)
                                        .background(colors.primary).clipShape(.rect(cornerRadius: Radius.md))
                                }.buttonStyle(PressableButtonStyle()).padding(.top, Spacing.sm)
                            }
                        }
                    }
                }
            }
        }
    }

    private func productsSection(colors: AppTheme) -> some View {
        VStack(spacing: Spacing.md) {
            ForEach(GameMockData.institutions, id: \.id) { inst in
                CardView {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        HStack(spacing: Spacing.md) {
                            Text(inst.logo).font(.system(size: 28))
                            VStack(alignment: .leading, spacing: 2) {
                                Text(inst.name).font(.system(size: 17, weight: .bold)).foregroundStyle(colors.text)
                                Text(inst.type.replacingOccurrences(of: "_", with: " ").capitalized).font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                            }
                        }
                        ForEach(inst.products, id: \.id) { product in
                            let eligible = game.creditScores.composite >= product.minCreditScore
                            Button {
                                if eligible {
                                    selectedInstitution = inst; selectedProduct = product; Haptics.light()
                                }
                            } label: {
                                HStack(spacing: Spacing.md) {
                                    Image(systemName: productSymbol(product.type)).font(.system(size: 16)).foregroundStyle(productColor(product.type))
                                        .frame(width: 40, height: 40).background(productColor(product.type).opacity(0.12)).clipShape(.rect(cornerRadius: Radius.sm))
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(product.name).font(.system(size: 15, weight: .semibold)).foregroundStyle(colors.text)
                                        Text(String(format: "%.1f%% - %.1f%% APR", product.baseApr, product.maxApr)).font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                                        if let rewards = product.rewards { Text(rewards).font(.system(size: 11)).foregroundStyle(productColor(product.type)).lineLimit(1) }
                                    }
                                    Spacer()
                                    if eligible {
                                        Image(systemName: "chevron.right").font(.system(size: 16)).foregroundStyle(colors.textLight)
                                    } else {
                                        Text("\(product.minCreditScore)+").font(.system(size: 11, weight: .bold)).foregroundStyle(Color(hex: "#EF4444"))
                                            .padding(.horizontal, 8).padding(.vertical, 4).background(Color(hex: "#EF4444").opacity(0.12)).clipShape(.rect(cornerRadius: 6))
                                    }
                                }
                            }.buttonStyle(PressableButtonStyle()).disabled(!eligible)
                        }
                    }
                }
            }
        }
    }

    private func detailRow(_ label: String, _ value: String) -> some View {
        HStack { Text(label).font(.system(size: 14)).foregroundStyle(theme.colors.textSecondary); Spacer(); Text(value).font(.system(size: 14, weight: .semibold)).foregroundStyle(theme.colors.text) }
    }

    private func productSymbol(_ type: CreditAccountType) -> String {
        switch type { case .creditCard: "creditcard.fill"; case .autoLoan: "car.fill"; case .mortgage: "house.fill"; case .personalLoan: "dollarsign.circle.fill" }
    }
    private func productColor(_ type: CreditAccountType) -> Color {
        switch type { case .creditCard: Color(hex: "#3B82F6"); case .autoLoan: Color(hex: "#10B981"); case .mortgage: Color(hex: "#8B5CF6"); case .personalLoan: Color(hex: "#F59E0B") }
    }
}

private struct ApplyForCreditSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game
    let product: FinancialProduct
    let institution: FinancialInstitution
    @Binding var loanAmount: String
    @Binding var loanTerm: Int?
    @Environment(\.dismiss) private var dismiss
    @State private var showSuccess = false
    @State private var successMessage = ""

    var body: some View {
        let colors = theme.colors
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    Text(product.name).font(.system(size: 18, weight: .bold)).foregroundStyle(colors.text)
                    Text(institution.name).font(.system(size: 14)).foregroundStyle(colors.textSecondary)

                    if product.isSecured, let deposit = product.securityDeposit {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            HStack { Image(systemName: "shield.fill").foregroundStyle(Color(hex: "#059669")); Text("Secured Credit Card").font(.system(size: 16, weight: .bold)).foregroundStyle(Color(hex: "#059669")) }
                            Text("This card requires a refundable security deposit of \(Format.currency(deposit)) which becomes your credit limit. Perfect for building credit with no credit history!")
                                .font(.system(size: 14)).foregroundStyle(colors.text)
                        }.padding(Spacing.md).background(Color(hex: "#059669").opacity(0.08)).clipShape(.rect(cornerRadius: Radius.md))
                    }

                    HStack { Image(systemName: "percent").foregroundStyle(colors.primary); Text("Estimated APR:"); Spacer(); Text(String(format: "%.1f%%", estimatedApr())).font(.system(size: 18, weight: .bold)).foregroundStyle(colors.primary) }
                        .padding(Spacing.md).background(colors.surface).clipShape(.rect(cornerRadius: Radius.md))

                    if product.type != .creditCard {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text("Loan Amount").font(.system(size: 14, weight: .semibold))
                            TextField("0", text: $loanAmount).keyboardType(.decimalPad)
                                .padding(14).background(colors.surfaceAlt).clipShape(.rect(cornerRadius: Radius.md))
                                .foregroundStyle(colors.text)
                            if let terms = product.termMonths {
                                Text("Term (months)").font(.system(size: 14, weight: .semibold))
                                HStack(spacing: Spacing.sm) { ForEach(terms, id: \.self) { term in
                                    Button { loanTerm = term; Haptics.light() } label: {
                                        Text("\(term)").font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(loanTerm == term ? .white : colors.text)
                                            .padding(.horizontal, 16).padding(.vertical, 10)
                                            .background(loanTerm == term ? colors.primary : colors.surfaceAlt).clipShape(.rect(cornerRadius: Radius.md))
                                    }.buttonStyle(PressableButtonStyle())
                                }}
                            }
                        }
                    }

                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(Color(hex: "#F59E0B"))
                        Text("Applying will result in a hard inquiry, which may temporarily lower your score.").font(.system(size: 13)).foregroundStyle(colors.text)
                    }.padding(Spacing.md).background(Color(hex: "#F59E0B").opacity(0.08)).clipShape(.rect(cornerRadius: Radius.md))

                    Button {
                        Haptics.medium()
                        submitApplication()
                    } label: {
                        HStack(spacing: Spacing.sm) { Image(systemName: "checkmark.circle.fill").font(.system(size: 18)); Text("Submit Application").font(.system(size: 16, weight: .bold)) }
                            .foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 16)
                            .background(colors.primary).clipShape(.rect(cornerRadius: Radius.md))
                    }.buttonStyle(PressableButtonStyle())
                }
                .padding(Spacing.lg)
            }
            .background(colors.background)
            .navigationTitle("Apply for Credit")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Close") { dismiss() } } }
            .alert("Congratulations!", isPresented: $showSuccess) {
                Button("OK") { dismiss() }
            } message: { Text(successMessage) }
        }
    }

    private func estimatedApr() -> Double {
        let range = product.maxApr - product.baseApr
        let scoreRatio = Double(min(max(game.creditScores.composite - 300, 0), 550)) / 550.0
        return product.baseApr + range * (1 - scoreRatio)
    }

    private func submitApplication() {
        let apr = estimatedApr()
        let limit: Double
        let balance: Double
        let minPay: Double
        if product.type == .creditCard {
            if product.isSecured, let deposit = product.securityDeposit {
                limit = deposit; game.updateBalance(-deposit, account: "bank")
            } else {
                limit = Double((game.creditScores.composite - 300)) / 550 * 10000 + 500
            }
            balance = 0; minPay = 25
        } else {
            let amount = Double(loanAmount) ?? 10000
            let term = Double(loanTerm ?? product.termMonths?.first ?? 36)
            limit = amount; balance = amount
            let monthlyRate = apr / 100 / 12
            minPay = monthlyRate > 0 ? amount * monthlyRate / (1 - pow(1 + monthlyRate, -term)) : amount / term
            game.updateBalance(amount, account: "bank")
        }
        let account = CreditAccount(
            id: UUID().uuidString, type: product.type,
            institutionId: institution.id, institutionName: institution.name,
            balance: balance, creditLimit: limit, apr: apr, minimumPayment: minPay,
            openedDate: game.currentDate, lastPaymentDate: game.currentDate, status: .current
        )
        game.addCreditAccount(account)
        game.addHardInquiry(HardInquiry(id: UUID().uuidString, institutionName: institution.name, date: game.currentDate, type: product.type))
        Haptics.success()
        successMessage = "Your \(product.name) has been approved!\n\n\(product.type == .creditCard ? "Credit Limit" : "Loan Amount"): \(Format.currency(limit))\nAPR: \(String(format: "%.1f%%", apr))"
        showSuccess = true
    }
}

// MARK: - Budget View

struct BudgetView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game

    var body: some View {
        let colors = theme.colors
        let netIncome = game.monthlyIncome - game.totalMonthlyExpenses
        ScrollView {
            VStack(spacing: Spacing.md) {
                // Summary
                CardView {
                    HStack {
                        VStack(spacing: 4) {
                            Image(systemName: "trending.up").foregroundStyle(Color(hex: "#10B981"))
                            Text("Income").font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                            Text(Format.compactCurrency(game.monthlyIncome)).font(.system(size: 16, weight: .bold)).foregroundStyle(Color(hex: "#10B981"))
                        }.frame(maxWidth: .infinity)
                        VStack(spacing: 4) {
                            Image(systemName: "trending.down").foregroundStyle(Color(hex: "#EF4444"))
                            Text("Expenses").font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                            Text(Format.compactCurrency(game.totalMonthlyExpenses)).font(.system(size: 16, weight: .bold)).foregroundStyle(Color(hex: "#EF4444"))
                        }.frame(maxWidth: .infinity)
                        VStack(spacing: 4) {
                            Image(systemName: "dollarsign.circle.fill").foregroundStyle(netIncome >= 0 ? Color(hex: "#10B981") : Color(hex: "#EF4444"))
                            Text("Net").font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                            Text("\(netIncome >= 0 ? "+" : "")\(Format.compactCurrency(netIncome))").font(.system(size: 16, weight: .bold)).foregroundStyle(netIncome >= 0 ? Color(hex: "#10B981") : Color(hex: "#EF4444"))
                        }.frame(maxWidth: .infinity)
                    }
                }

                // Balances
                CardView {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Account Balances").font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                        balanceRow("Bank Account", game.bankBalance, "dollarsign.circle.fill", Color(hex: "#3B82F6"))
                        balanceRow("Savings", game.savingsBalance, "piggybank.fill", Color(hex: "#10B981"))
                        balanceRow("Emergency Fund", game.emergencyFund, "shield.fill", Color(hex: "#F59E0B"))
                    }
                }

                // Expenses by category
                SectionHeader(title: "Monthly Expenses", symbol: "list.bullet.rectangle.fill")
                ForEach(expenseCategories, id: \.self) { category in
                    if let items = expensesByCategory[category], !items.isEmpty {
                        CardView {
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                HStack {
                                    Image(systemName: category.symbol).foregroundStyle(category.color).frame(width: 36, height: 36).background(category.color.opacity(0.12)).clipShape(.rect(cornerRadius: Radius.md))
                                    Text(category.label).font(.system(size: 16, weight: .semibold)).foregroundStyle(colors.text)
                                    Spacer()
                                    Text(Format.compactCurrency(categoryTotal(items))).font(.system(size: 16, weight: .bold)).foregroundStyle(category.color)
                                }
                                ForEach(items, id: \.id) { expense in
                                    HStack {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(expense.name).font(.system(size: 14, weight: .medium)).foregroundStyle(colors.text)
                                            Text("\(expense.frequency.rawValue) • \(expense.isFixed ? "Fixed" : "Variable")").font(.system(size: 11)).foregroundStyle(colors.textLight)
                                        }
                                        Spacer()
                                        Text(Format.compactCurrency(monthlyAmount(expense))).font(.system(size: 14, weight: .semibold)).foregroundStyle(colors.text)
                                    }.padding(.vertical, Spacing.xs)
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
        .navigationTitle("Budget Manager")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var expenseCategories: [ExpenseCategory] { ExpenseCategory.allCases.filter { expensesByCategory[$0] != nil } }
    private var expensesByCategory: [ExpenseCategory: [Expense]] {
        Dictionary(grouping: game.expenses, by: \.category)
    }
    private func categoryTotal(_ items: [Expense]) -> Double { items.reduce(0) { $0 + monthlyAmount($1) } }
    private func monthlyAmount(_ expense: Expense) -> Double {
        var amount = expense.amount
        if expense.frequency == .weekly { amount *= 4 }
        if expense.frequency == .annual { amount /= 12 }
        return amount
    }
    private func balanceRow(_ label: String, _ value: Double, _ symbol: String, _ color: Color) -> some View {
        HStack {
            Image(systemName: symbol).foregroundStyle(color).frame(width: 36, height: 36).background(color.opacity(0.12)).clipShape(.circle)
            Text(label).font(.system(size: 14)).foregroundStyle(theme.colors.textSecondary)
            Spacer()
            Text(Format.currency(value)).font(.system(size: 16, weight: .bold)).foregroundStyle(theme.colors.text)
        }
    }
}
