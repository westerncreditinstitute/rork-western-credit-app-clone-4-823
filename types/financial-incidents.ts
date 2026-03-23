/**
 * Financial Incidents System Types
 * Defines all types for random financial incidents in the life simulation game
 */

export enum IncidentCategory {
  HEALTH = 'health',
  AUTO = 'auto',
  PROPERTY = 'property',
  HOME = 'home',
  LEGAL = 'legal',
  TECHNOLOGY = 'technology',
  NATURAL_DISASTER = 'natural_disaster',
  PET = 'pet',
  FINANCIAL = 'financial',
  EMPLOYMENT = 'employment',
}

export enum IncidentSeverity {
  MINOR = 'minor',      // $50-500
  MODERATE = 'moderate', // $500-2,000
  MAJOR = 'major',       // $2,000-10,000+
}

export enum MitigationType {
  INSURANCE = 'insurance',           // Insurance policy
  WARRANTY = 'warranty',             // Product warranty
  PREVENTIVE_MEASURE = 'preventive', // Preventive action
  EMERGENCY_FUND = 'emergency_fund', // Emergency savings
  NONE = 'none',                     // No mitigation available
}

export interface IncidentCostRange {
  min: number;
  max: number;
}

export interface MitigationOption {
  id: string;
  type: MitigationType;
  name: string;
  description: string;
  monthlyCost?: number;              // For insurance/warranty subscriptions
  upfrontCost?: number;              // One-time cost for preventive measures
  coveragePercentage?: number;       // Percentage of cost covered (0-100)
  fixedCost?: number;                // Fixed cost if covered (e.g., deductible)
  isAvailable: boolean;              // Whether player has this mitigation
}

export interface Incident {
  id: string;
  name: string;
  description: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  baseCost: number;                  // Randomized within cost range
  costRange: IncidentCostRange;
  probabilityWeight: number;         // Weight for random selection (1-100)
  frequency: 'rare' | 'occasional' | 'common' | 'frequent';
  isPreventable: boolean;            // Can be prevented entirely
  mitigationOptions: MitigationOption[];
  educationalMessage: string;        // Lesson for player
  occurrenceConditions?: {
    minCreditScore?: number;         // Only occurs if credit score below this
    maxCreditScore?: number;         // Only occurs if credit score above this
    hasInsurance?: boolean;          // Only occurs without insurance
    hasProperty?: boolean;           // Only occurs if player owns property
    hasVehicle?: boolean;            // Only occurs if player has a car
    hasPet?: boolean;                // Only occurs if player has a pet
    employmentStatus?: 'employed' | 'unemployed' | 'self_employed';
  };
}

export interface IncidentOccurrence {
  id: string;
  playerId: string;
  incidentId: string;
  incidentName: string;
  description: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  
  // Cost details
  baseCost: number;
  mitigationApplied?: MitigationOption;
  actualCost: number;
  savingsFromMitigation: number;
  
  // Timing
  occurredAt: Date;
  monthNumber: number;               // Game month when it occurred
  
  // Educational info
  educationalMessage: string;
  
  // Impact on game state
  creditScoreImpact?: number;        // Impact on credit score (can be negative)
  healthImpact?: number;             // Impact on health (if applicable)
}

export interface PlayerMitigationProfile {
  playerId: string;
  
  // Insurance policies
  healthInsurance: {
    hasInsurance: boolean;
    monthlyPremium: number;
    deductible: number;
    coveragePercentage: number;
  };
  autoInsurance: {
    hasInsurance: boolean;
    monthlyPremium: number;
    deductible: number;
    coverageType: 'liability' | 'full_coverage' | 'comprehensive';
  };
  rentersInsurance: {
    hasInsurance: boolean;
    monthlyPremium: number;
    deductible: number;
    coverageLimit: number;
  };
  homeownersInsurance: {
    hasInsurance: boolean;
    monthlyPremium: number;
    deductible: number;
    coverageLimit: number;
  };
  
  // Warranties
  homeWarranty: {
    hasWarranty: boolean;
    monthlyCost: number;
    coverageDetails: string[];
  };
  extendedWarranty: {
    hasWarranty: boolean;
    monthlyCost: number;
    coveredItems: string[];
  };
  electronicWarranty: {
    hasWarranty: boolean;
    monthlyCost: number;
    coveredItems: string[];
  };
  
  // Preventive measures
  preventiveMeasures: {
    cybersecuritySoftware: boolean;
    homeSecuritySystem: boolean;
    fireExtinguishers: boolean;
    smokeDetectors: boolean;
    carbonMonoxideDetectors: boolean;
    regularMaintenanceSchedule: boolean;
  };
  
  // Emergency fund
  emergencyFund: {
    balance: number;
    targetAmount: number;
    monthlyContribution: number;
  };
}

export interface IncidentGenerationConfig {
  enabled: boolean;
  baseProbability: number;           // Base probability per game month (0-1)
  severityWeights: {
    minor: number;                   // Weight for minor incidents
    moderate: number;                // Weight for moderate incidents
    major: number;                   // Weight for major incidents
  };
  categoryWeights: {
    [key in IncidentCategory]?: number;
  };
  maxIncidentsPerMonth: number;      // Maximum incidents per month
  minTimeBetweenIncidents: number;   // Minimum months between incidents
  playerRiskMultiplier: number;      // Multiplier based on player's risk profile
}

export interface IncidentStatistics {
  playerId: string;
  
  // Totals
  totalIncidents: number;
  totalCostIncurred: number;
  totalSavingsFromMitigation: number;
  
  // By category
  incidentsByCategory: {
    [key in IncidentCategory]?: {
      count: number;
      totalCost: number;
      totalSavings: number;
    };
  };
  
  // By severity
  incidentsBySeverity: {
    [key in IncidentSeverity]?: {
      count: number;
      totalCost: number;
      totalSavings: number;
    };
  };
  
  // Mitigation effectiveness
  mitigationEffectiveness: {
    totalMitigationCost: number;     // Total spent on insurance/warranties
    totalSavings: number;            // Total saved from having mitigations
    roi: number;                     // Return on investment percentage
    effectiveMitigations: string[];  // Which mitigations provided most value
  };
  
  // Recent history
  recentIncidents: IncidentOccurrence[];
}

export interface IncidentFilterOptions {
  categories?: IncidentCategory[];
  severities?: IncidentSeverity[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  minCost?: number;
  maxCost?: number;
  hasMitigation?: boolean;
}

// Helper types for incident generation
export interface WeightedIncident {
  incident: Incident;
  weight: number;
}

export interface IncidentGenerationResult {
  incidents: Incident[];
  totalCost: number;
  totalSavings: number;
  generationTime: Date;
}

// Educational content types
export interface FinancialLesson {
  id: string;
  relatedIncidents: string[];       // IDs of incidents that trigger this lesson
  title: string;
  description: string;
  keyPoints: string[];
  recommendedActions: string[];
  resources: {
    title: string;
    url: string;
  }[];
}