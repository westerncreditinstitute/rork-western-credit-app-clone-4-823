import { useEffect, useState, useCallback, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc, trpcClient } from '@/lib/trpc';
import {
  readCachedDisputes,
  writeCachedDisputes,
} from '@/lib/disputes-cache';
import { useUser } from './UserContext';
import { notificationService } from '@/services/NotificationService';
import { useNotifications } from './NotificationContext';
import { testingService } from '@/services/TestingService';

interface TimelineItem {
  date: string;
  action: string;
  note?: string;
}

interface DisputeDocument {
  name: string;
  type: string;
  size: number;
  uploadDate: string;
}

interface Reminder {
  date: string;
  emailReminder: boolean;
  emailAddress?: string;
  sent: boolean;
}

export interface Dispute {
  id: string;
  userId: string;
  creditor: string;
  accountNumber: string;
  disputeType: string;
  dateSent: string;
  status: 'sent' | 'in-progress' | 'resolved' | 'rejected';
  lastUpdated: string;
  responseBy: string;
  letterContent?: string;
  timeline: TimelineItem[];
  documents: DisputeDocument[];
  reminders: Reminder[];
}

interface DisputeAnalytics {
  totalDisputes: number;
  resolvedDisputes: number;
  rejectedDisputes: number;
  pendingDisputes: number;
  successRate: number;
  avgResponseTime: number;
}

// AsyncStorage key prefix used to remember which deadline/status alerts
// have already been sent for a given dispute, so the AI Credit Repair
// Agent's proactive notifications fire once per event instead of every
// time the disputes list refetches (which happens on a 2-minute
// staleTime and after every mutation).
const ALERTS_SENT_KEY_PREFIX = 'wci_dispute_alerts_sent_';

/**
 * TestingService persists a leaner local record than the Supabase-backed
 * shape (no `lastUpdated`/`reminders`, and documents carry no `size`).
 * Normalising here keeps every code path returning a real `Dispute`
 * instead of casting partially-shaped objects through `as Dispute`.
 */
