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
    // NOTE: "TRADELINE" must not match TransUnion's "Tradeline Summary"
    // section header — require it NOT be followed by "Summary".
    // NOTE: the separator after the label is [:\t] OR 2+ spaces — some
    // PDF text extractors (observed on Experian's printable-report
    // export, e.g. "Account name                    AMEX") render the
    // label/value gap as pure whitespace with no colon or tab at all,
    // so requiring [:\t] here caused this anchor style to never match
    // on that export and silently fall through to a less reliable one.
    String.raw`Creditor\s*Name\s*(?:[:\t]|\s{2,})|Company\s*Name\s*(?:[:\t]|\s{2,})|Account\s*Name\s*(?:[:\t]|\s{2,})|Credit\s*Grantor\s*(?:[:\t]|\s{2,})|TRADELINE\b(?!\s*Summar)\s*[:\t]?`,
    // b) account-number lines (labeled "Account Number:" or Equifax's
    //    column header "Account Numbers  XXXX-1234")
    String.raw`Account\s*Numbers?\b`,
    // c) TransUnion combined label
    String.raw`Account\s*Type\s*(?:&|and|\/)?\s*(?:Number|Pay\s*Status)\b`,
    // c2) Experian combined label row: "Address:  Account Number:" —
    // appears once directly under each account's creditor-name line.
    String.raw`Address\s*[:\t]\s*Account\s*Number\s*[:\t]`,
    // d) TransUnion "tenant screening" style tradeline row: each
    //    tradeline block starts with a bare creditor-name line followed
    //    by "Opened ... Closed ... Verified ..." — anchor on that row
    //    (the creditor name itself is picked up via the line-above rule
    //    in extractCreditor).
    String.raw`Opened\b[^\n]*?Closed\b[^\n]*?Verified\b`,
    // e) compact Equifax row: "05/2019  XXXX-1234  Open …"
    String.raw`\d{2}[\/\-]\d{4}\s+[A-Za-z0-9*#x\-]{4,20}`,
  ];
}

/** Section headers that END an account block (inquiry/public-record
 *  noise bleeding into the last account). */
const SECTION_BREAK =
  /^(?:[^\w]*)(?:inquiries?|requests?\s+viewed|viewed\s+your\s+credit|credit\s+inquiries|hard\s+inquiries?|public\s+records?|collections?\s+section|potentially\s+negative|negative\s+items?|personal\s+information|credit\s+score|fico|employment\s+information|consumer\s+statement)/i;

/** A line that is ONLY a section-header word ("Collections",
 *  "Public Records", "Trade Lines") — no digits, no data. Distinct
 *  from SECTION_BREAK so Equifax compact rows legitimately ending in
 *  the word "Collection" (the status column) are never truncated. */
const BARE_HEADER_RE =
  /^(?:collections?|public\s+records?|inquiries?|trade\s*lines?|accounts?)$/i;

/** Truncate a block at the first line that starts a new major section
 *  or is a bare section-header word. */
