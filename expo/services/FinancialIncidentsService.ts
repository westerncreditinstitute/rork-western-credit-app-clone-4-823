/**
 * Financial Incidents Service
 * Handles generation, processing, and management of financial incidents
 */

import {
  Incident,
  IncidentOccurrence,
  PlayerMitigationProfile,
  IncidentGenerationConfig,
  IncidentStatistics,
  IncidentFilterOptions,
  IncidentCategory,
  IncidentSeverity,
  MitigationType,
  WeightedIncident,
  IncidentGenerationResult,
} from '@/types/financial-incidents';
import { FINANCIAL_INCIDENTS } from '@/data/financial-incidents-data';

export class FinancialIncidentsService {
  private static instance: FinancialIncidentsService;
  private currentConfig: IncidentGenerationConfig;
  private incidentHistory: Map<string, IncidentOccurrence[]> = new Map();

  private constructor() {
    this.currentConfig = this.getDefaultConfig();
  }

  public static getInstance(): FinancialIncidentsService {
    if (!FinancialIncidentsService.instance) {
      FinancialIncidentsService.instance = new FinancialIncidentsService();
    }
    return FinancialIncidentsService.instance;
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  private getDefaultConfig(): IncidentGenerationConfig {
    return {
      enabled: true,
      baseProbability: 0.3, // 30% chance per month
      severityWeights: {
        minor: 0.6,   // 60% weight for minor incidents
        moderate: 0.3, // 30% weight for moderate incidents
        major: 0.1,    // 10% weight for major incidents
      },
      categoryWeights: {
        [IncidentCategory.HEALTH]: 1.2,
        [IncidentCategory.AUTO]: 1.1,
        [IncidentCategory.PROPERTY]: 1.0,
        [IncidentCategory.HOME]: 1.0,
        [IncidentCategory.FINANCIAL]: 1.0,
        [IncidentCategory.TECHNOLOGY]: 0.8,
        [IncidentCategory.LEGAL]: 0.5,
        [IncidentCategory.NATURAL_DISASTER]: 0.3,
        [IncidentCategory.PET]: 0.7,
        [IncidentCategory.EMPLOYMENT]: 0.4,
      },
      maxIncidentsPerMonth: 3,
      minTimeBetweenIncidents: 1, // Minimum 1 month between incidents
      playerRiskMultiplier: 1.0,
    };
  }

  public updateConfig(config: Partial<IncidentGenerationConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...config };
  }

  public getConfig(): IncidentGenerationConfig {
    return { ...this.currentConfig };
  }

  // ============================================
  // INCIDENT GENERATION
  // ============================================

  /**
   * Generate incidents for a player based on their profile and game state
   */
  public async generateIncidents(
    playerId: string,
    monthNumber: number,
    mitigationProfile: PlayerMitigationProfile
  ): Promise<IncidentGenerationResult> {
    if (!this.currentConfig.enabled) {
      return {
        incidents: [],
        totalCost: 0,
        totalSavings: 0,
        generationTime: new Date(),
      };
    }

    // Get player's incident history
    const playerHistory = this.incidentHistory.get(playerId) || [];
    const lastIncident = playerHistory[playerHistory.length - 1];

    // Check minimum time between incidents
    if (lastIncident && (monthNumber - lastIncident.monthNumber) < this.currentConfig.minTimeBetweenIncidents) {
      return {
        incidents: [],
        totalCost: 0,
        totalSavings: 0,
        generationTime: new Date(),
      };
    }

    // Check if incidents should occur this month
    const randomValue = Math.random();
    const adjustedProbability = this.currentConfig.baseProbability * this.currentConfig.playerRiskMultiplier;

    if (randomValue > adjustedProbability) {
      return {
        incidents: [],
        totalCost: 0,
        totalSavings: 0,
        generationTime: new Date(),
      };
    }

    // Determine how many incidents to generate
    const maxIncidents = Math.min(
      Math.floor(randomValue * this.currentConfig.maxIncidentsPerMonth) + 1,
      this.currentConfig.maxIncidentsPerMonth
    );

    const generatedIncidents: Incident[] = [];
    let attempts = 0;
    const maxAttempts = 10;

    // Generate incidents until we reach the target or max attempts
    while (generatedIncidents.length < maxIncidents && attempts < maxAttempts) {
      const incident = this.generateSingleIncident(mitigationProfile);
      if (incident && !generatedIncidents.includes(incident)) {
        generatedIncidents.push(incident);
      }
      attempts++;
    }

    // Calculate costs and savings
    let totalCost = 0;
    let totalSavings = 0;
    const occurrences: IncidentOccurrence[] = [];

    for (const incident of generatedIncidents) {
      const occurrence = this.processIncident(incident, playerId, monthNumber, mitigationProfile);
      occurrences.push(occurrence);
      totalCost += occurrence.actualCost;
      totalSavings += occurrence.savingsFromMitigation;
    }

    // Save to history
    if (!this.incidentHistory.has(playerId)) {
      this.incidentHistory.set(playerId, []);
    }
    this.incidentHistory.get(playerId)!.push(...occurrences);

    return {
      incidents: generatedIncidents,
      totalCost,
      totalSavings,
      generationTime: new Date(),
    };
  }

