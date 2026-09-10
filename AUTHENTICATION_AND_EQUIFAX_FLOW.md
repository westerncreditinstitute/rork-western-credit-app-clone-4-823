# Authentication and Equifax Fetch Flow Documentation

## Overview

This document explains how authentication flows through the application and how it enables the Equifax report fetch functionality.

## Authentication Architecture

### 1. AuthContext (Frontend)
**Location**: `expo/contexts/AuthContext.tsx`

The AuthContext manages user authentication state and persists it to AsyncStorage.

```
Login Flow:
1. User enters credentials (email/password)
2. AuthContext calls `trpcClient.users.login.mutate()`
3. If successful, user data is stored in AsyncStorage with key `wci_auth_user`
4. AsyncStorage stores: { id, email, name, phone, avatar, role, createdAt, ... }

Storage:
- Key: "wci_auth_user"
- Value: Base64-encoded JSON with user details
```

### 2. UserContext (Frontend)
**Location**: `expo/contexts/UserContext.tsx`

The UserContext syncs with AuthContext and provides user data throughout the app via `useUser()` hook.

```
Sync Flow:
1. UserContext watches AuthContext for authentication changes
2. When user is authenticated, UserContext syncs the user data
3. Provides useUser() hook that returns { user, isLoading, createUser, updateUser, logout }
```

### 3. tRPC Client Configuration (Frontend)
**Location**: `expo/lib/trpc.ts`

The tRPC client automatically adds authentication headers to all requests.

```
Header Generation:
1. Before each tRPC request, getAuthHeaders() is called
2. getAuthHeaders() reads "wci_auth_user" from AsyncStorage
3. If found, creates Authorization header:
   Authorization: Bearer <base64-encoded-json>
   
   Example:
   {
     "id": "user123",
     "email": "user@example.com"
   }
   becomes: "Bearer ZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKU1V6STFObWswSWn..."
```

### 4. tRPC Backend Middleware
**Location**: `expo/backend/trpc/create-context.ts`

The backend validates the Authorization header and extracts user information.

```
Validation Flow:
1. Backend receives request with Authorization header
2. Extracts and decodes the bearer token
3. Validates user exists in database
4. Passes authenticated user to context (ctx.user)

Error Handling:
- If no Authorization header: ctx.user = null
- If invalid token: ctx.user = null
- If user not in DB: ctx.user = null

protectedProcedure Middleware:
- Checks if ctx.user exists
- If not, throws TRPCError: "You must be logged in to access this resource"
```

## Equifax Fetch Flow

### Complete Request Flow

```
USER INITIATES FETCH
       ↓
CreditAnalysisModal.handleFetchEquifaxReport()
       ↓
Check userId exists (from useUser() hook)
  - If null → Show error: "You must be logged in to fetch..."
  - If exists → Continue
       ↓
fetchEquifaxMutation.mutateAsync({ multiBureau: true })
       ↓
tRPC httpLink adds headers (from getAuthHeaders)
  - Reads "wci_auth_user" from AsyncStorage
  - Creates Authorization: Bearer <token>
       ↓
Backend Route: trpc.equifax.fetchCreditReport (protectedProcedure)
       ↓
isAuthenticated Middleware:
  - Decodes bearer token
  - Extracts user data
  - Validates user in database
  - Sets ctx.user
  - If fails → Throws "You must be logged in to access this resource"
       ↓
equifax.ts Mutation Handler:
  - ctx.user guaranteed to exist (protectedProcedure enforces this)
  - userId = ctx.user.id
  - Calls equifaxClient.fetchMultiBureauReport(consumerInfo, userId)
       ↓
getEquifaxClient().fetchMultiBureauReport()
  - Fetches data from Equifax API
  - Parses reports for all three bureaus (Equifax, Experian, TransUnion)
  - Returns ParsedCreditReport with negative accounts by bureau
       ↓
Frontend receives result
  - Checks result.success
  - Updates EquifaxReportContext
  - Displays tabs with multi-bureau data
```

## The Authentication Error: "You must be logged in to access this resource"

### Root Causes

1. **No AsyncStorage Data**: The `wci_auth_user` key is not set in AsyncStorage
   - User may not have logged in
   - Browser/device storage was cleared
   - Different device/browser session

2. **Invalid/Expired Token**: The stored token is malformed or invalid
   - Storage was corrupted
   - Token was manually edited

3. **Network Error During Login**: Login attempt failed silently
   - Backend unreachable
   - Credentials incorrect
   - Database query failed

### Debugging Steps

