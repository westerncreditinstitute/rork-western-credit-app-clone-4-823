import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bot,
  Sparkles,
  MessageCircle,
  FileText,
  ClipboardList,
  ChevronRight,
  FileSearch,
  Radio,
} from "lucide-react-native";
import { useSubscription } from "@/contexts/SubscriptionContext";

// ============================================================
// AgentProfileCard — the "agent console" on the Overview tab.
//
// A dark, futuristic command-deck surface: the realistic AI
// character portrait under a violet HUD glow, monospace system
// readouts, and glowing action rows. Deliberately dark in both
// themes so it reads as a separate, always-on instrument panel.
// ============================================================

/** Generated hero portrait of the AI agent (also bundled on iOS). */
export const AGENT_HERO_IMAGE =
  "https://r2-pub.rork.com/projects/ulx77mlx9b7syygnanmal/assets/4cf2499a-fa3c-44f2-9c7a-95b2e7f5ce49.png";

// Console palette — fixed so the panel looks identical day and night.
const CONSOLE_BG = "#0B1220";
const CONSOLE_TEXT = "#E2E8F0";
const CONSOLE_MUTED = "#7C8BA1";
const VIOLET = "#A78BFA";
const TEAL = "#67E8F9";

// ============================================================
// Types — must match the AIAgent shape returned by getMyAgent
// ============================================================

export interface AgentInfo {
  id: number;
  agent_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  specialty?: string | null;
  max_users: number;
  current_user_count: number;
  is_active: boolean;
}

export interface AgentProfileCardProps {
  agent: AgentInfo;
  assignedAt?: string;
  /** Open the chat modal */
  onOpenChat?: () => void;
  /** Open the credit repair (letter generation) modal */
  onOpenCreditRepair?: () => void;
  /** Open the dispute tracker modal */
  onOpenDisputeTracker?: () => void;
  /** Open the AI Dispute Assistant (credit report analysis) modal */
  onOpenCreditAnalysis?: () => void;
  /** Open the per-bureau negative accounts dashboard */
  onOpenNegativeAccountsDashboard?: () => void;
  /** Whether the current user is an ACE-1 student (controls action button visibility) */
  isACE1?: boolean;
}

// ============================================================
// Component
// ============================================================

