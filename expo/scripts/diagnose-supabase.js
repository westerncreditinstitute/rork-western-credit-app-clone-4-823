#!/usr/bin/env node
"use strict";
/**
 * ============================================================
 * scripts/diagnose-supabase.js
 * ============================================================
 *
 * Answers ONE question: WHY is Supabase rejecting my key?
 *
 * Symptom it targets (printed by the backend window):
 *
 *   [GameState] Error creating game state: {
 *     message: 'Invalid API key',
 *     hint: 'Double check your Supabase `anon` or `service_role` API key.'
 *   }
 *
 * ...and the same failure wearing a different mask on the My Agent
 * tab ("Couldn't Reach Your Agent"), because agent assignment and
 * chat history also write to Supabase.
 *
 * What it checks, in order:
 *   1. .env hygiene   - duplicate keys, stray spaces, truncated pastes.
 *   2. Project match  - the project ref inside each JWT key versus the
 *                       project ref in the URL. Keys from a DIFFERENT
 *                       Supabase project are the #1 cause of
 *                       'Invalid API key'.
 *   3. Live auth      - one real request per key against the project.
 *                       200 = the key works; 401 = Supabase rejects it.
 *
 * Every secret is masked (first 10 + last 4 characters only), so the
 * output is safe to paste into a chat.
 *
 * Usage:  node scripts/diagnose-supabase.js
 * Exit:   0 = all clear, 1 = at least one problem found.
 */

const fs = require("fs");
const path = require("path");

const G = "\x1b[32m", R = "\x1b[31m", Y = "\x1b[33m", B = "\x1b[1m", X = "\x1b[0m";
const ok = (s) => console.log(`  ${G}\u2713${X} ${s}`);
const bad = (s) => console.log(`  ${R}\u2717${X} ${s}`);
const warn = (s) => console.log(`  ${Y}\u26a0${X} ${s}`);
const head = (s) => console.log(`\n${B}${s}${X}`);
const rule = () => console.log("  " + "-".repeat(56));

/** Mask a secret: first 10 + last 4 chars, plus the length. */
function mask(v) {
  if (!v) return "(empty)";
  if (v.length <= 16) return `${v.slice(0, 2)}\u2026*** (${v.length} chars)`;
  return `${v.slice(0, 10)}\u2026${v.slice(-4)} (${v.length} chars)`;
}

/**
 * Minimal .env parser (same rules as dotenv): KEY=VALUE, # comments
 * skipped, surrounding quotes stripped. Within one file the LAST
 * occurrence of a key wins, exactly like dotenv - duplicates are
 * collected so they can be reported.
 */
function parseEnv(text) {
  const env = {};
  const dupes = [];
  const seen = new Map();
  text.split(/\r?\n/).forEach((rawLine, idx) => {
    const t = rawLine.trim();
    if (!t || t.startsWith("#")) return;
    const i = t.indexOf("=");
    if (i < 1) return;
    const key = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (seen.has(key)) {
      dupes.push({ key, first: seen.get(key).value, last: v, lastLine: idx + 1 });
    } else {
      seen.set(key, { value: v });
    }
    env[key] = v; // last wins, like dotenv
  });
  return { env, dupes };
}

/** Decode a JWT's payload without verifying (we only inspect claims). */
function decodeJwt(jwt) {
  try {
    const parts = String(jwt).split(".");
    if (parts.length !== 3) return { error: "not a 3-part JWT" };
    let p = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (p.length % 4) p += "=";
    const payload = JSON.parse(Buffer.from(p, "base64").toString("utf8"));
    if (!payload || typeof payload !== "object") return { error: "payload is not JSON" };
    return { payload };
  } catch (e) {
    return { error: e.message };
  }
}

/** 'https://abcdefghij.supabase.co' -> 'abcdefghij' (null if not a hosted URL). */
function extractProjectRef(url) {
  const m = String(url || "").match(/^https?:\/\/([a-z0-9]{6,})\.supabase\.co/i);
  return m ? m[1] : null;
}

/**
 * Static analysis of one key: format, role claim, project-ref claim vs
 * the URL, truncation, stray whitespace. Returns findings; prints nothing.
 */
