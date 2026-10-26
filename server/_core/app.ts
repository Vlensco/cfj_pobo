import express, { type RequestHandler } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { followUpReminderHandler } from "../modules/followUp/followUpReminders";
import { stripeWebhookHandler } from "../modules/payments/stripeWebhook";
import { nowpaymentsWebhookHandler } from "../modules/payments/nowpaymentsWebhook";
import { registerUploadRoutes } from "../modules/uploads/uploads";
import { createContext } from "./context";

const BODY_LIMIT = "1mb";

/**
 * Runs a body parser only when the body has not been parsed yet. Serverless
 * platforms may hand over an already-parsed body, and re-reading the stream
 * would hang the request.
 */
function parseBodyOnce(parser: RequestHandler): RequestHandler {
  return (req, res, next) => {
    const alreadyParsed = req.body && typeof req.body === "object";
    if (req.method === "GET" || req.method === "HEAD" || alreadyParsed) return next();
    // A malformed body is left unparsed; route validation rejects it downstream.
    parser(req, res, () => next());
  };
}

export function createExpressApp() {
  const app = express();

  // Webhooks are registered before the JSON parser: signature checks need the raw bytes.
  app.post(
    ["/api/stripe/webhook", "/stripe/webhook"],
    express.raw({ type: "application/json", limit: BODY_LIMIT }),
    stripeWebhookHandler
  );
  app.post(
    ["/api/nowpayments/webhook", "/nowpayments/webhook"],
    express.json({ limit: BODY_LIMIT }),
    nowpaymentsWebhookHandler
  );

  registerUploadRoutes(app);

  app.use(parseBodyOnce(express.json({ limit: BODY_LIMIT })));
  app.use(parseBodyOnce(express.urlencoded({ limit: BODY_LIMIT, extended: true })));

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post(["/api/scheduled/follow-up-reminders", "/scheduled/follow-up-reminders"], followUpReminderHandler);

  app.get(["/api/health", "/health"], (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: Date.now() });
  });

  // The Manus preview runtime posts browser logs here; outside Manus they are simply acknowledged.
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

  return app;
}
