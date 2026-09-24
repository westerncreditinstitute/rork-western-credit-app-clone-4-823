/**
 * tRPC routes for the Equifax **Consumer Data Suite** integration.
 *
 * This replaces the previous (incorrect) OneView *business* API integration.
 * It now drives the two consumer-facing product scopes:
 *
 *   1. Credit Reports    -> POST {host}/personal/consumer-data-suite/v1/creditReport
 *   2. Credit Monitoring -> GET  {host}/personal/consumer-data-suite/v1/creditMonitoring
 *
 * Endpoints:
 *   - equifax.fetchCreditReport:     Fetch + parse the consumer's credit report
 *                                    (session-only storage, no DB persistence).
 *   - equifax.fetchCreditMonitoring: Fetch credit-monitoring alerts for the
 *                                    consumer (new-accounts, inquiries, etc.).
 *   - equifax.validateConnection:    Test Equifax API connectivity + credentials
 *                                    for BOTH product scopes.
 *   - equifax.getAnalyticsDashboard: Performance metrics for Equifax operations.
 *   - equifax.exportAnalytics:       Export analytics metrics as JSON.
 */

import * as z from "zod";
import { createTRPCRouter, protectedProcedure } from "../create-context";
import { TRPCError } from "@trpc/server";
import {
  getEquifaxClient,
  type ParsedCreditReport,
  type ParsedNegativeAccount,
} from "@/backend/equifax/equifax-client";
import { EquifaxAnalytics } from "@/lib/analytics/equifax-analytics";

/**
 * Schema for parsed negative account (AI-readable, with bureau source)
 */
const ParsedNegativeAccountSchema = z.object({
  accountNumber: z.string(),
  creditorName: z.string(),
  creditorAddress: z.string().optional(),
  accountType: z.enum([
    "charge-off",
    "collection",
    "late-payment",
    "delinquent",
    "bankruptcy",
    "public-record",
    "unknown",
  ]),
  status: z.string(),
  delinquency: z.string().optional(),
  balance: z.number().optional(),
  dateReported: z.string().optional(),
  bureau: z.enum(["Equifax", "Experian", "TransUnion"]),
});

/**
 * Schema for the high-level credit summary returned alongside a report.
 * Powers the proper summary report page in the app.
 */
const CreditReportSummarySchema = z.object({
  totalAccounts: z.number(),
  openAccounts: z.number(),
  negativeAccounts: z.number(),
  collections: z.number(),
  publicRecords: z.number(),
  inquiries: z.number(),
  creditScore: z.number().optional(),
  totalBalance: z.number().optional(),
  totalCreditLimit: z.number().optional(),
  creditUtilization: z.number().optional(),
  averageAccountAgeMonths: z.number().optional(),
  lengthOfCreditHistoryMonths: z.number().optional(),
  debtToCreditRatio: z.number().optional(),
});

/**
 * Schema for bureau-specific report
 */
const BureauReportSchema = z.object({
  bureau: z.enum(["Equifax", "Experian", "TransUnion"]),
  fetchedAt: z.string(),
  totalAccounts: z.number(),
  negativeAccountCount: z.number(),
  negativeAccounts: z.array(ParsedNegativeAccountSchema),
  creditScore: z.number().optional(),
  summary: CreditReportSummarySchema.optional(),
});

/**
 * Schema for a single credit-monitoring alert.
 */
const CreditMonitoringAlertSchema = z.object({
  id: z.string(),
  type: z.string(),
  bureau: z.enum(["Equifax", "Experian", "TransUnion"]),
  date: z.string(),
  title: z.string(),
  description: z.string().optional(),
  severity: z.enum(["info", "warning", "critical"]),
});

/**
 * Schema for the credit-monitoring result.
 */
const CreditMonitoringResultSchema = z.object({
  fetchedAt: z.string(),
  alerts: z.array(CreditMonitoringAlertSchema),
  totalAlerts: z.number(),
});

/**
 * Schema for parsed credit report response (multi-bureau)
 */
const ParsedCreditReportSchema = z.object({
  fetchedAt: z.string(),
  bureaus: z.object({
    equifax: BureauReportSchema.optional(),
    experian: BureauReportSchema.optional(),
    transunion: BureauReportSchema.optional(),
  }),
  combined: z.object({
    totalBureaus: z.number(),
    totalAccounts: z.number(),
    totalNegativeAccounts: z.number(),
    averageCreditScore: z.number().optional(),
  }),
  allNegativeAccounts: z.array(ParsedNegativeAccountSchema),
});

/**
 * Error classification for user-friendly messages
 */
type ErrorType =
  | "AUTHENTICATION_ERROR"
  | "INVALID_CONSUMER_DATA"
  | "API_ERROR"
  | "PARSE_ERROR"
  | "UNKNOWN_ERROR";

/**
 * Classify errors for better user messaging
 */
