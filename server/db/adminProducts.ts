import { and, eq } from "drizzle-orm";
import { productImages, products, productVariants } from "../../drizzle/schema";
import { Database, getDb } from "./client";

// -------------------------------------------------------------
// Admin catalog management
// -------------------------------------------------------------

type AdminProductInput = {
  title: string;
  handle: string;
  bodyHtml?: string;
  vendor?: string;
  type?: string;
  tags?: string;
  price: string;
  imageUrl?: string;
  colors?: string[];
  sizes?: string[];
};

async function requireDb(): Promise<Database> {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db;
}

export async function createAdminProduct(data: AdminProductInput) {
  const db = await requireDb();

  return db.transaction(async tx => {
    const [createdProduct] = await tx
      .insert(products)
      .values({
        handle: data.handle,
        title: data.title,
        bodyHtml: data.bodyHtml || "",
        vendor: data.vendor || "Terrace",
        type: data.type || "Apparel",
        tags: data.tags || "Drop 01",
        published: "true",
        status: "active",
      })
      .returning();

    await tx.insert(productVariants).values({
      productHandle: data.handle,
      sku: `TR-${data.handle.substring(0, 8).toUpperCase()}`,
      price: data.price,
      inventoryQty: 20,
      option1Value: data.sizes?.[0] || "M",
      option2Value: data.colors?.[0] || "Standard",
    });

    if (data.imageUrl) {
      await tx.insert(productImages).values({ productHandle: data.handle, position: 1, src: data.imageUrl });
    }

    return createdProduct;
  });
}

export async function updateAdminProduct(
  handle: string,
  data: Partial<Pick<AdminProductInput, "title" | "bodyHtml" | "type" | "tags" | "price" | "imageUrl">>
) {
  const db = await requireDb();

  return db.transaction(async tx => {
    const [updated] = await tx
      .update(products)
      .set({
        title: data.title,
        bodyHtml: data.bodyHtml,
        type: data.type,
        tags: data.tags,
        updatedAt: new Date(),
      })
      .where(eq(products.handle, handle))
      .returning();

    if (data.price) {
      await tx.update(productVariants).set({ price: data.price }).where(eq(productVariants.productHandle, handle));
    }

    if (data.imageUrl) {
      const [primaryImage] = await tx
        .select()
        .from(productImages)
        .where(and(eq(productImages.productHandle, handle), eq(productImages.position, 1)))
        .limit(1);

      if (primaryImage) {
        await tx.update(productImages).set({ src: data.imageUrl }).where(eq(productImages.id, primaryImage.id));
      } else {
        await tx.insert(productImages).values({ productHandle: handle, position: 1, src: data.imageUrl });
      }
    }

    return updated;
  });
}

/** Shows a product on the storefront (`active` + published) or hides it (`draft` + unpublished). */
export async function setAdminProductActive(handle: string, active: boolean) {
  const db = await requireDb();
  const [updated] = await db
    .update(products)
    .set({ status: active ? "active" : "draft", published: active ? "true" : "false", updatedAt: new Date() })
    .where(eq(products.handle, handle))
    .returning();
  if (!updated) throw new Error("Product not found");
  return updated;
}

export async function deleteAdminProduct(handle: string) {
  const db = await requireDb();

  return db.transaction(async tx => {
    await tx.delete(productImages).where(eq(productImages.productHandle, handle));
    await tx.delete(productVariants).where(eq(productVariants.productHandle, handle));
    const [deleted] = await tx.delete(products).where(eq(products.handle, handle)).returning();
    return deleted;
  });
}
