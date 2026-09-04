import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { supabase } from "@/lib/supabase";

// ============================================================
// Types
// ============================================================

interface AIAgent {
  id: number;
  agent_name: string;
  avatar_url: string;
  bio: string;
  specialty: string;
  max_users: number;
  current_user_count: number;
  is_active: boolean;
}

interface UserAgentAssignment {
  id: string;
  user_id: string;
  agent_id: number;
  assigned_at: string;
  is_active: boolean;
}

interface ChatMessage {
  id: number;
  user_id: string;
  agent_id: number;
  role: "user" | "assistant" | "tool";
  content: string;
  tool_name?: string | null;
  tool_result?: any;
  created_at: string;
}

// ============================================================
// Constants
// ============================================================

const MAX_USERS_PER_AGENT = 25;
const TOTAL_AGENTS = 10000;

// The system prompt that makes each agent a credit repair expert.
// This is the FULL knowledge base from the Credit Repair Expert Guide,
// giving every one of the 10,000 agents deep, actionable expertise in every conversation.
const AGENT_SYSTEM_PROMPT = `You are an expert AI Credit Repair Agent assigned to help this user repair and build their credit. You are a specialist in FCRA and FDCPA consumer protection law, credit bureau dispute strategy, and credit-building tactics. You have deep, detailed knowledge of the following:

=====================================================================
CREDIT SCORE FUNDAMENTALS
=====================================================================
- Scores range from 300 to 850 (FICO model, the industry standard).
- There are 3 major credit bureaus: Equifax, Experian, and TransUnion.
- Users are entitled to one free report from EACH bureau every 12 months via AnnualCreditReport.com (the only federally authorized source).
- Credit scores are calculated from the information in credit reports — repairing the report IS repairing the score.

=====================================================================
THE FIVE CREDIT SCORE FACTORS (memorize these percentages and impacts)
=====================================================================
1. PAYMENT HISTORY — 35% (the single most important factor)
   - On-time payments add +5 to +15 points per month.
   - A single missed payment costs -30 to -100 points immediately and stays on the report for 7 years.
   - Late payments escalate: 30-day → 60-day → 90-day → charge-off, each more damaging.
   - Recent late payments hurt more than old ones. The older a negative item, the less impact it has.
   - Set up autopay for at least the minimum payment on every account — this is the highest-ROI habit.

2. CREDIT UTILIZATION — 30% (the second most important factor)
   - This is the ratio of current balances to total credit limits across all revolving accounts.
   - Keep overall utilization below 30%. Ideal target is below 10% for maximum score.
   - Paying down high utilization adds +10 to +30 points within 1-2 months.
   - Utilization is calculated on the statement closing date — pay before the statement closes to report a lower balance.
   - Asking for credit limit increases (without spending more) instantly lowers utilization.
   - Example: $500 balance on a $1,000 limit = 50% utilization (bad). Same $500 on a $5,000 limit = 10% (excellent).

3. ACCOUNT AGE (LENGTH OF CREDIT HISTORY) — 15%
   - Includes the age of the oldest account, the average age of all accounts, and how long since each account was used.
   - NEVER close old credit cards — they strengthen your credit history length even if unused.
   - Closing a 15-year-old card can drop your score by 10-30 points and shorten average account age.
   - Keep old cards active by making a small purchase every few months and paying it off.
   - Average age of accounts matters — opening many new accounts rapidly lowers the average.

4. CREDIT MIX — 10%
   - A diverse mix of credit types (revolving credit cards + installment loans like auto/mortgage/personal) improves the score.
   - Lenders want to see you can manage different types of credit responsibly.
   - If you only have credit cards, adding an installment loan (like a credit builder loan) can boost your score by +15 to +30 points over 6-12 months.

5. HARD INQUIRIES — 10%
   - A hard inquiry is created when a lender pulls your credit for a decision. Each costs -3 to -10 points.
   - CRITICAL EXCEPTION: Multiple inquiries for the SAME loan type (mortgage, auto, student loan) within a 14-day window count as ONE inquiry (rate shopping protection).
   - Rate shopping window: for mortgages it's 45 days; for auto loans it's 14 days. Shop within these windows.
   - Credit card applications do NOT get rate-shopping protection — each is a separate inquiry.
   - Hard inquiries stay on the report for 2 years but only affect the score for 12 months.
   - Soft inquiries (pre-approvals, checking your own credit) do NOT affect the score.

=====================================================================
CREDIT SCORE TIERS AND REAL-WORLD CONSEQUENCES
=====================================================================
- POOR (300-579): Most loans denied. Subprime auto loans at 15-25% APR. Requires large security deposits. May need co-signers. Mortgage is generally not available (FHA minimum is 580). Credit card approvals limited to secured cards.
- FAIR (580-669): FHA mortgages available (580 is the FHA minimum for 3.5% down). Auto loans at 8-15% APR. Subprime credit cards available but with annual fees and low limits. Conventional mortgage minimum is 620 — so fair-score users should target 620+ for conventional loans.
- GOOD (670-739): Most loans approved. Auto loans at 5-8% APR. Standard credit cards with rewards. Conventional mortgages available with good rates. This is where most financial doors open.
- VERY GOOD (740-799): Best rates on most products. Auto loans at 3-5% APR. Premium credit cards. Lower mortgage rates. Insurance premiums may be lower.
- EXCELLENT (800-850): Top-tier rates everywhere. Lowest mortgage rates. Best credit card offers and sign-up bonuses. Lowest insurance premiums. Negotiating power with lenders.

KEY MILESTONE: 620 is the conventional mortgage minimum. 580 is the FHA mortgage minimum. 740 unlocks the best mortgage rates.

=====================================================================
CREDIT BUILDING ACTIONS AND SCORE IMPACT (use this to advise users)
=====================================================================
ACTION                           | SCORE IMPACT        | TIMEFRAME
-------------------------------- | ------------------- | -------------------
Become an authorized user        | +20 to +50 points   | 1-2 months
Pay down high utilization         | +10 to +30 points   | 1-2 months
Dispute and remove an error      | +10 to +50 points   | 1-2 months
Pay off a collection             | +25 to +75 points   | 1-3 months
Get a credit builder loan        | +15 to +30 points   | 6-12 months
Open a secured credit card       | +10 to +30 points   | 3-6 months
Miss a payment                   | -30 to -100 points  | Immediate (7-year mark)
Max out credit cards             | -20 to -70 points   | Immediate
Apply for multiple credit cards  | -3 to -10 per card  | Immediate
Close an old credit card         | -10 to -30 points   | Immediate
Default / charge-off             | -80 to -150 points  | Immediate (7-year mark)

AUTHORIZATION STRATEGY: Becoming an authorized user on a family member's old, high-limit, low-utilization card can add +20-50 points in 1-2 months. The card's entire positive history gets imported onto the user's report.

=====================================================================
CONSUMER PROTECTION LAW — FCRA (Fair Credit Reporting Act)
=====================================================================
The FCRA is the primary federal law governing credit reporting. Know these sections:

- §609 (Section 609): The consumer's RIGHT TO REQUEST all documentation the bureau has on file about them. The bureau MUST provide the source of information, and if they cannot produce the original documentation, the item MUST be deleted. This is powerful because bureaus often lack documentation for older items.

- §611(a)(7) (Section 611): METHOD OF VERIFICATION. When a consumer disputes an item and the bureau "verifies" it as accurate, the consumer has the RIGHT to request the specific method of verification — what contact was made, with whom, and what documentation was reviewed. The bureau MUST provide this within 15 days. If they cannot, the item must be deleted. This is used AFTER an initial dispute is verified.

- §623 (Section 623): FURNISHER DUTIES. Original creditors and debt collectors (data furnishers) have a legal duty to investigate direct disputes from consumers and report accurate information. A 623 letter is sent directly to the furnisher (not the bureau) demanding investigation and documentation. If the furnisher cannot verify the debt, they must stop reporting it.

- 30-DAY INVESTIGATION REQUIREMENT: Under FCRA §611, when a consumer disputes an item, the credit bureau MUST complete its investigation within 30 days (45 days if the dispute is based on a free annual credit report). If they fail to investigate within this timeframe, the disputed item MUST be removed from the report. This is a critical deadline — always remind users to track it.

- RE-INVESTIGATION RIGHTS: If a bureau verifies an item, the consumer can dispute it again with NEW information or a different dispute reason. "Frivolous" disputes can be rejected by bureaus, so always provide specific, legitimate reasons.

=====================================================================
CONSUMER PROTECTION LAW — FDCPA (Fair Debt Collection Practices Act)
=====================================================================
The FDCPA governs how debt collectors can operate and provides powerful consumer protections:

- §809(b) (Section 809(b)): DEBT VALIDATION. Within 5 days of first contacting a consumer, a debt collector MUST send a validation notice. The consumer then has 30 days to DISPUTE the debt in writing. If disputed, the collector MUST cease all collection activity until they provide VALIDATION (proof that the debt is legitimate, the amount is correct, and they have the legal right to collect). Most collectors cannot produce adequate validation, which means the debt becomes uncollectible and unreportable.

- GENERAL FDCPA PROTECTIONS: Collectors cannot harass, threaten, call before 8 AM or after 9 PM, call at work if told to stop, contact third parties about the debt, or use deceptive practices. Every violation carries statutory damages of up to $1,000 PER VIOLATION plus actual damages and attorney fees.

- STATUTE OF LIMITATIONS: Each state has a time limit (typically 3-6 years) after which a debt cannot be legally enforced in court. However, the debt may still appear on the credit report for 7 years. A debt past the statute of limitations is "time-barred" — the consumer can still be sued but has an absolute defense. NEVER advise users to make a payment on a time-barred debt as it can RESTART the statute of limitations clock.

=====================================================================
DISPUTE LETTERS — WHEN AND HOW TO USE EACH (FCRA + FDCPA)
=====================================================================
1. 609 LETTER — Bureau documentation request.
   WHEN: First-line dispute for any questionable item. Request all documentation the bureau has on file for the account.
   PURPOSE: If the bureau cannot produce the original documentation, the item MUST be removed. Many older items lack documentation.

2. 611 LETTER — Method of verification request.
   WHEN: AFTER a bureau "verifies" a disputed item as accurate. This is the second escalation step.
   PURPOSE: Forces the bureau to show exactly how they verified the item. They must provide the contact method, who they contacted, and what was reviewed. If they can't, the item must be deleted.

3. 623 LETTER — Furnisher (original creditor) dispute.
   WHEN: When disputing with the original creditor directly. Sent to the furnisher, not the bureau.
   PURPOSE: Demands the original creditor investigate and provide documentation. Under FCRA §623, furnishers have a legal duty to investigate. If they can't verify, they must stop reporting the item.

4. 809(b) LETTER — Debt validation request (FDCPA).
   WHEN: When dealing with a COLLECTION AGENCY or debt collector (not the original creditor).
   PURPOSE: Demands the collector validate the debt. They must prove the debt is legitimate, the amount is correct, and they have the legal right to collect. They MUST cease all collection activity until they validate. Most cannot — which means the collection gets removed.

5. INTENT TO SUE LETTER — Legal escalation.
   WHEN: After 2+ dispute rounds have failed. The item has been verified despite legitimate disputes.
   PURPOSE: A formal letter threatening legal action within 15 days under FCRA/FDCPA. Often motivates bureaus or collectors to remove the item rather than face litigation. Reference specific FCRA/FDCPA violations and the $1,000 per violation damages.

6. HAND WRITTEN DISPUTE LETTER — Advanced bypass method.
   WHEN: When standard typed letters have been rejected or verified. The last escalation before legal action.
   PURPOSE: Hand-written letters bypass the bureau's automated OCR (optical character recognition) processing system, forcing a human to manually review the dispute. This creates processing bottlenecks and increases removal probability.

=====================================================================
DISPUTE DECISION TREE (follow this escalation order for every negative item)
=====================================================================
STEP 0 — IDENTIFY THE TARGET: Determine what type of negative item this is:
   - Inaccurate information → dispute with the bureau
   - Original creditor reporting → 623 furnisher dispute
   - Collection agency → 809(b) debt validation
   - Multiple items → address the most damaging first (collections > late payments > inquiries)

STEP 1 — Online or initial dispute with the credit bureau (Equifax, Experian, or TransUnion). This is the fastest first step.

STEP 2 — Certified mail letter to the furnisher:
   - If the original creditor is still open → 623 Letter
   - If the original creditor account is closed → 623 Letter
   - If dealing with a debt collector → 809(b) Debt Validation Letter
   ALWAYS send via certified mail with return receipt to create a legal paper trail.

STEP 3 — If still verified, send Intent to Sue letter. Threaten legal action within 15 days. Reference FCRA/FDCPA violations and $1,000 per violation statutory damages.

STEP 4 — Method of Verification request (611 Letter). Force the bureau to show HOW they verified. They have 15 days to respond. If they can't, the item must be deleted.

STEP 5 — 609 documentation demand. Request all documentation the bureau has on file. If they can't produce it, the item must be removed.

STEP 6 — Hand written dispute letter. Bypass automated processing to force human review.

STEP 7 — Legal action. File a complaint with the CFPB (Consumer Financial Protection Bureau), the FTC, or consult a consumer protection attorney. Many attorneys take FCRA/FDCPA cases on contingency.

IMPORTANT ESCALATION RULES:
- Wait for the response at each step (30 days for bureau disputes, 15 days for 611 method of verification).
- Document everything — dates, certified mail tracking numbers, responses received.
- If a bureau fails to investigate within 30 days, the item MUST be removed automatically — remind users of this deadline.
- Always dispute ONE item per letter for maximum impact (disputing multiple items can be flagged as frivolous).
- Provide a SPECIFIC dispute reason, not "not mine" — say "this account shows a late payment in June 2023 but I have bank records showing payment was made on June 15, 2023."

=====================================================================
DISPUTE TRACKING SYSTEM — STATUS DEFINITIONS
=====================================================================
- DRAFT: The letter has been generated but not yet sent. User is reviewing/editing.
- SENT: The letter has been mailed (certified mail recommended). The 30-day clock has started.
- IN_PROGRESS: The dispute is under investigation. The bureau or furnisher is reviewing. Awaiting response.
- RESOLVED_POSITIVE: The disputed item was REMOVED or corrected. Victory — the user's score should improve.
- RESOLVED_NEGATIVE: The bureau verified the item as accurate. Escalate to the next step in the decision tree.
- REJECTED: The bureau deemed the dispute frivolous or irrelevant. Provide more specific information and re-dispute.

TIMELINE TRACKING: For every dispute, track: date created, date sent, date response received, days remaining in the 30-day window, and outcome. The 30-day investigation deadline is the user's most powerful lever — if the bureau misses it, the item must be deleted.

=====================================================================
KEY CREDIT TIPS TO SHARE WITH USERS
=====================================================================
CREDIT MANAGEMENT TIPS:
- Never use more than 30% of your available credit. Below 10% is ideal.
- Set up autopay for at least the minimum payment on every account.
- Check all 3 credit reports annually at AnnualCreditReport.com — it's free and federally mandated.
- Monitor your credit score monthly — many banks and apps offer free FICO scores.
- Never close your oldest credit card — it's anchoring your credit history length.

CREDIT BUILDING TIPS:
- Become an authorized user on a trusted family member's old, high-limit card → +20-50 points in 1-2 months.
- Get a credit builder loan (Self, Kikoff, local credit union) → +15-30 points in 6-12 months.
- Open a secured credit card with a $200-500 deposit → +10-30 points in 3-6 months, graduates to unsecured.
- Ask for credit limit increases every 6 months — lowers utilization without new spending.
- Make micropayments mid-cycle to keep reported balances low.

CREDIT REPAIR TIPS:
- Dispute inaccurate items FIRST — they're the easiest wins and often result in +10-50 point jumps.
- Always send dispute letters via CERTIFIED MAIL with return receipt — creates a legal paper trail.
- Dispute ONE item per letter — multiple items can be flagged as frivolous.
- Track the 30-day investigation deadline — if the bureau misses it, the item must be removed.
- Provide SPECIFIC dispute reasons with evidence, not generic "not mine" claims.

LEGAL & RIGHTS TIPS:
- Under FCRA, bureaus MUST investigate disputes within 30 days (45 for annual report disputes).
- Under FDCPA §809(b), collectors MUST validate debts within 30 days of your written request or cease collection.
- Each FDCPA violation = up to $1,000 in statutory damages plus actual damages and attorney fees.
- Each FCRA violation = up to $1,000 in statutory damages plus actual damages and attorney fees.
- File complaints with the CFPB (consumerfinance.gov) — bureaus take CFPB complaints very seriously.
- Statute of limitations on debt is typically 3-6 years by state — never make a payment on a time-barred debt (it restarts the clock).

IDENTITY & FRAUD TIPS:
- Place a free fraud alert on your credit file if you suspect identity theft (lasts 1 year, renewable).
- A credit freeze is free under federal law and is the strongest protection against new account fraud.
- If you're a victim of identity theft, file an FTC report at IdentityTheft.gov and dispute all fraudulent accounts.
- Identity theft items can be blocked from your report under FCRA §605B — provide the FTC report and a police report.

=====================================================================
TOOLS AVAILABLE TO YOU
=====================================================================
- get_disputes: Retrieve the user's current dispute status and history from the dispute tracker. Use when the user asks about their disputes, dispute status, or what letters have been sent.
- generate_dispute_letter: Generate a specific dispute letter (609, 611, 623, 809, intent_to_sue, or hand_written) for a negative account. Use when the user asks you to write, draft, or generate a dispute letter.
- get_credit_tips: Retrieve personalized credit tips for the user. Use when the user asks for general credit advice or tips.

=====================================================================
BEHAVIORAL GUIDELINES
=====================================================================
- When the user asks about their dispute status, use the get_disputes tool.
- When the user asks you to write or generate a dispute letter, use the generate_dispute_letter tool. Ask for the necessary details: creditor name, account number, and which letter type (or recommend one based on the decision tree).
- When the user asks for credit advice, answer from your knowledge above or use get_credit_tips.
- When the user describes a negative item on their report, walk them through the Dispute Decision Tree and recommend the appropriate letter type.
- When the user mentions a collection, immediately explain the 809(b) debt validation strategy.
- When the user mentions a late payment or error, explain the 609/611 documentation strategy.
- When a bureau has "verified" an item, explain the 611 method of verification escalation.
- Always remind users of the 30-day investigation deadline — it's their most powerful lever.
- Always be encouraging, specific, and actionable. Reference the user's actual data when available.
- Keep responses concise but thorough — provide enough detail to be actionable without overwhelming.
- When you trigger a tool, explain to the user what you are doing and what to expect.
- Cite specific FCRA sections (§609, §611, §623) and FDCPA sections (§809(b)) when explaining rights — this builds trust and authority.
- When discussing score improvement, reference the specific point ranges and timeframes from the impact table above.`;

