//
//  AgentChatPanelView.swift
//  WesternCreditInstitute
//

import SwiftUI

/// The live conversation surface embedded in the My Agent tab.
///
/// Presentation only — delivery, retry and connection state live in
/// `AgentChatViewModel`. Mirrors the Expo `AgentChatPanel`.
struct AgentChatPanelView: View {
    @Environment(ThemeManager.self) private var theme

    @Bindable var viewModel: AgentChatViewModel

    @FocusState private var isInputFocused: Bool

    /// The My Agent identity colour, shared with the tab bar.
    private let agentViolet = Color(hex: "#A78BFA")

    private static let typingAnchor = "wci.agent.chat.typing"
    private static let bottomAnchor = "wci.agent.chat.bottom"

    private let suggestions: [String] = [
        "What disputes are open?",
        "Write a 609 letter",
        "How do I raise my score?",
        "Explain credit scores",
    ]

    var body: some View {
        VStack(spacing: 0) {
            connectionBanner
            transcript
            composer
        }
        .background(theme.colors.background)
        .task { await viewModel.start() }
        .onDisappear { viewModel.stop() }
    }

    // MARK: - Connection banner

    @ViewBuilder
    private var connectionBanner: some View {
        // A healthy connection needs no chrome — silence is the success state.
        if viewModel.connection != .live || viewModel.loadErrorMessage != nil {
            let isOffline = viewModel.connection == .offline || viewModel.loadErrorMessage != nil
            let tint = isOffline ? theme.colors.warning : theme.colors.textSecondary

            HStack(spacing: Spacing.sm) {
                Circle()
                    .fill(tint)
                    .frame(width: 6, height: 6)

                Text(isOffline
                     ? "Can't reach your agent — retrying"
                     : "Connecting to your agent…")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(tint)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 7)
            .background(isOffline
                        ? theme.colors.warningLight.opacity(0.35)
                        : theme.colors.surfaceAlt)
            .transition(.move(edge: .top).combined(with: .opacity))
        }
    }

    // MARK: - Transcript

