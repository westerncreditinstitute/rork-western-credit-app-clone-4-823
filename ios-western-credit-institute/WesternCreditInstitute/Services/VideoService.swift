//
//  VideoService.swift
//  WesternCreditInstitute
//

import Foundation

/// Errors surfaced by the video API layer. The transport is shared with the
/// other services, so these are the common tRPC failures.
typealias VideoServiceError = TRPCClientError

/// Video endpoints on top of the shared `TRPCClient`.
///
/// Last-known section videos are cached in UserDefaults so re-opening a course
/// renders the full lesson list instantly while the refresh happens quietly.
nonisolated final class VideoService: Sendable {
    static let shared = VideoService()

    private let client = TRPCClient.shared

    private init() {}

    private var isConfigured: Bool { client.isConfigured }

    // MARK: - Videos

    /// Fetches the videos for a section from `videos.getAll`. Videos already
    /// carry a pre-signed embed URL, so the client never waits on signing.
    func fetchSectionVideos(courseId: String, sectionId: String) async throws -> [CourseVideo] {
        guard isConfigured else { throw VideoServiceError.notConfigured }

        let input = ["json": ["courseId": courseId, "sectionId": sectionId]]
        let videos: [CourseVideo] = try await client.query("videos.getAll", input: input)
        return videos
    }

    // MARK: - Progress

    /// All watch-progress records for a user inside a section.
    func fetchSectionProgress(userId: String, courseId: String, sectionId: String) async -> [VideoProgressRecord] {
        guard isConfigured else { return [] }
        let input = ["json": ["userId": userId, "courseId": courseId, "sectionId": sectionId]]
        do {
            return try await client.query("videoProgress.getAllProgress", input: input)
        } catch {
            // Progress is a nice-to-have; an empty list keeps the screen usable.
            return []
        }
    }

    /// Records periodic watch progress (`videoProgress.updateProgress`).
    func updateProgress(
        userId: String,
        videoId: String,
        courseId: String,
        sectionId: String,
        currentTime: Int,
        duration: Int
    ) async -> VideoProgressRecord? {
        guard isConfigured else { return nil }
        let payload = [
            "json": [
                "userId": userId,
                "videoId": videoId,
                "courseId": courseId,
                "sectionId": sectionId,
                "currentTime": currentTime,
                "duration": duration,
            ]
        ]
        do {
            return try await client.mutate("videoProgress.updateProgress", input: payload)
        } catch {
            return nil
        }
    }

    /// Marks a video as complete (`videoProgress.markCompleted`).
    func markCompleted(
        userId: String,
        videoId: String,
        courseId: String,
        sectionId: String
    ) async -> Bool {
        guard isConfigured else { return false }
        let payload = [
            "json": [
                "userId": userId,
                "videoId": videoId,
                "courseId": courseId,
                "sectionId": sectionId,
            ]
        ]
        do {
            let _: TRPCEmptyResponse = try await client.mutate("videoProgress.markCompleted", input: payload)
            return true
        } catch {
            return false
        }
    }

    // MARK: - Local cache (instant repeat course opens)

    private static func cacheKey(courseId: String, sectionId: String) -> String {
        "wci.section.videos.\(courseId).\(sectionId)"
    }

    /// Last-known videos for a section, persisted so the lesson list renders
    /// instantly on repeat visits without waiting on the network.
    func cachedSectionVideos(courseId: String, sectionId: String) -> [CourseVideo]? {
        guard let data = UserDefaults.standard.data(forKey: Self.cacheKey(courseId: courseId, sectionId: sectionId)) else {
            return nil
        }
        return try? JSONDecoder().decode([CourseVideo].self, from: data)
    }

    func cacheSectionVideos(_ videos: [CourseVideo], courseId: String, sectionId: String) {
        guard let data = try? JSONEncoder().encode(videos) else { return }
        UserDefaults.standard.set(data, forKey: Self.cacheKey(courseId: courseId, sectionId: sectionId))
    }
}

/// Decodable stand-in for procedures whose payload is ignored.
nonisolated struct TRPCEmptyResponse: Decodable, Sendable {}
