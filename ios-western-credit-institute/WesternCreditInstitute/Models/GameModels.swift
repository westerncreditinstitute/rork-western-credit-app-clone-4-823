//
//  GameModels.swift
//  WesternCreditInstitute
//

import Foundation
import SwiftUI

// MARK: - Credit Scores

struct CreditScores: Codable, Hashable, Sendable {
    var composite: Int = 620
    var experian: Int = 620
    var equifax: Int = 618
    var transunion: Int = 622
}

// MARK: - Credit Tier

nonisolated struct CreditTier: Sendable {
    let name: String
    let color: Color
    let minScore: Int

    static func getTier(score: Int) -> CreditTier {
        switch score {
        case 800...: return CreditTier(name: "Exceptional", color: Color(hex: "#10B981"), minScore: 800)
        case 740..<800: return CreditTier(name: "Very Good", color: Color(hex: "#34D399"), minScore: 740)
        case 670..<740: return CreditTier(name: "Good", color: Color(hex: "#3B82F6"), minScore: 670)
        case 580..<670: return CreditTier(name: "Fair", color: Color(hex: "#F59E0B"), minScore: 580)
        case 300..<580: return CreditTier(name: "Poor", color: Color(hex: "#EF4444"), minScore: 300)
        default: return CreditTier(name: "Poor", color: Color(hex: "#EF4444"), minScore: 300)
        }
    }
}

// MARK: - Job

struct Job: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let title: String
    let company: String
    let description: String
    let baseSalary: Double
    let tier: String
    let commission: Double?
    let benefits: JobBenefits
    let requirements: JobRequirements
}

struct JobBenefits: Codable, Hashable, Sendable {
    let healthInsurance: Bool
    let retirement401k: Bool
    let retirementMatch: Double
    let paidTimeOff: Int
}

struct JobRequirements: Codable, Hashable, Sendable {
    let minExperience: Int
    let minCreditScore: Int?
    let requiredDegree: String?
    let requiredMajor: String?
    let minimumGPA: Double?
    let preferredEducation: [String]
}

struct PlayerJob: Codable, Hashable, Sendable {
    var job: Job
    var startDate: Date
    var experienceMonths: Int
    var performanceRating: Int
    var currentSalary: Double
}

// MARK: - Credit Account

enum CreditAccountType: String, Codable, Hashable, Sendable, CaseIterable {
    case creditCard = "credit_card"
    case autoLoan = "auto_loan"
    case mortgage = "mortgage"
    case personalLoan = "personal_loan"
}

enum CreditAccountStatus: String, Codable, Hashable, Sendable {
    case current
    case late
}

struct CreditAccount: Identifiable, Codable, Hashable, Sendable {
    var id: String
    var type: CreditAccountType
    var institutionId: String
    var institutionName: String
    var balance: Double
    var creditLimit: Double
    var apr: Double
    var minimumPayment: Double
    var openedDate: Date
    var lastPaymentDate: Date
    var status: CreditAccountStatus
}

// MARK: - Financial Institution & Product

struct FinancialInstitution: Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let logo: String
    let type: String
    let products: [FinancialProduct]
}

struct FinancialProduct: Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let type: CreditAccountType
    let baseApr: Double
    let maxApr: Double
    let minCreditScore: Int
    let annualFee: Double?
    let isSecured: Bool
    let securityDeposit: Double?
    let rewards: String?
    let maxAmount: Double?
    let termMonths: [Int]?
}

// MARK: - Hard Inquiry

struct HardInquiry: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let institutionName: String
    let date: Date
    let type: CreditAccountType
}

// MARK: - Expense

enum ExpenseCategory: String, Codable, Hashable, Sendable, CaseIterable {
    case housing, utilities, transportation, insurance, groceries, dining
    case entertainment, shopping, healthcare, education, personal_care
    case subscriptions, debt_payment, savings, emergency, other

    var label: String {
        switch self {
        case .housing: "Housing"
        case .utilities: "Utilities"
        case .transportation: "Transportation"
        case .insurance: "Insurance"
        case .groceries: "Groceries"
        case .dining: "Dining"
        case .entertainment: "Entertainment"
        case .shopping: "Shopping"
        case .healthcare: "Healthcare"
        case .education: "Education"
        case .personal_care: "Personal Care"
        case .subscriptions: "Subscriptions"
        case .debt_payment: "Debt Payment"
        case .savings: "Savings"
        case .emergency: "Emergency"
        case .other: "Other"
        }
    }

