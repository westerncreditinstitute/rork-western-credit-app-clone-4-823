//
//  KeychainStore.swift
//  WesternCreditInstitute
//

import Foundation
import Security

/// Minimal Keychain wrapper for the session credential.
///
/// The session lives here rather than in `UserDefaults` because the stored blob
/// is what authenticates every protected request — `UserDefaults` is a plist in
/// the app container and is included in unencrypted backups.
///
/// `kSecAttrAccessibleAfterFirstUnlock` keeps the session readable for
/// background refreshes after the device has been unlocked once, but never
/// while the device is locked from cold boot, and `ThisDeviceOnly` stops the
/// credential from travelling to another device in an iCloud backup.
nonisolated enum KeychainStore {
    private static let service = "com.westerncreditinstitute.auth"

    /// Stores `data`, replacing any existing value for `account`.
    @discardableResult
    static func set(_ data: Data, for account: String) -> Bool {
        let base: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]

        // Delete-then-add keeps this a true upsert; SecItemUpdate would fail
        // when nothing is stored yet.
        SecItemDelete(base as CFDictionary)

        var insert = base
        insert[kSecValueData as String] = data
        insert[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

        let status = SecItemAdd(insert as CFDictionary, nil)
        if status != errSecSuccess {
            // Never log the payload — only the OSStatus.
            print("[Keychain] Failed to store \(account): OSStatus \(status)")
        }
        return status == errSecSuccess
    }

    /// Reads the stored value, or `nil` when absent.
    static func data(for account: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess else { return nil }
        return item as? Data
    }

    /// Removes the stored value. Succeeds silently when nothing is stored.
    static func remove(_ account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
