import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ExchangeRateService } from './ExchangeRateService';
import type { CurrencyType, PlayerWallet } from '@/types/marketplace';

export interface CurrencyAmount {
  amount: number;
  currency: CurrencyType;
}

export interface ConversionResult {
  success: boolean;
  originalAmount: CurrencyAmount;
  convertedAmount: CurrencyAmount;
  exchangeRate: number;
  fee: number;
  feePercentage: number;
  error?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  amountPaid: CurrencyAmount;
  amountRequired: CurrencyAmount;
  conversionApplied: boolean;
  exchangeRate?: number;
  fee?: number;
  error?: string;
}

interface ExchangeRates {
  credits_to_usd: number;
  usd_to_credits: number;
  muso_to_usd: number;
  usd_to_muso: number;
  credits_to_muso: number;
  muso_to_credits: number;
}

export class CurrencyConversionService {
  private static readonly CONVERSION_FEE_PERCENTAGE = 0.02;
  private static readonly MIN_CONVERSION_FEE = 0.01;
  private static readonly DECIMAL_PLACES = 2;

  private static readonly BASE_EXCHANGE_RATES: ExchangeRates = {
    credits_to_usd: 0.01,
    usd_to_credits: 100,
    muso_to_usd: ExchangeRateService.getExchangeRate().dollarsPerMusso,
    usd_to_muso: ExchangeRateService.getExchangeRate().musoPerDollar,
    credits_to_muso: 1,
    muso_to_credits: 1,
  };

  private static roundAmount(amount: number, decimals: number = this.DECIMAL_PLACES): number {
    const multiplier = Math.pow(10, decimals);
    return Math.round(amount * multiplier) / multiplier;
  }

  static getExchangeRate(from: CurrencyType, to: CurrencyType): number {
    if (from === to) return 1;

    const key = `${from}_to_${to}` as keyof ExchangeRates;
    
    if (key in this.BASE_EXCHANGE_RATES) {
      return this.BASE_EXCHANGE_RATES[key];
    }

    if (from === 'credits' && to === 'muso') {
      return this.BASE_EXCHANGE_RATES.credits_to_usd * this.BASE_EXCHANGE_RATES.usd_to_muso;
    }
    if (from === 'muso' && to === 'credits') {
      return this.BASE_EXCHANGE_RATES.muso_to_usd * this.BASE_EXCHANGE_RATES.usd_to_credits;
    }

    console.error(`Unknown exchange rate: ${from} to ${to}`);
    return 1;
  }

  static calculateConversionFee(amount: number): number {
    const fee = amount * this.CONVERSION_FEE_PERCENTAGE;
    return Math.max(this.MIN_CONVERSION_FEE, this.roundAmount(fee));
  }

  static async convertCurrency(
    amount: CurrencyAmount,
    targetCurrency: CurrencyType,
    includeFee: boolean = true
  ): Promise<ConversionResult> {
    console.log(`[CurrencyConversion] Converting ${amount.amount} ${amount.currency} to ${targetCurrency}`);

    if (amount.amount < 0) {
      return {
        success: false,
        originalAmount: amount,
        convertedAmount: { amount: 0, currency: targetCurrency },
        exchangeRate: 0,
        fee: 0,
        feePercentage: 0,
        error: 'Amount cannot be negative',
      };
    }

    if (amount.currency === targetCurrency) {
      return {
        success: true,
        originalAmount: amount,
        convertedAmount: { amount: amount.amount, currency: targetCurrency },
        exchangeRate: 1,
        fee: 0,
        feePercentage: 0,
      };
    }

    try {
      const exchangeRate = this.getExchangeRate(amount.currency, targetCurrency);
      const rawConverted = amount.amount * exchangeRate;
      
      let fee = 0;
      let convertedAmount = rawConverted;

      if (includeFee) {
        fee = this.calculateConversionFee(rawConverted);
        convertedAmount = rawConverted - fee;
      }

      convertedAmount = this.roundAmount(Math.max(0, convertedAmount));
      fee = this.roundAmount(fee);

      console.log(`[CurrencyConversion] Result: ${convertedAmount} ${targetCurrency} (fee: ${fee}, rate: ${exchangeRate})`);

      return {
        success: true,
        originalAmount: amount,
        convertedAmount: { amount: convertedAmount, currency: targetCurrency },
        exchangeRate,
        fee,
        feePercentage: this.CONVERSION_FEE_PERCENTAGE,
      };
    } catch (error) {
      console.error('[CurrencyConversion] Conversion error:', error);
      return {
        success: false,
        originalAmount: amount,
        convertedAmount: { amount: 0, currency: targetCurrency },
        exchangeRate: 0,
        fee: 0,
        feePercentage: 0,
        error: 'Conversion failed',
      };
    }
  }

