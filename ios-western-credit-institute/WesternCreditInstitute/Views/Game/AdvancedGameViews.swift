//
//  AdvancedGameViews.swift
//  WesternCreditInstitute
//

import SwiftUI
import AVFoundation

// MARK: - Scavenger Hunt View

/// Treasure hunt with AR-style camera scanner, proximity detection, and hold-to-claim.
struct ScavengerHuntView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game

    @State private var viewMode: HuntViewMode = .map
    @State private var selectedTreasure: TreasureItem?
    @State private var showClaimSheet = false
    @State private var showCamera = false
    @State private var claimResult: ClaimResult?
    @State private var showClaimResult = false
    @State private var holdProgress: Double = 0
    @State private var isHolding = false
    @State private var isClaiming = false
    @State private var scanProgress: Double = 0
    @State private var isScanning = false

    private let maxDailyTreasures = 5

    enum HuntViewMode: String, CaseIterable {
        case map, list, legend, stats
        var label: String { rawValue.capitalized }
        var symbol: String {
            switch self {
            case .map: "map.fill"
            case .list: "list.bullet.rectangle.fill"
            case .legend: "book.pages.fill"
            case .stats: "chart.bar.fill"
            }
        }
    }

    var body: some View {
        let colors = theme.colors
        let claimedCount = treasures.filter(\.claimed).count
        let remaining = maxDailyTreasures - claimedCount

        ScrollView {
            VStack(spacing: Spacing.md) {
                // Daily progress banner
                VStack(spacing: Spacing.sm) {
                    HStack {
                        Image(systemName: "compass.fill").foregroundStyle(.white)
                        Text("Daily Treasure Hunt").font(.system(size: 18, weight: .heavy)).foregroundStyle(.white)
                        Spacer()
                        Text("\(claimedCount)/\(maxDailyTreasures)").font(.system(size: 16, weight: .bold)).foregroundStyle(.white.opacity(0.85))
                    }
                    if game.huntStreak > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "flame.fill").foregroundStyle(Color(hex: "#F59E0B"))
                            Text("\(game.huntStreak) day streak").font(.system(size: 13, weight: .semibold)).foregroundStyle(.white.opacity(0.8))
                            Spacer()
                            Text(remaining > 0 ? "\(remaining) treasures remaining" : "All claimed!").font(.system(size: 12)).foregroundStyle(.white.opacity(0.7))
                        }
                    }
                }
                .padding(Spacing.md)
                .background(LinearGradient(colors: [Color(hex: "#D946EF"), Color(hex: "#8B5CF6")], startPoint: .topLeading, endPoint: .bottomTrailing))
                .clipShape(.rect(cornerRadius: Radius.lg))

                // View mode tabs
                HStack(spacing: Spacing.sm) {
                    ForEach(HuntViewMode.allCases, id: \.self) { mode in
                        Button { Haptics.light(); viewMode = mode } label: {
                            VStack(spacing: 4) {
                                Image(systemName: mode.symbol).font(.system(size: 16))
                                Text(mode.label).font(.system(size: 11, weight: .semibold))
                            }
                            .foregroundStyle(viewMode == mode ? colors.primary : colors.textSecondary)
                            .frame(maxWidth: .infinity).padding(.vertical, 8)
                            .background(viewMode == mode ? colors.primary.opacity(0.10) : .clear)
                            .clipShape(.rect(cornerRadius: Radius.md))
                        }.buttonStyle(.plain)
                    }
                }

                switch viewMode {
                case .map: mapView(colors: colors, remaining: remaining)
                case .list: listView(colors: colors)
                case .legend: legendView(colors: colors)
                case .stats: statsView(colors: colors)
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Treasure Hunt")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showCamera) {
            TreasureCameraView { onScanComplete in
                showCamera = false
                if onScanComplete { completeScan() }
            }
        }
        .sheet(isPresented: $showClaimResult) {
            if let result = claimResult { ClaimResultSheet(result: result) }
        }
    }

    // MARK: - Map View

    private func mapView(colors: AppTheme, remaining: Int) -> some View {
        VStack(spacing: Spacing.md) {
            // Stylized map placeholder
            ZStack {
                // Map background
                RoundedRectangle(cornerRadius: Radius.lg)
                    .fill(LinearGradient(colors: [Color(hex: "#1E3A5F"), Color(hex: "#0F172A")], startPoint: .top, endPoint: .bottom))
                    .frame(height: 280)

                // Grid lines for map feel
                    .overlay {
                        VStack(spacing: 0) {
                            ForEach(0..<6) { _ in
                                Rectangle().fill(Color.white.opacity(0.04)).frame(height: 1)
                                Spacer()
                            }
                        }
                    }
                    .overlay {
                        HStack(spacing: 0) {
                            ForEach(0..<4) { _ in
                                Rectangle().fill(Color.white.opacity(0.04)).frame(width: 1)
                                Spacer()
                            }
                        }
                    }

                // Treasure pins
                ForEach(Array(treasures.enumerated()), id: \.element.id) { index, treasure in
                    let x = CGFloat(index % 3) * 100 - 100
                    let y = CGFloat(index / 3) * 80 - 80
                    treasurePin(treasure, colors: colors)
                        .offset(x: x, y: y)
                }

                // Player location dot
                VStack(spacing: 4) {
                    Image(systemName: "figure.stand")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 36, height: 36)
                        .background(Color(hex: "#3B82F6"))
                        .clipShape(.circle)
                        .overlay { Circle().stroke(.white, lineWidth: 3) }
                    Text("You").font(.system(size: 9, weight: .bold)).foregroundStyle(.white)
                }
            }

            if remaining > 0 {
                Button { Haptics.medium(); showCamera = true } label: {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "camera.viewfinder").font(.system(size: 18))
                        Text("Scan for Treasures").font(.system(size: 16, weight: .bold))
                    }
                    .foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 16)
                    .background(LinearGradient(colors: [Color(hex: "#D946EF"), Color(hex: "#8B5CF6")], startPoint: .leading, endPoint: .trailing))
                    .clipShape(.rect(cornerRadius: Radius.lg))
                }.buttonStyle(PressableButtonStyle())
            } else {
                CardView {
                    VStack(spacing: Spacing.sm) {
                        Image(systemName: "checkmark.seal.fill").font(.system(size: 28)).foregroundStyle(colors.success)
                        Text("All daily treasures claimed!").font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                        Text("Come back tomorrow for more treasures.").font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                    }.frame(maxWidth: .infinity).padding(.vertical, Spacing.md)
                }
            }
        }
    }

    private func treasurePin(_ treasure: TreasureItem, colors: AppTheme) -> some View {
        let rarityColor = treasure.rarity.color
        return VStack(spacing: 2) {
            Image(systemName: treasure.claimed ? "checkmark.circle.fill" : treasure.rarity.symbol)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 32, height: 32)
                .background(treasure.claimed ? colors.success : rarityColor)
                .clipShape(.circle)
                .overlay { Circle().stroke(.white, lineWidth: 2) }
            if !treasure.claimed {
                Text(treasure.name.prefix(8)).font(.system(size: 8, weight: .bold)).foregroundStyle(.white.opacity(0.8))
            }
        }
    }

    // MARK: - List View

    private func listView(colors: AppTheme) -> some View {
        VStack(spacing: Spacing.sm) {
            ForEach(treasures, id: \.id) { treasure in
                Button { Haptics.light(); selectedTreasure = treasure; showClaimSheet = true } label: {
                    CardView {
                        HStack(spacing: Spacing.md) {
                            Image(systemName: treasure.rarity.symbol)
                                .font(.system(size: 22, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 48, height: 48)
                                .background(treasure.rarity.color)
                                .clipShape(.rect(cornerRadius: Radius.md))

                            VStack(alignment: .leading, spacing: 4) {
                                Text(treasure.name).font(.system(size: 15, weight: .bold)).foregroundStyle(colors.text)
                                Text(treasure.rarity.label).font(.system(size: 12, weight: .semibold)).foregroundStyle(treasure.rarity.color)
                                Text("\(treasure.distance)m away").font(.system(size: 11)).foregroundStyle(colors.textLight)
                            }

                            Spacer()

                            if treasure.claimed {
                                BadgeView(text: "Claimed", variant: .success, symbol: "checkmark.circle.fill")
                            } else {
                                BadgeView(text: "+\(treasure.reward) MUSO", variant: .warning, symbol: "coins.fill")
                            }
                        }
                    }
                }.buttonStyle(PressableButtonStyle())
            }
        }
        .sheet(isPresented: $showClaimSheet) {
            if let treasure = selectedTreasure {
                TreasureClaimSheet(treasure: treasure, game: game, onComplete: { result in
                    claimResult = result
                    showClaimResult = true
                })
            }
        }
    }

    // MARK: - Legend View

    private func legendView(colors: AppTheme) -> some View {
        VStack(spacing: Spacing.sm) {
            ForEach(TreasureRarity.allCases, id: \.self) { rarity in
                CardView {
                    HStack(spacing: Spacing.md) {
                        Image(systemName: rarity.symbol).font(.system(size: 22, weight: .bold)).foregroundStyle(.white)
                            .frame(width: 48, height: 48).background(rarity.color).clipShape(.rect(cornerRadius: Radius.md))
                        VStack(alignment: .leading, spacing: 4) {
                            Text(rarity.label).font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                            Text("\(rarity.minReward)–\(rarity.maxReward) MUSO reward").font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                            Text("Spawn rate: \(rarity.spawnRate)").font(.system(size: 11)).foregroundStyle(colors.textLight)
                        }
                        Spacer()
                    }
                }
            }

            // Streak bonuses
            SectionHeader(title: "Streak Bonuses", symbol: "flame.fill", symbolTint: Color(hex: "#F59E0B"))
            ForEach(Array(streakBonuses.enumerated()), id: \.offset) { _, bonus in
                CardView {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) { Text("\(bonus.days) day streak").font(.system(size: 14, weight: .bold)).foregroundStyle(colors.text); Text(bonus.bonus).font(.system(size: 12)).foregroundStyle(colors.textSecondary) }
                        Spacer()
                        BadgeView(text: "x\(bonus.multiplier)", variant: .warning)
                    }
                }
            }
        }
    }

    // MARK: - Stats View

    private func statsView(colors: AppTheme) -> some View {
        VStack(spacing: Spacing.md) {
            LazyVGrid(columns: [GridItem(), GridItem()], spacing: Spacing.md) {
                statBox("\(treasures.filter(\.claimed).count)", "Claimed", "checkmark.circle.fill", colors.success)
                statBox("\(game.huntStreak)", "Day Streak", "flame.fill", Color(hex: "#F59E0B"))
                statBox(Format.compactCurrency(Double(treasures.filter(\.claimed).reduce(0) { $0 + $1.reward })), "MUSO Earned", "coins.fill", Color(hex: "#8B5CF6"))
                statBox("\(maxDailyTreasures)", "Daily Limit", "target", colors.primary)
            }
        }
    }

    private func statBox(_ value: String, _ label: String, _ symbol: String, _ color: Color) -> some View {
        CardView { VStack(spacing: 4) { Image(systemName: symbol).font(.system(size: 18)).foregroundStyle(color); Text(value).font(.system(size: 20, weight: .bold)).foregroundStyle(theme.colors.text); Text(label).font(.system(size: 11)).foregroundStyle(theme.colors.textSecondary) }.frame(maxWidth: .infinity) }
    }

    private var treasures: [TreasureItem] { GameMockData.treasures }
    private var streakBonuses: [(days: Int, bonus: String, multiplier: Double)] { GameMockData.streakBonuses }

    private func completeScan() {
        Haptics.success()
        // Award a random unclaimed treasure
        if let treasure = treasures.first(where: { !$0.claimed }) {
            game.mintTokens(Double(treasure.reward), reason: "Treasure Hunt: \(treasure.name)")
            claimResult = ClaimResult(success: true, tokensAwarded: treasure.reward, message: "You found \(treasure.name)!")
            showClaimResult = true
        }
    }
}

