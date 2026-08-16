//
//  CSOProvider.swift
//  WesternCreditInstitute
//

import Foundation

nonisolated struct CSOProvider: Identifiable, Hashable, Sendable {
    let id: String
    let userId: String
    let name: String
    let email: String
    let phone: String
    let avatarURL: String
    let bio: String
    let specialties: [String]
    let yearsExperience: Int
    let location: String
    let rating: Double
    let reviewCount: Int
    let consultationFee: Double
    let isAvailable: Bool
    let certifiedAt: String

    var initials: String {
        let parts = name.split(separator: " ").prefix(2)
        return parts.compactMap { $0.first.map(String.init) }.joined().uppercased()
    }
}

nonisolated struct CSOReview: Identifiable, Hashable, Sendable {
    let id: String
    let providerId: String
    let reviewerName: String
    let reviewerAvatarURL: String
    let rating: Int
    let comment: String
    let createdAt: Date
}
