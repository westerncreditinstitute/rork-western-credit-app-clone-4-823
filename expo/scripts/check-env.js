#!/usr/bin/env node
/**
 * Environment variable checker for the My Agent feature.
 *
 *   node scripts/check-env.js
 *
 * Validates .env, tests the Supabase connection, verifies the
 * My Agent tables exist, and live-tests the OpenAI key.
 * Secrets are always masked in output.
 */

const fs = require("fs");
const path = require("path");

const G = "\x1b[32m", R = "\x1b[31m", Y = "\x1b[33m", B = "\x1b[1m", D = "\x1b[2m", X = "\x1b[0m";
const ok = (m) => console.log(`  ${G}✓${X} ${m}`);
const bad = (m) => console.log(`  ${R}✗${X} ${m}`);
const warn = (m) => console.log(`  ${Y}!${X} ${m}`);
const info = (m) => console.log(`  ${D}${m}${X}`);
const head = (m) => console.log(`\n${B}${m}${X}`);

const mask = (v) => {
  if (!v) return "(empty)";
  if (v.length <= 12) return v.slice(0, 2) + "***";
  return `${v.slice(0, 6)}...${v.slice(-4)} ${D}(${v.length} chars)${X}`;
};

// ---- load .env -------------------------------------------------
const envPath = path.join(__dirname, "..", ".env");
if (!fs.existsSync(envPath)) {
  console.log(`\n${R}${B}No .env file found.${X}\n`);
  console.log(`Create one from the template:\n\n  ${B}cp .env.example .env${X}\n`);
  process.exit(1);
}

const env = {};
for (const raw of fs.readFileSync(envPath, "utf8").split("\n")) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i === -1) continue;
  let v = line.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[line.slice(0, i).trim()] = v;
}

let errors = 0, warnings = 0;
const PLACEHOLDER = /your-|replace-with|xxxx|here$|your-project-ref/i;

console.log(`\n${B}═══ Environment Check — My Agent ═══${X}`);
info(`Reading ${envPath}`);

// ---- 1. Supabase ----------------------------------------------
head("1. Supabase (required)");

const sUrl = env.EXPO_PUBLIC_SUPABASE_URL;
if (!sUrl) { bad("EXPO_PUBLIC_SUPABASE_URL is missing"); errors++; }
else if (PLACEHOLDER.test(sUrl)) { bad(`EXPO_PUBLIC_SUPABASE_URL still a placeholder: ${sUrl}`); errors++; }
else if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/.test(sUrl)) {
  if (sUrl.endsWith("/")) { bad("EXPO_PUBLIC_SUPABASE_URL must not end with '/'"); errors++; }
  else { warn(`Unusual Supabase URL format: ${sUrl}`); warnings++; }
} else ok(`EXPO_PUBLIC_SUPABASE_URL = ${sUrl}`);

const sKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!sKey) { bad("EXPO_PUBLIC_SUPABASE_ANON_KEY is missing"); errors++; }
else if (PLACEHOLDER.test(sKey)) { bad("EXPO_PUBLIC_SUPABASE_ANON_KEY still a placeholder"); errors++; }
else if (!sKey.startsWith("eyJ")) {
  bad("Anon key should be a JWT starting with 'eyJ' — did you paste the wrong value?"); errors++;
} else {
  ok(`EXPO_PUBLIC_SUPABASE_ANON_KEY = ${mask(sKey)}`);
  try {
    const role = JSON.parse(Buffer.from(sKey.split(".")[1], "base64").toString()).role;
    if (role === "service_role") {
      bad("This is the SERVICE_ROLE key, not the anon key! It bypasses RLS — never expose it client-side.");
      errors++;
    } else if (role === "anon") ok("Key role confirmed: anon");
    else { warn(`Unexpected key role: ${role}`); warnings++; }
  } catch { /* ignore decode issues */ }
}

// ---- 2. API base URL ------------------------------------------
head("2. API Base URL (required)");

const api = env.EXPO_PUBLIC_RORK_API_BASE_URL;
if (!api) {
  bad("EXPO_PUBLIC_RORK_API_BASE_URL is missing");
  info("lib/trpc.ts throws on startup without this.");
  errors++;
} else if (api.endsWith("/")) {
  bad(`Must not end with '/' — the client appends '/api/trpc'. Got: ${api}`); errors++;
} else if (api.includes("/api/trpc")) {
  bad(`Remove '/api/trpc' — the client adds it. Use just the origin. Got: ${api}`); errors++;
} else {
  ok(`EXPO_PUBLIC_RORK_API_BASE_URL = ${api}`);
  info(`tRPC endpoint -> ${api}/api/trpc`);
  if (/localhost|127\.0\.0\.1/.test(api)) {
    warn("localhost only works in a browser on this machine.");
    info("On a phone/simulator use your LAN IP, e.g. http://192.168.1.50:8081");
    warnings++;
  }
}

// ---- 3. OpenAI -------------------------------------------------
head("3. OpenAI (optional — demo mode without it)");

