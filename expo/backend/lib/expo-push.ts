// ============================================================
// Expo Push API helper — server-side only
// ============================================================
// Sends real push notifications (deliverable even when the app is
// closed) via Expo's push service. This has NO dependency on an EAS
// project id: getExpoPushTokenAsync() on the client needs one to
// *obtain* a token, but *sending* to an already-obtained token from
// the server only needs the token itself and this public HTTP API.
//
// Never imported from app/, components/, contexts/, or hooks/ — same
// server-only restriction as lib/supabase-admin.ts, since this reaches
// out to an external HTTP API and looks up tokens via the service-role
// Supabase client.

import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
}

/**
 * Look up every registered device token for a user and send them all the
 * same push message. Best-effort: logs and swallows failures so a push
 * delivery problem never blocks or fails the caller (mirrors the
 * never-throws convention already used by notifyDisputeLetterGenerated
 * in ai-agents.ts).
 */
export async function sendPushToUser(params: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: "default" | "normal" | "high";
}): Promise<{ sent: number }> {
  try {
    const { data: tokenRows, error } = await supabase
      .from("push_tokens")
      .select("expo_push_token")
      .eq("user_id", params.userId);

    if (error) {
      console.error("[ExpoPush] Failed to look up tokens:", error);
      return { sent: 0 };
    }

    const tokens = (tokenRows || [])
      .map((r: { expo_push_token: string }) => r.expo_push_token)
      .filter((t: string) => typeof t === "string" && t.startsWith("ExponentPushToken"));

    if (tokens.length === 0) {
      return { sent: 0 };
    }

    const messages: ExpoPushMessage[] = tokens.map((to: string) => ({
      to,
      title: params.title,
      body: params.body,
      data: params.data,
      sound: "default",
      priority: params.priority || "high",
    }));

    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error("[ExpoPush] Push send failed with status:", response.status);
      return { sent: 0 };
    }

    const result = await response.json().catch(() => null);
    console.log("[ExpoPush] Push send result:", JSON.stringify(result));
    return { sent: tokens.length };
  } catch (err) {
    console.error("[ExpoPush] sendPushToUser threw:", err);
    return { sent: 0 };
  }
}
