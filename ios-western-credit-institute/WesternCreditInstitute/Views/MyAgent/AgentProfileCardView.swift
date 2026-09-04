//
//  AgentProfileCardView.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Identity card for the assigned AI Credit Repair Agent: avatar, name, live
/// status, specialty, contact actions, bio and roster capacity.
struct AgentProfileCardView: View {
    @Environment(ThemeManager.self) private var theme

    let agent: AIAgent
    var assignedDateText: String?
    /// Quick actions are hidden for free-tier users, matching the Expo card.
    var showsActions: Bool = true
    var onOpenChat: () -> Void
    var onOpenCreditRepair: () -> Void
    var onOpenDisputeTracker: () -> Void

    var body: some View {
        CardView(padding: Spacing.lg, cornerRadius: Radius.xl) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                identityHeader
                statusRow

                if let bio = agent.bio, !bio.isEmpty {
                    bioSection(bio)
                }

                capacitySection

                if showsActions {
                    actionsSection
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Your AI Credit Repair Agent: \(agent.agentName)")
    }

    // MARK: - Identity

    private var identityHeader: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            avatar

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: Spacing.sm) {
                    Text(agent.agentName)
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(theme.colors.text)
                        .fixedSize(horizontal: false, vertical: true)

                    HStack(spacing: 3) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 10, weight: .bold))
                        Text("AI Agent")
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, 3)
                    .background(theme.colors.primary, in: .capsule)
                }

                if let specialty = agent.specialty, !specialty.isEmpty {
                    Text(specialty)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(theme.colors.accent)
                }

                if let assignedDateText {
                    Text("Assigned to you on \(assignedDateText)")
                        .font(.system(size: 13))
                        .foregroundStyle(theme.colors.textSecondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var avatar: some View {
        Group {
            if let urlString = agent.avatarURL, !urlString.isEmpty {
                Color(theme.colors.surfaceAlt)
                    .frame(width: 72, height: 72)
                    .overlay {
                        AsyncImage(url: URL(string: urlString)) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().aspectRatio(contentMode: .fill)
                            case .failure:
                                avatarFallback
                            case .empty:
                                ProgressView().tint(theme.colors.textLight)
                            @unknown default:
                                avatarFallback
                            }
                        }
                        .allowsHitTesting(false)
                    }
                    .clipShape(.circle)
            } else {
                avatarFallback
                    .frame(width: 72, height: 72)
                    .background(theme.colors.primary, in: .circle)
            }
        }
        .overlay(alignment: .bottomTrailing) {
            Circle()
                .fill(statusColor)
                .frame(width: 18, height: 18)
                .overlay(Circle().stroke(theme.colors.surface, lineWidth: 3))
        }
    }

    private var avatarFallback: some View {
        VStack(spacing: 1) {
            Image(systemName: "bubbles.and.sparkles.fill")
                .font(.system(size: 22, weight: .semibold))
            Text(agent.initials)
                .font(.system(size: 13, weight: .bold))
        }
        .foregroundStyle(.white)
    }

    // MARK: - Status

    private var statusColor: Color {
        switch agent.status {
        case .available: return theme.colors.success
        case .busy: return theme.colors.warning
        case .full: return theme.colors.error
        case .offline: return theme.colors.textLight
        }
    }

    private var statusRow: some View {
        HStack(spacing: Spacing.sm) {
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)

            Text(agent.status.label)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(statusColor)

            Text(agent.status.detail)
                .font(.system(size: 13))
                .foregroundStyle(theme.colors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.sm)
        .background(statusColor.opacity(0.1), in: .rect(cornerRadius: Radius.md, style: .continuous))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Status: \(agent.status.label). \(agent.status.detail)")
    }

    // MARK: - Bio

    private func bioSection(_ bio: String) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text("ABOUT YOUR AGENT")
                .font(.system(size: 12, weight: .bold))
                .kerning(0.5)
                .foregroundStyle(theme.colors.textLight)

            Text(bio)
                .font(.system(size: 14))
                .lineSpacing(4)
                .foregroundStyle(theme.colors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.md)
        .background(theme.colors.surfaceAlt, in: .rect(cornerRadius: Radius.lg, style: .continuous))
    }

    // MARK: - Capacity

    private var capacitySection: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            HStack {
                Text("Agent workload")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(theme.colors.textSecondary)
                Spacer()
                Text("\(agent.currentUserCount) / \(agent.maxUsers) clients")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(theme.colors.text)
                    .monospacedDigit()
            }

            ProgressBarView(
                progress: Int((agent.capacityFraction * 100).rounded()),
                height: 8,
                tint: statusColor
            )
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Workload: \(agent.currentUserCount) of \(agent.maxUsers) clients")
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
                tint: theme.colors.primary,
                action: onOpenChat
            ),
            AgentAction(
                id: "credit-repair",
                symbol: "doc.text.fill",
                label: "Credit Repair Tool",
                detail: "Generate FCRA & FDCPA dispute letters",
                tint: theme.colors.accent,
                action: onOpenCreditRepair
            ),
            AgentAction(
                id: "dispute-tracker",
                symbol: "list.clipboard.fill",
                label: "Dispute Tracker",
                detail: "View and manage your dispute status",
                tint: theme.colors.secondary,
                action: onOpenDisputeTracker
            ),
        ]
    }

    private var actionsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("QUICK ACTIONS")
                .font(.system(size: 12, weight: .bold))
                .kerning(0.5)
                .foregroundStyle(theme.colors.textLight)

            ForEach(actions) { action in
                Button {
                    Haptics.light()
                    action.action()
                } label: {
                    HStack(spacing: Spacing.md) {
                        Image(systemName: action.symbol)
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(width: 44, height: 44)
                            .background(action.tint, in: .rect(cornerRadius: Radius.md, style: .continuous))

                        VStack(alignment: .leading, spacing: 2) {
                            Text(action.label)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(theme.colors.text)
                                .multilineTextAlignment(.leading)
                            Text(action.detail)
                                .font(.system(size: 12))
                                .foregroundStyle(theme.colors.textSecondary)
                                .multilineTextAlignment(.leading)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)

                        Image(systemName: "chevron.right")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(theme.colors.textLight)
                    }
                    .padding(Spacing.md)
                    .background(theme.colors.surfaceAlt, in: .rect(cornerRadius: Radius.lg, style: .continuous))
                    .contentShape(.rect)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(action.label)
                .accessibilityHint(action.detail)
            }
        }
    }
}