    private var transcript: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: Spacing.sm + 2) {
                    welcomeCard

                    if viewModel.isLoadingHistory && viewModel.messages.isEmpty {
                        ProgressView()
                            .tint(agentViolet)
                            .frame(maxWidth: .infinity)
                            .padding(.top, Spacing.xl)
                    }

                    ForEach(viewModel.messages) { message in
                        messageRow(message)
                            .id(message.id)
                    }

                    if viewModel.isAgentTyping {
                        typingBubble.id(Self.typingAnchor)
                    }

                    if viewModel.messages.isEmpty && !viewModel.isLoadingHistory {
                        suggestionList
                    }

                    Color.clear
                        .frame(height: 1)
                        .id(Self.bottomAnchor)
                }
                .padding(Spacing.md)
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: viewModel.messages.count) { _, _ in
                scrollToBottom(proxy)
            }
            .onChange(of: viewModel.isAgentTyping) { _, typing in
                if typing { scrollToBottom(proxy) }
            }
        }
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy) {
        withAnimation(.easeOut(duration: 0.25)) {
            proxy.scrollTo(Self.bottomAnchor, anchor: .bottom)
        }
    }

    // MARK: - Welcome

    private var welcomeCard: some View {
        HStack(alignment: .top, spacing: Spacing.sm + 2) {
            Image(systemName: "sparkles")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(agentViolet)
                .frame(width: 28, height: 28)
                .background(agentViolet.opacity(0.15), in: .circle)

            (Text(viewModel.agent.agentName).font(.system(size: 13, weight: .bold))
                + Text(" is your personal AI Credit Repair Agent. Ask about disputes, request a letter, or get a strategy for your score — available 24/7.")
                .font(.system(size: 13)))
                .lineSpacing(3)
                .foregroundStyle(theme.colors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(agentViolet.opacity(0.08), in: .rect(cornerRadius: Radius.md, style: .continuous))
        .padding(.bottom, Spacing.xs)
    }

    // MARK: - Message rows

    @ViewBuilder
    private func messageRow(_ message: AgentChatMessage) -> some View {
        if message.role == .tool {
            toolCard(message)
        } else {
            bubbleRow(message)
        }
    }

    private func toolCard(_ message: AgentChatMessage) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: 6) {
                Image(systemName: "wrench.and.screwdriver.fill")
                    .font(.system(size: 11, weight: .bold))
                Text(toolLabel(for: message.toolName))
                    .font(.system(size: 11, weight: .bold))
                    .textCase(.uppercase)
                    .kerning(0.5)
            }
            .foregroundStyle(agentViolet)

            Text(message.content)
                .font(.system(size: 14))
                .lineSpacing(3)
                .foregroundStyle(theme.colors.text)
                .fixedSize(horizontal: false, vertical: true)
                .textSelection(.enabled)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(agentViolet.opacity(0.07), in: .rect(cornerRadius: Radius.md, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Radius.md, style: .continuous)
                .strokeBorder(agentViolet.opacity(0.25), lineWidth: 1)
        )
        .padding(.leading, 34)
    }

    private func toolLabel(for toolName: String?) -> String {
        switch toolName {
        case "generate_dispute_letter": return "Letter generated"
        case "get_disputes": return "Dispute tracker"
        case "get_credit_tips": return "Credit tips"
        default: return "Agent tool"
        }
    }

    private func bubbleRow(_ message: AgentChatMessage) -> some View {
        HStack(alignment: .bottom, spacing: Spacing.sm) {
            if message.isFromUser {
                Spacer(minLength: 40)
            } else {
                Image(systemName: "bubbles.and.sparkles.fill")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 26, height: 26)
                    .background(agentViolet, in: .circle)
            }

            VStack(alignment: message.isFromUser ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .font(.system(size: 15))
                    .lineSpacing(3)
                    .foregroundStyle(message.isFromUser ? .white : theme.colors.text)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.sm + 2)
                    .background(
                        message.isFromUser ? theme.colors.primary : theme.colors.surface,
                        in: .rect(cornerRadius: Radius.lg, style: .continuous)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
                            .strokeBorder(
                                message.isFromUser ? .clear : theme.colors.border,
                                lineWidth: 1
                            )
                    )
                    .opacity(message.status == .failed ? 0.6 : 1)
                    .textSelection(.enabled)

                metaLine(for: message)
            }

            if !message.isFromUser { Spacer(minLength: 40) }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(message.isFromUser ? "You said" : "\(viewModel.agent.agentName) said")
        .accessibilityValue(message.content)
    }

    @ViewBuilder
    private func metaLine(for message: AgentChatMessage) -> some View {
        switch message.status {
        case .sending:
            HStack(spacing: 4) {
                Image(systemName: "clock")
                    .font(.system(size: 10))
                Text("Sending…")
                    .font(.system(size: 11))
            }
            .foregroundStyle(theme.colors.textLight)

        case .failed:
            Button {
                viewModel.retry(clientId: message.clientId)
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "exclamationmark.circle.fill")
                        .font(.system(size: 10))
                    Text("Not delivered — tap to retry")
                        .font(.system(size: 11, weight: .semibold))
                }
                .foregroundStyle(theme.colors.error)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Retry sending this message")

        case .sent:
            HStack(spacing: 4) {
                Text(message.createdAt.formatted(date: .omitted, time: .shortened))
                    .font(.system(size: 11))
                if message.isFromUser {
                    Image(systemName: "checkmark")
                        .font(.system(size: 9, weight: .semibold))
                }
            }
            .foregroundStyle(theme.colors.textLight)
        }
    }

    // MARK: - Typing indicator

    private var typingBubble: some View {
        HStack(alignment: .bottom, spacing: Spacing.sm) {
            Image(systemName: "bubbles.and.sparkles.fill")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 26, height: 26)
                .background(agentViolet, in: .circle)

            VStack(alignment: .leading, spacing: 4) {
                TypingDotsView(tint: agentViolet)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.md)
                    .background(theme.colors.surface, in: .rect(cornerRadius: Radius.lg, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
                            .strokeBorder(theme.colors.border, lineWidth: 1)
                    )

                Text("\(viewModel.agent.agentName) is typing…")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.colors.textLight)
            }

            Spacer(minLength: 40)
        }
    }

    // MARK: - Suggestions

    private var suggestionList: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Try asking")
                .font(.system(size: 12, weight: .bold))
                .textCase(.uppercase)
                .kerning(0.5)
                .foregroundStyle(theme.colors.textLight)

            ForEach(suggestions, id: \.self) { suggestion in
                Button {
                    viewModel.send(suggestion: suggestion)
                } label: {
                    Text(suggestion)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(theme.colors.primary)
                        .padding(.horizontal, Spacing.md)
                        .padding(.vertical, Spacing.sm + 1)
                        .background(theme.colors.surface, in: .capsule)
                        .overlay(Capsule().strokeBorder(theme.colors.border, lineWidth: 1))
                        .contentShape(.capsule)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.top, Spacing.sm)
    }

    // MARK: - Composer

    private var composer: some View {
        HStack(alignment: .bottom, spacing: Spacing.sm) {
            TextField("Message \(viewModel.agent.agentName)…", text: $viewModel.draft, axis: .vertical)
                .font(.system(size: 15))
                .lineLimit(1...5)
                .focused($isInputFocused)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.sm + 2)
                .background(theme.colors.background, in: .rect(cornerRadius: Radius.xl, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Radius.xl, style: .continuous)
                        .strokeBorder(theme.colors.border, lineWidth: 1)
                )
                .submitLabel(.send)
                .onSubmit { viewModel.send() }
                .accessibilityLabel("Type a message to your agent")

            Button {
                viewModel.send()
            } label: {
                Image(systemName: "arrow.up")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .background(viewModel.canSend ? agentViolet : theme.colors.border, in: .circle)
            }
            .buttonStyle(.plain)
            .disabled(!viewModel.canSend)
            .accessibilityLabel("Send message")
        }
        .padding(Spacing.sm + 4)
        .background(theme.colors.surface)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(theme.colors.border)
                .frame(height: 0.5)
        }
    }
}

// MARK: - Typing dots

/// Three dots that pulse in sequence while the agent composes a reply.
private struct TypingDotsView: View {
    let tint: Color

    @State private var isPulsing = false

    var body: some View {
        HStack(spacing: 5) {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(tint)
                    .frame(width: 6, height: 6)
                    .opacity(isPulsing ? 1 : 0.3)
                    .scaleEffect(isPulsing ? 1.15 : 1)
                    .animation(
                        .easeInOut(duration: 0.5)
                            .repeatForever()
                            .delay(Double(index) * 0.16),
                        value: isPulsing
                    )
            }
        }
        .onAppear { isPulsing = true }
        .accessibilityLabel("Agent is typing")
    }
}
