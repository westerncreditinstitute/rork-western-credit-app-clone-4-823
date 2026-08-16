//
//  ProgressBarView.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Animated progress track matching the shared `ProgressBar` component.
struct ProgressBarView: View {
    @Environment(ThemeManager.self) private var theme

    let progress: Int
    var height: CGFloat = 6
    var showLabel: Bool = false
    var tint: Color?

    @State private var animatedProgress: Double = 0

    var body: some View {
        let colors = theme.colors
        let accent = tint ?? colors.secondary

        HStack(spacing: Spacing.sm) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(colors.surfaceAlt)
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [accent, accent.opacity(0.75)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * animatedProgress)
                }
            }
            .frame(height: height)

            if showLabel {
                Text("\(progress)%")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(accent)
                    .monospacedDigit()
                    .frame(width: 38, alignment: .trailing)
            }
        }
        .onAppear {
            withAnimation(.spring(response: 0.9, dampingFraction: 0.8).delay(0.15)) {
                animatedProgress = Double(max(0, min(100, progress))) / 100
            }
        }
        .onChange(of: progress) { _, newValue in
            withAnimation(.spring(response: 0.5, dampingFraction: 0.85)) {
                animatedProgress = Double(max(0, min(100, newValue))) / 100
            }
        }
    }
}
