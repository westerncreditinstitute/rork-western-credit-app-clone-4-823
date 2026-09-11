import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
// Service-role client so writes here aren't blocked by RLS, matching the
// pattern already used in disputes.ts / ai-agents.ts for the same reason.
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/backend/lib/expo-push";

// ============================================================
// pushTokensRouter — register/unregister a device's Expo push token
// ============================================================
// A device registers its Expo push token here right after the user
// grants notification permission (see hooks/usePushNotifications.ts).
// The token is later read by sendExpoPush() (backend/lib/expo-push.ts)
// whenever the server needs to notify a user outside the app — most
// importantly, the overdue-dispute case.

export const pushTokensRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        expoPushToken: z.string(),
        platform: z.string().optional(),
        deviceName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { error } = await supabase.from("push_tokens").upsert(
        {
          user_id: input.userId,
          expo_push_token: input.expoPushToken,
          platform: input.platform || "unknown",
          device_name: input.deviceName || "",
          last_registered_at: new Date().toISOString(),
        },
        { onConflict: "expo_push_token" }
      );

      if (error) {
        console.error("[PushTokens] register error:", error);
        return { success: false, error: error.message };
      }
      return { success: true };
    }),

  unregister: publicProcedure
    .input(z.object({ expoPushToken: z.string() }))
    .mutation(async ({ input }) => {
      const { error } = await supabase
        .from("push_tokens")
        .delete()
        .eq("expo_push_token", input.expoPushToken);

      if (error) {
        console.error("[PushTokens] unregister error:", error);
        return { success: false, error: error.message };
      }
      return { success: true };
    }),

  // ----------------------------------------------------------
  // sendDisputeOverdue: real push notification for the overdue case
  // ----------------------------------------------------------
  // Called from DisputesContext's proactive alert effect the moment a
  // dispute's 30-day response deadline is detected as passed. Unlike the
  // in-app notification (which only reaches the user while the app is
  // open), this reaches any device that has completed push registration
  // (see hooks/usePushNotifications.ts) even if the app is closed.
  // Never fails the caller — if the user has no registered device
  // tokens (e.g. never granted permission, or no EAS projectId is
  // configured so registration never completed), this is a no-op.
  sendDisputeOverdue: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        creditor: z.string(),
        disputeId: z.string(),
        responseBy: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await sendPushToUser({
        userId: input.userId,
        title: "Dispute Response Overdue",
        body: `${input.creditor} has not responded by the expected date (${input.responseBy}). Under the FCRA, an unanswered dispute past 30 days may need to be escalated — check your Dispute Tracker.`,
        data: {
          type: "dispute_overdue",
          disputeId: input.disputeId,
          creditor: input.creditor,
          actionUrl: "/dispute-tracker",
        },
        priority: "high",
      });
      return { success: true, devicesSent: result.sent };
    }),
});
