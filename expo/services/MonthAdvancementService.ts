import {
  GameState,
  CreditAccount,
  CreditScores,
  Expense,
  MonthlyReport,
  OwnedVehicle,
  HealthStatus,
  ActivityLogEntry,
  ActivityType,
  ScoreHistoryEntry,
  PaidExpenseRecord,
  TokenTransaction,
  TokenWallet,
} from '@/types/game';
import { compressTransactions } from '@/services/StateCompression';

const TOKENS_PER_DOLLAR = 10;
import { calculateCreditScores, formatCurrency } from '@/utils/creditEngine';

const BANKRUPTCY_THRESHOLD = -150000;

export interface MonthAdvancementResult {
  newState: GameState;
  report: MonthlyReport;
  isBankrupt: boolean;
}

const createActivityLogEntry = (
  type: ActivityType,
  title: string,
  description: string,
  metadata?: ActivityLogEntry['metadata']
): ActivityLogEntry => ({
  id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type,
  timestamp: Date.now(),
  title,
  description,
  metadata,
});

const createScoreHistoryEntry = (
  scores: CreditScores,
  reason?: string
): ScoreHistoryEntry => ({
  timestamp: Date.now(),
  experian: scores.experian,
  equifax: scores.equifax,
  transunion: scores.transunion,
  composite: scores.composite,
  reason,
});

export class MonthAdvancementService {
  static advanceMonth(state: GameState): MonthAdvancementResult {
    const newDate = this.calculateNewDate(state);
    const monthlyExpenses = this.calculateMonthlyExpenses(state.expenses);
    const monthlyIncome = state.monthlyIncome;
    const netIncome = monthlyIncome - monthlyExpenses;
    let newBankBalance = state.bankBalance + netIncome;

    const previousScore = state.creditScores.composite;
    const newAccounts = this.updateCreditAccountsInterest(state.creditAccounts);
    let newScores = calculateCreditScores(newAccounts, state.hardInquiries, newDate);
    const scoreChange = newScores.composite - previousScore;

    const newMonthsPlayed = state.monthsPlayed + 1;
    const hasHealthInsurance = state.currentJob?.job?.benefits?.healthInsurance === true;
    const { healthStatus: newHealthStatus, healthCost, healthScorePenalty } = this.updateHealthStatus(
      state.healthStatus,
      newMonthsPlayed,
      hasHealthInsurance
    );

    if (healthCost > 0) {
      newBankBalance -= healthCost;
    }

    if (healthScorePenalty > 0) {
      newScores = this.applyScorePenalty(newScores, healthScorePenalty);
    }

    const { netWorth, propertyValue, vehicleValue, totalDebt, totalAssets } = this.calculateNetWorth(
      newBankBalance,
      state.savingsBalance,
      state.emergencyFund,
      state.investments,
      state.ownedProperties,
      newAccounts
    );

    const updatedVehicles = this.consumeVehicleFuel(state.ownedVehicles);
    const solarSavings = this.calculateSolarSavings(state.ownedProperties);

    const report = this.generateMonthlyReport(
      newDate,
      monthlyIncome,
      monthlyExpenses,
      netIncome,
      scoreChange,
      netWorth - state.totalNetWorth,
      state.currentJob !== undefined,
      newBankBalance,
      newHealthStatus,
      state.healthStatus,
      state.monthsPlayed,
      updatedVehicles,
      solarSavings,
      hasHealthInsurance
    );

    const newMonthKey = `${new Date(newDate).getFullYear()}-${new Date(newDate).getMonth()}`;
    const updatedPaidExpenses = this.clearPaidExpensesForNewMonth(state.paidExpenses, newMonthKey);

    const { activityLog, scoreHistory } = this.createActivityEntries(
      state.activityLog,
      state.scoreHistory,
      newMonthsPlayed,
      netIncome,
      scoreChange,
      previousScore,
      newScores,
      newHealthStatus,
      state.healthStatus,
      hasHealthInsurance
    );

    // Sync token wallet with all balance changes
    const updatedTokenWallet = this.syncTokenWallet(
      state.tokenWallet,
      monthlyIncome,
      monthlyExpenses,
      healthCost,
      solarSavings
    );

    const finalBankBalance = Math.round((newBankBalance + solarSavings) * 100) / 100;
    const finalNetWorth = Math.round(netWorth * 100) / 100;
    const isBankrupt = finalNetWorth <= BANKRUPTCY_THRESHOLD;

    if (isBankrupt) {
      console.log('[MonthAdvancementService] BANKRUPTCY TRIGGERED - Net worth:', finalNetWorth, 'Threshold:', BANKRUPTCY_THRESHOLD);
      report.warnings.push(`BANKRUPTCY: Net worth dropped to ${formatCurrency(finalNetWorth)}. All assets liquidated. Game over.`);

      const bankruptcyActivity = createActivityLogEntry(
        'emergency_event',
        'Bankruptcy Filed',
        `Net worth reached ${formatCurrency(finalNetWorth)} (below ${formatCurrency(BANKRUPTCY_THRESHOLD)} threshold). All assets liquidated and the game is over.`,
        { amount: finalNetWorth, eventType: 'bankruptcy' }
      );
      activityLog.push(bankruptcyActivity);
    }

    const newState: GameState = {
      ...state,
      currentDate: newDate,
      creditAccounts: newAccounts,
      creditScores: newScores,
      bankBalance: finalBankBalance,
      totalNetWorth: finalNetWorth,
      monthsPlayed: newMonthsPlayed,
      lifetimeEarnings: state.lifetimeEarnings + monthlyIncome,
      lifetimeSpending: state.lifetimeSpending + monthlyExpenses,
      healthStatus: newHealthStatus,
      ownedVehicles: updatedVehicles,
      activityLog,
      scoreHistory,
      paidExpenses: updatedPaidExpenses,
      tokenWallet: updatedTokenWallet,
    };

    return { newState, report, isBankrupt };
  }

