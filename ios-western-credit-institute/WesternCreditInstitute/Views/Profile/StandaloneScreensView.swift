//
//  StandaloneScreensView.swift
//  WesternCreditInstitute
//

import SwiftUI

// MARK: - Certificates View

/// Digital certificates for completed courses — view, share, and print.
struct CertificatesView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store

    private let certificateMap: [(courseId: String, title: String, course: String, prefix: String)] = [
        ("3", "Credit Repair Specialist", "ACE-1: Advanced Credit Repair", "ACE1"),
        ("4", "Advanced Credit Strategies", "ACE-2: Advanced Credit Building", "ACE2"),
        ("5", "Business Credit Professional", "ACE-3: Advanced Business Credit", "ACE3"),
        ("1", "CSO Certified Professional", "CSO Certification Program", "CSO"),
    ]

    var body: some View {
        let colors = theme.colors
        let earned = certificateMap.filter { store.progress(for: $0.courseId) >= 100 }
        let available = certificateMap.filter { store.progress(for: $0.courseId) < 100 }

        ScrollView {
            VStack(spacing: Spacing.md) {
                if earned.isEmpty {
                    EmptyStateView(symbol: "rosette", title: "No Certificates Yet", message: "Complete a course with 100% progress to earn your certificate")
                } else {
                    SectionHeader(title: "Earned Certificates", symbol: "award.fill", symbolTint: colors.warning)
                    ForEach(earned, id: \.courseId) { cert in
                        certificateCard(cert: cert, earned: true, colors: colors)
                    }
                }

                if !available.isEmpty {
                    SectionHeader(title: "Available Certificates", symbol: "lock.fill", symbolTint: colors.textLight)
                    ForEach(available, id: \.courseId) { cert in
                        certificateCard(cert: cert, earned: false, colors: colors)
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Certificates")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func certificateCard(cert: (courseId: String, title: String, course: String, prefix: String), earned: Bool, colors: AppTheme) -> some View {
        let credentialId = "\(cert.prefix)-\(Calendar.current.component(.year, from: Date()))-\(String(format: "%06d", abs(cert.courseId.hashValue % 900000) + 100000))"
        return CardView {
            VStack(spacing: Spacing.md) {
                // Certificate header
                VStack(spacing: Spacing.sm) {
                    Image(systemName: "award.fill")
                        .font(.system(size: 32, weight: .semibold))
                        .foregroundStyle(earned ? colors.warning : colors.textLight)
                        .frame(width: 64, height: 64)
                        .background((earned ? colors.warning : colors.textLight).opacity(0.12))
                        .clipShape(.circle)

                    Text(cert.title).font(.system(size: 18, weight: .heavy)).foregroundStyle(colors.text)
                    Text(cert.course).font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                }
                .frame(maxWidth: .infinity)

                if earned {
                    VStack(spacing: Spacing.xs) {
                        infoRow("Recipient", store.user.name, colors)
                        infoRow("Credential ID", credentialId, colors)
                        infoRow("Date Earned", Format.mediumDate(Date().addingTimeInterval(-86400 * 30)), colors)
                        infoRow("Status", "Active", colors)
                    }

                    HStack(spacing: Spacing.sm) {
                        Button {
                            UIPasteboard.general.string = credentialId
                            Haptics.success()
                        } label: {
                            HStack(spacing: 4) { Image(systemName: "doc.on.doc.fill"); Text("Copy ID") }.font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(colors.primary).frame(maxWidth: .infinity).padding(.vertical, 10)
                                .background(colors.primary.opacity(0.08)).clipShape(.rect(cornerRadius: Radius.md))
                        }.buttonStyle(PressableButtonStyle())

                        Button {
                            Haptics.medium()
                            // In production: generate PDF and share
                        } label: {
                            HStack(spacing: 4) { Image(systemName: "square.and.arrow.up"); Text("Share") }.font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 10)
                                .background(colors.primary).clipShape(.rect(cornerRadius: Radius.md))
                        }.buttonStyle(PressableButtonStyle())
                    }
                } else {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "lock.fill").foregroundStyle(colors.textLight)
                        Text("Complete with 100% progress to earn").font(.system(size: 13, weight: .medium)).foregroundStyle(colors.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                    .background(colors.surfaceAlt)
                    .clipShape(.rect(cornerRadius: Radius.md))

                    ProgressBarView(progress: store.progress(for: cert.courseId), showLabel: true)
                }
            }
        }
    }

    private func infoRow(_ label: String, _ value: String, _ colors: AppTheme) -> some View {
        HStack {
            Text(label).font(.system(size: 13)).foregroundStyle(colors.textSecondary)
            Spacer()
            Text(value).font(.system(size: 13, weight: .semibold)).foregroundStyle(colors.text)
        }
    }
}

// MARK: - Personal Info View

/// Edit personal information with driver's license validation per state.
struct PersonalInfoView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store

    @State private var name = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var address = ""
    @State private var city = ""
    @State private var state = "CA"
    @State private var zipCode = ""
    @State private var driversLicense = ""
    @State private var showSavedAlert = false

    private let usStates: [(code: String, name: String)] = [
        ("AL","Alabama"),("AK","Alaska"),("AZ","Arizona"),("AR","Arkansas"),("CA","California"),
        ("CO","Colorado"),("CT","Connecticut"),("DE","Delaware"),("FL","Florida"),("GA","Georgia"),
        ("HI","Hawaii"),("ID","Idaho"),("IL","Illinois"),("IN","Indiana"),("IA","Iowa"),
        ("KS","Kansas"),("KY","Kentucky"),("LA","Louisiana"),("ME","Maine"),("MD","Maryland"),
        ("MA","Massachusetts"),("MI","Michigan"),("MN","Minnesota"),("MS","Mississippi"),("MO","Missouri"),
        ("MT","Montana"),("NE","Nebraska"),("NV","Nevada"),("NH","New Hampshire"),("NJ","New Jersey"),
        ("NM","New Mexico"),("NY","New York"),("NC","North Carolina"),("ND","North Dakota"),("OH","Ohio"),
        ("OK","Oklahoma"),("OR","Oregon"),("PA","Pennsylvania"),("RI","Rhode Island"),("SC","South Carolina"),
        ("SD","South Dakota"),("TN","Tennessee"),("TX","Texas"),("UT","Utah"),("VT","Vermont"),
        ("VA","Virginia"),("WA","Washington"),("WV","West Virginia"),("WI","Wisconsin"),("WY","Wyoming"),
    ]

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.md) {
                // Avatar
                VStack(spacing: Spacing.sm) {
                    AvatarView(urlString: store.user.avatarURL, initials: store.user.initials, size: 80, borderColor: colors.border)
                    Button { Haptics.light() } label: {
                        HStack(spacing: 4) { Image(systemName: "camera.fill"); Text("Change Photo") }.font(.system(size: 13, weight: .semibold)).foregroundStyle(colors.primary)
                    }.buttonStyle(.plain)
                }
                .padding(.vertical, Spacing.lg)

                SectionHeader(title: "Personal Information", symbol: "person.fill")
                inputField("Full Name", text: $name, symbol: "person.fill")
                inputField("Email", text: $email, symbol: "envelope.fill", keyboard: .emailAddress)
                inputField("Phone", text: $phone, symbol: "phone.fill", keyboard: .phonePad)

                SectionHeader(title: "Address", symbol: "mappin.and.ellipse")
                inputField("Street Address", text: $address, symbol: "house.fill")
                inputField("City", text: $city, symbol: "building.2.fill")

                // State picker
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("State").font(.system(size: 14, weight: .semibold)).foregroundStyle(colors.text)
                    Menu { ForEach(usStates, id: \.code) { s in Button(s.name) { state = s.code; Haptics.light() } } } label: {
                        HStack { Image(systemName: "map.fill").foregroundStyle(colors.textSecondary); Text(usStates.first { $0.code == state }?.name ?? "Select State").foregroundStyle(colors.text); Spacer(); Image(systemName: "chevron.down").foregroundStyle(colors.textSecondary) }
                            .padding(14).background(colors.surfaceAlt).clipShape(.rect(cornerRadius: Radius.md))
                    }
                }

                inputField("ZIP Code", text: $zipCode, symbol: "location.fill", keyboard: .numberPad)

                SectionHeader(title: "Driver's License", symbol: "creditcard.fill")
                inputField("Driver's License Number", text: $driversLicense, symbol: "creditcard.fill")
                    .autocapitalization(.allCharacters)

                // Save button
                Button {
                    Haptics.success()
                    showSavedAlert = true
                } label: {
                    HStack(spacing: 6) { Image(systemName: "checkmark.circle.fill"); Text("Save Changes") }.font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 16)
                        .background(colors.primary).clipShape(.rect(cornerRadius: Radius.md))
                }.buttonStyle(PressableButtonStyle())
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Personal Info")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Saved!", isPresented: $showSavedAlert) {
            Button("OK") {}
        } message: { Text("Your personal information has been updated successfully.") }
        .onAppear {
            name = store.user.name
            email = store.user.email
            phone = store.user.phone ?? ""
        }
    }

    private func inputField(_ label: String, text: Binding<String>, symbol: String, keyboard: UIKeyboardType = .default) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(label).font(.system(size: 14, weight: .semibold)).foregroundStyle(theme.colors.text)
            HStack(spacing: Spacing.sm) {
                Image(systemName: symbol).foregroundStyle(theme.colors.textSecondary)
                TextField("", text: text).keyboardType(keyboard).foregroundStyle(theme.colors.text)
            }
            .padding(14).background(theme.colors.surfaceAlt).clipShape(.rect(cornerRadius: Radius.md))
        }
    }
}

