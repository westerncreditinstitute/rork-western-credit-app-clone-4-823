// ============================================================
// lib/credit-report-parser/parsers.ts
// ============================================================
// Account-block parsing for each bureau + shared section splitting.
//
// Key upgrades over the current implementation:
//   1. PRIORITY-ORDERED SECTION ANCHORS — accounts are found by their
//      structural markers, tried in reliability order:
//        a) labeled creditor lines (Creditor/Company/Account Name,
//           Credit Grantor, TRADELINE)
//        b) "Account Number(s)" lines (labeled OR column header)
//        c) TransUnion "Account Type [&/] Number|Pay Status"
//        d) compact MM/YYYY rows (Equifax table style)
//      Only the FIRST anchor style that matches is used, so a block's
//      own field labels (e.g. "Account Type & Number" inside a
//      TRADELINE block) can never fragment the split.
//   2. LABELED-FIELD EXTRACTION FIRST — labeled hits are preferred;
//      positional guesses are used only when labels are missing and
//      lower the confidence score.
//   3. SPLIT-BOUNDARY CONTEXT — column-style layouts put the creditor
//      name on the LAST line of the previous split part; the splitter
//      carries those lines forward instead of losing them.
//   4. PAYMENT-HISTORY GRIDS — both inline pairs ("Aug 2024 - OK") and
//      two-row grids ("07/2024 06/2024 …" / "30 30 60 …") are parsed.
//   5. CONFIDENCE + FLAGS — every account carries a 0-100 score and
//      machine-readable flags; anything ambiguous is surfaced, never
//      silently defaulted.
// ------------------------------------------------------------

import type {
  Bureau,
  NegativeType,
  PaymentHistoryMark,
  StandardAccount,
  AccountFlag,
} from "./types";
import {
  collapseWhitespace,
  maskAccountNumber,
  normalizeDate,
  normalizeMoney,
} from "./normalize";

// ------------------------------------------------------------
// Regex building blocks
// ------------------------------------------------------------

/** Label→value separator: a colon/tab, or 2+ spaces (column gap).
 *  A SINGLE space does NOT separate — "Balance Date 09/2024" must not
 *  be read as balance "09". */
const SEP = String.raw`\s*(?:[:\t]|\s{2,})\s{0,2}`;

/** Value terminator: 2+ spaces before the next column, end of line,
 *  end of text, or a same-line "Label:" after the value.
 *  IMPORTANT: uses [ \t] (NOT \s) for line-scope alternatives — \s
 *  matches \n, which let the lookahead see labels on LATER lines and
 *  truncated values ("Collection account" → "Collection"). */
const VAL_END = String.raw`(?=\s{2,}[A-Za-z0-9$(]|[ \t]*\n|[ \t]*$|[ \t]+[A-Za-z][A-Za-z \t]{0,20}:)`;

/** Anchor styles, tried in priority order (see header note). */
function anchorSources(): string[] {
  return [
    // a) labeled creditor lines
    String.raw`Creditor\s*Name\s*[:\t]|Company\s*Name\s*[:\t]|Account\s*Name\s*[:\t]|Credit\s*Grantor\s*[:\t]|TRADELINE\b\s*[:\t]?`,
    // b) account-number lines (labeled "Account Number:" or Equifax's
    //    column header "Account Numbers  XXXX-1234")
    String.raw`Account\s*Numbers?\b`,
    // c) TransUnion combined label
    String.raw`Account\s*Type\s*(?:&|and|\/)?\s*(?:Number|Pay\s*Status)\b`,
    // d) compact Equifax row: "05/2019  XXXX-1234  Open …"
    String.raw`\d{2}[\/\-]\d{4}\s+[A-Za-z0-9*#x\-]{4,20}`,
  ];
}

/** Section headers that END an account block (inquiry/public-record
 *  noise bleeding into the last account). */
