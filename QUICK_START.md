# 🚀 Quick Start Scripts

These scripts make it super easy to start and stop the Western Credit App!

## 📱 For Mac Users

### Start the App
Double-click or run in terminal:
```bash
./start-agent.sh
```

This will:
1. ✅ Start the backend server
2. ✅ Start the Expo app server
3. ✅ Open your app in the browser at http://localhost:8081

### Stop the App
Run in terminal:
```bash
./stop-agent.sh
```

This will kill both servers cleanly.

---

## 💻 For Windows Users

### Start the App
Double-click:
```
start-agent.bat
```

This will:
1. ✅ Open a new window and start the backend server
2. ✅ Open another new window and start the Expo app server
3. ✅ Keep both windows open so you can see the logs

### Stop the App
Run or double-click:
```
stop-agent.bat
```

This will kill both servers.

---

## 📋 What Gets Started

When you run the start script, two servers launch:

1. **Backend Server** (Port 3000)
   - Handles your AI Agent and API calls
   - Connects to Supabase

2. **Expo Web Server** (Port 8081)
   - Serves your React Native app
   - Opens in browser automatically

---

## 🆘 Troubleshooting

### "Port already in use" error?
Stop the servers and try again:
```bash
./stop-agent.sh
./start-agent.sh
```

### Backend won't start?
Make sure you've installed dependencies:
```bash
cd rork823
npm install --legacy-peer-deps
```

### Still having issues?
Try manually starting from separate terminals:

**Terminal 1:**
```bash
cd rork823
npm run backend
```

**Terminal 2:**
```bash
cd rork823/expo
npx expo start --clear --web
```

---

## 📖 Manual Setup (If You Prefer)

If you don't want to use the scripts, you can always:

1. Open two terminal windows
2. In Terminal 1: `cd rork823 && npm run backend`
3. In Terminal 2: `cd rork823/expo && npx expo start --clear --web`
4. Keep both running while developing

---

That's it! Enjoy your development! 🎉
