import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface OptimisticMutationOptions<TData, TVariables, TContext = unknown> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: string[];
  optimisticUpdate: (currentData: TData | undefined, variables: TVariables) => TData;
  rollback?: (context: TContext, error: Error) => void;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables, context: TContext | undefined) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
  retryCount?: number;
  retryDelay?: number;
}

interface OptimisticMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isLoading: boolean;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  data: TData | undefined;
  reset: () => void;
  pendingCount: number;
}

export function useOptimisticMutation<TData, TVariables, TContext = { previousData: TData | undefined }>(
  options: OptimisticMutationOptions<TData, TVariables, TContext>
): OptimisticMutationResult<TData, TVariables> {
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const pendingOperations = useRef<Map<string, { variables: TVariables; timestamp: number }>>(new Map());

  const mutation = useMutation({
    mutationFn: options.mutationFn,
    onMutate: async (variables: TVariables) => {
      const operationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      pendingOperations.current.set(operationId, { variables, timestamp: Date.now() });
      setPendingCount(prev => prev + 1);

      await queryClient.cancelQueries({ queryKey: options.queryKey });

      const previousData = queryClient.getQueryData<TData>(options.queryKey);

      const optimisticData = options.optimisticUpdate(previousData, variables);
      queryClient.setQueryData<TData>(options.queryKey, optimisticData);

      console.log('[useOptimisticMutation] Applied optimistic update:', operationId);

      return { previousData, operationId } as TContext;
    },
    onError: (error: Error, variables: TVariables, context: TContext | undefined) => {
      console.log('[useOptimisticMutation] Error, rolling back:', error.message);

      if (context && (context as any).previousData !== undefined) {
        queryClient.setQueryData<TData>(options.queryKey, (context as any).previousData);
      }

      if (options.rollback && context) {
        options.rollback(context, error);
      }

      if (options.onError) {
        options.onError(error, variables, context);
      }
    },
    onSuccess: (data: TData, variables: TVariables, context: TContext | undefined) => {
      console.log('[useOptimisticMutation] Success, confirming update');

      queryClient.setQueryData<TData>(options.queryKey, data);

      if (options.onSuccess) {
        options.onSuccess(data, variables);
      }
    },
    onSettled: (data: TData | undefined, error: Error | null, variables: TVariables, context: TContext | undefined) => {
      if (context && (context as any).operationId) {
        pendingOperations.current.delete((context as any).operationId);
      }
      setPendingCount(prev => Math.max(0, prev - 1));

      queryClient.invalidateQueries({ queryKey: options.queryKey });

      if (options.onSettled) {
        options.onSettled(data, error, variables);
      }
    },
    retry: options.retryCount ?? 2,
    retryDelay: options.retryDelay ?? 1000,
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isPending: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
    pendingCount,
  };
}

interface BatchOptimisticMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables[]) => Promise<TData[]>;
  queryKey: string[];
  optimisticUpdate: (currentData: TData[] | undefined, variables: TVariables[]) => TData[];
  batchSize?: number;
  batchDelay?: number;
}