function analyzeKey(label, key, urlRef) {
  const f = {
    label,
    value: key,
    present: Boolean(key),
    notes: [],
    role: null,
    ref: null,
    refMatches: null,
    truncated: false,
  };
  if (!key) {
    f.notes.push(`the ${label} key is MISSING from .env`);
    return f;
  }
  if (/\s/.test(key)) f.notes.push("contains whitespace - a space or line break was pasted INSIDE the key");
  if (/^Bearer\s/i.test(key)) f.notes.push("starts with 'Bearer' - a header line was copied, not the key itself");

  if (key.startsWith("eyJ")) {
    const d = decodeJwt(key);
    if (d.error) {
      f.notes.push(`does not decode as a JWT (${d.error}) - the paste is corrupted or TRUNCATED (the copy missed part of the key)`);
      f.truncated = true;
    } else {
      f.role = d.payload.role || null;
      f.ref = d.payload.ref || null;
      if (label === "anon" && f.role && f.role !== "anon") {
        f.notes.push(`this JWT's role is '${f.role}', not 'anon' - the wrong row was copied`);
      }
      if (label === "service_role" && f.role && f.role !== "service_role") {
        f.notes.push(`this JWT's role is '${f.role}', not 'service_role' - the wrong row was copied`);
      }
      if (urlRef && f.ref) {
        f.refMatches = f.ref === urlRef;
        if (!f.refMatches) {
          f.notes.push(`project MISMATCH: the key belongs to project '${f.ref}' but the URL is project '${urlRef}'`);
        }
      }
      if (typeof d.payload.exp === "number" && d.payload.exp * 1000 < Date.now()) {
        f.notes.push("the key's expiry date is in the past");
      }
      if (key.length < 150) {
        f.notes.push(`only ${key.length} characters - Supabase JWT keys are 200+; this looks TRUNCATED (the copy missed the end)`);
        f.truncated = true;
      }
    }
  } else if (key.startsWith("sb_publish_")) {
    f.notes.push("new-format publishable key (opaque - verified by the live test below)");
    if (label === "service_role") {
      f.notes.push("this is a PUBLISHABLE key, but this slot needs the SECRET (service_role) key - sb_secret_... or the legacy eyJ... service_role JWT");
    }
  } else if (key.startsWith("sb_secret_")) {
    f.notes.push("new-format secret key (opaque - verified by the live test below)");
    if (label === "anon") {
      f.notes.push("this is the SECRET (service) key, but this slot needs the publishable/anon key");
    }
  } else {
    f.notes.push("unexpected format - Supabase keys start with eyJ..., sb_publish_..., or sb_secret_...");
  }
  return f;
}

/**
 * One real request per key. GET /rest/v1/ returns 200 (the API
 * description) when the key is valid for this project, and the exact
 * 'Invalid API key' error when it is not.
 */
