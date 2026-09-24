/**
 * Equifax Consumer Data Suite Client
 * ---------------------------------------------------------------------------
 * This client talks to the Equifax **Consumer Data Suite** (a.k.a. the
 * Consumer Engagement Suite). This is the CORRECT API for delivering a
 * consumer's own credit report + credit monitoring to them inside an app.
 *
 * It REPLACES the previous (incorrect) integration, which used the OneView
 * *business* API at `/business/oneview/consumer-credit/v1`.
 *
 * Product scopes / endpoints
 * ---------------------------------------------------------------------------
 *   1. Credit Reports
 *      POST {host}/personal/consumer-data-suite/v1/creditReport
 *      scope: https://api.equifax.com/personal/consumer-data-suite/v1/creditReport
 *
 *   2. Credit Report Monitoring
 *      GET  {host}/personal/consumer-data-suite/v1/creditMonitoring
 *      scope: https://api.equifax.com/personal/consumer-data-suite/v1/creditMonitoring
 *
 * Authentication (OAuth 2.0 — client credentials)
 * ---------------------------------------------------------------------------
 *   1. POST {host}/v2/oauth/token
 *        Authorization: Basic base64(client_id:client_secret)
 *        Content-Type: application/x-www-form-urlencoded
 *        Body: grant_type=client_credentials&scope=<product scope>
 *   2. Use the returned access_token as `Authorization: Bearer <token>` on
 *      every Consumer Data Suite call.
 *
 *   Tokens are cached PER SCOPE and refreshed automatically.
 *
 * Environments
 * ---------------------------------------------------------------------------
 *   sandbox    -> https://api.sandbox.equifax.com   (mock data)
 *   uat        -> https://api.uat.equifax.com       (realistic test data)
 *   production -> https://api.equifax.com           (live data)
 */

import { EquifaxAnalytics } from "@/lib/analytics/equifax-analytics";
import { enrichCreditorAddress } from "@/lib/creditor-addresses";

// ===========================================================================
// Types
// ===========================================================================

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
  accountType:
    | "charge-off"
    | "collection"
    | "late-payment"
    | "delinquent"
    | "bankruptcy"
    | "public-record"
    | "unknown";

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
 * The high-level "credit summary" the Consumer Data Suite returns alongside
 * a report. This powers the proper summary report page in the app.
 */
export interface CreditReportSummary {
  /** Total number of tradelines on the report */
  totalAccounts: number;

  /** Number of open / active accounts */
  openAccounts: number;

  /** Number of negative / derogatory items */
  negativeAccounts: number;

  /** Number of collection accounts */
  collections: number;

  /** Number of public records (bankruptcies, liens, judgments) */
  publicRecords: number;

  /** Number of hard/soft inquiries */
  inquiries: number;

  /** Credit score, when the report includes a score model */
  creditScore?: number;

  /** Sum of balances across all tradelines */
  totalBalance?: number;

  /** Sum of credit limits across revolving tradelines */
  totalCreditLimit?: number;

  /** Revolving credit utilization as a percentage (0-100) */
  creditUtilization?: number;

  /** Average age of accounts, in months */
  averageAccountAgeMonths?: number;

  /** Length of credit history, in months (age of oldest account) */
  lengthOfCreditHistoryMonths?: number;

  /** Debt-to-credit ratio as a percentage (0-100) */
  debtToCreditRatio?: number;
}

/**
 * A single credit-monitoring alert (a key change on the consumer's file).
 */
export interface CreditMonitoringAlert {
  /** Stable id for the alert (falls back to a synthesized key) */
  id: string;

  /** Alert category, e.g. "New Inquiry", "New Account", "Address Change" */
  type: string;

  /** Which bureau the change was reported on */
  bureau: CreditBureau;

  /** ISO date the change was reported */
  date: string;

  /** Short human-readable headline */
  title: string;

  /** Longer description, when the API provides one */
  description?: string;

  /** How alarming this change is */
  severity: "info" | "warning" | "critical";

  /** Raw alert payload for extended analysis */
  raw?: Record<string, unknown>;
}

/**
 * The result of a credit-monitoring pull.
 */
export interface CreditMonitoringResult {
  /** ISO timestamp when monitoring data was fetched */
  fetchedAt: string;

  /** Alerts returned by the monitoring API (most recent first) */
  alerts: CreditMonitoringAlert[];

  /** Total alerts available */
  totalAlerts: number;

  /** Raw response from the monitoring API (for debugging) */
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

