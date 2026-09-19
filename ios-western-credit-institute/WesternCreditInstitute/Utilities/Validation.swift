//
//  Validation.swift
//  WesternCreditInstitute
//

import Foundation

/// Shared input validation, mirroring the Expo app's `utils/validation.ts`.
nonisolated enum Validation {
    /// True when `id` is a real UUID rather than a demo/seed identifier.
    ///
    /// Every row the backend writes for a user is keyed by a Supabase `uuid`
    /// column, so a placeholder id like `"1"` or `"demo-1788728438079"` cannot
    /// be stored: Postgres rejects it and the write fails *after* the user has
    /// already done the work. Checking first lets the app say what is actually
    /// wrong (the account was never finished) instead of surfacing a database
    /// type error - the same guard the server now applies in `aiAgents`.
    static func isValidUUID(_ id: String) -> Bool {
        guard !id.isEmpty else { return false }
        return UUID(uuidString: id) != nil
    }

    /// Shown whenever a save is skipped because the signed-in account has no
    /// database-backed id. Worded to match the Expo alert so both apps explain
    /// the situation the same way.
    static let accountNotSetUpMessage =
        "Your account isn't fully set up yet, so this couldn't be saved. "
        + "Please log out and log back in, or create a real account instead of "
        + "continuing in demo mode."
}
