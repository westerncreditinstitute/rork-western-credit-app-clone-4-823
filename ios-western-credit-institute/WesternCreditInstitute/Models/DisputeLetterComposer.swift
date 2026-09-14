//
//  DisputeLetterComposer.swift
//  WesternCreditInstitute
//

import Foundation

/// Builds the actual dispute letter text for a recommended letter type.
///
/// WHY THIS IS SHARED
/// ------------------
/// Two screens now generate letters — the AI Dispute Assistant and Analyze My
/// Credit Report — and both must produce identical wording for the same letter
/// type. Keeping the text in one place also keeps each letter tied to the
/// statute it actually invokes: a §1692g validation request and a §1681g
/// disclosure demand are different legal instruments, and mailing the wrong
/// body under the right title gets a dispute dismissed.
nonisolated enum DisputeLetterComposer {

    /// What the recipient is to the consumer, which sets the opening
    /// paragraph. Distinct from `DisputeTarget`, which is the specific account
    /// being disputed.
    nonisolated enum RecipientKind: String, Sendable {
        case originalCreditorOpen
        case originalCreditorClosed
        case debtCollector

        /// Falls back to the open-account phrasing for unknown values, which is
        /// the most neutral of the three.
        static func from(_ raw: String?) -> RecipientKind {
            RecipientKind(rawValue: raw ?? "") ?? .originalCreditorOpen
        }

        var intro: String {
            switch self {
            case .originalCreditorOpen:
                return "I am writing to dispute information on my open account that is being reported inaccurately."
            case .originalCreditorClosed:
                return "I am writing to dispute inaccurate information regarding my closed account."
            case .debtCollector:
                return "I am writing to dispute a debt that you are attempting to collect, which I do not owe."
            }
        }
    }

    /// The sender block at the top of the letter.
    nonisolated struct Sender: Sendable {
        let name: String
        let email: String
        /// Optional: not every profile has one, and an empty line in a mailed
        /// letter looks like a missing field rather than a deliberate omission.
        let phone: String?

        init(name: String, email: String, phone: String?) {
            self.name = name
            self.email = email
            self.phone = phone
        }

        /// Name, email and phone, skipping anything blank.
        var block: String {
            [name, email, phone ?? ""]
                .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty }
                .joined(separator: "\n")
        }
    }

    /// The statute-specific body for each letter type the ladder can recommend.
    static func body(for letterType: String) -> String {
        switch letterType {
        case "609 Letter":
            return """
            Under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681g, I am requesting full disclosure of my file, including the source of the disputed information and the verification documents relied upon.

            Specifically, I am requesting:
            1. Copies of any original signed documents bearing my signature
            2. The name, address and telephone number of the furnisher
            3. The method used to verify this account
            4. A description of the procedure used to determine its accuracy

            If you cannot produce verifiable proof of this account, I demand its immediate deletion from my credit file.
            """
        case "611 Letter":
            return """
            Under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681i(a)(7), I am requesting a description of the method of verification used to confirm this disputed account.

            My previous dispute was returned as "verified." I am therefore entitled to know:
            1. The business name and address of each furnisher contacted
            2. The telephone number of each furnisher, if reasonably available
            3. The specific documents reviewed during the reinvestigation
            4. The name of the employee who conducted it

            If you cannot provide this description within 15 days, the disputed item must be deleted.
            """
        case "623 Letter":
            return """
            Under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681s-2(b), I am disputing this account directly with you as the furnisher of the information.

            You are required to conduct a reasonable investigation, review all relevant information provided, and report the results to every credit reporting agency to which you furnished this data.

            Specifically, I dispute:
            - The accuracy of the reported balance
            - The reported account status and payment history
            - The dates associated with this account

            If the information cannot be verified as accurate, you must promptly modify, delete or permanently block its reporting.
            """
        case "809 Letter":
            return """
            Under the Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692g, I am requesting validation of this alleged debt. This is not a refusal to pay; it is a request for verification made within my statutory rights.

            Please provide:
            1. Proof that I owe this specific debt to your company
            2. The amount claimed and a complete accounting of it
            3. The name and address of the original creditor
            4. Proof that you are licensed to collect debts in my state

            Until this debt is validated, you must cease all collection activity, including reporting it to any credit reporting agency.
            """
        case "Intent to Sue Creditor":
            return """
            This letter is formal notice of my intent to pursue legal action under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681n and § 1681o.

            I have previously disputed this account and you have failed to conduct a reasonable investigation as required by 15 U.S.C. § 1681s-2(b). Continued reporting of information you have not verified is a willful violation.

            Unless this account is deleted and written confirmation is provided within 30 days, I intend to file suit seeking statutory damages of up to $1,000 per violation, actual damages, and attorney's fees and costs.
            """
        case "Intent to Sue Debt Collector":
            return """
            This letter is formal notice of my intent to pursue legal action under the Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692k, and the Fair Credit Reporting Act (FCRA).

            I have previously requested validation of this debt. Continuing to collect on, or report, a debt you have not validated violates 15 U.S.C. § 1692g(b).

            Unless collection activity ceases and this account is deleted from my credit file within 30 days, I intend to file suit seeking statutory damages of up to $1,000 per violation, actual damages, and attorney's fees and costs.
            """
        default:
            return """
            Under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681i, I am requesting that you investigate and verify this information. If you cannot verify it within 30 days, you are required by law to remove it from my credit report.
            """
        }
    }

    /// Assembles a complete, mailable letter.
    static func compose(
        letterType: String,
        sender: Sender,
        creditorName: String,
        accountNumber: String,
        furnisherAddress: String? = nil,
        recipientKind: RecipientKind,
        date: Date = Date()
    ) -> String {
        let creditor = creditorName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? "[CREDITOR NAME]"
            : creditorName
        let account = accountNumber.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? "[XXXX]"
            : accountNumber

        // The furnisher's mailing address is only printed when the report
        // actually carried one — a placeholder here would look like a verified
        // address and get the letter mailed to nowhere.
        let addressBlock: String = {
            guard let furnisherAddress,
                  !furnisherAddress.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                return ""
            }
            return "\n\(furnisherAddress)"
        }()

        return """
        \(sender.block)

        Date: \(Format.mediumDate(date))

        \(creditor)\(addressBlock)
        Re: Account #\(account) — \(letterType)

        To Whom It May Concern,

        \(recipientKind.intro)

        \(body(for: letterType))

        Please provide written confirmation of the action taken to the address above.

        Sincerely,

        \(sender.name)
        """
    }
}
