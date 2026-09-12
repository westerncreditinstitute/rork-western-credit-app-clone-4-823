# AI Agent Dispute Context Awareness - Testing Guide

## Overview
This guide provides comprehensive testing procedures for the AI agent's dispute context awareness feature. The implementation enables the Credit Repair Agent to understand and discuss the user's current disputes from the Dispute Tracker, providing contextual responses about dispute status, progress, and deadlines.

## Pre-Testing Setup

### Environment Requirements
- Supabase project with properly configured disputes table
- Backend running at configured tRPC endpoint
- OpenAI API key configured (for AI responses)
- Test database connection verified

### Database Schema Verification
Before testing, verify the disputes table has these columns:
```sql
- id (UUID, primary key)
- user_id (UUID, foreign key to auth.users)
- creditor (text) - Name of the creditor
- account_number (text) - Associated account number
- dispute_type (text) - Type of dispute
- date_sent (date) - When dispute was sent
- status (text) - 'sent', 'in-progress', 'resolved', 'rejected'
- response_by (date) - Expected response deadline (typically 30 days from date_sent)
- last_updated (timestamp) - When record was last updated
- created_at (timestamp) - When record was created
```

## Test Data Setup

### Test User Creation
Create a test user in Supabase:
```sql
-- In Supabase SQL Editor
INSERT INTO auth.users (email, confirmed_at)
VALUES ('test-disputes@example.com', now())
RETURNING id;
```
Save the returned user_id for test scenarios.

### Test Dispute Scenarios

#### Scenario 1: Fresh Start (No Disputes)
```sql
-- Create test user with no disputes
-- User ID: [use the one from above]
-- Expected: Agent says "I don't see any active disputes yet"
```

#### Scenario 2: One Active Recent Dispute
```sql
INSERT INTO public.disputes (
  user_id,
  creditor,
  account_number,
  dispute_type,
  date_sent,
  status,
  response_by,
  last_updated,
  created_at
)
VALUES (
  '[TEST_USER_ID]',
  'Equifax',
  'ACC-123456',
  'Account not mine',
  NOW()::date,
  'sent',
  (NOW() + '30 days'::interval)::date,
  NOW(),
  NOW()
);
```

#### Scenario 3: Multiple Disputes with Mixed Status
```sql
INSERT INTO public.disputes (user_id, creditor, account_number, dispute_type, date_sent, status, response_by, last_updated, created_at)
VALUES 
  ('[TEST_USER_ID]', 'Equifax', 'EQ-789', 'Inaccurate info', '2024-08-15'::date, 'in-progress', '2024-09-14'::date, NOW(), NOW()),
  ('[TEST_USER_ID]', 'Experian', 'EXP-456', 'Duplicate account', '2024-08-20'::date, 'resolved', '2024-09-19'::date, NOW(), NOW()),
  ('[TEST_USER_ID]', 'TransUnion', 'TU-321', 'Wrong balance', '2024-08-25'::date, 'in-progress', '2024-09-24'::date, NOW(), NOW());
```

#### Scenario 4: Overdue Dispute (Testing Alert System)
```sql
INSERT INTO public.disputes (
  user_id,
  creditor,
  account_number,
  dispute_type,
  date_sent,
  status,
  response_by,
  last_updated,
  created_at
)
VALUES (
  '[TEST_USER_ID]',
  'Chase',
  'CH-999',
  'Fraudulent transaction',
  '2024-08-01'::date,
  'sent',
  '2024-08-31'::date,  -- In the past - overdue!
  NOW(),
  NOW()
);
```

#### Scenario 5: Dispute Due Within 7 Days (Testing Deadline Warning)
```sql
INSERT INTO public.disputes (
  user_id,
  creditor,
  account_number,
  dispute_type,
  date_sent,
  status,
  response_by,
  last_updated,
  created_at
)
VALUES (
  '[TEST_USER_ID]',
  'Bank of America',
  'BOA-555',
  'Payment not received',
  (NOW() - '25 days'::interval)::date,
  'sent',
  (NOW() + '5 days'::interval)::date,  -- Due in 5 days
  NOW(),
  NOW()
);
```

## Testing Procedures

### Test 1: Verify Context Injection
**Objective**: Confirm disputes are loaded and injected into system prompt

