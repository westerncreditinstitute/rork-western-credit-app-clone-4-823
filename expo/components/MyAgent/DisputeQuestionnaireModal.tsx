import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import {
  X,
  FileText,
  Scale,
  Info,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import {
  DISPUTE_QUESTIONS,
  recommendationForAnswer,
  resolveRecommendedLetter,
  getRecommendationDescription,
  getDisputeTypeLabel,
  type DisputeAnswers,
} from "@/lib/dispute-questionnaire";

/**
 * The account the questionnaire is being answered for. Mirrors the payload
 * the "Prepare Dispute Letter" buttons already emit.
 */
export interface QuestionnaireAccount {
  creditorName: string;
  accountNumber: string;
  furnisherAddress?: string;
  /** Letter the account-type strategy suggested, shown as context only. */
  suggestedLetterType?: string;
  /** Why the account-type strategy suggested it. */
  suggestedRationale?: string;
}

export interface DisputeQuestionnaireResult {
  letterType: string;
  creditorName: string;
  accountNumber: string;
  furnisherAddress?: string;
  rationale: string;
  /** The raw answers, so the flow can be resumed or audited later. */
  answers: DisputeAnswers;
}

export interface DisputeQuestionnaireModalProps {
  visible: boolean;
  account: QuestionnaireAccount | null;
  onClose: () => void;
  /** Fired with the resolved letter once the questionnaire is complete. */
  onComplete: (result: DisputeQuestionnaireResult) => void;
}

/**
 * Asks the AI Dispute Assistant's escalation questions before a letter is
 * recommended.
 *
 * The "Analyze My Credit Report" path - covering both a manually uploaded
 * report and the linked Equifax 3-bureau report - used to jump straight from a
 * negative account to a generated letter, choosing the letter purely from what
 * the item was (collection, charge-off, ...). That ignores what the consumer
 * has already tried, and the letter that follows can be plainly wrong - a
 * method-of-verification request when the bureau was never disputed, or a
 * second 609 when one was already sent. These are the same questions the
 * standalone Assistant asks, sharing one source of truth so the two flows
 * cannot drift apart.
 */
export default function DisputeQuestionnaireModal({
  visible,
  account,
  onClose,
  onComplete,
}: DisputeQuestionnaireModalProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<DisputeAnswers>({});
  const [recommendation, setRecommendation] = useState<string | null>(null);

  // Each account gets a clean slate: answers about one creditor say nothing
  // about the next, and carrying them over would recommend a letter based on
  // escalation steps the user never took for this account.
  useEffect(() => {
    if (visible) {
      setQuestionIndex(0);
      setAnswers({});
      setRecommendation(null);
    }
  }, [visible, account?.creditorName, account?.accountNumber]);

  const currentQuestion = DISPUTE_QUESTIONS[questionIndex];

  const handleAnswer = useCallback(
    (questionId: string, value: string) => {
      const nextAnswers: DisputeAnswers = { ...answers, [questionId]: value };
      setAnswers(nextAnswers);

      const rec = recommendationForAnswer(questionId, value, nextAnswers);
      if (rec) {
        setRecommendation(rec);
        return;
      }
      setQuestionIndex((prev) => Math.min(prev + 1, DISPUTE_QUESTIONS.length - 1));
    },
    [answers],
  );

  const handleBack = useCallback(() => {
    if (recommendation) {
      setRecommendation(null);
      return;
    }
    if (questionIndex > 0) {
      setQuestionIndex((prev) => prev - 1);
      return;
    }
    onClose();
  }, [recommendation, questionIndex, onClose]);

  const resolved = useMemo(
    () => (recommendation ? resolveRecommendedLetter(answers) : null),
    [recommendation, answers],
  );

  const handleGenerate = useCallback(() => {
    if (!resolved?.letterType || !account) return;
    onComplete({
      letterType: resolved.letterType,
      creditorName: account.creditorName,
      accountNumber: account.accountNumber,
      furnisherAddress: account.furnisherAddress,
      rationale: resolved.rationale,
      answers,
    });
  }, [resolved, account, answers, onComplete]);

  const progress = recommendation
    ? 1
    : (questionIndex + 1) / DISPUTE_QUESTIONS.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Scale size={20} color={Colors.primary} />
            <Text style={styles.headerTitle}>Dispute Strategy</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close dispute questionnaire"
          >
            <X size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {account ? (
            <View style={styles.accountCard}>
              <Text style={styles.accountName}>{account.creditorName}</Text>
              <Text style={styles.accountDetail}>
                Account {account.accountNumber}
              </Text>
              {answers["disputeType"] ? (
                <Text style={styles.accountDetail}>
                  Disputing: {getDisputeTypeLabel(answers["disputeType"])}
                </Text>
              ) : null}
              {account.suggestedLetterType ? (
                <Text style={styles.suggestionNote}>
                  Based on the account type alone this looks like a{" "}
                  {account.suggestedLetterType}. Your answers below confirm or
                  override that.
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          {recommendation && resolved ? (
            <View style={styles.card}>
              <View style={styles.recHeader}>
                <CheckCircle2 size={18} color={Colors.success} />
                <Text style={styles.recHeaderText}>Recommended next step</Text>
              </View>

              <View style={styles.recBadge}>
                <Text style={styles.recBadgeText}>{recommendation}</Text>
              </View>

              <Text style={styles.recDescription}>
                {getRecommendationDescription(recommendation)}
              </Text>

              {resolved.rationale ? (
                <View style={styles.rationaleBox}>
                  <Info size={14} color={Colors.primary} />
                  <Text style={styles.rationaleText}>{resolved.rationale}</Text>
                </View>
              ) : null}

              {resolved.isGeneratable ? (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleGenerate}
                  accessibilityRole="button"
                  accessibilityLabel={`Generate ${resolved.letterType}`}
                >
                  <FileText size={16} color={Colors.white} />
                  <Text style={styles.primaryButtonText}>
                    Generate {resolved.letterType}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.guidanceBox}>
                  <Text style={styles.guidanceText}>{resolved.guidance}</Text>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                  >
                    <Text style={styles.secondaryButtonText}>Got it</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.questionCounter}>
                Question {questionIndex + 1} of {DISPUTE_QUESTIONS.length}
              </Text>
              <Text style={styles.questionTitle}>{currentQuestion?.title}</Text>

              <View style={styles.options}>
                {currentQuestion?.options.map((option) => {
                  const selected = answers[currentQuestion.id] === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.option, selected && styles.optionSelected]}
                      onPress={() => handleAnswer(currentQuestion.id, option.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <View
                        style={[styles.radio, selected && styles.radioSelected]}
                      >
                        {selected ? <View style={styles.radioInner} /> : null}
                      </View>
                      <Text
                        style={[
                          styles.optionText,
                          selected && styles.optionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.helperText}>
                Your answers decide which letter comes next — the right letter
                depends on how far you have already escalated, not just on what
                the account is.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={16} color={Colors.textSecondary} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  closeButton: { padding: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  accountCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  accountName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  accountDetail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  suggestionNote: {
    fontSize: 11,
    color: Colors.textLight,
    lineHeight: 16,
    marginTop: 8,
    fontStyle: "italic",
  },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.borderLight,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  questionCounter: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  questionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  options: { gap: 10 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.infoLight,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: Colors.primary },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  optionText: { flex: 1, fontSize: 14, color: Colors.text, fontWeight: "500" },
  optionTextSelected: { color: Colors.primary, fontWeight: "700" },
  helperText: {
    fontSize: 12,
    color: Colors.textLight,
    lineHeight: 18,
    marginTop: 16,
  },

  recHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  recHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.success,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  recBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 12,
  },
  recBadgeText: { color: Colors.white, fontSize: 14, fontWeight: "700" },
  recDescription: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 21,
    marginTop: 12,
  },
  rationaleBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: Colors.infoLight,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  rationaleText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    lineHeight: 18,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 16,
  },
  primaryButtonText: { color: Colors.white, fontSize: 15, fontWeight: "700" },
  guidanceBox: { marginTop: 14 },
  guidanceText: { fontSize: 13, color: Colors.text, lineHeight: 20 },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 13,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    marginTop: 12,
  },
  backButtonText: { color: Colors.textSecondary, fontSize: 14, fontWeight: "600" },
});
