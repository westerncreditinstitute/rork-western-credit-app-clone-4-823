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
///   2. What their AI Agent is allowed to talk about.
///
/// The agents are trained on the whole credit domain, so the limits here are
/// the only thing keeping an ACE-1 student from getting ACE-2 (score building)
/// or ACE-3 (business credit) material for free out of the chat window - a
/// revenue boundary, not a cosmetic one.
///
/// The three subjects map one-to-one onto the three courses:
///   - ACE-1 (Advanced Credit Repair)      -> creditRepair   (disputes)
///   - ACE-2 (Advanced Credit Building)    -> scoreBuilding  (raising a score)
///   - ACE-3 (Advanced Business Credit)    -> businessCredit (business credit)
/// The ACE-4 Complete Bundle unlocks all three with no restrictions.
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
    case businessCredit

    /// Human-readable course name for each subject, used in refusals + labels.
    var courseName: String {
        switch self {
        case .creditRepair: return "ACE-1 (Advanced Credit Repair)"
        case .scoreBuilding: return "ACE-2 (Advanced Credit Building)"
        case .businessCredit: return "ACE-3 (Advanced Business Credit)"
        }
    }
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
    /// Each course unlocks exactly its own subject and nothing else, so an
    /// ACE-1 student cannot get score-building advice, an ACE-2 student cannot
    /// get dispute advice, and an ACE-3 student cannot get either - each of
    /// those is the paid deliverable of a different course.
    static func derive(from enrolledCourseIds: Set<String>) -> AgentScope {
        if enrolledCourseIds.contains(CourseID.bundle) {
            return AgentScope(unrestricted: true, topics: [.creditRepair, .scoreBuilding, .businessCredit])
        }

        var topics: Set<AgentTopic> = []
        if enrolledCourseIds.contains(CourseID.ace1) { topics.insert(.creditRepair) }
        if enrolledCourseIds.contains(CourseID.ace2) { topics.insert(.scoreBuilding) }
        if enrolledCourseIds.contains(CourseID.ace3) { topics.insert(.businessCredit) }

        return AgentScope(unrestricted: false, topics: topics)
    }

    /// Short label describing the agent's remit, shown in the chat header.
    var label: String {
        if unrestricted { return "Full access — all credit topics" }
        let hasRepair = topics.contains(.creditRepair)
        let hasBuilding = topics.contains(.scoreBuilding)
        let hasBusiness = topics.contains(.businessCredit)

        if hasRepair && hasBuilding && hasBusiness { return "Credit repair, building & business credit" }
        if hasRepair && hasBuilding { return "Credit repair & score building" }
        if hasRepair && hasBusiness { return "Credit repair & business credit" }
        if hasBuilding && hasBusiness { return "Score building & business credit" }
        if hasRepair { return "Credit repair specialist" }
        if hasBuilding { return "Score building specialist" }
        if hasBusiness { return "Business credit specialist" }
        return "No agent included"
    }

    /// Explains to a student with no agent-bearing course why there is no agent.
    static let notIncludedMessage = "Your personal AI Agent is included with ACE-1 (Advanced Credit Repair), ACE-2 (Advanced Credit Building) and ACE-3 (Advanced Business Credit). Enroll in any of those — or get everything with the Complete ACE Bundle — to be matched with an agent."
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
