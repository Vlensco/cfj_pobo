import { createExpressApp } from "../server/app";

let app: any = null;

function getApp() {
  if (!app) {
    app = createExpressApp();
  }
  return app;
}

export default function handler(req: any, res: any) {
  try {
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
    expressApp(req, res, (err: any) => {
      if (err) {
        console.error("[Express Unhandled Error]:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Internal Server Error", message: String(err) });
        }
      } else if (!res.headersSent) {
        res.status(404).json({ error: "Not Found", url: req.url });
      }
    });
  } catch (error: any) {
    console.error("[Vercel Handler Top-Level Error]:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Handler crash", message: String(error) });
    }
  }
}
