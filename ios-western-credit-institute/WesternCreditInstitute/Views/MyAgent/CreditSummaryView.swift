//
//  CreditSummaryView.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Credit Summary — every bureau's findings combined into one picture: the
/// total negative items across the board, a tile per bureau, and a breakdown
/// of what kinds of items dominate the file.
///
/// Mirrors the Expo `CreditSummaryDashboard`. Detailed per-account work stays
/// in `CreditAnalysisView`; this screen answers "where do I stand overall".
struct CreditSummaryView: View {
    @Environment(ThemeManager.self) private var theme

    @State private var viewModel: CreditSummaryViewModel
    @State private var showEquifaxFetch = false

    /// Opens the detailed per-bureau breakdown. Supplied by the presenter so
    /// the two screens can swap without stacking sheets on top of each other.
    var onViewBreakdown: (() -> Void)?

    init(userId: String, onViewBreakdown: (() -> Void)? = nil) {
        _viewModel = State(initialValue: CreditSummaryViewModel(userId: userId))
        self.onViewBreakdown = onViewBreakdown
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                switch viewModel.phase {
                case .loading:
                    loadingView
                case .failed(let message):
                    failureView(message: message)
                case .empty:
                    emptyView
                case .ready:
                    readyContent
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.md)
        }
        .background(theme.colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Credit Summary")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await viewModel.refresh() }
        .task { await viewModel.load() }
        .sheet(isPresented: $showEquifaxFetch) {
            EquifaxFetchSheet(userId: viewModel.userId) {
                Task { await viewModel.refresh() }
            }
        }
    }

    // MARK: - Ready

    @ViewBuilder
    private var readyContent: some View {
        if let warning = viewModel.staleWarning {
            noticeBanner(warning)
        }

        heroCard

        sectionTitle("By Bureau")
        bureauTiles

        if let note = viewModel.missingBureauNote {
            missingBureauBanner(note)
        }

        if viewModel.typeBreakdown.isEmpty {
            allClearBox
        } else {
            sectionTitle("What You're Disputing")
            typeBreakdownCard
        }

        if onViewBreakdown != nil {
            breakdownButton
        }

        refreshReportButton
    }

    // MARK: - Hero

