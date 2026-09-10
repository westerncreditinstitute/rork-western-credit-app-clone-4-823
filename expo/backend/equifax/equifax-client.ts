/**
 * Equifax OneView API Client
 * 
 * Handles OAuth2 authentication and credit report fetching from Equifax sandbox.
 * Parses report data to extract negative accounts for AI Agent analysis.
 * 
 * API Endpoint: https://api.equifax.com/business/oneview/consumer-credit/v1
 * OAuth2 Token Endpoint: https://api.equifax.com/oauth/authorize
 */

import { EquifaxAnalytics } from "@/lib/analytics/equifax-analytics";

interface EquifaxOAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expiry?: number; // When it expires (Date.now() + expires_in * 1000)
}

/**
 * Credit bureau type
 */
export type CreditBureau = "Equifax" | "Experian" | "TransUnion";

/**
 * Represents a single negative trade account from credit bureaus
 */
export interface ParsedNegativeAccount {
  /** Account number from credit bureaus */
  accountNumber: string;
  
  /** Name of creditor/furnisher */
  creditorName: string;
  
  /** Mailing address for dispute letters */
  creditorAddress?: string;
  
  /** Account type: charge-off, collection, late payment, etc. */
  accountType: "charge-off" | "collection" | "late-payment" | "delinquent" | "unknown";
  
  /** Current account status */
  status: string;
  
  /** Delinquency status and days past due */
  delinquency?: string;
  
  /** Balance owed */
  balance?: number;
  
  /** Date account became negative */
  dateReported?: string;
  
  /** Which bureau reported this account */
  bureau: CreditBureau;
  
  /** Raw account data for extended analysis */
  raw?: Record<string, unknown>;
}

/**
 * Bureau-specific credit report data
 */
export interface BureauReport {
  /** Which bureau this data came from */
  bureau: CreditBureau;
  
  /** ISO timestamp when report was fetched */
  fetchedAt: string;
  
  /** Total number of accounts on this bureau's report */
  totalAccounts: number;
  
  /** Number of negative accounts on this bureau's report */
  negativeAccountCount: number;
  
  /** List of negative accounts for this bureau */
  negativeAccounts: ParsedNegativeAccount[];
  
  /** Credit score from this bureau (if available) */
  creditScore?: number;
  
  /** Raw response from bureau API (for debugging) */
  raw?: Record<string, unknown>;
}

/**
 * Multi-bureau credit report data (all 3 bureaus)
 */
export interface ParsedCreditReport {
  /** ISO timestamp when reports were fetched */
  fetchedAt: string;
  
  /** Reports from each bureau */
  bureaus: {
    equifax?: BureauReport;
    experian?: BureauReport;
    transunion?: BureauReport;
  };
  
  /** Combined statistics across all bureaus */
  combined: {
    totalBureaus: number;
    totalAccounts: number;
    totalNegativeAccounts: number;
    averageCreditScore?: number;
  };
  
  /** All negative accounts from all bureaus (for AI Agent analysis) */
  allNegativeAccounts: ParsedNegativeAccount[];
  
  /** Raw API responses (for debugging) */
  raw?: Record<string, unknown>;
}

/**
 * Singleton Equifax client with OAuth2 token caching
 */
class EquifaxClient {
  private static instance: EquifaxClient;
  
  private clientId: string;
  private clientSecret: string;
  private staticAccessToken: string;
  private environment: "sandbox" | "uat" | "production";
  private cachedToken: EquifaxOAuthToken | null = null;
  
  private readonly EQUIFAX_SANDBOX_API = "https://api.sandbox.equifax.com/business/oneview/consumer-credit/v1";
  private readonly EQUIFAX_UAT_API = "https://api.uat.equifax.com/business/oneview/consumer-credit/v1";
  private readonly EQUIFAX_PROD_API = "https://api.equifax.com/business/oneview/consumer-credit/v1";
  private readonly EQUIFAX_OAUTH_URL = "https://api.equifax.com/oauth/v2/token";
  
