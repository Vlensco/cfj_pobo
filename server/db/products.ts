import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { productImages, products, productVariants } from "../../drizzle/schema";
import { countCsvProducts, getCsvProductWithDetails, isCsvProductActive, listCsvProducts } from "../modules/catalog/csvCatalog";
import { reportQueryFailure, getDb } from "./client";

export type ProductVisibility = "all" | "active" | "inactive";
type ProductFilter = { search?: string; type?: string; visibility?: ProductVisibility };

// -------------------------------------------------------------
// Catalog (database first, CSV export as fallback)
// -------------------------------------------------------------

/** A product is live on the storefront only when it is both `active` and published. */
const productIsActive = sql`(lower(coalesce(${products.status}, 'active')) = 'active' and lower(coalesce(${products.published}, 'true')) = 'true')`;

function buildProductConditions({ search, type, visibility }: ProductFilter) {
  const conditions = [];
  if (visibility === "active") conditions.push(productIsActive);
  if (visibility === "inactive") conditions.push(sql`not ${productIsActive}`);
  if (search) {
    conditions.push(or(ilike(products.title, `%${search}%`), ilike(products.handle, `%${search}%`)));
  }
  if (type) {
    conditions.push(eq(products.type, type));
  }
  return conditions.length ? and(...conditions) : undefined;
}

export async function listDbProducts(options: ProductFilter & { limit?: number; offset?: number } = {}) {
  const db = await getDb();
  if (db) {
    try {
      const { limit = 50, offset = 0 } = options;
      const items = await db
        .select()
        .from(products)
        .where(buildProductConditions(options))
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset);

      if (items.length > 0) {
        const handles = items.map(item => item.handle);
        const [variants, images] = await Promise.all([
          db.select().from(productVariants).where(inArray(productVariants.productHandle, handles)),
          db.select().from(productImages).where(inArray(productImages.productHandle, handles)),
        ]);

        return items.map(product => ({
          ...product,
          primaryVariant: variants.find(variant => variant.productHandle === product.handle) || null,
          primaryImage: images.find(image => image.productHandle === product.handle) || null,
        }));
      }
    } catch (error) {
      reportQueryFailure("listDbProducts", error);
    }
  }

  return listCsvProducts(options);
}

export async function countDbProducts(options: ProductFilter = {}) {
  const db = await getDb();
  if (db) {
    try {
      const [result] = await db.select({ count: count() }).from(products).where(buildProductConditions(options));
      const dbCount = Number(result?.count || 0);
      if (dbCount > 0) return dbCount;
    } catch (error) {
      reportQueryFailure("countDbProducts", error);
    }
  }

  return countCsvProducts(options);
}

/** Totals behind the admin catalog's All / Active / Inactive tabs. */
export async function countDbProductsByVisibility(options: Pick<ProductFilter, "search"> = {}) {
  const db = await getDb();
  if (db) {
    try {
      const [result] = await db
        .select({ all: count(), active: sql<number>`count(*) filter (where ${productIsActive})` })
        .from(products)
        .where(buildProductConditions(options));
      const all = Number(result?.all || 0);
      const active = Number(result?.active || 0);
      if (all > 0) return { all, active, inactive: all - active };
    } catch (error) {
      reportQueryFailure("countDbProductsByVisibility", error);
    }
  }

  const all = countCsvProducts(options);
  const active = countCsvProducts({ ...options, visibility: "active" });
  return { all, active, inactive: all - active };
}

export async function getDbProductWithDetails(handle: string, options: { activeOnly?: boolean } = {}) {
  const db = await getDb();
  if (db) {
    try {
      const [product] = await db.select().from(products).where(eq(products.handle, handle)).limit(1);
      // A product deactivated in the database stays hidden even if the CSV export still lists it as active.
      if (product && options.activeOnly && !isCsvProductActive(product)) return null;
      if (product) {
        const [variants, images] = await Promise.all([
          db.select().from(productVariants).where(eq(productVariants.productHandle, handle)),
          db
            .select()
            .from(productImages)
            .where(eq(productImages.productHandle, handle))
            .orderBy(productImages.position),
        ]);
        return { ...product, variants, images };
      }
    } catch (error) {
      reportQueryFailure("getDbProductWithDetails", error);
    }
  }

  const csvProduct = getCsvProductWithDetails(handle);
  if (csvProduct && options.activeOnly && !isCsvProductActive(csvProduct)) return null;
  return csvProduct;
}
