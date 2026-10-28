import { describe, expect, it, vi } from "vitest";
import { buildOrderRequestLines, getOrderTrackingDetails, recordOnlinePaymentOrder } from "./orderRequests";
import * as db from "../../db";
import { listCatalogAddOns } from "../catalog/csvCatalog";

const FONT_REFERENCE = { id: "abcdefgh12345678", fileName: "font.png", mimeType: "image/png" };

describe("paid online orders", () => {
  it("keep each line's customisation and list the font file in the notes", async () => {
    let saved: Record<string, unknown> = {};
    const fakeDb = {
      insert: () => ({
        values: (row: Record<string, unknown>) => {
          saved = row;
          return { onConflictDoUpdate: () => ({ returning: async () => [row] }) };
        },
      }),
    };
    vi.spyOn(db, "getDb").mockResolvedValueOnce(fakeDb as unknown as Awaited<ReturnType<typeof db.getDb>>);

    const lines = buildOrderRequestLines([
      {
        productId: "junction-ls",
        quantity: 1,
        color: "Ink",
        size: "M",
        customization: { nameset: { name: "RUDI", number: "10", fontReference: FONT_REFERENCE } },
      },
    ]);
    await recordOnlinePaymentOrder({ reference: "TR-WS-TEST0001", notes: "Payment: Wise", lines, subtotal: lines[0].lineTotal });

    const [stored] = JSON.parse(String(saved.items));
    expect(stored.customization.nameset).toMatchObject({ name: "RUDI", fontReference: FONT_REFERENCE });
    expect(saved.notes).toContain("Payment: Wise");
    expect(saved.notes).toContain(`/api/uploads/${FONT_REFERENCE.id}`);
  });
});

describe("order request pricing", () => {
  it("uses server-authoritative IDR pricing for a customer request", () => {
    const [line] = buildOrderRequestLines([{ productId: "junction-ls", quantity: 2, color: "Ink", size: "M" }]);
    expect(line).toMatchObject({ name: "Junction Long Sleeve", unitAmount: 1888000, lineTotal: 3776000 });
  });

  it("rejects unavailable products", () => {
    expect(() =>
      buildOrderRequestLines([{ productId: "missing", quantity: 1, color: "Ink", size: "M" }])
    ).toThrow("no longer available");
  });

  it("ignores add-on prices sent by the client and prices patches by catalog SKU", () => {
    const patch = listCatalogAddOns({ kind: "patch", limit: 1 }).items[0];
    const [line] = buildOrderRequestLines([
      {
        productId: "junction-ls",
        quantity: 1,
        color: "Ink",
        size: "M",
        customization: {
          nameset: { name: "RUDI", number: "10", price: 0, fontReference: FONT_REFERENCE },
          patch: { sku: patch.sku, name: "Free patch", price: 0 },
        },
      },
    ]);
    expect(line.customization?.nameset).toMatchObject({ mode: "custom", price: 75000, fontReference: FONT_REFERENCE });
    expect(line.customization?.patch).toMatchObject({ sku: patch.sku, name: patch.name, price: patch.price });
    expect(line.unitAmount).toBe(1888000 + 75000 + patch.price);
  });

  it("requires a font reference for a custom nameset", () => {
    expect(() =>
      buildOrderRequestLines([
        { productId: "junction-ls", quantity: 1, color: "Ink", size: "M", customization: { nameset: { name: "RUDI", number: "10" } } },
      ])
    ).toThrow("font style reference");
  });

  it("prices a ready-made nameset from its catalog SKU", () => {
    const ready = listCatalogAddOns({ kind: "nameset", limit: 1 }).items[0];
    const [line] = buildOrderRequestLines([
      {
        productId: "junction-ls",
        quantity: 1,
        color: "Ink",
        size: "M",
        customization: { nameset: { mode: "ready", name: "", number: "", sku: ready.sku, price: 0 } },
      },
    ]);
    expect(line.customization?.nameset).toMatchObject({ mode: "ready", sku: ready.sku, name: ready.name, price: ready.price });
    expect(line.unitAmount).toBe(1888000 + ready.price);
  });

  it("rejects sleeve patches that are not in the catalog", () => {
    expect(() =>
      buildOrderRequestLines([
        { productId: "junction-ls", quantity: 1, color: "Ink", size: "M", customization: { patch: { sku: "FAKE-PATCH" } } },
      ])
    ).toThrow("patch is no longer available");
  });

  it("builds rich tracking timeline and courier metadata for valid order reference", async () => {
    vi.spyOn(db, "getOrderRequestByReference").mockResolvedValueOnce({
      id: 1,
      reference: "TR-TEST1234",
      customerName: "Rudi Hartono",
      email: "rudi@example.com",
      phone: "+62812345678",
      userOpenId: null,
      notes: "Kirim sebelum jam 5 sore",
      items: JSON.stringify([
        {
          productId: "junction-ls",
          name: "Junction Long Sleeve",
          quantity: 1,
          color: "Ink",
          size: "M",
          unitAmount: 1888000,
          lineTotal: 1888000,
        },
      ]),
      subtotal: 1888000,
      currency: "IDR",
      status: "contacted",
      fulfillmentStage: "in_packaging",
      courierName: "JNE Express",
      trackingNumber: "TRC-TEST1234-ID",
      trackingUrl: "https://www.jne.co.id/tracking",
      createdAt: new Date("2026-09-10T10:00:00Z"),
      contactedAt: new Date("2026-09-11T12:00:00Z"),
      lastFollowUpReminderAt: null,
    });

    const tracking = await getOrderTrackingDetails("TR-TEST1234");
    expect(tracking).not.toBeNull();
    expect(tracking?.reference).toBe("TR-TEST1234");
    expect(tracking?.statusBadge).toBe("Processing & In Packaging");
    expect(tracking?.currentStep).toBe(3);
    expect(tracking?.items).toHaveLength(1);
    expect(tracking?.trackingNumber).toContain("TRC-TEST1234-ID");
    expect(tracking?.timeline).toHaveLength(5);
  });

  it("resolves TR-READY123 demo tracking reference with rich progress data", async () => {
    const tracking = await getOrderTrackingDetails("TR-READY123");
    expect(tracking).not.toBeNull();
    expect(tracking?.reference).toBe("TR-READY123");
    expect(tracking?.customerName).toContain("Demo");
    expect(tracking?.currentStep).toBe(3);
    expect(tracking?.items.length).toBeGreaterThanOrEqual(1);
    expect(tracking?.timeline).toHaveLength(5);
  });
});

describe("catalog add-on kinds", () => {
  it("never lists a nameset among the sleeve patches", () => {
    const patches = listCatalogAddOns({ kind: "patch", limit: 1500 }).items;
    expect(patches.length).toBeGreaterThan(0);
    expect(patches.filter(patch => /\bname\s?set\b/i.test(patch.name))).toEqual([]);
    const namesets = listCatalogAddOns({ kind: "nameset", search: "Yamal", limit: 5 }).items;
    expect(namesets.map(item => item.name)).toContain("Yamal Nameset Spain");
  });
});
