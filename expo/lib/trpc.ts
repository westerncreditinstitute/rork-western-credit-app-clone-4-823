import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AppRouter } from "@/backend/trpc/app-router";

const AUTH_STORAGE_KEY = "wci_auth_user";

export const trpc = createTRPCReact<AppRouter>();

/** Friendly message shown when the API server cannot be reached at all. */
export const OFFLINE_MESSAGE =
  "Can't reach the server right now. Check your internet connection and try again in a moment.";

/** Message shown when the server is up but temporarily overloaded or starting up. */
export const SERVER_WAKING_MESSAGE =
  "The server is starting up and didn't respond in time. Please try again in a few seconds.";

/** Last base URL logged, so the value is announced once instead of per request. */
let lastLoggedBaseUrl: string | undefined;

const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;

  if (!url) {
    console.warn("EXPO_PUBLIC_RORK_API_BASE_URL is not set, using empty string");
    return "";
  }

  // The value is a public address (it ships in the app bundle by design — the
  // EXPO_PUBLIC_ prefix is what makes it public), so logging it is safe. It
  // appears in the Rork preview Logs panel, web devtools, and local terminal,
  // and is the easiest way to answer "what is my API base URL?" Logged once
  // per distinct value so warm-up retries don't flood the panel.
  if (url !== lastLoggedBaseUrl) {
    lastLoggedBaseUrl = url;
    console.log(`[tRPC] API base URL: ${url}`);
  }

  return url;
};

/** HTTP statuses worth retrying: gateway/cold-start/rate-limit responses. */
const RETRYABLE_STATUSES = new Set<number>([408, 425, 429, 500, 502, 503, 504]);

/**
 * True when the failure looks like a transport problem (server unreachable,
 * DNS failure, CORS/offline) rather than an application error.
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("failed to fetch") ||
    message.includes("network request failed") ||
    message.includes("network error") ||
    message.includes("connection")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exponential backoff with jitter so retries don't stampede a waking server. */
function backoffDelay(attempt: number, baseDelay: number): number {
  const exponential = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelay;
  return Math.min(exponential + jitter, 8000);
}

const fetchWithRetry = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const isMutation = (init?.method ?? "GET").toUpperCase() === "POST";

  // The dev backend sleeps and answers with an instant edge-level 503 until the
  // instance wakes, so give every request enough attempts to outlast a cold start.
  const maxAttempts = isMutation ? 5 : 5;
  const baseDelay = 700;
  // Writes (video imports, saves) need a longer ceiling than quick reads.
  const timeout = isMutation ? 45000 : 20000;

  if (init?.signal?.aborted) {
    throw new DOMException("Request was cancelled", "AbortError");
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (init?.signal?.aborted) {
      throw new DOMException("Request was cancelled", "AbortError");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort("Timeout"), timeout);

    const originalSignal = init?.signal;
    const onOriginalAbort = () => controller.abort("Cancelled by caller");
    if (originalSignal) {
      originalSignal.addEventListener("abort", onOriginalAbort);
    }

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (originalSignal) {
        originalSignal.removeEventListener("abort", onOriginalAbort);
      }
    };

    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      cleanup();

      // A cold-starting or overloaded server answers with 5xx before tRPC ever
      // sees the body. Retry those instead of surfacing a parse failure.
      if (RETRYABLE_STATUSES.has(response.status) && attempt < maxAttempts - 1) {
        const delay = backoffDelay(attempt, baseDelay);
        console.log(
          `[tRPC] Server returned ${response.status}, retrying in ${Math.round(delay)}ms ` +
            `(attempt ${attempt + 1}/${maxAttempts})`,
        );
        lastError = new Error(SERVER_WAKING_MESSAGE);
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      cleanup();

      // Caller cancelled (component unmounted, screen closed) - never retry.
      if (originalSignal?.aborted) {
        throw new DOMException("Request was cancelled", "AbortError");
      }

      const timedOut = error instanceof Error && error.name === "AbortError";
      lastError = timedOut ? new Error(SERVER_WAKING_MESSAGE) : error;

      const retryable = timedOut || isNetworkError(error);
      if (!retryable || attempt === maxAttempts - 1) {
        break;
      }

      const delay = backoffDelay(attempt, baseDelay);
      console.log(
        `[tRPC] Attempt ${attempt + 1}/${maxAttempts} failed (${
          timedOut ? "timeout" : "network"
        }), retrying in ${Math.round(delay)}ms`,
      );
      await sleep(delay);
    }
  }

  if (lastError instanceof Error && lastError.message === SERVER_WAKING_MESSAGE) {
    throw lastError;
  }
  if (isNetworkError(lastError)) {
    throw new Error(OFFLINE_MESSAGE);
  }
  throw lastError instanceof Error ? lastError : new Error(OFFLINE_MESSAGE);
};

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const user = JSON.parse(stored);
      if (user && user.id && user.email) {
        const token = btoa(JSON.stringify({ id: user.id, email: user.email }));
        return { Authorization: `Bearer ${token}` };
      }
    }
  } catch (error) {
    console.log("[tRPC] Failed to get auth headers:", error);
  }
  return {};
};

