//
//  SueForViolations.swift
//  WesternCreditInstitute
//
//  Consumer Protection Violations & Damages Guide data source.
//  Powers the "What Can You Sue For" tool: potential violations under the
//  FDCPA and FCRA, along with the damages consumers may be entitled to.
//  Educational information only — not legal advice.
//

import Foundation

/// A single statutory violation and the damages it may carry.
nonisolated struct SueViolation: Identifiable, Sendable {
    let section: String
    let description: String
    let damages: String
    var id: String { section }
}

/// One consumer-protection law with its violation catalog.
nonisolated struct SueLaw: Identifiable, Sendable {
    let id: String
    let label: String
    let shortLabel: String
    let accentHex: String
    let violations: [SueViolation]
}

nonisolated enum SueForData {
    private static let fdcpaDamages =
        "Up to $1,000 statutory damages + actual damages + attorney fees and costs"

    private static let fcraDamagesPunitive =
        "Actual damages + punitive damages + attorney fees and costs; for willful violations: $100-$1,000 statutory damages"

    private static let fcraDamagesStandard =
        "Actual damages + attorney fees and costs; for willful violations: $100-$1,000 statutory damages + punitive damages"

    private static let fcraAgencyOnly =
        "Generally enforced by federal agencies only, not private right of action"

    static let laws: [SueLaw] = [
        SueLaw(
            id: "fdcpa",
            label: "Fair Debt Collection Practices Act",
            shortLabel: "FDCPA Violations",
            accentHex: "#3B82F6",
            violations: [
                SueViolation(section: "§1692c(a)(1)", description: "Contacting consumer at inconvenient time/place (before 8am or after 9pm)", damages: fdcpaDamages),
                SueViolation(section: "§1692c(a)(2)", description: "Contacting consumer represented by attorney", damages: fdcpaDamages),
                SueViolation(section: "§1692c(a)(3)", description: "Contacting consumer at workplace when employer prohibits such communication", damages: fdcpaDamages),
                SueViolation(section: "§1692c(b)", description: "Communicating with third parties about the debt", damages: fdcpaDamages),
                SueViolation(section: "§1692c(c)", description: "Continuing communication after written cease request", damages: fdcpaDamages),
                SueViolation(section: "§1692d", description: "Harassment or abuse (generally)", damages: fdcpaDamages),
                SueViolation(section: "§1692d(1)", description: "Threat of violence or harm", damages: fdcpaDamages),
                SueViolation(section: "§1692d(2)", description: "Using obscene or profane language", damages: fdcpaDamages),
                SueViolation(section: "§1692d(3)", description: "Publishing public list of consumers who refuse to pay debts", damages: fdcpaDamages),
                SueViolation(section: "§1692d(4)", description: "Advertising the sale of debt to coerce payment", damages: fdcpaDamages),
                SueViolation(section: "§1692d(5)", description: "Causing telephone to ring repeatedly or continuously", damages: fdcpaDamages),
                SueViolation(section: "§1692d(6)", description: "Placing calls without meaningful disclosure of caller's identity", damages: fdcpaDamages),
                SueViolation(section: "§1692e", description: "False or misleading representations (generally)", damages: fdcpaDamages),
                SueViolation(section: "§1692e(1)", description: "Falsely representing collector is affiliated with US or state government", damages: fdcpaDamages),
                SueViolation(section: "§1692e(2)(A)", description: "Misrepresenting character, amount, or legal status of debt", damages: fdcpaDamages),
                SueViolation(section: "§1692e(2)(B)", description: "Misrepresenting compensation collector may receive", damages: fdcpaDamages),
                SueViolation(section: "§1692e(3)", description: "Falsely representing collector is an attorney", damages: fdcpaDamages),
                SueViolation(section: "§1692e(4)", description: "Implying nonpayment will result in arrest, imprisonment, or property seizure when unlawful", damages: fdcpaDamages),
                SueViolation(section: "§1692e(5)", description: "Threatening action that cannot legally be taken or is not intended", damages: fdcpaDamages),
                SueViolation(section: "§1692e(6)", description: "Threatening to take action that would violate the FDCPA", damages: fdcpaDamages),
                SueViolation(section: "§1692e(7)", description: "Falsely representing consumer committed crime", damages: fdcpaDamages),
                SueViolation(section: "§1692e(8)", description: "Communicating false credit information, including failing to report disputed debt", damages: fdcpaDamages),
                SueViolation(section: "§1692e(9)", description: "Using deceptive documents that appear to be authorized by court or government", damages: fdcpaDamages),
                SueViolation(section: "§1692e(10)", description: "Using false representations or deceptive means to collect debt", damages: fdcpaDamages),
                SueViolation(section: "§1692e(11)", description: "Failing to disclose in communications that collector is attempting to collect debt", damages: fdcpaDamages),
                SueViolation(section: "§1692e(12)", description: "Falsely representing documents are legal process", damages: fdcpaDamages),
                SueViolation(section: "§1692e(13)", description: "Falsely representing documents are not legal process forms requiring action", damages: fdcpaDamages),
                SueViolation(section: "§1692e(14)", description: "Using business, company, or organization name other than true name", damages: fdcpaDamages),
                SueViolation(section: "§1692e(15)", description: "Falsely representing documents are from attorney", damages: fdcpaDamages),
                SueViolation(section: "§1692e(16)", description: "Falsely representing documents are from credit reporting agency", damages: fdcpaDamages),
                SueViolation(section: "§1692f", description: "Unfair practices (generally)", damages: fdcpaDamages),
                SueViolation(section: "§1692f(1)", description: "Collecting amount not authorized by agreement or law", damages: fdcpaDamages),
                SueViolation(section: "§1692f(2)", description: "Accepting postdated check with intent to threaten criminal prosecution", damages: fdcpaDamages),
                SueViolation(section: "§1692f(3)", description: "Soliciting postdated check to threaten criminal prosecution", damages: fdcpaDamages),
                SueViolation(section: "§1692f(4)", description: "Depositing postdated check prior to date on check", damages: fdcpaDamages),
                SueViolation(section: "§1692f(5)", description: "Causing charges for communications by concealing purpose of communication", damages: fdcpaDamages),
                SueViolation(section: "§1692f(6)", description: "Taking/threatening nonjudicial action to repossess property when no right exists", damages: fdcpaDamages),
                SueViolation(section: "§1692f(7)", description: "Communicating via postcard", damages: fdcpaDamages),
                SueViolation(section: "§1692f(8)", description: "Using language/symbol on envelope indicating debt collection", damages: fdcpaDamages),
                SueViolation(section: "§1692g(a)", description: "Failing to send written validation notice within 5 days of initial communication", damages: fdcpaDamages),
                SueViolation(section: "§1692g(b)", description: "Continuing collection activities during 30-day dispute period", damages: fdcpaDamages),
                SueViolation(section: "§1692h", description: "Applying payment to disputed debt when multiple debts exist", damages: fdcpaDamages),
                SueViolation(section: "§1692j", description: "Furnishing deceptive forms", damages: fdcpaDamages)
            ]
        ),
        SueLaw(
            id: "fcra",
            label: "Fair Credit Reporting Act",
            shortLabel: "FCRA Violations",
            accentHex: "#10B981",
            violations: [
                SueViolation(section: "§1681b", description: "Obtaining consumer report without permissible purpose", damages: fcraDamagesPunitive),
                SueViolation(section: "§1681b(f)", description: "Using or obtaining consumer report for impermissible purpose", damages: fcraDamagesPunitive),
                SueViolation(section: "§1681c(a)", description: "Reporting obsolete information (bankruptcies older than 10 years, civil suits/judgments/records older than 7 years, etc.)", damages: fcraDamagesStandard),
                SueViolation(section: "§1681c(b)", description: "Reporting obsolete information in employment context", damages: fcraDamagesStandard),
                SueViolation(section: "§1681c(g)", description: "Printing more than last 5 digits of credit card or Social Security number on receipts", damages: fcraDamagesStandard),
                SueViolation(section: "§1681c-1", description: "Failing to place or honor fraud alerts", damages: fcraDamagesStandard),
                SueViolation(section: "§1681c-2", description: "Failing to block information resulting from identity theft", damages: fcraDamagesStandard),
                SueViolation(section: "§1681d", description: "Failing to disclose investigative consumer report requirements", damages: fcraDamagesStandard),
                SueViolation(section: "§1681e(a)", description: "Failing to maintain reasonable procedures to limit furnishing reports to permissible purposes", damages: fcraDamagesStandard),
                SueViolation(section: "§1681e(b)", description: "Failing to follow reasonable procedures to assure maximum possible accuracy", damages: fcraDamagesStandard),
                SueViolation(section: "§1681e(d)", description: "Failing to provide notice to users of consumer reports about their responsibilities", damages: fcraDamagesStandard),
                SueViolation(section: "§1681e(e)", description: "Failing to provide notice to furnishers about their responsibilities", damages: fcraDamagesStandard),
                SueViolation(section: "§1681g", description: "Failing to provide complete disclosure of file to consumer upon request", damages: fcraDamagesStandard),
                SueViolation(section: "§1681h", description: "Failing to provide proper disclosure procedures to consumers", damages: fcraDamagesStandard),
                SueViolation(section: "§1681i(a)", description: "Failing to conduct reasonable reinvestigation of disputed information", damages: fcraDamagesStandard),
                SueViolation(section: "§1681i(a)(1)(A)", description: "Failing to complete reinvestigation within 30 days", damages: fcraDamagesStandard),
                SueViolation(section: "§1681i(a)(2)", description: "Failing to provide notice of dispute to furnisher", damages: fcraDamagesStandard),
                SueViolation(section: "§1681i(a)(4)", description: "Failing to review and consider all relevant information", damages: fcraDamagesStandard),
                SueViolation(section: "§1681i(a)(5)(A)", description: "Failing to promptly delete or modify inaccurate information", damages: fcraDamagesStandard),
                SueViolation(section: "§1681i(a)(5)(B)", description: "Failing to notify furnisher that information is deleted as inaccurate", damages: fcraDamagesStandard),
                SueViolation(section: "§1681i(a)(5)(C)", description: "Failing to notify consumer of results of reinvestigation", damages: fcraDamagesStandard),
                SueViolation(section: "§1681i(a)(6)", description: "Failing to provide required notices after reinvestigation", damages: fcraDamagesStandard),
                SueViolation(section: "§1681i(b)", description: "Failing to note disputed information", damages: fcraDamagesStandard),
                SueViolation(section: "§1681i(c)", description: "Failing to provide consumer statement in subsequent reports", damages: fcraDamagesStandard),
                SueViolation(section: "§1681j", description: "Failing to provide free annual disclosure", damages: fcraDamagesStandard),
                SueViolation(section: "§1681k", description: "Failing to notify consumer of public record information provided for employment", damages: fcraDamagesStandard),
                SueViolation(section: "§1681m(a)", description: "Failing to provide adverse action notice", damages: fcraDamagesStandard),
                SueViolation(section: "§1681m(b)", description: "Failing to provide notice of adverse action based on information from third parties", damages: fcraDamagesStandard),
                SueViolation(section: "§1681m(d)", description: "Failing to provide risk-based pricing notice", damages: fcraDamagesStandard),
                SueViolation(section: "§1681m(h)", description: "Failing to provide notice of prescreened offers of credit", damages: fcraDamagesStandard),
                SueViolation(section: "§1681s-2(a)", description: "Furnishing information known to be inaccurate", damages: fcraAgencyOnly),
                SueViolation(section: "§1681s-2(b)", description: "Failing to properly investigate consumer disputes as furnisher", damages: fcraDamagesStandard),
                SueViolation(section: "§1681s-2(b)(1)", description: "Failing to conduct investigation of disputed information", damages: fcraDamagesStandard),
                SueViolation(section: "§1681s-2(b)(1)(A)", description: "Failing to investigate disputed information", damages: fcraDamagesStandard),
                SueViolation(section: "§1681s-2(b)(1)(B)", description: "Failing to review all relevant information", damages: fcraDamagesStandard),
                SueViolation(section: "§1681s-2(b)(1)(C)", description: "Failing to report results to all CRAs if information found inaccurate", damages: fcraDamagesStandard),
                SueViolation(section: "§1681s-2(b)(1)(D)", description: "Failing to report dispute to all CRAs if dispute not resolved", damages: fcraDamagesStandard),
                SueViolation(section: "§1681s-2(b)(1)(E)", description: "Failing to modify/delete/permanently block inaccurate information", damages: fcraDamagesStandard),
                SueViolation(section: "§1681t", description: "Obtaining information under false pretenses", damages: fcraDamagesStandard)
            ]
        )
    ]

    static let notes: [String] = [
        "FDCPA has a one-year statute of limitations from the date of violation.",
        "FCRA has a two-year statute of limitations from discovery of the violation, with an outside limit of five years from when the violation occurred.",
        "Class action provisions exist under both laws for widespread violations.",
        "Damages may be adjusted for inflation periodically.",
        "Courts have discretion in awarding damages within statutory limits.",
        "For FCRA, \"willful\" violations can receive statutory and punitive damages; \"negligent\" violations receive only actual damages."
    ]

    static let disclaimer =
        "This information is for educational purposes only and should not be considered legal advice. Consult with a consumer rights attorney for specific situations."

    static let lastUpdated = "June 24, 2025"

    /// Case-insensitive search across section, description and damages.
    static func search(_ violations: [SueViolation], query: String) -> [SueViolation] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return violations }
        return violations.filter {
            $0.section.lowercased().contains(q)
                || $0.description.lowercased().contains(q)
                || $0.damages.lowercased().contains(q)
        }
    }
}
