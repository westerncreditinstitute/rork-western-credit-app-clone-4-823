/**
 * Direct-to-database agent lookup, used only when the tRPC API is unreachable.
 *
 * Normally `aiAgents.getMyAgent` runs on the Rork-hosted backend. When that host
 * is down it answers 504 (or times out) at the edge before our code ever runs,
 * and the My Agent tab dead-ends on "Can't reach the server right now" — even
 * though the assignment is sitting in Supabase, which is a *separate* host that
 * keeps answering in well under a second.
 *
 * This mirrors `direct-auth.ts`: a deliberately narrow, read-only path that
 * resolves the user's existing agent so the console still opens during an API
 * outage. It can never create or change an assignment — assigning a brand-new
 * agent still requires the API, because that needs the pool capacity bookkeeping
 * the backend owns.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Whether a direct fallback is even possible on this build. */
export const DIRECT_AGENT_AVAILABLE: boolean = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY,
);

/** The database is fast when it is up; a slow answer means something is wrong. */
const REQUEST_TIMEOUT_MS = 12000;

/** Columns on `ai_agent_pool`, as the table actually exists. */
const AGENT_COLUMNS =
  "id,agent_name,avatar_url,bio,specialty,max_users,current_user_count,is_active";

interface AssignmentRow {
  id: string;
  user_id: string;
  agent_id: number;
  assigned_at: string;
  is_active: boolean;
}

interface AgentRow {
  id: number;
  agent_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  specialty: string | null;
  max_users: number | null;
  current_user_count: number | null;
  is_active: boolean | null;
}

export interface DirectAgentResult {
  agent: {
    id: number;
    agent_name: string;
    avatar_url: string | null;
    bio: string | null;
    specialty: string | null;
    max_users: number | null;
    current_user_count: number | null;
    is_active: boolean;
  };
  assignment: AssignmentRow;
}

/**
 * Outcome of a direct agent lookup.
 *
 * `none` (the user genuinely has no assignment) is kept distinct from
 * `unavailable` (we could not check). Collapsing them would let an outage
 * look like "you have no agent" and trigger a pointless assign attempt.
 */
export type DirectAgentOutcome =
  | { status: "success"; result: DirectAgentResult }
  | { status: "none" }
  | { status: "unavailable"; reason: string };

async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Database answered ${response.status}`);
  }

  return (await response.json()) as T;
}

/**
 * Looks up the user's active agent straight from the database.
 *
 * The assignment and the agent profile are fetched as two separate requests
 * rather than one embedded join: PostgREST resolves an embed with the *caller's*
 * grants, so a single joined query fails outright if the pool table is not
 * readable by the anon role. Split, a readable assignment still yields a usable
 * result even when the profile lookup is refused.
 */
export async function fetchAgentDirect(
  userId: string,
): Promise<DirectAgentOutcome> {
  if (!DIRECT_AGENT_AVAILABLE) {
    return {
      status: "unavailable",
      reason: "Database credentials are not configured",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const assignments = await getJson<AssignmentRow[]>(
      `user_agent_assignments?select=id,user_id,agent_id,assigned_at,is_active` +
        `&user_id=eq.${encodeURIComponent(userId)}` +
        `&is_active=eq.true&limit=1`,
      controller.signal,
    );

    const assignment = assignments[0];

    // An empty list here is authoritative: this user has no active agent.
    if (!assignment) return { status: "none" };

    let agentRow: AgentRow | undefined;
    try {
      const agents = await getJson<AgentRow[]>(
        `ai_agent_pool?select=${AGENT_COLUMNS}` +
          `&id=eq.${assignment.agent_id}&limit=1`,
        controller.signal,
      );
      agentRow = agents[0];
    } catch (error) {
      // The pool table is not granted to the anon role on this project
      // (Postgres 42501). The assignment is still real and known-good, so the
      // console opens with the identity we can prove rather than dead-ending.
      console.warn(
        "[DirectAgent] Agent profile unavailable, using assignment only:",
        error instanceof Error ? error.message : "unknown error",
      );
    }

    return {
      status: "success",
      result: {
        assignment,
        agent: {
          id: assignment.agent_id,
          agent_name: agentRow?.agent_name ?? `Agent #${assignment.agent_id}`,
          avatar_url: agentRow?.avatar_url ?? null,
          bio: agentRow?.bio ?? null,
          specialty: agentRow?.specialty ?? null,
          max_users: agentRow?.max_users ?? null,
          current_user_count: agentRow?.current_user_count ?? null,
          is_active: agentRow?.is_active ?? true,
        },
      },
    };
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.name === "AbortError"
          ? "The database took too long to answer"
          : error.message
        : "Could not reach the database";
    return { status: "unavailable", reason };
  } finally {
    clearTimeout(timeoutId);
  }
}
