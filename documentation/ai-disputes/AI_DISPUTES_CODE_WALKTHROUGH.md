# AI Agent Dispute Context Awareness - Code Walkthrough

## Overview

This document provides a detailed walkthrough of all code changes made to implement AI agent context awareness of disputes.

## File: `expo/backend/trpc/routes/ai-agents.ts`

### Change 1: Enhanced `fetchUserDisputes()` Function (Lines 585-615)

**Location:** Helper function for loading user's disputes from database

**Before:**
```typescript
async function fetchUserDisputes(userId: string) {
  const { data, error } = await supabase
    .from("disputes")
    .select("*")
    .eq("user_id", userId)
    .order("date_sent", { ascending: false });

  if (error) {
    console.error("[AI Agents] fetchUserDisputes error:", error);
    return { disputes: [], summary: "Unable to retrieve disputes at this time." };
  }

  const disputes = data || [];
  const open = disputes.filter(
    (d: any) => d.status === "sent" || d.status === "in-progress"
  ).length;
  const resolved = disputes.filter((d: any) => d.status === "resolved").length;
  const rejected = disputes.filter((d: any) => d.status === "rejected").length;

  const summary = `You have ${disputes.length} total disputes: ${open} open/in-progress, ${resolved} resolved, ${rejected} rejected.`;

  return { disputes, summary, open, resolved, rejected };
}
```

**After:**
```typescript
async function fetchUserDisputes(userId: string) {
  const { data, error } = await supabase
    .from("disputes")
    .select("*")
    .eq("user_id", userId)
    .order("date_sent", { ascending: false });

  if (error) {
    console.error("[AI Agents] fetchUserDisputes error:", error);
    return { disputes: [], summary: "Unable to retrieve disputes at this time." };
  }

  // Map database columns to camelCase for consistent JS naming
  const disputes = (data || []).map((d: any) => ({
    id: d.id,
    creditor: d.creditor,
    accountNumber: d.account_number,           // ← Database column mapping
    disputeType: d.dispute_type,               // ← Database column mapping
    dateSent: d.date_sent,                     // ← Database column mapping
    status: d.status,
    lastUpdated: d.last_updated,               // ← Database column mapping
    responseBy: d.response_by,                 // ← Database column mapping
  }));

  const open = disputes.filter(
    (d: any) => d.status === "sent" || d.status === "in-progress"
  ).length;
  const resolved = disputes.filter((d: any) => d.status === "resolved").length;
  const rejected = disputes.filter((d: any) => d.status === "rejected").length;

  const summary = `You have ${disputes.length} total disputes: ${open} open/in-progress, ${resolved} resolved, ${rejected} rejected.`;

  return { disputes, summary, open, resolved, rejected };
}
```

**Changes:**
- Maps database snake_case columns to camelCase for consistency
- Ensures type safety and consistency with AI agent interface
- Returns structured objects ready for system prompt injection

---

### Change 2: Updated `callAIBackend()` Function Signature (Lines 1040-1071)

**Location:** Main AI backend function that calls OpenAI

**Before:**
```typescript
async function callAIBackend(params: {
  messages: { role: string; content: string }[];
  agentName: string;
  agentBio: string;
  equifaxReport?: {
    fetchedAt: string;
    totalAccounts: number;
    negativeAccountCount: number;
    negativeAccounts: Array<{
      accountNumber: string;
      creditorName: string;
      creditorAddress?: string;
      accountType: string;
      status: string;
      delinquency?: string;
      balance?: number;
      dateReported?: string;
    }>;
    creditScore?: number;
  };
  userId?: string;
}): Promise<{ response: string; toolCalls: ToolCall[] }> {
```

