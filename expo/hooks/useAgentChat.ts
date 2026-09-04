/**
 * useAgentChat — live conversation state for the My Agent tab.
 *
 * Delivery model:
 *  1. Initial history comes from `aiAgents.getChatHistory` over tRPC.
 *  2. New messages are pushed instantly over the Supabase realtime socket
 *     (INSERT on `agent_chat_messages`, filtered to this user).
 *  3. If the socket cannot connect — offline, blocked network, realtime not
 *     enabled on the project — the hook falls back to a delta poll that only
 *     asks for rows newer than the newest one it already holds.
 *
 * The socket and the poll can both deliver the same row, and a message the
 * user just sent arrives back as an echo, so everything is merged through
 * `mergeRow` which de-duplicates by server id and reconciles optimistic
 * bubbles by (role, content).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { trpc, trpcClient } from "@/lib/trpc";

// ============================================================
// Types
// ============================================================

export type ChatRole = "user" | "assistant" | "tool";

/** Delivery state of a single outgoing message. */
export type DeliveryStatus = "sending" | "sent" | "failed";

export interface AgentChatMessage {
  /** Server row id. Undefined while the message is still optimistic. */
  id?: number;
  /** Stable local key — survives the swap from optimistic to persisted. */
  clientId: string;
  role: ChatRole;
  content: string;
  toolName?: string;
  createdAt: string;
  status: DeliveryStatus;
}

/** How the conversation is currently receiving new messages. */
export type ConnectionState = "connecting" | "live" | "polling" | "offline";

/** Shape of a row in `public.agent_chat_messages`. */
interface ChatMessageRow {
  id: number;
  user_id: string;
  agent_id: number;
  role: ChatRole;
  content: string;
  tool_name?: string | null;
  tool_result?: unknown;
  created_at: string;
}

export interface TriggeredLetter {
  letterType?: string;
  creditorName?: string;
  accountNumber?: string;
}

export interface UseAgentChatOptions {
  userId: string;
  agentId: number | undefined;
  /** Only connect and load once the chat surface is actually on screen. */
  enabled?: boolean;
  /** Fired when the agent generates a dispute letter through a tool call. */
  onLetterGenerated?: (letter: TriggeredLetter) => void;
  /** Fired when a tool call changed dispute data so counters can refresh. */
  onDisputeDataChanged?: () => void;
  /** Fired when the agent wants the credit report uploader opened. */
  onRequestCreditAnalysis?: () => void;
}

// ============================================================
// Constants
// ============================================================

/** Delta poll cadence while the realtime socket is down. */
const FALLBACK_POLL_MS = 4000;
/** Slow reconciliation sweep while the socket is healthy, to catch dropped frames. */
const LIVE_SWEEP_MS = 25000;
/** How long after an unanswered user message we assume the agent is composing. */
const TYPING_WINDOW_MS = 90000;
/** Turns of context sent to the model with each message. */
const HISTORY_TURNS = 10;

const HISTORY_LIMIT = 50;

// ============================================================
// Helpers
// ============================================================

let clientIdCounter = 0;

function nextClientId(): string {
  clientIdCounter += 1;
  return `local-${Date.now()}-${clientIdCounter}`;
}

function rowToMessage(row: ChatMessageRow): AgentChatMessage {
  return {
    id: row.id,
    clientId: `server-${row.id}`,
    role: row.role,
    content: row.content,
    toolName: row.tool_name ?? undefined,
    createdAt: row.created_at,
    status: "sent",
  };
}

function sortByTime(messages: AgentChatMessage[]): AgentChatMessage[] {
  return [...messages].sort((a, b) => {
    const delta =
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (delta !== 0) return delta;
    // Same timestamp (tool + assistant rows written in one pass): fall back to
    // the server id so ordering stays stable.
    return (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER);
  });
}

/**
 * Folds a persisted row into the message list, replacing either the same row
 * (already known) or the optimistic bubble that produced it.
 */
