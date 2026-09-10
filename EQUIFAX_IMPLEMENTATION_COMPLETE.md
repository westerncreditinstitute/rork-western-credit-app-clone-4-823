# Equifax OneView API Implementation - Complete Guide

## Overview

The Equifax OneView API integration is now fully implemented with OAuth2 authentication, multi-bureau data fetching, and a consumer information form in the frontend.

## What Was Implemented

### 1. Backend OAuth2 Integration (`equifax-client.ts`)

**Features:**
- OAuth2 client credentials flow
- Token caching with expiration handling
- Support for sandbox, UAT, and production environments
- Static access token for sandbox testing
- Proper error handling and logging

**Configuration:**
```typescript
// Environment variables
EQUIFAX_CLIENT_ID=p26PzMCAJN7WOeUqmqE2Fr1AVAzsDpzd
EQUIFAX_CLIENT_SECRET=LNzhev1dqyvLsvHV
EQUIFAX_STATIC_ACCESS_TOKEN=kuK2cWmeZ8lAGpqw55XmSbGjBsUi
EQUIFAX_MEMBER_NUMBER=999XX12345
EQUIFAX_SECURITY_CODE=@U2
EQUIFAX_ENVIRONMENT=sandbox|uat|production
```

**API Endpoints:**
- Sandbox: `https://api.sandbox.equifax.com/business/oneview/consumer-credit/v1`
- UAT: `https://api.uat.equifax.com/business/oneview/consumer-credit/v1`
- Production: `https://api.equifax.com/business/oneview/consumer-credit/v1`

### 2. Request Format (Per Swagger Spec)

The implementation builds requests per the official Equifax OneView API specification:

```json
{
  "consumers": {
    "name": [
      {
        "identifier": "current",
        "firstName": "string",
        "lastName": "string"
      }
    ],
    "socialNum": [
      {
        "identifier": "current",
        "number": "string"  // 9-digit SSN
      }
    ],
    "addresses": [
      {
        "identifier": "current",
        "streetName": "string",
        "city": "string",
        "state": "string",
        "zip": "string"
      }
    ]
  },
  "customerReferenceIdentifier": "rork-{timestamp}",
  "customerConfiguration": {
    "equifaxUSConsumerCreditReport": {
      "pdfComboIndicator": "Y",
      "memberNumber": "999XX12345",
      "securityCode": "@U2",
      "customerCode": "IAPI",
      "multipleReportIndicator": "1"
    }
  }
}
```

### 3. Frontend Consumer Info Form

Added to `CreditAnalysisModal.tsx`:

**Fields:**
- First Name (optional)
- Last Name (optional)
- Social Security Number (optional)
- Street Address (optional)
- City (optional)
- State (optional)
- ZIP Code (optional)

**Validation:**
- At least First Name + Last Name OR SSN required
- State auto-uppercase (max 2 chars)
- SSN masked input
- ZIP number-only input

**Styling:**
- Dark mode compatible
- Responsive layout
- Professional appearance matching app theme
- Loading state during fetch

### 4. Multi-Bureau Data Flow

```
User Enters Consumer Info
         ↓
Clicks "Fetch My Equifax Report"
         ↓
Frontend sends to tRPC mutation
         ↓
Backend gets OAuth token (or uses static token)
         ↓
Backend calls Equifax /reports/credit-report endpoint
         ↓
Equifax returns data for all 3 bureaus:
   - Equifax
   - Experian
   - TransUnion
         ↓
Backend parses response
         ↓
Displays in tabs with negative accounts by bureau
```

## How to Test

### Step 1: Set Environment Variables

Add to your `.env` file:
```bash
EQUIFAX_CLIENT_ID=p26PzMCAJN7WOeUqmqE2Fr1AVAzsDpzd
EQUIFAX_CLIENT_SECRET=LNzhev1dqyvLsvHV
EQUIFAX_STATIC_ACCESS_TOKEN=kuK2cWmeZ8lAGpqw55XmSbGjBsUi
EQUIFAX_MEMBER_NUMBER=999XX12345
EQUIFAX_SECURITY_CODE=@U2
EQUIFAX_ENVIRONMENT=sandbox
```

### Step 2: Restart Backend

```bash
# Kill any running processes
npm run stop

# Start fresh
npm run dev
```

### Step 3: Test in App

1. **Login** to the app
2. **Navigate** to "My Agent" → "Analyze My Report"
3. **Click** "Equifax Report" tab
4. **Enter Consumer Info** (use test data):
   - First Name: John
   - Last Name: Doe
   - SSN: 666-12-3456
   - Address: 123 Main St
   - City: Atlanta
   - State: GA
   - ZIP: 30374

5. **Click** "Fetch My Equifax Report"
6. **Wait** for response (may take 5-10 seconds)
7. **Check Results**:
   - Tabs should show with bureau data
   - Negative accounts should be displayed
   - Error messages if any

### Step 4: Check Logs

**Backend Console:**
```
[Equifax] Initialized with environment: sandbox
[Equifax] Using Client ID: p26PzMCAJN...
[Equifax] Using static access token for sandbox environment
[Equifax] Fetching credit report from: https://api.sandbox.equifax.com/business/oneview/consumer-credit/v1/reports/credit-report
[Equifax] Request consumer: { firstName: 'John', lastName: 'Doe' }
[tRPC] fetchCreditReport called by user: user123 multiBureau: true
[Equifax] Report fetched successfully
```

