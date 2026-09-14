//
//  AuthService.swift
//  WesternCreditInstitute
//

import Foundation

/// Account endpoints (`users.*`).
///
/// Both procedures are public — they are how a session is obtained in the first
/// place — and both return the full account record on success.
nonisolated final class AuthService: Sendable {
    static let shared = AuthService()

    private let client = TRPCClient.shared

    private init() {}

    var isConfigured: Bool { client.isConfigured }

    /// Exchanges credentials for the account record.
    ///
    /// Throws `TRPCClientError.server` with "Invalid email or password" when the
    /// credentials are wrong — that message is surfaced to the user as-is.
    func login(email: String, password: String) async throws -> AuthenticatedUser {
        guard isConfigured else { throw TRPCClientError.notConfigured }

        let input: [String: Any] = [
            "json": [
                "email": email.lowercased().trimmingCharacters(in: .whitespacesAndNewlines),
                "password": password,
            ]
        ]
        return try await client.mutate("users.login", input: input)
    }

    /// Creates an account and returns it.
    ///
    /// The server rejects a duplicate email with "An account with this email
    /// already exists", which the caller shows verbatim.
    func register(
        name: String,
        email: String,
        password: String,
        phone: String?,
        desiredTier: SubscriptionTier,
        promoCode: String?
    ) async throws -> AuthenticatedUser {
        guard isConfigured else { throw TRPCClientError.notConfigured }

        var payload: [String: Any] = [
            "name": name.trimmingCharacters(in: .whitespacesAndNewlines),
            "email": email.lowercased().trimmingCharacters(in: .whitespacesAndNewlines),
            "password": password,
            // Only 'free' and 'ace1_student' are accepted at sign-up; the CSO
            // tier is granted later, so anything else registers as free.
            "desiredTier": desiredTier == .ace1Student ? "ace1_student" : "free",
        ]

        if let phone, !phone.isEmpty {
            payload["phone"] = phone
        }
        if let promoCode, !promoCode.isEmpty {
            payload["promoCode"] = promoCode
        }

        return try await client.mutate("users.register", input: ["json": payload])
    }
}
