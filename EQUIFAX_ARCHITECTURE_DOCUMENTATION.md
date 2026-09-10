# 🏗️ EQUIFAX MULTI-BUREAU INTEGRATION ARCHITECTURE

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
│                  (React Native / Expo Web)                       │
│                                                                   │
│  ┌──────────────────────┐    ┌──────────────────────┐           │
│  │  CreditAnalysisModal │    │  AgentProfileCard    │           │
│  │  - Equifax Tab       │◄───│  - Analyze Report... │           │
│  │  - Upload Tab        │    │    button            │           │
│  └────────┬─────────────┘    └──────────────────────┘           │
│           │                                                      │
│           │ useEquifaxReport()  EquifaxReportContext            │
│           ▼                                                      │
│  ┌──────────────────────┐                                       │
│  │  EquifaxReportContext│                                       │
│  │  - report data       │                                       │
│  │  - bureaus by data   │                                       │
│  │  - session storage   │                                       │
│  └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
           │
           │ trpc mutation: equifax.fetchCreditReport
           │
┌──────────┴────────────────────────────────────────────────────┐
│              TRPC BACKEND (tRPC Router)                        │
│                                                                │
│  ┌────────────────────────────────────────────────────┐      │
│  │  /backend/trpc/routes/equifax.ts                  │      │
│  │  - fetchCreditReport() mutation                   │      │
│  │  - validateConnection() query                     │      │
│  │  - Handles request/response transformation        │      │
│  └────────────────────────────────────────────────────┘      │
│           │                                                   │
│           │ Calls EquifaxClient                              │
│           ▼                                                   │
│  ┌────────────────────────────────────────────────────┐      │
│  │  /backend/equifax/equifax-client.ts               │      │
│  │  - OAuth2 authentication                          │      │
│  │  - Equifax API integration                        │      │
│  │  - Multi-bureau report parsing                    │      │
│  │  - Returns combined multi-bureau data             │      │
│  └────────────────────────────────────────────────────┘      │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   │ HTTP/REST API calls
                   ▼
        ┌─────────────────────┐
        │  Equifax API        │
        │  - Authentication   │
        │  - Report Fetch     │
        │  - Multi-bureau data│
        │  (Equifax,          │
        │   Experian,         │
        │   TransUnion)       │
        └─────────────────────┘
```

---

## Data Flow

### 1. User Initiates Fetch
```
User clicks "Fetch My Equifax Report" 
    ↓
CreditAnalysisModal.handleFetchEquifaxReport()
    ↓
setFetchingEquifax(true)
    ↓
Call: fetchEquifaxMutation.mutateAsync({multiBureau: true, userId})
```

### 2. tRPC Mutation Execution
```
trpc.equifax.fetchCreditReport({multiBureau: true, userId})
    ↓
/backend/trpc/routes/equifax.ts::fetchCreditReport()
    ↓
Validate input
    ↓
Call EquifaxClient.fetchMultiBureauReport(userId)
```

### 3. Equifax API Call
```
EquifaxClient.fetchMultiBureauReport(userId)
    ↓
1. Get user's Equifax connection
    ↓
2. Authenticate with Equifax API (OAuth2)
    ↓
3. Fetch Equifax report
    ↓
4. Parse Equifax, Experian, TransUnion accounts
    ↓
5. Organize by bureau: negativeAccountsByBureau
    ↓
6. Return combined multi-bureau data
```

### 4. Response Back to UI
```
Multi-bureau report data
    ↓
Update EquifaxReportContext
    ↓
UI re-renders with:
   - Equifax negative accounts
   - Experian negative accounts
   - TransUnion negative accounts
   - Account counts per bureau
```

---

## Data Structures

### MultiBureauReport (from equifax-client.ts)
```typescript
{
  combined: {
    totalAccounts: number;
    totalNegativeAccounts: number;
    totalNegativeBalance: number;
  };
  bureaus: {
    equifax: ParsedCreditReport;      // Bureau-specific data
    experian: ParsedCreditReport;
    transunion: ParsedCreditReport;
  };
  negativeAccountsByBureau: {
    equifax: ParsedNegativeAccount[];
    experian: ParsedNegativeAccount[];
    transunion: ParsedNegativeAccount[];
  };
}
```

### ParsedNegativeAccount
```typescript
{
  accountNumber: string;
  creditorName: string;
  accountStatus: string;
  balance: number;
  accountType: string;
  dateUpdated: string;
  bureau: string;  // "equifax" | "experian" | "transunion"
}
```

---

## Component Hierarchy

```
MyAgent (app/my-agent.tsx)
├── EquifaxReportProvider (DeferredProviders.tsx)
│   └── [Rest of app]
│       └── AgentProfileCard
│           ├── "Analyze My Credit Report" button
│           └── onOpenCreditAnalysis callback
│               └── setCreditAnalysisVisible(true)
│
└── CreditAnalysisModal
    ├── Header: "AI Dispute Assistant"
    ├── ViewSelector (Tabs)
    │   ├── Equifax Report tab (activeView === "equifax")
    │   └── Upload Report tab (activeView === "upload")
    │
    └── Content:
        ├── When activeView === "equifax" && hasEquifaxReport
        │   └── renderEquifaxReport() → Multi-bureau display
        ├── When activeView === "equifax" && !hasEquifaxReport
        │   └── Empty state with "Fetch My Equifax Report" button
        └── When activeView === "upload"
            └── PDF upload interface
