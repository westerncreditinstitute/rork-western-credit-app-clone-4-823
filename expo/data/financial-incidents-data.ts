/**
 * Financial Incidents Data
 * Complete list of all financial incidents in the game
 */

import { Incident, IncidentCategory, IncidentSeverity, MitigationType } from '@/types/financial-incidents';

export const FINANCIAL_INCIDENTS: Incident[] = [
  // ============================================
  // MINOR INCIDENTS ($50-500)
  // ============================================

  {
    id: 'incident_lost_smartphone',
    name: 'Lost Smartphone',
    description: 'You lost your smartphone and need to replace it.',
    category: IncidentCategory.TECHNOLOGY,
    severity: IncidentSeverity.MINOR,
    baseCost: 400,
    costRange: { min: 200, max: 600 },
    probabilityWeight: 70,
    frequency: 'occasional',
    isPreventable: false,
    mitigationOptions: [
      {
        id: 'mit_smartphone_insurance',
        type: MitigationType.INSURANCE,
        name: 'Smartphone Insurance',
        description: 'Insurance coverage for lost, stolen, or damaged phones',
        monthlyCost: 10,
        coveragePercentage: 100,
        fixedCost: 50, // Deductible
        isAvailable: true,
      },
      {
        id: 'mit_cloud_backup',
        type: MitigationType.PREVENTIVE_MEASURE,
        name: 'Cloud Backup + Find My Phone',
        description: 'Remote tracking and data recovery to reduce loss impact',
        monthlyCost: 3,
        coveragePercentage: 0,
        fixedCost: 0,
        isAvailable: true,
      },
    ],
    educationalMessage: 'Having smartphone insurance or backup solutions can prevent expensive replacements. Small monthly premiums can save hundreds in unexpected costs.',
  },

  {
    id: 'incident_parking_ticket',
    name: 'Parking Ticket',
    description: 'You received a parking ticket for overstaying in a timed zone.',
    category: IncidentCategory.FINANCIAL,
    severity: IncidentSeverity.MINOR,
    baseCost: 75,
    costRange: { min: 25, max: 150 },
    probabilityWeight: 85,
    frequency: 'common',
    isPreventable: true,
    mitigationOptions: [
      {
        id: 'mit_parking_app',
        type: MitigationType.PREVENTIVE_MEASURE,
        name: 'Parking App Subscription',
        description: 'Reminders and payment automation to avoid tickets',
        monthlyCost: 5,
        coveragePercentage: 100,
        fixedCost: 0,
        isAvailable: true,
      },
    ],
    educationalMessage: 'Small fees for parking apps or reminders can prevent expensive tickets. Being organized with parking rules saves money in the long run.',
  },

  {
    id: 'incident_appliance_breakdown',
    name: 'Small Appliance Breakdown',
    description: 'Your microwave or coffee maker stopped working and needs replacement.',
    category: IncidentCategory.HOME,
    severity: IncidentSeverity.MINOR,
    baseCost: 150,
    costRange: { min: 50, max: 300 },
    probabilityWeight: 60,
    frequency: 'occasional',
    isPreventable: false,
    mitigationOptions: [
      {
        id: 'mit_appliance_warranty',
        type: MitigationType.WARRANTY,
        name: 'Extended Appliance Warranty',
        description: 'Extended warranty coverage for small appliances',
        monthlyCost: 8,
        coveragePercentage: 100,
        fixedCost: 25, // Service fee
        isAvailable: true,
      },
    ],
    educationalMessage: 'Extended warranties can protect against unexpected appliance failures. Weigh the cost against the likelihood of breakdown.',
  },

  {
    id: 'incident_prescription_medication',
    name: 'Uncovered Prescription Medication',
    description: 'You need a prescription medication not covered by your insurance.',
    category: IncidentCategory.HEALTH,
    severity: IncidentSeverity.MINOR,
    baseCost: 120,
    costRange: { min: 50, max: 300 },
    probabilityWeight: 55,
    frequency: 'occasional',
    isPreventable: false,
    mitigationOptions: [
      {
        id: 'mit_better_health_insurance',
        type: MitigationType.INSURANCE,
        name: 'Enhanced Health Insurance',
        description: 'Better prescription drug coverage',
        monthlyCost: 45,
        coveragePercentage: 80,
        fixedCost: 20, // Copay
        isAvailable: true,
      },
      {
        id: 'mit_generic_meds',
        type: MitigationType.PREVENTIVE_MEASURE,
        name: 'Generic Medication Option',
        description: 'Choose generic alternatives when available',
        monthlyCost: 0,
        coveragePercentage: 70,
        fixedCost: 0,
        isAvailable: true,
      },
    ],
    educationalMessage: 'Review your health insurance coverage for prescription benefits. Generic medications can significantly reduce costs.',
  },

  {
    id: 'incident_computer_virus',
    name: 'Computer Virus/Malware',
    description: 'Your computer got infected and needs professional removal.',
    category: IncidentCategory.TECHNOLOGY,
    severity: IncidentSeverity.MINOR,
    baseCost: 200,
    costRange: { min: 100, max: 400 },
    probabilityWeight: 50,
    frequency: 'occasional',
    isPreventable: true,
    mitigationOptions: [
      {
        id: 'mit_antivirus_software',
        type: MitigationType.PREVENTIVE_MEASURE,
        name: 'Premium Antivirus Software',
        description: 'Real-time protection and threat removal',
        monthlyCost: 6,
        coveragePercentage: 95,
        fixedCost: 0,
        isAvailable: true,
      },
      {
        id: 'mit_cloud_backup',
        type: MitigationType.PREVENTIVE_MEASURE,
        name: 'Cloud Backup Service',
        description: 'Automatic backups to prevent data loss',
        monthlyCost: 5,
        coveragePercentage: 0,
        fixedCost: 0,
        isAvailable: true,
      },
    ],
    educationalMessage: 'Invest in quality antivirus software and regular backups. Prevention is cheaper than recovery.',

    occurrenceConditions: {
      hasProperty: true, // Only for players with a computer
    },
  },

  // ============================================
  // MODERATE INCIDENTS ($500-2,000)
  // ============================================

  {
    id: 'incident_dental_emergency',
    name: 'Dental Emergency',
    description: 'You have a dental emergency requiring immediate treatment.',
    category: IncidentCategory.HEALTH,
    severity: IncidentSeverity.MODERATE,
    baseCost: 800,
    costRange: { min: 300, max: 1500 },
    probabilityWeight: 40,
    frequency: 'occasional',
    isPreventable: false,
    mitigationOptions: [
      {
        id: 'mit_dental_insurance',
        type: MitigationType.INSURANCE,
        name: 'Dental Insurance',
        description: 'Coverage for dental procedures and emergencies',
        monthlyCost: 35,
        coveragePercentage: 80,
        fixedCost: 50, // Deductible
        isAvailable: true,
      },
      {
        id: 'mit_regular_checkups',
        type: MitigationType.PREVENTIVE_MEASURE,
        name: 'Regular Dental Checkups',
        description: 'Preventive care to reduce emergency likelihood',
        monthlyCost: 15, // Average monthly cost
        coveragePercentage: 50,
        fixedCost: 0,
        isAvailable: true,
      },
    ],
    educationalMessage: 'Dental insurance and regular checkups can prevent expensive emergency procedures. Oral health impacts overall health.',
  },

  {
    id: 'incident_storm_damage',
    name: 'Storm Damage to Property',
    description: 'Severe weather caused damage to your home/property.',
    category: IncidentCategory.NATURAL_DISASTER,
    severity: IncidentSeverity.MODERATE,
    baseCost: 1500,
    costRange: { min: 500, max: 3000 },
    probabilityWeight: 35,
    frequency: 'occasional',
    isPreventable: false,
    mitigationOptions: [
      {
        id: 'mit_homeowners_insurance',
        type: MitigationType.INSURANCE,
        name: 'Homeowners Insurance',
        description: 'Coverage for storm and weather damage',
        monthlyCost: 120,
        coveragePercentage: 100,
        fixedCost: 500, // Deductible
        isAvailable: true,
      },
      {
        id: 'mit_renters_insurance',
        type: MitigationType.INSURANCE,
        name: 'Renters Insurance',
        description: 'Coverage for personal property damage',
        monthlyCost: 20,
        coveragePercentage: 100,
        fixedCost: 250, // Deductible
        isAvailable: true,
      },
      {
        id: 'mit_storm_shutters',
        type: MitigationType.PREVENTIVE_MEASURE,
        name: 'Storm Shutters',
        description: 'Protective shutters to reduce damage',
        upfrontCost: 800,
        coveragePercentage: 60,
        fixedCost: 0,
        isAvailable: true,
      },
    ],
    educationalMessage: 'Insurance is crucial for protecting against natural disasters. Even renters need coverage for their belongings.',
    occurrenceConditions: {
      hasProperty: true,
    },
  },

  {
    id: 'incident_pet_emergency',
    name: 'Pet Medical Emergency',
    description: 'Your pet needs emergency veterinary care.',
    category: IncidentCategory.PET,
    severity: IncidentSeverity.MODERATE,
    baseCost: 1000,
    costRange: { min: 400, max: 2000 },
    probabilityWeight: 30,
    frequency: 'occasional',
    isPreventable: false,
    mitigationOptions: [
      {
        id: 'mit_pet_insurance',
        type: MitigationType.INSURANCE,
        name: 'Pet Insurance',
        description: 'Coverage for veterinary emergencies and treatments',
        monthlyCost: 45,
        coveragePercentage: 90,
        fixedCost: 50, // Deductible
        isAvailable: true,
      },
      {
        id: 'mit_pet_emergency_fund',
        type: MitigationType.EMERGENCY_FUND,
        name: 'Pet Emergency Fund',
        description: 'Dedicated savings for pet emergencies',
        monthlyCost: 30,
        coveragePercentage: 100,
        fixedCost: 0,
        isAvailable: true,
      },
    ],
    educationalMessage: 'Pet insurance or an emergency fund can prevent difficult decisions during pet emergencies. Plan for your pet\'s healthcare needs.',
    occurrenceConditions: {
      hasPet: true,
    },
  },

  {
    id: 'incident_identity_theft',
    name: 'Identity Theft',
    description: 'Your identity was stolen and you need to resolve fraudulent accounts.',
    category: IncidentCategory.FINANCIAL,
    severity: IncidentSeverity.MODERATE,
    baseCost: 500,
    costRange: { min: 100, max: 1000 },
    probabilityWeight: 25,
    frequency: 'rare',
    isPreventable: true,
    mitigationOptions: [
      {
        id: 'mit_identity_theft_protection',
        type: MitigationType.INSURANCE,
        name: 'Identity Theft Protection Service',
        description: 'Monitoring and recovery assistance',
        monthlyCost: 15,
        coveragePercentage: 100,
        fixedCost: 0,
        isAvailable: true,
      },
      {
        id: 'mit_credit_freeze',
        type: MitigationType.PREVENTIVE_MEASURE,
        name: 'Credit Freeze',
        description: 'Freeze credit reports to prevent new accounts',
        monthlyCost: 0,
        coveragePercentage: 90,
        fixedCost: 0,
        isAvailable: true,
      },
    ],
    educationalMessage: 'Identity theft protection and credit monitoring can save hundreds in recovery costs. Prevention is easier than resolution.',
  },

  {
    id: 'incident_lost_wallet',
    name: 'Lost or Stolen Wallet',
    description: 'Your wallet was lost/stolen with credit cards and ID.',
    category: IncidentCategory.FINANCIAL,
    severity: IncidentSeverity.MODERATE,
    baseCost: 300,
    costRange: { min: 100, max: 600 },
    probabilityWeight: 40,
    frequency: 'occasional',
    isPreventable: false,
    mitigationOptions: [
      {
        id: 'mit_credit_card_protection',
        type: MitigationType.INSURANCE,
        name: 'Credit Card Protection Service',
        description: 'Zero liability protection and emergency replacement',
        monthlyCost: 0, // Usually free with cards
        coveragePercentage: 100,
        fixedCost: 0,
        isAvailable: true,
      },
      {
        id: 'mit_digital_wallet',
        type: MitigationType.PREVENTIVE_MEASURE,
        name: 'Digital Wallet Backup',
        description: 'Store card info securely for quick replacement',
        monthlyCost: 0,
        coveragePercentage: 80,
        fixedCost: 0,
        isAvailable: true,
      },
    ],
    educationalMessage: 'Credit card protection services and digital backups can minimize the impact of lost or stolen wallets. Most major cards offer this protection free.',
  },

  // ============================================
  // MAJOR INCIDENTS ($2,000-10,000+)
  // ============================================

  {
    id: 'incident_burst_water_pipe',
    name: 'Burst Water Pipe',
    description: 'A water pipe burst causing significant damage to your home.',
    category: IncidentCategory.HOME,
    severity: IncidentSeverity.MAJOR,
    baseCost: 5000,
    costRange: { min: 2000, max: 15000 },
    probabilityWeight: 15,
    frequency: 'rare',
    isPreventable: false,
    mitigationOptions: [
      {
        id: 'mit_homeowners_insurance_major',
        type: MitigationType.INSURANCE,
        name: 'Homeowners Insurance',
        description: 'Coverage for water damage and repairs',
        monthlyCost: 120,
        coveragePercentage: 100,
        fixedCost: 1000, // Deductible
        isAvailable: true,
      },
      {
        id: 'mit_home_warranty',
        type: MitigationType.WARRANTY,
        name: 'Home Warranty',
        description: 'Coverage for home systems including plumbing',
        monthlyCost: 50,
        coveragePercentage: 100,
        fixedCost: 100, // Service fee
        isAvailable: true,
      },
    ],
    educationalMessage: 'Homeowners insurance is essential for protecting against major home damage. Consider the deductible vs. potential costs.',
    occurrenceConditions: {
      hasProperty: true,
    },
  },

  {
    id: 'incident_hvac_failure',
    name: 'Major HVAC System Failure',
    description: 'Your heating/cooling system failed and needs replacement.',
    category: IncidentCategory.HOME,
    severity: IncidentSeverity.MAJOR,
    baseCost: 7000,
    costRange: { min: 4000, max: 12000 },
    probabilityWeight: 12,
    frequency: 'rare',
    isPreventable: false,
    mitigationOptions: [
      {
        id: 'mit_home_warranty_hvac',
        type: MitigationType.WARRANTY,
        name: 'Home Warranty',
        description: 'Coverage for HVAC systems',
        monthlyCost: 50,
        coveragePercentage: 100,
        fixedCost: 100, // Service fee
        isAvailable: true,
      },
      {
        id: 'mit_preventive_maintenance',
        type: MitigationType.PREVENTIVE_MEASURE,
        name: 'Regular HVAC Maintenance',
        description: 'Annual inspections to extend system life',
        monthlyCost: 15,
        coveragePercentage: 30, // Reduces likelihood
        fixedCost: 0,
        isAvailable: true,
      },
    ],
    educationalMessage: 'Home warranties can cover expensive system replacements. Regular maintenance extends equipment life and reduces failure risk.',
    occurrenceConditions: {
      hasProperty: true,
    },
  },

  {
    id: 'incident_legal_dispute',
    name: 'Legal Dispute/Lawsuit',
    description: 'You\'re involved in a legal dispute requiring attorney representation.',
    category: IncidentCategory.LEGAL,
    severity: IncidentSeverity.MAJOR,
    baseCost: 5000,
    costRange: { min: 2000, max: 15000 },
    probabilityWeight: 10,
    frequency: 'rare',
    isPreventable: false,
    mitigationOptions: [
      {
        id: 'mit_legal_insurance',
        type: MitigationType.INSURANCE,
        name: 'Legal Insurance / Prepaid Legal Plan',
        description: 'Coverage for legal representation and advice',
        monthlyCost: 25,
        coveragePercentage: 80,
        fixedCost: 500, // Deductible
        isAvailable: true,
      },
      {
        id: 'mit_umbrella_policy',
        type: MitigationType.INSURANCE,
        name: 'Umbrella Insurance Policy',
        description: 'Additional liability coverage',
        monthlyCost: 35,
        coveragePercentage: 100,
        fixedCost: 0,
        isAvailable: true,
      },
    ],
    educationalMessage: 'Legal insurance or umbrella policies can protect against expensive legal situations. Review your liability coverage regularly.',
  },

  {
    id: 'incident_natural_disaster',
    name: 'Natural Disaster (Flood, Fire, Earthquake)',
    description: 'A natural disaster caused significant damage to your property.',
    category: IncidentCategory.NATURAL_DISASTER,
    severity: IncidentSeverity.MAJOR,
    baseCost: 15000,
    costRange: { min: 5000, max: 50000 },
    probabilityWeight: 5,
    frequency: 'rare',
    isPreventable: false,
    mitigationOptions: [
      {
        id: 'mit_comprehensive_insurance',
        type: MitigationType.INSURANCE,
        name: 'Comprehensive Disaster Insurance',
        description: 'Coverage for floods, earthquakes, fires, etc.',
        monthlyCost: 80,
        coveragePercentage: 100,
        fixedCost: 2000, // Deductible
        isAvailable: true,
      },
      {
        id: 'mit_emergency_fund',
        type: MitigationType.EMERGENCY_FUND,
        name: 'Emergency Fund',
        description: 'Savings to cover unexpected disasters',
        monthlyCost: 100,
        coveragePercentage: 100,
        fixedCost: 0,
        isAvailable: true,
      },
    ],
    educationalMessage: 'Comprehensive insurance coverage is crucial for natural disasters. An emergency fund provides additional protection and peace of mind.',
    occurrenceConditions: {
      hasProperty: true,
    },
  },

  {
    id: 'incident_job_loss',
    name: 'Job Loss',
    description: 'You lost your job and need time to find new employment.',
    category: IncidentCategory.EMPLOYMENT,
    severity: IncidentSeverity.MAJOR,
    baseCost: 10000,
    costRange: { min: 3000, max: 25000 },
    probabilityWeight: 8,
    frequency: 'rare',
    isPreventable: false,
    mitigationOptions: [
      {
        id: 'mit_unemployment_insurance',
        type: MitigationType.INSURANCE,
        name: 'Unemployment Insurance',
        description: 'Government or private unemployment benefits',
        monthlyCost: 0, // Usually paid by employer
        coveragePercentage: 60,
        fixedCost: 0,
        isAvailable: true,
      },
      {
        id: 'mit_emergency_fund_large',
        type: MitigationType.EMERGENCY_FUND,
        name: 'Emergency Fund (6 months expenses)',
        description: 'Savings to cover living expenses during unemployment',
        monthlyCost: 200,
        coveragePercentage: 100,
        fixedCost: 0,
        isAvailable: true,
      },
      {
        id: 'mit_disability_insurance',
        type: MitigationType.INSURANCE,
        name: 'Disability Insurance',
        description: 'Income protection if unable to work',
        monthlyCost: 40,
        coveragePercentage: 70,
        fixedCost: 0,
        isAvailable: true,
      },
    ],
    educationalMessage: 'Build an emergency fund covering 3-6 months of expenses. Disability insurance protects your income if you can\'t work. Always have a backup plan.',
    occurrenceConditions: {
      employmentStatus: 'employed',
    },
  },
];

