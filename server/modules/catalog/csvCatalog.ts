import fs from "fs";
import path from "path";
import Papa from "papaparse";

export type CsvProductVariant = {
  productHandle: string;
  sku: string | null;
  option1Value: string | null;
  option2Value: string | null;
  option3Value: string | null;
  price: string;
  compareAtPrice: string | null;
  inventoryQty: number;
  imageSrc: string | null;
  position: number;
};

export type CsvProductImage = {
  productHandle: string;
  src: string;
  position: number;
  altText: string | null;
};

export type CsvProduct = {
  handle: string;
  title: string;
  bodyHtml: string | null;
  vendor: string | null;
  productCategory: string | null;
  type: string | null;
  tags: string | null;
  published: string | null;
  status: string | null;
  price: number;
  primaryVariant: CsvProductVariant | null;
  variants: CsvProductVariant[];
  primaryImage: CsvProductImage | null;
  images: CsvProductImage[];
  createdAt: string;
};

type CatalogCache = {
  products: CsvProduct[];
  byHandle: Map<string, CsvProduct>;
  types: string[];
};

let cache: CatalogCache | null = null;

function clean(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  let s = String(val).trim();
  if (s.startsWith("'")) s = s.slice(1).trim();
  return s.length > 0 ? s : null;
}

function parsePriceToIdr(val: unknown): number {
  const s = clean(val);
  if (!s) return 785000;
  const num = parseFloat(s.replace(/,/g, ""));
  if (isNaN(num)) return 785000;
  // If price is in foreign currency (e.g. 50.00 = 50 USD/GBP), convert to realistic IDR
  if (num < 5000) {
    return Math.round(num * 16000);
  }
  return Math.round(num);
}

