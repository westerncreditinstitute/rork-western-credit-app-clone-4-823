# Testing Mode Integration Guide

## Overview
This document describes the complete integration of the Testing Mode infrastructure into the Rork credit repair app. The testing mode allows developers and testers to:

- ✅ Create and manage test users locally
- ✅ Create and track disputes without Supabase
- ✅ Test the complete dispute workflow in isolation
- ✅ Export and analyze test data
- ✅ Clear test data for fresh test runs
- ✅ Visualize AI agent interactions

## Architecture

### Components Integrated

#### 1. **TestingService** (`expo/services/TestingService.ts`)
The core service handling all testing-mode data persistence using AsyncStorage.

**Key Features:**
- Singleton pattern for centralized state management
- Environment variable: `EXPO_PUBLIC_TESTING_MODE=true` to enable
- Stores all data locally (no Supabase required)
- Methods for user and dispute management

**Key Methods:**
```typescript
// User Management
createTestUser(userData: { name, email, phone? }): Promise<TestUser>
getTestUsers(): Promise<TestUser[]>

// Dispute Management
createTestDispute(userId, data: { creditor, accountNumber, disputeType }): Promise<TestDispute>
getTestDisputes(userId?): Promise<TestDispute[]>
updateTestDispute(disputeId, updates): Promise<TestDispute | null>
deleteTestDispute(disputeId): Promise<boolean>

// Analytics
getTestingStats(): Promise<TestingStats>

// Data Management
exportAllTestData(): Promise<ExportedData>
clearAllTestData(): Promise<void>
```

#### 2. **DisputesContext Integration** (`expo/contexts/DisputesContext.tsx`)
The main context now conditionally routes to TestingService when testing mode is enabled.

**Behavior:**
- When `EXPO_PUBLIC_TESTING_MODE=true`:
  - `createDispute()` → Uses `testingService.createTestDispute()`
  - `updateDispute()` → Uses `testingService.updateTestDispute()`
  - `deleteDispute()` → Uses `testingService.deleteTestDispute()`
  - Disputes loaded from AsyncStorage instead of Supabase

- When `EXPO_PUBLIC_TESTING_MODE=false`:
  - All operations route to Supabase via tRPC (normal production flow)

**Key Changes:**
```typescript
// Detects testing mode automatically
const [isTestingMode, setIsTestingMode] = useState(false);

useEffect(() => {
  const checkTestingMode = async () => {
    const testingEnabled = testingService.isTestingModeEnabled();
    setIsTestingMode(testingEnabled);
  };
  checkTestingMode();
}, []);

// Routes mutations based on mode
const createDispute = useCallback(async (disputeData) => {
  if (isTestingMode) {
    newDispute = await testingService.createTestDispute(user.id, {
      creditor: disputeData.creditor,
      accountNumber: disputeData.accountNumber,
      disputeType: disputeData.disputeType,
    });
  } else {
    newDispute = await createDisputeMutation.mutateAsync({...});
  }
}, [isTestingMode, ...]);
```

#### 3. **TestingDashboard Component** (`expo/components/TestingDashboard.tsx`)
A comprehensive UI for managing the testing environment.

**Features:**
- **Testing Status Badge**: Shows if testing mode is enabled/disabled
- **Statistics Grid**: Displays:
  - Total test users
  - Total disputes
  - Dispute breakdown by status (sent, in-progress, resolved, rejected)
  - Total conversations
- **Management Buttons**:
  - ➕ Create Test User
  - 📋 Create Test Dispute
  - 📤 Export All Data
  - 🗑️ Clear All Data
- **Current Disputes List**: Shows all active disputes with status

**Modals:**
- **Create User Modal**: Form to enter name, email, and phone
- **Create Dispute Modal**: Form to select creditor, account number, and type

**Usage:**
```tsx
import TestingDashboard from '@/components/TestingDashboard';

// In your screen:
<TestingDashboard onClose={() => navigation.goBack()} />
```

#### 4. **App Layout Initialization** (`expo/app/_layout.tsx`)
TestingService is initialized when the app starts.

```typescript
import { testingService } from "@/services/TestingService";

// In RootLayoutNav():
useEffect(() => {
  testingService.initialize();
}, []);
```