export default function AgentProfileCard({
  agent,
  assignedAt,
  onOpenChat,
  onOpenCreditRepair,
  onOpenDisputeTracker,
  onOpenCreditAnalysis,
  onOpenNegativeAccountsDashboard,
  isACE1 = true,
}: AgentProfileCardProps) {
  const { tier } = useSubscription();

  const formattedDate = assignedAt
    ? new Date(assignedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const loadRatio = Math.min(1, agent.current_user_count / Math.max(1, agent.max_users));
  const loadColor = loadRatio >= 1 ? "#F87171" : loadRatio >= 0.8 ? "#FBBF24" : TEAL;

  // ── Quick action buttons ──────────────────────────────────────
  const actions = [
    {
      id: "chat",
      label: "Chat with Agent",
      description: "Ask questions, get advice, generate letters",
      icon: MessageCircle,
      color: VIOLET,
      onPress: onOpenChat,
    },
    {
      id: "credit-analysis",
      label: "Analyze My Credit Report",
      description: "Your agent finds what to dispute",
      icon: FileSearch,
      color: TEAL,
      onPress: onOpenCreditAnalysis,
    },
    {
      id: "negative-accounts-dashboard",
      label: "Negative Accounts by Bureau",
      description: "Every negative account, all bureaus",
      icon: ClipboardList,
      color: "#FBBF24",
      onPress: onOpenNegativeAccountsDashboard,
    },
    {
      id: "credit-repair",
      label: "Credit Repair Tool",
      description: "Generate FCRA & FDCPA letters",
      icon: FileText,
      color: "#F472B6",
      onPress: onOpenCreditRepair,
    },
    {
      id: "dispute-tracker",
      label: "Dispute Tracker",
      description: "Status of every dispute you filed",
      icon: ClipboardList,
      color: "#5EEAD4",
      onPress: onOpenDisputeTracker,
    },
  ];

  return (
    <View
      style={styles.card}
      accessibilityRole="summary"
      accessibilityLabel={`Your AI Dispute Assistant: ${agent.agent_name}`}
    >
      {/* ── Hero: AI character under HUD glow ──────────────────── */}
      <View style={styles.hero}>
        <Image
          source={{ uri: agent.avatar_url || AGENT_HERO_IMAGE }}
          style={styles.heroImage}
          accessibilityRole="image"
          accessibilityLabel={`${agent.agent_name} portrait`}
        />
        {/* Fade the portrait into the console body */}
        <LinearGradient
          colors={["transparent", "rgba(11,18,32,0.55)", CONSOLE_BG]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {/* Violet aura rising from the bottom edge */}
        <LinearGradient
          colors={["transparent", "rgba(167,139,250,0.22)"]}
          style={[StyleSheet.absoluteFill, styles.aura]}
          pointerEvents="none"
        />

        {/* HUD frame lines */}
        <View pointerEvents="none" style={[styles.hudCornerTL, styles.hudCorner]} />
        <View pointerEvents="none" style={[styles.hudCornerTR, styles.hudCorner]} />

        {/* Live link chip */}
        <View style={styles.liveChip}>
          <Radio size={11} color={TEAL} />
          <Text style={styles.liveChipText}>LINK ACTIVE</Text>
        </View>

        {/* Identity plate */}
        <View style={styles.identityPlate}>
          <View style={styles.idRow}>
            <Text style={styles.agentName} numberOfLines={1}>
              {agent.agent_name}
            </Text>
            <View style={styles.verifiedBadge}>
              <Sparkles size={10} color={CONSOLE_BG} />
              <Text style={styles.verifiedText}>AI AGENT</Text>
            </View>
          </View>
          {agent.specialty ? (
            <Text style={styles.specialty} numberOfLines={1}>
              {agent.specialty.toUpperCase()}
            </Text>
          ) : null}
          {formattedDate ? (
            <Text style={styles.assignedDate}>
              ASSIGNED // {formattedDate.toUpperCase()}
            </Text>
          ) : null}
        </View>
      </View>

      {/* ── System readouts ────────────────────────────────────── */}
      <View style={styles.readouts}>
        {/* Capacity gauge */}
        <View style={styles.readoutRow}>
          <Text style={styles.readoutLabel}>AGENT WORKLOAD</Text>
          <Text style={styles.readoutValue}>
            {agent.current_user_count}/{agent.max_users} CLIENTS
          </Text>
        </View>
        <View style={styles.capacityTrack}>
          <View
            style={[
              styles.capacityFill,
              {
                width: `${Math.max(4, loadRatio * 100)}%`,
                backgroundColor: loadColor,
              },
            ]}
          />
        </View>

        {/* Bio as mission briefing */}
        {agent.bio ? (
          <View style={styles.briefing}>
            <Text style={styles.briefingLabel}>MISSION BRIEFING</Text>
            <Text style={styles.briefingText}>{agent.bio}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Quick actions: glowing console rows ────────────────── */}
      {isACE1 && tier !== "free" ? (
        <View style={styles.actionsSection}>
          <Text style={styles.actionsLabel}>MISSION MODULES</Text>
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <TouchableOpacity
                key={action.id}
                style={styles.actionButton}
                onPress={action.onPress}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                accessibilityHint={action.description}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.actionIconWrap,
                    { borderColor: `${action.color}66`, backgroundColor: `${action.color}1F` },
                  ]}
                >
                  <Icon size={18} color={action.color} />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  <Text style={styles.actionDescription} numberOfLines={1}>
                    {action.description}
                  </Text>
                </View>
                <ChevronRight size={18} color={CONSOLE_MUTED} />
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {/* Footer serial line */}
      <View style={styles.footerRow}>
        <Bot size={11} color={CONSOLE_MUTED} />
        <Text style={styles.footerText}>
          SECURE CHANNEL // AGENT #{String(agent.id).padStart(4, "0")}
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: CONSOLE_BG,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.28)",
    ...Platform.select({
      ios: {
        shadowColor: VIOLET,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: { elevation: 6 },
      web: {
        boxShadow: "0 8px 28px rgba(167,139,250,0.18)",
      },
    }),
  },

  // ── Hero ─────────────────────────────────────────────────────
  hero: {
    height: 300,
    backgroundColor: "#111A2E",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: "cover",
  },
  aura: {
    bottom: -40,
    height: 180,
  },
  hudCorner: {
    position: "absolute",
    top: 12,
    width: 26,
    height: 26,
    borderColor: "rgba(167, 139, 250, 0.65)",
  },
  hudCornerTL: {
    left: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderTopLeftRadius: 6,
  },
  hudCornerTR: {
    right: 12,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderTopRightRadius: 6,
  },
  liveChip: {
    position: "absolute",
    top: 14,
    left: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(11, 18, 32, 0.72)",
    borderColor: "rgba(103, 232, 249, 0.5)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  liveChipText: {
    color: TEAL,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  identityPlate: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 18,
    paddingTop: 26,
  },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  agentName: {
    fontSize: 24,
    fontWeight: "800",
    color: CONSOLE_TEXT,
    letterSpacing: 0.3,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: VIOLET,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  verifiedText: {
    color: CONSOLE_BG,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  specialty: {
    fontSize: 11,
    color: TEAL,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginTop: 5,
  },
  assignedDate: {
    fontSize: 10,
    color: CONSOLE_MUTED,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginTop: 4,
  },

  // ── Readouts ─────────────────────────────────────────────────
  readouts: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  readoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
  },
  readoutLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: CONSOLE_MUTED,
    letterSpacing: 1.6,
  },
  readoutValue: {
    fontSize: 10,
    fontWeight: "800",
    color: CONSOLE_TEXT,
    letterSpacing: 1,
  },
  capacityTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(124, 139, 161, 0.18)",
    overflow: "hidden",
  },
  capacityFill: {
    height: "100%",
    borderRadius: 3,
  },
  briefing: {
    marginTop: 14,
    backgroundColor: "rgba(167, 139, 250, 0.07)",
    borderColor: "rgba(167, 139, 250, 0.22)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  briefingLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: VIOLET,
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  briefingText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#B9C4D6",
  },

  // ── Actions ──────────────────────────────────────────────────
  actionsSection: {
    paddingHorizontal: 18,
    paddingTop: 20,
    gap: 10,
  },
  actionsLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: CONSOLE_MUTED,
    letterSpacing: 1.6,
    marginBottom: 2,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(148, 163, 184, 0.07)",
    borderColor: "rgba(148, 163, 184, 0.14)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    gap: 13,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextWrap: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: CONSOLE_TEXT,
  },
  actionDescription: {
    fontSize: 11,
    color: CONSOLE_MUTED,
    marginTop: 2,
  },

  // ── Footer ───────────────────────────────────────────────────
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingTop: 18,
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 9,
    fontWeight: "700",
    color: CONSOLE_MUTED,
    letterSpacing: 1.6,
  },
});
