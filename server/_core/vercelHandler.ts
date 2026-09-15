import { createExpressApp } from "../app";

const app = createExpressApp();

export default function handler(req: any, res: any) {
  if (req.url === "/api/health" || req.url === "/health") {
    return res.status(200).json({ status: "ok", timestamp: Date.now() });
  }

  return app(req, res);
}
