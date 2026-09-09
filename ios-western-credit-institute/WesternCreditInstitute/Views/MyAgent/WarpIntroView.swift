//
//  WarpIntroView.swift
//  WesternCreditInstitute
//

import SwiftUI

/// The My Agent "entering hyperspace" intro.
///
/// A starfield streaks outward from a vanishing point while a mission-control
/// boot sequence runs underneath. Tapping anywhere skips it. Plays once per
/// app session (`shownThisSession`), then never again until a cold start —
/// the spectacle would wear thin on every visit.
struct WarpIntroView: View {
    var onDone: () -> Void

    /// True after the intro has played once in this app session.
    static var shownThisSession = false

    // MARK: - Animation state

    @State private var bootVisible: [Bool] = Array(repeating: false, count: WarpIntroView.bootLines.count)
    @State private var progressStarted = false
    @State private var flash = false
    @State private var contentOpacity: Double = 1
    @State private var ringPhase = false
    @State private var finished = false

    private static let bootLines = [
        "AUTHENTICATING OPERATOR ........ OK",
        "SYNCING DISPUTE VAULT ......... OK",
        "LOADING FDCPA / FCRA MODULES .. OK",
        "AGENT HANDSHAKE ............... LIVE",
    ]

    private static let tunnelDuration: TimeInterval = 2.6

    var body: some View {
        ZStack {
            Color(hex: "#05010F").ignoresSafeArea()

            starfield

            // Radial glow at the vanishing point.
            Circle()
                .fill(Color(hex: "#A78BFA").opacity(0.14))
                .frame(width: 260, height: 260)
                .blur(radius: 6)

            hud
        }
        .opacity(contentOpacity)
        .overlay {
            Rectangle()
                .fill(Color(hex: "#EDE9FE"))
                .opacity(flash ? 1 : 0)
                .ignoresSafeArea()
                .allowsHitTesting(false)
        }
        .contentShape(.rect)
        .onTapGesture { finish() }
        .task { await run() }
        .accessibilityLabel("Establishing agent link")
        .accessibilityAddTraits(.isButton)
        .accessibilityHint("Double tap to skip")
    }

    // MARK: - Starfield