**Test Steps**:
1. Enable console logging in backend (check for `[AI Agents]` logs)
2. Send a chat message as test user
3. Watch backend logs for:
   - `[AI Agents] fetchUserDisputes called for user: [USER_ID]`
   - `[AI Agents] Loaded X disputes from database`
4. Verify no errors in dispute loading

**Expected Result**: 
- Disputes load without errors
- Console shows successful query
- Response time acceptable (< 100ms for query)

**Pass/Fail**: ✅ Pass if all steps complete without errors

---

### Test 2: Agent Acknowledges No Disputes
**Objective**: Verify agent handles empty dispute list gracefully

**Test Setup**: 
- Use test user with NO disputes

**Test Query**: 
```
"What disputes do I have?"
```

**Expected Response Pattern**:
```
"I don't see any active disputes on your account yet."
OR
"You don't have any disputes listed in your Dispute Tracker."
```

**Pass/Fail Criteria**: 
- ✅ Pass: Agent acknowledges no disputes without error
- ❌ Fail: Agent crashes, shows database error, or gives confusing response

---

### Test 3: Agent References Specific Dispute
**Objective**: Verify agent can discuss specific disputes by creditor name

**Test Setup**:
- User has dispute: Equifax, Account #EQ-789, "Inaccurate info", Status: "in-progress"
- Dispute sent 2024-08-15, due 2024-09-14

**Test Query**:
```
"Tell me about my Equifax dispute"
```

**Expected Response**:
- Mentions "Equifax" by name
- References the dispute type (e.g., "Inaccurate info")
- Indicates current status
- Should NOT make up account numbers or dates

**Example Expected Response**:
```
"You have an active dispute with Equifax regarding inaccurate information on account EQ-789. 
This dispute was sent on August 15th and they have until September 14th to respond. 
You're currently waiting for their response, so we'll monitor this closely."
```

**Pass/Fail Criteria**:
- ✅ Pass: Agent correctly references the specific dispute details
- ❌ Fail: Agent makes up details, references wrong creditor, or doesn't mention the dispute

---

### Test 4: Deadline Warning Detection (7-Day Window)
**Objective**: Verify agent proactively alerts about approaching deadlines

**Test Setup**:
- Create dispute with response due 5 days from now
- Example: if today is Sept 12, make response_by = Sept 17

**Test Query**:
```
"What should I do next?"
```

**Expected Response**:
- ⏰ Includes emoji or "due within 7 days" indicator
- Mentions specific number of days (e.g., "5 days")
- Recommends proactive follow-up
- Example: "⏰ One of your disputes is due within 7 days. Consider sending a follow-up letter..."

**Pass/Fail Criteria**:
- ✅ Pass: Agent detects and alerts about 7-day window
- ⚠️ Partial: Agent mentions deadline but doesn't emphasize urgency
- ❌ Fail: Agent doesn't mention deadline at all

---

### Test 5: Overdue Dispute Alert
**Objective**: Verify agent alerts about overdue disputes requiring immediate action

**Test Setup**:
- Create dispute with response_by date in the past
- Example: response_by = Sept 1, but today is Sept 12 (11 days overdue)

**Test Query**:
```
"How are my disputes going?"
```

**Expected Response**:
- ⚠️ Prominent warning about overdue dispute
- Specific creditor name
- Recommendation for immediate follow-up
- Example: "⚠️ Your Chase dispute is now 11 days overdue. The creditor was supposed to respond by August 31st. You should send them a follow-up letter immediately."

**Pass/Fail Criteria**:
- ✅ Pass: Agent detects overdue status and recommends action
- ⚠️ Partial: Agent mentions overdue but doesn't emphasize urgency
- ❌ Fail: Agent doesn't detect overdue status

---

### Test 6: Mixed Dispute Status Handling
**Objective**: Verify agent correctly handles multiple disputes with different statuses

**Test Setup**:
- 3 disputes: 1 resolved, 1 in-progress, 1 sent
- Example:
  - Equifax: resolved (✓)
  - Experian: in-progress (⏳)
  - TransUnion: sent (📤)

**Test Query**:
```
"Give me a summary of all my disputes"
```

**Expected Response**:
- Acknowledges progress (resolved dispute)
- Provides status of in-progress disputes
- Mentions pending disputes
- Different emoji or indicators for each status
- Example: "You have 3 total disputes: 1 resolved (great progress!), 1 actively being processed, and 1 awaiting response."

