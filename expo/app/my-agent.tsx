import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
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
import { useAgentChat, type TriggeredLetter } from "@/hooks/useAgentChat";

import AgentProfileCard, {
  AgentInfo,
} from "@/components/MyAgent/AgentProfileCard";
import AgentChatPanel from "@/components/MyAgent/AgentChatPanel";
import CreditRepairModal from "@/components/MyAgent/CreditRepairModal";
import DisputeTrackerModal from "@/components/MyAgent/DisputeTrackerModal";

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
      console.error("[MyAgent] Assignment error:", error);
      if (!error.message?.includes("ALL_AGENTS_AT_CAPACITY")) {
        Alert.alert(
          "Assignment Issue",
          error.message || "Could not assign your AI agent. Please try again.",
        );
      }
    },
  });

  // ── Auto-assign on mount if no agent and user is ACE-1 ────────
  const isACE1 = tier === "ace1_student" || tier === "cso_affiliate";

  useEffect(() => {
    if (
      !userId ||
      !isACE1 ||
      myAgentQuery.isLoading ||
      assignAgentMutation.isPending
    ) {
      return;
    }

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
    assignAgentMutation,
  ]);

  // ── Derived agent state ───────────────────────────────────────
  const agent = myAgentQuery.data?.agent as AgentInfo | undefined;
  const assignment = myAgentQuery.data?.assignment;
  const isAssigning =
    assignAgentMutation.isPending ||
    (myAgentQuery.isLoading && !myAgentQuery.data);

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

  // ── Live chat ─────────────────────────────────────────────────
  const chat = useAgentChat({
    userId,
    agentId: agent?.id,
    enabled: isACE1 && !!agent,
    onLetterGenerated: handleLetterFromAgent,
    onDisputeDataChanged: handleDisputeDataChanged,
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
              We're matching you with one of 10,000 specialized AI Credit Repair
              Agents. This only takes a moment.
            </Text>
          </View>
        </View>
      </>
    );
  }

  // ============================================================
  // Render — Error state (all agents at capacity)
  // ============================================================

  if (assignAgentMutation.isError && !agent) {
    const errorMessage = assignAgentMutation.error?.message || "";
    const isAtCapacity =
      errorMessage.includes("ALL_AGENTS_AT_CAPACITY") ||
      errorMessage.includes("capacity");

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
          <View style={styles.errorContainer}>
            <View style={styles.errorIconWrap}>
              <Bot size={48} color={Colors.warning} />
            </View>
            <Text style={styles.errorTitle}>
              {isAtCapacity ? "All Agents Are Busy" : "Something Went Wrong"}
            </Text>
            <Text style={styles.errorDesc}>
              {isAtCapacity
                ? "All 10,000 AI agents are currently at maximum capacity (25 clients each). This is extraordinary demand — please try again in a few minutes."
                : errorMessage ||
                  "We couldn't assign your agent. Please try again."}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => assignAgentMutation.mutate({ userId })}
              accessibilityRole="button"
              accessibilityLabel="Retry agent assignment"
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
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
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
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