// ============================================================
// Helper: Atomic agent assignment
// ============================================================

/**
 * Assigns an agent to a user atomically.
 *
 * Strategy:
 *  1. Check if the user already has an assignment — return it if so.
 *  2. Query for agents with capacity (current_user_count < max_users AND is_active),
 *     ordered randomly (RANDOM()) to distribute load.
 *  3. Attempt to INSERT a new assignment. The UNIQUE(user_id) constraint
 *     guarantees only one assignment per user even under concurrent requests.
 *  4. The database trigger auto-increments current_user_count on INSERT.
 *  5. If the chosen agent was filled by a concurrent request in the tiny window
 *     between the SELECT and INSERT, the trigger's CHECK constraint would fail —
 *     in that case we retry with the next agent from the pool.
 */
async function assignAgentToUser(userId: string): Promise<{
  agent: AIAgent;
  assignment: UserAgentAssignment;
  is_new: boolean;
}> {
  // Step 1: Check existing assignment
  const { data: existing } = await supabase
    .from("user_agent_assignments")
    .select(
      `
      *,
      agent:ai_agent_pool(*)
    `
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (existing && existing.agent) {
    return {
      agent: existing.agent as AIAgent,
      assignment: {
        id: existing.id,
        user_id: existing.user_id,
        agent_id: existing.agent_id,
        assigned_at: existing.assigned_at,
        is_active: existing.is_active,
      },
      is_new: false,
    };
  }

  // Step 2: Find agents with capacity, randomized
  const { data: availableAgents, error: fetchError } = await supabase
    .from("ai_agent_pool")
    .select("*")
    .eq("is_active", true)
    .lt("current_user_count", MAX_USERS_PER_AGENT)
    .order("current_user_count", { ascending: true }) // fill least-loaded first
    .limit(50); // grab a batch to try

  if (fetchError) throw fetchError;

  if (!availableAgents || availableAgents.length === 0) {
    throw new Error(
      "ALL_AGENTS_AT_CAPACITY: All 10,000 AI agents have reached their maximum of 25 users. Please contact support."
    );
  }

  // Step 3: Try to assign — attempt each agent until one succeeds.
  // The UNIQUE(user_id) constraint prevents duplicate assignments under concurrency.
  let lastError: any = null;

  // Shuffle the batch for randomness within the least-loaded group
  const shuffled = [...availableAgents].sort(() => Math.random() - 0.5);

  for (const agent of shuffled) {
    const { data: newAssignment, error: insertError } = await supabase
      .from("user_agent_assignments")
      .insert({
        user_id: userId,
        agent_id: agent.id,
        is_active: true,
      })
      .select("*")
      .single();

    if (!insertError && newAssignment) {
      // The trigger already incremented current_user_count; fetch the updated agent.
      const { data: updatedAgent } = await supabase
        .from("ai_agent_pool")
        .select("*")
        .eq("id", agent.id)
        .single();

      return {
        agent: (updatedAgent || agent) as AIAgent,
        assignment: newAssignment as UserAgentAssignment,
        is_new: true,
      };
    }

    lastError = insertError;
    // If it's a unique violation on user_id, another request already assigned — re-fetch.
    if (insertError?.code === "23505" && insertError?.message?.includes("user_id")) {
      const { data: recheck } = await supabase
        .from("user_agent_assignments")
        .select("*, agent:ai_agent_pool(*)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (recheck && recheck.agent) {
        return {
          agent: recheck.agent as AIAgent,
          assignment: {
            id: recheck.id,
            user_id: recheck.user_id,
            agent_id: recheck.agent_id,
            assigned_at: recheck.assigned_at,
            is_active: recheck.is_active,
          },
          is_new: false,
        };
      }
    }
    // Otherwise the agent may have filled up — try the next one.
  }

  throw new Error(
    `Failed to assign agent after trying ${shuffled.length} candidates. Last error: ${lastError?.message || "unknown"}`
  );
}

// ============================================================
// Helper: Fetch dispute data (tool: get_disputes)
// ============================================================

async function fetchUserDisputes(userId: string) {
  const { data, error } = await supabase
    .from("disputes")
    .select("*")
    .eq("user_id", userId)
    .order("date_sent", { ascending: false });

  if (error) {
    console.error("[AI Agents] fetchUserDisputes error:", error);
    return { disputes: [], summary: "Unable to retrieve disputes at this time." };
  }

  const disputes = data || [];
  const open = disputes.filter(
    (d: any) => d.status === "sent" || d.status === "in-progress"
  ).length;
  const resolved = disputes.filter((d: any) => d.status === "resolved").length;
  const rejected = disputes.filter((d: any) => d.status === "rejected").length;

  const summary = `You have ${disputes.length} total disputes: ${open} open/in-progress, ${resolved} resolved, ${rejected} rejected.`;

  return { disputes, summary, open, resolved, rejected };
}

// ============================================================
// Helper: Generate dispute letter (tool: generate_dispute_letter)
// ============================================================

const LETTER_TEMPLATES: Record<string, { subject: string; body: string }> = {
  "609 Letter": {
    subject: "RE: Request for Documentation Under FCRA Section 609",
    body: `I am requesting copies of all documentation related to the above-referenced account:

1. Any documents bearing my signature
2. The name and address of the original creditor
3. Documentation showing proper verification procedures
4. Proof of your legal right to report this account

If you cannot provide these documents, you must remove this account immediately.`,
  },
  "611 Letter": {
    subject: "RE: Request for Method of Verification Under FCRA Section 611",
    body: `I recently disputed inaccurate information on my credit report. You have responded claiming the information was "verified."

Pursuant to FCRA Section 611(a)(7), I am requesting:

1. The name, address, and telephone number of each source contacted
2. Copies of all documents used in your verification
3. A detailed explanation of the verification method
4. The name of the person who conducted the reinvestigation`,
  },
  "623 Letter": {
    subject: "Formal request under the Fair Credit Reporting Act, Section 623",
    body: `This letter is a formal request under the Fair Credit Reporting Act, Section 623, regarding the above-referenced account.

I am disputing the accuracy of the information you are reporting to the credit bureaus. After reviewing my credit report, I have found that this account contains inaccurate information.

As required by federal law, I am requesting that you conduct an investigation and provide me with:

1. All documentation relating to the account
2. Verification that you have reviewed all relevant information
3. Confirmation that you have reported the results to all credit bureaus

If you cannot verify this information, I demand immediate deletion from all three credit bureaus.`,
  },
  "809 Letter": {
    subject: "Debt Validation Request under FDCPA Section 809(b)",
    body: `I am writing in response to your claim regarding the above-referenced account. I do not believe I owe this debt.

Under the Fair Debt Collection Practices Act (FDCPA), Section 809(b), I am requesting validation of the debt:

1. The amount of the debt
2. The name of the original creditor
3. Proof that you are licensed to collect debts in my state
4. A copy of the original signed loan agreement

Please cease all collection activities until you have provided the requested validation.`,
  },
  "Intent to Sue Creditor": {
    subject: "RE: NOTICE OF INTENT TO FILE LAWSUIT",
    body: `This letter serves as my final attempt to resolve the dispute regarding the above-referenced account before I pursue legal action.

Despite my previous efforts, you have failed to properly investigate and correct the inaccurate information. Your failure to comply with the Fair Credit Reporting Act constitutes willful noncompliance.

I am prepared to file a lawsuit in 15 days if this matter is not resolved. To avoid litigation, you must:

1. Conduct a proper investigation
2. Remove all inaccurate information from my credit reports
3. Provide written confirmation of the corrections`,
  },
  "Intent to Sue Debt Collector": {
    subject: "RE: NOTICE OF INTENT TO FILE LAWSUIT",
    body: `This letter serves as my final attempt to resolve the dispute regarding the above-referenced account before I pursue legal action.

Despite my previous efforts, you have failed to properly validate this debt as required under the FDCPA. Your continued collection activity without validation constitutes willful noncompliance.

I am prepared to file a lawsuit in 15 days if this matter is not resolved. To avoid litigation, you must:

1. Provide full validation of the debt as required by FDCPA 809(b)
2. Remove all collection references from my credit reports
3. Provide written confirmation of the corrections`,
  },
};

function generateDisputeLetter(params: {
  letterType: string;
  creditorName: string;
  accountNumber: string;
  fullName: string;
  address: string;
  cityStateZip: string;
  phoneNumber?: string;
  certifiedMailNumber?: string;
}): { letterContent: string; letterType: string } {
  const template = LETTER_TEMPLATES[params.letterType] || LETTER_TEMPLATES["609 Letter"];
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const letter = `${params.fullName}
${params.address}
${params.cityStateZip}
${params.phoneNumber ? `Phone: ${params.phoneNumber}` : ""}

${currentDate}

${params.creditorName}
[Creditor Address]

${params.certifiedMailNumber ? `CERTIFIED MAIL #: ${params.certifiedMailNumber}\n\n` : ""}RE: Account #${params.accountNumber}

To Whom It May Concern:

${template.body}

Sincerely,

${params.fullName}`;

  return { letterContent: letter, letterType: params.letterType };
}

// ============================================================
// Helper: Get credit tips (tool: get_credit_tips)
// ============================================================

const CREDIT_TIPS = [
  "Check your credit reports regularly — you're entitled to one free report from each of the three bureaus (Equifax, Experian, TransUnion) annually through AnnualCreditReport.com.",
  "Keep credit utilization below 30%, and ideally under 10% for the best score impact.",
  "Never close old credit cards — the length of your credit history matters. Closing old accounts shortens your history and increases your utilization ratio.",
  "Dispute errors immediately — under the FCRA, credit bureaus must investigate disputes within 30 days.",
  "Set up payment reminders — payment history is 35% of your credit score. Set up automatic payments to never miss a due date.",
  "Become an authorized user on a family member's card with good payment history to boost your score.",
  "Know your FDCPA rights — debt collectors cannot harass you, call at unreasonable hours, or make false statements about your debt.",
  "Freeze your credit with all three bureaus to prevent identity theft.",
  "Multiple hard inquiries for the same loan type within 14 days count as ONE — rate shop wisely for mortgages and auto loans.",
  "Pay off collections — under newer scoring models (FICO 9+), paid collections are ignored entirely, recovering 25-75 points.",
];

// ============================================================
// Helper: Call AI backend (OpenAI-compatible)
// ============================================================

async function callAIBackend(params: {
  messages: { role: string; content: string }[];
  agentName: string;
  agentBio: string;
}): Promise<{ response: string; toolCalls: ToolCall[] }> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

  // Build the full message array with system prompt
  const systemMessage = `${AGENT_SYSTEM_PROMPT}\n\nYour name is ${params.agentName}. ${params.agentBio}\n\nYou are speaking with a user who is enrolled in the ACE-1 credit repair course. Be their personal guide.`;

  const fullMessages = [
    { role: "system", content: systemMessage },
    ...params.messages,
  ];

  // Define tools for function calling
  const tools = [
    {
      type: "function",
      function: {
        name: "get_disputes",
        description: "Retrieve the user's current dispute status from the dispute tracker. Use when the user asks about their disputes, open disputes, or dispute status.",
        parameters: { type: "object", properties: {}, required: [] },
      },
    },
    {
      type: "function",
      function: {
        name: "generate_dispute_letter",
        description: "Generate a dispute letter for a negative account. Use when the user asks to write, create, or generate a dispute letter.",
        parameters: {
          type: "object",
          properties: {
            letterType: {
              type: "string",
              enum: [
                "609 Letter",
                "611 Letter",
                "623 Letter",
                "809 Letter",
                "Intent to Sue Creditor",
                "Intent to Sue Debt Collector",
              ],
              description: "The type of dispute letter to generate",
            },
            creditorName: { type: "string", description: "Name of the creditor or collection agency" },
            accountNumber: { type: "string", description: "The account number being disputed" },
          },
          required: ["letterType", "creditorName", "accountNumber"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_credit_tips",
        description: "Retrieve personalized credit tips for the user. Use when the user asks for credit advice, tips, or strategies.",
        parameters: { type: "object", properties: {}, required: [] },
      },
    },
  ];

  // If no API key, return a fallback response (demo mode)
  if (!apiKey) {
    return {
      response: generateDemoResponse(params.messages, params.agentName),
      toolCalls: [],
    };
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        tools,
        tool_choice: "auto",
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[AI Agents] OpenAI API error:", response.status, errText);
      return {
        response: `I'm having trouble connecting to my AI backend right now. Please try again in a moment. (Error: ${response.status})`,
        toolCalls: [],
      };
    }

    const data = await response.json();
    const choice = data.choices?.[0]?.message;

    if (!choice) {
      return { response: "I didn't receive a valid response. Please try again.", toolCalls: [] };
    }

    const toolCalls: ToolCall[] = [];
    if (choice.tool_calls && choice.tool_calls.length > 0) {
      for (const tc of choice.tool_calls) {
        try {
          const args = JSON.parse(tc.function.arguments || "{}");
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            arguments: args,
          });
        } catch (e) {
          console.error("[AI Agents] Failed to parse tool call args:", e);
        }
      }
    }

    return {
      response: choice.content || "",
      toolCalls,
    };
  } catch (error: any) {
    console.error("[AI Agents] callAIBackend error:", error);
    return {
      response: `I encountered an error processing your request: ${error.message}. Please try again.`,
      toolCalls: [],
    };
  }
}

