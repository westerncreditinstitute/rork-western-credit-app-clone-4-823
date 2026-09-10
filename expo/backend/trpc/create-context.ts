import { initTRPC, TRPCError } from "@trpc/server";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { supabase } from "@/lib/supabase";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  const authHeader = opts.req.headers.get("authorization");
  console.log("[Context] Auth header present:", !!authHeader, "header:", authHeader ? authHeader.substring(0, 20) + "..." : "NONE");
  let user: AuthUser | null = null;

  if (authHeader) {
    try {
      const decoded = JSON.parse(atob(authHeader.replace("Bearer ", "")));
      if (decoded && decoded.id && decoded.email) {
        // For session-only mode, accept the decoded user directly without Supabase lookup
        // This allows users logged in via AsyncStorage to make authenticated requests
        user = {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name || "User",
          role: decoded.role || "Student",
        };
        console.log("[Context] Authenticated user:", user.email, "role:", user.role);
      }
    } catch (error) {
      console.log("[Context] Failed to parse auth header:", error);
    }
  }

  return {
    req: opts.req,
    user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  const adminRoles = ["admin", "Admin", "CSO"];
  if (!adminRoles.includes(ctx.user.role)) {
    console.log("[Auth] Access denied for user:", ctx.user.email, "role:", ctx.user.role);
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this resource",
    });
  }

  console.log("[Auth] Admin access granted for:", ctx.user.email);
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);
export const adminProcedure = t.procedure.use(isAdmin);
