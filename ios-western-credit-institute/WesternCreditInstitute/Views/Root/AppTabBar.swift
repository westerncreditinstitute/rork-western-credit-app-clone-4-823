//
//  AppTabBar.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Floating, frosted pill tab bar. Each destination owns a vivid accent color
/// and the selected tab lights up inside an animated glow bubble.
struct AppTabBar: View {
    @Environment(ThemeManager.self) private var theme

    @Binding var selection: AppTab
    let badgeCounts: [AppTab: Int]

    /// Height of the pill itself, excluding the outer padding.
    static let pillHeight: CGFloat = 58

    var body: some View {
        HStack(alignment: .center, spacing: 0) {
            ForEach(AppTab.barCases) { tab in
                Button {
                    guard selection != tab else { return }
                    Haptics.selection()
                    withAnimation(.spring(response: 0.34, dampingFraction: 0.7)) {
                        selection = tab
                    }
                } label: {
                    tabItem(for: tab)
                }
                .buttonStyle(TabPressStyle())
                .accessibilityLabel(tab.title)
                .accessibilityAddTraits(isActive(tab) ? [.isSelected, .isButton] : .isButton)
            }
        }
        .padding(.horizontal, 2)
        .frame(height: Self.pillHeight)
        .background {
            ZStack {
                RoundedRectangle(cornerRadius: 26, style: .continuous)
                    .fill(.ultraThinMaterial)
                RoundedRectangle(cornerRadius: 26, style: .continuous)
                    .fill(barTint)
            }
        }
        .overlay {
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .strokeBorder(borderTint, lineWidth: 0.5)
        }
        .clipShape(.rect(cornerRadius: 26, style: .continuous))
        .shadow(
            color: theme.isDark ? .black.opacity(0.5) : Color(hex: "#002B5C").opacity(0.16),
            radius: 18,
            x: 0,
            y: 8
        )
        .padding(.horizontal, 12)
        .padding(.top, 6)
    }

    private var barTint: Color {
        theme.isDark
            ? Color(hex: "#0B1220").opacity(0.82)
            : Color.white.opacity(0.76)
    }

    private var borderTint: Color {
        theme.isDark
            ? Color(hex: "#94A3B8").opacity(0.18)
            : Color(hex: "#002B5C").opacity(0.10)
    }

    /// "More" stays lit while any of the destinations it hosts is on screen.
    private func isActive(_ tab: AppTab) -> Bool {
        selection == tab || (tab == .more && selection.isHostedInMore)
    }

    private func tabItem(for tab: AppTab) -> some View {
        let isActive = isActive(tab)
        let tint = isActive ? tab.activeColor : tab.inactiveColor(isDark: theme.isDark)

        return VStack(spacing: 2) {
            ZStack {
                // Soft outer halo.
                Circle()
                    .fill(tab.activeColor.opacity(0.16))
                    .frame(width: 42, height: 42)
                    .scaleEffect(isActive ? 1 : 0.4)
                    .opacity(isActive ? 0.85 : 0)

                // Colored bubble behind the active icon.
                Circle()
                    .fill(tab.activeColor.opacity(0.17))
                    .overlay {
                        Circle().strokeBorder(tab.activeColor.opacity(0.35), lineWidth: 1)
                    }
                    .frame(width: 32, height: 32)
                    .scaleEffect(isActive ? 1 : 0.5)
                    .opacity(isActive ? 1 : 0)

                Image(systemName: tab.symbol(isActive: isActive))
                    .font(.system(size: 17, weight: isActive ? .bold : .medium))
                    .foregroundStyle(tint)
                    .offset(y: isActive ? -1.5 : 0)
                    .symbolEffect(.bounce, value: isActive)
                    .overlay(alignment: .topTrailing) {
                        if let count = badgeCounts[tab], count > 0 {
                            Text(count > 9 ? "9+" : "\(count)")
                                .font(.system(size: 9, weight: .heavy))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 3)
                                .frame(minWidth: 16, minHeight: 16)
                                .background(Color(hex: "#EF4444"), in: .capsule)
                                .overlay {
                                    Capsule().strokeBorder(badgeRingColor, lineWidth: 1.5)
                                }
                                .offset(x: 12, y: -8)
                                .transition(.scale.combined(with: .opacity))
                        }
                    }
            }
            .frame(width: 42, height: 32)

            Text(tab.title)
                .font(.system(size: 9.5, weight: isActive ? .heavy : .semibold))
                .foregroundStyle(tint)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 50)
        .contentShape(.rect)
    }

    private var badgeRingColor: Color {
        theme.isDark ? Color(hex: "#0B1220") : .white
    }
}

/// Gentle press-down and spring-back for each tab button.
private struct TabPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.88 : 1)
            .animation(.spring(response: 0.25, dampingFraction: 0.6), value: configuration.isPressed)
    }
}
