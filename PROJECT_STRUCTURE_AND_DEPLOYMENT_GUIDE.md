# 🎯 PROJECT STRUCTURE & DEPLOYMENT GUIDE

**⚠️ THIS IS THE AUTHORITATIVE REFERENCE FOR THE EQUIFAX MULTI-BUREAU INTEGRATION PROJECT**

---

## 📍 CORRECT PROJECT LOCATIONS

### ✅ PRIMARY DEVELOPMENT REPOSITORY (USE THIS ONE)
- **GitHub Repository:** `https://github.com/westerncreditinstitute/rork-western-credit-app-clone-4-823`
- **Repository Name:** `rork-western-credit-app-clone-4-823`
- **Branch:** `main`
- **Status:** ✅ ACTIVE - All Equifax features pushed here

### ❌ DEPRECATED REPOSITORY (DO NOT USE)
- **GitHub Repository:** `https://github.com/westerncreditinstitute/rork-western-credit-app-clone-4`
- **Repository Name:** `rork-western-credit-app-clone-4`
- **Status:** ❌ OUTDATED - No Rork commits since Jan 2026, do not push to this

---

## 🖥️ LOCAL DEVELOPMENT ENVIRONMENT

### ✅ CORRECT LOCAL PATH (USE THIS ONE)
```
/Users/solomon/rork823/expo
```
- This is a clone of `rork-western-credit-app-clone-4-823`
- Remote: `https://github.com/westerncreditinstitute/rork-western-credit-app-clone-4-823.git`
- Status: ✅ ACTIVE - All development happens here

### ❌ DEPRECATED LOCAL PATH (DO NOT USE)
```
/Users/solomon/Desktop/rork-western-credit-app-clone-4-823/expo
```
- Status: ❌ OUTDATED - Old backup, do not push from here

### Quick Verification
To verify you're in the correct location, run:
```bash
cd /Users/solomon/rork823/expo
git remote -v
# Should show: https://github.com/westerncreditinstitute/rork-western-credit-app-clone-4-823.git
```

---

## 📁 KEY PROJECT FILES & DIRECTORIES

### Equifax Multi-Bureau Integration Files
All these files are in: `/Users/solomon/rork823/expo/`

#### Frontend Components
```
expo/components/MyAgent/
├── CreditAnalysisModal.tsx          ← Main modal with Equifax/Upload tabs
│                                      - Shows "Equifax Report" & "Upload Report" tabs
│                                      - Handles multi-bureau UI display
│                                      - PDF export functionality
└── AgentProfileCard.tsx              ← Shows "Analyze My Credit Report" button in menu
```

#### Backend Routes (tRPC)
```
expo/backend/trpc/
├── routes/
│   ├── equifax.ts                   ← Equifax API endpoints
│   │                                  - fetchCreditReport mutation
│   │                                  - validateConnection query
│   └── ai-agents.ts                 ← AI agent endpoints (extended with Equifax context)
├── app-router.ts                    ← ⚠️ MUST include equifax router registration
```

#### Equifax Logic
```
expo/backend/equifax/
├── equifax-client.ts                ← Multi-bureau API client
│                                      - Handles Equifax OAuth2
│                                      - Fetches Equifax, Experian, TransUnion data
│                                      - Parses credit reports by bureau
```

#### Context & Providers
```
expo/contexts/
├── EquifaxReportContext.tsx         ← State management for multi-bureau reports
│                                      - Stores fetched report data
│                                      - Session-only (not persisted)
└── DeferredProviders.tsx            ← Wraps app with EquifaxReportProvider
```

#### Utilities
```
expo/lib/
├── analytics/
│   └── equifax-analytics.ts         ← Performance monitoring
│                                      - Tracks fetch, parse, inject, letter generation
└── pdf/
    └── equifax-report-pdf.ts        ← HTML-to-PDF generation
                                       - Generates downloadable credit reports
```

---

## 🔄 DEPLOYMENT WORKFLOW

### Step 1: Make Changes Locally
```bash
cd /Users/solomon/rork823/expo

# Make your changes to files...

# Test in browser at http://localhost:8081
```

### Step 2: Commit & Push to GitHub
```bash
# From: /Users/solomon/rork823/expo

git add .
git commit -m "feat: Your feature description"
git pull origin main                 # Always pull first
git push origin main
```

### Step 3: Verify on GitHub
Visit: `https://github.com/westerncreditinstitute/rork-western-credit-app-clone-4-823`
- Check that your commit appears in the commit history
- Verify `main` branch has your changes