    /// Deterministically seeded streaks, redrawn every frame by the timeline.
    private var starfield: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let center = CGPoint(x: size.width / 2, y: size.height / 2)
                let maxRadius = hypot(size.width, size.height) / 2
                WarpIntroView.drawStars(
                    in: &context,
                    size: size,
                    center: center,
                    maxRadius: maxRadius,
                    date: timeline.date
                )
            }
        }
        .ignoresSafeArea()
    }

    /// Pure drawing routine: one streak per seed slot, positions driven by
    /// `date` so consecutive frames animate smoothly.
    private nonisolated static func drawStars(
        in context: inout GraphicsContext,
        size: CGSize,
        center: CGPoint,
        maxRadius: CGFloat,
        date: Date
    ) {
        let now = date.timeIntervalSinceReferenceDate

        let palette: [Color] = [
            Color(hex: "#A78BFA"),
            Color(hex: "#67E8F9"),
            Color(hex: "#E9D5FF"),
            .white,
            Color(hex: "#5EEAD4"),
        ]

        var seed: UInt64 = 42

        func rand() -> Double {
            seed = (seed &* 16807) % 2147483647
            return Double(seed) / 2147483647
        }

        for index in 0..<34 {
            let angle = rand() * .pi * 2
            let offset = rand() * 1600
            let duration = 900 + rand() * 700
            let distance = 0.55 + rand() * 0.75
            let thickness = 1.5 + rand() * 2
            let color = palette[index % palette.count]

            // Progress through this star's streak cycle.
            let cycle = ((now * 1000 + offset).truncatingRemainder(dividingBy: duration)) / duration
            let eased = cycle * cycle
            let inner = 18.0
            let outer = inner + eased * maxRadius * distance

            let start = CGPoint(
                x: center.x + cos(angle) * inner,
                y: center.y + sin(angle) * inner
            )
            let end = CGPoint(
                x: center.x + cos(angle) * outer,
                y: center.y + sin(angle) * outer
            )

            // Bright, then fading out at the screen edge.
            let opacity = min(1, cycle / 0.12) * (cycle > 0.8 ? (1 - cycle) / 0.2 : 1)
            context.stroke(
                Path { p in
                    p.move(to: start)
                    p.addLine(to: end)
                },
                with: .color(color.opacity(opacity)),
                style: StrokeStyle(lineWidth: thickness, lineCap: .round)
            )
        }
    }

    // MARK: - HUD

    private var hud: some View {
        VStack(spacing: Spacing.lg) {
            ZStack {
                Circle()
                    .strokeBorder(Color(hex: "#A78BFA"), lineWidth: 2)
                    .frame(width: 110, height: 110)
                    .scaleEffect(ringPhase ? 2.2 : 0.35)
                    .opacity(ringPhase ? 0 : 0.9)

                Circle()
                    .fill(Color(hex: "#C4B5FD"))
                    .frame(width: 14, height: 14)
            }
            .frame(width: 120, height: 120)

            Text("ESTABLISHING AGENT LINK")
                .font(.system(size: 17, weight: .heavy))
                .kerning(4)
                .foregroundStyle(Color(hex: "#E9D5FF"))

            VStack(alignment: .leading, spacing: 6) {
                ForEach(Array(Self.bootLines.enumerated()), id: \.offset) { index, line in
                    Text(line)
                        .font(.system(size: 11, weight: .medium, design: .monospaced))
                        .foregroundStyle(Color(hex: "#8BE9D9"))
                        .opacity(bootVisible[index] ? 1 : 0)
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 14)
            .background(
                Color(hex: "#A78BFA").opacity(0.07),
                in: .rect(cornerRadius: Radius.md, style: .continuous)
            )
            .overlay {
                RoundedRectangle(cornerRadius: Radius.md, style: .continuous)
                    .strokeBorder(Color(hex: "#A78BFA").opacity(0.25), lineWidth: 1)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color(hex: "#A78BFA").opacity(0.18))
                    Capsule()
                        .fill(Color(hex: "#A78BFA"))
                        .frame(width: progressStarted ? geo.size.width : geo.size.width * 0.04)
                        .animation(.easeInOut(duration: Self.tunnelDuration - 0.3), value: progressStarted)
                }
            }
            .frame(width: 220, height: 4)

            Text("TAP TO SKIP")
                .font(.system(size: 10, weight: .heavy))
                .kerning(3)
                .foregroundStyle(Color(hex: "#E9D5FF").opacity(0.4))
        }
        .padding(.horizontal, Spacing.xl)
    }

    // MARK: - Sequence

    private func run() async {
        // Boot lines cascade in, the progress bar fills, then the jump.
        for index in bootVisible.indices {
            try? await Task.sleep(for: .milliseconds(300 + index * 520))
            guard !finished else { return }
            withAnimation(.easeIn(duration: 0.24)) { bootVisible[index] = true }
        }

        withAnimation(.easeInOut(duration: 0.9)) { ringPhase = true }
        progressStarted = true

        try? await Task.sleep(for: .seconds(1.0))
        guard !finished else { return }

        // The pulse repeats for the remainder of the tunnel.
        withAnimation(.easeOut(duration: 1.1).repeatForever(autoreverses: false)) {
            ringPhase = true
        }

        try? await Task.sleep(for: .seconds(1.6))
        guard !finished else { return }
        finish()
    }

    private func finish() {
        guard !finished else { return }
        finished = true
        Self.shownThisSession = true
        withAnimation(.easeIn(duration: 0.18)) { flash = true }
        withAnimation(.easeIn(duration: 0.45).delay(0.15)) {
            contentOpacity = 0
        }
        Task {
            try? await Task.sleep(for: .milliseconds(620))
            onDone()
        }
    }
}
