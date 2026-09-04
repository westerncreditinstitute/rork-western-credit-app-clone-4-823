//
//  AgentChatViewModel.swift
//  WesternCreditInstitute
//

import Foundation

/// Drives the live conversation with the assigned AI Credit Repair Agent.
///
/// Delivery model, mirroring the Expo My Agent chat:
///  1. The cached transcript paints instantly, then `getChatHistory` refreshes it.
///  2. A delta poll asks only for rows newer than the newest one already held,
///     so keeping the thread live costs a few bytes per tick.
///  3. Outgoing messages appear immediately as `.sending` bubbles and are
///     reconciled against the rows the backend actually persisted.
///
/// The poll speeds up while the conversation is active and slows down when it
/// goes quiet, so an idle chat isn't draining the battery.
@MainActor
@Observable
final class AgentChatViewModel {
    /// How the transcript is currently receiving new messages.
    enum Connection: Equatable {
        case connecting
        case live
        case offline
    }

    let userId: String
    let agent: AIAgent

    private(set) var messages: [AgentChatMessage] = []
    private(set) var connection: Connection = .connecting
    private(set) var isSending = false
    private(set) var isLoadingHistory = true
    private(set) var loadErrorMessage: String?

    var draft: String = ""

    private let service = AIAgentService.shared
    private var pollTask: Task<Void, Never>?
    /// Newest server timestamp held — the delta-poll cursor.
    private var cursor: String?
    private var lastActivity = Date()

    // MARK: - Tuning

    /// Poll cadence while the conversation is warm.
    private static let activeInterval: Duration = .seconds(3)
    /// Poll cadence once it has gone quiet.
    private static let idleInterval: Duration = .seconds(12)
    /// How long a conversation counts as warm after the last message.
    private static let activeWindow: TimeInterval = 120
    /// How long after an unanswered question we assume the agent is composing.
    private static let typingWindow: TimeInterval = 90
    /// Turns of context sent to the model with each message.
    private static let historyTurns = 10

    init(userId: String, agent: AIAgent) {
        self.userId = userId
        self.agent = agent

        // Instant paint from the persisted transcript while the refresh runs.
        let cached = service.cachedTranscript(userId: userId)
        if !cached.isEmpty {
            messages = cached
            cursor = cached.last?.createdAtISO
            isLoadingHistory = false
        }
    }

    // MARK: - Lifecycle

    /// Loads the transcript and starts the live poll. Safe to call repeatedly.
    func start() async {
        await loadHistory()
        startPolling()
    }

    func stop() {
        pollTask?.cancel()
        pollTask = nil
    }

    private func loadHistory() async {
        do {
            let history = try await service.fetchChatHistory(userId: userId)
            // A full reload replaces the cursor rather than extending it.
            merge(history)
            connection = .live
            loadErrorMessage = nil
        } catch {
            connection = .offline
            // Keep any cached transcript on screen — an empty thread would be a lie.
            loadErrorMessage = messages.isEmpty ? Self.message(for: error) : nil
        }
        isLoadingHistory = false
    }

    private func startPolling() {
        guard pollTask == nil else { return }

        pollTask = Task { [weak self] in
            while !Task.isCancelled {
                guard let self else { return }
                let interval = self.isConversationWarm ? Self.activeInterval : Self.idleInterval

                do {
                    try await Task.sleep(for: interval)
                } catch {
                    return // cancelled
                }

                guard !Task.isCancelled else { return }
                await self.pollOnce()
            }
        }
    }

    /// One delta fetch. Failures are non-fatal — the cached thread stays put.
    func pollOnce() async {
        do {
            let rows = try await service.fetchChatHistory(userId: userId, since: cursor)
            merge(rows)
            connection = .live
            loadErrorMessage = nil
        } catch {
            connection = .offline
        }
    }

    // MARK: - Sending

    func send() {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        Haptics.light()
        draft = ""
        sendText(text)
    }

    /// Sends one of the starter suggestions.
    func send(suggestion: String) {
        Haptics.light()
        sendText(suggestion)
    }

