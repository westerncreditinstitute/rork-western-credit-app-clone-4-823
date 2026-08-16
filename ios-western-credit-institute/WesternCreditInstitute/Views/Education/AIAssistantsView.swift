//
//  AIAssistantsView.swift
//  WesternCreditInstitute
//

import SwiftUI
import WebKit

// MARK: - AI Dispute Assistant

/// Guided dispute letter generator matching the Expo ai-dispute-assistant screen.
struct AIDisputeAssistantView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var currentStep = 0
    @State private var answers: [String: String] = [:]
    @State private var creditorName = ""
    @State private var accountNumber = ""
    @State private var generatedLetter = ""
    @State private var showLetter = false

    private let questions: [(id: String, title: String, options: [(value: String, label: String)])] = [
        ("disputeType", "Are you disputing Original Creditor or Debt Collector?", [
            ("originalCreditorOpen", "Original Creditor (Open Account)"),
            ("originalCreditorClosed", "Original Creditor (Closed Account)"),
            ("debtCollector", "Debt Collector"),
        ]),
        ("step1", "Did you dispute with the Credit Reporting Agency Online?", [
            ("yes", "Yes"), ("no", "No"),
        ]),
        ("step2", "Did you send a certified mail dispute to the information furnisher?", [
            ("yes", "Yes"), ("no", "No"),
        ]),
        ("step3", "Has it been more than 30 days since you sent the dispute?", [
            ("yes", "Yes"), ("no", "No"),
        ]),
        ("step4", "Did you receive a response from the credit bureau?", [
            ("yes", "Yes"), ("no", "No"),
        ]),
        ("step5", "Was the disputed item verified or removed?", [
            ("verified", "Verified (Still Reporting)"),
            ("removed", "Removed"),
            ("updated", "Updated/Modified"),
        ]),
    ]

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Hero header
                VStack(spacing: Spacing.md) {
                    Image(systemName: "doc.text.magnifyingglass.fill")
                        .font(.system(size: 32, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 72, height: 72)
                        .background(.white.opacity(0.15))
                        .clipShape(.circle)

                    Text("AI Dispute Assistant").font(.system(size: 24, weight: .heavy)).foregroundStyle(.white)
                    Text("Generate professional dispute letters in minutes").font(.system(size: 14)).foregroundStyle(.white.opacity(0.75))
                }
                .frame(maxWidth: .infinity)
                .padding(Spacing.lg)
                .background(LinearGradient(colors: theme.colors.gradientPrimary, startPoint: .topLeading, endPoint: .bottomTrailing))
                .clipShape(.rect(cornerRadius: Radius.xl))

                if currentStep < questions.count {
                    // Progress
                    ProgressView(value: Double(currentStep), total: Double(questions.count))
                        .tint(colors.primary)
                        .padding(.horizontal, Spacing.md)

                    // Question card
                    CardView(padding: Spacing.lg) {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("Step \(currentStep + 1) of \(questions.count)")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(colors.primary)

                            Text(questions[currentStep].title)
                                .font(.system(size: 18, weight: .bold))
                                .foregroundStyle(colors.text)

                            ForEach(questions[currentStep].options, id: \.value) { option in
                                let selected = answers[questions[currentStep].id] == option.value
                                Button {
                                    Haptics.light()
                                    answers[questions[currentStep].id] = option.value
                                } label: {
                                    HStack(spacing: Spacing.sm) {
                                        Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                                            .font(.system(size: 18))
                                            .foregroundStyle(selected ? colors.primary : colors.textLight)
                                        Text(option.label).font(.system(size: 15, weight: .medium)).foregroundStyle(colors.text)
                                        Spacer()
                                    }
                                    .padding(Spacing.md)
                                    .background(selected ? colors.primary.opacity(0.08) : colors.surfaceAlt)
                                    .clipShape(.rect(cornerRadius: Radius.md))
                                    .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(selected ? colors.primary : .clear, lineWidth: 1.5))
                                }
                                .buttonStyle(PressableButtonStyle())
                            }
                        }
                    }

                    // Creditor info (shown on first step)
                    if currentStep == 0 {
                        CardView {
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                Text("Creditor Information").font(.system(size: 16, weight: .bold)).foregroundStyle(colors.text)
                                TextField("Creditor / Collection Agency Name", text: $creditorName)
                                    .padding(14).background(colors.surfaceAlt).clipShape(.rect(cornerRadius: Radius.md)).foregroundStyle(colors.text)
                                TextField("Account Number (last 4 digits)", text: $accountNumber)
                                    .keyboardType(.numberPad)
                                    .padding(14).background(colors.surfaceAlt).clipShape(.rect(cornerRadius: Radius.md)).foregroundStyle(colors.text)
                            }
                        }
                    }

                    // Navigation buttons
                    HStack(spacing: Spacing.md) {
                        if currentStep > 0 {
                            Button { Haptics.light(); currentStep -= 1 } label: {
                                HStack(spacing: 4) { Image(systemName: "chevron.left"); Text("Back") }
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(colors.text)
                                    .frame(maxWidth: .infinity).padding(.vertical, 14)
                                    .background(colors.surface).clipShape(.rect(cornerRadius: Radius.md))
                            }.buttonStyle(PressableButtonStyle())
                        }
                        Button {
                            Haptics.medium()
                            if currentStep < questions.count - 1 { currentStep += 1 }
                            else { generateLetter() }
                        } label: {
                            HStack(spacing: 4) {
                                Text(currentStep < questions.count - 1 ? "Next" : "Generate Letter")
                                Image(systemName: currentStep < questions.count - 1 ? "chevron.right" : "doc.text.fill")
                            }.font(.system(size: 15, weight: .bold))
                                .foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 14)
                                .background(colors.primary).clipShape(.rect(cornerRadius: Radius.md))
                        }.buttonStyle(PressableButtonStyle())
                        .disabled(answers[questions[currentStep].id] == nil)
                    }
                } else {
                    // Generated letter
                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            HStack {
                                Image(systemName: "checkmark.circle.fill").foregroundStyle(colors.success)
                                Text("Letter Generated!").font(.system(size: 18, weight: .bold)).foregroundStyle(colors.text)
                            }
                            ScrollView {
                                Text(generatedLetter)
                                    .font(.system(size: 14, design: .serif))
                                    .foregroundStyle(colors.text)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                            .frame(maxHeight: 300)

                            HStack(spacing: Spacing.sm) {
                                Button {
                                    UIPasteboard.general.string = generatedLetter
                                    Haptics.success()
                                } label: {
                                    HStack(spacing: 4) { Image(systemName: "doc.on.doc.fill"); Text("Copy") }.font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(colors.primary).frame(maxWidth: .infinity).padding(.vertical, 12)
                                        .background(colors.primary.opacity(0.08)).clipShape(.rect(cornerRadius: Radius.md))
                                }.buttonStyle(PressableButtonStyle())

                                Button {
                                    Haptics.medium()
                                    currentStep = 0; answers = [:]; generatedLetter = ""
                                } label: {
                                    HStack(spacing: 4) { Image(systemName: "arrow.counterclockwise"); Text("Restart") }.font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 12)
                                        .background(colors.primary).clipShape(.rect(cornerRadius: Radius.md))
                                }.buttonStyle(PressableButtonStyle())
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("AI Dispute Assistant")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func generateLetter() {
        let name = store.user.name
        let date = Format.mediumDate(Date())
        let creditor = creditorName.isEmpty ? "[CREDITOR NAME]" : creditorName
        let acct = accountNumber.isEmpty ? "[XXXX]" : accountNumber
        let disputeType = answers["disputeType"] ?? "originalCreditorOpen"

        let intro: String
        switch disputeType {
        case "originalCreditorOpen": intro = "I am writing to dispute information on my open account that is being reported inaccurately."
        case "originalCreditorClosed": intro = "I am writing to dispute inaccurate information regarding my closed account."
        case "debtCollector": intro = "I am writing to dispute a debt that you are attempting to collect, which I do not owe."
        default: intro = "I am writing to dispute inaccurate information on my credit report."
        }

        generatedLetter = """
        \(name)
        \(store.user.email)
        \(store.user.phone)

        Date: \(date)

        \(creditor)
        Re: Account #\(acct)

        To Whom It May Concern,

        \(intro)

        Under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681i, I am requesting that you investigate and verify the following information. If you cannot verify this information within 30 days, you are required by law to remove it from my credit report.

        Specifically, I am disputing the following:
        - The account is being reported inaccurately
        - The balance is incorrect
        - The account status is incorrect

        Please investigate this matter and provide me with:
        1. A copy of any documentation you have verifying this debt
        2. The name and address of the original creditor
        3. The date the account was opened
        4. The original amount of the debt

        If you cannot verify this information, I demand that you:
        - Remove all negative reporting from all three credit bureaus
        - Cease collection activities
        - Provide written confirmation of the deletion

        Sincerely,

        \(name)
        """
        currentStep = questions.count
    }
}

// MARK: - AI Credit Coach (WebView)

/// Interactive AI avatar coach — loads the LiveAvatar embed via WKWebView.
struct AICreditCoachView: View {
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        let colors = theme.colors
        VStack(spacing: 0) {
            // Header bar
            HStack {
                Image(systemName: "sparkles").foregroundStyle(colors.accent)
                Text("AI Credit Repair Coach").font(.system(size: 18, weight: .bold)).foregroundStyle(colors.text)
                Spacer()
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.md)
            .background(colors.surface)

            // WebView area
            CoachWebView(url: URL(string: "https://avatar.cnvrs.com/wci/coach")!)
                .background(Color.black)
        }
        .background(colors.background)
        .ignoresSafeArea(edges: .bottom)
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct CoachWebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaPlaybackRequiresUserAction = false
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.scrollView.isScrollEnabled = false
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

// MARK: - Lawsuit Assistant

/// Guided violation checker that determines if you have grounds for a lawsuit.
struct LawsuitAssistantView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss

    @State private var section: LawsuitSection = .intro
    @State private var selectedState = "CA"
    @State private var violationType: ViolationType? = nil
    @State private var craViolations: Set<String> = []
    @State private var creditorViolations: Set<String> = []
    @State private var collectorViolations: Set<String> = []
    @State private var entityName = ""
    @State private var results: [String] = []

    enum LawsuitSection: String, CaseIterable {
        case intro, location, violationType, craViolations, creditorViolations
        case collectorViolations, details, results
    }

    enum ViolationType: String, CaseIterable {
        case creditReporting = "Credit Reporting Agency"
        case creditor = "Creditor / Furnisher"
        case debtCollector = "Debt Collector"
    }

    private let craViolationOptions: [(id: String, label: String, law: String)] = [
        ("cra1", "Failed to investigate dispute within 30 days", "FCRA § 611"),
        ("cra2", "Reported inaccurate information after dispute", "FCRA § 611"),
        ("cra3", "Failed to provide credit report after request", "FCRA § 612"),
        ("cra4", "Mixed my file with another consumer", "FCRA § 605"),
        ("cra5", "Re-inserted deleted information without notice", "FCRA § 611(a)(5)"),
        ("cra6", "Failed to provide method of verification", "FCRA § 611"),
    ]

    private let creditorViolationOptions: [(id: String, label: String, law: String)] = [
        ("cred1", "Reported inaccurate information to credit bureaus", "FCRA § 623"),
        ("cred2", "Failed to investigate dispute after notice", "FCRA § 623"),
        ("cred3", "Reported information after I disputed directly", "FCRA § 623"),
        ("cred4", "Failed to correct/update reporting after dispute", "FCRA § 623"),
    ]

    private let collectorViolationOptions: [(id: String, label: String, law: String)] = [
        ("col1", "Called before 8 AM or after 9 PM", "FDCPA § 805"),
        ("col2", "Called at work after I told them to stop", "FDCPA § 805"),
        ("col3", "Contacted third parties about my debt", "FDCPA § 805"),
        ("col4", "Used threatening or abusive language", "FDCPA § 806"),
        ("col5", "Misrepresented the debt amount", "FDCPA § 807"),
        ("col6", "Failed to send validation notice", "FDCPA § 809"),
        ("col7", "Continued collection without validating debt", "FDCPA § 809"),
        ("col8", "Sued past statute of limitations", "FDCPA § 811"),
    ]

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
            VStack(spacing: Spacing.lg) {
                // Hero
                VStack(spacing: Spacing.md) {
                    Image(systemName: "scale.3d.fill")
                        .font(.system(size: 32, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 72, height: 72)
                        .background(.white.opacity(0.15))
                        .clipShape(.circle)
                    Text("Lawsuit Assistant").font(.system(size: 24, weight: .heavy)).foregroundStyle(.white)
                    Text("Find out if you have grounds for a lawsuit").font(.system(size: 14)).foregroundStyle(.white.opacity(0.75))
                }
                .frame(maxWidth: .infinity)
                .padding(Spacing.lg)
                .background(LinearGradient(colors: [Color(hex: "#7F1D1D"), Color(hex: "#991B1B")], startPoint: .topLeading, endPoint: .bottomTrailing))
                .clipShape(.rect(cornerRadius: Radius.xl))

                // Progress dots
                HStack(spacing: Spacing.xs) {
                    ForEach(LawsuitSection.allCases, id: \.self) { sec in
                        Capsule()
                            .fill(sec.rawValue.count <= section.rawValue.count ? colors.primary : colors.border)
                            .frame(height: 4)
                    }
                }.padding(.horizontal, Spacing.md)

                switch section {
                case .intro:
                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("How This Works").font(.system(size: 18, weight: .bold)).foregroundStyle(colors.text)
                            Text("This tool helps you identify potential violations of the FCRA, FDCPA, and other consumer protection laws. Answer the questions to see if you have grounds for a lawsuit.").font(.system(size: 14)).foregroundStyle(colors.textSecondary)
                            Text("⚠️ This tool is for educational purposes only and does not constitute legal advice.").font(.system(size: 13, weight: .medium)).foregroundStyle(Color(hex: "#F59E0B"))
                        }
                    }
                    nextButton("Get Started")

                case .location:
                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("Select Your State").font(.system(size: 18, weight: .bold)).foregroundStyle(colors.text)
                            Text("Laws vary by state. Select your state to see applicable statutes.").font(.system(size: 14)).foregroundStyle(colors.textSecondary)
                            Menu {
                                ForEach(usStates, id: \.code) { state in
                                    Button(state.name) { selectedState = state.code; Haptics.light() }
                                }
                            } label: {
                                HStack {
                                    Text(usStates.first { $0.code == selectedState }?.name ?? "Select State")
                                        .foregroundStyle(colors.text)
                                    Spacer()
                                    Image(systemName: "chevron.down").foregroundStyle(colors.textSecondary)
                                }
                                .padding(14).background(colors.surfaceAlt).clipShape(.rect(cornerRadius: Radius.md))
                            }
                        }
                    }
                    navButtons()

                case .violationType:
                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("Who Violated Your Rights?").font(.system(size: 18, weight: .bold)).foregroundStyle(colors.text)
                            ForEach(ViolationType.allCases, id: \.self) { type in
                                let selected = violationType == type
                                Button { Haptics.light(); violationType = type } label: {
                                    HStack {
                                        Image(systemName: selected ? "checkmark.circle.fill" : "circle").foregroundStyle(selected ? colors.primary : colors.textLight)
                                        Text(type.rawValue).font(.system(size: 15, weight: .medium)).foregroundStyle(colors.text)
                                        Spacer()
                                    }
                                    .padding(Spacing.md).background(selected ? colors.primary.opacity(0.08) : colors.surfaceAlt)
                                    .clipShape(.rect(cornerRadius: Radius.md))
                                    .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(selected ? colors.primary : .clear, lineWidth: 1.5))
                                }.buttonStyle(PressableButtonStyle())
                            }
                        }
                    }
                    navButtons()

                case .craViolations:
                    violationSelectionCard("Credit Reporting Agency Violations", options: craViolationOptions, selected: $craViolations)
                    navButtons()

                case .creditorViolations:
                    violationSelectionCard("Creditor / Furnisher Violations", options: creditorViolationOptions, selected: $creditorViolations)
                    navButtons()

                case .collectorViolations:
                    violationSelectionCard("Debt Collector Violations", options: collectorViolationOptions, selected: $collectorViolations)
                    navButtons()

                case .details:
                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("Entity Information").font(.system(size: 18, weight: .bold)).foregroundStyle(colors.text)
                            Text("Enter the name of the company that violated your rights.").font(.system(size: 14)).foregroundStyle(colors.textSecondary)
                            TextField("Company / Agency Name", text: $entityName)
                                .padding(14).background(colors.surfaceAlt).clipShape(.rect(cornerRadius: Radius.md)).foregroundStyle(colors.text)
                        }
                    }
                    nextButton("See Results")

                case .results:
                    resultsCard(colors: colors)
                    Button { Haptics.medium(); resetAll() } label: {
                        HStack(spacing: 4) { Image(systemName: "arrow.counterclockwise"); Text("Start Over") }
                            .font(.system(size: 15, weight: .bold)).foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 14)
                            .background(colors.primary).clipShape(.rect(cornerRadius: Radius.md))
                    }.buttonStyle(PressableButtonStyle())
                }

                Spacer().frame(height: 40)
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Lawsuit Assistant")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func violationSelectionCard(_ title: String, options: [(id: String, label: String, law: String)], selected: Binding<Set<String>>) -> some View {
        CardView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                Text(title).font(.system(size: 18, weight: .bold)).foregroundStyle(theme.colors.text)
                ForEach(options, id: \.id) { option in
                    let isSelected = selected.wrappedValue.contains(option.id)
                    Button { Haptics.light()
                        if isSelected { selected.wrappedValue.remove(option.id) }
                        else { selected.wrappedValue.insert(option.id) }
                    } label: {
                        HStack(spacing: Spacing.sm) {
                            Image(systemName: isSelected ? "checkmark.square.fill" : "square").foregroundStyle(isSelected ? theme.colors.primary : theme.colors.textLight)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(option.label).font(.system(size: 14, weight: .medium)).foregroundStyle(theme.colors.text)
                                Text(option.law).font(.system(size: 11, weight: .semibold)).foregroundStyle(theme.colors.primary)
                            }
                            Spacer()
                        }
                        .padding(Spacing.md).background(isSelected ? theme.colors.primary.opacity(0.06) : .clear)
                        .clipShape(.rect(cornerRadius: Radius.md))
                    }.buttonStyle(PressableButtonStyle())
                }
            }
        }
    }

    private func resultsCard(colors: AppTheme) -> some View {
        let totalViolations = craViolations.count + creditorViolations.count + collectorViolations.count
        return CardView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Image(systemName: totalViolations > 0 ? "checkmark.seal.fill" : "xmark.seal.fill")
                        .foregroundStyle(totalViolations > 0 ? colors.success : colors.error)
                    Text(totalViolations > 0 ? "Potential Violations Found" : "No Violations Detected").font(.system(size: 18, weight: .bold)).foregroundStyle(colors.text)
                }

                if totalViolations > 0 {
                    Text("We identified \(totalViolations) potential violation\(totalViolations > 1 ? "s" : ""). You may have grounds for legal action.").font(.system(size: 14)).foregroundStyle(colors.textSecondary)

                    if !craViolations.isEmpty {
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text("FCRA Violations (\(craViolations.count))").font(.system(size: 14, weight: .bold)).foregroundStyle(colors.primary)
                            ForEach(craViolationOptions.filter { craViolations.contains($0.id) }, id: \.id) { v in
                                HStack(spacing: 4) { Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(colors.warning).font(.system(size: 10)); Text(v.label).font(.system(size: 13)).foregroundStyle(colors.text) }
                            }
                        }.padding(.top, Spacing.sm)
                    }
                    if !creditorViolations.isEmpty {
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text("Creditor Violations (\(creditorViolations.count))").font(.system(size: 14, weight: .bold)).foregroundStyle(colors.primary)
                            ForEach(creditorViolationOptions.filter { creditorViolations.contains($0.id) }, id: \.id) { v in
                                HStack(spacing: 4) { Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(colors.warning).font(.system(size: 10)); Text(v.label).font(.system(size: 13)).foregroundStyle(colors.text) }
                            }
                        }.padding(.top, Spacing.sm)
                    }
                    if !collectorViolations.isEmpty {
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text("FDCPA Violations (\(collectorViolations.count))").font(.system(size: 14, weight: .bold)).foregroundStyle(colors.primary)
                            ForEach(collectorViolationOptions.filter { collectorViolations.contains($0.id) }, id: \.id) { v in
                                HStack(spacing: 4) { Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(colors.warning).font(.system(size: 10)); Text(v.label).font(.system(size: 13)).foregroundStyle(colors.text) }
                            }
                        }.padding(.top, Spacing.sm)
                    }

                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Potential Damages").font(.system(size: 14, weight: .bold)).foregroundStyle(colors.text)
                        Text("• FCRA: $100–$1,000 per violation").font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                        Text("• FDCPA: up to $1,000 per action").font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                        Text("• Actual damages may also apply").font(.system(size: 13)).foregroundStyle(colors.textSecondary)
                    }.padding(Spacing.md).background(colors.surfaceAlt).clipShape(.rect(cornerRadius: Radius.md)).padding(.top, Spacing.sm)

                    Text("⚠️ Consult a qualified attorney for legal advice. This is educational information only.").font(.system(size: 12, weight: .medium)).foregroundStyle(colors.warning)
                } else {
                    Text("Based on your answers, no clear violations were detected. If you believe your rights were violated, consider consulting an attorney.").font(.system(size: 14)).foregroundStyle(colors.textSecondary)
                }
            }
        }
    }

    private func navButtons() -> some View {
        HStack(spacing: Spacing.md) {
            Button { Haptics.light(); goBack() } label: {
                HStack(spacing: 4) { Image(systemName: "chevron.left"); Text("Back") }.font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(theme.colors.text).frame(maxWidth: .infinity).padding(.vertical, 14)
                    .background(theme.colors.surface).clipShape(.rect(cornerRadius: Radius.md))
            }.buttonStyle(PressableButtonStyle())
            nextButton("Next")
        }
    }

    private func nextButton(_ label: String) -> some View {
        Button { Haptics.medium(); goNext() } label: {
            HStack(spacing: 4) { Text(label); Image(systemName: "chevron.right") }.font(.system(size: 15, weight: .bold))
                .foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 14)
                .background(theme.colors.primary).clipShape(.rect(cornerRadius: Radius.md))
        }.buttonStyle(PressableButtonStyle())
    }

    private func goNext() {
        switch section {
        case .intro: section = .location
        case .location: section = .violationType
        case .violationType:
            switch violationType {
            case .creditReporting: section = .craViolations
            case .creditor: section = .creditorViolations
            case .debtCollector: section = .collectorViolations
            case .none: section = .details
            }
        case .craViolations: section = .details
        case .creditorViolations: section = .details
        case .collectorViolations: section = .details
        case .details: section = .results
        case .results: break
        }
    }

    private func goBack() {
        let all = LawsuitSection.allCases
        if let idx = all.firstIndex(of: section), idx > 0 { section = all[idx - 1] }
    }

    private func resetAll() {
        section = .intro; violationType = nil
        craViolations = []; creditorViolations = []; collectorViolations = []
        entityName = ""; selectedState = "CA"
    }
}

