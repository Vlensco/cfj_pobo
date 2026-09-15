import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import Papa from "papaparse";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../drizzle/schema";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL is not set in environment or .env file.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const db = drizzle(pool, { schema });

function cleanString(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  let s = String(val).trim();
  if (s.startsWith("'")) {
    s = s.slice(1).trim();
  }
  return s.length > 0 ? s : null;
}

function parseDecimal(val: unknown, defaultValue = "0.00"): string {
  const s = cleanString(val);
  if (!s) return defaultValue;
  const num = parseFloat(s.replace(/,/g, ""));
  return isNaN(num) ? defaultValue : num.toFixed(2);
}

function parseInteger(val: unknown, defaultValue = 0): number {
  const s = cleanString(val);
  if (!s) return defaultValue;
  const num = parseInt(s, 10);
  return isNaN(num) ? defaultValue : num;
}

function parseBoolean(val: unknown): boolean {
  const s = cleanString(val)?.toLowerCase();
  return s === "true" || s === "yes" || s === "1";
}

function parseDate(val: unknown): Date | null {
  const s = cleanString(val);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

async function importCustomers() {
  const filePath = path.resolve(process.cwd(), "Database/customers_export.csv");
  if (!fs.existsSync(filePath)) {
    console.warn("⚠️ Customers CSV not found at:", filePath);
    return;
  }
  console.log("📥 Reading customers CSV...");
  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });

  const records = [];
  const seenIds = new Set<string>();

  for (const row of parsed.data) {
    const rawId = cleanString(row["Customer ID"]);
    if (!rawId || seenIds.has(rawId)) continue;
    seenIds.add(rawId);

    records.push({
      id: rawId,
      firstName: cleanString(row["First Name"]),
      lastName: cleanString(row["Last Name"]),
      email: cleanString(row["Email"]),
      acceptsEmailMarketing: cleanString(row["Accepts Email Marketing"]),
      defaultAddressCompany: cleanString(row["Default Address Company"]),
      defaultAddressAddress1: cleanString(row["Default Address Address1"]),
      defaultAddressAddress2: cleanString(row["Default Address Address2"]),
      defaultAddressCity: cleanString(row["Default Address City"]),
      defaultAddressProvinceCode: cleanString(row["Default Address Province Code"]),
      defaultAddressCountryCode: cleanString(row["Default Address Country Code"]),
      defaultAddressZip: cleanString(row["Default Address Zip"]),
      defaultAddressPhone: cleanString(row["Default Address Phone"]),
      phone: cleanString(row["Phone"]),
      acceptsSmsMarketing: cleanString(row["Accepts SMS Marketing"]),
      totalSpent: parseDecimal(row["Total Spent"]),
      totalOrders: parseInteger(row["Total Orders"]),
      note: cleanString(row["Note"]),
      taxExempt: cleanString(row["Tax Exempt"]),
      tags: cleanString(row["Tags"]),
      acceptsWhatsappMarketing: cleanString(row["Accepts WhatsApp Marketing"]),
    });
  }

  console.log(`⏳ Inserting ${records.length} customers into PostgreSQL...`);
  const chunkSize = 250;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    await db.insert(schema.customers).values(chunk).onConflictDoNothing();
  }
  console.log(`✅ Customers imported: ${records.length}`);
}

