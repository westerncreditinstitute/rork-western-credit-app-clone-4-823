//
//  GameMockData.swift
//  WesternCreditInstitute
//

import Foundation
import SwiftUI

nonisolated enum GameMockData {

    // MARK: - Jobs

    static let jobs: [Job] = [
        Job(
            id: "job_01", title: "Cashier", company: "Local Grocery",
            description: "Entry-level retail position handling customer transactions and basic store operations.",
            baseSalary: 28000, tier: "entry", commission: nil,
            benefits: JobBenefits(healthInsurance: false, retirement401k: false, retirementMatch: 0, paidTimeOff: 7),
            requirements: JobRequirements(minExperience: 0, minCreditScore: nil, requiredDegree: nil, requiredMajor: nil, minimumGPA: nil, preferredEducation: [])
        ),
        Job(
            id: "job_02", title: "Customer Service Rep", company: "Call Center Co",
            description: "Handle customer inquiries and resolve issues in a fast-paced call center environment.",
            baseSalary: 35000, tier: "entry", commission: 2000,
            benefits: JobBenefits(healthInsurance: true, retirement401k: false, retirementMatch: 0, paidTimeOff: 10),
            requirements: JobRequirements(minExperience: 0, minCreditScore: nil, requiredDegree: nil, requiredMajor: nil, minimumGPA: nil, preferredEducation: ["certificate"])
        ),
        Job(
            id: "job_03", title: "Retail Associate", company: "Fashion Outlet",
            description: "Assist customers, manage inventory, and maintain store appearance.",
            baseSalary: 32000, tier: "entry", commission: 1500,
            benefits: JobBenefits(healthInsurance: false, retirement401k: false, retirementMatch: 0, paidTimeOff: 7),
            requirements: JobRequirements(minExperience: 3, minCreditScore: nil, requiredDegree: nil, requiredMajor: nil, minimumGPA: nil, preferredEducation: [])
        ),
        Job(
            id: "job_04", title: "Office Administrator", company: "Tech Solutions Inc",
            description: "Manage office operations, coordinate schedules, and support executive team.",
            baseSalary: 45000, tier: "mid", commission: nil,
            benefits: JobBenefits(healthInsurance: true, retirement401k: true, retirementMatch: 3, paidTimeOff: 15),
            requirements: JobRequirements(minExperience: 12, minCreditScore: 600, requiredDegree: "associate", requiredMajor: nil, minimumGPA: 2.5, preferredEducation: ["bachelor"])
        ),
        Job(
            id: "job_05", title: "Financial Analyst", company: "Investment Bank",
            description: "Analyze financial data, create reports, and provide investment recommendations.",
            baseSalary: 75000, tier: "mid", commission: 5000,
            benefits: JobBenefits(healthInsurance: true, retirement401k: true, retirementMatch: 5, paidTimeOff: 20),
            requirements: JobRequirements(minExperience: 24, minCreditScore: 680, requiredDegree: "bachelor", requiredMajor: "major_finance", minimumGPA: 3.0, preferredEducation: ["master"])
        ),
        Job(
            id: "job_06", title: "Marketing Manager", company: "Creative Agency",
            description: "Lead marketing campaigns, manage team, and drive brand growth strategies.",
            baseSalary: 85000, tier: "senior", commission: 8000,
            benefits: JobBenefits(healthInsurance: true, retirement401k: true, retirementMatch: 5, paidTimeOff: 20),
            requirements: JobRequirements(minExperience: 36, minCreditScore: 700, requiredDegree: "bachelor", requiredMajor: nil, minimumGPA: 3.0, preferredEducation: ["master"])
        ),
        Job(
            id: "job_07", title: "Software Engineer", company: "Tech Startup",
            description: "Design and develop software solutions using modern frameworks and best practices.",
            baseSalary: 95000, tier: "senior", commission: nil,
            benefits: JobBenefits(healthInsurance: true, retirement401k: true, retirementMatch: 6, paidTimeOff: 25),
            requirements: JobRequirements(minExperience: 24, minCreditScore: 680, requiredDegree: "bachelor", requiredMajor: "major_computer_science", minimumGPA: 3.0, preferredEducation: ["master"])
        ),
        Job(
            id: "job_08", title: "Chief Financial Officer", company: "Fortune 500 Corp",
            description: "Oversee all financial operations, strategy, and planning for a major corporation.",
            baseSalary: 250000, tier: "executive", commission: 50000,
            benefits: JobBenefits(healthInsurance: true, retirement401k: true, retirementMatch: 8, paidTimeOff: 30),
            requirements: JobRequirements(minExperience: 60, minCreditScore: 750, requiredDegree: "master", requiredMajor: "major_finance", minimumGPA: 3.5, preferredEducation: ["doctorate"])
        ),
        Job(
            id: "job_09", title: "Medical Director", company: "Regional Hospital",
            description: "Lead medical staff, oversee patient care, and manage clinical operations.",
            baseSalary: 320000, tier: "executive", commission: nil,
            benefits: JobBenefits(healthInsurance: true, retirement401k: true, retirementMatch: 8, paidTimeOff: 30),
            requirements: JobRequirements(minExperience: 72, minCreditScore: 750, requiredDegree: "doctorate", requiredMajor: "major_medicine", minimumGPA: 3.5, preferredEducation: [])
        ),
    ]

    // MARK: - Financial Institutions

    static let institutions: [FinancialInstitution] = [
        FinancialInstitution(
            id: "inst_01", name: "First National Bank", logo: "🏛️", type: "major_bank",
            products: [
                FinancialProduct(id: "prod_01", name: "Secured Credit Card", type: .creditCard, baseApr: 18.9, maxApr: 24.9, minCreditScore: 300, annualFee: 0, isSecured: true, securityDeposit: 200, rewards: nil, maxAmount: nil, termMonths: nil),
                FinancialProduct(id: "prod_02", name: "Platinum Credit Card", type: .creditCard, baseApr: 14.9, maxApr: 21.9, minCreditScore: 680, annualFee: 95, isSecured: false, securityDeposit: nil, rewards: "2% cash back on all purchases", maxAmount: nil, termMonths: nil),
                FinancialProduct(id: "prod_03", name: "Personal Loan", type: .personalLoan, baseApr: 9.9, maxApr: 17.9, minCreditScore: 620, annualFee: nil, isSecured: false, securityDeposit: nil, rewards: nil, maxAmount: 50000, termMonths: [12, 24, 36, 48, 60]),
                FinancialProduct(id: "prod_04", name: "Auto Loan", type: .autoLoan, baseApr: 5.9, maxApr: 12.9, minCreditScore: 580, annualFee: nil, isSecured: true, securityDeposit: nil, rewards: nil, maxAmount: 80000, termMonths: [36, 48, 60, 72]),
            ]
        ),
        FinancialInstitution(
            id: "inst_02", name: "Western Credit Union", logo: "💳", type: "credit_union",
            products: [
                FinancialProduct(id: "prod_05", name: "Cashback Card", type: .creditCard, baseApr: 12.9, maxApr: 19.9, minCreditScore: 650, annualFee: 0, isSecured: false, securityDeposit: nil, rewards: "3% cash back on dining & groceries", maxAmount: nil, termMonths: nil),
                FinancialProduct(id: "prod_06", name: "Mortgage Loan", type: .mortgage, baseApr: 4.5, maxApr: 7.5, minCreditScore: 700, annualFee: nil, isSecured: true, securityDeposit: nil, rewards: nil, maxAmount: 850000, termMonths: [180, 240, 360]),
            ]
        ),
        FinancialInstitution(
            id: "inst_03", name: "Pacific Trust Bank", logo: "🏦", type: "major_bank",
            products: [
                FinancialProduct(id: "prod_07", name: "Student Credit Card", type: .creditCard, baseApr: 16.9, maxApr: 22.9, minCreditScore: 580, annualFee: 0, isSecured: false, securityDeposit: nil, rewards: "1% cash back, no foreign fees", maxAmount: nil, termMonths: nil),
                FinancialProduct(id: "prod_08", name: "Home Equity Loan", type: .mortgage, baseApr: 6.0, maxApr: 9.0, minCreditScore: 680, annualFee: nil, isSecured: true, securityDeposit: nil, rewards: nil, maxAmount: 500000, termMonths: [120, 180, 240]),
            ]
        ),
    ]

    // MARK: - Default Expenses

    static let defaultExpenses: [Expense] = [
        Expense(id: "exp_rent", name: "Rent", amount: 1200, category: .housing, frequency: .monthly, isFixed: true, dueDay: 1),
        Expense(id: "exp_utilities", name: "Electricity & Gas", amount: 150, category: .utilities, frequency: .monthly, isFixed: false, dueDay: 15),
        Expense(id: "exp_phone", name: "Phone Bill", amount: 80, category: .utilities, frequency: .monthly, isFixed: true, dueDay: 5),
        Expense(id: "exp_internet", name: "Internet", amount: 60, category: .utilities, frequency: .monthly, isFixed: true, dueDay: 5),
        Expense(id: "exp_groceries", name: "Groceries", amount: 400, category: .groceries, frequency: .monthly, isFixed: false, dueDay: 10),
        Expense(id: "exp_transportation", name: "Gas & Transit", amount: 200, category: .transportation, frequency: .monthly, isFixed: false, dueDay: 10),
        Expense(id: "exp_health_insurance", name: "Health Insurance", amount: 250, category: .insurance, frequency: .monthly, isFixed: true, dueDay: 1),
        Expense(id: "exp_renters_insurance", name: "Renter's Insurance", amount: 25, category: .insurance, frequency: .monthly, isFixed: true, dueDay: 1),
        Expense(id: "exp_personal_care", name: "Personal Care", amount: 75, category: .personal_care, frequency: .monthly, isFixed: false, dueDay: 15),
        Expense(id: "exp_entertainment", name: "Entertainment", amount: 100, category: .entertainment, frequency: .monthly, isFixed: false, dueDay: 15),
        Expense(id: "exp_dining", name: "Dining Out", amount: 200, category: .dining, frequency: .monthly, isFixed: false, dueDay: 15),
    ]

    // MARK: - Random Events

    static let randomEvents: [RandomEvent] = [
        RandomEvent(title: "Medical Emergency", description: "You had an unexpected visit to the ER. Your insurance covers most of it, but you still have a deductible to pay.", cost: 500, creditImpact: -5),
        RandomEvent(title: "Car Repair Needed", description: "Your car broke down and needs urgent repairs to commute to work.", cost: 800, creditImpact: nil),
        RandomEvent(title: "Tax Refund Received", description: "You received an unexpected tax refund from the IRS!", cost: -1200, creditImpact: nil),
        RandomEvent(title: "Phone Stolen", description: "Your phone was stolen and you need to buy a replacement immediately.", cost: 700, creditImpact: nil),
        RandomEvent(title: "Bonus at Work", description: "Your performance was recognized and you received a bonus!", cost: -1500, creditImpact: 3),
        RandomEvent(title: "Unexpected Vet Bill", description: "Your pet needed emergency veterinary care.", cost: 400, creditImpact: nil),
        RandomEvent(title: "Utility Rate Increase", description: "Your utility provider raised rates unexpectedly this month.", cost: 75, creditImpact: nil),
        RandomEvent(title: "Parking Ticket", description: "You received a parking ticket for an expired meter.", cost: 85, creditImpact: -2),
    ]

    // MARK: - Degrees

    static let degrees: [Degree] = [
        Degree(id: "deg_cert", name: "Professional Certificate", degreeType: .certificate, durationMonths: 6, tuition: 2000, financialAidAvailable: true),
        Degree(id: "deg_assoc", name: "Associate of Arts", degreeType: .associate, durationMonths: 24, tuition: 8000, financialAidAvailable: true),
        Degree(id: "deg_ba", name: "Bachelor of Science", degreeType: .bachelor, durationMonths: 48, tuition: 40000, financialAidAvailable: true),
        Degree(id: "deg_ms", name: "Master of Science", degreeType: .master, durationMonths: 24, tuition: 60000, financialAidAvailable: true),
        Degree(id: "deg_phd", name: "Doctorate", degreeType: .doctorate, durationMonths: 60, tuition: 80000, financialAidAvailable: true),
    ]

    // MARK: - Achievements

    static let achievements: [Achievement] = [
        Achievement(id: "ach_01", title: "First Job", description: "Get hired for your first job", symbol: "briefcase.fill", color: "#3B82F6", reward: 100, unlocked: false),
        Achievement(id: "ach_02", title: "Credit Builder", description: "Open your first credit account", symbol: "creditcard.fill", color: "#8B5CF6", reward: 50, unlocked: false),
        Achievement(id: "ach_03", title: "700 Club", description: "Reach a credit score of 700", symbol: "chart.line.uptrend.xyaxis", color: "#10B981", reward: 200, unlocked: false),
        Achievement(id: "ach_04", title: "Debt Free", description: "Pay off all your debt", symbol: "checkmark.seal.fill", color: "#10B981", reward: 500, unlocked: false),
        Achievement(id: "ach_05", title: "Home Owner", description: "Purchase your first property", symbol: "house.fill", color: "#3B82F6", reward: 300, unlocked: false),
        Achievement(id: "ach_06", title: "Entrepreneur", description: "Start your first business", symbol: "briefcase.fill", color: "#F59E0B", reward: 250, unlocked: false),
        Achievement(id: "ach_07", title: "Perfect Score", description: "Reach a credit score of 850", symbol: "crown.fill", color: "#FFD700", reward: 1000, unlocked: false),
        Achievement(id: "ach_08", title: "Six Figures", description: "Reach $100,000 net worth", symbol: "dollarsign.circle.fill", color: "#10B981", reward: 500, unlocked: false),
        Achievement(id: "ach_09", title: "Educated", description: "Complete a degree program", symbol: "graduationcap.fill", color: "#8B5CF6", reward: 200, unlocked: false),
        Achievement(id: "ach_10", title: "Investor", description: "Own 3 or more properties", symbol: "building.2.fill", color: "#0EA5E9", reward: 750, unlocked: false),
    ]

    // MARK: - Properties

    static let properties: [Property] = [
        Property(id: "prop_01", address: "123 Sunset Blvd", city: "Los Angeles", state: "CA", price: 750000, type: .condo, bedrooms: 2, bathrooms: 2, squareFeet: 1200, imageURL: "https://images.unsplash.com/photo-1545324418-cc1a3c10a93b?w=800&h=500&fit=crop", monthlyRent: 3200, description: "Modern condo in the heart of LA with stunning city views.", owned: false),
        Property(id: "prop_02", address: "456 Oak Street", city: "Austin", state: "TX", price: 425000, type: .singleFamily, bedrooms: 3, bathrooms: 2, squareFeet: 1800, imageURL: "https://images.unsplash.com/photo-1568605114967-8130f3a46994?w=800&h=500&fit=crop", monthlyRent: 2400, description: "Charming family home in a quiet Austin neighborhood.", owned: false),
        Property(id: "prop_03", address: "789 Market Ave", city: "San Francisco", state: "CA", price: 1200000, type: .luxury, bedrooms: 3, bathrooms: 3, squareFeet: 2200, imageURL: "https://images.unsplash.com/photo-1600596542815-ffaa4c7b7316?w=800&h=500&fit=crop", monthlyRent: 5500, description: "Luxury apartment with bay views in downtown SF.", owned: false),
        Property(id: "prop_04", address: "321 Pine Lane", city: "Denver", state: "CO", price: 380000, type: .townhouse, bedrooms: 2, bathrooms: 2, squareFeet: 1400, imageURL: "https://images.unsplash.com/photo-1560448204-e02f11c3d9d8?w=800&h=500&fit=crop", monthlyRent: 2100, description: "Beautiful townhouse near downtown Denver.", owned: false),
        Property(id: "prop_05", address: "555 Broadway", city: "New York", state: "NY", price: 950000, type: .apartment, bedrooms: 1, bathrooms: 1, squareFeet: 800, imageURL: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=500&fit=crop", monthlyRent: 3800, description: "Stylish NYC apartment in a prime Manhattan location.", owned: false),
        Property(id: "prop_06", address: "888 Coast Hwy", city: "Malibu", state: "CA", price: 2500000, type: .luxury, bedrooms: 4, bathrooms: 4, squareFeet: 3500, imageURL: "https://images.unsplash.com/photo-1613490493576-c7220df0c56f?w=800&h=500&fit=crop", monthlyRent: 12000, description: "Stunning oceanfront estate in exclusive Malibu.", owned: false),
    ]

    // MARK: - Businesses

    static let businesses: [Business] = [
        Business(id: "biz_01", name: "Coffee Shop", type: .restaurant, initialCost: 50000, monthlyRevenue: 8000, monthlyExpenses: 5000, description: "A cozy neighborhood coffee shop serving premium espresso and pastries.", minCreditScore: 600, owned: false, monthsOwned: 0),
        Business(id: "biz_02", name: "Boutique Store", type: .retail, initialCost: 30000, monthlyRevenue: 6000, monthlyExpenses: 3500, description: "A trendy fashion boutique offering curated clothing collections.", minCreditScore: 580, owned: false, monthsOwned: 0),
        Business(id: "biz_03", name: "Tech Consulting", type: .services, initialCost: 10000, monthlyRevenue: 12000, monthlyExpenses: 4000, description: "Provide IT consulting and managed services to small businesses.", minCreditScore: 650, owned: false, monthsOwned: 0),
        Business(id: "biz_04", name: "Fitness Studio", type: .services, initialCost: 75000, monthlyRevenue: 15000, monthlyExpenses: 8000, description: "A modern fitness studio offering group classes and personal training.", minCreditScore: 620, owned: false, monthsOwned: 0),
        Business(id: "biz_05", name: "Real Estate Agency", type: .realEstate, initialCost: 20000, monthlyRevenue: 20000, monthlyExpenses: 7000, description: "Help clients buy, sell, and rent properties in your area.", minCreditScore: 700, owned: false, monthsOwned: 0),
        Business(id: "biz_06", name: "E-Commerce Store", type: .technology, initialCost: 15000, monthlyRevenue: 10000, monthlyExpenses: 4500, description: "Online store selling trending products with dropshipping model.", minCreditScore: 580, owned: false, monthsOwned: 0),
    ]

    // MARK: - Community Members

    static let communityMembers: [CommunityMember] = [
        CommunityMember(id: "cm_01", name: "Sarah Johnson", avatarURL: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=200&h=200&fit=crop&crop=face", level: 25, creditScore: 812, netWorth: 450000, joinedDate: "Jan 2024", achievements: 8),
        CommunityMember(id: "cm_02", name: "Mike Chen", avatarURL: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=200&h=200&fit=crop&crop=face", level: 18, creditScore: 745, netWorth: 180000, joinedDate: "Mar 2024", achievements: 5),
        CommunityMember(id: "cm_03", name: "Emily Davis", avatarURL: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=200&h=200&fit=crop&crop=face", level: 32, creditScore: 840, netWorth: 750000, joinedDate: "Nov 2023", achievements: 10),
        CommunityMember(id: "cm_04", name: "Jamal Wright", avatarURL: "https://images.unsplash.com/photo-1508243529287-e21914733111?w=200&h=200&fit=crop&crop=face", level: 12, creditScore: 680, netWorth: 85000, joinedDate: "Jun 2024", achievements: 3),
        CommunityMember(id: "cm_05", name: "Lisa Garcia", avatarURL: "https://images.unsplash.com/photo-1556157382-97eda2d62296?w=200&h=200&fit=crop&crop=face", level: 28, creditScore: 790, netWorth: 320000, joinedDate: "Feb 2024", achievements: 7),
    ]

    // MARK: - Social Feed

    static let socialPosts: [SocialPost] = [
        SocialPost(id: "sp_01", authorName: "Sarah Johnson", authorAvatarURL: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=200&h=200&fit=crop&crop=face", content: "Just hit 812 credit score! The Credit Life Simulator really helped me understand how payment history impacts everything. 🎉", timestamp: Date().addingTimeInterval(-3600), likes: 42, comments: 8, tag: "Achievement"),
        SocialPost(id: "sp_02", authorName: "Mike Chen", authorAvatarURL: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=200&h=200&fit=crop&crop=face", content: "Bought my first property in the simulator! Now I understand how credit score affects mortgage rates. Learning so much!", timestamp: Date().addingTimeInterval(-7200), likes: 28, comments: 5, tag: "Real Estate"),
        SocialPost(id: "sp_03", authorName: "Emily Davis", authorAvatarURL: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=200&h=200&fit=crop&crop=face", content: "Started my own business in the game and it's actually profitable! The budget management tips are gold.", timestamp: Date().addingTimeInterval(-14400), likes: 55, comments: 12, tag: "Business"),
        SocialPost(id: "sp_04", authorName: "Jamal Wright", authorAvatarURL: "https://images.unsplash.com/photo-1508243529287-e21914733111?w=200&h=200&fit=crop&crop=face", content: "Anyone else struggling with keeping credit utilization below 30%? The simulator makes it so clear how much this matters.", timestamp: Date().addingTimeInterval(-86400), likes: 18, comments: 7, tag: "Credit Tip"),
    ]

    // MARK: - Financial Incidents

    static let incidentTemplates: [FinancialIncident] = [
        FinancialIncident(id: "fi_01", incidentName: "Minor Car Repair", description: "Your car needed a small repair — new brake pads and oil change.", severity: .minor, category: .auto, monthNumber: 1, baseCost: 250, actualCost: 250, savingsFromMitigation: 0, mitigationApplied: nil, educationalMessage: "Regular maintenance can prevent costlier repairs down the road."),
        FinancialIncident(id: "fi_02", incidentName: "Medical Copay", description: "Unexpected doctor visit for a minor health issue.", severity: .moderate, category: .medical, monthNumber: 1, baseCost: 600, actualCost: 400, savingsFromMitigation: 200, mitigationApplied: Mitigation(name: "Health Insurance", description: "Insurance covered part of the visit", effectiveness: 0.33), educationalMessage: "Health insurance dramatically reduces out-of-pocket medical costs."),
        FinancialIncident(id: "fi_03", incidentName: "Job Layoff", description: "Your company announced layoffs. You may be affected next month.", severity: .major, category: .job, monthNumber: 1, baseCost: 3000, actualCost: 1500, savingsFromMitigation: 1500, mitigationApplied: Mitigation(name: "Emergency Fund", description: "Your emergency fund covered part of the loss", effectiveness: 0.5), educationalMessage: "An emergency fund with 3-6 months of expenses is crucial for job security."),
        FinancialIncident(id: "fi_04", incidentName: "Market Downturn", description: "The stock market dipped, affecting your investments temporarily.", severity: .moderate, category: .market, monthNumber: 1, baseCost: 1500, actualCost: 1500, savingsFromMitigation: 0, mitigationApplied: nil, educationalMessage: "Diversification helps protect against market volatility."),
        FinancialIncident(id: "fi_05", incidentName: "Identity Theft", description: "Suspicious charges appeared on your account. You caught it early.", severity: .moderate, category: .fraud, monthNumber: 1, baseCost: 800, actualCost: 200, savingsFromMitigation: 600, mitigationApplied: Mitigation(name: "Credit Monitoring", description: "Early detection prevented major loss", effectiveness: 0.75), educationalMessage: "Credit monitoring services catch fraud before it becomes devastating."),
    ]

    // MARK: - Agent Tasks

    static let agentTasks: [AgentTask] = [
        AgentTask(id: "task_01", label: "Pay Bills on Time", description: "Automatically pays all monthly bills", icon: "creditcard.fill", color: Color(hex: "#10B981"), enabled: true),
        AgentTask(id: "task_02", label: "Credit Card Utilization", description: "Keeps utilization below 30%", icon: "chart.pie.fill", color: Color(hex: "#3B82F6"), enabled: true),
        AgentTask(id: "task_03", label: "Save Surplus", description: "Saves excess income each month", icon: "piggybank.fill", color: Color(hex: "#10B981"), enabled: true),
        AgentTask(id: "task_04", label: "Dispute Errors", description: "Disputes inaccurate credit report items", icon: "doc.text.fill", color: Color(hex: "#8B5CF6"), enabled: false),
        AgentTask(id: "task_05", label: "Debt Payoff", description: "Pays down highest-interest debt first", icon: "trending.down.fill", color: Color(hex: "#EF4444"), enabled: true),
        AgentTask(id: "task_06", label: "Build Credit", description: "Applies for credit when beneficial", icon: "shield.fill", color: Color(hex: "#6366F1"), enabled: false),
        AgentTask(id: "task_07", label: "Invest Surplus", description: "Invests leftover savings", icon: "chart.line.uptrend.xyaxis", color: Color(hex: "#14B8A6"), enabled: false),
        AgentTask(id: "task_08", label: "Monitor Score", description: "Tracks score changes monthly", icon: "magnifyingglass", color: Color(hex: "#F59E0B"), enabled: true),
    ]

    // MARK: - Education Salary Bonus

    static let educationSalaryBonus: [DegreeType: (min: Double, max: Double)] = [
        .certificate: (0.05, 0.10),
        .associate: (0.10, 0.15),
        .bachelor: (0.20, 0.30),
        .master: (0.40, 0.60),
        .doctorate: (0.80, 1.20),
    ]

    // MARK: - Degree Order

    static let degreeOrder: [DegreeType] = [.certificate, .associate, .bachelor, .master, .doctorate]
}
