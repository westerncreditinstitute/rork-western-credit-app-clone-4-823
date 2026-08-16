//
//  YouTubeSheet.swift
//  WesternCreditInstitute
//

import SwiftUI
import WebKit

/// Embeds a YouTube player so lectures play without leaving the app.
struct YouTubePlayerView: UIViewRepresentable {
    let youtubeId: String

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = false
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard let url = URL(string: "https://www.youtube.com/embed/\(youtubeId)?playsinline=1&rel=0&modestbranding=1") else {
            return
        }
        if webView.url != url {
            webView.load(URLRequest(url: url))
        }
    }
}

struct YouTubeSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss

    let video: FeaturedVideo

    var body: some View {
        NavigationStack {
            VStack(spacing: Spacing.md) {
                YouTubePlayerView(youtubeId: video.youtubeId)
                    .aspectRatio(16.0 / 9.0, contentMode: .fit)
                    .clipShape(.rect(cornerRadius: Radius.md))
                    .padding(.horizontal, Spacing.md)

                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text(video.title)
                        .font(.system(size: 20, weight: .heavy))
                        .foregroundStyle(theme.colors.text)

                    HStack(spacing: Spacing.sm) {
                        BadgeView(text: video.duration, variant: .primary, symbol: "clock.fill")
                        BadgeView(text: "Featured", variant: .success, symbol: "sparkles")
                    }

                    Text("Watch this lecture to get the fundamentals before you start disputing items on your report.")
                        .font(.system(size: 14))
                        .foregroundStyle(theme.colors.textSecondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, Spacing.md)

                Spacer()
            }
            .padding(.top, Spacing.md)
            .background(theme.colors.background)
            .navigationTitle("Now Playing")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .fontWeight(.semibold)
                }
            }
        }
    }
}
