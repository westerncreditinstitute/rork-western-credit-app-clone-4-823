//
//  AuthView.swift
//  WesternCreditInstitute
//

import SwiftUI

/// Sign-in and registration, mirroring the Expo `register` screen: one screen
/// with a mode switch rather than two separate routes.
struct AuthView: View {
    /// Which form is showing.
    private enum Mode {
        case register
        case login

        var title: String {
            switch self {
            case .register: return "Create Your Account"
            case .login: return "Welcome Back"
            }
        }

        var subtitle: String {
            switch self {
            case .register: return "Start building your credit knowledge and earning with WCI."
            case .login: return "Sign in to reach your agent, courses and disputes."
            }
        }

        var callToAction: String {
            switch self {
            case .register: return "Create Account"
            case .login: return "Sign In"
            }
        }
    }

    @Environment(ThemeManager.self) private var theme
    @Environment(AuthStore.self) private var auth

    @State private var mode: Mode = .login
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var phone = ""
    @State private var promoCode = ""
    @State private var desiredTier: SubscriptionTier = .free
    @State private var showPassword = false

    @FocusState private var focusedField: Field?

    private enum Field: Hashable {
        case name, email, password, confirmPassword, phone, promo
    }

    var body: some View {
        let colors = theme.colors

        ZStack {
            backdrop

            ScrollView {
                VStack(spacing: Spacing.lg) {
                    header
                    formCard
                }
                .padding(.horizontal, Spacing.md)
                .padding(.top, Spacing.xxl)
                .padding(.bottom, Spacing.xl)
            }
            .scrollIndicators(.hidden)
            .scrollDismissesKeyboard(.interactively)
        }
        .background(colors.background)
    }

    // MARK: - Backdrop

    private var backdrop: some View {
        let colors = theme.colors
        return LinearGradient(
            colors: colors.gradientHeader,
            startPoint: .top,
            endPoint: .bottom
        )
        .ignoresSafeArea()
        .overlay(alignment: .top) {
            // Soft emerald bloom so the navy field has depth rather than
            // reading as a flat block of color.
            Circle()
                .fill(colors.accent.opacity(0.22))
                .frame(width: 320, height: 320)
                .blur(radius: 90)
                .offset(y: -120)
                .allowsHitTesting(false)
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(spacing: Spacing.sm + 2) {
            ZStack {
                Circle()
                    .fill(.white.opacity(0.12))
                    .frame(width: 76, height: 76)

                Image(systemName: "building.columns.fill")
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundStyle(.white)
            }

            Text("Western Credit Institute")
                .font(.system(size: 21, weight: .bold))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            Text("Learn credit. Fix credit. Get paid.")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.white.opacity(0.75))
        }
        .padding(.bottom, Spacing.sm)
    }

    // MARK: - Form

    private var formCard: some View {
        let colors = theme.colors

        return VStack(alignment: .leading, spacing: Spacing.md) {
            VStack(alignment: .leading, spacing: 4) {
                Text(mode.title)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(colors.text)

                Text(mode.subtitle)
                    .font(.system(size: 13))
                    .foregroundStyle(colors.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if let notice = auth.expiryNotice {
                banner(notice, tone: .warning)
            }

            if let error = auth.errorMessage {
                banner(error, tone: .error)
            }

            if mode == .register {
                field(
                    "Full Name",
                    text: $name,
                    symbol: "person.fill",
                    field: .name,
                    contentType: .name
                )
            }

            field(
                "Email Address",
                text: $email,
                symbol: "envelope.fill",
                field: .email,
                contentType: .emailAddress,
                keyboard: .emailAddress
            )

            passwordField

            if mode == .register {
                field(
                    "Confirm Password",
                    text: $confirmPassword,
                    symbol: "lock.rotation",
                    field: .confirmPassword,
                    contentType: .newPassword,
                    secure: true
                )

                field(
                    "Phone (Optional)",
                    text: $phone,
                    symbol: "phone.fill",
                    field: .phone,
                    contentType: .telephoneNumber,
                    keyboard: .phonePad
                )

                field(
                    "Promo Code (Optional)",
                    text: $promoCode,
                    symbol: "tag.fill",
                    field: .promo,
                    autocapitalization: .characters
                )

                tierPicker
            }

            submitButton

            modeToggle
        }
        .padding(Spacing.lg)
        .background(colors.surface)
        .clipShape(.rect(cornerRadius: Radius.xl))
        .shadow(color: colors.shadow, radius: 24, y: 10)
    }

    private var passwordField: some View {
        let colors = theme.colors

        return HStack(spacing: Spacing.sm + 2) {
            Image(systemName: "lock.fill")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(colors.textLight)
                .frame(width: 20)

            Group {
                if showPassword {
                    TextField("Password", text: $password)
                } else {
                    SecureField("Password", text: $password)
                }
            }
            .font(.system(size: 15))
            .foregroundStyle(colors.text)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .textContentType(mode == .register ? .newPassword : .password)
            .focused($focusedField, equals: .password)
            .submitLabel(.done)

            Button {
                showPassword.toggle()
                Haptics.selection()
            } label: {
                Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(colors.textLight)
            }
            .accessibilityLabel(showPassword ? "Hide password" : "Show password")
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, 14)
        .background(colors.surfaceAlt)
        .clipShape(.rect(cornerRadius: Radius.md))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.md)
                .stroke(
                    focusedField == .password ? colors.primary.opacity(0.55) : colors.border,
                    lineWidth: 1
                )
        }
    }

