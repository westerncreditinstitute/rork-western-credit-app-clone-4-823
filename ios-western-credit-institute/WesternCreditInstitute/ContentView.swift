//
//  ContentView.swift
//  WesternCreditInstitute
//

import SwiftUI

struct ContentView: View {
    @Environment(\.colorScheme) private var colorScheme

    @State private var theme = ThemeManager()
    @State private var store = AppStore()

    var body: some View {
        RootTabView()
            .environment(theme)
            .environment(store)
            .preferredColorScheme(theme.preferredColorScheme)
            .onAppear { theme.systemIsDark = colorScheme == .dark }
            .onChange(of: colorScheme) { _, newValue in
                theme.systemIsDark = newValue == .dark
            }
    }
}

#Preview {
    ContentView()
}
