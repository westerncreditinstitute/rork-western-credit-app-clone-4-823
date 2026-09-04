//
//  AppTab.swift
//  WesternCreditInstitute
//

import SwiftUI

/// The seven primary destinations, each with its own vivid accent color and
/// a filled/outline symbol pair for the selected and idle states.
nonisolated enum AppTab: String, CaseIterable, Identifiable, Sendable {
    case home
    case courses
    case wallet
    case earnings
    case hirePro
    case profile
    case admin

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: return "Home"
        case .courses: return "Courses"
        case .wallet: return "Wallet"
        case .earnings: return "Earnings"
        case .hirePro: return "Hire Pro"
        case .profile: return "Profile"
        case .admin: return "Admin"
        }
    }

    /// Solid symbol shown when the tab is selected.
    var activeSymbol: String {
        switch self {
        case .home: return "house.fill"
        case .courses: return "graduationcap.fill"
        case .wallet: return "wallet.bifold.fill"
        case .earnings: return "chart.line.uptrend.xyaxis.circle.fill"
        case .hirePro: return "checkmark.seal.fill"
        case .profile: return "person.crop.circle.fill"
        case .admin: return "checkmark.shield.fill"
        }
    }

    /// Outline symbol shown when the tab is idle.
    var inactiveSymbol: String {
        switch self {
        case .home: return "house"
        case .courses: return "graduationcap"
        case .wallet: return "wallet.bifold"
        case .earnings: return "chart.line.uptrend.xyaxis.circle"
        case .hirePro: return "checkmark.seal"
        case .profile: return "person.crop.circle"
        case .admin: return "checkmark.shield"
        }
    }

    func symbol(isActive: Bool) -> String {
        isActive ? activeSymbol : inactiveSymbol
    }

    /// Fully saturated accent that pops against the frosted navy bar.
    var activeColor: Color {
        switch self {
        case .home: return Color(hex: "#10B981")
        case .courses: return Color(hex: "#3B82F6")
        case .wallet: return Color(hex: "#06B6D4")
        case .earnings: return Color(hex: "#F59E0B")
        case .hirePro: return Color(hex: "#8B5CF6")
        case .profile: return Color(hex: "#F43F5E")
        case .admin: return Color(hex: "#14B8A6")
        }
    }

    func inactiveColor(isDark: Bool) -> Color {
        Color(hex: isDark ? "#64748B" : "#94A3B8")
    }
}
