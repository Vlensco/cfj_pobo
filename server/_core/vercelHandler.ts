import type { IncomingMessage, ServerResponse } from "http";
import { createExpressApp } from "./app";

const app = createExpressApp();

/**
 * Vercel entry point. Every `/api/*` request is rewritten to this function, so
 * the original path is restored from the platform headers before Express routes it.
 */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  const originalUrl =
    req.headers["x-vercel-original-url"] || req.headers["x-matched-path"] || req.headers["x-forwarded-uri"];
  if (typeof originalUrl === "string" && originalUrl.startsWith("/api")) {
    req.url = originalUrl;
  }
  return app(req, res);
}
