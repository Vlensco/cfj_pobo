import { useEffect, useId, useState } from "react";
import "./jersey-back-preview.css";
import { luminance, readShirtPalette, type Rgb, type ShirtPalette } from "./shirtPalette";

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

const FALLBACK: ShirtPalette = { kind: "plain", color: [217, 221, 226] };
const SAMPLE_SIZE = 48;
/** Band across the shirt body that is read: the middle half of the width, 40–55% down the photo. */
const BAND = { x: 12, y: 19, width: 24, height: 7 };
const STRIPE_WIDTH = 34;
const MAX_NAME_FONT = 34;

const toCss = ([red, green, blue]: Rgb) => `rgb(${red}, ${green}, ${blue})`;
const shade = (color: Rgb, factor: number): Rgb => color.map(channel => Math.round(channel * factor)) as Rgb;
const mix = (a: Rgb, b: Rgb): Rgb => [0, 1, 2].map(channel => Math.round((a[channel] + b[channel]) / 2)) as Rgb;

/**
 * Colours of the shirt in a product photo: one colour, or two for a striped
 * shirt. Returns null until the photo loads, or when the image host does not
 * allow its pixels to be read.
 */
function useShirtPalette(source: string | undefined): ShirtPalette | null {
  const [palette, setPalette] = useState<ShirtPalette | null>(null);

  useEffect(() => {
    setPalette(null);
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
        const { data } = context.getImageData(BAND.x, BAND.y, BAND.width, BAND.height);
        const result = readShirtPalette(data, BAND.width, BAND.height);
        if (active && result) setPalette(result);
      } catch {
        // Cross-origin image without CORS headers: keep the neutral fallback.
      }
    };
    image.src = source;

    return () => {
      active = false;
    };
  }, [source]);

  return palette;
}

/**
 * Flat, straight-on drawing of the back of a shirt with the chosen name,
 * number, and sleeve patch. Product photos are taken at an angle, so the
 * print is shown on this drawing instead of on a photo.
 */
export function JerseyBackPreview({ colorSource, name, number, patchLabel, fontFamily }: Props) {
  const palette = useShirtPalette(colorSource) ?? FALLBACK;
  const patternId = `jersey-stripes-${useId().replace(/:/g, "")}`;
  const isStriped = palette.kind === "striped";
  const [lightStripe, darkStripe] =
    palette.kind === "striped"
      ? [...palette.colors].sort((a, b) => luminance(b) - luminance(a))
      : [palette.color, palette.color];
  // Overall tone decides the print colour; a striped shirt gets a heavier outline so the print reads on both stripes.
  const base = isStriped ? mix(lightStripe, darkStripe) : palette.color;
  const isLightShirt = luminance(base) > 0.55;
  const print = isLightShirt ? "#14181c" : "#ffffff";
  const printOutline = isLightShirt ? "rgba(255, 255, 255, 0.85)" : "rgba(0, 0, 0, 0.55)";
  const outlineWidth = isStriped ? 5 : 3;
  const trim = toCss(isStriped ? shade(darkStripe, 0.8) : shade(base, isLightShirt ? 0.3 : 0.55));
  const seam = toCss(shade(isStriped ? darkStripe : base, 0.8));
  const bodyFill = isStriped ? `url(#${patternId})` : toCss(base);

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
        {isStriped && (
          <pattern id={patternId} width={STRIPE_WIDTH * 2} height="480" patternUnits="userSpaceOnUse" x="-1">
            <rect width={STRIPE_WIDTH} height="480" fill={toCss(darkStripe)} />
            <rect x={STRIPE_WIDTH} width={STRIPE_WIDTH} height="480" fill={toCss(lightStripe)} />
          </pattern>
        )}
      </defs>

      {/* Body and sleeves */}
      <path
        d="M148 42 Q200 66 252 42 L302 58 L386 122 L350 188 L306 162 L306 448 Q200 466 94 448 L94 162 L50 188 L14 122 L98 58 Z"
        fill={bodyFill}
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
            {patchLabel.split(" ").slice(0, 2).join(" ")}
          </text>
        </g>
      )}

      <g
        fill={print}
        stroke={printOutline}
        strokeWidth={outlineWidth}
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
