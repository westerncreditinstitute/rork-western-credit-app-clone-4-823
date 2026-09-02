//
//  BunnyVideoPlayerView.swift
//  WesternCreditInstitute
//

import SwiftUI
import WebKit

/// Playback events forwarded from the Bunny player.js bridge inside the WebView.
nonisolated struct BunnyPlayerEvent: Sendable {
    let event: String
    let currentTime: Double?
}

/// Builds the wrapper page around the Bunny iframe. The page loads Bunny's
/// player.js bridge so playback can be started instantly from the app via the
/// message handler instead of reloading the iframe, and forwards real playback
/// events (play / timeupdate) back for accurate progress tracking.
nonisolated enum BunnyPlayerHTML {
    static func page(for src: String) -> String {
        """
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
              iframe { width: 100%; height: 100%; border: none; }
            </style>
            <script type="text/javascript" src="//assets.mediadelivery.net/playerjs/playerjs-latest.min.js"></script>
          </head>
          <body>
            <iframe
              id="wciFrame"
              src="\(src)"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowfullscreen
            ></iframe>
            <script>
              (function () {
                function post(obj) {
                  try {
                    window.webkit.messageHandlers.wciPlayer.postMessage(
                      JSON.stringify(Object.assign({ source: "wci-player" }, obj))
                    );
                  } catch (e) {}
                }
                var player = null;
                function init() {
                  if (typeof playerjs === "undefined") { post({ event: "nolibrary" }); return; }
                  try {
                    player = new playerjs.Player(document.getElementById("wciFrame"));
                    player.on("ready", function () { window.wciPlayerReady = true; });
                    player.on("play", function () { post({ event: "play" }); });
                    player.on("pause", function () { post({ event: "pause" }); });
                    player.on("ended", function () { post({ event: "ended" }); });
                    player.on("timeupdate", function (data) {
                      post({ event: "timeupdate", currentTime: data && data.seconds });
                    });
                    window.wciPlay = function () {
                      try { player.play(); } catch (e) { post({ event: "playerror" }); }
                    };
                  } catch (e) {
                    post({ event: "initerror" });
                  }
                }
                if (document.readyState === "complete" || document.readyState === "interactive") {
                  init();
                } else {
                  document.addEventListener("DOMContentLoaded", init);
                }
              })();
            </script>
          </body>
        </html>
        """
    }

    /// Adds Bunny embed params: always preload, autoplay only when requested.
    static func playerSource(for url: String, withAutoplay: Bool) -> String {
        let joiner = url.contains("?") ? "&" : "?"
        return "\(url)\(joiner)preload=true\(withAutoplay ? "&autoplay=true" : "")"
    }
}

/// The pre-mounted WKWebView hosting the Bunny player. Mounts once per source
/// and stays mounted; play is started through the player.js bridge without a
/// reload, and events come back through the wciPlayer message handler.
private struct BunnyWebView: UIViewRepresentable {
    let source: String
    /// Increment to start playback through the bridge (no reload).
    let playRequestID: Int
    var onEvent: @MainActor @Sendable (BunnyPlayerEvent) -> Void

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.allowsPictureInPictureMediaPlayback = true
        configuration.userContentController.add(context.coordinator, name: "wciPlayer")

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.backgroundColor = .black
        webView.isOpaque = false
        webView.scrollView.isScrollEnabled = false
        webView.navigationDelegate = context.coordinator
        context.coordinator.attach(webView: webView)
        context.coordinator.load(source: source)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.onEvent = onEvent

        // A changed source reloads the page (autoplay fallback / new video).
        if source != context.coordinator.loadedSource {
            context.coordinator.load(source: source)
            return
        }

        // Bridge play: start the already-preloaded player without reloading.
        if playRequestID > 0 && playRequestID != context.coordinator.lastPlayRequestID {
            context.coordinator.lastPlayRequestID = playRequestID
            webView.evaluateJavaScript("if (window.wciPlay) { window.wciPlay(); } true;", completionHandler: nil)
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(onEvent: onEvent)
    }

    @MainActor
    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        var onEvent: @MainActor @Sendable (BunnyPlayerEvent) -> Void
        fileprivate(set) var loadedSource: String?
        fileprivate var lastPlayRequestID = 0
        private weak var webView: WKWebView?

        init(onEvent: @escaping @MainActor @Sendable (BunnyPlayerEvent) -> Void) {
            self.onEvent = onEvent
        }

