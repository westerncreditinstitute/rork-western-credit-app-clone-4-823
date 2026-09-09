//
//  SueForView.swift
//  WesternCreditInstitute
//
//  "What Can You Sue For" — Consumer Protection Violations & Damages Guide.
//  Mirrors the Expo screen 1:1: intro card, search, FDCPA/FCRA tabs,
//  violation rows with damages and the important-notes footer.
//

import SwiftUI

struct SueForView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss

    @State private var selectedLawID: String = SueForData.laws[0].id
    @State private var query: String = ""
    @State private var appeared = false

    private var selectedLaw: SueLaw {
        SueForData.laws.first { $0.id == selectedLawID } ?? SueForData.laws[0]
    }

    private var results: [SueViolation] {
        SueForData.search(selectedLaw.violations, query: query)
    }

    var body: some View {
        let colors = theme.colors

        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.sm) {
                    introCard
                    searchField
                    lawTabs
                    resultCount
                    if results.isEmpty {
                        emptyState
                    } else {
                        ForEach(results) { violation in
                            ViolationRow(
                                violation: violation,
                                accent: Color(hex: selectedLaw.accentHex),
                                theme: colors
                            )
                        }
                    }
                    notesCard
                }
                .padding(.horizontal, Spacing.md)
                .padding(.top, Spacing.sm)
                .padding(.bottom, Spacing.xl)
            }
            .background(colors.background)
            .scrollIndicators(.hidden)
            .navigationTitle("What Can You Sue For")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(colors.surface, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(theme.isDark ? .dark : .light, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        Haptics.light()
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(colors.textSecondary)
                            .frame(width: 30, height: 30)
                            .background(colors.surfaceAlt)
                            .clipShape(.circle)
                    }
                    .accessibilityLabel("Close")
                }
            }
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 18)
        .task {
            guard !appeared else { return }
            withAnimation(.spring(response: 0.6, dampingFraction: 0.85)) { appeared = true }
        }
    }

    // MARK: - Intro

    private var introCard: some View {
        let colors = theme.colors
        let accent = Color(hex: "#3B82F6")

        return VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "scalemass.fill")
                    .font(.system(size: 19, weight: .semibold))
                    .foregroundStyle(accent)
                    .frame(width: 44, height: 44)
                    .background(accent.opacity(0.13))
                    .clipShape(.rect(cornerRadius: Radius.md))

                VStack(alignment: .leading, spacing: 2) {
                    Text("Consumer Protection Violations & Damages Guide")
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundStyle(colors.text)
                        .lineLimit(2)
                        .minimumScaleFactor(0.85)
                    Text("FDCPA + FCRA • \(SueForData.laws[0].violations.count + SueForData.laws[1].violations.count) violations")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(colors.textSecondary)
                }

                Spacer(minLength: 0)
            }

            Text("This interactive guide covers potential violations under the Fair Debt Collection Practices Act (FDCPA) and the Fair Credit Reporting Act (FCRA), along with the damages you may be entitled to. Switch between the laws below and search to find specific violations.")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(colors.textSecondary)
                .lineSpacing(3)

            HStack(alignment: .top, spacing: Spacing.sm) {
                Image(systemName: "info.circle.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(colors.warning)
                Text("For education only — not legal advice. Consult a consumer rights attorney for your specific situation.")
                    .font(.system(size: 11.5, weight: .medium))
                    .foregroundStyle(colors.textSecondary)
                    .lineSpacing(2)
            }
            .padding(Spacing.sm + 2)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(colors.warningLight)
            .clipShape(.rect(cornerRadius: Radius.md))
        }
        .padding(Spacing.md)
        .background(colors.surface)
        .clipShape(.rect(cornerRadius: Radius.lg))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.lg)
                .stroke(colors.border, lineWidth: 1)
        }
        .shadow(color: colors.shadow, radius: 8, y: 3)
    }

    // MARK: - Search

    private var searchField: some View {
        let colors = theme.colors

        return HStack(spacing: Spacing.sm) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(colors.textLight)

            TextField("Search violations or keywords…", text: $query)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(colors.text)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)

            if !query.isEmpty {
                Button {
                    Haptics.light()
                    query = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(colors.textLight)
                }
                .accessibilityLabel("Clear search")
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, 12)
        .background(colors.surface)
        .clipShape(.rect(cornerRadius: Radius.md))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.md)
                .stroke(colors.border, lineWidth: 1)
        }
    }

    // MARK: - Law tabs

    private var lawTabs: some View {
        HStack(spacing: Spacing.sm) {
            ForEach(SueForData.laws) { law in
                let isActive = law.id == selectedLawID
                let accent = Color(hex: law.accentHex)

                Button {
                    Haptics.light()
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                        selectedLawID = law.id
                    }
                } label: {
                    HStack(spacing: 6) {
                        Text(law.shortLabel)
                            .font(.system(size: 13, weight: .heavy))
                            .foregroundStyle(isActive ? .white : theme.colors.textSecondary)
                        Text("\(law.violations.count)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(isActive ? .white.opacity(0.85) : theme.colors.textLight)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 1)
                            .background(.white.opacity(isActive ? 0.18 : 0.0))
                            .clipShape(.capsule)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(isActive ? accent : theme.colors.surface)
                    .clipShape(.rect(cornerRadius: Radius.md))
                    .overlay {
                        RoundedRectangle(cornerRadius: Radius.md)
                            .stroke(isActive ? accent : theme.colors.border, lineWidth: 1)
                    }
                }
                .buttonStyle(PressableButtonStyle())
            }
        }
    }

    private var resultCount: some View {
        Text("\(results.count) of \(selectedLaw.violations.count) \(selectedLaw.shortLabel)")
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(theme.colors.textSecondary)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Empty state

    private var emptyState: some View {
        let colors = theme.colors

        return VStack(spacing: Spacing.sm) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 26, weight: .semibold))
                .foregroundStyle(colors.textLight)
            Text("No violations found")
                .font(.system(size: 15, weight: .heavy))
                .foregroundStyle(colors.text)
            Text("Try a different keyword, statute section or damage type.")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(colors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xl)
        .background(colors.surface)
        .clipShape(.rect(cornerRadius: Radius.lg))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.lg)
                .stroke(colors.border, lineWidth: 1)
        }
        .padding(.vertical, Spacing.xs)
    }

    // MARK: - Footer notes

    private var notesCard: some View {
        let colors = theme.colors

        return VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: 6) {
                Image(systemName: "book.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(colors.warning)
                Text("Important Notes")
                    .font(.system(size: 15, weight: .heavy))
                    .foregroundStyle(colors.text)
            }

            ForEach(Array(SueForData.notes.enumerated()), id: \.offset) { _, note in
                HStack(alignment: .top, spacing: 10) {
                    Circle()
                        .fill(colors.warning)
                        .frame(width: 6, height: 6)
                        .padding(.top, 6)
                    Text(note)
                        .font(.system(size: 12.5, weight: .medium))
                        .foregroundStyle(colors.textSecondary)
                        .lineSpacing(3)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }

            Rectangle()
                .fill(colors.borderLight)
                .frame(height: 1)
                .padding(.vertical, 2)

            Text(SueForData.disclaimer)
                .font(.system(size: 11.5, weight: .medium))
                .foregroundStyle(colors.textLight)
                .lineSpacing(2)

            Text("Last updated: \(SueForData.lastUpdated)")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(colors.textLight)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(colors.surface)
        .clipShape(.rect(cornerRadius: Radius.lg))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.lg)
                .stroke(colors.border, lineWidth: 1)
        }
        .shadow(color: colors.shadow, radius: 8, y: 3)
        .padding(.top, Spacing.xs)
    }
}