export function useBatchOptimisticMutation<TData, TVariables>(
  options: BatchOptimisticMutationOptions<TData, TVariables>
) {
  const queryClient = useQueryClient();
  const [pendingBatch, setPendingBatch] = useState<TVariables[]>([]);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const batchSize = options.batchSize ?? 10;
  const batchDelay = options.batchDelay ?? 100;

  const flushBatch = useCallback(async () => {
    if (pendingBatch.length === 0) return;

    const batch = [...pendingBatch];
    setPendingBatch([]);

    const previousData = queryClient.getQueryData<TData[]>(options.queryKey);

    try {
      const optimisticData = options.optimisticUpdate(previousData, batch);
      queryClient.setQueryData<TData[]>(options.queryKey, optimisticData);

      const results = await options.mutationFn(batch);
      queryClient.setQueryData<TData[]>(options.queryKey, results);

      console.log('[useBatchOptimisticMutation] Batch completed:', batch.length, 'items');
    } catch (error) {
      console.error('[useBatchOptimisticMutation] Batch failed, rolling back:', error);
      queryClient.setQueryData<TData[]>(options.queryKey, previousData);
      throw error;
    }
  }, [pendingBatch, queryClient, options]);

  const addToBatch = useCallback((variables: TVariables) => {
    setPendingBatch(prev => {
      const newBatch = [...prev, variables];

      if (newBatch.length >= batchSize) {
        if (batchTimerRef.current) {
          clearTimeout(batchTimerRef.current);
          batchTimerRef.current = null;
        }
        setTimeout(flushBatch, 0);
      } else if (!batchTimerRef.current) {
        batchTimerRef.current = setTimeout(() => {
          batchTimerRef.current = null;
          flushBatch();
        }, batchDelay) as unknown as NodeJS.Timeout;
      }

      return newBatch;
    });
  }, [batchSize, batchDelay, flushBatch]);

  return {
    addToBatch,
    flushBatch,
    pendingCount: pendingBatch.length,
  };
}

interface ConflictResolutionOptions<TData> {
  onConflict: (serverData: TData, clientData: TData) => Promise<TData>;
  mergeStrategy?: 'client-wins' | 'server-wins' | 'manual';
}

export function useConflictResolution<TData>(
  queryKey: string[],
  options: ConflictResolutionOptions<TData>
) {
  const queryClient = useQueryClient();
  const [conflicts, setConflicts] = useState<{ id: string; serverData: TData; clientData: TData }[]>([]);

  const detectConflict = useCallback((serverData: TData, clientData: TData): boolean => {
    return JSON.stringify(serverData) !== JSON.stringify(clientData);
  }, []);

  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution: 'client' | 'server' | 'merge'
  ) => {
    const conflict = conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    let resolvedData: TData;

    switch (resolution) {
      case 'client':
        resolvedData = conflict.clientData;
        break;
      case 'server':
        resolvedData = conflict.serverData;
        break;
      case 'merge':
        resolvedData = await options.onConflict(conflict.serverData, conflict.clientData);
        break;
      default:
        resolvedData = conflict.serverData;
    }

    queryClient.setQueryData<TData>(queryKey, resolvedData);
    setConflicts(prev => prev.filter(c => c.id !== conflictId));

    console.log('[useConflictResolution] Resolved conflict:', conflictId, 'with:', resolution);
  }, [conflicts, queryClient, queryKey, options]);

  const addConflict = useCallback((serverData: TData, clientData: TData) => {
    const id = `conflict_${Date.now()}`;
    setConflicts(prev => [...prev, { id, serverData, clientData }]);
    return id;
  }, []);

  return {
    conflicts,
    detectConflict,
    resolveConflict,
    addConflict,
    hasConflicts: conflicts.length > 0,
  };
}

export function useOfflineQueue<TVariables>(
  key: string,
  onFlush: (operations: TVariables[]) => Promise<void>
) {
  const [queue, setQueue] = useState<TVariables[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  const enqueue = useCallback((operation: TVariables) => {
    setQueue(prev => [...prev, operation]);
    console.log('[useOfflineQueue] Enqueued operation, queue size:', queue.length + 1);
  }, [queue.length]);

  const flush = useCallback(async () => {
    if (queue.length === 0 || !isOnline) return;

    const operations = [...queue];
    setQueue([]);

    try {
      await onFlush(operations);
      console.log('[useOfflineQueue] Flushed', operations.length, 'operations');
    } catch (error) {
      console.error('[useOfflineQueue] Flush failed, re-queueing:', error);
      setQueue(prev => [...operations, ...prev]);
      throw error;
    }
  }, [queue, isOnline, onFlush]);

  const setOnlineStatus = useCallback((online: boolean) => {
    setIsOnline(online);
    if (online && queue.length > 0) {
      flush();
    }
  }, [queue.length, flush]);

  return {
    enqueue,
    flush,
    setOnlineStatus,
    queueSize: queue.length,
    isOnline,
  };
}
