/**
 * Hook for Testing Dashboard backend integration
 * 
 * Provides real database operations for:
 * - Creating test users
 * - Creating test disputes
 * - Managing test data
 */

import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

export const useTestingDashboard = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // tRPC mutations using the correct nested property access syntax
  const createTestUserMutation = trpc.testing.createTestUser.useMutation();
  const createTestDisputeMutation = trpc.testing.createTestDispute.useMutation();
  const getTestUsersMutation = trpc.testing.getTestUsers.useQuery();
  const deleteTestUserMutation = trpc.testing.deleteTestUser.useMutation();
  const linkEquifaxMutation = trpc.testing.linkEquifaxMockData.useMutation();

  const createTestUser = useCallback(async (data: {
    name: string;
    email: string;
    role?: 'Student' | 'CSO' | 'Affiliate' | 'Admin';
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await createTestUserMutation.mutateAsync({
        name: data.name,
        email: data.email,
        role: data.role || 'Student',
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [createTestUserMutation]);

  const createTestDispute = useCallback(async (data: {
    userId: string;
    creditor: string;
    creditorAddress?: string;
    accountNumber: string;
    balance?: number;
    accountType: 'charge-off' | 'collection' | 'late-payment' | 'delinquent';
    status: string;
    bureau: 'Equifax' | 'Experian' | 'TransUnion';
    letterContent?: string;
    notes?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await createTestDisputeMutation.mutateAsync(data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [createTestDisputeMutation]);

  const getTestUsers = useCallback(() => {
    return getTestUsersMutation.data || [];
  }, [getTestUsersMutation.data]);

  const deleteTestUser = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await deleteTestUserMutation.mutateAsync({ userId });
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [deleteTestUserMutation]);

  const linkEquifaxMockData = useCallback(async (data: {
    userId: string;
    bureau: 'Equifax' | 'Experian' | 'TransUnion';
    accounts: Array<{
      creditorName: string;
      creditorAddress: string;
      accountNumber: string;
      accountType: 'charge-off' | 'collection' | 'late-payment' | 'delinquent';
      status: string;
      balance: number;
      dateReported: string;
    }>;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await linkEquifaxMutation.mutateAsync(data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [linkEquifaxMutation]);

  return {
    isLoading,
    error,
    createTestUser,
    createTestDispute,
    getTestUsers,
    deleteTestUser,
    linkEquifaxMockData,
  };
};