### Step 4: Update Local App
If changes are from GitHub or another developer:
```bash
cd /Users/solomon/rork823/expo

git pull origin main
npx expo start --reset-cache
```

---

## ⚠️ CRITICAL CONFIGURATION CHECKLIST

### ✅ Backend tRPC Router Registration
File: `/Users/solomon/rork823/expo/backend/trpc/app-router.ts`

Must include:
```javascript
import { equifaxRouter } from "./routes/equifax";

export const appRouter = createTRPCRouter({
  // ... other routers ...
  equifax: equifaxRouter,    // ← THIS MUST BE PRESENT
});
```

**If missing:** Error "No procedure found on path 'equifax.fetchCreditReport'"

### ✅ Context Provider Wrapping
File: `/Users/solomon/rork823/expo/components/DeferredProviders.tsx`

Must include:
```javascript
import { EquifaxReportProvider } from "@/contexts/EquifaxReportContext";

// Wrap the app with EquifaxReportProvider
<EquifaxReportProvider>
  {/* app content */}
</EquifaxReportProvider>
```

### ✅ Environment Variables
File: `/Users/solomon/rork823/expo/.env` (or `.env.local`)

Required for Equifax API:
```
EQUIFAX_API_KEY=...
EQUIFAX_API_SECRET=...
EQUIFAX_API_BASE_URL=...
```

---

## 🚀 START/RESTART PROCEDURE

### Start Development Server
```bash
cd /Users/solomon/rork823/expo
npx expo start --reset-cache
```

### Access Application
- Web: http://localhost:8081
- Mobile: Scan QR code from Terminal

### Stop Server
- Press `Ctrl+C` in Terminal

### Restart with Full Cache Clear
```bash
cd /Users/solomon/rork823/expo

# Kill all processes
killall -9 node
killall -9 expo

# Wait 3 seconds
sleep 3

# Clear caches
rm -rf node_modules/.cache
watchman watch-del-all 2>/dev/null || true

# Start fresh
npx expo start --reset-cache
```

---

## 📊 USER FLOW FOR EQUIFAX FEATURES

1. **User clicks:** "Analyze My Credit Report" (in Overview tab menu)
2. **Modal opens:** CreditAnalysisModal.tsx
3. **Modal shows:** Two tabs at top
   - "Equifax Report" (for fetching multi-bureau data)
   - "Upload Report" (for manual PDF upload)
4. **User clicks:** "Fetch My Equifax Report" button (in Equifax tab)
5. **System calls:** `trpc.equifax.fetchCreditReport` mutation
6. **Backend fetches:** Multi-bureau data from Equifax API
7. **UI displays:** 
   - Negative accounts separated by bureau (Equifax, Experian, TransUnion)
   - Account counts per bureau
   - PDF export button

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue: "No procedure found on path 'equifax.fetchCreditReport'"
**Cause:** equifax router not registered in app-router.ts
**Solution:** 
1. Open `/Users/solomon/rork823/expo/backend/trpc/app-router.ts`
2. Add import: `import { equifaxRouter } from "./routes/equifax";`
3. Add to appRouter: `equifax: equifaxRouter,`
4. Restart app: `npx expo start --reset-cache`

### Issue: Tabs not showing in CreditAnalysisModal
**Cause:** Metro cache serving old code
**Solution:**
```bash
cd /Users/solomon/rork823/expo
killall -9 node
sleep 3
npx expo start --reset-cache
```

### Issue: Changes not appearing after git pull
**Cause:** Metro bundler cache
**Solution:**
```bash
cd /Users/solomon/rork823/expo
git pull origin main
npx expo start --reset-cache --max-workers=1
```

---

## 📋 VERSION HISTORY

| Date | Commit | Description | Status |
|------|--------|-------------|--------|
| Sep 10, 2026 | 51083bb | Fix: Make Equifax/Upload tabs always visible | ✅ Deployed |
| Sep 10, 2026 | ed9d4de | Fix: Register equifax router in tRPC | ✅ Deployed |
| Sep 10, 2026 | 6a0db89 | feat: Multi-bureau integration with analytics and PDF export | ✅ Deployed |

---

## 📞 CONTACTS & REFERENCES

- **Repository Owner:** Rork (Western Credit Institute)
- **Primary Branch:** `main` in `rork-western-credit-app-clone-4-823`
- **Development Path:** `/Users/solomon/rork823/expo`

---

**Last Updated:** September 10, 2026
**Status:** ✅ ACTIVE - All systems operational