  private constructor() {
    // Equifax OAuth2 credentials from environment
    this.clientId = process.env.EQUIFAX_CLIENT_ID || "p26PzMCAJN7WOeUqmqE2Fr1AVAzsDpzd";
    this.clientSecret = process.env.EQUIFAX_CLIENT_SECRET || "LNzhev1dqyvLsvHV";
    this.staticAccessToken = process.env.EQUIFAX_STATIC_ACCESS_TOKEN || "kuK2cWmeZ8lAGpqw55XmSbGjBsUi";
    this.environment = (process.env.EQUIFAX_ENVIRONMENT as any) || "sandbox";
    
    console.log("[Equifax] Initialized with environment:", this.environment);
    console.log("[Equifax] Using Client ID:", this.clientId.substring(0, 8) + "...");
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): EquifaxClient {
    if (!EquifaxClient.instance) {
      EquifaxClient.instance = new EquifaxClient();
    }
    return EquifaxClient.instance;
  }
  
  /**
   * Get the appropriate API base URL based on environment
   */
  private getApiBase(): string {
    switch (this.environment) {
      case "uat":
        return this.EQUIFAX_UAT_API;
      case "production":
        return this.EQUIFAX_PROD_API;
      case "sandbox":
      default:
        return this.EQUIFAX_SANDBOX_API;
    }
  }
  
  /**
   * Get valid OAuth2 access token, using cache if available
   */
  async getAccessToken(): Promise<string> {
    // Check if cached token is still valid (with 5-minute buffer)
    if (this.cachedToken && this.cachedToken.expiry && this.cachedToken.expiry > Date.now() + 5 * 60 * 1000) {
      console.log("[Equifax] Using cached OAuth token, expires in", Math.round((this.cachedToken.expiry - Date.now()) / 1000), "seconds");
      return this.cachedToken.access_token;
    }
    
    try {
      // For sandbox/testing, use the static access token directly
      if (this.environment === "sandbox" && this.staticAccessToken) {
        console.log("[Equifax] Using static access token for sandbox environment");
        const token: EquifaxOAuthToken = {
          access_token: this.staticAccessToken,
          token_type: "Bearer",
          expires_in: 3600,
          expiry: Date.now() + 3600 * 1000,
        };
        this.cachedToken = token;
        return token.access_token;
      }
      
      // For production/UAT, perform OAuth2 client credentials flow
      console.log("[Equifax] Exchanging OAuth2 credentials for access token");
      const response = await fetch(this.EQUIFAX_OAUTH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }).toString(),
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error("[Equifax] OAuth2 error:", response.status, error);
        throw new Error(`OAuth2 failed: ${response.status}`);
      }
      
      const data = await response.json();
      const token: EquifaxOAuthToken = {
        access_token: data.access_token,
        token_type: data.token_type || "Bearer",
        expires_in: data.expires_in || 3600,
        expiry: Date.now() + (data.expires_in || 3600) * 1000,
      };
      