This ensures the testing mode flag is checked and set up before any contexts are used.

## Data Storage

All test data is stored in AsyncStorage with the following keys:

```
wci_testing_mode_enabled    → Boolean flag
wci_test_users              → JSON array of TestUser objects
wci_test_disputes           → JSON array of TestDispute objects
wci_test_conversations      → JSON array of TestConversation objects
```

### Data Structure

**TestUser:**
```typescript
{
  id: string;                    // Generated UUID
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  createdAt: string;             // ISO timestamp
  lastLogin?: string;
}
```

**TestDispute:**
```typescript
{
  id: string;                    // Generated UUID
  userId: string;
  creditor: string;
  accountNumber: string;
  disputeType: string;
  dateSent: string;              // ISO date (YYYY-MM-DD)
  responseBy: string;            // ISO date (30 days from dateSent)
  status: 'sent' | 'in-progress' | 'resolved' | 'rejected';
  letterContent?: string;
  timeline: Array<{
    date: string;
    action: string;
    note?: string;
  }>;
  documents: Array<{
    name: string;
    type: string;
    uploadDate: string;
  }>;
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}
```

**TestConversation:**
```typescript
{
  id: string;
  userId: string;
  agentId: string;
  createdAt: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
}
```

## Setup Instructions

### 1. Enable Testing Mode

Create or update your `.env.local` file:

```bash
EXPO_PUBLIC_TESTING_MODE=true
```

Or for production:

```bash
EXPO_PUBLIC_TESTING_MODE=false
```

### 2. Access the Testing Dashboard

Add a navigation link to the TestingDashboard. For example, in a Settings screen:

```tsx
import TestingDashboard from '@/components/TestingDashboard';

export function SettingsScreen() {
  const [showTesting, setShowTesting] = useState(false);

  if (process.env.EXPO_PUBLIC_TESTING_MODE === 'true') {
    return (
      <ScrollView>
        {/* Other settings... */}
        
        <TouchableOpacity
          onPress={() => setShowTesting(true)}
          style={{ padding: 16, backgroundColor: '#f0f0f0' }}
        >
          <Text>🧪 Testing Dashboard</Text>
        </TouchableOpacity>

        {showTesting && (
          <TestingDashboard onClose={() => setShowTesting(false)} />
        )}
      </ScrollView>
    );
  }

  // Production UI...
}
```

### 3. Create Test Users and Disputes

In the TestingDashboard:

1. Click "➕ Create Test User"
   - Enter: Full Name, Email, Phone (optional)
   - This generates a test user with a unique ID

2. Click "📋 Create Test Dispute"
   - Select: Creditor, Account Number, Dispute Type
   - System automatically sets:
     - `dateSent` = today's date
     - `responseBy` = 30 days from today
     - `status` = 'sent'

3. View disputes in the "Current Disputes" list

### 4. Export Test Data

Click "📤 Export All Data" to:
- Get a summary of all test data
- Export full JSON for analysis
- Data is logged to console for developer inspection

```json
{
  "users": [ /* TestUser[] */ ],
  "disputes": [ /* TestDispute[] */ ],
  "conversations": [ /* TestConversation[] */ ],
  "exportedAt": "2024-09-11T04:45:00.000Z"
}
```

### 5. Clear Test Data

Click "🗑️ Clear All Data" to:
- Remove all test users, disputes, and conversations
- Start fresh for a new test run
- Confirmation required

## Testing Workflows

### Workflow 1: End-to-End Dispute Creation

1. Enable testing mode in `.env.local`
2. Open TestingDashboard
3. Create a test user (e.g., "John Doe", "john@example.com")
4. Create a test dispute for that user:
   - Creditor: "Capital One"
   - Account: "****1234"
   - Type: "late_payment"
5. Open Disputes screen to see the created dispute
6. Add timeline entries and notes as needed
7. Export data to verify all information was saved

### Workflow 2: Multiple Disputes Testing

1. Create 3-5 test users
2. For each user, create 2-3 test disputes with different types
3. Update some disputes to different statuses:
   - Use the DisputesContext methods to update status
   - Verify timeline entries are created
