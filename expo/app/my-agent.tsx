import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
  KeyboardAvoidingView,
  Image,
  Alert,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Bot,
  Sparkles,
  MessageCircle,
  FileText,
  ClipboardList,
  Lock,
  TrendingUp,
  Shield,
  Zap,
  LayoutDashboard,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useDisputes } from "@/contexts/DisputesContext";
import {
  trpc,
  isTransportErrorMessage,
  warmUpApi,
  subscribeToConnection,
  getConnectionState,
} from "@/lib/trpc";
import { AGENT_NOT_INCLUDED_MESSAGE, agentScopeLabel } from "@/constants/agent-access";
import {
  TRIAL_LETTERS_LOCKED_MESSAGE,
  TRIAL_LETTERS_LOCKED_TITLE,
} from "@/constants/trial-access";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAgentChat, type TriggeredLetter } from "@/hooks/useAgentChat";
import {
  readCachedAgent,
  writeCachedAgent,
  clearCachedAgent,
  type CachedAgent,
} from "@/lib/agent-cache";
import { fetchAgentDirect } from "@/lib/direct-agent";

import AgentProfileCard, {
  AgentInfo,
  AGENT_HERO_IMAGE,
} from "@/components/MyAgent/AgentProfileCard";
import WarpTunnel from "@/components/MyAgent/WarpTunnel";
import AgentChatPanel from "@/components/MyAgent/AgentChatPanel";
import CreditRepairModal from "@/components/MyAgent/CreditRepairModal";
import DisputeTrackerModal from "@/components/MyAgent/DisputeTrackerModal";
import CreditAnalysisModal from "@/components/MyAgent/CreditAnalysisModal";
import NegativeAccountsDashboard from "@/components/MyAgent/NegativeAccountsDashboard";
import CreditSummaryDashboard from "@/components/MyAgent/CreditSummaryDashboard";
import DisputeQuestionnaireModal, {
  type QuestionnaireAccount,
  type DisputeQuestionnaireResult,
} from "@/components/MyAgent/DisputeQuestionnaireModal";

// ============================================================
// Constants
// ============================================================

/** The My Agent identity colour, shared with the tab bar. */
const AGENT_VIOLET = "#A78BFA";

/**
 * Warp intro plays on the first open of the tab each app session, then
 * never again until a cold start — the spectacle would wear thin on every
 * visit. Module-level so it survives screen remounts within the session.
 */
let warpShownThisSession = false;

/** Which surface of the tab is on screen. */
type AgentView = "chat" | "overview";

/** Outcome of the direct-to-database agent lookup. */
type DirectStatus = "idle" | "pending" | "success" | "none" | "unavailable";

/**
 * How long the API gets to answer before this screen reads the assignment
 * straight from the database.
 *
 * The fallback used to wait for `myAgentQuery.isError`. Against a host that
 * completes the TCP/TLS handshake and then never replies - exactly how the
 * Rork dev API fails when it is asleep - that verdict is roughly four minutes
 * away: five attempts at a 20s timeout plus backoff (~112s), doubled by the
 * react-query retry. Nothing could render until then, so the tab looked
 * permanently stuck. Six seconds is far longer than a healthy API needs and
 * short enough that the user is never left staring at a spinner.
 */
const DIRECT_FALLBACK_GRACE_MS = 6000;

// ============================================================
// Main My Agent Screen
// ============================================================

export interface MyAgentScreenProps {
  /** When true, renders inside a bottom tab: no back button.
   *
   *  The safe-area top inset is applied either way. The tab is registered with
   *  `headerShown: false`, so the navigator contributes no top chrome and the
   *  screen owns the inset itself — without it the header rode under the
   *  status bar and the Chat/Overview switch sat beyond the reachable area. */
  embedded?: boolean;
}

/**
 * My Agent tab entry point. Wraps the screen with the warp-speed intro,
 * which plays once per app session and sits above every internal state
 * (assigning, error, chat, overview) so the transition into the console
 * is always the same cinematic jump.
 */
export default function MyAgentScreen(props: MyAgentScreenProps) {
  const [showWarp, setShowWarp] = useState(() => !warpShownThisSession);

  const handleWarpDone = useCallback(() => {
    warpShownThisSession = true;
    setShowWarp(false);
  }, []);

  return (
    <View style={styles.flex}>
      <MyAgentScreenInner {...props} />
      {showWarp ? <WarpTunnel onDone={handleWarpDone} /> : null}
    </View>
  );
}