  private static calculateNewDate(state: GameState): number {
    return state.currentDate + (30 * 24 * 60 * 60 * 1000);
  }

  private static calculateMonthlyExpenses(expenses: Expense[]): number {
    return expenses.reduce((sum, exp) => {
      if (exp.frequency === 'monthly') return sum + exp.amount;
      if (exp.frequency === 'weekly') return sum + (exp.amount * 4);
      if (exp.frequency === 'annual') return sum + (exp.amount / 12);
      return sum;
    }, 0);
  }

  private static updateCreditAccountsInterest(accounts: CreditAccount[]): CreditAccount[] {
    return accounts.map(account => {
      if (account.type === 'credit_card') {
        const interest = account.balance * (account.apr / 100 / 12);
        return {
          ...account,
          balance: Math.round((account.balance + interest) * 100) / 100,
        };
      }
      return account;
    });
  }

  private static updateHealthStatus(
    currentHealth: HealthStatus,
    newMonthsPlayed: number,
    hasHealthInsurance: boolean = false
  ): { healthStatus: HealthStatus; healthCost: number; healthScorePenalty: number } {
    const monthsSinceFood = newMonthsPlayed - currentHealth.lastFoodPurchaseMonth;
    let healthStatus = { ...currentHealth };
    let healthCost = 0;
    let healthScorePenalty = 0;

    if (monthsSinceFood >= 1 && !currentHealth.isHospitalized && currentHealth.lastFoodPurchaseMonth > 0) {
      const fullHospitalCost = 2500;
      const coveredCost = hasHealthInsurance ? Math.round(fullHospitalCost * 0.1) : fullHospitalCost;
      console.log('[MonthAdvancementService] Hospitalization - Insurance:', hasHealthInsurance, 'Full cost:', fullHospitalCost, 'Player pays:', coveredCost);
      healthStatus = {
        ...healthStatus,
        level: 30,
        isHospitalized: true,
        hospitalDebt: currentHealth.hospitalDebt + coveredCost,
      };
      healthCost = coveredCost;
      healthScorePenalty = hasHealthInsurance ? 0 : 15;
    } else if (currentHealth.lastFoodPurchaseMonth === 0) {
      healthStatus.lastFoodPurchaseMonth = newMonthsPlayed;
    }

    return { healthStatus, healthCost, healthScorePenalty };
  }