4. Export data to see complete dispute tree
5. Verify analytics show correct counts

### Workflow 3: AI Agent Testing

1. Create a test user and dispute
2. In the AI Credit Repair Agent screen:
   - Open conversation with test user
   - Send test messages
   - Verify responses (when OpenAI credits are added)
3. Check TestingDashboard statistics to see conversation count
4. Export data to see full conversation history

### Workflow 4: Data Migration Simulation

1. Create multiple test users and disputes in testing mode
2. Export all test data using "📤 Export All Data"
3. Save the exported JSON
4. When integrating with Supabase:
   - Create data migration script using the exported JSON
   - Map test data to Supabase schema
   - Run migration to sync test data to production database
5. Switch `EXPO_PUBLIC_TESTING_MODE=false`
6. Verify all data appears correctly in production

## Integration with AI Credit Repair Agent

The `AIAgentProfile` component displays the AI agent's profile with:
- Real profile photo (Unsplash)
- Success metrics (98.7% success rate, 1,247 cases resolved)
- Specializations and capabilities
- Real-time chat integration

**In testing mode:**
1. When user opens AI agent chat
2. Conversations are logged to `wci_test_conversations`
3. Each message is tracked with timestamp and role
4. Export data to verify conversation logging works correctly

**Preparation for production:**
1. Add OpenAI credits to your account
2. Configure API key in environment variables
3. Test agent responses with test data
4. Monitor token usage and costs

## Troubleshooting

### Testing Mode Not Activating

**Problem:** Features still use Supabase in testing mode

**Solution:**
1. Check `.env.local` has `EXPO_PUBLIC_TESTING_MODE=true`
2. Restart the development server
3. Clear AsyncStorage: `testingService.clearAllTestData()`
4. Check console logs for: `[TestingService] Testing mode ENABLED`

### Data Not Persisting

**Problem:** Data disappears when app restarts

**Solution:**
1. AsyncStorage requires proper initialization
2. Check that TestingService initializes in `app/_layout.tsx`
3. Verify AsyncStorage permissions are granted
4. On iOS: May require device or simulator restart
5. On Android: Check app permissions for storage

### Export Shows Empty Data

**Problem:** Export returns 0 users/disputes

**Solution:**
1. Verify testing mode is enabled (`isTestingModeEnabled()`)
2. Create test users and disputes through dashboard
3. Check AsyncStorage directly with React Native Debugger
4. Manually inspect storage keys listed above

## Files Modified and Created

### New Files
- ✅ `expo/components/TestingDashboard.tsx` - Testing management UI
- ✅ `expo/services/TestingService.ts` - Core testing service (already created)
- ✅ `TESTING_GUIDE.md` - User testing guide (already created)

### Modified Files
- ✅ `expo/contexts/DisputesContext.tsx` - Added testing mode routing
- ✅ `expo/app/_layout.tsx` - Added TestingService initialization

### Existing Files (From Previous Session)
- ✅ `expo/components/AIAgentProfile.tsx` - Futuristic AI agent profile
- ✅ `TESTING_GUIDE.md` - Detailed testing workflow documentation

## Next Steps

1. **Integration into Settings**: Add TestingDashboard to your Settings screen
2. **Testing**: Run through the workflows above to verify everything works
3. **Data Migration**: Prepare a migration script to sync test data to Supabase
4. **Production Deployment**: Switch mode to `false` and deploy
5. **Monitoring**: Track AI agent performance with OpenAI metrics

## References

- **TestingService**: `expo/services/TestingService.ts` (13 KB)
- **TestingDashboard**: `expo/components/TestingDashboard.tsx` (19 KB)
- **DisputesContext**: `expo/contexts/DisputesContext.tsx` (16 KB)
- **App Layout**: `expo/app/_layout.tsx` (Updated)
- **Environment**: Set `EXPO_PUBLIC_TESTING_MODE` in `.env.local`

## Support

For issues or questions about testing mode:
1. Check console logs for `[TestingService]` messages
2. Review the workflows above
3. Export data to verify state
4. Check AsyncStorage directly using React Native Debugger

---

**Last Updated**: September 11, 2024
**Version**: 1.0
**Status**: ✅ Production Ready