1. **Check Frontend Authentication State**
   ```javascript
   // In browser console or app debugger:
   await AsyncStorage.getItem('wci_auth_user')
   // Should return: {"id":"...", "email":"...", ...}
   // If null/undefined → User not logged in
   ```

2. **Verify tRPC Header Generation**
   ```javascript
   // Monitor network requests to /api/trpc/equifax.fetchCreditReport
   // Look for Authorization header in request
   // Format: Authorization: Bearer <token>
   ```

3. **Check Backend Context**
   ```javascript
   // Check server logs for:
   // "[Context] Authenticated user: ..." OR
   // "[Context] Failed to parse auth header: ..."
   ```

## Session-Only Storage Pattern

**Important**: User authentication is stored only in AsyncStorage, NOT persisted to database.

```
Session Lifecycle:
1. User logs in → Stored in AsyncStorage
2. User closes app → AsyncStorage persists (survive app close)
3. Device reboots → AsyncStorage persists (survive reboot)
4. Browser storage cleared → AsyncStorage DELETED (login required again)
5. User logs out → AsyncStorage DELETED

Implications:
- Each device/browser maintains its own session
- No "remember me across browsers" functionality
- More secure (no long-lived tokens)
- Less convenient (requires re-login per device)
```

## Code References

### Files Involved in Auth Flow

1. **Frontend Authentication**
   - `expo/contexts/AuthContext.tsx` - Authentication state management
   - `expo/contexts/UserContext.tsx` - User data synchronization
   - `expo/lib/trpc.ts` - tRPC client with auth header injection
   - `expo/components/MyAgent/CreditAnalysisModal.tsx` - Equifax fetch UI

2. **Backend Authentication**
   - `expo/backend/trpc/create-context.ts` - Context creation and auth validation
   - `expo/backend/trpc/routes/equifax.ts` - Protected Equifax routes
   - `expo/backend/equifax/equifax-client.ts` - Multi-bureau API client

### Key Constants

| Constant | Location | Value | Purpose |
|----------|----------|-------|---------|
| `AUTH_STORAGE_KEY` | `AuthContext.tsx`, `trpc.ts` | `"wci_auth_user"` | AsyncStorage key for user data |
| `USER_STORAGE_KEY` | `UserContext.tsx` | `"wci_user_id"` | AsyncStorage key for user ID |
| `protectedProcedure` | `create-context.ts` | `t.procedure.use(isAuthenticated)` | tRPC procedure requiring auth |

## Testing Authentication

### Test Case 1: Successful Authentication Flow
```
1. Clear AsyncStorage: await AsyncStorage.removeItem('wci_auth_user')
2. Navigate to login page
3. Enter test credentials (test@example.com / password123)
4. Verify:
   - AsyncStorage now contains user data
   - useUser() hook returns user object
   - Network requests include Authorization header
5. Navigate to Equifax fetch
6. Click "Fetch My Equifax Report"
7. Verify: Report fetches successfully
```

### Test Case 2: Authentication Missing
```
1. Clear AsyncStorage: await AsyncStorage.removeItem('wci_auth_user')
2. Navigate to Equifax fetch without logging in
3. Click "Fetch My Equifax Report"
4. Verify: Error message "You must be logged in to fetch your Equifax report..."
```

### Test Case 3: Stale/Invalid Token
```
1. Log in successfully
2. Manually corrupt AsyncStorage: 
   await AsyncStorage.setItem('wci_auth_user', 'invalid-data')
3. Click "Fetch My Equifax Report"
4. Verify: Error message about invalid/missing authentication
```

## Future Enhancements

1. **Persistent Sessions**
   - Implement refresh tokens
   - Add session expiration handling
   - Support "remember me" functionality

2. **Better Error Messages**
   - Distinguish between network errors and auth errors
   - Provide clear instructions for re-authentication
   - Add retry logic for transient failures

3. **Enhanced Analytics**
   - Track authentication failures
   - Monitor session duration
   - Log auth error patterns

4. **Multi-Device Support**
   - Share sessions across devices
   - Implement device authorization
   - Add "log out everywhere" feature

## Summary

The authentication flow ensures that only logged-in users can access the Equifax fetch functionality. The `protectedProcedure` middleware validates the Authorization header, which is automatically generated from AsyncStorage during every tRPC request. If the user is not authenticated, AsyncStorage will be empty, no Authorization header will be sent, and the backend will reject the request with "You must be logged in to access this resource". Users must log in first (which stores their data in AsyncStorage) before they can fetch their Equifax report.
