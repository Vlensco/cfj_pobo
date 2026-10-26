import { describe, expect, it } from "vitest";
import { analyticsRouter } from "./analytics";
import { adminProductRouter } from "./adminProducts";

describe("analytics & product management routers", () => {
  it("validates input structure for add_to_bag tracking", async () => {
    const caller = analyticsRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: null,
    });

    const result = await caller.trackEvent({
      productId: "junction-ls",
      productName: "Junction Long Sleeve",
      eventType: "add_to_bag",
      color: "Ink",
      size: "M",
      price: 1888000,
    });

    expect(result.success).toBe(true);
  });

  it("keeps analytics stats away from anonymous visitors", async () => {
    const caller = analyticsRouter.createCaller({ req: {} as any, res: {} as any, user: null });
    await expect(caller.getStats()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("retrieves analytics stats safely for admins", async () => {
    const caller = analyticsRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: { role: "admin" } as any,
    });

    const stats = await caller.getStats();
    expect(typeof stats.totalAddToBag).toBe("number");
    expect(typeof stats.todayAddToBag).toBe("number");
    expect(Array.isArray(stats.topProducts)).toBe(true);
  });

  it("lists products with pagination parameters", async () => {
    const caller = adminProductRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: null,
    });

    const list = await caller.list({ page: 1, pageSize: 5 });
    expect(list.page).toBe(1);
    expect(list.pageSize).toBe(5);
    expect(Array.isArray(list.products)).toBe(true);
  });

  it("refuses catalog changes from anonymous visitors", async () => {
    const caller = adminProductRouter.createCaller({ req: {} as any, res: {} as any, user: null });
    await expect(caller.delete({ handle: "junction-ls" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.update({ handle: "junction-ls", price: "1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
