# Testing Mode - Visual Walkthrough

## 🎯 What You'll See

### Step 1: Enable Testing Mode

**File: `.env.local`**
```
EXPO_PUBLIC_TESTING_MODE=true
```

**Console Output:**
```
✓ [TestingService] Testing mode ENABLED - data will be stored locally
```

---

## Step 2: Access Testing Dashboard

### Location A: Settings Screen
```
┌─────────────────────────────────┐
│        Settings                 │
├─────────────────────────────────┤
│ Notifications                 → │
│ Security                      → │
│ 🧪 Testing Dashboard          → │  ← Click here
│ About                         → │
└─────────────────────────────────┘
```

### Location B: Dedicated Screen
```
Navigate to: /testing
```

---

## Step 3: Testing Dashboard Overview

```
╔═════════════════════════════════════════════════════════════╗
║                    🧪 Testing Dashboard                     ║
║           Testing mode ENABLED - Data saved locally         ║
╠═════════════════════════════════════════════════════════════╣
║                                                             ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     ║
║  │ Test Users   │  │   Disputes   │  │     Sent     │     ║
║  │      0       │  │      0       │  │      0       │     ║
║  └──────────────┘  └──────────────┘  └──────────────┘     ║
║                                                             ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     ║
║  │ In Progress  │  │  Resolved    │  │  Rejected    │     ║
║  │      0       │  │      0       │  │      0       │     ║
║  └──────────────┘  └──────────────┘  └──────────────┘     ║
║                                                             ║
║  ┌─────────────────────────────────────────────────────┐   ║
║  │  ➕ Create Test User                                │   ║
║  └─────────────────────────────────────────────────────┘   ║
║                                                             ║
║  ┌─────────────────────────────────────────────────────┐   ║
║  │  📋 Create Test Dispute                             │   ║
║  └─────────────────────────────────────────────────────┘   ║
║                                                             ║
║  ┌─────────────────────────────────────────────────────┐   ║
║  │  📤 Export All Data                                 │   ║
║  └─────────────────────────────────────────────────────┘   ║
║                                                             ║
║  ┌─────────────────────────────────────────────────────┐   ║
║  │  🗑️ Clear All Data                                 │   ║
║  └─────────────────────────────────────────────────────┘   ║
║                                                             ║
╚═════════════════════════════════════════════════════════════╝
```

---

## Step 4: Create Test User

### Click "➕ Create Test User"

```
╔═════════════════════════════════════════════════════════════╗
║                   Create Test User Modal                    ║
╠═════════════════════════════════════════════════════════════╣
║                                                             ║
║  Full Name                                                  ║
║  ┌─────────────────────────────────────────────────────┐   ║
║  │ John Doe                                            │   ║
║  └─────────────────────────────────────────────────────┘   ║
║                                                             ║
║  Email Address                                              ║
║  ┌─────────────────────────────────────────────────────┐   ║
║  │ john@example.com                                    │   ║
║  └─────────────────────────────────────────────────────┘   ║
║                                                             ║
║  Phone (optional)                                           ║
║  ┌─────────────────────────────────────────────────────┐   ║
║  │ (555) 123-4567                                      │   ║
║  └─────────────────────────────────────────────────────┘   ║
║                                                             ║
║  ┌─────────────────────────────────────────────────────┐   ║
║  │         Create User                                │   ║
║  └─────────────────────────────────────────────────────┘   ║
║                                                             ║
║  ┌─────────────────────────────────────────────────────┐   ║
║  │         Cancel                                      │   ║
║  └─────────────────────────────────────────────────────┘   ║
║                                                             ║
╚═════════════════════════════════════════════════════════════╝
```

### Success Alert

```
┌─────────────────────────────────────┐
│              Success                │
├─────────────────────────────────────┤
│ Test user created: John Doe         │
│ ID: test_user_1694425556890         │
└─────────────────────────────────────┘
         [OK]
```

### Dashboard Updates

