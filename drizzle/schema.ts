import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Enums
 */
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const orderRequestStatusEnum = pgEnum("order_request_status", ["new", "contacted", "closed"]);
export const reminderDeliveryStatusEnum = pgEnum("reminder_delivery_status", ["claimed", "delivered"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 64 }),
  passwordHash: text("password_hash"),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Customers table backing customers_export.csv
 */
export const customers = pgTable("customers", {
  id: varchar("id", { length: 64 }).primaryKey(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: varchar("email", { length: 320 }),
  acceptsEmailMarketing: varchar("accepts_email_marketing", { length: 16 }),
  defaultAddressCompany: text("default_address_company"),
  defaultAddressAddress1: text("default_address_address1"),
  defaultAddressAddress2: text("default_address_address2"),
  defaultAddressCity: text("default_address_city"),
  defaultAddressProvinceCode: varchar("default_address_province_code", { length: 64 }),
  defaultAddressCountryCode: varchar("default_address_country_code", { length: 64 }),
  defaultAddressZip: varchar("default_address_zip", { length: 64 }),
  defaultAddressPhone: varchar("default_address_phone", { length: 64 }),
  phone: varchar("phone", { length: 64 }),
  acceptsSmsMarketing: varchar("accepts_sms_marketing", { length: 16 }),
  totalSpent: numeric("total_spent", { precision: 12, scale: 2 }).default("0.00"),
  totalOrders: integer("total_orders").default(0),
  note: text("note"),
  taxExempt: varchar("tax_exempt", { length: 16 }),
  tags: text("tags"),
  acceptsWhatsappMarketing: varchar("accepts_whatsapp_marketing", { length: 16 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * Products table backing products_export_1.csv
 */
export const products = pgTable("products", {
  handle: varchar("handle", { length: 255 }).primaryKey(),
  title: text("title").notNull(),
  bodyHtml: text("body_html"),
  vendor: varchar("vendor", { length: 255 }),
  productCategory: text("product_category"),
  type: varchar("type", { length: 255 }),
  tags: text("tags"),
  published: varchar("published", { length: 32 }),
  status: varchar("status", { length: 64 }),
  option1Name: varchar("option1_name", { length: 128 }),
  option2Name: varchar("option2_name", { length: 128 }),
  option3Name: varchar("option3_name", { length: 128 }),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Product Variants table
 */
export const productVariants = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productHandle: varchar("product_handle", { length: 255 })
    .notNull()
    .references(() => products.handle, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 128 }),
  option1Value: text("option1_value"),
  option2Value: text("option2_value"),
  option3Value: text("option3_value"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0.00"),
  compareAtPrice: numeric("compare_at_price", { precision: 12, scale: 2 }),
  grams: numeric("grams", { precision: 10, scale: 2 }).default("0.00"),
  inventoryQty: integer("inventory_qty").default(0),
  inventoryPolicy: varchar("inventory_policy", { length: 64 }),
  fulfillmentService: varchar("fulfillment_service", { length: 64 }),
  inventoryTracker: varchar("inventory_tracker", { length: 64 }),
  requiresShipping: boolean("requires_shipping").default(true),
  taxable: boolean("taxable").default(true),
  barcode: varchar("barcode", { length: 128 }),
  imageSrc: text("image_src"),
  position: integer("position").default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("product_variants_handle_idx").on(table.productHandle),
  index("product_variants_sku_idx").on(table.sku),
]);

export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = typeof productVariants.$inferInsert;

/**
 * Product Images table
 */
export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productHandle: varchar("product_handle", { length: 255 })
    .notNull()
    .references(() => products.handle, { onDelete: "cascade" }),
  src: text("src").notNull(),
  position: integer("position").default(1),
  altText: text("alt_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("product_images_handle_idx").on(table.productHandle),
]);

export type ProductImage = typeof productImages.$inferSelect;
export type InsertProductImage = typeof productImages.$inferInsert;

/**
 * Orders table backing orders_export_1.csv
 */
export const orders = pgTable("orders", {
  name: varchar("name", { length: 64 }).primaryKey(), // e.g. #CFJ2471
  orderId: varchar("order_id", { length: 64 }),
  email: varchar("email", { length: 320 }),
  financialStatus: varchar("financial_status", { length: 64 }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  fulfillmentStatus: varchar("fulfillment_status", { length: 64 }),
  fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
  acceptsMarketing: varchar("accepts_marketing", { length: 16 }),
  currency: varchar("currency", { length: 10 }).default("USD"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0.00"),
  shipping: numeric("shipping", { precision: 12, scale: 2 }).default("0.00"),
  taxes: numeric("taxes", { precision: 12, scale: 2 }).default("0.00"),
  total: numeric("total", { precision: 12, scale: 2 }).default("0.00"),
  discountCode: text("discount_code"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).default("0.00"),
  shippingMethod: text("shipping_method"),
  billingName: text("billing_name"),
  billingStreet: text("billing_street"),
  billingAddress1: text("billing_address1"),
  billingAddress2: text("billing_address2"),
  billingCompany: text("billing_company"),
  billingCity: text("billing_city"),
  billingZip: text("billing_zip"),
  billingProvince: text("billing_province"),
  billingCountry: text("billing_country"),
  billingPhone: varchar("billing_phone", { length: 64 }),
  shippingName: text("shipping_name"),
  shippingStreet: text("shipping_street"),
  shippingAddress1: text("shipping_address1"),
  shippingAddress2: text("shipping_address2"),
  shippingCompany: text("shipping_company"),
  shippingCity: text("shipping_city"),
  shippingZip: text("shipping_zip"),
  shippingProvince: text("shipping_province"),
  shippingCountry: text("shipping_country"),
  shippingPhone: varchar("shipping_phone", { length: 64 }),
  notes: text("notes"),
  noteAttributes: text("note_attributes"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  refundedAmount: numeric("refunded_amount", { precision: 12, scale: 2 }).default("0.00"),
  vendor: text("vendor"),
  outstandingBalance: numeric("outstanding_balance", { precision: 12, scale: 2 }).default("0.00"),
  tags: text("tags"),
  riskLevel: varchar("risk_level", { length: 64 }),
  source: varchar("source", { length: 64 }),
  phone: varchar("phone", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("orders_email_idx").on(table.email),
  index("orders_created_at_idx").on(table.createdAt),
]);

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Order Line Items table
 */
export const orderLineItems = pgTable("order_line_items", {
  id: serial("id").primaryKey(),
  orderName: varchar("order_name", { length: 64 })
    .notNull()
    .references(() => orders.name, { onDelete: "cascade" }),
  lineitemQuantity: integer("lineitem_quantity").default(1),
  lineitemName: text("lineitem_name").notNull(),
  lineitemPrice: numeric("lineitem_price", { precision: 12, scale: 2 }).default("0.00"),
  lineitemCompareAtPrice: numeric("lineitem_compare_at_price", { precision: 12, scale: 2 }),
  lineitemSku: varchar("lineitem_sku", { length: 128 }),
  lineitemRequiresShipping: boolean("lineitem_requires_shipping").default(true),
  lineitemTaxable: boolean("lineitem_taxable").default(true),
  lineitemFulfillmentStatus: varchar("lineitem_fulfillment_status", { length: 64 }),
  lineitemDiscount: numeric("lineitem_discount", { precision: 12, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("order_line_items_order_name_idx").on(table.orderName),
]);

export type OrderLineItem = typeof orderLineItems.$inferSelect;
export type InsertOrderLineItem = typeof orderLineItems.$inferInsert;

/**
 * Order Requests table for storefront direct order requests (PRD)
 */
export const orderRequests = pgTable("order_requests", {
  id: serial("id").primaryKey(),
  reference: varchar("reference", { length: 32 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  notes: text("notes"),
  items: text("items").notNull(),
  subtotal: integer("subtotal").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("IDR"),
  status: orderRequestStatusEnum("status").notNull().default("new"),
  fulfillmentStage: varchar("fulfillment_stage", { length: 32 }).default("placed"),
  courierName: varchar("courier_name", { length: 120 }),
  trackingNumber: varchar("tracking_number", { length: 120 }),
  trackingUrl: text("tracking_url"),
  contactedAt: timestamp("contacted_at", { withTimezone: true }),
  lastFollowUpReminderAt: timestamp("last_follow_up_reminder_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("order_requests_status_idx").on(table.status),
  index("order_requests_created_at_idx").on(table.createdAt),
]);

export type OrderRequest = typeof orderRequests.$inferSelect;
export type InsertOrderRequest = typeof orderRequests.$inferInsert;

/**
 * Follow-up reminder settings table
 */
export const followUpReminderSettings = pgTable("follow_up_reminder_settings", {
  id: serial("id").primaryKey(),
  scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }).unique(),
  enabled: integer("enabled").notNull().default(1),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type FollowUpReminderSettings = typeof followUpReminderSettings.$inferSelect;

/**
 * Follow-up reminder deliveries table
 */
export const followUpReminderDeliveries = pgTable("follow_up_reminder_deliveries", {
  id: serial("id").primaryKey(),
  orderRequestId: integer("order_request_id").notNull(),
  reminderDate: varchar("reminder_date", { length: 10 }).notNull(),
  claimToken: varchar("claim_token", { length: 64 }).notNull(),
  status: reminderDeliveryStatusEnum("status").notNull().default("claimed"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
}, table => [
  uniqueIndex("follow_up_reminder_deliveries_order_day_unique").on(table.orderRequestId, table.reminderDate),
]);

export type FollowUpReminderDelivery = typeof followUpReminderDeliveries.$inferSelect;

/**
 * Product Analytics Events table (tracking add-to-bag, view, etc.)
 */
export const productAnalyticsEvents = pgTable("product_analytics_events", {
  id: serial("id").primaryKey(),
  productId: varchar("product_id", { length: 128 }).notNull(),
  productName: text("product_name").notNull(),
  eventType: varchar("event_type", { length: 64 }).notNull().default("add_to_bag"),
  color: varchar("color", { length: 64 }),
  size: varchar("size", { length: 32 }),
  price: numeric("price", { precision: 12, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("product_analytics_events_product_idx").on(table.productId),
  index("product_analytics_events_type_idx").on(table.eventType),
  index("product_analytics_events_created_at_idx").on(table.createdAt),
]);

export type ProductAnalyticsEvent = typeof productAnalyticsEvents.$inferSelect;
export type InsertProductAnalyticsEvent = typeof productAnalyticsEvents.$inferInsert;