**Network Tab (in browser DevTools):**
- Request: `POST /api/trpc/equifax.fetchCreditReport`
- Headers: `Authorization: Bearer kuK2cWmeZ8lAGpqw55XmSbGjBsUi`
- Status: 200 OK

## Files Modified

### Backend
- `expo/backend/equifax/equifax-client.ts` - OAuth2 implementation, API calls
- `expo/backend/trpc/routes/equifax.ts` - Updated to accept consumer info

### Frontend
- `expo/components/MyAgent/CreditAnalysisModal.tsx` - Added consumer form, updated mutation call

## API Response Structure

The response is parsed and returned with this structure:

```typescript
{
  success: boolean,
  report: {
    fetchedAt: string,
    bureaus: {
      equifax: {
        bureau: "Equifax",
        fetchedAt: string,
        totalAccounts: number,
        negativeAccountCount: number,
        negativeAccounts: ParsedNegativeAccount[],
        creditScore?: number
      },
      experian: { /* same structure */ },
      transunion: { /* same structure */ }
    },
    combined: {
      totalBureaus: 3,
      totalAccounts: number,
      totalNegativeAccounts: number,
      averageCreditScore?: number
    },
    allNegativeAccounts: ParsedNegativeAccount[]
  },
  negativeAccounts: ParsedNegativeAccount[],
  error: string | null,
  errorType: ErrorType | null
}
```

## Error Handling

### Common Errors

**1. "You must be logged in to access this resource"**
- Cause: User not authenticated with app
- Fix: Log in first

**2. "Failed to authenticate with Equifax API"**
- Cause: Invalid OAuth credentials
- Fix: Check EQUIFAX_CLIENT_ID and EQUIFAX_CLIENT_SECRET

**3. "Equifax API error: 400"**
- Cause: Invalid consumer data (SSN format, address, etc.)
- Fix: Check data format, ensure SSN is 9 digits

**4. "Equifax API error: 401"**
- Cause: Invalid access token
- Fix: Check EQUIFAX_STATIC_ACCESS_TOKEN or OAuth flow

**5. "Equifax API error: 403"**
- Cause: Member number or security code invalid
- Fix: Check EQUIFAX_MEMBER_NUMBER and EQUIFAX_SECURITY_CODE

## Token Caching

Tokens are cached in memory with:
- 5-minute expiration buffer (refresh 5 minutes before actual expiry)
- Automatic refresh on next request if expired
- No database storage (session-only)

```typescript
// Example: Token expires in 3600 seconds
// Will be refreshed if next request is within 5 minutes of expiry
// Prevents "token expired" errors mid-request
```

## Security Considerations

### Credentials Management
- Store all credentials in environment variables
- Never commit `.env` file
- Rotate credentials regularly
- Use different credentials per environment (sandbox/UAT/prod)

### SSN Handling
- SSN masked in UI (dots show, numbers hidden)
- SSN only sent via HTTPS
- SSN not logged
- SSN stored only in memory during request
- SSN not persisted to database

### Data Privacy
- No consumer data stored on servers
- All data used only for fetching reports
- Reports processed and displayed in-app only
- User sees privacy notice before fetching

## Future Enhancements

1. **Per-user Consumer Info Storage** (optional)
   - Remember user's details for faster re-fetch
   - Encrypted storage
   - User can clear anytime

2. **Report Caching**
   - Store multi-bureau reports in cache
   - Reduce API calls
   - User can force refresh

3. **Advanced Parsing**
   - Extract more details from raw response
   - AI analysis of negative accounts
   - Dispute letter generation

4. **Multi-Bureau Fetch**
   - Fetch separately from Experian, TransUnion
   - Combine with Equifax data
   - Compare across bureaus

5. **Historical Tracking**
   - Track reports over time
   - Show improvement/degradation
   - Analytics dashboard

## Troubleshooting

### Issue: Form inputs not appearing
**Solution:** Make sure TextInput is imported in CreditAnalysisModal.tsx

### Issue: Consumer info not sending to backend
**Solution:** Check that consumerInfo state is in dependency array of handleFetchEquifaxReport

### Issue: Static token not working
**Solution:** Verify EQUIFAX_STATIC_ACCESS_TOKEN matches exactly (copy-paste from credentials)

### Issue: Member number or security code rejected
**Solution:** These must match your Equifax account - contact Equifax support if unsure

### Issue: SSN format error
**Solution:** Equifax expects 9 digits without dashes; code strips them automatically

## Support

For issues:
1. Check backend console logs for [Equifax] messages
2. Check network tab for request/response details
3. Verify all environment variables are set
4. Check that Equifax credentials are valid
5. Contact Equifax support for API-level issues

## Code References

**Files:**
- Backend Client: `expo/backend/equifax/equifax-client.ts`
- tRPC Route: `expo/backend/trpc/routes/equifax.ts`
- Frontend Modal: `expo/components/MyAgent/CreditAnalysisModal.tsx`

**Key Methods:**
- `EquifaxClient.getAccessToken()` - OAuth2 token handling
- `EquifaxClient.fetchCreditReport()` - API call
- `EquifaxClient.fetchMultiBureauReport()` - Multi-bureau wrapper
- `handleFetchEquifaxReport()` - Frontend handler

## Next Steps

1. ✅ Deploy to staging environment
2. ✅ Test with real sandbox data
3. ✅ Verify multi-bureau parsing
4. [ ] Set up UAT testing with real credentials
5. [ ] Prepare for production rollout