// MARK: - Treasure Types

enum TreasureRarity: String, CaseIterable {
    case common, uncommon, rare, epic, legendary

    var label: String { rawValue.capitalized }
    var symbol: String {
        switch self {
        case .common: "pin.fill"
        case .uncommon: "mappin.circle.fill"
        case .rare: "star.fill"
        case .epic: "bolt.fill"
        case .legendary: "crown.fill"
        }
    }
    var color: Color {
        switch self {
        case .common: Color(hex: "#64748B")
        case .uncommon: Color(hex: "#10B981")
        case .rare: Color(hex: "#3B82F6")
        case .epic: Color(hex: "#8B5CF6")
        case .legendary: Color(hex: "#FFD700")
        }
    }
    var minReward: Int { switch self { case .common: 10; case .uncommon: 25; case .rare: 50; case .epic: 100; case .legendary: 250 } }
    var maxReward: Int { switch self { case .common: 20; case .uncommon: 40; case .rare: 80; case .epic: 150; case .legendary: 500 } }
    var spawnRate: String { switch self { case .common: "40%"; case .uncommon: "25%"; case .rare: "20%"; case .epic: "10%"; case .legendary: "5%" } }
}

struct TreasureItem: Identifiable, Hashable {
    let id: String
    let name: String
    let rarity: TreasureRarity
    let reward: Int
    let distance: Int
    var claimed: Bool
}

