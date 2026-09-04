import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Wallet,
  Settings,
  DollarSign,
  UserCheck,
  FileText,
  Clock,
  Bell,
  CreditCard,
  User as UserIcon,
  ChevronRight,
  Shield,
  Crown,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useUser } from "@/contexts/UserContext";

interface MenuItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  badge?: string;
  requiresACE1?: boolean;
  requiresAdmin?: boolean;
}

export default function MoreScreen() {
  const router = useRouter();
  const { tier } = useSubscription();
  const { user } = useUser();

  // Dev/testing bypass: set EXPO_PUBLIC_UNLOCK_ACE1=true in your Rork Secrets
  // (or .env) to preview ACE-1 gated features without a paid subscription.
  // Leave it unset/false in production so real gating applies.
  const unlockForTesting = process.env.EXPO_PUBLIC_UNLOCK_ACE1 === "true";

  const isACE1 =
    unlockForTesting || tier === "ace1_student" || tier === "cso_affiliate";
  const isAdmin =
    unlockForTesting || user?.role === "CSO" || user?.role === "Affiliate";

  // ============================================================
  // Menu groups
  // ============================================================

  const financialTools: MenuItem[] = [
    {
      id: "wallet",
      label: "Wallet",
      description: "Manage your balance, transactions, and MUSO tokens",
      icon: <Wallet color={Colors.primary} size={24} />,
      route: "/(tabs)/wallet",
    },
    {
      id: "earnings",
      label: "Earnings",
      description: "Track referral earnings and commission payouts",
      icon: <DollarSign color={Colors.primary} size={24} />,
      route: "/(tabs)/earnings",
    },
    {
      id: "hire-pro",
      label: "Hire a Pro",
      description: "Connect with a certified credit repair professional",
      icon: <UserCheck color={Colors.primary} size={24} />,
      route: "/(tabs)/hire-pro",
    },
  ];

  const creditTools: MenuItem[] = [
    {
      id: "dispute-assistant",
      label: "AI Dispute Assistant",
      description: "Generate FCRA dispute letters (609, 611, 623, 809)",
      icon: <FileText color={Colors.primary} size={24} />,
      route: "/ai-dispute-assistant",
      requiresACE1: true,
    },
    {
      id: "dispute-tracker",
      label: "Dispute Tracker",
      description: "Track the status of all your credit disputes",
      icon: <Clock color={Colors.primary} size={24} />,
      route: "/dispute-tracker",
      requiresACE1: true,
    },
    {
      id: "interactive-coach",
      label: "AI Credit Coach",
      description: "Video avatar coach for credit repair guidance",
      icon: <Crown color={Colors.primary} size={24} />,
      route: "/interactive-coach",
      requiresACE1: true,
    },
    {
      id: "lawsuit-assistant",
      label: "Lawsuit Assistant",
      description: "Prepare for legal action on unresolved disputes",
      icon: <Shield color={Colors.primary} size={24} />,
      route: "/lawsuit-assistant",
      requiresACE1: true,
    },
  ];

  const accountTools: MenuItem[] = [
    {
      id: "personal-info",
      label: "Personal Information",
      description: "Update your profile and contact details",
      icon: <UserIcon color={Colors.primary} size={24} />,
      route: "/personal-info",
    },
    {
      id: "payment-methods",
      label: "Payment Methods",
      description: "Manage your subscription and payment options",
      icon: <CreditCard color={Colors.primary} size={24} />,
      route: "/payment-methods",
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "View and manage your notifications",
      icon: <Bell color={Colors.primary} size={24} />,
      route: "/notifications",
    },
  ];

  const adminTools: MenuItem[] = isAdmin
    ? [
        {
          id: "admin",
          label: "Admin Panel",
          description: "Manage users, courses, and platform settings",
          icon: <Settings color={Colors.primary} size={24} />,
          route: "/(tabs)/admin",
          requiresAdmin: true,
        },
      ]
    : [];

  // ============================================================
  // Render
  // ============================================================

  const renderMenuItem = (item: MenuItem) => {
    const locked = item.requiresACE1 && !isACE1;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.menuItem}
        onPress={() => {
          if (locked) {
            router.push("/subscription-plans");
          } else {
            router.push(item.route as any);
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityHint={item.description}
        activeOpacity={0.7}
      >
        <View style={styles.menuItemLeft}>
          <View style={styles.menuItemIcon}>{item.icon}</View>
          <View style={styles.menuItemText}>
            <View style={styles.menuItemTitleRow}>
              <Text style={styles.menuItemLabel}>{item.label}</Text>
              {item.badge && (
                <View
                  style={[
                    styles.badge,
                    locked ? styles.badgeLocked : styles.badgeActive,
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {locked ? "LOCKED" : item.badge}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.menuItemDescription}>{item.description}</Text>
          </View>
        </View>
        <ChevronRight color={Colors.textLight} size={20} />
      </TouchableOpacity>
    );
  };

  const renderGroup = (title: string, items: MenuItem[]) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.group}>
        <Text style={styles.groupTitle}>{title}</Text>
        <View style={styles.groupCard}>{items.map(renderMenuItem)}</View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
        <Text style={styles.headerSubtitle}>
          {isACE1 ? "ACE-1 Student" : "Free Plan"} · {user?.name || "Guest"}
        </Text>
      </View>

      {renderGroup("Agent & Financial", financialTools)}
      {renderGroup("Credit Repair Tools", creditTools)}
      {renderGroup("Account", accountTools)}
      {renderGroup("Administration", adminTools)}

      {!isACE1 && (
        <TouchableOpacity
          style={styles.upgradeCard}
          onPress={() => router.push("/subscription-plans")}
          accessibilityRole="button"
          accessibilityLabel="Upgrade to ACE-1"
        >
          <Crown color={Colors.accent} size={28} />
          <View style={styles.upgradeText}>
            <Text style={styles.upgradeTitle}>
              Unlock AI Credit Repair Agent
            </Text>
            <Text style={styles.upgradeDescription}>
              Enroll in ACE-1 to get your personal AI agent, dispute letter
              generation, and dispute tracking — just $25/month.
            </Text>
          </View>
          <ChevronRight color={Colors.accent} size={20} />
        </TouchableOpacity>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Western Credit Institute</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center" as const,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: Colors.textLight,
  },
  group: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.textLight,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      web: {
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      },
    }),
  },
  menuItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  menuItemLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flex: 1,
  },
  menuItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: 14,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  menuItemLabel: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  menuItemDescription: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeActive: {
    backgroundColor: (Colors.accent || "#6366f1") + "22",
  },
  badgeLocked: {
    backgroundColor: "#FEE2E2",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.accent || "#6366f1",
  },
  upgradeCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: (Colors.accent || "#6366f1") + "12",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: (Colors.accent || "#6366f1") + "33",
  },
  upgradeText: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  upgradeDescription: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 18,
  },
  footer: {
    alignItems: "center" as const,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textLight,
  },
});