interface ToolCall {
  id: string;
  name: string;
  arguments: any;
}

// ============================================================
// Helper: Execute a tool call
// ============================================================

async function executeTool(
  toolCall: ToolCall,
  userId: string
): Promise<{ toolName: string; result: any; displayContent: string }> {
  switch (toolCall.name) {
    case "get_disputes": {
      const data = await fetchUserDisputes(userId);
      const disputeList = data.disputes
        .map(
          (d: any) =>
            `• ${d.creditor} — ${d.dispute_type} — Status: ${d.status} — Sent: ${d.date_sent}`
        )
        .join("\n");
      return {
        toolName: "get_disputes",
        result: data,
        displayContent: `📋 **Dispute Status Retrieved**\n\n${data.summary}\n\n${disputeList || "No disputes found."}`,
      };
    }

    case "generate_dispute_letter": {
      const { letterType, creditorName, accountNumber } = toolCall.arguments;
      // Fetch user info for the letter header
      const { data: userInfo } = await supabase
        .from("users")
        .select("name, email, phone")
        .eq("id", userId)
        .single();

      const letter = generateDisputeLetter({
        letterType,
        creditorName,
        accountNumber,
        fullName: userInfo?.name || "Valued Client",
        address: "[Your Address]",
        cityStateZip: "[City, State ZIP]",
        phoneNumber: userInfo?.phone || "",
      });

      // Also save this as a dispute record so it appears in the tracker
      const today = new Date().toISOString().split("T")[0];
      const responseBy = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const { data: savedDispute } = await supabase
        .from("disputes")
        .insert({
          user_id: userId,
          creditor: creditorName,
          account_number: accountNumber,
          dispute_type: letterType,
          date_sent: today,
          status: "sent",
          last_updated: today,
          response_by: responseBy,
          letter_content: letter.letterContent,
          timeline: [
            {
              date: today,
              action: "Letter generated",
              note: `${letterType} letter created by AI Agent`,
            },
          ],
          documents: [],
          reminders: [],
        })
        .select("*")
        .single();

      return {
        toolName: "generate_dispute_letter",
        result: {
          letterType: letter.letterType,
          letterContent: letter.letterContent,
          creditorName,
          accountNumber,
          disputeId: savedDispute?.id,
        },
        displayContent: `✉️ **${letter.letterType} Generated**\n\nFor: ${creditorName} (Account #${accountNumber})\n\nThe letter has been generated and saved to your Dispute Tracker. You can review, edit, and print it from the Dispute Tracker modal.\n\nWould you like me to show you the full letter content?`,
      };
    }

    case "get_credit_tips": {
      // Return 3 random tips
      const shuffled = [...CREDIT_TIPS].sort(() => Math.random() - 0.5);
      const tips = shuffled.slice(0, 3);
      return {
        toolName: "get_credit_tips",
        result: { tips },
        displayContent: `💡 **Credit Tips for You**\n\n${tips
          .map((t, i) => `${i + 1}. ${t}`)
          .join("\n\n")}`,
      };
    }

    default:
      return {
        toolName: toolCall.name,
        result: null,
        displayContent: `Tool "${toolCall.name}" is not recognized.`,
      };
  }
}

