//
//  ThemeManager.swift
//  WesternCreditInstitute
//

import SwiftUI

nonisolated enum ThemeMode: String, CaseIterable, Identifiable, Sendable {
    case light
    case dark
    case system

    var id: String { rawValue }

    var label: String {
        switch self {
        case .light: return "Light"
        case .dark: return "Dark"
        case .system: return "System"
        }
    }

    var symbol: String {
        switch self {
        case .light: return "sun.max.fill"
        case .dark: return "moon.fill"
        case .system: return "iphone"
        }
    }
}

/// Owns the active theme mode and resolves it into a concrete palette.
@Observable
final class ThemeManager {
    private static let storageKey = "wci.theme.mode"

    var mode: ThemeMode {
        didSet { UserDefaults.standard.set(mode.rawValue, forKey: Self.storageKey) }
    }

    /// Mirrors the OS appearance so `.system` can resolve correctly.
    var systemIsDark: Bool = false

    init() {
        let stored = UserDefaults.standard.string(forKey: Self.storageKey)
        mode = ThemeMode(rawValue: stored ?? "") ?? .system
    }

    var isDark: Bool {
        switch mode {
        case .light: return false
        case .dark: return true
        case .system: return systemIsDark
        }
    }

    var colors: AppTheme { isDark ? .dark : .light }

    var preferredColorScheme: ColorScheme? {
        switch mode {
        case .light: return .light
        case .dark: return .dark
        case .system: return nil
        }
    }
}