// MARK: - Dispute Tracker

/// Cloud dispute tracker — list, filter, and manage dispute letters.
struct DisputeTrackerView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(AppStore.self) private var store

    @State private var searchQuery = ""
    @State private var statusFilter = "all"
    @State private var showAddModal = false
    @State private var disputes: [DisputeRecord] = DisputeTrackerView.seedDisputes

    private let statuses = ["all", "sent", "in-progress", "resolved", "rejected"]

    var body: some View {
        let colors = theme.colors
        ScrollView {
            VStack(spacing: Spacing.md) {
                // Analytics
                HStack(spacing: Spacing.md) {
                    statCard("\(disputes.count)", "Total", "doc.text.fill", colors.primary)
                    statCard("\(disputes.filter { $0.status == "resolved" }.count)", "Resolved", "checkmark.circle.fill", colors.success)
                    statCard("\(disputes.filter { $0.status == "in-progress" }.count)", "In Progress", "clock.fill", colors.warning)
                }

                // Search
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "magnifyingglass").foregroundStyle(colors.textLight)
                    TextField("Search disputes...", text: $searchQuery)
                        .foregroundStyle(colors.text)
                }
                .padding(Spacing.md).background(colors.surface).clipShape(.rect(cornerRadius: Radius.md))

                // Filter chips
                ScrollView(.horizontal) { HStack(spacing: Spacing.sm) {
                    ForEach(statuses, id: \.self) { status in
                        Button { Haptics.light(); statusFilter = status } label: {
                            Text(status.capitalized.replacingOccurrences(of: "-", with: " "))
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(statusFilter == status ? .white : colors.text)
                                .padding(.horizontal, Spacing.md).padding(.vertical, 8)
                                .background(statusFilter == status ? colors.primary : colors.surface).clipShape(.capsule)
                        }.buttonStyle(PressableButtonStyle())
                    }
                }}.scrollIndicators(.hidden)

                // List
                let filtered = disputes.filter {
                    (statusFilter == "all" || $0.status == statusFilter) &&
                    (searchQuery.isEmpty || $0.creditor.lowercased().contains(searchQuery.lowercased()))
                }

                if filtered.isEmpty {
                    EmptyStateView(symbol: "doc.text", title: "No Disputes Found", message: "Add a dispute to start tracking your credit repair progress")
                } else {
                    ForEach(filtered, id: \.id) { dispute in
                        CardView {
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                HStack {
                                    Image(systemName: "doc.text.fill").foregroundStyle(statusColor(dispute.status)).frame(width: 36, height: 36).background(statusColor(dispute.status).opacity(0.12)).clipShape(.rect(cornerRadius: Radius.md))
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(dispute.creditor).font(.system(size: 15, weight: .bold)).foregroundStyle(colors.text)
                                        Text(dispute.disputeType).font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                                    }
                                    Spacer()
                                    BadgeView(text: dispute.status.replacingOccurrences(of: "-", with: " ").capitalized, variant: badgeVariant(dispute.status))
                                }
                                HStack(spacing: Spacing.lg) {
                                    Label("Sent: \(Format.shortDate(dispute.dateSent))", systemImage: "paperplane.fill").font(.system(size: 12)).foregroundStyle(colors.textSecondary)
                                    if !dispute.accountNumber.isEmpty { Label("Acct: \(dispute.accountNumber)", systemImage: "creditcard.fill").font(.system(size: 12)).foregroundStyle(colors.textSecondary) }
                                }
                            }
                        }
                    }
                }

                // Add button
                Button { Haptics.medium(); showAddModal = true } label: {
                    HStack(spacing: 6) { Image(systemName: "plus.circle.fill"); Text("Add Dispute") }.font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 14)
                        .background(colors.primary).clipShape(.rect(cornerRadius: Radius.md))
                }.buttonStyle(PressableButtonStyle())
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, 100)
        }
        .background(colors.background)
        .scrollIndicators(.hidden)
        .navigationTitle("Dispute Tracker")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showAddModal) { AddDisputeSheet(disputes: $disputes) }
    }

    private func statusColor(_ status: String) -> Color {
        switch status { case "resolved": Color(hex: "#10B981"); case "in-progress": Color(hex: "#F59E0B"); case "sent": Color(hex: "#3B82F6"); case "rejected": Color(hex: "#EF4444"); default: Color(hex: "#64748B") }
    }
    private func badgeVariant(_ status: String) -> BadgeVariant {
        switch status { case "resolved": .success; case "in-progress": .warning; case "sent": .info; case "rejected": .error; default: .neutral }
    }
    private func statCard(_ value: String, _ label: String, _ symbol: String, _ color: Color) -> some View {
        CardView { VStack(spacing: 4) { Image(systemName: symbol).font(.system(size: 18)).foregroundStyle(color); Text(value).font(.system(size: 20, weight: .bold)).foregroundStyle(theme.colors.text); Text(label).font(.system(size: 11)).foregroundStyle(theme.colors.textSecondary) }.frame(maxWidth: .infinity) }
    }

    struct DisputeRecord: Identifiable, Hashable {
        let id: String
        let creditor: String
        let accountNumber: String
        let disputeType: String
        let dateSent: Date
        var status: String
    }

    static let seedDisputes: [DisputeRecord] = [
        DisputeRecord(id: "d1", creditor: "Midland Credit Management", accountNumber: "****4821", disputeType: "809 Letter", dateSent: Date().addingTimeInterval(-86400 * 15), status: "in-progress"),
        DisputeRecord(id: "d2", creditor: "Capital One Bank", accountNumber: "****3920", disputeType: "623 Letter", dateSent: Date().addingTimeInterval(-86400 * 45), status: "resolved"),
        DisputeRecord(id: "d3", creditor: "Experian", accountNumber: "", disputeType: "609 Letter", dateSent: Date().addingTimeInterval(-86400 * 5), status: "sent"),
        DisputeRecord(id: "d4", creditor: "Portfolio Recovery", accountNumber: "****7712", disputeType: "Intent to Sue Debt Collector", dateSent: Date().addingTimeInterval(-86400 * 60), status: "rejected"),
    ]
}

