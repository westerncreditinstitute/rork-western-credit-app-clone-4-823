// Exchange Rate Service - Handles conversions between MUSO tokens and in-game dollars

import { ExchangeRateResult } from '../types/token';

export class ExchangeRateService {
  private static readonly EXCHANGE_RATE = {
    MUSO_PER_DOLLAR: 10, // 10 MUSO tokens = $1
    DOLLARS_PER_MUSO: 0.1, // $0.1 = 1 MUSO token
  };

  private static readonly DECIMAL_PLACES = 8;

  /**
   * Convert in-game dollars to MUSO tokens
   * @param dollars - Amount in dollars
   * @returns Amount in MUSO tokens (rounded to 8 decimal places)
   */
  static dollarsToMusos(dollars: number): number {
    const musoAmount = dollars * this.EXCHANGE_RATE.MUSO_PER_DOLLAR;
    return Math.round(musoAmount * Math.pow(10, this.DECIMAL_PLACES)) / Math.pow(10, this.DECIMAL_PLACES);
  }

  /**
   * Convert MUSO tokens to in-game dollars
   * @param musos - Amount in MUSO tokens
   * @returns Amount in dollars (rounded to 2 decimal places)
   */
  static musosToDollars(musos: number): number {
    const dollarAmount = musos * this.EXCHANGE_RATE.DOLLARS_PER_MUSO;
    return Math.round(dollarAmount * 100) / 100;
  }

  /**
   * Convert dollars to BigInt for blockchain operations (18 decimals)
   * @param dollars - Amount in dollars
   * @returns BigInt amount for smart contract (with 18 decimal places)
   */
  static dollarsToBigInt(dollars: number): bigint {
    const musoAmount = this.dollarsToMusos(dollars);
    return BigInt(Math.floor(musoAmount * Math.pow(10, this.EXCHANGE_RATE.MUSO_PER_DOLLAR)));
  }

  /**
   * Convert BigInt from blockchain to dollars
   * @param bigIntAmount - BigInt amount from smart contract (18 decimals)
   * @returns Amount in dollars (rounded to 2 decimal places)
   */
  static bigIntToDollars(bigIntAmount: bigint): number {
    const musoAmount = Number(bigIntAmount) / Math.pow(10, this.EXCHANGE_RATE.MUSO_PER_DOLLAR);
    return this.musosToDollars(musoAmount);
  }

  /**
   * Get current exchange rate
   * @returns Exchange rate object
   */
  static getExchangeRate(): { musoPerDollar: number; dollarsPerMusso: number } {
    return {
      musoPerDollar: this.EXCHANGE_RATE.MUSO_PER_DOLLAR,
      dollarsPerMusso: this.EXCHANGE_RATE.DOLLARS_PER_MUSO,
    };
  }

  /**
   * Validate if a conversion is valid
   * @param dollars - Amount in dollars to validate
   * @returns True if valid, false otherwise
   */
  static isValidDollarAmount(dollars: number): boolean {
    return !isNaN(dollars) && dollars >= 0;
  }

  /**
   * Validate if a MUSO amount is valid
   * @param musos - Amount in MUSO tokens to validate
   * @returns True if valid, false otherwise
   */
  static isValidMussoAmount(musos: number): boolean {
    return !isNaN(musos) && musos >= 0;
  }

  /**
   * Format MUSO amount for display
   * @param musos - Amount in MUSO tokens
   * @param decimals - Number of decimal places to display (default: 2)
   * @returns Formatted string
   */
  static formatMusos(musos: number, decimals: number = 2): string {
    return musos.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  /**
   * Format dollar amount for display
   * @param dollars - Amount in dollars
   * @returns Formatted string with currency symbol
   */
  static formatDollars(dollars: number): string {
    return dollars.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Calculate expected MUSO balance from game balance
   * @param gameBalance - Current game balance in dollars
   * @returns Expected MUSO token balance
   */
  static calculateExpectedMussoBalance(gameBalance: number): number {
    if (!this.isValidDollarAmount(gameBalance)) {
      return 0;
    }
    return this.dollarsToMusos(gameBalance);
  }

  /**
   * Calculate difference between actual and expected MUSO balance
   * @param actualBalance - Actual MUSO balance
   * @param expectedBalance - Expected MUSO balance
   * @returns Difference (positive = need to mint, negative = need to burn)
   */
  static calculateBalanceDifference(actualBalance: number, expectedBalance: number): number {
    return expectedBalance - actualBalance;
  }

  /**
   * Check if sync is needed based on balance difference
   * @param difference - Balance difference
   * @returns True if sync is needed, false otherwise
   */
  static isSyncNeeded(difference: number): boolean {
    return Math.abs(difference) > 0.00000001; // More than 1 smallest unit
  }

  /**
   * Get conversion result with all details
   * @param amount - Amount to convert
   * @param fromCurrency - Source currency ('dollars' or 'musos')
   * @returns Conversion result
   */
  static convert(amount: number, fromCurrency: 'dollars' | 'musos'): ExchangeRateResult {
    let musoAmount: number;
    let dollarAmount: number;

    if (fromCurrency === 'dollars') {
      if (!this.isValidDollarAmount(amount)) {
        throw new Error('Invalid dollar amount');
      }
      musoAmount = this.dollarsToMusos(amount);
      dollarAmount = amount;
    } else {
      if (!this.isValidMussoAmount(amount)) {
        throw new Error('Invalid MUSO amount');
      }
      musoAmount = amount;
      dollarAmount = this.musosToDollars(amount);
    }

    return {
      musoAmount: BigInt(Math.floor(musoAmount * Math.pow(10, 18))),
      dollarAmount,
      rate: this.EXCHANGE_RATE.MUSO_PER_DOLLAR,
    };
  }
}