# Testing Mode - Quick Start (30 seconds)

## 1️⃣ Enable Testing Mode

Create `.env.local` in the `expo/` directory:

```bash
EXPO_PUBLIC_TESTING_MODE=true
```

## 2️⃣ Restart Dev Server

```bash
npm start
# or
yarn start
```

## 3️⃣ Open Testing Dashboard

Navigate to your Settings screen and add:

```tsx
import TestingDashboard from '@/components/TestingDashboard';
import { useState } from 'react';
import { TouchableOpacity, Text } from 'react-native';

export function SettingsScreen() {
  const [showTesting, setShowTesting] = useState(false);

  return (
    <>
      {process.env.EXPO_PUBLIC_TESTING_MODE === 'true' && (
        <TouchableOpacity onPress={() => setShowTesting(true)}>
          <Text>🧪 Testing Dashboard</Text>
        </TouchableOpacity>
      )}

      {showTesting && (
        <TestingDashboard onClose={() => setShowTesting(false)} />
      )}
    </>
  );
}
```

## 4️⃣ Create Test Data

In Testing Dashboard:
1. Click **➕ Create Test User** → Enter name & email
2. Click **📋 Create Test Dispute** → Select creditor & account
3. View disputes in your app immediately
4. Click **📤 Export All Data** to download test data

## 5️⃣ Verify Data Persistence

- Close app completely
- Reopen app
- Open Testing Dashboard
- All data should still be there ✅

## 6️⃣ Disable When Done

Set in `.env.local`:

```bash
EXPO_PUBLIC_TESTING_MODE=false
```

App will use Supabase again.

---

## Key Files

| File | Purpose |
|------|---------|
| `expo/services/TestingService.ts` | Local data storage |
| `expo/components/TestingDashboard.tsx` | Management UI |
| `expo/contexts/DisputesContext.tsx` | Auto-routing to testing service |

## Console Logs to Watch

When testing mode is enabled, look for:

```
[TestingService] Testing mode ENABLED - data will be stored locally
[TestingService] Created test user: ...
[TestingService] Created test dispute: ...
[TestingService] Updated test dispute: ...
```

## Data Location

All test data stored in AsyncStorage:
- `wci_testing_mode_enabled`
- `wci_test_users`
- `wci_test_disputes`
- `wci_test_conversations`

## What Works in Testing Mode

✅ Create test users  
✅ Create disputes without Supabase  
✅ Update dispute status  
✅ Add timeline entries  
✅ Track AI conversations  
✅ Export all data  
✅ Clear all data for fresh start  

## What's Still Needed

❌ OpenAI API integration (add credits separately)  
❌ Equifax report fetching (mock data only)  
❌ Email notifications (local only)  

---

**Ready to test!** 🚀
