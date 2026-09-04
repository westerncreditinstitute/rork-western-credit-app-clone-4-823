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
import { trpc } from "@/lib/trpc";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAgentChat, type TriggeredLetter } from "@/hooks/useAgentChat";

import AgentProfileCard, {
  AgentInfo,
} from "@/components/MyAgent/AgentProfileCard";
import AgentChatPanel from "@/components/MyAgent/AgentChatPanel";
import CreditRepairModal from "@/components/MyAgent/CreditRepairModal";
import DisputeTrackerModal from "@/components/MyAgent/DisputeTrackerModal";
import CreditAnalysisModal from "@/components/MyAgent/CreditAnalysisModal";

// ============================================================
// Constants
// ============================================================

/** The My Agent identity colour, shared with the tab bar. */
const AGENT_VIOLET = "#A78BFA";

/** Which surface of the tab is on screen. */
type AgentView = "chat" | "overview";

// ============================================================
// Main My Agent Screen
// ============================================================

export interface MyAgentScreenProps {
  /** When true, renders inside a bottom tab: no back button,
   *  and the tab navigator supplies the safe-area top inset. */
  embedded?: boolean;
}

export default function MyAgentScreen({
  embedded = false,
}: MyAgentScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { tier } = useSubscription();
  const { disputes, refetch: refetchDisputes } = useDisputes();

  const userId = user?.id || "";

  // ── View + modal state ────────────────────────────────────────
  const [view, setView] = useState<AgentView>("chat");
  const [creditRepairVisible, setCreditRepairVisible] = useState(false);
  const [disputeTrackerVisible, setDisputeTrackerVisible] = useState(false);
  const [creditAnalysisVisible, setCreditAnalysisVisible] = useState(false);
  const [creditRepairPrefill, setCreditRepairPrefill] = useState<{
    letterType?: string;
    creditorName?: string;
    accountNumber?: string;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Agent assignment & fetch ──────────────────────────────────
  // First, check if the user already has an agent assigned.
  const myAgentQuery = trpc.aiAgents.getMyAgent.useQuery(
    { userId },
    { enabled: !!userId, staleTime: 60_000 },
  );

  // Assignment mutation — called when user has no agent yet.
  const assignAgentMutation = trpc.aiAgents.assign.useMutation({
    onSuccess: (data) => {
      console.log("[MyAgent] Agent assigned:", data.agent?.agent_name);
      myAgentQuery.refetch();
    },
    onError: (error) => {
      // No Alert here: the render branch below shows a specific, actionable
      // explanation of the failure. A popup on top of it would just be noise.
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
    if (assignAgentMutation.isError) return;

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
  ]);

  // ── Derived agent state ───────────────────────────────────────
  const agent = myAgentQuery.data?.agent as AgentInfo | undefined;
  const assignment = myAgentQuery.data?.assignment;
  const isAssigning =
    assignAgentMutation.isPending ||
    (myAgentQuery.isLoading && !myAgentQuery.data);

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

    const raw =
      assignAgentMutation.error?.message ||
      myAgentQuery.data?.setupError?.message ||
      myAgentQuery.error?.message ||
      "";

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
  ]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleDisputeDataChanged = useCallback(() => {
    refetchDisputes?.();
  }, [refetchDisputes]);

  /** The agent used its letter tool mid-conversation — open the editor. */
  const handleLetterFromAgent = useCallback((letter: TriggeredLetter) => {
    setCreditRepairPrefill({
      letterType: letter.letterType,
      creditorName: letter.creditorName,
      accountNumber: letter.accountNumber,
    });
    setCreditRepairVisible(true);
  }, []);

  /** Jump from an analysis recommendation straight into letter generation. */
  const handleAnalysisGenerateLetter = useCallback(
    (data: {
      letterType: string;
      creditorName: string;
      accountNumber: string;
    }) => {
      setCreditAnalysisVisible(false);
      setCreditRepairPrefill(data);
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
    (_disputeId?: string) => {
      // Refresh dispute data after a letter is generated
      refetchDisputes?.();
    },
    [refetchDisputes],
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

  // ============================================================
  // Render — Loading state
  // ============================================================

  if (isAssigning && !agent) {
    return (
      <>
        {!embedded && <Stack.Screen options={{ headerShown: false }} />}
        <View
          style={[styles.container, { paddingTop: embedded ? 0 : insets.top }]}
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
            <Text style={styles.loadingTitle}>Assigning Your AI Agent...</Text>
            <Text style={styles.loadingDesc}>
              We&apos;re matching you with one of 10,000 specialized AI Credit Repair
              Agents. This only takes a moment.
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
          style={[styles.container, { paddingTop: embedded ? 0 : insets.top }]}
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
  const statusLabel =
    chat.connection === "live"
      ? "Online now"
      : chat.connection === "connecting"
        ? "Connecting…"
        : chat.connection === "polling"
          ? "Online"
          : "Reconnecting…";

  return (
    <>
      {!embedded && <Stack.Screen options={{ headerShown: false }} />}
      <View
        style={[styles.container, { paddingTop: embedded ? 0 : insets.top }]}
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
              {agent?.avatar_url ? (
                <Image
                  source={{ uri: agent.avatar_url }}
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
                {agent ? statusLabel : "AI Credit Repair Agent"}
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

        {/* ── Chat ─────────────────────────────────────────────── */}
        {view === "chat" ? (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={embedded ? 0 : insets.top}
          >
            {agent ? (
              <AgentChatPanel
                agentName={agent.agent_name}
                agentAvatarUrl={agent.avatar_url}
                messages={chat.messages}
                connection={chat.connection}
                isAgentTyping={chat.isAgentTyping}
                isLoading={chat.isLoading}
                loadError={chat.loadError}
                onSend={chat.sendMessage}
                onRetry={chat.retryMessage}
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
                onOpenDisputeTracker={() => setDisputeTrackerVisible(true)}
                onOpenCreditAnalysis={() => setCreditAnalysisVisible(true)}
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
                  Knows all dispute letter types and credit score factors
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
        style={[styles.container, { paddingTop: embedded ? 0 : insets.top }]}
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
            Unlock Your AI Credit Repair Agent
          </Text>
          <Text style={styles.lockedDesc}>
            Your personal AI Credit Repair Agent is available exclusively to
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