// Helper function to get incidents by category
export function getIncidentsByCategory(category: IncidentCategory): Incident[] {
  return FINANCIAL_INCIDENTS.filter(incident => incident.category === category);
}

// Helper function to get incidents by severity
export function getIncidentsBySeverity(severity: IncidentSeverity): Incident[] {
  return FINANCIAL_INCIDENTS.filter(incident => incident.severity === severity);
}

// Helper function to get preventable incidents
export function getPreventableIncidents(): Incident[] {
  return FINANCIAL_INCIDENTS.filter(incident => incident.isPreventable);
}

// Helper function to get incident by ID
export function getIncidentById(id: string): Incident | undefined {
  return FINANCIAL_INCIDENTS.find(incident => incident.id === id);
}

// Helper function to calculate average cost for all incidents
export function getAverageIncidentCost(): number {
  const total = FINANCIAL_INCIDENTS.reduce((sum, incident) => sum + incident.baseCost, 0);
  return Math.round(total / FINANCIAL_INCIDENTS.length);
}

// Helper function to get cost range summary
export function getCostRangeSummary(): {
  minor: { min: number; max: number; avg: number };
  moderate: { min: number; max: number; avg: number };
  major: { min: number; max: number; avg: number };
} {
  const minor = getIncidentsBySeverity(IncidentSeverity.MINOR);
  const moderate = getIncidentsBySeverity(IncidentSeverity.MODERATE);
  const major = getIncidentsBySeverity(IncidentSeverity.MAJOR);

  return {
    minor: {
      min: Math.min(...minor.map(i => i.costRange.min)),
      max: Math.max(...minor.map(i => i.costRange.max)),
      avg: Math.round(minor.reduce((sum, i) => sum + i.baseCost, 0) / minor.length),
    },
    moderate: {
      min: Math.min(...moderate.map(i => i.costRange.min)),
      max: Math.max(...moderate.map(i => i.costRange.max)),
      avg: Math.round(moderate.reduce((sum, i) => sum + i.baseCost, 0) / moderate.length),
    },
    major: {
      min: Math.min(...major.map(i => i.costRange.min)),
      max: Math.max(...major.map(i => i.costRange.max)),
      avg: Math.round(major.reduce((sum, i) => sum + i.baseCost, 0) / major.length),
    },
  };
}