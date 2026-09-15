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
    // Health check
    if (req.url === "/api/health" || req.url === "/health") {
      return res.status(200).json({ ok: true, timestamp: Date.now() });
    }

    const expressApp = getApp();
    return expressApp(req, res);
  } catch (error: any) {
    console.error("[Vercel Handler Top-Level Error]:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Handler crash", message: String(error) });
    }
  }
}
