/**
 * Local cache of the user's assigned AI agent.
 *
 * The My Agent tab used to be completely unusable whenever the API host was
 * asleep, cold-starting or rate limited: `getMyAgent` was the only source of
 * the agent record, so a single transport failure left `agent` undefined and
 * the screen fell through to the "Couldn't Reach Your Agent" branch - even
 * for users who had been assigned an agent weeks earlier and whose entire
 * conversation history was already on the device.
 *
 * An agent assignment is durable (one row, `UNIQUE(user_id)`, effectively
 * permanent), so the last-known record is a safe thing to paint immediately
 * while the network refresh happens behind it. This mirrors the iOS app,
 * which has always cached the assignment in `UserDefaults` via
 * `AIAgentService.cachedAgent(userId:)`.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AgentInfo } from "@/components/MyAgent/AgentProfileCard";

/** Assignment row as returned by `aiAgents.getMyAgent`. */
export interface AgentAssignmentInfo {
  id: number | string;
  user_id: string;
  agent_id: number | string;
  assigned_at: string;
  is_active: boolean;
}

export interface CachedAgent {
  agent: AgentInfo;
  assignment?: AgentAssignmentInfo | null;
}

/** Namespaced per user so switching accounts never shows the wrong agent. */
function agentCacheKey(userId: string): string {
  return `wci.myagent.${userId}`;
}

/**
 * Last-known agent for this user, for an instant first paint.
 *
 * Never throws: a cache miss, unreadable value or schema drift all resolve to
 * `null` so the caller simply falls back to the network.
 */
export async function readCachedAgent(userId: string): Promise<CachedAgent | null> {
  if (!userId) return null;

  try {
    const stored = await AsyncStorage.getItem(agentCacheKey(userId));
    if (!stored) return null;

    const parsed = JSON.parse(stored) as CachedAgent;
    // Guard against a partially written or older-shaped payload.
    if (!parsed?.agent?.id || !parsed.agent.agent_name) return null;

    return parsed;
  } catch (error) {
    console.log("[MyAgent] Could not read cached agent:", error);
    return null;
  }
}

/** Persists the agent so the next open paints before the network answers. */
export async function writeCachedAgent(
  userId: string,
  value: CachedAgent,
): Promise<void> {
  if (!userId || !value?.agent?.id) return;

  try {
    await AsyncStorage.setItem(agentCacheKey(userId), JSON.stringify(value));
  } catch (error) {
    console.log("[MyAgent] Could not cache agent:", error);
  }
}

/** Drops the cached agent, e.g. when the server reports no active assignment. */
export async function clearCachedAgent(userId: string): Promise<void> {
  if (!userId) return;

  try {
    await AsyncStorage.removeItem(agentCacheKey(userId));
  } catch (error) {
    console.log("[MyAgent] Could not clear cached agent:", error);
  }
}
