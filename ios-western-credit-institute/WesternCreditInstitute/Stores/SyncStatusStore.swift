//
//  SyncStatusStore.swift
//  WesternCreditInstitute
//

import Foundation

/// What the header indicator reports to the user.
nonisolated enum SyncStatus: Sendable {
    case synced
    case syncing
    case offline

    var label: String {
        switch self {
        case .synced: return "Synced"
        case .syncing: return "Syncing"
        case .offline: return "Offline"
        }
    }
}

/// Live sync state for the header pill, mirroring the Expo `useSyncStatus` hook.
///
/// Connection is derived from real request outcomes rather than from a system
/// reachability flag: the device can hold full signal while this specific API
/// refuses traffic, and that still means the app cannot sync.
@Observable
final class SyncStatusStore {
    static let shared = SyncStatusStore()

    /// Optimistic until proven otherwise - only a confirmed failure flips this.
    private(set) var isOffline: Bool = false

    /// Writes currently in flight. A count, not a flag, because overlapping
    /// saves must not let the first one to finish clear the indicator.
    private(set) var activeWrites: Int = 0

    private init() {}

    /// Offline wins over Syncing: with the server unreachable there is no
    /// progress to report, and claiming "Syncing" would be a lie.
    var status: SyncStatus {
        if isOffline { return .offline }
        return activeWrites > 0 ? .syncing : .synced
    }

    func beginWrite() {
        activeWrites += 1
    }

    func endWrite() {
        activeWrites = max(0, activeWrites - 1)
    }

    /// Any real HTTP answer proves the server is reachable.
    func recordSuccess() {
        isOffline = false
    }

    /// Called once retries are exhausted, not on a single blip.
    func recordFailure() {
        isOffline = true
    }
}