struct ClaimResult: Identifiable {
    let id = UUID()
    let success: Bool
    let tokensAwarded: Int
    let message: String
}

private struct ClaimResultSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    let result: ClaimResult

    var body: some View {
        let colors = theme.colors
        NavigationStack {
            VStack(spacing: Spacing.lg) {
                Spacer()

                Image(systemName: result.success ? "checkmark.seal.fill" : "xmark.seal.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(result.success ? colors.success : colors.error)
                    .frame(width: 96, height: 96)
                    .background((result.success ? colors.success : colors.error).opacity(0.12))
                    .clipShape(.circle)

                Text(result.success ? "Treasure Claimed!" : "Claim Failed").font(.system(size: 24, weight: .heavy)).foregroundStyle(colors.text)
                Text(result.message).font(.system(size: 15)).foregroundStyle(colors.textSecondary).multilineTextAlignment(.center)

                if result.success {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "coins.fill").foregroundStyle(Color(hex: "#8B5CF6"))
                        Text("+\(result.tokensAwarded) MUSO").font(.system(size: 20, weight: .heavy)).foregroundStyle(Color(hex: "#8B5CF6"))
                    }.padding(.horizontal, Spacing.lg).padding(.vertical, Spacing.md).background(Color(hex: "#8B5CF6").opacity(0.08)).clipShape(.rect(cornerRadius: Radius.md))
                }

                Spacer()

                Button { dismiss() } label: {
                    Text("Continue").font(.system(size: 16, weight: .bold)).foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 16).background(colors.primary).clipShape(.rect(cornerRadius: Radius.md))
                }.buttonStyle(PressableButtonStyle()).padding(.horizontal, Spacing.lg)
            }
            .background(colors.background)
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