**After:**
```typescript
async function callAIBackend(params: {
  messages: { role: string; content: string }[];
  agentName: string;
  agentBio: string;
  equifaxReport?: {
    fetchedAt: string;
    totalAccounts: number;
    negativeAccountCount: number;
    negativeAccounts: Array<{
      accountNumber: string;
      creditorName: string;
      creditorAddress?: string;
      accountType: string;
      status: string;
      delinquency?: string;
      balance?: number;
      dateReported?: string;
    }>;
    creditScore?: number;
  };
  disputes?: Array<{                    // ← NEW PARAMETER
    id: string;
    creditor: string;
    accountNumber: string;
    disputeType: string;
    dateSent: string;
    status: 'sent' | 'in-progress' | 'resolved' | 'rejected';
    lastUpdated: string;
    responseBy: string;
  }>;
  userId?: string;
}): Promise<{ response: string; toolCalls: ToolCall[] }> {
```

**Changes:**
- Added optional `disputes` parameter
- Typed with specific fields used by the AI agent
- Allows disputes data to be passed to system prompt

---

### Change 3: System Prompt Injection for Disputes (Lines 1125-1185)

**Location:** After Equifax context injection in `callAIBackend()`

**Added Code:**
```typescript
// If disputes data is provided, add it to the system context
if (params.disputes && params.disputes.length > 0) {
  const active = params.disputes.filter(d => d.status === 'sent' || d.status === 'in-progress');
  const resolved = params.disputes.filter(d => d.status === 'resolved');
  const rejected = params.disputes.filter(d => d.status === 'rejected');
  
  // Calculate which disputes are approaching their 30-day deadline
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilDeadline = (dateStr: string) => {
    if (!dateStr) return Infinity;
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };
  
  const dueWithin7Days = active.filter(d => {
    const days = daysUntilDeadline(d.responseBy);
    return days >= 0 && days <= 7;
  });
  
  const overdueDisputes = active.filter(d => daysUntilDeadline(d.responseBy) < 0);
  
  const disputesContext = `

DISPUTE TRACKER STATUS (Real-time from your account):
- Total Disputes: ${params.disputes.length}
- Active/Open: ${active.length}
- Resolved: ${resolved.length}
- Rejected: ${rejected.length}
${overdueDisputes.length > 0 ? `- ⚠️ OVERDUE (no response received): ${overdueDisputes.length}` : ''}
${dueWithin7Days.length > 0 ? `- ⏰ DUE WITHIN 7 DAYS: ${dueWithin7Days.length}` : ''}

Your Current Disputes:
${params.disputes
  .map((d, i) => {
    const days = daysUntilDeadline(d.responseBy);
    let statusEmoji = '';
    if (d.status === 'sent') statusEmoji = '📤';
    else if (d.status === 'in-progress') statusEmoji = '⏳';
    else if (d.status === 'resolved') statusEmoji = '✓';
    else if (d.status === 'rejected') statusEmoji = '✗';
    
    let deadline = '';
    if (days < 0) deadline = ` ⚠️ OVERDUE by ${Math.abs(days)} days`;
    else if (days <= 7) deadline = ` ⏰ DUE in ${days} days`;
    else deadline = ` (due ${d.responseBy})`;
    
    return `${i + 1}. ${statusEmoji} ${d.creditor} - ${d.disputeType}
   Account #: ${d.accountNumber}
   Status: ${d.status}
   Sent: ${d.dateSent}${deadline}`;
  })
  .join("\n")}

IMPORTANT DISPUTE GUIDANCE:
1. When the user asks about their disputes or status, reference the specific disputes above
2. If any dispute is overdue or due within 7 days, proactively alert the user
3. For active disputes, provide next steps based on how many days remain
4. When generating new dispute letters, save them to the Dispute Tracker
5. Consider the user's dispute history when recommending next actions
6. If they have resolved disputes, acknowledge their progress`;

    systemMessage += disputesContext;
  }
```

**Key Features:**
- Filters disputes by status (active, resolved, rejected)
- Calculates deadline countdown
- Identifies 7-day warning window
- Identifies overdue disputes
- Formats with emoji indicators
- Provides agent instructions
- Appends to system message

