import { adminOrderRouter } from "./adminOrders";
import { adminProductRouter } from "./adminProducts";
import { analyticsRouter } from "./analytics";
import { authRouter } from "./auth";
import { catalogRouter } from "./catalog";
import { nowpaymentsRouter } from "./nowpayments";
import { orderRequestRouter } from "./orderRequests";
import { regionRouter } from "./region";
import { stripeRouter } from "./stripe";
import { wiseRouter } from "./wise";
import { systemRouter } from "../_core/systemRouter";
import { router } from "../_core/trpc";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  adminOrders: adminOrderRouter,
  adminProducts: adminProductRouter,
  analytics: analyticsRouter,
  orderRequests: orderRequestRouter,
  stripe: stripeRouter,
  wise: wiseRouter,
  catalog: catalogRouter,
  crypto: nowpaymentsRouter,
  region: regionRouter,
});

export type AppRouter = typeof appRouter;
