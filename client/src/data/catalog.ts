import { formatProductStory } from "@/lib/textUtils";
import { parseProductCustomizationMeta } from "@shared/customization";

export type Product = {
  id: string;
  slug: string;
  name: string;
  collection: string;
  price: number;
  publishedAt: string;
  image: string;
  gallery: string[];
  colors: string[];
  sizes: string[];
  material: string;
  fit: string;
  story: string;
  /** Original catalog HTML for the story, when the product comes from the imported catalog. */
  descriptionHtml?: string;
  details: string[];
  hasNameset?: boolean;
  namesetPrice?: number;
  defaultPatchSku?: string;
  tags?: string;
};

export const productCatalog: Product[] = [
  {
    id: "junction-ls",
    slug: "junction-long-sleeve",
    name: "Junction Long Sleeve",
    collection: "The 90s Study",
    price: 1888000,
    publishedAt: "2026-01-06",
    image: "/cfj_90s_study.jpg",
    gallery: ["/cfj_90s_study.jpg", "/manus-storage/terrace-junction-detail_ef939da9.jpg"],
    colors: ["Ink", "Chalk"],
    sizes: ["XS", "S", "M", "L", "XL"],
    material: "260gsm cotton-blend interlock",
    fit: "Relaxed, slightly cropped through the body",
    story: "A quiet study in movement and return. Junction borrows the tempo of a late arrival beneath the floodlights, translated into an entirely original seam language.",
    details: ["Abstract contrast piping", "Ribbed collar and cuffs", "Small-batch production"],
    hasNameset: true,
    namesetPrice: 75000,
    defaultPatchSku: "PL-BADGE-26",
    tags: "Drop 01, Shirt, nameset:75000, patch_sku:PL-BADGE-26",
  },
  {
    id: "interval-jacket",
    slug: "interval-track-jacket",
    name: "Interval Track Jacket",
    collection: "The 90s Study",
    price: 2976000,
    publishedAt: "2026-01-28",
    image: "/manus-storage/terrace-interval-v2_a26c6c2e.jpg",
    gallery: ["/manus-storage/terrace-interval-v2_a26c6c2e.jpg", "/manus-storage/terrace-interval-detail_45bab896.jpg"],
    colors: ["Pitch", "Ink"],
    sizes: ["S", "M", "L", "XL"],
    material: "Recycled technical twill",
    fit: "Easy shoulder, adjustable hem",
    story: "Built for the space between matches. A considered outer layer with a soft structure and the exacting lines of an architectural warm-up.",
    details: ["Two-way front zip", "Concealed side pockets", "Adjustable drawcord hem"],
    hasNameset: false,
    namesetPrice: 75000,
    defaultPatchSku: "PL-BADGE-26",
    tags: "Drop 01, Jacket, no-nameset",
  },
  {
    id: "archive-polo",
    slug: "archive-knit-polo",
    name: "Archive Knit Polo",
    collection: "The 70s Study",
    price: 2272000,
    publishedAt: "2026-01-15",
    image: "/cfj_70s_study.jpg",
    gallery: ["/cfj_70s_study.jpg", "/manus-storage/terrace-archive-detail_d54321e6.jpg"],
    colors: ["Chalk", "Ink"],
    sizes: ["XS", "S", "M", "L", "XL"],
    material: "Merino-cotton knit",
    fit: "Soft, regular fit",
    story: "The softness of an archive knit, recut for a modern rhythm. Its restrained contrast collar is a nod to shared afternoons, not a borrowed history.",
    details: ["Fine-gauge merino-cotton", "Contrast knit collar", "Brass-tone cuff stitch"],
    hasNameset: true,
    namesetPrice: 75000,
    defaultPatchSku: "PL-BADGE-26",
    tags: "Drop 01, Polo, nameset:75000, patch_sku:PL-BADGE-26",
  },
  {
    id: "halfway-cap",
    slug: "halfway-cap",
    name: "Halfway Cap",
    collection: "Objects for Matchday",
    price: 928000,
    publishedAt: "2026-02-12",
    image: "/cfj_matchday_study.jpg",
    gallery: ["/cfj_matchday_study.jpg", "/manus-storage/terrace-cap-detail_9b346af2.jpg"],
    colors: ["Ink"],
    sizes: ["One size"],
    material: "Organic cotton canvas",
    fit: "Six-panel cap with adjustable back tab",
    story: "A small, durable marker for the days that begin before the gates open. The Halfway Cap holds our signature circle detail in its most reduced form.",
    details: ["Unstructured six-panel form", "Adjustable tonal back tab", "Embroidered geometric stitch"],
    hasNameset: false,
    namesetPrice: 0,
    defaultPatchSku: "",
    tags: "Objects, Accessory, no-nameset",
  },
];

