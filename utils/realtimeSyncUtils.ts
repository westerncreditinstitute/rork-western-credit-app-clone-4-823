export interface OptimisticUpdate<T> {
  id: string;
  data: T;
  previousData: T | null;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed' | 'reverted';
  retryCount: number;
  maxRetries: number;
}

export interface ConflictInfo<T> {
  localData: T;
  serverData: T;
  localTimestamp: number;
  serverTimestamp: number;
  conflictType: 'concurrent_edit' | 'stale_update' | 'version_mismatch';
}

export type ConflictResolutionStrategy = 
  | 'last_write_wins'
  | 'first_write_wins'
  | 'server_wins'
  | 'client_wins'
  | 'merge';

export interface MergeResult<T> {
  merged: T;
  conflicts: string[];
  resolution: 'auto' | 'manual';
}

export class OptimisticUpdateManager<T extends { id: string }> {
  private updates: Map<string, OptimisticUpdate<T>> = new Map();
  private confirmedVersions: Map<string, number> = new Map();
  private listeners: ((updates: Map<string, OptimisticUpdate<T>>) => void)[] = [];

  constructor(private maxRetries: number = 3) {}

  addUpdate(data: T, previousData: T | null = null): OptimisticUpdate<T> {
    const update: OptimisticUpdate<T> = {
      id: data.id,
      data,
      previousData,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      maxRetries: this.maxRetries,
    };

    this.updates.set(data.id, update);
    this.notifyListeners();
    console.log('[OptimisticUpdateManager] Added update:', data.id);

    return update;
  }

  confirmUpdate(id: string, version?: number): boolean {
    const update = this.updates.get(id);
    if (!update) return false;

    update.status = 'confirmed';
    
    if (version !== undefined) {
      this.confirmedVersions.set(id, version);
    }

    setTimeout(() => {
      this.updates.delete(id);
      this.notifyListeners();
    }, 1000);

    console.log('[OptimisticUpdateManager] Confirmed update:', id);
    this.notifyListeners();
    return true;
  }

  revertUpdate(id: string): T | null {
    const update = this.updates.get(id);
    if (!update) return null;

    update.status = 'reverted';
    const previousData = update.previousData;

    setTimeout(() => {
      this.updates.delete(id);
      this.notifyListeners();
    }, 500);

    console.log('[OptimisticUpdateManager] Reverted update:', id);
    this.notifyListeners();
    return previousData;
  }

  markFailed(id: string): boolean {
    const update = this.updates.get(id);
    if (!update) return false;

    update.retryCount++;
    
    if (update.retryCount >= update.maxRetries) {
      update.status = 'failed';
      console.log('[OptimisticUpdateManager] Update failed after max retries:', id);
    }

    this.notifyListeners();
    return update.status === 'failed';
  }

  getUpdate(id: string): OptimisticUpdate<T> | undefined {
    return this.updates.get(id);
  }

  getPendingUpdates(): OptimisticUpdate<T>[] {
    return Array.from(this.updates.values()).filter(u => u.status === 'pending');
  }

  getFailedUpdates(): OptimisticUpdate<T>[] {
    return Array.from(this.updates.values()).filter(u => u.status === 'failed');
  }

  hasPendingUpdate(id: string): boolean {
    const update = this.updates.get(id);
    return update?.status === 'pending';
  }

  getConfirmedVersion(id: string): number | undefined {
    return this.confirmedVersions.get(id);
  }

  clearAll(): void {
    this.updates.clear();
    this.confirmedVersions.clear();
    this.notifyListeners();
  }

  subscribe(listener: (updates: Map<string, OptimisticUpdate<T>>) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.updates));
  }
}

export function resolveConflict<T>(
  conflict: ConflictInfo<T>,
  strategy: ConflictResolutionStrategy,
  customMerge?: (local: T, server: T) => MergeResult<T>
): { resolved: T; strategy: ConflictResolutionStrategy } {
  console.log('[ConflictResolver] Resolving conflict with strategy:', strategy);

  switch (strategy) {
    case 'last_write_wins':
      return {
        resolved: conflict.localTimestamp > conflict.serverTimestamp 
          ? conflict.localData 
          : conflict.serverData,
        strategy,
      };

    case 'first_write_wins':
      return {
        resolved: conflict.localTimestamp < conflict.serverTimestamp 
          ? conflict.localData 
          : conflict.serverData,
        strategy,
      };

    case 'server_wins':
      return {
        resolved: conflict.serverData,
        strategy,
      };

    case 'client_wins':
      return {
        resolved: conflict.localData,
        strategy,
      };

    case 'merge':
      if (customMerge) {
        const result = customMerge(conflict.localData, conflict.serverData);
        return {
          resolved: result.merged,
          strategy,
        };
      }
      return {
        resolved: conflict.serverData,
        strategy: 'server_wins',
      };

    default:
      return {
        resolved: conflict.serverData,
        strategy: 'server_wins',
      };
  }
}

