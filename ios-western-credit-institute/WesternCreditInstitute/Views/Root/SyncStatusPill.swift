//
//  SyncStatusPill.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Small navigation-bar pill reporting whether local changes have reached the
/// server. Mirrors the Expo `SyncStatusIndicator` in states, colours and copy.
///
/// Tapping while Offline re-probes the server, which makes the state actionable
/// instead of leaving the user waiting on a background retry.
struct SyncStatusPill: View {
    @Environment(ThemeManager.self) private var theme

    private let sync = SyncStatusStore.shared

    @State private var isChecking: Bool = false
    @State private var isPulsing: Bool = false

    var body: some View {
        let colors = theme.colors
        let status = sync.status
        let foreground = foregroundColor(for: status, colors: colors)
        let background = backgroundColor(for: status, colors: colors)

        Button {
            guard status == .offline, !isChecking else { return }
            Haptics.light()
            recheckConnection()
        } label: {
            HStack(spacing: 6) {
                if isChecking {
                    ProgressView()
                        .controlSize(.mini)
                        .tint(foreground)
                } else {
                    Circle()
                        .fill(foreground)
                        .frame(width: 7, height: 7)
                        // Breathing dot only while syncing; every other state is
                        // completely static so an idle pill never animates.
                        .opacity(status == .syncing && isPulsing ? 0.35 : 1)
                        .animation(
                            status == .syncing
                                ? .easeInOut(duration: 0.62).repeatForever(autoreverses: true)
                                : .default,
                            value: isPulsing
                        )
                }

                Text(isChecking ? "Checking" : status.label)
                    .font(.system(size: 11, weight: .bold))
                    .kerning(0.2)
                    .foregroundStyle(foreground)
                    .lineLimit(1)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(background)
            .clipShape(.capsule)
            .overlay {
                Capsule().strokeBorder(foreground.opacity(0.6), lineWidth: 0.5)
            }
        }
        .buttonStyle(.plain)
        .disabled(status != .offline || isChecking)
        .accessibilityLabel("Sync status: \(status.label)")
        .accessibilityHint(accessibilityHint(for: status))
        .onAppear { isPulsing = true }
    }

    /// A successful probe flips the store back to online on its own, so there is
    /// no local state to reconcile here.
    private func recheckConnection() {
        isChecking = true
        Task {
            await TRPCClient.shared.checkReachable()
            isChecking = false
        }
    }

    private func accessibilityHint(for status: SyncStatus) -> String {
        switch status {
        case .offline:
            return "Your changes are saved on this device. Tap to check the connection again."
        case .syncing:
            return "Saving your latest changes to the server."
        case .synced:
            return "All changes are saved to the server."
        }
    }

    private func foregroundColor(for status: SyncStatus, colors: AppTheme) -> Color {
        switch status {
        case .synced: return colors.success
        case .syncing: return colors.warning
        case .offline: return colors.error
        }
    }

    private func backgroundColor(for status: SyncStatus, colors: AppTheme) -> Color {
        switch status {
        case .synced: return colors.successLight
        case .syncing: return colors.warningLight
        case .offline: return colors.errorLight
        }
    }
}
