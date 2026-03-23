import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { supabase } from "@/lib/supabase";

const timelineItemSchema = z.object({
  date: z.string(),
  action: z.string(),
  note: z.string().optional(),
});

const documentSchema = z.object({
  name: z.string(),
  type: z.string(),
  size: z.number(),
  uploadDate: z.string(),
});

const reminderSchema = z.object({
  date: z.string(),
  emailReminder: z.boolean(),
  emailAddress: z.string().optional(),
  sent: z.boolean(),
});

interface TimelineItem {
  date: string;
  action: string;
  note?: string;
}

interface Document {
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

interface DbDispute {
  id: string;
  user_id: string;
  creditor: string;
  account_number: string;
  dispute_type: string;
  date_sent: string;
  status: string;
  last_updated: string;
  response_by: string;
  letter_content: string;
  timeline: TimelineItem[];
  documents: Document[];
  reminders: Reminder[];
  created_at: string;
  updated_at: string;
}

interface Dispute {
  id: string;
  userId: string;
  creditor: string;
  accountNumber: string;
  disputeType: string;
  dateSent: string;
  status: string;
  lastUpdated: string;
  responseBy: string;
  letterContent: string;
  timeline: TimelineItem[];
  documents: Document[];
  reminders: Reminder[];
  createdAt: string;
  updatedAt: string;
}

function dbToDispute(db: DbDispute): Dispute {
  return {
    id: db.id,
    userId: db.user_id,
    creditor: db.creditor,
    accountNumber: db.account_number || "",
    disputeType: db.dispute_type,
    dateSent: db.date_sent,
    status: db.status,
    lastUpdated: db.last_updated || db.date_sent,
    responseBy: db.response_by || "",
    letterContent: db.letter_content || "",
    timeline: db.timeline || [],
    documents: db.documents || [],
    reminders: db.reminders || [],
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export const disputesRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({
      userId: z.string().optional(),
      status: z.enum(["sent", "in-progress", "resolved", "rejected"]).optional(),
    }))
    .query(async ({ input }) => {
      console.log("[Disputes] getAll called with:", input);

      let query = supabase
        .from('disputes')
        .select('*')
        .order('date_sent', { ascending: false });

      if (input.userId) {
        query = query.eq('user_id', input.userId);
      }
      if (input.status) {
        query = query.eq('status', input.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error("[Disputes] Error fetching disputes:", error);
        throw new Error(`Failed to fetch disputes: ${error.message}`);
      }

      return (data || []).map(dbToDispute);
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      console.log("[Disputes] getById called with:", input.id);

      const { data, error } = await supabase
        .from('disputes')
        .select('*')
        .eq('id', input.id)
        .single();

      if (error) {
        console.error("[Disputes] Error fetching dispute:", error);
        return null;
      }

      return data ? dbToDispute(data) : null;
    }),

  create: publicProcedure
    .input(z.object({
      userId: z.string(),
      creditor: z.string(),
      accountNumber: z.string(),
      disputeType: z.string(),
      dateSent: z.string(),
      status: z.enum(["sent", "in-progress", "resolved", "rejected"]),
      responseBy: z.string(),
      letterContent: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log("[Disputes] create called");

      const initialTimeline: TimelineItem[] = [{
        date: input.dateSent,
        action: "Dispute created",
        note: input.notes || "Dispute added to tracking system",
      }];

      const newDispute = {
        user_id: input.userId,
        creditor: input.creditor,
        account_number: input.accountNumber,
        dispute_type: input.disputeType,
        date_sent: input.dateSent,
        status: input.status,
        last_updated: input.dateSent,
        response_by: input.responseBy,
        letter_content: input.letterContent || "",
        timeline: initialTimeline,
        documents: [],
        reminders: [],
      };

      const { data, error } = await supabase
        .from('disputes')
        .insert(newDispute)
        .select()
        .single();

      if (error) {
        console.error("[Disputes] Error creating dispute:", error);
        throw new Error(`Failed to create dispute: ${error.message}`);
      }

      console.log("[Disputes] Created dispute:", data.id);
      return dbToDispute(data);
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      creditor: z.string().optional(),
      accountNumber: z.string().optional(),
      disputeType: z.string().optional(),
      status: z.enum(["sent", "in-progress", "resolved", "rejected"]).optional(),
      letterContent: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log("[Disputes] update called for:", input.id);

      const { id, accountNumber, disputeType, letterContent, ...rest } = input;
      
      const updates: Record<string, unknown> = { ...rest };
      if (accountNumber !== undefined) updates.account_number = accountNumber;
      if (disputeType !== undefined) updates.dispute_type = disputeType;
      if (letterContent !== undefined) updates.letter_content = letterContent;
      updates.last_updated = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('disputes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("[Disputes] Error updating dispute:", error);
        throw new Error(`Failed to update dispute: ${error.message}`);
      }

      return dbToDispute(data);
    }),

  addTimelineEntry: publicProcedure
    .input(z.object({
      id: z.string(),
      entry: timelineItemSchema,
      newStatus: z.enum(["sent", "in-progress", "resolved", "rejected"]).optional(),
    }))
    .mutation(async ({ input }) => {
      console.log("[Disputes] addTimelineEntry for:", input.id);

      const { data: existing, error: fetchError } = await supabase
        .from('disputes')
        .select('timeline')
        .eq('id', input.id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch dispute: ${fetchError.message}`);
      }

      const currentTimeline = existing?.timeline || [];
      const newTimeline = [...currentTimeline, input.entry];

      const updates: Record<string, unknown> = {
        timeline: newTimeline,
        last_updated: input.entry.date,
      };

      if (input.newStatus) {
        updates.status = input.newStatus;
      }

      const { data, error } = await supabase
        .from('disputes')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add timeline entry: ${error.message}`);
      }

      return dbToDispute(data);
    }),

  addDocument: publicProcedure
    .input(z.object({
      id: z.string(),
      document: documentSchema,
    }))
    .mutation(async ({ input }) => {
      console.log("[Disputes] addDocument for:", input.id);

      const { data: existing, error: fetchError } = await supabase
        .from('disputes')
        .select('documents')
        .eq('id', input.id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch dispute: ${fetchError.message}`);
      }

      const currentDocs = existing?.documents || [];
      const newDocs = [...currentDocs, input.document];

      const { data, error } = await supabase
        .from('disputes')
        .update({ documents: newDocs })
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add document: ${error.message}`);
      }

      return dbToDispute(data);
    }),

  addReminder: publicProcedure
    .input(z.object({
      id: z.string(),
      reminder: reminderSchema,
    }))
    .mutation(async ({ input }) => {
      console.log("[Disputes] addReminder for:", input.id);

      const { data: existing, error: fetchError } = await supabase
        .from('disputes')
        .select('reminders')
        .eq('id', input.id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch dispute: ${fetchError.message}`);
      }

      const currentReminders = existing?.reminders || [];
      const newReminders = [...currentReminders, input.reminder];

      const { data, error } = await supabase
        .from('disputes')
        .update({ reminders: newReminders })
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add reminder: ${error.message}`);
      }

      return dbToDispute(data);
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      console.log("[Disputes] delete called for:", input.id);

      const { error } = await supabase
        .from('disputes')
        .delete()
        .eq('id', input.id);

      if (error) {
        throw new Error(`Failed to delete dispute: ${error.message}`);
      }

      return { success: true };
    }),