private struct AddDisputeSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    @Binding var disputes: [DisputeTrackerView.DisputeRecord]

    @State private var creditor = ""
    @State private var accountNumber = ""
    @State private var disputeType = "609 Letter"
    @State private var status = "sent"

    private let types = ["609 Letter", "611 Letter", "623 Letter", "809 Letter", "Intent to Sue Creditor", "Intent to Sue Debt Collector", "Open Account Dispute", "General Dispute"]
    private let statuses = ["sent", "in-progress", "resolved", "rejected"]

    var body: some View {
        let colors = theme.colors
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.md) {
                    inputField("Creditor / Agency Name", text: $creditor)
                    inputField("Account Number (last 4)", text: $accountNumber)

                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Dispute Type").font(.system(size: 14, weight: .semibold)).foregroundStyle(colors.text)
                        Menu { ForEach(types, id: \.self) { t in Button(t) { disputeType = t } } } label: {
                            HStack { Text(disputeType).foregroundStyle(colors.text); Spacer(); Image(systemName: "chevron.down").foregroundStyle(colors.textSecondary) }
                                .padding(14).background(colors.surfaceAlt).clipShape(.rect(cornerRadius: Radius.md))
                        }
                    }

                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Status").font(.system(size: 14, weight: .semibold)).foregroundStyle(colors.text)
                        Menu { ForEach(statuses, id: \.self) { s in Button(s.capitalized) { status = s } } } label: {
                            HStack { Text(status.capitalized).foregroundStyle(colors.text); Spacer(); Image(systemName: "chevron.down").foregroundStyle(colors.textSecondary) }
                                .padding(14).background(colors.surfaceAlt).clipShape(.rect(cornerRadius: Radius.md))
                        }
                    }

                    Button {
                        Haptics.success()
                        disputes.insert(DisputeTrackerView.DisputeRecord(id: UUID().uuidString, creditor: creditor, accountNumber: accountNumber, disputeType: disputeType, dateSent: Date(), status: status), at: 0)
                        dismiss()
                    } label: {
                        Text("Add Dispute").font(.system(size: 16, weight: .bold)).foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 16).background(colors.primary).clipShape(.rect(cornerRadius: Radius.md))
                    }.buttonStyle(PressableButtonStyle()).disabled(creditor.isEmpty)
                }
                .padding(Spacing.lg)
            }
            .background(colors.background)
            .navigationTitle("New Dispute")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Cancel") { dismiss() } } }
        }
    }

    private func inputField(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(label).font(.system(size: 14, weight: .semibold)).foregroundStyle(theme.colors.text)
            TextField("", text: text).padding(14).background(theme.colors.surfaceAlt).clipShape(.rect(cornerRadius: Radius.md)).foregroundStyle(theme.colors.text)
        }
    }
}
