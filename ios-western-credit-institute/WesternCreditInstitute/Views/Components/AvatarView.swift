//
//  AvatarView.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Remote avatar with initials fallback, matching the shared `Avatar` component.
struct AvatarView: View {
    let urlString: String
    var initials: String = ""
    var size: CGFloat = 48
    var borderColor: Color?

    var body: some View {
        Circle()
            .fill(Color(hex: "#002B5C"))
            .frame(width: size, height: size)
            .overlay {
                Text(initials)
                    .font(.system(size: size * 0.36, weight: .bold))
                    .foregroundStyle(.white)
            }
            .overlay {
                AsyncImage(url: URL(string: urlString)) { phase in
                    if let image = phase.image {
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    }
                }
                .allowsHitTesting(false)
            }
            .clipShape(.circle)
            .overlay {
                if let borderColor {
                    Circle().stroke(borderColor, lineWidth: 2.5)
                }
            }
    }
}
