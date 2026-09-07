// ============================================================
// lib/credit-report-parser/detect.ts
// ============================================================
// Bureau detection + combined 3-bureau splitting.
//
// Detection uses WEIGHTED SIGNATURE SCORING (not "contains the word"), so a
// mortgage lender named "TransUnion Auto Finance" can't fool it, and a
// combined report is detected even when bureaus appear in unusual orders.
// ------------------------------------------------------------

import type { Bureau } from "./types";

/** Text signatures strongly associated with each bureau's report format. */
const SIGNATURES: Record<Exclude<Bureau, "unknown">, Array<{ re: RegExp; w: number }>> = {
  equifax: [
    { re: /equifax/i, w: 3 },
    { re: /\be\.?[fi]\.?q\.?fax\b/i, w: 2 },        // stylized logos
    { re: /member\s*(?:number|id)\s*(?:is|=|:)?\s*\d{6,}/i, w: 3 }, // EFX headers
    { re: /\bEFX\b/, w: 2 },
    { re: /open\s*date\s*reported\s*since|date\s*opened\s*\/\s*reported\s*since/i, w: 3 },
    { re: /terms\s*\/\s*pymt|pymt\s*received/i, w: 2 },
    { re: /current\s*past\s*due\s*amount/i, w: 2 },
    { re: /account\s*number\s+date\s+opened/i, w: 1 },
  ],
  experian: [
    { re: /experian/i, w: 3 },
    { re: /\bexperian\s*\.?\s*com\b/i, w: 2 },
    { re: /under\s*the\s*(?:fair\s*)?credit\s*reporting\s*act.*?experian/i, w: 2 },
    { re: /\bExperian\s+Information\s+Solutions\b/i, w: 3 },
    { re: /status:\s*(?:open|closed|paid|charged\s*off|collection)/i, w: 1 }, // Experian's label style
    { re: /date\s*opened[:\s]/i, w: 1 },
    { re: /previous\s*addresses/i, w: 1 },
  ],
  transunion: [
    { re: /trans\s?union|transunion/i, w: 3 },
    { re: /\bTU\b\s*(?:member|report)/i, w: 2 },
    // NOTE: "File Number" is NOT TransUnion-specific (Equifax annual-
    // creditreport exports also print it) — excluded to avoid ties.
    { re: /revolving\s*\/\s*installment|account\s*type\s*\/\s*pay\s*status/i, w: 3 },
    { re: /date\s*opened[:\s]/i, w: 1 },
    { re: /high\s*balance\s*\/\s*terms/i, w: 3 },
    { re: /\btrans\s?union\s+(?:llc|inc)\b/i, w: 2 },
  ],
};

/** Weighted bureau detection over the whole text. Returns bureaus sorted by
 *  score, with their scores, so callers can spot combined reports. */
export function detectBureaus(text: string): { bureau: Bureau; score: number }[] {
  const scores: Record<string, number> = { equifax: 0, experian: 0, transunion: 0 };
  for (const [bureau, sigs] of Object.entries(SIGNATURES) as Array<
    [Exclude<Bureau, "unknown">, typeof SIGNATURES["equifax"]]
  >) {
    for (const { re, w } of sigs) {
      const m = text.match(re);
      if (m) scores[bureau] += w * (m.length && m[0].length > 20 ? 2 : 1);
    }
  }
  return (Object.entries(scores) as Array<[Bureau, number]>)
    .map(([bureau, score]) => ({ bureau, score }))
    .filter((e) => e.score >= 3)
    .sort((a, b) => b.score - a.score);
}

/** Section-start anchors for combined-report splitting (ALL global — see
 *  the loop guard note in splitCombinedReport). */
