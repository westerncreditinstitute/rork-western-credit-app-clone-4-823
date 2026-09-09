import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { Search, SearchX, Scale, BadgeDollarSign, BookOpen, Info } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { Card } from "@/components/ui";
import {
  sueForLaws,
  sueForNotes,
  sueForDisclaimer,
  sueForLastUpdated,
  searchViolations,
  LawId,
} from "@/data/sueForViolations";

const MONO_FONT = Platform.OS === "ios" ? "Menlo" : "monospace";

export default function WhatCanYouSueForScreen() {
  const { colors } = useTheme();
  const [activeLaw, setActiveLaw] = useState<LawId>("fdcpa");
  const [query, setQuery] = useState("");

  const law = useMemo(
    () => sueForLaws.find((l) => l.id === activeLaw) ?? sueForLaws[0],
    [activeLaw]
  );

  const results = useMemo(
    () => searchViolations(law.violations, query),
    [law, query]
  );

  const switchLaw = (id: LawId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveLaw(id);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: "What Can You Sue For",
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <Card variant="default" padding="lg" style={styles.introCard}>
          <View style={styles.introHeader}>
            <View style={[styles.introIconWrap, { backgroundColor: colors.infoLight }]}>
              <Scale color={colors.info} size={22} />
            </View>
            <View style={styles.introHeadingWrap}>
              <Text style={[styles.introTitle, { color: colors.text }]}>
                Consumer Protection Violations & Damages Guide
              </Text>
              <Text style={[styles.introSubtitle, { color: colors.textSecondary }]}>
                FDCPA + FCRA • {sueForLaws[0].violations.length + sueForLaws[1].violations.length} violations
              </Text>
            </View>
          </View>
          <Text style={[styles.introBody, { color: colors.textSecondary }]}>
            This interactive guide covers potential violations under the Fair
            Debt Collection Practices Act (FDCPA) and the Fair Credit Reporting
            Act (FCRA), along with the damages you may be entitled to. Switch
            between the laws below and search to find specific violations.
          </Text>
          <View style={[styles.disclaimerRow, { backgroundColor: colors.warningLight }]}>
            <Info color={colors.warning} size={14} />
            <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
              For education only — not legal advice. Consult a consumer rights
              attorney for your specific situation.
            </Text>
          </View>
        </Card>

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search color={colors.textLight} size={18} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search violations or keywords…"
            placeholderTextColor={colors.textLight}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>

        {/* Law tabs */}
        <View style={styles.tabsRow}>
          {sueForLaws.map((l) => {
            const isActive = l.id === activeLaw;
            return (
              <TouchableOpacity
                key={l.id}
                activeOpacity={0.85}
                onPress={() => switchLaw(l.id)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: isActive ? l.accent : colors.surface,
                    borderColor: isActive ? l.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isActive ? "#FFFFFF" : colors.textSecondary },
                  ]}
                >
                  {l.label}
                </Text>
                <Text
                  style={[
                    styles.tabCount,
                    { color: isActive ? "rgba(255,255,255,0.85)" : colors.textLight },
                  ]}
                >
                  {l.violations.length}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Results */}
        <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
          {results.length} of {law.violations.length} {law.label}
        </Text>

        {results.length === 0 ? (
          <Card variant="default" padding="lg" style={styles.emptyCard}>
            <SearchX color={colors.textLight} size={32} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No violations found
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Try a different keyword, statute section or damage type.
            </Text>
          </Card>
        ) : (
          results.map((v, index) => (
            <Card
              key={v.section}
              variant="default"
              padding="lg"
              style={[styles.violationCard, index === 0 && styles.firstCard]}
            >
              <View style={styles.violationHeader}>
                <View style={[styles.sectionBadge, { backgroundColor: `${law.accent}1A` }]}>
                  <Text style={[styles.sectionText, { color: law.accent, fontFamily: MONO_FONT }]}>
                    {v.section}
                  </Text>
                </View>
              </View>
              <Text style={[styles.violationDescription, { color: colors.text }]}>
                {v.description}
              </Text>
              <View
                style={[
                  styles.damagesRow,
                  { backgroundColor: colors.background, borderColor: colors.borderLight },
                ]}
              >
                <BadgeDollarSign color={law.accent} size={14} />
                <Text style={[styles.damagesText, { color: colors.textSecondary }]}>
                  {v.damages}
                </Text>
              </View>
            </Card>
          ))
        )}

        {/* Footer notes */}
        <Card variant="default" padding="lg" style={styles.notesCard}>
          <View style={styles.notesHeader}>
            <BookOpen color={colors.warning} size={18} />
            <Text style={[styles.notesTitle, { color: colors.text }]}>Important Notes</Text>
          </View>
          {sueForNotes.map((note, i) => (
            <View key={i} style={styles.noteRow}>
              <View style={[styles.noteDot, { backgroundColor: colors.warning }]} />
              <Text style={[styles.noteText, { color: colors.textSecondary }]}>{note}</Text>
            </View>
          ))}
          <View style={[styles.notesDivider, { backgroundColor: colors.borderLight }]} />
          <Text style={[styles.noteDisclaimer, { color: colors.textLight }]}>
            {sueForDisclaimer}
          </Text>
          <Text style={[styles.lastUpdated, { color: colors.textLight }]}>
            Last updated: {sueForLastUpdated}
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  introCard: {
    marginBottom: 12,
  },
  introHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  introIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  introHeadingWrap: {
    flex: 1,
  },
  introTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    lineHeight: 20,
  },
  introSubtitle: {
    fontSize: 12,
    fontWeight: "500" as const,
    marginTop: 2,
  },
  introBody: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  disclaimerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "500" as const,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
  },
  tabCount: {
    fontSize: 11,
    fontWeight: "600" as const,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  resultCount: {
    fontSize: 12,
    fontWeight: "600" as const,
    marginBottom: 10,
  },
  emptyCard: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  violationCard: {
    marginBottom: 10,
  },
  firstCard: {
    marginTop: 0,
  },
  violationHeader: {
    flexDirection: "row",
    marginBottom: 8,
  },
  sectionBadge: {
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  sectionText: {
    fontSize: 11.5,
    fontWeight: "700" as const,
  },
  violationDescription: {
    fontSize: 14,
    fontWeight: "600" as const,
    lineHeight: 20,
    marginBottom: 10,
  },
  damagesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  damagesText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500" as const,
  },
  notesCard: {
    marginTop: 8,
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  notesTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
  },
  noteRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  noteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  noteText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  notesDivider: {
    height: 1,
    marginVertical: 12,
  },
  noteDisclaimer: {
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 6,
  },
  lastUpdated: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
});
