//
//  FeaturedVideoService.swift
//  WesternCreditInstitute
//

import Foundation

/// The featured video shown in the home page "Videos" section, as configured
/// by an admin in the Promo Manager.
nonisolated struct HomeFeaturedVideo: Codable, Sendable {
    let id: String
    let title: String
    let heygenEmbedId: String
    let videoType: String?
    let description: String?

    var isHeyGen: Bool { (videoType ?? "heygen") == "heygen" && !heygenEmbedId.isEmpty }
}

/// Reads the admin-managed home page video from `featuredVideos.getHomeVideo`.
///
/// The last-known embed id is cached in UserDefaults so the home screen renders
/// the right video immediately on launch and only swaps if the admin changed it.
nonisolated final class FeaturedVideoService: Sendable {
    static let shared = FeaturedVideoService()

    /// Ships with the app so the home screen always has something to play.
    static let defaultEmbedId = "92770d6dd5164282bbeabb6a890f3f41"

    private static let cacheKey = "wci.home.heygen.embedId"

    private let client = TRPCClient.shared

    private init() {}

    /// Cached embed id, falling back to the bundled default.
    var cachedEmbedId: String {
        let cached = UserDefaults.standard.string(forKey: Self.cacheKey) ?? ""
        return cached.isEmpty ? Self.defaultEmbedId : cached
    }

    /// Fetches the currently configured home video. Returns `nil` when the
    /// request fails so callers keep showing the cached embed.
    func fetchHomeVideo() async -> HomeFeaturedVideo? {
        guard client.isConfigured else { return nil }

        do {
            let video: HomeFeaturedVideo = try await client.query(
                "featuredVideos.getHomeVideo",
                input: ["json": NSNull()]
            )
            guard video.isHeyGen else { return nil }
            UserDefaults.standard.set(video.heygenEmbedId, forKey: Self.cacheKey)
            return video
        } catch {
            // The home screen is fine on the cached embed; no user-facing error.
            return nil
        }
    }
}
