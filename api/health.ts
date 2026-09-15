import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: "ok",
    timestamp: Date.now(),
    nodeVersion: process.version,
    env: {
      hasDbUrl: Boolean(process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL),
    },
  });
}
