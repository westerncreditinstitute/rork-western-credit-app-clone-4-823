//
//  AuthSessionStore.swift
//  WesternCreditInstitute
//

import Foundation
import os

/// Process-wide holder for the signed-in session.
///
/// Two consumers need it and they live on different sides of the actor
/// boundary: `AuthStore` drives the UI on the main actor, while `TRPCClient`
/// attaches the credential from whatever thread a request happens to be on.
/// This type is the shared, lock-protected middle so neither has to reach into
/// the other.
///
/// ## On the credential itself
/// The backend accepts `Bearer base64({ id, email })` and trusts it verbatim —
/// there is no signature and no server-side session record, so anyone who knows
/// an email and id can mint a valid header. Persisting it in the Keychain is
/// still correct (it keeps the value out of plist backups), but it does not
/// make the scheme secure. Real bearer tokens have to be issued and verified
/// server-side before this can be treated as authentication rather than
/// identification.
nonisolated final class AuthSessionStore: Sendable {
    static let shared = AuthSessionStore()

    /// Posted when the server rejects a stored credential, so the UI can drop
    /// back to sign-in from wherever the failing request was made.
    static let sessionExpired = Notification.Name("wci.auth.sessionExpired")

    private static let keychainAccount = "session"

    /// Guards `cached` so concurrent requests can read the token safely.
    private let cached = OSAllocatedUnfairLock<AuthSession?>(initialState: nil)

    private init() {
        // Warm the in-memory copy once so request-time reads never touch the
        // Keychain (which can block while the device is locked).
        let restored = Self.loadFromKeychain()
        cached.withLock { $0 = restored }
    }

    /// The current session, or `nil` when signed out.
    var session: AuthSession? {
        cached.withLock { $0 }
    }

    /// The `Authorization` header value, or `nil` when signed out.
    var bearerToken: String? {
        guard let session = cached.withLock({ $0 }) else { return nil }
        let token = session.bearerToken
        return token.isEmpty ? nil : token
    }

    /// Persists `session` and makes it effective for subsequent requests.
    func save(_ session: AuthSession) {
        cached.withLock { $0 = session }
        guard let data = try? JSONEncoder().encode(session) else {
            print("[Auth] Failed to encode session for storage")
            return
        }
        KeychainStore.set(data, for: Self.keychainAccount)
    }

    /// Clears the session from memory and the Keychain.
    func clear() {
        cached.withLock { $0 = nil }
        KeychainStore.remove(Self.keychainAccount)
    }

    /// Announces that a request was rejected with 401.
    ///
    /// Only fires when a session is actually stored: an unauthenticated call to
    /// a protected route is a caller bug, not an expiry, and must not bounce a
    /// signed-out user around.
    func reportRejectedCredential() {
        guard cached.withLock({ $0 }) != nil else { return }
        NotificationCenter.default.post(name: Self.sessionExpired, object: nil)
    }

    private static func loadFromKeychain() -> AuthSession? {
        guard let data = KeychainStore.data(for: keychainAccount) else { return nil }
        do {
            return try JSONDecoder().decode(AuthSession.self, from: data)
        } catch {
            // A stored blob we can no longer read is worse than none: drop it
            // so the user gets a clean sign-in instead of a broken session.
            print("[Auth] Discarding unreadable stored session")
            KeychainStore.remove(keychainAccount)
            return nil
        }
    }
}
