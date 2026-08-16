//
//  Course.swift
//  WesternCreditInstitute
//

import Foundation

nonisolated struct CourseSection: Identifiable, Hashable, Sendable {
    let id: String
    let title: String
    let steps: Int
    var completed: Int = 0
    let symbol: String
}

nonisolated enum CourseLevel: String, Hashable, Sendable {
    case beginner = "Beginner"
    case intermediate = "Intermediate"
    case advanced = "Advanced"
}

nonisolated struct Course: Identifiable, Hashable, Sendable {
    let id: String
    let title: String
    let shortDescription: String
    var fullDescription: String?
    let duration: String
    let lessons: Int
    let price: Double
    var certificationFee: Double?
    var freeTrialDays: Int?
    var monthlyInstallment: Double?
    var installmentMonths: Int?
    var limitedTimeOffer: Bool = false
    let imageURL: String
    let category: String
    let level: CourseLevel
    var enrolled: Bool = false
    var progress: Int?
    var sections: [CourseSection] = []
    var features: [String] = []
    var learningObjectives: [String] = []
    var comingSoon: Bool = false
    var isBundle: Bool = false
    var bundleIncludes: [String] = []
    var includesCertificates: Bool = false
    var csoEligible: Bool = false
    var noPaymentPlan: Bool = false
    var isFree: Bool = false
    var autoDebitOnly: Bool = false
    var autoDebitLockoutPolicy: String?
    var requiresCompletedCourses: [String] = []
    var requiresCompletedCoursesNames: [String] = []

    var totalSteps: Int { sections.reduce(0) { $0 + $1.steps } }
}