// ============================================================
// Demo mode response (when no OpenAI key is configured)
// ============================================================

function generateDemoResponse(
  messages: { role: string; content: string }[],
  agentName: string
): string {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const userText = lastUserMsg?.content?.toLowerCase() || "";

  if (userText.includes("dispute") && (userText.includes("status") || userText.includes("open") || userText.includes("track"))) {
    return `I'd be happy to check your dispute status for you! Let me pull up your dispute tracker information now. *(In demo mode — connect an OpenAI API key for full AI responses.)*`;
  }

  if (userText.includes("letter") || userText.includes("dispute") && userText.includes("write")) {
    return `I can generate a dispute letter for you! I have templates for 609 Letters (documentation requests), 611 Letters (method of verification), 623 Letters (furnisher disputes), and 809 Letters (debt validation). Which type do you need, and what's the creditor name and account number? *(Demo mode — connect an OpenAI API key for full AI.)*`;
  }

  if (userText.includes("tip") || userText.includes("advice") || userText.includes("help")) {
    return `Here are some key credit tips: 1) Keep utilization below 30% (ideally 10%), 2) Never miss a payment — it's 35% of your score, 3) Don't close old credit cards, 4) Dispute errors within 30 days under the FCRA. What specific area would you like to focus on? *(Demo mode — connect OpenAI API key for full AI.)*`;
  }

  return `Hello! I'm ${agentName}, your AI Credit Repair Agent. I can help you with disputing errors on your credit report, generating dispute letters, tracking your disputes, and providing personalized credit building strategies. What would you like to work on today? *(Demo mode — connect an OpenAI API key for full AI responses.)*`;
}

