import { useEffect, useState, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from '@/lib/trpc';
import { currentUser as mockUser } from '@/mocks/data';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar: string;
  memberSince: string;
  role: "Student" | "CSO" | "Affiliate";
  coursesCompleted: number;
  totalEarnings: number;
  referrals: number;
  driversLicenseNumber?: string;
  driversLicenseState?: string;
}

const USER_STORAGE_KEY = 'wci_user_id';

export const [UserProvider, useUser] = createContextHook(() => {
  const auth = useAuth();
  const authUser = auth?.user ?? null;
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const userQuery = trpc.users.getById.useQuery(
    { id: userId || '' },
    { 
      enabled: !!userId && !authUser,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    }
  );

  const createUserMutation = trpc.users.create.useMutation();
  const updateUserMutation = trpc.users.update.useMutation();

  // Sync with AuthContext when user is authenticated
  useEffect(() => {
    if (isAuthenticated && authUser) {
      console.log('[UserContext] Syncing with AuthContext user:', authUser.email);
      const syncedUser: User = {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        phone: authUser.phone,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.name || 'User')}&background=6366f1&color=fff&size=150&bold=true`,
        memberSince: authUser.createdAt,
        role: "Student",
        coursesCompleted: 0,
        totalEarnings: 0,
        referrals: 0,
      };
      setUser(syncedUser);
      setUserId(authUser.id);
      setIsLoading(false);
      // Also store the user ID for future reference
      AsyncStorage.setItem(USER_STORAGE_KEY, authUser.id).catch(console.error);
    } else if (!isAuthenticated) {
      // Not authenticated, load from storage or use mock
      const loadUserId = async () => {
        try {
          const storedUserId = await AsyncStorage.getItem(USER_STORAGE_KEY);
          if (storedUserId) {
            setUserId(storedUserId);
          } else {
            setUser(mockUser);
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Error loading user ID:', error);
          setUser(mockUser);
          setIsLoading(false);
        }
      };
      loadUserId();
    }
  }, [isAuthenticated, authUser]);

  useEffect(() => {
    if (userQuery.data && !authUser) {
      setUser(userQuery.data as User);
      setIsLoading(false);
    } else if (userQuery.error || (userId && !userQuery.isLoading && !userQuery.data && !authUser)) {
      setUser(mockUser);
      setIsLoading(false);
    }
  }, [userQuery.data, userQuery.error, userQuery.isLoading, userId, authUser]);

  const createUser = useCallback(async (userData: { name: string; email: string; avatar?: string; role?: "Student" | "CSO" | "Affiliate" }) => {
    try {
      const newUser = await createUserMutation.mutateAsync({
        name: userData.name,
        email: userData.email,
        avatar: userData.avatar,
        role: userData.role || "Student",
      });
      
      if (newUser?.id) {
        await AsyncStorage.setItem(USER_STORAGE_KEY, newUser.id);
        setUserId(newUser.id);
        setUser(newUser as User);
      }
      
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }, [createUserMutation]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user?.id) return null;
    
    try {
      const updatedUser = await updateUserMutation.mutateAsync({
        id: user.id,
        ...updates,
      });
      
      if (updatedUser) {
        setUser(updatedUser as User);
      }
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }, [user?.id, updateUserMutation]);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      setUserId(null);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }, []);

  return {
    user: user || mockUser,
    isLoading,
    createUser,
    updateUser,
    logout,
    refetch: userQuery.refetch,
  };
});
