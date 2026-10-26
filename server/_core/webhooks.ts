import type { Request } from "express";
import { ENV } from "./env";

/** Thrown when a webhook cannot be trusted; the handler answers 400 without processing it. */
export class WebhookRejectedError extends Error {}

/**
 * The request body exactly as the provider sent it. Signatures are computed
 * over these bytes, so a body that was already parsed upstream cannot be verified.
 */
export function readRawBody(req: Request): string {
  const body: unknown = req.body;
  if (Buffer.isBuffer(body)) return body.toString("utf8");
  if (typeof body === "string") return body;
  throw new WebhookRejectedError("Raw request body is unavailable for signature verification.");
}

/** Parses a webhook body that may arrive as a Buffer, a string, or an already-parsed object. */
export function readJsonBody<T = Record<string, unknown>>(req: Request): T {
  const body: unknown = req.body;
  if (Buffer.isBuffer(body)) return JSON.parse(body.toString("utf8")) as T;
  if (typeof body === "string") return JSON.parse(body) as T;
  return (body ?? {}) as T;
}

/**
 * Called when a provider's signing secret is not configured. Production
 * rejects the webhook; development lets it through so local testing works.
 */
export function assertUnsignedWebhookAllowed(provider: string, secretName: string): void {
  if (ENV.isProduction) {
    throw new WebhookRejectedError(`${provider} webhooks are disabled until ${secretName} is configured.`);
  }
  console.warn(`[${provider} Webhook] ${secretName} is not set. Accepting an unsigned webhook (development only).`);
}
