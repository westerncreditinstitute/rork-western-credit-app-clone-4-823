import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import {
  Bot,
  Sparkles,
  MessageCircle,
  FileText,
  ClipboardList,
  ChevronRight,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useSubscription } from "@/contexts/SubscriptionContext";

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
  isACE1 = true,
}: AgentProfileCardProps) {
  const { tier } = useSubscription();

  const initials = agent.agent_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const formattedDate = assignedAt
    ? new Date(assignedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  // ── Quick action buttons ──────────────────────────────────────
  const actions = [
    {
      id: "chat",
      label: "Chat with Agent",
      description: "Ask questions, get advice, generate letters",
      icon: MessageCircle,
      color: Colors.primary,
      onPress: onOpenChat,
    },
    {
      id: "credit-repair",
      label: "Credit Repair Tool",
      description: "Generate FCRA & FDCPA dispute letters",
      icon: FileText,
      color: Colors.accent,
      onPress: onOpenCreditRepair,
    },
    {
      id: "dispute-tracker",
      label: "Dispute Tracker",
      description: "View and manage your dispute status",
      icon: ClipboardList,
      color: Colors.secondary,
      onPress: onOpenDisputeTracker,
    },
  ];

  return (
    <View
      style={styles.card}
      accessibilityRole="summary"
      accessibilityLabel={`Your AI Credit Repair Agent: ${agent.agent_name}`}
    >
      {/* ── Agent identity header ──────────────────────────────── */}
      <View style={styles.header}>
        {agent.avatar_url ? (
          <Image
            source={{ uri: agent.avatar_url }}
            style={styles.avatar}
            accessibilityRole="image"
            accessibilityLabel={`${agent.agent_name} avatar`}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Bot size={32} color={Colors.white} />
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}

        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.agentName}>{agent.agent_name}</Text>
            <View style={styles.verifiedBadge}>
              <Sparkles size={12} color={Colors.white} />
              <Text style={styles.verifiedText}>AI Agent</Text>
            </View>
          </View>
          {agent.specialty ? (
            <Text style={styles.specialty}>{agent.specialty}</Text>
          ) : null}
          {formattedDate ? (
            <Text style={styles.assignedDate}>
              Assigned to you on {formattedDate}
            </Text>
          ) : null}
        </View>
      </View>

      {/* ── Bio ────────────────────────────────────────────────── */}
      {agent.bio ? (
        <View style={styles.bioSection}>
          <Text style={styles.bioLabel}>About Your Agent</Text>
          <Text style={styles.bioText}>{agent.bio}</Text>
        </View>
      ) : null}

      {/* ── Capacity indicator ─────────────────────────────────── */}
      <View style={styles.capacityRow}>
        <View style={styles.capacityInfo}>
          <Text style={styles.capacityLabel}>Agent workload</Text>
          <Text style={styles.capacityValue}>
            {agent.current_user_count} / {agent.max_users} clients
          </Text>
        </View>
        <View style={styles.capacityBarBg}>
          <View
            style={[
              styles.capacityBarFill,
              {
                width: `${Math.min(
                  100,
                  (agent.current_user_count / agent.max_users) * 100
                )}%`,
                backgroundColor:
                  agent.current_user_count >= agent.max_users
                    ? Colors.error
                    : agent.current_user_count >= agent.max_users * 0.8
                    ? Colors.warning
                    : Colors.success,
              },
            ]}
          />
        </View>
      </View>

      {/* ── Quick actions ──────────────────────────────────────── */}
      {isACE1 && tier !== "free" ? (
        <View style={styles.actionsSection}>
          <Text style={styles.actionsLabel}>Quick Actions</Text>
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
              >
                <View
                  style={[styles.actionIconWrap, { backgroundColor: action.color }]}
                >
                  <Icon size={20} color={Colors.white} />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  <Text style={styles.actionDescription}>
                    {action.description}
                  </Text>
                </View>
                <ChevronRight size={20} color={Colors.textLight} />
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
      web: {
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surfaceAlt,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  agentName: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "600",
  },
  specialty: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: "600",
    marginTop: 4,
  },
  assignedDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  bioSection: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  bioLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  capacityRow: {
    marginBottom: 20,
  },
  capacityInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  capacityLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  capacityValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: "600",
  },
  capacityBarBg: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: "hidden",
  },
  capacityBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  actionsSection: {
    gap: 10,
  },
  actionsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 14,
    padding: 14,
    gap: 14,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextWrap: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  actionDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
