import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  X,
  FileText,
  Copy,
  Check,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { trpc } from "@/lib/trpc";
import { useUser } from "@/contexts/UserContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";

/**
 * The user's own return-address block is reused across every letter they
 * generate. There's no `address` column on the `users` table, so instead
 * of re-prompting (or silently leaving it as "[Your Address]") on every
 * letter, it's captured once here and persisted locally per-user.
 */
const SENDER_INFO_KEY_PREFIX = "wci_sender_info_";

// ============================================================
// Letter types available for generation
// ============================================================

const LETTER_TYPES = [
  {
    id: "609 Letter",
    label: "FCRA §609 — Disclosure Request",
    description:
      "Request all documentation the bureau has on file for an account. Forces the bureau to prove they have verifiable information.",
  },
  {
    id: "611 Letter",
    label: "FCRA §611 — Method of Verification",
    description:
      "Demand the method and contact information the bureau used to verify a disputed item. Use after a disputed item is 'verified'.",
  },
  {
    id: "623 Letter",
    label: "FCRA §623 — Furnisher Dispute",
    description:
      "Dispute directly with the original creditor or furnisher of information. Bypass the credit bureau and go straight to the source.",
  },
  {
    id: "809 Letter",
    label: "FDCPA §809(b) — Debt Validation",
    description:
      "Demand validation of a debt from a collection agency within 30 days of first contact. If they can't validate, they must cease collection.",
  },
  {
    id: "Intent to Sue Creditor",
    label: "Intent to Sue — Original Creditor",
    description:
      "Formal notice of intent to file a lawsuit against an original creditor for FCRA violations. Sends a strong legal signal.",
  },
  {
    id: "Intent to Sue Debt Collector",
    label: "Intent to Sue — Debt Collector",
    description:
      "Formal notice of intent to sue a debt collector for FDCPA violations. Each violation carries up to $1,000 in statutory damages.",
  },
];

// ============================================================
// Props
// ============================================================

export interface CreditRepairModalProps {
  visible: boolean;
  onClose: () => void;
  /** Pre-fill the modal with data from a chat-triggered letter request */
  prefillData?: {
    letterType?: string;
    creditorName?: string;
    accountNumber?: string;
    /** Furnisher/creditor mailing address, when known (e.g. parsed from
     *  the credit report). Auto-populates the address field below. */
    furnisherAddress?: string;
  } | null;
  /** Called after a letter is generated and saved as a dispute. `disputeId`
   *  is undefined when the letter generated successfully but the save to
   *  the Dispute Tracker failed — check `saved` to distinguish the two. */
  onLetterGenerated?: (disputeId?: string, saved?: boolean) => void;
}

// ============================================================
// Component
// ============================================================

