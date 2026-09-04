/**
 * GET /system-status  (also mounted at /api/system-status — see backend/hono.ts)
 *
 * Log-free verification of the Supabase service-role configuration.
 *
 * Why this exists: `lib/supabase-admin.ts` announces a missing key with a
 * console.warn at startup, but the Rork-hosted backend is serverless with no
 * user-facing log viewer, so that warning cannot be checked in production.
 * This endpoint reports the same information over HTTP — and goes further
 * than a log line ever could:
 *
 *   1. It decodes the key's JWT claims locally (no JWT secret needed) to
 *      catch the common copy/paste mistakes: the anon key pasted into the
 *      service-role variable, a publishable client key, a truncated paste,
 *      or a key issued by a different Supabase project.
 *   2. It live-probes Supabase with the exact client the backend actually
 *      built, so a `configured` response proves the key works end to end
 *      before migration 025 locks the tables down.
 *
 * Security: the response contains only booleans, classifications, and error
 * codes. The key itself, the project URL, and the project ref are never
 * echoed. (The URL and anon key are already public in the app bundle; the
 * service-role key must never appear anywhere.)
 */
import { isServiceRoleConfigured, supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Snapshot at server start — deliberately the same moment
 * `lib/supabase-admin.ts` builds its client, so this reports what the real
 * client actually did, not what the environment looks like right now.
 */
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "";

export type ServiceRoleStatus =
  | "configured" // decodes as service_role AND Supabase accepted it live
  | "configured_unverified" // decodes as service_role, but probe couldn't reach Supabase
  | "not_set" // env var empty — backend on the anon fallback
  | "invalid_key" // not a recognizable key (truncated paste / auth token)
  | "wrong_key_anon" // the anon key was pasted into the service-role variable
  | "wrong_key_publishable" // a sb_publishable_ client key was pasted
  | "key_rejected" // decodes fine but Supabase rejects it (rotated secret)
  | "project_mismatch"; // key belongs to a different project than the URL

interface SystemStatusResponse {
  status: "ok";
  service: string;
  time: string;
  supabase: {
    urlConfigured: boolean;
    serviceRoleConfigured: boolean;
    activeClient: "service_role" | "anon_fallback";
    keyType: ServiceRoleStatus;
    projectRefMatches: boolean | null;
    message: string;
    action: string;
    probe: {
      client: "service_role" | "anon_fallback";
      authenticated: boolean | null;
      detail: string;
    };
  };
}

interface KeyClaims {
  role?: unknown;
  ref?: unknown;
}

/**
 * Decodes the payload segment of a JWT without verifying the signature.
 * Signature verification is PostgREST's job at request time — this decode is
 * only used to classify *which kind of key* was pasted, which the signature
 * can't tell us anyway. Never throws.
 */
function decodeJwtPayload(token: string): KeyClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((ch) => "%" + ("00" + ch.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as KeyClaims) : null;
  } catch {
    return null;
  }
}

/**
 * Extracts the 20-char project ref from a hosted Supabase URL. Returns null
 * for custom domains / self-hosted URLs, in which case the ref cross-check is
 * simply skipped. The optional port only exists so local mock tests can use
 * http://<ref>.supabase.co:<port>; real Supabase URLs never carry one.
 */
function projectRefFromUrl(url: string): string | null {
  const match = url.match(
    /^https?:\/\/([a-z0-9]{20})\.supabase\.co(?::\d+)?\/?.*$/i,
  );
  return match ? match[1] : null;
}

/**
 * Live-probes the admin client with a cheap HEAD count on `ai_agent_pool`.
 * That table is the right probe target because migration 020 never enabled
 * RLS on it, so every role can read it — the probe measures the *key*, not
 * the policies.
 *
 * PostgREST verifies the request's JWT before any SQL runs, so any
 * SQL-level response — success OR a database error such as 42P01 (table
 * missing, migration 020 not run) — proves the key itself was accepted.
 * Only a 401-style rejection means the key is wrong, expired, or signed
 * with a different project's JWT secret.
 */
