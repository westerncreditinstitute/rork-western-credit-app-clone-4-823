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

/**
 * Last base URL logged, so the value is announced once instead of per request.
 * Starts as a sentinel no env value can equal, so the first call always logs -
 * including when the variable is missing entirely.
 */
let lastLoggedBaseUrl: string | undefined = "\u0000never-logged";

const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;

  // Announced with console.warn, not console.log: the Logs panel is busy and
  // this single line is what tells you (a) the value Rork injected, and
  // (b) whether it was injected at all. Both cases print, once per value.
  // The value is a public address - it ships in the app bundle by design,
  // which is exactly what the EXPO_PUBLIC_ prefix means - so logging is safe.
  if (url !== lastLoggedBaseUrl) {
    lastLoggedBaseUrl = url;
    if (url) {
      console.warn(`[WCI-CONFIG] EXPO_PUBLIC_RORK_API_BASE_URL = ${url}`);
      console.warn(`[WCI-CONFIG] status endpoint: ${url}/api/system-status`);
    } else {
      console.warn(
        "[WCI-CONFIG] EXPO_PUBLIC_RORK_API_BASE_URL is EMPTY. Rork did not " +
          "inject it, so every tRPC request resolves to a relative path and " +
          "fails with a network error. Contact Rork support.",
      );
    }
  }

  return url ?? "";
};

/** HTTP statuses worth retrying: gateway/cold-start/rate-limit responses. */
const RETRYABLE_STATUSES = new Set<number>([408, 425, 429, 500, 502, 503, 504]);

/**
 * Circuit breaker for transport failures.
 *
 * A server that is down must not be met with a full retry ladder per caller.
 * The app can have a dozen callers in flight at once (debounced save, autosave,
 * queries, chat polls); at five attempts each that is ~60 requests per second
 * against a host that is already refusing traffic, which is exactly how an
 * outage escalates into rate limiting (429) and stops the host recovering.
 *
 * Once failures are confirmed the breaker opens and every request fails fast
 * with the offline message. After the cooldown, traffic resumes normally and
 * either succeeds (breaker resets) or re-opens after a couple of failures.
 */
const BREAKER_FAILURE_THRESHOLD = 2;
const BREAKER_BASE_COOLDOWN_MS = 5000;
const BREAKER_MAX_COOLDOWN_MS = 30000;

let consecutiveTransportFailures = 0;
let circuitOpenUntil = 0;

function isCircuitOpen(): boolean {
  return Date.now() < circuitOpenUntil;
}

/** Any real HTTP answer proves the server is back: reset the breaker. */
function recordTransportSuccess(): void {
  if (consecutiveTransportFailures > 0 || circuitOpenUntil > 0) {
    console.log("[tRPC] Server reachable again, resetting circuit breaker");
  }
  consecutiveTransportFailures = 0;
  circuitOpenUntil = 0;
}

function recordTransportFailure(): void {
  consecutiveTransportFailures += 1;
  if (consecutiveTransportFailures < BREAKER_FAILURE_THRESHOLD) return;

  const cooldown = Math.min(
    BREAKER_BASE_COOLDOWN_MS *
      Math.pow(2, consecutiveTransportFailures - BREAKER_FAILURE_THRESHOLD),
    BREAKER_MAX_COOLDOWN_MS,
  );
  const openedNow = !isCircuitOpen();
  circuitOpenUntil = Date.now() + cooldown;

  if (openedNow) {
    console.log(
      `[tRPC] Server unreachable, pausing requests for ${Math.round(cooldown / 1000)}s ` +
        "instead of retrying every caller",
    );
  }
}

/**
 * Delay requested by the server itself via Retry-After, in ms.
 * Honouring this is the difference between backing off a rate-limited server
 * and hammering it with the client's own (much shorter) backoff.
 */
function retryAfterDelay(response: Response): number | null {
  const header = response.headers?.get?.("retry-after");
  if (!header) return null;

  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return Math.min(Math.max(seconds, 0) * 1000, BREAKER_MAX_COOLDOWN_MS);
  }

  const retryAt = Date.parse(header);
  if (Number.isFinite(retryAt)) {
    return Math.min(Math.max(retryAt - Date.now(), 0), BREAKER_MAX_COOLDOWN_MS);
  }
  return null;
}

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

/**
 * Best-effort URL of a request, for logging. Retry logs are useless without it:
 * "failed (network)" and "failed (network) for /api/trpc/..." mean very
 * different things - the second shows the base URL was empty.
 */
function describeTarget(input: RequestInfo | URL): string {
  try {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.toString();
    if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  } catch {
    // Fall through to the placeholder below.
  }
  return "<unknown url>";
}

const fetchWithRetry = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const isMutation = (init?.method ?? "GET").toUpperCase() === "POST";
  const target = describeTarget(input);

  // The dev backend sleeps and answers with an instant edge-level 503 until the
  // instance wakes, so give every request enough attempts to outlast a cold start.
  const maxAttempts = isMutation ? 5 : 5;
  const baseDelay = 700;
  // Writes (video imports, saves) need a longer ceiling than quick reads.
  const timeout = isMutation ? 45000 : 20000;

  if (init?.signal?.aborted) {
    throw new DOMException("Request was cancelled", "AbortError");
  }

  // Known-down server: fail immediately rather than burning five attempts and
  // up to 20s of timeouts per caller. Callers already handle this error, and
  // local-first writes keep their data safe until the server returns.
  if (isCircuitOpen()) {
    throw new Error(OFFLINE_MESSAGE);
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
        // A rate-limited server states how long to wait; the client's own
        // backoff is far too short and would deepen the rate limit.
        const delay = retryAfterDelay(response) ?? backoffDelay(attempt, baseDelay);
        console.log(
          `[tRPC] Server returned ${response.status} for ${target}, ` +
            `retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxAttempts})`,
        );
        lastError = new Error(SERVER_WAKING_MESSAGE);
        await sleep(delay);
        continue;
      }

      if (RETRYABLE_STATUSES.has(response.status)) {
        // Retries exhausted against an unhealthy server - trip the breaker so
        // the next wave of callers backs off instead of repeating this ladder.
        recordTransportFailure();
      } else {
        recordTransportSuccess();
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
        }) for ${target}, retrying in ${Math.round(delay)}ms`,
      );
      await sleep(delay);
    }
  }

  recordTransportFailure();

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

    // The probe bypasses fetchWithRetry, so it is the one caller that can
    // clear a breaker opened while the server was down.
    recordTransportSuccess();
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
