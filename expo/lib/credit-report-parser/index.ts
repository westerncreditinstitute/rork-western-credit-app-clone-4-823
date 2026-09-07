// ============================================================
// lib/credit-report-parser/index.ts
// ============================================================
// Engine entry point — parse any credit report into the
// standardized ParsedCreditReport schema.
//
// Pipeline:
//   1. PRE-CHECKS      corruption ratio, truncation heuristics
//   2. DETECT          weighted bureau signatures (1 or 3 bureaus)
//   3. SPLIT           combined reports → per-bureau sections
//   4. PARSE           per-bureau account extraction
//   5. EXTRACT         inquiries / public records / personal info
//   6. VALIDATE        confidence aggregation, flags, warnings
//
// Backward compatibility: `toCompatAccounts()` maps the rich
// StandardAccount[] to the exact original ParsedAccount[] shape used by
// the app today (components, tRPC saveCreditAnalysis, DB JSONB, the
// recommendation engine, and the AI chat tool all keep working).
// ------------------------------------------------------------

import type {
  Bureau,
  ParsedAccountCompat,
  ParsedCreditReport,
  ParsedInquiry,
  ParsedPersonalInfo,
  ParsedPublicRecord,
  ReportFlag,
  SourceFormat,
  StandardAccount,
} from "./types";
import { collapseWhitespace, corruptionRatio } from "./normalize";
import { bureauConflicts, detectBureaus, splitCombinedReport } from "./detect";
import { dedupeAccounts, parseBureauAccounts } from "./parsers";

export type {
  Bureau,
  NegativeType,
  ParsedAccountCompat,
  ParsedCreditReport,
  ParsedInquiry,
  ParsedPersonalInfo,
  ParsedPublicRecord,
  PaymentHistoryMark,
  ReportFlag,
  SourceFormat,
  StandardAccount,
  AccountFlag,
} from "./types";
export { htmlToText, normalizeDate, normalizeMoney, maskAccountNumber } from "./normalize";
export { detectBureaus, splitCombinedReport, bureauConflicts } from "./detect";
export { classifyNegative, parsePaymentHistory } from "./parsers";

export interface ParseCreditReportOptions {
  /** Bureau the user manually selected (usually "auto"). Used to surface a
   *  bureau-conflict flag when it disagrees with the file's contents. */
  userBureau?: string;
  /** Format the text was extracted from (diagnostics only). */
  sourceFormat?: SourceFormat;
}

/** Overall report confidence: weighted blend of per-account confidence and
 *  coverage (fraction of accounts with core fields present). */
function overallConfidence(
  accounts: StandardAccount[],
  anchored: boolean,
): number {
  if (accounts.length === 0) return 0;
  const avg =
    accounts.reduce((sum, a) => sum + a.confidence, 0) / accounts.length;
  const coverage =
    accounts.reduce((sum, a) => {
      let have = 0;
      if (a.creditor !== "Unknown Creditor") have++;
      if (a.accountNumber) have++;
      if (a.balance && a.balance !== "Unknown") have++;
      if (a.status && a.status !== "Unknown") have++;
      if (a.openDate) have++;
      return sum + have / 5;
    }, 0) / accounts.length;
  let score = Math.round(avg * 0.7 + coverage * 100 * 0.3);
  if (!anchored) score = Math.round(score * 0.85);
  return Math.max(0, Math.min(100, score));
}

// ------------------------------------------------------------
// Pre-checks
// ------------------------------------------------------------

function preChecks(text: string, rawRatio: number): { flags: ReportFlag[]; warnings: string[] } {
  const flags: ReportFlag[] = [];
  const warnings: string[] = [];
  const ratio = rawRatio;

  if (ratio > 0.02 || (text.match(/\uFFFD/g) ?? []).length >= 2) {
    flags.push("binary-corruption");
    warnings.push(
      "This file looks partially corrupted (unprintable characters detected). " +
        "Some fields may be missing or wrong — please double-check the results.",
    );
  }

  // Truncation: text ends mid-value — last line looks like a dangling date,
  // money amount, or label, rather than a completed sentence/footer.
  const tail = collapseWhitespace(text).slice(-200);
  const tailLine = tail.split("\n").filter(Boolean).pop() ?? "";
  if (
    /\d{2}[\/\-]\d{2,4}\s*$/.test(tailLine) ||
    /\$\s?[\d,]*(\.\d*)?$/.test(tailLine) ||
    /[A-Za-z\s]{3,20}:\s*$/.test(tailLine)
  ) {
    flags.push("possible-truncation");
    warnings.push(
      "The report appears cut off before the end. Accounts near the very end may be missing.",
    );
  }

  return { flags, warnings };
}

