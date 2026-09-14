//
//  ContentView.swift
//  WesternCreditInstitute
//

import SwiftUI

struct ContentView: View {
    @Environment(\.colorScheme) private var colorScheme

    @State private var theme = ThemeManager()
    @State private var auth = AuthStore()
    @State private var store = AppStore()
    @State private var gameStore = GameStore()

    var body: some View {
        Group {
            switch auth.phase {
            case .restoring:
                // Reading the Keychain is synchronous, so this is a single
                // frame at most — a blank brand field, never a spinner flash.
                theme.colors.background.ignoresSafeArea()
            case .signedOut:
                AuthView()
                    .transition(.opacity)
            case .signedIn:
                RootTabView()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: auth.phase)
        .environment(theme)
        .environment(auth)
        .environment(store)
        .environment(gameStore)
        .preferredColorScheme(theme.preferredColorScheme)
        .onAppear { theme.systemIsDark = colorScheme == .dark }
        .onChange(of: colorScheme) { _, newValue in
            theme.systemIsDark = newValue == .dark
        }
        // The signed-in account is the source of truth for every per-user
        // request, so the shared store follows it rather than holding a copy
        // that can drift.
        .onChange(of: auth.user) { _, newValue in
            store.applySignedInUser(newValue?.appUser)
        }
        .task(id: auth.user?.id) {
            store.applySignedInUser(auth.user?.appUser)
        }
        // A 401 from any request means the stored credential is no longer good.
        .task {
            let expirations = NotificationCenter.default.notifications(
                named: AuthSessionStore.sessionExpired
            )
            for await _ in expirations {
                auth.handleExpiredSession()
            }
        }
    }
}

#Preview {
    ContentView()
}
