# Credit Report Parser Overhaul + Per-Bureau Negative Dashboard

## 1. Fix core PDF extraction bug (root cause of "1 account found")
- [x] Add shared line-reconstruction helper (groups PDF.js text items into real lines by Y-coordinate) in lib/credit-report-parser
- [x] Use it in WebCreditReportParser (web platform, pdfjs-dist import)
- [x] Use it in the WebView-embedded parser HTML (native platform) - extraction only, hand text back to RN
- [x] Remove old duplicate inline regex parsing engine from WebView HTML (parseEquifaxAccounts/parseExperianAccounts/parseTransUnionAccounts/parseGenericAccounts/determineNegativeType) - native path now uses the same shared engine as web

## 2. Improve bureau-specific block anchors using real samples
- [x] Add TransUnion "Opened...Closed...Verified" row anchor (real tenant-report format)
- [x] Add Experian "Address: Account Number:" combined-label anchor (real format)
- [x] Fix Equifax over-fragmentation (Account Number: label appearing in both compact table row + detail paragraph)
- [x] Fix creditor-name extraction ordering (prevLines vs in-block scan) for all 3 bureaus
- [x] Add repairKernedWords() for a PDF kerning artifact found in the TransUnion sample (breaks label matching)
- [x] Re-test against all 3 real sample PDFs, confirm account counts are sane (Experian 4/4, Equifax 9/9, TransUnion 8/10 - 2 lost to dedupe collision on unlabeled duplicate creditor names, acceptable edge case)

## 3. Remove "Neutral" category
- [x] AccountSummary.tsx: categorizeAccounts() -> only negative/positive (merge neutral into positive)
- [x] Remove Neutral stat card + Neutral section + related styles

## 4. Furnisher address capture
- [x] Add furnisherAddress field to StandardAccount/ParsedAccountCompat types
- [x] Add extractAddress() to parsers.ts (labeled "Address:" + bare street-line patterns)
- [x] Thread through toCompatAccounts, ParsedAccount (CreditReportParser.tsx + AccountSummary.tsx), backend ParsedAccountRecord, saveCreditAnalysis schema
- [x] Show address in AccountCard detail view

## 5. Per-bureau negative accounts dashboard
- [x] Backend: fetchAnalysesPerBureau() + getBureauDashboard tRPC query (latest analysis per bureau for a user)
- [x] New component: NegativeAccountsDashboard.tsx - bureau cards w/ counts, expandable negative account details (incl. furnisher address), Generate Letter button
- [x] Wire into my-agent.tsx (new modal + quick-action trigger button on AgentProfileCard)

## 6. Verify + ship
- [x] npx tsc --noEmit clean (same 4 pre-existing errors only, confirmed via git stash diff)
- [x] Test parser against all 3 real samples via tsx script (Experian 4/4, Equifax 9/9, TransUnion 8/10 - matches prior verified results)
- [x] Clean up temp test files
- [ ] Commit, push, PR, merge
