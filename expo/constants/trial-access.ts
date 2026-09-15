/**
 * What an ACE-1 free-trial member can and cannot reach.
 *
 * ACE-1 has two distinct states that used to be collapsed into one tier:
 *
 * - **Trial** — 7 days, costs nothing, nothing has been billed yet. A genuine
 *   preview: the AI agent answers on its normal ACE-1 topics, but the full
 *   dispute-letter library stays closed.
 * - **Paid** — the certificate fee has been collected and the monthly
 *   subscription is running. Everything is open.
 *
 * The distinction matters commercially: the letter library *is* the product,
 * so handing it over during a free trial leaves nothing to subscribe for. A
 * trial member can still act on their credit — but only through the letter
 * their agent specifically recommends after analysing their report, never by
 * browsing the catalogue.
 *
 * The iOS mirror lives in
 * `ios-western-credit-institute/WesternCreditInstitute/Models/TrialAccess.swift`
 * and must be kept in step with this file.
 */

/** Billing state of an ACE-1 member. */
export type ACE1Status = 'none' | 'trial' | 'trial_expired' | 'paid';

/**
 * Whether the full dispute-letter library (the Credit Repair Tool) is open.
 *
 * Paid subscribers only. This is the single check every letter surface must
 * use, so the tool cannot be reached from one screen while blocked on another.
 */
export function canBrowseAllLetters(status: ACE1Status): boolean {
  return status === 'paid';
}

/**
 * Whether the member may generate the one letter their agent recommended.
 *
 * Open during the trial on purpose: the recommendation comes out of the
 * "Analyze My Credit Report" questionnaire, which names a single letter type
 * for a single account. That is a guided outcome, not catalogue access, so it
 * demonstrates the product's value without giving the library away.
 */
export function canUseRecommendedLetter(status: ACE1Status): boolean {
  return status === 'trial' || status === 'paid';
}

/** Whether course material and the AI agent are reachable at all. */
export function hasActiveAccess(status: ACE1Status): boolean {
  return status === 'trial' || status === 'paid';
}

/** Shown when a trial member taps the Credit Repair Tool. */
export const TRIAL_LETTERS_LOCKED_TITLE = 'Included with your subscription';

/**
 * Explains the lock honestly: it names what is still usable during the trial,
 * so the message reads as a boundary rather than a dead end.
 */
export const TRIAL_LETTERS_LOCKED_MESSAGE =
  'The full dispute letter library opens when your subscription starts. ' +
  'During your trial, run "Analyze My Credit Report" and your agent will ' +
  'prepare the specific letter your situation calls for.';

/** Short caption for the locked Credit Repair Tool row. */
export const TRIAL_LETTERS_LOCKED_CAPTION = 'Unlocks when your subscription starts';

/**
 * Appended to the agent's system prompt during the trial.
 *
 * The agent has a letter-drafting tool, so a restriction that lives only in
 * the UI would be walked straight around by asking the agent in chat. This
 * clause is paired with physically withholding that tool on the server.
 */
export const TRIAL_AGENT_LETTER_CLAUSE =
  'This student is on the free trial. You may discuss strategy, explain how ' +
  'disputes work, and analyse their credit report. You may NOT draft or hand ' +
  'over dispute letters from the letter library. If they ask for a letter, ' +
  'tell them to run "Analyze My Credit Report" so you can identify the right ' +
  'letter for their situation, and explain that the full letter library opens ' +
  'when their subscription starts. Never reproduce letter templates in chat.';
