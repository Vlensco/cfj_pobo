export type Rgb = [red: number, green: number, blue: number];

export type ShirtPalette =
  | { kind: "plain"; color: Rgb }
  | { kind: "striped"; colors: [Rgb, Rgb] };

/** Perceived brightness, 0 (black) to 1 (white). */
export const luminance = ([red, green, blue]: Rgb) => (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

const distance = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const average = (pixels: Rgb[]): Rgb =>
  [0, 1, 2].map(channel => Math.round(pixels.reduce((sum, pixel) => sum + pixel[channel], 0) / pixels.length)) as Rgb;

/** Two colours further apart than this read as different fabrics rather than light and shade. */
const MIN_CONTRAST = 90;
/** Colour changes across the shirt needed before it counts as striped. */
const MIN_STRIPE_CHANGES = 4;
/** Folds and shadows darken a photo, so a plain shirt's colour is read from its better-lit pixels. */
const LIT_SHARE = 0.35;

/** Splits pixels into two colour groups (2-means, seeded with the darkest and lightest pixel). */
function splitInTwo(pixels: Rgb[]): { centres: [Rgb, Rgb]; labels: number[] } {
  const byBrightness = [...pixels].sort((a, b) => luminance(a) - luminance(b));
  let centres: [Rgb, Rgb] = [byBrightness[0], byBrightness[byBrightness.length - 1]];
  let labels: number[] = [];
  for (let round = 0; round < 8; round++) {
    labels = pixels.map(pixel => (distance(pixel, centres[0]) <= distance(pixel, centres[1]) ? 0 : 1));
    const groups = [0, 1].map(group => pixels.filter((_, index) => labels[index] === group));
    if (groups.some(group => group.length === 0)) break;
    centres = [average(groups[0]), average(groups[1])];
  }
  return { centres, labels };
}

/**
 * Reads a shirt's colours from the RGBA pixels of a band across the middle of
 * the photo (`width` columns × `height` rows). Vertical stripes show up as the
 * two colours alternating from column to column.
 */
export function readShirtPalette(rgba: ArrayLike<number>, width: number, height: number): ShirtPalette | null {
  const pixels: Rgb[] = [];
  for (let offset = 0; offset + 2 < rgba.length; offset += 4) pixels.push([rgba[offset], rgba[offset + 1], rgba[offset + 2]]);
  if (pixels.length === 0 || pixels.length !== width * height) return null;

  const { centres, labels } = splitInTwo(pixels);
  const plain = (): ShirtPalette => {
    const lit = [...pixels].sort((a, b) => luminance(b) - luminance(a)).slice(0, Math.ceil(pixels.length * LIT_SHARE));
    return { kind: "plain", color: average(lit) };
  };
  if (distance(centres[0], centres[1]) < MIN_CONTRAST) return plain();

  // Majority colour of each column, then count the changes from left to right, ignoring one-column blips.
  const columns = Array.from({ length: width }, (_, x) => {
    let ones = 0;
    for (let y = 0; y < height; y++) ones += labels[y * width + x];
    return ones * 2 >= height ? 1 : 0;
  });
  const runs: Array<{ label: number; length: number }> = [];
  for (const label of columns) {
    const last = runs[runs.length - 1];
    if (last?.label === label) last.length++;
    else runs.push({ label, length: 1 });
  }
  const solidRuns = runs.filter(run => run.length > 1);
  let changes = 0;
  for (let index = 1; index < solidRuns.length; index++) {
    if (solidRuns[index].label !== solidRuns[index - 1].label) changes++;
  }

  const share = columns.filter(label => label === 1).length / width;
  if (changes >= MIN_STRIPE_CHANGES && share > 0.2 && share < 0.8) {
    return { kind: "striped", colors: centres };
  }
  return plain();
}
