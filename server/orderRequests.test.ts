import { describe, expect, it, vi } from "vitest";
import { buildOrderRequestLines, getOrderTrackingDetails } from "./orderRequests";
import * as db from "./db";

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

  it("builds rich tracking timeline and courier metadata for valid order reference", async () => {
    vi.spyOn(db, "getOrderRequestByReference").mockResolvedValueOnce({
      id: 1,
      reference: "TR-TEST1234",
      customerName: "Rudi Hartono",
      email: "rudi@example.com",
      phone: "+62812345678",
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
