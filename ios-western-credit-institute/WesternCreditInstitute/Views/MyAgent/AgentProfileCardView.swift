//
//  AgentProfileCardView.swift
//  WesternCreditInstitute
//

import SwiftUI

/// The "agent console" on the Overview tab: a dark, futuristic command-deck
/// surface with the realistic AI character portrait under a violet HUD glow,
/// monospace system readouts, and glowing action rows. Deliberately dark in
/// both themes so it reads as a separate, always-on instrument panel.
struct AgentProfileCardView: View {
    @Environment(ThemeManager.self) private var theme

    let agent: AIAgent
    var assignedDateText: String?
    /// Quick actions are hidden for free-tier users, matching the Expo card.
    var showsActions: Bool = true
    var onOpenChat: () -> Void
    var onOpenCreditRepair: () -> Void
    var onOpenDisputeTracker: () -> Void

    // Console palette — fixed so the panel looks identical day and night.
    private let consoleBG = Color(hex: "#0B1220")
    private let consoleText = Color(hex: "#E2E8F0")
    private let consoleMuted = Color(hex: "#7C8BA1")
    private let violet = Color(hex: "#A78BFA")
    private let teal = Color(hex: "#67E8F9")

    private var loadColor: Color {
        if agent.capacityFraction >= 1 { return Color(hex: "#F87171") }
        if agent.capacityFraction >= 0.8 { return Color(hex: "#FBBF24") }
        return teal
    }

    var body: some View {
        VStack(spacing: 0) {
            hero
            readouts
            if showsActions {
                actionsSection
            }
            footer
        }
        .background(consoleBG)
        .clipShape(.rect(cornerRadius: 22, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .strokeBorder(violet.opacity(0.28), lineWidth: 1)
        }
        .shadow(color: violet.opacity(0.25), radius: 20, x: 0, y: 8)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Your AI Dispute Assistant: \(agent.agentName)")
    }

    // MARK: - Hero

    /// The AI character portrait dissolving into the console body, framed by
    /// HUD corner brackets and a live-link chip.
    private var hero: some View {
        consoleBG
            .frame(height: 300)
            .overlay {
                portrait
                    .allowsHitTesting(false)
            }
            .overlay(alignment: .bottom) {
                // Fade the portrait into the console body.
                LinearGradient(
                    colors: [.clear, consoleBG.opacity(0.55), consoleBG],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .allowsHitTesting(false)
            }
            .overlay(alignment: .bottom) {
                // Violet aura rising from the bottom edge.
                LinearGradient(
                    colors: [.clear, violet.opacity(0.22)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 180)
                .offset(y: 40)
                .allowsHitTesting(false)
            }
            .overlay(alignment: .topLeading) { hudCorner(leading: true) }
            .overlay(alignment: .topTrailing) { hudCorner(leading: false) }
            .overlay(alignment: .topLeading) {
                HStack(spacing: 5) {
                    Image(systemName: "dot.radiowaves.left.and.right")
                        .font(.system(size: 10, weight: .bold))
                    Text("LINK ACTIVE")
                        .font(.system(size: 9, weight: .heavy))
                        .kerning(1.5)
                }
                .foregroundStyle(teal)
                .padding(.horizontal, 9)
                .padding(.vertical, 4)
                .background(
                    consoleBG.opacity(0.72),
                    in: .capsule
                )
                .overlay {
                    Capsule().strokeBorder(teal.opacity(0.5), lineWidth: 1)
                }
                .padding(.leading, 48)
                .padding(.top, 14)
            }
            .overlay(alignment: .bottomLeading) { identityPlate }
    }

    /// Portrait anchor following the Color+overlay pattern so `.fill` sizing
    /// never leaks outside the hero frame.
    private var portrait: some View {
        Group {
            if let urlString = agent.avatarURL, !urlString.isEmpty, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        heroImage
                    }
                }
            } else {
                heroImage
            }
        }
    }

    /// The bundled AI character portrait.
    private var heroImage: some View {
        Image("android_assistant_portrait")
            .resizable()
            .aspectRatio(contentMode: .fill)
    }

    private func hudCorner(leading: Bool) -> some View {
        RoundedRectangle(cornerRadius: 6, style: .continuous)
            .trim(from: 0, to: 0.25)
            .stroke(violet.opacity(0.65), style: StrokeStyle(lineWidth: 2, lineCap: .round))
            .frame(width: 26, height: 26)
            .rotationEffect(.degrees(leading ? 0 : 90))
            .padding(.top, 12)
            .padding(leading ? .leading : .trailing, 12)
    }

