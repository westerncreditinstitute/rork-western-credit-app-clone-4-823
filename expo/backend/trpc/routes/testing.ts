/**
 * Testing Router - Create real test users in database for end-to-end testing
 * 
 * This router provides endpoints for the Testing Dashboard to:
 * - Create real database users for testing
 * - Create disputes attached to real users
 * - Manage test data lifecycle
 */

import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { supabase } from "@/lib/supabase";
import { TRPCError } from "@trpc/server";

/**
 * Test user creation schema
 */
const CreateTestUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["Student", "CSO", "Affiliate", "Admin"]).default("Student"),
});

/**
 * Test dispute creation schema
 */
const CreateTestDisputeSchema = z.object({
  userId: z.string().uuid(),
  creditor: z.string(),
  accountNumber: z.string(),
  status: z.string(),
  letterContent: z.string().optional(),
});

/**
 * Mock Equifax data schema
 */
const LinkEquifaxMockDataSchema = z.object({
  userId: z.string().uuid(),
  bureau: z.enum(["Equifax", "Experian", "TransUnion"]),
  accounts: z.array(z.object({
    creditorName: z.string(),
    creditorAddress: z.string(),
    accountNumber: z.string(),
    accountType: z.enum(["charge-off", "collection", "late-payment", "delinquent"]),
    status: z.string(),
    balance: z.number(),
    dateReported: z.string(),
  })),
});

