//
//  MyAgentView.swift
//  WesternCreditInstitute
//

import SwiftUI

/// My Agent — the personal AI Credit Repair Agent dashboard.
///
/// Mirrors the Expo `my-agent` screen: ACE-1 students are matched with one of
/// 10,000 specialised agents, see that agent's contact details and live status,
/// and can chat, generate dispute letters or open the dispute tracker. Everyone
/// else sees the locked upsell.
struct MyAgentView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store

    /// Which surface of the tab is on screen.
    private enum Surface: String, CaseIterable {
        case chat
        case overview

        var label: String {
            switch self {
            case .chat: return "Chat"
            case .overview: return "Overview"
            }
        }

        var symbol: String {
            switch self {
            case .chat: return "message.fill"
            case .overview: return "square.grid.2x2.fill"
            }
        }
    }

    @State private var viewModel: MyAgentViewModel
    /// Created once the agent is known; owns the live conversation.
    @State private var chatViewModel: AgentChatViewModel?
    @State private var surface: Surface = .chat
    @State private var showCreditRepair = false
    @State private var showDisputeTracker = false
    @State private var showPlans = false

    /// The My Agent identity colour, shared with the tab bar.
    private let agentViolet = Color(hex: "#A78BFA")

    init(userId: String) {
        _viewModel = State(initialValue: MyAgentViewModel(userId: userId))
    }

    /// ACE-1 students and CSO affiliates get an agent; free members do not.
    private var hasAgentAccess: Bool {
        store.tier == .ace1Student || store.tier == .csoAffiliate
    }

    var body: some View {
        Group {
            if !hasAgentAccess {
                LockedAgentView { showPlans = true }
            } else {
                content
            }
        }
        .background(theme.colors.background)
        .sheet(isPresented: $showPlans) { SubscriptionPlansView() }
        .sheet(isPresented: $showCreditRepair) {
            NavigationStack { AIDisputeAssistantView() }
        }
        .sheet(isPresented: $showDisputeTracker) {
            NavigationStack { DisputeTrackerView() }
        }
        .task {
            guard hasAgentAccess else { return }
            await viewModel.load()
        }
        .onChange(of: viewModel.agent?.id) { _, agentId in
            // The conversation can only start once an agent is assigned.
            guard let agentId, let agent = viewModel.agent else { return }
            if chatViewModel?.agent.id != agentId {
                chatViewModel = AgentChatViewModel(userId: viewModel.userId, agent: agent)
            }
        }
    }

    // MARK: - Content states

    @ViewBuilder
    private var content: some View {
        switch viewModel.phase {
        case .loading, .assigning where viewModel.agent == nil:
            assigningView
        case .failed(let message, let isAtCapacity) where viewModel.agent == nil:
            failureView(message: message, isAtCapacity: isAtCapacity)
        default:
            readyView
        }
    }

    /// Agent header pinned above either the live conversation or the dashboard.
    private var readyView: some View {
        VStack(spacing: 0) {
            if viewModel.agent != nil {
                agentHeader
            }

            if surface == .chat, let chatViewModel {
                AgentChatPanelView(viewModel: chatViewModel)
            } else {
                dashboard
            }
        }
    }

    // MARK: - Agent header

    private var agentHeader: some View {
        HStack(spacing: Spacing.sm + 2) {
            avatar

            VStack(alignment: .leading, spacing: 1) {
                Text(viewModel.agent?.agentName ?? "My Agent")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(theme.colors.text)
                    .lineLimit(1)

                Text(chatViewModel?.statusLabel ?? viewModel.agent?.status.label ?? "")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.colors.textSecondary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            segmentedControl
        }
        .padding(.horizontal, Spacing.sm + 4)
        .padding(.vertical, Spacing.sm + 2)
        .background(theme.colors.surface)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(theme.colors.border)
                .frame(height: 0.5)
        }
    }

    private var avatar: some View {
        let presence: Color = {
            switch chatViewModel?.connection {
            case .live: return theme.colors.success
            case .offline: return theme.colors.warning
            default: return theme.colors.textLight
            }
        }()

        return Group {
            if let urlText = viewModel.agent?.avatarURL, let url = URL(string: urlText) {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    initialsAvatar
                }
            } else {
                initialsAvatar
            }
        }
        .frame(width: 38, height: 38)
        .clipShape(.circle)
        .overlay(alignment: .bottomTrailing) {
            Circle()
                .fill(presence)
                .frame(width: 11, height: 11)
                .overlay(Circle().strokeBorder(theme.colors.surface, lineWidth: 2))
                .offset(x: 1, y: 1)
        }
    }

    private var initialsAvatar: some View {
        Text(viewModel.agent?.initials ?? "")
            .font(.system(size: 14, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: 38, height: 38)
            .background(agentViolet)
    }

    private var segmentedControl: some View {
        HStack(spacing: 2) {
            ForEach(Surface.allCases, id: \.self) { option in
                let isActive = surface == option

                Button {
                    Haptics.selection()
                    withAnimation(.snappy(duration: 0.22)) { surface = option }
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: option.symbol)
                            .font(.system(size: 12, weight: .semibold))
                        Text(option.label)
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundStyle(isActive ? .white : theme.colors.textSecondary)
                    .padding(.horizontal, Spacing.sm + 2)
                    .padding(.vertical, 7)
                    .background(
                        isActive ? agentViolet : .clear,
                        in: .rect(cornerRadius: 9, style: .continuous)
                    )
                    .contentShape(.rect)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(option == .chat ? "Show conversation" : "Show agent overview")
                .accessibilityAddTraits(isActive ? [.isSelected] : [])
            }
        }
        .padding(3)
        .background(theme.colors.surfaceAlt, in: .rect(cornerRadius: Radius.md, style: .continuous))
    }

    private var assigningView: some View {
        VStack(spacing: Spacing.md) {
            ProgressView()
                .controlSize(.large)
                .tint(theme.colors.primary)

            Text(viewModel.phase == .assigning ? "Assigning Your AI Agent…" : "Loading Your Agent…")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(theme.colors.text)
                .padding(.top, Spacing.sm)

            Text("We're matching you with one of 10,000 specialized AI Credit Repair Agents. This only takes a moment.")
                .font(.system(size: 15))
                .lineSpacing(3)
                .multilineTextAlignment(.center)
                .foregroundStyle(theme.colors.textSecondary)
        }
        .padding(.horizontal, Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func failureView(message: String, isAtCapacity: Bool) -> some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: isAtCapacity ? "person.2.slash.fill" : "exclamationmark.triangle.fill")
                .font(.system(size: 40, weight: .semibold))
                .foregroundStyle(theme.colors.warning)
                .frame(width: 80, height: 80)
                .background(theme.colors.warningLight.opacity(0.3), in: .circle)

            Text(isAtCapacity ? "All Agents Are Busy" : "Something Went Wrong")
                .font(.system(size: 22, weight: .bold))
                .multilineTextAlignment(.center)
                .foregroundStyle(theme.colors.text)

            Text(isAtCapacity
                 ? "All 10,000 AI agents are currently at maximum capacity (25 clients each). This is extraordinary demand — please try again in a few minutes."
                 : message)
                .font(.system(size: 15))
                .lineSpacing(3)
                .multilineTextAlignment(.center)
                .foregroundStyle(theme.colors.textSecondary)

            Button {
                Haptics.light()
                Task { await viewModel.assign() }
            } label: {
                Text("Try Again")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, Spacing.md)
                    .background(theme.colors.primary, in: .rect(cornerRadius: Radius.lg, style: .continuous))
            }
            .buttonStyle(.plain)
            .padding(.top, Spacing.sm)
        }
        .padding(.horizontal, Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Dashboard

    private var dashboard: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                if let agent = viewModel.agent {
                    AgentProfileCardView(
                        agent: agent,
                        assignedDateText: viewModel.assignedDateText,
                        showsActions: hasAgentAccess,
                        onOpenChat: { withAnimation(.snappy(duration: 0.22)) { surface = .chat } },
                        onOpenCreditRepair: { showCreditRepair = true },
                        onOpenDisputeTracker: { showDisputeTracker = true }
                    )
                }

                statsRow
                howItWorks
                featureRow
            }
            .padding(.horizontal, Spacing.md)
            .padding(.top, Spacing.md)
            .padding(.bottom, Spacing.xl)
        }
        .refreshable { await viewModel.refresh() }
    }

    private var statsRow: some View {
        HStack(spacing: Spacing.sm + 4) {
            statBox(
                symbol: "list.clipboard.fill",
                tint: theme.colors.info,
                value: viewModel.openDisputeCount,
                label: "Open Disputes"
            )
            statBox(
                symbol: "checkmark.shield.fill",
                tint: theme.colors.success,
                value: viewModel.resolvedDisputeCount,
                label: "Resolved"
            )
            statBox(
                symbol: "doc.text.fill",
                tint: theme.colors.accent,
                value: viewModel.totalLetterCount,
                label: "Total Letters"
            )
        }
    }

    private func statBox(symbol: String, tint: Color, value: Int, label: String) -> some View {
        VStack(spacing: Spacing.xs) {
            Image(systemName: symbol)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(tint)
                .frame(width: 36, height: 36)
                .background(tint.opacity(0.12), in: .rect(cornerRadius: Radius.sm, style: .continuous))

            Text("\(value)")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(theme.colors.text)
                .monospacedDigit()
                .contentTransition(.numericText())

            Text(label)
                .font(.system(size: 11))
                .multilineTextAlignment(.center)
                .foregroundStyle(theme.colors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.md)
        .background(theme.colors.surface, in: .rect(cornerRadius: Radius.lg, style: .continuous))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(value) \(label)")
    }

    private struct HowItWorksStep: Identifiable {
        let id: Int
        let title: String
        let detail: String
        let tint: Color
    }

    private var steps: [HowItWorksStep] {
        [
            HowItWorksStep(
                id: 1,
                title: "Message Your Agent",
                detail: "Ask any credit repair question in the Chat tab. Replies arrive live, and your agent knows your dispute history.",
                tint: theme.colors.primary
            ),
            HowItWorksStep(
                id: 2,
                title: "Generate Dispute Letters",
                detail: "Ask your agent to write a letter, or use the Credit Repair Tool directly. Letters are saved to your tracker automatically.",
                tint: theme.colors.accent
            ),
            HowItWorksStep(
                id: 3,
                title: "Track Everything",
                detail: "Monitor dispute status, response deadlines, and outcomes in the Dispute Tracker. Your agent references this in conversations.",
                tint: theme.colors.secondary
            ),
        ]
    }

    private var howItWorks: some View {
        CardView(padding: Spacing.lg) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                Text("How Your Agent Works")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(theme.colors.text)

                ForEach(steps) { step in
                    HStack(alignment: .top, spacing: Spacing.md) {
                        Text("\(step.id)")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 28, height: 28)
                            .background(step.tint, in: .circle)

                        VStack(alignment: .leading, spacing: 4) {
                            Text(step.title)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(theme.colors.text)
                            Text(step.detail)
                                .font(.system(size: 13))
                                .lineSpacing(3)
                                .foregroundStyle(theme.colors.textSecondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
        }
    }

    private var featureRow: some View {
        HStack(alignment: .top, spacing: Spacing.sm + 4) {
            featureCard(
                symbol: "bolt.fill",
                tint: theme.colors.primary,
                title: "AI-Powered",
                detail: "Context-aware responses based on your credit situation"
            )
            featureCard(
                symbol: "chart.line.uptrend.xyaxis",
                tint: theme.colors.accent,
                title: "FCRA Expert",
                detail: "Knows all dispute letter types and credit score factors"
            )
        }
    }

    private func featureCard(symbol: String, tint: Color, title: String, detail: String) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Image(systemName: symbol)
                .font(.system(size: 19, weight: .semibold))
                .foregroundStyle(tint)

            Text(title)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(theme.colors.text)

            Text(detail)
                .font(.system(size: 12))
                .lineSpacing(2)
                .foregroundStyle(theme.colors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.md)
        .background(theme.colors.surface, in: .rect(cornerRadius: Radius.lg, style: .continuous))
    }

}

// MARK: - Locked state

/// Upsell shown to free members, mirroring the Expo locked view.
private struct LockedAgentView: View {
    @Environment(ThemeManager.self) private var theme

    let onEnroll: () -> Void

    private let perks: [(symbol: String, text: String)] = [
        ("sparkles", "Personal AI agent assigned to you"),
        ("doc.text.fill", "Generate FCRA & FDCPA dispute letters"),
        ("list.clipboard.fill", "Track disputes with AI guidance"),
        ("message.fill", "24/7 chat with credit repair expertise"),
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 40, weight: .semibold))
                    .foregroundStyle(theme.colors.primary)
                    .frame(width: 80, height: 80)
                    .background(theme.colors.primary.opacity(0.12), in: .circle)

                Text("Unlock Your AI Credit Repair Agent")
                    .font(.system(size: 22, weight: .bold))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(theme.colors.text)

                Text("Your personal AI Credit Repair Agent is available exclusively to ACE-1 course students. Enroll in the ACE-1 Credit Repair Certification course to get matched with one of 10,000 specialized AI agents who will help you dispute errors, generate letters, and build your credit.")
                    .font(.system(size: 14))
                    .lineSpacing(4)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(theme.colors.textSecondary)

                VStack(alignment: .leading, spacing: Spacing.md) {
                    ForEach(perks, id: \.text) { perk in
                        HStack(spacing: Spacing.sm + 2) {
                            Image(systemName: perk.symbol)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(theme.colors.accent)
                                .frame(width: 22)
                            Text(perk.text)
                                .font(.system(size: 14))
                                .foregroundStyle(theme.colors.text)
                                .fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: 0)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, Spacing.sm)

                Button {
                    Haptics.light()
                    onEnroll()
                } label: {
                    Text("Enroll in ACE-1 Course")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                        .background(theme.colors.primary, in: .rect(cornerRadius: Radius.lg, style: .continuous))
                }
                .buttonStyle(.plain)
                .padding(.top, Spacing.md)
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.vertical, Spacing.xl)
        }
    }
}
