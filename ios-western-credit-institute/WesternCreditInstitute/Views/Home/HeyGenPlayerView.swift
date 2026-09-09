//
//  HeyGenPlayerView.swift
//  WesternCreditInstitute
//

import SwiftUI
import WebKit

/// Hosts a HeyGen AI-avatar embed in a `WKWebView`.
///
/// The embed is loaded once in `makeUIView` and only reloaded when the id
/// actually changes, so scrolling the home feed never restarts playback.
struct HeyGenEmbedView: UIViewRepresentable {
    let embedId: String

    private var embedURL: URL? {
        URL(string: "https://app.heygen.com/embeds/\(embedId)")
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false

        if let url = embedURL {
            webView.load(URLRequest(url: url))
        }
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard let url = embedURL, webView.url != url else { return }
        webView.load(URLRequest(url: url))
    }
}

/// Featured AI video card: shows a branded poster and swaps in the live HeyGen
/// embed once tapped, so the home screen doesn't mount a web view on launch.
struct HeyGenPlayerView: View {
    @Environment(ThemeManager.self) private var theme

    let embedId: String

    @State private var isPlaying = false

    var body: some View {
        Group {
            if isPlaying {
                HeyGenEmbedView(embedId: embedId)
                    .frame(height: 200)
                    .clipShape(.rect(cornerRadius: Radius.lg))
            } else {
                Button {
                    Haptics.medium()
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                        isPlaying = true
                    }
                } label: {
                    poster
                }
                .buttonStyle(PressableButtonStyle())
            }
        }
        .padding(.horizontal, Spacing.md)
    }

    private var poster: some View {
        LinearGradient(
            colors: [Color(hex: "#0F2027"), Color(hex: "#16324A"), Color(hex: "#0B1F2E")],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .frame(height: 200)
        .overlay {
            Image(systemName: "play.fill")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(Color(hex: "#0B1F2E"))
                .frame(width: 66, height: 66)
                .background(Color(hex: "#2DD4BF"))
                .clipShape(.circle)
                .shadow(color: Color(hex: "#2DD4BF").opacity(0.45), radius: 14, y: 6)
                .allowsHitTesting(false)
        }
        .clipShape(.rect(cornerRadius: Radius.lg))
        .overlay(alignment: .bottomLeading) {
            HStack(spacing: 6) {
                Image(systemName: "sparkles")
                    .font(.system(size: 11, weight: .bold))
                Text("AI VIDEO")
                    .font(.system(size: 11, weight: .heavy))
                    .kerning(0.6)
            }
            .foregroundStyle(Color(hex: "#2DD4BF"))
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(Color(hex: "#2DD4BF").opacity(0.14), in: .capsule)
            .overlay(
                Capsule().stroke(Color(hex: "#2DD4BF").opacity(0.35), lineWidth: 1)
            )
            .padding(Spacing.md)
            .allowsHitTesting(false)
        }
        .accessibilityLabel("Play featured AI video")
    }
}
