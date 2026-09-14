/**
 * Shared AI Dispute Assistant Questionnaire
 * ---------------------------------------------------
 * Single source of truth for the escalation questions the AI Dispute
 * Assistant asks before recommending a dispute letter, and for turning those
 * answers into a concrete letter type.
 *
 * WHY THIS EXISTS
 * ---------------
 * `lib/dispute-letter-strategy.ts` picks a letter from WHAT the negative item
 * is (collection, charge-off, late payment...). That is only half the story.
 * The correct letter also depends on HOW FAR the consumer has already
 * escalated: a 611 method-of-verification request is wrong if the bureau was
 * never disputed in the first place, and a 609 is wasted if they already sent
 * one. Recommending from the account type alone means the agent is guessing
 * about steps the consumer has already taken.
 *
 * These questions previously lived inline in `app/ai-dispute-assistant.tsx`,
 * so the Equifax "Prepare Dispute Letter" path (My Agent -> Analyze My Report)
 * had no access to them and skipped straight to a letter. Both flows now share
 * this module, so they can never drift apart.
 */

export interface DisputeQuestionOption {
  value: string;
  label: string;
}

export interface DisputeQuestion {
  id: string;
  title: string;
  options: DisputeQuestionOption[];
}

/** Answers keyed by question id, e.g. `{ disputeType: "debtCollector", step1: "yes" }`. */
export type DisputeAnswers = Record<string, string>;