export function createDebouncer<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): { 
  call: (...args: Parameters<T>) => void;
  cancel: () => void;
  flush: () => void;
} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const call = (...args: Parameters<T>) => {
    lastArgs = args;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (lastArgs) {
        fn(...lastArgs);
        lastArgs = null;
      }
      timeoutId = null;
    }, delay);
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };

  const flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
    }
  };

  return { call, cancel, flush };
}

export function createThrottler<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): {
  call: (...args: Parameters<T>) => void;
  reset: () => void;
} {
  let lastCall = 0;
  let pendingArgs: Parameters<T> | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const call = (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= limit) {
      lastCall = now;
      fn(...args);
    } else {
      pendingArgs = args;
      
      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          if (pendingArgs) {
            lastCall = Date.now();
            fn(...pendingArgs);
            pendingArgs = null;
          }
          timeoutId = null;
        }, limit - timeSinceLastCall);
      }
    }
  };

  const reset = () => {
    lastCall = 0;
    pendingArgs = null;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return { call, reset };
}

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export function interpolatePosition(
  from: Position3D,
  to: Position3D,
  progress: number
): Position3D {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  return {
    x: from.x + (to.x - from.x) * clampedProgress,
    y: from.y + (to.y - from.y) * clampedProgress,
    z: from.z + (to.z - from.z) * clampedProgress,
  };
}

export function calculateDistance(a: Position3D, b: Position3D): number {
  return Math.sqrt(
    Math.pow(b.x - a.x, 2) +
    Math.pow(b.y - a.y, 2) +
    Math.pow(b.z - a.z, 2)
  );
}

export function shouldInterpolate(
  from: Position3D,
  to: Position3D,
  threshold: number = 0.1
): boolean {
  return calculateDistance(from, to) > threshold;
}

export class PositionInterpolator {
  private currentPosition: Position3D;
  private targetPosition: Position3D;
  private interpolationProgress: number = 1;
  private interpolationSpeed: number;
  private animationFrameId: number | null = null;
  private onUpdate: (position: Position3D) => void;

  constructor(
    initialPosition: Position3D,
    onUpdate: (position: Position3D) => void,
    speed: number = 0.15
  ) {
    this.currentPosition = { ...initialPosition };
    this.targetPosition = { ...initialPosition };
    this.onUpdate = onUpdate;
    this.interpolationSpeed = speed;
  }

  setTarget(position: Position3D): void {
    this.targetPosition = { ...position };
    this.interpolationProgress = 0;
    this.startAnimation();
  }

  private startAnimation(): void {
    if (this.animationFrameId !== null) return;

    const animate = () => {
      if (this.interpolationProgress < 1) {
        this.interpolationProgress = Math.min(1, this.interpolationProgress + this.interpolationSpeed);
        this.currentPosition = interpolatePosition(
          this.currentPosition,
          this.targetPosition,
          this.interpolationSpeed
        );
        this.onUpdate(this.currentPosition);
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  getCurrentPosition(): Position3D {
    return { ...this.currentPosition };
  }

  snapToTarget(): void {
    this.currentPosition = { ...this.targetPosition };
    this.interpolationProgress = 1;
    this.onUpdate(this.currentPosition);
  }
}

export function generateSyncId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function isStaleUpdate(
  updateTimestamp: number,
  lastKnownTimestamp: number,
  toleranceMs: number = 500
): boolean {
  return updateTimestamp < lastKnownTimestamp - toleranceMs;
}

export function mergeItemPositions<T extends { position: Position3D; updatedAt: number }>(
  local: T,
  server: T
): MergeResult<T> {
  const timeDiff = Math.abs(local.updatedAt - server.updatedAt);
  
  if (timeDiff < 100) {
    const mergedPosition = {
      x: (local.position.x + server.position.x) / 2,
      y: (local.position.y + server.position.y) / 2,
      z: (local.position.z + server.position.z) / 2,
    };
    
    return {
      merged: {
        ...server,
        position: mergedPosition,
        updatedAt: Math.max(local.updatedAt, server.updatedAt),
      },
      conflicts: ['position'],
      resolution: 'auto',
    };
  }

  const winner = local.updatedAt > server.updatedAt ? local : server;
  return {
    merged: winner,
    conflicts: [],
    resolution: 'auto',
  };
}