  private static applyScorePenalty(scores: CreditScores, penalty: number): CreditScores {
    return {
      experian: Math.max(300, scores.experian - penalty),
      equifax: Math.max(300, scores.equifax - penalty),
      transunion: Math.max(300, scores.transunion - penalty),
      composite: Math.max(300, scores.composite - penalty),
    };
  }

  private static calculateNetWorth(
    bankBalance: number,
    savingsBalance: number,
    emergencyFund: number,
    investments: number,
    ownedProperties: GameState['ownedProperties'],
    creditAccounts: CreditAccount[]
  ): {
    netWorth: number;
    propertyValue: number;
    vehicleValue: number;
    totalDebt: number;
    totalAssets: number;
  } {
    const propertyValue = ownedProperties.reduce((sum, p) => sum + p.currentValue, 0);
    const vehicleValue = 0;
    const totalDebt = creditAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalAssets = bankBalance + savingsBalance + emergencyFund + investments + propertyValue + vehicleValue;
    const netWorth = totalAssets - totalDebt;

    return { netWorth, propertyValue, vehicleValue, totalDebt, totalAssets };
  }

  private static consumeVehicleFuel(vehicles: OwnedVehicle[]): OwnedVehicle[] {
    return vehicles.map(vehicle => {
      if (vehicle.fuelType !== 'gas') return vehicle;

      const monthlyMiles = 1000;
      const gallonsUsed = monthlyMiles / vehicle.mpg;
      const tankCapacity = vehicle.tankCapacity || 12;
      const fuelPercentUsed = (gallonsUsed / tankCapacity) * 100;
      const newFuelLevel = Math.max(0, vehicle.fuelLevel - fuelPercentUsed);
      const newGallons = (newFuelLevel / 100) * tankCapacity;
      const milesUntilEmpty = newGallons * vehicle.mpg;

      return {
        ...vehicle,
        fuelLevel: newFuelLevel,
        milesUntilEmpty,
      };
    });
  }

  private static calculateSolarSavings(ownedProperties: GameState['ownedProperties']): number {
    let solarSavings = 0;
    ownedProperties.forEach(property => {
      if (property.hasSolarPanels) {
        solarSavings += 75;
      }
    });
    return solarSavings;
  }