---

### Change 4: Chat Mutation Enhancement (Lines 1825-1865)

**Location:** The `chat` mutation handler that processes user messages

**Before:**
```typescript
const agentName = agent?.agent_name || "AI Agent";
const agentBio = agent?.bio || "";

// 3. Build the message array for the AI call
const messages = [
  ...input.history.map((m) => ({ role: m.role, content: m.content })),
  { role: "user", content: input.message },
];

// 4. Call the AI backend
const { response, toolCalls } = await callAIBackend({
  messages,
  agentName,
  agentBio,
  equifaxReport: input.equifaxReport,
  userId: input.userId,
});
```

**After:**
```typescript
const agentName = agent?.agent_name || "AI Agent";
const agentBio = agent?.bio || "";

// Load user's current disputes from database for AI context
const { disputes: userDisputes } = await fetchUserDisputes(input.userId);

// 3. Build the message array for the AI call
const messages = [
  ...input.history.map((m) => ({ role: m.role, content: m.content })),
  { role: "user", content: input.message },
];

// 4. Call the AI backend with disputes context
const { response, toolCalls } = await callAIBackend({
  messages,
  agentName,
  agentBio,
  equifaxReport: input.equifaxReport,
  disputes: userDisputes,              // ← NEW: Pass disputes
  userId: input.userId,
});
```

**Changes:**
- Loads disputes from database on every chat message
- Passes disputes to callAIBackend
- Ensures fresh dispute data for each request

---

### Change 5: Enhanced `get_disputes` Tool Implementation (Lines 1420-1476)

**Location:** The tool execution function for `get_disputes`

**Before:**
```typescript
case "get_disputes": {
  const data = await fetchUserDisputes(userId);
  const disputeList = data.disputes
    .map(
      (d: any) =>
        `• ${d.creditor} — ${d.dispute_type} — Status: ${d.status} — Sent: ${d.date_sent}`
    )
    .join("\n");
  return {
    toolName: "get_disputes",
    result: data,
    displayContent: `📋 **Dispute Status Retrieved**\n\n${data.summary}\n\n${disputeList || "No disputes found."}`,
  };
}
```

**After:**
```typescript
case "get_disputes": {
  const data = await fetchUserDisputes(userId);
  
  // Format disputes for AI-friendly output
  let displayContent = `📋 **Your Dispute Status**\n\n${data.summary}\n`;
  
  if (data.disputes.length === 0) {
    displayContent += "\nYou haven't filed any disputes yet. I can help you generate and track them!";
  } else {
    // Calculate which disputes are approaching their 30-day deadline
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilDeadline = (dateStr: string) => {
      if (!dateStr) return Infinity;
      const target = new Date(dateStr);
      target.setHours(0, 0, 0, 0);
      return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    };
    
    const active = data.disputes.filter((d: any) => d.status === 'sent' || d.status === 'in-progress');
    const overdueDisputes = active.filter((d: any) => daysUntilDeadline(d.responseBy) < 0);
    const dueWithin7Days = active.filter((d: any) => {
      const days = daysUntilDeadline(d.responseBy);
      return days >= 0 && days <= 7;
    });
    
    if (overdueDisputes.length > 0) {
      displayContent += `\n⚠️ **ACTION REQUIRED - OVERDUE DISPUTES:**\n`;
      overdueDisputes.forEach((d: any) => {
        const days = Math.abs(daysUntilDeadline(d.responseBy));
        displayContent += `- ${d.creditor} (${d.disputeType}) - Overdue by ${days} days\n`;
      });
    }
    
    if (dueWithin7Days.length > 0) {
      displayContent += `\n⏰ **Due Within 7 Days:**\n`;
      dueWithin7Days.forEach((d: any) => {
        const days = daysUntilDeadline(d.responseBy);
        displayContent += `- ${d.creditor} (${d.disputeType}) - Due in ${days} days\n`;
      });
    }
    
    displayContent += `\n**All Your Disputes:**\n`;
    data.disputes.forEach((d: any, idx: number) => {
      const statusIcon = d.status === 'sent' ? '📤' : d.status === 'in-progress' ? '⏳' : d.status === 'resolved' ? '✓' : '✗';
      displayContent += `${idx + 1}. ${statusIcon} ${d.creditor} (${d.disputeType}) - ${d.status}\n   Sent: ${d.dateSent}\n`;
    });
  }
  
  return {
    toolName: "get_disputes",
    result: data,
    displayContent,
  };
}
```