export const collections = [
  {
    name: "Serie A Calcio Archive",
    description: "Golden Era Italian Football — Juventus, AC Milan, Inter, Fiorentina",
    image: "https://cdn.shopify.com/s/files/1/0565/1120/1450/files/rn-image_picker_lib_temp_59f40794-9a42-4e38-a0a2-233a21abeda0.jpg?v=1787293165",
    href: "/shop?category=serie-a",
  },
  {
    name: "Premier League Heritage",
    description: "90s & 2000s English Titans — United, Arsenal, City, Chelsea, Derby",
    image: "https://cdn.shopify.com/s/files/1/0565/1120/1450/files/rn-image_picker_lib_temp_d386cdce-32d9-41d2-9fe6-e7762fcdd875.jpg?v=1786746145",
    href: "/shop?category=premier-league",
  },
  {
    name: "La Liga & World Classics",
    description: "Iconic European & South American Retro Kits — Barcelona, Real Madrid",
    image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&q=80&w=800",
    href: "/shop?category=la-liga",
  },
  {
    name: "Patches & Custom Nameset",
    description: "Official sleeve badges, cup starballs, sponsors & personalized printing",
    image: "https://cdn.shopify.com/s/files/1/0565/1120/1450/files/rn-image_picker_lib_temp_2d1f4e2a-9532-4fa4-8021-1fe66e1ca746.jpg?v=1786608690",
    href: "/shop?category=patches",
  },
];

type CatalogImage = string | { src?: string | null };

/** A product as returned by the catalog API (database row or CSV fallback), or a legacy static entry. */
type CatalogSource = {
  handle?: string;
  id?: string;
  slug?: string;
  title?: string;
  name?: string;
  type?: string | null;
  collection?: string;
  price?: number | string | null;
  primaryVariant?: { price?: number | string | null } | null;
  variants?: Array<{ price?: number | string | null; option1Value?: string | null }>;
  images?: CatalogImage[];
  primaryImage?: { src?: string | null } | null;
  image?: string;
  gallery?: string[];
  colors?: string[];
  sizes?: string[];
  bodyHtml?: string | null;
  tags?: string | null;
  createdAt?: string | Date | null;
};

const FALLBACK_IMAGE = "/manus-storage/terrace-junction-v2_75e8572e.jpg";
const FALLBACK_PRICE = 1888000;
/** Prices below this are foreign-currency values from the original export and are converted to IDR. */
const FOREIGN_PRICE_THRESHOLD = 5000;
const IDR_PER_FOREIGN_UNIT = 16000;

/** Normalises a catalog price to whole rupiah, falling back to a default when it is missing. */
export function toIdrPrice(value: number | string | null | undefined): number {
  const price = Number(value || FALLBACK_PRICE);
  return price < FOREIGN_PRICE_THRESHOLD ? Math.round(price * IDR_PER_FOREIGN_UNIT) : price;
}

const imageSrc = (image: CatalogImage | undefined) => (typeof image === "string" ? image : image?.src) || null;

function resolveSizes(item: CatalogSource): string[] {
  if (item.sizes?.length) return item.sizes;
  const variantSizes = (item.variants ?? [])
    .map(variant => variant.option1Value)
    .filter((value): value is string => Boolean(value) && value !== "Default Title");
  return variantSizes.length ? Array.from(new Set(variantSizes)) : ["S", "M", "L", "XL"];
}

export function dbProductToStoreProduct(item: CatalogSource): Product {
  const price = toIdrPrice(item.primaryVariant?.price || item.variants?.[0]?.price || item.price);

  const image = imageSrc(item.images?.[0]) || item.primaryImage?.src || item.image || FALLBACK_IMAGE;
  const imageList = (item.images ?? []).map(imageSrc).filter((src): src is string => Boolean(src));
  const gallery = imageList.length ? imageList : item.gallery?.length ? item.gallery : [image];

  const meta = parseProductCustomizationMeta(item.tags);
  const id = item.handle || item.id || "";

  return {
    id,
    slug: item.handle || item.slug || id,
    name: item.title || item.name || id,
    collection: item.type || item.collection || "Archival Selection",
    price,
    publishedAt: item.createdAt ? new Date(item.createdAt).toISOString().split("T")[0] : "2026-01-01",
    image,
    gallery,
    colors: item.colors?.length ? item.colors : ["Standard", "Matchday"],
    sizes: resolveSizes(item),
    material: "Heavyweight archival structured cotton-blend",
    fit: "Classic relaxed fit",
    story: formatProductStory(item.bodyHtml),
    descriptionHtml: item.bodyHtml || undefined,
    details: ["Original archival design", "Reinforced tonal stitching", "Small-batch preservation"],
    hasNameset: meta.hasNameset,
    namesetPrice: meta.namesetPrice,
    defaultPatchSku: meta.patchSku,
    tags: item.tags || "",
  };
}

export const getProductBySlug = (slug: string) => productCatalog.find(product => product.slug === slug);
