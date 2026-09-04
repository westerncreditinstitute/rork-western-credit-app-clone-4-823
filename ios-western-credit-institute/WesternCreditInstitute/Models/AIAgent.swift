//
//  AIAgent.swift
//  WesternCreditInstitute
//

import Foundation

/// One of the 10,000 AI Credit Repair Agents in the pool, as returned by the
/// backend `aiAgents.getMyAgent` / `aiAgents.assign` endpoints.
nonisolated struct AIAgent: Identifiable, Codable, Hashable, Sendable {
    let id: Int
    let agentName: String
    let avatarURL: String?
    let bio: String?
    let specialty: String?
    let maxUsers: Int
    let currentUserCount: Int
    let isActive: Bool

    private enum CodingKeys: String, CodingKey {
        case id
        case agentName = "agent_name"
        case avatarURL = "avatar_url"
        case bio
        case specialty
        case maxUsers = "max_users"
        case currentUserCount = "current_user_count"
        case isActive = "is_active"
    }

    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(Int.self, forKey: .id)
        agentName = try container.decodeIfPresent(String.self, forKey: .agentName) ?? "Your Agent"
        avatarURL = try container.decodeIfPresent(String.self, forKey: .avatarURL)
        bio = try container.decodeIfPresent(String.self, forKey: .bio)
        specialty = try container.decodeIfPresent(String.self, forKey: .specialty)
        maxUsers = try container.decodeIfPresent(Int.self, forKey: .maxUsers) ?? 25
        currentUserCount = try container.decodeIfPresent(Int.self, forKey: .currentUserCount) ?? 0
        isActive = try container.decodeIfPresent(Bool.self, forKey: .isActive) ?? true
    }

    /// Up to two initials for the avatar fallback.
    var initials: String {
        let letters = agentName
            .split(separator: " ")
            .compactMap { $0.first }
            .prefix(2)
        return String(letters).uppercased()
    }

    /// How full this agent's client roster is, 0...1.
    var capacityFraction: Double {
        guard maxUsers > 0 else { return 0 }
        return min(1, Double(currentUserCount) / Double(maxUsers))
    }

    var isAtCapacity: Bool { currentUserCount >= maxUsers }

    /// Availability shown next to the agent's name.
    var status: AgentStatus {
        guard isActive else { return .offline }
        if isAtCapacity { return .full }
        if capacityFraction >= 0.8 { return .busy }
        return .available
    }
}

/// Live availability of an assigned agent.
nonisolated enum AgentStatus: String, Hashable, Sendable {
    case available
    case busy
    case full
    case offline

    var label: String {
        switch self {
        case .available: return "Available"
        case .busy: return "High demand"
        case .full: return "At capacity"
        case .offline: return "Offline"
        }
    }

    var detail: String {
        switch self {
        case .available: return "Online now — replies in seconds, 24/7"
        case .busy: return "Taking on new clients, replies may be slower"
        case .full: return "Roster is full, but you keep your spot"
        case .offline: return "Temporarily unavailable — check back shortly"
        }
    }
}

/// The link between a user and their assigned agent.
nonisolated struct AgentAssignment: Codable, Hashable, Sendable {
    let id: String
    let userId: String
    let agentId: Int
    let assignedAt: String?
    let isActive: Bool

    private enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case agentId = "agent_id"
        case assignedAt = "assigned_at"
        case isActive = "is_active"
    }

    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(String.self, forKey: .id) ?? ""
        userId = try container.decodeIfPresent(String.self, forKey: .userId) ?? ""
        agentId = try container.decodeIfPresent(Int.self, forKey: .agentId) ?? 0
        assignedAt = try container.decodeIfPresent(String.self, forKey: .assignedAt)
        isActive = try container.decodeIfPresent(Bool.self, forKey: .isActive) ?? true
    }

    /// `assigned_at` parsed from the ISO-8601 timestamp Supabase returns.
    var assignedDate: Date? {
        guard let assignedAt else { return nil }
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFraction.date(from: assignedAt) { return date }
        return ISO8601DateFormatter().date(from: assignedAt)
    }
}

/// Envelope returned by `aiAgents.getMyAgent`.
nonisolated struct MyAgentResponse: Codable, Sendable {
    let agent: AIAgent?
    let assignment: AgentAssignment?
}

/// Envelope returned by `aiAgents.assign`.
nonisolated struct AssignAgentResponse: Codable, Sendable {
    let agent: AIAgent?
    let assignment: AgentAssignment?
}