// ------------------------------------------------------------
// Inquiries, public records, personal info extraction
// ------------------------------------------------------------

/** Slice out the inquiries section of a report (null when absent). */
function extractInquiriesSection(text: string): string | null {
  const start = text.search(
    /(?:^|\n)[^\n]*(?:inquiries\s+that\s+may|inquiries\s+viewed|requests\s+viewed|credit\s+inquiries|hard\s+inquiries|^inquiries\b|\binquiries\s*:)[^\n]*/i,
  );
  if (start === -1) return null;
  // End at the next major section header after the start.
  const rest = text.slice(start);
  const endM = rest.slice(1).match(
    /\n[^\n]*(?:public\s+records?|collections?\s|accounts?\s+(?:in\s+)?(?:good|negative)|potentially\s+negative|personal\s+information|end\s+of\s+report|consumer\s+statement|credit\s+score|disputes?\s)/i,
  );
  const section = endM ? rest.slice(0, 1 + endM.index! + endM[0].length) : rest.slice(0, 4000);
  return section;
}

const DATE_VALUE = String.raw`(?:[A-Za-z]{3,9}\.?\s?\d{0,2},?\s?\d{2,4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{2}[\/\-]\d{4})`;

/** Hard-inquiry rows: labeled ("Creditor: X  Date: 07/2024") or column
 *  rows ("07/2024   ACME BANK   Auto Loan") under an inquiries header. */
function parseInquiries(text: string, bureau: Bureau): ParsedInquiry[] {
  const out: ParsedInquiry[] = [];
  const section = extractInquiriesSection(text);
  if (!section) return out;
  const lines = collapseWhitespace(section).split("\n").filter(Boolean);

  // Labeled style (same line): "Creditor: ACME BANK  Date: 07/2024"
  for (const line of lines) {
    const m = line.match(
      /(?:creditors?|company|business)\s*[:\t]\s*(.{2,60}?)(?=\s{2,}|\s*(?:date|inquiry)\s*(?:of\s+inquiry)?\s*[:\t]|$)/i,
    );
    const d = line.match(new RegExp(String.raw`(?:date\s+of\s+inquiry|inquiry\s+date|date)\s*[:\t]\s*(${DATE_VALUE})`, "i"));
    if (m && d) {
      out.push({ creditor: m[1].trim(), date: d[1].trim(), sourceBureau: bureau });
    }
  }
  if (out.length > 0) return out;

  // Column style: "07/2024   ACME BANK   Auto Loan"
  for (const line of lines) {
    const row = line.match(
      new RegExp(String.raw`^(${DATE_VALUE})\s{2,}([A-Z][^\n]{2,60}?)(?=\s{2,}[A-Z]|$)`),
    );
    if (row) {
      out.push({ creditor: row[2].trim(), date: row[1].trim(), sourceBureau: bureau });
    }
  }
  return out;
}

/** Public records (bankruptcy / lien / judgment / foreclosure). */
function parsePublicRecords(text: string, bureau: Bureau): ParsedPublicRecord[] {
  const out: ParsedPublicRecord[] = [];
  const m = text.match(
    /(public\s+records?|legal\s+items?|courthouse\s+records?)\s*[:\t]?\s*\n([\s\S]{0,2000}?)(?=\n[^\n]*(?:inquiries|collections?\s|accounts?\s|personal\s+information|end\s+of\s+report|consumer\s+statement|disputes?\s|$))/i,
  );
  if (!m) return out;
  const lines = collapseWhitespace(m[2]).split("\n").filter(Boolean);
  const TYPES: Array<[string, RegExp]> = [
    ["Chapter 7 Bankruptcy", /chapter\s*7\s+bankruptcy|ch\.?\s*7\b/i],
    ["Chapter 13 Bankruptcy", /chapter\s*13\s+bankruptcy|ch\.?\s*13\b/i],
    ["Bankruptcy", /bankrupt/i],
    ["Tax Lien", /tax\s+lien/i],
    ["Judgment", /judg(e)?ment/i],
    ["Foreclosure", /foreclos/i],
    ["Lawsuit", /suit\s+filed|civil\s+suit/i],
  ];
  for (let i = 0; i < lines.length; i++) {
    const type = TYPES.find(([, re]) => re.test(lines[i]));
    if (!type) continue;
    // Public-record fields usually sit on the FOLLOWING lines — scan a
    // window of up to 5 lines for case number / date filed / status.
    const window = lines.slice(i, i + 5).join("\n");
    const caseNumber = window.match(
      /(?:case|docket)\s*(?:number|no\.?)?\s*[:\t]?\s*([A-Za-z0-9\-\/]{5,25})/i,
    )?.[1];
    const dateFiled = window.match(
      new RegExp(String.raw`(?:date\s+filed|filed(?:\s+date)?|liability)\s*[:\t]?\s*(${DATE_VALUE})`, "i"),
    )?.[1];
    const status = window.match(
      /(?:status|how\s+filed)\s*[:\t]?\s*([^\n:]{2,40}?)(?=\s{2,}|\s*$)/i,
    )?.[1];
    out.push({
      type: type[0],
      caseNumber,
      dateFiled,
      status: status?.trim(),
      sourceBureau: bureau,
    });
    i += 4; // consumed the window
  }
  return out;
}

