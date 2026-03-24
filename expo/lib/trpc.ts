import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AppRouter } from "@/backend/trpc/app-router";

const AUTH_STORAGE_KEY = "wci_auth_user";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;

  if (!url) {
    console.warn("EXPO_PUBLIC_RORK_API_BASE_URL is not set, using empty string");
    return "";
  }

  return url;
};

const fetchWithRetry = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const maxRetries = 2;
  const baseDelay = 500;
  const timeout = 15000;
  
  // Check if the original signal is already aborted (e.g., component unmounted)
  if (init?.signal?.aborted) {
    throw new DOMException('Request was cancelled', 'AbortError');
  }
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Check again before each attempt
    if (init?.signal?.aborted) {
      throw new DOMException('Request was cancelled', 'AbortError');
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort('Timeout'), timeout);
    
    // Listen to the original signal to abort our controller
    const originalSignal = init?.signal;
    const onOriginalAbort = () => {
      controller.abort('Cancelled by caller');
    };
    
    if (originalSignal) {
      originalSignal.addEventListener('abort', onOriginalAbort);
    }
    
    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      if (originalSignal) {
        originalSignal.removeEventListener('abort', onOriginalAbort);
      }
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (originalSignal) {
        originalSignal.removeEventListener('abort', onOriginalAbort);
      }
      
      // Check if this was cancelled by the original caller (component unmount, etc.)
      if (originalSignal?.aborted) {
        throw new DOMException('Request was cancelled', 'AbortError');
      }
      
      // Check if this was our timeout
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`[tRPC] Fetch attempt ${attempt + 1} timed out`);
        if (attempt === maxRetries - 1) {
          throw new Error('Request timed out. Please try again.');
        }
      } else {
        console.log(`[tRPC] Fetch attempt ${attempt + 1} failed:`, error);
        if (attempt === maxRetries - 1) {
          throw error;
        }
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[tRPC] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Failed to fetch after retries');
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

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      fetch: (input, init) => {
        if (!process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
          const baseUrl = getBaseUrl();
          if (typeof input === 'string' && input.startsWith('/api/trpc')) {
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
