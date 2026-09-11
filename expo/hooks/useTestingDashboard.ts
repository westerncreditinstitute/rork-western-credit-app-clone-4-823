/**
 * Hook for Testing Dashboard backend integration
 * 
 * Provides real database operations for:
 * - Creating test users
 * - Creating test disputes
 * - Managing test data
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

export const useTestingDashboard = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create test user mutation
  const createTestUserMutation = trpc.useMutation('testing.createTestUser');
  const createTestDisputeMutation = trpc.useMutation('testing.createTestDispute');
  const getTestUsersMutation = trpc.useMutation('testing.getTestUsers');
  const deleteTestUserMutation = trpc.useMutation('testing.deleteTestUser');

  const createTestUser = async (data: {
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
  };

  const createTestDispute = async (data: {
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
  };

  const deleteTestUser = async (userId: string) => {
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
  };

  return {
    isLoading,
    error,
    createTestUser,
    createTestDispute,
    deleteTestUser,
  };
};