    private func sendText(_ text: String) {
        let optimistic = AgentChatMessage(role: .user, content: text)
        messages.append(optimistic)
        lastActivity = Date()

        Task { await deliver(text: text, clientId: optimistic.clientId) }
    }

    /// Re-sends a message that failed, reusing its bubble.
    func retry(clientId: String) {
        guard let index = messages.firstIndex(where: { $0.clientId == clientId }),
              messages[index].status == .failed else { return }

        Haptics.light()
        messages[index].status = .sending
        let text = messages[index].content
        Task { await deliver(text: text, clientId: clientId) }
    }

    private func deliver(text: String, clientId: String) async {
        isSending = true
        defer { isSending = false }

        let context = messages
            .filter { $0.status != .failed && $0.clientId != clientId }
            .filter { $0.role == .user || $0.role == .assistant }
            .suffix(Self.historyTurns)

        do {
            let reply = try await service.sendMessage(
                userId: userId,
                agentId: agent.id,
                message: text,
                history: Array(context)
            )

            if reply.messages.isEmpty {
                // Older backend without persisted-row echo — fall back to the
                // reply text and let the next poll reconcile ids.
                markSent(clientId: clientId)
                if !reply.response.isEmpty {
                    messages.append(
                        AgentChatMessage(role: .assistant, content: reply.response, status: .sent)
                    )
                }
            } else {
                merge(reply.messages)
            }

            connection = .live
            lastActivity = Date()
            Haptics.success()
        } catch {
            markFailed(clientId: clientId)
            Haptics.error()
        }
    }

    private func markSent(clientId: String) {
        guard let index = messages.firstIndex(where: { $0.clientId == clientId }) else { return }
        messages[index].status = .sent
    }

    private func markFailed(clientId: String) {
        guard let index = messages.firstIndex(where: { $0.clientId == clientId }) else { return }
        messages[index].status = .failed
    }

    // MARK: - Merging

    /// Folds persisted rows into the transcript, de-duplicating by server id and
    /// reconciling the optimistic bubble that produced each row.
    private func merge(_ rows: [AgentChatMessage]) {
        guard !rows.isEmpty else { return }

        for row in rows {
            if let index = messages.firstIndex(where: {
                $0.serverId != nil && $0.serverId == row.serverId
            }) {
                messages[index] = row.adoptingClientId(messages[index].clientId)
            } else if let index = messages.firstIndex(where: { $0.matchesOptimistically(row) }) {
                messages[index] = row.adoptingClientId(messages[index].clientId)
            } else {
                messages.append(row)
            }

            if let current = cursor {
                if row.createdAtISO > current { cursor = row.createdAtISO }
            } else {
                cursor = row.createdAtISO
            }
        }

        messages.sort { lhs, rhs in
            if lhs.createdAt != rhs.createdAt { return lhs.createdAt < rhs.createdAt }
            return (lhs.serverId ?? .max) < (rhs.serverId ?? .max)
        }

        service.cacheTranscript(messages, userId: userId)
    }

    // MARK: - Derived state

    /// The agent is composing when a request is in flight, or when the newest
    /// stored message is a question it hasn't answered yet — which is how a
    /// message sent from another device shows up here.
    var isAgentTyping: Bool {
        if isSending { return true }
        guard let last = messages.last, last.role == .user, last.status == .sent else {
            return false
        }
        return Date().timeIntervalSince(last.createdAt) < Self.typingWindow
    }

    var canSend: Bool {
        !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    /// Short status line shown under the agent's name.
    var statusLabel: String {
        switch connection {
        case .connecting: return "Connecting…"
        case .live: return "Online now"
        case .offline: return "Reconnecting…"
        }
    }

    private var isConversationWarm: Bool {
        Date().timeIntervalSince(lastActivity) < Self.activeWindow
    }

    private static func message(for error: Error) -> String {
        if case TRPCClientError.server(let message) = error { return message }
        return error.localizedDescription
    }
}