  private static syncTokenWallet(
    tokenWallet: TokenWallet,
    monthlyIncome: number,
    monthlyExpenses: number,
    healthCost: number,
    solarSavings: number
  ): TokenWallet {
    const now = Date.now();
    const transactions: TokenTransaction[] = [];
    let currentBalance = tokenWallet.musoToken.balance;
    let totalMinted = tokenWallet.musoToken.totalMinted;
    let totalBurned = tokenWallet.musoToken.totalBurned;

    // Mint tokens for monthly income (10 tokens per $1)
    if (monthlyIncome > 0) {
      const incomeTokens = monthlyIncome * TOKENS_PER_DOLLAR;
      currentBalance += incomeTokens;
      totalMinted += incomeTokens;
      transactions.push({
        id: `tx_${now}_income_${Math.random().toString(36).substr(2, 9)}`,
        type: 'mint',
        amount: incomeTokens,
        reason: 'Monthly salary deposit',
        timestamp: now,
        balanceAfter: currentBalance,
        metadata: { source: 'monthly_income', category: 'income' },
      });
      console.log('[MonthAdvancementService] Minted tokens for income:', { monthlyIncome, incomeTokens, currentBalance });
    }

    // Burn tokens for monthly expenses (10 tokens per $1)
    if (monthlyExpenses > 0) {
      const expenseTokens = monthlyExpenses * TOKENS_PER_DOLLAR;
      currentBalance = Math.max(0, currentBalance - expenseTokens);
      totalBurned += expenseTokens;
      transactions.push({
        id: `tx_${now}_expenses_${Math.random().toString(36).substr(2, 9)}`,
        type: 'burn',
        amount: expenseTokens,
        reason: 'Monthly expenses',
        timestamp: now + 1,
        balanceAfter: currentBalance,
        metadata: { source: 'monthly_expenses', category: 'expenses' },
      });
      console.log('[MonthAdvancementService] Burned tokens for expenses:', { monthlyExpenses, expenseTokens, currentBalance });
    }

    // Burn tokens for health costs (10 tokens per $1)
    if (healthCost > 0) {
      const healthTokens = healthCost * TOKENS_PER_DOLLAR;
      currentBalance = Math.max(0, currentBalance - healthTokens);
      totalBurned += healthTokens;
      transactions.push({
        id: `tx_${now}_health_${Math.random().toString(36).substr(2, 9)}`,
        type: 'burn',
        amount: healthTokens,
        reason: 'Medical expenses - hospitalization',
        timestamp: now + 2,
        balanceAfter: currentBalance,
        metadata: { source: 'health_cost', category: 'medical' },
      });
      console.log('[MonthAdvancementService] Burned tokens for health cost:', { healthCost, healthTokens, currentBalance });
    }

    // Mint tokens for solar savings (10 tokens per $1)
    if (solarSavings > 0) {
      const solarTokens = solarSavings * TOKENS_PER_DOLLAR;
      currentBalance += solarTokens;
      totalMinted += solarTokens;
      transactions.push({
        id: `tx_${now}_solar_${Math.random().toString(36).substr(2, 9)}`,
        type: 'mint',
        amount: solarTokens,
        reason: 'Solar panel utility savings',
        timestamp: now + 3,
        balanceAfter: currentBalance,
        metadata: { source: 'solar_savings', category: 'savings' },
      });
      console.log('[MonthAdvancementService] Minted tokens for solar savings:', { solarSavings, solarTokens, currentBalance });
    }

    return {
      ...tokenWallet,
      musoToken: {
        ...tokenWallet.musoToken,
        balance: currentBalance,
        totalMinted,
        totalBurned,
        lastUpdated: now,
      },
      transactions: compressTransactions([...transactions, ...tokenWallet.transactions]),
    };
  }

  private static generateMonthlyReport(
    newDate: number,
    monthlyIncome: number,
    monthlyExpenses: number,
    netIncome: number,
    scoreChange: number,
    netWorthChange: number,
    hasJob: boolean,
    newBankBalance: number,
    newHealthStatus: HealthStatus,
    previousHealthStatus: HealthStatus,
    previousMonthsPlayed: number,
    updatedVehicles: OwnedVehicle[],
    solarSavings: number,
    hasHealthInsurance: boolean = false
  ): MonthlyReport {
    const report: MonthlyReport = {
      month: new Date(newDate).getMonth() + 1,
      year: new Date(newDate).getFullYear(),
      income: monthlyIncome,
      expenses: monthlyExpenses,
      savings: netIncome,
      creditScoreChange: scoreChange,
      netWorthChange: netWorthChange,
      highlights: [],
      warnings: [],
    };

    if (scoreChange > 0) report.highlights.push(`Credit score increased by ${scoreChange} points!`);
    if (netIncome > 0) report.highlights.push(`Saved ${netIncome.toFixed(0)} this month`);
    if (hasJob) report.highlights.push(`💰 Payday! ${formatCurrency(monthlyIncome)} deposited`);
    if (newBankBalance < monthlyExpenses) report.warnings.push('Low balance warning!');
    if (scoreChange < 0) report.warnings.push(`Credit score dropped ${Math.abs(scoreChange)} points`);

    if (newHealthStatus.isHospitalized && !previousHealthStatus.isHospitalized) {
      if (hasHealthInsurance) {
        report.warnings.push('Hospitalized due to not buying food! Health insurance covered 90% - you pay only $250 copay');
      } else {
        report.warnings.push('Hospitalized due to not buying food! -$2,500 medical bill');
      }
    }

    const monthsSinceFood = (previousMonthsPlayed + 1) - previousHealthStatus.lastFoodPurchaseMonth;
    if (monthsSinceFood >= 1 && !newHealthStatus.isHospitalized) {
      report.warnings.push('Warning: Buy groceries or risk hospitalization!');
    }

    const gasVehicles = updatedVehicles.filter(v => v.fuelType === 'gas');
    gasVehicles.forEach(vehicle => {
      if (vehicle.fuelLevel < 25) {
        report.warnings.push(
          `⛽ Low fuel warning: ${vehicle.make} ${vehicle.model} is at ${vehicle.fuelLevel.toFixed(0)}%! Buy gas in Marketplace.`
        );
      }
    });

    if (solarSavings > 0) {
      report.highlights.push(`☀️ Solar savings: ${formatCurrency(solarSavings)} off utilities!`);
    }

    return report;
  }

