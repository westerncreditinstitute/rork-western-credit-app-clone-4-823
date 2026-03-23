import * as z from "zod";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../create-context";
import { supabase } from "@/lib/supabase";

export const adminRouter = createTRPCRouter({
  getAllUsers: adminProcedure.query(async ({ ctx }) => {
    console.log("[Admin] getAllUsers called by:", ctx.user.email);

    const { data, error } = await supabase
      .from("users")
      .select("id, email, name, role, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Admin] Error fetching users:", error);
      throw new Error("Failed to fetch users");
    }

    return data || [];
  }),

  updateUserRole: adminProcedure
    .input(z.object({
      userId: z.string(),
      role: z.enum(["Student", "CSO", "Affiliate", "Admin"]),
    }))
    .mutation(async ({ input, ctx }) => {
      console.log("[Admin] updateUserRole called by:", ctx.user.email, "for user:", input.userId);

      const { data, error } = await supabase
        .from("users")
        .update({ role: input.role })
        .eq("id", input.userId)
        .select()
        .single();

      if (error) {
        console.error("[Admin] Error updating user role:", error);
        throw new Error("Failed to update user role");
      }

      return data;
    }),

  deleteUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      console.log("[Admin] deleteUser called by:", ctx.user.email, "for user:", input.userId);

      if (input.userId === ctx.user.id) {
        throw new Error("Cannot delete your own account");
      }

      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", input.userId);

      if (error) {
        console.error("[Admin] Error deleting user:", error);
        throw new Error("Failed to delete user");
      }

      return { success: true };
    }),

  getStats: adminProcedure.query(async ({ ctx }) => {
    console.log("[Admin] getStats called by:", ctx.user.email);

    const { count: userCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    const { data: roleStats } = await supabase
      .from("users")
      .select("role");

    const roleCounts = (roleStats || []).reduce((acc, user) => {
      const role = user.role || "Student";
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalUsers: userCount || 0,
      roleDistribution: roleCounts,
    };
  }),

  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    console.log("[Admin] getCurrentUser called by:", ctx.user.email);
    return ctx.user;
  }),
});