const YES_NO: DisputeQuestionOption[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

/**
 * The escalation ladder, in order. Question one establishes who is being
 * disputed; steps 1-6 establish how far the consumer has already escalated.
 * The FIRST step answered "no" is the next action they should take.
 */
export const DISPUTE_QUESTIONS: DisputeQuestion[] = [
  {
    id: "disputeType",
    title: "Are you disputing Original Creditor or Debt Collector?",
    options: [
      { value: "originalCreditorOpen", label: "Original Creditor (Open Account)" },
      { value: "originalCreditorClosed", label: "Original Creditor (Closed Account)" },
      { value: "debtCollector", label: "Debt Collector" },
    ],
  },
  {
    id: "step1",
    title: "Did you dispute with the Credit Reporting Agency Online?",
    options: YES_NO,
  },
  {
    id: "step2",
    title: "Did you send a certified mail dispute to the information furnisher?",
    options: YES_NO,
  },
  {
    id: "step3",
    title: "Did you send an Intent to sue letter to the information furnisher?",
    options: YES_NO,
  },
  {
    id: "step4",
    title: "Did you request the method of verification from the Credit Reporting Agency?",
    options: YES_NO,
  },
  {
    id: "step5",
    title: "Did you send 609 Letter to the Credit Reporting Agency demanding removal?",
    options: YES_NO,
  },
  {
    id: "step6",
    title: "Did you try advanced dispute method for the Credit Reporting Agency?",
    options: YES_NO,
  },
];

/** Plain-language description of each completed step, for the rationale text. */
const STEP_COMPLETED_LABELS: Record<string, string> = {
  step1: "disputed online with the credit reporting agency",
  step2: "sent a certified-mail dispute to the furnisher",
  step3: "sent an Intent to Sue letter to the furnisher",
  step4: "requested the method of verification",
  step5: "sent a 609 letter demanding removal",
  step6: "tried an advanced dispute method",
};

const DISPUTE_TYPE_LABELS: Record<string, string> = {
  originalCreditorOpen: "Original Creditor (Open Account)",
  originalCreditorClosed: "Original Creditor (Closed Account)",
  debtCollector: "Debt Collector",
};

/** Human-readable label for the selected dispute target. */
export function getDisputeTypeLabel(disputeType?: string): string {
  return DISPUTE_TYPE_LABELS[disputeType ?? ""] ?? "Unspecified";
}

/**
 * Determines the recommended next action from a complete (or partial) set of
 * answers. The first escalation step answered "no" wins, because that is the
 * next rung on the ladder the consumer has not yet climbed.
 */
export function getRecommendation(answers: DisputeAnswers): string {
  const disputeType = answers["disputeType"];

  if (answers["step1"] === "no") return "Online Disputes";

  if (answers["step2"] === "no") {
    if (disputeType === "originalCreditorClosed") return "623 Letter";
    if (disputeType === "originalCreditorOpen") return "Open Account Dispute";
    if (disputeType === "debtCollector") return "809 Letter";
  }

  if (answers["step3"] === "no") {
    if (disputeType === "originalCreditorOpen" || disputeType === "originalCreditorClosed") {
      return "Intent to Sue Creditor";
    }
    if (disputeType === "debtCollector") return "Intent to Sue Debt Collector";
  }

  if (answers["step4"] === "no") return "611 Letter";
  if (answers["step5"] === "no") return "609 Letter";
  if (answers["step6"] === "no") return "Hand Written Dispute Letter";

  return "Legal Action";
}

/**
 * Given the question just answered, returns the recommendation to show now,
 * or `null` when the questionnaire should simply advance to the next question.
 *
 * Answering "no" ends the questionnaire early: that unclimbed rung IS the
 * recommendation, so there is no value in asking about later escalations.
 */
export function recommendationForAnswer(
  questionId: string,
  value: string,
  answers: DisputeAnswers,
): string | null {
  if (questionId === "step6") {
    return value === "no" ? "Hand Written Dispute Letter" : "Legal Action";
  }
  if (value !== "no") return null;
  if (questionId === "disputeType") return null;
  return getRecommendation(answers);
}

const RECOMMENDATION_DESCRIPTIONS: Record<string, string> = {
  "Online Disputes":
    "We recommend you first dispute with the Credit Reporting Agency online. This is the quickest way to start the dispute process.",
  "623 Letter":
    "We recommend sending a 623 Letter to the original creditor requesting verification and correction of inaccurate information.",
  "Open Account Dispute":
    "We recommend sending an Open Account Dispute letter challenging the accuracy of the information for your open account.",
  "809 Letter":
    "We recommend sending an 809 Letter to the debt collector requesting validation of the debt within 30 days.",
  "Intent to Sue Creditor":
    "We recommend sending an Intent to Sue letter informing them of your intention to take legal action.",
  "Intent to Sue Debt Collector":
    "We recommend sending an Intent to Sue letter to the debt collector.",
  "611 Letter":
    "We recommend sending a 611 Letter to request the method of verification from the Credit Reporting Agency.",
  "609 Letter":
    "We recommend sending a 609 Letter demanding removal and requesting all verification documents.",
  "Hand Written Dispute Letter":
    "We recommend trying an advanced dispute method with a hand-written letter.",
  "Legal Action":
    "You have exhausted all standard dispute options. Consider consulting with a consumer law attorney.",
};

/** Plain-language explanation of a recommendation. */
export function getRecommendationDescription(recommendation: string): string {
  return RECOMMENDATION_DESCRIPTIONS[recommendation] ?? "";
}

/**
 * Letter types the generator can actually produce (mirrors LETTER_TYPES in
 * `components/MyAgent/CreditRepairModal.tsx` and LETTER_TEMPLATES in
 * `backend/trpc/routes/ai-agents.ts`).
 *
 * Recommendations outside this set are real advice but not a mailable letter,
 * or need mapping onto the closest template. Without this mapping the backend
 * silently falls back to a 609 template for anything it does not recognise -
 * so an "Open Account Dispute" recommendation would quietly mail the wrong
 * letter with no indication anything was substituted.
 */
const GENERATABLE_LETTER_TYPES = new Set<string>([
  "609 Letter",
  "611 Letter",
  "623 Letter",
  "809 Letter",
  "Intent to Sue Creditor",
  "Intent to Sue Debt Collector",
]);

/**
 * Recommendations that are guidance rather than a letter to mail. Sending the
 * user into the letter generator here would be wrong.
 */
const GUIDANCE_ONLY: Record<string, string> = {
  "Online Disputes":
    "Start by filing the dispute on the bureau's website - it is free, takes minutes, and the 30-day clock it starts is what makes every later letter enforceable. Come back here once it comes back verified.",
  "Legal Action":
    "You have worked through every standard escalation. The next step is a consumer-law attorney, who can pursue FCRA/FDCPA statutory damages on your behalf. Most offer free consultations and work on contingency.",
};

/**
 * Recommendations that map onto a different template than their display name.
 * Each carries a note so the substitution is visible rather than silent.
 */
const LETTER_TYPE_ALIASES: Record<string, { letterType: string; note: string }> = {
  "Open Account Dispute": {
    letterType: "623 Letter",
    note: "Sent as an FCRA §623 furnisher dispute, which is the governing statute for disputing an open account directly with the creditor.",
  },
  "Hand Written Dispute Letter": {
    letterType: "609 Letter",
    note: "Drafted as an FCRA §609 disclosure request. For this advanced-method step, copy the text out and hand-write it before mailing - hand-written letters are less likely to be routed to automated processing.",
  },
};

export interface RecommendedLetter {
  /** The raw recommendation, e.g. "611 Letter" or "Legal Action". */
  recommendation: string;
  /** Template to generate, or `null` when this is guidance rather than a letter. */
  letterType: string | null;
  /** Why this was recommended, including what the consumer already did. */
  rationale: string;
  /** False when the recommendation is advice rather than a mailable letter. */
  isGeneratable: boolean;
  /** Extra instruction shown when the recommendation is guidance-only. */
  guidance?: string;
}

/**
 * Summarises what the consumer has already done, so the rationale can state
 * the reasoning rather than assert a conclusion. Returns an empty string when
 * nothing has been completed yet.
 */
export function summarizePriorSteps(answers: DisputeAnswers): string {
  const completed = Object.keys(STEP_COMPLETED_LABELS)
    .filter((id) => answers[id] === "yes")
    .map((id) => STEP_COMPLETED_LABELS[id]);

  if (completed.length === 0) return "";
  if (completed.length === 1) return `You have already ${completed[0]}.`;

  const last = completed[completed.length - 1];
  return `You have already ${completed.slice(0, -1).join(", ")} and ${last}.`;
}

/**
 * Turns a completed questionnaire into everything the letter generator needs:
 * which template to use, and a rationale that reflects the steps already taken.
 */
export function resolveRecommendedLetter(answers: DisputeAnswers): RecommendedLetter {
  const recommendation = getRecommendation(answers);
  const priorSteps = summarizePriorSteps(answers);
  const description = getRecommendationDescription(recommendation);

  const guidance = GUIDANCE_ONLY[recommendation];
  if (guidance) {
    return {
      recommendation,
      letterType: null,
      rationale: [priorSteps, description].filter(Boolean).join(" "),
      isGeneratable: false,
      guidance,
    };
  }

  const alias = LETTER_TYPE_ALIASES[recommendation];
  const letterType = alias ? alias.letterType : recommendation;
  const rationale = [priorSteps, description, alias?.note].filter(Boolean).join(" ");

  return {
    recommendation,
    letterType: GENERATABLE_LETTER_TYPES.has(letterType) ? letterType : "609 Letter",
    rationale,
    isGeneratable: true,
  };
}
