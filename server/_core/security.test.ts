import type { AddressInfo } from "net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const ADMIN_PASSWORD = "correct-horse-battery-staple";
vi.hoisted(() => {
  process.env.ADMIN_PASSWORD = "correct-horse-battery-staple";
  delete process.env.DATABASE_URL;
  delete process.env.SUPABASE_DATABASE_URL;
});

import { createExpressApp } from "./app";
import { appRouter } from "../routers";
import type { TrpcContext } from "./context";
import { COOKIE_NAME } from "../../shared/const";

function createAnonymousContext() {
  const cookies: Array<{ name: string; value: string }> = [];
  const ctx = {
    user: null,
    req: { protocol: "https", headers: {} },
    res: { cookie: (name: string, value: string) => cookies.push({ name, value }) },
  } as unknown as TrpcContext;
  return { ctx, cookies };
}

describe("admin login", () => {
  it("rejects a login without credentials", async () => {
    const { ctx, cookies } = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);

    // @ts-expect-error the password used to be optional, which let anyone in
    await expect(caller.auth.loginLocalAdmin()).rejects.toMatchObject({ code: "BAD_REQUEST" });
    // @ts-expect-error
    await expect(caller.auth.loginLocalAdmin({ username: "admin" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(cookies).toHaveLength(0);
  });

  it("rejects wrong passwords, including the old default", async () => {
    const { ctx, cookies } = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.loginLocalAdmin({ username: "admin", password: "admin123" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.auth.loginLocalAdmin({ username: "someone", password: ADMIN_PASSWORD })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(cookies).toHaveLength(0);
  });

  it("issues a session cookie for the configured credentials", async () => {
    const { ctx, cookies } = createAnonymousContext();
    const result = await appRouter.createCaller(ctx).auth.loginLocalAdmin({ username: "Admin", password: ADMIN_PASSWORD });

    expect(result.user.role).toBe("admin");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe(COOKIE_NAME);
  });
});

describe("protected procedures", () => {
  it("blocks anonymous access to admin data and staff-only payment tools", async () => {
    const caller = appRouter.createCaller(createAnonymousContext().ctx);
    const range = { startDate: "2026-01-01", endDate: "2026-01-31" };

    await expect(caller.adminOrders.list(range)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.adminOrders.exportRows(range)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.adminProducts.create({ title: "Test", handle: "test", price: "1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller.stripe.createCustomerPortal({ customerId: "cus_123" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("storage proxy", () => {
  let baseUrl = "";
  let close: () => void = () => {};

  beforeAll(async () => {
    const server = createExpressApp().listen(0);
    await new Promise(resolve => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    close = () => server.close();
  });
  afterAll(() => close());

  it("serves real assets", async () => {
    const response = await fetch(`${baseUrl}/manus-storage/terrace-junction-v2_75e8572e.jpg`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/jpeg");
  });

  it("never serves files outside the asset directories", async () => {
    for (const escape of ["..%2f..%2fpackage.json", "..%2f..%2fDatabase%2fcustomers_export.csv", "..%2f..%2fserver%2fdb.ts"]) {
      const response = await fetch(`${baseUrl}/manus-storage/${escape}`);
      expect(response.headers.get("content-type")).toContain("image/svg+xml");
      expect(await response.text()).toContain("<svg");
    }
  });
});
