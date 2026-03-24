import {
  GameState,
  Property,
  OwnedProperty,
  Expense,
  LifestyleStats,
  ActivityLogEntry,
  CreditAccount,
} from '@/types/game';
import { SharedRentalAssignment, getCityById, getApartmentById } from '@/mocks/cityData';

export interface PropertyPurchaseParams {
  property: Property;
  downPayment: number;
  mortgageTermYears?: number;
  mortgageRate?: number;
}

export interface RentalParams {
  propertyName: string;
  monthlyRent: number;
  propertyType: string;
  neighborhood: string;
}

export interface PropertyPurchaseResult {
  success: boolean;
  error?: string;
  newState?: GameState;
  mortgageAccount?: CreditAccount;
}

export interface PropertyValuation {
  currentValue: number;
  equity: number;
  appreciationRate: number;
  monthlyExpenses: number;
  netMonthlyValue: number;
}

export class RealEstateDomain {
  private createActivityLogEntry(
    type: ActivityLogEntry['type'],
    title: string,
    description: string,
    metadata?: ActivityLogEntry['metadata']
  ): ActivityLogEntry {
    return {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      title,
      description,
      metadata,
    };
  }

  calculatePropertyValue(properties: OwnedProperty[]): number {
    return properties.reduce((sum, p) => sum + p.currentValue, 0);
  }

  calculateTotalEquity(properties: OwnedProperty[]): number {
    return properties.reduce((sum, p) => sum + p.equity, 0);
  }

  calculatePropertyAppreciation(
    property: OwnedProperty,
    monthsOwned: number,
    annualAppreciationRate: number = 0.03
  ): number {
    const monthlyRate = annualAppreciationRate / 12;
    const appreciatedValue = property.purchasePrice * Math.pow(1 + monthlyRate, monthsOwned);
    return Math.round(appreciatedValue);
  }

  getPropertyValuation(
    property: OwnedProperty,
    mortgageBalance: number,
    monthsOwned: number
  ): PropertyValuation {
    const currentValue = this.calculatePropertyAppreciation(property, monthsOwned);
    const equity = currentValue - mortgageBalance;
    const appreciationRate = ((currentValue - property.purchasePrice) / property.purchasePrice) * 100;
    
    const monthlyExpenses = (property.hoaFee || 0) + (property.propertyTax / 12);
    const estimatedRentalValue = currentValue * 0.008;
    const netMonthlyValue = estimatedRentalValue - monthlyExpenses;

    return {
      currentValue,
      equity,
      appreciationRate,
      monthlyExpenses,
      netMonthlyValue,
    };
  }

  canAffordProperty(
    state: GameState,
    property: Property,
    downPaymentPercent: number = 0.20
  ): { canAfford: boolean; reason?: string; requiredDownPayment: number; requiredIncome: number } {
    const requiredDownPayment = property.price * downPaymentPercent;
    const loanAmount = property.price - requiredDownPayment;
    const estimatedMonthlyPayment = this.calculateMortgagePayment(loanAmount, 0.065, 360);
    const requiredIncome = estimatedMonthlyPayment * 12 / 0.28;

    if (state.bankBalance < requiredDownPayment) {
      return {
        canAfford: false,
        reason: `Insufficient funds for down payment. Need ${requiredDownPayment.toLocaleString()}, have ${state.bankBalance.toLocaleString()}`,
        requiredDownPayment,
        requiredIncome,
      };
    }

    const monthlyIncome = state.monthlyIncome;
    if (monthlyIncome * 12 < requiredIncome) {
      return {
        canAfford: false,
        reason: `Income too low. Need ${requiredIncome.toLocaleString()}/year, have ${(monthlyIncome * 12).toLocaleString()}/year`,
        requiredDownPayment,
        requiredIncome,
      };
    }

    return {
      canAfford: true,
      requiredDownPayment,
      requiredIncome,
    };
  }

  calculateMortgagePayment(principal: number, annualRate: number, termMonths: number): number {
    const monthlyRate = annualRate / 12;
    if (monthlyRate === 0) return principal / termMonths;
    
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);
    