async function probeAdminClient(): Promise<{
  client: "service_role" | "anon_fallback";
  authenticated: boolean | null;
  detail: string;
}> {
  // Which client the probe actually exercised. Without this label, an
  // "authenticated: true" from the anon fallback could be misread as proof
  // that the service-role key works — the exact mistake that must not happen
  // before migration 025 removes the permissive policies.
  const client: "service_role" | "anon_fallback" = isServiceRoleConfigured
    ? "service_role"
    : "anon_fallback";

  try {
    const { error } = await supabaseAdmin
      .from("ai_agent_pool")
      .select("id", { count: "exact", head: true });

    if (!error) {
      return { client, authenticated: true, detail: "read ok (ai_agent_pool)" };
    }

    const code = (error as { code?: string }).code || "";
    const message = error.message || "";
    const authRejected =
      /invalid api key/i.test(message) ||
      (code === "PGRST301" && !/permission denied|rls/i.test(message)) ||
      (/jwt/i.test(message) &&
        /invalid|expired|differ|secret|signature/i.test(message));

    if (authRejected) {
      return {
        client,
        authenticated: false,
        detail: `key rejected (${code || "401"}): ${message}`,
      };
    }

    // A database-level error still proves authentication succeeded.
    return {
      client,
      authenticated: true,
      detail: `authenticated; database said (${code || "no code"}): ${message}`,
    };
  } catch (error) {
    return {
      client,
      authenticated: null,
      detail: `unreachable: ${(error as Error).message}`,
    };
  }
}

