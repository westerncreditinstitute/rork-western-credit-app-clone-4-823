/**
 * Financial Incidents Context
 * React Context for managing financial incidents state across the application
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Incident,
  IncidentOccurrence,
  PlayerMitigationProfile,
  IncidentGenerationConfig,
  IncidentStatistics,
  IncidentFilterOptions,
  IncidentCategory,
  IncidentSeverity,
} from '@/types/financial-incidents';
import { financialIncidentsService } from '@/services/FinancialIncidentsService';

interface FinancialIncidentsContextType {
  // State
  incidents: IncidentOccurrence[];
  currentMonth: number;
  statistics: IncidentStatistics | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  generateIncidentsForMonth: (mitigationProfile: PlayerMitigationProfile) => Promise<void>;
  updateConfig: (config: Partial<IncidentGenerationConfig>) => void;
  getIncidentHistory: (filters?: IncidentFilterOptions) => IncidentOccurrence[];
  clearHistory: () => void;
  
  // Mitigation profile
  updateMitigationProfile: (profile: Partial<PlayerMitigationProfile>) => void;
  mitigationProfile: PlayerMitigationProfile;
}

const FinancialIncidentsContext = createContext<FinancialIncidentsContextType | undefined>(
  undefined
);

// Default mitigation profile
const defaultMitigationProfile: PlayerMitigationProfile = {
  playerId: 'default',
  
  healthInsurance: {
    hasInsurance: false,
    monthlyPremium: 0,
    deductible: 0,
    coveragePercentage: 0,
  },
  autoInsurance: {
    hasInsurance: false,
    monthlyPremium: 0,
    deductible: 0,
    coverageType: 'liability',
  },
  rentersInsurance: {
    hasInsurance: false,
    monthlyPremium: 0,
    deductible: 0,
    coverageLimit: 0,
  },
  homeownersInsurance: {
    hasInsurance: false,
    monthlyPremium: 0,
    deductible: 0,
    coverageLimit: 0,
  },
  
  homeWarranty: {
    hasWarranty: false,
    monthlyCost: 0,
    coverageDetails: [],
  },
  extendedWarranty: {
    hasWarranty: false,
    monthlyCost: 0,
    coveredItems: [],
  },
  electronicWarranty: {
    hasWarranty: false,
    monthlyCost: 0,
    coveredItems: [],
  },
  
  preventiveMeasures: {
    cybersecuritySoftware: false,
    homeSecuritySystem: false,
    fireExtinguishers: false,
    smokeDetectors: false,
    carbonMonoxideDetectors: false,
    regularMaintenanceSchedule: false,
  },
  
  emergencyFund: {
    balance: 0,
    targetAmount: 0,
    monthlyContribution: 0,
  },
};

interface FinancialIncidentsProviderProps {
  children: React.ReactNode;
  playerId?: string;
}

export const FinancialIncidentsProvider: React.FC<FinancialIncidentsProviderProps> = ({
  children,
  playerId = 'default',
}) => {
  const [incidents, setIncidents] = useState<IncidentOccurrence[]>([]);
  const [currentMonth, setCurrentMonth] = useState(1);
  const [statistics, setStatistics] = useState<IncidentStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mitigationProfile, setMitigationProfile] = useState<PlayerMitigationProfile>({
    ...defaultMitigationProfile,
    playerId,
  });

  // Load incidents from storage on mount
  useEffect(() => {
    loadIncidentsFromStorage();
  }, [playerId]);

  // Update statistics when incidents change
  useEffect(() => {
    if (incidents.length > 0) {
      const stats = financialIncidentsService.getPlayerStatistics(playerId);
      setStatistics(stats);
    }
  }, [incidents, playerId]);

  // Save incidents to storage when they change
  useEffect(() => {
    if (incidents.length > 0) {
      saveIncidentsToStorage();
    }
  }, [incidents]);

  // Load incidents from AsyncStorage
  const loadIncidentsFromStorage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(`financial-incidents-${playerId}`);
      if (stored) {
        const parsedIncidents: IncidentOccurrence[] = JSON.parse(stored);
        setIncidents(parsedIncidents);
        
        // Update service history
        financialIncidentsService.clearIncidentHistory(playerId);
        parsedIncidents.forEach(occurrence => {
          // Add occurrences to service history
        });
      }
    } catch (err) {
      console.error('Failed to load incidents from storage:', err);
      setError('Failed to load incident history');
    }
  }, [playerId]);

  // Save incidents to AsyncStorage
  const saveIncidentsToStorage = useCallback(async () => {
    try {
      await AsyncStorage.setItem(`financial-incidents-${playerId}`, JSON.stringify(incidents));
    } catch (err) {
      console.error('Failed to save incidents to storage:', err);
    }
  }, [incidents, playerId]);

  // Generate incidents for current month
  const generateIncidentsForMonth = useCallback(async (
    mitigationProfile: PlayerMitigationProfile
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await financialIncidentsService.generateIncidents(
        playerId,
        currentMonth,
        mitigationProfile
      );

      if (result.incidents.length > 0) {
        // Get occurrences from service
        const history = financialIncidentsService.getIncidentHistory(playerId);
        
        setIncidents(prev => [...prev, ...history]);
        
        // Advance month if incidents occurred
        setCurrentMonth(prev => prev + 1);
      } else {
        // No incidents this month, still advance
        setCurrentMonth(prev => prev + 1);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate incidents';
      setError(errorMessage);
      console.error('Failed to generate incidents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [playerId, currentMonth]);

  // Update incident generation configuration
  const updateConfig = useCallback((config: Partial<IncidentGenerationConfig>) => {
    financialIncidentsService.updateConfig(config);
  }, []);

  // Get incident history with optional filters
  const getIncidentHistory = useCallback((filters?: IncidentFilterOptions) => {
    return financialIncidentsService.getIncidentHistory(playerId, filters);
  }, [playerId]);

  // Clear incident history
  const clearHistory = useCallback(async () => {
    setIncidents([]);
    financialIncidentsService.clearIncidentHistory(playerId);
    await AsyncStorage.removeItem(`financial-incidents-${playerId}`);
    setCurrentMonth(1);
    setStatistics(null);
  }, [playerId]);

  // Update mitigation profile
  const updateMitigationProfile = useCallback((
    updates: Partial<PlayerMitigationProfile>
  ) => {
    setMitigationProfile(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const value: FinancialIncidentsContextType = {
    // State
    incidents,
    currentMonth,
    statistics,
    isLoading,
    error,

    // Actions
    generateIncidentsForMonth,
    updateConfig,
    getIncidentHistory,
    clearHistory,

    // Mitigation profile
    updateMitigationProfile,
    mitigationProfile,
  };

  return (
    <FinancialIncidentsContext.Provider value={value}>
      {children}
    </FinancialIncidentsContext.Provider>
  );
};

// Custom hook to use the context
export const useFinancialIncidents = (): FinancialIncidentsContextType => {
  const context = useContext(FinancialIncidentsContext);
  
  if (context === undefined) {
    throw new Error('useFinancialIncidents must be used within a FinancialIncidentsProvider');
  }

  return context;
};

// Helper hooks for specific use cases
export const useIncidentStats = () => {
  const { statistics } = useFinancialIncidents();
  return statistics;
};

export const useRecentIncidents = (count: number = 5) => {
  const { incidents } = useFinancialIncidents();
  return incidents.slice(-count).reverse();
};

export const useIncidentsByCategory = (category: IncidentCategory) => {
  const { incidents } = useFinancialIncidents();
  return incidents.filter(inc => inc.category === category);
};

export const useIncidentsBySeverity = (severity: IncidentSeverity) => {
  const { incidents } = useFinancialIncidents();
  return incidents.filter(inc => inc.severity === severity);
};