//
//  SectionDetailView.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Lesson screen for a course section, mirroring the Expo section-detail:
/// progress header, CSO certification banner for ACE courses, the active
/// video with the instant-start Bunny player, and the lesson list.
struct SectionDetailView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    let course: Course

    @State private var viewModel: SectionDetailViewModel

    init(course: Course, section: CourseSection) {
        self.course = course
        _viewModel = State(
            initialValue: SectionDetailViewModel(
                route: SectionRoute(
                    courseId: course.id,
                    courseTitle: course.title,
                    sectionId: section.id,
                    sectionTitle: section.title
                ),
                userId: MockData.currentUser.id
            )
        )
    }

    private var isEnrolled: Bool {
        store.isEnrolled(course.id)
    }

    var body: some View {
        let colors = theme.colors

        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                header
                if viewModel.route.isACECourse && viewModel.totalVideos > 0 {
                    certificationBanner
                }
                if let video = viewModel.activeVideo {
                    activeVideoSection(video)
                }
                lessonsList
            }
            .padding(.horizontal, Spacing.md)
            .padding(.top, Spacing.md)
            .padding(.bottom, Spacing.xl)
        }
        .scrollIndicators(.hidden)
        .background(colors.background)
        .navigationTitle(viewModel.route.sectionTitle)
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) {
            if !isEnrolled { lockedFooter }
        }
        .task {
            await viewModel.load()
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(viewModel.route.sectionTitle)
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(theme.colors.text)

            Text("\(viewModel.completedCount) of \(viewModel.totalVideos) videos completed")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(theme.colors.textSecondary)

            ProgressBarView(progress: viewModel.sectionCompletionPercent, height: 6)
        }
    }

    // MARK: - Certification banner

    private var certificationBanner: some View {
        CardView {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "target")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 36, height: 36)
                        .background(theme.colors.primary)
                        .clipShape(.circle)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("CSO Exam Requirement")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(theme.colors.text)
                        Text("Watch at least \(SectionRoute.certificationThreshold)% of each video for certification eligibility")
                            .font(.system(size: 12))
                            .foregroundStyle(theme.colors.textSecondary)
                    }
                }

                ProgressBarView(progress: viewModel.certificationProgressPercent, height: 6)

                HStack(spacing: 5) {
                    let allEligible = viewModel.certificationEligibleCount == viewModel.totalVideos
                    Image(systemName: "rosette")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(allEligible ? theme.colors.secondary : theme.colors.warning)
                    Text("\(viewModel.certificationEligibleCount)/\(viewModel.totalVideos) videos meet \(SectionRoute.certificationThreshold)% requirement")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(allEligible ? theme.colors.secondary : theme.colors.warning)
                }
            }
        }
    }

    // MARK: - Active video

    private func activeVideoSection(_ video: CourseVideo) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            if video.hasBunnyVideo {
                BunnyVideoPlayerView(
                    video: video,
                    isLocked: !isEnrolled,
                    onUnlockPress: { dismiss() },
                    userId: viewModel.userId,
                    courseId: viewModel.route.courseId,
                    sectionId: viewModel.route.sectionId,
                    autoPlay: true,
                    onProgressUpdate: {
                        Task { await viewModel.refreshProgress() }
                    }
                )
                .id(video.id)
            } else {
                Text("Video not configured")
                    .font(.system(size: 14))
                    .foregroundStyle(theme.colors.textSecondary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 200)
                    .background(theme.colors.surfaceAlt)
                    .clipShape(.rect(cornerRadius: Radius.md))
            }

            Text(video.title)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(theme.colors.text)

            if !video.description.isEmpty {
                Text(video.description)
                    .font(.system(size: 14))
                    .lineSpacing(3)
                    .foregroundStyle(theme.colors.textSecondary)
            }
        }
        .padding(Spacing.md)
        .background(theme.colors.surface)
        .clipShape(.rect(cornerRadius: Radius.lg))
    }

    // MARK: - Lesson list

    @ViewBuilder
    private var lessonsList: some View {
        if viewModel.videos.isEmpty {
            VStack(spacing: Spacing.sm) {
                Image(systemName: "play.circle")
                    .font(.system(size: 30))
                    .foregroundStyle(theme.colors.textLight)
                Text(viewModel.hasFinishedFirstLoad ? "No videos in this section yet" : "Loading videos...")
                    .font(.system(size: 14))
                    .foregroundStyle(theme.colors.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.xl)
        } else {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("Video Lessons")
                    .font(.system(size: 12, weight: .heavy))
                    .foregroundStyle(theme.colors.textLight)

                ForEach(Array(viewModel.videos.enumerated()), id: \.element.id) { index, video in
                    lessonRow(index: index, video: video)
                }
            }
        }
    }

    private func lessonRow(index: Int, video: CourseVideo) -> some View {
        let record = viewModel.progress(for: video.id)
        let isActive = viewModel.activeVideoIndex == index
        let isCompleted = record?.isCompleted ?? false
        let percent = record?.percent ?? 0
        let certEligible = record?.isCertificationEligible ?? false
        let showCertWarning = viewModel.route.isACECourse && percent > 0 && !isCompleted && !certEligible

        return Button {
            Haptics.light()
            withAnimation(.spring(response: 0.32, dampingFraction: 0.8)) {
                viewModel.activeVideoIndex = index
            }
        } label: {
            HStack(spacing: Spacing.md) {
                lessonRowIcon(index: index, isCompleted: isCompleted, isActive: isActive)

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(video.title)
                            .font(.system(size: 14, weight: isActive ? .bold : .semibold))
                            .foregroundStyle(
                                isCompleted
                                    ? theme.colors.secondary
                                    : (isActive ? theme.colors.primary : theme.colors.text)
                            )
                            .multilineTextAlignment(.leading)
                        if viewModel.route.isACECourse && certEligible {
                            Image(systemName: "rosette")
                                .font(.system(size: 11))
                                .foregroundStyle(theme.colors.secondary)
                        }
                    }

                    HStack(spacing: Spacing.sm) {
                        if !video.duration.isEmpty {
                            Text(video.duration)
                                .font(.system(size: 12))
                                .foregroundStyle(theme.colors.textLight)
                        }

                        if percent > 0 && !isCompleted {
                            Text(
                                viewModel.route.isACECourse && !certEligible
                                    ? "\(percent)% watched (need \(SectionRoute.certificationThreshold - percent)% more)"
                                    : "\(percent)% watched"
                            )
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(showCertWarning ? theme.colors.warning : theme.colors.secondary)
                        }

                        if viewModel.route.isACECourse && percent == 0 {
                            Text("Need \(SectionRoute.certificationThreshold)% for certification")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(theme.colors.warning)
                        }
                    }

                    if showCertWarning {
                        // Mini progress with the certification threshold marker.
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                Rectangle()
                                    .fill(theme.colors.border)
                                    .frame(height: 4)
                                Rectangle()
                                    .fill(theme.colors.warning)
                                    .frame(width: geometry.size.width * Double(percent) / 100, height: 4)
                                Rectangle()
                                    .fill(theme.colors.text)
                                    .frame(width: 2, height: 8)
                                    .offset(x: geometry.size.width * Double(SectionRoute.certificationThreshold) / 100)
                            }
                            .clipShape(.capsule)
                        }
                        .frame(height: 8)
                    }
                }

                Spacer(minLength: 0)

                if showCertWarning {
                    Image(systemName: "exclamationmark.circle")
                        .font(.system(size: 14))
                        .foregroundStyle(theme.colors.warning)
                }
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(theme.colors.textLight)
            }
            .padding(Spacing.md)
            .background(
                isActive
                    ? theme.colors.primary.opacity(0.08)
                    : theme.colors.surface
            )
            .overlay {
                if isCompleted {
                    RoundedRectangle(cornerRadius: Radius.md)
                        .strokeBorder(theme.colors.secondary.opacity(0.4), lineWidth: 1)
                }
            }
            .clipShape(.rect(cornerRadius: Radius.md))
        }
        .buttonStyle(PressableButtonStyle())
    }

    @ViewBuilder
    private func lessonRowIcon(index: Int, isCompleted: Bool, isActive: Bool) -> some View {
        if !isEnrolled {
            Image(systemName: "lock.fill")
                .font(.system(size: 13))
                .foregroundStyle(theme.colors.textLight)
                .frame(width: 32, height: 32)
                .background(theme.colors.surfaceAlt)
                .clipShape(.circle)
        } else if isCompleted {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 17))
                .foregroundStyle(theme.colors.secondary)
                .frame(width: 32, height: 32)
                .background(theme.colors.secondary.opacity(0.14))
                .clipShape(.circle)
        } else if isActive {
            Image(systemName: "play.fill")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 32, height: 32)
                .background(theme.colors.primary)
                .clipShape(.circle)
        } else {
            Text("\(index + 1)")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(theme.colors.primary)
                .frame(width: 32, height: 32)
                .background(theme.colors.primary.opacity(0.1))
                .clipShape(.circle)
        }
    }

    // MARK: - Locked footer

    private var lockedFooter: some View {
        HStack(spacing: Spacing.md) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(theme.colors.primary)
                Text("Enroll in this course to access all content")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(theme.colors.textSecondary)
            }

            Spacer(minLength: 0)

            Button {
                Haptics.light()
                dismiss()
            } label: {
                Text("View Course")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, 10)
                    .background(theme.colors.primary)
                    .clipShape(.capsule)
            }
            .buttonStyle(PressableButtonStyle())
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) {
            Rectangle().fill(theme.colors.border).frame(height: 0.5)
        }
    }
}
