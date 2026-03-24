# Business Ownership & Customization System - Deployment Guide

## Overview
This guide will walk you through deploying the Business Ownership & Customization System to production.

## Prerequisites

1. **GitHub Access** - ✅ (Already configured)
2. **Supabase Account** - For database and backend services
3. **Expo/React Native Environment** - For mobile app deployment
4. **Node.js** - Version 18 or higher

## Deployment Steps

### Step 1: Push to GitHub

Your changes are already committed locally. Now push to the remote repository:

```bash
cd rork-western-credit-app-clone-4
git push origin main
```

**Note**: You currently have 5 commits ahead of origin/main that need to be pushed.

### Step 2: Run Database Migrations in Supabase

#### Option A: Using Supabase Dashboard (Recommended for first deployment)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `migrations/business_ownership_system.sql`
5. Click **Run** to execute
6. Create a new query
7. Copy and paste the contents of `migrations/customization_system.sql`
8. Click **Run** to execute

#### Option B: Using Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

Or run individual migrations:

```bash
supabase migration up --file migrations/business_ownership_system.sql
supabase migration up --file migrations/customization_system.sql
```

### Step 3: Verify Database Setup

Run these SQL queries in Supabase SQL Editor to verify tables were created:

```sql
-- Check if business tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%business%';

-- Check if customization tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%avatar%' OR table_name LIKE '%inventory%' OR table_name LIKE '%marketplace%');

-- Check if cities exist
SELECT COUNT(*) as city_count FROM cities;

-- Check if business categories exist
SELECT COUNT(*) as category_count FROM business_categories;
```

### Step 4: Initialize Business Data

You need to initialize the system with:
1. Cities
2. Business categories
3. Avatar items catalog
4. Businesses (20 per city)
5. Business inventory

#### Option A: Using Supabase SQL Editor

Run this initialization script:

```sql
-- Insert sample cities
INSERT INTO cities (name, state, country) VALUES
('Los Angeles', 'CA', 'USA'),
('New York', 'NY', 'USA'),
('Miami', 'FL', 'USA')
ON CONFLICT (name) DO NOTHING;

-- Insert business categories (these should already exist from your existing system)
-- If not, you'll need to import them from your existing data
```

#### Option B: Using the Initialization Service

Create a temporary initialization script or use the BusinessInitializationService:

```typescript
// In your app initialization or admin panel
import { businessInitializationService } from '@/services/BusinessInitializationService';

// Run this once to initialize the entire system
await businessInitializationService.completeInitialization();
```

### Step 5: Update App Configuration

Update your app configuration to include the new screens:

#### Update Navigation Routes

Add these routes to your navigation configuration (usually in `app/_layout.tsx` or similar):

```typescript
// Add to your Expo Router navigation
<Stack.Screen
  name="business-browser"
  component={BusinessBrowserScreen}
  options={{ title: 'Business Marketplace' }}
/>
<Stack.Screen
  name="business-detail"
  component={BusinessDetailScreen}
  options={{ title: 'Business Details' }}
/>
<Stack.Screen
  name="avatar-customization"
  component={AvatarCustomizationScreen}
  options={{ title: 'Avatar Customization' }}
/>
<Stack.Screen
  name="customization-shop"
  component={CustomizationShopScreen}
  options={{ title: 'Customization Shop' }}
/>
```

#### Update Environment Variables

Ensure these environment variables are set in your `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 6: Test the Application

#### Local Testing

1. Start your development server:
   ```bash
   npm start
   ```

2. Test the new features:
   - Navigate to Business Marketplace
   - Browse available businesses
   - Purchase a business (test account)
   - Go to Avatar Customization
   - Browse the Customization Shop
   - Purchase items
   - Equip items to avatar

#### Test Checklist

- [ ] Database tables created successfully
- [ ] Cities loaded in Business Browser
- [ ] Business categories displayed
- [ ] Businesses appear for purchase
- [ ] Business detail page loads
- [ ] Purchase flow completes
- [ ] Avatar customization screen loads
- [ ] Inventory displays items
- [ ] Equip/unequip works
- [ ] Shop displays items
- [ ] Purchase from business works

### Step 7: Deploy to Production

#### Option A: Expo EAS Build (Recommended)

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Configure EAS**:
   ```bash
   eas build:configure
   ```

3. **Build for iOS**:
   ```bash
   eas build --platform ios
   ```

4. **Build for Android**:
   ```bash
   eas build --platform android
   ```

5. **Submit to App Stores**:
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```