  /**
   * Generate a single incident based on weights and conditions
   */
  private generateSingleIncident(mitigationProfile: PlayerMitigationProfile): Incident | null {
    // Filter incidents that match occurrence conditions
    const eligibleIncidents = FINANCIAL_INCIDENTS.filter(incident =>
      this.checkIncidentConditions(incident, mitigationProfile)
    );

    if (eligibleIncidents.length === 0) {
      return null;
    }

    // Calculate weights for each incident
    const weightedIncidents = eligibleIncidents.map(incident => {
      let weight = incident.probabilityWeight;

      // Apply severity weight
      const severityWeight = this.getSeverityWeight(incident.severity);
      weight *= severityWeight;

      // Apply category weight
      const categoryWeight = this.getCategoryWeight(incident.category);
      weight *= categoryWeight;

      // Apply player risk multiplier
      weight *= this.currentConfig.playerRiskMultiplier;

      return {
        incident,
        weight,
      };
    });

    // Select incident based on weights
    return this.selectWeightedIncident(weightedIncidents);
  }

  /**
   * Check if incident occurrence conditions are met
   */
  private checkIncidentConditions(
    incident: Incident,
    profile: PlayerMitigationProfile
  ): boolean {
    if (!incident.occurrenceConditions) {
      return true;
    }

    const conditions = incident.occurrenceConditions;

    // Check credit score conditions
    // Note: This would need access to player's actual credit score
    // For now, we'll assume all conditions are met

    // Check property conditions
    if (conditions.hasProperty !== undefined) {
      const hasProperty = profile.homeownersInsurance.hasInsurance || 
                         profile.rentersInsurance.hasInsurance;
      if (conditions.hasProperty !== hasProperty) {
        return false;
      }
    }

    // Check vehicle conditions
    if (conditions.hasVehicle !== undefined) {
      const hasVehicle = profile.autoInsurance.hasInsurance;
      if (conditions.hasVehicle !== hasVehicle) {
        return false;
      }
    }

    // Check pet conditions
    if (conditions.hasPet !== undefined) {
      // This would need access to player's pet ownership
      // For now, we'll assume it's met
    }

    return true;
  }

  /**
   * Get weight for incident severity
   */
  private getSeverityWeight(severity: IncidentSeverity): number {
    switch (severity) {
      case IncidentSeverity.MINOR:
        return this.currentConfig.severityWeights.minor;
      case IncidentSeverity.MODERATE:
        return this.currentConfig.severityWeights.moderate;
      case IncidentSeverity.MAJOR:
        return this.currentConfig.severityWeights.major;
      default:
        return 1.0;
    }
  }

  /**
   * Get weight for incident category
   */
  private getCategoryWeight(category: IncidentCategory): number {
    return this.currentConfig.categoryWeights[category] || 1.0;
  }

