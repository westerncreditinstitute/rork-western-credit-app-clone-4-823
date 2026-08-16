//
//  BrandHeader.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Shared screen header with the title / subtitle pattern used on inner tabs.
struct ScreenHeader: View {
    @Environment(ThemeManager.self) private var theme

    let title: String
    let subtitle: String
    var trailingSymbol: String?
    var trailingAction: (() -> Void)?

    var body: some View {
        let colors = theme.colors

        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 30, weight: .heavy))
                    .foregroundStyle(colors.text)
                Text(subtitle)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(colors.textSecondary)
            }

            Spacer()

            if let trailingSymbol, let trailingAction {
                Button {
                    Haptics.light()
                    trailingAction()
                } label: {
                    Image(systemName: trailingSymbol)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(colors.primary)
                        .frame(width: 42, height: 42)
                        .background(colors.surfaceAlt)
                        .clipShape(.circle)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.top, Spacing.sm)
        .padding(.bottom, Spacing.md)
        .background(colors.surface)
    }
}

/// Wix-hosted brand wordmark used in the app's navigation bar.
struct BrandLogo: View {
    @Environment(ThemeManager.self) private var theme

    private var logoURL: String {
        theme.isDark
            ? "https://static.wixstatic.com/media/ec0146_ce8d0d3506564ee1841686216fee5650~mv2.png"
            : "https://static.wixstatic.com/media/ec0146_03bf3620526242a79ca153151cb09d7d~mv2.png"
    }

    var body: some View {
        AsyncImage(url: URL(string: logoURL)) { phase in
            if let image = phase.image {
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } else {
                Text("WESTERN CREDIT INSTITUTE")
                    .font(.system(size: 13, weight: .heavy))
                    .foregroundStyle(theme.colors.primary)
            }
        }
        .frame(width: 168, height: 40)
    }
}
