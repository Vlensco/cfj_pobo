import { createExpressApp } from "../server/app";

let app: any = null;

function getApp() {
  if (!app) {
    app = createExpressApp();
  }
  return app;
}

export default function handler(req: any, res: any) {
  // Direct health check
  if (req.url === "/api/health" || req.url === "/health") {
    return res.status(200).json({ ok: true, timestamp: Date.now() });
  }

  // Restore original URL if Vercel rewrite changed req.url to /api
  const originalUrl =
    req.headers["x-vercel-original-url"] ||
    req.headers["x-matched-path"] ||
    req.headers["x-forwarded-uri"] ||
    req.url;

  if (typeof originalUrl === "string" && originalUrl.length > 0) {
    req.url = originalUrl;
  }

  const expressApp = getApp();
  return expressApp(req, res);
}
