//
//  GameStore.swift
//  WesternCreditInstitute
//

import Foundation
import SwiftUI

/// Central game state for the Credit Life Simulator.
/// Mirrors the Expo GameContext, BudgetContext, EducationContext, and token wallet state.
@Observable
final class GameStore {
    private enum Keys {
        static let gameState = "wci.game.state"
        static let walletUnlocked = "wci.wallet.unlocked"
    }

    // MARK: - Core State

    var creditScores: CreditScores = CreditScores()
    var bankBalance: Double = 5000
    var savingsBalance: Double = 1000
    var emergencyFund: Double = 0
    var monthlyIncome: Double = 2500
    var currentDate: Date = Calendar.current.date(from: DateComponents(year: 2025, month: 1, day: 1))!
    var monthsPlayed: Int = 0
    var currentJob: PlayerJob?
    var creditAccounts: [CreditAccount] = []
    var hardInquiries: [HardInquiry] = []
    var expenses: [Expense] = GameMockData.defaultExpenses
    var achievements: [Achievement] = GameMockData.achievements
    var tokenWallet: MusoToken = MusoToken()
    var tokenTransactions: [TokenTransaction] = []
    var monthlyReports: [MonthlyReport] = []
    var ownedProperties: [Property] = []
    var ownedBusinesses: [Business] = []
    var enrollments: [Enrollment] = []
    var completedDegrees: [CompletedDegree] = []
    var incidents: [FinancialIncident] = []
    var isBankrupt: Bool = false
    var huntStreak: Int = 0

    // Wallet unlock
    var isWalletUnlocked: Bool {
        didSet { UserDefaults.standard.set(isWalletUnlocked, forKey: Keys.walletUnlocked) }
    }

    // Simulator state
    var agentTasks: [AgentTask] = GameMockData.agentTasks
    var primaryGoal: AgentPriority = .creditScore
    var simulationSpeed: SimulationSpeed = .normal
    var debtStrategy: String = "avalanche"
    var autoPayBills = true
    var autoInvest = false
    var isRunning = false
    var isPaused = false
    var currentMonth: Int = 0
    var totalMonths: Int = 1
    var logs: [SimulationLogEntry] = []
    var snapshots: [SimulationSnapshot] = []
    var simulationResult: SimulationResult?
    var lastSimulationTimestamp: Date?

    // Guide dismissed
    var guideDismissed: Bool {
        UserDefaults.standard.bool(forKey: "wci.game.guideDismissed")
    }

    // MARK: - Init

    init() {
        isWalletUnlocked = UserDefaults.standard.bool(forKey: Keys.walletUnlocked)
        loadState()
    }

    // MARK: - Computed

    var totalDebt: Double {
        creditAccounts.reduce(0) { $0 + $1.balance }
    }

    var totalMonthlyExpenses: Double {
        expenses.reduce(0) { total, expense in
            var amount = expense.amount
            if expense.frequency == .weekly { amount *= 4 }
            if expense.frequency == .annual { amount /= 12 }
            return total + amount
        }
    }

    var totalNetWorth: Double {
        bankBalance + savingsBalance + emergencyFund
            + ownedProperties.reduce(0) { $0 + $1.price }
            + ownedBusinesses.reduce(0) { $0 + $1.initialCost }
            - totalDebt
    }

    var creditUtilization: Double {
        let cards = creditAccounts.filter { $0.type == .creditCard }
        guard !cards.isEmpty else { return 0 }
        let totalBalance = cards.reduce(0) { $0 + $1.balance }
        let totalLimit = cards.reduce(0) { $0 + $1.creditLimit }
        guard totalLimit > 0 else { return 0 }
        return (totalBalance / totalLimit) * 100
    }

    var consecutiveOnTimePayments: Int = 3
    var unlockedAchievementCount: Int { achievements.filter(\.unlocked).count }
    var totalAchievementCount: Int { achievements.count }

    var tokenBalance: Double { tokenWallet.balance }

    // MARK: - State Persistence

    private func loadState() {
        guard let data = UserDefaults.standard.data(forKey: Keys.gameState),
              let decoded = try? JSONDecoder().decode(PersistedState.self, from: data) else { return }
        creditScores = decoded.creditScores
        bankBalance = decoded.bankBalance
        savingsBalance = decoded.savingsBalance
        emergencyFund = decoded.emergencyFund
        monthlyIncome = decoded.monthlyIncome
        currentDate = decoded.currentDate
        monthsPlayed = decoded.monthsPlayed
        creditAccounts = decoded.creditAccounts
        expenses = decoded.expenses
        consecutiveOnTimePayments = decoded.consecutiveOnTimePayments
        tokenWallet = decoded.tokenWallet
    }

