import type { Express } from "express";
import fs from "fs";
import path from "path";
import { ENV } from "./env";

function getFallbackSvg(filename: string): string {
  const cleanName = filename
    .replace(/^terrace-/, "")
    .replace(/_[a-f0-9]+\.jpg$/, "")
    .replace(/[-_]/g, " ")
    .toUpperCase();

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1500" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#141815"/>
      <stop offset="50%" stop-color="#1b211d"/>
      <stop offset="100%" stop-color="#0f1311"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#3b4d40" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#141815" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#253028" stroke-width="1" stroke-opacity="0.3"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect width="100%" height="100%" fill="url(#glow)"/>
  <rect width="100%" height="100%" fill="url(#grid)"/>
  
  <circle cx="600" cy="650" r="280" fill="none" stroke="#c2a649" stroke-width="1.5" stroke-opacity="0.35" stroke-dasharray="6,6"/>
  <circle cx="600" cy="650" r="220" fill="none" stroke="#e3dbcb" stroke-width="1" stroke-opacity="0.2"/>
  <line x1="300" y1="650" x2="900" y2="650" stroke="#c2a649" stroke-width="1" stroke-opacity="0.3"/>
  <line x1="600" y1="350" x2="600" y2="950" stroke="#c2a649" stroke-width="1" stroke-opacity="0.3"/>
  
  <text x="600" y="640" font-family="'Newsreader', Georgia, serif" font-size="42" font-weight="500" fill="#f4f1ea" text-anchor="middle" letter-spacing="2">TERRACE</text>
  <text x="600" y="690" font-family="'Manrope', -apple-system, sans-serif" font-size="18" font-weight="600" fill="#c2a649" text-anchor="middle" letter-spacing="6">STUDY EDITION</text>
  
  <rect x="100" y="100" width="1000" height="1300" fill="none" stroke="#e3dbcb" stroke-width="1" stroke-opacity="0.15"/>
  <text x="140" y="1340" font-family="'Manrope', sans-serif" font-size="14" font-weight="600" fill="#8f9990" letter-spacing="4">${cleanName || "STUDY PIECE"}</text>
  <text x="1060" y="1340" font-family="'Manrope', sans-serif" font-size="14" font-weight="600" fill="#8f9990" text-anchor="end" letter-spacing="2">2026 // N° 01</text>
</svg>`;
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    // 1. Check if the file exists locally in terrace-assets, client/public/manus-storage or public/manus-storage
    const localPaths = [
      path.resolve(process.cwd(), "terrace-assets", key),
      path.resolve(process.cwd(), "client", "public", "manus-storage", key),
      path.resolve(process.cwd(), "dist", "public", "manus-storage", key),
      path.resolve(process.cwd(), "client", "public", key),
      path.resolve(process.cwd(), "dist", "public", key),
    ];

    for (const localPath of localPaths) {
      if (fs.existsSync(localPath)) {
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.sendFile(localPath);
      }
    }

    // 2. If Forge API configured, try proxying
    if (ENV.forgeApiUrl && ENV.forgeApiKey) {
      try {
        const forgeUrl = new URL(
          "v1/storage/presign/get",
          ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
        );
        forgeUrl.searchParams.set("path", key);

        const forgeResp = await fetch(forgeUrl, {
          headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
        });

        if (forgeResp.ok) {
          const { url } = (await forgeResp.json()) as { url: string };
          if (url) {
            res.set("Cache-Control", "no-store");
            return res.redirect(307, url);
          }
        }
      } catch (err) {
        console.warn("[StorageProxy] Forge presign failed, falling back to SVG:", err);
      }
    }

    // 3. Fallback: Return clean SVG image with 200 OK
    const svg = getFallbackSvg(key);
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(svg);
  });
}