function loadCsvCatalog(): CatalogCache {
  if (cache) return cache;

  const csvPath = path.resolve(process.cwd(), "Database/products_export_1.csv");
  if (!fs.existsSync(csvPath)) {
    console.warn("[CsvCatalog] CSV not found at:", csvPath);
    cache = { products: [], byHandle: new Map(), types: [] };
    return cache;
  }

  const raw = fs.readFileSync(csvPath, "utf-8");
  const parsed = Papa.parse<Record<string, string>>(raw, {
    header: true,
    skipEmptyLines: true,
  });

  const productsMap = new Map<string, CsvProduct>();
  const typeSet = new Set<string>();

  for (const row of parsed.data) {
    const handle = clean(row["Handle"]);
    if (!handle) continue;

    let p = productsMap.get(handle);
    if (!p) {
      let typeStr = clean(row["Type"]) || "Classic Shirts";
      if (typeStr.includes("Olahraga & Outdoor")) {
        typeStr = "Classic Shirts";
      }
      if (typeStr && typeStr !== "Uncategorized") {
        typeSet.add(typeStr);
      }

      // Detect if jersey allows custom nameset
      let tagsStr = clean(row["Tags"]) || "";
      const isJersey =
        typeStr.toLowerCase().includes("shirt") ||
        typeStr.toLowerCase().includes("jersey") ||
        (clean(row["Title"]) || "").toLowerCase().includes("shirt") ||
        (clean(row["Title"]) || "").toLowerCase().includes("jersey");

      if (isJersey && !tagsStr.includes("nameset:")) {
        tagsStr = tagsStr ? `${tagsStr}, nameset:75000` : "nameset:75000";
      }

      p = {
        handle,
        title: clean(row["Title"]) || handle,
        bodyHtml: clean(row["Body (HTML)"]),
        vendor: clean(row["Vendor"]) || "CF Jersey",
        productCategory: clean(row["Product Category"]),
        type: typeStr,
        tags: tagsStr,
        published: clean(row["Published"]) || "true",
        status: clean(row["Status"]) || "active",
        price: parsePriceToIdr(row["Variant Price"]),
        primaryVariant: null,
        variants: [],
        primaryImage: null,
        images: [],
        createdAt: new Date().toISOString(),
      };
      productsMap.set(handle, p);
    }

    // Process variant
    const sku = clean(row["Variant SKU"]);
    const option1 = clean(row["Option1 Value"]);
    const variantPrice = parsePriceToIdr(row["Variant Price"]);

    if (option1 || sku || variantPrice > 0) {
      const existingVariant = p.variants.find(v => v.option1Value === option1 && v.sku === sku);
      if (!existingVariant) {
        const variantObj: CsvProductVariant = {
          productHandle: handle,
          sku: sku || `${handle}-${p.variants.length + 1}`,
          option1Value: option1 || "Standard",
          option2Value: clean(row["Option2 Value"]),
          option3Value: clean(row["Option3 Value"]),
          price: String(variantPrice),
          compareAtPrice: row["Variant Compare At Price"] ? String(parsePriceToIdr(row["Variant Compare At Price"])) : null,
          inventoryQty: parseInt(clean(row["Variant Inventory Qty"]) || "10", 10),
          imageSrc: clean(row["Variant Image"]),
          position: parseInt(clean(row["Image Position"]) || "1", 10),
        };
        p.variants.push(variantObj);
        if (!p.primaryVariant) {
          p.primaryVariant = variantObj;
        }
      }
    }

    // Process image
    const imageSrc = clean(row["Image Src"]);
    if (imageSrc) {
      const exists = p.images.some(img => img.src === imageSrc);
      if (!exists) {
        const imgObj: CsvProductImage = {
          productHandle: handle,
          src: imageSrc,
          position: parseInt(clean(row["Image Position"]) || String(p.images.length + 1), 10),
          altText: clean(row["Image Alt Text"]),
        };
        p.images.push(imgObj);
        if (!p.primaryImage) {
          p.primaryImage = imgObj;
        }
      }
    }
  }

  // Ensure every product has at least one variant and image
  Array.from(productsMap.values()).forEach(p => {
    if (!p.primaryImage && p.images.length > 0) {
      p.primaryImage = p.images[0];
    }
    if (!p.primaryVariant && p.variants.length > 0) {
      p.primaryVariant = p.variants[0];
    }
    if (p.variants.length === 0) {
      p.variants.push({
        productHandle: p.handle,
        sku: `${p.handle}-default`,
        option1Value: "Standard",
        option2Value: null,
        option3Value: null,
        price: String(p.price),
        compareAtPrice: null,
        inventoryQty: 10,
        imageSrc: p.primaryImage?.src || null,
        position: 1,
      });
      p.primaryVariant = p.variants[0];
    }
  });

  const productsList = Array.from(productsMap.values());
  cache = {
    products: productsList,
    byHandle: productsMap,
    types: Array.from(typeSet).sort(),
  };

  console.log(`[CsvCatalog] Loaded ${productsList.length} products with ${typeSet.size} categories from CSV.`);
  return cache;
}

type CsvProductFilter = { search?: string; type?: string; visibility?: "all" | "active" | "inactive" };

/** Mirrors the database rule: live on the storefront only when `active` and published. */
export function isCsvProductActive(product: Pick<CsvProduct, "status" | "published">): boolean {
  return (product.status ?? "active").toLowerCase() === "active" && (product.published ?? "true").toLowerCase() === "true";
}

function filterCsvProducts(options: CsvProductFilter): CsvProduct[] {
  const { products } = loadCsvCatalog();
  const search = options.search?.trim().toLowerCase();
  const type = options.type?.trim().toLowerCase();

  let filtered = products;

  if (options.visibility === "active") filtered = filtered.filter(isCsvProductActive);
  if (options.visibility === "inactive") filtered = filtered.filter(p => !isCsvProductActive(p));

  if (search) {
    filtered = filtered.filter(
      p =>
        p.title.toLowerCase().includes(search) ||
        p.handle.toLowerCase().includes(search) ||
        (p.type && p.type.toLowerCase().includes(search)) ||
        (p.tags && p.tags.toLowerCase().includes(search))
    );
  }

  if (type && type !== "all") {
    filtered = filtered.filter(p => p.type && p.type.toLowerCase() === type);
  }

  return filtered;
}