    private func saveState() {
        let state = PersistedState(
            creditScores: creditScores,
            bankBalance: bankBalance,
            savingsBalance: savingsBalance,
            emergencyFund: emergencyFund,
            monthlyIncome: monthlyIncome,
            currentDate: currentDate,
            monthsPlayed: monthsPlayed,
            creditAccounts: creditAccounts,
            expenses: expenses,
            consecutiveOnTimePayments: consecutiveOnTimePayments,
            tokenWallet: tokenWallet
        )
        if let data = try? JSONEncoder().encode(state) {
            UserDefaults.standard.set(data, forKey: Keys.gameState)
        }
    }

    private struct PersistedState: Codable {
        var creditScores: CreditScores
        var bankBalance: Double
        var savingsBalance: Double
        var emergencyFund: Double
        var monthlyIncome: Double
        var currentDate: Date
        var monthsPlayed: Int
        var creditAccounts: [CreditAccount]
        var expenses: [Expense]
        var consecutiveOnTimePayments: Int
        var tokenWallet: MusoToken
    }

    // MARK: - Month Advancement

    struct AdvanceResult {
        let isBankrupt: Bool
        let report: MonthlyReport?
        let event: RandomEvent?
    }

    @discardableResult
    func advanceMonth() -> AdvanceResult {
        // Income
        let income = (currentJob?.currentSalary ?? monthlyIncome * 12) / 12
        bankBalance += income

        // Expenses
        let expenseTotal = totalMonthlyExpenses
        bankBalance -= expenseTotal

        // Credit account interest & minimum payments
        for i in creditAccounts.indices {
            let interest = creditAccounts[i].balance * (creditAccounts[i].apr / 100 / 12)
            creditAccounts[i].balance += interest
            if creditAccounts[i].balance > 0 {
                let payment = min(creditAccounts[i].minimumPayment, bankBalance)
                if payment > 0 {
                    creditAccounts[i].balance -= payment
                    bankBalance -= payment
                    creditAccounts[i].lastPaymentDate = currentDate
                    creditAccounts[i].status = .current
                } else {
                    creditAccounts[i].status = .late
                }
            }
        }

        // Savings interest
        let savingsInterest = savingsBalance * 0.045 / 12
        savingsBalance += savingsInterest

        // Token mint from income
        let tokensEarned = income * 0.1
        mintTokens(tokensEarned, reason: "Monthly income reward")

        // Credit score update
        var scoreChange = 0
        if creditUtilization < 30 { scoreChange += 3 }
        if creditUtilization > 50 { scoreChange -= 5 }
        if consecutiveOnTimePayments > 6 { scoreChange += 2 }

        creditScores.composite = max(300, min(850, creditScores.composite + scoreChange))
        creditScores.experian = max(300, min(850, creditScores.experian + scoreChange))
        creditScores.equifax = max(300, min(850, creditScores.equifax + scoreChange))
        creditScores.transunion = max(300, min(850, creditScores.transunion + scoreChange))

        // Advance date
        currentDate = Calendar.current.date(byAdding: .month, value: 1, to: currentDate) ?? currentDate
        monthsPlayed += 1
        if var job = currentJob { job.experienceMonths += 1; currentJob = job }

        // Check achievements
        checkAchievements()

        // Bankruptcy check
        if totalNetWorth < -150000 {
            resetGame()
            return AdvanceResult(isBankrupt: true, report: nil, event: nil)
        }

        // Random event (30% chance)
        let event: RandomEvent? = Double.random(in: 0...1) < 0.3
            ? GameMockData.randomEvents.randomElement() : nil
        if let event {
            bankBalance -= event.cost
            if let impact = event.creditImpact {
                creditScores.composite = max(300, min(850, creditScores.composite + impact))
            }
        }

        // Monthly report
        let report = MonthlyReport(
            id: UUID().uuidString,
            month: Calendar.current.component(.month, from: currentDate),
            year: Calendar.current.component(.year, from: currentDate),
            income: income,
            expenses: expenseTotal,
            savings: income - expenseTotal,
            creditScoreChange: scoreChange,
            highlights: generateHighlights(scoreChange: scoreChange),
            warnings: generateWarnings()
        )
        monthlyReports.append(report)

        saveState()
        return AdvanceResult(isBankrupt: false, report: report, event: event)
    }

