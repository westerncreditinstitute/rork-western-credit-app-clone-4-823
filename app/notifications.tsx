import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft, Bell, Mail, Volume2, Calendar, TrendingUp, BookOpen, Gift } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { Card } from "@/components/ui";

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [pushSettings, setPushSettings] = useState<NotificationSetting[]>([
    {
      id: "course_updates",
      title: "Course Updates",
      description: "New lessons, content updates",
      icon: <BookOpen color={colors.primary} size={20} />,
      enabled: true,
    },
    {
      id: "earnings",
      title: "Earnings & Referrals",
      description: "Commission alerts, payouts",
      icon: <TrendingUp color={colors.success} size={20} />,
      enabled: true,
    },
    {
      id: "reminders",
      title: "Learning Reminders",
      description: "Daily study reminders",
      icon: <Calendar color={colors.warning} size={20} />,
      enabled: false,
    },
    {
      id: "promotions",
      title: "Promotions & Offers",
      description: "Special deals, discounts",
      icon: <Gift color={colors.secondary} size={20} />,
      enabled: true,
    },
  ]);

  const [emailSettings, setEmailSettings] = useState<NotificationSetting[]>([
    {
      id: "weekly_digest",
      title: "Weekly Digest",
      description: "Summary of your progress",
      icon: <Mail color={colors.primary} size={20} />,
      enabled: true,
    },
    {
      id: "newsletters",
      title: "Credit Tips Newsletter",
      description: "Weekly credit improvement tips",
      icon: <Mail color={colors.info} size={20} />,
      enabled: true,
    },
    {
      id: "account_updates",
      title: "Account Updates",
      description: "Security, billing changes",
      icon: <Mail color={colors.error} size={20} />,
      enabled: true,
    },
  ]);

  const [masterPush, setMasterPush] = useState(true);
  const [masterEmail, setMasterEmail] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const togglePushSetting = (id: string) => {
    Haptics.selectionAsync();
    setPushSettings(pushSettings.map((s) => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const toggleEmailSetting = (id: string) => {
    Haptics.selectionAsync();
    setEmailSettings(emailSettings.map((s) => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Notifications",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft color={colors.text} size={24} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card variant="default" padding="lg" style={styles.masterCard}>
          <View style={styles.masterRow}>
            <View style={[styles.masterIcon, { backgroundColor: colors.primary + "15" }]}>
              <Bell color={colors.primary} size={24} />
            </View>
            <View style={styles.masterInfo}>
              <Text style={[styles.masterTitle, { color: colors.text }]}>Push Notifications</Text>
              <Text style={[styles.masterSubtitle, { color: colors.textSecondary }]}>
                {masterPush ? "Enabled" : "Disabled"}
              </Text>
            </View>
            <Switch
              value={masterPush}
              onValueChange={(value) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMasterPush(value);
              }}
              trackColor={{ false: colors.border, true: colors.primary + "60" }}
              thumbColor={masterPush ? colors.primary : colors.textLight}
            />
          </View>
        </Card>

        {masterPush && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Push Notification Settings
            </Text>
            <Card variant="default" padding="none">
              {pushSettings.map((setting, index) => (
                <View 
                  key={setting.id} 
                  style={[
                    styles.settingRow,
                    { borderBottomColor: colors.border },
                    index === pushSettings.length - 1 && { borderBottomWidth: 0 }
                  ]}
                >
                  <View style={[styles.settingIcon, { backgroundColor: colors.surfaceAlt }]}>
                    {setting.icon}
                  </View>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>{setting.title}</Text>
                    <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>{setting.description}</Text>
                  </View>
                  <Switch
                    value={setting.enabled}
                    onValueChange={() => togglePushSetting(setting.id)}
                    trackColor={{ false: colors.border, true: colors.primary + "60" }}
                    thumbColor={setting.enabled ? colors.primary : colors.textLight}
                  />
                </View>
              ))}
            </Card>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Sound & Vibration
            </Text>
          </View>
          <Card variant="default" padding="lg">
            <View style={styles.settingRowSimple}>
              <View style={[styles.settingIcon, { backgroundColor: colors.surfaceAlt }]}>
                <Volume2 color={colors.primary} size={20} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Sound Effects</Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Play sound for notifications</Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSoundEnabled(value);
                }}
                trackColor={{ false: colors.border, true: colors.primary + "60" }}
                thumbColor={soundEnabled ? colors.primary : colors.textLight}
              />
            </View>
          </Card>
        </View>

        <Card variant="default" padding="lg" style={styles.masterCard}>
          <View style={styles.masterRow}>
            <View style={[styles.masterIcon, { backgroundColor: colors.info + "15" }]}>
              <Mail color={colors.info} size={24} />
            </View>
            <View style={styles.masterInfo}>
              <Text style={[styles.masterTitle, { color: colors.text }]}>Email Notifications</Text>
              <Text style={[styles.masterSubtitle, { color: colors.textSecondary }]}>
                {masterEmail ? "Enabled" : "Disabled"}
              </Text>
            </View>
            <Switch
              value={masterEmail}
              onValueChange={(value) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMasterEmail(value);
              }}
              trackColor={{ false: colors.border, true: colors.info + "60" }}
              thumbColor={masterEmail ? colors.info : colors.textLight}
            />
          </View>
        </Card>

        {masterEmail && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Email Preferences
            </Text>
            <Card variant="default" padding="none">
              {emailSettings.map((setting, index) => (
                <View 
                  key={setting.id} 
                  style={[
                    styles.settingRow,
                    { borderBottomColor: colors.border },
                    index === emailSettings.length - 1 && { borderBottomWidth: 0 }
                  ]}
                >
                  <View style={[styles.settingIcon, { backgroundColor: colors.surfaceAlt }]}>
                    {setting.icon}
                  </View>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>{setting.title}</Text>
                    <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>{setting.description}</Text>
                  </View>
                  <Switch
                    value={setting.enabled}
                    onValueChange={() => toggleEmailSetting(setting.id)}
                    trackColor={{ false: colors.border, true: colors.info + "60" }}
                    thumbColor={setting.enabled ? colors.info : colors.textLight}
                  />
                </View>
              ))}
            </Card>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    masterCard: {
      marginBottom: 16,
    },
    masterRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    masterIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
    },
    masterInfo: {
      flex: 1,
    },
    masterTitle: {
      fontSize: 16,
      fontWeight: "600" as const,
      marginBottom: 2,
    },
    masterSubtitle: {
      fontSize: 13,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "600" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
    },
    settingRowSimple: {
      flexDirection: "row",
      alignItems: "center",
    },
    settingIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    settingInfo: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 15,
      fontWeight: "600" as const,
      marginBottom: 2,
    },
    settingDesc: {
      fontSize: 12,
    },
  });
