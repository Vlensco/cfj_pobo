import { createExpressApp } from "../app";

const app = createExpressApp();

export default function handler(req: any, res: any) {
  try {
    if (req.url === "/api/health" || req.url === "/health") {
      return res.status(200).json({ ok: true, timestamp: Date.now() });
    }

    return app(req, res);
  } catch (error: any) {
    console.error("[Vercel Handler Error]:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Handler error", message: String(error) });
    }
  }
}