  private static clearPaidExpensesForNewMonth(
    paidExpenses: Record<string, PaidExpenseRecord>,
    newMonthKey: string
  ): Record<string, PaidExpenseRecord> {
    const updatedPaidExpenses: Record<string, PaidExpenseRecord> = {};
    Object.entries(paidExpenses).forEach(([expenseId, record]) => {
      if (record.monthKey === newMonthKey) {
        updatedPaidExpenses[expenseId] = record;
      }
    });
    return updatedPaidExpenses;
  }

  private static createActivityEntries(
    existingActivityLog: ActivityLogEntry[],
    existingScoreHistory: ScoreHistoryEntry[],
    newMonthsPlayed: number,
    netIncome: number,
    scoreChange: number,
    previousScore: number,
    newScores: CreditScores,
    newHealthStatus: HealthStatus,
    previousHealthStatus: HealthStatus,
    hasHealthInsurance: boolean = false
  ): { activityLog: ActivityLogEntry[]; scoreHistory: ScoreHistoryEntry[] } {
    const monthActivity = createActivityLogEntry(
      'month_advanced',
      'Month Advanced',
      `Advanced to month ${newMonthsPlayed} - Net: ${netIncome.toFixed(0)}`,
      { amount: netIncome }
    );

    let newActivityLog = [...existingActivityLog, monthActivity];
    let newScoreHistory = existingScoreHistory;

    if (scoreChange !== 0) {
      const scoreActivity = createActivityLogEntry(
        'score_change',
        'Monthly Score Update',
        `Credit score ${scoreChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(scoreChange)} points`,
        { previousScore: previousScore, newScore: newScores.composite }
      );
      newActivityLog.push(scoreActivity);
      newScoreHistory = [...newScoreHistory, createScoreHistoryEntry(newScores, 'Monthly update')];
    }

    if (newHealthStatus.isHospitalized && !previousHealthStatus.isHospitalized) {
      const costAmount = hasHealthInsurance ? 250 : 2500;
      const description = hasHealthInsurance
        ? 'Hospitalized due to not buying food - $250 copay (insurance covered 90%)'
        : 'Hospitalized due to not buying food - $2,500 medical bill';
      const healthActivity = createActivityLogEntry(
        'health_event',
        'Hospitalization',
        description,
        { amount: costAmount, eventType: hasHealthInsurance ? 'hospitalization_insured' : 'hospitalization' }
      );
      newActivityLog.push(healthActivity);
    }

    return { activityLog: newActivityLog, scoreHistory: newScoreHistory };
  }

  static getMonthlyExpensesTotal(expenses: Expense[]): number {
    return this.calculateMonthlyExpenses(expenses);
  }

  static getNetIncomeProjection(monthlyIncome: number, expenses: Expense[]): number {
    return monthlyIncome - this.calculateMonthlyExpenses(expenses);
  }

  static projectFutureBalance(state: GameState, months: number): number {
    const monthlyNet = this.getNetIncomeProjection(state.monthlyIncome, state.expenses);
    return state.bankBalance + (monthlyNet * months);
  }
}