function classifyError(error: unknown): { type: ErrorType; message: string } {
  const errorStr = String(error).toLowerCase();

  if (errorStr.includes("unauthorized") || errorStr.includes("authentication")) {
    return {
      type: "AUTHENTICATION_ERROR",
      message:
        "Failed to authenticate with Equifax. Please check your API credentials.",
    };
  }

  if (errorStr.includes("consumer") || errorStr.includes("data")) {
    return {
      type: "INVALID_CONSUMER_DATA",
      message:
        "Invalid consumer data. Please provide valid name, SSN, and address.",
    };
  }

  if (errorStr.includes("api") || errorStr.includes("equifax")) {
    return {
      type: "API_ERROR",
      message:
        "Equifax API error. The service may be temporarily unavailable. Please try again later.",
    };
  }

  if (errorStr.includes("parse")) {
    return {
      type: "PARSE_ERROR",
      message: "Failed to parse credit report data. Please try again.",
    };
  }

  return {
    type: "UNKNOWN_ERROR",
    message: "An unexpected error occurred. Please try again.",
  };
}

/**
 * tRPC Equifax router
 */
export const equifaxRouter = createTRPCRouter({
  /**
   * Fetch credit report from all three bureaus
   * 
   * ACE-1 tier only. Returns parsed reports with negative accounts from all bureaus.
   * Session-only storage (no DB persistence).
   * 
   * Input:
   *   - forceRefresh: boolean (bypass cache if true)
   *   - consumerInfo: optional consumer details override
   * 
   * Output:
   *   - success: boolean
   *   - report: ParsedCreditReport | null (multi-bureau)
   *   - negativeAccounts: ParsedNegativeAccount[] (all bureaus combined)
   *   - error: string | null
   *   - errorType: ErrorType | null
   */
  fetchCreditReport: protectedProcedure
    .input(
      z.object({
        forceRefresh: z.boolean().default(false),
        multiBureau: z.boolean().default(true),
        userId: z.string().optional(), // Deprecated: userId is extracted from ctx
        consumerInfo: z
          .object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            ssn: z.string().optional(),
            dateOfBirth: z.string().optional(),
            address: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            zip: z.string().optional(),
          })
          .optional(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        report: ParsedCreditReportSchema.optional(),
        negativeAccounts: z.array(ParsedNegativeAccountSchema),
        error: z.string().nullable(),
        errorType: z
          .enum([
            "AUTHENTICATION_ERROR",
            "INVALID_CONSUMER_DATA",
            "API_ERROR",
            "PARSE_ERROR",
            "UNKNOWN_ERROR",
          ])
          .nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      const analytics = EquifaxAnalytics.getInstance();
      const userId = ctx.user.id; // protectedProcedure guarantees ctx.user exists
      
      try {
        console.log("[tRPC] fetchCreditReport called by user:", userId, "multiBureau:", input.multiBureau);

        const equifaxClient = getEquifaxClient();

        // Fetch multi-bureau or single bureau report
        let parsedReport: ParsedCreditReport;
        
        if (input.multiBureau) {
          parsedReport = await equifaxClient.fetchMultiBureauReport(input.consumerInfo, userId);
        } else if (equifaxClient.isDemoMode()) {
          // Single-bureau request while in demo mode: still return mock data
          // instead of attempting (and failing) a live call.
          parsedReport = await equifaxClient.fetchMultiBureauReport(input.consumerInfo, userId);
        } else {
          const rawReport = await equifaxClient.fetchCreditReport(input.consumerInfo);
          parsedReport = await equifaxClient.parseReport(rawReport);
        }

        // Track successful tRPC mutation
        analytics.trackFetch(
          input.multiBureau ? "Combined" : "Equifax",
          Date.now() - startTime,
          parsedReport.combined.totalAccounts,
          parsedReport.combined.totalNegativeAccounts,
          userId
        );

        // Return parsed report (will be stored in EquifaxReportContext on frontend)
        return {
          success: true,
          report: {
            fetchedAt: parsedReport.fetchedAt,
            bureaus: parsedReport.bureaus,
            combined: parsedReport.combined,
            allNegativeAccounts: parsedReport.allNegativeAccounts,
          },
          negativeAccounts: parsedReport.allNegativeAccounts,
          error: null,
          errorType: null,
        };
      } catch (error) {
        const classified = classifyError(error);
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        
        // Track error
        analytics.trackError(
          "tRPC_FETCH_ERROR",
          errorMsg,
          input.multiBureau ? "Combined" : "Equifax",
          userId
        );
        
        console.error("[tRPC] fetchCreditReport error:", classified);

        return {
          success: false,
          report: undefined,
          negativeAccounts: [],
          error: classified.message,
          errorType: classified.type,
        };
      }
    }),

  /**
   * Validate Equifax API connection and credentials
   *
   * Used for diagnostics and testing. Verifies that OAuth tokens can be
   * minted for BOTH Consumer Data Suite product scopes:
   *   - Credit Reports
   *   - Credit Monitoring
   */
  validateConnection: protectedProcedure.query(async ({ ctx }) => {
    try {
      console.log("[tRPC] validateConnection called by user:", ctx.user?.id);

      const equifaxClient = getEquifaxClient();

      if (equifaxClient.isDemoMode()) {
        return {
          success: true,
          connected: true,
          message:
            "Running in DEMO MODE (mock data). Add EQUIFAX_CLIENT_ID and EQUIFAX_CLIENT_SECRET to use live data.",
          scopes: {
            creditReport: false,
            creditMonitoring: false,
          },
        };
      }

      // Mint a token for each product scope (validates OAuth credentials).
      const scopes = {
        creditReport: false,
        creditMonitoring: false,
      };

      try {
        const reportToken = await equifaxClient.getCreditReportToken();
        scopes.creditReport = Boolean(reportToken);
      } catch (scopeError) {
        console.error("[tRPC] validateConnection creditReport scope failed:", scopeError);
      }

      try {
        const monitoringToken = await equifaxClient.getCreditMonitoringToken();
        scopes.creditMonitoring = Boolean(monitoringToken);
      } catch (scopeError) {
        console.error("[tRPC] validateConnection creditMonitoring scope failed:", scopeError);
      }

      const connected = scopes.creditReport && scopes.creditMonitoring;

      if (!connected) {
        throw new Error(
          `Failed to obtain access token(s). creditReport=${scopes.creditReport} creditMonitoring=${scopes.creditMonitoring}`,
        );
      }

      return {
        success: true,
        connected: true,
        message: "Successfully connected to Equifax Consumer Data Suite (both scopes).",
        scopes,
      };
    } catch (error) {
      const classified = classifyError(error);
      console.error("[tRPC] validateConnection error:", classified);

      return {
        success: false,
        connected: false,
        message: classified.message,
        scopes: {
          creditReport: false,
          creditMonitoring: false,
        },
      };
    }
  }),

  /**
   * Fetch credit-monitoring alerts for the consumer.
   *
   * Uses the Credit Monitoring product scope:
   *   GET {host}/personal/consumer-data-suite/v1/creditMonitoring
   *
   * Session-only: alerts are returned to the client and held in
   * EquifaxReportContext; nothing is persisted to the DB.
   */
  fetchCreditMonitoring: protectedProcedure
    .input(
      z.object({
        forceRefresh: z.boolean().default(false),
        consumerInfo: z
          .object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            ssn: z.string().optional(),
            dateOfBirth: z.string().optional(),
            address: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            zip: z.string().optional(),
            consumerId: z.string().optional(),
          })
          .optional(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
        monitoring: CreditMonitoringResultSchema.optional(),
        error: z.string().nullable(),
        errorType: z
          .enum([
            "AUTHENTICATION_ERROR",
            "INVALID_CONSUMER_DATA",
            "API_ERROR",
            "PARSE_ERROR",
            "UNKNOWN_ERROR",
          ])
          .nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      try {
        console.log(
          "[tRPC] fetchCreditMonitoring called by user:",
          userId,
          "forceRefresh:",
          input.forceRefresh,
        );

        const equifaxClient = getEquifaxClient();
        const result = await equifaxClient.getMonitoringAlerts(input.consumerInfo);

        return {
          success: true,
          monitoring: {
            fetchedAt: result.fetchedAt,
            alerts: result.alerts,
            totalAlerts: result.totalAlerts,
          },
          error: null,
          errorType: null,
        };
      } catch (error) {
        const classified = classifyError(error);
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error("[tRPC] fetchCreditMonitoring error:", classified, errorMsg);

        return {
          success: false,
          monitoring: undefined,
          error: classified.message,
          errorType: classified.type,
        };
      }
    }),

  /**
   * Get analytics dashboard data
   * 
   * Returns performance metrics and analytics for all Equifax operations
   */
  getAnalyticsDashboard: protectedProcedure.query(async ({ ctx }) => {
    try {
      const analytics = EquifaxAnalytics.getInstance();
      const dashboard = analytics.getDashboard();
      
      return {
        success: true,
        data: dashboard,
        error: null,
      };
    } catch (error) {
      console.error("[tRPC] getAnalyticsDashboard error:", error);
      
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed to fetch analytics",
      };
    }
  }),

  /**
   * Export analytics metrics as JSON
   * 
   * Returns all metrics as JSON for backup or analysis
   */
  exportAnalytics: protectedProcedure.query(async ({ ctx }) => {
    try {
      const analytics = EquifaxAnalytics.getInstance();
      const exported = analytics.export();
      
      return {
        success: true,
        data: JSON.parse(exported),
        error: null,
      };
    } catch (error) {
      console.error("[tRPC] exportAnalytics error:", error);
      
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed to export analytics",
      };
    }
  }),
});