// MARK: - Violation row

private struct ViolationRow: View {
    let violation: SueViolation
    let accent: Color
    let theme: AppTheme

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                Text(violation.section)
                    .font(.system(size: 11.5, weight: .heavy, design: .monospaced))
                    .foregroundStyle(accent)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 4)
                    .background(accent.opacity(0.1))
                    .clipShape(.rect(cornerRadius: 7))
                Spacer(minLength: 0)
            }

            Text(violation.description)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(theme.text)
                .lineSpacing(2)
                .frame(maxWidth: .infinity, alignment: .leading)

            HStack(alignment: .top, spacing: Spacing.sm) {
                Image(systemName: "banknote")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(accent)
                    .padding(.top, 2)
                Text(violation.damages)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(theme.textSecondary)
                    .lineSpacing(2)
            }
            .padding(Spacing.sm + 2)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(theme.background)
            .clipShape(.rect(cornerRadius: Radius.sm + 2))
            .overlay {
                RoundedRectangle(cornerRadius: Radius.sm + 2)
                    .stroke(theme.borderLight, lineWidth: 1)
            }
        }
        .padding(Spacing.md)
        .background(theme.surface)
        .clipShape(.rect(cornerRadius: Radius.lg))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.lg)
                .stroke(theme.border, lineWidth: 1)
        }
        .shadow(color: theme.shadow, radius: 6, y: 2)
    }
}
