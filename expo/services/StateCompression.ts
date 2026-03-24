import { ActivityLogEntry, ScoreHistoryEntry, TokenTransaction, GameState } from '@/types/game';

const ACTIVITY_LOG_LIMIT = 100;
const SCORE_HISTORY_LIMIT = 50;
const TRANSACTIONS_LIMIT = 200;

export function compressActivityLog(log: ActivityLogEntry[]): ActivityLogEntry[] {
  if (log.length <= ACTIVITY_LOG_LIMIT) return log;
  return log.slice(-ACTIVITY_LOG_LIMIT);
}

export function compressScoreHistory(history: ScoreHistoryEntry[]): ScoreHistoryEntry[] {
  if (history.length <= SCORE_HISTORY_LIMIT) return history;
  return history.slice(-SCORE_HISTORY_LIMIT);
}

export function compressTransactions(transactions: TokenTransaction[]): TokenTransaction[] {
  if (transactions.length <= TRANSACTIONS_LIMIT) return transactions;
  return transactions.slice(0, TRANSACTIONS_LIMIT);
}

export function compressGameState(state: GameState): GameState {
  return {
    ...state,
    activityLog: compressActivityLog(state.activityLog),
    scoreHistory: compressScoreHistory(state.scoreHistory),
    tokenWallet: {
      ...state.tokenWallet,
      transactions: compressTransactions(state.tokenWallet.transactions),
    },
  };
}

export function getCompressionStats(state: GameState): {
  activityLogSize: number;
  scoreHistorySize: number;
  transactionsSize: number;
  wouldCompress: boolean;
} {
  const activityLogSize = state.activityLog.length;
  const scoreHistorySize = state.scoreHistory.length;
  const transactionsSize = state.tokenWallet.transactions.length;
  
  return {
    activityLogSize,
    scoreHistorySize,
    transactionsSize,
    wouldCompress: 
      activityLogSize > ACTIVITY_LOG_LIMIT ||
      scoreHistorySize > SCORE_HISTORY_LIMIT ||
      transactionsSize > TRANSACTIONS_LIMIT,
  };
}

export const COMPRESSION_LIMITS = {
  ACTIVITY_LOG: ACTIVITY_LOG_LIMIT,
  SCORE_HISTORY: SCORE_HISTORY_LIMIT,
  TRANSACTIONS: TRANSACTIONS_LIMIT,
} as const;
