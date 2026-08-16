//
//  AppUser.swift
//  WesternCreditInstitute
//

import Foundation

nonisolated enum UserRole: String, Hashable, Sendable {
    case student = "Student"
    case cso = "CSO"
    case affiliate = "Affiliate"
}

nonisolated struct AppUser: Identifiable, Hashable, Sendable {
    let id: String
    var name: String
    var email: String
    var phone: String?
    var avatarURL: String
    var memberSince: String
    var role: UserRole
    var coursesCompleted: Int
    var totalEarnings: Double
    var referrals: Int

    var firstName: String {
        name.split(separator: " ").first.map(String.init) ?? name
    }

    var initials: String {
        let parts = name.split(separator: " ").prefix(2)
        return parts.compactMap { $0.first.map(String.init) }.joined().uppercased()
    }
}
