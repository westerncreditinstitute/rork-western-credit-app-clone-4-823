/**
 * Consumer Protection Violations & Damages Guide — data source.
 *
 * Powers the "What Can You Sue For" tool: potential violations under the
 * Fair Debt Collection Practices Act (FDCPA) and the Fair Credit Reporting
 * Act (FCRA), along with the damages consumers may be entitled to.
 *
 * Educational information only — not legal advice.
 */

export type LawId = "fdcpa" | "fcra";

export interface SueViolation {
  /** Statute reference, e.g. "§1692c(a)(1)" */
  section: string;
  /** Plain-language description of the violation */
  description: string;
  /** Damages the consumer may be entitled to */
  damages: string;
}

export interface LawSection {
  id: LawId;
  label: string;
  accent: string;
  violations: SueViolation[];
}

const FDCPA_DAMAGES =
  "Up to $1,000 statutory damages + actual damages + attorney fees and costs";

const FCRA_DAMAGES_PUNITIVE =
  "Actual damages + punitive damages + attorney fees and costs; for willful violations: $100-$1,000 statutory damages";

const FCRA_DAMAGES_STANDARD =
  "Actual damages + attorney fees and costs; for willful violations: $100-$1,000 statutory damages + punitive damages";

const FDCPA_NO_AGENCY_ENFORCEMENT =
  "Generally enforced by federal agencies only, not private right of action";

const fdcpaViolations: SueViolation[] = [
  ["§1692c(a)(1)", "Contacting consumer at inconvenient time/place (before 8am or after 9pm)"],
  ["§1692c(a)(2)", "Contacting consumer represented by attorney"],
  ["§1692c(a)(3)", "Contacting consumer at workplace when employer prohibits such communication"],
  ["§1692c(b)", "Communicating with third parties about the debt"],
  ["§1692c(c)", "Continuing communication after written cease request"],
  ["§1692d", "Harassment or abuse (generally)"],
  ["§1692d(1)", "Threat of violence or harm"],
  ["§1692d(2)", "Using obscene or profane language"],
  ["§1692d(3)", "Publishing public list of consumers who refuse to pay debts"],
  ["§1692d(4)", "Advertising the sale of debt to coerce payment"],
  ["§1692d(5)", "Causing telephone to ring repeatedly or continuously"],
  ["§1692d(6)", "Placing calls without meaningful disclosure of caller's identity"],
  ["§1692e", "False or misleading representations (generally)"],
  ["§1692e(1)", "Falsely representing collector is affiliated with US or state government"],
  ["§1692e(2)(A)", "Misrepresenting character, amount, or legal status of debt"],
  ["§1692e(2)(B)", "Misrepresenting compensation collector may receive"],
  ["§1692e(3)", "Falsely representing collector is an attorney"],
  ["§1692e(4)", "Implying nonpayment will result in arrest, imprisonment, or property seizure when unlawful"],
  ["§1692e(5)", "Threatening action that cannot legally be taken or is not intended"],
  ["§1692e(6)", "Threatening to take action that would violate the FDCPA"],
  ["§1692e(7)", "Falsely representing consumer committed crime"],
  ["§1692e(8)", "Communicating false credit information, including failing to report disputed debt"],
  ["§1692e(9)", "Using deceptive documents that appear to be authorized by court or government"],
  ["§1692e(10)", "Using false representations or deceptive means to collect debt"],
  ["§1692e(11)", "Failing to disclose in communications that collector is attempting to collect debt"],
  ["§1692e(12)", "Falsely representing documents are legal process"],
  ["§1692e(13)", "Falsely representing documents are not legal process forms requiring action"],
  ["§1692e(14)", "Using business, company, or organization name other than true name"],
  ["§1692e(15)", "Falsely representing documents are from attorney"],
  ["§1692e(16)", "Falsely representing documents are from credit reporting agency"],
  ["§1692f", "Unfair practices (generally)"],
  ["§1692f(1)", "Collecting amount not authorized by agreement or law"],
  ["§1692f(2)", "Accepting postdated check with intent to threaten criminal prosecution"],
  ["§1692f(3)", "Soliciting postdated check to threaten criminal prosecution"],
  ["§1692f(4)", "Depositing postdated check prior to date on check"],
  ["§1692f(5)", "Causing charges for communications by concealing purpose of communication"],
  ["§1692f(6)", "Taking/threatening nonjudicial action to repossess property when no right exists"],
  ["§1692f(7)", "Communicating via postcard"],
  ["§1692f(8)", "Using language/symbol on envelope indicating debt collection"],
  ["§1692g(a)", "Failing to send written validation notice within 5 days of initial communication"],
  ["§1692g(b)", "Continuing collection activities during 30-day dispute period"],
  ["§1692h", "Applying payment to disputed debt when multiple debts exist"],
  ["§1692j", "Furnishing deceptive forms"],
].map(([section, description]) => ({ section, description, damages: FDCPA_DAMAGES }));

