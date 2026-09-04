import { useSyncExternalStore } from "react";

import { getConnectionState, subscribeToConnection } from "@/lib/trpc";
import { gameRepository, type SyncActivity } from "@/repositories/GameRepository";

/** What the header indicator reports to the user. */
export type SyncStatus = "synced" | "syncing" | "offline";

/**
 * Module-level bindings so the store functions keep a stable identity across
 * renders. Inline arrows would resubscribe on every render.
 */
const subscribeToSyncActivity = (listener: () => void): (() => void) =>
  gameRepository.subscribeToSyncActivity(listener);

const getSyncActivity = (): SyncActivity => gameRepository.getSyncActivity();

/**
 * Live sync status combining two independent facts:
 *  - can we currently reach the API (proven by real request outcomes), and
 *  - is there local work either in flight or still waiting to be sent.
 *
 * Offline wins over Syncing: if the server is unreachable there is nothing to
 * report progress on, and claiming "Syncing" while nothing can leave the device
 * would be a lie. Pending changes are safe in local storage either way.
 */
export function useSyncStatus(): {
  status: SyncStatus;
  label: string;
  hasPendingChanges: boolean;
} {
  const connection = useSyncExternalStore(
    subscribeToConnection,
    getConnectionState,
    getConnectionState,
  );

  const activity = useSyncExternalStore(
    subscribeToSyncActivity,
    getSyncActivity,
    getSyncActivity,
  );

  const status: SyncStatus =
    connection === "offline"
      ? "offline"
      : activity.isSaving || activity.hasPendingChanges
        ? "syncing"
        : "synced";

  const label: string =
    status === "offline" ? "Offline" : status === "syncing" ? "Syncing" : "Synced";

  return { status, label, hasPendingChanges: activity.hasPendingChanges };
}