const SECTION_BREAK =
  /^(?:[^\w]*)(?:inquiries?|requests?\s+viewed|viewed\s+your\s+credit|credit\s+inquiries|hard\s+inquiries?|public\s+records?|collections?\s+section|potentially\s+negative|negative\s+items?|personal\s+information|credit\s+score|fico|employment\s+information|consumer\s+statement)/i;

/** Truncate a block at the first line that starts a new major section. */
function truncateAtSectionBreak(block: string): string {
  const lines = block.split("\n");
  const idx = lines.findIndex((l) => SECTION_BREAK.test(l.trim()));
  if (idx === -1) return block;
  return lines.slice(0, Math.max(0, idx)).join("\n");
}

export interface AccountBlock {
  text: string;
  /** Last few non-empty lines of the previous split part — column-style
   *  layouts put the creditor name here. */
  prevLines: string[];
}

export interface SplitResult {
  blocks: AccountBlock[];
  anchored: boolean;
  /** Regex source of the anchor style used (for overlap detection). */
  anchorSource?: string;
}

/**
 * Split a (single-bureau) report into account blocks using the bureau's
 * own account anchors (priority-ordered). Falls back to a constrained
 * company-suffix heuristic when no structural anchor exists (flagged
 * anchored=false so callers lower confidence).
 */