function MyAgentScreenInner({
  embedded = false,
}: MyAgentScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const {
    tier,
    enrolledCourses,
    agentScope,
    canGenerateRecommendedLetter,
  } = useSubscription();
  const { disputes, refetch: refetchDisputes } = useDisputes();

  const userId = user?.id || "";

  // ── View + modal state ────────────────────────────────────────
  // Opens on the overview: the dashboard frames what the agent is and what it
  // can do, so landing there orients the user before the conversation starts.
  const [view, setView] = useState<AgentView>("overview");
  const [creditRepairVisible, setCreditRepairVisible] = useState(false);
  const [disputeTrackerVisible, setDisputeTrackerVisible] = useState(false);
  const [creditAnalysisVisible, setCreditAnalysisVisible] = useState(false);
  const [negativeDashboardVisible, setNegativeDashboardVisible] = useState(false);
  const [creditSummaryVisible, setCreditSummaryVisible] = useState(false);
  const [questionnaireVisible, setQuestionnaireVisible] = useState(false);
  // The account awaiting the escalation questionnaire. Set when a "Prepare
  // Dispute Letter" button fires; cleared once the questions are answered (or
  // abandoned) and the letter generator takes over.
  const [questionnaireAccount, setQuestionnaireAccount] =
    useState<QuestionnaireAccount | null>(null);
  const [creditRepairPrefill, setCreditRepairPrefill] = useState<{
    letterType?: string;
    creditorName?: string;
    accountNumber?: string;
    furnisherAddress?: string;
    /** AI-determined rationale for why this letter type was chosen, shown
     *  in the Credit Repair Tool instead of a manual letter-type picker. */
    rationale?: string;
    /** True when the letter type was chosen automatically by the AI
     *  Dispute logic rather than typed/selected by the user, so the
     *  Credit Repair Tool can show an "AI Recommended" badge. */
    autoDetermined?: boolean;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Agent assignment & fetch ──────────────────────────────────
  //
  // The assignment is durable (one row per user, effectively permanent), so
  // the last-known agent is cached on the device and painted immediately.
  // Without it, any blip from the API host - it sleeps between sessions and
  // cold starts slowly - left this tab with nothing to render and dropped
  // the user on "Couldn't Reach Your Agent", even though their agent and
  // their whole conversation were already on the phone. iOS has always
  // cached this; Expo now matches.
  const [cachedAgent, setCachedAgent] = useState<CachedAgent | null>(null);
  const [cacheChecked, setCacheChecked] = useState(false);

  // Agent resolved straight from the database when the API host is down.
  // Distinct from `cachedAgent`: this is live data, just fetched over a
  // different transport, so it also covers a first open on a new device
  // where there is nothing cached yet.
  const [directAgent, setDirectAgent] = useState<CachedAgent | null>(null);
  const [directStatus, setDirectStatus] = useState<DirectStatus>("idle");
  const [directReason, setDirectReason] = useState<string | null>(null);
  /** True once the API has had its grace period to answer. */
  const [graceElapsed, setGraceElapsed] = useState(false);

  useEffect(() => {
    let active = true;

    if (!userId) {
      setCachedAgent(null);
      setDirectAgent(null);
      setDirectStatus("idle");
      setDirectReason(null);
      setGraceElapsed(false);
      setCacheChecked(true);
      return;
    }

    setDirectAgent(null);
    setDirectStatus("idle");
    setDirectReason(null);
    setGraceElapsed(false);

    setCacheChecked(false);
    void readCachedAgent(userId).then((cached) => {
      if (!active) return;
      if (cached) {
        console.log("[MyAgent] Painted from cached assignment");
      }
      setCachedAgent(cached);
      setCacheChecked(true);
    });

    return () => {
      active = false;
    };
  }, [userId]);

  // First, check if the user already has an agent assigned.
  const myAgentQuery = trpc.aiAgents.getMyAgent.useQuery(
    { userId },
    { enabled: !!userId, staleTime: 60_000 },
  );

  // Assignment mutation — called when user has no agent yet.
  const assignAgentMutation = trpc.aiAgents.assign.useMutation({
    onSuccess: (data) => {
      console.log("[MyAgent] Agent assigned:", data.agent?.agent_name);
      if (data.agent) {
        const fresh: CachedAgent = {
          agent: data.agent as AgentInfo,
          assignment: data.assignment ?? null,
        };
        setCachedAgent(fresh);
        void writeCachedAgent(userId, fresh);
      }
      myAgentQuery.refetch();
    },
    onError: (error) => {
      // No Alert here: the render branch below shows a specific, actionable
      // explanation of the failure. A popup on top of it would just be noise.
      //
      // A server that is unreachable or still waking is a transient blip, not a
      // fault in the app - console.error would surface it as a full-screen
      // "Runtime error" over a screen that already handles the case gracefully.
      if (isTransportErrorMessage(error.message)) {
        console.warn("[MyAgent] Assignment deferred:", error.message);
        return;
      }
      console.error("[MyAgent] Assignment error:", error.message);
    },
  });

  // ── Auto-assign on mount if no agent and user is ACE-1 ────────
  // Dev/testing bypass: set EXPO_PUBLIC_UNLOCK_ACE1=true in your Rork Secrets
  // (or .env) to preview ACE-1 gated features without a paid subscription.
  // Leave it unset/false in production so real gating applies.
  const unlockForTesting = process.env.EXPO_PUBLIC_UNLOCK_ACE1 === "true";
  const isACE1 =
    unlockForTesting || tier === "ace1_student" || tier === "cso_affiliate";

  useEffect(() => {
    if (
      !userId ||
      !isACE1 ||
      myAgentQuery.isLoading ||
      assignAgentMutation.isPending
    ) {
      return;
    }

    // Don't retry automatically once an attempt has already failed —
    // every setup failure (missing tables, RLS, empty pool) is permanent
    // until someone runs a migration, so retrying would just spin.
    // The Try Again button drives any further attempts.
    //
    // Transport failures are the exception: the server being briefly
    // unreachable says nothing about whether assignment can succeed, and the
    // tRPC client already backs those off behind a circuit breaker. Blocking
    // here would strand the user on an error screen until they tapped retry,
    // even after the server came back.
    if (
      assignAgentMutation.isError &&
      !isTransportErrorMessage(assignAgentMutation.error?.message)
    ) {
      return;
    }

    // The backend reported a real problem (missing tables, RLS, bad
    // credentials). Assigning would hit the same wall, so surface it instead.
    if (myAgentQuery.data?.setupError) return;

    // If the query has resolved and there's no agent, assign one.
    if (
      myAgentQuery.isSuccess &&
      !myAgentQuery.data?.agent &&
      !assignAgentMutation.isPending
    ) {
      console.log("[MyAgent] No agent found — auto-assigning...");
      assignAgentMutation.mutate({ userId });
    }
  }, [
    userId,
    isACE1,
    myAgentQuery.isLoading,
    myAgentQuery.isSuccess,
    myAgentQuery.data?.agent,
    myAgentQuery.data?.setupError,
    assignAgentMutation,
    assignAgentMutation.error?.message,
  ]);

  // ── Connectivity: warm up on open, auto-recover once reachable ──────
  //
  // "Can't reach the server right now" on this tab is almost always the
  // Rork-hosted backend cold-starting (it sleeps after inactivity and takes
  // a few seconds to answer its first request). Two gaps used to turn that
  // few-second blip into a stuck error screen:
  //
  //   1. The FIRST request this tab makes (`getMyAgent`) was the one that
  //      paid the full cold-start cost, with no warm-up beforehand.
  //   2. Once the transport circuit breaker tripped, nothing on this screen
  //      ever re-checked - the user was stuck on the error view until they
  //      manually tapped "Try Again", even seconds after the server had
  //      already woken back up.
  //
  // Fixing both: ping the API as soon as the tab mounts (cheap, harmless if
  // it's already awake), and subscribe to the shared connection state so the
  // moment ANY request proves the server is back, this screen refetches on
  // its own.
  useEffect(() => {
    if (!userId || !isACE1) return;
    void warmUpApi(3);
  }, [userId, isACE1]);

  useEffect(() => {
    if (!userId || !isACE1) return;

    const unsubscribe = subscribeToConnection(() => {
      if (getConnectionState() !== "online") return;

      // The server just proved it's reachable again. If this tab is still
      // sitting on a transport-caused error (not a real setup problem),
      // retry on its own instead of waiting for a manual tap.
      const stuckOnTransportError =
        (myAgentQuery.isError &&
          isTransportErrorMessage(myAgentQuery.error?.message)) ||
        (assignAgentMutation.isError &&
          isTransportErrorMessage(assignAgentMutation.error?.message));

      if (stuckOnTransportError) {
        console.log("[MyAgent] Server reachable again — auto-retrying");
        assignAgentMutation.reset();
        // Drop the direct-read copy so the API's answer becomes the source
        // of truth again and the reconnecting banner clears.
        setDirectAgent(null);
        setDirectStatus("idle");
        setDirectReason(null);
        myAgentQuery.refetch();
      }
    });

    return unsubscribe;
  }, [userId, isACE1, myAgentQuery, assignAgentMutation]);

  // ── Give the API a deadline, then read the database directly ───
  //
  // Starts the moment the tab opens rather than waiting for a verdict from
  // the API. When the host accepts the connection and then never replies -
  // how the Rork dev API fails while asleep - `getMyAgent` does not report
  // failure for roughly four minutes (five attempts at a 20s timeout plus
  // backoff, doubled by the react-query retry). Keying the fallback off
  // `isError` therefore left this tab on a spinner for that entire window,
  // which is what made it look broken on the device while the web build -
  // which talks to a *different*, working origin - was fine.
  useEffect(() => {
    if (!userId || !isACE1) return;

    const timer = setTimeout(
      () => setGraceElapsed(true),
      DIRECT_FALLBACK_GRACE_MS,
    );
    return () => clearTimeout(timer);
  }, [userId, isACE1]);

  // ── Fall back to the database when the API is slow or unreachable ──
  //
  // The API tier and the database are separate hosts. When the API is down
  // (504 at the edge, or a silent timeout) the assignment is still readable
  // straight from Supabase in well under a second, so the console opens
  // instead of dead-ending on "Can't reach the server right now".
  //
  // Still deliberately read-only: it can surface an agent the user already
  // has, but assigning a new one needs the pool bookkeeping the API owns.
  useEffect(() => {
    if (!userId || !isACE1) return;
    if (myAgentQuery.data?.agent) return;
    if (directStatus !== "idle") return;

    const transportFailed =
      (myAgentQuery.isError &&
        isTransportErrorMessage(myAgentQuery.error?.message)) ||
      (assignAgentMutation.isError &&
        isTransportErrorMessage(assignAgentMutation.error?.message));

    // Either the API has already given up, or it has used up its grace period
    // without answering. A healthy API answers in well under a second, so in
    // practice this only fires when something is genuinely wrong.
    if (!transportFailed && !graceElapsed) return;

    let active = true;
    setDirectStatus("pending");

    void fetchAgentDirect(userId).then((outcome) => {
      if (!active) return;

      if (outcome.status === "success") {
        console.log("[MyAgent] Resolved agent directly from the database");
        const resolved: CachedAgent = {
          agent: outcome.result.agent as unknown as AgentInfo,
          assignment: outcome.result.assignment,
        };
        setDirectAgent(resolved);
        setDirectStatus("success");
        // Worth persisting: it is a real, server-confirmed assignment.
        void writeCachedAgent(userId, resolved);
        return;
      }

      if (outcome.status === "unavailable") {
        console.warn("[MyAgent] Direct lookup unavailable:", outcome.reason);
        setDirectReason(outcome.reason);
        setDirectStatus("unavailable");
        return;
      }

      // Authoritative: the database has no active assignment for this user.
      setDirectStatus("none");
    });

    return () => {
      active = false;
    };
  }, [
    userId,
    isACE1,
    directStatus,
    graceElapsed,
    myAgentQuery.isError,
    myAgentQuery.error?.message,
    myAgentQuery.data?.agent,
    assignAgentMutation.isError,
    assignAgentMutation.error?.message,
  ]);

  // ── Keep the local copy in step with the server ───────────────
  //
  // Only a definitive answer updates the cache. A transport failure tells us
  // nothing about whether the assignment still exists, so the stored agent is
  // left untouched and keeps the tab usable; an explicit "no agent" (with no
  // setup error) is authoritative and clears it.
  useEffect(() => {
    if (!userId || !myAgentQuery.isSuccess) return;

    const fetched = myAgentQuery.data?.agent as AgentInfo | undefined;

    if (fetched) {
      const fresh: CachedAgent = {
        agent: fetched,
        assignment: myAgentQuery.data?.assignment ?? null,
      };
      setCachedAgent(fresh);
      void writeCachedAgent(userId, fresh);
      return;
    }

    if (!myAgentQuery.data?.setupError) {
      setCachedAgent(null);
      void clearCachedAgent(userId);
    }
  }, [
    userId,
    myAgentQuery.isSuccess,
    myAgentQuery.data?.agent,
    myAgentQuery.data?.assignment,
    myAgentQuery.data?.setupError,
  ]);

  // ── Derived agent state ───────────────────────────────────────
  //
  // Three sources, most authoritative first: this fetch, the database read
  // straight from the device, then the cached copy. An unreachable API host
  // therefore degrades to "your agent, with a reconnecting banner" instead
  // of a dead-end error screen.
  const agent =
    (myAgentQuery.data?.agent as AgentInfo | undefined) ??
    directAgent?.agent ??
    cachedAgent?.agent;
  const assignment =
    myAgentQuery.data?.assignment ??
    directAgent?.assignment ??
    cachedAgent?.assignment;

  /** True when the agent on screen did not come from this fetch. */
  const isShowingCachedAgent =
    !myAgentQuery.data?.agent && (!!directAgent?.agent || !!cachedAgent?.agent);

  /** The direct read has produced a definitive answer of some kind. */
  const directResolved =
    directStatus === "success" ||
    directStatus === "none" ||
    directStatus === "unavailable";

  // `myAgentQuery.isLoading` is deliberately NOT sufficient on its own here.
  // A silently hanging API keeps it true for minutes, and while it was the
  // last word this screen showed a spinner for that whole time even though
  // the database had already answered. Once the direct read has resolved we
  // know everything we are going to know, so the UI commits to a real state
  // instead of waiting out a request that may never land.
  const isAssigning =
    !agent &&
    (assignAgentMutation.isPending ||
      !cacheChecked ||
      directStatus === "pending" ||
      (myAgentQuery.isLoading && !myAgentQuery.data && !directResolved));

  /**
   * True ONLY while the `assign` mutation is actually creating a brand-new
   * assignment - i.e. `getMyAgent` has already resolved and confirmed this
   * user has no agent yet.
   *
   * `isAssigning` above also covers the very first `getMyAgent` fetch on
   * every cold app launch, which is ambiguous: at that point we don't yet
   * know whether this is a new user or one who was assigned an agent weeks
   * ago. That fetch is a normal, quick lookup for a returning user, not a
   * search through the agent pool - so the "matching you with one of
   * 10,000 agents" copy must never show for it. It is reserved for the one
   * moment that copy is actually true: a genuinely new assignment is being
   * created.
   */
  const isCreatingNewAssignment = assignAgentMutation.isPending;

  /**
   * Work out WHY there is no agent, instead of guessing.
   *
   * Sources, most-specific first:
   *   1. The assign mutation's error (it carries a `CODE: message` prefix).
   *   2. A setupError returned by getMyAgent (missing tables / RLS / creds).
   *   3. A transport-level query error (backend unreachable).
   *   4. Supabase env vars never set at build time.
   */
  const setupDiagnosis = useMemo((): {
    code: string;
    title: string;
    description: string;
    hint?: string;
  } | null => {
    if (!isSupabaseConfigured) {
      return {
        code: "SUPABASE_NOT_CONFIGURED",
        title: "Database Not Configured",
        description:
          "This build has no Supabase credentials, so your agent can't be looked up.",
        hint: "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in Rork Secrets, then rebuild — environment variables are baked in at build time, so a reload won't pick them up.",
      };
    }

    // The API call can still be technically "in flight" (hung, never errored)
    // at the point the direct database read has already finished. Both of the
    // outcomes below therefore have to speak for themselves, or the screen
    // falls through to the far too cheerful "tap Try Again" copy while the
    // server is in fact unreachable and Try Again cannot possibly work.
    const apiAnswered = myAgentQuery.isSuccess;
    const unreachable =
      !apiAnswered &&
      // Could not read the database either.
      (directStatus === "unavailable" ||
        // Read it fine, and this user genuinely has no agent yet. Claiming one
        // is a write that only the API can do (it owns the pool's capacity
        // bookkeeping), so with the API down this is still a dead end.
        directStatus === "none");

    const raw =
      assignAgentMutation.error?.message ||
      myAgentQuery.data?.setupError?.message ||
      myAgentQuery.error?.message ||
      (unreachable
        ? `UNREACHABLE: ${
            directStatus === "none"
              ? "The server isn't responding, so a new agent can't be assigned to you right now."
              : (directReason ?? "The server isn't responding right now.")
          }`
        : "");

    if (!raw) return null;

    // Backend prefixes structured failures with "CODE: ".
    const match = raw.match(/^([A-Z_]+):\s*([\s\S]+)$/);
    const code = match?.[1];
    const detail = match?.[2] ?? raw;

    switch (code) {
      case "SUPABASE_NOT_CONFIGURED":
        return {
          code,
          title: "Database Not Configured",
          description: detail,
        };
      case "MISSING_TABLES":
        return {
          code,
          title: "Database Setup Incomplete",
          description: detail,
          hint: "Supabase → SQL Editor → run 020, then 021.",
        };
      case "RLS_BLOCKED":
        return {
          code,
          title: "Database Permissions Blocked",
          description: detail,
          hint: "Supabase → SQL Editor → run 024_fix_agent_rls_policies.sql.",
        };
      case "POOL_EMPTY":
        return {
          code,
          title: "No Agents Available Yet",
          description: detail,
          hint: "Supabase → SQL Editor → run 021_seed_ai_agents.sql.",
        };
      case "ALL_AGENTS_AT_CAPACITY":
        return {
          code,
          title: "All Agents Are Busy",
          description: detail,
        };
      case "UNREACHABLE":
        return {
          code,
          title: "Can't Reach the Server",
          description: detail,
          hint: "Nothing is lost — this is a connection problem, not a problem with your account. The screen keeps checking and will pick up on its own the moment the server answers.",
        };
      default:
        return {
          code: code ?? "UNKNOWN",
          title: "Couldn't Reach Your Agent",
          description: detail,
        };
    }
  }, [
    assignAgentMutation.error?.message,
    myAgentQuery.data?.setupError?.message,
    myAgentQuery.error?.message,
    myAgentQuery.isSuccess,
    directStatus,
    directReason,
  ]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleDisputeDataChanged = useCallback(() => {
    refetchDisputes?.();
  }, [refetchDisputes]);

  /**
   * Explains why the full letter library is closed during the trial.
   *
   * Deliberately names the route that IS open - the credit report analysis -
   * so the message reads as a boundary with a way forward rather than a
   * dead end.
   */
  const showLetterLibraryLocked = useCallback(() => {
    Alert.alert(
      TRIAL_LETTERS_LOCKED_TITLE,
      TRIAL_LETTERS_LOCKED_MESSAGE,
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Analyze my report",
          onPress: () => setCreditAnalysisVisible(true),
        },
        {
          text: "View plans",
          onPress: () => router.push("/subscription-plans"),
        },
      ],
    );
  }, [router]);

  /** The agent used its letter tool mid-conversation — open the editor.
   *
   *  Trial members never reach this: the server withholds the letter tool
   *  from them entirely, so the agent has nothing to trigger. The guard here
   *  is a second line of defence rather than the primary gate. */
  const handleLetterFromAgent = useCallback(
    (letter: TriggeredLetter) => {
      if (!canGenerateRecommendedLetter) {
        showLetterLibraryLocked();
        return;
      }
      setCreditRepairPrefill({
        letterType: letter.letterType,
        creditorName: letter.creditorName,
        accountNumber: letter.accountNumber,
      });
      setCreditRepairVisible(true);
    },
    [canGenerateRecommendedLetter, showLetterLibraryLocked],
  );

  /** Move from a negative account into the escalation questionnaire.
   *
   *  The letter type suggested by `determineLetterStrategyFromAccountType` /
   *  `analyzeCreditAccounts` is derived purely from WHAT the item is
   *  (collection, charge-off, ...). That is not enough to recommend a letter:
   *  the correct one also depends on HOW FAR the user has already escalated.
   *  Jumping straight into generation meant the agent could recommend a
   *  method-of-verification request for a bureau that was never disputed, or
   *  a second 609 for someone who already sent one. The questionnaire asks
   *  first; the suggestion rides along as context. */
  const openQuestionnaire = useCallback((account: QuestionnaireAccount) => {
    setQuestionnaireAccount(account);
    setTimeout(() => setQuestionnaireVisible(true), 300);
  }, []);

  const handleAnalysisGenerateLetter = useCallback(
    (data: {
      letterType: string;
      creditorName: string;
      accountNumber: string;
      furnisherAddress?: string;
      rationale?: string;
    }) => {
      setCreditAnalysisVisible(false);
      openQuestionnaire({
        creditorName: data.creditorName,
        accountNumber: data.accountNumber,
        furnisherAddress: data.furnisherAddress,
        suggestedLetterType: data.letterType,
        suggestedRationale: data.rationale,
      });
    },
    [openQuestionnaire],
  );

  /** Same handoff from the per-bureau dashboard. */
  const handleDashboardGenerateLetter = useCallback(
    (data: {
      letterType: string;
      creditorName: string;
      accountNumber: string;
      furnisherAddress?: string;
      rationale?: string;
    }) => {
      setNegativeDashboardVisible(false);
      openQuestionnaire({
        creditorName: data.creditorName,
        accountNumber: data.accountNumber,
        furnisherAddress: data.furnisherAddress,
        suggestedLetterType: data.letterType,
        suggestedRationale: data.rationale,
      });
    },
    [openQuestionnaire],
  );

  /** The questionnaire resolved a letter: hand it to the letter generator. */
  const handleQuestionnaireComplete = useCallback(
    (result: DisputeQuestionnaireResult) => {
      setQuestionnaireVisible(false);
      setQuestionnaireAccount(null);
      setCreditRepairPrefill({
        letterType: result.letterType,
        creditorName: result.creditorName,
        accountNumber: result.accountNumber,
        furnisherAddress: result.furnisherAddress,
        rationale: result.rationale,
        autoDetermined: true,
      });
      setTimeout(() => setCreditRepairVisible(true), 300);
    },
    [],
  );

  /**
   * Close the analysis and switch to the chat view so the user can ask
   * follow-ups. The agent pulls the stored analysis via its
   * analyze_credit_report tool.
   */
  const handleDiscussAnalysisInChat = useCallback(() => {
    setCreditAnalysisVisible(false);
    setTimeout(() => setView("chat"), 300);
  }, []);

  /** The agent asked (via tool call) to open the credit report uploader. */
  const handleTriggerCreditAnalysis = useCallback(() => {
    setCreditAnalysisVisible(true);
  }, []);

  // ── Live chat ─────────────────────────────────────────────────
  const chat = useAgentChat({
    userId,
    agentId: agent?.id,
    enabled: isACE1 && !!agent,
    enrolledCourseIds: enrolledCourses,
    onLetterGenerated: handleLetterFromAgent,
    onDisputeDataChanged: handleDisputeDataChanged,
    onRequestCreditAnalysis: handleTriggerCreditAnalysis,
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([myAgentQuery.refetch(), refetchDisputes?.()]);
    setRefreshing(false);
  }, [myAgentQuery, refetchDisputes]);

  const handleLetterGenerated = useCallback(
    (_disputeId?: string, _saved?: boolean) => {
      // No refetch here on purpose. CreditRepairModal now reconciles the
      // server-created dispute with DisputesContext itself (fetching the new
      // row, then refreshing the list and analytics), and this screen reads
      // that same context - so refetching again would only duplicate the
      // round-trip. Failed saves are surfaced inline by the modal.
    },
    [],
  );

  // Open disputes count for the dashboard
  const openDisputes = useMemo(
    () =>
      disputes.filter((d) => d.status === "sent" || d.status === "in-progress"),
    [disputes],
  );

  // ============================================================
  // Render — Non-ACE-1 users see a lock screen
  // ============================================================

  if (!isACE1) {
    return <LockedView router={router} insets={insets} embedded={embedded} />;
  }

  // Every agent-bearing course (ACE-1, ACE-2, ACE-3) now includes an agent,
  // each scoped to its own subject. This only fires for a student who owns no
  // agent-bearing course at all, and points them at the ones that do.
  if (!agentScope.hasAccess) {
    return (
      <NoAgentView router={router} insets={insets} embedded={embedded} />
    );
  }

  // ============================================================
  // Render — Loading state
  // ============================================================

  if (isAssigning && !agent) {
    return (
      <>
        {!embedded && <Stack.Screen options={{ headerShown: false }} />}
        <View
          style={[styles.container, { paddingTop: insets.top }]}
        >
          <View style={styles.header}>
            {embedded ? (
              <View style={{ width: 40 }} />
            ) : (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <ArrowLeft color={Colors.text} size={24} />
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>My Agent</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingTitle}>
              {isCreatingNewAssignment ? "Assigning Your AI Agent..." : "Loading Your Agent..."}
            </Text>
            <Text style={styles.loadingDesc}>
              {isCreatingNewAssignment
                ? "We\u2019re matching you with one of 10,000 specialized AI Credit Repair Agents. This only takes a moment."
                : "Reconnecting you with your AI Credit Repair Agent. This only takes a moment."}
            </Text>
          </View>
        </View>
      </>
    );
  }

  // ============================================================
  // Render — No agent available
  //
  // One branch for every "we have no agent to show you" case. Rather than
  // guessing at the reason, `setupDiagnosis` reports what actually went
  // wrong — missing migrations, RLS blocking writes, unset Supabase
  // credentials, an empty pool, or genuine capacity — so the fix is obvious.
  // ============================================================

  if (!agent) {
    const diagnosis = setupDiagnosis;
    const isAtCapacity = diagnosis?.code === "ALL_AGENTS_AT_CAPACITY";

    return (
      <>
        {!embedded && <Stack.Screen options={{ headerShown: false }} />}
        <View
          style={[styles.container, { paddingTop: insets.top }]}
        >
          <View style={styles.header}>
            {embedded ? (
              <View style={{ width: 40 }} />
            ) : (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <ArrowLeft color={Colors.text} size={24} />
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>My Agent</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView
            contentContainerStyle={styles.errorContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.errorIconWrap}>
              <Bot size={48} color={Colors.warning} />
            </View>
            <Text style={styles.errorTitle}>
              {diagnosis?.title ?? "Setting Up Your Agent"}
            </Text>
            <Text style={styles.errorDesc}>
              {diagnosis?.description ??
                "We haven't matched you with an agent yet. Tap Try Again to get started."}
            </Text>

            {!!diagnosis?.hint && (
              <View style={styles.errorHintBox}>
                <Text style={styles.errorHintLabel}>How to fix this</Text>
                <Text style={styles.errorHintText}>{diagnosis.hint}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                assignAgentMutation.reset();
                myAgentQuery.refetch();
                assignAgentMutation.mutate({ userId });
              }}
              disabled={assignAgentMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Try assigning an agent again"
            >
              {assignAgentMutation.isPending ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.retryButtonText}>
                  {isAtCapacity ? "Check Again" : "Try Again"}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </>
    );
  }


  // ============================================================
  // Render — Chat + dashboard
  // ============================================================

  const isLive = chat.connection === "live";

  // The generated hero portrait stands in whenever the agent record has
  // no photo of its own, so the console never shows a bare icon.
  const displayAvatar = agent?.avatar_url || AGENT_HERO_IMAGE;

  const statusLabel =
    chat.connection === "live"
      ? "Online now"
      : chat.connection === "connecting"
        ? "Connecting…"
        : chat.connection === "polling"
          ? "Online"
          : "Reconnecting…";

  /** What this agent is cleared to talk about, from the courses owned. */
  const scopeLabel = agentScopeLabel(agentScope);

  return (
    <>
      {!embedded && <Stack.Screen options={{ headerShown: false }} />}
      <View
        style={[styles.container, { paddingTop: insets.top }]}
      >
        {/* ── Conversation header ─────────────────────────────── */}
        <View style={styles.chatHeader}>
          {embedded ? null : (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft color={Colors.text} size={24} />
            </TouchableOpacity>
          )}

          <View style={styles.identity}>
            <View style={styles.identityAvatarWrap}>
              {agent ? (
                <Image
                  source={{ uri: displayAvatar }}
                  style={styles.identityAvatar}
                />
              ) : (
                <View style={[styles.identityAvatar, styles.identityFallback]}>
                  <Bot size={18} color={Colors.white} />
                </View>
              )}
              {agent ? (
                <View
                  style={[
                    styles.presenceDot,
                    {
                      backgroundColor: isLive
                        ? Colors.success
                        : chat.connection === "offline"
                          ? Colors.warning
                          : Colors.textLight,
                    },
                  ]}
                />
              ) : null}
            </View>

            <View style={styles.identityText}>
              <Text style={styles.identityName} numberOfLines={1}>
                {agent?.agent_name ?? "My Agent"}
              </Text>
              <Text style={styles.identityStatus} numberOfLines={1}>
                {agent ? `${statusLabel} · ${scopeLabel}` : scopeLabel}
              </Text>
            </View>
          </View>

          {/* Segmented switch between the conversation and the dashboard */}
          <View style={styles.segment}>
            <SegmentButton
              active={view === "chat"}
              onPress={() => setView("chat")}
              label="Chat"
              accessibilityLabel="Show conversation"
            >
              <MessageCircle
                size={16}
                color={view === "chat" ? Colors.white : Colors.textSecondary}
              />
            </SegmentButton>
            <SegmentButton
              active={view === "overview"}
              onPress={() => setView("overview")}
              label="Overview"
              accessibilityLabel="Show agent overview"
            >
              <LayoutDashboard
                size={16}
                color={
                  view === "overview" ? Colors.white : Colors.textSecondary
                }
              />
            </SegmentButton>
          </View>
        </View>

        {/* Shown only when the server is unreachable and the agent on screen
            came from the device. Explains itself rather than pretending the
            connection is healthy, and clears itself on the next good fetch. */}
        {isShowingCachedAgent ? (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText} numberOfLines={2}>
              Showing your saved agent — reconnecting to the server.
            </Text>
            <TouchableOpacity
              onPress={() => myAgentQuery.refetch()}
              accessibilityRole="button"
              accessibilityLabel="Retry connecting to the server"
              hitSlop={8}
            >
              <Text style={styles.offlineBannerAction}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Chat ─────────────────────────────────────────────── */}
        {view === "chat" ? (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={insets.top}
          >
            {agent ? (
              <AgentChatPanel
                agentName={agent.agent_name}
                agentAvatarUrl={displayAvatar}
                messages={chat.messages}
                connection={chat.connection}
                isAgentTyping={chat.isAgentTyping}
                isLoading={chat.isLoading}
                loadError={chat.loadError}
                onSend={chat.sendMessage}
                onRetry={chat.retryMessage}
                scope={agentScope}
              />
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            )}
          </KeyboardAvoidingView>
        ) : (
          /* ── Overview ───────────────────────────────────────── */
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[Colors.primary]}
                tintColor={Colors.primary}
              />
            }
          >
            {agent ? (
              <AgentProfileCard
                agent={agent}
                assignedAt={assignment?.assigned_at}
                isACE1={isACE1}
                onOpenChat={() => setView("chat")}
                onOpenCreditRepair={() => {
                  setCreditRepairPrefill(null);
                  setCreditRepairVisible(true);
                }}
                onLockedLetterLibrary={showLetterLibraryLocked}
                onOpenDisputeTracker={() => setDisputeTrackerVisible(true)}
                onOpenCreditAnalysis={() => setCreditAnalysisVisible(true)}
                onOpenCreditSummary={() => setCreditSummaryVisible(true)}
                onOpenNegativeAccountsDashboard={() =>
                  setNegativeDashboardVisible(true)
                }
              />
            ) : null}

            {/* ── Quick stats row ─────────────────────────────── */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: Colors.info + "20" },
                  ]}
                >
                  <ClipboardList size={18} color={Colors.info} />
                </View>
                <Text style={styles.statNum}>{openDisputes.length}</Text>
                <Text style={styles.statLabel}>Open Disputes</Text>
              </View>
              <View style={styles.statBox}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: Colors.success + "20" },
                  ]}
                >
                  <Shield size={18} color={Colors.success} />
                </View>
                <Text style={styles.statNum}>
                  {disputes.filter((d) => d.status === "resolved").length}
                </Text>
                <Text style={styles.statLabel}>Resolved</Text>
              </View>
              <View style={styles.statBox}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: Colors.accent + "20" },
                  ]}
                >
                  <FileText size={18} color={Colors.accent} />
                </View>
                <Text style={styles.statNum}>{disputes.length}</Text>
                <Text style={styles.statLabel}>Total Letters</Text>
              </View>
            </View>

            {/* ── How it works section ────────────────────────── */}
            <View style={styles.howItWorks}>
              <Text style={styles.sectionTitle}>How Your Agent Works</Text>
              <View style={styles.stepItem}>
                <View
                  style={[styles.stepNum, { backgroundColor: Colors.primary }]}
                >
                  <Text style={styles.stepNumText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Message Your Agent</Text>
                  <Text style={styles.stepDesc}>
                    Ask any credit repair question in the Chat tab. Replies
                    arrive live, and your agent knows your dispute history.
                  </Text>
                </View>
              </View>
              <View style={styles.stepItem}>
                <View
                  style={[styles.stepNum, { backgroundColor: Colors.accent }]}
                >
                  <Text style={styles.stepNumText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Generate Dispute Letters</Text>
                  <Text style={styles.stepDesc}>
                    Ask your agent to write a letter, or use the Credit Repair
                    Tool directly. Letters are saved to your tracker
                    automatically.
                  </Text>
                </View>
              </View>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepNum,
                    { backgroundColor: Colors.secondary },
                  ]}
                >
                  <Text style={styles.stepNumText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Track Everything</Text>
                  <Text style={styles.stepDesc}>
                    Monitor dispute status, response deadlines, and outcomes in
                    the Dispute Tracker. Your agent references this in
                    conversations.
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Feature highlights ──────────────────────────── */}
            <View style={styles.featuresRow}>
              <View style={styles.featureCard}>
                <Zap size={20} color={Colors.primary} />
                <Text style={styles.featureTitle}>AI-Powered</Text>
                <Text style={styles.featureDesc}>
                  Context-aware responses based on your credit situation
                </Text>
              </View>
              <View style={styles.featureCard}>
                <TrendingUp size={20} color={Colors.accent} />
                <Text style={styles.featureTitle}>FCRA Expert</Text>
                <Text style={styles.featureDesc}>
                  {agentScope.unrestricted ||
                  (agentScope.topics.includes("credit_repair") &&
                    agentScope.topics.includes("score_building"))
                    ? "Knows all dispute letter types and credit score factors"
                    : agentScope.topics.includes("business_credit")
                      ? "Knows the business credit ladder, PAYDEX and funding readiness"
                      : agentScope.topics.includes("score_building")
                        ? "Knows the five credit score factors and how to move each one"
                        : "Knows every dispute letter type and your FCRA/FDCPA rights"}
                </Text>
              </View>
            </View>
          </ScrollView>
        )}

        {/* ── Modals ───────────────────────────────────────────── */}
        {agent ? (
          <>
            <CreditRepairModal
              visible={creditRepairVisible}
              onClose={() => {
                setCreditRepairVisible(false);
                setCreditRepairPrefill(null);
              }}
              prefillData={creditRepairPrefill}
              onLetterGenerated={handleLetterGenerated}
            />
            <DisputeTrackerModal
              visible={disputeTrackerVisible}
              onClose={() => setDisputeTrackerVisible(false)}
              onDataChanged={handleDisputeDataChanged}
            />
            <CreditAnalysisModal
              visible={creditAnalysisVisible}
              onClose={() => setCreditAnalysisVisible(false)}
              agentName={agent.agent_name}
              onGenerateLetter={handleAnalysisGenerateLetter}
              onDiscussInChat={handleDiscussAnalysisInChat}
            />
            <CreditSummaryDashboard
              visible={creditSummaryVisible}
              onClose={() => setCreditSummaryVisible(false)}
              onViewBreakdown={() => {
                setCreditSummaryVisible(false);
                setNegativeDashboardVisible(true);
              }}
              onUploadReport={() => {
                setCreditSummaryVisible(false);
                setCreditAnalysisVisible(true);
              }}
              scope={agentScope}
            />
            <NegativeAccountsDashboard
              visible={negativeDashboardVisible}
              onClose={() => setNegativeDashboardVisible(false)}
              onGenerateLetter={handleDashboardGenerateLetter}
            />
            <DisputeQuestionnaireModal
              visible={questionnaireVisible}
              account={questionnaireAccount}
              onClose={() => {
                setQuestionnaireVisible(false);
                setQuestionnaireAccount(null);
              }}
              onComplete={handleQuestionnaireComplete}
            />
          </>
        ) : null}
      </View>
    </>
  );
}