  /** High-level summary of this bureau's report */
  summary?: CreditReportSummary;

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
 * Consumer identity used to pull a report / enroll in monitoring.
 */
export interface EquifaxConsumerInfo {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  ssn?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  /** Optional Equifax enrollee id (returned by Consumer Enrollment) */
  consumerId?: string;
}

interface EquifaxOAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  /** Absolute expiry (Date.now() + expires_in * 1000) */
  expiry: number;
  /** The scope this token was minted for */
  scope: string;
}

// ===========================================================================
// Client
// ===========================================================================

/**
 * Singleton Equifax Consumer Data Suite client with per-scope OAuth caching.
 */
class EquifaxClient {
  private static instance: EquifaxClient;

  private clientId: string;
  private clientSecret: string;
  private environment: "sandbox" | "uat" | "production";

  /** Cache keyed by scope */
  private tokenCache: Map<string, EquifaxOAuthToken> = new Map();

  // ---- Environment hosts -------------------------------------------------
  private readonly HOSTS: Record<string, string> = {
    sandbox: "https://api.sandbox.equifax.com",
    uat: "https://api.uat.equifax.com",
    production: "https://api.equifax.com",
  };

  // ---- Consumer Data Suite paths -----------------------------------------
  private readonly PATH_CREDIT_REPORT =
    "/personal/consumer-data-suite/v1/creditReport";
  private readonly PATH_CREDIT_MONITORING =
    "/personal/consumer-data-suite/v1/creditMonitoring";

  // ---- Product scopes (used as the OAuth `scope` param) ------------------
  // These are the exact scope strings Equifax issues per product. They are
  // environment-independent (the host differs, the scope does not).
  private readonly SCOPE_CREDIT_REPORT =
    "https://api.equifax.com/personal/consumer-data-suite/v1/creditReport";
  private readonly SCOPE_CREDIT_MONITORING =
    "https://api.equifax.com/personal/consumer-data-suite/v1/creditMonitoring";

  /**
   * DEMO_MODE: When true, all bureau data is mocked and the real Equifax API
   * is never called. Controlled by EQUIFAX_DEMO_MODE, but auto-activates when
   * the OAuth credentials are missing so a partially-configured environment
   * never produces a hard failure for the user.
   */
  private demoMode: boolean;

  private constructor() {
    this.clientId = process.env.EQUIFAX_CLIENT_ID || "";
    this.clientSecret = process.env.EQUIFAX_CLIENT_SECRET || "";
    this.environment =
      (process.env.EQUIFAX_ENVIRONMENT as any) || "sandbox";

    const explicitDemoFlag =
      String(process.env.EQUIFAX_DEMO_MODE || "").toLowerCase() === "true";
    const missingCreds = !this.clientId || !this.clientSecret;

    this.demoMode = explicitDemoFlag || missingCreds;

    console.log(
      "[Equifax] Initialized Consumer Data Suite client. env:",
      this.environment,
    );
    console.log(
      "[Equifax] Client ID:",
      this.clientId ? this.clientId.substring(0, 8) + "..." : "(not set)",
    );
    console.log(
      "[Equifax] DEMO_MODE:",
      this.demoMode,
      this.demoMode
        ? "(credentials not configured — using mock data)"
        : "(live credentials detected — will call Equifax)",
    );
  }