```
Stats now show:
  ┌──────────────┐
  │ Test Users   │
  │      1       │  ← Changed from 0
  └──────────────┘
```

---

## Step 5: Create Test Dispute

### Click "📋 Create Test Dispute"

```
╔═════════════════════════════════════════════════════════════╗
║                 Create Test Dispute Modal                   ║
╠═════════════════════════════════════════════════════════════╣
║                                                             ║
║  Creditor Name                                              ║
║  ┌─────────────────────────────────────────────────────┐   ║
║  │ Capital One                                         │   ║
║  └─────────────────────────────────────────────────────┘   ║
║                                                             ║
║  Account Number                                             ║
║  ┌─────────────────────────────────────────────────────┐   ║
║  │ ****1234                                            │   ║
║  └─────────────────────────────────────────────────────┘   ║
║                                                             ║
║  Dispute Type: late_payment  ▼                              ║
║                                                             ║
║  ┌─────────────────────────────────────────────────────┐   ║
║  │         Create Dispute                              │   ║
║  └─────────────────────────────────────────────────────┘   ║
║                                                             ║
╚═════════════════════════════════════════════════════════════╝
```

### Success Alert

```
┌──────────────────────────────────────────────────┐
│                   Success                        │
├──────────────────────────────────────────────────┤
│ Test dispute created!                            │
│                                                  │
│ Creditor: Capital One                            │
│ Account: ****1234                                │
│ Status: sent                                     │
│ Response By: 2024-10-11                          │
└──────────────────────────────────────────────────┘
            [OK]
```

### Dashboard Updates

```
Stats now show:
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │   Disputes   │  │     Sent     │  │  In Progress │
  │      1       │  │      1       │  │      0       │
  └──────────────┘  └──────────────┘  └──────────────┘

Current Disputes List:
  📊 Current Disputes (1)
  
  ┌─────────────────────────────────────────────┐
  │ Capital One                                 │
  │ Account: ****1234                           │
  │ Type: late_payment   Status: [sent]         │
  │ Response by: 2024-10-11                     │
  └─────────────────────────────────────────────┘
```

---

## Step 6: View in Main App

### Disputes Screen Shows Created Dispute

```
┌─────────────────────────────────────┐
│      Dispute Tracker                │
├─────────────────────────────────────┤
│                                     │
│ Active Disputes: 1                  │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Capital One                     │ │
│ │ Account: ****1234               │ │
│ │ Sent: 2024-09-11                │ │
│ │ Response: 2024-10-11            │ │
│ │ Status: [SENT]                  │ │
│ │                                 │ │
│ │ [View Details] [Add Note]       │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

---

## Step 7: Verify Persistence

### Close App Completely

```
Your iPhone
┌─────────────────────────────────────┐
│                                     │
│           [Rork app is closed]      │
│                                     │
└─────────────────────────────────────┘
```

### Reopen App

```
Splash Screen appears...
    Loading...

┌─────────────────────────────────────┐
│                                     │
│  Console: [TestingService] Testing  │
│  mode ENABLED - data will be        │
│  stored locally                     │
│                                     │
│  ✅ Dispute data still there!       │
│                                     │
└─────────────────────────────────────┘
```

### Check Testing Dashboard

```
Stats show:
  ┌──────────────┐  ┌──────────────┐
  │ Test Users   │  │   Disputes   │
  │      1       │  │      1       │
  └──────────────┘  └──────────────┘

Current Disputes List:
  Capital One  Account: ****1234  Status: [sent]

✅ Data persisted after app restart!
```

---

## Step 8: Export Data

### Click "📤 Export All Data"

```
Success Alert:

┌──────────────────────────────────────────┐
│              Data Exported               │
├──────────────────────────────────────────┤
│ 1 users, 1 disputes exported.            │
│                                          │
│ Check console for full JSON data.        │
└──────────────────────────────────────────┘
         [OK]
