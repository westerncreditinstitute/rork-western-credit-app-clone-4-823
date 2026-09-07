# 🚀 Simple Start Guide - Western Credit App

## ⚡ One-Time Setup (5 minutes)

### Step 1: Find Your rork823 Folder
In Finder, look for a folder named `rork823`. It should be in one of these places:
- Home folder (`/Users/YourName/`)
- Desktop
- Documents
- Downloads

### Step 2: Run Setup (First Time Only)
1. Open **Terminal** (find it in Applications > Utilities)
2. Copy and paste this entire block:

```bash
cd ~/rork823
bash scripts/setup-env.sh
```

3. Press Enter and follow any prompts
4. Wait for it to finish

**That's the only setup you ever need to do!**

---

## 🎯 Starting Your App (Every Time You Want to Work)

### Option A: Double-Click (Easiest!)
1. Open Finder
2. Navigate to your `rork823` folder
3. Double-click: **start-agent.command**
4. A Terminal window will open automatically
5. Wait for it to say "Ready on http://localhost:8081"
6. Your browser should open automatically

### Option B: From Terminal
1. Open Terminal
2. Paste this:
```bash
~/rork823/start-agent.command
```
3. Press Enter
4. Done!

---

## 🛑 Stopping Your App

### Option A: Close the Terminal Window
Just close the Terminal window that's running the app.

### Option B: Double-Click Stop Script
1. Open Finder
2. Go to your `rork823` folder
3. Double-click: **stop-agent.command**

### Option C: From Another Terminal
```bash
~/rork823/stop-agent.command
```

---

## 🆘 Troubleshooting

### "No .env file found"
Run setup again:
```bash
bash ~/rork823/scripts/setup-env.sh
```

### "Port already in use"
Stop the app and try again:
1. Run `stop-agent.command`
2. Wait 5 seconds
3. Run `start-agent.command` again

### "npm not found"
You need to install Node.js:
1. Go to https://nodejs.org/
2. Download and install the LTS version
3. Restart your Terminal
4. Try again

### App won't open in browser
1. Manually open your browser
2. Go to: http://localhost:8081

---

## 📋 What Happens When You Start

When you double-click `start-agent.command`:

1. ✅ Checks if setup is done
2. ✅ Starts the Backend Server (Port 3000)
3. ✅ Starts the Expo App Server (Port 8081)
4. ✅ Opens your app in the browser
5. ✅ Shows you all the activity in the Terminal

---

## 💡 Pro Tips

- Keep the Terminal window open while developing
- Your app will auto-reload when you change code
- Press `Ctrl+C` in Terminal to stop everything
- Double-click `stop-agent.command` to clean shutdown

---

## ✅ You're All Set!

That's it! From now on, just:
1. Double-click `start-agent.command` to start
2. Double-click `stop-agent.command` to stop

No more hunting for folders or running commands. Enjoy! 🎉