async function importProducts() {
  const filePath = path.resolve(process.cwd(), "Database/products_export_1.csv");
  if (!fs.existsSync(filePath)) {
    console.warn("⚠️ Products CSV not found at:", filePath);
    return;
  }
  console.log("📥 Reading products CSV...");
  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });

  const productsMap = new Map<string, typeof schema.products.$inferInsert>();
  const variants: (typeof schema.productVariants.$inferInsert)[] = [];
  const images: (typeof schema.productImages.$inferInsert)[] = [];
  const seenImages = new Set<string>();

  for (const row of parsed.data) {
    const handle = cleanString(row["Handle"]);
    if (!handle) continue;

    if (!productsMap.has(handle)) {
      productsMap.set(handle, {
        handle,
        title: cleanString(row["Title"]) || handle,
        bodyHtml: cleanString(row["Body (HTML)"]),
        vendor: cleanString(row["Vendor"]),
        productCategory: cleanString(row["Product Category"]),
        type: cleanString(row["Type"]),
        tags: cleanString(row["Tags"]),
        published: cleanString(row["Published"]),
        status: cleanString(row["Status"]),
        option1Name: cleanString(row["Option1 Name"]),
        option2Name: cleanString(row["Option2 Name"]),
        option3Name: cleanString(row["Option3 Name"]),
        seoTitle: cleanString(row["SEO Title"]),
        seoDescription: cleanString(row["SEO Description"]),
      });
    }

    const sku = cleanString(row["Variant SKU"]);
    const option1Value = cleanString(row["Option1 Value"]);
    const priceStr = parseDecimal(row["Variant Price"]);

    if (sku || option1Value || parseFloat(priceStr) > 0) {
      variants.push({
        productHandle: handle,
        sku: sku,
        option1Value: option1Value,
        option2Value: cleanString(row["Option2 Value"]),
        option3Value: cleanString(row["Option3 Value"]),
        price: priceStr,
        compareAtPrice: row["Variant Compare At Price"] ? parseDecimal(row["Variant Compare At Price"]) : null,
        grams: parseDecimal(row["Variant Grams"], "0.00"),
        inventoryQty: parseInteger(row["Variant Inventory Qty"], 0),
        inventoryPolicy: cleanString(row["Variant Inventory Policy"]),
        fulfillmentService: cleanString(row["Variant Fulfillment Service"]),
        inventoryTracker: cleanString(row["Variant Inventory Tracker"]),
        requiresShipping: parseBoolean(row["Variant Requires Shipping"]),
        taxable: parseBoolean(row["Variant Taxable"]),
        barcode: cleanString(row["Variant Barcode"]),
        imageSrc: cleanString(row["Variant Image"]),
        position: parseInteger(row["Image Position"], 1),
      });
    }

    const imageSrc = cleanString(row["Image Src"]);
    if (imageSrc) {
      const imgKey = `${handle}:::${imageSrc}`;
      if (!seenImages.has(imgKey)) {
        seenImages.add(imgKey);
        images.push({
          productHandle: handle,
          src: imageSrc,
          position: parseInteger(row["Image Position"], 1),
          altText: cleanString(row["Image Alt Text"]),
        });
      }
    }
  }

  const productList = Array.from(productsMap.values());
  console.log(`⏳ Inserting ${productList.length} products into PostgreSQL...`);
  const chunkSize = 250;
  for (let i = 0; i < productList.length; i += chunkSize) {
    const chunk = productList.slice(i, i + chunkSize);
    await db.insert(schema.products).values(chunk).onConflictDoNothing();
  }

  console.log(`⏳ Inserting ${variants.length} product variants...`);
  for (let i = 0; i < variants.length; i += chunkSize) {
    const chunk = variants.slice(i, i + chunkSize);
    await db.insert(schema.productVariants).values(chunk).onConflictDoNothing();
  }

  console.log(`⏳ Inserting ${images.length} product images...`);
  for (let i = 0; i < images.length; i += chunkSize) {
    const chunk = images.slice(i, i + chunkSize);
    await db.insert(schema.productImages).values(chunk).onConflictDoNothing();
  }

  console.log(`✅ Products imported: ${productList.length}, Variants: ${variants.length}, Images: ${images.length}`);
}