private struct TreasureClaimSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    let treasure: TreasureItem
    let game: GameStore
    let onComplete: (ClaimResult) -> Void

    @State private var holdProgress: Double = 0
    @State private var isHolding = false
    @State private var timer: Timer?

    private let claimProximityMeters = 200

    var body: some View {
        let colors = theme.colors
        let isNear = treasure.distance <= claimProximityMeters

        NavigationStack {
            VStack(spacing: Spacing.lg) {
                // Treasure preview
                VStack(spacing: Spacing.sm) {
                    Image(systemName: treasure.rarity.symbol)
                        .font(.system(size: 36, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 80, height: 80)
                        .background(treasure.rarity.color)
                        .clipShape(.circle)
                        .overlay { Circle().stroke(.white.opacity(0.3), lineWidth: 3) }

                    Text(treasure.name).font(.system(size: 20, weight: .heavy)).foregroundStyle(colors.text)
                    BadgeView(text: treasure.rarity.label, variant: .warning, symbol: treasure.rarity.symbol)
                }.padding(.top, Spacing.lg)

                // Proximity check
                CardView {
                    VStack(spacing: Spacing.sm) {
                        HStack {
                            Image(systemName: isNear ? "checkmark.circle.fill" : "exclamationmark.triangle.fill").foregroundStyle(isNear ? colors.success : colors.warning)
                            Text(isNear ? "You're close enough to claim!" : "Get within \(claimProximityMeters)m to claim").font(.system(size: 14, weight: .semibold)).foregroundStyle(colors.text)
                        }
                        HStack {
                            Image(systemName: "mappin.and.ellipse").foregroundStyle(colors.primary)
                            Text("\(treasure.distance)m away").font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                        }
                        HStack {
                            Image(systemName: "coins.fill").foregroundStyle(Color(hex: "#8B5CF6"))
                            Text("Reward: +\(treasure.reward) MUSO").font(.system(size: 13, weight: .semibold)).foregroundStyle(Color(hex: "#8B5CF6"))
                        }
                    }
                }

                Spacer()

                // Hold-to-claim button
                if isNear && !treasure.claimed {
                    VStack(spacing: Spacing.sm) {
                        Text("Hold to claim treasure").font(.system(size: 13, weight: .semibold)).foregroundStyle(colors.textSecondary)
                        Button {
                            startHolding()
                        } label: {
                            VStack(spacing: Spacing.xs) {
                                Image(systemName: "hand.point.down.fill").font(.system(size: 28, weight: .bold))
                                Text(isHolding ? "Claiming... \(Int(holdProgress * 100))%" : "Hold to Claim").font(.system(size: 16, weight: .bold))
                            }
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity).padding(.vertical, 24)
                            .background(LinearGradient(colors: [Color(hex: "#D946EF"), Color(hex: "#8B5CF6")], startPoint: .top, endPoint: .bottom))
                            .clipShape(.rect(cornerRadius: Radius.lg))
                            .overlay {
                                RoundedRectangle(cornerRadius: Radius.lg)
                                    .trim(from: 0, to: holdProgress)
                                    .stroke(.white, lineWidth: 3)
                            }
                        }
                        .buttonStyle(PressableButtonStyle())
                        .simultaneousGesture(
                            DragGesture(minimumDistance: 0)
                                .onChanged { _ in if !isHolding { startHolding() } }
                                .onEnded { _ in stopHolding() }
                        )
                    }.padding(.horizontal, Spacing.lg).padding(.bottom, Spacing.lg)
                } else if treasure.claimed {
                    Text("Already claimed").font(.system(size: 16, weight: .semibold)).foregroundStyle(colors.textLight).padding(.bottom, Spacing.lg)
                }

                Button("Close") { dismiss() }.foregroundStyle(colors.textSecondary).padding(.bottom, Spacing.lg)
            }
            .background(colors.background)
            .navigationTitle("Claim Treasure")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func startHolding() {
        guard !isHolding else { return }
        isHolding = true
        Haptics.light()
        timer = Timer.scheduledTimer(withTimeInterval: 0.02, repeats: true) { _ in
            holdProgress += 0.02
            if holdProgress >= 1.0 {
                stopHolding()
                completeClaim()
            }
        }
    }

    private func stopHolding() {
        isHolding = false
        timer?.invalidate()
        timer = nil
        if holdProgress < 1.0 { holdProgress = 0 }
    }

    private func completeClaim() {
        Haptics.success()
        game.mintTokens(Double(treasure.reward), reason: "Treasure Hunt: \(treasure.name)")
        onComplete(ClaimResult(success: true, tokensAwarded: treasure.reward, message: "You claimed \(treasure.name) and earned \(treasure.reward) MUSO tokens!"))
        dismiss()
    }
}

// MARK: - Camera Scanner

private struct TreasureCameraView: View {
    @Environment(\.dismiss) private var dismiss
    let onComplete: (Bool) -> Void

    @State private var scanProgress: Double = 0
    @State private var timer: Timer?
    @State private var cameraAuthorized = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            // Real camera feed via AVCaptureVideoPreviewLayer
            CameraPreviewView()
                .ignoresSafeArea()

            // Scan overlay
            VStack {
                HStack {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark.circle.fill").font(.system(size: 28)).foregroundStyle(.white.opacity(0.8))
                    }
                    Spacer()
                    Text("Scanning...").font(.system(size: 16, weight: .bold)).foregroundStyle(.white)
                    Spacer()
                    Image(systemName: "camera.viewfinder").font(.system(size: 24)).foregroundStyle(.white.opacity(0.8))
                }.padding()

                Spacer()

                // Scan frame
                ZStack {
                    RoundedRectangle(cornerRadius: Radius.lg)
                        .stroke(Color.white.opacity(0.4), lineWidth: 2)
                        .frame(width: 240, height: 240)

                    // Animated scan line
                    if scanProgress < 1 {
                        Rectangle()
                            .fill(LinearGradient(colors: [.clear, Color(hex: "#D946EF"), .clear], startPoint: .leading, endPoint: .trailing))
                            .frame(width: 240, height: 2)
                            .offset(y: -120 + 240 * scanProgress)
                    }

                    // Corners
                    ForEach(0..<4) { i in
                        RoundedRectangle(cornerRadius: 4)
                            .stroke(Color(hex: "#D946EF"), lineWidth: 4)
                            .frame(width: 30, height: 30)
                            .rotationEffect(.degrees(Double(i * 90)))
                            .offset(x: i % 2 == 0 ? -105 : 105, y: i < 2 ? -105 : 105)
                    }
                }

                Spacer()

                // Progress bar
                VStack(spacing: Spacing.sm) {
                    ProgressView(value: scanProgress).tint(Color(hex: "#D946EF"))
                    Text("\(Int(scanProgress * 100))% — Looking for treasures...").font(.system(size: 13, weight: .semibold)).foregroundStyle(.white.opacity(0.8))
                }.padding(.horizontal, Spacing.lg).padding(.bottom, Spacing.lg)
            }
        }
        .onAppear {
            timer = Timer.scheduledTimer(withTimeInterval: 0.03, repeats: true) { _ in
                scanProgress += 0.03
                if scanProgress >= 1.0 {
                    timer?.invalidate()
                    Haptics.success()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        onComplete(true)
                    }
                }
            }
        }
        .onDisappear { timer?.invalidate() }
    }
}