/** Timeout for a single reachability probe so the banner stays responsive. */
const PROBE_TIMEOUT_MS = 8000;

async function probeHealthOnce(baseUrl: string): Promise<{ ok: boolean; message?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("Timeout"), PROBE_TIMEOUT_MS);

  try {
    // Note: the health route is "/api" with NO trailing slash - "/api/" is a 404.
    const response = await fetch(`${baseUrl}/api`, { signal: controller.signal });

    // Any HTTP answer at all proves the server is reachable. Only the edge-level
    // 5xx family means the app instance is asleep or genuinely down - a 404 or
    // other 4xx still means something answered, so never report that as offline.
    if (RETRYABLE_STATUSES.has(response.status)) {
      return { ok: false, message: SERVER_WAKING_MESSAGE };
    }
    return { ok: true };
  } catch (error) {
    console.log("[tRPC] Health check failed:", error);
    return { ok: false, message: OFFLINE_MESSAGE };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Checks whether the API server is currently reachable. Probes the health
 * route twice, then falls back to a real tRPC read - a flaky health route
 * must never flag the server offline while content requests still answer.
 */
export async function checkApiReachable(): Promise<{ ok: boolean; message?: string }> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    return { ok: false, message: "API base URL is not configured." };
  }

  let result = await probeHealthOnce(baseUrl);
  if (result.ok) return result;

  // A cold-starting edge can 5xx the health route while tRPC answers fine,
  // so confirm with an actual content request before declaring the server
  // down. Any HTTP response - even an application error - proves reachability.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("Timeout"), PROBE_TIMEOUT_MS);
  try {
    const input = encodeURIComponent(JSON.stringify({ json: {} }));
    const response = await fetch(`${baseUrl}/api/trpc/videos.getAll?input=${input}`, {
      signal: controller.signal,
    });
    return { ok: true };
  } catch {
    // Network failure - fall through to the final health retry.
  } finally {
    clearTimeout(timeoutId);
  }

  // Last chance: the cold start may have just finished.
  await sleep(1200);
  return probeHealthOnce(baseUrl);
}

/**
 * Pings the API until the sleeping dev instance wakes up. Used before a batch
 * of writes so the first real request doesn't burn its retries on a cold start.
 * Never throws and never blocks the caller from proceeding.
 */
export async function warmUpApi(maxAttempts: number = 4): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await checkApiReachable();
    if (result.ok) return true;

    if (attempt < maxAttempts) {
      const delay = Math.min(1000 * attempt, 4000);
      console.log(`[tRPC] Warming up API, retry ${attempt}/${maxAttempts} in ${delay}ms`);
      await sleep(delay);
    }
  }
  return false;
}

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      fetch: (input, init) => {
        if (!process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
          const baseUrl = getBaseUrl();
          if (typeof input === "string" && input.startsWith("/api/trpc")) {
            input = `${baseUrl}${input}`;
          }
        }
        return fetchWithRetry(input, init);
      },
      async headers() {
        return await getAuthHeaders();
      },
    }),
  ],
});
