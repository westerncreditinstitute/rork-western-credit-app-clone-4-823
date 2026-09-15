//
//  AuthStore.swift
//  WesternCreditInstitute
//

import Foundation
import SwiftUI

/// Owns the signed-in state for the whole app.
///
/// Mirrors the Expo `AuthContext`: restore on launch, sign in / register
/// against the same `users.*` procedures, and sign out by clearing the stored
/// session. The credential itself lives in `AuthSessionStore`, which is what
/// `TRPCClient` reads when attaching the `Authorization` header.
@MainActor
@Observable
final class AuthStore {
    /// What the app shell should show.
    enum Phase: Equatable {
        /// Reading the stored session — briefly, on launch only.
        case restoring
        case signedOut
        case signedIn
    }

    private(set) var phase: Phase = .restoring
    private(set) var user: AuthenticatedUser?

    /// Set while a sign-in or registration request is in flight.
    private(set) var isSubmitting = false
    /// User-facing failure from the last attempt, cleared on the next one.
    private(set) var errorMessage: String?
    /// Explains why the user was returned to sign-in after a session expired.
    private(set) var expiryNotice: String?

    /// True from a successful registration until the course offer is shown.
    ///
    /// Everyone registers on the free tier, so this is the one moment to
    /// explain what the paid courses are. Held here rather than in the view
    /// because the sign-in screen is torn down the instant the session
    /// exists - the offer has to be presented by the shell that replaces it.
    private(set) var shouldPresentUpgradeOffer = false

    private let service = AuthService.shared
    private let directService = DirectAuthService.shared
    private let sessionStore = AuthSessionStore.shared

    init() {
        restore()
    }

    // MARK: - Session lifecycle

    /// Adopts any previously stored session. Synchronous so the first frame
    /// already knows which shell to show and no sign-in screen flashes.
    private func restore() {
        if let session = sessionStore.session {
            user = session.user
            phase = .signedIn
        } else {
            phase = .signedOut
        }
    }

    /// Signs in and stores the session.
    /// - Returns: `true` when the user is now signed in.
    @discardableResult
    func login(email: String, password: String) async -> Bool {
        guard validate(email: email, password: password) else { return false }

        beginSubmitting()
        defer { isSubmitting = false }

        do {
            let account = try await service.login(email: email, password: password)
            adopt(account)
            return true
        } catch {
            // The API tier is unreachable. The database lives on a different
            // host and is usually still healthy, so verify the password there
            // directly before telling the user to come back later.
            if let clientError = error as? TRPCClientError,
               clientError.isTransportFailure,
               directService.isAvailable {
                switch await directService.login(email: email, password: password) {
                case .success(let account):
                    adopt(account)
                    print("[Auth] Signed in via direct database fallback")
                    return true

                case .invalidCredentials:
                    // The database answered and said no. That is a real
                    // rejection, so report it as one rather than the network.
                    errorMessage = "Invalid email or password. Please try again."
                    return false

                case .unavailable(let reason):
                    print("[Auth] Direct fallback unavailable: \(reason)")
                }
            }

            errorMessage = Self.message(for: error, action: .signIn)
            return false
        }
    }

    /// Registers a new account and signs into it.
    ///
    /// A transport failure is reported as a retry, never as a success:
    /// fabricating a local account would hand the user an identity that exists
    /// on no other device and has no server-side record.
    /// - Returns: `true` when the user is now signed in.
    @discardableResult
    func register(
        name: String,
        email: String,
        password: String,
        confirmPassword: String,
        phone: String,
        desiredTier: SubscriptionTier,
        promoCode: String
    ) async -> Bool {
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "Please enter your name."
            return false
        }
        guard validate(email: email, password: password) else { return false }
        guard password.count >= 6 else {
            errorMessage = "Your password must be at least 6 characters."
            return false
        }
        guard password == confirmPassword else {
            errorMessage = "Those passwords don't match."
            return false
        }

        beginSubmitting()
        defer { isSubmitting = false }

        do {
            let account = try await service.register(
                name: name,
                email: email,
                password: password,
                phone: phone,
                desiredTier: desiredTier,
                promoCode: promoCode
            )
            adopt(account)
            shouldPresentUpgradeOffer = true
            return true
        } catch {
            errorMessage = Self.message(for: error, action: .register)
            return false
        }
    }

    /// Marks the post-registration course offer as shown, so it appears once.
    func consumeUpgradeOffer() {
        shouldPresentUpgradeOffer = false
    }

    /// Clears the session and returns to the sign-in screen.
    func signOut() {
        sessionStore.clear()
        user = nil
        errorMessage = nil
        expiryNotice = nil
        phase = .signedOut
    }

    /// Ends the session because the server rejected its credential.
    ///
    /// Called when any request comes back 401, so an invalidated account can't
    /// leave the app sitting in a signed-in shell where every load fails.
    func handleExpiredSession() {
        guard phase == .signedIn else { return }
        sessionStore.clear()
        user = nil
        phase = .signedOut
        expiryNotice = "Your session has expired. Please sign in again."
    }

    func clearError() {
        errorMessage = nil
    }

    func clearExpiryNotice() {
        expiryNotice = nil
    }

    // MARK: - Helpers

    private func adopt(_ account: AuthenticatedUser) {
        sessionStore.save(AuthSession(user: account))
        user = account
        errorMessage = nil
        expiryNotice = nil
        phase = .signedIn
    }

    private func beginSubmitting() {
        errorMessage = nil
        expiryNotice = nil
        isSubmitting = true
    }

    private func validate(email: String, password: String) -> Bool {
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.contains("@"), trimmed.contains("."), trimmed.count >= 5 else {
            errorMessage = "Please enter a valid email address."
            return false
        }
        guard !password.isEmpty else {
            errorMessage = "Please enter your password."
            return false
        }
        return true
    }

    private enum Action {
        case signIn
        case register
    }

    /// Turns a transport or procedure error into something actionable.
    private static func message(for error: Error, action: Action) -> String {
        guard let clientError = error as? TRPCClientError else {
            return "Something went wrong. Please try again."
        }

        switch clientError {
        case .offline, .serverWaking:
            // The attempt is safe to repeat — say so, rather than implying the
            // credentials were wrong.
            return action == .register
                ? "Can't reach the server, so your account wasn't created. Check your connection and try again in a moment."
                : "Can't reach the server right now. Check your connection and try signing in again in a moment."
        case .notConfigured:
            return "The app isn't configured to reach the server. Please reinstall or contact support."
        case .unauthorized:
            return "Invalid email or password. Please try again."
        case .server(let message):
            return message
        }
    }
}
