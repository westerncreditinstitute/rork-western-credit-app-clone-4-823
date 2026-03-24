import { GameState, ActivityLogEntry, RandomIncident } from '@/types/game';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function cleanupOldState(state: GameState): GameState {
  const now = Date.now();
  const thirtyDaysAgo = now - THIRTY_DAYS_MS;
  
  const cleanedActivityLog = state.activityLog.filter(
    (entry: ActivityLogEntry) => entry.timestamp > thirtyDaysAgo
  );
  
  const cleanedPendingIncidents = state.pendingIncidents.filter(
    (incident: RandomIncident) => incident.occurredAt > thirtyDaysAgo
  );
  
  const activityLogCleaned = cleanedActivityLog.length !== state.activityLog.length;
  const incidentsCleaned = cleanedPendingIncidents.length !== state.pendingIncidents.length;
  
  if (activityLogCleaned || incidentsCleaned) {
    console.log('[MemoryCleanup] Cleaned old state:', {
      activityLogRemoved: state.activityLog.length - cleanedActivityLog.length,
      incidentsRemoved: state.pendingIncidents.length - cleanedPendingIncidents.length,
    });
  }
  
  return {
    ...state,
    activityLog: cleanedActivityLog,
    pendingIncidents: cleanedPendingIncidents,
  };
}

export function getCleanupStats(state: GameState): {
  oldActivityEntries: number;
  oldIncidents: number;
  needsCleanup: boolean;
} {
  const now = Date.now();
  const thirtyDaysAgo = now - THIRTY_DAYS_MS;
  
  const oldActivityEntries = state.activityLog.filter(
    (entry: ActivityLogEntry) => entry.timestamp <= thirtyDaysAgo
  ).length;
  
  const oldIncidents = state.pendingIncidents.filter(
    (incident: RandomIncident) => incident.occurredAt <= thirtyDaysAgo
  ).length;
  
  return {
    oldActivityEntries,
    oldIncidents,
    needsCleanup: oldActivityEntries > 0 || oldIncidents > 0,
  };
}