function testDisputeToDispute(test: {
  id: string;
  userId: string;
  creditor: string;
  accountNumber: string;
  disputeType: string;
  dateSent: string;
  status: 'sent' | 'in-progress' | 'resolved' | 'rejected';
  responseBy: string;
  letterContent?: string;
  timeline: TimelineItem[];
  documents: { name: string; type: string; uploadDate: string }[];
  updatedAt: string;
}): Dispute {
  return {
    ...test,
    lastUpdated: test.updatedAt,
    reminders: [],
    documents: test.documents.map((doc) => ({ ...doc, size: 0 })),
  };
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return Number.POSITIVE_INFINITY;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export const [DisputesProvider, useDisputes] = createContextHook(() => {
  const { user } = useUser();
  const { preferences } = useNotifications();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isTestingMode, setIsTestingMode] = useState(false);
  // True while a post-write reconciliation with the server is in flight, so
  // the Dispute Tracker can show "Syncing…" instead of looking frozen
  // between a letter being generated and the refreshed list arriving.
  const [isSyncing, setIsSyncing] = useState(false);
  // When the dispute list was last successfully reconciled with the server.
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  // Tracks which (disputeId, alertType) pairs have already triggered a
  // notification this session/device, loaded from AsyncStorage once per
  // user so alerts survive app restarts without re-firing.
  const sentAlertsRef = useRef<Set<string> | null>(null);
  const lastKnownStatusRef = useRef<Map<string, string>>(new Map());
  // Disputes restored from the device while the network refresh runs. Keeps
  // the tracker showing real records during an outage instead of collapsing
  // to the "No Disputes Found" empty state, which reads as data loss.
  const [cachedAnalytics, setCachedAnalytics] = useState<DisputeAnalytics | null>(null);
  const [isShowingCachedDisputes, setIsShowingCachedDisputes] = useState(false);

  // Initialize testing mode on component mount
  useEffect(() => {
    const checkTestingMode = async () => {
      const testingEnabled = testingService.isTestingModeEnabled();
      setIsTestingMode(testingEnabled);
    };
    checkTestingMode();
  }, []);

  const disputesQuery = trpc.disputes.getAll.useQuery(
    { userId: user?.id || '' },
    { 
      enabled: !!user?.id && !isTestingMode,
      staleTime: 2 * 60 * 1000,
    }
  );

  const analyticsQuery = trpc.disputes.getAnalytics.useQuery(
    { userId: user?.id || '' },
    { 
      enabled: !!user?.id && !isTestingMode,
      staleTime: 2 * 60 * 1000,
    }
  );

  const createDisputeMutation = trpc.disputes.create.useMutation();
  const updateDisputeMutation = trpc.disputes.update.useMutation();
  const deleteDisputeMutation = trpc.disputes.delete.useMutation();
  const addTimelineEntryMutation = trpc.disputes.addTimelineEntry.useMutation();
  const addDocumentMutation = trpc.disputes.addDocument.useMutation();
  const addReminderMutation = trpc.disputes.addReminder.useMutation();

  useEffect(() => {
    const loadDisputes = async () => {
      try {
        if (isTestingMode && user?.id) {
          // Load disputes from TestingService in testing mode
          const testDisputes = await testingService.getTestDisputes(user.id);
          setDisputes(testDisputes.map(testDisputeToDispute));
          setLastSyncedAt(Date.now());
        } else if (disputesQuery.data) {
          // Load from Supabase in production mode. A server-confirmed list is
          // authoritative, so it both replaces state and refreshes the cache.
          const fetched = disputesQuery.data as Dispute[];
          setDisputes(fetched);
          setLastSyncedAt(Date.now());
          setIsShowingCachedDisputes(false);
          setCachedAnalytics(null);
          if (user?.id) {
            await writeCachedDisputes(user.id, fetched, analyticsQuery.data ?? null);
          }
        }
      } catch (error) {
        console.error('[DisputesContext] Error loading disputes:', error);
      }
    };
    loadDisputes();
  }, [disputesQuery.data, analyticsQuery.data, isTestingMode, user?.id]);

  // Restore the last-known list when the server can't be reached. Runs only
  // while there is nothing on screen and no successful fetch has landed, so a
  // real (possibly empty) server response always wins over the cache.
  useEffect(() => {
    const userId = user?.id;
    if (!userId || isTestingMode) return;
    if (disputesQuery.isSuccess || disputes.length > 0) return;
    if (!disputesQuery.isError) return;

    let active = true;
    (async () => {
      const cached = await readCachedDisputes<Dispute, DisputeAnalytics>(userId);
      if (!active || !cached || cached.disputes.length === 0) return;

      setDisputes(cached.disputes);
      setCachedAnalytics(cached.analytics ?? null);
      setLastSyncedAt(cached.savedAt);
      setIsShowingCachedDisputes(true);
    })();

    return () => {
      active = false;
    };
  }, [
    user?.id,
    isTestingMode,
    disputesQuery.isError,
    disputesQuery.isSuccess,
    disputes.length,
  ]);

  // ── Proactive dispute alerts ──────────────────────────────────
  // Whenever the dispute list is (re)loaded, check each dispute's 30-day
  // response deadline and status for anything the user needs to know
  // about, and fire a notification through the same NotificationService
  // used app-wide. This is what makes the AI Credit Repair Agent proactive
  // instead of only answering when asked — deadlines and status changes
  // surface as real alerts (badge + notification center) without the user
  // having to open the Dispute Tracker to find out.
  useEffect(() => {
    if (!user?.id || !disputesQuery.data) return;
    const userId = user.id;
    const list = disputesQuery.data as Dispute[];
    // Preferences default to enabled while still loading (matches
    // DEFAULT_NOTIFICATION_PREFERENCES) so alerts aren't silently
    // dropped just because the preferences query hasn't resolved yet.
    // When the user has explicitly turned off "Dispute Alerts" in
    // Settings > Notifications, this effect still tracks status/deadline
    // state below (so nothing "catches up" with a flood of alerts the
    // moment the toggle is turned back on) but skips actually creating
    // any notification.
    const alertsEnabled = preferences?.disputeAlerts ?? true;

    (async () => {
      try {
        if (!sentAlertsRef.current) {
          const raw = await AsyncStorage.getItem(`${ALERTS_SENT_KEY_PREFIX}${userId}`);
          sentAlertsRef.current = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
        }
        const sent = sentAlertsRef.current;
        let changed = false;

        for (const dispute of list) {
          // Status-change alerts: only meaningful once we've observed a
          // dispute's previous status, so the very first load (nothing to
          // compare against yet) never fires a spurious "changed" alert.
          const previousStatus = lastKnownStatusRef.current.get(dispute.id);
          if (previousStatus && previousStatus !== dispute.status) {
            const key = `status:${dispute.id}:${dispute.status}:${dispute.lastUpdated}`;
            if (!sent.has(key)) {
              if (alertsEnabled) {
                await notificationService.sendDisputeStatusChangedNotification(
                  userId,
                  dispute.creditor,
                  dispute.id,
                  dispute.status
                );
              }
              sent.add(key);
              changed = true;
            }
          }
          lastKnownStatusRef.current.set(dispute.id, dispute.status);

          // Deadline alerts only make sense while a dispute is still open.
          if (dispute.status === 'resolved' || dispute.status === 'rejected') continue;
          if (!dispute.responseBy) continue;

          const remaining = daysUntil(dispute.responseBy);

          if (remaining < 0) {
            const key = `overdue:${dispute.id}:${dispute.responseBy}`;
            if (!sent.has(key)) {
              if (alertsEnabled) {
                await notificationService.sendDisputeOverdueNotification(
                  userId,
                  dispute.creditor,
                  dispute.id,
                  dispute.responseBy
                );
                // The in-app notification above only reaches the user
                // while the app is open/foregrounded. Overdue disputes
                // are the highest-priority case (an FCRA deadline has
                // already passed), so this is also the one alert type
                // routed through a real push notification that can
                // reach the user's device even if the app is closed.
                await trpcClient.pushTokens.sendDisputeOverdue
                  .mutate({
                    userId,
                    creditor: dispute.creditor,
                    disputeId: dispute.id,
                    responseBy: dispute.responseBy,
                  })
                  .catch((err: unknown) => {
                    console.error('[DisputesContext] Push send for overdue dispute failed:', err);
                  });
              }
              sent.add(key);
              changed = true;
            }
          } else if (remaining <= 7) {
            const key = `due-soon:${dispute.id}:${dispute.responseBy}`;
            if (!sent.has(key)) {
              if (alertsEnabled) {
                await notificationService.sendDisputeResponseDueSoonNotification(
                  userId,
                  dispute.creditor,
                  dispute.id,
                  dispute.responseBy,
                  remaining
                );
              }
              sent.add(key);
              changed = true;
            }
          }
        }

        if (changed) {
          await AsyncStorage.setItem(
            `${ALERTS_SENT_KEY_PREFIX}${userId}`,
            JSON.stringify(Array.from(sent))
          );
        }
      } catch (error) {
        // Alerts are a best-effort convenience — never let a failure here
        // affect the dispute list itself.
        console.error('[DisputesContext] Error processing dispute alerts:', error);
      }
    })();
  }, [user?.id, disputesQuery.data, preferences?.disputeAlerts]);

  /**
   * Inserts or replaces a dispute in local state, keyed by id.
   *
   * New records go to the front because the server returns the list ordered
   * by `date_sent` descending - appending would park a just-created dispute
   * at the bottom of the tracker until the next refetch reordered it.
   * Matching on id also makes this safe to call with a record that is
   * already present (e.g. a server-created letter a refetch beat us to),
   * so no dispute can ever appear twice.
   */
  const upsertDispute = useCallback((incoming: Dispute) => {
    setDisputes((prev) => {
      const index = prev.findIndex((d) => d.id === incoming.id);
      if (index === -1) return [incoming, ...prev];
      const next = [...prev];
      next[index] = incoming;
      return next;
    });
  }, []);

  /**
   * Reconciles the local list and analytics with the server.
   *
   * Exposed (and awaited) rather than fire-and-forget so callers can show a
   * real progress state and know when the tracker is actually up to date.
   */
  const refreshDisputes = useCallback(async () => {
    if (isTestingMode) {
      if (!user?.id) return;
      const testDisputes = await testingService.getTestDisputes(user.id);
      setDisputes(testDisputes.map(testDisputeToDispute));
      setLastSyncedAt(Date.now());
      return;
    }

    setIsSyncing(true);
    try {
      await Promise.all([disputesQuery.refetch(), analyticsQuery.refetch()]);
      setLastSyncedAt(Date.now());
    } catch (error) {
      // A failed refresh keeps whatever is already on screen; the sync
      // indicator simply stops reporting "just now".
      console.log('[DisputesContext] Refresh failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isTestingMode, user?.id, disputesQuery, analyticsQuery]);

  /**
   * Pulls a dispute that the *server* created into the tracker.
   *
   * The AI agent's `generateLetter` mutation writes the dispute row directly
   * in the backend, so nothing in this context ever learned about it and the
   * letter stayed invisible until the 2-minute staleTime lapsed. Calling
   * `createDispute` from that flow would insert a second, duplicate row -
   * the record already exists, it only has to be fetched.
   *
   * Fetching the single row first makes the new letter appear immediately;
   * the full refresh then reconciles ordering and the analytics counters.
   */
  const syncServerCreatedDispute = useCallback(async (disputeId?: string) => {
    if (!user?.id || isTestingMode) {
      await refreshDisputes();
      return;
    }

    if (disputeId) {
      setIsSyncing(true);
      try {
        const dispute = await trpcClient.disputes.getById.query({ id: disputeId });
        if (dispute) {
          upsertDispute(dispute as Dispute);
        }
      } catch (error) {
        // Non-fatal: the full refresh below still picks the dispute up, it
        // just takes a round-trip longer to appear.
        console.log('[DisputesContext] Could not fetch server-created dispute:', error);
      } finally {
        setIsSyncing(false);
      }
    }

    await refreshDisputes();
  }, [user?.id, isTestingMode, upsertDispute, refreshDisputes]);

  const createDispute = useCallback(async (disputeData: {
    creditor: string;
    accountNumber: string;
    disputeType: string;
    dateSent: string;
    status: 'sent' | 'in-progress' | 'resolved' | 'rejected';
    responseBy: string;
    letterContent?: string;
    notes?: string;
  }) => {
    if (!user?.id) {
      // Previously silently returned null here, so a caller with no
      // signed-in user would think the dispute saved when nothing
      // happened at all. Throw instead so the UI can show a real error
      // (this mirrors why disputes/letters were reported as "not saving").
      throw new Error(
        'You need to be signed in to save a dispute. Try logging out and back in.'
      );
    }

    try {
      let newDispute: Dispute | undefined;
      
      if (isTestingMode) {
        // Use TestingService for local testing
        // TestingService stores a leaner local record (no lastUpdated /
        // reminders) than the Supabase-backed shape, so fill those in rather
        // than casting a partially-shaped object through as a full Dispute.
        const testDispute = await testingService.createTestDispute(user.id, {
          creditor: disputeData.creditor,
          accountNumber: disputeData.accountNumber,
          disputeType: disputeData.disputeType,
        });
        newDispute = testDisputeToDispute(testDispute);
        upsertDispute(newDispute);
      } else {
        // Use Supabase for production
        newDispute = (await createDisputeMutation.mutateAsync({
          userId: user.id,
          ...disputeData,
        })) as Dispute;
        
        if (newDispute) {
          // Show it immediately, then reconcile with the server so the
          // analytics counters and ordering catch up too.
          upsertDispute(newDispute);
        }
        
        await refreshDisputes();
      }
      
      return newDispute;
    } catch (error) {
      console.error('Error creating dispute:', error);
      throw error;
    }
  }, [user?.id, isTestingMode, createDisputeMutation, upsertDispute, refreshDisputes]);

  const updateDispute = useCallback(async (id: string, updates: Partial<Dispute>) => {
    try {
      let updatedDispute: Dispute | undefined;
      
      if (isTestingMode) {
        const testUpdated = await testingService.updateTestDispute(id, updates);
        updatedDispute = testUpdated ? testDisputeToDispute(testUpdated) : undefined;
        if (updatedDispute) {
          upsertDispute(updatedDispute);
        }
      } else {
        updatedDispute = (await updateDisputeMutation.mutateAsync({
          id,
          ...updates,
        })) as Dispute;
        
        if (updatedDispute) {
          upsertDispute(updatedDispute);
        }
        
        await refreshDisputes();
      }
      
      return updatedDispute;
    } catch (error) {
      console.error('Error updating dispute:', error);
      throw error;
    }
  }, [isTestingMode, updateDisputeMutation, upsertDispute, refreshDisputes]);

  const deleteDispute = useCallback(async (id: string) => {
    try {
      if (isTestingMode) {
        const success = await testingService.deleteTestDispute(id);
        if (success) {
          setDisputes(prev => prev.filter(d => d.id !== id));
        }
      } else {
        await deleteDisputeMutation.mutateAsync({ id });
        setDisputes(prev => prev.filter(d => d.id !== id));
        await refreshDisputes();
      }
      return { success: true };
    } catch (error) {
      console.error('Error deleting dispute:', error);
      throw error;
    }
  }, [isTestingMode, deleteDisputeMutation, refreshDisputes]);

  const addNote = useCallback(async (
    id: string, 
    note: string, 
    newStatus?: 'sent' | 'in-progress' | 'resolved' | 'rejected'
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const dispute = disputes.find(d => d.id === id);
    
    const entry: TimelineItem = {
      date: today,
      action: newStatus && dispute?.status !== newStatus
        ? `Status updated from ${dispute?.status} to ${newStatus}`
        : 'Note added',
      note,
    };

    try {
      const result = await addTimelineEntryMutation.mutateAsync({
        id,
        entry,
        newStatus,
      });
      
      disputesQuery.refetch();
      analyticsQuery.refetch();
      
      return result;
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  }, [disputes, addTimelineEntryMutation, disputesQuery, analyticsQuery]);

  const addDocument = useCallback(async (id: string, document: DisputeDocument) => {
    try {
      const result = await addDocumentMutation.mutateAsync({
        id,
        document,
      });
      
      disputesQuery.refetch();
      
      return result;
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  }, [addDocumentMutation, disputesQuery]);

  const addReminder = useCallback(async (id: string, reminder: Reminder) => {
    try {
      const result = await addReminderMutation.mutateAsync({
        id,
        reminder,
      });
      
      disputesQuery.refetch();
      
      return result;
    } catch (error) {
      console.error('Error adding reminder:', error);
      throw error;
    }
  }, [addReminderMutation, disputesQuery]);

  // Server analytics win; the cached copy covers an outage; otherwise derive
  // the counters from whatever list is on screen so the dashboard is never
  // blank while real disputes are displayed beneath it.
  const analytics: DisputeAnalytics = analyticsQuery.data || cachedAnalytics || {
    totalDisputes: disputes.length,
    resolvedDisputes: disputes.filter(d => d.status === 'resolved').length,
    rejectedDisputes: disputes.filter(d => d.status === 'rejected').length,
    pendingDisputes: disputes.filter(d => d.status !== 'resolved' && d.status !== 'rejected').length,
    successRate: disputes.length > 0 
      ? Math.round((disputes.filter(d => d.status === 'resolved').length / disputes.length) * 100) 
      : 0,
    avgResponseTime: 0,
  };

  return {
    disputes,
    analytics,
    isLoading: disputesQuery.isLoading,
    /** True while a post-write reconciliation with the server is in flight. */
    isSyncing: isSyncing || disputesQuery.isRefetching,
    /** Epoch ms of the last successful server reconciliation, or null. */
    lastSyncedAt,
    /**
     * True when the list on screen was restored from the device because the
     * server is unreachable. Lets the tracker say so instead of implying the
     * disputes are gone.
     */
    isShowingCachedDisputes,
    createDispute,
    updateDispute,
    deleteDispute,
    addNote,
    addDocument,
    addReminder,
    /** Pulls a dispute created directly by the backend into the tracker. */
    syncServerCreatedDispute,
    /** Awaitable full reconciliation of the list and analytics. */
    refreshDisputes,
    refetch: disputesQuery.refetch,
  };
});
