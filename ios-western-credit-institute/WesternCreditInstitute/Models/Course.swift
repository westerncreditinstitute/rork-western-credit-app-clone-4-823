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
    /// One-time enrollment fee charged on top of the certificate (ACE-2/ACE-3).
    var enrollmentFee: Double?
    var freeTrialDays: Int?
    /// Recurring subscription price that keeps the course active.
    var monthlyFee: Double?
    /// One-time purchase granting permanent access with no recurring fee (ACE-4).
    var isLifetime: Bool = false
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

    /// Amount charged at registration: certificate plus any enrollment fee.
    /// For the lifetime bundle this is simply the one-time price.
    var dueToday: Double {
        if isLifetime { return price }
        return (certificationFee ?? 0) + (enrollmentFee ?? 0)
    }

    /// True when the course bills an up-front fee with no free trial.
    var hasEnrollmentFee: Bool { (enrollmentFee ?? 0) > 0 }
}