// MARK: - Payment Methods View

/// Manage saved payment methods (cards and bank accounts).
struct PaymentMethodsView: View {
    @Environment(ThemeManager.self) private var theme

    @State private var methods: [PaymentMethod] = [
        PaymentMethod(id: "1", type: .card, last4: "4242", brand: "Visa", isDefault: true, expiryDate: "12/26"),
        PaymentMethod(id: "2", type: .card, last4: "5555", brand: "Mastercard", isDefault: false, expiryDate: "08/25"),
        PaymentMethod(id: "3", type: .bank, last4: "6789", bankName: "Chase Bank", isDefault: false),
    ]
    @State private var showDeleteAlert = false
    @State private var pendingDeleteId: String?

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.md) {
                ForEach(methods, id: \.id) { method in
                    CardView {
                        HStack(spacing: Spacing.md) {
                            Image(systemName: method.type == .card ? "creditcard.fill" : "building.columns.fill")
                                .font(.system(size: 20))
                                .foregroundStyle(colors.primary)
                                .frame(width: 48, height: 48)
                                .background(colors.primary.opacity(0.10))
                                .clipShape(.rect(cornerRadius: Radius.md))

                            VStack(alignment: .leading, spacing: 2) {
                                if method.type == .card {
                                    Text("\(method.brand ?? "Card") •••• \(method.last4)").font(.system(size: 15, weight: .semibold)).foregroundStyle(colors.text)
                                    if let expiry = method.expiryDate { Text("Expires \(expiry)").font(.system(size: 12)).foregroundStyle(colors.textSecondary) }
                                } else {
                                    Text("\(method.bankName ?? "Bank") •••• \(method.last4)").font(.system(size: 15, weight: .semibold)).foregroundStyle(colors.text)
                                    Text("Bank Account").font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                                }
                            }

                            Spacer()

                            if method.isDefault {
                                BadgeView(text: "Default", variant: .success, symbol: "checkmark.circle.fill")
                            } else {
                                Button { setDefault(method.id) } label: {
                                    Text("Set Default").font(.system(size: 12, weight: .semibold)).foregroundStyle(colors.primary)
                                }.buttonStyle(.plain)
                            }

                            Button {
                                pendingDeleteId = method.id
                                showDeleteAlert = true
                                Haptics.medium()
                            } label: {
                                Image(systemName: "trash.fill").foregroundStyle(colors.error)
                            }.buttonStyle(.plain)
                        }
                    }
                }

                Button {
                    Haptics.light()
                } label: {
                    HStack(spacing: 6) { Image(systemName: "plus.circle.fill"); Text("Add Payment Method") }.font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 14)
                        .background(colors.primary).clipShape(.rect(cornerRadius: Radius.md))
                }.buttonStyle(PressableButtonStyle())
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Payment Methods")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Remove Payment Method", isPresented: $showDeleteAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Remove", role: .destructive) {
                if let id = pendingDeleteId { methods.removeAll { $0.id == id } }
            }
        } message: { Text("Are you sure you want to remove this payment method?") }
    }

    private func setDefault(_ id: String) {
        Haptics.medium()
        for i in methods.indices {
            methods[i].isDefault = methods[i].id == id
        }
    }
}