/** Personal info from the report header (SSNs intentionally NOT extracted). */
function parsePersonalInfo(text: string): ParsedPersonalInfo {
  const out: ParsedPersonalInfo = { names: [], addresses: [], employment: [] };
  const lines = collapseWhitespace(text).split("\n");

  for (const line of lines.slice(0, 40)) {
    // "Name: John Q Consumer" / "Also Known As: Jon Consumer"
    const nm = line.match(
      /^(?:also\s+known\s+as\s+)?names?\s*[:\t]\s*(.{3,60}?)(?=\s{2,}|\s*$)/i,
    );
    if (nm && !out.names.includes(nm[1].trim())) out.names.push(nm[1].trim());
    // "Employment: ACME Corp Engineer 2019-04"
    const em = line.match(/^employment\s*[:\t]\s*(.{3,60}?)(?=\s{2,}|\s*$)/i);
    if (em && !out.employment!.includes(em[1].trim())) out.employment!.push(em[1].trim());
    // Label-style address: "Address: 123 Main St, Springfield, IL 62704"
    const am = line.match(
      /^address(?:es)?\s*[:\t]\s*(.{6,90}?)(?=\s{2,}|\s*$)/i,
    );
    if (am && !out.addresses.includes(am[1].trim())) out.addresses.push(am[1].trim());
    // Street-style line with a ZIP: "123 Main St, Springfield, IL 62704"
    const sm = line.match(
      /(\d{1,6}\s+[A-Za-z0-9][A-Za-z0-9\s.,'\-]{3,40}?\s(?:Rd|Dr|St|Ave|Blvd|Ln|Way|Ct|Hwy|Pkwy|Pl|Road|Drive|Street|Avenue|Boulevard|Lane|Court|Highway|Parkway|Place)\b[^\n]{0,40}?)\s+(\d{5}(?:-\d{4})?)\b/i,
    );
    if (sm) {
      const addr = collapseWhitespace(`${sm[1]} ${sm[2]}`).trim();
      if (!out.addresses.includes(addr)) out.addresses.push(addr);
    }
  }

  if (out.employment && out.employment.length === 0) delete out.employment;
  return out;
}

// ------------------------------------------------------------
// Compat mapping (backward-compatible ParsedAccount[])
// ------------------------------------------------------------

/** Map the rich StandardAccount[] to the exact original ParsedAccount[]
 *  shape. Old behavior kept ALL accounts (negatives carry negativeType;
 *  clean accounts have undefined negativeType) — preserved here.
 *  `negativeType` is OMITTED (not undefined) for clean accounts, matching
 *  the original component's exact JSON shape. */
export function toCompatAccounts(
  accounts: StandardAccount[],
): ParsedAccountCompat[] {
  return accounts.map((a) => {
    const compat: ParsedAccountCompat = {
      creditor: a.creditor,
      accountNumber: a.accountNumber,
      balance: a.balance,
      status: a.status,
      openDate: a.openDate,
      lastReported: a.lastReported,
    };
    if (a.negativeType) compat.negativeType = a.negativeType;
    return compat;
  });
}

// ------------------------------------------------------------
// Main entry point
// ------------------------------------------------------------

/** Parse a credit report (already extracted to text) into the
 *  standardized schema. Pure function — no I/O, no platform APIs. */
export function parseCreditReport(
  rawText: string,
  options: ParseCreditReportOptions = {},
): ParsedCreditReport {
  const sourceFormat: SourceFormat = options.sourceFormat ?? "text";
  // NOTE: corruptionRatio MUST run on the raw text — collapseWhitespace
  // strips NUL chars, which would hide binary corruption from preChecks.
  const rawRatio = corruptionRatio(rawText ?? "");
  const text = collapseWhitespace(rawText ?? "");
  const reportFlags: ReportFlag[] = [];
  const warnings: string[] = [];

  if (sourceFormat === "html") {
    reportFlags.push("html-cleanup");
    warnings.push(
      "This file was an HTML export — formatting was cleaned up before parsing.",
    );
  }

  // 1. Pre-checks (corruption / truncation)
  const pre = preChecks(text, rawRatio);
  reportFlags.push(...pre.flags);
  warnings.push(...pre.warnings);

  // 2. Bureau detection
  const detected = detectBureaus(text);
  if (detected.length === 0) {
    reportFlags.push("no-bureau-signature");
    warnings.push(
      "No recognized bureau header was found in this file. " +
        "Parsing used generic rules — results may need manual review.",
    );
  }

  // 3+4. Split combined reports → per-bureau sections → parse each
  let accounts: StandardAccount[] = [];
  let inquiries: ParsedInquiry[] = [];
  let publicRecords: ParsedPublicRecord[] = [];
  let blocksConsidered = 0;
  let anyAnchored = false;
  const bureauList: Bureau[] = detected.map((d) => d.bureau);

  const sections =
    bureauList.length > 1 ? splitCombinedReport(text) : [];
  if (bureauList.length > 1) reportFlags.push("multi-bureau-report");

  if (sections.length > 0) {
    for (const s of sections) {
      const res = parseBureauAccounts(s.text, s.bureau);
      blocksConsidered += res.blocksConsidered;
      anyAnchored = anyAnchored || res.anchored;
      accounts.push(...res.accounts);
      inquiries.push(...parseInquiries(s.text, s.bureau));
      publicRecords.push(...parsePublicRecords(s.text, s.bureau));
    }
    // Cross-section dedupe (same account reported by multiple bureaus)
    accounts = dedupeAccounts(accounts);
  } else {
    const bureau: Bureau = bureauList[0] ?? "unknown";
    const res = parseBureauAccounts(text, bureau);
    blocksConsidered = res.blocksConsidered;
    anyAnchored = res.anchored;
    accounts = res.accounts;
    inquiries = parseInquiries(text, bureau);
    publicRecords = parsePublicRecords(text, bureau);
  }

  // 5. Personal info (whole-file scan; header lives outside sections)
  const personalInfo = parsePersonalInfo(text);

  // 6. Validation
  if (accounts.length === 0) {
    reportFlags.push("no-accounts-found");
    warnings.push(
      "No account records could be read from this report. The file may be " +
        "scanned images (no embedded text) or a format we haven't seen yet.",
    );
  }

  const primary: Bureau =
    bureauList.length > 0 ? bureauList[0] : ("unknown" as Bureau);
  const confidence = overallConfidence(accounts, anyAnchored);
  if (accounts.length > 0 && confidence < 45) {
    reportFlags.push("low-overall-confidence");
    warnings.push(
      "Some details in this report were hard to read — fields marked with " +
        "low confidence should be double-checked before disputing.",
    );
  }

  if (
    bureauConflicts(options.userBureau ?? "auto", bureauList)
  ) {
    reportFlags.push("bureau-conflict");
    warnings.push(
      `You selected "${options.userBureau}" but the file looks like a ` +
        `${bureauList.map((b) => b[0].toUpperCase() + b.slice(1)).join(" / ")} report. ` +
        "It was parsed using the detected bureau's rules.",
    );
  }

  return {
    bureaus: bureauList.length > 0 ? bureauList : ["unknown"],
    bureau: primary,
    accounts,
    inquiries,
    publicRecords,
    personalInfo,
    confidence,
    reportFlags: Array.from(new Set(reportFlags)),
    warnings: Array.from(new Set(warnings)),
    stats: {
      inputChars: text.length,
      accountBlocksConsidered: blocksConsidered,
    },
    sourceFormat,
  };
}
