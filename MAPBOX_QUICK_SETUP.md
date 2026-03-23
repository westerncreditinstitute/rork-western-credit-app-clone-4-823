# 🗺️ Mapbox Quick Setup Guide

Follow these simple steps to get your interactive map system up and running!

---

## ⚡ 5-Minute Setup

### Step 1: Get Your Mapbox Access Token (2 minutes)

1. Go to [mapbox.com](https://www.mapbox.com/) and sign up (free)
2. Log in to your dashboard
3. Go to **Account** → **Tokens**
4. Copy the "Default Public Token" (starts with `pk.`)
5. Save it somewhere safe!

### Step 2: Install Mapbox Package (1 minute)

Run this command in your project root:

```bash
cd rork-western-credit-app-clone-4
npm install @rnmapbox/maps
```

### Step 3: Add Environment Variables (1 minute)

Create or update your `.env` file in the project root:

```env
# Add this line with your token
MAPBOX_ACCESS_TOKEN=pk.your_token_here
```

### Step 4: Configure Expo (1 minute)

Add to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "@rnmapbox/maps",
        {
          "RNMapboxMapsImpl": "mapbox",
          "RNMapboxMapsDownloadToken": "YOUR_SECRET_TOKEN_FROM_MAPBOX"
        }
      ]
    ]
  }
}
```

To get your secret token:
1. Go to Mapbox Dashboard → Account → Tokens
2. Copy the "Secret Token" (starts with `sk.`)
3. Replace `YOUR_SECRET_TOKEN_FROM_MAPBOX` with it

---

## 🗄️ Database Setup

### Run Migrations in Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `migrations/interactive_map_system.sql`
5. Click **Run**
6. Create another query
7. Copy and paste the contents of `migrations/initialize_map_data.sql`
8. Click **Run**

✅ Done! Your database is now set up.

---

## 🚀 Start the App

```bash
# Start the development server
npx expo start

# For iOS
press i

# For Android
press a
```

---

## 🧪 Test the Map

1. Navigate to the map screen in your app
2. You should see a city selector at the top
3. Select a city (e.g., Los Angeles)
4. The map should zoom to the city
5. Property markers should appear
6. Tap a marker to see property details

---

## 📱 Adding Map to Navigation

In your `app/game/_layout.tsx`, add:

```typescript
import MapScreen from './map';

export default function GameLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="map" 
        component={MapScreen} 
        options={{ title: 'Map' }}
      />
      {/* Your other routes */}
    </Stack>
  );
}
```

---

## 🔧 Common Issues

### "Map not showing" or "Blank screen"
- Check your MAPBOX_ACCESS_TOKEN in `.env`
- Make sure token starts with `pk.`
- Restart the app after adding the token

### "Markers not appearing"
- Run the database migrations
- Check if properties exist in database
- Verify city bounds are correct

### "Module not found: @rnmapbox/maps"
- Run `npm install @rnmapbox/maps`
- Clear cache: `npx expo start --clear`

---

## 📚 Additional Help

For detailed documentation, see:
- `INTERACTIVE_MAP_SYSTEM_GUIDE.md` - Complete implementation guide
- `todo.md` - Implementation checklist and progress

---

**Need more help?** Check the troubleshooting section in the full guide!

🎉 You're all set! Your interactive map is ready to use!