function truncateAtSectionBreak(block: string): string {
  const lines = block.split("\n");
  const idx = lines.findIndex(
    (l) => SECTION_BREAK.test(l.trim()) || BARE_HEADER_RE.test(l.trim()),
  );
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
    // NOTE: [ \t]* between the line start and the lookahead is required.
    // Some PDF text extractors (observed on Experian's printable-report
    // export) indent every field-label line with leading spaces
    // ("\n Account name  AMEX  Balance  $16,329"), so anchoring on a
    // BARE (?:^|\n) never matched a single account in that format and
    // silently fell through to the much less reliable fallback
    // heuristic below \u2014 which is what caused two concrete bugs on a
    // real Experian report: (1) the account's own furnisher-city line
    // ("SAN FRANCISCO,") got misread as a second creditor name, and
    // (2) a closed, "potentially negative" auto loan with a 30-day-late
    // payment-history mark was dropped from isNegative entirely because
    // its payment-history grid text bled across the (mis-split) block
    // boundary. Allowing leading spaces/tabs here fixes both by letting
    // the primary, most-reliable anchor style match as intended.
    const re = new RegExp(String.raw`(?:^|\n)[ \t]*(?=` + src + String.raw`)`, "i");
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
  // All-caps business line (the common case), OR a mixed-case business
  // name that starts with a digit/capital and ends in a recognizable
  // company-type word (some real Equifax reports print creditor names
  // in title case, e.g. "123 Mortgage Company").
  if (/^[A-Z0-9&.,'\/\-() ]+$/.test(s) && /[A-Za-z]{3}/.test(s)) return true;
  if (
    /^[0-9A-Z][A-Za-z0-9&.,'\/\-() ]*\s+(?:Company|Corp|Inc|LLC|Bank|Credit|Union|Mortgage|Loans?|Card|Cards|Financial|Services|Lending)\.?$/.test(
      s,
    )
  )
    return true;
  return false;
}

/** Creditor identity: labeled field → line above the anchor → all-caps
 *  business line → split-boundary context → block start (unanchored). */
export function extractCreditor(
  block: string,
  bureau: Bureau,
  ctx: { prevLines: string[]; anchored: boolean },
): FieldHit | null {
  // 1. Labeled creditor fields (all bureaus)
  // NOTE: Equifax's compact per-account TABLE HEADER row ("Account
  // Name   Account Number   Balance   Past Due Account Status") can
  // bleed into the tail of a block that belongs to the PREVIOUS
  // account (it's the header for the NEXT open-accounts sub-table).
  // Reject any "hit" whose value is itself just another field-label
  // word — that's the header row, not a real creditor name.
  const labeledHit = labeled(
    block,
    String.raw`(?:Creditor\s*Name|Company\s*Name|Account\s*Name|Credit\s*Grantor|TRADELINE)`,
    60,
  );
  if (
    labeledHit &&
    !/^(?:Account\s*Number|Balance|Past\s*Due|Account\s*Status|Date\s*Opened|Date|Status)s?$/i.test(
      labeledHit.raw.trim(),
    )
  ) {
    return labeledHit;
  }

  const lines = block.split("\n").filter((l) => l.trim().length > 0);

  // 2. Column style: creditor line immediately ABOVE the anchor line
  //    (inside this block when the block starts lower).
  const anchorIdx = lines.findIndex((l) =>
    /Account\s*Numbers?\b|Account\s*Type\s*(?:&|and|\/)?\s*(?:Number|Pay\s*Status)|TRADELINE\b|Address\s*[:\t]\s*Account\s*Number\s*[:\t]/i.test(
      l,
    ),
  );
  if (anchorIdx > 0 && looksLikeCreditorLine(lines[anchorIdx - 1])) {
    return positional(lines[anchorIdx - 1]);
  }

  // 2b. Block begins RIGHT AT its anchor line (no lines before it in
  //    this block) — this happens for both the TransUnion tenant-report
  //    "Opened ... Closed ... Verified" row AND Equifax's labeled
  //    "Account Number:" detail line. In both cases the creditor name
  //    is NEVER inside this block; it's in the split-boundary context
  //    (prevLines), directly above the compact table row / address
  //    block. Check this BEFORE the generic in-block all-caps scan
  //    below, since that scan can otherwise pick up a payment-history
  //    "N/A  N/A" cell, or (for Equifax) a wrapped creditor-name
  //    fragment / detail-section header bleeding in from the START of
  //    the NEXT account (e.g. "XYZ INSTALLMENT LOANS" appearing near
  //    the end of THIS block, before the split boundary).
  const firstLine = lines[0] ?? "";
  const blockStartsAtAnchor =
    /^Opened\b.*?Closed\b.*?Verified\b/i.test(firstLine) ||
    /^Account\s*Numbers?\s*[:\t]/i.test(firstLine) ||
    /^Address\s*[:\t]\s*Account\s*Number\s*[:\t]/i.test(firstLine);
  if (blockStartsAtAnchor) {
    // Search prevLines backwards (nearest first), skipping obvious
    // address lines (contain digits) and taking the first plausible
    // creditor-looking line — but prefer a LONGER candidate over a
    // short wrapped fragment appearing closer to the boundary (e.g.
    // "EQUITY" wrapped-fragment vs. the full "ABC HOME EQUITY" line
    // right above it).
    let best: string | null = null;
    for (let k = ctx.prevLines.length - 1; k >= 0; k--) {
      const tail = ctx.prevLines[k];
      if (looksLikeCreditorLine(tail)) {
        if (!best || tail.length > best.length) best = tail;
      }
    }
    if (best) return positional(best);
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
// Furnisher (creditor) address
// ------------------------------------------------------------

/** A bare street-address line: starts with a house number and contains
 *  a common street-suffix word, OR starts with "PO Box"/"Lockbox" (no
 *  leading house number). E.g. "100 CENTER RD", "5333 Finsbury Ave",
 *  "PO BOX 901003 FORT". */
const STREET_LINE_RE =
  /^(?:\d{1,6}\s+[A-Za-z0-9.'\-\s]{2,40}\b(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ct|Court|Ln|Lane|Way|Pl|Place|Pkwy|Parkway|Cir|Circle|Ter|Terrace|Hwy|Highway|Sq|Square|Trl|Trail|Center|Ctr)\b\.?,?\s*[A-Za-z0-9#.\-\s]*|(?:PO\s*Box|P\.?O\.?\s*Box|Lockbox)\b[A-Za-z0-9#.\-\s]*)$/i;

/** A "CITY, ST ZIP" line, e.g. "BUFFALO, NY 10000" or "ANYTOWN CA 11111". */
const CITY_STATE_ZIP_RE =
  /^[A-Za-z][A-Za-z.'\-\s]{1,30},?\s+[A-Z]{2}[\-\s]?\d{5}(?:-\d{4})?$/;

/** A line that is ONLY a city name (optionally trailing a comma), with
 *  no state/zip — the first half of a city split across two lines
 *  (observed on Experian's export: "SAN FRANCISCO," / "FORT WORTH,"
 *  each followed on the NEXT line by "CA 94108" / "TX 76101"). */
const CITY_ONLY_RE = /^[A-Za-z][A-Za-z.'\-\s]{1,30},$/;

/** A line that is ONLY "ST ZIP" (state code + zip, no city) — the
 *  second half of a city/state/zip pair split across two lines. */
const STATE_ZIP_ONLY_RE = /^[A-Z]{2}[\-\s]?\d{5}(?:-\d{4})?$/;

/** A bare phone-number line, e.g. "(555) 555-5555" — commonly the 3rd
 *  address line; appended when immediately following a matched address. */
const PHONE_LINE_RE = /^\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}$/;

/** Does this line look like a piece of a furnisher's mailing address
 *  (street line OR city/state/zip line)? Used to scan prevLines/block
 *  start for address fragments near the creditor name. */
function looksLikeAddressLine(line: string | undefined): boolean {
  if (!line) return false;
  const s = line.trim();
  if (s.length < 5 || s.length > 60) return false;
  return STREET_LINE_RE.test(s) || CITY_STATE_ZIP_RE.test(s);
}

/** Furnisher (creditor) address: labeled "Address:" field first, then
 *  a positional scan of the lines immediately around the creditor name
 *  (prevLines tail, or the block's own early lines) for a street line
 *  plus following city/state/zip line(s). Returns undefined when
 *  nothing plausible is found — never guesses from unrelated text.
 *
 *  NOTE on multi-line addresses: some report exports (observed on
 *  Experian's printable-report format) wrap a single continuous
 *  address across 2-3 physical lines with NO field-boundary alignment
 *  — the line break can fall mid-city-name, e.g.:
 *    "PO BOX 901003 FORT" / "WORTH," / "TX 76101"
 *  which is really just "PO BOX 901003 FORT WORTH, TX 76101" wrapped
 *  by the PDF renderer's column width. Since the comma is already
 *  embedded in the text at the correct spot, the correct repair is a
 *  plain SPACE join of every captured line — not a smarter city/state
 *  split — otherwise city names get corrupted (e.g. "FORT" and
 *  "WORTH," ending up as separate tokens instead of one city). */
function extractAddress(
  block: string,
  ctx: { prevLines: string[]; anchored: boolean },
): string | undefined {
  // 1. Labeled "Address" field — capture everything up to the next
  //    blank line or the "Phone number" label, since this report
  //    format wraps a single address across 2-3 physical lines with
  //    no colon/comma glue between them.
  const addrBlockRe = new RegExp(
    String.raw`Address\s*(?:[:\t]|\s{2,})\s*\n?([\s\S]{3,150}?)(?=\n\s*\n|\n\s*Phone\s*number|$)`,
    "i",
  );
  const abm = block.match(addrBlockRe);
  if (abm && abm[1]) {
    const rawLines = abm[1]
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (rawLines.length > 0) {
      const joined = rawLines.join(" ").replace(/\s{2,}/g, " ").trim();
      if (joined.length >= 5) return joined;
    }
  }

  // 2. Scan prevLines (nearest-to-block-start first) for a street line,
  //    then greedily append following address-continuation lines
  //    (city/state/zip, possibly wrapped across 1-2 more lines) up to
  //    a phone-number line or a line that no longer looks like address
  //    text.
  const candidates: string[] = [...ctx.prevLines, ...block.split("\n").slice(0, 4)];
  for (let i = 0; i < candidates.length; i++) {
    const line = candidates[i]?.trim();
    if (line && STREET_LINE_RE.test(line)) {
      const parts = [line];
      for (let k = i + 1; k < candidates.length && k < i + 3; k++) {
        const next = candidates[k]?.trim();
        if (!next) break;
        if (PHONE_LINE_RE.test(next)) break;
        if (CITY_STATE_ZIP_RE.test(next) || CITY_ONLY_RE.test(next) || STATE_ZIP_ONLY_RE.test(next)) {
          parts.push(next);
          if (CITY_STATE_ZIP_RE.test(next) || STATE_ZIP_ONLY_RE.test(next)) break;
        } else {
          break;
        }
      }
      return parts.join(" ").replace(/\s{2,}/g, " ").trim();
    }
  }
  return undefined;
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

  // Style C: a header row of BARE month names with NO year attached
  // ("Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec"),
  // followed by one or more rows each led by a bare 4-digit year and
  // containing marks aligned positionally under each month
  // ("2020  30  <icon>  <icon>  <icon>  <icon>  CLS  -  -  -  -  -  -").
  // Observed on Experian's printable-report export, where the year
  // lives on the DATA row instead of being combined with the month.
  for (let i = 0; i < lines.length - 1; i++) {
    const headerTokens = lines[i].split(/\s+/).filter(Boolean);
    const monthNums = headerTokens.map((t) =>
      /\d/.test(t) ? null : monthFromName(t),
    );
    const validMonthCount = monthNums.filter(Boolean).length;
    if (validMonthCount < 6) continue;

    const zipped: PaymentHistoryMark[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const rowTokens = lines[j].split(/\s+/).filter(Boolean);
      const yearMatch = rowTokens[0]?.match(/^(19|20)\d{2}$/);
      if (!yearMatch) break;
      const year = rowTokens[0];
      for (let k = 1; k < rowTokens.length && k - 1 < monthNums.length; k++) {
        const mn = monthNums[k - 1];
        if (!mn) continue;
        const tok = rowTokens[k];
        // Icon-glyph "paid on time" marks (rendered as PUA/emoji
        // codepoints by pdftotext, e.g. \uE902) and "-"/"ND" (no
        // data) are legitimate non-derogatory marks too — record them
        // as "OK" so the grid has enough coverage to be trusted, but
        // only numeric/CO/KD/CLS tokens ever count as derogatory
        // evidence downstream (see gridEvidence()).
        if (/^(?:OK|CL|CLS|CO|KD|XX|30|60|90|120|150|180)$/i.test(tok)) {
          zipped.push({ month: `${year}-${mn}`, mark: tok.toUpperCase() });
        } else if (/^[^\x00-\x7F]+$/.test(tok)) {
          // non-ASCII glyph = the bureau's "paid as agreed" icon
          zipped.push({ month: `${year}-${mn}`, mark: "OK" });
        }
      }
    }
    // A grid with real month/year coverage is trustworthy even with
    // just 1-2 explicit derogatory marks (e.g. a single "30" among
    // otherwise-clean months) — the important signal is that we found
    // at least one recognizable numeric/CO/KD mark, not a minimum count.
    if (
      zipped.length >= 3 &&
      zipped.some((z) => /^(?:30|60|90|120|150|180|CO|KD)$/.test(z.mark))
    ) {
      return zipped;
    }
    if (zipped.length >= 6) return zipped;
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

// ------------------------------------------------------------
// Negative-type classification — PRECISION-FIRST (v2)
// ------------------------------------------------------------
// An account is marked negative ONLY on authoritative evidence:
//   1. the account's own labeled ACCOUNT-TYPE field
//      ("Account Type: Collection", "Account Type & Number: ...")
//   2. the account's own STATUS field (Pay Status / Account
//      Condition / Status / column-row trailing status)
//   3. other labeled values about THIS account (Remarks / Comments /
//      "Previously Past Due" history)
//   4. the account's own payment-history grid marks
//      (30/60/90/120/150/180, CO, KD)
//
// Incidental text can NEVER mark an account negative — section
// headers ("Collections", "Potentially Negative Accounts"), creditor
// names ("...Collections LLC"), and educational/boilerplate wording
// are ignored. This fixes the reported false positive where an
// original-creditor account with status "Open/Never late" was tagged
// as a Collection Account because a "Collections" section header
// bled into its block.
//
// NEGATION GUARD: "never late" / "no late payments" / "not
// delinquent" wording is stripped before any derogatory test, and an
// explicit never-late STATUS vetoes every other source. When
// authoritative sources contradict (never-late status vs. derogatory
// type/remarks/grid), the account is NOT marked negative — a
// conflict is returned so the caller flags it for manual review.
//
// Output vocabulary is unchanged (NEGATIVE_TYPE_STRATEGY keys).
// ------------------------------------------------------------

/** Negated derogatory phrases — stripped from every tested value so
 *  "no late payments" can never match "late payments". */
const NEGATED_RE =
  /\b(?:never|no|not|n['’]t|without)\b(?:\s+(?:any|been|had|have|has|history|of|in|on|currently|reporting|showing|known))*\s+(?:late|delinquen\w*|past\s*due|missed\s+payments?|derogator\w*|adverse|negatives?|collections?|charge[\s-]?offs?|foreclosures?|repossessions?|bankruptc\w*|liens?|judg?ments?|public\s+records?)\b/gi;

/** Explicit no-derogatory claims in the STATUS field ("Never late",
 *  "No late payments", "Never delinquent"). Vetoes every other
 *  source; contradicts derogatory evidence -> conflict, not a guess. */
const HARD_CLEAN_RE =
  /\b(?:never|no|not|n['’]t|without)\b(?:\s+(?:any|been|had|have|has|history|of|in|on|currently|reporting|showing|known))*\s+(?:late|delinquen\w*|past\s*due|missed\s+payments?|derogator\w*|adverse|negatives?|collections?)/i;

function stripNegations(s: string): string {
  return s.replace(NEGATED_RE, " ");
}

/** Derogatory tests, in priority order. Applied ONLY to
 *  authoritative values (status/type/remarks/grid) — never to
 *  whole-block text. */
const DEROG_TESTS: Array<[NegativeType, RegExp]> = [
  [
    "Collection Account",
    /collection|placed\s+for\s+collection|assigned\s+to\s+(?:a\s+)?(?:collection|agency)|sold\s+to\s+(?:a\s+)?(?:third|3rd)[\s-]party|transfer(?:red)?\s+(?:to|into)?\s*collection/i,
  ],
  [
    "Charge-off",
    /charg?e[d]?\s*[- ]?off|charge[\s-]?offs?\b|written\s+off|write[\s-]?offs?\b|bad\s+debt/i,
  ],
  [
    "Late Payments",
    /past\s*due|delinquen\w*|late\s+payments?|(?:30|60|90|120|150|180)\+?\s*days?\s*(?:past|late)/i,
  ],
  ["Foreclosure", /foreclos/i],
  ["Repossession", /repossess/i],
  ["Bankruptcy", /bankrupt/i],
];

/** Additional derogatory wording (maps to the generic strategy key). */
const DEROG_CATCHALL =
  /settled\s+for\s+less|in\s+default|defaulted|voluntary\s+surrender|forfeit|unpaid\s+balance/i;

export interface ClassifyContext {
  /** Payment-grid marks from parsePaymentHistory (authoritative). */
  paymentMarks?: string[];
  /** True when the block shows section overlap — non-status lines may
   *  belong to a neighboring account and are not trusted. */
  sectionOverlap?: boolean;
}

export interface ClassifyResult {
  negativeType: NegativeType;
  isNegative: boolean;
  evidence: string[];
  /** Set when authoritative sources contradict — the account is NOT
   *  marked negative; the caller flags it for manual review. */
  conflict?: string;
  /** Worst numeric grid delinquency ("120") when present. */
  worstDelinquency?: string;
}

/** Labeled lines whose values describe THIS account (authoritative).
 *  Line-start anchored, with the same separator discipline as
 *  labeled(): a colon/tab or 2+ spaces — "Status Updated:" must NOT
 *  be read as label "Status". */
const AUTHORITY_LABEL_RE =
  /^(pay\s*status|paystatus|account\s*condition|account\s*status|payment\s*status|manner\s+of\s+payment|status\s+payments?|status|account\s+type(?:\s*(?:&|and|\/)\s*(?:number|pay\s*status))?|type|remarks?|comments?|narrative|previously\s+past\s+due)\s*(?:[:\t]|\s{2,})\s*(.+)$/i;

interface AuthLine {
  label: string;
  value: string;
  isType: boolean;
}

function authoritativeLines(block: string): AuthLine[] {
  const out: AuthLine[] = [];
  for (const line of block.split("\n")) {
    const m = line.trim().match(AUTHORITY_LABEL_RE);
    if (m) {
      const label = m[1].toLowerCase();
      out.push({
        label,
        value: m[2].trim(),
        isType: /^type$/.test(label) || /account\s+type/.test(label),
      });
    }
  }
  // Equifax compact row: the status column follows the balance —
  // "07/2022  XXXX-5678  Open  02/2025  $987.00  Collection"
  const col = block.match(
    /\$\s?[\d,]+\.\d{2}\s{2,}([A-Za-z][A-Za-z0-9 ,'\/()+-]{0,40}?)(?=\n|$)/,
  );
  if (col) out.push({ label: "column status", value: col[1].trim(), isType: false });
  return out;
}

/** One authoritative value -> negative type (or null when clean). */
function testDerog(value: string): NegativeType | null {
  const v = stripNegations(value);
  if (!v.trim()) return null;
  for (const [type, re] of DEROG_TESTS) {
    if (re.test(v)) return type;
  }
  if (DEROG_CATCHALL.test(v)) return "Derogatory Status";
  return null;
}

/** Grid marks -> worst delinquency + type. OK/XX/CL are not
 *  derogatory classification evidence (CL is a non-standard code). */
function gridEvidence(marks: string[]): { worst?: string; type?: NegativeType } {
  const numeric = marks
    .map((m) => parseInt(m, 10))
    .filter((n) => [30, 60, 90, 120, 150, 180].includes(n));
  const worst = numeric.length > 0 ? String(Math.max(...numeric)) : undefined;
  if (worst) return { worst, type: "Late Payments" };
  if (marks.some((m) => /^co$/i.test(m))) return { type: "Charge-off" };
  if (marks.some((m) => /^kd$/i.test(m))) return { type: "Derogatory Status" };
  return {};
}

/** PRECISION-FIRST negative classification. Backward-compatible
 *  signature: the optional context carries grid marks + overlap info. */
export function classifyNegative(
  status: string,
  block: string,
  ctx: ClassifyContext = {},
): ClassifyResult {
  const statusRaw = (status || "").trim();
  const hardClean = HARD_CLEAN_RE.test(statusRaw);
  const statusNeg = stripNegations(statusRaw);
  const evidence: string[] = [];

  const grid = gridEvidence(ctx.paymentMarks ?? []);
  const auth = authoritativeLines(block);

  const record = (msg: string) => {
    if (!evidence.includes(msg)) evidence.push(msg);
  };
  const conflict = (why: string): ClassifyResult => ({
    negativeType: "Derogatory Status",
    isNegative: false,
    evidence,
    conflict:
      `Status "${statusRaw.slice(0, 40)}" looks clean, but the account also shows ${why}. ` +
      "Left unmarked — review manually.",
    worstDelinquency: grid.worst,
  });

  // 1. Derogatory ACCOUNT TYPE — the tradeline's nature. Definitive:
  //    survives "paid"/"current" statuses (a paid collection is still
  //    a Collection Account), but NOT an explicit never-late status.
  const typeLine = auth.find((l) => l.isType);
  const typeHit = typeLine ? testDerog(typeLine.value) : null;
  if (typeHit && typeLine) {
    record(`account type: "${typeLine.value.slice(0, 40)}"`);
    if (grid.worst) record(`payment grid: worst mark ${grid.worst}`);
    if (hardClean) return conflict("a derogatory account type");
    return {
      negativeType: typeHit,
      isNegative: true,
      evidence,
      worstDelinquency: grid.worst,
    };
  }

  // 2. Derogatory STATUS field — the account's own current status.
  const statusHit = testDerog(statusNeg);
  if (statusHit) {
    record(`status: "${statusRaw.slice(0, 40)}"`);
    if (grid.worst) record(`payment grid: worst mark ${grid.worst}`);
    return {
      negativeType: statusHit,
      isNegative: true,
      evidence,
      worstDelinquency: grid.worst,
    };
  }

  // 3. Other authoritative labeled values about this account
  //    (remarks, conditions, previously-past-due history, column
  //    status). Skipped under section overlap — those lines may
  //    belong to a neighboring account.
  if (!ctx.sectionOverlap) {
    let otherHit: NegativeType | null = null;
    const otherEv: string[] = [];
    for (const l of auth) {
      if (l.isType) continue;
      if (/^previously\s+past\s+due$/.test(l.label)) {
        if (/[1-9]/.test(l.value)) {
          if (!otherHit) otherHit = "Late Payments";
          otherEv.push(`previously past due: "${l.value.slice(0, 40)}"`);
        }
        continue;
      }
      const hit = testDerog(l.value);
      if (hit) {
        if (!otherHit) otherHit = hit;
        otherEv.push(`${l.label}: "${l.value.slice(0, 40)}"`);
      }
    }
    if (otherHit) {
      otherEv.forEach(record);
      if (grid.worst) record(`payment grid: worst mark ${grid.worst}`);
      if (hardClean) return conflict(otherEv.join("; "));
      return {
        negativeType: otherHit,
        isNegative: true,
        evidence,
        worstDelinquency: grid.worst,
      };
    }
  }

  // 4. Payment-history grid marks — the bureau's own month-by-month
  //    record (historical lates are real even when currently current).
  if (grid.type) {
    record(
      grid.worst
        ? `payment grid: worst mark ${grid.worst}`
        : `payment grid: ${grid.type} mark`,
    );
    if (hardClean) return conflict("derogatory payment-history marks");
    return {
      negativeType: grid.type,
      isNegative: true,
      evidence,
      worstDelinquency: grid.worst,
    };
  }

  // 5. Nothing authoritative and derogatory -> NOT negative.
  //    Incidental text (headers, creditor names, boilerplate) never
  //    counts. Missing/ambiguous data is surfaced by flags, not
  //    guessed into a negative mark.
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
  const furnisherAddress = extractAddress(block, ctx);
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

  // Payment history first — grid marks are authoritative negative
  // evidence and feed the precision-first classifier.
  const paymentHistory = parsePaymentHistory(block);
  const neg = classifyNegative(statusText, block, {
    paymentMarks: paymentHistory?.map((m) => m.mark),
    sectionOverlap: flags.includes("section-overlap"),
  });
  if (neg.conflict) flags.push("ambiguous-negative");

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
    furnisherAddress: furnisherAddress || undefined,
    accountNumber: accountNumberText,
    balance: balanceText || "Unknown",
    status: statusText || "Unknown",
    openDate: openDateHit,
    lastReported: lastReportedText,
    negativeType: neg.isNegative ? neg.negativeType : undefined,
    sourceBureau: bureau,
    confidence,
    flags,
    missingFields,
    isNegative: neg.isNegative,
    paymentHistory,
    evidence: neg.isNegative
      ? { matchedKeywords: neg.evidence, worstDelinquency: neg.worstDelinquency }
      : neg.conflict
        ? { matchedKeywords: [neg.conflict] }
        : undefined,
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
