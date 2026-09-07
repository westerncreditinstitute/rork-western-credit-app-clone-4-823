// ============================================================
// lib/credit-report-parser/normalize.ts
// ============================================================
// Field-level normalization shared by all bureau parsers:
//   • dates  → ISO YYYY-MM-DD (day-precision) or YYYY-MM
//              (month-precision, e.g. "05/2019") when unambiguous,
//              raw text otherwise
//   • money  → "1,234.56" style strings; numeric parse for totals
//   • account numbers → masked forms (privacy-preserving)
//   • text   → whitespace/HTML cleanup for corrupted inputs
//
// NOTE on whitespace: column-aligned bureau layouts use 2+ spaces as
// column separators. cleanup therefore collapses TABS and 3+ space runs
// (→ exactly 2 spaces) but PRESERVES 2-space column gaps, so
// "07/2025  ACME BANK  Auto Loan" stays parseable as columns.
// ------------------------------------------------------------

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/** Normalize a date to "YYYY-MM-DD" (day-precision) or "YYYY-MM"
 *  (month-precision). Returns null when not confidently a date (the
 *  caller keeps the raw text and flags the account). */
export function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/\s+/g, " ");

  // Already ISO: 2024-03-05 / 2024-3-5
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${pad2(iso[2])}-${pad2(iso[3])}`;

  // "March 5, 2024" / "Mar 5 2024" / "March 5th, 2024"
  const long = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
  if (long) {
    const m = monthNum(long[1]);
    if (m) return `${long[3]}-${pad2(m)}-${pad2(long[2])}`;
    return null;
  }

  // "5 March 2024"
  const dmy = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})$/);
  if (dmy) {
    const m = monthNum(dmy[2]);
    if (m) return `${dmy[3]}-${pad2(m)}-${pad2(dmy[1])}`;
    return null;
  }

  // MM/DD/YYYY or MM/DD/YY (US bureaus are always month-first)
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (us) {
    let year = us[3];
    if (year.length === 2) year = Number(year) > 50 ? `19${year}` : `20${year}`;
    return `${year}-${pad2(us[1])}-${pad2(us[2])}`;
  }

  // YYYY/MM/DD
  const ymd = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (ymd) return `${ymd[1]}-${pad2(ymd[2])}-${pad2(ymd[3])}`;

  // MM/YYYY (month precision — very common in bureau grids)
  const my = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (my) return `${my[2]}-${pad2(my[1])}`;

  // YYYY-MM (already month precision)
  const ym = s.match(/^(\d{4})[\/\-](\d{1,2})$/);
  if (ym) return `${ym[1]}-${pad2(ym[2])}`;

  // "March 2024" (month + year only)
  const my2 = s.match(/^([A-Za-z]{3,9})\.?,?\s+(\d{4})$/);
  if (my2) {
    const m = monthNum(my2[1]);
    if (m) return `${my2[2]}-${pad2(m)}`;
  }

  return null;
}

function monthNum(name: string): number | null {
  const key = name.slice(0, 4).toLowerCase();
  return MONTHS[key] ?? MONTHS[name.slice(0, 3).toLowerCase()] ?? null;
}

function pad2(n: string | number): string {
  return String(n).padStart(2, "0");
}

/** Normalize a money string to "1,234.56". Returns null when not a number. */
export function normalizeMoney(raw: string): string | null {
  if (!raw) return null;
  const s = raw.replace(/[$\s]/g, "").replace(/[()]/g, (m) => (m === "(" ? "-" : ""));
  // Reject things like "1,234-" or "N/A" or "—"
  if (!/^-?\d[\d,]*(\.\d+)?$/.test(s)) return null;
  const n = Number(s.replace(/,/g, ""));
  if (!isFinite(n)) return null;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Numeric value of a money string (for totals). 0 when unparseable. */
export function moneyToNumber(raw: string): number {
  const s = String(raw ?? "").replace(/[^0-9.\-]/g, "");
  const n = Number(s);
  return isFinite(n) ? n : 0;
}

/** Mask an account number for privacy + dedup: "5432-…-9876" → "****9876".
 *  Preserves bureau-provided masks like "XXXX9876" as-is. */
export function maskAccountNumber(raw: string): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  // Already masked by the bureau ("xxxx-1234", "****1234") → keep it
  if (/^[*xX]{2,}[-\s]?\d{2,4}$/.test(s) || /^x{4}[-\s]?\d+/i.test(s)) return s.toUpperCase();
  // Keep last 4 of any real number; if the bureau already truncated it,
  // mask what remains beyond the last 4 digits.
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 4) return "****" + digits.slice(-4);
  if (digits.length > 0) return "****" + digits;
  return s; // non-numeric identifier (e.g. internal ref) — keep raw
}

/** True when the input looks like a real (unmasked) account number. */
export function isUnmaskedAccountNumber(s: string): boolean {
  const digits = (s ?? "").replace(/\D/g, "");
  return digits.length >= 6;
}

/** Remove HTML tags/attributes and decode the most common entities, so
 *  bureau HTML reports parse like plain text. Preserves visual line
 *  structure (block tags → newlines) so section anchoring still works. */
export function htmlToText(html: string): string {
  let s = html;
  // Block-level tags → line breaks (before dropping tags entirely)
  s = s.replace(/<\s*(br|p|div|tr|li|h[1-6]|table|thead|tbody|section|article)\b[^>]*>/gi, "\n");
  s = s.replace(/<\/\s*(p|div|tr|li|h[1-6]|table|thead|tbody|section|article)\s*>/gi, "\n");
  // <td>/<th> → tab so columns stay separated
  s = s.replace(/<\s*(td|th)\b[^>]*>/gi, "\t");
  // Script/style contents would just add noise
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  // Drop remaining tags
  s = s.replace(/<[^>]+>/g, " ");
  // Decode entities (order matters: &amp; last)
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, d) => {
      try { return String.fromCodePoint(Number(d)); } catch { return " "; }
    });
  return collapseWhitespace(s);
}

/** Trim, collapse tabs and wide space runs (but KEEP 2-space column
 *  separators), convert NULs to replacement-char markers (so corruption
 *  evidence survives to the account level), and cap absurd whitespace. */
export function collapseWhitespace(s: string): string {
  return (s ?? "")
    .replace(/\u0000/g, "\uFFFD")                // NUL → corruption marker
    .replace(/\t/g, " ")                         // tabs → single space
    .replace(/ {3,}/g, "  ")                     // wide gaps → 2 spaces (column marker)
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Known PDF text-extraction artifact: some report generators emit
 *  glyph runs with a stray space baked into the word itself (e.g. a
 *  kerning/ligature quirk around the letter "t"), so pdf.js's raw
 *  string comes out as "St at us" instead of "Status", "Indust ry"
 *  instead of "Industry", etc. This breaks every label-based field
 *  extractor (extractStatus, extractOpenDate, ...) since they look for
 *  the real words. Rather than a risky generic "remove all stray
 *  spaces" pass (which would wrongly merge real adjacent short words,
 *  e.g. "Paid or paying"), this repairs only a known, explicit set of
 *  field-label words observed to be affected — safe because these
 *  exact broken spellings never occur elsewhere in real report text. */
const KERNED_WORD_FIXES: Array<[RegExp, string]> = [
  [/\bSt\s*at\s*us\b/g, "Status"],
  [/\bIndust\s*ry\b/g, "Industry"],
  [/\bAut\s*omat\s*ed\b/g, "Automated"],
  [/\bAut\s*omot\s*ive\b/g, "Automotive"],
  [/\bCollect\s*ion(?!s)\b/g, "Collection"],
  [/\bCollect\s*ions\b/g, "Collections"],
  [/\bPaym\s*ent\b/g, "Payment"],
  [/\bHist\s*or\s*y\b/g, "History"],
  [/\bSum\s*m\s*ar\s*y\b/g, "Summary"],
  [/\bDat\s*e\b/g, "Date"],
  [/\bInst\s*allm\s*ent\b/g, "Installment"],
  [/\bUndesignat\s*ed\b/g, "Undesignated"],
  [/\bUt\s*ilit\s*y\b/g, "Utility"],
  [/\bUt\s*ilit\s*ies\b/g, "Utilities"],
  [/\bM\s*ort\s*gage\b/g, "Mortgage"],
  [/\bDerogat\s*or\s*y\b/g, "Derogatory"],
  [/\bNot\s*es\b/g, "Notes"],
  [/\bAct\s*ivit\s*y\b/g, "Activity"],
  [/\bAct\s*ion\b/g, "Action"],
  [/\bDisposit\s*ion\b/g, "Disposition"],
  [/\bEvict\s*ion\b/g, "Eviction"],
  [/\bJurisdict\s*ion\b/g, "Jurisdiction"],
  [/\bOrganizat\s*ion\b/g, "Organization"],
  [/\bClassif\s*icat\s*ion\b/g, "Classification"],
  [/\bDescript\s*ion\b/g, "Description"],
  [/\bInformat\s*ion\b/g, "Information"],
  [/\bExpirat\s*ion\b/g, "Expiration"],
  [/\bReport\s*ed\b/g, "Reported"],
  [/\bSet\s*t\s*led\b/g, "Settled"],
  [/\bPot\s*ent\s*ial\b/g, "Potential"],
  [/\bNegat\s*ive\b/g, "Negative"],
  [/\bGrant\s*or\b/g, "Grantor"],
  [/\bSt\s*at\s*e\b/g, "State"],
  [/\bSt\s*at\s*ut\s*e\b/g, "Statute"],
  [/\bTot\s*al\b/g, "Total"],
  [/\bTot\s*als\b/g, "Totals"],
  [/\bCount\s*y\b/g, "County"],
  [/\bCourt\s*\b/g, "Court "],
];

/** Apply the known kerning-artifact word fixes (see KERNED_WORD_FIXES). */
export function repairKernedWords(text: string): string {
  let out = text;
  for (const [re, replacement] of KERNED_WORD_FIXES) {
    out = out.replace(re, replacement);
  }
  return out;
}

/** Count control/replaceable chars to detect a corrupted extraction. */
export function corruptionRatio(s: string): number {
  if (!s) return 0;
  let bad = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    if (c === 0 || c === 0xFFFD || (c < 32 && c !== 9 && c !== 10 && c !== 13)) bad++;
  }
  return bad / s.length;
}

// ------------------------------------------------------------
// PDF.js text-item -> line reconstruction
// ------------------------------------------------------------
//
// pdf.js's getTextContent() returns a flat list of positioned text
// fragments per page \u2014 it does NOT tell you where lines/columns are.
// Naively joining every fragment with a single space (the previous
// approach) destroys the document's line structure entirely, which is
// fatal here: every account-splitting anchor in this engine
// (splitAccountBlocks, extractInquiriesSection, etc.) looks for
// patterns at the START of a line. A page with no newlines collapses
// into ONE giant blob \u2192 exactly the "only 1 account found" bug.
//
// Fix: group fragments into rows by their Y coordinate (item.transform[5]),
// sort rows top-to-bottom, sort each row's fragments left-to-right, and
// insert a wide gap (2 spaces \u2014 this engine's column-separator marker,
// see SEP/collapseWhitespace) wherever the horizontal gap between two
// fragments is large enough to be a column boundary rather than a normal
// word space. This reconstructs real, parseable line/column text from
// any PDF.js-produced text-item list, on web OR inside a WebView.

/** Minimal shape of a pdf.js TextItem \u2014 kept structural so callers don't
 *  need to import pdfjs-dist types here (this file must build UN-styled,
 *  e.g. inside the WebView's plain-<script> HTML string). */
export interface PdfTextItemLike {
  str: string;
  /** pdf.js text-render matrix: [a, b, c, d, e, f] \u2014 e = x, f = y. */
  transform: number[];
  width?: number;
}

/** Reconstruct a page's text with real line breaks + column gaps from a
 *  flat pdf.js text-item array. `yTolerance` groups fragments whose
 *  baselines differ by only a pixel or two (sub-pixel font rendering)
 *  into the same visual line. */
export function reconstructPageLines(
  items: PdfTextItemLike[],
  yTolerance = 2,
): string {
  const usable = items.filter((it) => it && typeof it.str === "string" && it.str !== "");
  if (usable.length === 0) return "";

  const rows = new Map<number, PdfTextItemLike[]>();
  for (const it of usable) {
    const y = Math.round(it.transform[5]);
    const arr = rows.get(y);
    if (arr) arr.push(it);
    else rows.set(y, [it]);
  }

  // Top-to-bottom in PDF space = descending Y.
  const sortedY = Array.from(rows.keys()).sort((a, b) => b - a);

  // Merge row-keys within tolerance (handles items whose rounded Y
  // differs by 1-2px due to mixed font baselines on the same visual line).
  const mergedRowKeys: number[][] = [];
  let bucket: number[] = [];
  let lastY: number | null = null;
  for (const y of sortedY) {
    if (lastY === null || Math.abs(lastY - y) <= yTolerance) bucket.push(y);
    else {
      mergedRowKeys.push(bucket);
      bucket = [y];
    }
    lastY = y;
  }
  if (bucket.length) mergedRowKeys.push(bucket);

  const lines: string[] = [];
  for (const ys of mergedRowKeys) {
    const rowItems: PdfTextItemLike[] = [];
    for (const y of ys) {
      const arr = rows.get(y);
      if (arr) rowItems.push(...arr);
    }
    rowItems.sort((a, b) => a.transform[4] - b.transform[4]);

    let line = "";
    let lastEndX: number | null = null;
    for (const it of rowItems) {
      const x = it.transform[4];
      if (lastEndX !== null) {
        const gap = x - lastEndX;
        // A big horizontal gap is a column boundary \u2014 mark it with 2
        // spaces (this engine's column-separator convention). A small
        // gap is a normal inter-word space (or already-included in the
        // fragment). Fragments that already end in whitespace don't
        // need an extra space injected.
        if (gap > 20) line += "  ";
        else if (gap > 1 && !/\s$/.test(line) && !/^\s/.test(it.str)) line += " ";
      }
      line += it.str;
      lastEndX = x + (typeof it.width === "number" ? it.width : it.str.length * 5);
    }
    lines.push(line);
  }
  return lines.join("\n");
}
