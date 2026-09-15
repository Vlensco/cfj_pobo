import "dotenv/config";
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
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    stripeWebhookHandler
  );
  app.post(
    "/api/paddle/webhook",
    express.raw({ type: "application/json" }),
    paddleWebhookHandler
  );
  app.post(
    "/api/nowpayments/webhook",
    express.json(),
    nowpaymentsWebhookHandler
  );

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post("/api/scheduled/follow-up-reminders", followUpReminderHandler);
  
  // Manus debug log mock for production
  app.all(["/__manus__/logs", "/api/__manus__/logs"], (_req, res) => {
    res.status(200).json({ success: true });
  });

  const trpcMiddleware = createExpressMiddleware({ router: appRouter, createContext });
  app.use("/api/trpc", trpcMiddleware);
  app.use("/trpc", trpcMiddleware);

  return app;
}
