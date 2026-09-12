# API Testing Examples - AI Agent Dispute Context

## Overview
This document contains ready-to-use curl commands and examples for testing the AI agent's dispute context awareness feature. Replace the bracketed values with your actual configuration.

## Configuration Variables

Before running examples, set these environment variables:

```bash
# Set your configuration
export API_URL="http://localhost:3000"
export TEST_USER_ID="[YOUR_TEST_USER_ID]"
export AGENT_ID="[YOUR_AGENT_ID]"
export BEARER_TOKEN="[YOUR_AUTH_TOKEN]"  # If needed

# Quick test
echo "API URL: $API_URL"
echo "Test User: $TEST_USER_ID"
echo "Agent: $AGENT_ID"
```

## Basic Connection Test

### Test API is Running

```bash
curl -v http://localhost:3000/health
```

**Expected Response**:
```
HTTP/1.1 200 OK
{"status":"ok"}
```

---

## Test 1: Chat with No Disputes

### Setup
```bash
# First, create a clean test user with NO disputes
export TEST_USER_ID="[CREATE_NEW_USER_ID]"

# Verify no disputes exist:
# SELECT COUNT(*) FROM disputes WHERE user_id = '$TEST_USER_ID';
# Should return 0
```

### Request
```bash
curl -X POST $API_URL/trpc/aiAgents.chat \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "json": {
      "userId": "'$TEST_USER_ID'",
      "agentId": "'$AGENT_ID'",
      "message": "What disputes do I have?",
      "history": []
    }
  }' \
  -w "\nResponse Time: %{time_total}s\n"
```

### Expected Response
```json
{
  "result": {
    "data": {
      "response": "I don't see any active disputes on your account yet. Would you like help starting a dispute or checking your credit report for issues we should address?"
    }
  }
}
```

### Success Criteria
- ✅ Response includes acknowledgment of no disputes
- ✅ Response time < 2 seconds
- ✅ HTTP 200 status
- ✅ No errors in response

---

## Test 2: Chat with Single Active Dispute

### Setup
```bash
# Create test dispute
cat << 'SQL' | psql $DATABASE_URL
INSERT INTO disputes (user_id, creditor, account_number, dispute_type, date_sent, status, response_by, last_updated, created_at)
VALUES (
  '[TEST_USER_ID]',
  'Equifax',
  'EQ-12345',
  'Account not mine',
  NOW()::date,
  'sent',
  (NOW() + '30 days'::interval)::date,
  NOW(),
  NOW()
);
SQL
```

### Request
```bash
curl -X POST $API_URL/trpc/aiAgents.chat \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": "'$TEST_USER_ID'",
      "agentId": "'$AGENT_ID'",
      "message": "Tell me about my Equifax dispute",
      "history": []
    }
  }' \
  -w "\nResponse Time: %{time_total}s\n"
```

### Expected Response Pattern
```json
{
  "result": {
    "data": {
      "response": "You have an active dispute with Equifax regarding 'Account not mine' on account EQ-12345. This dispute was sent [date] and the creditor has until [due date] to respond. You currently have [X] days remaining for their response."
    }
  }
}
```

### Success Criteria
- ✅ Response mentions "Equifax" specifically
- ✅ Response mentions "Account not mine"
- ✅ Response includes account number
- ✅ Response indicates days remaining
- ✅ Response is specific to the dispute (not generic)

---

## Test 3: Chat with Multiple Disputes

### Setup
```bash
cat << 'SQL' | psql $DATABASE_URL
-- Insert 3 disputes with different statuses
INSERT INTO disputes (user_id, creditor, account_number, dispute_type, date_sent, status, response_by, last_updated, created_at)
VALUES 
  ('[TEST_USER_ID]', 'Equifax', 'EQ-111', 'Inaccurate info', '2024-08-15'::date, 'in-progress', '2024-09-14'::date, NOW(), NOW()),
  ('[TEST_USER_ID]', 'Experian', 'EXP-222', 'Duplicate account', '2024-08-01'::date, 'resolved', '2024-08-31'::date, NOW(), NOW()),
  ('[TEST_USER_ID]', 'TransUnion', 'TU-333', 'Wrong balance', '2024-08-20'::date, 'sent', '2024-09-19'::date, NOW(), NOW());
SQL
```