const fcraViolations: SueViolation[] = [
  ["§1681b", "Obtaining consumer report without permissible purpose", FCRA_DAMAGES_PUNITIVE],
  ["§1681b(f)", "Using or obtaining consumer report for impermissible purpose", FCRA_DAMAGES_PUNITIVE],
  ["§1681c(a)", "Reporting obsolete information (bankruptcies older than 10 years, civil suits/judgments/records older than 7 years, etc.)", FCRA_DAMAGES_STANDARD],
  ["§1681c(b)", "Reporting obsolete information in employment context", FCRA_DAMAGES_STANDARD],
  ["§1681c(g)", "Printing more than last 5 digits of credit card or Social Security number on receipts", FCRA_DAMAGES_STANDARD],
  ["§1681c-1", "Failing to place or honor fraud alerts", FCRA_DAMAGES_STANDARD],
  ["§1681c-2", "Failing to block information resulting from identity theft", FCRA_DAMAGES_STANDARD],
  ["§1681d", "Failing to disclose investigative consumer report requirements", FCRA_DAMAGES_STANDARD],
  ["§1681e(a)", "Failing to maintain reasonable procedures to limit furnishing reports to permissible purposes", FCRA_DAMAGES_STANDARD],
  ["§1681e(b)", "Failing to follow reasonable procedures to assure maximum possible accuracy", FCRA_DAMAGES_STANDARD],
  ["§1681e(d)", "Failing to provide notice to users of consumer reports about their responsibilities", FCRA_DAMAGES_STANDARD],
  ["§1681e(e)", "Failing to provide notice to furnishers about their responsibilities", FCRA_DAMAGES_STANDARD],
  ["§1681g", "Failing to provide complete disclosure of file to consumer upon request", FCRA_DAMAGES_STANDARD],
  ["§1681h", "Failing to provide proper disclosure procedures to consumers", FCRA_DAMAGES_STANDARD],
  ["§1681i(a)", "Failing to conduct reasonable reinvestigation of disputed information", FCRA_DAMAGES_STANDARD],
  ["§1681i(a)(1)(A)", "Failing to complete reinvestigation within 30 days", FCRA_DAMAGES_STANDARD],
  ["§1681i(a)(2)", "Failing to provide notice of dispute to furnisher", FCRA_DAMAGES_STANDARD],
  ["§1681i(a)(4)", "Failing to review and consider all relevant information", FCRA_DAMAGES_STANDARD],
  ["§1681i(a)(5)(A)", "Failing to promptly delete or modify inaccurate information", FCRA_DAMAGES_STANDARD],
  ["§1681i(a)(5)(B)", "Failing to notify furnisher that information is deleted as inaccurate", FCRA_DAMAGES_STANDARD],
  ["§1681i(a)(5)(C)", "Failing to notify consumer of results of reinvestigation", FCRA_DAMAGES_STANDARD],
  ["§1681i(a)(6)", "Failing to provide required notices after reinvestigation", FCRA_DAMAGES_STANDARD],
  ["§1681i(b)", "Failing to note disputed information", FCRA_DAMAGES_STANDARD],
  ["§1681i(c)", "Failing to provide consumer statement in subsequent reports", FCRA_DAMAGES_STANDARD],
  ["§1681j", "Failing to provide free annual disclosure", FCRA_DAMAGES_STANDARD],
  ["§1681k", "Failing to notify consumer of public record information provided for employment", FCRA_DAMAGES_STANDARD],
  ["§1681m(a)", "Failing to provide adverse action notice", FCRA_DAMAGES_STANDARD],
  ["§1681m(b)", "Failing to provide notice of adverse action based on information from third parties", FCRA_DAMAGES_STANDARD],
  ["§1681m(d)", "Failing to provide risk-based pricing notice", FCRA_DAMAGES_STANDARD],
  ["§1681m(h)", "Failing to provide notice of prescreened offers of credit", FCRA_DAMAGES_STANDARD],
  ["§1681s-2(a)", "Furnishing information known to be inaccurate", FDCPA_NO_AGENCY_ENFORCEMENT],
  ["§1681s-2(b)", "Failing to properly investigate consumer disputes as furnisher", FCRA_DAMAGES_STANDARD],
  ["§1681s-2(b)(1)", "Failing to conduct investigation of disputed information", FCRA_DAMAGES_STANDARD],
  ["§1681s-2(b)(1)(A)", "Failing to investigate disputed information", FCRA_DAMAGES_STANDARD],
  ["§1681s-2(b)(1)(B)", "Failing to review all relevant information", FCRA_DAMAGES_STANDARD],
  ["§1681s-2(b)(1)(C)", "Failing to report results to all CRAs if information found inaccurate", FCRA_DAMAGES_STANDARD],
  ["§1681s-2(b)(1)(D)", "Failing to report dispute to all CRAs if dispute not resolved", FCRA_DAMAGES_STANDARD],
  ["§1681s-2(b)(1)(E)", "Failing to modify/delete/permanently block inaccurate information", FCRA_DAMAGES_STANDARD],
  ["§1681t", "Obtaining information under false pretenses", FCRA_DAMAGES_STANDARD],
].map(([section, description, damages]) => ({
  section,
  description,
  damages,
}));

export const sueForLaws: LawSection[] = [
  {
    id: "fdcpa",
    label: "FDCPA Violations",
    accent: "#3B82F6",
    violations: fdcpaViolations,
  },
  {
    id: "fcra",
    label: "FCRA Violations",
    accent: "#10B981",
    violations: fcraViolations,
  },
];

export const sueForNotes: string[] = [
  "FDCPA has a one-year statute of limitations from the date of violation.",
  "FCRA has a two-year statute of limitations from discovery of the violation, with an outside limit of five years from when the violation occurred.",
  "Class action provisions exist under both laws for widespread violations.",
  "Damages may be adjusted for inflation periodically.",
  "Courts have discretion in awarding damages within statutory limits.",
  'For FCRA, "willful" violations can receive statutory and punitive damages; "negligent" violations receive only actual damages.',
];

export const sueForDisclaimer =
  "This information is for educational purposes only and should not be considered legal advice. Consult with a consumer rights attorney for specific situations.";

export const sueForLastUpdated = "June 24, 2025";

/** Case-insensitive search across section, description and damages. */
export function searchViolations(
  violations: SueViolation[],
  query: string
): SueViolation[] {
  const q = query.trim().toLowerCase();
  if (!q) return violations;
  return violations.filter(
    (v) =>
      v.section.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q) ||
      v.damages.toLowerCase().includes(q)
  );
}