    private func generateHighlights(scoreChange: Int) -> [String] {
        var highlights: [String] = []
        if scoreChange > 0 { highlights.append("Credit score increased by \(scoreChange) points") }
        if creditUtilization < 30 { highlights.append("Credit utilization is below 30%") }
        if savingsBalance > 5000 { highlights.append("Savings balance exceeded $5,000") }
        if consecutiveOnTimePayments > 6 { highlights.append("\(consecutiveOnTimePayments) consecutive on-time payments") }
        return highlights
    }

    private func generateWarnings() -> [String] {
        var warnings: [String] = []
        if creditUtilization > 50 { warnings.append("Credit utilization is above 50% — pay down balances") }
        if creditAccounts.contains(where: { $0.status == .late }) { warnings.append("Some accounts are past due") }
        if bankBalance < 1000 { warnings.append("Bank balance is running low") }
        return warnings
    }

    // MARK: - Reset

    func resetGame() {
        creditScores = CreditScores()
        bankBalance = 5000
        savingsBalance = 1000
        emergencyFund = 0
        monthlyIncome = 2500
        currentDate = Calendar.current.date(from: DateComponents(year: 2025, month: 1, day: 1))!
        monthsPlayed = 0
        currentJob = nil
        creditAccounts = []
        hardInquiries = []
        expenses = GameMockData.defaultExpenses
        achievements = GameMockData.achievements
        tokenWallet = MusoToken()
        tokenTransactions = []
        monthlyReports = []
        ownedProperties = []
        ownedBusinesses = []
        enrollments = []
        completedDegrees = []
        consecutiveOnTimePayments = 0
        isBankrupt = false
        saveState()
    }

    // MARK: - Career

    func setCurrentJob(_ job: PlayerJob) {
        currentJob = job
        monthlyIncome = job.currentSalary / 12
        saveState()
    }

    // MARK: - Bank / Credit

    func addCreditAccount(_ account: CreditAccount) {
        creditAccounts.append(account)
        saveState()
    }

    func addHardInquiry(_ inquiry: HardInquiry) {
        hardInquiries.append(inquiry)
        // Small score drop for hard inquiry
        creditScores.composite = max(300, creditScores.composite - 3)
        saveState()
    }

    func makePayment(accountId: String, amount: Double, _ onTime: Bool = true) {
        guard let index = creditAccounts.firstIndex(where: { $0.id == accountId }) else { return }
        creditAccounts[index].balance -= amount
        creditAccounts[index].lastPaymentDate = currentDate
        if onTime { consecutiveOnTimePayments += 1 }
        if creditAccounts[index].balance <= 0 { creditAccounts[index].status = .current }
        saveState()
    }

    func updateBalance(_ amount: Double, account: String) {
        switch account {
        case "bank": bankBalance += amount
        case "savings": savingsBalance += amount
        case "emergency": emergencyFund += amount
        default: break
        }
        saveState()
    }

    // MARK: - Budget

    func addExpense(_ expense: Expense) {
        expenses.append(expense)
        saveState()
    }

    func removeExpense(id: String) {
        expenses.removeAll { $0.id == id }
        saveState()
    }

    func updateExpenseAmount(id: String, amount: Double) {
        if let index = expenses.firstIndex(where: { $0.id == id }) {
            expenses[index].amount = amount
            saveState()
        }
    }

    // MARK: - Token Wallet

    func mintTokens(_ amount: Double, reason: String) {
        tokenWallet.balance += amount
        tokenWallet.totalMinted += amount
        let tx = TokenTransaction(
            id: UUID().uuidString, type: .mint, amount: amount,
            reason: reason, timestamp: Date(), balanceAfter: tokenWallet.balance
        )
        tokenTransactions.insert(tx, at: 0)
        saveState()
    }

    func burnTokens(_ amount: Double, reason: String) {
        tokenWallet.balance -= amount
        tokenWallet.totalBurned += amount
        let tx = TokenTransaction(
            id: UUID().uuidString, type: .burn, amount: amount,
            reason: reason, timestamp: Date(), balanceAfter: tokenWallet.balance
        )
        tokenTransactions.insert(tx, at: 0)
        saveState()
    }