/// One turn of the conversation with the agent (`agent_chat_messages`).
///
/// A message starts life locally as an optimistic `.sending` bubble with no
/// `serverId`, then gets swapped for the persisted row once the backend
/// confirms it — `clientId` stays stable across that swap so SwiftUI keeps the
/// same view identity and the bubble never flickers.
nonisolated struct AgentChatMessage: Identifiable, Codable, Hashable, Sendable {
    /// Roles the backend persists. `tool` rows carry formatted tool output.
    nonisolated enum Role: String, Codable, Hashable, Sendable {
        case user
        case assistant
        case tool
    }

    /// Delivery state of an outgoing message.
    nonisolated enum DeliveryStatus: String, Codable, Hashable, Sendable {
        case sending
        case sent
        case failed
    }

    /// Stable local identity — survives the optimistic-to-persisted swap.
    let clientId: String
    /// Row id in Postgres. `nil` while the message is still optimistic.
    let serverId: Int?
    let role: Role
    let content: String
    let toolName: String?
    /// Raw ISO-8601 timestamp; also used as the delta-poll cursor.
    let createdAtISO: String
    var status: DeliveryStatus

    var id: String { clientId }

    private enum CodingKeys: String, CodingKey {
        case id, role, content
        case toolName = "tool_name"
        case createdAt = "created_at"
    }

    /// Builds a local, not-yet-persisted message.
    nonisolated init(
        clientId: String = UUID().uuidString,
        role: Role,
        content: String,
        toolName: String? = nil,
        createdAtISO: String = Self.isoFormatter.string(from: Date()),
        status: DeliveryStatus = .sending
    ) {
        self.clientId = clientId
        self.serverId = nil
        self.role = role
        self.content = content
        self.toolName = toolName
        self.createdAtISO = createdAtISO
        self.status = status
    }

    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        // `id` is a bigint in Postgres but may arrive as a string.
        if let numericId = try? container.decode(Int.self, forKey: .id) {
            serverId = numericId
            clientId = "server-\(numericId)"
        } else if let stringId = try? container.decode(String.self, forKey: .id) {
            serverId = Int(stringId)
            clientId = "server-\(stringId)"
        } else {
            serverId = nil
            clientId = UUID().uuidString
        }
        role = (try? container.decode(Role.self, forKey: .role)) ?? .assistant
        content = try container.decodeIfPresent(String.self, forKey: .content) ?? ""
        toolName = try container.decodeIfPresent(String.self, forKey: .toolName)
        createdAtISO = try container.decodeIfPresent(String.self, forKey: .createdAt)
            ?? Self.isoFormatter.string(from: Date())
        status = .sent
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(serverId, forKey: .id)
        try container.encode(role, forKey: .role)
        try container.encode(content, forKey: .content)
        try container.encodeIfPresent(toolName, forKey: .toolName)
        try container.encode(createdAtISO, forKey: .createdAt)
    }

    var isFromUser: Bool { role == .user }

    /// Parsed timestamp, used for ordering and the bubble's time stamp.
    var createdAt: Date {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFraction.date(from: createdAtISO) { return date }
        return ISO8601DateFormatter().date(from: createdAtISO) ?? Date()
    }

    /// Full initialiser, used when reconciling a persisted row against the
    /// optimistic bubble it replaces.
    nonisolated init(
        clientId: String,
        serverId: Int?,
        role: Role,
        content: String,
        toolName: String?,
        createdAtISO: String,
        status: DeliveryStatus
    ) {
        self.clientId = clientId
        self.serverId = serverId
        self.role = role
        self.content = content
        self.toolName = toolName
        self.createdAtISO = createdAtISO
        self.status = status
    }

    /// Same author, same text, still unconfirmed — i.e. the optimistic bubble
    /// that produced `row`.
    func matchesOptimistically(_ row: AgentChatMessage) -> Bool {
        serverId == nil && role == row.role && content == row.content
    }

    /// This message re-keyed onto an existing local identity, so swapping an
    /// optimistic bubble for its persisted row doesn't change view identity.
    func adoptingClientId(_ id: String) -> AgentChatMessage {
        AgentChatMessage(
            clientId: id,
            serverId: serverId,
            role: role,
            content: content,
            toolName: toolName,
            createdAtISO: createdAtISO,
            status: status
        )
    }

    fileprivate static let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}

/// Reply envelope returned by `aiAgents.chat`.
nonisolated struct AgentChatReply: Codable, Sendable {
    let response: String
    /// The rows the backend persisted for this exchange, in conversation order.
    /// Used to reconcile the optimistic bubble and to surface tool output.
    let messages: [AgentChatMessage]

    private enum CodingKeys: String, CodingKey {
        case response, messages
    }

    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        response = try container.decodeIfPresent(String.self, forKey: .response) ?? ""
        messages = try container.decodeIfPresent([AgentChatMessage].self, forKey: .messages) ?? []
    }
}

/// Slim projection of a dispute record — the agent dashboard only needs status
/// counts, so the heavy letter/timeline payload is skipped.
nonisolated struct DisputeSummaryRecord: Codable, Hashable, Sendable {
    let id: String
    let status: String

    private enum CodingKeys: String, CodingKey {
        case id, status
    }

    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        status = try container.decodeIfPresent(String.self, forKey: .status) ?? ""
    }

    var isOpen: Bool { status == "sent" || status == "in-progress" }
    var isResolved: Bool { status == "resolved" }
}
