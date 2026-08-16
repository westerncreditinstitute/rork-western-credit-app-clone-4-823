//
//  AppTheme.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Color palette mirroring the shared design tokens used across platforms.
nonisolated struct AppTheme: Sendable {
    let primary: Color
    let primaryLight: Color
    let primaryDark: Color
    let secondary: Color
    let secondaryLight: Color
    let accent: Color
    let accentLight: Color
    let background: Color
    let surface: Color
    let surfaceAlt: Color
    let surfaceElevated: Color
    let text: Color
    let textSecondary: Color
    let textLight: Color
    let textInverse: Color
    let border: Color
    let borderLight: Color
    let success: Color
    let successLight: Color
    let warning: Color
    let warningLight: Color
    let error: Color
    let errorLight: Color
    let info: Color
    let infoLight: Color
    let overlay: Color
    let gradientPrimary: [Color]
    let gradientSecondary: [Color]
    let gradientAccent: [Color]
    let gradientHeader: [Color]
    let shadow: Color

    static let light = AppTheme(
        primary: Color(hex: "#002B5C"),
        primaryLight: Color(hex: "#003D82"),
        primaryDark: Color(hex: "#001F42"),
        secondary: Color(hex: "#10B981"),
        secondaryLight: Color(hex: "#34D399"),
        accent: Color(hex: "#10B981"),
        accentLight: Color(hex: "#6EE7B7"),
        background: Color(hex: "#F8FAFC"),
        surface: Color(hex: "#FFFFFF"),
        surfaceAlt: Color(hex: "#F1F5F9"),
        surfaceElevated: Color(hex: "#FFFFFF"),
        text: Color(hex: "#0F172A"),
        textSecondary: Color(hex: "#475569"),
        textLight: Color(hex: "#94A3B8"),
        textInverse: Color(hex: "#FFFFFF"),
        border: Color(hex: "#E2E8F0"),
        borderLight: Color(hex: "#F1F5F9"),
        success: Color(hex: "#10B981"),
        successLight: Color(hex: "#D1FAE5"),
        warning: Color(hex: "#F59E0B"),
        warningLight: Color(hex: "#FEF3C7"),
        error: Color(hex: "#EF4444"),
        errorLight: Color(hex: "#FEE2E2"),
        info: Color(hex: "#3B82F6"),
        infoLight: Color(hex: "#DBEAFE"),
        overlay: Color(hex: "#0F172A").opacity(0.5),
        gradientPrimary: [Color(hex: "#002B5C"), Color(hex: "#004494")],
        gradientSecondary: [Color(hex: "#10B981"), Color(hex: "#059669")],
        gradientAccent: [Color(hex: "#10B981"), Color(hex: "#34D399")],
        gradientHeader: [Color(hex: "#001F42"), Color(hex: "#003D82")],
        shadow: Color(hex: "#0F172A").opacity(0.08)
    )

    static let dark = AppTheme(
        primary: Color(hex: "#60A5FA"),
        primaryLight: Color(hex: "#93C5FD"),
        primaryDark: Color(hex: "#3B82F6"),
        secondary: Color(hex: "#34D399"),
        secondaryLight: Color(hex: "#6EE7B7"),
        accent: Color(hex: "#34D399"),
        accentLight: Color(hex: "#A7F3D0"),
        background: Color(hex: "#0F172A"),
        surface: Color(hex: "#1E293B"),
        surfaceAlt: Color(hex: "#334155"),
        surfaceElevated: Color(hex: "#1E293B"),
        text: Color(hex: "#F8FAFC"),
        textSecondary: Color(hex: "#CBD5E1"),
        textLight: Color(hex: "#64748B"),
        textInverse: Color(hex: "#0F172A"),
        border: Color(hex: "#334155"),
        borderLight: Color(hex: "#1E293B"),
        success: Color(hex: "#34D399"),
        successLight: Color(hex: "#064E3B"),
        warning: Color(hex: "#FBBF24"),
        warningLight: Color(hex: "#78350F"),
        error: Color(hex: "#F87171"),
        errorLight: Color(hex: "#7F1D1D"),
        info: Color(hex: "#60A5FA"),
        infoLight: Color(hex: "#1E3A8A"),
        overlay: Color.black.opacity(0.7),
        gradientPrimary: [Color(hex: "#1E293B"), Color(hex: "#334155")],
        gradientSecondary: [Color(hex: "#059669"), Color(hex: "#10B981")],
        gradientAccent: [Color(hex: "#10B981"), Color(hex: "#34D399")],
        gradientHeader: [Color(hex: "#0F172A"), Color(hex: "#1E293B")],
        shadow: Color.black.opacity(0.3)
    )
}

/// Spacing scale shared with the design tokens.
nonisolated enum Spacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
    static let xxl: CGFloat = 48
}

/// Corner radius scale shared with the design tokens.
nonisolated enum Radius {
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 20
    static let xxl: CGFloat = 28
}
