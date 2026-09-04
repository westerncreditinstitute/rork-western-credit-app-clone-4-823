//
//  AgentChatSheet.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Live conversation with the assigned AI Credit Repair Agent, backed by the
/// `aiAgents.chat` endpoint with the stored transcript from `getChatHistory`.
struct AgentChatSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss

    let agent: AIAgent
    let userId: String

    @State private var messages: [AgentChatMessage] = []
    @State private var draft: String = ""
    @State private var isSending = false
    @State private var isLoadingHistory = true
    @State private var errorMessage: String?

    @FocusState private var isInputFocused: Bool

    private let suggestions: [String] = [
        "What's my dispute status?",
        "Write a 609 letter",
        "How do I raise my score fast?",
    ]

    var body: some View {
        let colors = theme.colors

        NavigationStack {
            VStack(spacing: 0) {
                transcript
                composer
            }
            .background(colors.background)
            .navigationTitle(agent.agentName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .font(.system(size: 16, weight: .semibold))
                }
            }
        }
        .presentationDragIndicator(.visible)
        .task { await loadHistory() }
    }

    // MARK: - Transcript

    private var transcript: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: Spacing.md) {
                    if isLoadingHistory {
                        ProgressView()
                            .tint(theme.colors.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.top, Spacing.xl)
                    } else if messages.isEmpty {
                        greeting
                    }

                    ForEach(messages) { message in
                        bubble(for: message)
                            .id(message.id)
                    }

                    if isSending {
                        typingIndicator.id(Self.typingAnchor)
                    }

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.system(size: 13))
                            .foregroundStyle(theme.colors.error)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.top, Spacing.xs)
                    }
                }
                .padding(Spacing.md)
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: messages.count) { _, _ in
                scrollToBottom(proxy)
            }
            .onChange(of: isSending) { _, sending in
                if sending { withAnimation { proxy.scrollTo(Self.typingAnchor, anchor: .bottom) } }
            }
        }
    }

    private static let typingAnchor = "wci.agent.chat.typing"

    private var greeting: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "bubbles.and.sparkles.fill")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(theme.colors.primary)
                Text("Hi, I'm \(agent.agentName)")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(theme.colors.text)
            }

            Text("I know FCRA and FDCPA dispute strategy inside out. Ask me anything about your credit, or tell me what to dispute and I'll draft the letter.")
                .font(.system(size: 14))
                .lineSpacing(3)
                .foregroundStyle(theme.colors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            VStack(alignment: .leading, spacing: Spacing.sm) {
                ForEach(suggestions, id: \.self) { suggestion in
                    Button {
                        Haptics.light()
                        draft = suggestion
                        Task { await send() }
                    } label: {
                        HStack(spacing: Spacing.sm) {
                            Text(suggestion)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(theme.colors.primary)
                                .multilineTextAlignment(.leading)
                            Spacer(minLength: 0)
                            Image(systemName: "arrow.up.right")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(theme.colors.primary.opacity(0.7))
                        }
                        .padding(.horizontal, Spacing.md)
                        .padding(.vertical, Spacing.sm)
                        .background(theme.colors.primary.opacity(0.1), in: .capsule)
                        .contentShape(.capsule)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(theme.colors.surface, in: .rect(cornerRadius: Radius.lg, style: .continuous))
    }

    private func bubble(for message: AgentChatMessage) -> some View {
        HStack {
            if message.isFromUser { Spacer(minLength: 40) }

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
                .textSelection(.enabled)

            if !message.isFromUser { Spacer(minLength: 40) }
        }
        .accessibilityLabel(message.isFromUser ? "You said" : "\(agent.agentName) said")
        .accessibilityValue(message.content)
    }

    private var typingIndicator: some View {
        HStack(spacing: Spacing.sm) {
            ProgressView().tint(theme.colors.textLight)
            Text("\(agent.agentName) is typing…")
                .font(.system(size: 13))
                .foregroundStyle(theme.colors.textSecondary)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, Spacing.sm)
    }

    // MARK: - Composer

    private var composer: some View {
        HStack(alignment: .bottom, spacing: Spacing.sm) {
            TextField("Ask your agent…", text: $draft, axis: .vertical)
                .font(.system(size: 15))
                .lineLimit(1...5)
                .focused($isInputFocused)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.sm + 2)
                .background(theme.colors.surfaceAlt, in: .rect(cornerRadius: Radius.xl, style: .continuous))
                .submitLabel(.send)
                .onSubmit { Task { await send() } }

            Button {
                Task { await send() }
            } label: {
                Image(systemName: "arrow.up")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(canSend ? theme.colors.primary : theme.colors.textLight, in: .circle)
            }
            .disabled(!canSend)
            .accessibilityLabel("Send message")
        }
        .padding(Spacing.md)
        .background(theme.colors.surface)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(theme.colors.border)
                .frame(height: 0.5)
        }
    }

    private var canSend: Bool {
        !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isSending
    }

    // MARK: - Actions

    private func loadHistory() async {
        messages = await AIAgentService.shared.fetchChatHistory(userId: userId)
        isLoadingHistory = false
    }

    private func send() async {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isSending else { return }

        Haptics.light()
        errorMessage = nil
        draft = ""
        isSending = true

        let history = messages
        messages.append(
            AgentChatMessage(id: UUID().uuidString, role: .user, content: text)
        )

        do {
            let reply = try await AIAgentService.shared.sendMessage(
                userId: userId,
                agentId: agent.id,
                message: text,
                history: history
            )
            messages.append(
                AgentChatMessage(id: UUID().uuidString, role: .assistant, content: reply.response)
            )
            Haptics.success()
        } catch {
            errorMessage = error.localizedDescription
            // Put the text back so the user doesn't lose what they typed.
            draft = text
            messages.removeLast()
            Haptics.error()
        }

        isSending = false
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy) {
        guard let last = messages.last else { return }
        withAnimation(.easeOut(duration: 0.25)) {
            proxy.scrollTo(last.id, anchor: .bottom)
        }
    }
}
