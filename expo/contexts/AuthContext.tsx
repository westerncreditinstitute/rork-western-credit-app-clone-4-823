import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRPCClientError } from '@trpc/client';
import { trpcClient, isTransportErrorMessage } from '@/lib/trpc';
import { isSupabaseConfigured } from '@/lib/supabase';

function extractErrorMessage(error: unknown): string {
  if (error instanceof TRPCClientError) {
    try {
      const parsed = JSON.parse(error.message);
      if (Array.isArray(parsed) && parsed[0]?.error?.message) {
        return parsed[0].error.message;
      }
    } catch {
      // Not JSON, use the message directly
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

/**
 * True when a failure is the transport giving up rather than the server
 * rejecting the request.
 *
 * The tRPC client normalises an unreachable / cold-starting server into its
 * own friendly copy (`OFFLINE_MESSAGE` / `SERVER_WAKING_MESSAGE`), which does
 * NOT contain the raw "Failed to fetch" text. Matching only on the raw strings
 * meant a server outage fell through to the generic error path, where
 * `console.error` surfaced it as a full-screen runtime error overlay.
 */
function isNetworkFailure(message: string): boolean {
  return (
    isTransportErrorMessage(message) ||
    message.includes('Failed to fetch') ||
    message.includes('Network request failed') ||
    message.includes('timed out') ||
    message.includes('fetch')
  );
}

/**
 * Shown when the account could not be created or verified because the server
 * was unreachable. Deliberately actionable: the attempt is safe to repeat.
 */
const RETRY_MESSAGE =
  "Can't reach the server right now, so your account wasn't created. Check your connection and tap the button again in a moment.";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  memberSince?: string;
  role?: string;
  coursesCompleted?: number;
  totalEarnings?: number;
  referrals?: number;
  createdAt: string;
}

const AUTH_STORAGE_KEY = 'wci_auth_user';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (userData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    desiredTier?: 'free' | 'ace1_student';
    /** Optional launch promo code (e.g. WCI2026) validated server-side. */
    promoCode?: string;
  }) => Promise<{ success: boolean; error?: string; user?: AuthUser; tier?: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  isRegistering: boolean;
  isLoggingIn: boolean;
}

const defaultAuthValue: AuthContextType = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  register: async () => ({ success: false, error: 'Not initialized' }),
  login: async () => ({ success: false, error: 'Not initialized' }),
  logout: async () => {},
  updateProfile: async () => ({ success: false, error: 'Not initialized' }),
  isRegistering: false,
  isLoggingIn: false,
};

