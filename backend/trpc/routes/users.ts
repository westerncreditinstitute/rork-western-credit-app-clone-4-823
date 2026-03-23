import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { supabase } from "@/lib/supabase";

interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  phone: string;
  avatar: string;
  member_since: string;
  role: string;
  courses_completed: number;
  total_earnings: number;
  referrals: number;
  drivers_license_number: string;
  drivers_license_state: string;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  avatar: string;
  memberSince: string;
  role: string;
  coursesCompleted: number;
  totalEarnings: number;
  referrals: number;
  driversLicenseNumber: string;
  driversLicenseState: string;
  createdAt: string;
  updatedAt: string;
}

function dbToUser(db: DbUser): User {
  return {
    id: db.id,
    email: db.email,
    name: db.name,
    phone: db.phone || "",
    avatar: db.avatar || "",
    memberSince: db.member_since || "",
    role: db.role || "Student",
    coursesCompleted: db.courses_completed || 0,
    totalEarnings: db.total_earnings || 0,
    referrals: db.referrals || 0,
    driversLicenseNumber: db.drivers_license_number || "",
    driversLicenseState: db.drivers_license_state || "",
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

export const usersRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      console.log("[Users] getById called with:", input.id);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', input.id)
        .single();

      if (error) {
        console.error("[Users] Error fetching user:", error);
        return null;
      }

      return data ? dbToUser(data) : null;
    }),

  getByEmail: publicProcedure
    .input(z.object({ email: z.string() }))
    .query(async ({ input }) => {
      console.log("[Users] getByEmail called with:", input.email);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', input.email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("[Users] Error fetching user:", error);
        return null;
      }

      return data ? dbToUser(data) : null;
    }),

  register: publicProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email address"),
      password: z.string().min(6, "Password must be at least 6 characters"),
      phone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log("[Users] register called for:", input.email);

      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', input.email.toLowerCase())
        .single();

      if (existingUser) {
        console.log("[Users] Email already exists:", input.email);
        throw new Error("An account with this email already exists");
      }

      const passwordHash = await hashPassword(input.password);

      const newUser = {
        name: input.name,
        email: input.email.toLowerCase(),
        password_hash: passwordHash,
        phone: input.phone || '',
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        member_since: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        role: "Student",
        courses_completed: 0,
        total_earnings: 0,
        referrals: 0,
      };

      const { data, error } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (error) {
        console.error("[Users] Error creating user:", error);
        throw new Error(`Failed to create account: ${error.message}`);
      }

      console.log("[Users] Created user:", data.id);
      return dbToUser(data);
    }),

  login: publicProcedure
    .input(z.object({
      email: z.string().email("Invalid email address"),
      password: z.string().min(1, "Password is required"),
    }))
    .mutation(async ({ input }) => {
      console.log("[Users] login called for:", input.email);

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', input.email.toLowerCase())
        .single();

      if (error || !user) {
        console.log("[Users] User not found:", input.email);
        throw new Error("Invalid email or password");
      }

      const isValidPassword = await verifyPassword(input.password, user.password_hash);
      
      if (!isValidPassword) {
        console.log("[Users] Invalid password for:", input.email);
        throw new Error("Invalid email or password");
      }

      console.log("[Users] Login successful for:", user.id);
      return dbToUser(user);
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string(),
      email: z.string().email(),
      avatar: z.string().optional(),
      role: z.enum(["Student", "CSO", "Affiliate"]).default("Student"),
    }))
    .mutation(async ({ input }) => {
      console.log("[Users] create called");

      const newUser = {
        name: input.name,
        email: input.email,
        password_hash: '',
        phone: '',
        avatar: input.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        member_since: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        role: input.role,
        courses_completed: 0,
        total_earnings: 0,
        referrals: 0,
      };

      const { data, error } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (error) {
        console.error("[Users] Error creating user:", error);
        throw new Error(`Failed to create user: ${error.message}`);
      }

      console.log("[Users] Created user:", data.id);
      return dbToUser(data);
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      avatar: z.string().optional(),
      role: z.enum(["Student", "CSO", "Affiliate"]).optional(),
      coursesCompleted: z.number().optional(),
      totalEarnings: z.number().optional(),
      referrals: z.number().optional(),
      driversLicenseNumber: z.string().optional(),
      driversLicenseState: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log("[Users] update called for:", input.id);

      const { id, coursesCompleted, totalEarnings, memberSince, driversLicenseNumber, driversLicenseState, ...rest } = input as typeof input & { memberSince?: string };
      
      const updates: Record<string, unknown> = { ...rest };
      if (coursesCompleted !== undefined) updates.courses_completed = coursesCompleted;
      if (totalEarnings !== undefined) updates.total_earnings = totalEarnings;
      if (memberSince !== undefined) updates.member_since = memberSince;
      if (driversLicenseNumber !== undefined) updates.drivers_license_number = driversLicenseNumber;
      if (driversLicenseState !== undefined) updates.drivers_license_state = driversLicenseState;

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("[Users] Error updating user:", error);
        throw new Error(`Failed to update user: ${error.message}`);
      }

      return dbToUser(data);
    }),

  addEarning: publicProcedure
    .input(z.object({
      userId: z.string(),
      amount: z.number(),
    }))
    .mutation(async ({ input }) => {
      console.log("[Users] addEarning for:", input.userId);

      const { data: existing, error: fetchError } = await supabase
        .from('users')
        .select('total_earnings')
        .eq('id', input.userId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch user: ${fetchError.message}`);
      }

      const newEarnings = (existing?.total_earnings || 0) + input.amount;

      const { data, error } = await supabase
        .from('users')
        .update({ total_earnings: newEarnings })
        .eq('id', input.userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add earning: ${error.message}`);
      }

      return dbToUser(data);
    }),

  incrementReferrals: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      console.log("[Users] incrementReferrals for:", input.userId);

      const { data: existing, error: fetchError } = await supabase
        .from('users')
        .select('referrals')
        .eq('id', input.userId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch user: ${fetchError.message}`);
      }

      const newReferrals = (existing?.referrals || 0) + 1;

      const { data, error } = await supabase
        .from('users')
        .update({ referrals: newReferrals })
        .eq('id', input.userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to increment referrals: ${error.message}`);
      }

      return dbToUser(data);
    }),

  checkEmailExists: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      console.log("[Users] checkEmailExists for:", input.email);

      const { data: user, error } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', input.email.toLowerCase())
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("[Users] Error checking email:", error);
        throw new Error("Failed to check email");
      }

      return { exists: !!user };
    }),

  resetPassword: publicProcedure
    .input(z.object({
      email: z.string().email("Invalid email address"),
      newPassword: z.string().min(6, "Password must be at least 6 characters"),
    }))
    .mutation(async ({ input }) => {
      console.log("[Users] resetPassword for:", input.email);

      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('email', input.email.toLowerCase())
        .single();

      if (fetchError || !user) {
        console.log("[Users] User not found for password reset:", input.email);
        throw new Error("No account found with this email address");
      }

      const passwordHash = await hashPassword(input.newPassword);

      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('id', user.id);

      if (updateError) {
        console.error("[Users] Error resetting password:", updateError);
        throw new Error("Failed to reset password");
      }

      console.log("[Users] Password reset successful for:", input.email);
      return { success: true };
    }),
});
