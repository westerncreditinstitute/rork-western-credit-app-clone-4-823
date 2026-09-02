//
//  SectionDetailViewModel.swift
//  WesternCreditInstitute
//

import Foundation

/// Drives the section lesson screen. Loads the persisted lesson list instantly,
/// then refreshes quietly from the backend — mirroring the Expo section-detail
/// caching strategy so re-opening a course never waits on the network.
@MainActor
@Observable
final class SectionDetailViewModel {
    let route: SectionRoute
    let userId: String

    private(set) var videos: [CourseVideo] = []
    private(set) var progressRecords: [VideoProgressRecord] = []
    /// True once the first refresh attempt finished (used for the empty state).
    private(set) var hasFinishedFirstLoad = false

    var activeVideoIndex: Int?

    init(route: SectionRoute, userId: String) {
        self.route = route
        self.userId = userId

        // Instant paint from the persisted cache while the refresh runs.
        if let cached = VideoService.shared.cachedSectionVideos(
            courseId: route.courseId,
            sectionId: route.sectionId
        ) {
            videos = cached
        }
    }

    // MARK: - Loading

    func load() async {
        await refresh()
    }

    func refresh() async {
        do {
            let fresh = try await VideoService.shared.fetchSectionVideos(
                courseId: route.courseId,
                sectionId: route.sectionId
            )
            if !fresh.isEmpty {
                videos = fresh.sorted { $0.order < $1.order }
                VideoService.shared.cacheSectionVideos(
                    videos,
                    courseId: route.courseId,
                    sectionId: route.sectionId
                )
            }
        } catch {
            // Keep cached videos on screen; the section stays usable offline.
        }
        await refreshProgress()
        hasFinishedFirstLoad = true
    }

    func refreshProgress() async {
        progressRecords = await VideoService.shared.fetchSectionProgress(
            userId: userId,
            courseId: route.courseId,
            sectionId: route.sectionId
        )
    }

    // MARK: - Derived state

    var activeVideo: CourseVideo? {
        guard let index = activeVideoIndex, videos.indices.contains(index) else { return nil }
        return videos[index]
    }

    func progress(for videoId: String) -> VideoProgressRecord? {
        progressRecords.first { $0.videoId == videoId }
    }

    var totalVideos: Int { videos.count }

    var completedCount: Int {
        videos.filter { progress(for: $0.id)?.isCompleted ?? false }.count
    }

    var certificationEligibleCount: Int {
        videos.filter { progress(for: $0.id)?.isCertificationEligible ?? false }.count
    }

    var sectionCompletionPercent: Int {
        totalVideos > 0 ? completedCount * 100 / totalVideos : 0
    }

    var certificationProgressPercent: Int {
        totalVideos > 0 ? certificationEligibleCount * 100 / totalVideos : 0
    }
}
