//
//  PromoLiveVideoCard.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Shows which HeyGen video the home page "Videos" section is currently
/// playing. The embed itself is configured from the Promo Manager in the app
/// being previewed; this card mirrors that live value.
struct PromoLiveVideoCard: View {
    @Environment(ThemeManager.self) private var theme

    @State private var video: HomeFeaturedVideo?
    @State private var isLoading = true

    private var embedId: String {
        video?.heygenEmbedId ?? FeaturedVideoService.shared.cachedEmbedId
    }

    var body: some View {
        let colors = theme.colors

        CardView(padding: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 13, weight: .semibold))
                    Text("LIVE ON HOME")
                        .font(.system(size: 11, weight: .heavy))
                        .kerning(0.6)
                }
                .foregroundStyle(Color(hex: "#2DD4BF"))

                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    Text(video?.title ?? "Default video")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(colors.text)

                    Text(embedId)
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundStyle(colors.textLight)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }

                Text("Change this video from Admin \u{2192} Promo.")
                    .font(.system(size: 12))
                    .foregroundStyle(colors.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .task {
            video = await FeaturedVideoService.shared.fetchHomeVideo()
            isLoading = false
        }
    }
}