export function splitAccountBlocks(text: string, bureau: Bureau): SplitResult {
  const working = collapseWhitespace(text);
  let parts: string[] = [];
  let anchored = false;
  let anchorSource: string | undefined;

  for (const src of anchorSources()) {
    const re = new RegExp(String.raw`(?:^|\n)(?=` + src + String.raw`)`, "i");
    if (re.test(working)) {
      parts = working.split(re);
      anchored = true;
      anchorSource = src;
      break;
    }
  }
  if (!anchored) {
    // Fallback: split at company-line starts (the old heuristic, but
    // constrained and flagged so it can't masquerade as certainty)
    parts = working.split(
      /(?=(?:^|\n)[A-Z][A-Za-z&.,'\s]{2,40}?\s+(?:LLC|Inc\.?|Corp\.?|Bank|Credit|Services|Financial|Mortgage|Auto|Loans?|Union|Company|Agency|Associates|Group|Systems|Capital|Holdings|Ventures)\b)/,
    );
  }

  const blocks: AccountBlock[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (anchored && i === 0) continue; // preamble before the first anchor

    let text_i = collapseWhitespace(parts[i] ?? "");
    // When anchored at an account-number line, the LAST non-empty line
    // of this block is usually the NEXT account's creditor name (the
    // creditor sits above its own "Account Numbers" row). Hand it to the
    // next block instead of letting this one steal it.
    if (anchored && i < parts.length - 1 && text_i.length >= 40) {
      const tlines = text_i.split("\n").filter((l) => l.trim().length > 0);
      const last = tlines[tlines.length - 1];
      if (
        last &&
        looksLikeCreditorLine(last) &&
        !/Account\s*Numbers?\b/i.test(last) // next block's anchor itself
      ) {
        // Only strip when the next block starts with the anchor (not
        // with this creditor line already inside it).
        const nextRaw = collapseWhitespace(parts[i + 1] ?? "");
        const nextStartsWithAnchor = new RegExp(
          String.raw`^(?:` + (anchorSource ?? "") + String.raw`)`,
          "i",
        ).test(nextRaw);
        if (nextStartsWithAnchor) {
          tlines.pop();
          text_i = tlines.join("\n");
        }
      }
    }
    text_i = truncateAtSectionBreak(text_i);
    if (text_i.trim().length < 40) continue;

    // Split-boundary context: last few non-empty lines of the previous part.
    const prevLines: string[] = [];
    for (let j = i - 1; j >= 0 && prevLines.length < 3; j--) {
      const pl = collapseWhitespace(parts[j] ?? "")
        .split("\n")
        .filter((l) => l.trim().length > 0);
      for (let k = pl.length - 1; k >= 0 && prevLines.length < 3; k--) {
        prevLines.unshift(pl[k]);
      }
    }

    blocks.push({ text: text_i, prevLines });
  }

  // Final junk filters (disclaimers, footers, notices)
  const filtered = blocks.filter(
    (b) =>
      !/^(?:personal|identifying|consumer|contact|employment|disclaimer|important|notice|credit\s*score|fico|educational|summary|understanding)/i.test(
        b.text,
      ) &&
      !/report\s+(?:was|has|may)\b|annualcreditreport\.com\s*|consumerdata|this\s+report\b|©|powered\s+by/i.test(
        b.text.slice(0, 300),
      ),
  );

  return { blocks: filtered, anchored, anchorSource };
}

// ------------------------------------------------------------
// Field extraction helpers
// ------------------------------------------------------------

interface FieldHit {
  raw: string;
  /** Where the value came from: labeled field (high trust) or positional
   *  guess (low trust, lowers the account's confidence score). */
  method: "labeled" | "positional";
}

/** Match "Label: value" (or "Label␉value" / "Label  value"). */
function labeled(block: string, label: string, valueMax = 40): FieldHit | null {
  const re = new RegExp(
    label + SEP + String.raw`([^\n]{1,` + valueMax + String.raw`}?(?:\s{1,2}\d{1,4})?)` + VAL_END,
    "i",
  );
  const m = block.match(re);
  if (m && m[1] && m[1].trim()) {
    return { raw: m[1].trim(), method: "labeled" };
  }
  return null;
}

function positional(raw: string): FieldHit {
  return { raw: raw.trim(), method: "positional" };
}

/** A line plausibly being a creditor name (not a field label, not a
 *  section header, not a sentence). */
function looksLikeCreditorLine(line: string | undefined): boolean {
  if (!line) return false;
  const s = line.trim();
  if (s.length < 3 || s.length > 60) return false;
  if (/[:\t]\s*$/.test(s)) return false; // dangling label
  if (
    /^(?:accounts?|inquiries?|public\s+records?|collections?|potentially\s+negative|negative\s+items?|personal|identifying|employment|consumer|report|summary|payment\s+history|status\s+payments|trade\s*lines?)/i.test(
      s,
    )
  )
    return false;
  // Reject pure field-value lines ("Balance $1,234.00", "Open 09/2024")
  if (/^(?:balance|amount|status|opened|reported|type|terms|limit|past\s+due|high\s+balance)\b[\s$0-9]/i.test(s))
    return false;
  const words = s.split(/\s+/);
  if (words.length > 6) return false;
  if (/^[a-z]/.test(s)) return false;
  return /^[A-Z0-9&.,'\/\-() ]+$/.test(s) && /[A-Za-z]{3}/.test(s);
}

/** Creditor identity: labeled field → line above the anchor → all-caps
 *  business line → split-boundary context → block start (unanchored). */
function extractCreditor(
  block: string,
  bureau: Bureau,
  ctx: { prevLines: string[]; anchored: boolean },
): FieldHit | null {
  // 1. Labeled creditor fields (all bureaus)
  const labeledHit = labeled(
    block,
    String.raw`(?:Creditor\s*Name|Company\s*Name|Account\s*Name|Credit\s*Grantor|TRADELINE)`,
    60,
  );
  if (labeledHit) return labeledHit;

  const lines = block.split("\n").filter((l) => l.trim().length > 0);

  // 2. Column style: creditor line immediately ABOVE the anchor line
  //    (inside this block when the block starts lower).
  const anchorIdx = lines.findIndex((l) =>
    /Account\s*Numbers?\b|Account\s*Type\s*(?:&|and|\/)?\s*(?:Number|Pay\s*Status)|TRADELINE\b/i.test(
      l,
    ),
  );
  if (anchorIdx > 0 && looksLikeCreditorLine(lines[anchorIdx - 1])) {
    return positional(lines[anchorIdx - 1]);
  }

  // 3. All-caps business line (not a label, not a section header, not a
  //    payment-history marks row like "OK OK 30 60")
  const capsLine = lines.find(
    (l) =>
      /^[A-Z][A-Z0-9&.,'\/\-() ]{4,50}$/.test(l.trim()) &&
      !/(?:ACCOUNT|TRADELINE|COMPANY\s+NAME|CREDITOR|DATE|BALANCE|STATUS|PAYMENT|HISTORY|OPENED|REPORTED|INQUIRIES|PUBLIC|COLLECTIONS|EQUIFAX|EXPERIAN|TRANS\s?UNION|PERSONAL)\b/i.test(
        l,
      ) &&
      !/^([A-Z0-9]{1,4}[\s,]+)+[A-Z0-9]{0,4}$/g.test(l.trim()) && // marks row "OK  OK  30  60"
      !/\d/.test(l), // account rows have numbers; pure names rarely do
  );
  if (capsLine) return positional(capsLine);

  // 4. Split-boundary context: search the previous part's tail lines
  //    backwards for a creditor-looking line.
  for (let k = ctx.prevLines.length - 1; k >= 0; k--) {
    const tail = ctx.prevLines[k];
    const lm = tail.match(
      /(?:Creditor|Company|Account)\s*Name\s*[:\t]\s*(.{2,60})|TRADELINE\s*[:\t]\s*(.{2,60})|Credit\s*Grantor\s*[:\t]?\s*(.{2,60})/i,
    );
    if (lm) {
      const val = (lm[1] || lm[2] || lm[3] || "").trim();
      if (val) return positional(val);
    }
    if (looksLikeCreditorLine(tail)) return positional(tail);
  }

  // 5. Fallback (un-anchored mode): the block starts with the creditor.
  if (!ctx.anchored && looksLikeCreditorLine(lines[0])) {
    return positional(lines[0]);
  }

  return null;
}

function extractAccountNumber(block: string, _bureau: Bureau): FieldHit | null {
  // Labeled forms
  const hit =
    labeled(block, String.raw`Account\s*Numbers?\s*(?:\(s\))?`, 25) ||
    labeled(block, String.raw`Account\s*(?:#|No\.?|Num)`, 25);
  if (hit) return hit;

  // TransUnion "Account Type & Number: Collection  ****8888" — pick the
  // token that actually looks like an identifier (digits/mask), not the
  // account-type word.
  const tu = block.match(
    /Account\s*Type\s*(?:&|and)?\s*Number\s*[:\t]\s*([^\n]{2,40}?)(?=\s*\n|\s*$)/i,
  );
  if (tu) {
    const tokens = tu[1].trim().split(/\s+/);
    const idTok = tokens.find((t) => /^[A-Za-z0-9*\-x]{4,20}$/.test(t) && /[\dx*]/i.test(t));
    if (idTok) return positional(idTok);
    const last = tokens[tokens.length - 1];
    if (last && /^[A-Za-z0-9*\-x]{4,20}$/.test(last)) return positional(last);
  }

  // Bare "# ****1234" at line end
  const bare = block.match(/#\s*([A-Za-z0-9\-x*]{4,20})\s*(?=\n|$)/);
  if (bare) return positional(bare[1]);

  // Compact row: identifier token after the leading MM/YYYY
  const row = block.match(/\d{2}[\/\-]\d{4}\s+([A-Za-z0-9*#x\-]{4,20})(?=\s|\n|$)/);
  if (row) return positional(row[1]);

  return null;
}

function extractBalance(block: string, bureau: Bureau): FieldHit | null {
  const money = String.raw`\$?\s?[\d,]*\d(?:\.\d{2})?`;
  // NOTE: "Past Due Amount" is deliberately NOT treated as the balance —
  // the backend sums `balance` for totalNegativeBalance, so a mislabeled
  // past-due figure would corrupt totals.
  const labels: Record<string, string> = {
    equifax: String.raw`(?:Current\s*Balance|Recent\s*Balance|Balance|Amount\s*Owed)`,
    transunion: String.raw`(?:Recent\s*Balance|Balance|High\s*Balance|Amount\s*Owed)`,
    experian: String.raw`(?:Recent\s*Balance|Current\s*Balance|Balance|Amount\s*Owed)`,
    unknown: String.raw`(?:Recent\s*Balance|Current\s*Balance|Balance|Amount\s*Owed|High\s*Balance)`,
  };
  const label = labels[bureau] ?? labels.unknown;
  const labeledHit = labeled(block, label, 20);
  if (labeledHit) return labeledHit;

  // Positional: first bare DOLLAR amount in the block (compact rows).
  // The $ is REQUIRED — without it, date fragments ("05" of 05/2019)
  // would match.
  const bare = block.match(new RegExp(String.raw`(\$\s?[\d,]*\d(?:\.\d{2})?)(?=\s|\n|$)`));
  if (bare) return positional(bare[1]);
  return null;
}

function extractStatus(block: string, _bureau: Bureau): FieldHit | null {
  const pats: Array<{ label: string; method: "labeled" | "positional" }> = [
    { label: String.raw`(?:Pay\s*Status|Paystatus)`, method: "labeled" },
    {
      label: String.raw`(?:Account\s*Condition|Account\s*Status|Payment\s*Status|Manner\s*of\s*Payment|Status)`,
      method: "labeled",
    },
    { label: String.raw`Account\s*Type\s*\/\s*Pay\s*Status`, method: "labeled" },
  ];
  for (const { label, method } of pats) {
    const hit = labeled(block, label, 60);
    if (hit) return hit;
  }
  // Positional: bare days-past-due wording anywhere in the block
  const m = block.match(
    /\b((?:30|60|90|120|150|180)\+?\s*days?\s*(?:past\s*due|late|delinquent))\b/i,
  );
  if (m) return positional(m[1]);
  return null;
}

function extractOpenDate(block: string, _bureau: Bureau): FieldHit | null {
  const hit =
    labeled(block, String.raw`Date\s*Opened`, 20) ||
    labeled(block, String.raw`(?:Opened|Open)\s*Date`, 20) ||
    labeled(block, String.raw`Opened`, 20);
  if (hit) return hit;
  // Compact row: the leading MM/YYYY
  const row = block.match(/(\d{2}[\/\-]\d{4})\s+[A-Za-z0-9*#x\-]{4,20}/);
  if (row) return positional(row[1]);
  return null;
}

function extractLastReported(block: string, _bureau: Bureau): FieldHit | null {
  return (
    labeled(block, String.raw`(?:Last\s*Reported|Reported\s*Date|Date\s*Reported)`, 20) ||
    labeled(block, String.raw`Date\s*Updated`, 20) ||
    labeled(block, String.raw`(?:Status\s*Updated|Date\s*of\s*Status|Date\s*of\s*Last\s*Update)`, 20)
  );
}

// ------------------------------------------------------------
// Payment history grid
// ------------------------------------------------------------

/** Parse a 24-month payment grid. Supports inline pairs
 *  ("Aug 2024 - OK") and two-row layouts
 *  ("07/2024  06/2024 …" over "30  30  60 …"). */
export function parsePaymentHistory(block: string): PaymentHistoryMark[] | undefined {
  const m = block.match(
    /(?:payment\s*history|24\s*months?|months?\s*reviewed)\s*[:\t]?\s*\n?([\s\S]{20,900}?)(?=\n\s*\n|\n(?:[A-Za-z]{3,}\s+[A-Za-z]{3,})|$)/i,
  );
  if (!m) return undefined;
  const grid = m[1];
  const marks: PaymentHistoryMark[] = [];

  // Style A: inline pairs — "Aug 2024 - OK" / "Aug-2024 OK" / "2024-08 OK"
  const pairRe = /([A-Za-z]{3,9})[\s-]*(\d{2,4})\s*[-–]\s*(OK|CL|CO|KD|XX|30|60|90|120|150|180)\b/gi;
  let pm: RegExpExecArray | null;
  while ((pm = pairRe.exec(grid)) !== null) {
    const monthNum = monthFromName(pm[1]);
    if (!monthNum) continue;
    const year = String(pm[2]).length === 2 ? `20${pm[2]}` : String(pm[2]);
    marks.push({ month: `${year}-${monthNum}`, mark: pm[3].toUpperCase() });
  }
  if (marks.length >= 3) return marks;

  // Style B: two aligned rows — month tokens over mark tokens
  const lines = grid.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length - 1; i++) {
    const monthsRow = lines[i].split(/\s{1,4}/);
    const marksRow = lines[i + 1].split(/\s{1,4}/);
    const monthTokens = monthsRow.filter((t) => isMonthToken(t));
    const markTokens = marksRow.filter((t) => /^(?:OK|CL|CO|KD|XX|30|60|90|120|150|180)$/i.test(t));
    if (monthTokens.length >= 3 && markTokens.length >= 3) {
      const zipped: PaymentHistoryMark[] = [];
      let mi = 0;
      for (const t of monthsRow) {
        if (!isMonthToken(t)) continue;
        if (
          mi < marksRow.length &&
          /^(?:OK|CL|CO|KD|XX|30|60|90|120|150|180)$/i.test(marksRow[mi])
        ) {
          const norm = normalizeMonthToken(t);
          if (norm) zipped.push({ month: norm, mark: marksRow[mi].toUpperCase() });
        }
        mi++;
      }
      if (zipped.length >= 3) return zipped;
    }
  }
  return marks.length >= 3 ? marks : undefined;
}

function isMonthToken(t: string): boolean {
  return /^(?:\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}|[A-Za-z]{3,9}[\s\-]?\d{2,4})$/.test(t);
}

function normalizeMonthToken(t: string): string | null {
  // "07/2024" | "07-2024"
  let m = t.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[2]}-${m[1].padStart(2, "0")}`;
  // "2024-07"
  m = t.match(/^(\d{4})[\/\-](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  // "Aug 2024" | "Aug-2024"
  m = t.match(/^([A-Za-z]{3,9})[\s\-]?(\d{2,4})$/);
  if (m) {
    const mn = monthFromName(m[1]);
    if (mn) {
      const y = m[2].length === 2 ? `20${m[2]}` : m[2];
      return `${y}-${mn}`;
    }
  }
  return null;
}

function monthFromName(name: string): string | null {
  const MONTHS: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  return MONTHS[name.slice(0, 3).toLowerCase()] ?? null;
}

// ------------------------------------------------------------
// Negative-type classification (BACKWARD-COMPATIBLE vocabulary)
// ------------------------------------------------------------

/** Same outputs as the old determineNegativeType — the backend strategy
 *  table (NEGATIVE_TYPE_STRATEGY) keys on these exact strings. */
export function classifyNegative(
  status: string,
  block: string,
): { negativeType: NegativeType; isNegative: boolean; evidence: string[] } {
  const ls = (status || "").toLowerCase();
  const lb = block.toLowerCase();
  const evidence: string[] = [];

  const tests: Array<[NegativeType, RegExp, RegExp]> = [
    ["Collection Account", /collection|placed\s+for\s+collection|sold\s+to\s+(?:a\s+)?(?:third|3rd)[\s-]party|transfer(?:red)?\s+to\s+collection/i, /collection/i],
    ["Charge-off", /charg?e[d]?\s*[- ]?off|write[d]?\s*[- ]?off|bad\s*debt/i, /charge\s*[- ]?off|bad\s*debt/i],
    ["Late Payments", /past\s*due|delinq|late\s+payment|\b(?:30|60|90|120|150|180)\+?\s*days?\b/i, /late|delinq|past\s*due/i],
    ["Foreclosure", /foreclos/i, /foreclos/i],
    ["Repossession", /repossess/i, /repossess/i],
    ["Bankruptcy", /bankrupt/i, /bankrupt/i],
  ];

  for (const [type, statusRe, blockRe] of tests) {
    if (statusRe.test(ls) || blockRe.test(lb)) {
      if (statusRe.test(ls)) evidence.push(`status: "${status.trim().slice(0, 40)}"`);
      if (blockRe.test(lb)) evidence.push(`report text: matched /${blockRe.source}/`);
      return { negativeType: type, isNegative: true, evidence };
    }
  }

  // Additional derogatory wording (fell through to "Derogatory Status"
  // in the old generic keyword list too).
  if (
    /settled\s+for\s+less|in\s+default|defaulted|voluntary\s+surrender|forfeit|written\s+off|unpaid\s+balance\s+written\s+off/i.test(
      lb,
    )
  ) {
    return {
      negativeType: "Derogatory Status",
      isNegative: true,
      evidence: ["report text: matched derogatory wording (settled/defaulted/surrendered)"],
    };
  }

  // Potentially-negative section headers (Experian/Equifax style)
  if (/potentially\s+negative|adverse|negative\s*(?:items|accounts|information)|derog/i.test(lb)) {
    return {
      negativeType: "Derogatory Status",
      isNegative: true,
      evidence: ["report text: account appears in a negative/adverse section"],
    };
  }

  return { negativeType: "Derogatory Status", isNegative: false, evidence };
}

// ------------------------------------------------------------
// Confidence scoring
// ------------------------------------------------------------

export interface AccountScoreInput {
  creditor: FieldHit | null;
  accountNumber: FieldHit | null;
  balance: FieldHit | null;
  status: FieldHit | null;
  openDate: FieldHit | null;
  lastReported: FieldHit | null;
  anchored: boolean;
  blockLength: number;
  dateWasNormalized: boolean;
  balanceWasNormalized: boolean;
}

/** 0-100. Labeled fields dominate; positional guesses add less. */
export function scoreAccount(input: AccountScoreInput): number {
  let score = 0;
  const fields = [
    input.creditor,
    input.accountNumber,
    input.balance,
    input.status,
    input.openDate,
    input.lastReported,
  ];
  const labeledCount = fields.filter((f) => f && f.method === "labeled").length;
  const positionalCount = fields.filter((f) => f && f.method === "positional").length;
  score += Math.min(60, labeledCount * 12); // 5 labeled fields ≈ 60
  score += Math.min(12, positionalCount * 4);
  if (input.creditor) score += input.creditor.method === "labeled" ? 8 : 4;
  if (input.anchored) score += 12;
  else score -= 8;
  if (input.blockLength < 120) score -= 10;
  if (input.dateWasNormalized) score += 8;
  if (input.balanceWasNormalized) score += 8;
  if (!input.accountNumber) score -= 6;
  return Math.max(0, Math.min(100, score));
}

// ------------------------------------------------------------
// Per-bureau account parsing
// ------------------------------------------------------------

/** Parse one account block into a StandardAccount (with flags+confidence). */
export function parseAccountBlock(
  block: string,
  bureau: Bureau,
  anchored: boolean,
  prevLines: string[] = [],
  anchorSource?: string,
): StandardAccount {
  const ctx = { prevLines, anchored };
  const creditor = extractCreditor(block, bureau, ctx);
  const accountNumber = extractAccountNumber(block, bureau);
  const balance = extractBalance(block, bureau);
  const status = extractStatus(block, bureau);
  const openDate = extractOpenDate(block, bureau);
  const lastReported = extractLastReported(block, bureau);

  const flags: AccountFlag[] = [];
  const missingFields: string[] = [];

  const creditorText = creditor?.raw ?? "Unknown Creditor";
  const accountNumberText = accountNumber ? maskAccountNumber(accountNumber.raw) : "";
  if (!accountNumber) {
    missingFields.push("accountNumber");
    flags.push("masked-id-unknown");
  }
  const balanceText = balance ? (normalizeMoney(balance.raw) ?? balance.raw) : "";
  if (balance && !normalizeMoney(balance.raw)) flags.push("unparsed-balance");
  if (!balance) missingFields.push("balance");
  const statusText = status?.raw ?? "";
  if (!status) missingFields.push("status");
  const openDateHit = openDate ? (normalizeDate(openDate.raw) ?? openDate.raw) : "";
  const openDateNorm = openDate ? normalizeDate(openDate.raw) !== null : false;
  if (openDate && !openDateNorm) flags.push("unparsed-date");
  if (!openDate) missingFields.push("openDate");
  const lastReportedText = lastReported
    ? (normalizeDate(lastReported.raw) ?? lastReported.raw)
    : "";
  if (!lastReported) missingFields.push("lastReported");

  if (block.length < 120) flags.push("low-text");
  if (!anchored) flags.push("ambiguous-bureau");
  // Partial corruption: collapseWhitespace converts NUL runs to a single
  // replacement char, which survives here as a corruption marker.
  if (/\uFFFD/.test(block)) flags.push("partial-corruption");
  // Section overlap: the chosen anchor appearing 2+ times inside ONE
  // block means the splitter missed a boundary (fields may have bled).
  if (anchorSource) {
    const overlapRe = new RegExp(anchorSource, "gi");
    if ((block.match(overlapRe) ?? []).length >= 2) flags.push("section-overlap");
  }

  const { negativeType, isNegative, evidence } = classifyNegative(statusText, block);

  const confidence = scoreAccount({
    creditor,
    accountNumber,
    balance,
    status,
    openDate,
    lastReported,
    anchored,
    blockLength: block.length,
    dateWasNormalized: openDateNorm,
    balanceWasNormalized: !!balance && normalizeMoney(balance.raw) !== null,
  });

  return {
    creditor: creditorText,
    accountNumber: accountNumberText,
    balance: balanceText || "Unknown",
    status: statusText || "Unknown",
    openDate: openDateHit,
    lastReported: lastReportedText,
    negativeType: isNegative ? negativeType : undefined,
    sourceBureau: bureau,
    confidence,
    flags,
    missingFields,
    isNegative,
    paymentHistory: parsePaymentHistory(block),
    evidence: isNegative ? { matchedKeywords: evidence } : undefined,
  };
}

/** Dedup key: creditor + account number when present, else balance. */
function accountKey(a: StandardAccount): string {
  const base = `${a.creditor.toLowerCase()}|`;
  if (a.accountNumber) return base + a.accountNumber;
  return base + (a.balance || "");
}

function dedupeFlags(flags: AccountFlag[]): AccountFlag[] {
  return Array.from(new Set(flags));
}

/** Merge + dedupe account lists (multi-bureau combined reports). Keeps
 *  the higher-confidence parse of each account and flags it as a
 *  cross-section duplicate. */
export function dedupeAccounts(accounts: StandardAccount[]): StandardAccount[] {
  const seen = new Map<string, StandardAccount>();
  for (const a of accounts) {
    const key = accountKey(a);
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, a);
    } else if (a.confidence > prev.confidence) {
      seen.set(key, { ...a, flags: dedupeFlags([...a.flags, "possible-duplicate"]) });
    } else {
      prev.flags = dedupeFlags([...prev.flags, "possible-duplicate"]);
    }
  }
  return Array.from(seen.values());
}

/** Parse a whole single-bureau report into StandardAccounts. */
export function parseBureauAccounts(
  text: string,
  bureau: Bureau,
): { accounts: StandardAccount[]; anchored: boolean; blocksConsidered: number } {
  const { blocks, anchored, anchorSource } = splitAccountBlocks(text, bureau);
  const accounts: StandardAccount[] = [];
  for (const b of blocks) {
    const acct = parseAccountBlock(b.text, bureau, anchored, b.prevLines, anchorSource);
    // Drop blocks that identify NOTHING — header/boilerplate fragments.
    const identifiable =
      acct.creditor !== "Unknown Creditor" ||
      acct.accountNumber !== "" ||
      (acct.balance !== "Unknown" && acct.balance !== "");
    if (!identifiable) continue;
    accounts.push(acct);
  }
  return {
    accounts: dedupeAccounts(accounts),
    anchored,
    blocksConsidered: blocks.length,
  };
}
