//
//  AIAgentService.swift
//  WesternCreditInstitute
//

import Foundation

/// AI Credit Repair Agent endpoints (`aiAgents.*`) plus the dispute counts the
/// agent dashboard shows. Mirrors the Expo My Agent data layer.
///
/// The assigned agent is cached in UserDefaults so the screen paints the agent's
/// name, specialty and status instantly on every later visit.
nonisolated final class AIAgentService: Sendable {
    static let shared = AIAgentService()

    private let client = TRPCClient.shared

    private init() {}

    var isConfigured: Bool { client.isConfigured }

    // MARK: - Agent

    /// The user's currently assigned agent, or `nil` when none is assigned yet.
    func fetchMyAgent(userId: String) async throws -> MyAgentResponse {
        guard isConfigured else { throw TRPCClientError.notConfigured }
        let input = ["json": ["userId": userId]]
        return try await client.query("aiAgents.getMyAgent", input: input)
    }

    /// Assigns an agent from the pool. Returns the existing one if already assigned.
    func assignAgent(userId: String) async throws -> AssignAgentResponse {
        guard isConfigured else { throw TRPCClientError.notConfigured }
        let input = ["json": ["userId": userId]]
        return try await client.mutate("aiAgents.assign", input: input)
    }

    // MARK: - Chat

    /// Stored conversation with the agent, oldest first.
    func fetchChatHistory(userId: String, limit: Int = 50) async -> [AgentChatMessage] {
        guard isConfigured else { return [] }
        let input = ["json": ["userId": userId, "limit": limit] as [String: Any]]
        do {
            return try await client.query("aiAgents.getChatHistory", input: input)
        } catch {
            // An empty transcript still lets the user start a new conversation.
            return []
        }
    }

    /// Sends a message and returns the agent's reply. Recent turns are passed
    /// as context so the agent keeps the thread.
    func sendMessage(
        userId: String,
        agentId: Int,
        message: String,
        history: [AgentChatMessage]
    ) async throws -> AgentChatReply {
        guard isConfigured else { throw TRPCClientError.notConfigured }

        // Only user/assistant turns are valid context for the model.
        let contextTurns = history
            .filter { $0.role == .user || $0.role == .assistant }
            .suffix(10)
            .map { ["role": $0.role.rawValue, "content": $0.content] }

        let input: [String: Any] = [
            "json": [
                "userId": userId,
                "agentId": agentId,
                "message": message,
                "history": contextTurns,
            ] as [String: Any]
        ]
        return try await client.mutate("aiAgents.chat", input: input)
    }

    // MARK: - Disputes (dashboard counters)

    /// Dispute records for the counters. Failures degrade to an empty list so
    /// the agent card still renders.
    func fetchDisputes(userId: String) async -> [DisputeSummaryRecord] {
        guard isConfigured else { return [] }
        let input = ["json": ["userId": userId]]
        do {
            return try await client.query("disputes.getAll", input: input)
        } catch {
            return []
        }
    }

    // MARK: - Local cache

    private static func agentCacheKey(userId: String) -> String {
        "wci.myagent.\(userId)"
    }

    /// Last-known agent for this user, for an instant first paint.
    func cachedAgent(userId: String) -> MyAgentResponse? {
        guard let data = UserDefaults.standard.data(forKey: Self.agentCacheKey(userId: userId)) else {
            return nil
        }
        return try? JSONDecoder().decode(MyAgentResponse.self, from: data)
    }

    func cacheAgent(_ response: MyAgentResponse, userId: String) {
        guard let data = try? JSONEncoder().encode(response) else { return }
        UserDefaults.standard.set(data, forKey: Self.agentCacheKey(userId: userId))
    }
}