private struct CameraPreviewView: UIViewRepresentable {
    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.backgroundColor = .black

        let session = AVCaptureSession()
        session.sessionPreset = .high

        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
            ?? AVCaptureDevice.default(for: .video) else {
            return view
        }

        guard let input = try? AVCaptureDeviceInput(device: device) else { return view }
        if session.canAddInput(input) { session.addInput(input) }

        let previewLayer = AVCaptureVideoPreviewLayer(session: session)
        previewLayer.videoGravity = .resizeAspectFill
        previewLayer.frame = UIScreen.main.bounds
        view.layer.addSublayer(previewLayer)

        DispatchQueue.global(qos: .userInitiated).async { session.startRunning() }
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {}
}

// MARK: - 3D City Explorer

/// District explorer for the 3D LA City experience.
struct City3DView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game

    @State private var selectedDistrict: District?

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.md) {
                // Hero banner
                VStack(spacing: Spacing.sm) {
                    Image(systemName: "building.2.fill").font(.system(size: 32, weight: .semibold)).foregroundStyle(.white)
                    Text("3D LA City Explorer").font(.system(size: 22, weight: .heavy)).foregroundStyle(.white)
                    Text("Explore Los Angeles districts and discover hidden treasures").font(.system(size: 13)).foregroundStyle(.white.opacity(0.75))
                }
                .frame(maxWidth: .infinity)
                .padding(Spacing.lg)
                .background(LinearGradient(colors: [Color(hex: "#FFD700"), Color(hex: "#F59E0B")], startPoint: .topLeading, endPoint: .bottomTrailing))
                .clipShape(.rect(cornerRadius: Radius.xl))

                SectionHeader(title: "Districts", symbol: "map.fill", symbolTint: colors.primary)

                ForEach(districts, id: \.id) { district in
                    districtCard(district, colors: colors)
                }

                if let selected = selectedDistrict {
                    SectionHeader(title: "\(selected.name) Landmarks", symbol: "mappin.and.ellipse", symbolTint: selected.color)
                    ForEach(selected.landmarks, id: \.id) { landmark in
                        landmarkRow(landmark, colors: colors)
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("3D LA City")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func districtCard(_ district: District, colors: AppTheme) -> some View {
        let isSelected = selectedDistrict?.id == district.id
        return Button {
            Haptics.light()
            withAnimation { selectedDistrict = isSelected ? nil : district }
        } label: {
            CardView {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack {
                        Rectangle().fill(district.color).frame(width: 4, height: 40).clipShape(.rect(cornerRadius: 2))
                        VStack(alignment: .leading, spacing: 4) {
                            Text(district.name).font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                            Text(district.description).font(.system(size: 13)).foregroundStyle(colors.textSecondary).lineLimit(2)
                        }
                        Spacer()
                        if isSelected { Image(systemName: "chevron.up").foregroundStyle(colors.textLight) } else { Image(systemName: "chevron.down").foregroundStyle(colors.textLight) }
                    }
                    HStack(spacing: Spacing.lg) {
                        Label("\(district.landmarks.count) landmarks", systemImage: "mappin.circle.fill").font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                        Label("\(district.totalTreasure) treasure", systemImage: "coins.fill").font(.system(size: 12)).foregroundStyle(Color(hex: "#F59E0B"))
                    }
                }
            }
        }.buttonStyle(PressableButtonStyle())
    }

    private func landmarkRow(_ landmark: Landmark, colors: AppTheme) -> some View {
        CardView {
            HStack(spacing: Spacing.md) {
                Image(systemName: landmark.type == .landmark ? "building.columns.fill" : landmark.type == .hiddenGem ? "diamond.fill" : "gift.fill")
                    .font(.system(size: 18)).foregroundStyle(.white)
                    .frame(width: 44, height: 44).background(landmark.discovered ? Color(hex: "#10B981") : colors.textLight).clipShape(.rect(cornerRadius: Radius.md))
                VStack(alignment: .leading, spacing: 4) {
                    Text(landmark.discovered ? landmark.name : "???").font(.system(size: 15, weight: .bold)).foregroundStyle(colors.text)
                    Text(landmark.type.label).font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                    if landmark.discovered, let value = landmark.treasureValue {
                        Text("💰 \(value) treasure value").font(.system(size: 11, weight: .semibold)).foregroundStyle(Color(hex: "#F59E0B"))
                    }
                }
                Spacer()
                if landmark.discovered {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(colors.success)
                } else {
                    Image(systemName: "lock.fill").foregroundStyle(colors.textLight)
                }
            }
        }
    }

    private var districts: [District] { GameMockData.districts }
}

// MARK: - District Types

enum LandmarkType: String, Hashable, Sendable {
    case landmark, hiddenGem = "hidden_gem", treasure
    var label: String { rawValue.replacingOccurrences(of: "_", with: " ").uppercased() }
}

struct Landmark: Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let type: LandmarkType
    var discovered: Bool
    var treasureValue: Int?
}