export default function CreditRepairModal({
  visible,
  onClose,
  prefillData,
  onLetterGenerated,
}: CreditRepairModalProps) {
  const { user } = useUser();
  const userId = user?.id || "";

  const [letterType, setLetterType] = useState<string>("609 Letter");
  const [creditorName, setCreditorName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [furnisherAddress, setFurnisherAddress] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [senderCityStateZip, setSenderCityStateZip] = useState("");
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Load the user's saved return address, once per user ──────
  useEffect(() => {
    if (!userId) return;
    AsyncStorage.getItem(`${SENDER_INFO_KEY_PREFIX}${userId}`)
      .then((raw) => {
        if (!raw) return;
        try {
          const saved = JSON.parse(raw) as { address?: string; cityStateZip?: string };
          if (saved.address) setSenderAddress(saved.address);
          if (saved.cityStateZip) setSenderCityStateZip(saved.cityStateZip);
        } catch {
          // Ignore malformed storage; the fields just stay blank.
        }
      })
      .catch(() => {});
  }, [userId]);

  // Persist the return address as the user edits it, so it's remembered
  // the next time they generate a letter (for this account or another).
  useEffect(() => {
    if (!userId) return;
    if (!senderAddress && !senderCityStateZip) return;
    AsyncStorage.setItem(
      `${SENDER_INFO_KEY_PREFIX}${userId}`,
      JSON.stringify({ address: senderAddress, cityStateZip: senderCityStateZip })
    ).catch(() => {});
  }, [userId, senderAddress, senderCityStateZip]);

  // ── Prefill from chat trigger ─────────────────────────────────
  useEffect(() => {
    if (visible && prefillData) {
      if (prefillData.letterType) setLetterType(prefillData.letterType);
      if (prefillData.creditorName) setCreditorName(prefillData.creditorName);
      if (prefillData.accountNumber) setAccountNumber(prefillData.accountNumber);
      // Always sync furnisherAddress (including clearing it to "" when the
      // source account has none) so a stale address from a previously
      // generated letter never carries over onto an unrelated creditor.
      setFurnisherAddress(prefillData.furnisherAddress || "");
    }
    if (!visible) {
      setGeneratedLetter(null);
      setCopied(false);
      setSaveError(null);
    }
  }, [visible, prefillData]);

  // ── Generate letter mutation ──────────────────────────────────
  const generateLetterMutation = trpc.aiAgents.generateLetter.useMutation({
    onSuccess: (data) => {
      setGeneratedLetter(data.letterContent);
      // The backend now reports save failures explicitly instead of
      // always claiming success — surface that instead of hiding it.
      if (!data.success) {
        setSaveError(
          data.saveError ||
            "The letter was generated but could not be saved to your Dispute Tracker."
        );
      } else {
        setSaveError(null);
      }
      onLetterGenerated?.(data.disputeId, data.success);
    },
    onError: (error) => {
      Alert.alert(
        "Generation Failed",
        error.message || "Could not generate the dispute letter. Please try again."
      );
    },
  });

  const handleGenerate = () => {
    if (!creditorName.trim()) {
      Alert.alert("Missing Information", "Please enter the creditor or collection agency name.");
      return;
    }
    if (!accountNumber.trim()) {
      Alert.alert("Missing Information", "Please enter the account or reference number.");
      return;
    }
    setSaveError(null);
    generateLetterMutation.mutate({
      userId,
      letterType,
      creditorName: creditorName.trim(),
      accountNumber: accountNumber.trim(),
      furnisherAddress: furnisherAddress.trim() || undefined,
      senderAddress: senderAddress.trim() || undefined,
      senderCityStateZip: senderCityStateZip.trim() || undefined,
    });
  };

  const handleCopy = async () => {
    if (generatedLetter) {
      await Clipboard.setStringAsync(generatedLetter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selectedType = LETTER_TYPES.find((t) => t.id === letterType);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <FileText size={24} color={Colors.primary} />
            <Text style={styles.headerTitle}>Credit Repair Tool</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close credit repair modal"
          >
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Intro ─────────────────────────────────────────── */}
          <Text style={styles.intro}>
            Generate a legally-formatted dispute letter. It will be saved to
            your Dispute Tracker automatically after generation, and the
            creditor's address will be filled in when it's known from your
            credit report.
          </Text>

          {/* ── Letter type selector ───────────────────────────── */}
          <Text style={styles.fieldLabel}>Letter Type</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowTypePicker(!showTypePicker)}
            accessibilityRole="button"
            accessibilityLabel={`Selected letter type: ${selectedType?.label}`}
            accessibilityHint="Tap to choose a different letter type"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.dropdownLabel}>{selectedType?.label}</Text>
              <Text style={styles.dropdownDesc} numberOfLines={showTypePicker ? undefined : 1}>
                {selectedType?.description}
              </Text>
            </View>
            <ChevronDown
              size={20}
              color={Colors.textLight}
              style={{ transform: [{ rotate: showTypePicker ? "180deg" : "0deg" }] }}
            />
          </TouchableOpacity>

          {showTypePicker ? (
            <View style={styles.typeList}>
              {LETTER_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeItem,
                    type.id === letterType && styles.typeItemSelected,
                  ]}
                  onPress={() => {
                    setLetterType(type.id);
                    setShowTypePicker(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={type.label}
                >
                  <Text
                    style={[
                      styles.typeItemLabel,
                      type.id === letterType && styles.typeItemLabelSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                  <Text style={styles.typeItemDesc}>{type.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {/* ── Creditor name ──────────────────────────────────── */}
          <Text style={styles.fieldLabel}>Creditor / Collection Agency</Text>
          <TextInput
            style={styles.input}
            value={creditorName}
            onChangeText={setCreditorName}
            placeholder="e.g., Capital One, Midland Funding LLC"
            placeholderTextColor={Colors.textLight}
            accessibilityLabel="Creditor or collection agency name"
          />

          {/* ── Account number ─────────────────────────────────── */}
          <Text style={styles.fieldLabel}>Account / Reference Number</Text>
          <TextInput
            style={styles.input}
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder="e.g., xxxx-xxxx-1234"
            placeholderTextColor={Colors.textLight}
            accessibilityLabel="Account or reference number"
          />

          {/* Furnisher address */}
          <Text style={styles.fieldLabel}>Creditor / Furnisher Address</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={furnisherAddress}
            onChangeText={setFurnisherAddress}
            placeholder="e.g., PO Box 901003, Fort Worth, TX 76101"
            placeholderTextColor={Colors.textLight}
            multiline
            numberOfLines={2}
            accessibilityLabel="Creditor or furnisher mailing address"
            accessibilityHint="Auto-filled when available from your credit report. Edit if it's missing or incorrect."
          />
          {!furnisherAddress ? (
            <Text style={styles.fieldHint}>
              No address on file for this creditor. The letter will use a placeholder unless you enter one above.
            </Text>
          ) : null}

          {/* Your return address */}
          <Text style={styles.fieldLabel}>Your Mailing Address</Text>
          <TextInput
            style={styles.input}
            value={senderAddress}
            onChangeText={setSenderAddress}
            placeholder="Street address"
            placeholderTextColor={Colors.textLight}
            accessibilityLabel="Your street address"
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={senderCityStateZip}
            onChangeText={setSenderCityStateZip}
            placeholder="City, State ZIP"
            placeholderTextColor={Colors.textLight}
            accessibilityLabel="Your city, state, and ZIP code"
          />
          <Text style={styles.fieldHint}>
            Saved on this device so you only need to enter it once.
          </Text>

          {/* ── Generate button ────────────────────────────────── */}
          <TouchableOpacity
            style={[
              styles.generateButton,
              generateLetterMutation.isPending && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerate}
            disabled={generateLetterMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Generate dispute letter"
          >
            {generateLetterMutation.isPending ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <FileText size={20} color={Colors.white} />
            )}
            <Text style={styles.generateButtonText}>
              {generateLetterMutation.isPending
                ? "Generating Letter..."
                : "Generate & Save Letter"}
            </Text>
          </TouchableOpacity>

          {/* ── Generated letter preview ───────────────────────── */}
          {generatedLetter ? (
            <View style={styles.letterSection}>
              <View style={styles.letterHeader}>
                <Text style={styles.letterTitle}>Generated Letter</Text>
                <TouchableOpacity
                  onPress={handleCopy}
                  style={styles.copyButton}
                  accessibilityRole="button"
                  accessibilityLabel="Copy letter to clipboard"
                >
                  {copied ? (
                    <Check size={16} color={Colors.success} />
                  ) : (
                    <Copy size={16} color={Colors.primary} />
                  )}
                  <Text style={[styles.copyText, copied && { color: Colors.success }]}>
                    {copied ? "Copied!" : "Copy"}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.letterBox}>
                <ScrollView style={{ maxHeight: 400 }}>
                  <Text style={styles.letterContent}>{generatedLetter}</Text>
                </ScrollView>
              </View>
              {saveError ? (
                <View style={styles.saveErrorNote}>
                  <AlertTriangle size={14} color={Colors.warning} />
                  <Text style={styles.saveErrorNoteText}>
                    Letter generated, but it was NOT saved to your Dispute Tracker: {saveError} Copy the letter above so you don't lose it.
                  </Text>
                </View>
              ) : (
                <View style={styles.savedNote}>
                  <Check size={14} color={Colors.success} />
                  <Text style={styles.savedNoteText}>
                    Letter saved to your Dispute Tracker. You can track its status there.
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {/* ── Disclaimer ─────────────────────────────────────── */}
          <View style={styles.disclaimer}>
            <AlertCircle size={14} color={Colors.warning} />
            <Text style={styles.disclaimerText}>
              These letters are educational templates based on FCRA and FDCPA
              provisions. They are not legal advice. Consult a licensed attorney
              for your specific situation.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  intro: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  dropdownLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  dropdownDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  typeList: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
    overflow: "hidden",
  },
  typeItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  typeItemSelected: {
    backgroundColor: Colors.primaryLight + "20",
  },
  typeItemLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  typeItemLabelSelected: {
    color: Colors.primary,
  },
  typeItemDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 15,
    color: Colors.text,
  },
  inputMultiline: {
    minHeight: 56,
    textAlignVertical: "top",
  },
  fieldHint: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 6,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    marginTop: 24,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  letterSection: {
    marginTop: 24,
  },
  letterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  letterTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
  },
  copyText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  letterBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  letterContent: {
    fontSize: 13,
    lineHeight: 22,
    color: Colors.text,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  savedNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  savedNoteText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: "500",
    flex: 1,
  },
  saveErrorNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 12,
    backgroundColor: Colors.warningLight + "30",
    borderRadius: 10,
    padding: 12,
  },
  saveErrorNoteText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: "500",
    flex: 1,
    lineHeight: 18,
  },
  disclaimer: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: Colors.warningLight + "30",
    borderRadius: 12,
    padding: 14,
    marginTop: 24,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    flex: 1,
  },
});
