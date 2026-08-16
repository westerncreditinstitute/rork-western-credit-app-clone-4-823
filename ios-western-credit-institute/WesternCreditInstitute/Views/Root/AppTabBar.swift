//
//  AppTabBar.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Custom blurred tab bar that keeps all seven destinations visible,
/// matching the cross-platform navigation design.
struct AppTabBar: View {
    @Environment(ThemeManager.self) private var theme

    @Binding var selection: AppTab
    let badgeCounts: [AppTab: Int]

    var body: some View {
        let colors = theme.colors

        HStack(alignment: .top, spacing: 0) {
            ForEach(AppTab.allCases) { tab in
                Button {
                    guard selection != tab else { return }
                    Haptics.selection()
                    withAnimation(.spring(response: 0.32, dampingFraction: 0.72)) {
                        selection = tab
                    }
                } label: {
                    tabItem(for: tab)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(tab.title)
                .accessibilityAddTraits(selection == tab ? [.isSelected, .isButton] : .isButton)
            }
        }
        .padding(.top, 8)
        .padding(.horizontal, 2)
        .background {
            ZStack {
                Rectangle()
                    .fill(.ultraThinMaterial)
                Rectangle()
                    .fill(colors.surface.opacity(theme.isDark ? 0.55 : 0.65))
            }
            .ignoresSafeArea(edges: .bottom)
        }
        .overlay(alignment: .top) {
            Rectangle()
                .fill(colors.border)
                .frame(height: 0.5)
        }
    }

    private func tabItem(for tab: AppTab) -> some View {
        let isActive = selection == tab
        let tint = isActive ? tab.activeColor : tab.inactiveColor

        return VStack(spacing: 4) {
            ZStack {
                if isActive {
                    Circle()
                        .fill(tab.activeColor.opacity(0.16))
                        .frame(width: 34, height: 34)
                        .transition(.scale.combined(with: .opacity))
                }

                Image(systemName: tab.symbol)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(tint)
                    .symbolEffect(.bounce, value: isActive)
                    .overlay(alignment: .topTrailing) {
                        if let count = badgeCounts[tab], count > 0 {
                            Text("\(min(count, 9))")
                                .font(.system(size: 9, weight: .heavy))
                                .foregroundStyle(.white)
                                .frame(width: 15, height: 15)
                                .background(Color(hex: "#EF4444"))
                                .clipShape(.circle)
                                .offset(x: 10, y: -7)
                        }
                    }
            }
            .frame(height: 34)

            Text(tab.title)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(tint)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 52)
        .contentShape(.rect)
    }
}
