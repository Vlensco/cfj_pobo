import express, { type Express, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { customizationUploads } from "../../../drizzle/schema";
import { FONT_REFERENCE_MAX_BYTES } from "../../../shared/customization";
import { getDb } from "../../db";

const UPLOADS_PER_HOUR = 30;
const HOUR_MS = 60 * 60 * 1000;
const recentUploads = new Map<string, number[]>();

/**
 * Identifies the file from its first bytes rather than trusting the browser's
 * Content-Type, so only real images and fonts are stored and served back.
 */
export function sniffFontReferenceType(bytes: Buffer): string | null {
  const ascii = (start: number, end: number) => bytes.subarray(start, end).toString("latin1");
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(0, 4) === "wOFF") return "font/woff";
  if (ascii(0, 4) === "wOF2") return "font/woff2";
  if (ascii(0, 4) === "OTTO") return "font/otf";
  if (bytes.readUInt32BE(0) === 0x00010000 || ascii(0, 4) === "true") return "font/ttf";
  return null;
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (recentUploads.get(ip) ?? []).filter(time => now - time < HOUR_MS);
  if (recent.length >= UPLOADS_PER_HOUR) return true;
  recent.push(now);
  recentUploads.set(ip, recent);
  return false;
}

function cleanFileName(raw: unknown): string {
  let name = typeof raw === "string" ? raw : "";
  try {
    name = decodeURIComponent(name);
  } catch {
    // Keep the raw header value.
  }
  return name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "font-reference";
}

async function handleFontReferenceUpload(req: Request, res: Response) {
  if (isRateLimited(req.ip || "unknown")) {
    res.status(429).json({ error: "Too many uploads. Please try again later." });
    return;
  }

  const bytes = Buffer.isBuffer(req.body) ? req.body : null;
  if (!bytes || bytes.length === 0) {
    res.status(400).json({ error: "No file received." });
    return;
  }
  if (bytes.length > FONT_REFERENCE_MAX_BYTES) {
    res.status(413).json({ error: "The file is larger than 5 MB." });
    return;
  }

  const mimeType = sniffFontReferenceType(bytes);
  if (!mimeType) {
    res.status(415).json({ error: "Upload a PNG, JPG or WEBP image, or a TTF, OTF, WOFF or WOFF2 font file." });
    return;
  }

  const db = await getDb();
  if (!db) {
    res.status(503).json({ error: "Uploads are temporarily unavailable." });
    return;
  }

  const id = nanoid(21);
  const fileName = cleanFileName(req.headers["x-file-name"]);
  try {
    await db.insert(customizationUploads).values({
      id,
      fileName,
      mimeType,
      sizeBytes: bytes.length,
      data: bytes.toString("base64"),
    });
  } catch (error) {
    console.error("[Uploads] Failed to store font reference:", error);
    res.status(500).json({ error: "The file could not be saved." });
    return;
  }

  res.json({ id, fileName, mimeType, url: `/api/uploads/${id}` });
}

async function handleUploadDownload(req: Request, res: Response) {
  const id = String(req.params.id || "");
  const db = await getDb();
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(id) || !db) {
    res.status(404).end();
    return;
  }

  const [upload] = await db.select().from(customizationUploads).where(eq(customizationUploads.id, id)).limit(1);
  if (!upload) {
    res.status(404).end();
    return;
  }

  res.setHeader("Content-Type", upload.mimeType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'");
  res.setHeader("Cache-Control", "private, max-age=86400");
  res.setHeader("Content-Disposition", `inline; filename="${upload.fileName.replace(/"/g, "")}"`);
  res.send(Buffer.from(upload.data, "base64"));
}

/** Customer file uploads. Registered before the JSON body parser: the body is the raw file. */
export function registerUploadRoutes(app: Express) {
  app.post(
    ["/api/uploads/font-reference", "/uploads/font-reference"],
    express.raw({ type: () => true, limit: FONT_REFERENCE_MAX_BYTES + 1024 }),
    (req, res) => {
      handleFontReferenceUpload(req, res).catch(error => {
        console.error("[Uploads] Upload failed:", error);
        res.status(500).json({ error: "Upload failed." });
      });
    }
  );
  app.get(["/api/uploads/:id", "/uploads/:id"], (req, res) => {
    handleUploadDownload(req, res).catch(error => {
      console.error("[Uploads] Download failed:", error);
      res.status(500).end();
    });
  });
}
