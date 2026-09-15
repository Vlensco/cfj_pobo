import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { followUpReminderHandler } from "./followUpReminders";
import { stripeWebhookHandler } from "./stripeWebhook";
import { paddleWebhookHandler } from "./paddleWebhook";
import { nowpaymentsWebhookHandler } from "./nowpaymentsWebhook";
import { createContext } from "./_core/context";

export function createExpressApp() {
  const app = express();

  // Raw body webhooks
  app.post(
    ["/api/stripe/webhook", "/stripe/webhook"],
    express.raw({ type: "application/json" }),
    stripeWebhookHandler
  );
  app.post(
    ["/api/paddle/webhook", "/paddle/webhook"],
    express.raw({ type: "application/json" }),
    paddleWebhookHandler
  );
  app.post(
    ["/api/nowpayments/webhook", "/nowpayments/webhook"],
    express.json(),
    nowpaymentsWebhookHandler
  );

  app.use((req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD" || (req.body && typeof req.body === "object")) {
      return next();
    }
    express.json({ limit: "50mb" })(req, res, (err) => {
      if (err) return next();
      next();
    });
  });

  app.use((req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD" || (req.body && typeof req.body === "object")) {
      return next();
    }
    express.urlencoded({ limit: "50mb", extended: true })(req, res, (err) => {
      if (err) return next();
      next();
    });
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post(["/api/scheduled/follow-up-reminders", "/scheduled/follow-up-reminders"], followUpReminderHandler);
  
  // Health check endpoint
  app.get(["/api/health", "/health"], (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: Date.now() });
  });

  // Manus debug log mock for production
  app.all(["/__manus__/logs", "/api/__manus__/logs"], (_req, res) => {
    res.status(200).json({ success: true });
  });

  const trpcMiddleware = createExpressMiddleware({
    router: appRouter,
    createContext,
    onError: ({ error, path }) => {
      console.error(`[tRPC Error] on path ${path}:`, error);
    },
  });
  app.use("/api/trpc", trpcMiddleware);
  app.use("/trpc", trpcMiddleware);
  app.use((req, res, next) => {
    if (req.url.startsWith("/api/trpc") || req.url.startsWith("/trpc") || req.originalUrl?.includes("/trpc") || req.query.batch) {
      return trpcMiddleware(req, res, next);
    }
    next();
  });

  return app;
}