        func attach(webView: WKWebView) {
            self.webView = webView
        }

        func load(source: String) {
            loadedSource = source
            webView?.loadHTMLString(BunnyPlayerHTML.page(for: source), baseURL: nil)
        }

        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard message.name == "wciPlayer",
                  let body = message.body as? String,
                  let data = body.data(using: .utf8),
                  let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  payload["source"] as? String == "wci-player" else {
                return
            }

            let event = payload["event"] as? String ?? ""
            let currentTime = payload["currentTime"] as? Double
            let playerEvent = BunnyPlayerEvent(event: event, currentTime: currentTime)
            Task { @MainActor in
                self.onEvent(playerEvent)
            }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            Task { @MainActor in
                self.onEvent(BunnyPlayerEvent(event: "loaderror", currentTime: nil))
            }
        }
    }
}

/// SwiftUI player for Bunny Stream videos, mirroring the optimized Expo
/// `BunnyVideoPlayer`: the player shell mounts once and stays mounted, play
/// starts through the player.js bridge with no reload, a 1.8s fallback timer
/// switches to a reload with autoplay if the bridge never confirms, and real
/// `timeupdate` seconds feed the certification progress tracking.
struct BunnyVideoPlayerView: View {
    let video: CourseVideo
    let isLocked: Bool
    let onUnlockPress: (() -> Void)?
    let userId: String
    let courseId: String
    let sectionId: String
    /// Starts playback as soon as the player mounts (lesson was tapped).
    var autoPlay: Bool = true
    var onProgressUpdate: (() -> Void)?

    @Environment(ThemeManager.self) private var theme
    @State private var isPlaying = false
    @State private var hasRequestedPlay = false
    @State private var playRequestID = 0
    @State private var reloadWithAutoplay = false
    @State private var playbackConfirmed = false
    @State private var latestTime: Double = 0
    @State private var estimate: Double = 0
    @State private var fallbackTask: Task<Void, Never>?
    @State private var progressRecord: VideoProgressRecord?
    @State private var isMarkingComplete = false
    @State private var showScreenshotAlert = false

    private var playerHeight: CGFloat {
        (UIScreen.main.bounds.width - Spacing.md * 2) * 9 / 16
    }

    /// A pre-signed URL is only used while its signature is comfortably
    /// unexpired; otherwise the plain embed URL is used (token auth is off
    /// when the server has no Bunny API key, so the plain URL still plays).
    private var resolvedEmbedUrl: String? {
        if !video.bunnyEmbedUrl.isEmpty {
            let margin: Double = 60
            let isFresh = video.bunnyEmbedExpiresAt.map { $0 > Date().timeIntervalSince1970 + margin } ?? true
            if isFresh {
                return video.bunnyEmbedUrl
            }
        }
        guard video.hasBunnyVideo else { return nil }
        return "https://iframe.mediadelivery.net/embed/\(video.bunnyLibraryId)/\(video.bunnyVideoId)"
    }

    private var wantsAutoplay: Bool { autoPlay || reloadWithAutoplay }

    private var playerSource: String? {
        guard let url = resolvedEmbedUrl else { return nil }
        return BunnyPlayerHTML.playerSource(for: url, withAutoplay: isPlaying && wantsAutoplay)
    }

    var body: some View {
        VStack(spacing: Spacing.sm) {
            playerCard
            protectionNotice
            if !progressRecord.isNilCompleted, let record = progressRecord, !record.isCompleted {
                markCompleteButton
            }
        }
        .onAppear {
            progressRecord = nil
        }
        .task {
            await loadInitialProgress()
            if autoPlay && !isLocked && !hasRequestedPlay {
                hasRequestedPlay = true
                isPlaying = true
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.userDidTakeScreenshotNotification)) { _ in
            if !isLocked {
                showScreenshotAlert = true
            }
        }
        .alert("Screenshot Blocked", isPresented: $showScreenshotAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("This content is protected. Screenshots and screen recordings are not allowed.")
        }
        .onDisappear {
            fallbackTask?.cancel()
        }
    }

    // MARK: - Player card

