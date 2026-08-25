//
//  AppStore.swift
//  WesternCreditInstitute
//

import Foundation
import SwiftUI

/// Single source of truth for user, subscription, enrollment and wallet state.
/// Mirrors the behaviour of the shared UserContext / SubscriptionContext / WalletContext.
@Observable
final class AppStore {
    private enum Keys {
        static let tier = "wci.subscription.tier"
        static let enrolled = "wci.enrolled.courses"
        static let progress = "wci.course.progress"
        static let readNotifications = "wci.notifications.read"
        static let walletUnlocked = "wci.wallet.unlocked"
        static let paidProviders = "wci.providers.paid"
        static let adminUnlocked = "wci.admin.unlocked"
    }

    // MARK: - Published state

    var user: AppUser = MockData.currentUser
    var tier: SubscriptionTier
    var enrolledCourseIds: Set<String>
    var courseProgress: [String: Int]
    var readNotificationIds: Set<String>
    var notifications: [AppNotification] = MockData.notifications
    var wallet: WalletSummary = MockData.wallet
    var transactions: [WalletTransaction] = MockData.walletTransactions
    var reviews: [CSOReview] = MockData.reviews
    var paidProviderIds: Set<String>

    /// The $25 MUSO wallet paywall state. AI agents are exempt.
    var isWalletUnlocked: Bool {
        didSet { UserDefaults.standard.set(isWalletUnlocked, forKey: Keys.walletUnlocked) }
    }

    /// Credit Life Simulator is in early access — only administrators may play.
    /// Unlocked by entering the admin console passcode.
    var isAdminUnlocked: Bool {
        didSet { UserDefaults.standard.set(isAdminUnlocked, forKey: Keys.adminUnlocked) }
    }

    // MARK: - Init

    init() {
        let defaults = UserDefaults.standard
        tier = SubscriptionTier(rawValue: defaults.string(forKey: Keys.tier) ?? "") ?? .csoAffiliate
        enrolledCourseIds = Set(defaults.stringArray(forKey: Keys.enrolled) ?? [])
        courseProgress = (defaults.dictionary(forKey: Keys.progress) as? [String: Int]) ?? [:]
        readNotificationIds = Set(defaults.stringArray(forKey: Keys.readNotifications) ?? [])
        paidProviderIds = Set(defaults.stringArray(forKey: Keys.paidProviders) ?? [])
        isWalletUnlocked = defaults.bool(forKey: Keys.walletUnlocked)
        isAdminUnlocked = defaults.bool(forKey: Keys.adminUnlocked)

        syncInitialEnrollments()
        applyReadState()
    }

    // MARK: - Subscription

    var isFree: Bool { tier == .free }
    var isPremium: Bool { tier != .free }
    var isACE1: Bool { tier == .ace1Student }
    var isCSO: Bool { tier == .csoAffiliate }

    func setTier(_ newTier: SubscriptionTier) {
        tier = newTier
        UserDefaults.standard.set(newTier.rawValue, forKey: Keys.tier)
    }

    // MARK: - Courses

    /// Seeds enrollment state from the bundled catalog the first time the app runs.
    private func syncInitialEnrollments() {
        let seeded = MockData.courses.filter(\.enrolled).map(\.id)
        for id in seeded where !enrolledCourseIds.contains(id) {
            enrolledCourseIds.insert(id)
            if courseProgress[id] == nil {
                courseProgress[id] = MockData.courses.first { $0.id == id }?.progress ?? 0
            }
        }
        persistCourses()
    }

    func isEnrolled(_ courseId: String) -> Bool {
        enrolledCourseIds.contains(courseId)
    }

    func progress(for courseId: String) -> Int {
        courseProgress[courseId] ?? 0
    }

    func enroll(in courseId: String) {
        enrolledCourseIds.insert(courseId)
        if courseProgress[courseId] == nil { courseProgress[courseId] = 0 }
        persistCourses()
    }

    func setProgress(_ value: Int, for courseId: String) {
        courseProgress[courseId] = max(0, min(100, value))
        persistCourses()
    }

    /// Catalog decorated with live enrollment + progress state.
    var courses: [Course] {
        MockData.courses.map { course in
            var copy = course
            copy.enrolled = course.enrolled || isEnrolled(course.id)
            if copy.enrolled {
                copy.progress = courseProgress[course.id] ?? course.progress ?? 0
            }
            return copy
        }
    }