**Enhanced Features:**
- Summary of total, active, resolved, rejected disputes
- Deadline calculation and tracking
- Overdue dispute alerts
- 7-day warning highlights
- Emoji status indicators
- Detailed dispute listing
- Graceful handling of empty disputes
- Actionable formatting

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ User Message to AI Agent                                        │
└────────────────────────────┬──────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ Chat Mutation Receives Message (Line 1825)                      │
│ - Save user message to database                                 │
│ - Fetch agent info                                              │
├─────────────────────────────────────────────────────────────────┤
│ Load Disputes from Database (Line 1847)                         │
│ const { disputes } = await fetchUserDisputes(userId)            │
│ - Query: SELECT * FROM disputes WHERE user_id = ?              │
│ - Map database columns to camelCase                            │
│ - Calculate statistics (active, resolved, rejected)            │
└────────────────────────────┬──────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ Call AI Backend (Line 1856)                                     │
│ - Pass messages                                                 │
│ - Pass disputes array (NEW)                                     │
│ - Pass equifaxReport (if available)                             │
└────────────────────────────┬──────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ callAIBackend() Function (Line 1040)                            │
│ - Build system prompt                                           │
│ - Inject Equifax context (if available)                         │
│ - Inject Disputes context (NEW - Line 1125)                     │
│   * Status summary                                              │
│   * Deadline alerts                                             │
│   * Detailed dispute list                                       │
│   * Agent instructions                                          │
└────────────────────────────┬──────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ OpenAI API Call                                                 │
│ - System prompt (with disputes context)                         │
│ - Message history (capped at 4K chars)                          │
│ - User message                                                  │
│ - Available tools (including get_disputes)                      │
└────────────────────────────┬──────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ Agent Processing                                                │
│ - Understands user's disputes from context                      │
│ - Can reference specific creditors                              │
│ - Knows deadlines and urgency                                   │
│ - May call get_disputes tool for updated status                 │
└────────────────────────────┬──────────────────────────────────────┘
                             ↓
                    ┌────────┴────────┐
                    ↓                 ↓
          ┌──────────────────┐  ┌─────────────────┐
          │ Tool Calls       │  │ Natural Response │
          │ (e.g. get_      │  │ with Context    │
          │  disputes)       │  │                 │
          └────────┬─────────┘  └─────────────────┘
                   ↓                      ↓
          ┌──────────────────┐    (saved to database)
          │ Execute Tool     │
          │ (Line 1420)      │
          │ - Fetch disputes │
          │ - Format display │
          │ - Calc deadlines │
          └────────┬─────────┘
                   ↓
          ┌──────────────────┐
          │ Tool Result      │
          │ - Summary stats  │
          │ - Overdue alerts │
          │ - 7-day warnings │
          │ - All disputes   │
          └──────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ Final Response to User                                          │
│ - Agent's natural language response                             │
│ - Tool results (if applicable)                                  │
│ - All with dispute context awareness                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example System Prompt Injection

### Without Disputes:
```
[AGENT_SYSTEM_PROMPT - extensive credit repair knowledge]

Your name is Alex. You're a friendly and knowledgeable credit repair expert.

You are speaking with a user who is enrolled in the ACE-1 credit repair course...
```

