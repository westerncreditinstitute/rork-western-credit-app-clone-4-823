//
//  SectionHeader.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Icon + title row used above each content section.
struct SectionHeader<Trailing: View>: View {
    @Environment(ThemeManager.self) private var theme

    let title: String
    var symbol: String?
    var symbolTint: Color?
    @ViewBuilder var trailing: () -> Trailing

    var body: some View {
        HStack(spacing: Spacing.sm) {
            if let symbol {
                Image(systemName: symbol)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(symbolTint ?? theme.colors.secondary)
            }
            Text(title)
                .font(.system(size: 19, weight: .bold))
                .foregroundStyle(theme.colors.text)
            Spacer(minLength: Spacing.sm)
            trailing()
        }
    }
}

extension SectionHeader where Trailing == EmptyView {
    init(title: String, symbol: String? = nil, symbolTint: Color? = nil) {
        self.init(title: title, symbol: symbol, symbolTint: symbolTint) { EmptyView() }
    }
}