    return Math.round(payment * 100) / 100;
  }

  purchaseProperty(params: PropertyPurchaseParams, state: GameState): PropertyPurchaseResult {
    const { property, downPayment, mortgageTermYears = 30, mortgageRate = 0.065 } = params;
    const now = Date.now();

    console.log('[RealEstateDomain] Processing property purchase:', {
      propertyName: property.name,
      price: property.price,
      downPayment,
    });

    if (state.bankBalance < downPayment) {
      return {
        success: false,
        error: `Insufficient funds. Need ${downPayment.toLocaleString()}, have ${state.bankBalance.toLocaleString()}`,
      };
    }

    const loanAmount = property.price - downPayment;
    const termMonths = mortgageTermYears * 12;
    const monthlyPayment = this.calculateMortgagePayment(loanAmount, mortgageRate, termMonths);

    let housingType: LifestyleStats['housingType'] = 'owns_condo';
    if (property.type === 'luxury') housingType = 'owns_luxury';
    else if (property.type === 'single_family' || property.type === 'multi_family') housingType = 'owns_house';

    const ownedProperty: OwnedProperty = {
      ...property,
      purchaseDate: state.currentDate,
      purchasePrice: property.price,
      currentValue: property.price,
      equity: downPayment,
      hasSolarPanels: false,
    };

    let mortgageAccount: CreditAccount | undefined;
    if (loanAmount > 0) {
      mortgageAccount = {
        id: `mortgage_${now}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'mortgage',
        institutionId: 'bank_mortgage',
        institutionName: 'Mortgage Lender',
        balance: loanAmount,
        creditLimit: loanAmount,
        apr: mortgageRate * 100,
        minimumPayment: monthlyPayment,
        openedDate: state.currentDate,
        lastPaymentDate: state.currentDate,
        paymentHistory: [],
        status: 'current',
      };
      ownedProperty.mortgageId = mortgageAccount.id;
    }

    const newProperties = [...state.ownedProperties, ownedProperty];
    const totalPropertyValue = this.calculatePropertyValue(newProperties);

    const activity = this.createActivityLogEntry(
      'property_purchased',
      'Property Purchased',
      `Bought ${property.name} for ${property.price.toLocaleString()}`,
      { propertyName: property.name, amount: property.price }
    );

    const newState: GameState = {
      ...state,
      bankBalance: state.bankBalance - downPayment,
      ownedProperties: newProperties,
      creditAccounts: mortgageAccount 
        ? [...state.creditAccounts, mortgageAccount]
        : state.creditAccounts,
      lifestyle: {
        ...state.lifestyle,
        housingType,
        housingName: property.name,
        totalPropertyValue,
      },
      lifetimeSpending: state.lifetimeSpending + downPayment,
      activityLog: [...state.activityLog, activity],
      lastUpdated: now,
    };

    console.log('[RealEstateDomain] Property purchase successful:', {
      propertyId: ownedProperty.id,
      newBalance: newState.bankBalance,
      mortgageAmount: loanAmount,
    });

    return {
      success: true,
      newState,
      mortgageAccount,
    };
  }

  rentProperty(params: RentalParams, state: GameState): GameState {
    const { propertyName, monthlyRent, propertyType, neighborhood } = params;
    const moveInCost = monthlyRent * 2;
    const now = Date.now();

    console.log('[RealEstateDomain] Processing rental:', {
      propertyName,
      monthlyRent,
      moveInCost,
    });

    if (state.bankBalance < moveInCost) {
      console.warn('[RealEstateDomain] Insufficient funds for rental');
      return state;
    }

    const existingRentExpense = state.expenses.find(e => e.id === 'exp_rent');
    let newExpenses = state.expenses;

    if (existingRentExpense) {
      newExpenses = state.expenses.map(e =>
        e.id === 'exp_rent' ? { ...e, amount: monthlyRent, name: `Rent - ${propertyName}` } : e
      );
    } else {
      const rentExpense: Expense = {
        id: 'exp_rent',
        name: `Rent - ${propertyName}`,
        amount: monthlyRent,
        category: 'housing',
        frequency: 'monthly',
        isFixed: true,
      };
      newExpenses = [...state.expenses, rentExpense];
    }

    const activity = this.createActivityLogEntry(
      'property_purchased',
      'Rental Signed',
      `Rented ${propertyName} in ${neighborhood} for ${monthlyRent.toLocaleString()}/month`,
      { propertyName, amount: moveInCost }
    );

    return {
      ...state,
      bankBalance: state.bankBalance - moveInCost,
      expenses: newExpenses,
      lifestyle: {
        ...state.lifestyle,
        housingType: 'renting',
        housingName: propertyName,
        rentalPropertyType: propertyType,
        rentalNeighborhood: neighborhood,
        monthlyRent,
      },
      lifetimeSpending: state.lifetimeSpending + moveInCost,
      activityLog: [...state.activityLog, activity],
      lastUpdated: now,
    };
  }

  selectSharedRental(cityId: string, assignment: SharedRentalAssignment, state: GameState): GameState {
    const city = getCityById(cityId);
    const apartment = getApartmentById(assignment.apartmentId);
    const now = Date.now();

    if (!city || !apartment) {
      console.error('[RealEstateDomain] Invalid city or apartment assignment');
      return state;
    }

    console.log('[RealEstateDomain] Selecting shared rental:', {
      city: city.name,
      apartment: apartment.name,
      monthlyShare: assignment.monthlyShare,
    });

    const sharedRentalInfo = {
      apartmentId: assignment.apartmentId,
      apartmentNumber: assignment.apartmentNumber,
      unitNumber: assignment.unitNumber,
      roommates: assignment.roommates.map(r => ({
        id: r.id,
        name: r.name,
        age: r.age,
        occupation: r.occupation,
        personality: r.personality,
        avatar: r.avatar,
        rentPaidOnTime: r.rentPaidOnTime,
        cleanliness: r.cleanliness,
        noisiness: r.noisiness,
      })),
      moveInDate: assignment.moveInDate,
      monthlyShare: assignment.monthlyShare,
      securityDeposit: assignment.securityDeposit,
    };

    const rentExpense: Expense = {
      id: 'exp_shared_rent',
      name: `Shared Rent - ${apartment.name}`,
      amount: assignment.monthlyShare,
      category: 'housing',
      frequency: 'monthly',
      isFixed: true,
    };

    const existingRentIndex = state.expenses.findIndex(e => e.id === 'exp_rent' || e.id === 'exp_shared_rent');
    let newExpenses = [...state.expenses];
    if (existingRentIndex >= 0) {
      newExpenses[existingRentIndex] = rentExpense;
    } else {
      newExpenses.push(rentExpense);
    }

    const activity = this.createActivityLogEntry(
      'property_purchased',
      'Moved to New City',
      `Moved to ${city.name} - Assigned to ${apartment.name} ${assignment.apartmentNumber}`,
      { propertyName: apartment.name, amount: assignment.securityDeposit }
    );

    return {
      ...state,
      citySelectionCompleted: true,
      bankBalance: state.bankBalance - assignment.securityDeposit,
      expenses: newExpenses,
      lifestyle: {
        ...state.lifestyle,
        housingType: 'shared_rental',
        housingName: `${apartment.name} ${assignment.apartmentNumber}`,
        cityId: cityId,
        cityName: city.name,
        sharedRental: sharedRentalInfo,
        monthlyRent: assignment.monthlyShare,
      },
      lifetimeSpending: state.lifetimeSpending + assignment.securityDeposit,
      activityLog: [...state.activityLog, activity],
      lastUpdated: now,
    };
  }

  installSolarPanels(propertyId: string, state: GameState): GameState {
    const SOLAR_INSTALL_COST = 15000;
    const MONTHLY_SAVINGS = 75;
    const now = Date.now();

    const property = state.ownedProperties.find(p => p.id === propertyId);
    if (!property) {
      console.warn('[RealEstateDomain] Property not found:', propertyId);
      return state;
    }

    if (property.hasSolarPanels) {
      console.warn('[RealEstateDomain] Property already has solar panels');
      return state;
    }

    if (state.bankBalance < SOLAR_INSTALL_COST) {
      console.warn('[RealEstateDomain] Insufficient funds for solar installation');
      return state;
    }

    console.log('[RealEstateDomain] Installing solar panels:', {
      propertyId,
      cost: SOLAR_INSTALL_COST,
      monthlySavings: MONTHLY_SAVINGS,
    });

    const newProperties = state.ownedProperties.map(p =>
      p.id === propertyId
        ? { ...p, hasSolarPanels: true, solarInstallDate: state.currentDate }
        : p
    );

    const activity = this.createActivityLogEntry(
      'property_purchased',
      'Solar Panels Installed',
      `Installed solar panels on ${property.name} for ${SOLAR_INSTALL_COST.toLocaleString()} - Save $${MONTHLY_SAVINGS}/month on utilities!`,
      { propertyName: property.name, amount: SOLAR_INSTALL_COST }
    );

    return {
      ...state,
      bankBalance: state.bankBalance - SOLAR_INSTALL_COST,
      ownedProperties: newProperties,
      lifetimeSpending: state.lifetimeSpending + SOLAR_INSTALL_COST,
      activityLog: [...state.activityLog, activity],
      lastUpdated: now,
    };
  }

  updatePropertyValues(state: GameState, monthsElapsed: number = 1): GameState {
    const annualAppreciationRate = 0.03;
    
    const updatedProperties = state.ownedProperties.map(property => {
      const monthsOwned = Math.floor(
        (state.currentDate - property.purchaseDate) / (30 * 24 * 60 * 60 * 1000)
      );
      const newValue = this.calculatePropertyAppreciation(property, monthsOwned, annualAppreciationRate);
      
      const mortgageAccount = property.mortgageId 
        ? state.creditAccounts.find(a => a.id === property.mortgageId)
        : null;
      const mortgageBalance = mortgageAccount?.balance || 0;
      const newEquity = newValue - mortgageBalance;

      return {
        ...property,
        currentValue: newValue,
        equity: newEquity,
      };
    });

    const totalPropertyValue = this.calculatePropertyValue(updatedProperties);

    return {
      ...state,
      ownedProperties: updatedProperties,
      lifestyle: {
        ...state.lifestyle,
        totalPropertyValue,
      },
      lastUpdated: Date.now(),
    };
  }

  sellProperty(propertyId: string, state: GameState): GameState {
    const property = state.ownedProperties.find(p => p.id === propertyId);
    if (!property) {
      console.warn('[RealEstateDomain] Property not found:', propertyId);
      return state;
    }

    const now = Date.now();
    const salePrice = property.currentValue;
    const mortgageAccount = property.mortgageId
      ? state.creditAccounts.find(a => a.id === property.mortgageId)
      : null;
    const mortgagePayoff = mortgageAccount?.balance || 0;
    const netProceeds = salePrice - mortgagePayoff;

    console.log('[RealEstateDomain] Selling property:', {
      propertyId,
      salePrice,
      mortgagePayoff,
      netProceeds,
    });

    const newProperties = state.ownedProperties.filter(p => p.id !== propertyId);
    const newAccounts = mortgageAccount
      ? state.creditAccounts.map(a =>
          a.id === mortgageAccount.id ? { ...a, balance: 0, status: 'closed' as const } : a
        )
      : state.creditAccounts;

    const activity = this.createActivityLogEntry(
      'property_purchased',
      'Property Sold',
      `Sold ${property.name} for ${salePrice.toLocaleString()} (Net: ${netProceeds.toLocaleString()})`,
      { propertyName: property.name, amount: netProceeds }
    );

    const totalPropertyValue = this.calculatePropertyValue(newProperties);
    let housingType: LifestyleStats['housingType'] = state.lifestyle.housingType;
    let housingName = state.lifestyle.housingName;

    if (newProperties.length === 0) {
      housingType = state.lifestyle.sharedRental ? 'shared_rental' : 'renting';
      housingName = state.lifestyle.sharedRental?.apartmentId 
        ? `Shared Rental` 
        : 'Renting';
    }

    return {
      ...state,
      bankBalance: state.bankBalance + netProceeds,
      ownedProperties: newProperties,
      creditAccounts: newAccounts,
      lifestyle: {
        ...state.lifestyle,
        housingType,
        housingName,
        totalPropertyValue,
      },
      lifetimeEarnings: state.lifetimeEarnings + netProceeds,
      activityLog: [...state.activityLog, activity],
      lastUpdated: now,
    };
  }

  calculateMonthlyHousingCosts(state: GameState): number {
    let costs = 0;

    const rentExpense = state.expenses.find(e => 
      e.category === 'housing' && (e.id === 'exp_rent' || e.id === 'exp_shared_rent')
    );
    if (rentExpense) {
      costs += rentExpense.amount;
    }

    state.ownedProperties.forEach(property => {
      costs += property.hoaFee || 0;
      costs += property.propertyTax / 12;
      
      const mortgage = state.creditAccounts.find(a => a.id === property.mortgageId);
      if (mortgage) {
        costs += mortgage.minimumPayment;
      }
    });

    return costs;
  }

  getPropertyById(properties: OwnedProperty[], propertyId: string): OwnedProperty | undefined {
    return properties.find(p => p.id === propertyId);
  }

  getPropertiesWithSolar(properties: OwnedProperty[]): OwnedProperty[] {
    return properties.filter(p => p.hasSolarPanels);
  }

  calculateSolarSavings(properties: OwnedProperty[]): number {
    const MONTHLY_SAVINGS_PER_PROPERTY = 75;
    return this.getPropertiesWithSolar(properties).length * MONTHLY_SAVINGS_PER_PROPERTY;
  }

  getAffordableProperties(
    availableProperties: Property[],
    state: GameState,
    downPaymentPercent: number = 0.20
  ): Property[] {
    return availableProperties.filter(property => {
      const result = this.canAffordProperty(state, property, downPaymentPercent);
      return result.canAfford;
    });
  }
}

export const realEstateDomain = new RealEstateDomain();