```

---

## State Management

### EquifaxReportContext
**Purpose:** Global session state for multi-bureau reports
**Scope:** Session-only (cleared when app restarts)
**Location:** `/contexts/EquifaxReportContext.tsx`

**State Variables:**
```typescript
const [report, setReport] = useState<MultiBureauReport | null>(null);
const [negativeAccountsByBureau, setNegativeAccountsByBureau] = useState<
  Record<string, ParsedNegativeAccount[]>
>({});
```

### CreditAnalysisModal Local State
**Purpose:** UI-specific state for the modal
**Scope:** Component-level
**Variables:**
```typescript
const [activeView, setActiveView] = useState<"upload" | "equifax">("upload");
const [fetchingEquifax, setFetchingEquifax] = useState(false);
const [equifaxError, setEquifaxError] = useState<string | null>(null);
const [analysis, setAnalysis] = useState<CreditAnalysisResult | null>(null);
const [parsedAccounts, setParsedAccounts] = useState<ParsedAccount[]>([]);
```

---

## API Integration Points

### 1. Equifax OAuth2 Authentication
**File:** `/backend/equifax/equifax-client.ts`
```typescript
async getAccessToken(userId: string): Promise<string>
```
- Authenticates with Equifax using OAuth2
- Returns bearer token for API calls

### 2. Report Fetch
**File:** `/backend/equifax/equifax-client.ts`
```typescript
async fetchMultiBureauReport(userId: string): Promise<MultiBureauReport>
```
- Uses access token to fetch reports
- Fetches from all three bureaus
- Parses and organizes by bureau

### 3. tRPC Mutation
**File:** `/backend/trpc/routes/equifax.ts`
```typescript
equifax.fetchCreditReport: protectedProcedure
  .input(z.object({ multiBureau: z.boolean(), userId: z.string() }))
  .mutation(async ({ input }) => {
    // Calls EquifaxClient and returns data
  })
```

---

## Analytics Integration

### Performance Tracking (equifax-analytics.ts)
```typescript
// Track Equifax fetch performance
equifax.trackFetch({
  userId,
  bureaus: ["equifax", "experian", "transunion"],
  duration,
  success,
  errorType?: string
});

// Track report parsing performance
equifax.trackParse({
  bureau,
  accountCount,
  duration,
  success
});

// Track AI context injection
equifax.trackInject({
  accountCount,
  bureaus,
  duration
});

// Track letter generation from Equifax data
equifax.trackLetterGeneration({
  bureau,
  letterType,
  duration,
  success
});
```

---

## PDF Export Flow

**File:** `/lib/pdf/equifax-report-pdf.ts`

```typescript
async function generateEquifaxReportPDF(
  report: MultiBureauReport,
  negativeAccounts: ParsedNegativeAccount[]
): Promise<Blob>
```

**Process:**
1. Generate HTML from report data
2. Include multi-bureau headers
3. List accounts by bureau
4. Add statistics and summary
5. Convert HTML to PDF using html2pdf
6. Return as downloadable blob

---

## Error Handling

### Equifax API Errors
```typescript
try {
  const result = await fetchEquifaxMutation.mutateAsync({
    multiBureau: true,
    userId,
  });
} catch (error) {
  const errorMsg = error instanceof Error ? error.message : 
                   "Failed to fetch Equifax report";
  setEquifaxError(errorMsg);
  console.error("Equifax fetch error:", error);
}
```

### Common Errors
- "No procedure found" → equifax router not registered
- "User not authenticated" → userId is empty
- "No credit data found" → Equifax connection inactive
- "Network error" → Equifax API unreachable

---

## Testing Checklist

- [ ] User can click "Analyze My Credit Report"
- [ ] CreditAnalysisModal opens with two tabs
- [ ] "Equifax Report" tab shows "Fetch My Equifax Report" button
- [ ] Clicking fetch button initiates API call
- [ ] Multi-bureau data displays correctly
- [ ] Negative accounts separated by bureau
- [ ] Account counts accurate per bureau
- [ ] PDF export generates correctly
- [ ] Analytics events logged
- [ ] Error handling works for failed requests

---

## Last Updated
September 10, 2026
