//
//  ProviderDetailView.swift
//  WesternCreditInstitute
//

import SwiftUI

struct ProviderDetailView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store
    @Environment(\.openURL) private var openURL

    let provider: CSOProvider

    private static let platformFee: Double = 25

    @State private var showPaymentSheet = false
    @State private var showReviewSheet = false
    @State private var isProcessing = false
    @State private var showPaymentSuccess = false

    private var hasAccess: Bool { store.hasAccess(to: provider.id) }
    private var reviews: [CSOReview] { store.reviews(for: provider.id) }

    var body: some View {
        let colors = theme.colors

        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                profileHeader
                statsRow
                aboutSection
                specialtiesSection
                contactSection
                reviewsSection
            }
            .padding(.horizontal, Spacing.md)
            .padding(.top, Spacing.md)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(colors.background)
        .safeAreaInset(edge: .bottom) { actionBar }
        .navigationTitle(provider.name)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showPaymentSheet) { paymentSheet }
        .sheet(isPresented: $showReviewSheet) {
            WriteReviewSheet(providerId: provider.id, providerName: provider.name)
        }
        .alert("Payment Successful!", isPresented: $showPaymentSuccess) {
            Button("View Contact Info") {}
        } message: {
            Text("You now have access to \(provider.name)'s contact information. A receipt has been sent to your email.")
        }
    }

    // MARK: - Header

    private var profileHeader: some View {
        VStack(spacing: Spacing.md) {
            AvatarView(urlString: provider.avatarURL, initials: provider.initials, size: 104, borderColor: theme.colors.secondary)

            VStack(spacing: 4) {
                HStack(spacing: 6) {
                    Text(provider.name)
                        .font(.system(size: 24, weight: .heavy))
                        .foregroundStyle(theme.colors.text)
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(theme.colors.info)
                }

                HStack(spacing: 4) {
                    Image(systemName: "mappin.and.ellipse").font(.system(size: 11))
                    Text(provider.location).font(.system(size: 13, weight: .medium))
                }
                .foregroundStyle(theme.colors.textSecondary)

                BadgeView(text: "Certified CSO since \(provider.certifiedAt)", variant: .success, symbol: "rosette", compact: false)
                    .padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.md)
    }

    private var statsRow: some View {
        HStack(spacing: Spacing.sm) {
            statBox(value: Format.decimal(provider.rating), label: "Rating", symbol: "star.fill", tint: Color(hex: "#F59E0B"))
            statBox(value: "\(provider.reviewCount)", label: "Reviews", symbol: "text.bubble.fill", tint: theme.colors.info)
            statBox(value: "\(provider.yearsExperience)", label: "Years", symbol: "clock.fill", tint: theme.colors.secondary)
        }
    }

    private func statBox(value: String, label: String, symbol: String, tint: Color) -> some View {
        VStack(spacing: 5) {
            Image(systemName: symbol)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(tint)
            Text(value)
                .font(.system(size: 18, weight: .heavy))
                .foregroundStyle(theme.colors.text)
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(theme.colors.textLight)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.md)
        .background(theme.colors.surface)
        .clipShape(.rect(cornerRadius: Radius.md))
        .shadow(color: theme.colors.shadow, radius: 8, y: 3)
    }

    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            SectionHeader(title: "About", symbol: "person.text.rectangle.fill", symbolTint: theme.colors.primary)
            Text(provider.bio)
                .font(.system(size: 15))
                .lineSpacing(4)
                .foregroundStyle(theme.colors.textSecondary)
        }
    }

    private var specialtiesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "Specialties", symbol: "checkmark.seal.fill", symbolTint: theme.colors.secondary)

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: Spacing.sm)], alignment: .leading, spacing: Spacing.sm) {
                ForEach(provider.specialties, id: \.self) { specialty in
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(theme.colors.success)
                        Text(specialty)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(theme.colors.textSecondary)
                        Spacer(minLength: 0)
                    }
                }
            }
        }
    }

    private var contactSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "Contact", symbol: hasAccess ? "lock.open.fill" : "lock.fill", symbolTint: hasAccess ? theme.colors.success : theme.colors.warning)

            if hasAccess {
                VStack(spacing: Spacing.sm) {
                    contactRow(symbol: "phone.fill", label: provider.phone, tint: theme.colors.success) {
                        openURL(URL(string: "tel:\(provider.phone.filter(\.isNumber))") ?? URL(string: "https://westerncreditinstitute.com")!)
                    }
                    contactRow(symbol: "envelope.fill", label: provider.email, tint: theme.colors.info) {
                        openURL(URL(string: "mailto:\(provider.email)") ?? URL(string: "https://westerncreditinstitute.com")!)
                    }
                }
            } else {
                CardView(variant: .outlined) {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "lock.fill")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(theme.colors.warning)
                                .frame(width: 42, height: 42)
                                .background(theme.colors.warning.opacity(0.14))
                                .clipShape(.circle)

                            VStack(alignment: .leading, spacing: 2) {
                                Text("Contact info locked")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundStyle(theme.colors.text)
                                Text("Pay the consultation fee to unlock phone and email.")
                                    .font(.system(size: 12))
                                    .foregroundStyle(theme.colors.textSecondary)
                            }
                        }
                    }
                }
            }
        }
    }

    private func contactRow(symbol: String, label: String, tint: Color, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.light()
            action()
        } label: {
            CardView(padding: Spacing.md) {
                HStack(spacing: Spacing.md) {
                    Image(systemName: symbol)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(tint)
                        .frame(width: 42, height: 42)
                        .background(tint.opacity(0.13))
                        .clipShape(.circle)

                    Text(label)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(theme.colors.text)

                    Spacer(minLength: 0)

                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(theme.colors.textLight)
                }
            }
        }
        .buttonStyle(PressableButtonStyle())
    }

    private var reviewsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "Reviews", symbol: "star.bubble.fill", symbolTint: Color(hex: "#F59E0B")) {
                Button("Write one") {
                    Haptics.light()
                    showReviewSheet = true
                }
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(theme.colors.primary)
            }

            if reviews.isEmpty {
                EmptyStateView(
                    symbol: "star",
                    title: "No reviews yet",
                    message: "Be the first to share your experience with \(provider.name)."
                )
            } else {
                VStack(spacing: Spacing.sm) {
                    ForEach(reviews) { review in
                        CardView(padding: Spacing.md) {
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                HStack(spacing: Spacing.sm) {
                                    AvatarView(urlString: review.reviewerAvatarURL, initials: String(review.reviewerName.prefix(1)), size: 38)

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(review.reviewerName)
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundStyle(theme.colors.text)
                                        HStack(spacing: 2) {
                                            ForEach(1...5, id: \.self) { star in
                                                Image(systemName: star <= review.rating ? "star.fill" : "star")
                                                    .font(.system(size: 9))
                                                    .foregroundStyle(Color(hex: "#F59E0B"))
                                            }
                                        }
                                    }

                                    Spacer(minLength: 0)

                                    Text(Format.shortDate(review.createdAt))
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundStyle(theme.colors.textLight)
                                }

                                Text(review.comment)
                                    .font(.system(size: 13))
                                    .foregroundStyle(theme.colors.textSecondary)
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Action bar

    private var actionBar: some View {
        HStack(spacing: Spacing.md) {
            VStack(alignment: .leading, spacing: 1) {
                Text(Format.currency(provider.consultationFee))
                    .font(.system(size: 21, weight: .heavy))
                    .foregroundStyle(theme.colors.text)
                Text("one-time consultation")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(theme.colors.textLight)
            }

            Spacer(minLength: 0)

            Button {
                Haptics.medium()
                if hasAccess {
                    showReviewSheet = true
                } else {
                    showPaymentSheet = true
                }
            } label: {
                Text(hasAccess ? "Leave a Review" : "Hire Now")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, 14)
                    .background(
                        LinearGradient(
                            colors: hasAccess ? theme.colors.gradientSecondary : theme.colors.gradientPrimary,
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .clipShape(.capsule)
            }
            .buttonStyle(PressableButtonStyle())
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.md)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) {
            Rectangle().fill(theme.colors.border).frame(height: 0.5)
        }
    }

    // MARK: - Payment sheet

    private var paymentSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    HStack(spacing: Spacing.md) {
                        AvatarView(urlString: provider.avatarURL, initials: provider.initials, size: 58)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(provider.name)
                                .font(.system(size: 17, weight: .bold))
                                .foregroundStyle(theme.colors.text)
                            Text(provider.specialties.joined(separator: " • "))
                                .font(.system(size: 12))
                                .foregroundStyle(theme.colors.textSecondary)
                                .lineLimit(2)
                        }
                        Spacer(minLength: 0)
                    }

                    CardView {
                        VStack(spacing: Spacing.sm) {
                            lineItem("Consultation fee", Format.currency(provider.consultationFee - Self.platformFee))
                            lineItem("Platform fee", Format.currency(Self.platformFee))
                            Divider().overlay(theme.colors.border)
                            HStack {
                                Text("Total due today")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundStyle(theme.colors.text)
                                Spacer()
                                Text(Format.currency(provider.consultationFee))
                                    .font(.system(size: 19, weight: .heavy))
                                    .foregroundStyle(theme.colors.primary)
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("What you get")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(theme.colors.text)

                        ForEach([
                            "Direct phone and email access",
                            "One-on-one consultation session",
                            "Personalised credit action plan",
                            "Emailed receipt for your records",
                        ], id: \.self) { item in
                            HStack(spacing: Spacing.sm) {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 13))
                                    .foregroundStyle(theme.colors.success)
                                Text(item)
                                    .font(.system(size: 13))
                                    .foregroundStyle(theme.colors.textSecondary)
                            }
                        }
                    }

                    Button {
                        Haptics.medium()
                        isProcessing = true
                        Task {
                            try? await Task.sleep(for: .milliseconds(1200))
                            store.grantAccess(to: provider.id)
                            isProcessing = false
                            Haptics.success()
                            showPaymentSheet = false
                            showPaymentSuccess = true
                        }
                    } label: {
                        HStack(spacing: Spacing.sm) {
                            if isProcessing { ProgressView().tint(.white) }
                            Text(isProcessing ? "Processing..." : "Pay \(Format.currency(provider.consultationFee))")
                                .font(.system(size: 16, weight: .bold))
                        }
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                        .background(
                            LinearGradient(
                                colors: theme.colors.gradientSecondary,
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .clipShape(.rect(cornerRadius: Radius.md))
                    }
                    .buttonStyle(PressableButtonStyle())
                    .disabled(isProcessing)
                }
                .padding(Spacing.md)
            }
            .background(theme.colors.background)
            .navigationTitle("Confirm & Pay")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { showPaymentSheet = false }
                }
            }
        }
        .presentationDetents([.large])
        .presentationContentInteraction(.scrolls)
    }

    private func lineItem(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 14))
                .foregroundStyle(theme.colors.textSecondary)
            Spacer()
            Text(value)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(theme.colors.text)
        }
    }
}