// ============================================================
// Segmented control button
// ============================================================

function SegmentButton({
  active,
  onPress,
  label,
  accessibilityLabel,
  children,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
  accessibilityLabel: string;
  children: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={[styles.segmentButton, active && styles.segmentButtonActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
      <Text
        style={[styles.segmentText, active && styles.segmentTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================
// Locked View — shown to non-ACE-1 users
// ============================================================

function LockedView({
  router,
  insets,
  embedded = false,
}: {
  router: ReturnType<typeof useRouter>;
  insets: ReturnType<typeof useSafeAreaInsets>;
  embedded?: boolean;
}) {
  return (
    <>
      {!embedded && <Stack.Screen options={{ headerShown: false }} />}
      <View
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <View style={styles.header}>
          {embedded ? (
            <View style={{ width: 40 }} />
          ) : (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft color={Colors.text} size={24} />
            </TouchableOpacity>
          )}
          <View style={styles.headerCenter}>
            <Bot size={20} color={Colors.textLight} />
            <Text style={styles.headerTitle}>My Agent</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.lockedContainer}>
          <View style={styles.lockedIconWrap}>
            <Lock size={48} color={Colors.primary} />
          </View>
          <Text style={styles.lockedTitle}>
            Unlock Your AI Dispute Assistant
          </Text>
          <Text style={styles.lockedDesc}>
            Your personal AI Dispute Assistant is available exclusively to
            ACE-1 course students. Enroll in the ACE-1 Credit Repair
            Certification course to get matched with one of 10,000 specialized
            AI agents who will help you dispute errors, generate letters, and
            build your credit.
          </Text>

          <View style={styles.lockedFeatures}>
            <View style={styles.lockedFeatureRow}>
              <Sparkles size={16} color={Colors.accent} />
              <Text style={styles.lockedFeatureText}>
                Personal AI agent assigned to you
              </Text>
            </View>
            <View style={styles.lockedFeatureRow}>
              <FileText size={16} color={Colors.accent} />
              <Text style={styles.lockedFeatureText}>
                Generate FCRA & FDCPA dispute letters
              </Text>
            </View>
            <View style={styles.lockedFeatureRow}>
              <ClipboardList size={16} color={Colors.accent} />
              <Text style={styles.lockedFeatureText}>
                Track disputes with AI guidance
              </Text>
            </View>
            <View style={styles.lockedFeatureRow}>
              <MessageCircle size={16} color={Colors.accent} />
              <Text style={styles.lockedFeatureText}>
                24/7 chat with credit repair expertise
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.enrollButton}
            onPress={() => router.push("/subscription-plans")}
            accessibilityRole="button"
            accessibilityLabel="Enroll in ACE-1 course to unlock My Agent"
          >
            <Text style={styles.enrollButtonText}>Enroll in ACE-1 Course</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

// ============================================================
// No Agent View — ACE-3-only students
// ============================================================

/**
 * Shown when a student is enrolled but owns no course that includes an
 * agent (in practice, ACE-3 on its own).
 *
 * This is deliberately NOT the locked upsell screen: these people already
 * paid us, so the copy explains the mismatch honestly instead of implying
 * they are missing a subscription.
 */
function NoAgentView({
  router,
  insets,
  embedded = false,
}: {
  router: ReturnType<typeof useRouter>;
  insets: ReturnType<typeof useSafeAreaInsets>;
  embedded?: boolean;
}) {
  return (
    <>
      {!embedded && <Stack.Screen options={{ headerShown: false }} />}
      <View
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <View style={styles.header}>
          {embedded ? (
            <View style={{ width: 40 }} />
          ) : (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft color={Colors.text} size={24} />
            </TouchableOpacity>
          )}
          <View style={styles.headerCenter}>
            <Bot size={20} color={Colors.textLight} />
            <Text style={styles.headerTitle}>My Agent</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.lockedContainer}>
          <View style={styles.lockedIconWrap}>
            <Bot size={48} color={Colors.primary} />
          </View>
          <Text style={styles.lockedTitle}>
            No agent yet
          </Text>
          <Text style={styles.lockedDesc}>{AGENT_NOT_INCLUDED_MESSAGE}</Text>

          <View style={styles.lockedFeatures}>
            <View style={styles.lockedFeatureRow}>
              <FileText size={16} color={Colors.accent} />
              <Text style={styles.lockedFeatureText}>
                ACE-1 — disputes, letters and negative item removal
              </Text>
            </View>
            <View style={styles.lockedFeatureRow}>
              <TrendingUp size={16} color={Colors.accent} />
              <Text style={styles.lockedFeatureText}>
                ACE-2 — score building toward 800+
              </Text>
            </View>
            <View style={styles.lockedFeatureRow}>
              <Shield size={16} color={Colors.accent} />
              <Text style={styles.lockedFeatureText}>
                ACE-3 — establishing business credit
              </Text>
            </View>
            <View style={styles.lockedFeatureRow}>
              <Sparkles size={16} color={Colors.accent} />
              <Text style={styles.lockedFeatureText}>
                ACE-4 Bundle — an agent with no topic limits at all
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.enrollButton}
            onPress={() => router.push("/subscription-plans")}
            accessibilityRole="button"
            accessibilityLabel="View courses that include an AI agent"
          >
            <Text style={styles.enrollButtonText}>View Courses</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  // Conversation header
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  identity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  identityAvatarWrap: {
    width: 38,
    height: 38,
  },
  identityAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  identityFallback: {
    backgroundColor: AGENT_VIOLET,
    alignItems: "center",
    justifyContent: "center",
  },
  presenceDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  identityText: {
    flex: 1,
  },
  identityName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  identityStatus: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  // Segmented control
  segment: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  segmentButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
  },
  segmentButtonActive: {
    backgroundColor: AGENT_VIOLET,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.white,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 16,
  },
  loadingDesc: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  // Error
  errorContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 32,
    gap: 16,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.warningLight + "30",
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.text,
  },
  offlineBannerAction: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
  errorHintBox: {
    width: "100%",
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  errorHintLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  errorHintText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.warningLight + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
  },
  errorDesc: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statNum: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // How it works
  howItWorks: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  // Features
  featuresRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  featureCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  featureDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  // Locked view
  lockedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  lockedIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
  },
  lockedDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  lockedFeatures: {
    gap: 12,
    alignSelf: "stretch",
    marginTop: 8,
  },
  lockedFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  lockedFeatureText: {
    fontSize: 14,
    color: Colors.text,
  },
  enrollButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 16,
  },
  enrollButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
