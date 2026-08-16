//
//  BadgeView.swift
//  WesternCreditInstitute
//

import SwiftUI

nonisolated enum BadgeVariant: Sendable {
    case primary
    case success
    case warning
    case error
    case info
    case neutral
}

/// Pill label matching the shared `Badge` component.
struct BadgeView: View {
    @Environment(ThemeManager.self) private var theme

    let text: String
    var variant: BadgeVariant = .neutral
    var symbol: String?
    var compact: Bool = true

    var body: some View {
        let colors = theme.colors
        let tint: Color = {
            switch variant {
            case .primary: return colors.primary
            case .success: return colors.success
            case .warning: return colors.warning
            case .error: return colors.error
            case .info: return colors.info
            case .neutral: return colors.textSecondary
            }
        }()

        HStack(spacing: 4) {
            if let symbol {
                Image(systemName: symbol)
                    .font(.system(size: compact ? 9 : 11, weight: .bold))
            }
            Text(text)
                .font(.system(size: compact ? 11 : 13, weight: .bold))
                .lineLimit(1)
        }
        .foregroundStyle(tint)
        .padding(.horizontal, compact ? 8 : 10)
        .padding(.vertical, compact ? 4 : 6)
        .background(tint.opacity(theme.isDark ? 0.22 : 0.12))
        .clipShape(.capsule)
    }
}
