//
//  EmptyStateView.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Placeholder shown when a list has no results.
struct EmptyStateView: View {
    @Environment(ThemeManager.self) private var theme

    let symbol: String
    let title: String
    let message: String

    var body: some View {
        let colors = theme.colors
        VStack(spacing: Spacing.md) {
            Image(systemName: symbol)
                .font(.system(size: 34, weight: .semibold))
                .foregroundStyle(colors.textLight)
                .frame(width: 78, height: 78)
                .background(colors.surfaceAlt)
                .clipShape(.circle)

            Text(title)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(colors.text)

            Text(message)
                .font(.system(size: 14))
                .foregroundStyle(colors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xxl)
    }
}
