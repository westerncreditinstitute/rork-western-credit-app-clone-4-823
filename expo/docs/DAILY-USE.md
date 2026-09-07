# My Agent — Daily Use

Last updated: September 2026

## Start everything (one double-click)

1. Open **Finder** → **Documents** → **rork-western-credit-app-clone-4-823** → **expo**.
2. Double-click **start-my-agent.command**.
3. Wait for "All set." (it opens two Terminal windows and the app's Home page in your browser).

That's it. Backend and app are running.

## While you work

- Keep both Terminal windows open: **My Agent — Backend** and **My Agent — App**.
- App address (Home page): http://localhost:8081/
- My Agent page: http://localhost:8081/my-agent
- Backend health: http://localhost:3000/api/system-status

## Stop everything (one double-click)

Double-click **stop-my-agent.command** (same folder), or just close both Terminal windows.

## If something won't start

1. Double-click **stop-my-agent.command** first, then **start-my-agent.command** again.
2. If the Backend window says something about `.env`, run in Terminal: `bash scripts/setup-env.sh`
3. If the App window can't be reached, check System Settings → Privacy & Security → Local Network → Terminal is ON.

## One-time only: allow the scripts

The first time you double-click start-my-agent.command, macOS may say "'start-my-agent' can't be opened because it is from an unidentified developer." Fix: right-click the file → **Open** → **Open**. Do that once for each .command file, and it opens normally from then on.

(If macOS instead says the file "can't be opened because it is damaged": System Settings → Privacy & Security → scroll down → **Open Anyway**.)

## Daily snapshot

| Thing | Where |
|---|---|
| Start everything | Double-click `start-my-agent.command` |
| Stop everything | Double-click `stop-my-agent.command` |
| Home page (app opens here) | http://localhost:8081/ |
| My Agent page | http://localhost:8081/my-agent |
| Backend health | http://localhost:3000/api/system-status |
| Folder | Documents/rork-western-credit-app-clone-4-823/expo |
