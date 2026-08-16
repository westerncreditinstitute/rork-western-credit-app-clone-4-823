//
//  NotificationsView.swift
//  WesternCreditInstitute
//

import SwiftUI

struct NotificationsView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                if store.notifications.isEmpty {
                    EmptyStateView(
                        symbol: "bell.slash",
                        title: "No notifications",
                        message: "Course unlocks and commission alerts will appear here."
                    )
                } else {
                    VStack(spacing: Spacing.sm) {
                        ForEach(store.notifications) { item in
                            Button {
                                Haptics.light()
                                store.markNotificationRead(item.id)
                            } label: {
                                CardView(padding: Spacing.md) {
                                    HStack(alignment: .top, spacing: Spacing.md) {
                                        Image(systemName: item.type.symbol)
                                            .font(.system(size: 16, weight: .semibold))
                                            .foregroundStyle(tint(for: item.type))
                                            .frame(width: 44, height: 44)
                                            .background(tint(for: item.type).opacity(0.13))
                                            .clipShape(.circle)

                                        VStack(alignment: .leading, spacing: 4) {
                                            HStack(spacing: Spacing.sm) {
                                                Text(item.title)
                                                    .font(.system(size: 15, weight: .bold))
                                                    .foregroundStyle(theme.colors.text)
                                                    .multilineTextAlignment(.leading)
                                                if !item.read {
                                                    Circle()
                                                        .fill(theme.colors.error)
                                                        .frame(width: 7, height: 7)
                                                }
                                            }
                                            Text(item.message)
                                                .font(.system(size: 13))
                                                .foregroundStyle(theme.colors.textSecondary)
                                                .multilineTextAlignment(.leading)
                                            Text(Format.mediumDate(item.date))
                                                .font(.system(size: 11, weight: .medium))
                                                .foregroundStyle(theme.colors.textLight)
                                        }

                                        Spacer(minLength: 0)
                                    }
                                }
                            }
                            .buttonStyle(PressableButtonStyle())
                        }
                    }
                    .padding(Spacing.md)
                }
            }
            .background(theme.colors.background)
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Mark all read") {
                        Haptics.success()
                        store.markAllNotificationsRead()
                    }
                    .font(.system(size: 14, weight: .semibold))
                    .disabled(store.unreadNotificationCount == 0)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .fontWeight(.semibold)
                }
            }
        }
    }

    private func tint(for type: NotificationType) -> Color {
        switch type {
        case .course: return theme.colors.primary
        case .earning: return theme.colors.secondary
        case .system: return theme.colors.info
        }
    }
}
