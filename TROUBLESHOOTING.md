# Troubleshooting Guide - AI Dispute Assistant

## Problem: "Couldn't Reach Your Agent" Error

### What This Error Means
When you navigate to the "My Agent" section, you see:
```
Couldn't Reach Your Agent
Unexpected token '<', "<!DOCTYPE"... is not valid JSON
```

**Root cause:** Backend server isn't running or isn't initialized before Expo loads

### Solution: Use start-agent-v2.command

```bash
bash ~/rork823/start-agent-v2.command
```

This script:
1. ✅ Kills any existing processes
2. ✅ Starts backend on port 3000
3. ✅ **WAITS for backend to be ready** (up to 15 seconds) ← KEY FIX!
4. ✅ Only then starts Expo on port 8081
5. ✅ Shows you the status each step

### Testing Checklist

After app loads, test these scenarios:

#### Scenario 1: Report with Negative Accounts
- [ ] Parse credit report with late payments/collections
- [ ] Account Summary displays
- [ ] Red badges show for negative accounts
- [ ] "Generate Dispute Letters" button appears

#### Scenario 2: Report without Negative Accounts  
- [ ] Parse clean credit report
- [ ] Account Summary STILL displays (this is the fix!)
- [ ] "No Negative Accounts Found" message shows
- [ ] Positive/neutral accounts visible
- [ ] Dispute Letters button does NOT appear

#### Scenario 3: AI Agent
- [ ] Click "My Agent" tab
- [ ] Should NOT see "Couldn't Reach Your Agent" error
- [ ] Agent should load properly

### If Problems Persist

**Check backend is running:**
```bash
curl http://localhost:3000/api/system-status
# Should return JSON
```

**Check logs:**
```bash
cat ~/rork823/backend.log
```

**Nuclear reset:**
```bash
killall node 2>/dev/null
pkill -f expo 2>/dev/null
bash ~/rork823/start-agent-v2.command
```

---

For detailed troubleshooting, see SESSION_SUMMARY.md
