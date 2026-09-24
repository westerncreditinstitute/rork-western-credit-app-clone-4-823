# Equifax Consumer Data Suite Migration

> **Status:** Implemented (pending live sandbox credentials).
> **Supersedes:** the previous OneView *business* API integration
> (`/business/oneview/consumer-credit/v1`).

## Why we migrated

The app previously pulled consumer reports through Equifax's **OneView business**
API. That is the wrong product for delivering a consumer's *own* report and
monitoring to them inside a B2B2C app. The correct product is the **Equifax
Consumer Data Suite** (a.k.a. Consumer Engagement Suite), which exposes two
consumer-facing product scopes:

| Product | Method + Path | Scope (product access code) |
| --- | --- | --- |
| Credit Reports | `POST {host}/personal/consumer-data-suite/v1/creditReport` | `https://api.equifax.com/personal/consumer-data-suite/v1/creditReport` |
| Credit Monitoring | `GET {host}/personal/consumer-data-suite/v1/creditMonitoring` | `https://api.equifax.com/personal/consumer-data-suite/v1/creditMonitoring` |

The **scope is environment-independent** — only the host changes:

| Environment | Host |
| --- | --- |
| Sandbox (mock data) | `https://api.sandbox.equifax.com` |
| UAT / Test | `https://api.uat.equifax.com` |
| Production (live) | `https://api.equifax.com` |

## Authentication (OAuth 2.0 — client credentials)

Tokens are minted **per product scope**:

```bash
# 1. Get a token for a specific product scope
curl -X POST https://api.sandbox.equifax.com/v2/oauth/token \
  -H "Authorization: Basic $(printf '%s:%s' "$EQUIFAX_CLIENT_ID" "$EQUIFAX_CLIENT_SECRET" | base64)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "scope=https://api.equifax.com/personal/consumer-data-suite/v1/creditReport"

# 2. Call the product with the bearer token
curl -X POST https://api.sandbox.equifax.com/personal/consumer-data-suite/v1/creditReport \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ ...consumer payload... }'
```

**Important:** the **Client ID alone cannot mint a token.** A **Client Secret**
is required (`invalid_client` / `Missing Mandatory Parameters` otherwise). Both
are supplied as HTTP Basic auth to `/v2/oauth/token`.

## Environment variables

```bash
EQUIFAX_CLIENT_ID=GAh3dmSdubuZsD6sCUjU5TveGKGBVyGK
EQUIFAX_CLIENT_SECRET=<client secret>          # REQUIRED for live calls
EQUIFAX_ENVIRONMENT=sandbox|uat|production     # defaults to sandbox
# Optional legacy OneView fields (only sent when present):
EQUIFAX_MEMBER_NUMBER=
EQUIFAX_SECURITY_CODE=
```

When `EQUIFAX_CLIENT_ID` **or** `EQUIFAX_CLIENT_SECRET` is missing, the client
runs in **DEMO MODE** and returns realistic mock data so the UI is fully
exercisable without live credentials.

## What changed in code

### `expo/backend/equifax/equifax-client.ts`
- Renamed to the **Consumer Data Suite Client**.
- New `HOSTS` map + `PATH_CREDIT_REPORT` / `PATH_CREDIT_MONITORING` constants.
- `SCOPE_CREDIT_REPORT` / `SCOPE_CREDIT_MONITORING` = the full product URLs.
- `getAccessToken(scope)` now performs the client-credentials flow with Basic
  auth and **caches tokens per scope** (5-minute refresh buffer).
- `getCreditReportToken()` / `getCreditMonitoringToken()` convenience helpers.
- `fetchCreditReport(consumerInfo)` → `POST .../creditReport`.
- `fetchCreditMonitoring(consumerInfo)` → `GET .../creditMonitoring?format=json`.
- `getMonitoringAlerts(consumerInfo)` → normalized `CreditMonitoringResult`.
- New types: `CreditReportSummary`, `CreditMonitoringAlert`,
  `CreditMonitoringResult`, `EquifaxConsumerInfo`.
- `BureauReport` gained an optional `summary`.
- `ParsedNegativeAccount.accountType` expanded with `bankruptcy` and
  `public-record`.
- ACRO-schema parsers: `trades[]`, `collections[]`, `bankruptcies[]`,
  `inquiries[]`, `models[].score` / `scores[].score`, plus `_extractSummary`.
- Removed: `staticAccessToken`, `EQUIFAX_STATIC_ACCESS_TOKEN`, OneView bases.

### `expo/backend/trpc/routes/equifax.ts`
- `ParsedNegativeAccountSchema` enum now includes `bankruptcy` / `public-record`.
- Added `CreditReportSummarySchema` and attached `summary` to `BureauReportSchema`.
- Added `CreditMonitoringAlertSchema` + `CreditMonitoringResultSchema`.
- New endpoint **`equifax.fetchCreditMonitoring`** (mutation) wired to
  `getMonitoringAlerts()`.
- `equifax.validateConnection` now mints a token for **both** product scopes and
  reports per-scope status.

### `expo/contexts/EquifaxReportContext.tsx`
- Added monitoring state: `monitoring`, `isMonitoringLoading`,
  `monitoringError`, `monitoringErrorType`, `lastMonitoringFetchedAt`.
- Added actions: `setMonitoringData`, `setMonitoringError`, `clearMonitoring`,
  `setMonitoringLoading`.
- Added `getSummary(bureau?)` helper returning the `CreditReportSummary`.

### UI
- **`CreditAnalysisModal.tsx`**: new `handleFetchMonitoring`, a
  "Credit Summary" grid (score, utilization, accounts, collections, public
  records, inquiries, balances, history), and a **Credit Monitoring** card with
  a "Check Now / Refresh" action and a severity-colored alert list.
- **`CreditSummaryDashboard.tsx`** (the proper summary report page): a live
  "Your Credit Snapshot" card + a **Credit Monitoring** alerts card, both driven
  by the session context when a report/monitoring pull has happened.

## Testing checklist

1. Set `EQUIFAX_CLIENT_ID` + `EQUIFAX_CLIENT_SECRET`, `EQUIFAX_ENVIRONMENT=sandbox`.
2. Run `equifax.validateConnection` → expect `connected: true` with both scopes true.
3. Run `equifax.fetchCreditReport` → verify a parsed report with a `summary`.
4. Run `equifax.fetchCreditMonitoring` → verify alerts (or an empty, clean list).
5. Confirm the summary page + monitoring cards render in the app.

## Open item / blocker

Live sandbox testing requires the **Equifax Client Secret**. The provided Client
ID (`GAh3dmSdubuZsD6sCUjU5TveGKGBVyGK`) alone returns `invalid_client` from the
token endpoint. Once the secret is supplied, run the checklist above.