    private var identityPlate: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: Spacing.sm) {
                Text(agent.agentName)
                    .font(.system(size: 24, weight: .heavy))
                    .kerning(0.3)
                    .foregroundStyle(consoleText)
                    .lineLimit(1)

                HStack(spacing: 3) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 9, weight: .bold))
                    Text("AI AGENT")
                        .font(.system(size: 9, weight: .heavy))
                        .kerning(1)
                }
                .foregroundStyle(consoleBG)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(violet, in: .capsule)
            }

            if let specialty = agent.specialty, !specialty.isEmpty {
                Text(specialty.uppercased())
                    .font(.system(size: 11, weight: .bold))
                    .kerning(1.6)
                    .foregroundStyle(teal)
                    .lineLimit(1)
            }

            if let assignedDateText {
                Text("ASSIGNED // \(assignedDateText.uppercased())")
                    .font(.system(size: 10, weight: .semibold, design: .monospaced))
                    .foregroundStyle(consoleMuted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .padding(.top, 26)
    }

    // MARK: - Readouts

    private var readouts: some View {
        VStack(alignment: .leading, spacing: Spacing.sm + 2) {
            // Workload gauge
            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack {
                    Text("AGENT WORKLOAD")
                        .font(.system(size: 10, weight: .heavy, design: .monospaced))
                        .kerning(1.6)
                        .foregroundStyle(consoleMuted)
                    Spacer()
                    Text("\(agent.currentUserCount)/\(agent.maxUsers) CLIENTS")
                        .font(.system(size: 10, weight: .heavy, design: .monospaced))
                        .foregroundStyle(consoleText)
                }

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(consoleMuted.opacity(0.18))
                        Capsule()
                            .fill(loadColor)
                            .frame(width: max(geo.size.width * 0.04, geo.size.width * agent.capacityFraction))
                    }
                }
                .frame(height: 6)
                .accessibilityElement(children: .combine)
                .accessibilityLabel("Workload: \(agent.currentUserCount) of \(agent.maxUsers) clients")
            }

            // Mission briefing (bio)
            if let bio = agent.bio, !bio.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("MISSION BRIEFING")
                        .font(.system(size: 10, weight: .heavy, design: .monospaced))
                        .kerning(1.6)
                        .foregroundStyle(violet)

                    Text(bio)
                        .font(.system(size: 13))
                        .lineSpacing(4)
                        .foregroundStyle(Color(hex: "#B9C4D6"))
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(
                    violet.opacity(0.07),
                    in: .rect(cornerRadius: Radius.md, style: .continuous)
                )
                .overlay {
                    RoundedRectangle(cornerRadius: Radius.md, style: .continuous)
                        .strokeBorder(violet.opacity(0.22), lineWidth: 1)
                }
            }
        }
        .padding(.horizontal, 18)
        .padding(.top, 16)
    }

    // MARK: - Actions

    private struct AgentAction: Identifiable {
        let id: String
        let symbol: String
        let label: String
        let detail: String
        let tint: Color
        let action: () -> Void
    }

    private var actions: [AgentAction] {
        [
            AgentAction(
                id: "chat",
                symbol: "message.fill",
                label: "Chat with Agent",
                detail: "Ask questions, get advice, generate letters",
                tint: violet,
                action: onOpenChat
            ),
            AgentAction(
                id: "credit-analysis",
                symbol: "doc.text.magnifyingglass",
                label: "Analyze My Credit Report",
                detail: "Your agent finds what to dispute",
                tint: teal,
                action: onOpenChat
            ),
            AgentAction(
                id: "credit-repair",
                symbol: "doc.text.fill",
                label: "Credit Repair Tool",
                detail: "Generate FCRA & FDCPA letters",
                tint: Color(hex: "#F472B6"),
                action: onOpenCreditRepair
            ),
            AgentAction(
                id: "dispute-tracker",
                symbol: "list.clipboard.fill",
                label: "Dispute Tracker",
                detail: "Status of every dispute you filed",
                tint: Color(hex: "#5EEAD4"),
                action: onOpenDisputeTracker
            ),
        ]
    }

    private var actionsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm + 2) {
            Text("MISSION MODULES")
                .font(.system(size: 10, weight: .heavy, design: .monospaced))
                .kerning(1.6)
                .foregroundStyle(consoleMuted)
                .padding(.top, Spacing.lg)

            ForEach(actions) { action in
                Button {
                    Haptics.light()
                    action.action()
                } label: {
                    HStack(spacing: Spacing.md - 2) {
                        Image(systemName: action.symbol)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(action.tint)
                            .frame(width: 40, height: 40)
                            .background(action.tint.opacity(0.12), in: .rect(cornerRadius: Radius.md, style: .continuous))
                            .overlay {
                                RoundedRectangle(cornerRadius: Radius.md, style: .continuous)
                                    .strokeBorder(action.tint.opacity(0.4), lineWidth: 1)
                            }

                        VStack(alignment: .leading, spacing: 2) {
                            Text(action.label)
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(consoleText)
                                .multilineTextAlignment(.leading)
                            Text(action.detail)
                                .font(.system(size: 11))
                                .foregroundStyle(consoleMuted)
                                .lineLimit(1)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)

                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(consoleMuted)
                    }
                    .padding(13)
                    .background(
                        Color(hex: "#94A3B8").opacity(0.07),
                        in: .rect(cornerRadius: Radius.lg, style: .continuous)
                    )
                    .overlay {
                        RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
                            .strokeBorder(Color(hex: "#94A3B8").opacity(0.14), lineWidth: 1)
                    }
                    .contentShape(.rect)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(action.label)
                .accessibilityHint(action.detail)
            }
        }
        .padding(.horizontal, 18)
    }

    // MARK: - Footer

    private var footer: some View {
        HStack(spacing: 5) {
            Image(systemName: "sparkles")
                .font(.system(size: 10, weight: .bold))
            Text("SECURE CHANNEL // AGENT #\(String(format: "%04d", agent.id))")
                .font(.system(size: 9, weight: .heavy, design: .monospaced))
                .kerning(1.6)
        }
        .foregroundStyle(consoleMuted)
        .frame(maxWidth: .infinity)
        .padding(.top, 18)
        .padding(.bottom, 16)
    }
}
