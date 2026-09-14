//
//  AuthSession.swift
//  WesternCreditInstitute
//

import Foundation

/// The account record returned by `users.login` / `users.register`.
///
/// Field names match the tRPC `User` shape exactly so this decodes straight
/// from the procedure result.
nonisolated struct AuthenticatedUser: Codable, Hashable, Sendable {
    let id: String
    let email: String
    let name: String
    let phone: String?
    let avatar: String?
    let memberSince: String?
    let role: String?
    let coursesCompleted: Int?
    let totalEarnings: Double?
    let referrals: Int?
    let createdAt: String?

    /// Bridges the server account into the app's display model.
    var appUser: AppUser {
        AppUser(
            id: id,
            name: name,
            email: email,
            phone: (phone?.isEmpty ?? true) ? nil : phone,
            avatarURL: avatar ?? "",
            memberSince: memberSince ?? "",
            role: UserRole(rawValue: role ?? "") ?? .student,
            coursesCompleted: coursesCompleted ?? 0,
            totalEarnings: totalEarnings ?? 0,
            referrals: referrals ?? 0
        )
    }
}

/// A signed-in session: the account plus the credential sent with each request.
nonisolated struct AuthSession: Codable, Hashable, Sendable {
    let user: AuthenticatedUser

    /// The value placed in `Authorization: Bearer …`.
    ///
    /// The backend's `createContext` reads this as base64-encoded JSON holding
    /// `{ id, email }` — it is NOT a signed token, so it proves nothing on its
    /// own. Matching that format is what makes iOS interoperate with the
    /// existing web/Expo sessions; see `AuthSessionStore` for the caveat.
    var bearerToken: String {
        let payload: [String: String] = ["id": user.id, "email": user.email]
        guard let data = try? JSONSerialization.data(withJSONObject: payload) else {
            return ""
        }
        return data.base64EncodedString()
    }
}
