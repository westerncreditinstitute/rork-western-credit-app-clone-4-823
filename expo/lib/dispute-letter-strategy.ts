/**
 * Shared AI Dispute Letter Strategy
 * ---------------------------------------------------
 * This is the single source of truth for "which dispute letter should be
 * mailed for this negative account" logic, used to fully automate the
 * "Prepare Dispute Letter" flow so the user never has to manually pick a
 * letter type themselves.
 *
 * Two different classification systems feed into this:
 *   1. The Equifax-derived `ParsedNegativeAccount.accountType` values
 *      ("charge-off" | "collection" | "late-payment" | "delinquent" |
 *      "unknown"), produced by `backend/equifax/equifax-client.ts`.
 *   2. The manual-report-parser's descriptive `negativeType` strings
 *      ("Collection Account", "Charge-off", "Late Payments", etc.), used
 *      by `backend/trpc/routes/ai-agents.ts`'s `NEGATIVE_TYPE_STRATEGY` /
 *      `analyzeCreditAccounts`.
 *
 * Both are normalized through `determineLetterStrategy()` below so every
 * entry point (Equifax dashboard, credit analysis modal, manual upload
 * flow) recommends the exact same letter type + legal rationale for a
 * given kind of negative item, with zero manual selection required.
 */

export interface LetterStrategy {
  letterType: string;
  rationale: string;
}

const DEFAULT_STRATEGY: LetterStrategy = {
  letterType: "609 Letter",
  rationale:
    "Start with a 609 documentation request to establish what the bureau actually has on file.",
};

/**
 * Descriptive negativeType strings (manual/parsed report flow) ->
 * recommended strategy. Mirrors NEGATIVE_TYPE_STRATEGY in
 * backend/trpc/routes/ai-agents.ts so both flows stay in sync.
 */
const NEGATIVE_TYPE_STRATEGY: Record<string, LetterStrategy> = {
  "Collection Account": {
    letterType: "809 Letter",
    rationale:
      "Collection accounts must be validated by the collector under FDCPA 809(b). Demanding validation first forces them to prove the debt is yours before it can legally remain.",
  },
  "Charge-off": {
    letterType: "623 Letter",
    rationale:
      "Charge-offs are reported by the original furnisher, so a 623 dispute sent directly to them triggers their FCRA 623(b) duty to investigate.",
  },
  "Late Payments": {
    letterType: "611 Letter",
    rationale:
      "A 611 method-of-verification request forces the bureau to disclose HOW it verified the late payment. Many cannot produce it, which leads to deletion.",
  },
  Foreclosure: {
    letterType: "609 Letter",
    rationale:
      "A 609 request compels the bureau to produce the original documentation supporting the foreclosure entry.",
  },
  Repossession: {
    letterType: "609 Letter",
    rationale:
      "Request the original contract and documentation. Repossession entries frequently lack complete records.",
  },
  Bankruptcy: {
    letterType: "611 Letter",
    rationale:
      "Bureaus often report bankruptcies without verifying with the court, which does not furnish this data. A 611 challenges that verification.",
  },
  "Derogatory Status": DEFAULT_STRATEGY,
};

/**
 * Equifax-derived accountType -> recommended strategy. Maps each of the
 * four concrete classifications onto the equivalent descriptive
 * negativeType above so the two systems never disagree.
 */
const ACCOUNT_TYPE_STRATEGY: Record<string, LetterStrategy> = {
  "charge-off": NEGATIVE_TYPE_STRATEGY["Charge-off"],
  collection: NEGATIVE_TYPE_STRATEGY["Collection Account"],
  "late-payment": NEGATIVE_TYPE_STRATEGY["Late Payments"],
  delinquent: NEGATIVE_TYPE_STRATEGY["Derogatory Status"],
  unknown: DEFAULT_STRATEGY,
};

/**
 * Given an Equifax-style accountType, returns the deterministic
 * AI-recommended letter type + rationale. Falls back to a status-string
 * scan (mirroring backend/equifax/equifax-client.ts's own mapAccountType
 * heuristics) when accountType is "unknown" but a raw status/delinquency
 * string is available, so accounts that came back unclassified still get
 * a sensible recommendation instead of always defaulting to 609.
 */
export function determineLetterStrategyFromAccountType(
  accountType: string | undefined,
  statusText?: string,
): LetterStrategy {
  if (accountType && ACCOUNT_TYPE_STRATEGY[accountType]) {
    if (accountType !== "unknown") {
      return ACCOUNT_TYPE_STRATEGY[accountType];
    }
  }

  const text = (statusText || "").toLowerCase();
  if (text.includes("charged off") || text.includes("charge-off")) {
    return NEGATIVE_TYPE_STRATEGY["Charge-off"];
  }
  if (text.includes("collection")) {
    return NEGATIVE_TYPE_STRATEGY["Collection Account"];
  }
  if (
    text.includes("late") ||
    text.includes("30 days") ||
    text.includes("60 days") ||
    text.includes("90 days") ||
    text.includes("120 days")
  ) {
    return NEGATIVE_TYPE_STRATEGY["Late Payments"];
  }
  if (text.includes("foreclos")) {
    return NEGATIVE_TYPE_STRATEGY["Foreclosure"];
  }
  if (text.includes("repossess")) {
    return NEGATIVE_TYPE_STRATEGY["Repossession"];
  }
  if (text.includes("bankrupt")) {
    return NEGATIVE_TYPE_STRATEGY["Bankruptcy"];
  }
  if (text.includes("delinquent")) {
    return NEGATIVE_TYPE_STRATEGY["Derogatory Status"];
  }

  return DEFAULT_STRATEGY;
}

/**
 * Given a manual-report-parser style negativeType string, returns the
 * deterministic AI-recommended letter type + rationale. Kept for parity /
 * potential reuse on the client; the backend's analyzeCreditAccounts()
 * has its own copy of this same table for the manual-upload flow.
 */
export function determineLetterStrategyFromNegativeType(
  negativeType: string | undefined,
): LetterStrategy {
  const type = negativeType || "Derogatory Status";
  return NEGATIVE_TYPE_STRATEGY[type] || DEFAULT_STRATEGY;
}