struct District: Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let description: String
    let color: Color
    let landmarks: [Landmark]
    var totalTreasure: Int { landmarks.compactMap(\.treasureValue).reduce(0, +) }
}

// MARK: - Avatar Customization

/// Avatar editor with item categories and equip/unequip.
struct AvatarCustomizationView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game

    @State private var selectedTab: AvatarTab = .outfit
    @State private var equippedItems: [AvatarTab: AvatarItem] = [:]
    @State private var showPurchaseAlert = false
    @State private var pendingItem: AvatarItem?

    enum AvatarTab: String, CaseIterable {
        case outfit, hat, accessory, shoes, glasses
        var label: String { rawValue.capitalized }
        var symbol: String {
            switch self {
            case .outfit: "shirt.fill"
            case .hat: "graduationcap.fill"
            case .accessory: "applewatch.watchface.fill"
            case .shoes: "figure.walk"
            case .glasses: "eyeglasses"
            }
        }
    }

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.md) {
                // Avatar preview
                VStack(spacing: Spacing.sm) {
                    ZStack {
                        Circle().fill(LinearGradient(colors: theme.colors.gradientPrimary, startPoint: .top, endPoint: .bottom)).frame(width: 120, height: 120)
                        Image(systemName: "person.fill").font(.system(size: 50)).foregroundStyle(.white)
                        // Equipped items overlay
                        if equippedItems[.hat] != nil {
                            Image(systemName: "graduationcap.fill").font(.system(size: 20)).foregroundStyle(Color(hex: "#F59E0B")).offset(y: -52)
                        }
                        if equippedItems[.glasses] != nil {
                            Image(systemName: "eyeglasses").font(.system(size: 16)).foregroundStyle(.white).offset(y: -22)
                        }
                    }
                    Text("Your Avatar").font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                    HStack(spacing: Spacing.sm) {
                        Label("\(equippedItems.count) equipped", systemImage: "checkmark.circle.fill").font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                        Label(Format.compactCurrency(game.tokenBalance) + " MUSO", systemImage: "coins.fill").font(.system(size: 12)).foregroundStyle(Color(hex: "#8B5CF6"))
                    }
                }.padding(Spacing.lg).background(colors.surface).clipShape(.rect(cornerRadius: Radius.xl))

                // Tab selector
                ScrollView(.horizontal) {
                    HStack(spacing: Spacing.sm) {
                        ForEach(AvatarTab.allCases, id: \.self) { tab in
                            Button { Haptics.light(); selectedTab = tab } label: {
                                VStack(spacing: 4) {
                                    Image(systemName: tab.symbol).font(.system(size: 18))
                                    Text(tab.label).font(.system(size: 11, weight: .semibold))
                                }
                                .foregroundStyle(selectedTab == tab ? colors.primary : colors.textSecondary)
                                .frame(width: 64, height: 64)
                                .background(selectedTab == tab ? colors.primary.opacity(0.10) : colors.surfaceAlt)
                                .clipShape(.rect(cornerRadius: Radius.md))
                            }.buttonStyle(PressableButtonStyle())
                        }
                    }
                }.scrollIndicators(.hidden)

                // Items for selected tab
                SectionHeader(title: "\(selectedTab.label) Items", symbol: selectedTab.symbol)
                ForEach(availableItems(for: selectedTab), id: \.id) { item in
                    itemCard(item, colors: colors)
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Avatar Customization")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Purchase Item", isPresented: $showPurchaseAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Buy & Equip") {
                if let item = pendingItem {
                    game.burnTokens(Double(item.price), reason: "Purchased \(item.name)")
                    equippedItems[selectedTab] = item
                    Haptics.success()
                }
            }
        } message: {
            if let item = pendingItem {
                Text("Buy \(item.name) for \(item.price) MUSO and equip it?")
            }
        }
    }

    private func itemCard(_ item: AvatarItem, colors: AppTheme) -> some View {
        let isEquipped = equippedItems[selectedTab]?.id == item.id
        return CardView {
            HStack(spacing: Spacing.md) {
                Image(systemName: item.symbol).font(.system(size: 22, weight: .semibold)).foregroundStyle(item.color)
                    .frame(width: 48, height: 48).background(item.color.opacity(0.12)).clipShape(.rect(cornerRadius: Radius.md))
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.name).font(.system(size: 15, weight: .bold)).foregroundStyle(colors.text)
                    Text(item.rarity.label).font(.system(size: 12, weight: .semibold)).foregroundStyle(item.rarity.color)
                }
                Spacer()
                if isEquipped {
                    Button { Haptics.light(); equippedItems.removeValue(forKey: selectedTab) } label: {
                        Text("Unequip").font(.system(size: 13, weight: .semibold)).foregroundStyle(colors.error)
                            .padding(.horizontal, 12).padding(.vertical, 8).background(colors.error.opacity(0.08)).clipShape(.rect(cornerRadius: Radius.md))
                    }.buttonStyle(.plain)
                } else {
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("\(item.price) MUSO").font(.system(size: 14, weight: .bold)).foregroundStyle(Color(hex: "#8B5CF6"))
                        Button {
                            if game.tokenBalance >= Double(item.price) {
                                pendingItem = item; showPurchaseAlert = true
                            } else {
                                Haptics.error()
                            }
                        } label: {
                            Text("Buy & Equip").font(.system(size: 13, weight: .bold)).foregroundStyle(.white)
                                .padding(.horizontal, 12).padding(.vertical, 8).background(game.tokenBalance >= Double(item.price) ? colors.primary : colors.textLight).clipShape(.rect(cornerRadius: Radius.md))
                        }.buttonStyle(.plain).disabled(game.tokenBalance < Double(item.price))
                    }
                }
            }
        }
    }

    private func availableItems(for tab: AvatarTab) -> [AvatarItem] {
        GameMockData.avatarItems.filter { $0.category == tab }
    }
}

