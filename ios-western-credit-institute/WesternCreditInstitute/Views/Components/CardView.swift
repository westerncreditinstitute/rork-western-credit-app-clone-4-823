//
//  CardView.swift
//  WesternCreditInstitute
//

import SwiftUI

nonisolated enum CardVariant: Sendable {
    case elevated
    case outlined
    case flat
}

/// Surface container matching the shared `Card` component.
struct CardView<Content: View>: View {
    @Environment(ThemeManager.self) private var theme

    var variant: CardVariant = .elevated
    var padding: CGFloat = Spacing.md
    var cornerRadius: CGFloat = Radius.lg
    @ViewBuilder var content: () -> Content

    var body: some View {
        let colors = theme.colors
        content()
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(colors.surface)
            .clipShape(.rect(cornerRadius: cornerRadius))
            .overlay {
                if variant == .outlined {
                    RoundedRectangle(cornerRadius: cornerRadius)
                        .stroke(colors.border, lineWidth: 1)
                }
            }
            .shadow(
                color: variant == .elevated ? colors.shadow : .clear,
                radius: variant == .elevated ? 10 : 0,
                x: 0,
                y: variant == .elevated ? 4 : 0
            )
    }
}
