# Credit Report Parser — Architecture & Reference

Advanced, bureau-aware credit report parser powering the **AI Dispute Assistant**
and **My Agent → Credit Analysis** flows.

Location: `expo/lib/credit-report-parser/`

---

## 1. What it does

Accepts extracted credit-report text (from **PDF**, **HTML**, or **plain text**
files), auto-detects which bureau(s) the report came from (**Equifax**,
**Experian**, **TransUnion**, or a **combined 3-bureau** file), and extracts
accounts, payment history, derogatory marks, inquiries, public records, and
personal info into **one standardized schema** — with confidence scoring and
data-quality flags so ambiguous data is surfaced rather than silently
mis-parsed.

---

## 2. Pipeline (index.ts)

```
 INPUT (text)                      any of: pdf.js text layer,
    │                              htmlToText(html), or raw .txt
    ▼
 1. PRE-CHECKS     binary-corruption ratio (NUL/replacement chars),
    │              truncation heuristic (report ends mid-field)
    ▼
 2. DETECT         weighted per-bureau signature scan
    │              (detectBureaus — needs score ≥ 3 to claim a bureau)
    ▼
 3. SPLIT          combined reports → per-bureau sections
    │              (splitCombinedReport anchors on bureau headers)
    ▼
 4. PARSE          per-bureau account extraction
    │              (splitAccountBlocks → extract fields per bureau style)
    ▼
 5. EXTRACT        inquiries, public records, personal info
    │
    ▼
 6. VALIDATE       confidence aggregation, dedup, flags, warnings
    │
    ▼
 OUTPUT            ParsedCreditReport  (standardized schema)
    │
    ▼
 toCompatAccounts() → old ParsedAccount[] shape
    (DB JSONB, saveCreditAnalysis, recommendation engine, AI chat)
```

### Module map

| File | Responsibility |
|---|---|
| `types.ts` | The standardized data model (single source of truth). |
| `normalize.ts` | Date/money normalization, account-number masking, `htmlToText`, corruption/truncation helpers. |
| `detect.ts` | Weighted bureau signature detection, combined-report splitting, user-vs-file conflict detection. |
| `parsers.ts` | Anchored account-block splitting, per-bureau field extraction (column/labeled/typed styles), 24-month payment-history grids, negative classification, per-account confidence scoring, dedup. |
| `index.ts` | Orchestration: pre-checks → detect → split → parse → extract → validate; exports the public API. |

---

## 3. Standardized output schema

### 3.1 Top-level: `ParsedCreditReport`

```ts
interface ParsedCreditReport {
  bureaus: Bureau[];            // all detected; length > 1 ⇒ combined
  bureau: Bureau;               // primary (most account sections)
  accounts: StandardAccount[];
  inquiries: ParsedInquiry[];
  publicRecords: ParsedPublicRecord[];
  personalInfo: ParsedPersonalInfo;
  confidence: number;           // 0–100 weighted blend
  reportFlags: ReportFlag[];
  warnings: string[];           // human-readable, safe to show users
  stats: { inputChars: number; accountBlocksConsidered: number };
  sourceFormat: "pdf" | "html" | "text";
}
```

### 3.2 Account: `StandardAccount`

The compat fields (below) **plus** the audit layer:

```ts
interface StandardAccount {
  // ── compat layer (exact ParsedAccount shape) ──
  creditor: string;             // "CAPITAL ONE BANK"
  accountNumber: string;        // masked: "****1234" / "XXXX-1234"
  balance: string;              // "1,234.56" | "0.00" | "Unknown"
  status: string;               // "Open/Past due", "Paid/Closed"
  openDate: string;             // YYYY-MM-DD when unambiguous
  lastReported: string;
  negativeType?: NegativeType;  // semantic vocabulary (see §5)

  // ── audit layer (new) ──
  sourceBureau: Bureau;         // where this block came from
  confidence: number;           // 0–100 per account
  flags: AccountFlag[];         // machine-readable quality flags
  missingFields: string[];      // never silently defaulted
  isNegative: boolean;
  paymentHistory?: PaymentHistoryMark[];  // 24-month grid
  evidence?: NegativeEvidence;  // matched keywords etc.
}
```

### 3.3 Data-quality flags

Account-level (`AccountFlag`): `low-text`, `ambiguous-bureau`,
`unparsed-balance`, `unparsed-date`, `masked-id-unknown`,
`possible-duplicate`, `section-overlap`, `partial-corruption`.

Report-level (`ReportFlag`): `no-accounts-found`, `bureau-conflict`,
`multi-bureau-report`, `low-overall-confidence`, `possible-truncation`,
`binary-corruption`, `html-cleanup`, `no-bureau-signature`.