const oKey = env.OPENAI_API_KEY;
if (env.EXPO_PUBLIC_OPENAI_API_KEY) {
  bad("EXPO_PUBLIC_OPENAI_API_KEY is set — this leaks your key into the client bundle!");
  info("Rename it to OPENAI_API_KEY (no EXPO_PUBLIC_ prefix).");
  errors++;
}
if (!oKey || PLACEHOLDER.test(oKey)) {
  warn("OPENAI_API_KEY not set — chat will run in DEMO MODE (canned replies).");
  info("Letter generation still works fully; it uses local templates.");
  warnings++;
} else if (!oKey.startsWith("sk-")) {
  bad("OPENAI_API_KEY should start with 'sk-'"); errors++;
} else {
  ok(`OPENAI_API_KEY = ${mask(oKey)}`);
  ok(`OPENAI_MODEL = ${env.OPENAI_MODEL || "gpt-4o-mini (default)"}`);
  ok(`OPENAI_BASE_URL = ${env.OPENAI_BASE_URL || "https://api.openai.com/v1 (default)"}`);
}

// ---- 4. git safety --------------------------------------------
head("4. Secret safety");
const gi = path.join(__dirname, "..", ".gitignore");
if (fs.existsSync(gi) && /^\.env\s*$/m.test(fs.readFileSync(gi, "utf8"))) {
  ok(".env is listed in .gitignore — safe from commits");
} else { bad(".env is NOT git-ignored! Add '.env' to .gitignore now."); errors++; }

// ---- live network tests ---------------------------------------
(async () => {
  if (typeof fetch !== "function") {
    head("Live tests");
    warn("Node 18+ required for live tests. Skipping.");
  } else {
    if (sUrl && sKey && !PLACEHOLDER.test(sUrl) && !PLACEHOLDER.test(sKey)) {
      head("5. Live test — Supabase + My Agent tables");
      for (const t of ["users", "disputes", "ai_agent_pool", "user_agent_assignments", "agent_chat_messages"]) {
        try {
          const r = await fetch(`${sUrl}/rest/v1/${t}?select=*&limit=1`, {
            headers: { apikey: sKey, Authorization: `Bearer ${sKey}`, Prefer: "count=exact" },
          });
          if (r.ok) {
            const c = (r.headers.get("content-range") || "").split("/")[1];
            ok(`Table '${t}' reachable${c && c !== "*" ? ` — ${c} rows` : ""}`);
            if (t === "ai_agent_pool") {
              if (c === "0") { bad("ai_agent_pool is EMPTY — run migration 021 (Phase 3)."); errors++; }
              else if (c === "10000") ok("All 10,000 agents seeded correctly");
            }
          } else if (r.status === 404 || r.status === 400) {
            bad(`Table '${t}' not found — run the migrations (Phases 1-3).`); errors++;
          } else if (r.status === 401) {
            bad("401 Unauthorized — the anon key is wrong for this project."); errors++;
          } else { warn(`Table '${t}' returned HTTP ${r.status}`); warnings++; }
        } catch (e) { bad(`Cannot reach Supabase: ${e.message}`); errors++; break; }
      }
    }

    if (oKey && oKey.startsWith("sk-") && !PLACEHOLDER.test(oKey)) {
      head("6. Live test — OpenAI key");
      const base = env.OPENAI_BASE_URL || "https://api.openai.com/v1";
      const model = env.OPENAI_MODEL || "gpt-4o-mini";
      try {
        const r = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${oKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model, max_tokens: 5, messages: [{ role: "user", content: "Say OK" }] }),
        });
        if (r.ok) {
          const j = await r.json();
          ok(`OpenAI key is VALID — model '${j.model || model}' responded`);
          ok("My Agent chat will use real AI with function calling");
        } else {
          const b = await r.text();
          if (r.status === 401) { bad("401 — invalid or revoked OpenAI API key"); errors++; }
          else if (r.status === 429) {
            bad("429 — rate limited or NO CREDITS on your OpenAI account");
            info("Add billing at platform.openai.com/account/billing");
            errors++;
          } else if (r.status === 404) {
            bad(`404 — model '${model}' not available to your account`);
            info("Try OPENAI_MODEL=gpt-4o-mini or gpt-3.5-turbo");
            errors++;
          } else { bad(`OpenAI HTTP ${r.status}: ${b.slice(0, 160)}`); errors++; }
        }
      } catch (e) { bad(`Cannot reach OpenAI: ${e.message}`); errors++; }
    }
  }

  // ---- summary --------------------------------------------------
  console.log(`\n${B}═══ Summary ═══${X}`);
  if (errors === 0 && warnings === 0) console.log(`${G}${B}All checks passed. You're ready to run the app.${X}\n`);
  else if (errors === 0) {
    console.log(`${G}No blocking errors${X} — ${Y}${warnings} warning(s)${X}`);
    console.log(`${D}Warnings are usually fine (e.g. demo mode / localhost).${X}\n`);
  } else {
    console.log(`${R}${B}${errors} error(s)${X}${warnings ? `, ${Y}${warnings} warning(s)${X}` : ""}`);
    console.log(`${D}Fix the ✗ items above, then re-run: node scripts/check-env.js${X}\n`);
  }
  process.exit(errors > 0 ? 1 : 0);
})();
