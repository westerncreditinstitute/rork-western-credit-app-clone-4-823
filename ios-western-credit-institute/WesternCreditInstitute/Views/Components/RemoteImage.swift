//
//  RemoteImage.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Fixed-height remote image that never overflows its layout frame.
struct RemoteImage: View {
    @Environment(ThemeManager.self) private var theme

    let urlString: String
    var height: CGFloat
    var cornerRadius: CGFloat = 0

    var body: some View {
        theme.colors.surfaceAlt
            .frame(height: height)
            .overlay {
                AsyncImage(url: URL(string: urlString)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .transition(.opacity)
                    case .failure:
                        Image(systemName: "photo")
                            .font(.system(size: 28))
                            .foregroundStyle(theme.colors.textLight)
                    case .empty:
                        ProgressView().tint(theme.colors.textLight)
                    @unknown default:
                        EmptyView()
                    }
                }
                .allowsHitTesting(false)
            }
            .clipShape(.rect(cornerRadius: cornerRadius))
    }
}