async function liveKeyTest(url, key, endpoint = "/rest/v1/") {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("timeout"), 10000);
  try {
    const r = await fetch(`${url}${endpoint}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    let body = "";
    try { body = (await r.text()).slice(0, 300); } catch (_) { /* body optional */ }
    // This hint means the server RECOGNIZED the key as valid — the endpoint
    // just only accepts service_role (true for /rest/v1/ on newer projects).
    const serviceOnlyHint = /only the .service_role. api key can be used/i.test(body);
    return { reached: true, status: r.status, ok: r.ok, body, serviceOnlyHint };
  } catch (e) {
    return { reached: false, error: e.message };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Turn findings + live result into one plain-English verdict. */
function verdictFor(f, live, urlRef) {
  if (!f.present) return { level: "bad", text: `the ${f.label} key is missing` };
  if (!live || !live.reached) {
    return { level: "warn", text: `could not live-test the ${f.label} key (the URL itself did not respond)` };
  }
  if (live.ok) return { level: "ok", text: `the ${f.label} key WORKS for this project` };
  // 404 = the request AUTHENTICATED fine, but the table was not found.
  // (A bad key would have gotten 401 before PostgREST even looked for it.)
  if (live.status === 404) {
    return {
      level: "ok",
      text: `the ${f.label} key is VALID (the server accepted it) — but the test table was not found. Run the migrations, then re-run this script`,
    };
  }
  if (live.status === 401) {
    if (live.serviceOnlyHint && f.role === "anon") {
      return {
        level: "ok",
        text: `the anon key WORKS for this project (the server recognized it — this particular API page only accepts service_role keys, but the key itself is valid)`,
      };
    }
    if (f.refMatches === false) {
      return {
        level: "bad",
        text: `the ${f.label} key is rejected AND belongs to project '${f.ref}' - a DIFFERENT project than the URL ('${urlRef}'). Copy both keys from the project the URL points to (or switch the URL to the project the keys came from - it must be the one where the migrations were run).`,
      };
    }
    if (f.truncated) {
      return { level: "bad", text: `the ${f.label} key is rejected and looks truncated - the copy missed characters. Re-copy it with the copy button, not by dragging` };
    }
    if (f.notes.some((n) => n.includes("role is '"))) {
      return { level: "bad", text: `the ${f.label} key is rejected - the wrong row was copied (see the role note above)` };
    }
    return {
      level: "bad",
      text: `the ${f.label} key is rejected ('Invalid API key') - it was rotated/revoked, belongs to another project, or was mis-pasted. Re-copy it from Supabase -> Project Settings -> API`,
    };
  }
  return { level: "warn", text: `the ${f.label} key got HTTP ${live.status} - unexpected; keep this output` };
}

function printFindings(f, step) {
  head(`${step}. ${f.label === "anon" ? "anon key (EXPO_PUBLIC_SUPABASE_ANON_KEY)" : "service_role key (SUPABASE_SERVICE_ROLE_KEY)"}`);
  if (!f.present) {
    bad(`value: (not set)`);
    for (const n of f.notes) bad(n);
    return;
  }
  ok(`value: ${mask(f.value)}`);
  for (const n of f.notes) warn(n);
  if (f.role) console.log(`     decoded role: ${f.role}${f.ref ? `  |  project ref: ${f.ref}` : ""}`);
  if (f.notes.length === 0) ok("format looks healthy (live test below is the real proof)");
}

async function main() {
  console.log(`${B}Supabase key diagnosis${X} (v2 — anon tested against a real table, not the API root)`);
  console.log(`  ${new Date().toISOString()}`);
  let problems = 0;

  const envPath = path.resolve(__dirname, "..", ".env");
  head("1. .env file");
  if (!fs.existsSync(envPath)) {
    bad(`No .env found at ${envPath}`);
    bad("Fix: bash scripts/setup-env.sh");
    process.exit(1);
  }
  const raw = fs.readFileSync(envPath, "utf8");
  const { env, dupes } = parseEnv(raw);
  const activeLines = raw.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#")).length;
  ok(`Found .env - ${activeLines} setting line(s)`);
  for (const d of dupes) {
    warn(`'${d.key}' appears more than once - dotenv uses the LAST one (line ${d.lastLine})`);
    warn(`     earlier: ${mask(d.first)}`);
    warn(`     in use : ${mask(d.last)}`);
    problems++;
  }

  // ---- 2. URLs ---------------------------------------------------------
  head("2. Project URL");
  const publicUrl = (env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const serverUrl = (env.SUPABASE_URL || publicUrl).replace(/\/+$/, "");
  let urlRef = null;
  if (!publicUrl) {
    bad("EXPO_PUBLIC_SUPABASE_URL is missing");
    problems++;
  } else {
    ok(`EXPO_PUBLIC_SUPABASE_URL = ${publicUrl}`);
    if (!/^https:\/\//.test(publicUrl)) {
      warn("URL does not start with https:// - Supabase project URLs do; check the paste");
      problems++;
    }
    urlRef = extractProjectRef(publicUrl);
    if (!urlRef) warn("URL is not a *.supabase.co project URL - project-ref comparison skipped, live tests decide");
  }
  if (env.SUPABASE_URL && env.SUPABASE_URL !== publicUrl) {
    warn(`SUPABASE_URL is also set and DIFFERS (${env.SUPABASE_URL}) - the backend prefers SUPABASE_URL for its admin client`);
    problems++;
  }

  // ---- 3/4. key static analysis ---------------------------------------
  const anon = analyzeKey("anon", env.EXPO_PUBLIC_SUPABASE_ANON_KEY, urlRef);
  printFindings(anon, "3");
  const svc = analyzeKey("service_role", env.SUPABASE_SERVICE_ROLE_KEY, extractProjectRef(serverUrl));
  printFindings(svc, "4");

  // ---- 5. live tests ---------------------------------------------------
  const results = {};
  head("5. Live tests (one real request per key)");
  if (typeof fetch !== "function") {
    warn("Node 18+ required for live tests - skipped");
  } else if (!publicUrl) {
    warn("No URL to test against");
  } else {
    // 5a: is the URL itself a live Supabase project?
    try {
      const r = await fetch(`${publicUrl}/rest/v1/`);
      if (r.status === 401) ok(`URL responds (401 without a key = normal) - a live Supabase project`);
      else if (r.ok) warn("URL answered 200 WITHOUT any key - not a normal Supabase project, check the URL");
      else warn(`URL answered HTTP ${r.status} without a key - unusual, keep this output`);
    } catch (e) {
      bad(`The URL itself did not respond: ${e.message}`);
      bad("-> The URL is mistyped, or the project is paused/deleted.");
      bad("-> Re-copy the Project URL from Supabase -> Project Settings -> API.");
      problems++;
    }

    // 5b: anon key against the public URL (what the client app uses)
    if (anon.present) {
      results.anon = await liveKeyTest(publicUrl, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, "/rest/v1/game_states?select=*&limit=1");
      const v = verdictFor(anon, results.anon, urlRef);
      (v.level === "ok" ? ok : v.level === "bad" ? bad : warn).call(null, `anon key    : ${v.text}`);
      if (results.anon.reached && !results.anon.ok && results.anon.body) {
        console.log(`     server said: ${results.anon.body.replace(/\s+/g, " ").slice(0, 160)}`);
      }
      if (v.level === "bad") problems++;
    }

    // 5c: service key against SUPABASE_URL || public URL (what the backend uses)
    if (svc.present) {
      results.svc = await liveKeyTest(serverUrl, env.SUPABASE_SERVICE_ROLE_KEY);
      const v = verdictFor(svc, results.svc, extractProjectRef(serverUrl));
      (v.level === "ok" ? ok : v.level === "bad" ? bad : warn).call(null, `service key: ${v.text}`);
      if (results.svc.reached && !results.svc.ok && results.svc.body) {
        console.log(`     server said: ${results.svc.body.replace(/\s+/g, " ").slice(0, 160)}`);
      }
      if (v.level === "bad") problems++;
    }
  }

  // ---- verdict ---------------------------------------------------------
  head("Verdict");
  if (problems === 0) {
    ok("Everything checks out - both keys authenticate against this project.");
    console.log("  If the app still fails, the problem is elsewhere (tables/RLS/migrations).");
    console.log("  Run: node scripts/check-env.js   for the table + OpenAI checks.");
  } else {
    bad(`${problems} problem(s) found above. Fix them with these steps:`);
    rule();
    console.log("  1. Open Supabase in your browser and click your project.");
    console.log("  2. Bottom-left gear icon 'Project Settings' -> 'API'.");
    console.log("  3. Copy the 'Project URL' with its copy button.");
    console.log("  4. In 'Project API keys': copy the anon/publishable row, and the");
    console.log("     service_role/secret row (click 'Reveal' first if shown).");
    console.log("     IMPORTANT: always use the copy buttons - dragging a selection");
    console.log("     is how keys get truncated.");
    console.log("  5. Run:  bash scripts/setup-env.sh   and paste each value when asked.");
    console.log("     (It backs up your current .env automatically and validates keys.)");
    console.log("  6. Restart BOTH windows:");
    console.log("       Window 1: Ctrl+C, then  npm run backend");
    console.log("       Window 2: Ctrl+C, then  npx expo start --clear");
    console.log("     (Public keys are baked into the app bundle at build time -");
    console.log("      that is why Window 2 needs the --clear restart.)");
    console.log("  7. Re-run this script to confirm:  node scripts/diagnose-supabase.js");
    rule();
  }

  process.exit(problems === 0 ? 0 : 1);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { parseEnv, decodeJwt, extractProjectRef, mask, analyzeKey, verdictFor };
