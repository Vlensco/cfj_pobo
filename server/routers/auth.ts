import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import * as db from "../db";
import { getSessionCookieOptions } from "../_core/cookies";
import { ENV } from "../_core/env";
import { buildLocalOpenId, sdk } from "../_core/sdk";
import { hashPassword, verifyPassword } from "../_core/password";
import { safeEqual } from "../_core/security";
import { publicProcedure, router } from "../_core/trpc";
import type { TrpcContext } from "../_core/context";

const ADMIN_SESSION_MS = 1000 * 60 * 60 * 24 * 7;
const ADMIN_NAME = "CFJ Administrator";

const customerLoginMethods = ["customer_login", "customer_registration", "checkout_login", "checkout_register"] as const;

async function startSession(
  ctx: TrpcContext,
  openId: string,
  session: { name: string; email: string; expiresInMs: number }
) {
  const token = await sdk.createSessionToken(openId, session);
  ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: session.expiresInMs });
}

export const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),

  /**
   * Customer sign-in / registration with an email and password. The email is
   * not verified, so this session must never unlock data that belongs to an
   * email address (see `isSelfDeclaredCustomer`); it only unlocks orders the
   * account itself placed.
   */
  loginCustomer: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(2, "Name is required").max(120),
        email: z.string().trim().toLowerCase().email("Valid email is required").max(320),
        phone: z.string().trim().max(40).optional(),
        password: z.string().min(8, "Password must be at least 8 characters").max(200),
        loginMethod: z.enum(customerLoginMethods).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const openId = buildLocalOpenId("customer", input.email);
      const isRegistration = input.loginMethod === "customer_registration" || input.loginMethod === "checkout_register";

      const unavailable = () =>
        new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Sign-in is temporarily unavailable. Please try again shortly." });
      if (!(await db.getReachableDb())) throw unavailable();

      const existing = await db.getUserByOpenId(openId);
      if (existing?.passwordHash) {
        if (isRegistration) {
          throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists. Please sign in." });
        }
        if (!(await verifyPassword(input.password, existing.passwordHash))) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect email or password." });
        }
      } else if (existing && !isRegistration) {
        // Accounts created before passwords existed claim theirs on the next sign-in.
      } else if (!existing && !isRegistration) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No account found for this email. Please register first." });
      }

      // Signing in keeps the saved profile; only registration sets the name.
      const name = isRegistration ? input.name : existing?.name || input.name;
      const phone = input.phone || existing?.phone || undefined;
      await db.upsertUser({
        openId,
        name,
        email: input.email,
        phone,
        role: "user",
        loginMethod: input.loginMethod || "customer_login",
        lastSignedIn: new Date(),
      });
      if (!existing?.passwordHash) {
        try {
          await db.setUserPasswordHash(openId, await hashPassword(input.password));
        } catch (error) {
          console.error("[Auth] Could not save the customer password:", error);
          throw unavailable();
        }
      }
      await startSession(ctx, openId, { name, email: input.email, expiresInMs: ONE_YEAR_MS });

      return {
        success: true,
        user: { openId, name, email: input.email, phone, role: "user" },
      };
    }),

  /** Staff sign-in against the ADMIN_USERNAME / ADMIN_PASSWORD environment variables. */
  loginLocalAdmin: publicProcedure
    .input(
      z.object({
        username: z.string().trim().toLowerCase().min(1).max(320),
        password: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ENV.adminPassword) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Login admin belum dikonfigurasi. Setel ADMIN_PASSWORD di environment server.",
        });
      }

      const isKnownUser = input.username === ENV.adminUsername || input.username === ENV.adminEmail;
      const isValidPassword = safeEqual(input.password, ENV.adminPassword);
      if (!isKnownUser || !isValidPassword) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Username atau password admin salah." });
      }

      const openId = buildLocalOpenId("admin", ENV.adminEmail);
      await db.upsertUser({
        openId,
        name: ADMIN_NAME,
        email: ENV.adminEmail,
        role: "admin",
        loginMethod: "local_admin",
        lastSignedIn: new Date(),
      });
      await startSession(ctx, openId, { name: ADMIN_NAME, email: ENV.adminEmail, expiresInMs: ADMIN_SESSION_MS });

      return {
        success: true,
        user: { openId, name: ADMIN_NAME, email: ENV.adminEmail, role: "admin" },
      };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
    return { success: true } as const;
  }),
});