export function listCsvProducts(options: CsvProductFilter & { limit?: number; offset?: number } = {}): CsvProduct[] {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  return filterCsvProducts(options).slice(offset, offset + limit);
}

export function countCsvProducts(options: CsvProductFilter = {}): number {
  return filterCsvProducts(options).length;
}

export function getCsvProductWithDetails(handle: string): CsvProduct | null {
  const { byHandle } = loadCsvCatalog();
  return byHandle.get(handle) || null;
}

export function getCsvStoreProduct(id: string): { id: string; name: string; amount: number; tags: string | null } | null {
  const { byHandle } = loadCsvCatalog();
  const found = byHandle.get(id);
  if (!found) return null;
  return {
    id: found.handle,
    name: found.title,
    amount: found.price,
    tags: found.tags,
  };
}

export function getCsvCategories(): string[] {
  const { types } = loadCsvCatalog();
  return types;
}

// -------------------------------------------------------------
// Customisation add-ons (ready-made namesets and sleeve patches)
// -------------------------------------------------------------

export type AddOnKind = "nameset" | "patch";

export type CatalogAddOn = {
  kind: AddOnKind;
  sku: string;
  handle: string;
  name: string;
  price: number;
  image: string | null;
};

const tagSet = (tags: string | null) => new Set((tags ?? "").split(",").map(tag => tag.trim().toLowerCase()).filter(Boolean));

/**
 * Every patch category is tagged "Patch" in the catalog; ready-made namesets
 * carry an extra "nameset" tag. Shirts that were filed under the patch type by
 * mistake have no "Patch" tag, so they are left out.
 */
function addOnKindOf(product: CsvProduct): AddOnKind | null {
  const tags = tagSet(product.tags);
  if (!tags.has("patch")) return null;
  // About 40 namesets carry only the "Patch" tag, so the product name counts too.
  return tags.has("nameset") || /\bname\s?set\b/i.test(product.title) ? "nameset" : "patch";
}

let addOnCache: { list: CatalogAddOn[]; bySku: Map<string, CatalogAddOn> } | null = null;

function loadAddOns() {
  if (addOnCache) return addOnCache;
  const list: CatalogAddOn[] = [];
  for (const product of loadCsvCatalog().products) {
    const kind = addOnKindOf(product);
    if (!kind || !isCsvProductActive(product)) continue;
    list.push({
      kind,
      sku: product.primaryVariant?.sku || `${product.handle}-default`,
      handle: product.handle,
      name: product.title,
      price: product.price,
      image: product.primaryImage?.src || null,
    });
  }
  list.sort((a, b) => a.name.localeCompare(b.name));
  addOnCache = { list, bySku: new Map(list.map(addOn => [addOn.sku.toLowerCase(), addOn])) };
  return addOnCache;
}

export function listCatalogAddOns(options: { kind: AddOnKind; search?: string; limit?: number; offset?: number }) {
  const search = options.search?.trim().toLowerCase();
  const matching = loadAddOns().list.filter(
    addOn =>
      addOn.kind === options.kind &&
      (!search || addOn.name.toLowerCase().includes(search) || addOn.sku.toLowerCase().includes(search))
  );
  const offset = options.offset ?? 0;
  return { total: matching.length, items: matching.slice(offset, offset + (options.limit ?? 30)) };
}

export function findCatalogAddOn(sku: string, kind: AddOnKind): CatalogAddOn | null {
  const addOn = loadAddOns().bySku.get(sku.trim().toLowerCase());
  return addOn && addOn.kind === kind ? addOn : null;
}