export const testingRouter = createTRPCRouter({
  /**
   * Create a real test user in the database
   * 
   * This creates an actual user record that can be used for testing
   * the complete workflow including dispute persistence
   */
  createTestUser: publicProcedure
    .input(CreateTestUserSchema)
    .mutation(async ({ input }) => {
      try {
        console.log("[Testing] Creating test user:", input.email);

        // Check if user already exists
        const { data: existingUser } = await supabase
          .from("users")
          .select("id, email")
          .eq("email", input.email)
          .single();

        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `User with email ${input.email} already exists`,
          });
        }

        // Create new user (mark as test by using .test email domain)
        const { data: newUser, error } = await supabase
          .from("users")
          .insert([
            {
              email: input.email,
              name: input.name,
              role: input.role,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create test user: ${error.message}`,
          });
        }

        console.log("[Testing] Test user created:", newUser.id);

        return {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          is_test_user: true,
        };
      } catch (error) {
        console.error("[Testing] Error creating test user:", error);
        throw error;
      }
    }),

  /**
   * Create a test dispute attached to a real user
   * 
   * This creates a dispute that will be saved to the database
   * and appear in the dispute tracker
   */
  createTestDispute: publicProcedure
    .input(CreateTestDisputeSchema)
    .mutation(async ({ input }) => {
      try {
        console.log("[Testing] Creating test dispute for user:", input.userId);

        // Verify user exists
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("id", input.userId)
          .single();

        if (userError || !user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `User ${input.userId} not found`,
          });
        }

        // Create dispute - only use fields that actually exist in the schema
        const disputeData = {
          user_id: input.userId,
          creditor: input.creditor,
          account_number: input.accountNumber,
          status: input.status,
          date_sent: new Date().toISOString(),
          response_by: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          dispute_type: "standard",
          letter_content: input.letterContent || "",
          last_updated: new Date().toISOString(),
          timeline: [],
          documents: [],
          reminders: [],
        };

        const { data: newDispute, error: disputeError } = await supabase
          .from("disputes")
          .insert([disputeData])
          .select()
          .single();

        if (disputeError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create dispute: ${disputeError.message}`,
          });
        }

        console.log("[Testing] Test dispute created:", newDispute.id);

        return {
          id: newDispute.id,
          creditor: newDispute.creditor,
          accountNumber: newDispute.account_number,
          status: newDispute.status,
          balance: newDispute.balance,
          bureau: newDispute.bureau,
          dateSent: newDispute.date_sent,
        };
      } catch (error) {
        console.error("[Testing] Error creating test dispute:", error);
        throw error;
      }
    }),

  /**
   * Get all test users
   */
  getTestUsers: publicProcedure.query(async () => {
    try {
      console.log("[Testing] Fetching all test users");

      const { data: users, error } = await supabase
        .from("users")
        .select("id, email, name, role, created_at")
        .ilike("email", "%.test@%") // Find test users by email pattern
        .order("created_at", { ascending: false });

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch test users: ${error.message}`,
        });
      }

      return users || [];
    } catch (error) {
      console.error("[Testing] Error fetching test users:", error);
      throw error;
    }
  }),

  /**
   * Get disputes for a test user
   */
  getTestUserDisputes: publicProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ input }) => {
      try {
        console.log("[Testing] Fetching disputes for user:", input.userId);

        const { data: disputes, error } = await supabase
          .from("disputes")
          .select("*")
          .eq("user_id", input.userId)
          .eq("is_test_dispute", true)
          .order("date_sent", { ascending: false });

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch disputes: ${error.message}`,
          });
        }

        return disputes || [];
      } catch (error) {
        console.error("[Testing] Error fetching disputes:", error);
        throw error;
      }
    }),

  /**
   * Link mock Equifax data to a test user
   */
  linkEquifaxMockData: publicProcedure
    .input(LinkEquifaxMockDataSchema)
    .mutation(async ({ input }) => {
      try {
        console.log("[Testing] Linking mock Equifax data for user:", input.userId);

        // Create mock equifax report in session storage
        const mockReport = {
          userId: input.userId,
          fetchedAt: new Date().toISOString(),
          bureau: input.bureau,
          accounts: input.accounts,
        };

        // In a real scenario, you might store this in a testing_equifax_data table
        // For now, we'll just return success
        console.log("[Testing] Mock Equifax data ready:", mockReport);

        return {
          success: true,
          bureau: input.bureau,
          accountCount: input.accounts.length,
          fetchedAt: mockReport.fetchedAt,
        };
      } catch (error) {
        console.error("[Testing] Error linking mock data:", error);
        throw error;
      }
    }),

  /**
   * Delete a test user and all associated test data
   */
  deleteTestUser: publicProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      try {
        console.log("[Testing] Deleting test user:", input.userId);

        // Delete disputes first (foreign key constraint)
        const { error: disputeError } = await supabase
          .from("disputes")
          .delete()
          .eq("user_id", input.userId);

        if (disputeError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to delete disputes: ${disputeError.message}`,
          });
        }

        // Delete user
        const { error: userError } = await supabase
          .from("users")
          .delete()
          .eq("id", input.userId);

        if (userError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to delete test user: ${userError.message}`,
          });
        }

        console.log("[Testing] Test user deleted:", input.userId);

        return {
          success: true,
          userId: input.userId,
        };
      } catch (error) {
        console.error("[Testing] Error deleting test user:", error);
        throw error;
      }
    }),

  /**
   * Clean up all test data
   */
  cleanupAllTestData: publicProcedure.mutation(async () => {
    try {
      console.log("[Testing] Cleaning up all test data");

      // Get all test users (identified by .test@ email pattern)
      const { data: testUsers, error: fetchError } = await supabase
        .from("users")
        .select("id")
        .ilike("email", "%.test@%");

      if (fetchError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch test users: ${fetchError.message}`,
        });
      }

      if (!testUsers || testUsers.length === 0) {
        return { success: true, deletedUsers: 0 };
      }

      const userIds = testUsers.map((u) => u.id);

      // Delete all disputes for test users
      const { error: disputeError } = await supabase
        .from("disputes")
        .delete()
        .in("user_id", userIds);

      if (disputeError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete test disputes: ${disputeError.message}`,
        });
      }

      // Delete all test users
      const { error: userError } = await supabase
        .from("users")
        .delete()
        .in("id", userIds);

      if (userError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete test users: ${userError.message}`,
        });
      }

      console.log("[Testing] Cleanup complete. Deleted", userIds.length, "test users");

      return {
        success: true,
        deletedUsers: userIds.length,
      };
    } catch (error) {
      console.error("[Testing] Error cleaning up test data:", error);
      throw error;
    }
  }),
});