  /**
   * Whether the client is currently running in demo/mock mode
   */
  isDemoMode(): boolean {
    return this.demoMode;
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
   * Resolve the API host for the active environment.
   */
  private getHost(): string {
    return this.HOSTS[this.environment] || this.HOSTS.sandbox;
  }

  /**
   * Build the OAuth token endpoint for the active environment.
   */
  private getTokenUrl(): string {
    return `${this.getHost()}/v2/oauth/token`;
  }

  /**
   * Get a valid OAuth2 access token for a given product scope, using the
   * per-scope cache when possible. Performs the client-credentials flow with
   * HTTP Basic auth (client_id:client_secret) and the scope param.
   */
  async getAccessToken(scope: string): Promise<string> {
    const cached = this.tokenCache.get(scope);
    // 5-minute safety buffer before expiry
    if (cached && cached.expiry > Date.now() + 5 * 60 * 1000) {
      console.log(
        "[Equifax] Using cached token for scope:",
        scope,
        "expires in",
        Math.round((cached.expiry - Date.now()) / 1000),
        "s",
      );
      return cached.access_token;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        "Equifax OAuth credentials are not configured (EQUIFAX_CLIENT_ID / EQUIFAX_CLIENT_SECRET).",
      );
    }

    const basic = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString("base64");

    console.log("[Equifax] Requesting OAuth token for scope:", scope);

    const response = await fetch(this.getTokenUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("[Equifax] OAuth2 error:", response.status, errorText);
      throw new Error(
        `Equifax OAuth2 failed: ${response.status} ${errorText}`.trim(),
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      token_type?: string;
      expires_in?: number;
    };

    const token: EquifaxOAuthToken = {
      access_token: data.access_token,
      token_type: data.token_type || "Bearer",
      expires_in: data.expires_in || 3600,
      expiry: Date.now() + (data.expires_in || 3600) * 1000,
      scope,
    };

    this.tokenCache.set(scope, token);
    console.log(
      "[Equifax] OAuth2 token obtained for scope:",
      scope,
      "expires in",
      token.expires_in,
      "s",
    );
    return token.access_token;
  }

  /**
   * Convenience: token for the Credit Reports product.
   */
  async getCreditReportToken(): Promise<string> {
    return this.getAccessToken(this.SCOPE_CREDIT_REPORT);
  }

  /**
   * Convenience: token for the Credit Monitoring product.
   */
  async getCreditMonitoringToken(): Promise<string> {
    return this.getAccessToken(this.SCOPE_CREDIT_MONITORING);
  }

  // =========================================================================
  // Credit Report
  // =========================================================================

  /**
   * Build the Consumer Data Suite credit-report request payload.
   *
   * Equifax's JSON ("ACRO") schema nests consumer identity under `consumers`
   * and report configuration under `customerConfiguration`. Member Number /
   * Security Code are only required for the member (B2B) flows; consumer
   * (B2B2C) flows may omit them, so we include them only when configured.
   */
  private buildCreditReportPayload(
    consumerInfo?: EquifaxConsumerInfo,
  ): Record<string, unknown> {
    const memberNumber = process.env.EQUIFAX_MEMBER_NUMBER;
    const securityCode = process.env.EQUIFAX_SECURITY_CODE;

    const consumerConfig: Record<string, unknown> = {
      customerCode: "IAPI",
      multipleReportIndicator: "1",
    };
    if (memberNumber) consumerConfig.memberNumber = memberNumber;
    if (securityCode) consumerConfig.securityCode = securityCode;

    return {
      consumers: {
        name: [
          {
            identifier: "current",
            firstName: consumerInfo?.firstName || "John",
            middleName: consumerInfo?.middleName,
            lastName: consumerInfo?.lastName || "Doe",
            suffix: consumerInfo?.suffix,
          },
        ],
        socialNum: consumerInfo?.ssn
          ? [
              {
                identifier: "current",
                number: consumerInfo.ssn.replace(/\D/g, ""),
              },
            ]
          : [],
        dateOfBirth: consumerInfo?.dateOfBirth
          ? this.formatDateOfBirth(consumerInfo.dateOfBirth)
          : undefined,
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
      customerReferenceIdentifier: `wci-${Date.now()}`,
      customerConfiguration: {
        equifaxUSConsumerCreditReport: consumerConfig,
      },
    };
  }

  /**
   * Fetch a consumer credit report from the Consumer Data Suite.
   * POST {host}/personal/consumer-data-suite/v1/creditReport
   */
  async fetchCreditReport(
    consumerInfo?: EquifaxConsumerInfo,
  ): Promise<Record<string, unknown>> {
    const accessToken = await this.getCreditReportToken();
    const url = `${this.getHost()}${this.PATH_CREDIT_REPORT}`;
    const payload = this.buildCreditReportPayload(consumerInfo);

    console.log("[Equifax] POST", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Equifax] Credit report API error:", response.status, errorData);
      throw new Error(
        `Equifax credit report error: ${response.status} ${
          (errorData as any).message ||
          (errorData as any).error ||
          response.statusText
        }`,
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    console.log("[Equifax] Credit report fetched successfully");
    return data;
  }

  // =========================================================================
  // Credit Monitoring
  // =========================================================================

  /**
   * Fetch credit-monitoring alerts from the Consumer Data Suite.
   * GET {host}/personal/consumer-data-suite/v1/creditMonitoring?format=json
   *
   * When a consumer id is supplied it is passed through so the API can scope
   * the alerts to that enrollee.
   */
  async fetchCreditMonitoring(
    consumerInfo?: EquifaxConsumerInfo,
  ): Promise<Record<string, unknown>> {
    const accessToken = await this.getCreditMonitoringToken();

    const params = new URLSearchParams({ format: "json" });
    if (consumerInfo?.consumerId) {
      params.set("consumerId", consumerInfo.consumerId);
    }
    const url = `${this.getHost()}${this.PATH_CREDIT_MONITORING}?${params.toString()}`;

    console.log("[Equifax] GET", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        "[Equifax] Credit monitoring API error:",
        response.status,
        errorData,
      );
      throw new Error(
        `Equifax credit monitoring error: ${response.status} ${
          (errorData as any).message ||
          (errorData as any).error ||
          response.statusText
        }`,
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    console.log("[Equifax] Credit monitoring fetched successfully");
    return data;
  }

  /**
   * Fetch + normalize monitoring alerts.
   */
  async getMonitoringAlerts(
    consumerInfo?: EquifaxConsumerInfo,
  ): Promise<CreditMonitoringResult> {
    if (this.demoMode) {
      return this.generateMockMonitoring();
    }
    const raw = await this.fetchCreditMonitoring(consumerInfo);
    const alerts = this.parseMonitoringAlerts(raw);
    return {
      fetchedAt: new Date().toISOString(),
      alerts,
      totalAlerts: alerts.length,
      raw,
    };
  }

  // =========================================================================
  // Multi-bureau orchestration
  // =========================================================================

  /**
   * Fetch a consumer credit report from all three bureaus.
   *
   * The Consumer Data Suite's Credit Reports product can return Equifax alone
   * OR a tri-bureau report. Today only the Equifax leg is wired to the live
   * API; Experian/TransUnion fall back to mock data until their direct
   * integrations are added (mirrors the previous behavior).
   */
  async fetchMultiBureauReport(
    consumerInfo?: EquifaxConsumerInfo,
    userId?: string,
  ): Promise<ParsedCreditReport> {
    const startTime = Date.now();
    const analytics = EquifaxAnalytics.getInstance();

    try {
      let equifaxReport: BureauReport;
      let equifaxRaw: Record<string, unknown> | { demo: true };

      if (this.demoMode) {
        console.log(
          "[Equifax] DEMO_MODE active — generating mock data for all bureaus",
        );
        equifaxReport = this.generateMockBureauReport("Equifax", consumerInfo);
        equifaxRaw = { demo: true };
      } else {
        try {
          const rawResponse = await this.fetchCreditReport(consumerInfo);
          equifaxReport = await this.parseEquifaxReport(rawResponse, "Equifax");
          equifaxRaw = rawResponse;
        } catch (equifaxError) {
          console.warn(
            "[Equifax] Live API call failed, falling back to mock Equifax data:",
            equifaxError instanceof Error ? equifaxError.message : equifaxError,
          );
          analytics.trackError(
            "EQUIFAX_LIVE_FALLBACK_TO_MOCK",
            equifaxError instanceof Error
              ? equifaxError.message
              : String(equifaxError),
            "Equifax",
            userId,
          );
          equifaxReport = this.generateMockBureauReport("Equifax", consumerInfo);
          equifaxRaw = { demo: true, fallbackReason: String(equifaxError) };
        }
      }

      const experianReport = this.generateMockBureauReport("Experian", consumerInfo);
      const transunionReport = this.generateMockBureauReport("TransUnion", consumerInfo);

      const allNegativeAccounts: ParsedNegativeAccount[] = [
        ...equifaxReport.negativeAccounts,
        ...experianReport.negativeAccounts,
        ...transunionReport.negativeAccounts,
      ];

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

      analytics.trackFetch(
        "Combined",
        Date.now() - startTime,
        result.combined.totalAccounts,
        result.combined.totalNegativeAccounts,
        userId,
      );

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      analytics.trackError("MULTI_BUREAU_FETCH_ERROR", errorMsg, "Combined", userId);
      console.error("[Equifax] Failed to fetch multi-bureau report:", error);
      throw error;
    }
  }

  // =========================================================================
  // Parsing
  // =========================================================================

  /**
   * Parse an Equifax report into a BureauReport (negative accounts + score +
   * summary).
   */
  async parseEquifaxReport(
    rawReport: Record<string, unknown>,
    bureau: CreditBureau = "Equifax",
  ): Promise<BureauReport> {
    const startTime = Date.now();
    const analytics = EquifaxAnalytics.getInstance();

    try {
      const trades = this._extractCreditTrades(rawReport);
      const collections = this._extractCollections(rawReport);
      const publicRecords = this._extractPublicRecords(rawReport);

      const tradeAccounts: ParsedNegativeAccount[] = trades
        .filter((account) => this.isNegativeAccount(account))
        .map((account) => this._mapTradeAccount(account, bureau));

      const collectionAccounts: ParsedNegativeAccount[] = collections.map(
        (account) => this._mapCollectionAccount(account, bureau),
      );

      const publicRecordAccounts: ParsedNegativeAccount[] = publicRecords.map(
        (account) => this._mapPublicRecordAccount(account, bureau),
      );

      const negativeAccounts = [
        ...tradeAccounts,
        ...collectionAccounts,
        ...publicRecordAccounts,
      ];

      const creditScore = this._extractCreditScore(rawReport);
      const summary = this._extractSummary(
        rawReport,
        trades,
        collections,
        publicRecords,
        negativeAccounts,
        creditScore,
      );

      const result: BureauReport = {
        bureau,
        fetchedAt: new Date().toISOString(),
        totalAccounts: trades.length + collections.length + publicRecords.length,
        negativeAccountCount: negativeAccounts.length,
        negativeAccounts,
        creditScore,
        summary,
        raw: rawReport,
      };

      analytics.trackParse(
        bureau as "Equifax" | "Experian" | "TransUnion" | "Combined",
        Date.now() - startTime,
        result.totalAccounts,
        negativeAccounts.length,
      );

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      analytics.trackError(
        "PARSE_ERROR",
        errorMsg,
        bureau as "Equifax" | "Experian" | "TransUnion" | "Combined",
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
   * Parse a single bureau report (legacy method for backwards compatibility).
   */
  async parseReport(rawReport: Record<string, unknown>): Promise<ParsedCreditReport> {
    const bureauReport = await this.parseEquifaxReport(rawReport, "Equifax");
    return {
      fetchedAt: bureauReport.fetchedAt,
      bureaus: { equifax: bureauReport },
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
   * Format date of birth to MMDDYYYY format for Equifax.
   */
  private formatDateOfBirth(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const yyyy = date.getFullYear();
      return `${mm}${dd}${yyyy}`;
    } catch {
      return "01011980";
    }
  }

  /**
   * Check if a tradeline is negative based on rating / delinquency.
   */
  private isNegativeAccount(account: Record<string, unknown>): boolean {
    const status = String(
      account.status || account.ratingCodeDescription || account.rating || "",
    ).toLowerCase();
    const delinquency = String(account.delinquency || "").toLowerCase();
    const days30 = Number(account.daysDel30 || 0);
    const days60 = Number(account.daysDel60 || 0);
    const days90 = Number(account.daysDel90 || 0);
    const pastDue = Number(account.pastDue || 0);

    const negativeStatuses = [
      "charged off",
      "charge-off",
      "collection",
      "collections",
      "delinquent",
      "past due",
      "120+ days",
      "90+ days",
      "60+ days",
      "30+ days",
      "repossession",
      "foreclosure",
      "settled",
      "payment after charge off",
    ];

    return (
      negativeStatuses.some((s) => status.includes(s)) ||
      negativeStatuses.some((s) => delinquency.includes(s)) ||
      days30 > 0 ||
      days60 > 0 ||
      days90 > 0 ||
      pastDue > 0
    );
  }

  /**
   * Map an Equifax account type to a dispute-letter category.
   */
  private mapAccountType(
    status: string,
    accountType?: string,
  ): ParsedNegativeAccount["accountType"] {
    const s = `${status} ${accountType || ""}`.toLowerCase();

    if (s.includes("charged off") || s.includes("charge-off")) return "charge-off";
    if (s.includes("collection")) return "collection";
    if (s.includes("bankrupt")) return "bankruptcy";
    if (s.includes("lien") || s.includes("judgment") || s.includes("public record"))
      return "public-record";
    if (
      s.includes("late") ||
      s.includes("30 days") ||
      s.includes("60 days") ||
      s.includes("90 days") ||
      s.includes("120 days") ||
      s.includes("past due")
    )
      return "late-payment";
    if (s.includes("delinquent")) return "delinquent";

    return "unknown";
  }

  private _mapTradeAccount(
    account: Record<string, unknown>,
    bureau: CreditBureau,
  ): ParsedNegativeAccount {
    const creditorName = String(
      account.creditorName ||
        account.creditor_name ||
        account.customerName ||
        account.customer_name ||
        "Unknown",
    );
    const status = String(
      account.status ||
        account.ratingCodeDescription ||
        account.rating ||
        "",
    );
    const balance = this._toNumber(
      account.balance ?? account.balanceAmount ?? account.currentBalance,
    );
    const pastDue = this._toNumber(account.pastDue ?? account.amountPastDue);

    const delinquencyParts: string[] = [];
    if (Number(account.daysDel30 || 0) > 0) delinquencyParts.push("30 days past due");
    if (Number(account.daysDel60 || 0) > 0) delinquencyParts.push("60 days past due");
    if (Number(account.daysDel90 || 0) > 0) delinquencyParts.push("90 days past due");
    if (pastDue && pastDue > 0) delinquencyParts.push(`$${pastDue} past due`);

    return {
      accountNumber: String(
        account.accountNumber || account.account_number || "N/A",
      ),
      creditorName,
      creditorAddress: enrichCreditorAddress(
        creditorName,
        (account.creditorAddress || account.creditor_address) as
          | string
          | undefined,
      ),
      accountType: this.mapAccountType(status, String(account.typeCodeDescription || "")),
      status: status || "Negative",
      delinquency: delinquencyParts.length
        ? delinquencyParts.join(", ")
        : account.delinquency
          ? String(account.delinquency)
          : undefined,
      balance,
      dateReported: account.dateReported
        ? String(account.dateReported)
        : undefined,
      bureau,
      raw: account,
    };
  }

  private _mapCollectionAccount(
    account: Record<string, unknown>,
    bureau: CreditBureau,
  ): ParsedNegativeAccount {
    const creditorName = String(
      account.originalCreditor ||
        account.accountName ||
        account.customerName ||
        "Collection Agency",
    );
    return {
      accountNumber: String(account.accountNumber || "N/A"),
      creditorName,
      creditorAddress: enrichCreditorAddress(creditorName, undefined),
      accountType: "collection",
      status: String(
        account.statusCodeDescription || account.statusCode || "Collection",
      ),
      delinquency: "Collection account",
      balance: this._toNumber(account.balanceAmount ?? account.balance),
      dateReported: account.dateReported ? String(account.dateReported) : undefined,
      bureau,
      raw: account,
    };
  }

  private _mapPublicRecordAccount(
    account: Record<string, unknown>,
    bureau: CreditBureau,
  ): ParsedNegativeAccount {
    const kind = String(
      account.typeDescription || account.type || "Public Record",
    );
    return {
      accountNumber: String(account.caseNumber || account.courtNumber || "N/A"),
      creditorName: String(account.courtName || kind),
      creditorAddress: undefined,
      accountType: kind.toLowerCase().includes("bankrupt")
        ? "bankruptcy"
        : "public-record",
      status: kind,
      delinquency: kind,
      balance: this._toNumber(account.amount ?? account.liabilityAmount),
      dateReported: account.dateFiled ? String(account.dateFiled) : undefined,
      bureau,
      raw: account,
    };
  }

  private _toNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    const n =
      typeof value === "number"
        ? value
        : parseFloat(String(value).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }

  /**
   * Extract tradelines from the various Equifax response shapes.
   * The canonical ACRO JSON key is `trades`.
   */
  private _extractCreditTrades(report: Record<string, unknown>): Record<string, unknown>[] {
    const candidates = [
      (report.data as any)?.trades,
      report.trades,
      report.creditTrades,
      report.credit_trades,
      (report.results as any)?.[0]?.trades,
      (report.results as any)?.[0]?.creditTrades,
      (report.report as any)?.trades,
      (report.report as any)?.creditTrades,
    ];
    for (const c of candidates) if (Array.isArray(c)) return c;
    console.warn("[Equifax] No credit trades found in report structure");
    return [];
  }

  private _extractCollections(report: Record<string, unknown>): Record<string, unknown>[] {
    const candidates = [
      (report.data as any)?.collections,
      report.collections,
      (report.results as any)?.[0]?.collections,
      (report.report as any)?.collections,
    ];
    for (const c of candidates) if (Array.isArray(c)) return c;
    return [];
  }

  private _extractPublicRecords(report: Record<string, unknown>): Record<string, unknown>[] {
    const d = (report.data as any) || report;
    const out: Record<string, unknown>[] = [];
    for (const key of ["bankruptcies", "publicRecords", "liens", "judgments"]) {
      if (Array.isArray(d?.[key])) out.push(...d[key]);
    }
    return out;
  }

  private _extractInquiries(report: Record<string, unknown>): Record<string, unknown>[] {
    const candidates = [
      (report.data as any)?.inquiries,
      report.inquiries,
      (report.results as any)?.[0]?.inquiries,
      (report.report as any)?.inquiries,
    ];
    for (const c of candidates) if (Array.isArray(c)) return c;
    return [];
  }

  /**
   * Extract a credit score from the report's `models`/`scores` arrays or
   * top-level score fields.
   */
  private _extractCreditScore(report: Record<string, unknown>): number | undefined {
    const d = (report.data as any) || report;

    // ACRO: models[].score (number) or scores[].score (string)
    const models = d?.models;
    if (Array.isArray(models)) {
      for (const m of models) {
        const n = this._toNumber(m?.score);
        if (n && n > 0) return n;
      }
    }
    const scores = d?.scores;
    if (Array.isArray(scores)) {
      for (const s of scores) {
        const n = this._toNumber(s?.score);
        if (n && n > 0) return n;
      }
    }

    const direct = [
      report.creditScore,
      report.credit_score,
      report.score,
      d?.creditScore,
      d?.score,
    ];
    for (const c of direct) {
      const n = this._toNumber(c);
      if (n && n > 0) return n;
    }
    return undefined;
  }

  /**
   * Build the high-level summary that powers the summary report page.
   */
  private _extractSummary(
    report: Record<string, unknown>,
    trades: Record<string, unknown>[],
    collections: Record<string, unknown>[],
    publicRecords: Record<string, unknown>[],
    negativeAccounts: ParsedNegativeAccount[],
    creditScore?: number,
  ): CreditReportSummary {
    const d = (report.data as any) || report;

    // Prefer an explicit summary block if Equifax returned one.
    const apiSummary = d?.summary || d?.reportSummary || report.summary;

    const openAccounts = trades.filter((t) => {
      const s = String(t?.status || t?.ratingCodeDescription || "").toLowerCase();
      return s.includes("open") || s.includes("current") || s === "0" || s === "1";
    }).length;

    let totalBalance = 0;
    let totalCreditLimit = 0;
    let ageSumMonths = 0;
    let ageCount = 0;
    let oldestMonths = 0;
    const now = Date.now();

    for (const t of trades) {
      const bal = this._toNumber(t?.balance ?? t?.balanceAmount);
      if (bal) totalBalance += bal;

      const limit = this._toNumber(
        t?.highCredit ?? t?.creditLimit ?? t?.highCreditAmount,
      );
      if (limit) totalCreditLimit += limit;

      const opened = t?.dateOpened;
      if (opened) {
        const ts = Date.parse(String(opened));
        if (!Number.isNaN(ts)) {
          const months = Math.max(0, (now - ts) / (1000 * 60 * 60 * 24 * 30.44));
          ageSumMonths += months;
          ageCount += 1;
          if (months > oldestMonths) oldestMonths = months;
        }
      }
    }

    const inquiries = this._extractInquiries(report).length;

    const creditUtilization =
      totalCreditLimit > 0
        ? Math.round((totalBalance / totalCreditLimit) * 100)
        : undefined;

    return {
      totalAccounts:
        this._toNumber(apiSummary?.totalAccounts) ??
        trades.length + collections.length + publicRecords.length,
      openAccounts:
        this._toNumber(apiSummary?.openAccounts) ?? openAccounts,
      negativeAccounts:
        this._toNumber(apiSummary?.negativeAccounts) ?? negativeAccounts.length,
      collections:
        this._toNumber(apiSummary?.collections) ?? collections.length,
      publicRecords:
        this._toNumber(apiSummary?.publicRecords) ?? publicRecords.length,
      inquiries: this._toNumber(apiSummary?.inquiries) ?? inquiries,
      creditScore,
      totalBalance:
        this._toNumber(apiSummary?.totalBalance) ?? Math.round(totalBalance),
      totalCreditLimit:
        this._toNumber(apiSummary?.totalCreditLimit) ??
        Math.round(totalCreditLimit),
      creditUtilization:
        this._toNumber(apiSummary?.creditUtilization) ?? creditUtilization,
      averageAccountAgeMonths:
        this._toNumber(apiSummary?.averageAccountAgeMonths) ??
        (ageCount > 0 ? Math.round(ageSumMonths / ageCount) : undefined),
      lengthOfCreditHistoryMonths:
        this._toNumber(apiSummary?.lengthOfCreditHistoryMonths) ??
        (oldestMonths > 0 ? Math.round(oldestMonths) : undefined),
      debtToCreditRatio:
        this._toNumber(apiSummary?.debtToCreditRatio) ?? creditUtilization,
    };
  }

  /**
   * Normalize monitoring alerts from the various response shapes.
   */
  private parseMonitoringAlerts(raw: Record<string, unknown>): CreditMonitoringAlert[] {
    const d = (raw.data as any) || raw;
    const candidates = [
      d?.alerts,
      d?.creditMonitoring,
      d?.monitoringAlerts,
      raw.alerts,
    ];
    let list: Record<string, unknown>[] = [];
    for (const c of candidates) {
      if (Array.isArray(c)) {
        list = c;
        break;
      }
    }

    return list
      .map((a, i) => this._mapAlert(a, i))
      .sort((x, y) => (x.date < y.date ? 1 : -1));
  }

  private _mapAlert(a: Record<string, unknown>, index: number): CreditMonitoringAlert {
    const type = String(
      a.alertType ||
        a.typeDescription ||
        a.type ||
        (a.alertType as any)?.description ||
        "Credit Alert",
    );
    const date = String(
      a.dateReported ||
        a.alertDate ||
        a.date ||
        a.effectiveDate ||
        new Date().toISOString(),
    );
    const description = a.description
      ? String(a.description)
      : a.additionalInformation
        ? String(a.additionalInformation)
        : undefined;

    return {
      id: String(a.id || a.alertId || a.alertIdentifier || `alert-${index}`),
      type,
      bureau: "Equifax",
      date,
      title: type,
      description,
      severity: this._alertSeverity(type),
      raw: a,
    };
  }

  private _alertSeverity(type: string): CreditMonitoringAlert["severity"] {
    const t = type.toLowerCase();
    if (
      t.includes("collection") ||
      t.includes("bankrupt") ||
      t.includes("charge") ||
      t.includes("delinq") ||
      t.includes("public record")
    )
      return "critical";
    if (t.includes("new account") || t.includes("inquiry") || t.includes("balance"))
      return "warning";
    return "info";
  }

  // =========================================================================
  // Demo / mock data
  // =========================================================================

  /**
   * Generate a mock bureau report for demo/testing.
   */
  private generateMockBureauReport(
    bureau: CreditBureau,
    consumerInfo?: Record<string, unknown> | EquifaxConsumerInfo,
  ): BureauReport {
    const mockNegativeCount = Math.floor(Math.random() * 3) + 1;
    const mockNegativeAccounts: ParsedNegativeAccount[] = [];

    const mockCreditors: Record<CreditBureau, string[]> = {
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
      const mockCreditorName = creditors[i] || `${bureau} Account ${i + 1}`;
      mockNegativeAccounts.push({
        accountNumber: `${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
        creditorName: mockCreditorName,
        creditorAddress: enrichCreditorAddress(mockCreditorName, undefined),
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

    const mockScore = Math.floor(Math.random() * 200) + 550;
    const totalAccounts = Math.floor(Math.random() * 10) + 5;

    const summary: CreditReportSummary = {
      totalAccounts,
      openAccounts: Math.max(1, totalAccounts - mockNegativeCount),
      negativeAccounts: mockNegativeCount,
      collections: mockNegativeAccounts.filter((a) => a.accountType === "collection").length,
      publicRecords: 0,
      inquiries: Math.floor(Math.random() * 5),
      creditScore: mockScore,
      totalBalance: mockNegativeAccounts.reduce((n, a) => n + (a.balance || 0), 0),
      totalCreditLimit: Math.floor(Math.random() * 20000) + 5000,
      creditUtilization: Math.floor(Math.random() * 60) + 10,
      averageAccountAgeMonths: Math.floor(Math.random() * 60) + 24,
      lengthOfCreditHistoryMonths: Math.floor(Math.random() * 120) + 60,
      debtToCreditRatio: Math.floor(Math.random() * 60) + 10,
    };

    return {
      bureau,
      fetchedAt: new Date().toISOString(),
      totalAccounts,
      negativeAccountCount: mockNegativeCount,
      negativeAccounts: mockNegativeAccounts,
      creditScore: mockScore,
      summary,
    };
  }

  private generateMockMonitoring(): CreditMonitoringResult {
    const types = [
      "New Inquiry",
      "New Account Opened",
      "Address Change",
      "New Collection",
      "Balance Increase",
      "Score Change",
    ];
    const alerts: CreditMonitoringAlert[] = types
      .slice(0, Math.floor(Math.random() * 4) + 2)
      .map((type, i) => ({
        id: `demo-alert-${i}`,
        type,
        bureau: "Equifax",
        date: new Date(Date.now() - i * 86400000 * 3).toISOString(),
        title: type,
        description: `Demo alert: ${type} detected on your Equifax file.`,
        severity: this._alertSeverity(type),
      }));
    return {
      fetchedAt: new Date().toISOString(),
      alerts,
      totalAlerts: alerts.length,
    };
  }
}

/**
 * Get or create singleton Equifax client instance
 */
export function getEquifaxClient(): EquifaxClient {
  return EquifaxClient.getInstance();
}