struct AvatarItem: Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let category: AvatarCustomizationView.AvatarTab
    let symbol: String
    let color: Color
    let rarity: TreasureRarity
    let price: Int
}

// MARK: - Investment Pools

/// Investment pool list with funding progress, risk levels, and ROI projections.
struct InvestmentPoolsView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game

    @State private var selectedRisk: RiskFilter = .all
    @State private var searchQuery = ""
    @State private var showInvestSheet = false
    @State private var selectedPool: InvestmentPool?

    enum RiskFilter: String, CaseIterable {
        case all, low, medium, high
        var label: String { rawValue.capitalized }
    }

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.md) {
                // Summary stats
                HStack(spacing: Spacing.md) {
                    poolStat("\(pools.count)", "Available Pools", "chart.bar.fill", colors.primary)
                    poolStat(Format.compactCurrency(pools.filter { $0.status == "open" }.reduce(0) { $0 + $1.currentAmount }), "Total Funded", "dollarsign.circle.fill", colors.success)
                    poolStat(Format.compactCurrency(pools.reduce(0) { $0 + $1.fundingGoal }), "Total Goal", "target", colors.info)
                }

                // Search
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "magnifyingglass").foregroundStyle(colors.textLight)
                    TextField("Search pools...", text: $searchQuery).foregroundStyle(colors.text)
                }.padding(Spacing.md).background(colors.surface).clipShape(.rect(cornerRadius: Radius.md))

                // Risk filter
                ScrollView(.horizontal) { HStack(spacing: Spacing.sm) {
                    ForEach(RiskFilter.allCases, id: \.self) { filter in
                        Button { Haptics.light(); selectedRisk = filter } label: {
                            Text(filter.label).font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(selectedRisk == filter ? .white : colors.text)
                                .padding(.horizontal, Spacing.md).padding(.vertical, 8)
                                .background(selectedRisk == filter ? colors.primary : colors.surface).clipShape(.capsule)
                        }.buttonStyle(PressableButtonStyle())
                    }
                }}.scrollIndicators(.hidden)

                // Pool cards
                let filtered = pools.filter {
                    (selectedRisk == .all || $0.riskLevel == selectedRisk.rawValue) &&
                    (searchQuery.isEmpty || $0.poolName.lowercased().contains(searchQuery.lowercased()))
                }

                ForEach(filtered, id: \.id) { pool in
                    poolCard(pool, colors: colors)
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Investment Pools")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showInvestSheet) {
            if let pool = selectedPool { InvestSheet(pool: pool) }
        }
    }

    private func poolCard(_ pool: InvestmentPool, colors: AppTheme) -> some View {
        let fundingPct = pool.fundingGoal > 0 ? pool.currentAmount / pool.fundingGoal * 100 : 100
        let riskColor = pool.riskColor
        let daysLeft = max(0, Int((pool.deadline.timeIntervalSinceNow / 86400).rounded()))
        let isOpen = pool.status == "open" && daysLeft > 0

        return CardView {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    BadgeView(text: isOpen ? "Open" : pool.status.capitalized, variant: isOpen ? .success : .neutral, symbol: isOpen ? "circle.fill" : "xmark.circle.fill")
                    Spacer()
                    HStack(spacing: 4) { Image(systemName: "shield.fill").font(.system(size: 10)); Text(pool.riskLabel).font(.system(size: 11, weight: .bold)) }
                        .foregroundStyle(riskColor).padding(.horizontal, 8).padding(.vertical, 4).background(riskColor.opacity(0.12)).clipShape(.capsule)
                }

                Text(pool.poolName).font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                Text(pool.description).font(.system(size: 13)).foregroundStyle(colors.textSecondary).lineLimit(2)

                // Funding progress
                VStack(spacing: 4) {
                    HStack { Text("Funding Progress").font(.system(size: 12)).foregroundStyle(colors.textSecondary); Spacer(); Text(String(format: "%.0f%%", fundingPct)).font(.system(size: 12, weight: .bold)).foregroundStyle(colors.text) }
                    ProgressView(value: min(fundingPct, 100)).tint(riskColor)
                }

                HStack(spacing: Spacing.lg) {
                    VStack(alignment: .leading) { Text("Goal").font(.system(size: 11)).foregroundStyle(colors.textSecondary); Text(Format.compactCurrency(pool.fundingGoal)).font(.system(size: 14, weight: .bold)).foregroundStyle(colors.text) }
                    VStack(alignment: .leading) { Text("ROI").font(.system(size: 11)).foregroundStyle(colors.textSecondary); Text(String(format: "%.0f%%", pool.projectedROI * 100)).font(.system(size: 14, weight: .bold)).foregroundStyle(colors.success) }
                    VStack(alignment: .leading) { Text("Days Left").font(.system(size: 11)).foregroundStyle(colors.textSecondary); Text("\(daysLeft)").font(.system(size: 14, weight: .bold)).foregroundStyle(daysLeft < 7 ? colors.error : colors.text) }
                    Spacer()
                }

                if isOpen {
                    Button { Haptics.light(); selectedPool = pool; showInvestSheet = true } label: {
                        HStack(spacing: 4) { Image(systemName: "arrow.right.circle.fill"); Text("Invest Now") }.font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 12).background(colors.primary).clipShape(.rect(cornerRadius: Radius.md))
                    }.buttonStyle(PressableButtonStyle())
                }
            }
        }
    }

    private func poolStat(_ value: String, _ label: String, _ symbol: String, _ color: Color) -> some View {
        CardView { VStack(spacing: 4) { Image(systemName: symbol).font(.system(size: 18)).foregroundStyle(color); Text(value).font(.system(size: 18, weight: .bold)).foregroundStyle(theme.colors.text); Text(label).font(.system(size: 11)).foregroundStyle(theme.colors.textSecondary) }.frame(maxWidth: .infinity) }
    }

    private var pools: [InvestmentPool] { GameMockData.investmentPools }
}

