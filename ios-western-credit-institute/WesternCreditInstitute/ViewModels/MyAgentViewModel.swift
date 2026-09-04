//
//  MyAgentViewModel.swift
//  WesternCreditInstitute
//

import Foundation

/// Drives the My Agent screen: loads the assigned AI Credit Repair Agent,
/// auto-assigns one when the ACE-1 student doesn't have an agent yet, and keeps
/// the dispute counters in sync. Mirrors the Expo `my-agent` screen logic.
@MainActor
@Observable
final class MyAgentViewModel {
    /// What the screen should render right now.
    enum Phase: Equatable {
        case loading
        case assigning
        case ready
        case failed(message: String, isAtCapacity: Bool)
    }

    let userId: String

    private(set) var agent: AIAgent?
    private(set) var assignment: AgentAssignment?
    private(set) var disputes: [DisputeSummaryRecord] = []
    private(set) var phase: Phase = .loading

    private let service = AIAgentService.shared

    init(userId: String) {
        self.userId = userId

        // Instant paint from the persisted cache while the refresh runs.
        if let cached = service.cachedAgent(userId: userId), cached.agent != nil {
            agent = cached.agent
            assignment = cached.assignment
            phase = .ready
        }
    }

    // MARK: - Loading

    func load() async {
        guard !userId.isEmpty else {
            phase = .failed(message: "We couldn't identify your account.", isAtCapacity: false)
            return
        }

        if agent == nil { phase = .loading }

        do {
            let response = try await service.fetchMyAgent(userId: userId)

            if let fetched = response.agent {
                apply(agent: fetched, assignment: response.assignment)
            } else {
                // No agent on file yet — claim one from the pool.
                await assign()
            }
        } catch {
            // A cached agent keeps the dashboard usable when the network fails.
            if agent == nil {
                phase = .failed(message: Self.message(for: error), isAtCapacity: Self.isCapacityError(error))
            } else {
                phase = .ready
            }
        }

        await refreshDisputes()
    }

    /// Pull-to-refresh: re-reads the agent and the dispute counters.
    func refresh() async {
        await load()
    }

    /// Assigns an agent from the pool of 10,000.
    func assign() async {
        guard !userId.isEmpty else { return }

        if agent == nil { phase = .assigning }

        do {
            let response = try await service.assignAgent(userId: userId)
            if let assigned = response.agent {
                apply(agent: assigned, assignment: response.assignment)
            } else {
                phase = .failed(
                    message: "We couldn't assign your agent. Please try again.",
                    isAtCapacity: false
                )
            }
        } catch {
            phase = .failed(message: Self.message(for: error), isAtCapacity: Self.isCapacityError(error))
        }
    }

    func refreshDisputes() async {
        guard !userId.isEmpty else { return }
        disputes = await service.fetchDisputes(userId: userId)
    }

    // MARK: - Derived state

    var openDisputeCount: Int { disputes.filter(\.isOpen).count }
    var resolvedDisputeCount: Int { disputes.filter(\.isResolved).count }
    var totalLetterCount: Int { disputes.count }

    /// Formatted assignment date, e.g. "March 4, 2026".
    var assignedDateText: String? {
        guard let date = assignment?.assignedDate else { return nil }
        return date.formatted(.dateTime.month(.wide).day().year())
    }

    var isBusy: Bool {
        phase == .loading || phase == .assigning
    }

    // MARK: - Helpers

    private func apply(agent newAgent: AIAgent, assignment newAssignment: AgentAssignment?) {
        agent = newAgent
        assignment = newAssignment
        phase = .ready
        service.cacheAgent(
            MyAgentResponse(agent: newAgent, assignment: newAssignment),
            userId: userId
        )
    }

    private static func isCapacityError(_ error: Error) -> Bool {
        let text = error.localizedDescription.lowercased()
        return text.contains("all_agents_at_capacity") || text.contains("capacity")
    }

    private static func message(for error: Error) -> String {
        if case TRPCClientError.server(let message) = error { return message }
        return error.localizedDescription
    }
}
