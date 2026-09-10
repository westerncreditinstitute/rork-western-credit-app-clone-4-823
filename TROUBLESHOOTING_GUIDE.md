# 🔧 TROUBLESHOOTING GUIDE - EQUIFAX MULTI-BUREAU INTEGRATION

## Quick Diagnostics

Run this command to check your setup:
```bash
cd /Users/solomon/rork823/expo

echo "=== Repository Check ==="
git remote -v

echo -e "\n=== File Checks ==="
test -f "backend/trpc/app-router.ts" && echo "✅ app-router.ts found" || echo "❌ app-router.ts MISSING"
test -f "backend/trpc/routes/equifax.ts" && echo "✅ equifax.ts found" || echo "❌ equifax.ts MISSING"
test -f "components/MyAgent/CreditAnalysisModal.tsx" && echo "✅ CreditAnalysisModal.tsx found" || echo "❌ CreditAnalysisModal.tsx MISSING"
test -f "contexts/EquifaxReportContext.tsx" && echo "✅ EquifaxReportContext.tsx found" || echo "❌ EquifaxReportContext.tsx MISSING"

echo -e "\n=== Import Checks ==="
grep -q "equifaxRouter" backend/trpc/app-router.ts && echo "✅ equifaxRouter imported" || echo "❌ equifaxRouter NOT imported"
grep -q "EquifaxReportProvider" components/DeferredProviders.tsx && echo "✅ EquifaxReportProvider wrapped" || echo "❌ EquifaxReportProvider NOT wrapped"
```

---

## Common Issues & Solutions

### ❌ Issue 1: "No procedure found on path 'equifax.fetchCreditReport'"

**Cause:** The equifax router is not registered in the tRPC app router

**Solution:**
1. Open: `/Users/solomon/rork823/expo/backend/trpc/app-router.ts`
2. Check line 28 has the import:
   ```typescript
   import { equifaxRouter } from "./routes/equifax";
   ```
3. Check that the appRouter includes:
   ```typescript
   export const appRouter = createTRPCRouter({
     // ... other routers ...
     equifax: equifaxRouter,  // ← Must be here
   });
   ```
4. If missing, add it
5. Restart the app:
   ```bash
   cd /Users/solomon/rork823/expo && npx expo start --reset-cache
   ```

**Verification:**
```bash
grep "equifax:" /Users/solomon/rork823/expo/backend/trpc/app-router.ts
# Should show: equifax: equifaxRouter,
```

---

### ❌ Issue 2: Tabs not visible in CreditAnalysisModal

**Symptoms:** You see "AI Dispute Assistant" header but no tabs below it

**Cause:** Either:
- Old code version (Metro cache)
- CreditAnalysisModal has wrong condition hiding tabs

**Solution:**

1. **Check the file has the correct code:**
   ```bash
   cd /Users/solomon/rork823/expo
   grep -c "Equifax Report" components/MyAgent/CreditAnalysisModal.tsx
   # Should return: 2 or more
   
   grep -c "Upload Report" components/MyAgent/CreditAnalysisModal.tsx
   # Should return: 1 or more
   ```

2. **If counts are wrong, pull latest:**
   ```bash
   git pull origin main
   ```

3. **Clear all caches and restart:**
   ```bash
   killall -9 node 2>/dev/null || true
   killall -9 expo 2>/dev/null || true
   sleep 3
   
   rm -rf node_modules/.cache
   watchman watch-del-all 2>/dev/null || true
   
   npx expo start --reset-cache
   ```

**Verification:**
Once restarted, you should see:
- Top tab: "Equifax Report" (highlighted if active)
- Right tab: "Upload Report"

---

### ❌ Issue 3: Changes not appearing after git pull

**Symptoms:** You run `git pull` but the app still shows old code

**Cause:** Metro bundler cache is serving compiled old version

**Solution:**
```bash
cd /Users/solomon/rork823/expo

# Full nuclear reset
killall -9 node 2>/dev/null || true
sleep 3

# Clear all caches
rm -rf node_modules/.cache
rm -rf .next
rm -rf dist
rm -rf .expo
watchman watch-del-all 2>/dev/null || true

# Force fetch and reset
git fetch origin main
git reset --hard origin/main

# Start with forced rebuild
npx expo start --reset-cache --max-workers=1
```

The `--max-workers=1` flag forces single-threaded compilation, ensuring a complete rebuild.

---

### ❌ Issue 4: "User not authenticated" error when fetching Equifax

**Cause:** userId is null or undefined

**Solution:**
1. Check that you're logged in to the app
2. The user context should provide a userId
3. In browser DevTools Console (F12), check:
   ```javascript
   // In console, the user object should have an id
   // If null, user is not authenticated
   ```

---

### ❌ Issue 5: "No credit data found" when fetching

**Cause:** Equifax connection is not active or API credentials are invalid

**Solution:**
1. Verify Equifax API credentials in `.env`:
   ```bash
   cat /Users/solomon/rork823/expo/.env | grep EQUIFAX
   ```
   Should show:
   - `EQUIFAX_API_KEY=...`
   - `EQUIFAX_API_SECRET=...`
   - `EQUIFAX_API_BASE_URL=...`

2. Verify the user has an active Equifax connection in the backend

3. Test the Equifax connection:
   ```bash
   # Check if the user has been granted Equifax permissions
   # This might require re-authenticating with Equifax
   ```

---

### ❌ Issue 6: Browser says "Localhost refused to connect"

**Cause:** The Expo dev server crashed or isn't running

**Solution:**
```bash
cd /Users/solomon/rork823/expo

# Kill any existing processes
killall -9 node 2>/dev/null || true
sleep 2

# Check if port 8081 is free
lsof -i :8081
# If something is using it, note the PID and kill it:
kill -9 <PID>

# Start fresh
npx expo start --reset-cache
```

---

### ❌ Issue 7: Browser DevTools shows red errors

**How to check:**
1. Open browser at http://localhost:8081
2. Press **F12** to open DevTools
3. Click **Console** tab
4. Look for red error messages

**Common Console Errors:**

**Error:** `Cannot find module '@/contexts/EquifaxReportContext'`
- **Cause:** File not found or wrong path
- **Fix:** Verify file exists at `contexts/EquifaxReportContext.tsx`

**Error:** `TypeError: Cannot read property 'useEquifaxReport' of undefined`
- **Cause:** Component not wrapped in EquifaxReportProvider
- **Fix:** Check `components/DeferredProviders.tsx` includes the provider

**Error:** `ReferenceError: equifaxRouter is not defined`
- **Cause:** equifax router not imported in app-router.ts
- **Fix:** See Issue 1 above

---

## Prevention Checklist

Before starting development, always verify:

- [ ] You're in `/Users/solomon/rork823/expo` directory
- [ ] Git remote points to `rork-western-credit-app-clone-4-823`
- [ ] Latest code pulled: `git pull origin main`
- [ ] equifax router registered in app-router.ts
- [ ] EquifaxReportProvider wraps app in DeferredProviders.tsx
- [ ] No red errors in browser DevTools console
- [ ] App loads at http://localhost:8081 without errors

---

## Getting Help

**If you encounter an error:**
1. Note the exact error message
2. Run the diagnostic command above
3. Check which file or module is missing
4. Verify it's in the correct path under `/Users/solomon/rork823/expo`
5. If it's not there, run:
   ```bash
   git pull origin main
   ```

**If error persists:**
1. Try the full nuclear reset (Issue 3 solution)
2. If still broken, the file might need to be added to GitHub
3. Check commit history: `git log --oneline -5`
4. Verify latest commits include the Equifax feature

---

## Last Updated
September 10, 2026
