import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { supabase } from "@/lib/supabase";

const activityLogSchema = z.object({
  userId: z.string(),
  sessionId: z.string().optional(),
  activityType: z.string(),
  title: z.string(),
  description: z.string().optional(),
  metadata: z.any().optional(),
  amount: z.number().optional(),
  previousValue: z.string().optional(),
  newValue: z.string().optional(),
  platform: z.enum(['ios', 'android', 'web', 'unknown']).optional(),
  appVersion: z.string().optional(),
  isDemoMode: z.boolean().default(false),
});

const transactionSchema = z.object({
  userId: z.string(),
  transactionType: z.string(),
  category: z.string().optional(),
  amount: z.number(),
  isDebit: z.boolean(),
  description: z.string(),
  fromAccount: z.string().optional(),
  toAccount: z.string().optional(),
  accountBalanceAfter: z.number().optional(),
  relatedExpenseId: z.string().optional(),
  relatedExpenseName: z.string().optional(),
  relatedAccountId: z.string().optional(),
  relatedPropertyId: z.string().optional(),
  relatedVehicleId: z.string().optional(),
  paymentMethod: z.string().optional(),
  creditCardId: z.string().optional(),
  creditCardName: z.string().optional(),
  notes: z.string().optional(),
  tokenAmount: z.number().optional(),
  tokenBalanceAfter: z.number().optional(),
  tokenTransactionType: z.enum(['mint', 'burn', 'transfer']).optional(),
  metadata: z.any().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceId: z.string().optional(),
  gameMonth: z.number().optional(),
  gameDate: z.number().optional(),
  isDemoMode: z.boolean().default(false),
});

const realEstateApplicationSchema = z.object({
  userId: z.string(),
  applicationType: z.enum(['rental', 'purchase', 'escrow']),
  propertyId: z.string().optional(),
  propertyName: z.string(),
  propertyAddress: z.string().optional(),
  propertyType: z.string().optional(),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  applicantName: z.string(),
  currentAddress: z.string().optional(),
  currentEmployer: z.string().optional(),
  employmentStatus: z.string().optional(),
  monthlyIncome: z.number().optional(),
  annualIncome: z.number().optional(),
  bankAccountBalance: z.number().optional(),
  savingsBalance: z.number().optional(),
  creditScore: z.number().optional(),
  totalDebt: z.number().optional(),
  debtToIncomeRatio: z.number().optional(),
  monthlyRent: z.number().optional(),
  purchasePrice: z.number().optional(),
  downPayment: z.number().optional(),
  securityDeposit: z.number().optional(),
  status: z.string().optional(),
  termsAccepted: z.boolean().optional(),
  backgroundCheckConsent: z.boolean().optional(),
  creditCheckConsent: z.boolean().optional(),
  leaseStartDate: z.string().optional(),
  leaseEndDate: z.string().optional(),
  leaseTermMonths: z.number().optional(),
  roommates: z.array(z.any()).optional(),
  references: z.array(z.any()).optional(),
  documents: z.array(z.any()).optional(),
  notes: z.string().optional(),
  metadata: z.any().optional(),
  isDemoMode: z.boolean().default(false),
});

const creditScoreHistorySchema = z.object({
  userId: z.string(),
  experianScore: z.number(),
  equifaxScore: z.number(),
  transunionScore: z.number(),
  compositeScore: z.number(),
  changeReason: z.string().optional(),
  previousComposite: z.number().optional(),
  scoreChange: z.number().optional(),
  paymentHistoryFactor: z.number().optional(),
  creditUtilizationFactor: z.number().optional(),
  creditAgeFactor: z.number().optional(),
  creditMixFactor: z.number().optional(),
  newCreditFactor: z.number().optional(),
  gameMonth: z.number().optional(),
  gameDate: z.number().optional(),
  isDemoMode: z.boolean().default(false),
});

const gameSessionSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  startingCreditScore: z.number().optional(),
  startingNetWorth: z.number().optional(),
  platform: z.string().optional(),
  appVersion: z.string().optional(),
  deviceInfo: z.any().optional(),
  isDemoMode: z.boolean().default(false),
});

const propertyBudgetRecordSchema = z.object({
  userId: z.string(),
  propertyId: z.string().optional(),
  propertyName: z.string().optional(),
  role: z.enum(['owner', 'renter', 'applicant', 'buyer', 'seller']),
  transactionId: z.string().optional(),
  applicationId: z.string().optional(),
  amount: z.number(),
  transactionType: z.string(),
  description: z.string().optional(),
  counterpartyUserId: z.string().optional(),
  counterpartyName: z.string().optional(),
  counterpartyRole: z.string().optional(),
  isDemoMode: z.boolean().default(false),
});

export const activityTrackingRouter = createTRPCRouter({
  logActivity: publicProcedure
    .input(activityLogSchema)
    .mutation(async ({ input }) => {
      console.log('[ActivityTracking] Logging activity for user:', input.userId, 'type:', input.activityType);
      
      try {
        const { data, error } = await supabase
          .from('user_activity_log')
          .insert({
            user_id: input.userId,
            session_id: input.sessionId,
            activity_type: input.activityType,
            title: input.title,
            description: input.description,
            metadata: input.metadata || {},
            amount: input.amount,
            previous_value: input.previousValue,
            new_value: input.newValue,
            platform: input.platform || 'unknown',
            app_version: input.appVersion,
            is_demo_mode: input.isDemoMode,
          })
          .select()
          .single();
        
        if (error) {
          console.error('[ActivityTracking] Error logging activity:', error);
          throw new Error(`Failed to log activity: ${error.message}`);
        }
        
        console.log('[ActivityTracking] Successfully logged activity:', data.id);
        return { success: true, id: data.id };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[ActivityTracking] Critical error:', errorMessage);
        throw new Error(`Failed to log activity: ${errorMessage}`);
      }
    }),

  logActivitiesBatch: publicProcedure
    .input(z.object({
      activities: z.array(activityLogSchema),
    }))
    .mutation(async ({ input }) => {
      console.log('[ActivityTracking] Batch logging', input.activities.length, 'activities');
      
      try {
        const records = input.activities.map(activity => ({
          user_id: activity.userId,
          session_id: activity.sessionId,
          activity_type: activity.activityType,
          title: activity.title,
          description: activity.description,
          metadata: activity.metadata || {},
          amount: activity.amount,
          previous_value: activity.previousValue,
          new_value: activity.newValue,
          platform: activity.platform || 'unknown',
          app_version: activity.appVersion,
          is_demo_mode: activity.isDemoMode,
        }));

        const { data, error } = await supabase
          .from('user_activity_log')
          .insert(records)
          .select();
        
        if (error) {
          console.error('[ActivityTracking] Error batch logging activities:', error);
          throw new Error(`Failed to batch log activities: ${error.message}`);
        }
        
        console.log('[ActivityTracking] Successfully batch logged', data.length, 'activities');
        return { success: true, count: data.length };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[ActivityTracking] Critical batch error:', errorMessage);
        throw new Error(`Failed to batch log activities: ${errorMessage}`);
      }
    }),

  recordTransaction: publicProcedure
    .input(transactionSchema)
    .mutation(async ({ input }) => {
      console.log('[ActivityTracking] Recording transaction for user:', input.userId, 'type:', input.transactionType);
      
      try {
        const { data, error } = await supabase
          .from('transaction_history')
          .insert({
            user_id: input.userId,
            transaction_type: input.transactionType,
            category: input.category,
            amount: input.amount,
            is_debit: input.isDebit,
            description: input.description,
            from_account: input.fromAccount,
            to_account: input.toAccount,
            account_balance_after: input.accountBalanceAfter,
            related_expense_id: input.relatedExpenseId,
            related_expense_name: input.relatedExpenseName,
            related_account_id: input.relatedAccountId,
            related_property_id: input.relatedPropertyId,
            related_vehicle_id: input.relatedVehicleId,
            payment_method: input.paymentMethod,
            credit_card_id: input.creditCardId,
            credit_card_name: input.creditCardName,
            notes: input.notes,
            token_amount: input.tokenAmount,
            token_balance_after: input.tokenBalanceAfter,
            token_transaction_type: input.tokenTransactionType,
            metadata: input.metadata || {},
            is_recurring: input.isRecurring || false,
            recurrence_id: input.recurrenceId,
            game_month: input.gameMonth,
            game_date: input.gameDate,
            is_demo_mode: input.isDemoMode,
          })
          .select()
          .single();
        
        if (error) {
          console.error('[ActivityTracking] Error recording transaction:', error);
          throw new Error(`Failed to record transaction: ${error.message}`);
        }
        
        console.log('[ActivityTracking] Successfully recorded transaction:', data.id);
        return { success: true, id: data.id };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[ActivityTracking] Critical transaction error:', errorMessage);
        throw new Error(`Failed to record transaction: ${errorMessage}`);
      }
    }),

  submitRealEstateApplication: publicProcedure
    .input(realEstateApplicationSchema)
    .mutation(async ({ input }) => {
      console.log('[ActivityTracking] Submitting real estate application for user:', input.userId, 'type:', input.applicationType);
      
      try {
        const { data, error } = await supabase
          .from('real_estate_applications')
          .insert({
            user_id: input.userId,
            application_type: input.applicationType,
            property_id: input.propertyId,
            property_name: input.propertyName,
            property_address: input.propertyAddress,
            property_type: input.propertyType,
            city: input.city,
            neighborhood: input.neighborhood,
            applicant_name: input.applicantName,
            current_address: input.currentAddress,
            current_employer: input.currentEmployer,
            employment_status: input.employmentStatus,
            monthly_income: input.monthlyIncome,
            annual_income: input.annualIncome,
            bank_account_balance: input.bankAccountBalance,
            savings_balance: input.savingsBalance,
            credit_score: input.creditScore,
            total_debt: input.totalDebt,
            debt_to_income_ratio: input.debtToIncomeRatio,
            monthly_rent: input.monthlyRent,
            purchase_price: input.purchasePrice,
            down_payment: input.downPayment,
            security_deposit: input.securityDeposit,
            status: input.status || 'pending',
            terms_accepted: input.termsAccepted || false,
            background_check_consent: input.backgroundCheckConsent || false,
            credit_check_consent: input.creditCheckConsent || false,
            lease_start_date: input.leaseStartDate,
            lease_end_date: input.leaseEndDate,
            lease_term_months: input.leaseTermMonths,
            roommates: input.roommates || [],
            references: input.references || [],
            documents: input.documents || [],
            notes: input.notes,
            metadata: input.metadata || {},
            is_demo_mode: input.isDemoMode,
          })
          .select()
          .single();
        
        if (error) {
          console.error('[ActivityTracking] Error submitting application:', error);
          throw new Error(`Failed to submit application: ${error.message}`);
        }
        
        console.log('[ActivityTracking] Successfully submitted application:', data.id);
        return { success: true, id: data.id, application: data };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[ActivityTracking] Critical application error:', errorMessage);
        throw new Error(`Failed to submit application: ${errorMessage}`);
      }
    }),

  updateApplicationStatus: publicProcedure
    .input(z.object({
      applicationId: z.string(),
      status: z.string(),
      denialReason: z.string().optional(),
      approvalConditions: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log('[ActivityTracking] Updating application status:', input.applicationId, 'to:', input.status);
      
      try {
        const updateData: Record<string, unknown> = {
          status: input.status,
          updated_at: new Date().toISOString(),
        };
        
        if (input.status === 'approved' || input.status === 'denied') {
          updateData.decision_date = new Date().toISOString();
          updateData.reviewed_at = new Date().toISOString();
        }
        
        if (input.denialReason) {
          updateData.denial_reason = input.denialReason;
        }
        
        if (input.approvalConditions) {
          updateData.approval_conditions = input.approvalConditions;
        }

        const { data, error } = await supabase
          .from('real_estate_applications')
          .update(updateData)
          .eq('id', input.applicationId)
          .select()
          .single();
        
        if (error) {
          console.error('[ActivityTracking] Error updating application:', error);
          throw new Error(`Failed to update application: ${error.message}`);
        }
        
        return { success: true, application: data };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[ActivityTracking] Critical update error:', errorMessage);
        throw new Error(`Failed to update application: ${errorMessage}`);
      }
    }),

  recordCreditScoreChange: publicProcedure
    .input(creditScoreHistorySchema)
    .mutation(async ({ input }) => {
      console.log('[ActivityTracking] Recording credit score for user:', input.userId);
      
      try {
        const { data, error } = await supabase
          .from('credit_score_history')
          .insert({
            user_id: input.userId,
            experian_score: input.experianScore,
            equifax_score: input.equifaxScore,
            transunion_score: input.transunionScore,
            composite_score: input.compositeScore,
            change_reason: input.changeReason,
            previous_composite: input.previousComposite,
            score_change: input.scoreChange,
            payment_history_factor: input.paymentHistoryFactor,
            credit_utilization_factor: input.creditUtilizationFactor,
            credit_age_factor: input.creditAgeFactor,
            credit_mix_factor: input.creditMixFactor,
            new_credit_factor: input.newCreditFactor,
            game_month: input.gameMonth,
            game_date: input.gameDate,
            is_demo_mode: input.isDemoMode,
          })
          .select()
          .single();
        
        if (error) {
          console.error('[ActivityTracking] Error recording credit score:', error);
          throw new Error(`Failed to record credit score: ${error.message}`);
        }
        
        return { success: true, id: data.id };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[ActivityTracking] Critical score error:', errorMessage);
        throw new Error(`Failed to record credit score: ${errorMessage}`);
      }
    }),

  startGameSession: publicProcedure
    .input(gameSessionSchema)
    .mutation(async ({ input }) => {
      console.log('[ActivityTracking] Starting game session for user:', input.userId);
      
      try {
        const { data, error } = await supabase
          .from('game_sessions')
          .insert({
            user_id: input.userId,
            session_id: input.sessionId,
            starting_credit_score: input.startingCreditScore,
            starting_net_worth: input.startingNetWorth,
            platform: input.platform,
            app_version: input.appVersion,
            device_info: input.deviceInfo || {},
            is_demo_mode: input.isDemoMode,
          })
          .select()
          .single();
        
        if (error) {
          console.error('[ActivityTracking] Error starting session:', error);
          throw new Error(`Failed to start session: ${error.message}`);
        }
        
        return { success: true, id: data.id, sessionId: data.session_id };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[ActivityTracking] Critical session error:', errorMessage);
        throw new Error(`Failed to start session: ${errorMessage}`);
      }
    }),

  endGameSession: publicProcedure
    .input(z.object({
      sessionId: z.string(),
      endingCreditScore: z.number().optional(),
      endingNetWorth: z.number().optional(),
      monthsAdvanced: z.number().optional(),
      transactionsCount: z.number().optional(),
      applicationsCount: z.number().optional(),
      paymentsCount: z.number().optional(),
      purchasesCount: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log('[ActivityTracking] Ending game session:', input.sessionId);
      
      try {
        const { data: session } = await supabase
          .from('game_sessions')
          .select('started_at')
          .eq('session_id', input.sessionId)
          .single();
        
        const endedAt = new Date();
        const startedAt = session?.started_at ? new Date(session.started_at) : endedAt;
        const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

        const { data, error } = await supabase
          .from('game_sessions')
          .update({
            ended_at: endedAt.toISOString(),
            duration_seconds: durationSeconds,
            ending_credit_score: input.endingCreditScore,
            ending_net_worth: input.endingNetWorth,
            months_advanced: input.monthsAdvanced,
            transactions_count: input.transactionsCount,
            applications_count: input.applicationsCount,
            payments_count: input.paymentsCount,
            purchases_count: input.purchasesCount,
          })
          .eq('session_id', input.sessionId)
          .select()
          .single();
        
        if (error) {
          console.error('[ActivityTracking] Error ending session:', error);
          throw new Error(`Failed to end session: ${error.message}`);
        }
        
        return { success: true, session: data };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[ActivityTracking] Critical end session error:', errorMessage);
        throw new Error(`Failed to end session: ${errorMessage}`);
      }
    }),

  recordPropertyBudget: publicProcedure
    .input(propertyBudgetRecordSchema)
    .mutation(async ({ input }) => {
      console.log('[ActivityTracking] Recording property budget for user:', input.userId);
      
      try {
        const { data, error } = await supabase
          .from('property_budget_records')
          .insert({
            user_id: input.userId,
            property_id: input.propertyId,
            property_name: input.propertyName,
            role: input.role,
            transaction_id: input.transactionId,
            application_id: input.applicationId,
            amount: input.amount,
            transaction_type: input.transactionType,
            description: input.description,
            counterparty_user_id: input.counterpartyUserId,
            counterparty_name: input.counterpartyName,
            counterparty_role: input.counterpartyRole,
            is_demo_mode: input.isDemoMode,
          })
          .select()
          .single();
        
        if (error) {
          console.error('[ActivityTracking] Error recording property budget:', error);
          throw new Error(`Failed to record property budget: ${error.message}`);
        }
        
        return { success: true, id: data.id };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[ActivityTracking] Critical property budget error:', errorMessage);
        throw new Error(`Failed to record property budget: ${errorMessage}`);
      }
    }),

  getUserActivities: publicProcedure
    .input(z.object({
      userId: z.string(),
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
      activityType: z.string().optional(),
    }))
    .query(async ({ input }) => {
      console.log('[ActivityTracking] Fetching activities for user:', input.userId);
      
      try {
        let query = supabase
          .from('user_activity_log')
          .select('*')
          .eq('user_id', input.userId)
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);
        
        if (input.activityType) {
          query = query.eq('activity_type', input.activityType);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('[ActivityTracking] Error fetching activities:', error);
          throw new Error(`Failed to fetch activities: ${error.message}`);
        }
        
        return { activities: data || [] };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[ActivityTracking] Critical fetch error:', errorMessage);
        throw new Error(`Failed to fetch activities: ${errorMessage}`);
      }
    }),

  getUserTransactions: publicProcedure
    .input(z.object({
      userId: z.string(),
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
      category: z.string().optional(),
      transactionType: z.string().optional(),
    }))
    .query(async ({ input }) => {
      console.log('[ActivityTracking] Fetching transactions for user:', input.userId);
      
      try {
        let query = supabase
          .from('transaction_history')
          .select('*')
          .eq('user_id', input.userId)
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);
        
        if (input.category) {
          query = query.eq('category', input.category);
        }
        
        if (input.transactionType) {
          query = query.eq('transaction_type', input.transactionType);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('[ActivityTracking] Error fetching transactions:', error);
          throw new Error(`Failed to fetch transactions: ${error.message}`);
        }
        
        return { transactions: data || [] };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[ActivityTracking] Critical fetch error:', errorMessage);
        throw new Error(`Failed to fetch transactions: ${errorMessage}`);
      }
    }),

  getUserApplications: publicProcedure
    .input(z.object({
      userId: z.string(),
      status: z.string().optional(),
    }))
    .query(async ({ input }) => {
      console.log('[ActivityTracking] Fetching applications for user:', input.userId);
      
      try {
        let query = supabase
          .from('real_estate_applications')
          .select('*')
          .eq('user_id', input.userId)
          .order('created_at', { ascending: false });
        
        if (input.status) {
          query = query.eq('status', input.status);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('[ActivityTracking] Error fetching applications:', error);
          throw new Error(`Failed to fetch applications: ${error.message}`);
        }
        
        return { applications: data || [] };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[ActivityTracking] Critical fetch error:', errorMessage);
        throw new Error(`Failed to fetch applications: ${errorMessage}`);
      }
    }),

  getCreditScoreHistory: publicProcedure
    .input(z.object({
      userId: z.string(),
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      console.log('[ActivityTracking] Fetching credit score history for user:', input.userId);
      
      try {
        const { data, error } = await supabase
          .from('credit_score_history')
          .select('*')
          .eq('user_id', input.userId)
          .order('recorded_at', { ascending: false })
          .limit(input.limit);
        
        if (error) {
          console.error('[ActivityTracking] Error fetching credit history:', error);
          throw new Error(`Failed to fetch credit history: ${error.message}`);
        }
        
        return { history: data || [] };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[ActivityTracking] Critical fetch error:', errorMessage);
        throw new Error(`Failed to fetch credit history: ${errorMessage}`);
      }
    }),

  getActivitySummary: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      console.log('[ActivityTracking] Fetching activity summary for user:', input.userId);
      
      try {
        const { data: activities, error: actError } = await supabase
          .from('user_activity_log')
          .select('activity_type, amount')
          .eq('user_id', input.userId);
        
        if (actError) {
          console.error('[ActivityTracking] Error fetching activity summary:', actError);
        }

        const { data: transactions, error: txError } = await supabase
          .from('transaction_history')
          .select('transaction_type, category, amount, is_debit')
          .eq('user_id', input.userId);
        
        if (txError) {
          console.error('[ActivityTracking] Error fetching transaction summary:', txError);
        }

        const { data: applications, error: appError } = await supabase
          .from('real_estate_applications')
          .select('application_type, status')
          .eq('user_id', input.userId);
        
        if (appError) {
          console.error('[ActivityTracking] Error fetching application summary:', appError);
        }

        const activitySummary: Record<string, number> = {};
        (activities || []).forEach(a => {
          activitySummary[a.activity_type] = (activitySummary[a.activity_type] || 0) + 1;
        });

        const transactionSummary = {
          totalIncome: 0,
          totalExpenses: 0,
          byCategory: {} as Record<string, number>,
        };
        (transactions || []).forEach(t => {
          if (t.is_debit) {
            transactionSummary.totalExpenses += Number(t.amount) || 0;
          } else {
            transactionSummary.totalIncome += Number(t.amount) || 0;
          }
          if (t.category) {
            transactionSummary.byCategory[t.category] = 
              (transactionSummary.byCategory[t.category] || 0) + (Number(t.amount) || 0);
          }
        });

        const applicationSummary = {
          total: (applications || []).length,
          byStatus: {} as Record<string, number>,
          byType: {} as Record<string, number>,
        };
        (applications || []).forEach(a => {
          applicationSummary.byStatus[a.status || 'unknown'] = 
            (applicationSummary.byStatus[a.status || 'unknown'] || 0) + 1;
          applicationSummary.byType[a.application_type] = 
            (applicationSummary.byType[a.application_type] || 0) + 1;
        });

        return {
          activitySummary,
          transactionSummary,
          applicationSummary,
          totalActivities: (activities || []).length,
          totalTransactions: (transactions || []).length,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[ActivityTracking] Critical summary error:', errorMessage);
        throw new Error(`Failed to fetch summary: ${errorMessage}`);
      }
    }),
});
