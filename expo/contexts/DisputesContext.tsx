import { useEffect, useState, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { trpc } from '@/lib/trpc';
import { useUser } from './UserContext';

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

export const [DisputesProvider, useDisputes] = createContextHook(() => {
  const { user } = useUser();
  const [disputes, setDisputes] = useState<Dispute[]>([]);

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
    if (!user?.id) return null;

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
