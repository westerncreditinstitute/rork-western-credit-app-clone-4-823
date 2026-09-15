//
//  AgentAccess.swift
//  WesternCreditInstitute
//

import Foundation

/// Course entitlements and AI agent conversation scope.
///
/// This is the iOS mirror of `expo/constants/agent-access.ts` and must be
/// changed together with it.
///
/// Which courses a student has bought decides two separate things:
///   1. Which tools they can open (the Interactive Coach is ACE-2 and up).
///   2. What their AI Credit Repair Agent is allowed to talk about.
///
/// The agents are trained on the whole credit domain, so the limits here are
/// the only thing keeping an ACE-1 student from getting ACE-2 material free
/// out of the chat window - a revenue boundary, not a cosmetic one.
nonisolated enum CourseID {
    static let ace1 = "3"
    static let ace2 = "4"
    static let ace3 = "5"
    /// ACE-4, the Complete ACE Bundle.
    static let bundle = "9"
}

/// A subject area an agent is cleared to discuss.
nonisolated enum AgentTopic: String, Hashable, Sendable {
    case creditRepair
    case scoreBuilding
}

nonisolated struct AgentScope: Hashable, Sendable {
    /// ACE-4 bundle students get the agent with no subject limits at all.
    let unrestricted: Bool
    /// Subject areas unlocked by individual course purchases.
    let topics: Set<AgentTopic>
    /// False when the student owns no course that includes an agent.
    var hasAccess: Bool { unrestricted || !topics.isEmpty }

    /// Works out what a student's agent may discuss from the courses owned.
    ///
    /// ACE-3 (Business Credit) deliberately grants no agent: the tool is a
    /// consumer credit repair assistant and has nothing to offer a business
    /// credit student, so an ACE-3-only student is shown an explanation
    /// rather than an agent that would refuse every question they asked.
    static func derive(from enrolledCourseIds: Set<String>) -> AgentScope {
        if enrolledCourseIds.contains(CourseID.bundle) {
            return AgentScope(unrestricted: true, topics: [.creditRepair, .scoreBuilding])
        }

        var topics: Set<AgentTopic> = []
        if enrolledCourseIds.contains(CourseID.ace1) { topics.insert(.creditRepair) }
        if enrolledCourseIds.contains(CourseID.ace2) { topics.insert(.scoreBuilding) }

        return AgentScope(unrestricted: false, topics: topics)
    }

    /// Short label describing the agent's remit, shown in the chat header.
    var label: String {
        if unrestricted { return "Full access — all credit topics" }
        let hasRepair = topics.contains(.creditRepair)
        let hasBuilding = topics.contains(.scoreBuilding)
        if hasRepair && hasBuilding { return "Credit repair & score building" }
        if hasRepair { return "Credit repair specialist" }
        if hasBuilding { return "Score building specialist" }
        return "No agent included"
    }

    /// Explains to an ACE-3-only student why there is no agent for them.
    static let notIncludedMessage = "Your personal AI Credit Repair Agent comes with ACE-1 (Advanced Credit Repair) and ACE-2 (Advanced Credit Building). ACE-3 covers business credit, which this consumer credit agent is not trained for. Add ACE-1 or ACE-2 — or get everything with the Complete ACE Bundle — to be matched with an agent."
}

nonisolated enum CourseEntitlements {
    /// The Interactive Coach is an ACE-2, ACE-3 and ACE-4 tool.
    ///
    /// It teaches score building and business credit strategy, which is not
    /// part of the ACE-1 syllabus - ACE-1 students see it locked with an
    /// upgrade prompt rather than hidden, so it doubles as a sales surface.
    static func canAccessInteractiveCoach(enrolledCourseIds: Set<String>) -> Bool {
        enrolledCourseIds.contains(CourseID.ace2)
            || enrolledCourseIds.contains(CourseID.ace3)
            || enrolledCourseIds.contains(CourseID.bundle)
    }
}
