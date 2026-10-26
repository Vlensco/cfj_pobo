import { createHash, timingSafeEqual } from "crypto";
import type { Request } from "express";
import { ENV } from "./env";

/** Constant-time string comparison that does not leak the length of either value. */
export function safeEqual(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a).digest();
  const digestB = createHash("sha256").update(b).digest();
  return timingSafeEqual(digestA, digestB);
}

/**
 * Origin used to build payment return URLs and webhook callbacks.
 * Prefers the configured APP_URL so redirects cannot be steered by the caller.
 */
export function getAppOrigin(req: Request): string {
  if (ENV.appUrl) return ENV.appUrl;

  const origin = req.headers.origin;
  if (typeof origin === "string" && /^https?:\/\/[^/\s]+$/.test(origin)) return origin;

  const forwardedProto = String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim();
  const protocol = forwardedProto || req.protocol || "http";
  const host = req.headers.host || `localhost:${process.env.PORT || 3000}`;
  return `${protocol}://${host}`;
}
