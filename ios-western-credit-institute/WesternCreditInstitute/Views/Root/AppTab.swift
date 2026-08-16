//
//  AppTab.swift
//  WesternCreditInstitute
//

import SwiftUI

/// The seven primary destinations, each with its own accent color.
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

    var symbol: String {
        switch self {
        case .home: return "house.fill"
        case .courses: return "book.fill"
        case .wallet: return "wallet.pass.fill"
        case .earnings: return "dollarsign.circle.fill"
        case .hirePro: return "person.crop.circle.badge.checkmark"
        case .profile: return "person.fill"
        case .admin: return "gearshape.fill"
        }
    }

    var activeColor: Color {
        switch self {
        case .home: return Color(hex: "#FF6B6B")
        case .courses: return Color(hex: "#4ECDC4")
        case .wallet: return Color(hex: "#45B7D1")
        case .earnings: return Color(hex: "#96CEB4")
        case .hirePro: return Color(hex: "#DDA0DD")
        case .profile: return Color(hex: "#FFB347")
        case .admin: return Color(hex: "#87CEEB")
        }
    }

    var inactiveColor: Color { Color(hex: "#9CA3AF") }
}
