import { Product } from "@/data/catalog";

export const CATEGORY_OPTIONS = [
  { value: "all", label: "All pieces" },
  { value: "serie-a", label: "Serie A" },
  { value: "premier-league", label: "Premier League" },
  { value: "la-liga", label: "La Liga" },
  { value: "national", label: "National Teams" },
  { value: "90s", label: "The 90s Study" },
  { value: "80s", label: "80s Classic" },
  { value: "patches", label: "Patches & Print" },
  { value: "70s", label: "The 70s Study" },
  { value: "matchday", label: "Objects for Matchday" },
] as const;

export const PRICE_OPTIONS = [
  { value: "all", label: "All prices" },
  { value: "under-1m", label: "Under Rp1m" },
  { value: "1m-2.5m", label: "Rp1m — Rp2.5m" },
  { value: "2.5m-plus", label: "Rp2.5m+" },
] as const;

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;

export type CategoryFilter = (typeof CATEGORY_OPTIONS)[number]["value"];
export type PriceFilter = (typeof PRICE_OPTIONS)[number]["value"];
export type SortOption = (typeof SORT_OPTIONS)[number]["value"];
export type CatalogPreferences = { query: string; category: CategoryFilter; price: PriceFilter; sort: SortOption };
export const defaultCatalogPreferences: CatalogPreferences = { query: "", category: "all", price: "all", sort: "featured" };

const categoryMatchers: Record<string, (p: Product, s: string) => boolean> = {
  all: () => true,
  "serie-a": (p, s) =>
    s.includes("serie a") ||
    s.includes("juventus") ||
    s.includes("ac milan") ||
    s.includes("milan") ||
    s.includes("inter") ||
    s.includes("fiorentina") ||
    s.includes("parma") ||
    s.includes("roma") ||
    s.includes("lazio") ||
    s.includes("brescia") ||
    s.includes("napoli") ||
    s.includes("sampdoria"),
  "premier-league": (p, s) =>
    s.includes("premier league") ||
    s.includes("manchester united") ||
    s.includes("man united") ||
    s.includes("arsenal") ||
    s.includes("chelsea") ||
    s.includes("man city") ||
    s.includes("manchester city") ||
    s.includes("liverpool") ||
    s.includes("derby county") ||
    s.includes("newcastle") ||
    s.includes("west ham") ||
    s.includes("aston villa") ||
    s.includes("sheffield"),
  "la-liga": (p, s) =>
    s.includes("la liga") ||
    s.includes("laliga") ||
    s.includes("barcelona") ||
    s.includes("real madrid") ||
    s.includes("atletico") ||
    s.includes("valencia") ||
    s.includes("real betis") ||
    s.includes("sevilla"),
  national: (p, s) =>
    s.includes("national team") ||
    s.includes("international team") ||
    s.includes("indonesia") ||
    s.includes("brasil") ||
    s.includes("brazil") ||
    s.includes("italy") ||
    s.includes("argentina") ||
    s.includes("england") ||
    s.includes("croatia") ||
    s.includes("france") ||
    s.includes("germany") ||
    s.includes("netherlands") ||
    s.includes("world cup"),
  patches: (p, s) => {
    if (p.collection === "Patches & Print") return true;
    const isShirt = s.includes("shirt") || s.includes("jersey") || s.includes("jacket") || s.includes("polo");
    if (isShirt) return false;
    return s.includes("patches & print") || s.includes("patch") || s.includes("nameset") || s.includes("sponsor");
  },
  "90s": (p, s) =>
    p.collection === "The 90s Study" ||
    s.includes("199") ||
    s.includes("90s") ||
    s.includes("90's"),
  "80s": (p, s) =>
    s.includes("198") ||
    s.includes("80s") ||
    s.includes("80's"),
  "70s": (p, s) =>
    p.collection === "The 70s Study" ||
    s.includes("197") ||
    s.includes("70s") ||
    s.includes("70's"),
  matchday: (p, s) =>
    p.collection === "Objects for Matchday" ||
    s.includes("matchday"),
};

const validCategory = new Set<CategoryFilter>(CATEGORY_OPTIONS.map(option => option.value));
const validPrice = new Set<PriceFilter>(PRICE_OPTIONS.map(option => option.value));
const validSort = new Set<SortOption>(SORT_OPTIONS.map(option => option.value));

export function readCatalogPreferences(search: string): CatalogPreferences {
  const params = new URLSearchParams(search);
  const category = params.get("category");
  const price = params.get("price");
  const sort = params.get("sort");
  return {
    query: (params.get("q") || "").slice(0, 80),
    category: validCategory.has(category as CategoryFilter) ? (category as CategoryFilter) : "all",
    price: validPrice.has(price as PriceFilter) ? (price as PriceFilter) : "all",
    sort: validSort.has(sort as SortOption) ? (sort as SortOption) : "featured",
  };
}

export function writeCatalogPreferences(preferences: CatalogPreferences) {
  const params = new URLSearchParams();
  if (preferences.query.trim()) params.set("q", preferences.query.trim());
  if (preferences.category !== "all") params.set("category", preferences.category);
  if (preferences.price !== "all") params.set("price", preferences.price);
  if (preferences.sort !== "featured") params.set("sort", preferences.sort);
  const search = params.toString();
  return search ? `?${search}` : "";
}

export function applyCatalogPreferences(products: Product[], preferences: CatalogPreferences) {
  const normalizedQuery = preferences.query.trim().toLowerCase();
  const filtered = products.filter(product => {
    const searchable = [
      product.name,
      product.collection,
      product.material,
      product.fit,
      product.story,
      product.tags || "",
      ...product.details,
      ...product.colors,
    ]
      .join(" ")
      .toLowerCase();

    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
    const matcher = categoryMatchers[preferences.category];
    const matchesCategory = matcher ? matcher(product, searchable) : true;
    const matchesPrice =
      preferences.price === "all" ||
      (preferences.price === "under-1m" && product.price < 1000000) ||
      (preferences.price === "1m-2.5m" && product.price >= 1000000 && product.price <= 2500000) ||
      (preferences.price === "2.5m-plus" && product.price >= 2500000);

    return matchesQuery && matchesCategory && matchesPrice;
  });

  if (preferences.sort === "price-asc") return [...filtered].sort((a, b) => a.price - b.price);
  if (preferences.sort === "price-desc") return [...filtered].sort((a, b) => b.price - a.price);
  if (preferences.sort === "newest") return [...filtered].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return filtered;
}