  /**
   * Select an incident from weighted list
   */
  private selectWeightedIncident(weightedIncidents: WeightedIncident[]): Incident | null {
    if (weightedIncidents.length === 0) {
      return null;
    }

    const totalWeight = weightedIncidents.reduce((sum, wi) => sum + wi.weight, 0);
    let random = Math.random() * totalWeight;

    for (const weightedIncident of weightedIncidents) {
      random -= weightedIncident.weight;
      if (random <= 0) {
        return weightedIncident.incident;
      }
    }

    return weightedIncidents[weightedIncidents.length - 1].incident;
  }

  // ============================================
  // INCIDENT PROCESSING
  // ============================================

  /**
   * Process an incident and calculate costs with mitigation
   */
  private processIncident(
    incident: Incident,
    playerId: string,
    monthNumber: number,
    mitigationProfile: PlayerMitigationProfile
  ): IncidentOccurrence {
    // Randomize base cost within range
    const randomizedBaseCost = this.randomizeCost(incident.baseCost, incident.costRange);

    // Find available mitigations
    const availableMitigations = this.getAvailableMitigations(incident, mitigationProfile);

    // Select best mitigation
    const bestMitigation = this.selectBestMitigation(availableMitigations, randomizedBaseCost);

    // Calculate actual cost and savings
    const { actualCost, savings } = this.calculateActualCost(
      randomizedBaseCost,
      bestMitigation
    );

    return {
      id: `occurrence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      incidentId: incident.id,
      incidentName: incident.name,
      description: incident.description,
      category: incident.category,
      severity: incident.severity,
      baseCost: randomizedBaseCost,
      mitigationApplied: bestMitigation,
      actualCost,
      savingsFromMitigation: savings,
      occurredAt: new Date(),
      monthNumber,
      educationalMessage: incident.educationalMessage,
    };
  }

  /**
   * Randomize cost within range
   */
  private randomizeCost(baseCost: number, costRange: { min: number; max: number }): number {
    const variance = costRange.max - costRange.min;
    const randomVariance = Math.random() * variance;
    return Math.round(costRange.min + randomVariance);
  }

  /**
   * Get available mitigations for an incident
   */
  private getAvailableMitigations(
    incident: Incident,
    profile: PlayerMitigationProfile
  ): Incident['mitigationOptions'] {
    return incident.mitigationOptions.filter(mitigation => {
      // Check if player has this mitigation
      if (!mitigation.isAvailable) {
        return false;
      }

      // Check specific mitigation types
      switch (mitigation.type) {
        case MitigationType.INSURANCE:
          return this.hasInsurance(mitigation.id, profile);
        case MitigationType.WARRANTY:
          return this.hasWarranty(mitigation.id, profile);
        case MitigationType.PREVENTIVE_MEASURE:
          return this.hasPreventiveMeasure(mitigation.id, profile);
        case MitigationType.EMERGENCY_FUND:
          return this.hasEmergencyFund(mitigation.id, profile);
        default:
          return true;
      }
    });
  }

  /**
   * Check if player has specific insurance
   */
  private hasInsurance(mitigationId: string, profile: PlayerMitigationProfile): boolean {
    // Map mitigation IDs to insurance types
    const insuranceMap: Record<string, keyof PlayerMitigationProfile> = {
      'mit_health_insurance': 'healthInsurance',
      'mit_auto_insurance': 'autoInsurance',
      'mit_homeowners_insurance': 'homeownersInsurance',
      'mit_homeowners_insurance_major': 'homeownersInsurance',
      'mit_comprehensive_insurance': 'homeownersInsurance',
      'mit_renters_insurance': 'rentersInsurance',
      'mit_dental_insurance': 'healthInsurance',
      'mit_pet_insurance': 'healthInsurance',
      'mit_identity_theft_protection': 'healthInsurance',
      'mit_credit_card_protection': 'healthInsurance',
      'mit_legal_insurance': 'healthInsurance',
      'mit_umbrella_policy': 'healthInsurance',
      'mit_disability_insurance': 'healthInsurance',
      'mit_unemployment_insurance': 'healthInsurance',
    };

    const insuranceKey = insuranceMap[mitigationId];
    if (!insuranceKey) return false;

    const insurance = profile[insuranceKey];
    // Type guard to check if it has hasInsurance property
    if (typeof insurance === 'object' && insurance !== null && 'hasInsurance' in insurance) {
      return (insurance as any).hasInsurance;
    }
    return false;
  }

  /**
   * Check if player has specific warranty
   */
  private hasWarranty(mitigationId: string, profile: PlayerMitigationProfile): boolean {
    // Map mitigation IDs to warranty types
    const warrantyMap: Record<string, keyof PlayerMitigationProfile> = {
      'mit_home_warranty': 'homeWarranty',
      'mit_home_warranty_hvac': 'homeWarranty',
      'mit_extended_warranty': 'extendedWarranty',
      'mit_electronic_warranty': 'electronicWarranty',
      'mit_appliance_warranty': 'extendedWarranty',
    };

    const warrantyKey = warrantyMap[mitigationId];
    if (!warrantyKey) return false;

    const warranty = profile[warrantyKey];
    // Type guard to check if it has hasWarranty property
    if (typeof warranty === 'object' && warranty !== null && 'hasWarranty' in warranty) {
      return (warranty as any).hasWarranty;
    }
    return false;
  }

  /**
   * Check if player has specific preventive measure
   */
  private hasPreventiveMeasure(mitigationId: string, profile: PlayerMitigationProfile): boolean {
    // Map mitigation IDs to preventive measures
    const preventiveMap: Record<string, keyof PlayerMitigationProfile['preventiveMeasures']> = {
      'mit_antivirus_software': 'cybersecuritySoftware',
      'mit_cloud_backup': 'cybersecuritySoftware',
      'mit_credit_freeze': 'cybersecuritySoftware',
      'mit_digital_wallet': 'cybersecuritySoftware',
      'mit_parking_app': 'cybersecuritySoftware',
      'mit_regular_checkups': 'cybersecuritySoftware',
      'mit_generic_meds': 'cybersecuritySoftware',
      'mit_preventive_maintenance': 'cybersecuritySoftware',
      'mit_storm_shutters': 'cybersecuritySoftware',
    };

    const measureKey = preventiveMap[mitigationId];
    if (!measureKey) return true; // Assume available if not mapped

    return profile.preventiveMeasures[measureKey] || false;
  }

  /**
   * Check if player has emergency fund
   */
  private hasEmergencyFund(mitigationId: string, profile: PlayerMitigationProfile): boolean {
    return profile.emergencyFund.balance > 0;
  }

  /**
   * Select best mitigation based on cost savings
   */
  private selectBestMitigation(
    availableMitigations: Incident['mitigationOptions'],
    baseCost: number
  ): Incident['mitigationOptions'][0] | undefined {
    if (availableMitigations.length === 0) {
      return undefined;
    }

    if (availableMitigations.length === 1) {
      return availableMitigations[0];
    }

    // Select mitigation with highest savings
    let bestMitigation = availableMitigations[0];
    let maxSavings = this.calculateSavings(baseCost, bestMitigation);

    for (const mitigation of availableMitigations.slice(1)) {
      const savings = this.calculateSavings(baseCost, mitigation);
      if (savings > maxSavings) {
        maxSavings = savings;
        bestMitigation = mitigation;
      }
    }

    return bestMitigation;
  }

  /**
   * Calculate savings from mitigation
   */
  private calculateSavings(baseCost: number, mitigation: Incident['mitigationOptions'][0]): number {
    if (!mitigation) return 0;

    const { coveragePercentage, fixedCost } = mitigation;

    if (coveragePercentage !== undefined) {
      const coveredAmount = (baseCost * coveragePercentage) / 100;
      const actualCost = fixedCost !== undefined ? fixedCost : baseCost - coveredAmount;
      return baseCost - actualCost;
    }

    if (fixedCost !== undefined) {
      return baseCost - fixedCost;
    }

    return 0;
  }

  /**
   * Calculate actual cost after mitigation
   */
  private calculateActualCost(
    baseCost: number,
    mitigation: Incident['mitigationOptions'][0] | undefined
  ): { actualCost: number; savings: number } {
    if (!mitigation) {
      return {
        actualCost: baseCost,
        savings: 0,
      };
    }

    const savings = this.calculateSavings(baseCost, mitigation);
    const actualCost = baseCost - savings;

    return {
      actualCost: Math.max(0, actualCost),
      savings,
    };
  }

  // ============================================
  // STATISTICS AND ANALYTICS
  // ============================================

  /**
   * Get statistics for a player
   */
  public getPlayerStatistics(playerId: string): IncidentStatistics {
    const history = this.incidentHistory.get(playerId) || [];

    const stats: IncidentStatistics = {
      playerId,
      totalIncidents: history.length,
      totalCostIncurred: 0,
      totalSavingsFromMitigation: 0,
      incidentsByCategory: {},
      incidentsBySeverity: {},
      mitigationEffectiveness: {
        totalMitigationCost: 0,
        totalSavings: 0,
        roi: 0,
        effectiveMitigations: [],
      },
      recentIncidents: history.slice(-10), // Last 10 incidents
    };

    // Calculate totals
    for (const occurrence of history) {
      stats.totalCostIncurred += occurrence.actualCost;
      stats.totalSavingsFromMitigation += occurrence.savingsFromMitigation;

      // By category
      if (!stats.incidentsByCategory[occurrence.category]) {
        stats.incidentsByCategory[occurrence.category] = {
          count: 0,
          totalCost: 0,
          totalSavings: 0,
        };
      }
      stats.incidentsByCategory[occurrence.category]!.count++;
      stats.incidentsByCategory[occurrence.category]!.totalCost += occurrence.actualCost;
      stats.incidentsByCategory[occurrence.category]!.totalSavings += occurrence.savingsFromMitigation;

      // By severity
      if (!stats.incidentsBySeverity[occurrence.severity]) {
        stats.incidentsBySeverity[occurrence.severity] = {
          count: 0,
          totalCost: 0,
          totalSavings: 0,
        };
      }
      stats.incidentsBySeverity[occurrence.severity]!.count++;
      stats.incidentsBySeverity[occurrence.severity]!.totalCost += occurrence.actualCost;
      stats.incidentsBySeverity[occurrence.severity]!.totalSavings += occurrence.savingsFromMitigation;
    }

    // Calculate ROI
    if (stats.mitigationEffectiveness.totalMitigationCost > 0) {
      stats.mitigationEffectiveness.roi = 
        ((stats.totalSavingsFromMitigation - stats.mitigationEffectiveness.totalMitigationCost) / 
         stats.mitigationEffectiveness.totalMitigationCost) * 100;
    }

    return stats;
  }

  /**
   * Get incident history for a player
   */
  public getIncidentHistory(
    playerId: string,
    filters?: IncidentFilterOptions
  ): IncidentOccurrence[] {
    let history = this.incidentHistory.get(playerId) || [];

    // Apply filters
    if (filters) {
      if (filters.categories && filters.categories.length > 0) {
        history = history.filter(occ => filters.categories!.includes(occ.category));
      }
      if (filters.severities && filters.severities.length > 0) {
        history = history.filter(occ => filters.severities!.includes(occ.severity));
      }
      if (filters.dateRange) {
        history = history.filter(
          occ => occ.occurredAt >= filters.dateRange!.startDate && 
                  occ.occurredAt <= filters.dateRange!.endDate
        );
      }
      if (filters.minCost !== undefined) {
        history = history.filter(occ => occ.actualCost >= filters.minCost!);
      }
      if (filters.maxCost !== undefined) {
        history = history.filter(occ => occ.actualCost <= filters.maxCost!);
      }
      if (filters.hasMitigation !== undefined) {
        history = history.filter(occ => 
          (occ.mitigationApplied !== undefined) === filters.hasMitigation!
        );
      }
    }

    return history;
  }

  /**
   * Clear incident history for a player
   */
  public clearIncidentHistory(playerId: string): void {
    this.incidentHistory.delete(playerId);
  }

  /**
   * Reset all history (for testing)
   */
  public resetAllHistory(): void {
    this.incidentHistory.clear();
  }
}

// Export singleton instance
export const financialIncidentsService = FinancialIncidentsService.getInstance();