    func syncTokensWithBalance() {
        let target = (bankBalance + savingsBalance) * 0.1
        let diff = target - tokenWallet.balance
        if diff > 0 {
            mintTokens(diff, reason: "Balance sync")
        } else if diff < 0 {
            burnTokens(-diff, reason: "Balance sync")
        }
    }

    // MARK: - Real Estate

    func buyProperty(_ property: Property) {
        guard bankBalance >= property.price else { return }
        bankBalance -= property.price
        var prop = property
        prop.owned = true
        ownedProperties.append(prop)
        checkAchievements()
        saveState()
    }

    // MARK: - Business

    func startBusiness(_ business: Business) {
        guard bankBalance >= business.initialCost else { return }
        bankBalance -= business.initialCost
        var biz = business
        biz.owned = true
        ownedBusinesses.append(biz)
        checkAchievements()
        saveState()
    }

    // MARK: - Education

    func enrollInDegree(_ degree: Degree) {
        let enrollment = Enrollment(
            id: UUID().uuidString, degreeId: degree.id,
            creditsEarned: 0, creditsRequired: degree.durationMonths,
            gpa: 3.0, monthsRemaining: degree.durationMonths
        )
        enrollments.append(enrollment)
        if bankBalance >= degree.tuition {
            bankBalance -= degree.tuition
        }
        saveState()
    }

    func advanceEducation() {
        for i in enrollments.indices {
            enrollments[i].monthsRemaining -= 1
            enrollments[i].creditsEarned += 1
            enrollments[i].gpa = min(4.0, enrollments[i].gpa + Double.random(in: -0.1...0.15))
            if enrollments[i].monthsRemaining <= 0 {
                let degree = GameMockData.degrees.first { $0.id == enrollments[i].degreeId }
                completedDegrees.append(CompletedDegree(
                    degreeId: enrollments[i].degreeId,
                    degreeType: degree?.degreeType ?? .certificate,
                    majorId: nil, finalGPA: enrollments[i].gpa
                ))
            }
        }
        enrollments.removeAll { $0.monthsRemaining <= 0 }
        checkAchievements()
        saveState()
    }

    var currentEnrollment: Enrollment? { enrollments.first }

    // MARK: - Achievements

    private func checkAchievements() {
        for i in achievements.indices {
            if achievements[i].unlocked { continue }
            let shouldUnlock: Bool
            switch achievements[i].id {
            case "ach_01": shouldUnlock = currentJob != nil
            case "ach_02": shouldUnlock = !creditAccounts.isEmpty
            case "ach_03": shouldUnlock = creditScores.composite >= 700
            case "ach_04": shouldUnlock = totalDebt == 0 && !creditAccounts.isEmpty
            case "ach_05": shouldUnlock = !ownedProperties.isEmpty
            case "ach_06": shouldUnlock = !ownedBusinesses.isEmpty
            case "ach_07": shouldUnlock = creditScores.composite >= 850
            case "ach_08": shouldUnlock = totalNetWorth >= 100000
            case "ach_09": shouldUnlock = !completedDegrees.isEmpty
            case "ach_10": shouldUnlock = ownedProperties.count >= 3
            default: shouldUnlock = false
            }
            if shouldUnlock {
                achievements[i].unlocked = true
                mintTokens(achievements[i].reward, reason: "Achievement: \(achievements[i].title)")
            }
        }
        saveState()
    }

    // MARK: - Financial Incidents

    func generateIncident() -> FinancialIncident? {
        guard let template = GameMockData.incidentTemplates.randomElement() else { return nil }
        var incident = template
        incident.id = UUID().uuidString
        incident.monthNumber = monthsPlayed + 1
        if let mitigation = incident.mitigationApplied {
            incident.savingsFromMitigation = incident.baseCost * mitigation.effectiveness
            incident.actualCost = incident.baseCost - incident.savingsFromMitigation
        }
        bankBalance -= incident.actualCost
        incidents.append(incident)
        saveState()
        return incident
    }

    func clearIncidents() {
        incidents.removeAll()
        saveState()
    }

    // MARK: - Simulator