// MARK: - Review sheet

struct WriteReviewSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    let providerId: String
    let providerName: String

    @State private var rating: Int = 5
    @State private var comment: String = ""
    @State private var isSubmitting = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Your rating")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(theme.colors.text)

                        HStack(spacing: Spacing.sm) {
                            ForEach(1...5, id: \.self) { star in
                                Button {
                                    Haptics.selection()
                                    withAnimation(.spring(response: 0.28, dampingFraction: 0.6)) { rating = star }
                                } label: {
                                    Image(systemName: star <= rating ? "star.fill" : "star")
                                        .font(.system(size: 30))
                                        .foregroundStyle(Color(hex: "#F59E0B"))
                                        .scaleEffect(star == rating ? 1.14 : 1)
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("\(star) star\(star == 1 ? "" : "s")")
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Your review")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(theme.colors.text)

                        TextEditor(text: $comment)
                            .font(.system(size: 15))
                            .foregroundStyle(theme.colors.text)
                            .scrollContentBackground(.hidden)
                            .frame(height: 150)
                            .padding(Spacing.sm)
                            .background(theme.colors.surface)
                            .clipShape(.rect(cornerRadius: Radius.md))
                            .overlay {
                                RoundedRectangle(cornerRadius: Radius.md)
                                    .stroke(theme.colors.border, lineWidth: 1)
                            }
                            .overlay(alignment: .topLeading) {
                                if comment.isEmpty {
                                    Text("Share how \(providerName) helped you...")
                                        .font(.system(size: 15))
                                        .foregroundStyle(theme.colors.textLight)
                                        .padding(.horizontal, 13)
                                        .padding(.vertical, 16)
                                        .allowsHitTesting(false)
                                }
                            }
                    }

                    Button {
                        Haptics.medium()
                        isSubmitting = true
                        Task {
                            try? await Task.sleep(for: .milliseconds(800))
                            store.addReview(providerId: providerId, rating: rating, comment: comment)
                            isSubmitting = false
                            Haptics.success()
                            dismiss()
                        }
                    } label: {
                        HStack(spacing: Spacing.sm) {
                            if isSubmitting { ProgressView().tint(.white) }
                            Text(isSubmitting ? "Submitting..." : "Submit Review")
                                .font(.system(size: 16, weight: .bold))
                        }
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                        .background(
                            LinearGradient(
                                colors: theme.colors.gradientPrimary,
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .clipShape(.rect(cornerRadius: Radius.md))
                        .opacity(comment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.5 : 1)
                    }
                    .buttonStyle(PressableButtonStyle())
                    .disabled(comment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSubmitting)
                }
                .padding(Spacing.md)
            }
            .background(theme.colors.background)
            .navigationTitle("Write a Review")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .presentationDetents([.large])
        .presentationContentInteraction(.scrolls)
    }
}
