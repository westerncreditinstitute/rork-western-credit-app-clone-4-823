/**
 * Local cache of the user's disputes and their analytics counters.
 *
 * The Dispute Tracker derived its list purely from `disputes.getAll`, so any
 * transport failure (sleeping API host, cold start, rate limit) emptied the
 * screen and rendered the "No Disputes Found" empty state. That is a worse
 * failure than an error banner: it tells a user who has filed a dozen disputes
 * that they have none, which reads as data loss on the single most important
 * record in the app.
 *
 * Disputes are append-mostly and server-owned, so the last-known list is safe
 * to paint immediately while the refresh happens behind it. Only a definitive
 * server response replaces the cache — a failed request leaves it untouched,
 * because a network error says nothing about what the user actually has on
 * file. Mirrors the agent cache in `lib/agent-cache.ts`.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

/** Cache envelope. `savedAt` lets the UI say how stale the copy is. */
export interface CachedDisputes<TDispute, TAnalytics> {
  disputes: TDispute[];
  analytics?: TAnalytics | null;
  /** Epoch ms of the successful fetch this snapshot came from. */
  savedAt: number;
}

/** Namespaced per user so switching accounts never shows the wrong disputes. */
function disputesCacheKey(userId: string): string {
  return `wci.disputes.${userId}`;
}

/**
 * Last-known disputes for this user, for an instant first paint.
 *
 * Never throws: a miss, unreadable value or schema drift all resolve to `null`
 * so the caller simply waits for the network.
 */
export async function readCachedDisputes<TDispute, TAnalytics>(
  userId: string,
): Promise<CachedDisputes<TDispute, TAnalytics> | null> {
  if (!userId) return null;

  try {
    const stored = await AsyncStorage.getItem(disputesCacheKey(userId));
    if (!stored) return null;

    const parsed = JSON.parse(stored) as CachedDisputes<TDispute, TAnalytics>;
    // Guard against a partially written or older-shaped payload.
    if (!Array.isArray(parsed?.disputes)) return null;

    return parsed;
  } catch (error) {
    console.log("[Disputes] Could not read cached disputes:", error);
    return null;
  }
}

/** Persists a server-confirmed snapshot of the dispute list. */
export async function writeCachedDisputes<TDispute, TAnalytics>(
  userId: string,
  disputes: TDispute[],
  analytics?: TAnalytics | null,
): Promise<void> {
  if (!userId || !Array.isArray(disputes)) return;

  try {
    const payload: CachedDisputes<TDispute, TAnalytics> = {
      disputes,
      analytics: analytics ?? null,
      savedAt: Date.now(),
    };
    await AsyncStorage.setItem(disputesCacheKey(userId), JSON.stringify(payload));
  } catch (error) {
    console.log("[Disputes] Could not cache disputes:", error);
  }
}

/** Drops the cached list, e.g. on sign-out. */
export async function clearCachedDisputes(userId: string): Promise<void> {
  if (!userId) return;

  try {
    await AsyncStorage.removeItem(disputesCacheKey(userId));
  } catch (error) {
    console.log("[Disputes] Could not clear cached disputes:", error);
  }
}
