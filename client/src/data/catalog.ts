import { formatProductStory } from "@/lib/textUtils";

export type Product = { id: string; slug: string; name: string; collection: string; price: number; publishedAt: string; image: string; gallery: string[]; colors: string[]; sizes: string[]; material: string; fit: string; story: string; details: string[] };

export const productCatalog: Product[] = [
  { id: "junction-ls", slug: "junction-long-sleeve", name: "Junction Long Sleeve", collection: "The 90s Study", price: 1888000, publishedAt: "2026-01-06", image: "/cfj_90s_study.jpg", gallery: ["/cfj_90s_study.jpg", "/manus-storage/terrace-junction-detail_ef939da9.jpg"], colors: ["Ink", "Chalk"], sizes: ["XS", "S", "M", "L", "XL"], material: "260gsm cotton-blend interlock", fit: "Relaxed, slightly cropped through the body", story: "A quiet study in movement and return. Junction borrows the tempo of a late arrival beneath the floodlights, translated into an entirely original seam language.", details: ["Abstract contrast piping", "Ribbed collar and cuffs", "Small-batch production"] },
  { id: "interval-jacket", slug: "interval-track-jacket", name: "Interval Track Jacket", collection: "The 90s Study", price: 2976000, publishedAt: "2026-01-28", image: "/manus-storage/terrace-interval-v2_a26c6c2e.jpg", gallery: ["/manus-storage/terrace-interval-v2_a26c6c2e.jpg", "/manus-storage/terrace-interval-detail_45bab896.jpg"], colors: ["Pitch", "Ink"], sizes: ["S", "M", "L", "XL"], material: "Recycled technical twill", fit: "Easy shoulder, adjustable hem", story: "Built for the space between matches. A considered outer layer with a soft structure and the exacting lines of an architectural warm-up.", details: ["Two-way front zip", "Concealed side pockets", "Adjustable drawcord hem"] },
  { id: "archive-polo", slug: "archive-knit-polo", name: "Archive Knit Polo", collection: "The 70s Study", price: 2272000, publishedAt: "2026-01-15", image: "/cfj_70s_study.jpg", gallery: ["/cfj_70s_study.jpg", "/manus-storage/terrace-archive-detail_d54321e6.jpg"], colors: ["Chalk", "Ink"], sizes: ["XS", "S", "M", "L", "XL"], material: "Merino-cotton knit", fit: "Soft, regular fit", story: "The softness of an archive knit, recut for a modern rhythm. Its restrained contrast collar is a nod to shared afternoons, not a borrowed history.", details: ["Fine-gauge merino-cotton", "Contrast knit collar", "Brass-tone cuff stitch"] },
  { id: "halfway-cap", slug: "halfway-cap", name: "Halfway Cap", collection: "Objects for Matchday", price: 928000, publishedAt: "2026-02-12", image: "/cfj_matchday_study.jpg", gallery: ["/cfj_matchday_study.jpg", "/manus-storage/terrace-cap-detail_9b346af2.jpg"], colors: ["Ink"], sizes: ["One size"], material: "Organic cotton canvas", fit: "Six-panel cap with adjustable back tab", story: "A small, durable marker for the days that begin before the gates open. The Halfway Cap holds our signature circle detail in its most reduced form.", details: ["Unstructured six-panel form", "Adjustable tonal back tab", "Embroidered geometric stitch"] },
];

export const collections = [
  { name: "The 70s Study", description: "Soft knits and faded contrast", image: "/cfj_70s_study.jpg", href: "/shop?category=70s" },
  { name: "The 90s Study", description: "Graphic lines, rebalanced", image: "/cfj_90s_study.jpg", href: "/shop?category=90s" },
  { name: "Objects for Matchday", description: "Small rituals, considered", image: "/cfj_matchday_study.jpg", href: "/shop?category=matchday" },
];

export function dbProductToStoreProduct(item: any): Product {
  const priceRaw = Number(item.primaryVariant?.price || item.variants?.[0]?.price || item.price || 1888000);
  const priceNum = priceRaw < 5000 ? Math.round(priceRaw * 20000) : priceRaw;
  const imageSrc =
    item.images?.[0]?.src ||
    (typeof item.images?.[0] === "string" ? item.images[0] : null) ||
    item.primaryImage?.src ||
    item.image ||
    "/manus-storage/terrace-junction-v2_75e8572e.jpg";

  const gallery = item.images?.length
    ? item.images.map((img: any) => (typeof img === "string" ? img : img.src))
    : item.gallery?.length
      ? item.gallery
      : [imageSrc];

  return {
    id: item.handle || item.id,
    slug: item.handle || item.slug,
    name: item.title || item.name,
    collection: item.type || item.collection || "Archival Selection",
    price: priceNum,
    publishedAt: item.createdAt ? new Date(item.createdAt).toISOString().split("T")[0] : "2026-01-01",
    image: imageSrc,
    gallery,
    colors: item.colors?.length ? item.colors : ["Standard", "Matchday"],
    sizes: item.sizes?.length ? item.sizes : ["S", "M", "L", "XL"],
    material: "Heavyweight archival structured cotton-blend",
    fit: "Classic relaxed fit",
    story: formatProductStory(item.bodyHtml),
    details: ["Original archival design", "Reinforced tonal stitching", "Small-batch preservation"],
  };
}

export const getProductBySlug = (slug: string) => productCatalog.find(product => product.slug === slug);