struct InvestmentPool: Identifiable, Hashable, Sendable {
    let id: String
    let poolName: String
    let description: String
    let fundingGoal: Double
    let currentAmount: Double
    let riskLevel: String
    let projectedROI: Double
    let status: String
    let deadline: Date
    let minInvestment: Double

    var riskColor: Color {
        switch riskLevel { case "low": Color(hex: "#22C55E"); case "medium": Color(hex: "#F59E0B"); case "high": Color(hex: "#EF4444"); default: Color(hex: "#64748B") }
    }
    var riskLabel: String {
        switch riskLevel { case "low": "Low Risk"; case "medium": "Medium Risk"; case "high": "High Risk"; default: "Unknown" }
    }
}

private struct InvestSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game
    @Environment(\.dismiss) private var dismiss
    let pool: InvestmentPool

    @State private var investAmount = ""

    var body: some View {
        let colors = theme.colors
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    Text(pool.poolName).font(.system(size: 20, weight: .heavy)).foregroundStyle(colors.text)
                    Text(pool.description).font(.system(size: 14)).foregroundStyle(colors.textSecondary)

                    CardView {
                        VStack(spacing: Spacing.sm) {
                            infoRow("Min Investment", Format.currency(pool.minInvestment), colors)
                            infoRow("Projected ROI", String(format: "%.0f%%", pool.projectedROI * 100), colors)
                            infoRow("Risk Level", pool.riskLabel, colors)
                            infoRow("Funding Goal", Format.compactCurrency(pool.fundingGoal), colors)
                            infoRow("Current Funding", Format.compactCurrency(pool.currentAmount), colors)
                        }
                    }

                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Investment Amount").font(.system(size: 14, weight: .semibold)).foregroundStyle(colors.text)
                        TextField("0.00", text: $investAmount).keyboardType(.decimalPad)
                            .padding(14).background(colors.surfaceAlt).clipShape(.rect(cornerRadius: Radius.md)).foregroundStyle(colors.text)
                    }

                    // Quick amount buttons
                    HStack(spacing: Spacing.sm) {
                        ForEach([100, 500, 1000, 5000], id: \.self) { amount in
                            Button { Haptics.light(); investAmount = "\(amount)" } label: {
                                Text("$\(amount)").font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(colors.primary).padding(.horizontal, 12).padding(.vertical, 8)
                                    .background(colors.primary.opacity(0.08)).clipShape(.rect(cornerRadius: Radius.md))
                            }.buttonStyle(PressableButtonStyle())
                        }
                    }

                    // Projected returns
                    if let amount = Double(investAmount), amount > 0 {
                        CardView {
                            VStack(spacing: Spacing.sm) {
                                Text("Projected Returns").font(.system(size: 14, weight: .bold)).foregroundStyle(colors.text)
                                HStack { Text("After 1 year:").font(.system(size: 13)).foregroundStyle(colors.textSecondary); Spacer(); Text(Format.compactCurrency(amount * (1 + pool.projectedROI))).font(.system(size: 16, weight: .bold)).foregroundStyle(colors.success) }
                                HStack { Text("Profit:").font(.system(size: 13)).foregroundStyle(colors.textSecondary); Spacer(); Text("+\(Format.compactCurrency(amount * pool.projectedROI))").font(.system(size: 16, weight: .bold)).foregroundStyle(colors.success) }
                            }
                        }
                    }

                    Button {
                        Haptics.success()
                        game.burnTokens(Double(investAmount) ?? 0, reason: "Invested in \(pool.poolName)")
                        dismiss()
                    } label: {
                        HStack(spacing: 6) { Image(systemName: "checkmark.circle.fill"); Text("Confirm Investment") }.font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 16).background(colors.primary).clipShape(.rect(cornerRadius: Radius.md))
                    }.buttonStyle(PressableButtonStyle()).disabled(Double(investAmount) == nil || Double(investAmount) ?? 0 < pool.minInvestment)
                }
                .padding(Spacing.lg)
            }
            .background(colors.background)
            .navigationTitle("Invest")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Cancel") { dismiss() } } }
        }
    }

    private func infoRow(_ label: String, _ value: String, _ colors: AppTheme) -> some View {
        HStack { Text(label).font(.system(size: 13)).foregroundStyle(colors.textSecondary); Spacer(); Text(value).font(.system(size: 14, weight: .semibold)).foregroundStyle(colors.text) }
    }
}
