import * as Crypto from "expo-crypto";

/**
 * Direct-to-database sign in, used only when the tRPC API cannot be reached.
 *
 * Normally login goes through `users.login` on the Rork-hosted backend. When
 * that host is down (it answers 503 at the edge before our code ever runs),
 * every sign in failed with "Can't reach the server right now" even though the
 * database itself was healthy and answering in well under a second.
 *
 * Supabase is a separate host, reachable straight from the app, so it can
 * still verify a password when the API tier is unavailable. This module is
 * deliberately narrow: it verifies credentials and returns the profile, and
 * does nothing else.
 *
 * Security notes:
 * - The password hash is sent as a *filter*, never selected. The query returns
 *   a row only when email AND hash both match, so no hash is ever downloaded
 *   to the device and a wrong password returns an empty list.
 * - A no-match is reported as `invalid_credentials`, never as success. This
 *   path can reject a login but can never invent an account.
 * - The hash algorithm mirrors the backend exactly (unsalted SHA-256, lower
 *   case hex). If the backend's hashing changes, this must change with it.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Whether a direct fallback is even possible on this build. */
export const DIRECT_AUTH_AVAILABLE: boolean = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Columns needed to build the session. `password_hash` is never among them. */
const PROFILE_COLUMNS =
  "id,email,name,phone,avatar,member_since,role,courses_completed,total_earnings,referrals,created_at";

/** The database is fast when it is up; a slow answer means something is wrong. */
const REQUEST_TIMEOUT_MS = 12000;

interface DbRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatar: string | null;
  member_since: string | null;
  role: string | null;
  courses_completed: number | null;
  total_earnings: number | null;
  referrals: number | null;
  created_at: string;
}

export interface DirectAuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  memberSince: string;
  role: string;
  coursesCompleted: number;
  totalEarnings: number;
  referrals: number;
  createdAt: string;
}

/**
 * Outcome of a direct sign in attempt.
 *
 * `unavailable` is kept distinct from `invalid_credentials` on purpose: the
 * first means "we could not check", the second means "we checked and it was
 * wrong". Collapsing them would tell a user with a correct password that their
 * password was wrong.
 */
export type DirectLoginOutcome =
  | { status: "success"; user: DirectAuthUser }
  | { status: "invalid_credentials" }
  | { status: "unavailable"; reason: string };

/** Mirrors the backend's `hashPassword`: unsalted SHA-256, lower case hex. */
async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}

function rowToUser(row: DbRow): DirectAuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? row.email.split("@")[0] ?? "Member",
    phone: row.phone ?? "",
    avatar: row.avatar ?? "",
    memberSince: row.member_since ?? "",
    role: row.role ?? "Student",
    coursesCompleted: row.courses_completed ?? 0,
    totalEarnings: row.total_earnings ?? 0,
    referrals: row.referrals ?? 0,
    createdAt: row.created_at,
  };
}

/**
 * Verifies credentials straight against the database.
 *
 * Returns `unavailable` for anything that is not a definitive answer, so the
 * caller can keep showing a retry prompt rather than a credential error.
 */
export async function loginDirect(
  email: string,
  password: string,
): Promise<DirectLoginOutcome> {
  if (!DIRECT_AUTH_AVAILABLE) {
    return { status: "unavailable", reason: "Database credentials are not configured" };
  }

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(password);
  } catch {
    // Never surface the password or the hash.
    return { status: "unavailable", reason: "Could not hash the password on this device" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("Timeout"), REQUEST_TIMEOUT_MS);

  try {
    const query =
      `${SUPABASE_URL}/rest/v1/users` +
      `?select=${PROFILE_COLUMNS}` +
      `&email=eq.${encodeURIComponent(email.toLowerCase().trim())}` +
      `&password_hash=eq.${encodeURIComponent(passwordHash)}` +
      `&limit=1`;

    const response = await fetch(query, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        status: "unavailable",
        reason: `Database answered ${response.status}`,
      };
    }

    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) {
      return { status: "unavailable", reason: "Unexpected response shape" };
    }

    // Empty means the email/hash pair matched nothing. The database answered,
    // so this is a real rejection rather than an outage.
    if (rows.length === 0) {
      return { status: "invalid_credentials" };
    }

    const row = rows[0] as DbRow;
    if (!row?.id || !row?.email) {
      return { status: "unavailable", reason: "Profile row was incomplete" };
    }

    return { status: "success", user: rowToUser(row) };
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? "Database request timed out"
        : "Database was unreachable";
    return { status: "unavailable", reason };
  } finally {
    clearTimeout(timeoutId);
  }
}
