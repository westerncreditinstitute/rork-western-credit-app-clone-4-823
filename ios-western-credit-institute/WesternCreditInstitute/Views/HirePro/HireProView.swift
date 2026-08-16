//
//  HireProView.swift
//  WesternCreditInstitute
//

import SwiftUI

struct HireProView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store

    @State private var searchText = ""
    @State private var selectedSpecialty: String?

    private var filteredProviders: [CSOProvider] {
        MockData.providers.filter { provider in
            let matchesSearch = searchText.isEmpty
                || provider.name.localizedStandardContains(searchText)
                || provider.location.localizedStandardContains(searchText)
            let matchesSpecialty = selectedSpecialty == nil
                || provider.specialties.contains(selectedSpecialty ?? "")
            return matchesSearch && matchesSpecialty
        }
    }

    var body: some View {
        let colors = theme.colors

        VStack(spacing: 0) {
            ScreenHeader(title: "Hire a Pro", subtitle: "Certified CSO professionals")

            VStack(spacing: Spacing.md) {
                searchField
                specialtyChips
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, Spacing.md)
            .background(colors.surface)

            ScrollView {
                if filteredProviders.isEmpty {
                    EmptyStateView(
                        symbol: "person.crop.circle.badge.questionmark",
                        title: "No professionals found",
                        message: "Try a different search term or specialty filter."
                    )
                    .padding(.horizontal, Spacing.md)
                } else {
                    LazyVStack(spacing: Spacing.md) {
                        ForEach(filteredProviders) { provider in
                            NavigationLink(value: provider) {
                                ProviderCard(provider: provider, hasAccess: store.hasAccess(to: provider.id))
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
            .refreshable { try? await Task.sleep(for: .milliseconds(700)) }
            .background(colors.background)
        }
        .background(colors.background)
    }

    private var searchField: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(theme.colors.textLight)

            TextField("Search by name or location", text: $searchText)
                .font(.system(size: 15))
                .foregroundStyle(theme.colors.text)
                .autocorrectionDisabled()

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

    private var specialtyChips: some View {
        ScrollView(.horizontal) {
            HStack(spacing: Spacing.sm) {
                chip(title: "All", isActive: selectedSpecialty == nil) { selectedSpecialty = nil }
                ForEach(MockData.specialties, id: \.self) { specialty in
                    chip(title: specialty, isActive: selectedSpecialty == specialty) {
                        selectedSpecialty = selectedSpecialty == specialty ? nil : specialty
                    }
                }
            }
        }
        .scrollIndicators(.hidden)
        .scrollClipDisabled()
    }

    private func chip(title: String, isActive: Bool, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.selection()
            withAnimation(.spring(response: 0.3, dampingFraction: 0.82)) { action() }
        } label: {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(isActive ? theme.colors.textInverse : theme.colors.textSecondary)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(isActive ? Color(hex: "#DDA0DD") : theme.colors.surfaceAlt)
                .clipShape(.capsule)
        }
        .buttonStyle(PressableButtonStyle())
    }
}

// MARK: - Provider card

struct ProviderCard: View {
    @Environment(ThemeManager.self) private var theme

    let provider: CSOProvider
    let hasAccess: Bool

    var body: some View {
        let colors = theme.colors

        CardView(padding: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack(alignment: .top, spacing: Spacing.md) {
                    AvatarView(urlString: provider.avatarURL, initials: provider.initials, size: 62)

                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 5) {
                            Text(provider.name)
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(colors.text)
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 12))
                                .foregroundStyle(colors.info)
                        }

                        HStack(spacing: 4) {
                            Image(systemName: "mappin.and.ellipse")
                                .font(.system(size: 10))
                            Text(provider.location)
                                .font(.system(size: 12, weight: .medium))
                        }
                        .foregroundStyle(colors.textSecondary)

                        HStack(spacing: Spacing.sm) {
                            HStack(spacing: 3) {
                                Image(systemName: "star.fill")
                                    .font(.system(size: 11))
                                    .foregroundStyle(Color(hex: "#F59E0B"))
                                Text(Format.decimal(provider.rating))
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundStyle(colors.text)
                                Text("(\(provider.reviewCount))")
                                    .font(.system(size: 11))
                                    .foregroundStyle(colors.textLight)
                            }

                            HStack(spacing: 3) {
                                Image(systemName: "clock.fill")
                                    .font(.system(size: 10))
                                Text("\(provider.yearsExperience) yrs")
                                    .font(.system(size: 11, weight: .medium))
                            }
                            .foregroundStyle(colors.textLight)
                        }
                    }

                    Spacer(minLength: 0)

                    VStack(alignment: .trailing, spacing: 3) {
                        Text(Format.compactCurrency(provider.consultationFee))
                            .font(.system(size: 16, weight: .heavy))
                            .foregroundStyle(colors.primary)
                        Text("consult")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(colors.textLight)
                    }
                }

                Text(provider.bio)
                    .font(.system(size: 13))
                    .foregroundStyle(colors.textSecondary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                HStack(spacing: Spacing.sm) {
                    ForEach(provider.specialties.prefix(2), id: \.self) { specialty in
                        BadgeView(text: specialty, variant: .info)
                    }
                    if provider.specialties.count > 2 {
                        BadgeView(text: "+\(provider.specialties.count - 2)", variant: .neutral)
                    }

                    Spacer(minLength: 0)

                    if hasAccess {
                        BadgeView(text: "Unlocked", variant: .success, symbol: "lock.open.fill")
                    } else if provider.isAvailable {
                        BadgeView(text: "Available", variant: .success, symbol: "circle.fill")
                    }
                }
            }
        }
    }
}
