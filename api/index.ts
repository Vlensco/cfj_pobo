import { createExpressApp } from "../server/app";

const app = createExpressApp();

export default function handler(req: any, res: any) {
  // Restore original URL if Vercel rewrite changed req.url to /api
  const originalUrl =
    req.headers["x-vercel-original-url"] ||
    req.headers["x-matched-path"] ||
    req.headers["x-forwarded-uri"];

  if (typeof originalUrl === "string" && originalUrl.length > 0) {
    req.url = originalUrl;
  }

  return app(req, res);
}
