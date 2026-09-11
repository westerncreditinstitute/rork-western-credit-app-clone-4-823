import { useEffect, useState, useCallback, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from '@/lib/trpc';
import { useUser } from './UserContext';
import { notificationService } from '@/services/NotificationService';

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
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  // Tracks which (disputeId, alertType) pairs have already triggered a
  // notification this session/device, loaded from AsyncStorage once per
  // user so alerts survive app restarts without re-firing.
  const sentAlertsRef = useRef<Set<string> | null>(null);
  const lastKnownStatusRef = useRef<Map<string, string>>(new Map());

  const disputesQuery = trpc.disputes.getAll.useQuery(
    { userId: user?.id || '' },
    { 
      enabled: !!user?.id,
      staleTime: 2 * 60 * 1000,
    }
  );

  const analyticsQuery = trpc.disputes.getAnalytics.useQuery(
    { userId: user?.id || '' },
    { 
      enabled: !!user?.id,
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
    if (disputesQuery.data) {
      setDisputes(disputesQuery.data as Dispute[]);
    }
  }, [disputesQuery.data]);

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
              await notificationService.sendDisputeStatusChangedNotification(
                userId,
                dispute.creditor,
                dispute.id,
                dispute.status
              );
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
              await notificationService.sendDisputeOverdueNotification(
                userId,
                dispute.creditor,
                dispute.id,
                dispute.responseBy
              );
              sent.add(key);
              changed = true;
            }
          } else if (remaining <= 7) {
            const key = `due-soon:${dispute.id}:${dispute.responseBy}`;
            if (!sent.has(key)) {
              await notificationService.sendDisputeResponseDueSoonNotification(
                userId,
                dispute.creditor,
                dispute.id,
                dispute.responseBy,
                remaining
              );
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
  }, [user?.id, disputesQuery.data]);

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
      const newDispute = await createDisputeMutation.mutateAsync({
        userId: user.id,
        ...disputeData,
      });
      
      if (newDispute) {
        setDisputes(prev => [...prev, newDispute as Dispute]);
      }
      
      disputesQuery.refetch();
      analyticsQuery.refetch();
      
      return newDispute;
    } catch (error) {
      console.error('Error creating dispute:', error);
      throw error;
    }
  }, [user?.id, createDisputeMutation, disputesQuery, analyticsQuery]);

  const updateDispute = useCallback(async (id: string, updates: Partial<Dispute>) => {
    try {
      const updatedDispute = await updateDisputeMutation.mutateAsync({
        id,
        ...updates,
      });
      
      if (updatedDispute) {
        setDisputes(prev => prev.map(d => d.id === id ? updatedDispute as Dispute : d));
      }
      
      disputesQuery.refetch();
      analyticsQuery.refetch();
      
      return updatedDispute;
    } catch (error) {
      console.error('Error updating dispute:', error);
      throw error;
    }
  }, [updateDisputeMutation, disputesQuery, analyticsQuery]);

  const deleteDispute = useCallback(async (id: string) => {
    try {
      await deleteDisputeMutation.mutateAsync({ id });
      setDisputes(prev => prev.filter(d => d.id !== id));
      disputesQuery.refetch();
      analyticsQuery.refetch();
      return { success: true };
    } catch (error) {
      console.error('Error deleting dispute:', error);
      throw error;
    }
  }, [deleteDisputeMutation, disputesQuery, analyticsQuery]);

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

  const analytics: DisputeAnalytics = analyticsQuery.data || {
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
    createDispute,
    updateDispute,
    deleteDispute,
    addNote,
    addDocument,
    addReminder,
    refetch: disputesQuery.refetch,
  };
});