Every flag is paired with a plain-English `warnings[]` entry — the component
logs these to the console (`[CreditReportParser]` prefix) and shows
`Found N accounts (X negative)` in the status line.

---

## 4. Bureau styles handled

| Style | Example | Where |
|---|---|---|
| Column layout | `CAPITAL ONE BANK` on its own line above/below `Account Number: XXXX-1234` | Equifax (annualcreditreport.com exports) |
| Labeled fields | `Creditor: ACME CORP` / `Account Number: ...` | Experian, many PDF viewers |
| Typed account lines | `Account Type & Number: ...` | TransUnion |
| Combined 3-bureau | Three stacked sections with bureau headers | 3-in-1 reports |

Payment history is read from two grid formats:

- **Style A — pairs:** `Jul 2024  OK`, `Jun 2024  30`
- **Style B — rows:** a months row (`Jul/24 Jun/24 …`) above a marks row
  (`OK 30 60 …`), zipped by index; month tokens may be `MM/YYYY`,
  `YYYY/MM`, or `Mon YYYY`; marks are `OK | CL | CO | KD | XX | 30 | 60 |
  90 | 120 | 150 | 180`.

**Known quirk handled:** creditor names sit at the *end of the previous*
text slice after an anchored split — recovered via a 3-line look-behind
(`prevLines`).

---

## 5. Negative-type vocabulary (do not rename)

`classifyNegative()` maps matched keywords to these semantic types, which
**exactly match the backend `NEGATIVE_TYPE_STRATEGY` keys** used by
`analyzeCreditAccounts` (recommendation engine) and the AI chat tool:

```
"Collection Account" | "Charge-off" | "Late Payments" | "Foreclosure" |
"Repossession" | "Bankruptcy" | "Derogatory Status"
```

Renaming any of these requires migrating the backend strategy map **and**
existing `credit_report_analyses` DB rows — don't.

---

## 6. Improvements over the previous implementation

| # | Before | After |
|---|---|---|
| 1 | One generic regex splitter for everything, tuned mostly to Equifax-style PDFs | Anchored per-bureau splitters with a 5-step creditor resolver (labeled → column → caps-line → look-behind → first-line) and column/labeled/typed account styles |
| 2 | Bureau picked from a handful of keyword checks | Weighted signature scoring (score ≥ 3 to claim a bureau); ambiguous or absent signatures flagged, not guessed |
| 3 | Combined reports parsed as one blob; duplicate accounts across bureaus | Combined files split into per-bureau sections; cross-bureau dedup via `dedupeAccounts` (`possible-duplicate` flag) |
| 4 | Single-bureau only in practice | `Combined (3-Bureau)` surfaced as the detected bureau; per-account `sourceBureau` preserved |
| 5 | PDF only | PDF (pdf.js), HTML (`htmlToText` strips tags/script/style and decodes entities), and TXT paths; `sourceFormat` recorded |
| 6 | Payment history mostly ignored | 24-month grids in both formats (pair-style and row-style), marks normalized, stored per account |
| 7 | Missing fields silently defaulted to "" | `missingFields[]` recorded; unparsed dates/balances flagged; "Unknown" values explicit |
| 8 | No confidence notion | Per-account 0–100 confidence (field coverage, anchored-ness, negatives) + weighted overall score; `low-overall-confidence` flag below threshold |
| 9 | Silent failures on weird files | `possible-truncation`, `binary-corruption`, `partial-corruption` detection with user-facing warnings |
| 10 | No user-vs-file sanity check | `bureau-conflict` flag + warning when the user's dropdown pick disagrees with the file's contents |

---

## 7. Backward compatibility & migration

**The old contract is preserved exactly.** `toCompatAccounts(report.accounts)`
returns the original `ParsedAccount` shape:

```ts
interface ParsedAccountCompat {
  creditor: string;
  accountNumber: string;
  balance: string;
  status: string;
  openDate: string;
  lastReported: string;
  negativeType?: string;   // omitted entirely for clean accounts
}
```

Unchanged consumers:

- **`saveCreditAnalysis` tRPC input** — accounts JSON is identical in shape.
- **`credit_report_analyses` JSONB column** — old and new rows share the
  same field names/types; no DB migration needed.
- **`analyzeCreditAccounts`** (backend recommendation engine) — reads the
  same fields, same `negativeType` vocabulary.
- **`onAccountsParsed(accounts, bureau)`** — component callback signature
  identical. Single-bureau files report `equifax | experian | transunion`,
  combined files report `Combined (3-Bureau)`, unknown files `generic`
  (the component falls back to the legacy splitter only when the new engine
  finds zero accounts in non-empty text — that fallback is the only path
  still using the old code).

### Migration notes for future upgrades

