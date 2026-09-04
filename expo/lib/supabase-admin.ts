/**
 * ============================================================
 * SERVER-ONLY Supabase client (service role)
 * ============================================================
 *
 * ⚠️  NEVER import this file from anything under:
 *       app/  components/  contexts/  hooks/
 *     Those directories are bundled into the client app, and importing
 *     this module there would ship the service-role key to every user's
 *     device. Import it ONLY from `backend/`.
 *
 * The service-role key bypasses Row Level Security completely. That is
 * exactly what we want for the tRPC backend — it runs on a server the
 * user cannot read — and exactly what we must never expose to a client.
 *
 * Why this exists
 * ---------------
 * Migrations 020 and 023 enabled RLS on the agent tables but created only
 * SELECT policies, on the assumption that "the backend uses the service-role
 * key". That assumption was false: `lib/supabase.ts` builds one client from
 * the anon key and the backend imported that same client, so every INSERT
 * was silently rejected. Migration 024 unblocked things with permissive
 * policies; this client is the proper fix that lets migration 025 remove
 * them again.
 *
 * Safe fallback
 * -------------
 * If SUPABASE_SERVICE_ROLE_KEY is not set, this falls back to the anon
 * client so nothing breaks mid-migration — behaviour is then identical to
 * today. Check `isServiceRoleConfigured` before you rely on RLS bypass, and
 * do NOT run migration 025 until it reports true.
 */

import { createClient } from "@supabase/supabase-js";

import { supabase as anonClient } from "@/lib/supabase";

// No EXPO_PUBLIC_ prefix — that prefix is what makes a variable public.
// Do not add one, and do not add an EXPO_PUBLIC_ fallback here.
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/** True when a real service-role key is available and RLS will be bypassed. */
export const isServiceRoleConfigured = Boolean(supabaseUrl && serviceRoleKey);

if (!isServiceRoleConfigured) {
  console.warn(
    "[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY is not set — falling back to " +
      "the anon client. Writes still depend on the permissive RLS policies " +
      "from migration 024. Do not run migration 025 until this is configured.",
  );
}

/**
 * Supabase client for backend use. Bypasses RLS when the service-role key
 * is configured; otherwise behaves exactly like the anon client.
 */
export const supabaseAdmin = isServiceRoleConfigured
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        // A server has no user session to persist or refresh, and trying to
        // do so in a non-browser runtime causes noisy storage warnings.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : anonClient;