  static async getWalletBalance(playerId: string, currency: CurrencyType): Promise<number> {
    if (!isSupabaseConfigured) {
      console.log('[CurrencyConversion] Supabase not configured');
      return 0;
    }

    try {
      const { data, error } = await supabase
        .from('player_wallets')
        .select('credits_balance, muso_balance, usd_balance')
        .eq('player_id', playerId)
        .single();

      if (error || !data) {
        console.error('[CurrencyConversion] Error fetching wallet:', error);
        return 0;
      }

      const balanceKey = `${currency}_balance` as keyof typeof data;
      return (data[balanceKey] as number) || 0;
    } catch (error) {
      console.error('[CurrencyConversion] getWalletBalance error:', error);
      return 0;
    }
  }

  static async getFullWallet(playerId: string): Promise<PlayerWallet | null> {
    if (!isSupabaseConfigured) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('player_wallets')
        .select('*')
        .eq('player_id', playerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: newWallet, error: createError } = await supabase
            .from('player_wallets')
            .insert({
              player_id: playerId,
              credits_balance: 0,
              muso_balance: 0,
              usd_balance: 0,
            })
            .select()
            .single();

          if (createError) {
            console.error('[CurrencyConversion] Error creating wallet:', createError);
            return null;
          }
          return newWallet as PlayerWallet;
        }
        console.error('[CurrencyConversion] Error fetching wallet:', error);
        return null;
      }

      return data as PlayerWallet;
    } catch (error) {
      console.error('[CurrencyConversion] getFullWallet error:', error);
      return null;
    }
  }

  static async processPayment(
    payerId: string,
    payment: CurrencyAmount,
    requiredAmount: CurrencyAmount
  ): Promise<PaymentResult> {
    console.log(`[CurrencyConversion] Processing payment - Payer: ${payerId}, Payment: ${payment.amount} ${payment.currency}, Required: ${requiredAmount.amount} ${requiredAmount.currency}`);

    if (!isSupabaseConfigured) {
      return {
        success: false,
        amountPaid: payment,
        amountRequired: requiredAmount,
        conversionApplied: false,
        error: 'Database not configured',
      };
    }

    try {
      const wallet = await this.getFullWallet(payerId);
      if (!wallet) {
        return {
          success: false,
          amountPaid: payment,
          amountRequired: requiredAmount,
          conversionApplied: false,
          error: 'Wallet not found',
        };
      }

      const paymentBalanceKey = `${payment.currency}_balance` as keyof PlayerWallet;
      const currentPaymentBalance = (wallet[paymentBalanceKey] as number) || 0;

      if (currentPaymentBalance < payment.amount) {
        return {
          success: false,
          amountPaid: payment,
          amountRequired: requiredAmount,
          conversionApplied: false,
          error: `Insufficient ${payment.currency} balance. Available: ${currentPaymentBalance}`,
        };
      }

      let conversionApplied = false;
      let exchangeRate: number | undefined;
      let fee: number | undefined;

      if (payment.currency !== requiredAmount.currency) {
        const conversion = await this.convertCurrency(payment, requiredAmount.currency, true);
        
        if (!conversion.success) {
          return {
            success: false,
            amountPaid: payment,
            amountRequired: requiredAmount,
            conversionApplied: false,
            error: conversion.error || 'Currency conversion failed',
          };
        }

        if (conversion.convertedAmount.amount < requiredAmount.amount) {
          const neededOriginal = this.calculateRequiredOriginalAmount(
            requiredAmount.amount,
            payment.currency,
            requiredAmount.currency
          );
          return {
            success: false,
            amountPaid: payment,
            amountRequired: requiredAmount,
            conversionApplied: false,
            error: `Insufficient funds after conversion. Need ${neededOriginal} ${payment.currency} to cover ${requiredAmount.amount} ${requiredAmount.currency}`,
          };
        }

        conversionApplied = true;
        exchangeRate = conversion.exchangeRate;
        fee = conversion.fee;
      } else {
        if (payment.amount < requiredAmount.amount) {
          return {
            success: false,
            amountPaid: payment,
            amountRequired: requiredAmount,
            conversionApplied: false,
            error: `Insufficient payment. Need ${requiredAmount.amount} ${requiredAmount.currency}`,
          };
        }
      }

      const { error } = await supabase.rpc('process_currency_payment', {
        p_payer_id: payerId,
        p_payment_amount: payment.amount,
        p_payment_currency: payment.currency,
        p_required_amount: requiredAmount.amount,
        p_required_currency: requiredAmount.currency,
        p_conversion_applied: conversionApplied,
        p_exchange_rate: exchangeRate || 1,
        p_fee: fee || 0,
      });

      if (error) {
        console.error('[CurrencyConversion] RPC error:', error);
        
        const updateData: Record<string, number> = {};
        updateData[`${payment.currency}_balance`] = currentPaymentBalance - payment.amount;

        const { error: updateError } = await supabase
          .from('player_wallets')
          .update(updateData)
          .eq('player_id', payerId);

        if (updateError) {
          console.error('[CurrencyConversion] Fallback update error:', updateError);
          return {
            success: false,
            amountPaid: payment,
            amountRequired: requiredAmount,
            conversionApplied,
            exchangeRate,
            fee,
            error: 'Payment processing failed',
          };
        }
      }

      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      console.log(`[CurrencyConversion] Payment successful - Transaction: ${transactionId}`);

      return {
        success: true,
        transactionId,
        amountPaid: payment,
        amountRequired: requiredAmount,
        conversionApplied,
        exchangeRate,
        fee,
      };
    } catch (error) {
      console.error('[CurrencyConversion] processPayment error:', error);
      return {
        success: false,
        amountPaid: payment,
        amountRequired: requiredAmount,
        conversionApplied: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  static calculateRequiredOriginalAmount(
    targetAmount: number,
    fromCurrency: CurrencyType,
    toCurrency: CurrencyType
  ): number {
    if (fromCurrency === toCurrency) return targetAmount;

    const rate = this.getExchangeRate(fromCurrency, toCurrency);
    const withoutFee = targetAmount / rate;
    const withFee = withoutFee / (1 - this.CONVERSION_FEE_PERCENTAGE);
    
    return this.roundAmount(Math.ceil(withFee * 100) / 100);
  }

  static async canAfford(
    playerId: string,
    requiredAmount: CurrencyAmount,
    preferredCurrency?: CurrencyType
  ): Promise<{
    canAfford: boolean;
    bestPaymentOption?: CurrencyAmount;
    allOptions: { currency: CurrencyType; amount: number; available: number; sufficient: boolean }[];
  }> {
    const wallet = await this.getFullWallet(playerId);
    if (!wallet) {
      return { canAfford: false, allOptions: [] };
    }

    const currencies: CurrencyType[] = ['credits', 'muso', 'usd'];
    const options: { currency: CurrencyType; amount: number; available: number; sufficient: boolean }[] = [];

    for (const currency of currencies) {
      const balanceKey = `${currency}_balance` as keyof PlayerWallet;
      const available = (wallet[balanceKey] as number) || 0;
      
      const requiredInCurrency = this.calculateRequiredOriginalAmount(
        requiredAmount.amount,
        currency,
        requiredAmount.currency
      );

      options.push({
        currency,
        amount: requiredInCurrency,
        available,
        sufficient: available >= requiredInCurrency,
      });
    }

    const sufficientOptions = options.filter(o => o.sufficient);
    
    if (sufficientOptions.length === 0) {
      return { canAfford: false, allOptions: options };
    }

    let bestOption = sufficientOptions[0];
    
    if (preferredCurrency) {
      const preferred = sufficientOptions.find(o => o.currency === preferredCurrency);
      if (preferred) {
        bestOption = preferred;
      }
    }

    const sameCurrencyOption = sufficientOptions.find(o => o.currency === requiredAmount.currency);
    if (sameCurrencyOption) {
      bestOption = sameCurrencyOption;
    }

    return {
      canAfford: true,
      bestPaymentOption: { amount: bestOption.amount, currency: bestOption.currency },
      allOptions: options,
    };
  }

  static formatCurrency(amount: CurrencyAmount): string {
    const formatted = amount.amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    switch (amount.currency) {
      case 'usd':
        return `$${formatted}`;
      case 'muso':
        return `${formatted} MUSO`;
      case 'credits':
        return `${formatted} Credits`;
      default:
        return `${formatted} ${amount.currency}`;
    }
  }

  static getCurrencySymbol(currency: CurrencyType): string {
    switch (currency) {
      case 'usd':
        return '$';
      case 'muso':
        return 'Ⓜ';
      case 'credits':
        return '©';
      default:
        return '';
    }
  }

  static getAllExchangeRates(): Record<string, number> {
    const currencies: CurrencyType[] = ['credits', 'muso', 'usd'];
    const rates: Record<string, number> = {};

    for (const from of currencies) {
      for (const to of currencies) {
        if (from !== to) {
          rates[`${from}_to_${to}`] = this.getExchangeRate(from, to);
        }
      }
    }

    return rates;
  }
}

export const currencyConversionService = CurrencyConversionService;
