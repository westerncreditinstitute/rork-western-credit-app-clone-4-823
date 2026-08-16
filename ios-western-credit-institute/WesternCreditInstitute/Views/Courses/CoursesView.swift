//
//  CoursesView.swift
//  WesternCreditInstitute
//

import SwiftUI

struct CoursesView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store

    @State private var searchText = ""
    @State private var selectedCategory = "All"
    @State private var showEnrolledOnly = false

    private var filteredCourses: [Course] {
        store.courses.filter { course in
            let matchesSearch = searchText.isEmpty
                || course.title.localizedStandardContains(searchText)
                || course.shortDescription.localizedStandardContains(searchText)
            let matchesCategory = selectedCategory == "All" || course.category == selectedCategory
            let matchesTab = !showEnrolledOnly || course.enrolled
            return matchesSearch && matchesCategory && matchesTab
        }
    }

    var body: some View {
        let colors = theme.colors

        VStack(spacing: 0) {
            ScreenHeader(title: "Courses", subtitle: "Advanced Credit Education")

            VStack(spacing: Spacing.md) {
                searchField
                segmentedTabs
                categoryChips
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, Spacing.md)
            .background(colors.surface)

            ScrollView {
                if filteredCourses.isEmpty {
                    EmptyStateView(
                        symbol: "magnifyingglass",
                        title: "No courses found",
                        message: showEnrolledOnly
                            ? "You haven't enrolled in a course in this category yet."
                            : "Try a different search term or category."
                    )
                    .padding(.horizontal, Spacing.md)
                } else {
                    LazyVStack(spacing: Spacing.md) {
                        ForEach(filteredCourses) { course in
                            NavigationLink(value: course) {
                                CourseCard(course: course)
                            }
                            .buttonStyle(PressableButtonStyle())
                        }
                    }
                    .padding(.horizontal, Spacing.md)
                    .padding(.top, Spacing.md)
                    .padding(.bottom, Spacing.xl)
                }
            }
            .scrollIndicators(.hidden)
            .background(colors.background)
        }
        .background(colors.background)
    }

    private var searchField: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(theme.colors.textLight)

            TextField("Search courses", text: $searchText)
                .font(.system(size: 15))
                .foregroundStyle(theme.colors.text)
                .autocorrectionDisabled()
                .submitLabel(.search)

            if !searchText.isEmpty {
                Button {
                    Haptics.light()
                    searchText = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 15))
                        .foregroundStyle(theme.colors.textLight)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, 12)
        .background(theme.colors.surfaceAlt)
        .clipShape(.rect(cornerRadius: Radius.md))
    }

    private var segmentedTabs: some View {
        HStack(spacing: 0) {
            tabButton(title: "All Courses", isActive: !showEnrolledOnly) { showEnrolledOnly = false }
            tabButton(title: "Enrolled (\(store.enrolledCourses.count))", isActive: showEnrolledOnly) { showEnrolledOnly = true }
        }
        .padding(3)
        .background(theme.colors.surfaceAlt)
        .clipShape(.rect(cornerRadius: Radius.md))
    }

    private func tabButton(title: String, isActive: Bool, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.selection()
            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) { action() }
        } label: {
            Text(title)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(isActive ? theme.colors.textInverse : theme.colors.textSecondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 9)
                .background {
                    if isActive {
                        RoundedRectangle(cornerRadius: Radius.sm)
                            .fill(theme.colors.primary)
                    }
                }
        }
        .buttonStyle(.plain)
    }

    private var categoryChips: some View {
        ScrollView(.horizontal) {
            HStack(spacing: Spacing.sm) {
                ForEach(MockData.categories, id: \.self) { category in
                    let isActive = selectedCategory == category
                    Button {
                        Haptics.selection()
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.82)) {
                            selectedCategory = category
                        }
                    } label: {
                        Text(category)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(isActive ? theme.colors.textInverse : theme.colors.textSecondary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(isActive ? theme.colors.secondary : theme.colors.surfaceAlt)
                            .clipShape(.capsule)
                    }
                    .buttonStyle(PressableButtonStyle())
                }
            }
        }
        .scrollIndicators(.hidden)
        .scrollClipDisabled()
    }
}

// MARK: - Course card

struct CourseCard: View {
    @Environment(ThemeManager.self) private var theme

    let course: Course

    var body: some View {
        let colors = theme.colors

        VStack(alignment: .leading, spacing: 0) {
            RemoteImage(urlString: course.imageURL, height: 156)
                .overlay(alignment: .topTrailing) {
                    if course.enrolled, (course.progress ?? 0) >= 100 {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(7)
                            .background(colors.success)
                            .clipShape(.circle)
                            .padding(Spacing.sm)
                    }
                }
                .overlay {
                    if course.comingSoon {
                        colors.overlay
                            .overlay {
                                Text("Coming Soon")
                                    .font(.system(size: 15, weight: .heavy))
                                    .foregroundStyle(.white)
                            }
                    }
                }

            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(alignment: .top) {
                    BadgeView(text: course.level.rawValue, variant: .primary)
                    Spacer(minLength: Spacing.sm)
                    priceLabel
                }

                Text(course.title)
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(colors.text)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                Text(course.shortDescription)
                    .font(.system(size: 13))
                    .foregroundStyle(colors.textSecondary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                HStack(spacing: Spacing.md) {
                    metaItem(symbol: "clock", text: course.duration)
                    metaItem(symbol: "book", text: "\(course.lessons) lessons")
                }

                if course.enrolled, let progress = course.progress {
                    ProgressBarView(progress: progress, showLabel: true)
                        .padding(.top, 2)
                }
            }
            .padding(Spacing.md)
        }
        .background(colors.surface)
        .clipShape(.rect(cornerRadius: Radius.lg))
        .shadow(color: colors.shadow, radius: 10, y: 4)
    }

    @ViewBuilder
    private var priceLabel: some View {
        let colors = theme.colors
        if course.comingSoon {
            BadgeView(text: "Coming Soon", variant: .neutral)
        } else if course.enrolled {
            BadgeView(text: "Enrolled", variant: .success, symbol: "checkmark")
        } else if let days = course.freeTrialDays {
            BadgeView(text: "\(days) Days Free", variant: .success, symbol: "bolt.fill")
        } else if course.limitedTimeOffer {
            BadgeView(text: "Limited Offer", variant: .warning, symbol: "tag.fill")
        } else if course.isFree {
            BadgeView(text: "FREE", variant: .success)
        } else {
            VStack(alignment: .trailing, spacing: 0) {
                Text(Format.compactCurrency(course.price))
                    .font(.system(size: 17, weight: .heavy))
                    .foregroundStyle(colors.primary)
                if let fee = course.certificationFee {
                    Text("+\(Format.compactCurrency(fee)) cert")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(colors.textLight)
                }
            }
        }
    }

    private func metaItem(symbol: String, text: String) -> some View {
        HStack(spacing: 5) {
            Image(systemName: symbol)
                .font(.system(size: 11, weight: .semibold))
            Text(text)
                .font(.system(size: 12, weight: .medium))
        }
        .foregroundStyle(theme.colors.textLight)
    }
}
