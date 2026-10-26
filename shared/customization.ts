/** Largest font reference a customer may attach to a custom nameset. */
export const FONT_REFERENCE_MAX_BYTES = 5 * 1024 * 1024;

/** Accepted font reference files: pictures of the lettering, or the font file itself. */
export const FONT_REFERENCE_TYPES: Record<string, "image" | "font"> = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "font/ttf": "font",
  "font/otf": "font",
  "font/woff": "font",
  "font/woff2": "font",
};

export interface FontReference {
  id: string;
  fileName: string;
  mimeType: string;
}

export interface ItemCustomization {
  nameset?: {
    /** "custom": the customer's own name and number. "ready": a ready-made nameset product picked by SKU. */
    mode?: "custom" | "ready";
    name: string;
    number: string;
    price: number;
    /** SKU of the ready-made nameset product. */
    sku?: string;
    /** Lettering style the customer uploaded for a custom nameset. */
    fontReference?: FontReference;
  };
  patch?: {
    name: string;
    sku: string;
    price: number;
    competition?: string;
  };
  itemNote?: string;
}

export interface ProductCustomizationMeta {
  hasNameset: boolean;
  namesetPrice: number;
  patchSku: string;
}

export function parseProductCustomizationMeta(tags?: string | null): ProductCustomizationMeta {
  if (!tags) {
    return { hasNameset: true, namesetPrice: 75000, patchSku: "" };
  }

  const tagList = tags.split(",").map(t => t.trim());
  const namesetTag = tagList.find(t => t.toLowerCase().startsWith("nameset:"));
  const patchTag = tagList.find(t => t.toLowerCase().startsWith("patch:") || t.toLowerCase().startsWith("patch_sku:"));
  const noNamesetTag = tagList.some(t => t.toLowerCase() === "no-nameset" || t.toLowerCase() === "nameset:false");

  let namesetPrice = 75000;
  if (namesetTag) {
    const rawVal = namesetTag.split(":")[1]?.trim();
    const val = parseInt(rawVal, 10);
    if (!isNaN(val) && val >= 0) namesetPrice = val;
  }

  // No sleeve patch is preselected unless the product names one: a paid add-on should be opt-in.
  let patchSku = "";
  if (patchTag) {
    const rawSku = patchTag.split(":")[1]?.trim();
    if (rawSku) patchSku = rawSku;
  }

  return {
    hasNameset: !noNamesetTag,
    namesetPrice,
    patchSku,
  };
}

export function serializeProductCustomizationMeta(
  baseTags: string = "",
  meta: { hasNameset: boolean; namesetPrice: number; patchSku?: string }
): string {
  const cleanTags = (baseTags || "")
    .split(",")
    .map(t => t.trim())
    .filter(
      t =>
        t &&
        !t.toLowerCase().startsWith("nameset:") &&
        !t.toLowerCase().startsWith("patch:") &&
        !t.toLowerCase().startsWith("patch_sku:") &&
        t.toLowerCase() !== "no-nameset" &&
        t.toLowerCase() !== "nameset:false"
    );

  if (meta.hasNameset) {
    cleanTags.push(`nameset:${Math.max(0, Math.round(meta.namesetPrice || 0))}`);
  } else {
    cleanTags.push("no-nameset");
  }

  if (meta.patchSku) {
    cleanTags.push(`patch_sku:${meta.patchSku.trim().toUpperCase()}`);
  }

  return cleanTags.join(", ");
}
