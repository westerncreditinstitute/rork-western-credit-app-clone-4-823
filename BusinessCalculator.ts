import {
  BusinessCategoryData,
  UserBusinessData,
  BusinessStage,
} from '@/types/business';

export class BusinessCalculator {
  /**
   * Calculate monthly revenue based on category and reputation
   */
  static calculateMonthlyRevenue(
    category: BusinessCategoryData,
    reputation: number,
    monthsOperational: number
  ): number {
    const baseRevenue = category.avgMonthlyRevenue;
    
    // Reputation multiplier (0.5 - 1.5)
    const reputationMultiplier = 0.5 + (reputation / 100);
    
    // Growth factor based on months operational (up to 2x after 24 months)
    const growthFactor = Math.min(1 + (monthsOperational / 24), 2);
    
    // Random variation (0.8 - 1.2)
    const variation = 0.8 + Math.random() * 0.4;
    
    return Math.round(baseRevenue * reputationMultiplier * growthFactor * variation);
  }

  /**
   * Calculate monthly expenses based on revenue and business stage
   */
  static calculateMonthlyExpenses(
    revenue: number,
    stage: BusinessStage,
    employeeCount: number
  ): number {
    // Base expense ratio varies by stage
    const expenseRatios: Record<BusinessStage, number> = {
      planning: 0.2, // Minimal expenses during planning
      funding: 0.3, // Lower expenses during funding
      operational: 0.6, // Normal operations
      profitable: 0.5, // More efficient when profitable
      scaling: 0.7, // Higher expenses when scaling
      struggling: 0.8, // Higher expenses when struggling
      closed: 0, // No expenses when closed
    };

    const baseExpenses = revenue * expenseRatios[stage];
    
    // Employee costs (avg $3,000 per employee per month)
    const employeeCosts = employeeCount * 3000;
    
    // Random variation (0.9 - 1.1)
    const variation = 0.9 + Math.random() * 0.2;
    
    return Math.round((baseExpenses + employeeCosts) * variation);
  }

  /**
   * Calculate monthly profit
   */
  static calculateMonthlyProfit(
    revenue: number,
    expenses: number
  ): number {
    return revenue - expenses;
  }

  /**
   * Calculate profit margin
   */
  static calculateProfitMargin(revenue: number, expenses: number): number {
    if (revenue === 0) return 0;
    return Math.round(((revenue - expenses) / revenue) * 100);
  }

  /**
   * Calculate break-even time
   */
  static calculateBreakEvenMonths(
    startupCost: number,
    monthlyProfit: number
  ): number {
    if (monthlyProfit <= 0) return 999; // Never breaks even
    return Math.ceil(startupCost / monthlyProfit);
  }

  /**
   * Calculate ROI (Return on Investment)
   */
  static calculateROI(
    totalInvestment: number,
    totalReturns: number
  ): number {
    if (totalInvestment === 0) return 0;
    return Math.round(((totalReturns - totalInvestment) / totalInvestment) * 100);
  }

  /**
   * Calculate credit score impact
   */
  static calculateCreditScoreImpact(
    profitMargin: number,
    paymentHistory: number
  ): number {
    // Positive profit margins improve credit score
    // Negative profit margins hurt credit score
    let impact = 0;
    
    if (profitMargin > 20) {
      impact = 5; // Strong profitability
    } else if (profitMargin > 10) {
      impact = 3; // Good profitability
    } else if (profitMargin > 0) {
      impact = 1; // Positive but low profitability
    } else if (profitMargin < -10) {
      impact = -3; // Losses hurt credit
    } else {
      impact = -1; // Slight losses
    }
    
    // Payment history factor (0-100)
    const paymentFactor = (paymentHistory / 100) * 2;
    
    return impact + Math.round(paymentFactor);
  }

  /**
   * Calculate business valuation
   */
  static calculateBusinessValuation(
    monthlyRevenue: number,
    monthlyProfit: number,
    growthRate: number
  ): number {
    // Simple valuation: 3x annual revenue
    const revenueMultiple = 3;
    const annualRevenue = monthlyRevenue * 12;
    
    // Adjust for profitability
    const profitAdjustment = monthlyProfit > 0 ? 1.2 : 0.8;
    
    // Adjust for growth rate
    const growthAdjustment = 1 + (growthRate / 100);
    
    return Math.round(annualRevenue * revenueMultiple * profitAdjustment * growthAdjustment);
  }

  /**
   * Calculate required investment to reach funding goal
   */
  static calculateRequiredInvestment(
    fundingGoal: number,
    currentFunding: number
  ): number {
    return Math.max(0, fundingGoal - currentFunding);
  }

  /**
   * Calculate investor ownership percentage
   */
  static calculateInvestorOwnership(
    investmentAmount: number,
    fundingGoal: number
  ): number {
    if (fundingGoal === 0) return 0;
    return Math.round((investmentAmount / fundingGoal) * 100 * 100) / 100; // 2 decimal places
  }

  /**
   * Calculate expected monthly return for investor
   */
  static calculateExpectedMonthlyReturn(
    investmentAmount: number,
    annualROI: number
  ): number {
    const monthlyROI = annualROI / 12;
    return Math.round(investmentAmount * (monthlyROI / 100));
  }

  /**
   * Calculate business risk level
   */
  static calculateBusinessRisk(
    categoryRisk: string,
    cashFlow: number,
    debtLevel: number
  ): 'low' | 'medium' | 'high' | 'very_high' {
    let riskScore = 0;
    
    // Category risk
    const riskLevels: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      very_high: 4,
    };
    riskScore += riskLevels[categoryRisk] || 2;
    
    // Cash flow risk
    if (cashFlow < 0) riskScore += 2;
    else if (cashFlow < 1000) riskScore += 1;
    
    // Debt level risk
    if (debtLevel > 50000) riskScore += 2;
    else if (debtLevel > 20000) riskScore += 1;
    
    // Determine risk level
    if (riskScore <= 2) return 'low';
    if (riskScore <= 4) return 'medium';
    if (riskScore <= 6) return 'high';
    return 'very_high';
  }

  /**
   * Calculate business growth rate
   */
  static calculateGrowthRate(
    currentRevenue: number,
    previousRevenue: number
  ): number {
    if (previousRevenue === 0) return 0;
    return Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100);
  }

  /**
   * Calculate total business expenses breakdown
   */
  static calculateExpensesBreakdown(
    totalExpenses: number,
    employeeCount: number
  ): {
    rent: number;
    utilities: number;
    inventory: number;
    payroll: number;
    marketing: number;
    insurance: number;
    other: number;
  } {
    const payroll = employeeCount * 3000;
    const remaining = totalExpenses - payroll;
    
    return {
      rent: Math.round(remaining * 0.25),
      utilities: Math.round(remaining * 0.10),
      inventory: Math.round(remaining * 0.25),
      payroll,
      marketing: Math.round(remaining * 0.15),
      insurance: Math.round(remaining * 0.10),
      other: Math.round(remaining * 0.15),
    };
  }

  /**
   * Calculate optimal employee count
   */
  static calculateOptimalEmployeeCount(revenue: number): number {
    // One employee per $50,000 of monthly revenue
    return Math.max(1, Math.floor(revenue / 50000));
  }
}