**Pass/Fail Criteria**:
- ✅ Pass: Agent handles all statuses correctly
- ⚠️ Partial: Agent mentions statuses but formatting unclear
- ❌ Fail: Agent misses or misrepresents dispute statuses

---

### Test 7: Performance Baseline
**Objective**: Measure response time with dispute context injection

**Test Setup**:
- Create user with 5 disputes
- Set up backend performance logging
- Use curl or API client to measure response time

**Test Command**:
```bash
curl -X POST http://localhost:3000/trpc/aiAgents.chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "[TEST_USER_ID]",
    "agentId": "[AGENT_ID]",
    "message": "What disputes do I have?",
    "history": [],
    "equifaxReport": null
  }' \
  -w "\nTotal time: %{time_total}s\nConnect time: %{time_connect}s\n"
```

**Expected Baseline**:
- Database query time: < 50ms
- Total response time: < 2 seconds
- No timeout errors

**Performance Analysis**:
- Dispute loading: ~20-50ms
- AI processing: ~1500-2000ms
- Total: ~1600-2100ms

**Pass/Fail Criteria**:
- ✅ Pass: Response time < 2 seconds consistently
- ⚠️ Partial: Response time 2-3 seconds (acceptable but monitor)
- ❌ Fail: Response time > 3 seconds or timeouts

---

### Test 8: Tool Execution - get_disputes
**Objective**: Verify get_disputes tool executes and returns correct data

**Test Setup**:
- User with 3 disputes in various statuses

**Test Query**:
```
"Can you look up my disputes for me using the tool?"
```

**Expected Tool Execution**:
1. Agent recognizes need for get_disputes tool
2. Tool executes and retrieves data
3. Tool response includes:
   - Total dispute count
   - Status breakdown (active, resolved, rejected)
   - Deadline information
   - List of disputes with emojis

**Expected Tool Response Format**:
```json
{
  "tool": "get_disputes",
  "status": "success",
  "data": {
    "total": 3,
    "active": 2,
    "resolved": 1,
    "rejected": 0,
    "disputes": [
      {
        "creditor": "Equifax",
        "account": "EQ-789",
        "type": "Inaccurate info",
        "status": "in-progress",
        "sent": "2024-08-15",
        "daysRemaining": 3,
        "urgency": "DUE_WITHIN_7_DAYS"
      },
      ...
    ]
  }
}
```

**Pass/Fail Criteria**:
- ✅ Pass: Tool executes, returns complete data structure
- ⚠️ Partial: Tool executes but missing some fields
- ❌ Fail: Tool errors or returns empty data

---

### Test 9: Database Error Handling
**Objective**: Verify graceful handling of database errors

**Test Steps**:
1. Temporarily disconnect Supabase
2. Send chat message as test user
3. Verify backend logs show error handling
4. Verify user gets appropriate error message (not technical error)

**Expected Behavior**:
- Backend logs error: `fetchUserDisputes error: [error details]`
- Returns empty disputes array: `{ disputes: [], summary: "Unable to retrieve disputes at this time." }`
- Agent continues without dispute context
- User sees: "I'm having trouble accessing your dispute information right now. Let me help you with what I know..."

**Pass/Fail Criteria**:
- ✅ Pass: Graceful error handling, no system crash
- ❌ Fail: Technical error shown to user or system crash

---

### Test 10: System Prompt Injection Verification
**Objective**: Verify system prompt contains dispute context when disputes exist

**Test Setup**:
- Enable detailed logging of system prompt
- User with 3 disputes

**Test Steps**:
1. Send chat message
2. Log or capture full system prompt being sent to OpenAI
3. Search for dispute context keywords

**Expected System Prompt Inclusion**:
```
DISPUTE TRACKER STATUS (Real-time from your account):
- Total Disputes: 3
- Active/Open: 2
- Resolved: 1
- Rejected: 0

Your Current Disputes:
1. 📤 Equifax - Inaccurate info
   Account #: EQ-789
   Status: sent
   Sent: 2024-08-15 (due 2024-09-14)
...
```

**Pass/Fail Criteria**:
- ✅ Pass: System prompt contains all dispute context
- ⚠️ Partial: System prompt contains some dispute data
- ❌ Fail: System prompt has no dispute context

## Automated Testing Script

Create this script to run all tests:

```bash
#!/bin/bash
# test-disputes.sh

TEST_USER_ID="[YOUR_TEST_USER_ID]"
BACKEND_URL="http://localhost:3000/trpc"
AGENT_ID="[YOUR_AGENT_ID]"

echo "=== AI Agent Dispute Context Testing ==="
echo ""

# Test 1: No Disputes
echo "[Test 1] Testing with no disputes..."
curl -X POST "$BACKEND_URL/aiAgents.chat" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"agentId\": \"$AGENT_ID\",
    \"message\": \"What disputes do I have?\",
    \"history\": []
  }" | jq '.result.data.response'
echo ""

# Test 2: With disputes
echo "[Test 2] Testing with active disputes..."
# First insert test dispute
psql $DATABASE_URL -c "INSERT INTO disputes (user_id, creditor, account_number, dispute_type, date_sent, status, response_by) VALUES ('$TEST_USER_ID', 'Equifax', 'EQ-789', 'Inaccurate info', NOW()::date, 'sent', (NOW() + '5 days'::interval)::date)"

curl -X POST "$BACKEND_URL/aiAgents.chat" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"agentId\": \"$AGENT_ID\",
    \"message\": \"Tell me about my disputes\",
    \"history\": []
  }" | jq '.result.data.response'
echo ""

echo "=== Testing Complete ==="
```

## Troubleshooting

### Issue: Agent doesn't mention disputes
**Possible Causes**:
1. Disputes not loading from database
2. System prompt not including dispute context
3. Agent configuration issue

**Debug Steps**:
1. Check backend logs for `fetchUserDisputes` messages
2. Verify disputes table has data: `SELECT * FROM disputes WHERE user_id = '[TEST_USER_ID]'`
3. Manually test system prompt injection by logging it
4. Verify agent's system prompt includes dispute section

### Issue: Performance too slow
**Possible Causes**:
1. Database query inefficient
2. Too many disputes (unlikely with pagination)
3. OpenAI API slow response

**Optimization**:
1. Add index on disputes.user_id: `CREATE INDEX idx_disputes_user_id ON disputes(user_id);`
2. Verify database connection pool
3. Monitor OpenAI API latency

### Issue: Wrong dispute data displayed
**Possible Causes**:
1. Field mapping error (snake_case to camelCase)
2. Database column names different
3. Data corruption in database

**Debug Steps**:
1. Check fetchUserDisputes mapping at line 598-606
2. Verify database schema matches expected columns
3. Run: `SELECT * FROM disputes LIMIT 1` to see actual columns

### Issue: Agent doesn't alert on deadlines
**Possible Causes**:
1. Deadline calculation incorrect
2. System prompt not including deadline logic
3. Disputes all resolved (no active deadlines)

**Debug Steps**:
1. Check deadline calculation at line 1160-1170
2. Verify response_by date is properly set
3. Test with known deadline dispute from Scenario 5

## Success Checklist

Use this checklist before marking implementation as complete:

- [ ] Test 1: Context injection works without errors
- [ ] Test 2: Agent handles no disputes gracefully
- [ ] Test 3: Agent references specific disputes correctly
- [ ] Test 4: 7-day deadline warnings detected
- [ ] Test 5: Overdue disputes trigger alerts
- [ ] Test 6: Mixed status disputes handled correctly
- [ ] Test 7: Performance baseline met (< 2s)
- [ ] Test 8: get_disputes tool executes properly
- [ ] Test 9: Database errors handled gracefully
- [ ] Test 10: System prompt includes all context
- [ ] Automated test script runs successfully
- [ ] No console errors or warnings
- [ ] Code review passed
- [ ] Documentation complete

## Next Steps After Testing

1. **If all tests pass**:
   - Deploy to staging environment
   - Run smoke tests with real users
   - Monitor performance in production
   - Create monitoring alerts

2. **If any tests fail**:
   - Document failure details
   - Create bug fix ticket
   - Implement fix
   - Re-run tests
   - Get code review approval
   - Re-deploy

3. **Ongoing Monitoring**:
   - Track response times
   - Monitor error rates
   - Watch for API quota usage
   - Verify deadline alerts functioning

## Support

For questions or issues with testing:
- Check backend logs at `/var/log/rork/ai-agents.log`
- Review implementation details in IMPLEMENTATION_COMPLETE.md
- Check Supabase console for database issues
- Monitor OpenAI API dashboard for quota/rate limit issues