    func runSimulation() {
        guard !isRunning else { return }
        isRunning = true
        isPaused = false
        currentMonth = 0
        totalMonths = 1
        logs.removeAll()
        snapshots.removeAll()
        simulationResult = nil

        let startSnapshot = SimulationSnapshot(
            month: 0, creditScore: creditScores.composite,
            bankBalance: bankBalance, netWorth: totalNetWorth, totalDebt: totalDebt
        )

        // Simulate one month
        let monthIndex = 1
        currentMonth = monthIndex

        // Apply agent tasks
        for task in agentTasks where task.enabled {
            switch task.id {
            case "task_01":
                autoPayBills = true
                let totalExpense = totalMonthlyExpenses
                if bankBalance >= totalExpense {
                    bankBalance -= totalExpense
                    consecutiveOnTimePayments += 1
                    addLog("Paid all monthly bills on time", "Paid $\(Format.compactCurrency(totalExpense)) in expenses", monthIndex, "action")
                } else {
                    addLog("Insufficient funds for bills", "Could not pay all bills this month", monthIndex, "warning")
                }
            case "task_02":
                if creditUtilization > 30 {
                    let payoff = min(creditAccounts.reduce(0) { $0 + $1.balance } * 0.3, bankBalance * 0.3)
                    for i in creditAccounts.indices {
                        let portion = creditAccounts[i].balance / max(creditAccounts.reduce(0) { $0 + $1.balance }, 1)
                        creditAccounts[i].balance -= payoff * portion
                    }
                    bankBalance -= payoff
                    addLog("Reduced credit utilization", "Paid down $\(Format.compactCurrency(payoff)) to lower utilization", monthIndex, "action")
                }
            case "task_03":
                let surplus = max(0, bankBalance - totalMonthlyExpenses)
                let saveAmount = surplus * 0.2
                savingsBalance += saveAmount
                bankBalance -= saveAmount
                addLog("Saved surplus income", "Transferred $\(Format.compactCurrency(saveAmount)) to savings", monthIndex, "action")
            case "task_05":
                if totalDebt > 0 {
                    let avalanchePayment = min(totalDebt, bankBalance * 0.15)
                    let highestApr = creditAccounts.max(by: { $0.apr < $1.apr })
                    if let idx = creditAccounts.firstIndex(where: { $0.id == highestApr?.id }) {
                        creditAccounts[idx].balance -= avalanchePayment
                        bankBalance -= avalanchePayment
                        addLog("Debt payoff (avalanche)", "Paid $\(Format.compactCurrency(avalanchePayment)) toward highest-APR debt", monthIndex, "action")
                    }
                }
            case "task_08":
                addLog("Credit score monitored", "Current score: \(creditScores.composite)", monthIndex, "action")
            default:
                break
            }
        }

        // Credit score improvement
        let scoreChange = Int.random(in: 5...15)
        creditScores.composite = min(850, creditScores.composite + scoreChange)
        addLog("Credit score improved", "Score increased by \(scoreChange) points to \(creditScores.composite)", monthIndex, "milestone")

        let endSnapshot = SimulationSnapshot(
            month: monthIndex, creditScore: creditScores.composite,
            bankBalance: bankBalance, netWorth: totalNetWorth, totalDebt: totalDebt
        )
        snapshots.append(endSnapshot)

        simulationResult = SimulationResult(
            monthsSimulated: 1,
            startSnapshot: startSnapshot,
            endSnapshot: endSnapshot,
            summary: "Your AI agent successfully managed your finances for 1 month. Credit score improved by \(scoreChange) points. Savings grew by maintaining a healthy budget."
        )

        isRunning = false
        lastSimulationTimestamp = Date()
        checkAchievements()
        saveState()
    }

    func pauseSimulation() { isPaused = true }
    func resumeSimulation() { isPaused = false }
    func cancelSimulation() { isRunning = false; isPaused = false }
    func resetSimulation() { simulationResult = nil; logs.removeAll(); snapshots.removeAll(); currentMonth = 0 }

    var isOnCooldown: Bool {
        guard let last = lastSimulationTimestamp else { return false }
        return Date().timeIntervalSince(last) < 24 * 60 * 60
    }

    private func addLog(_ action: String, _ detail: String, _ month: Int, _ type: String) {
        logs.append(SimulationLogEntry(
            id: UUID().uuidString, action: action, detail: detail,
            month: month, year: Calendar.current.component(.year, from: currentDate), type: type
        ))
    }
}