    @ViewBuilder
    private var playerCard: some View {
        Group {
            if isLocked {
                lockedOverlay
            } else if let source = playerSource {
                mountedPlayer(source: source)
            } else if hasRequestedPlay && isPlaying {
                unavailableState
            } else {
                posterShell
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: playerHeight)
        .clipShape(.rect(cornerRadius: Radius.md))
    }

    /// The WebView mounts once and stays mounted. While paused, the Bunny
    /// poster shows behind the touch-catcher overlay, so pressing play starts
    /// playback through the bridge with no reload and no network wait.
    private func mountedPlayer(source: String) -> some View {
        ZStack {
            BunnyWebView(
                source: source,
                playRequestID: playRequestID,
                onEvent: { event in
                    handleEvent(event)
                }
            )

            if !isPlaying {
                // Touch catcher above the player so taps start playback
                // instead of reaching the (paused) Bunny controls.
                Button(action: handlePlay) {}
                    .buttonStyle(.plain)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(.black.opacity(0.001))
                    .overlay {
                        posterOverlay
                            .allowsHitTesting(false)
                    }
                    .contentShape(Rectangle())
            }

            if let record = progressRecord {
                if record.isCompleted {
                    completedBadge
                } else if record.percent > 0 {
                    watchedBadge(record.percent)
                }
            }
        }
        .task(id: isPlaying) {
            await runProgressLoop()
        }
    }

    private var posterShell: some View {
        Button(action: handlePlay) {
            ZStack {
                Rectangle()
                    .fill(Color(hex: "#1a1a2e"))
                posterOverlay
                    .allowsHitTesting(false)
            }
        }
        .buttonStyle(PressableButtonStyle())
    }

    private var lockedOverlay: some View {
        Button {
            Haptics.medium()
            onUnlockPress?()
        } label: {
            ZStack {
                Rectangle().fill(theme.colors.surfaceAlt)
                VStack(spacing: Spacing.sm) {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 26, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 64, height: 64)
                        .background(theme.colors.primary)
                        .clipShape(.circle)

                    Text(video.title.isEmpty ? "Video Locked" : video.title)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)

                    Text("Enroll in this course to watch")
                        .font(.system(size: 13))
                        .foregroundStyle(.white.opacity(0.7))

                    Text("Unlock Access")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, Spacing.lg)
                        .padding(.vertical, Spacing.sm + 2)
                        .background(theme.colors.secondary)
                        .clipShape(.rect(cornerRadius: Radius.sm))
                }
                .padding(Spacing.md)
            }
        }
        .buttonStyle(PressableButtonStyle())
    }

    private var unavailableState: some View {
        VStack(spacing: Spacing.sm) {
            Image(systemName: "exclamationmark.circle")
                .font(.system(size: 30))
                .foregroundStyle(theme.colors.error)
            Text("Video not available")
                .font(.system(size: 14))
                .foregroundStyle(theme.colors.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(theme.colors.surfaceAlt)
    }

    private var posterOverlay: some View {
        VStack(spacing: Spacing.xs) {
            Image(systemName: "play.fill")
                .font(.system(size: 26, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 72, height: 72)
                .background(isCompletedBadgeShown ? theme.colors.secondary : theme.colors.primary)
                .clipShape(.circle)
                .shadow(color: .black.opacity(0.3), radius: 8, y: 4)

            if !video.title.isEmpty {
                Text(video.title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.lg)
            }

            if video.durationSeconds > 0 {
                Text(Self.formatClock(video.durationSeconds))
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.8))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(.black.opacity(0.5))
                    .clipShape(.rect(cornerRadius: 4))
            }
        }
    }

    private var isCompletedBadgeShown: Bool {
        progressRecord?.isCompleted ?? false
    }

    private var completedBadge: some View {
        VStack(spacing: 2) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 22))
                .foregroundStyle(.white)
            Text("Completed")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.white)
        }
        .padding(.horizontal, Spacing.sm + 2)
        .padding(.vertical, 6)
        .background(theme.colors.secondary)
        .clipShape(.capsule)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
        .padding(Spacing.sm + 2)
    }

    private func watchedBadge(_ percent: Int) -> some View {
        HStack(spacing: 4) {
            Image(systemName: "clock")
                .font(.system(size: 12, weight: .semibold))
            Text("\(percent)% watched")
                .font(.system(size: 11, weight: .medium))
        }
        .foregroundStyle(.white)
        .padding(.horizontal, Spacing.sm + 2)
        .padding(.vertical, 6)
        .background(.black.opacity(0.7))
        .clipShape(.capsule)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
        .padding(Spacing.sm + 2)
    }

    private var protectionNotice: some View {
        HStack(spacing: 6) {
            Image(systemName: "shield.lefthalf.filled")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(theme.colors.secondary)
            Text("Screen recording protection active")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(theme.colors.secondary)
        }
        .padding(.vertical, Spacing.xs + 2)
        .padding(.horizontal, Spacing.sm + 2)
        .frame(maxWidth: .infinity)
        .background(theme.colors.secondary.opacity(0.08))
        .clipShape(.rect(cornerRadius: Radius.sm))
    }

    private var markCompleteButton: some View {
        Button {
            Task { await markComplete() }
        } label: {
            HStack(spacing: Spacing.sm) {
                if isMarkingComplete {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 16, weight: .semibold))
                    Text("Mark as Complete")
                        .font(.system(size: 14, weight: .semibold))
                }
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.sm + 4)
            .background(theme.colors.secondary)
            .clipShape(.rect(cornerRadius: Radius.sm))
        }
        .buttonStyle(PressableButtonStyle())
        .disabled(isMarkingComplete)
    }

    // MARK: - Actions

    private func handlePlay() {
        if isLocked {
            Haptics.warning()
            onUnlockPress?()
            return
        }
        if isPlaying { return }

        Haptics.light()
        playbackConfirmed = false
        latestTime = 0
        estimate = 0
        hasRequestedPlay = true
        isPlaying = true

        if !wantsAutoplay {
            // The player shell is usually already mounted and preloaded, so
            // start it directly through the player.js bridge. If the bridge
            // does not confirm playback, fall back to reloading with autoplay.
            playRequestID += 1
            fallbackTask?.cancel()
            fallbackTask = Task {
                try? await Task.sleep(for: .seconds(1.8))
                guard !Task.isCancelled, !playbackConfirmed else { return }
                reloadWithAutoplay = true
            }
        }
    }

    private func handleEvent(_ event: BunnyPlayerEvent) {
        switch event.event {
        case "play":
            confirmPlayback()
        case "timeupdate":
            if let time = event.currentTime {
                latestTime = time
                confirmPlayback()
            }
        default:
            break
        }
    }

    private func confirmPlayback() {
        playbackConfirmed = true
        fallbackTask?.cancel()
        fallbackTask = nil
    }

    // MARK: - Progress

    private func loadInitialProgress() async {
        guard !userId.isEmpty else { return }
        let records = await VideoService.shared.fetchSectionProgress(
            userId: userId,
            courseId: courseId,
            sectionId: sectionId
        )
        progressRecord = records.first { $0.videoId == video.id }
    }

    /// Sends watch progress every 30 seconds. Real playback time from the
    /// player.js bridge wins; otherwise falls back to a monotonic 30s estimate.
    private func runProgressLoop() async {
        guard isPlaying else { return }
        let duration = video.durationSeconds
        guard duration > 0, !userId.isEmpty else { return }

        while !Task.isCancelled {
            try? await Task.sleep(for: .seconds(30))
            guard !Task.isCancelled else { return }

            estimate = latestTime > estimate
                ? latestTime
                : min(estimate + 30, Double(duration))

            if let record = await VideoService.shared.updateProgress(
                userId: userId,
                videoId: video.id,
                courseId: courseId,
                sectionId: sectionId,
                currentTime: Int(estimate.rounded()),
                duration: duration
            ) {
                progressRecord = record
                onProgressUpdate?()
            }
        }
    }

    private func markComplete() async {
        guard !isMarkingComplete else { return }
        isMarkingComplete = true
        let success = await VideoService.shared.markCompleted(
            userId: userId,
            videoId: video.id,
            courseId: courseId,
            sectionId: sectionId
        )
        if success {
            progressRecord = VideoProgressRecord(
                id: progressRecord?.id ?? "local-\(video.id)",
                videoId: video.id,
                currentTime: progressRecord?.currentTime ?? 0,
                duration: progressRecord?.duration ?? video.durationSeconds,
                progressPercent: 100,
                completed: true,
                certificationEligible: true,
                lastWatchedAt: nil
            )
            Haptics.success()
            onProgressUpdate?()
        } else {
            Haptics.warning()
        }
        isMarkingComplete = false
    }

    private static func formatClock(_ seconds: Int) -> String {
        String(format: "%d:%02d", seconds / 60, seconds % 60)
    }
}

private extension Optional where Wrapped == VideoProgressRecord {
    /// True when there is no record or the record is already completed.
    var isNilCompleted: Bool {
        guard let record = self else { return true }
        return !record.isCompleted
    }
}