async function importOrders() {
  const filePath = path.resolve(process.cwd(), "Database/orders_export_1.csv");
  if (!fs.existsSync(filePath)) {
    console.warn("⚠️ Orders CSV not found at:", filePath);
    return;
  }
  console.log("📥 Reading orders CSV...");
  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });

  const ordersMap = new Map<string, typeof schema.orders.$inferInsert>();
  const lineItems: (typeof schema.orderLineItems.$inferInsert)[] = [];

  for (const row of parsed.data) {
    const orderName = cleanString(row["Name"]);
    if (!orderName) continue;

    if (!ordersMap.has(orderName) && (row["Email"] || row["Total"] || row["Financial Status"])) {
      ordersMap.set(orderName, {
        name: orderName,
        orderId: cleanString(row["Id"]),
        email: cleanString(row["Email"]),
        financialStatus: cleanString(row["Financial Status"]),
        paidAt: parseDate(row["Paid at"]),
        fulfillmentStatus: cleanString(row["Fulfillment Status"]),
        fulfilledAt: parseDate(row["Fulfilled at"]),
        acceptsMarketing: cleanString(row["Accepts Marketing"]),
        currency: cleanString(row["Currency"]) || "USD",
        subtotal: parseDecimal(row["Subtotal"]),
        shipping: parseDecimal(row["Shipping"]),
        taxes: parseDecimal(row["Taxes"]),
        total: parseDecimal(row["Total"]),
        discountCode: cleanString(row["Discount Code"]),
        discountAmount: parseDecimal(row["Discount Amount"]),
        shippingMethod: cleanString(row["Shipping Method"]),
        billingName: cleanString(row["Billing Name"]),
        billingStreet: cleanString(row["Billing Street"]),
        billingAddress1: cleanString(row["Billing Address1"]),
        billingAddress2: cleanString(row["Billing Address2"]),
        billingCompany: cleanString(row["Billing Company"]),
        billingCity: cleanString(row["Billing City"]),
        billingZip: cleanString(row["Billing Zip"]),
        billingProvince: cleanString(row["Billing Province"]),
        billingCountry: cleanString(row["Billing Country"]),
        billingPhone: cleanString(row["Billing Phone"]),
        shippingName: cleanString(row["Shipping Name"]),
        shippingStreet: cleanString(row["Shipping Street"]),
        shippingAddress1: cleanString(row["Shipping Address1"]),
        shippingAddress2: cleanString(row["Shipping Address2"]),
        shippingCompany: cleanString(row["Shipping Company"]),
        shippingCity: cleanString(row["Shipping City"]),
        shippingZip: cleanString(row["Shipping Zip"]),
        shippingProvince: cleanString(row["Shipping Province"]),
        shippingCountry: cleanString(row["Shipping Country"]),
        shippingPhone: cleanString(row["Shipping Phone"]),
        notes: cleanString(row["Notes"]),
        noteAttributes: cleanString(row["Note Attributes"]),
        cancelledAt: parseDate(row["Cancelled at"]),
        paymentMethod: cleanString(row["Payment Method"]),
        paymentReference: cleanString(row["Payment Reference"]),
        refundedAmount: parseDecimal(row["Refunded Amount"]),
        vendor: cleanString(row["Vendor"]),
        outstandingBalance: parseDecimal(row["Outstanding Balance"]),
        tags: cleanString(row["Tags"]),
        riskLevel: cleanString(row["Risk Level"]),
        source: cleanString(row["Source"]),
        phone: cleanString(row["Phone"]),
        createdAt: parseDate(row["Created at"]) || new Date(),
      });
    }

    const lineitemName = cleanString(row["Lineitem name"]);
    if (lineitemName) {
      lineItems.push({
        orderName: orderName,
        lineitemQuantity: parseInteger(row["Lineitem quantity"], 1),
        lineitemName: lineitemName,
        lineitemPrice: parseDecimal(row["Lineitem price"]),
        lineitemCompareAtPrice: row["Lineitem compare at price"] ? parseDecimal(row["Lineitem compare at price"]) : null,
        lineitemSku: cleanString(row["Lineitem sku"]),
        lineitemRequiresShipping: parseBoolean(row["Lineitem requires shipping"]),
        lineitemTaxable: parseBoolean(row["Lineitem taxable"]),
        lineitemFulfillmentStatus: cleanString(row["Lineitem fulfillment status"]),
        lineitemDiscount: parseDecimal(row["Lineitem discount"]),
        createdAt: parseDate(row["Created at"]) || new Date(),
      });
    }
  }

  const orderList = Array.from(ordersMap.values());
  console.log(`⏳ Inserting ${orderList.length} orders into PostgreSQL...`);
  const chunkSize = 250;
  for (let i = 0; i < orderList.length; i += chunkSize) {
    const chunk = orderList.slice(i, i + chunkSize);
    await db.insert(schema.orders).values(chunk).onConflictDoNothing();
  }

  console.log(`⏳ Inserting ${lineItems.length} order line items...`);
  for (let i = 0; i < lineItems.length; i += chunkSize) {
    const chunk = lineItems.slice(i, i + chunkSize);
    await db.insert(schema.orderLineItems).values(chunk).onConflictDoNothing();
  }

  console.log(`✅ Orders imported: ${orderList.length}, Line items: ${lineItems.length}`);
}

async function run() {
  console.log("🚀 Starting CSV import to PostgreSQL database: cfjersey\n");
  const startTime = Date.now();
  try {
    await importCustomers();
    await importProducts();
    await importOrders();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 CSV Import completed successfully in ${duration}s!`);
  } catch (error) {
    console.error("❌ Error during CSV import:", error);
  } finally {
    await pool.end();
  }
}

run();