### With Equifax Report Only:
```
[AGENT_SYSTEM_PROMPT]

Your name is Alex...

CREDIT REPORT ANALYSIS (Session Data):
- Report Fetched: 9/12/2024, 2:30 PM
- Total Accounts: 12
- Negative Accounts: 4
- Credit Score: 580

Negative Accounts to Dispute:
1. [CHARGE-OFF] Capital One
   Account #: XXXX5678
   Status: Charged Off
   Balance: $2,150
   ...
```

### With Disputes (NEW):
```
[AGENT_SYSTEM_PROMPT]

Your name is Alex...

CREDIT REPORT ANALYSIS (Session Data):
...

DISPUTE TRACKER STATUS (Real-time from your account):
- Total Disputes: 3
- Active/Open: 2
- Resolved: 1
- Rejected: 0
- ⏰ DUE WITHIN 7 DAYS: 1

Your Current Disputes:
1. 📤 Capital One - 609 Letter
   Account #: XXXX5678
   Status: sent
   Sent: 2024-09-10 ⏰ DUE in 5 days

2. ⏳ Equifax - 611 Letter
   Account #: XXXX9012
   Status: in-progress
   Sent: 2024-09-05 (due 2024-10-05)

3. ✓ Discover - 623 Letter
   Account #: XXXX3456
   Status: resolved
   Sent: 2024-08-15

IMPORTANT DISPUTE GUIDANCE:
1. When the user asks about their disputes or status, reference the specific disputes above
2. If any dispute is overdue or due within 7 days, proactively alert the user
3. For active disputes, provide next steps based on how many days remain
4. When generating new dispute letters, save them to the Dispute Tracker
5. Consider the user's dispute history when recommending next actions
6. If they have resolved disputes, acknowledge their progress
```

---

## Type Definitions

### Dispute Type (for callAIBackend):
```typescript
{
  id: string;                    // Unique dispute ID
  creditor: string;              // Creditor/bureau name
  accountNumber: string;         // Account being disputed
  disputeType: string;           // Letter type (609, 611, 623, 809, etc)
  dateSent: string;              // When dispute was sent
  status: 'sent' | 'in-progress' | 'resolved' | 'rejected';
  lastUpdated: string;           // Last modification date
  responseBy: string;            // FCRA 30-day deadline
}
```

### fetchUserDisputes Return:
```typescript
{
  disputes: Dispute[];           // Array of disputes (mapped)
  summary: string;               // Human-readable summary
  open: number;                  // Count of active disputes
  resolved: number;              // Count of resolved disputes
  rejected: number;              // Count of rejected disputes
}
```

---

## Summary of Changes

| Component | Lines | Change | Impact |
|-----------|-------|--------|--------|
| fetchUserDisputes() | 585-615 | Added column mapping | Consistent naming |
| callAIBackend() Signature | 1040-1071 | Added disputes param | Accepts dispute data |
| System Prompt Injection | 1125-1185 | Added dispute context | Agent awareness |
| Chat Mutation | 1847-1849 | Load disputes | Fresh data per message |
| get_disputes Tool | 1420-1476 | Enhanced formatting | Better UX |

**Total Lines Modified:** ~120 lines
**Files Modified:** 1 (ai-agents.ts)
**Breaking Changes:** None
**Database Schema Changes:** None
**Dependencies Added:** None

---

## Testing Considerations

### Unit Tests Needed:
1. fetchUserDisputes() with disputes
2. fetchUserDisputes() with empty disputes
3. Deadline calculation logic
4. Status emoji mapping
5. get_disputes tool execution

### Integration Tests Needed:
1. Chat mutation with disputes
2. System prompt with injected context
3. Agent tool calls for get_disputes
4. End-to-end conversation flow

### Edge Cases:
1. User with no disputes yet
2. User with overdue disputes
3. User with all resolved disputes
4. User with mixed status disputes
5. Database query failures
6. Missing responseBy dates