#### Option B: Manual Build

**iOS**:
```bash
npx expo prebuild
cd ios
pod install
```
Then open in Xcode and build.

**Android**:
```bash
npx expo prebuild
cd android
./gradlew assembleRelease
```

### Step 8: Post-Deployment Setup

#### Set Up Row Level Security (RLS) Policies

RLS policies are already defined in the migration files, but verify they're working:

```sql
-- Test RLS policies
SELECT * FROM physical_businesses WHERE for_sale = true;
-- Should return businesses for all authenticated users

SELECT * FROM player_inventory WHERE player_id = 'test-user-id';
-- Should only return items for that specific user
```

#### Configure Webhooks (Optional)

Set up Supabase webhooks for real-time updates:
1. Go to Supabase Dashboard
2. Navigate to Database → Webhooks
3. Create webhooks for:
   - business_ownership_history (INSERT)
   - player_inventory (INSERT, UPDATE)
   - avatar_marketplace_listings (INSERT, UPDATE)

#### Set Up Background Jobs (Optional)

For features like:
- Automatic stock restocking
- Business revenue calculations
- Auction expiration

You can use:
- Supabase Edge Functions
- Vercel Cron Jobs
- Custom server

## Troubleshooting

### Common Issues

**Issue**: Tables not found
```bash
Solution: Run the migration files again in Supabase SQL Editor
```

**Issue**: Businesses not showing up
```bash
Solution: Run the initialization service to create businesses
```

**Issue**: Items not available in shop
```bash
Solution: Run populateBusinessInventory() from BusinessInitializationService
```

**Issue**: Authentication errors
```bash
Solution: Check Supabase URL and anon key in .env file
```

**Issue**: RLS policies blocking access
```bash
Solution: Check that auth.uid() matches in RLS policies
```

### Debug Mode

Enable debug logging in development:

```typescript
// In your services
console.log('Debug: Fetching businesses...');
const businesses = await businessOwnershipService.getAvailableBusinesses(filter);
console.log('Debug: Businesses fetched:', businesses.length);
```

## Monitoring

After deployment, monitor:

1. **Supabase Dashboard**:
   - Database performance
   - Query logs
   - Storage usage

2. **Application Analytics**:
   - User engagement
   - Feature usage
   - Error rates

3. **Business Metrics**:
   - Number of businesses purchased
   - Items sold
   - Marketplace activity

## Maintenance

### Regular Tasks

- **Weekly**: Check database performance
- **Monthly**: Review and optimize slow queries
- **Quarterly**: Update item catalog with new items
- **As needed**: Add new cities and businesses

### Backups

Ensure Supabase backups are configured:
- Daily backups enabled
- Point-in-time recovery enabled
- Export important data regularly

## Rollback Plan

If issues occur:

1. **Database Rollback**:
   ```bash
   # Use Supabase point-in-time recovery
   # Or restore from backup
   ```

2. **App Rollback**:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

3. **User Communication**:
   - Notify users of rollback
   - Explain what happened
   - Provide timeline for fix

## Support

For issues or questions:
- Check Supabase documentation
- Review Expo documentation
- Check implementation summary
- Contact development team

## Next Steps After Deployment

1. **Gather User Feedback**
2. **Monitor Performance**
3. **Add Additional Features** (franchising, crafting, etc.)
4. **Expand Item Catalog**
5. **Add More Cities**
6. **Implement Analytics**
7. **Optimize Performance**

---

**Deployment Status**: Ready to deploy
**Commit Hash**: ddd5d6a
**Files Changed**: 13 files, 5,828 insertions(+)

For questions or assistance, refer to the implementation summary documentation.