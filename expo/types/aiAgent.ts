export type AgentTaskType =
  | 'pay_bills'
  | 'work_job'
  | 'attend_school'
  | 'invest'
  | 'save_money'
  | 'apply_credit'
  | 'grocery_shopping'
  | 'pay_debt'
  | 'build_emergency_fund'
  | 'job_search'
  | 'buy_property'
  | 'manage_budget';

export type AgentPersonality = 'conservative' | 'balanced' | 'aggressive' | 'custom';

export type AgentPriority = 'credit_score' | 'savings' | 'career' | 'education' | 'wealth';

export type TaskStatus = 'idle' | 'running' | 'completed' | 'failed' | 'paused';

export type SimulationSpeed = 'slow' | 'normal' | 'fast' | 'turbo';

export interface AgentTask {
  id: string;
  type: AgentTaskType;
  label: string;
  description: string;
  enabled: boolean;
  priority: number;
  icon: string;
  color: string;
  estimatedImpact: {
    creditScore?: number;
    bankBalance?: number;
    netWorth?: number;
  };
}

export interface AgentConfig {
  id: string;
  name: string;
  personality: AgentPersonality;
  primaryGoal: AgentPriority;
  tasks: AgentTask[];
  monthsToSimulate: number;
  speed: SimulationSpeed;
  autoPayBills: boolean;
  autoInvest: boolean;
  riskTolerance: number;
  savingsTarget: number;
  debtPayoffStrategy: 'avalanche' | 'snowball' | 'minimum';
}

export interface SimulationLogEntry {
  id: string;
  month: number;
  year: number;
  timestamp: number;
  action: string;
  detail: string;
  impact: {
    creditScoreChange?: number;
    balanceChange?: number;
    netWorthChange?: number;
  };
  type: 'action' | 'event' | 'milestone' | 'warning' | 'error';
}

export interface SimulationSnapshot {
  month: number;
  year: number;
  creditScore: number;
  bankBalance: number;
  netWorth: number;
  totalDebt: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

export interface SimulationResult {
  startSnapshot: SimulationSnapshot;
  endSnapshot: SimulationSnapshot;
  logs: SimulationLogEntry[];
  snapshots: SimulationSnapshot[];
  monthsSimulated: number;
  achievements: string[];
  summary: string;
}

export interface AIAgentState {
  config: AgentConfig;
  isRunning: boolean;
  isPaused: boolean;
  currentMonth: number;
  totalMonths: number;
  status: TaskStatus;
  result: SimulationResult | null;
  logs: SimulationLogEntry[];
}
