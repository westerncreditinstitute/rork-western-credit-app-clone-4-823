//
//  CreditTipDetailView.swift
//  WesternCreditInstitute
//

import SwiftUI

struct CreditTipDetailView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss

    let tip: CreditTip

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    HStack {
                        BadgeView(text: tip.category.label.uppercased(), variant: .warning, symbol: tip.category.symbol, compact: false)
                        Spacer()
                        Text(Format.mediumDate(tip.publishDate))
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(theme.colors.textLight)
                    }

                    Text(tip.title)
                        .font(.system(size: 26, weight: .heavy))
                        .foregroundStyle(theme.colors.text)

                    Text(tip.content)
                        .font(.system(size: 16))
                        .lineSpacing(5)
                        .foregroundStyle(theme.colors.textSecondary)

                    CardView(variant: .outlined) {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            HStack(spacing: Spacing.sm) {
                                Image(systemName: "graduationcap.fill")
                                    .foregroundStyle(theme.colors.secondary)
                                Text("Go deeper")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundStyle(theme.colors.text)
                            }
                            Text("Our ACE courses cover this topic in depth with dispute templates, scripts and compliance checklists.")
                                .font(.system(size: 13))
                                .foregroundStyle(theme.colors.textSecondary)
                        }
                    }
                }
                .padding(Spacing.md)
            }
            .background(theme.colors.background)
            .navigationTitle("Credit Tip")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .fontWeight(.semibold)
                }
            }
        }
    }
}
