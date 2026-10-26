import { useEffect, useState } from "react";
import "./jersey-back-preview.css";

type Rgb = [red: number, green: number, blue: number];

type Props = {
  /** Product photo the shirt colour is sampled from. */
  colorSource?: string;
  name: string;
  number: string;
  /** Short label of the selected sleeve patch, if any. */
  patchLabel?: string;
  /** Font the customer uploaded as their lettering reference. */
  fontFamily?: string;
};

const FALLBACK_COLOR: Rgb = [217, 221, 226];
const SAMPLE_SIZE = 24;
const LIT_SHARE = 0.35;
const MAX_NAME_FONT = 34;

const toCss = ([red, green, blue]: Rgb) => `rgb(${red}, ${green}, ${blue})`;
const shade = (color: Rgb, factor: number): Rgb => color.map(channel => Math.round(channel * factor)) as Rgb;
/** Perceived brightness, 0 (black) to 1 (white). */
const luminance = ([red, green, blue]: Rgb) => (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

/**
 * Average colour of the middle of a product photo, where the shirt body is.
 * Returns null until the photo loads, or when the image host does not allow
 * its pixels to be read.
 */
function useShirtColor(source: string | undefined): Rgb | null {
  const [color, setColor] = useState<Rgb | null>(null);

  useEffect(() => {
    setColor(null);
    if (!source) return;

    let active = true;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = SAMPLE_SIZE;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

        const third = SAMPLE_SIZE / 3;
        const { data } = context.getImageData(third, third, third, third);
        const pixels: Rgb[] = [];
        for (let offset = 0; offset < data.length; offset += 4) {
          pixels.push([data[offset], data[offset + 1], data[offset + 2]]);
        }
        // Folds and shadows darken a photo, so the fabric colour is read from the better-lit pixels only.
        const lit = pixels.sort((a, b) => luminance(b) - luminance(a)).slice(0, Math.ceil(pixels.length * LIT_SHARE));
        const average = [0, 1, 2].map(channel => Math.round(lit.reduce((sum, pixel) => sum + pixel[channel], 0) / lit.length));
        if (active) setColor(average as Rgb);
      } catch {
        // Cross-origin image without CORS headers: keep the neutral fallback.
      }
    };
    image.src = source;

    return () => {
      active = false;
    };
  }, [source]);

  return color;
}

/**
 * Flat, straight-on drawing of the back of a shirt with the chosen name,
 * number, and sleeve patch. Product photos are taken at an angle, so the
 * print is shown on this drawing instead of on a photo.
 */
export function JerseyBackPreview({ colorSource, name, number, patchLabel, fontFamily }: Props) {
  const base = useShirtColor(colorSource) ?? FALLBACK_COLOR;
  const isLightShirt = luminance(base) > 0.55;
  const print = isLightShirt ? "#14181c" : "#ffffff";
  const printOutline = isLightShirt ? "rgba(255, 255, 255, 0.85)" : "rgba(0, 0, 0, 0.55)";
  const trim = toCss(shade(base, isLightShirt ? 0.3 : 0.55));
  const seam = toCss(shade(base, 0.8));

  const uploadedFont = fontFamily ? { fontFamily: `"${fontFamily}"` } : undefined;

  // Long names shrink so they stay between the shoulders.
  const nameFontSize = Math.min(MAX_NAME_FONT, Math.floor(300 / Math.max(name.length, 1)));

  return (
    <svg className="jersey-back-preview" viewBox="0 0 400 480" role="img" aria-label={`${name} ${number}`.trim()}>
      <defs>
        <linearGradient id="jersey-back-shading" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.16" />
        </linearGradient>
      </defs>

      {/* Body and sleeves */}
      <path
        d="M148 42 Q200 66 252 42 L302 58 L386 122 L350 188 L306 162 L306 448 Q200 466 94 448 L94 162 L50 188 L14 122 L98 58 Z"
        fill={toCss(base)}
        stroke={seam}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M148 42 Q200 66 252 42 L302 58 L386 122 L350 188 L306 162 L306 448 Q200 466 94 448 L94 162 L50 188 L14 122 L98 58 Z"
        fill="url(#jersey-back-shading)"
      />

      {/* Collar, cuffs, and hem trim */}
      <path d="M148 42 Q200 66 252 42 L246 30 Q200 52 154 30 Z" fill={trim} />
      <path d="M39 168 L61 181 L50 188 Z M361 168 L339 181 L350 188 Z" fill={trim} />
      <path d="M22 128 L58 190 L50 188 L14 122 Z M378 128 L342 190 L350 188 L386 122 Z" fill={trim} />
      <path d="M94 440 Q200 458 306 440 L306 448 Q200 466 94 448 Z" fill={trim} />
      <path d="M94 162 L98 240 M306 162 L302 240" stroke={seam} strokeWidth="2" fill="none" />

      {patchLabel && (
        <g className="jersey-back-patch">
          <rect x="322" y="112" width="44" height="30" rx="4" transform="rotate(37 344 127)" />
          <text x="344" y="130" transform="rotate(37 344 127)">
            {patchLabel.split(" ")[0]}
          </text>
        </g>
      )}

      <g
        fill={print}
        stroke={printOutline}
        strokeWidth="3"
        paintOrder="stroke"
        textAnchor="middle"
      >
        {name && (
          <text className="jersey-back-name" x="200" y="150" fontSize={nameFontSize} style={uploadedFont}>
            {name}
          </text>
        )}
        {number && (
          <text className="jersey-back-number" x="200" y="330" style={uploadedFont}>
            {number}
          </text>
        )}
      </g>
    </svg>
  );
}
