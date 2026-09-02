//
//  CourseVideo.swift
//  WesternCreditInstitute
//

import Foundation

/// A video lesson returned by the backend `videos.getAll` endpoint.
/// Mirrors the Expo `VideoItem` shape, including the pre-signed Bunny embed
/// URL that ships with the query so playback needs no extra round trip.
nonisolated struct CourseVideo: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let title: String
    let bunnyVideoId: String
    let bunnyLibraryId: String
    /// Pre-signed, ready-to-play embed URL (valid for ~1 hour when signed).
    let bunnyEmbedUrl: String
    let bunnyEmbedExpiresAt: Double?
    /// Human duration string from the record, e.g. "12:34".
    let duration: String
    let description: String
    let order: Int

    var hasBunnyVideo: Bool {
        !bunnyVideoId.isEmpty && !bunnyLibraryId.isEmpty
    }

    /// Duration in seconds parsed from the "h:mm:ss" / "mm:ss" / "ss" string.
    /// Comes from the stored record, so the player never calls the Bunny API.
    var durationSeconds: Int {
        let parts = duration.split(separator: ":")
        var seconds = 0
        for part in parts {
            guard let value = Int(part.trimmingCharacters(in: .whitespaces)) else { return 0 }
            seconds = seconds * 60 + value
        }
        return parts.isEmpty ? 0 : seconds
    }
}

extension CourseVideo {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        title = try container.decodeIfPresent(String.self, forKey: .title) ?? ""
        bunnyVideoId = try container.decodeIfPresent(String.self, forKey: .bunnyVideoId) ?? ""
        bunnyLibraryId = try container.decodeIfPresent(String.self, forKey: .bunnyLibraryId) ?? ""
        bunnyEmbedUrl = try container.decodeIfPresent(String.self, forKey: .bunnyEmbedUrl) ?? ""
        bunnyEmbedExpiresAt = try container.decodeIfPresent(Double.self, forKey: .bunnyEmbedExpiresAt)
        duration = try container.decodeIfPresent(String.self, forKey: .duration) ?? ""
        description = try container.decodeIfPresent(String.self, forKey: .description) ?? ""
        order = try container.decodeIfPresent(Int.self, forKey: .order) ?? 0
    }

    private enum CodingKeys: String, CodingKey {
        case id, title, order, duration, description
        case bunnyVideoId, bunnyLibraryId, bunnyEmbedUrl, bunnyEmbedExpiresAt
    }
}

/// Watch progress for a single video, from the `videoProgress.getAllProgress`
/// endpoint. Percentages feed the CSO certification (80% per video) tracking.
nonisolated struct VideoProgressRecord: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let videoId: String
    let currentTime: Int?
    let duration: Int?
    let progressPercent: Int?
    let completed: Bool?
    let certificationEligible: Bool?
    let lastWatchedAt: String?

    var percent: Int { progressPercent ?? 0 }
    var isCompleted: Bool { completed ?? false }
    var isCertificationEligible: Bool { percent >= SectionRoute.certificationThreshold }

    init(
        id: String,
        videoId: String,
        currentTime: Int?,
        duration: Int?,
        progressPercent: Int?,
        completed: Bool?,
        certificationEligible: Bool?,
        lastWatchedAt: String?
    ) {
        self.id = id
        self.videoId = videoId
        self.currentTime = currentTime
        self.duration = duration
        self.progressPercent = progressPercent
        self.completed = completed
        self.certificationEligible = certificationEligible
        self.lastWatchedAt = lastWatchedAt
    }

    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        // SurrealDB record ids arrive as strings like "video_progress:123_abc".
        id = (try? container.decode(String.self, forKey: .id)) ?? UUID().uuidString
        videoId = try container.decodeIfPresent(String.self, forKey: .videoId) ?? ""
        currentTime = try container.decodeIfPresent(Int.self, forKey: .currentTime)
        duration = try container.decodeIfPresent(Int.self, forKey: .duration)
        progressPercent = try container.decodeIfPresent(Int.self, forKey: .progressPercent)
        completed = try container.decodeIfPresent(Bool.self, forKey: .completed)
        certificationEligible = try container.decodeIfPresent(Bool.self, forKey: .certificationEligible)
        lastWatchedAt = try container.decodeIfPresent(String.self, forKey: .lastWatchedAt)
    }

    private enum CodingKeys: String, CodingKey {
        case id, videoId, currentTime, duration, completed
        case progressPercent, certificationEligible, lastWatchedAt
    }
}

/// Navigation payload for a course section's lesson screen.
nonisolated struct SectionRoute: Hashable, Sendable {
    static let certificationThreshold = 80
    /// ACE courses gate CSO certification on per-video watch percentage.
    static let aceCourseIds: Set<String> = ["3", "4", "5", "9"]

    let courseId: String
    let courseTitle: String
    let sectionId: String
    let sectionTitle: String

    var isACECourse: Bool { Self.aceCourseIds.contains(courseId) }
}