    var symbol: String {
        switch self {
        case .housing: "house.fill"
        case .utilities: "bolt.fill"
        case .transportation: "car.fill"
        case .insurance: "shield.fill"
        case .groceries: "cart.fill"
        case .dining: "fork.knife"
        case .entertainment: "tv.fill"
        case .shopping: "bag.fill"
        case .healthcare: "cross.case.fill"
        case .education: "graduationcap.fill"
        case .personal_care: "scissors"
        case .subscriptions: "play.rectangle.fill"
        case .debt_payment: "creditcard.fill"
        case .savings: "piggybank.fill"
        case .emergency: "exclamationmark.triangle.fill"
        case .other: "ellipsis.circle.fill"
        }
    }

    var color: Color {
        switch self {
        case .housing: Color(hex: "#3B82F6")
        case .utilities: Color(hex: "#F59E0B")
        case .transportation: Color(hex: "#10B981")
        case .insurance: Color(hex: "#8B5CF6")
        case .groceries: Color(hex: "#EC4899")
        case .dining: Color(hex: "#EF4444")
        case .entertainment: Color(hex: "#06B6D4")
        case .shopping: Color(hex: "#F97316")
        case .healthcare: Color(hex: "#14B8A6")
        case .education: Color(hex: "#6366F1")
        case .personal_care: Color(hex: "#D946EF")
        case .subscriptions: Color(hex: "#8B5CF6")
        case .debt_payment: Color(hex: "#EF4444")
        case .savings: Color(hex: "#10B981")
        case .emergency: Color(hex: "#F59E0B")
        case .other: Color(hex: "#64748B")
        }
    }
}

enum ExpenseFrequency: String, Codable, Hashable, Sendable {
    case monthly, weekly, annual
}

struct Expense: Identifiable, Codable, Hashable, Sendable {
    var id: String
    var name: String
    var amount: Double
    var category: ExpenseCategory
    var frequency: ExpenseFrequency
    var isFixed: Bool
    var dueDay: Int?
}

// MARK: - Monthly Report

struct MonthlyReport: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let month: Int
    let year: Int
    let income: Double
    let expenses: Double
    let savings: Double
    let creditScoreChange: Int
    let highlights: [String]
    let warnings: [String]
}

// MARK: - Random Event

struct RandomEvent: Codable, Hashable, Sendable {
    let title: String
    let description: String
    let cost: Double
    let creditImpact: Int?
}

// MARK: - Token Wallet

struct MusoToken: Codable, Hashable, Sendable {
    var balance: Double = 0
    var totalMinted: Double = 0
    var totalBurned: Double = 0
}

enum TokenTransactionType: String, Codable, Hashable, Sendable {
    case mint
    case burn
}

struct TokenTransaction: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let type: TokenTransactionType
    let amount: Double
    let reason: String
    let timestamp: Date
    let balanceAfter: Double
}

// MARK: - Financial Incident

enum IncidentSeverity: String, Codable, Hashable, Sendable, CaseIterable {
    case minor, moderate, major

    var label: String { rawValue.capitalized }

    var color: Color {
        switch self {
        case .minor: Color(hex: "#22C55E")
        case .moderate: Color(hex: "#F59E0B")
        case .major: Color(hex: "#EF4444")
        }
    }
}

enum IncidentCategory: String, Codable, Hashable, Sendable, CaseIterable {
    case medical, auto, home, job, market, fraud, tax, other
}

struct FinancialIncident: Identifiable, Hashable, Sendable {
    var id: String
    let incidentName: String
    let description: String
    let severity: IncidentSeverity
    let category: IncidentCategory
    var monthNumber: Int
    let baseCost: Double
    var actualCost: Double
    var savingsFromMitigation: Double
    var mitigationApplied: Mitigation?
    let educationalMessage: String
}

struct Mitigation: Hashable, Sendable {
    let name: String
    let description: String
    let effectiveness: Double
}

// MARK: - Achievement

struct Achievement: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let title: String
    let description: String
    let symbol: String
    let color: String
    let reward: Double
    var unlocked: Bool
}

// MARK: - Education

enum DegreeType: String, Codable, Hashable, Sendable, CaseIterable {
    case certificate, associate, bachelor, master, doctorate