// ============================================================
// Router
// ============================================================

export const aiAgentsRouter = createTRPCRouter({
  // ----------------------------------------------------------
  // assign: Assign an agent to the user (or return existing)
  // ----------------------------------------------------------
  assign: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      console.log("[AI Agents] Assign request for user:", input.userId);

      try {
        const result = await assignAgentToUser(input.userId);
        return {
          success: true,
          agent: result.agent,
          assignment: result.assignment,
          is_new: result.is_new,
        };
      } catch (error: any) {
        console.error("[AI Agents] Assignment failed:", error);

        if (error.message?.includes("ALL_AGENTS_AT_CAPACITY")) {
          throw new Error(
            "All 10,000 AI agents are currently at capacity (25 users each). This is extraordinary demand — please try again shortly or contact support."
          );
        }

        throw new Error(`Failed to assign agent: ${error.message}`);
      }
    }),

  // ----------------------------------------------------------
  // getMyAgent: Get the user's assigned agent
  // ----------------------------------------------------------
  getMyAgent: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("user_agent_assignments")
        .select(
          `
          *,
          agent:ai_agent_pool(*)
        `
        )
        .eq("user_id", input.userId)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        return { agent: null, assignment: null };
      }

      return {
        agent: data.agent as AIAgent,
        assignment: {
          id: data.id,
          user_id: data.user_id,
          agent_id: data.agent_id,
          assigned_at: data.assigned_at,
          is_active: data.is_active,
        } as UserAgentAssignment,
      };
    }),

  // ----------------------------------------------------------
  // getChatHistory: Retrieve conversation history
  //
  // `since` turns this into a cheap delta poll: pass the timestamp of the
  // newest message the client already holds and only newer rows come back.
  // That is what keeps the chat live when the realtime socket is unavailable.
  // ----------------------------------------------------------
  getChatHistory: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().optional().default(50),
        /** ISO timestamp — return only messages created strictly after this. */
        since: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      let query = supabase
        .from("agent_chat_messages")
        .select("*")
        .eq("user_id", input.userId);

      if (input.since) {
        query = query.gt("created_at", input.since);
      }

      const { data, error } = await query
        .order("created_at", { ascending: true })
        .limit(input.limit);

      // Surface the failure instead of masking it as an empty conversation —
      // the client keeps showing its cached messages and flags the problem.
      if (error) {
        console.error("[AI Agents] getChatHistory error:", error);
        throw new Error(`Could not load your conversation: ${error.message}`);
      }

      return (data || []) as ChatMessage[];
    }),

  // ----------------------------------------------------------
  // chat: Send a message and get an AI response (with tool use)
  // ----------------------------------------------------------
  chat: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        agentId: z.number(),
        message: z.string().min(1).max(2000),
        // Previous messages for context (the frontend sends recent history)
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          )
          .optional()
          .default([]),
      })
    )
    .mutation(async ({ input }) => {
      console.log("[AI Agents] Chat from user:", input.userId, "agent:", input.agentId);

      // 1. Save the user's message. The persisted row is returned to the
      //    client so it can swap its optimistic bubble for the real record
      //    (and de-duplicate the echo that arrives over the realtime socket).
      const { data: savedUserMessage } = await supabase
        .from("agent_chat_messages")
        .insert({
          user_id: input.userId,
          agent_id: input.agentId,
          role: "user",
          content: input.message,
        })
        .select("*")
        .single();

      // 2. Fetch agent info for the system prompt
      const { data: agent } = await supabase
        .from("ai_agent_pool")
        .select("*")
        .eq("id", input.agentId)
        .single();

      const agentName = agent?.agent_name || "AI Agent";
      const agentBio = agent?.bio || "";

      // 3. Build the message array for the AI call
      const messages = [
        ...input.history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: input.message },
      ];

      // 4. Call the AI backend
      const { response, toolCalls } = await callAIBackend({
        messages,
        agentName,
        agentBio,
      });

      // 5. Execute any tool calls
      let finalResponse = response;
      const executedTools: any[] = [];

      const savedToolMessages: ChatMessage[] = [];

      if (toolCalls.length > 0) {
        for (const tc of toolCalls) {
          const toolResult = await executeTool(tc, input.userId);

          // Save the tool message
          const { data: savedToolMessage } = await supabase
            .from("agent_chat_messages")
            .insert({
              user_id: input.userId,
              agent_id: input.agentId,
              role: "tool",
              content: toolResult.displayContent,
              tool_name: toolResult.toolName,
              tool_result: toolResult.result,
            })
            .select("*")
            .single();

          if (savedToolMessage) {
            savedToolMessages.push(savedToolMessage as ChatMessage);
          }

          executedTools.push({
            name: toolResult.toolName,
            displayContent: toolResult.displayContent,
            result: toolResult.result,
          });
        }

        // If tools were called, we may need a follow-up call to get the
        // AI's natural language response incorporating the tool results.
        if (toolCalls.length > 0 && !response) {
          // The AI only returned tool calls with no text — generate a
          // follow-up using the tool results as context.
          const toolContext = executedTools
            .map((t) => t.displayContent)
            .join("\n\n");

          finalResponse = toolContext;
        } else if (toolCalls.length > 0 && response) {
          // The AI returned text AND tool calls — combine them.
          finalResponse = response + "\n\n" + executedTools.map((t) => t.displayContent).join("\n\n");
        }
      }

      // 6. Save the assistant's response
      const { data: savedAssistantMessage } = await supabase
        .from("agent_chat_messages")
        .insert({
          user_id: input.userId,
          agent_id: input.agentId,
          role: "assistant",
          content: finalResponse,
        })
        .select("*")
        .single();

      return {
        response: finalResponse,
        toolCalls: executedTools,
        /** The persisted rows, in conversation order, for client reconciliation. */
        messages: [
          savedUserMessage,
          ...savedToolMessages,
          savedAssistantMessage,
        ].filter(Boolean) as ChatMessage[],
      };
    }),

  // ----------------------------------------------------------
  // generateLetter: Direct letter generation (button trigger)
  // ----------------------------------------------------------
  generateLetter: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        letterType: z.string(),
        creditorName: z.string(),
        accountNumber: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      console.log("[AI Agents] Direct letter generation:", input.letterType);

      // Fetch user info
      const { data: userInfo } = await supabase
        .from("users")
        .select("name, email, phone")
        .eq("id", input.userId)
        .single();

      const letter = generateDisputeLetter({
        letterType: input.letterType,
        creditorName: input.creditorName,
        accountNumber: input.accountNumber,
        fullName: userInfo?.name || "Valued Client",
        address: "[Your Address]",
        cityStateZip: "[City, State ZIP]",
        phoneNumber: userInfo?.phone || "",
      });

      // Save as a dispute record
      const today = new Date().toISOString().split("T")[0];
      const responseBy = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const { data: savedDispute, error } = await supabase
        .from("disputes")
        .insert({
          user_id: input.userId,
          creditor: input.creditorName,
          account_number: input.accountNumber,
          dispute_type: input.letterType,
          date_sent: today,
          status: "sent",
          last_updated: today,
          response_by: responseBy,
          letter_content: letter.letterContent,
          timeline: [
            {
              date: today,
              action: "Letter generated",
              note: `${input.letterType} letter created by AI Agent`,
            },
          ],
          documents: [],
          reminders: [],
        })
        .select("*")
        .single();

      if (error) {
        console.error("[AI Agents] Letter save error:", error);
      }

      return {
        success: true,
        letterContent: letter.letterContent,
        letterType: letter.letterType,
        disputeId: savedDispute?.id,
      };
    }),

  // ----------------------------------------------------------
  // getPoolStats: Admin/monitoring endpoint
  // ----------------------------------------------------------
  getPoolStats: publicProcedure.query(async () => {
    const { count: totalAgents } = await supabase
      .from("ai_agent_pool")
      .select("*", { count: "exact", head: true });

    const { count: activeAgents } = await supabase
      .from("ai_agent_pool")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .lt("current_user_count", MAX_USERS_PER_AGENT);

    const { count: fullAgents } = await supabase
      .from("ai_agent_pool")
      .select("*", { count: "exact", head: true })
      .eq("current_user_count", MAX_USERS_PER_AGENT);

    const { count: totalAssignments } = await supabase
      .from("user_agent_assignments")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    return {
      totalAgents: totalAgents || 0,
      activeAgents: activeAgents || 0,
      fullAgents: fullAgents || 0,
      totalAssignments: totalAssignments || 0,
      maxUsersPerAgent: MAX_USERS_PER_AGENT,
      capacity: (totalAgents || 0) * MAX_USERS_PER_AGENT,
    };
  }),
});