    /// The headline number: every negative item found across every bureau.
    private var heroCard: some View {
        let colors = theme.colors

        return VStack(spacing: Spacing.sm) {
            Text("NEGATIVE ITEMS — ALL BUREAUS")
                .font(.system(size: 10, weight: .heavy, design: .monospaced))
                .kerning(1.6)
                .foregroundStyle(.white.opacity(0.65))

            Text("\(viewModel.totalNegativeCount)")
                .font(.system(size: 64, weight: .heavy))
                .monospacedDigit()
                .contentTransition(.numericText())
                .foregroundStyle(.white)

            Text(viewModel.heroCaption)
                .font(.system(size: 12))
                .multilineTextAlignment(.center)
                .foregroundStyle(.white.opacity(0.75))
                .fixedSize(horizontal: false, vertical: true)

            Divider()
                .overlay(.white.opacity(0.18))
                .padding(.top, Spacing.sm + 2)

            HStack(alignment: .top, spacing: 0) {
                heroStat(
                    symbol: "creditcard.fill",
                    value: Format.currency(viewModel.totalNegativeBalance),
                    label: "Disputed balance"
                )
                heroDivider
                heroStat(
                    symbol: "doc.text.fill",
                    value: "\(viewModel.totalAccountsReviewed)",
                    label: "Accounts reviewed"
                )
                heroDivider
                heroStat(
                    symbol: "clock.fill",
                    value: viewModel.lastUpdatedText ?? "—",
                    label: "Last updated"
                )
            }
        }
        .frame(maxWidth: .infinity)
        .padding(Spacing.lg)
        .background(
            LinearGradient(
                colors: colors.gradientPrimary,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: .rect(cornerRadius: Radius.xl, style: .continuous)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(viewModel.totalNegativeCount) negative items across all bureaus")
    }

    private func heroStat(symbol: String, value: String, label: String) -> some View {
        VStack(spacing: 3) {
            Image(systemName: symbol)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.white)

            Text(value)
                .font(.system(size: 12, weight: .bold))
                .multilineTextAlignment(.center)
                .foregroundStyle(.white)
                .minimumScaleFactor(0.7)
                .lineLimit(2)

            Text(label)
                .font(.system(size: 10))
                .multilineTextAlignment(.center)
                .foregroundStyle(.white.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
    }

    private var heroDivider: some View {
        Rectangle()
            .fill(.white.opacity(0.18))
            .frame(width: 1)
            .frame(maxHeight: .infinity)
    }

    // MARK: - Bureau tiles

    private var bureauTiles: some View {
        HStack(alignment: .top, spacing: Spacing.sm + 2) {
            ForEach(viewModel.bureauTiles) { tile in
                bureauTile(tile)
            }
        }
    }

    private func bureauTile(_ tile: BureauTile) -> some View {
        let colors = theme.colors
        let tint: Color = {
            guard tile.hasReport else { return colors.textLight }
            return tile.negativeCount > 0 ? colors.warning : colors.success
        }()

        return VStack(spacing: 4) {
            HStack(spacing: 5) {
                Image(systemName: tile.hasReport ? "building.columns.fill" : "building.columns")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(tint)
                Text(tile.bureau)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(tile.hasReport ? colors.text : colors.textLight)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }

            if tile.hasReport {
                Text("\(tile.negativeCount)")
                    .font(.system(size: 26, weight: .heavy))
                    .monospacedDigit()
                    .foregroundStyle(tint)

                Text(tile.negativeCount == 0
                     ? "all clear"
                     : "negative item\(tile.negativeCount == 1 ? "" : "s")")
                    .font(.system(size: 10))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(colors.textSecondary)
            } else {
                Text("—")
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundStyle(colors.textLight)

                Text("not on file")
                    .font(.system(size: 10))
                    .foregroundStyle(colors.textSecondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.md - 4)
        .padding(.horizontal, Spacing.sm)
        .background(colors.surface, in: .rect(cornerRadius: Radius.lg, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
                .strokeBorder(colors.border, lineWidth: 1)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            tile.hasReport
            ? "\(tile.bureau): \(tile.negativeCount) negative items"
            : "\(tile.bureau): no report on file"
        )
    }

    private func missingBureauBanner(_ text: String) -> some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 13))
                .foregroundStyle(theme.colors.warning)
            Text(text)
                .font(.system(size: 12))
                .lineSpacing(2)
                .foregroundStyle(theme.colors.text)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Spacing.md - 4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            theme.colors.warningLight.opacity(0.3),
            in: .rect(cornerRadius: Radius.md, style: .continuous)
        )
    }

    // MARK: - Type breakdown

    /// Which kinds of negative items dominate, tallied across every bureau.
    private var typeBreakdownCard: some View {
        let colors = theme.colors
        let maxCount = max(1, viewModel.maxTypeCount)

        return VStack(spacing: 0) {
            ForEach(Array(viewModel.typeBreakdown.enumerated()), id: \.element.id) { index, entry in
                if index > 0 {
                    Divider().overlay(colors.borderLight)
                }

                HStack(spacing: Spacing.sm + 2) {
                    Text(entry.type)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(colors.text)
                        .frame(width: 110, alignment: .leading)
                        .fixedSize(horizontal: false, vertical: true)

                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(colors.surfaceAlt)
                            Capsule()
                                .fill(colors.warning)
                                .frame(
                                    width: max(
                                        geo.size.width * 0.08,
                                        geo.size.width * (Double(entry.count) / Double(maxCount))
                                    )
                                )
                        }
                    }
                    .frame(height: 7)

                    Text("\(entry.count)")
                        .font(.system(size: 13, weight: .heavy))
                        .monospacedDigit()
                        .foregroundStyle(colors.text)
                        .frame(width: 24, alignment: .trailing)
                }
                .padding(.vertical, Spacing.md - 4)
                .accessibilityElement(children: .combine)
                .accessibilityLabel("\(entry.type): \(entry.count)")
            }
        }
        .padding(.horizontal, Spacing.md - 2)
        .background(colors.surface, in: .rect(cornerRadius: Radius.lg, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
                .strokeBorder(colors.border, lineWidth: 1)
        }
    }

    private var allClearBox: some View {
        HStack(alignment: .center, spacing: Spacing.sm + 2) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 18))
                .foregroundStyle(theme.colors.success)
            Text("Every account on file came back clean. Focus on keeping utilization low and payments on time.")
                .font(.system(size: 13))
                .lineSpacing(2)
                .foregroundStyle(theme.colors.text)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            theme.colors.successLight.opacity(0.35),
            in: .rect(cornerRadius: Radius.md, style: .continuous)
        )
    }

    // MARK: - Actions

    private var breakdownButton: some View {
        let colors = theme.colors

        return Button {
            Haptics.light()
            onViewBreakdown?()
        } label: {
            HStack(spacing: Spacing.sm + 2) {
                Image(systemName: "doc.text.magnifyingglass")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(colors.primary)

                Text("View Every Negative Account")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(colors.primary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(colors.textLight)
            }
            .padding(Spacing.md - 1)
            .background(colors.surface, in: .rect(cornerRadius: Radius.lg, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
                    .strokeBorder(colors.border, lineWidth: 1)
            }
            .contentShape(.rect)
        }
        .buttonStyle(PressableButtonStyle())
        .accessibilityLabel("View every negative account by bureau")
    }

    private var refreshReportButton: some View {
        let colors = theme.colors

        return Button {
            Haptics.light()
            showEquifaxFetch = true
        } label: {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 14, weight: .semibold))
                Text("Pull A Fresh Report")
                    .font(.system(size: 14, weight: .bold))
            }
            .foregroundStyle(colors.primary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md - 2)
            .background(colors.primary.opacity(0.08), in: .rect(cornerRadius: Radius.md, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: Radius.md, style: .continuous)
                    .strokeBorder(colors.primary.opacity(0.25), lineWidth: 1)
            }
        }
        .buttonStyle(PressableButtonStyle())
    }

    // MARK: - States

    private func sectionTitle(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.system(size: 12, weight: .heavy))
            .kerning(0.6)
            .foregroundStyle(theme.colors.textSecondary)
            .padding(.top, Spacing.sm)
    }

    private var loadingView: some View {
        VStack(spacing: Spacing.md) {
            ProgressView()
                .controlSize(.large)
                .tint(theme.colors.primary)
            Text("Tallying your reports…")
                .font(.system(size: 15))
                .foregroundStyle(theme.colors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xxl)
    }

    private var emptyView: some View {
        VStack(spacing: Spacing.md) {
            EmptyStateView(
                symbol: "chart.bar.doc.horizontal",
                title: "Nothing to summarize yet",
                message: "Once you pull a report from Experian, Equifax, or TransUnion, this view combines all three into one overall picture of your negative items."
            )

            pullReportButton
        }
    }

    private var pullReportButton: some View {
        let colors = theme.colors

        return Button {
            Haptics.medium()
            showEquifaxFetch = true
        } label: {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "arrow.down.doc.fill")
                    .font(.system(size: 15, weight: .semibold))
                Text("Pull My Credit Report")
                    .font(.system(size: 16, weight: .bold))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(
                LinearGradient(colors: colors.gradientSecondary, startPoint: .leading, endPoint: .trailing),
                in: .rect(cornerRadius: Radius.md, style: .continuous)
            )
        }
        .buttonStyle(PressableButtonStyle())
    }

    private func failureView(message: String) -> some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 34, weight: .semibold))
                .foregroundStyle(theme.colors.warning)
                .frame(width: 78, height: 78)
                .background(theme.colors.warningLight.opacity(0.3), in: .circle)

            Text("Couldn't load your summary")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(theme.colors.text)

            Text(message)
                .font(.system(size: 14))
                .lineSpacing(3)
                .multilineTextAlignment(.center)
                .foregroundStyle(theme.colors.textSecondary)

            Button {
                Haptics.light()
                Task { await viewModel.load() }
            } label: {
                Text("Try Again")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, Spacing.md - 2)
                    .background(theme.colors.primary, in: .rect(cornerRadius: Radius.md, style: .continuous))
            }
            .buttonStyle(PressableButtonStyle())
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xl)
    }

    private func noticeBanner(_ text: String) -> some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 14))
                .foregroundStyle(theme.colors.warning)
            Text(text)
                .font(.system(size: 12))
                .lineSpacing(2)
                .foregroundStyle(theme.colors.text)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            theme.colors.warningLight.opacity(0.3),
            in: .rect(cornerRadius: Radius.md, style: .continuous)
        )
    }
}