    var label: String {
        switch self {
        case .certificate: "Certificate"
        case .associate: "Associate's"
        case .bachelor: "Bachelor's"
        case .master: "Master's"
        case .doctorate: "Doctorate"
        }
    }
}

struct Degree: Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let degreeType: DegreeType
    let durationMonths: Int
    let tuition: Double
    let financialAidAvailable: Bool
}

struct Enrollment: Identifiable, Hashable, Sendable {
    let id: String
    let degreeId: String
    var creditsEarned: Int
    let creditsRequired: Int
    var gpa: Double
    var monthsRemaining: Int
}

struct CompletedDegree: Hashable, Sendable {
    let degreeId: String
    let degreeType: DegreeType
    let majorId: String?
    let finalGPA: Double
}

// MARK: - Real Estate

enum PropertyType: String, Codable, Hashable, Sendable {
    case condo, townhouse, singleFamily, apartment, luxury, commercial
    case land

    var label: String { rawValue.capitalized }
    var symbol: String {
        switch self {
        case .condo: "building.2.fill"
        case .townhouse: "house.fill"
        case .singleFamily: "house.fill"
        case .apartment: "building.fill"
        case .luxury: "crown.fill"
        case .commercial: "briefcase.building.fill"
        case .land: "mappin.and.ellipse"
        }
    }
}

struct Property: Identifiable, Hashable, Sendable {
    let id: String
    let address: String
    let city: String
    let state: String
    let price: Double
    let type: PropertyType
    let bedrooms: Int
    let bathrooms: Int
    let squareFeet: Int
    let imageURL: String
    let monthlyRent: Double
    let description: String
    var owned: Bool
}

// MARK: - Business

enum BusinessType: String, Codable, Hashable, Sendable, CaseIterable {
    case retail, restaurant, technology, services, realEstate, manufacturing
    case entertainment, healthcare

    var label: String { rawValue.capitalized }
    var symbol: String {
        switch self {
        case .retail: "bag.fill"
        case .restaurant: "fork.knife"
        case .technology: "laptopcomputer"
        case .services: "person.text.rectangle.fill"
        case .realEstate: "building.2.fill"
        case .manufacturing: "gearshape.2.fill"
        case .entertainment: "music.note"
        case .healthcare: "cross.case.fill"
        }
    }
}

struct Business: Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let type: BusinessType
    let initialCost: Double
    let monthlyRevenue: Double
    let monthlyExpenses: Double
    let description: String
    let minCreditScore: Int
    var owned: Bool
    var monthsOwned: Int
}

// MARK: - Community

struct CommunityMember: Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let avatarURL: String
    let level: Int
    let creditScore: Int
    let netWorth: Double
    let joinedDate: String
    let achievements: Int
}

struct SocialPost: Identifiable, Hashable, Sendable {
    let id: String
    let authorName: String
    let authorAvatarURL: String
    let content: String
    let timestamp: Date
    let likes: Int
    let comments: Int
    let tag: String
}

// MARK: - AI Agent

enum SimulationSpeed: String, Codable, Hashable, Sendable, CaseIterable {
    case slow, normal, fast, turbo

    var label: String {
        switch self {
        case .slow: "Slow"
        case .normal: "Normal"
        case .fast: "Fast"
        case .turbo: "Turbo"
        }
    }
}

enum AgentPriority: String, Codable, Hashable, Sendable, CaseIterable {
    case creditScore = "credit_score"
    case wealth = "wealth"
    case debtFree = "debt_free"
    case homeOwnership = "home_ownership"
    case education = "education"

    var label: String {
        switch self {
        case .creditScore: "Credit Score"
        case .wealth: "Wealth"
        case .debtFree: "Debt Free"
        case .homeOwnership: "Home Ownership"
        case .education: "Education"
        }
    }
}

struct AgentTask: Identifiable, Hashable, Sendable {
    let id: String
    let label: String
    let description: String
    let icon: String
    let color: Color
    var enabled: Bool
}

struct SimulationLogEntry: Identifiable, Hashable, Sendable {
    let id: String
    let action: String
    let detail: String
    let month: Int
    let year: Int
    let type: String
}

struct SimulationSnapshot: Hashable, Sendable {
    let month: Int
    let creditScore: Int
    let bankBalance: Double
    let netWorth: Double
    let totalDebt: Double
}

struct SimulationResult: Hashable, Sendable {
    let monthsSimulated: Int
    let startSnapshot: SimulationSnapshot
    let endSnapshot: SimulationSnapshot
    let summary: String
}
