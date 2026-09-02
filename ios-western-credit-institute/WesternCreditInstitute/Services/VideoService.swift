//
//  VideoService.swift
//  WesternCreditInstitute
//

import Foundation

/// Errors surfaced by the video API layer.
nonisolated enum VideoServiceError: Error, LocalizedError {
    case notConfigured
    case serverWaking
    case offline

    var errorDescription: String? {
        switch self {
        case .notConfigured: return "The API server is not configured."
        case .serverWaking: return "The server is starting up and didn't respond in time. Please try again in a few seconds."
        case .offline: return "Can't reach the server right now. Check your internet connection and try again in a moment."
        }
    }
}

/// tRPC client for the video endpoints, mirroring the retry and caching
/// behaviour of the Expo `lib/trpc.ts`:
/// - 5 attempts with exponential backoff + jitter (700ms base, 8s cap)
/// - retryable statuses: gateway / cold-start / rate-limit families
/// - 20s read timeout, 45s write timeout
/// - last-known section videos cached in UserDefaults so re-opening a course
///   renders the full lesson list instantly while the refresh happens quietly
nonisolated final class VideoService: Sendable {
    static let shared = VideoService()

    /// Statuses worth retrying: gateway/cold-start/rate-limit responses.
    private static let retryableStatuses: Set<Int> = [408, 425, 429, 500, 502, 503, 504]
    private static let maxAttempts = 5
    private static let baseDelay: UInt64 = 700_000_000
    private static let maxDelay: UInt64 = 8_000_000_000

    private let readSession: URLSession
    private let writeSession: URLSession
    private let baseURL: String

    private init() {
        // Config values are MainActor-isolated in this project; bridge to the
        // main actor once at creation (app startup always starts on main).
        baseURL = Thread.isMainThread
            ? MainActor.assumeIsolated { Config.EXPO_PUBLIC_RORK_API_BASE_URL }
            : DispatchQueue.main.sync {
                MainActor.assumeIsolated { Config.EXPO_PUBLIC_RORK_API_BASE_URL }
            }

        let readConfig = URLSessionConfiguration.default
        readConfig.timeoutIntervalForRequest = 20
        readConfig.timeoutIntervalForResource = 30
        readSession = URLSession(configuration: readConfig)

        let writeConfig = URLSessionConfiguration.default
        writeConfig.timeoutIntervalForRequest = 45
        writeConfig.timeoutIntervalForResource = 60
        writeSession = URLSession(configuration: writeConfig)
    }

    private var isConfigured: Bool { !baseURL.isEmpty }

    // MARK: - Response envelope (tRPC superjson single-request shape)

    private struct TRPCResponse<T: Decodable>: Decodable {
        struct Result: Decodable {
            let data: Payload
        }
        struct Payload: Decodable {
            let json: T
        }
        let result: Result
    }

    // MARK: - Videos

    /// Fetches the videos for a section from `videos.getAll`. Videos already
    /// carry a pre-signed embed URL, so the client never waits on signing.
    func fetchSectionVideos(courseId: String, sectionId: String) async throws -> [CourseVideo] {
        guard isConfigured else { throw VideoServiceError.notConfigured }

        let input = ["json": ["courseId": courseId, "sectionId": sectionId]]
        let videos: [CourseVideo] = try await query("videos.getAll", input: input)
        return videos
    }

    // MARK: - Progress

    /// All watch-progress records for a user inside a section.
    func fetchSectionProgress(userId: String, courseId: String, sectionId: String) async -> [VideoProgressRecord] {
        guard isConfigured else { return [] }
        let input = ["json": ["userId": userId, "courseId": courseId, "sectionId": sectionId]]
        do {
            return try await query("videoProgress.getAllProgress", input: input)
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
            return try await mutate("videoProgress.updateProgress", input: payload)
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
            let _: TRPCEmptyResponse = try await mutate("videoProgress.markCompleted", input: payload)
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

    // MARK: - Transport

    private struct TRPCEmptyResponse: Decodable {}

    /// tRPC GET query with retry/backoff. Throws the friendliest of the
    /// transport errors, matching the Expo messaging.
    private func query<T: Decodable>(_ procedure: String, input: [String: Any]) async throws -> T {
        guard isConfigured else { throw VideoServiceError.notConfigured }

        let inputJSON = try JSONSerialization.data(withJSONObject: input)
        // RFC 3986 unreserved characters - safe percent-encoding for JSON in a query.
        let unreserved = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")
        let encodedInput = String(data: inputJSON, encoding: .utf8)?
            .addingPercentEncoding(withAllowedCharacters: unreserved) ?? ""

        var components = URLComponents(string: "\(baseURL)/api/trpc/\(procedure)")
        components?.percentEncodedQuery = "input=\(encodedInput)"
        guard let url = components?.url else { throw VideoServiceError.offline }

        return try await execute(
            request: { URLRequest(url: url) },
            session: readSession,
            timeoutMessage: VideoServiceError.serverWaking
        )
    }

    /// tRPC POST mutation with retry/backoff.
    private func mutate<T: Decodable>(_ procedure: String, input: [String: Any]) async throws -> T {
        guard isConfigured else { throw VideoServiceError.notConfigured }

        guard let url = URL(string: "\(baseURL)/api/trpc/\(procedure)") else {
            throw VideoServiceError.offline
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: input)

        return try await execute(
            request: { request },
            session: writeSession,
            timeoutMessage: VideoServiceError.serverWaking
        )
    }

    private func execute<T: Decodable>(
        request: @escaping () -> URLRequest,
        session: URLSession,
        timeoutMessage: Error
    ) async throws -> T {
        var lastError: Error = VideoServiceError.offline

        for attempt in 0..<Self.maxAttempts {
            do {
                let (data, response) = try await session.data(for: request())
                guard let http = response as? HTTPURLResponse else {
                    lastError = VideoServiceError.offline
                    continue
                }

                // A cold-starting or overloaded server answers with 5xx before
                // tRPC ever sees the body - retry those instead of failing.
                if Self.retryableStatuses.contains(http.statusCode) && attempt < Self.maxAttempts - 1 {
                    lastError = VideoServiceError.serverWaking
                    try await Task.sleep(for: .nanoseconds(Self.backoffDelay(attempt: attempt)))
                    continue
                }

                guard (200..<300).contains(http.statusCode) else {
                    throw VideoServiceError.offline
                }

                do {
                    return try JSONDecoder().decode(TRPCResponse<T>.self, from: data).result.data.json
                } catch {
                    // The server answered but the payload did not match.
                    throw VideoServiceError.offline
                }
            } catch let error as VideoServiceError {
                lastError = error
                // Config/offline-style errors are not transport-retryable here.
                break
            } catch {
                lastError = error is URLError ? timeoutMessage : VideoServiceError.offline
                if attempt < Self.maxAttempts - 1 {
                    try? await Task.sleep(for: .nanoseconds(Self.backoffDelay(attempt: attempt)))
                    continue
                }
            }
        }

        throw lastError
    }

    /// Exponential backoff with jitter so retries don't stampede a waking server.
    private static func backoffDelay(attempt: Int) -> UInt64 {
        let exponential = baseDelay * UInt64(1 << attempt)
        let jitter = UInt64.random(in: 0..<baseDelay)
        return min(exponential + jitter, maxDelay)
    }
}
