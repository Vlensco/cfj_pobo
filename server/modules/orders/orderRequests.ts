import { desc, eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { orderRequests, orders } from "../../../drizzle/schema";
import { ItemCustomization, parseProductCustomizationMeta } from "../../../shared/customization";
import { findCatalogAddOn } from "../catalog/csvCatalog";
import { getDb, getOrderRequestByReference } from "../../db";
import { RequestedPiece } from "./adminOrders";
import { buildTrackingDetails, OrderTrackingDetails, TrackableOrder } from "./orderTracking";
import { getStoreProduct } from "../catalog/products";

/**
 * A cart line as sent by the storefront. Prices inside `customization` are
 * ignored: the server always re-prices from its own catalog.
 */
export type OrderRequestLineInput = {
  productId: string;
  quantity: number;
  color: string;
  size: string;
  customization?: {
    nameset?: {
      mode?: "custom" | "ready";
      name: string;
      number: string;
      price?: number;
      sku?: string;
      fontReference?: { id: string; fileName: string; mimeType: string };
    };
    patch?: { sku: string; name?: string; price?: number; competition?: string };
    itemNote?: string;
  };
};

type OrderRequestLine = RequestedPiece & { customization: ItemCustomization | null };

const DEMO_REFERENCES = new Set(["TR-READY123", "READY123", "TR-DEMO", "DEMO", "TR-SAMPLE"]);
const DEMO_REFERENCE = "TR-READY123";
const MAX_CUSTOMER_ORDERS = 50;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Requests accepted while the database was unreachable. They live only for the
 * lifetime of this process, so the owner notification is the durable record.
 */
const pendingOrderRequests: TrackableOrder[] = [];

// -------------------------------------------------------------
// Pricing
// -------------------------------------------------------------

function priceCustomization(
  input: OrderRequestLineInput["customization"],
  productTags: string | null | undefined
): ItemCustomization | null {
  if (!input) return null;
  const customization: ItemCustomization = {};

  if (input.nameset?.mode === "ready") {
    const nameset = findCatalogAddOn(input.nameset.sku ?? "", "nameset");
    if (!nameset) throw new Error("A selected ready-made nameset is no longer available.");
    customization.nameset = { mode: "ready", name: nameset.name, number: "", price: nameset.price, sku: nameset.sku };
  } else if (input.nameset) {
    const { name, number, fontReference } = input.nameset;
    if (!fontReference?.id) throw new Error("Please upload a font style reference for your custom nameset.");
    const { namesetPrice } = parseProductCustomizationMeta(productTags);
    customization.nameset = { mode: "custom", name, number, price: namesetPrice, fontReference };
  }

  if (input.patch) {
    const patch = findCatalogAddOn(input.patch.sku, "patch");
    if (!patch) throw new Error("A selected sleeve patch is no longer available.");
    customization.patch = { name: patch.name, sku: patch.sku, price: patch.price };
  }

  if (input.itemNote?.trim()) customization.itemNote = input.itemNote.trim();

  return Object.keys(customization).length > 0 ? customization : null;
}

/** Prices cart lines from the server catalog. Throws when a product or patch is unknown. */
export function buildOrderRequestLines(items: OrderRequestLineInput[]): OrderRequestLine[] {
  return items.map(item => {
    const product = getStoreProduct(item.productId);
    if (!product) throw new Error("A selected product is no longer available.");

    const customization = priceCustomization(item.customization, product.tags);
    const unitAmount = product.amount + (customization?.nameset?.price ?? 0) + (customization?.patch?.price ?? 0);

    return {
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      color: item.color,
      size: item.size,
      unitAmount,
      lineTotal: unitAmount * item.quantity,
      customization,
    };
  });
}

export function sumOrderLines(lines: Pick<OrderRequestLine, "lineTotal">[]): number {
  return lines.reduce((total, line) => total + line.lineTotal, 0);
}

/** Product name including any nameset / patch, for payment line items and receipts. */
export function describeOrderLine(line: OrderRequestLine): string {
  let label = line.name;
  const nameset = line.customization?.nameset;
  if (nameset?.mode === "ready") label += ` (Nameset: ${nameset.name} [${nameset.sku}])`;
  else if (nameset) label += ` (Custom: ${nameset.name} #${nameset.number})`;
  if (line.customization?.patch) label += ` [${line.customization.patch.sku}]`;
  return label;
}

/** Fulfilment recap appended to the order notes so staff see every customisation in one place. */
function buildCustomizationRecap(lines: OrderRequestLine[]): string {
  const recap = lines
    .filter(line => line.customization)
    .map(line => {
      const parts: string[] = [];
      const { nameset, patch, itemNote } = line.customization ?? {};
      if (nameset?.mode === "ready") parts.push(`Ready nameset: ${nameset.name} (SKU: ${nameset.sku})`);
      else if (nameset) {
        const font = nameset.fontReference ? ` · Font ref: /api/uploads/${nameset.fontReference.id} (${nameset.fontReference.fileName})` : "";
        parts.push(`Nameset: ${nameset.name} #${nameset.number}${font}`);
      }
      if (patch) parts.push(`Patch: ${patch.name} (SKU: ${patch.sku})`);
      if (itemNote) parts.push(`Note: ${itemNote}`);
      return `[${line.name} (${line.color}/${line.size})] ${parts.join(" · ")}`;
    });
  return recap.length > 0 ? `--- Customisation / Addons ---\n${recap.join("\n")}` : "";
}

// -------------------------------------------------------------
// Creating orders
// -------------------------------------------------------------

export async function createOrderRequest(input: {
  customerName: string;
  email: string;
  phone: string;
  notes?: string;
  items: OrderRequestLineInput[];
  userOpenId?: string | null;
}) {
  const lines = buildOrderRequestLines(input.items);
  const subtotal = sumOrderLines(lines);
  const reference = `TR-${nanoid(8).toUpperCase()}`;
  const notes = [input.notes?.trim(), buildCustomizationRecap(lines)].filter(Boolean).join("\n\n") || null;

  const order = {
    reference,
    customerName: input.customerName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    notes,
    items: JSON.stringify(lines),
    subtotal,
    currency: "IDR",
    status: "new" as const,
    userOpenId: input.userOpenId ?? null,
  };

  let saved = false;
  const db = await getDb();
  if (db) {
    try {
      await db.insert(orderRequests).values(order);
      saved = true;
    } catch (error) {
      console.error("[OrderRequests] Failed to save order request to the database:", error);
    }
  }

  if (!saved) {
    pendingOrderRequests.unshift({ ...order, createdAt: new Date(), contactedAt: null });
  }

  return { reference, subtotal, lines };
}

/** Mirrors an online checkout (Wise / Stripe / crypto) into order_requests for the admin dashboard. */
export async function recordOnlinePaymentOrder(data: {
  reference: string;
  customerName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  items: Array<{ productId?: string; name: string; quantity: number; price: number; color?: string; size?: string }>;
  subtotal: number;
  currency?: string;
  status?: "new" | "contacted";
  userOpenId?: string | null;
}) {
  const db = await getDb();
  if (!db) return null;

  const lines = data.items.map(item => ({
    productId: item.productId || item.name.toLowerCase().replace(/\s+/g, "-"),
    name: item.name,
    quantity: item.quantity || 1,
    color: item.color || "Standard",
    size: item.size || "M",
    unitAmount: item.price,
    lineTotal: item.price * (item.quantity || 1),
  }));
  const status = data.status || "new";
  const notes = data.notes?.trim() || null;

  const [inserted] = await db
    .insert(orderRequests)
    .values({
      reference: data.reference,
      customerName: (data.customerName || "Terrace Customer").trim(),
      email: (data.email || "customer@terrace.study").trim().toLowerCase(),
      phone: (data.phone || "+628123456789").trim(),
      notes,
      items: JSON.stringify(lines),
      subtotal: data.subtotal || sumOrderLines(lines),
      currency: data.currency || "IDR",
      status,
      userOpenId: data.userOpenId ?? null,
    })
    .onConflictDoUpdate({ target: orderRequests.reference, set: { status, notes } })
    .returning();

  return inserted;
}

// -------------------------------------------------------------
// Looking orders up for tracking
// -------------------------------------------------------------

function buildDemoOrder(): TrackableOrder {
  return {
    reference: DEMO_REFERENCE,
    customerName: "Terrace Collector (Demo)",
    email: "collector@terrace.study",
    phone: "+62 812-3456-7890",
    notes: "Paket siap dikirim via JNE YES. Harap hubungi kurir saat tiba di lokasi.",
    items: JSON.stringify([
      {
        productId: "casual-heavyweight-hoodie-black",
        name: "Terrace Heavyweight Archive Hoodie",
        quantity: 1,
        color: "Pitch Black",
        size: "L",
        unitAmount: 785000,
        lineTotal: 785000,
      },
      {
        productId: "junction-ls",
        name: "Junction Long Sleeve",
        quantity: 1,
        color: "Ink",
        size: "L",
        unitAmount: 1888000,
        lineTotal: 1888000,
      },
    ]),
    subtotal: 2673000,
    currency: "IDR",
    status: "contacted",
    createdAt: new Date(Date.now() - 28 * HOUR_MS),
    contactedAt: new Date(Date.now() - 14 * HOUR_MS),
  };
}

/** Single-line order used when only a payment total is known (no itemised cart). */
function buildSummaryItems(name: string, amount: number, color: string): string {
  return JSON.stringify([
    { productId: "terrace-piece", name, quantity: 1, color, size: "Standard", unitAmount: amount, lineTotal: amount },
  ]);
}

/** Online checkouts stored in the `orders` table, matched by exact order name or payment id. */
async function findOnlineOrder(reference: string): Promise<TrackableOrder | null> {
  const db = await getDb();
  if (!db) return null;

  const [order] = await db
    .select()
    .from(orders)
    .where(
      or(
        eq(orders.name, reference),
        eq(orders.name, `#${reference}`),
        eq(orders.orderId, reference),
        eq(orders.paymentReference, reference)
      )
    )
    .limit(1);
  if (!order) return null;

  const total = Math.round(Number(order.total || 0));
  return {
    reference: order.name.replace(/^#/, ""),
    customerName: order.email ? order.email.split("@")[0] : "Customer",
    email: order.email || "customer@terrace.study",
    phone: "+62 812-0000-0000",
    notes: order.notes || `Metode Pembayaran: ${order.paymentMethod || "Online Checkout"}`,
    items: buildSummaryItems(`Pesanan Koleksi TERRACE (${order.name})`, total, "Archive Edition"),
    subtotal: total,
    currency: order.currency || "IDR",
    status: order.fulfillmentStatus === "fulfilled" ? "closed" : order.financialStatus === "paid" ? "contacted" : "new",
    createdAt: order.createdAt,
    contactedAt: order.paidAt || order.createdAt,
  };
}

async function findTrackableOrder(reference: string): Promise<TrackableOrder | null> {
  const cleaned = reference.trim().replace(/^#/, "");
  const upper = cleaned.toUpperCase();
  if (!cleaned) return null;

  if (DEMO_REFERENCES.has(upper)) return buildDemoOrder();

  try {
    const request = await getOrderRequestByReference(cleaned);
    if (request) return request;
  } catch (error) {
    console.warn("[OrderRequests] Reference lookup failed:", error);
  }

  const pending = pendingOrderRequests.find(order => order.reference.toUpperCase() === upper);
  if (pending) return pending;

  try {
    const onlineOrder = await findOnlineOrder(cleaned);
    if (onlineOrder) return onlineOrder;
  } catch (error) {
    console.warn("[OrderRequests] Online order lookup failed:", error);
  }

  return null;
}

/** Public tracking view for one order, or null when the exact reference is unknown. */
export async function getOrderTrackingDetails(reference: string): Promise<OrderTrackingDetails | null> {
  const order = await findTrackableOrder(reference);
  return order ? buildTrackingDetails(order) : null;
}

async function listReferencesForCustomer(userOpenId: string, verifiedEmail: string | null): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const [requests, onlineOrders] = await Promise.all([
      db
        .select({ reference: orderRequests.reference })
        .from(orderRequests)
        .where(
          verifiedEmail
            ? or(eq(orderRequests.userOpenId, userOpenId), eq(orderRequests.email, verifiedEmail))
            : eq(orderRequests.userOpenId, userOpenId)
        )
        .orderBy(desc(orderRequests.createdAt))
        .limit(MAX_CUSTOMER_ORDERS),
      verifiedEmail
        ? db.select({ name: orders.name }).from(orders).where(eq(orders.email, verifiedEmail)).limit(MAX_CUSTOMER_ORDERS)
        : Promise.resolve([]),
    ]);
    return [...requests.map(row => row.reference), ...onlineOrders.map(row => row.name.replace(/^#/, ""))];
  } catch (error) {
    console.warn("[OrderRequests] Could not list customer orders:", error);
    return [];
  }
}

/**
 * Order history for the "My Orders" page: only orders placed by the signed-in
 * account. `verifiedEmail` must come from a session whose email has been proven
 * (never from request input), because it also unlocks orders matched by email.
 */
export async function getCustomerOrders(options: { userOpenId: string; verifiedEmail?: string | null }) {
  const email = options.verifiedEmail?.trim().toLowerCase() || null;
  const references = new Set(await listReferencesForCustomer(options.userOpenId, email));
  const pending = pendingOrderRequests.filter(order => order.userOpenId === options.userOpenId);
  for (const order of pending) references.add(order.reference);

  const lookups = await Promise.all(
    Array.from(references)
      .slice(0, MAX_CUSTOMER_ORDERS)
      .map(reference => getOrderTrackingDetails(reference).catch(() => null))
  );

  const byReference = new Map<string, OrderTrackingDetails>();
  for (const details of lookups) {
    if (details && !byReference.has(details.reference)) byReference.set(details.reference, details);
  }

  return Array.from(byReference.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