struct PaymentMethod: Identifiable, Hashable {
    let id: String
    let type: PaymentMethodType
    let last4: String
    var brand: String?
    var bankName: String?
    var isDefault: Bool
    var expiryDate: String?
}

enum PaymentMethodType: String, Hashable {
    case card
    case bank
}

// MARK: - Challenges View

/// Gamified challenges with rewards and progress tracking.
struct ChallengesView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(GameStore.self) private var game

    private var challenges: [Challenge] {
        [
            Challenge(id: "ch1", title: "Score Booster", description: "Increase your credit score by 50 points", symbol: "chart.line.uptrend.xyaxis", color: "#10B981", reward: 500, target: 50, current: Double(max(0, game.creditScores.composite - 620)), type: .score),
            Challenge(id: "ch2", title: "Debt Eliminator", description: "Pay off $5,000 in debt", symbol: "trending.down", color: "#EF4444", reward: 300, target: 5000, current: min(5000, max(0, 10000 - game.totalDebt)), type: .debt),
            Challenge(id: "ch3", title: "Saver", description: "Save $10,000 in your savings account", symbol: "piggybank.fill", color: "#3B82F6", reward: 250, target: 10000, current: min(10000, game.savingsBalance), type: .savings),
            Challenge(id: "ch4", title: "Credit Builder", description: "Open 3 credit accounts", symbol: "creditcard.fill", color: "#8B5CF6", reward: 200, target: 3, current: min(3, Double(game.creditAccounts.count)), type: .accounts),
            Challenge(id: "ch5", title: "Property Magnate", description: "Own 2 properties", symbol: "building.2.fill", color: "#0EA5E9", reward: 750, target: 2, current: min(2, Double(game.ownedProperties.count)), type: .properties),
            Challenge(id: "ch6", title: "Perfect Payment", description: "Make 12 consecutive on-time payments", symbol: "checkmark.seal.fill", color: "#10B981", reward: 400, target: 12, current: min(12, Double(game.consecutiveOnTimePayments)), type: .payments),
        ]
    }

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.md) {
                // Header stats
                HStack(spacing: Spacing.md) {
                    challengeStat("\(challenges.filter { $0.progress >= 1 }.count)", "Completed", "trophy.fill", colors.warning)
                    challengeStat("\(challenges.filter { $0.progress > 0 && $0.progress < 1 }.count)", "In Progress", "clock.fill", colors.info)
                    challengeStat("\(Format.compactCurrency(challenges.filter { $0.progress >= 1 }.reduce(0) { $0 + $1.reward }))", "Earned", "coins.fill", colors.success)
                }

                ForEach(challenges, id: \.id) { challenge in
                    challengeCard(challenge, colors: colors)
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Challenges")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func challengeCard(_ challenge: Challenge, colors: AppTheme) -> some View {
        let color = Color(hex: challenge.color)
        let isComplete = challenge.progress >= 1
        return CardView {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(spacing: Spacing.md) {
                    Image(systemName: challenge.symbol).font(.system(size: 22, weight: .semibold)).foregroundStyle(isComplete ? color : color.opacity(0.6))
                        .frame(width: 48, height: 48).background(color.opacity(0.12)).clipShape(.rect(cornerRadius: Radius.md))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(challenge.title).font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                        Text(challenge.description).font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                    }
                    Spacer()
                    if isComplete {
                        Image(systemName: "checkmark.circle.fill").font(.system(size: 24)).foregroundStyle(colors.success)
                    }
                }

                ProgressBarView(progress: Int(challenge.progress * 100), showLabel: false)
                    .tint(color)

                HStack {
                    Text("\(Int(challenge.current)) / \(Int(challenge.target))").font(.system(size: 12, weight: .semibold)).foregroundStyle(colors.textSecondary)
                    Spacer()
                    HStack(spacing: 4) {
                        Image(systemName: "coins.fill").font(.system(size: 11)).foregroundStyle(color)
                        Text("+\(Int(challenge.reward)) MUSO").font(.system(size: 12, weight: .bold)).foregroundStyle(color)
                    }
                }
            }
        }
    }

    private func challengeStat(_ value: String, _ label: String, _ symbol: String, _ color: Color) -> some View {
        CardView { VStack(spacing: 4) { Image(systemName: symbol).font(.system(size: 18)).foregroundStyle(color); Text(value).font(.system(size: 20, weight: .bold)).foregroundStyle(theme.colors.text); Text(label).font(.system(size: 11)).foregroundStyle(theme.colors.textSecondary) }.frame(maxWidth: .infinity) }
    }
}

struct Challenge: Identifiable, Hashable {
    let id: String
    let title: String
    let description: String
    let symbol: String
    let color: String
    let reward: Double
    let target: Double
    let current: Double
    let type: ChallengeType

    var progress: Double { min(1, target > 0 ? current / target : 0) }
}

enum ChallengeType: String, Hashable {
    case score, debt, savings, accounts, properties, payments
}