### Request
```bash
curl -X POST $API_URL/trpc/aiAgents.chat \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": "'$TEST_USER_ID'",
      "agentId": "'$AGENT_ID'",
      "message": "Give me a summary of all my disputes",
      "history": []
    }
  }' \
  -w "\nResponse Time: %{time_total}s\n"
```

### Expected Response Pattern
```json
{
  "result": {
    "data": {
      "response": "You have 3 total disputes on record: 1 resolved (great progress!), 1 actively being investigated, and 1 awaiting creditor response. Here's the status: [lists each dispute with current status and timeline]. Would you like me to help with any follow-up actions?"
    }
  }
}
```

### Success Criteria
- ✅ Response mentions all 3 disputes
- ✅ Response shows correct status for each
- ✅ Response acknowledges resolved dispute progress
- ✅ Response indicates active/pending disputes
- ✅ Agent references specific creditors by name

---

## Test 4: Deadline Warning (7-Day Window)

### Setup
```bash
cat << 'SQL' | psql $DATABASE_URL
INSERT INTO disputes (user_id, creditor, account_number, dispute_type, date_sent, status, response_by, last_updated, created_at)
VALUES (
  '[TEST_USER_ID]',
  'Chase Bank',
  'CH-999',
  'Unauthorized charge',
  (NOW() - '25 days'::interval)::date,
  'sent',
  (NOW() + '5 days'::interval)::date,  -- Due in 5 days
  NOW(),
  NOW()
);
SQL
```

### Request
```bash
curl -X POST $API_URL/trpc/aiAgents.chat \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": "'$TEST_USER_ID'",
      "agentId": "'$AGENT_ID'",
      "message": "What should I do next with my disputes?",
      "history": []
    }
  }' \
  -w "\nResponse Time: %{time_total}s\n"
```

### Expected Response Pattern
```
⏰ IMPORTANT: One of your disputes is due within 7 days!
Your Chase Bank dispute (Unauthorized charge) is due for response in just 5 days. 
If the creditor doesn't respond by [date], you may have additional resolution options.
Consider sending them a follow-up letter now to ensure they don't miss the deadline.
```

### Success Criteria
- ✅ Response includes deadline warning/emoji
- ✅ Response mentions specific number of days (5)
- ✅ Response includes creditor name
- ✅ Response recommends proactive action
- ✅ Response includes specific due date

---

## Test 5: Overdue Dispute Alert

### Setup
```bash
cat << 'SQL' | psql $DATABASE_URL
INSERT INTO disputes (user_id, creditor, account_number, dispute_type, date_sent, status, response_by, last_updated, created_at)
VALUES (
  '[TEST_USER_ID]',
  'Bank of America',
  'BOA-777',
  'Fraudulent transaction',
  '2024-08-01'::date,
  'sent',
  '2024-08-31'::date,  -- OVERDUE (past due date)
  NOW(),
  NOW()
);
SQL
```

### Request
```bash
curl -X POST $API_URL/trpc/aiAgents.chat \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": "'$TEST_USER_ID'",
      "agentId": "'$AGENT_ID'",
      "message": "How are my disputes progressing?",
      "history": []
    }
  }' \
  -w "\nResponse Time: %{time_total}s\n"
```

### Expected Response Pattern
```
⚠️ URGENT: You have an overdue dispute!
Your Bank of America dispute (Fraudulent transaction) was due for response on August 31st, 
and it's now [11] days overdue. The creditor has not yet responded.
You should send them an immediate follow-up letter. Would you like me to generate one?
```

### Success Criteria
- ✅ Response includes warning emoji (⚠️)
- ✅ Response clearly states "overdue"
- ✅ Response includes number of days overdue
- ✅ Response recommends immediate action
- ✅ Response offers to generate follow-up letter

---

## Test 6: Direct Tool Call - get_disputes

### Request
```bash
curl -X POST $API_URL/trpc/aiAgents.chat \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": "'$TEST_USER_ID'",
      "agentId": "'$AGENT_ID'",
      "message": "Use the get_disputes tool to show me all my disputes in detail",
      "history": []
    }
  }' \
  -w "\nResponse Time: %{time_total}s\n" | jq .
```