const SECTION_ANCHORS: Array<{ bureau: Bureau; pats: RegExp[] }> = [
  {
    bureau: "equifax",
    pats: [
      /(?:^|\n)[^\S\n]*(?:=+\s*)?(?:the\s+)?(?:credit\s+)?report\s+(?:from\s+|by\s+)?equifax\b[^\n]{0,60}/gi,
      /(?:^|\n)[^\S\n]*\**\s*equifax\s*(?:section|report|credit\s*report|bureau|file|portion|data)\b[^\n]{0,50}/gi,
      /(?:^|\n)[^\S\n]*(?:equifax)\s*(?:=+|\*+|[-—–]{2,})[^\n]{0,10}/gi,
    ],
  },
  {
    bureau: "experian",
    pats: [
      /(?:^|\n)[^\S\n]*(?:=+\s*)?(?:the\s+)?(?:credit\s+)?report\s+(?:from\s+|by\s+)?experian\b[^\n]{0,60}/gi,
      /(?:^|\n)[^\S\n]*\**\s*experian\s*(?:section|report|credit\s*report|bureau|file|portion|data)\b[^\n]{0,50}/gi,
      /(?:^|\n)[^\S\n]*(?:experian)\s*(?:=+|\*+|[-—–]{2,})[^\n]{0,10}/gi,
    ],
  },
  {
    bureau: "transunion",
    pats: [
      /(?:^|\n)[^\S\n]*(?:=+\s*)?(?:the\s+)?(?:credit\s+)?report\s+(?:from\s+|by\s+)?trans\s?union\b[^\n]{0,60}/gi,
      /(?:^|\n)[^\S\n]*\**\s*trans\s?union\s*(?:section|report|credit\s*report|bureau|file|portion|data)\b[^\n]{0,50}/gi,
      /(?:^|\n)[^\S\n]*(?:trans\s?union)\s*(?:=+|\*+|[-—–]{2,})[^\n]{0,10}/gi,
    ],
  },
];

/** Slice a combined 3-bureau file into per-bureau sections. Handles the
 *  common layouts: sequential sections ("Equifax … Experian … TransUnion")
 *  and repeated full reports. Returns [] when the file is single-bureau.
 *
 *  IMPORTANT: every pattern in SECTION_ANCHORS must carry the `g` flag —
 *  exec() on a non-global regex ignores lastIndex and always returns the
 *  same first match, which would hang this loop. */
export function splitCombinedReport(text: string): { bureau: Bureau; text: string }[] {
  const anchors: { index: number; bureau: Bureau }[] = [];
  for (const { bureau, pats } of SECTION_ANCHORS) {
    for (const re of pats) {
      if (!re.global) throw new Error("splitCombinedReport anchor regexes must be global");
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      let guard = 0;
      while ((m = re.exec(text)) !== null && guard++ < 200) {
        anchors.push({ index: m.index, bureau });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
      re.lastIndex = 0;
    }
  }
  if (anchors.length < 2) return [];

  // Deduplicate anchors of the same bureau within 400 chars (headers repeat)
  anchors.sort((a, b) => a.index - b.index);
  const deduped: { index: number; bureau: Bureau }[] = [];
  for (const a of anchors) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.bureau === a.bureau && a.index - prev.index < 400) continue;
    deduped.push(a);
  }

  // Slice sections between bureau CHANGES. A repeated header of the SAME
  // bureau (page headers inside one section) does not start a new section.
  const sections: { bureau: Bureau; text: string }[] = [];
  let lastBureau: Bureau | null = null;
  let lastStart = -1;
  for (const a of deduped) {
    if (a.bureau !== lastBureau) {
      if (lastBureau && lastStart >= 0) {
        sections.push({ bureau: lastBureau, text: text.slice(lastStart, a.index) });
      }
      lastBureau = a.bureau;
      lastStart = a.index;
    }
  }
  if (lastBureau && lastStart >= 0) {
    sections.push({ bureau: lastBureau, text: text.slice(lastStart) });
  }

  // Merge consecutive sections of the same bureau split by repeated headers
  const merged: { bureau: Bureau; text: string }[] = [];
  for (const s of sections) {
    const prev = merged[merged.length - 1];
    if (prev && prev.bureau === s.bureau) prev.text += "\n" + s.text;
    else merged.push({ ...s });
  }
  return merged.filter((s) => s.text.trim().length > 100); // ignore tiny fragments
}

/** True when the user's manual bureau selection conflicts with what the
 *  text clearly says (a common source of mis-parse: user uploads Experian
 *  while leaving the selector on "Equifax"). */
export function bureauConflicts(
  userSelection: string,
  detected: Bureau[],
): boolean {
  if (!userSelection || userSelection === "auto") return false;
  const u = userSelection.toLowerCase() as Bureau;
  if (u === "auto" || u === "generic") return false;
  if (detected.length === 0) return false;
  return !detected.includes(u);
}