  getAnalytics: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      console.log("[Disputes] getAnalytics for:", input.userId);

      const { data, error } = await supabase
        .from('disputes')
        .select('*')
        .eq('user_id', input.userId);

      if (error) {
        throw new Error(`Failed to fetch analytics: ${error.message}`);
      }

      const disputes = data || [];
      
      const totalDisputes = disputes.length;
      const resolvedDisputes = disputes.filter(d => d.status === 'resolved').length;
      const rejectedDisputes = disputes.filter(d => d.status === 'rejected').length;
      const pendingDisputes = totalDisputes - resolvedDisputes - rejectedDisputes;
      const successRate = totalDisputes > 0 ? Math.round((resolvedDisputes / totalDisputes) * 100) : 0;

      let totalDays = 0;
      let countResolved = 0;
      disputes.filter(d => d.status === 'resolved').forEach(dispute => {
        const sentDate = new Date(dispute.date_sent);
        const resolvedDate = new Date(dispute.last_updated);
        const daysDiff = Math.round((resolvedDate.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
        totalDays += daysDiff;
        countResolved++;
      });

      const avgResponseTime = countResolved > 0 ? Math.round(totalDays / countResolved) : 0;

      return {
        totalDisputes,
        resolvedDisputes,
        rejectedDisputes,
        pendingDisputes,
        successRate,
        avgResponseTime,
      };
    }),
});