    private func field(
        _ placeholder: String,
        text: Binding<String>,
        symbol: String,
        field: Field,
        contentType: UITextContentType? = nil,
        keyboard: UIKeyboardType = .default,
        autocapitalization: TextInputAutocapitalization = .never,
        secure: Bool = false
    ) -> some View {
        let colors = theme.colors

        return HStack(spacing: Spacing.sm + 2) {
            Image(systemName: symbol)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(colors.textLight)
                .frame(width: 20)

            Group {
                if secure {
                    SecureField(placeholder, text: text)
                } else {
                    TextField(placeholder, text: text)
                }
            }
            .font(.system(size: 15))
            .foregroundStyle(colors.text)
            .keyboardType(keyboard)
            .textContentType(contentType)
            .textInputAutocapitalization(autocapitalization)
            .autocorrectionDisabled()
            .focused($focusedField, equals: field)
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, 14)
        .background(colors.surfaceAlt)
        .clipShape(.rect(cornerRadius: Radius.md))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.md)
                .stroke(
                    focusedField == field ? colors.primary.opacity(0.55) : colors.border,
                    lineWidth: 1
                )
        }
    }

    private var tierPicker: some View {
        let colors = theme.colors

        return VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Choose your plan")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(colors.textSecondary)

            ForEach([SubscriptionTier.free, .ace1Student]) { tier in
                let selected = desiredTier == tier

                Button {
                    desiredTier = tier
                    Haptics.selection()
                } label: {
                    HStack(spacing: Spacing.sm + 2) {
                        Image(systemName: selected ? "largecircle.fill.circle" : "circle")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(selected ? colors.accent : colors.textLight)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(tier.label)
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(colors.text)

                            Text(tier == .free
                                 ? "Free — previews and weekly tips"
                                 : "$25/mo — full courses, AI agent and disputes")
                                .font(.system(size: 12))
                                .foregroundStyle(colors.textSecondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }

                        Spacer(minLength: 0)
                    }
                    .padding(Spacing.sm + 4)
                    .background(selected ? colors.accent.opacity(0.08) : colors.surfaceAlt)
                    .clipShape(.rect(cornerRadius: Radius.md))
                    .overlay {
                        RoundedRectangle(cornerRadius: Radius.md)
                            .stroke(selected ? colors.accent.opacity(0.5) : colors.border, lineWidth: 1)
                    }
                }
                .buttonStyle(PressableButtonStyle())
            }
        }
    }

    private var submitButton: some View {
        let colors = theme.colors

        return Button {
            focusedField = nil
            Haptics.medium()
            Task { await submit() }
        } label: {
            HStack(spacing: Spacing.sm) {
                if auth.isSubmitting {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(.white)
                }
                Text(auth.isSubmitting ? "Please wait…" : mode.callToAction)
                    .font(.system(size: 16, weight: .bold))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(
                LinearGradient(
                    colors: colors.gradientSecondary,
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .clipShape(.rect(cornerRadius: Radius.md))
        }
        .buttonStyle(PressableButtonStyle())
        .disabled(auth.isSubmitting)
        .opacity(auth.isSubmitting ? 0.75 : 1)
        .padding(.top, Spacing.xs)
    }

    private var modeToggle: some View {
        let colors = theme.colors

        return Button {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.85)) {
                mode = mode == .register ? .login : .register
            }
            auth.clearError()
            Haptics.selection()
        } label: {
            HStack(spacing: 4) {
                Text(mode == .register ? "Already have an account?" : "New to WCI?")
                    .foregroundStyle(colors.textSecondary)
                Text(mode == .register ? "Sign In" : "Create Account")
                    .foregroundStyle(colors.primary)
                    .fontWeight(.bold)
            }
            .font(.system(size: 13))
            .frame(maxWidth: .infinity)
        }
        .disabled(auth.isSubmitting)
    }

    // MARK: - Notices

    private enum Tone {
        case error
        case warning
    }

    private func banner(_ message: String, tone: Tone) -> some View {
        let colors = theme.colors
        let tint = tone == .error ? colors.error : colors.warning

        return HStack(alignment: .top, spacing: Spacing.sm) {
            Image(systemName: tone == .error ? "exclamationmark.triangle.fill" : "clock.arrow.circlepath")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(tint)

            Text(message)
                .font(.system(size: 13))
                .foregroundStyle(colors.text)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Spacing.sm + 2)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.1))
        .clipShape(.rect(cornerRadius: Radius.sm))
    }

    // MARK: - Actions

    private func submit() async {
        switch mode {
        case .login:
            let success = await auth.login(email: email, password: password)
            if success {
                Haptics.success()
                clearSensitiveFields()
            } else {
                Haptics.error()
            }
        case .register:
            let success = await auth.register(
                name: name,
                email: email,
                password: password,
                confirmPassword: confirmPassword,
                phone: phone,
                desiredTier: desiredTier,
                promoCode: promoCode
            )
            if success {
                Haptics.success()
                clearSensitiveFields()
            } else {
                Haptics.error()
            }
        }
    }

    /// Passwords never outlive a successful submit.
    private func clearSensitiveFields() {
        password = ""
        confirmPassword = ""
    }
}