const AuthContext = createContext<AuthContextType>(defaultAuthValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          try {
            const parsedUser = JSON.parse(stored);
            if (parsedUser && typeof parsedUser === 'object' && parsedUser.id && parsedUser.email) {
              setUser(parsedUser);
              setIsAuthenticated(true);
              console.log('[Auth] User loaded from storage:', parsedUser.email);
            } else {
              console.log('[Auth] Invalid stored user data, clearing');
              await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
            }
          } catch (parseError) {
            console.error('[Auth] Error parsing stored user:', parseError);
            await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          }
        } else {
          console.log('[Auth] No stored user found');
        }
      } catch (error) {
        console.error('[Auth] Error loading auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadAuthState();
  }, []);

  const register = useCallback(async (userData: { 
    name: string; 
    email: string; 
    password: string;
    phone?: string;
    desiredTier?: 'free' | 'ace1_student';
    promoCode?: string;
  }): Promise<{ success: boolean; error?: string; user?: AuthUser; tier?: string }> => {
    try {
      console.log('[Auth] Registering user:', userData.email);
      console.log('[Auth] Supabase configured:', isSupabaseConfigured);
      
      if (!isSupabaseConfigured) {
        console.log('[Auth] Using demo registration mode');
        const demoUser = createDemoUser(userData.email, userData.name);
        console.log('[Auth] About to save demo user to AsyncStorage:', demoUser);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(demoUser));
        console.log('[Auth] Demo user saved, verifying:', await AsyncStorage.getItem(AUTH_STORAGE_KEY));
        setUser(demoUser);
        setIsAuthenticated(true);
        console.log('[Auth] Demo user registered:', demoUser.email);
        return { success: true, user: demoUser };
      }
      
      setIsRegistering(true);
      try {
        const result = await trpcClient.users.register.mutate({
          name: userData.name,
          email: userData.email.toLowerCase().trim(),
          password: userData.password,
          phone: userData.phone,
          desiredTier: userData.desiredTier || 'free',
          promoCode: userData.promoCode,
        });

        const authUser: AuthUser = {
          id: result.id,
          name: result.name,
          email: result.email,
          phone: result.phone,
          avatar: result.avatar,
          memberSince: result.memberSince,
          role: result.role,
          coursesCompleted: result.coursesCompleted,
          totalEarnings: result.totalEarnings,
          referrals: result.referrals,
          createdAt: result.createdAt,
        };

        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        setUser(authUser);
        setIsAuthenticated(true);
        console.log('[Auth] User registered successfully:', authUser.email);
        return { 
          success: true, 
          user: authUser,
          tier: (result as any).tier || userData.desiredTier || 'free',
        };
      } catch (backendError) {
        const backendErrorMessage = extractErrorMessage(backendError);

        // Server unreachable / cold starting. Registration MUST persist server
        // side - silently minting a local demo account here would hand the user
        // a phantom ACE-1 login that exists on no other device and has no
        // subscription record. Ask them to retry instead, quietly: a network
        // blip is not a crash, so warn rather than error.
        if (isNetworkFailure(backendErrorMessage)) {
          console.warn(
            '[Auth] Registration could not reach the server, asking user to retry:',
            backendErrorMessage,
          );
          return { success: false, error: RETRY_MESSAGE };
        }

        throw backendError;
      }
    } catch (error) {
      const rawMessage = extractErrorMessage(error);

      if (isNetworkFailure(rawMessage)) {
        console.warn('[Auth] Registration transport failure:', rawMessage);
        return { success: false, error: RETRY_MESSAGE };
      }

      console.error('[Auth] Registration error:', error);
      let errorMessage = 'Registration failed. Please try again.';
      
      if (rawMessage.includes('already exists')) {
        errorMessage = 'An account with this email already exists.';
      } else if (rawMessage && rawMessage !== 'An unexpected error occurred') {
        errorMessage = rawMessage;
      }
      
      return { success: false, error: errorMessage };
    } finally {
      if (isMountedRef.current) {
        setIsRegistering(false);
      }
    }
  }, []);

  const createDemoUser = useCallback((email: string, name?: string): AuthUser => {
    // Generate a valid UUID-like format for demo users
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    
    return {
      id: uuid,
      name: name || email.split('@')[0] || 'Demo User',
      email: email.toLowerCase().trim(),
      phone: '',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      memberSince: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      role: 'Student',
      coursesCompleted: 0,
      totalEarnings: 0,
      referrals: 0,
      createdAt: new Date().toISOString(),
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
    try {
      console.log('[Auth] Logging in user:', email);
      console.log('[Auth] Supabase configured:', isSupabaseConfigured);
      
      if (!isSupabaseConfigured) {
        console.log('[Auth] Using demo login mode (Supabase not configured)');
        const demoUser = createDemoUser(email);
        console.log('[Auth] About to save demo user to AsyncStorage:', demoUser);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(demoUser));
        console.log('[Auth] Demo user saved, verifying:', await AsyncStorage.getItem(AUTH_STORAGE_KEY));
        setUser(demoUser);
        setIsAuthenticated(true);
        console.log('[Auth] Demo user logged in:', demoUser.email);
        return { success: true, user: demoUser };
      }
      
      setIsLoggingIn(true);
      try {
        const result = await trpcClient.users.login.mutate({
          email: email.toLowerCase().trim(),
          password: password,
        });

        const authUser: AuthUser = {
          id: result.id,
          name: result.name,
          email: result.email,
          phone: result.phone,
          avatar: result.avatar,
          memberSince: result.memberSince,
          role: result.role,
          coursesCompleted: result.coursesCompleted,
          totalEarnings: result.totalEarnings,
          referrals: result.referrals,
          createdAt: result.createdAt,
        };

        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        setUser(authUser);
        setIsAuthenticated(true);
        console.log('[Auth] User logged in successfully:', authUser.email);
        return { success: true, user: authUser };
      } catch (backendError) {
        const backendErrorMessage = extractErrorMessage(backendError);

        // Server unreachable: a demo fallback would mint a brand-new random id,
        // and every per-user storage key (tier, progress, enrolments) is
        // namespaced by that id - so "logging in" offline would silently hide
        // the real account's data behind an empty one. Retrying is correct.
        if (isNetworkFailure(backendErrorMessage)) {
          console.warn(
            '[Auth] Login could not reach the server, asking user to retry:',
            backendErrorMessage,
          );
          return {
            success: false,
            error:
              "Can't reach the server right now. Check your connection and try signing in again in a moment.",
          };
        }

        console.warn('[Auth] Backend login failed:', backendErrorMessage);

        // A rejected password must stay rejected. This previously fell back to
        // minting a demo account with a brand-new random id, which "succeeded"
        // into an empty account: uploaded reports, disputes and progress all
        // live under the real user id, so the user appeared signed in while
        // their own credit report was invisible to them and to the agent.
        throw backendError;
      }
    } catch (error) {
      const rawMessage = extractErrorMessage(error);

      if (isNetworkFailure(rawMessage)) {
        console.warn('[Auth] Login transport failure:', rawMessage);
        return {
          success: false,
          error:
            "Can't reach the server right now. Check your connection and try signing in again in a moment.",
        };
      }

      console.error('[Auth] Login error:', error);
      let errorMessage = 'Login failed. Please try again.';
      
      if (rawMessage.includes('Invalid email or password')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (rawMessage && rawMessage !== 'An unexpected error occurred') {
        errorMessage = rawMessage;
      }
      
      return { success: false, error: errorMessage };
    } finally {
      if (isMountedRef.current) {
        setIsLoggingIn(false);
      }
    }
  }, [createDemoUser]);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(null);
      setIsAuthenticated(false);
      console.log('[Auth] User logged out');
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<AuthUser>) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    try {
      const updatedUser = { ...user, ...updates };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
      console.log('[Auth] Profile updated');
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('[Auth] Update profile error:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  }, [user]);

  const value: AuthContextType = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated,
    register,
    login,
    logout,
    updateProfile,
    isRegistering,
    isLoggingIn,
  }), [user, isLoading, isAuthenticated, register, login, logout, updateProfile, isRegistering, isLoggingIn]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    console.warn('[Auth] useAuth called outside of AuthProvider, returning default value');
    return defaultAuthValue;
  }
  return context;
}