```

### Console Shows

```
[TESTING DATA EXPORT] {
  "exportedAt": "2024-09-11T12:34:56.000Z",
  "users": [
    {
      "id": "test_user_1234567890",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "(555) 123-4567",
      "createdAt": "2024-09-11T12:30:00.000Z"
    }
  ],
  "disputes": [
    {
      "id": "test_dispute_5678901234",
      "userId": "test_user_1234567890",
      "creditor": "Capital One",
      "accountNumber": "****1234",
      "disputeType": "late_payment",
      "dateSent": "2024-09-11",
      "responseBy": "2024-10-11",
      "status": "sent",
      "timeline": [],
      "documents": [],
      "createdAt": "2024-09-11T12:32:00.000Z",
      "updatedAt": "2024-09-11T12:32:00.000Z"
    }
  ],
  "conversations": []
}
```

---

## Step 9: Clear Data (Reset for Fresh Test)

### Click "🗑️ Clear All Data"

```
Confirmation Dialog:

┌──────────────────────────────────────────┐
│  Clear All Testing Data?                 │
├──────────────────────────────────────────┤
│ This will delete all test users,         │
│ disputes, and conversations.             │
│ This cannot be undone.                   │
└──────────────────────────────────────────┘
  [Cancel]  [Clear All]
```

### After Clicking "Clear All"

```
Success Alert:

┌──────────────────────────────────────────┐
│             Success                      │
├──────────────────────────────────────────┤
│ All testing data cleared                 │
└──────────────────────────────────────────┘
         [OK]

Dashboard resets:
  ┌──────────────┐  ┌──────────────┐
  │ Test Users   │  │   Disputes   │
  │      0       │  │      0       │
  └──────────────┘  └──────────────┘
```

---

## Step 10: Disable Testing Mode (Go Production)

### Update `.env.local`

```
EXPO_PUBLIC_TESTING_MODE=false
```

### Restart Dev Server

```
Console shows:
  [TestingService] Testing mode DISABLED - using production flow
```

### Behavior Changes

```
Before (Testing):
  Create Dispute → TestingService → AsyncStorage ✅

After (Production):
  Create Dispute → tRPC → Supabase API → Database ✅
```

---

## Common Scenarios

### Scenario 1: Testing Dispute Updates

```
1. Create user "Jane Smith"
2. Create dispute for "Equifax"
3. In main app, open dispute
4. Add note: "Called creditor, confirmed debt"
5. Update status to "in-progress"
6. Return to Testing Dashboard
7. Click "Export All Data"
8. JSON shows timeline entry and status update ✅
```

### Scenario 2: Testing Multiple Users

```
1. Create 5 test users (Jane, John, Alex, etc.)
2. For each user, create 2-3 disputes
3. Update some to "resolved", some to "in-progress"
4. View Testing Dashboard stats:
   - Total Users: 5
   - Total Disputes: 13
   - Resolved: 3
   - In Progress: 7
   - Sent: 3
5. Export full data tree for analysis ✅
```

### Scenario 3: Testing Persistence After Crash

```
1. Create test user and dispute
2. Force close app (Settings → Apps → Rork → Force Stop)
3. Reopen app
4. Check Testing Dashboard
5. All data still there ✅ (Proves persistence works)
```

---

## What to Watch For

### ✅ Good Signs
- Console shows `[TestingService] Testing mode ENABLED`
- Stats update immediately when you create users/disputes
- Disputes appear in main app dispute list
- Data persists after app restart
- Export shows all your created data

### ⚠️ Problems to Check
- No `[TestingService]` logs → Env variable not set or not restarted
- Stats stay at 0 → Data not being created
- Dispute doesn't appear → Check DisputesContext hooks
- Data lost on restart → Storage permissions issue

---

## Next Steps After Testing

1. **Export your test data** (keep the JSON)
2. **Create migration script** to Supabase (using JSON)
3. **Set `EXPO_PUBLIC_TESTING_MODE=false`** in env
4. **Run migration** to sync test data to production DB
5. **Deploy app** with production mode enabled

---

**Ready to test!** 🚀 Follow these steps and you'll have a complete testing environment working locally!
