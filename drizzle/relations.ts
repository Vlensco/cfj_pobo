import { relations } from "drizzle-orm";
import {
  customers,
  followUpReminderDeliveries,
  orderLineItems,
  orderRequests,
  orders,
  productImages,
  products,
  productVariants,
  users,
} from "./schema";

export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
  images: many(productImages),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productHandle],
    references: [products.handle],
  }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productHandle],
    references: [products.handle],
  }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  lineItems: many(orderLineItems),
}));

export const orderLineItemsRelations = relations(orderLineItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderLineItems.orderName],
    references: [orders.name],
  }),
}));

export const orderRequestsRelations = relations(orderRequests, ({ many }) => ({
  reminderDeliveries: many(followUpReminderDeliveries),
}));

export const followUpReminderDeliveriesRelations = relations(followUpReminderDeliveries, ({ one }) => ({
  orderRequest: one(orderRequests, {
    fields: [followUpReminderDeliveries.orderRequestId],
    references: [orderRequests.id],
  }),
}));