### Expected Tool Execution
```json
{
  "result": {
    "data": {
      "response": "...",
      "toolCalls": [
        {
          "toolName": "get_disputes",
          "toolResult": {
            "status": "success",
            "summary": "You have 3 total disputes: 2 open/in-progress, 1 resolved, 0 rejected.",
            "disputes": [
              {
                "creditor": "Equifax",
                "account": "EQ-111",
                "type": "Inaccurate info",
                "status": "in-progress",
                "sent": "2024-08-15",
                "daysRemaining": 15
              },
              {
                "creditor": "Experian",
                "account": "EXP-222",
                "type": "Duplicate account",
                "status": "resolved",
                "sent": "2024-08-01",
                "daysRemaining": null
              },
              {
                "creditor": "TransUnion",
                "account": "TU-333",
                "type": "Wrong balance",
                "status": "sent",
                "sent": "2024-08-20",
                "daysRemaining": 20
              }
            ]
          }
        }
      ]
    }
  }
}
```

### Success Criteria
- ✅ Tool name is "get_disputes"
- ✅ Tool returns success status
- ✅ Summary includes all dispute counts
- ✅ Each dispute includes all required fields
- ✅ Days remaining correctly calculated

---

## Test 7: Performance Baseline

### Single Request Timing
```bash
echo "Running 1 request..."
time curl -X POST $API_URL/trpc/aiAgents.chat \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": "'$TEST_USER_ID'",
      "agentId": "'$AGENT_ID'",
      "message": "What disputes do I have?",
      "history": []
    }
  }' > /dev/null 2>&1
```

### Repeated Requests (Load Test)
```bash
# Send 10 requests and capture timing
for i in {1..10}; do
  echo "Request $i:"
  curl -X POST $API_URL/trpc/aiAgents.chat \
    -H "Content-Type: application/json" \
    -d '{
      "json": {
        "userId": "'$TEST_USER_ID'",
        "agentId": "'$AGENT_ID'",
        "message": "What disputes do I have?",
        "history": []
      }
    }' \
    -w "Time: %{time_total}s\n" \
    -o /dev/null -s
  sleep 1
done
```

### Performance Expectations
- **First request**: 1.5-2.5s (includes AI processing)
- **Subsequent requests**: 1.5-2.5s (consistent)
- **Database query only**: < 50ms
- **99th percentile**: < 3s

---

## Test 8: Chat History with Disputes

### Request with History
```bash
curl -X POST $API_URL/trpc/aiAgents.chat \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": "'$TEST_USER_ID'",
      "agentId": "'$AGENT_ID'",
      "message": "What should I do next?",
      "history": [
        {
          "role": "user",
          "content": "Hi, can you help me with my credit disputes?"
        },
        {
          "role": "assistant",
          "content": "Of course! I can help you manage your disputes. You currently have 3 active disputes..."
        }
      ]
    }
  }' \
  -w "\nResponse Time: %{time_total}s\n"
```

### Success Criteria
- ✅ Response considers conversation history
- ✅ Response maintains context from previous messages
- ✅ Response includes current dispute status
- ✅ No errors from history processing

---

## Test 9: Error Handling - Invalid User

### Request
```bash
curl -X POST $API_URL/trpc/aiAgents.chat \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": "invalid-user-id-12345",
      "agentId": "'$AGENT_ID'",
      "message": "What disputes do I have?",
      "history": []
    }
  }' \
  -w "\nResponse Time: %{time_total}s\n"
```

### Expected Response
```json
{
  "result": {
    "data": {
      "response": "I'm unable to retrieve your information at this time. Please check your connection and try again."
    }
  }
}
```

### Success Criteria
- ✅ HTTP 200 (even with invalid user - graceful handling)
- ✅ User gets friendly error message
- ✅ Backend logs error appropriately
- ✅ No technical error exposed to user

---

## Test 10: Error Handling - Missing Fields

### Request (missing agentId)
```bash
curl -X POST $API_URL/trpc/aiAgents.chat \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": "'$TEST_USER_ID'",
      "message": "What disputes do I have?",
      "history": []
    }
  }' \
  -w "\nResponse Time: %{time_total}s\n"
```

### Expected Response
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "agentId is required"
  }
}
```

### Success Criteria
- ✅ HTTP 400 (Bad Request)
- ✅ Clear error message
- ✅ No server error

---

## Automated Testing Script

Save as `test-disputes.sh`:

```bash
#!/bin/bash

# Configuration
API_URL="${1:-http://localhost:3000}"
TEST_USER_ID="${2:-test-user}"
AGENT_ID="${3:-default-agent}"

echo "================================"
echo "AI Agent Dispute Context Testing"
echo "================================"
echo "API URL: $API_URL"
echo "Test User: $TEST_USER_ID"
echo "Agent: $AGENT_ID"
echo ""

