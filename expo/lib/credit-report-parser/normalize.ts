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
