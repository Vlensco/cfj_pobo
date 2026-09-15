import { describe, expect, it } from "vitest";
import { orderRequestStatuses, parseRequestedPieces } from "./adminOrders";

describe("admin order helpers", () => {
  it("exposes the managed order statuses", () => expect(orderRequestStatuses).toEqual(["new", "contacted", "closed"]));
  it("parses valid stored request pieces and safely handles invalid payloads", () => {
    expect(parseRequestedPieces('[{"productId":"junction-ls","name":"Junction Long Sleeve","quantity":1,"color":"Ink","size":"M","unitAmount":1888000,"lineTotal":1888000}]')).toHaveLength(1);
    expect(parseRequestedPieces("not-json")).toEqual([]);
  });
});