    var enrolledCourses: [Course] { courses.filter(\.enrolled) }

    var certificateCount: Int {
        ["3", "4", "5", "1"].filter { enrolledCourseIds.contains($0) }.count
    }

    var hasCompletedACETrack: Bool {
        ["3", "4", "5"].allSatisfy { progress(for: $0) >= 100 }
    }

    private func persistCourses() {
        let defaults = UserDefaults.standard
        defaults.set(Array(enrolledCourseIds), forKey: Keys.enrolled)
        defaults.set(courseProgress, forKey: Keys.progress)
    }

    // MARK: - Notifications

    private func applyReadState() {
        notifications = notifications.map { item in
            var copy = item
            if readNotificationIds.contains(item.id) { copy.read = true }
            return copy
        }
    }

    var unreadNotificationCount: Int {
        notifications.filter { !$0.read }.count
    }

    func markNotificationRead(_ id: String) {
        readNotificationIds.insert(id)
        UserDefaults.standard.set(Array(readNotificationIds), forKey: Keys.readNotifications)
        applyReadState()
    }

    func markAllNotificationsRead() {
        readNotificationIds.formUnion(notifications.map(\.id))
        UserDefaults.standard.set(Array(readNotificationIds), forKey: Keys.readNotifications)
        applyReadState()
    }

    // MARK: - Wallet

    static let minimumPayout: Double = 25

    enum PayoutError: LocalizedError {
        case invalidAmount
        case belowMinimum
        case insufficientFunds

        var errorDescription: String? {
            switch self {
            case .invalidAmount: return "Please enter a valid payout amount."
            case .belowMinimum: return "The minimum payout amount is $25.00."
            case .insufficientFunds: return "You don't have enough available balance for this payout."
            }
        }
    }

    /// Validates and records a payout request against the local wallet.
    func requestPayout(amount: Double, method: PayoutMethod) throws {
        guard amount > 0, amount.isFinite else { throw PayoutError.invalidAmount }
        guard amount >= Self.minimumPayout else { throw PayoutError.belowMinimum }
        guard amount <= wallet.availableBalance else { throw PayoutError.insufficientFunds }

        wallet.availableBalance -= amount
        wallet.totalWithdrawn += amount

        let transaction = WalletTransaction(
            id: UUID().uuidString,
            type: .payout,
            amount: -amount,
            status: .pending,
            detail: "Payout Request - \(method.label)",
            createdAt: Date()
        )
        transactions.insert(transaction, at: 0)
    }

    // MARK: - Hire a Pro

    func hasAccess(to providerId: String) -> Bool {
        paidProviderIds.contains(providerId)
    }

    func grantAccess(to providerId: String) {
        paidProviderIds.insert(providerId)
        UserDefaults.standard.set(Array(paidProviderIds), forKey: Keys.paidProviders)
    }

    func reviews(for providerId: String) -> [CSOReview] {
        reviews.filter { $0.providerId == providerId }.sorted { $0.createdAt > $1.createdAt }
    }

    func addReview(providerId: String, rating: Int, comment: String) {
        let review = CSOReview(
            id: UUID().uuidString,
            providerId: providerId,
            reviewerName: user.name,
            reviewerAvatarURL: user.avatarURL,
            rating: rating,
            comment: comment,
            createdAt: Date()
        )
        reviews.insert(review, at: 0)
    }

    // MARK: - Earnings

    var referralLink: String { "westerncredit.com/ref/\(user.id)" }

    var earnings: [EarningRecord] { MockData.earnings }

    var pendingEarnings: Double {
        earnings.filter { $0.status == .pending }.reduce(0) { $0 + $1.amount }
    }

    var thisMonthEarnings: Double {
        let calendar = Calendar.current
        let reference = earnings.map(\.date).max() ?? Date()
        let month = calendar.component(.month, from: reference)
        let year = calendar.component(.year, from: reference)
        return earnings
            .filter {
                calendar.component(.month, from: $0.date) == month
                    && calendar.component(.year, from: $0.date) == year
            }
            .reduce(0) { $0 + $1.amount }
    }

    var csoReferrals: Int { 45 }
    var residualRate: Int { csoReferrals >= 100 ? 75 : 50 }
    var referralsToNextTier: Int { max(0, 100 - csoReferrals) }
}
