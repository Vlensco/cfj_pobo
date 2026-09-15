import { describe, expect, it } from "vitest";
import { formatProductStory, parseStructuredDescription } from "./textUtils";

describe("formatProductStory & parseStructuredDescription", () => {
  const rawInput =
    "Quantity : 1 set (name &amp; number) Material : Velvet Instruction (Using Transfer Heat Press Machine): 1) Place the Name Set / Patch / Badges glueside (rough side) down on the shirt in correct position. 2) Temperature: 120 - 130 degrees C 3) Time: 12 -15 seconds 4) Pressure: Very firm 5) Peel: Cold (allow to cool for at least 60 seconds before carefully peeling the backing material). 6) If Patch / Badges does not fully stick, recover and press for a further 5-10 seconds. 7) Do not wash shirt for 48 hours after application NOTE: The use of normal iron is not recommended Any inquiry please message me for wholesale or special price for multiple or bulk purchases.";

  it("cleans raw unescaped HTML entities and structures clumped product descriptions", () => {
    const formatted = formatProductStory(rawInput);

    // Should decode &amp; to &
    expect(formatted).toContain("name & number");
    expect(formatted).not.toContain("&amp;");

    // Should break into clear structured sections
    expect(formatted).toContain("Quantity :");
    expect(formatted).toContain("Material :");
    expect(formatted).toContain("1) Place the Name Set");
    expect(formatted).toContain("\n2) Temperature:");
    expect(formatted).toContain("\n3) Time:");
    expect(formatted).toContain("\nNOTE:");
  });

  it("parses structured specs, instructions, and notes from messy CSV descriptions", () => {
    const parsed = parseStructuredDescription(rawInput);

    expect(parsed.isTechnical).toBe(true);
    expect(parsed.specs).toHaveLength(2);
    expect(parsed.specs[0]).toEqual({ label: "Quantity", value: "1 set (name & number)" });
    expect(parsed.specs[1]).toEqual({ label: "Material", value: "Velvet" });

    expect(parsed.instructions.length).toBeGreaterThanOrEqual(7);
    expect(parsed.instructionTitle).toContain("Instruction");

    expect(parsed.notes.length).toBeGreaterThanOrEqual(1);
    expect(parsed.notes[0]).toContain("NOTE: The use of normal iron is not recommended");
  });
});
