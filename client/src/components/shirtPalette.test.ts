import { describe, expect, it } from "vitest";
import { readShirtPalette, type Rgb } from "./shirtPalette";

/** RGBA band where each column's colour comes from `columnColor`, with a little noise like a photo. */
function band(width: number, height: number, columnColor: (x: number) => Rgb) {
  const data: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = columnColor(x);
      const noise = ((x * 7 + y * 13) % 11) - 5;
      data.push(r + noise, g + noise, b + noise, 255);
    }
  }
  return data;
}

const BLACK: Rgb = [20, 20, 22];
const WHITE: Rgb = [235, 235, 232];
const RED: Rgb = [200, 30, 40];

describe("shirt palette from a product photo", () => {
  it("recognises vertical stripes (e.g. Juventus black and white)", () => {
    const palette = readShirtPalette(band(24, 6, x => (Math.floor(x / 3) % 2 ? WHITE : BLACK)), 24, 6);
    expect(palette?.kind).toBe("striped");
  });

  it("reads a plain shirt as one colour", () => {
    const palette = readShirtPalette(band(24, 6, () => RED), 24, 6);
    expect(palette).toMatchObject({ kind: "plain" });
    if (palette?.kind === "plain") expect(palette.color[0]).toBeGreaterThan(180);
  });

  it("does not mistake a single contrasting area (a sponsor block) for stripes", () => {
    const palette = readShirtPalette(band(24, 6, x => (x >= 9 && x < 15 ? WHITE : RED)), 24, 6);
    expect(palette?.kind).toBe("plain");
  });
});
