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

import { parseDescriptionSections } from "./textUtils";

describe("parseDescriptionSections", () => {
  const html = `<ul><li>
    <h3><strong><u>☑️ CONDITION :</u></strong></h3>
    <ul><li><em>BNIB (Brand New In Bag)</em></li><li><em>Replica Version</em></li></ul>
    <h3>☑️ <strong><u>NOTES :</u></strong><em>.</em></h3>
    <ul><li><em>You can add custom name set jersey.</em><span> </span>Refer to<span> </span><a href="https://example.com/nameset" title="nameset">this link</a></li>
    <li>Unsafe <a href="javascript:alert(1)">link</a></li></ul>
    <h3>☑️ <strong><u>CARE :</u></strong></h3>
    <div><ul><li><span>Machine wash cold</span></li><li>Do not iron print</li></ul></div>
  </li></ul>`;

  it("splits a headed description into titled bullet sections", () => {
    const sections = parseDescriptionSections(html);
    expect(sections.map(section => section.title)).toEqual(["Condition", "Notes", "Care"]);
    expect(sections[0].items).toEqual([[{ text: "BNIB (Brand New In Bag)" }], [{ text: "Replica Version" }]]);
    expect(sections[2].items).toHaveLength(2);
  });

  it("keeps web links clickable and neutralises anything else", () => {
    const [, notes] = parseDescriptionSections(html);
    expect(notes.items[0]).toEqual([
      { text: "You can add custom name set jersey. Refer to " },
      { text: "this link", href: "https://example.com/nameset" },
    ]);
    expect(notes.items[1]).toEqual([{ text: "Unsafe " }, { text: "link" }]);
  });

  it("ignores descriptions without headings", () => {
    expect(parseDescriptionSections("Quantity : 1 set Material : Velvet")).toEqual([]);
    expect(parseDescriptionSections(null)).toEqual([]);
  });
});
