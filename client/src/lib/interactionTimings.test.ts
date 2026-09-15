import { describe, expect, it } from "vitest";
import { ADD_TO_BAG_FEEDBACK_MS } from "./interactionTimings";

describe("store interaction timing", () => {
  it("keeps add-to-bag feedback brief and perceptible", () => {
    expect(ADD_TO_BAG_FEEDBACK_MS).toBeGreaterThanOrEqual(300);
    expect(ADD_TO_BAG_FEEDBACK_MS).toBeLessThanOrEqual(800);
  });
});