# Test 1: Connection
echo "[Test 1] Verifying API connection..."
if curl -s -f "$API_URL/health" > /dev/null; then
  echo "✓ API is responding"
else
  echo "✗ API not responding"
  exit 1
fi
echo ""

# Test 2: No Disputes
echo "[Test 2] Testing with no disputes..."
RESPONSE=$(curl -s -X POST "$API_URL/trpc/aiAgents.chat" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": "'$TEST_USER_ID'",
      "agentId": "'$AGENT_ID'",
      "message": "What disputes do I have?",
      "history": []
    }
  }')

if echo "$RESPONSE" | jq -e '.result.data.response' > /dev/null; then
  echo "✓ Successfully received response"
  echo "Response: $(echo "$RESPONSE" | jq -r '.result.data.response' | head -c 80)..."
else
  echo "✗ Failed to receive valid response"
  echo "$RESPONSE"
fi
echo ""

# Test 3: Performance
echo "[Test 3] Testing response time..."
START_TIME=$(date +%s.%N)
curl -s -X POST "$API_URL/trpc/aiAgents.chat" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": "'$TEST_USER_ID'",
      "agentId": "'$AGENT_ID'",
      "message": "What disputes do I have?",
      "history": []
    }
  }' > /dev/null
END_TIME=$(date +%s.%N)
RESPONSE_TIME=$(echo "$END_TIME - $START_TIME" | bc)

if (( $(echo "$RESPONSE_TIME < 3" | bc -l) )); then
  echo "✓ Response time acceptable: ${RESPONSE_TIME}s"
else
  echo "⚠ Response time slow: ${RESPONSE_TIME}s (expected < 3s)"
fi
echo ""

echo "================================"
echo "Testing Complete"
echo "================================"
```

Run it:
```bash
chmod +x test-disputes.sh
./test-disputes.sh http://localhost:3000 [TEST_USER_ID] [AGENT_ID]
```

---

## Debugging Commands

### Check Backend Logs
```bash
# Watch real-time logs
tail -f /var/log/rork/ai-agents.log

# Search for errors
grep -i error /var/log/rork/ai-agents.log

# Search for dispute-related logs
grep -i "dispute\|[AI Agents]" /var/log/rork/ai-agents.log

# Count requests
grep "aiAgents.chat" /var/log/rork/ai-agents.log | wc -l
```

### Check Database Directly
```bash
# Count disputes for user
psql $DATABASE_URL -c "SELECT COUNT(*) as dispute_count FROM disputes WHERE user_id = '[TEST_USER_ID]';"

# View disputes
psql $DATABASE_URL -c "SELECT id, creditor, status, response_by FROM disputes WHERE user_id = '[TEST_USER_ID]' ORDER BY date_sent DESC;"

# Check deadlines
psql $DATABASE_URL -c "
  SELECT 
    creditor, 
    status, 
    response_by, 
    (response_by::date - NOW()::date) as days_remaining
  FROM disputes 
  WHERE user_id = '[TEST_USER_ID]' 
  AND status IN ('sent', 'in-progress');
"
```

### Check OpenAI Usage
```bash
# View OpenAI token usage from logs
grep "token" /var/log/rork/ai-agents.log | tail -20

# Estimate tokens
# Each dispute ≈ 200 tokens
# System prompt ≈ 500 tokens
# Total context ≈ 700-1000 tokens per request
```

---

## Troubleshooting

### Issue: "Unable to retrieve disputes"
- Check database connection: `psql $DATABASE_URL -c "SELECT 1"`
- Verify user exists: `psql $DATABASE_URL -c "SELECT * FROM auth.users WHERE id = '[TEST_USER_ID]'"`
- Check disputes table: `psql $DATABASE_URL -c "SELECT * FROM disputes LIMIT 1"`

### Issue: Response time > 3 seconds
- Check database query time
- Check OpenAI API status (might be slow)
- Check server load: `top` or `vmstat 1 5`

### Issue: Agent not mentioning disputes
- Check system prompt injection: add logging at line 1125
- Verify disputes loaded: grep for "Loaded X disputes"
- Test get_disputes tool directly

### Issue: Deadline calculations wrong
- Check timezone settings
- Verify response_by dates are correct in database
- Test calculation: `psql $DATABASE_URL -c "SELECT NOW()::date, '2024-09-14'::date, ('2024-09-14'::date - NOW()::date)"`
