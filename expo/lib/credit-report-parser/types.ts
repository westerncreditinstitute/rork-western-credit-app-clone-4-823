// ============================================================
// lib/credit-report-parser/types.ts
// ============================================================
// Standardized data model for parsed credit reports.
//
// Design goals:
//   1. BACKWARD COMPATIBLE — `ParsedAccount` (see
//      components/CreditReportParser.tsx) keeps its exact shape so
//      existing `credit_report_analyses` rows, the tRPC
//      `saveCreditAnalysis` input, the recommendation engine, and the
//      AI chat tool keep working unchanged.
//   2. NORMALIZED — one canonical form regardless of source bureau:
//      dates as YYYY-MM-DD (when unambiguous), balances as
//      "1,234.56"-style strings, masked account numbers.
//   3. AUDITABLE — every account carries its source bureau, a
//      confidence score, and machine-readable flags so ambiguous data
//      is surfaced instead of silently mis-parsed.
// ============================================================

/** The three major bureaus this engine understands. */
export type Bureau = "equifax" | "experian" | "transunion" | "unknown";

/** How the input file was extracted to text (used for diagnostics). */
export type SourceFormat = "pdf" | "html" | "text";

/** Semantic negative types — matches NEGATIVE_TYPE_STRATEGY keys used by
 *  the backend recommendation engine (do not rename without migrating
 *  both sides + existing DB rows). */
export type NegativeType =
  | "Collection Account"
  | "Charge-off"
  | "Late Payments"
  | "Foreclosure"
  | "Repossession"
  | "Bankruptcy"
  | "Derogatory Status";

/** Backward-compatible account record — identical field names/types to the
 *  original ParsedAccount interface, so all existing consumers (DB JSONB,
 *  saveCreditAnalysis, analyzeCreditAccounts, dispute letter generation)
 *  continue to work without migration. */
export interface ParsedAccountCompat {
  creditor: string;
  accountNumber: string;
  balance: string;
  status: string;
  openDate: string;
  lastReported: string;
  negativeType?: string;
}

/** A parsed month from the 24-month payment-history grid. */
export interface PaymentHistoryMark {
  /** YYYY-MM (normalized when possible; raw text otherwise). */
  month: string;
  /** e.g. "OK" | "30" | "60" | "90" | "CO" | "KD" | "XX" (unknown). */
  mark: string;
}

/** Why an account is considered negative (evidence trail). */
export interface NegativeEvidence {
  matchedKeywords: string[];
  worstDelinquency?: string;
  publicRecord?: boolean;
}

/** The standardized, normalized account record. Everything the compat
 *  layer needs, plus the audit/quality layer. */
export interface StandardAccount {
  // ── compat layer (ParsedAccount shape) ──
  creditor: string;
  /** Masked account number, e.g. "****5678" or the bureau's own masked form. */
  accountNumber: string;
  /** "1,234.56" | "0.00" | "Unknown" when not found. */
  balance: string;
  /** Normalized payment status, e.g. "Open/Past due", "Paid/Closed". */
  status: string;
  /** YYYY-MM-DD when unambiguous; raw text when not. */
  openDate: string;
  lastReported: string;
  negativeType?: NegativeType;

  // ── audit layer (new) ──
  /** Bureau this account block came from ("equifax" etc.). */
  sourceBureau: Bureau;
  /** 0–100. See scoring rules in parsers.ts. */
  confidence: number;
  /** Machine-readable data-quality flags. */
  flags: AccountFlag[];
  /** Which fields were missing in the source (never silently defaulted). */
  missingFields: string[];
  /** True when the account looks derogatory. */
  isNegative: boolean;
  /** Payment-history grid marks when the source included one. */
  paymentHistory?: PaymentHistoryMark[];
  /** Keyword evidence behind isNegative. */
  evidence?: NegativeEvidence;
}

export type AccountFlag =
  | "low-text" // account block was very short → parse less reliable
  | "ambiguous-bureau" // fields came from the generic fallback, not a bureau-specific shape
  | "unparsed-balance" // balance text couldn't be normalized to a number
  | "unparsed-date" // date text couldn't be normalized to YYYY-MM-DD
  | "masked-id-unknown" // no account number/identifier found at all
  | "possible-duplicate" // same creditor+number appeared twice
  | "section-overlap" // fields bled in from a neighboring section
  | "partial-corruption"; // control chars / mojibake seen in the block

/** A hard-inquiry row. */
export interface ParsedInquiry {
  creditor: string;
  date: string;
  sourceBureau: Bureau;
}

/** A public record (bankruptcy, lien, judgment, foreclosure). */
export interface ParsedPublicRecord {
  type: string;
  caseNumber?: string;
  dateFiled?: string;
  status?: string;
  sourceBureau: Bureau;
}

/** Personal info found in the header (kept separate from accounts). */
export interface ParsedPersonalInfo {
  names: string[];
  addresses: string[];
  /** Raw matches — SSNs are intentionally NOT extracted. */
  employment?: string[];
  birthYear?: string;
}

/** Report-level data-quality flags. */
export type ReportFlag =
  | "no-accounts-found"
  | "bureau-conflict" // user said Equifax, text says Experian
  | "multi-bureau-report" // combined 3-bureau file
  | "low-overall-confidence"
  | "possible-truncation" // text ends mid-field
  | "binary-corruption" // NUL chars / high ratio of replacement chars
  | "html-cleanup" // HTML tags were stripped before parsing
  | "no-bureau-signature"; // no bureau named anywhere

/** The top-level standardized result. */
export interface ParsedCreditReport {  /** Every bureau detected in the file (length > 1 ⇒ combined report). */
  bureaus: Bureau[];
  /** Primary bureau (the one with the most account sections). */
  bureau: Bureau;
  accounts: StandardAccount[];
  inquiries: ParsedInquiry[];
  publicRecords: ParsedPublicRecord[];
  personalInfo: ParsedPersonalInfo;
  /** 0–100 weighted score for the whole parse. */
  confidence: number;
  reportFlags: ReportFlag[];
  /** Human-readable summary of problems (safe to show the user). */
  warnings: string[];
  /** Counts of input pages/chars, for diagnostics. */
  stats: {
    inputChars: number;
    accountBlocksConsidered: number;
  };
  /** Original extraction format. */
  sourceFormat: SourceFormat;
}