function mergeRow(
  current: AgentChatMessage[],
  row: ChatMessageRow,
): AgentChatMessage[] {
  const incoming = rowToMessage(row);

  const byId = current.findIndex((m) => m.id === row.id);
  if (byId !== -1) {
    const next = [...current];
    next[byId] = { ...incoming, clientId: current[byId].clientId };
    return next;
  }

  // An optimistic message we sent — same author, same text, still unconfirmed.
  const optimistic = current.findIndex(
    (m) =>
      m.id === undefined && m.role === row.role && m.content === row.content,
  );
  if (optimistic !== -1) {
    const next = [...current];
    next[optimistic] = { ...incoming, clientId: current[optimistic].clientId };
    return next;
  }

  return sortByTime([...current, incoming]);
}

function mergeRows(
  current: AgentChatMessage[],
  rows: ChatMessageRow[],
): AgentChatMessage[] {
  return rows.reduce<AgentChatMessage[]>(
    (acc, row) => mergeRow(acc, row),
    current,
  );
}

// ============================================================
// Hook
// ============================================================

export function useAgentChat({
  userId,
  agentId,
  enabled = true,
  onLetterGenerated,
  onDisputeDataChanged,
  onRequestCreditAnalysis,
}: UseAgentChatOptions) {
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [isSending, setIsSending] = useState<boolean>(false);

  const isActive = enabled && !!userId && !!agentId;

  // Latest server timestamp we hold — the cursor for delta polls.
  const cursorRef = useRef<string | null>(null);
  const messagesRef = useRef<AgentChatMessage[]>([]);
  messagesRef.current = messages;

  const applyRows = useCallback((rows: ChatMessageRow[]) => {
    if (rows.length === 0) return;
    setMessages((prev) => mergeRows(prev, rows));
    for (const row of rows) {
      if (!cursorRef.current || row.created_at > cursorRef.current) {
        cursorRef.current = row.created_at;
      }
    }
  }, []);

  // ── Initial history ─────────────────────────────────────────
  const historyQuery = trpc.aiAgents.getChatHistory.useQuery(
    { userId, limit: HISTORY_LIMIT },
    { enabled: isActive, staleTime: 30_000, refetchOnWindowFocus: false },
  );

  useEffect(() => {
    if (!historyQuery.data) return;
    applyRows(historyQuery.data as unknown as ChatMessageRow[]);
  }, [historyQuery.data, applyRows]);

  // ── Delta poll ──────────────────────────────────────────────
  const pollOnce = useCallback(async (): Promise<void> => {
    if (!userId) return;
    try {
      const rows = (await trpcClient.aiAgents.getChatHistory.query({
        userId,
        limit: HISTORY_LIMIT,
        since: cursorRef.current ?? undefined,
      })) as unknown as ChatMessageRow[];
      applyRows(rows);
      setConnection((prev) => (prev === "offline" ? "polling" : prev));
    } catch (error) {
      // A failed poll is not fatal — the cached conversation stays on screen.
      console.log("[AgentChat] Delta poll failed:", error);
      setConnection((prev) => (prev === "live" ? prev : "offline"));
    }
  }, [userId, applyRows]);

  // ── Realtime subscription ───────────────────────────────────
  useEffect(() => {
    if (!isActive) {
      setConnection("connecting");
      return;
    }

    if (!isSupabaseConfigured) {
      setConnection("polling");
      return;
    }

    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    setConnection("connecting");

    channel = supabase
      .channel(`agent-chat:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_chat_messages",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as ChatMessageRow;
          if (!row?.id) return;
          applyRows([row]);
        },
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          setConnection("live");
          // Catch anything inserted while the socket was connecting.
          void pollOnce();
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setConnection("polling");
        }
      });

    return () => {
      cancelled = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [isActive, userId, applyRows, pollOnce]);

  // ── Polling loop (fallback cadence, or slow sweep when live) ─
  useEffect(() => {
    if (!isActive) return;

    let appState: AppStateStatus = AppState.currentState;
    const interval = connection === "live" ? LIVE_SWEEP_MS : FALLBACK_POLL_MS;

    const timer = setInterval(() => {
      // Never poll a backgrounded app — it wastes the user's battery and data.
      if (appState !== "active") return;
      void pollOnce();
    }, interval);

    const subscription = AppState.addEventListener("change", (next) => {
      const returningToForeground = appState !== "active" && next === "active";
      appState = next;
      if (returningToForeground) {
        void pollOnce();
      }
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [isActive, connection, pollOnce]);

  // ── Sending ─────────────────────────────────────────────────
  const chatMutation = trpc.aiAgents.chat.useMutation();

  const deliver = useCallback(
    async (text: string, clientId: string): Promise<void> => {
      if (!agentId) return;

      setIsSending(true);
      try {
        const history = messagesRef.current
          .filter(
            (m) =>
              (m.role === "user" || m.role === "assistant") &&
              m.status !== "failed" &&
              m.clientId !== clientId,
          )
          .slice(-HISTORY_TURNS)
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));

        const result = await chatMutation.mutateAsync({
          userId,
          agentId,
          message: text,
          history,
        });

        // Reconcile against the rows the server actually persisted.
        if (result.messages?.length) {
          applyRows(result.messages as unknown as ChatMessageRow[]);
        }

        for (const call of result.toolCalls ?? []) {
          if (call.name === "generate_dispute_letter") {
            onDisputeDataChanged?.();
            if (call.result) {
              onLetterGenerated?.({
                letterType: call.result.letterType,
                creditorName: call.result.creditorName,
                accountNumber: call.result.accountNumber,
              });
            }
          }
          // The agent asked to open the uploader, or tried to analyze a
          // report and found none on file — send the user to upload one.
          if (
            call.name === "open_credit_report_upload" ||
            (call.name === "analyze_credit_report" &&
              call.result &&
              (call.result as { found?: boolean }).found === false)
          ) {
            onRequestCreditAnalysis?.();
          }
        }
      } catch (error) {
        console.log("[AgentChat] Send failed:", error);
        setMessages((prev) =>
          prev.map((m) =>
            m.clientId === clientId ? { ...m, status: "failed" } : m,
          ),
        );
      } finally {
        setIsSending(false);
      }
    },
    [
      agentId,
      userId,
      chatMutation,
      applyRows,
      onLetterGenerated,
      onDisputeDataChanged,
      onRequestCreditAnalysis,
    ],
  );

  const sendMessage = useCallback(
    (rawText: string): void => {
      const text = rawText.trim();
      if (!text || !agentId) return;

      const clientId = nextClientId();
      const optimistic: AgentChatMessage = {
        clientId,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
        status: "sending",
      };
      setMessages((prev) => [...prev, optimistic]);

      void deliver(text, clientId);
    },
    [agentId, deliver],
  );

  /** Re-send a message that failed, reusing its bubble. */
  const retryMessage = useCallback(
    (clientId: string): void => {
      const target = messagesRef.current.find((m) => m.clientId === clientId);
      if (!target || target.status !== "failed") return;

      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === clientId ? { ...m, status: "sending" } : m,
        ),
      );
      void deliver(target.content, clientId);
    },
    [deliver],
  );

  // ── Derived ─────────────────────────────────────────────────

  /**
   * The agent is composing when we are mid-request, or when the newest
   * persisted message is an unanswered question — which is how a send from
   * another device shows up here.
   */
  const isAgentTyping = useMemo<boolean>(() => {
    if (isSending) return true;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user" || last.status !== "sent") return false;
    return Date.now() - new Date(last.createdAt).getTime() < TYPING_WINDOW_MS;
  }, [isSending, messages]);

  const hasHistory = messages.length > 0;

  return {
    messages,
    connection,
    isAgentTyping,
    isSending,
    hasHistory,
    isLoading: historyQuery.isLoading && !hasHistory,
    loadError: historyQuery.error?.message ?? null,
    sendMessage,
    retryMessage,
    refresh: pollOnce,
  };
}
