# Rork Testing Guide

## Overview
This guide covers:
1. **Testing Mode** - Local data persistence for testing workflows without Supabase
2. **User Registration** - Test account creation and management
3. **Dispute Workflow** - Track disputes from creation through resolution
4. **AI Agent Testing** - Test the Credit Repair Agent with demo responses
5. **Profile Enhancement** - Realistic AI agent profiles with futuristic design

## Quick Start

### 1. Enable Testing Mode
Set environment variable:
```bash
EXPO_PUBLIC_TESTING_MODE=true
```

### 2. Register a Test User
- Open the app and go to Settings > Testing
- Click "Create Test User"
- Auto-generated test data will be created locally
- Data persists in device storage (AsyncStorage)

### 3. Create a Test Dispute
- Navigate to Dispute Tracker
- Click "Add Dispute"
- Fill in test creditor info
- System will auto-save to local storage

### 4. Test AI Agent
- Open My Agent chat
- Send a message about disputes
- Agent will respond with demo data
- All conversations are logged locally

## Data Storage

### Testing Mode Storage
- **Location**: AsyncStorage (device local storage)
- **Keys**: Prefixed with `wci_test_` for easy identification
- **Persistence**: Data survives app restart in simulator/emulator
- **Export**: Use Settings > Testing > Export Data to get JSON dump

### Production Mode Storage
- **Location**: Supabase (remote database)
- **Automatic**: When Supabase is properly configured
- **Sync**: Works offline-first with sync on reconnect

## Testing Workflows

### Workflow 1: Complete Dispute Lifecycle
1. Create a dispute with creditor info
2. Generate dispute letter (auto-selected type)
3. Mark as "sent"
4. AI agent reviews status
5. Advance deadline to test overdue alerts
6. Verify notifications fire correctly

### Workflow 2: AI Agent Testing
1. Ask agent about specific disputes
2. Request letter generation
3. Test tool calling and responses
4. Verify agent has visibility into disputes

### Workflow 3: Push Notifications
1. Enable dispute alerts in Settings
2. Grant notification permission
3. Create overdue dispute
4. Verify in-app notification fires
5. (With EAS setup) Test remote push

## Key Testing Scenarios

### Scenario A: User Registration Flow
- [x] Create test user with email
- [x] User data persists locally
- [x] Can create multiple test users
- [x] User can switch between test accounts

### Scenario B: Dispute Creation & Tracking
- [x] Create dispute with all fields
- [x] Dispute appears in tracker
- [x] Status changes tracked
- [x] Timeline events logged
- [x] Documents uploadable

### Scenario C: Letter Generation
- [x] AI auto-selects correct letter type
- [x] Letter content generated
- [x] Letter saved to dispute
- [x] Agent sees generated letters

### Scenario D: Notifications
- [x] In-app notifications when events occur
- [x] Dispute alerts toggle works
- [x] Overdue alerts fire at correct times
- [x] Permission requests appear when needed

### Scenario E: AI Agent Interactions
- [x] Agent understands dispute context
- [x] Agent can access dispute list
- [x] Agent can generate letters
- [x] Agent provides relevant responses

## Troubleshooting

### Data Not Saving
- Check that EXPO_PUBLIC_TESTING_MODE=true is set
- Clear AsyncStorage: Settings > Testing > Clear Data
- Restart the app/simulator

### Notifications Not Appearing
- Ensure "Dispute Alerts" toggle is ON in Settings
- Grant notification permission when prompted
- Check that disputes actually have a responseBy date

### AI Agent Not Responding
- Verify OPENAI_API_KEY is set
- Check console for error messages
- Ensure dispute data is saved first

### Supabase Sync Issues
- Verify EXPO_PUBLIC_SUPABASE_URL is correct
- Check SUPABASE_SERVICE_ROLE_KEY on backend
- Review RLS policies on push_tokens, disputes tables

## Next Steps

1. **Data Export** - Export test disputes as JSON for reporting
2. **Batch Testing** - Create multiple disputes at once
3. **Timeline Simulation** - Fast-forward dates for deadline testing
4. **Performance Testing** - Load many disputes, stress test agent
5. **Production Migration** - Move test data to Supabase when ready
