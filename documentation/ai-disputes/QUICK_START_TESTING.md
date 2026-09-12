# Quick Start: Testing AI Agent Dispute Context

Get up and running in 5 minutes!

## Step 1: Setup (2 minutes)

### Get Your Configuration
You need 3 things:
```
1. API URL: http://localhost:3000 (usually)
2. Test User ID: Get from Supabase auth.users table
3. Agent ID: Get from agents table or use "default"
```

### Create Test Data (Optional)
```sql
-- Create one test dispute
INSERT INTO disputes (
  user_id, creditor, account_number, dispute_type,
  date_sent, status, response_by, last_updated, created_at
) VALUES (
  '[YOUR_TEST_USER_ID]',
  'Equifax',
  'EQ-789',
  'Inaccurate info',
  NOW()::date,
  'sent',
  (NOW() + '30 days'::interval)::date,
  NOW(),
  NOW()
);
```

## Step 2: Choose Your Testing Method (3 minutes)

### Option A: Visual Dashboard (Easiest) 🎨
```bash
# Open in browser
open dispute-testing-dashboard.html
# Or just open the file directly - no server needed!
```

Then:
1. Paste your API URL, User ID, and Agent ID
2. Click "Test Connection"
3. Click any test scenario to run it
4. Watch the chat responses appear
5. See metrics in real-time

**Time**: 2 minutes

---

### Option B: Curl Commands (Fastest) ⚡
```bash
# Copy-paste this command with your values:
curl -X POST http://localhost:3000/trpc/aiAgents.chat \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": "[YOUR_TEST_USER_ID]",
      "agentId": "[YOUR_AGENT_ID]",
      "message": "What disputes do I have?",
      "history": []
    }
  }'
```

Expected response: Agent tells you about disputes!

**Time**: 1 minute

---

### Option C: Automated Script (Most Thorough) 🤖
```bash
chmod +x test-disputes.sh
./test-disputes.sh http://localhost:3000 [USER_ID] [AGENT_ID]
```

**Time**: 3 minutes, runs all tests

---

## Step 3: Interpret Results (Immediate!)

### What to Look For ✅

**Good Response**:
```
"You have 3 active disputes: 1 with Equifax (due in 15 days),
1 with Experian (due in 8 days), and 1 with TransUnion (resolved).
Your Experian dispute needs attention soon."
```

**Signs of Working Feature**:
- ✅ Agent mentions specific creditor names
- ✅ Agent shows dispute statuses
- ✅ Agent includes deadline information
- ✅ Response mentions specific account numbers
- ✅ No errors in console/logs
- ✅ Response time < 3 seconds

---

## Test Scenarios (Quick Reference)

### Test 1: "What disputes do I have?"
- **Purpose**: Basic dispute awareness
- **Expected**: Agent lists all disputes with details
- **Pass**: Mentions specific creditors

### Test 2: "Tell me about my [creditor] dispute"
- **Purpose**: Specific dispute discussion
- **Expected**: Agent discusses that specific dispute
- **Pass**: References account number and status

### Test 3: "Should I do anything about my disputes?"
- **Purpose**: Deadline awareness
- **Expected**: Agent mentions deadlines or action items
- **Pass**: Mentions days remaining or urgency

### Test 4: "Are any of my disputes overdue?"
- **Purpose**: Overdue detection
- **Expected**: Agent flags overdue disputes (if any exist)
- **Pass**: Recommends immediate follow-up

### Test 5: "What's my dispute status?"
- **Purpose**: Status summary
- **Expected**: Agent provides complete summary
- **Pass**: Shows all disputes and statuses

---

## Common Issues & Quick Fixes

### Issue: "Agent doesn't mention disputes"
**Fix**: 
1. Verify disputes exist: `SELECT COUNT(*) FROM disputes WHERE user_id = '[YOUR_ID]'`
2. Check backend logs: `tail -f /var/log/rork/ai-agents.log | grep disputes`
3. Restart backend if needed

### Issue: "Connection refused"
**Fix**:
1. Is backend running? `curl http://localhost:3000/health`
2. Wrong API URL? Check configuration
3. Firewall blocking? Check network access

### Issue: "Response is very slow (> 5 seconds)"
**Fix**:
1. Check OpenAI API status
2. Monitor server load: `top`
3. Check database connection: `psql $DATABASE_URL -c "SELECT 1"`

### Issue: "Agent says 'Unable to retrieve disputes'"
**Fix**:
1. Database connection issue
2. User doesn't exist in database
3. Disputes table has no data
Run: `SELECT * FROM disputes LIMIT 5` to verify table

---

## Verify It's Working: Checklist

- [ ] Test connection successful
- [ ] Send a message about disputes
- [ ] Agent mentions at least one creditor name
- [ ] Response includes dispute status
- [ ] No error messages in response
- [ ] Response time < 3 seconds
- [ ] Try asking about specific creditor
- [ ] Agent asks follow-up questions
- [ ] Chat history works (send 2+ messages)
- [ ] Performance metrics look good

**All checked? 🎉 Feature is working!**

---

## Next Steps

### If Everything Works ✅
1. Follow `DEPLOYMENT_CHECKLIST.md` for production deployment
2. Set up monitoring alerts (see DEPLOYMENT_CHECKLIST.md)
3. Notify team of successful testing

### If Something Breaks ❌
1. Check `AI_DISPUTES_TESTING_GUIDE.md` troubleshooting section
2. Run diagnostic queries from `API_TESTING_EXAMPLES.md`
3. Review logs: `grep "\[AI Agents\]" /var/log/rork/ai-agents.log`
4. Check `IMPLEMENTATION_COMPLETE.md` for technical details

---

## Full Documentation

- **Testing Details**: `AI_DISPUTES_TESTING_GUIDE.md`
- **API Examples**: `API_TESTING_EXAMPLES.md`
- **Deployment**: `DEPLOYMENT_CHECKLIST.md`
- **Technical**: `IMPLEMENTATION_COMPLETE.md`
- **Code Review**: `AI_DISPUTES_CODE_WALKTHROUGH.md`
- **Navigation**: `AI_DISPUTES_INDEX.md`

---

## Support

**Can't get it working?**
1. Check the troubleshooting section above
2. Review relevant documentation
3. Run test-disputes.sh for diagnostics
4. Check backend logs
5. Verify database has test data

**Questions about the feature?**
- Read `IMPLEMENTATION_COMPLETE.md` 
- See examples in `API_TESTING_EXAMPLES.md`
- Visual testing with `dispute-testing-dashboard.html`

---

**Happy Testing! 🚀**

The feature is production-ready and fully tested. Enjoy dispute-aware agent responses!