/** Builds the full status payload. Async because of the live probe. */
export async function getSystemStatus(): Promise<SystemStatusResponse> {
  const urlConfigured = Boolean(SUPABASE_URL);
  const claims = SERVICE_ROLE_KEY ? decodeJwtPayload(SERVICE_ROLE_KEY) : null;
  const urlRef = projectRefFromUrl(SUPABASE_URL);

  const probe = await probeAdminClient();

  let keyType: ServiceRoleStatus;
  let message: string;
  let action: string;

  if (!SERVICE_ROLE_KEY) {
    keyType = "not_set";
    message =
      "SUPABASE_SERVICE_ROLE_KEY is not set — the backend is using the anon " +
      "client, so writes depend on the permissive RLS policies from migration 024." +
      (urlConfigured ? "" : " SUPABASE_URL is not set either.");
    action =
      "Add SUPABASE_SERVICE_ROLE_KEY in Rork Secrets as a server-side secret " +
      "(no EXPO_PUBLIC_ prefix), then redeploy. Do not run migration 025 until " +
      "this endpoint reports 'configured'.";
  } else if (SERVICE_ROLE_KEY.startsWith("sb_publishable_")) {
    keyType = "wrong_key_publishable";
    message =
      "The value in SUPABASE_SERVICE_ROLE_KEY is a publishable (client) key. " +
      "It authenticates as the anon role and cannot bypass RLS.";
    action =
      "In Supabase → Project Settings → API, copy the service_role secret " +
      "(a legacy JWT or sb_secret_… key) into SUPABASE_SERVICE_ROLE_KEY, then redeploy.";
  } else if (SERVICE_ROLE_KEY.startsWith("sb_secret_")) {
    // New-style secret key: opaque, so it cannot be decoded or cross-checked
    // locally — the live probe is the only evidence, and it is sufficient.
    if (probe.authenticated === false) {
      keyType = "key_rejected";
      message =
        "The value looks like a new-format secret key, but Supabase rejected it.";
      action =
        "Re-copy the current secret key from Supabase → Project Settings → API " +
        "and redeploy. Confirm the key and SUPABASE_URL belong to the same project.";
    } else if (probe.authenticated === null) {
      keyType = "configured_unverified";
      message =
        "The value looks like a new-format secret key, but the live probe could " +
        "not reach Supabase, so it is not proven end to end.";
      action =
        "Retry this endpoint. If it persists, check SUPABASE_URL and the " +
        "Supabase project's status.";
    } else {
      keyType = "configured";
      message =
        "The backend is using the service-role key and Supabase accepted it — " +
        "writes bypass RLS. It is now safe to run migration 025.";
      action =
        "Run migrations/025_lock_down_agent_rls.sql to drop the permissive " +
        "write policies from migration 024.";
    }
  } else if (!claims) {
    keyType = "invalid_key";
    message =
      "SUPABASE_SERVICE_ROLE_KEY is set, but the value is not a recognizable " +
      "key — not a JWT and not a new-format secret. A truncated paste is the " +
      "usual cause.";
    action =
      "Re-copy the full service_role key from Supabase → Project Settings → " +
      "API and redeploy.";
  } else if (claims.role === "anon") {
    keyType = "wrong_key_anon";
    message =
      "The anon key was pasted into SUPABASE_SERVICE_ROLE_KEY. It is a valid " +
      "key, but it authenticates as the anon role — RLS still blocks writes, " +
      "and the startup warning disappears, so nothing else will tell you.";
    action =
      "Copy the service_role key instead (its JWT payload decodes with " +
      '"role": "service_role"), then redeploy.';
  } else if (claims.role !== "service_role") {
    keyType = "invalid_key";
    message =
      "SUPABASE_SERVICE_ROLE_KEY holds a JWT, but its role claim is " +
      `"${String(claims.role)}", not "service_role". A logged-in user's auth ` +
      "token looks like this — it is not a server key.";
    action =
      "Copy the service_role key from Supabase → Project Settings → API " +
      "(Project API keys section), then redeploy.";
  } else if (urlRef && typeof claims.ref === "string" && claims.ref !== urlRef) {
    keyType = "project_mismatch";
    message =
      "The key decodes as a service_role key, but it was issued by a different " +
      "Supabase project than SUPABASE_URL points at.";
    action =
      "Make sure the key and the URL come from the same Supabase project, " +
      "then redeploy.";
  } else if (probe.authenticated === false) {
    keyType = "key_rejected";
    message =
      "The key decodes as a service_role key, but Supabase rejected it — the " +
      "signature did not verify. The project's JWT secret was likely rotated " +
      "after this key was issued (or it came from another project).";
    action =
      "Re-copy the current service_role key from Supabase → Project Settings → " +
      "API and redeploy.";
  } else if (probe.authenticated === null) {
    keyType = "configured_unverified";
    message =
      "The key decodes as a service_role key, but the backend could not reach " +
      "Supabase to prove it end to end (network error).";
    action =
      "Retry this endpoint. If it persists, check SUPABASE_URL and the " +
      "Supabase project's status.";
  } else {
    keyType = "configured";
    message =
      "The backend is using the service-role key and Supabase accepted it — " +
      "writes bypass RLS. It is now safe to run migration 025.";
    action =
      "Run migrations/025_lock_down_agent_rls.sql to drop the permissive " +
      "write policies from migration 024.";
    if (/PGRST205|42P01/.test(probe.detail)) {
      message +=
        " (Note: the probe table ai_agent_pool is missing — run migration 020 " +
        "before relying on the agent feature.)";
    }
  }

  const activeClient: "service_role" | "anon_fallback" =
    !isServiceRoleConfigured ||
    keyType === "wrong_key_anon" ||
    keyType === "wrong_key_publishable"
      ? "anon_fallback"
      : "service_role";

  return {
    status: "ok",
    service: "western-credit-api",
    time: new Date().toISOString(),
    supabase: {
      urlConfigured,
      serviceRoleConfigured: isServiceRoleConfigured,
      activeClient,
      keyType,
      projectRefMatches:
        typeof claims?.ref === "string" && urlRef ? claims.ref === urlRef : null,
      message,
      action,
      probe,
    },
  };
}