1. **No data migration is required.** Old saved analyses keep working; the
   new engine only affects what gets written going forward.
2. **If you later want the rich fields** (payment history, confidence,
   sourceBureau), write them to a *new* JSONB column (e.g.
   `analysis_v2`) so old rows stay readable by both app versions during
   rollout.
3. **`negativeType` vocabulary is shared** with the backend — any rename is
   a coordinated change (see §5).
4. **Old rows parsed by the legacy splitter** may have lower-quality data;
   a re-parse on next upload replaces them via the normal upsert flow.

---

## 8. Usage examples

### 8.1 From the component (`components/CreditReportParser.tsx`)

```tsx
import {
  parseCreditReport,
  toCompatAccounts,
  htmlToText,
  type ParsedCreditReport,
} from '@/lib/credit-report-parser';

// PDF path — extract with pdf.js first (unchanged), then:
const report: ParsedCreditReport = parseCreditReport(fullText, {
  userBureau: selectedBureau,   // "auto" | "equifax" | ...
  sourceFormat,
});

const accounts: ParsedAccount[] = toCompatAccounts(report.accounts);

const detectedBureau =
  report.bureaus.length > 1 ? 'Combined (3-Bureau)'
  : report.bureau === 'unknown' ? 'generic'
  : report.bureau;

// warnings → console.warn('[CreditReportParser]', w)
// onAccountsParsed(accounts, detectedBureau)   ← same callback as before
```

### 8.2 Direct engine call (scripts / tests / future tools)

```ts
import { parseCreditReport, toCompatAccounts } from '@/lib/credit-report-parser';

const report = parseCreditReport(rawText, {
  userBureau: 'auto',
  sourceFormat: 'text',
});

if (report.reportFlags.includes('bureau-conflict')) {
  // user picked Equifax but the file says Experian → tell them
}
for (const acc of report.accounts) {
  if (acc.confidence < 50) reviewQueue.push(acc);  // flagged, not hidden
}
const negative = report.accounts.filter((a) => a.isNegative);
```

### 8.3 Standalone helpers

```ts
import {
  detectBureaus,        // → [{bureau:'equifax', score:9}, ...]
  splitCombinedReport,  // → [{bureau:'equifax', text:'...'}, ...]
  htmlToText,           // strip tags, keep whitespace structure
  normalizeDate,        // "05/2019" → "2019-05-01" (start-of-month)
  normalizeMoney,       // "$1,234.5" → "1,234.50"
  maskAccountNumber,    // "6011123456789012" → "****9012"
  classifyNegative,     // status text → semantic NegativeType | undefined
  parsePaymentHistory,  // block text → [{month:'2024-06', mark:'30'}]
} from '@/lib/credit-report-parser';
```

---

## 9. Testing & verification

- **Test suite:** `diag-tools/test-credit-parser.mjs` — **73/73 passing**.
  Covers bureau detection (weighted, ambiguous, wrong user pick), all three
  bureau styles, combined 3-bureau splitting, HTML input, corrupted and
  truncated files, empty input, public records, backward-compat shape +
  vocabulary, dedup, and confidence scoring.
- **Fixtures:** `diag-tools/fixtures/credit-fixtures.mjs` —
  `EFX_COLUMN`, `XPX_LABELED`, `TUC_STYLE`, `COMBINED`, `HTML_REPORT`,
  `CORRUPTED`, `TRUNCATED`, `MIXED_PUBLIC_RECORD`, `WRONG_PICK`.
- **Integration simulation:** `diag-tools/debug-component-flow.mjs`
  mirrors the component's `handleParse` flow across 5 scenarios
  (Equifax column, combined, HTML, wrong bureau pick, garbage input).
- The test harness auto-bundles the TS library with esbuild when needed:
  `rm -f diag-tools/credit-parser-bundle.mjs && node diag-tools/test-credit-parser.mjs`.

To add a new bureau layout: add a fixture that reproduces it, run the suite,
extend the per-bureau splitter (or add a new anchor source in
`splitAccountBlocks`) until the fixture passes, and re-run the full suite.

---

## 10. Limitations & known edge cases

- Text extracted from image-only/scanned PDFs is not OCR'd — pdf.js only
  reads the text layer; scanned reports surface as
  `no-bureau-signature` + zero accounts.
- Extremely non-standard third-party "tri-merge" report layouts (e.g.
  mortgage-broker formats with custom headers) may fall back to the legacy
  generic splitter — flagged via console warning, never silent.
- SSNs are intentionally **not** extracted anywhere in the engine.
- Public-record fields (case number, date filed, status) are matched in a
  5-line window after the record type — unusual spacing may need widening.
- `XX` marks in payment history mean "no data for this month" and are kept
  verbatim rather than guessed.
