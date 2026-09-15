import { TRPCError } from "@trpc/server";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { z } from "zod";
import * as db from "./db";
import { adminOrderRouter } from "./routers/adminOrders";
import { adminProductRouter } from "./routers/adminProducts";
import { analyticsRouter } from "./routers/analytics";
import { orderRequestRouter } from "./routers/orderRequests";
import { stripeRouter } from "./routers/stripe";
import { paddleRouter } from "./routers/paddle";
import { nowpaymentsRouter } from "./routers/nowpayments";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  adminOrders: adminOrderRouter,
  adminProducts: adminProductRouter,
  analytics: analyticsRouter,
  orderRequests: orderRequestRouter,
  stripe: stripeRouter,
  paddle: paddleRouter,
  crypto: nowpaymentsRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    loginCustomer: publicProcedure
      .input(
        z.object({
          name: z.string().min(2, "Name is required"),
          email: z.string().email("Valid email is required"),
          phone: z.string().optional(),
          loginMethod: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const openId = `cust_${Buffer.from(input.email).toString("hex").substring(0, 16)}`;

        await db.upsertUser({
          openId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          role: "user",
          loginMethod: input.loginMethod || "customer_email",
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(openId, {
          name: input.name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return {
          success: true,
          user: { openId, name: input.name, email: input.email, phone: input.phone, role: "user" },
        };
      }),
    loginLocalAdmin: publicProcedure
      .input(
        z
          .object({
            username: z.string().optional(),
            password: z.string().optional(),
            email: z.string().optional(),
            name: z.string().optional(),
          })
          .optional()
      )
      .mutation(async ({ ctx, input }) => {
        const username = input?.username?.trim().toLowerCase() || input?.email?.trim().toLowerCase() || "admin";
        const password = input?.password?.trim() || "";

        // Verify admin credentials if password was provided in form
        if (input?.password !== undefined) {
          const isValidUser = username === "admin" || username === "admin@cfjersey.com" || username === "admin@terrace.study" || username === "admin@terrace.example";
          const isValidPass = password === "admin123";

          if (!isValidUser || !isValidPass) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Username atau password admin salah. (Default: username: admin / password: admin123)",
            });
          }
        }

        const email = input?.email || (username.includes("@") ? username : "admin@cfjersey.com");
        const name = input?.name || "CFJ Administrator";
        const openId = `admin_${Buffer.from(email).toString("hex").substring(0, 16)}`;

        await db.upsertUser({
          openId,
          name,
          email,
          role: "admin",
          loginMethod: "local_admin",
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(openId, {
          name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return {
          success: true,
          user: { openId, name, email, role: "admin" },
        };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
});
export type AppRouter = typeof appRouter;