      this.cachedToken = token;
      console.log("[Equifax] OAuth2 token obtained, expires in", token.expires_in, "seconds");
      return token.access_token;
    } catch (error) {
      console.error("[Equifax] Failed to obtain access token:", error);
      throw new Error("Failed to authenticate with Equifax API: " + (error instanceof Error ? error.message : String(error)));
    }
  }
  
  /**
   * Fetch consumer credit report from Equifax using OneView API
   * Per Swagger spec: POST /reports/credit-report
   */
  async fetchCreditReport(consumerInfo?: {
    firstName?: string;
    lastName?: string;
    ssn?: string;
    dateOfBirth?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  }): Promise<Record<string, unknown>> {
    try {
      const accessToken = await this.getAccessToken();
      const apiBase = this.getApiBase();
      
      // Build request payload per Swagger spec
      const payload = {
        consumers: {
          name: [
            {
              identifier: "current",
              firstName: consumerInfo?.firstName || "John",
              lastName: consumerInfo?.lastName || "Doe",
            },
          ],
          socialNum: consumerInfo?.ssn ? [
            {
              identifier: "current",
              number: consumerInfo.ssn.replace(/\D/g, ""), // Remove non-digits
            },
          ] : [],
          dateOfBirth: consumerInfo?.dateOfBirth ? this.formatDateOfBirth(consumerInfo.dateOfBirth) : undefined,
          addresses: [
            {
              identifier: "current",
              streetName: consumerInfo?.address || "123 Main St",
              city: consumerInfo?.city || "Anytown",
              state: consumerInfo?.state || "CA",
              zip: consumerInfo?.zip || "00000",
            },
          ],
        },
        customerReferenceIdentifier: `rork-${Date.now()}`,
        customerConfiguration: {
          equifaxUSConsumerCreditReport: {
            pdfComboIndicator: "Y",
            memberNumber: process.env.EQUIFAX_MEMBER_NUMBER || "999XX12345",
            securityCode: process.env.EQUIFAX_SECURITY_CODE || "@U2",
            customerCode: "IAPI",
            multipleReportIndicator: "1",
          },
        },
      };
      
      console.log("[Equifax] Fetching credit report from:", `${apiBase}/reports/credit-report`);
      console.log("[Equifax] Request consumer:", payload.consumers.name[0]);
      
      const response = await fetch(`${apiBase}/reports/credit-report`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[Equifax] API error:", response.status, errorData);
        throw new Error(
          `Equifax API error: ${response.status} ${errorData.message || errorData.error || response.statusText}`
        );
      }
      
      const data = await response.json();
      console.log("[Equifax] Report fetched successfully");
      return data;
    } catch (error) {
      console.error("[Equifax] Failed to fetch credit report:", error);
      throw error;
    }
  }
  
  /**
   * Format date of birth to MMDDYYYY format for Equifax API
   */
  private formatDateOfBirth(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const yyyy = date.getFullYear();
      return `${mm}${dd}${yyyy}`;
    } catch {
      return "01011980"; // Fallback
    }
  }
  
  /**
   * Check if account is negative based on status/delinquency
   */
  private isNegativeAccount(account: Record<string, unknown>): boolean {
    const status = String(account.status || "").toLowerCase();
    const delinquency = String(account.delinquency || "").toLowerCase();
    
    const negativeStatuses = [
      "charged off",
      "collection",
      "collections",
      "delinquent",
      "120+ days past due",
      "90+ days past due",
      "60+ days past due",
      "charge-off",
    ];
    
    return (
      negativeStatuses.some(s => status.includes(s)) ||
      negativeStatuses.some(s => delinquency.includes(s))
    );
  }
  
  /**
   * Map Equifax account type to dispute letter category
   */
  private mapAccountType(
    status: string,
    accountType?: string
  ): ParsedNegativeAccount["accountType"] {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes("charged off") || statusLower.includes("charge-off")) {
      return "charge-off";
    }
    if (statusLower.includes("collection")) {
      return "collection";
    }
    if (
      statusLower.includes("late") ||
      statusLower.includes("30 days") ||
      statusLower.includes("60 days") ||
      statusLower.includes("90 days") ||
      statusLower.includes("120 days")
    ) {
      return "late-payment";
    }
    if (statusLower.includes("delinquent")) {
      return "delinquent";
    }
    
    return "unknown";
  }
  
  /**
   * Fetch consumer credit report from all three bureaus
   * Returns combined multi-bureau report with bureau-specific accounts
   */
  async fetchMultiBureauReport(consumerInfo?: {
    firstName?: string;
    lastName?: string;
    ssn?: string;
    dateOfBirth?: string;
    address?: string;
  }, userId?: string): Promise<ParsedCreditReport> {
    const startTime = Date.now();
    const analytics = EquifaxAnalytics.getInstance();
    
    try {
      // In sandbox/production, fetch from all bureaus
      // For now, we'll call Equifax and simulate the other bureaus
      const equifaxRaw = await this.fetchCreditReport(consumerInfo);
      
      // Parse Equifax data
      const equifaxReport = await this.parseEquifaxReport(equifaxRaw, "Equifax");
      
      // In production, you would call:
      // const experianRaw = await this.fetchExperianReport(consumerInfo);
      // const transunionRaw = await this.fetchTransUnionReport(consumerInfo);
      // For now, mock them for testing
      const experianReport = this.generateMockBureauReport("Experian", consumerInfo);
      const transunionReport = this.generateMockBureauReport("TransUnion", consumerInfo);
      
      // Combine all reports
      const allNegativeAccounts: ParsedNegativeAccount[] = [
        ...equifaxReport.negativeAccounts,
        ...experianReport.negativeAccounts,
        ...transunionReport.negativeAccounts,
      ];
      
      // Calculate combined statistics
      const bureauScores = [
        equifaxReport.creditScore,
        experianReport.creditScore,
        transunionReport.creditScore,
      ].filter((score) => score !== undefined) as number[];
      
      const averageCreditScore =
        bureauScores.length > 0
          ? Math.round(bureauScores.reduce((a, b) => a + b, 0) / bureauScores.length)
          : undefined;
      
      const result: ParsedCreditReport = {
        fetchedAt: new Date().toISOString(),
        bureaus: {
          equifax: equifaxReport,
          experian: experianReport,
          transunion: transunionReport,
        },
        combined: {
          totalBureaus: 3,
          totalAccounts:
            equifaxReport.totalAccounts +
            experianReport.totalAccounts +
            transunionReport.totalAccounts,
          totalNegativeAccounts: allNegativeAccounts.length,
          averageCreditScore,
        },
        allNegativeAccounts,
        raw: { equifax: equifaxRaw },
      };
      
      // Track successful multi-bureau fetch
      analytics.trackFetch(
        "Combined",
        Date.now() - startTime,
        result.combined.totalAccounts,
        result.combined.totalNegativeAccounts,
        userId
      );
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      
      // Track failed fetch
      analytics.trackError(
        "MULTI_BUREAU_FETCH_ERROR",
        errorMsg,
        "Combined",
        userId
      );
      
      console.error("[Equifax] Failed to fetch multi-bureau report:", error);
      throw error;
    }
  }
  
  /**
   * Parse Equifax report with bureau source
   */
  private async parseEquifaxReport(
    rawReport: Record<string, unknown>,
    bureau: CreditBureau = "Equifax"
  ): Promise<BureauReport> {
    const startTime = Date.now();
    const analytics = EquifaxAnalytics.getInstance();
    
    try {
      const creditTrades = this._extractCreditTrades(rawReport);
      
      const negativeAccounts: ParsedNegativeAccount[] = creditTrades
        .filter((account) => this.isNegativeAccount(account))
        .map((account) => ({
          accountNumber: String(account.accountNumber || account.account_number || "N/A"),
          creditorName: String(account.creditorName || account.creditor_name || "Unknown"),
          creditorAddress: String(account.creditorAddress || account.creditor_address || ""),
          accountType: this.mapAccountType(String(account.status || "")),
          status: String(account.status || ""),
          delinquency: account.delinquency ? String(account.delinquency) : undefined,
          balance: typeof account.balance === "number" ? account.balance : undefined,
          dateReported: account.dateReported ? String(account.dateReported) : undefined,
          bureau,
          raw: account as Record<string, unknown>,
        }));
      
      const creditScore = this._extractCreditScore(rawReport);
      
      const result: BureauReport = {
        bureau,
        fetchedAt: new Date().toISOString(),
        totalAccounts: creditTrades.length,
        negativeAccountCount: negativeAccounts.length,
        negativeAccounts,
        creditScore,
        raw: rawReport,
      };
      
      // Track successful parse
      analytics.trackParse(
        bureau as "Equifax" | "Experian" | "TransUnion" | "Combined",
        Date.now() - startTime,
        creditTrades.length,
        negativeAccounts.length
      );
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      
      // Track parse error
      analytics.trackError(
        "PARSE_ERROR",
        errorMsg,
        bureau as "Equifax" | "Experian" | "TransUnion" | "Combined"
      );
      
      console.error(`[Equifax] Failed to parse ${bureau} report:`, error);
      return {
        bureau,
        fetchedAt: new Date().toISOString(),
        totalAccounts: 0,
        negativeAccountCount: 0,
        negativeAccounts: [],
      };
    }
  }
  
  /**
   * Generate mock bureau report for testing/sandbox
   * In production, this would fetch from actual bureau APIs
   */
  private generateMockBureauReport(
    bureau: CreditBureau,
    consumerInfo?: Record<string, unknown>
  ): BureauReport {
    // Generate 1-3 mock negative accounts for each bureau
    const mockNegativeCount = Math.floor(Math.random() * 3) + 1;
    const mockNegativeAccounts: ParsedNegativeAccount[] = [];
    
    const mockCreditors = {
      Equifax: ["Capital One", "Chase Bank", "Bank of America"],
      Experian: ["Discover Card", "American Express", "Wells Fargo"],
      TransUnion: ["Citibank", "Best Buy Credit", "Amazon Credit"],
    };
    
    const mockTypes: Array<ParsedNegativeAccount["accountType"]> = [
      "charge-off",
      "collection",
      "late-payment",
      "delinquent",
    ];
    
    for (let i = 0; i < mockNegativeCount; i++) {
      const creditors = mockCreditors[bureau] || [];
      mockNegativeAccounts.push({
        accountNumber: `${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
        creditorName: creditors[i] || `${bureau} Account ${i + 1}`,
        accountType: mockTypes[i % mockTypes.length],
        status: `${mockTypes[i % mockTypes.length].toUpperCase()}: ${Math.floor(Math.random() * 120) + 30} Days Past Due`,
        delinquency: `${Math.floor(Math.random() * 120) + 30} days past due`,
        balance: Math.floor(Math.random() * 5000) + 500,
        dateReported: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        bureau,
      });
    }
    
    // Generate mock credit score
    const mockScore = Math.floor(Math.random() * 200) + 550;
    
    return {
      bureau,
      fetchedAt: new Date().toISOString(),
      totalAccounts: Math.floor(Math.random() * 10) + 5,
      negativeAccountCount: mockNegativeCount,
      negativeAccounts: mockNegativeAccounts,
      creditScore: mockScore,
    };
  }
  
  /**
   * Parse a single bureau report (legacy method for backwards compatibility)
   * Now delegates to parseEquifaxReport
   */
  async parseReport(rawReport: Record<string, unknown>): Promise<ParsedCreditReport> {
    const bureauReport = await this.parseEquifaxReport(rawReport, "Equifax");
    
    return {
      fetchedAt: bureauReport.fetchedAt,
      bureaus: {
        equifax: bureauReport,
      },
      combined: {
        totalBureaus: 1,
        totalAccounts: bureauReport.totalAccounts,
        totalNegativeAccounts: bureauReport.negativeAccountCount,
        averageCreditScore: bureauReport.creditScore,
      },
      allNegativeAccounts: bureauReport.negativeAccounts,
      raw: bureauReport.raw,
    };
  }
  
  /**
   * Extract credit trades from various Equifax response formats
   */
  private _extractCreditTrades(report: Record<string, unknown>): Record<string, unknown>[] {
    // Try common response structures
    const candidates = [
      report.creditTrades,
      report.credit_trades,
      (report.results as any)?.[0]?.creditTrades,
      (report.results as any)?.[0]?.credit_trades,
      (report.report as any)?.creditTrades,
      (report.report as any)?.credit_trades,
    ];
    
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }
    
    // Fallback: return empty array if no trades found
    console.warn("[Equifax] No credit trades found in report structure");
    return [];
  }
  
  /**
   * Extract credit score from various Equifax response formats
   */
  private _extractCreditScore(report: Record<string, unknown>): number | undefined {
    const candidates = [
      report.creditScore,
      report.credit_score,
      report.score,
      (report.results as any)?.[0]?.creditScore,
      (report.results as any)?.[0]?.credit_score,
      (report.report as any)?.creditScore,
      (report.report as any)?.credit_score,
    ];
    
    for (const candidate of candidates) {
      if (typeof candidate === "number") {
        return candidate;
      }
    }
    
    return undefined;
  }
}

/**
 * Get or create singleton Equifax client instance
 */
export function getEquifaxClient(): EquifaxClient {
  return EquifaxClient.getInstance();
}
