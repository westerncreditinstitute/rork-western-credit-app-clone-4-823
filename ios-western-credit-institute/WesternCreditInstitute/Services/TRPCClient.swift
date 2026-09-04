//
//  TRPCClient.swift
//  WesternCreditInstitute
//

import Foundation

/// Errors surfaced by the tRPC transport layer.
nonisolated enum TRPCClientError: Error, LocalizedError {
    case notConfigured
    case serverWaking
    case offline
    /// A tRPC procedure answered with an error payload (message preserved).
    case server(message: String)

    /// True for failures that mean the transport itself could not complete.
    /// A `.server` error proves the opposite: the server answered.
    var isTransportFailure: Bool {
        switch self {
        case .offline, .serverWaking: return true
        case .notConfigured, .server: return false
        }
    }

    var errorDescription: String? {
        switch self {
        case .notConfigured: return "The API server is not configured."
        case .serverWaking: return "The server is starting up and didn't respond in time. Please try again in a few seconds."
        case .offline: return "Can't reach the server right now. Check your internet connection and try again in a moment."
        case .server(let message): return message
        }
    }
}

/// Shared tRPC transport, mirroring the retry behaviour of the Expo `lib/trpc.ts`:
/// - 5 attempts with exponential backoff + jitter (700ms base, 8s cap)
/// - retryable statuses: gateway / cold-start / rate-limit families
/// - 20s read timeout, 45s write timeout
nonisolated final class TRPCClient: Sendable {
    static let shared = TRPCClient()

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

    var isConfigured: Bool { !baseURL.isEmpty }

    // MARK: - Response envelopes (tRPC superjson single-request shape)

    private struct TRPCResponse<T: Decodable>: Decodable {
        struct Result: Decodable {
            let data: Payload
        }
        struct Payload: Decodable {
            let json: T
        }
        let result: Result
    }

    /// tRPC error envelope, so a failed procedure keeps its human-readable message.
    private struct TRPCErrorResponse: Decodable {
        struct ErrorBody: Decodable {
            struct Payload: Decodable {
                let message: String?
            }
            let json: Payload?
            let message: String?
        }
        let error: ErrorBody
    }

    // MARK: - Public API

    /// tRPC GET query with retry/backoff.
    func query<T: Decodable>(_ procedure: String, input: [String: Any]) async throws -> T {
        guard isConfigured else { throw TRPCClientError.notConfigured }

        let inputJSON = try JSONSerialization.data(withJSONObject: input)
        // RFC 3986 unreserved characters - safe percent-encoding for JSON in a query.
        let unreserved = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")
        let encodedInput = String(data: inputJSON, encoding: .utf8)?
            .addingPercentEncoding(withAllowedCharacters: unreserved) ?? ""

        var components = URLComponents(string: "\(baseURL)/api/trpc/\(procedure)")
        components?.percentEncodedQuery = "input=\(encodedInput)"
        guard let url = components?.url else { throw TRPCClientError.offline }

        return try await execute(request: { URLRequest(url: url) }, session: readSession, isWrite: false)
    }

    /// tRPC POST mutation with retry/backoff.
    func mutate<T: Decodable>(_ procedure: String, input: [String: Any]) async throws -> T {
        guard isConfigured else { throw TRPCClientError.notConfigured }

        guard let url = URL(string: "\(baseURL)/api/trpc/\(procedure)") else {
            throw TRPCClientError.offline
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: input)

        return try await execute(request: { request }, session: writeSession, isWrite: true)
    }

    /// Probes the health route to confirm reachability, mirroring the Expo
    /// `checkApiReachable`. Any HTTP answer - even a 404 - proves the server is
    /// up; only the edge 5xx family means the instance is asleep or down.
    @discardableResult
    func checkReachable() async -> Bool {
        guard isConfigured, let url = URL(string: "\(baseURL)/api") else {
            Self.reportUnreachable()
            return false
        }

        do {
            let (_, response) = try await readSession.data(for: URLRequest(url: url))
            guard let http = response as? HTTPURLResponse,
                  !Self.retryableStatuses.contains(http.statusCode) else {
                Self.reportUnreachable()
                return false
            }
            Self.reportReachable()
            return true
        } catch {
            Self.reportUnreachable()
            return false
        }
    }

    // MARK: - Transport

    private func execute<T: Decodable>(
        request: @escaping () -> URLRequest,
        session: URLSession,
        isWrite: Bool
    ) async throws -> T {
        var lastError: Error = TRPCClientError.offline

        // Writes drive the header "Syncing" state; reads do not, so background
        // polling never makes the app look like it is saving something.
        if isWrite { Self.reportWriteBegan() }
        defer { if isWrite { Self.reportWriteEnded() } }

        for attempt in 0..<Self.maxAttempts {
            do {
                let (data, response) = try await session.data(for: request())
                guard let http = response as? HTTPURLResponse else {
                    lastError = TRPCClientError.offline
                    continue
                }

                // A cold-starting or overloaded server answers with 5xx before
                // tRPC ever sees the body - retry those instead of failing.
                if Self.retryableStatuses.contains(http.statusCode) && attempt < Self.maxAttempts - 1 {
                    lastError = TRPCClientError.serverWaking
                    try await Task.sleep(for: .nanoseconds(Self.backoffDelay(attempt: attempt)))
                    continue
                }

                // Any real HTTP answer proves the server is reachable - even an
                // application-level 4xx. Only the edge 5xx family means down.
                Self.reportReachable()

                guard (200..<300).contains(http.statusCode) else {
                    // A 4xx from tRPC carries the procedure's error message.
                    throw Self.decodedError(from: data)
                }

                do {
                    return try JSONDecoder().decode(TRPCResponse<T>.self, from: data).result.data.json
                } catch {
                    // The server answered but the payload did not match.
                    throw Self.decodedError(from: data)
                }
            } catch let error as TRPCClientError {
                lastError = error
                // Config/server-side errors are not transport-retryable here.
                break
            } catch {
                lastError = error is URLError ? TRPCClientError.serverWaking : TRPCClientError.offline
                if attempt < Self.maxAttempts - 1 {
                    try? await Task.sleep(for: .nanoseconds(Self.backoffDelay(attempt: attempt)))
                    continue
                }
            }
        }

        // Retries are exhausted: this is a confirmed transport failure, not a
        // single blip, so it is safe to report the server as unreachable.
        if let clientError = lastError as? TRPCClientError,
           clientError.isTransportFailure {
            Self.reportUnreachable()
        }

        throw lastError
    }

    // MARK: - Sync status reporting

    private static func reportReachable() {
        Task { @MainActor in SyncStatusStore.shared.recordSuccess() }
    }

    private static func reportUnreachable() {
        Task { @MainActor in SyncStatusStore.shared.recordFailure() }
    }

    private static func reportWriteBegan() {
        Task { @MainActor in SyncStatusStore.shared.beginWrite() }
    }

    private static func reportWriteEnded() {
        Task { @MainActor in SyncStatusStore.shared.endWrite() }
    }

    /// Pulls the tRPC error message out of a failure body when present.
    private static func decodedError(from data: Data) -> TRPCClientError {
        guard let decoded = try? JSONDecoder().decode(TRPCErrorResponse.self, from: data) else {
            return .offline
        }
        let message = decoded.error.json?.message ?? decoded.error.message
        guard let message, !message.isEmpty else { return .offline }
        return .server(message: message)
    }

    /// Exponential backoff with jitter so retries don't stampede a waking server.
    private static func backoffDelay(attempt: Int) -> UInt64 {
        let exponential = baseDelay * UInt64(1 << attempt)
        let jitter = UInt64.random(in: 0..<baseDelay)
        return min(exponential + jitter, maxDelay)
    }
}
