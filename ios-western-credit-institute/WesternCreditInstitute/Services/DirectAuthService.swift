//
//  DirectAuthService.swift
//  WesternCreditInstitute
//

import CryptoKit
import Foundation

/// Outcome of a direct sign-in attempt.
///
/// `unavailable` is deliberately distinct from `invalidCredentials`: the first
/// means "we could not check", the second means "we checked and it was wrong".
/// Collapsing them would tell a user with a correct password that their
/// password was wrong.
nonisolated enum DirectLoginOutcome: Sendable {
    case success(AuthenticatedUser)
    case invalidCredentials
    case unavailable(reason: String)
}

/// Direct-to-database sign in, used only when the tRPC API cannot be reached.
///
/// Normally login goes through `users.login` on the Rork-hosted backend. When
/// that host is down (it answers 503 at the edge before any app code runs),
/// every sign-in failed with "Can't reach the server right now" even though the
/// database itself was healthy and answering in a fraction of a second.
///
/// Supabase is a separate host, reachable straight from the app, so it can
/// still verify a password when the API tier is unavailable. Mirrors the Expo
/// `lib/direct-auth.ts` exactly.
///
/// Security notes:
/// - The password hash is sent as a *filter*, never selected. A row comes back
///   only when email AND hash both match, so no hash is ever downloaded to the
///   device and a wrong password returns an empty list.
/// - A no-match is reported as `invalidCredentials`, never as success. This
///   path can reject a login but can never invent an account.
/// - The hash mirrors the backend exactly (unsalted SHA-256, lower-case hex).
///   If the backend's hashing changes, this must change with it.
nonisolated final class DirectAuthService: Sendable {
    static let shared = DirectAuthService()

    private let baseURL = Config.EXPO_PUBLIC_SUPABASE_URL
    private let anonKey = Config.EXPO_PUBLIC_SUPABASE_ANON_KEY

    /// Columns needed to build the session. `password_hash` is never among them.
    private static let profileColumns =
        "id,email,name,phone,avatar,member_since,role,courses_completed,total_earnings,referrals,created_at"

    /// The database is fast when it is up; a slow answer means something is wrong.
    private static let timeout: TimeInterval = 12

    private init() {}

    /// Whether a direct fallback is even possible on this build.
    var isAvailable: Bool { !baseURL.isEmpty && !anonKey.isEmpty }

    /// Verifies credentials straight against the database.
    ///
    /// Returns `unavailable` for anything that is not a definitive answer, so
    /// the caller can keep showing a retry prompt rather than a credential error.
    func login(email: String, password: String) async -> DirectLoginOutcome {
        guard isAvailable else {
            return .unavailable(reason: "Database credentials are not configured")
        }

        let normalizedEmail = email.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        let passwordHash = Self.sha256Hex(password)

        guard let url = buildURL(email: normalizedEmail, passwordHash: passwordHash) else {
            return .unavailable(reason: "Could not build the database request")
        }

        var request = URLRequest(url: url)
        request.timeoutInterval = Self.timeout
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let http = response as? HTTPURLResponse else {
                return .unavailable(reason: "Unexpected response from the database")
            }
            guard (200..<300).contains(http.statusCode) else {
                return .unavailable(reason: "Database answered \(http.statusCode)")
            }

            let rows = try JSONDecoder().decode([DirectUserRow].self, from: data)

            // Empty means the email/hash pair matched nothing. The database
            // answered, so this is a real rejection rather than an outage.
            guard let row = rows.first else { return .invalidCredentials }

            return .success(row.authenticatedUser)
        } catch is DecodingError {
            return .unavailable(reason: "Could not read the database response")
        } catch {
            let isTimeout = (error as? URLError)?.code == .timedOut
            return .unavailable(
                reason: isTimeout ? "Database request timed out" : "Database was unreachable"
            )
        }
    }

    private func buildURL(email: String, passwordHash: String) -> URL? {
        var components = URLComponents(string: "\(baseURL)/rest/v1/users")
        components?.queryItems = [
            URLQueryItem(name: "select", value: Self.profileColumns),
            URLQueryItem(name: "email", value: "eq.\(email)"),
            URLQueryItem(name: "password_hash", value: "eq.\(passwordHash)"),
            URLQueryItem(name: "limit", value: "1"),
        ]
        return components?.url
    }

    /// Mirrors the backend's `hashPassword`: unsalted SHA-256, lower-case hex.
    private static func sha256Hex(_ value: String) -> String {
        let digest = SHA256.hash(data: Data(value.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}

/// A `users` row as returned by the REST endpoint (snake_case columns).
private nonisolated struct DirectUserRow: Decodable, Sendable {
    let id: String
    let email: String
    let name: String?
    let phone: String?
    let avatar: String?
    let memberSince: String?
    let role: String?
    let coursesCompleted: Int?
    let totalEarnings: Double?
    let referrals: Int?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case name
        case phone
        case avatar
        case memberSince = "member_since"
        case role
        case coursesCompleted = "courses_completed"
        case totalEarnings = "total_earnings"
        case referrals
        case createdAt = "created_at"
    }

    var authenticatedUser: AuthenticatedUser {
        AuthenticatedUser(
            id: id,
            email: email,
            name: name ?? email.split(separator: "@").first.map(String.init) ?? "Member",
            phone: phone,
            avatar: avatar,
            memberSince: memberSince,
            role: role,
            coursesCompleted: coursesCompleted,
            totalEarnings: totalEarnings,
            referrals: referrals,
            createdAt: createdAt
        )
    }
}
