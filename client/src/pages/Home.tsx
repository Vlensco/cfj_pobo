import { useT } from "@/i18n";
import { FadeIn, PageEntrance, StaggerContainer, StaggerItem } from "@/components/MotionReveal";
import { ProductCard } from "@/components/ProductCard";
import { collections, dbProductToStoreProduct, productCatalog } from "@/data/catalog";
import { trpc } from "@/lib/trpc";
import { ArrowDownRight, ArrowUpRight, Sparkle } from "lucide-react";
import { useMemo } from "react";
import { Link } from "wouter";

const HalfwayLine = () => (
  <div className="halfway-line" aria-hidden="true">
    <span />
  </div>
);

export default function Home() {
  const t = useT();
  const catalogQuery = trpc.adminProducts.list.useQuery({ pageSize: 6 });
  const featuredProducts = useMemo(() => {
    if (catalogQuery.data?.products?.length) {
      const items = catalogQuery.data.products.map(dbProductToStoreProduct);
      const seen = new Set<string>();
      const diverse: typeof items = [];
      for (const item of items) {
        const coreName = item.name.replace(/\(.*?\)/g, "").trim().toLowerCase();
        if (!seen.has(coreName) && item.collection !== "Patches & Print") {
          seen.add(coreName);
          diverse.push(item);
          if (diverse.length >= 3) break;
        }
      }
      return diverse.length ? diverse : items.slice(0, 3);
    }
    return productCatalog.slice(0, 3);
  }, [catalogQuery.data?.products]);
  return (
    <PageEntrance>
      <main>
        <section className="hero">
          <img
            src="/manus-storage/terrace-hero-campaign_f4438644.jpg"
            alt={t("CFJ campaign featuring original football-culture apparel by cfjersey")}
          />
          <div className="hero-overlay">
            <FadeIn delay={0.1} y={15}>
              <p className="eyebrow light">{t("CFJ Archive / Football Culture & Classic Kits")}</p>
            </FadeIn>
            <FadeIn delay={0.2} y={20}>
              <h1>
                {t("For the feeling")}
                <br />
                {t("before it starts.")}
              </h1>
            </FadeIn>
            <FadeIn delay={0.35} y={20}>
              <div className="hero-actions">
                <Link href="/shop" className="primary-button light-button">
                  {t("Shop the archive")} <ArrowUpRight size={16} />
                </Link>
                <a href="#campaign" className="text-link light-link">
                  {t("Read the journal")} <ArrowDownRight size={16} />
                </a>
              </div>
            </FadeIn>
          </div>
          <p className="hero-caption">{t("Over 1,700 authentic classic football shirts, patches, and personalized namesets.")}</p>
        </section>

        <HalfwayLine />

        <FadeIn delay={0.1}>
          <section className="intro-section">
            <div>
              <p className="eyebrow">{t("CFJ · cfjersey / Curated Calcio & Retro Football")}</p>
              <h2>
                {t("Football culture,")}
                <br />
                <em>{t("recomposed.")}</em>
              </h2>
            </div>
            <p>
              {t("From 90s Serie A and Premier League glory to official sleeve patches and custom nameset printing. Timeless garments preserved for true football purists.")}
            </p>
          </section>
        </FadeIn>

        <section className="featured-section">
          <FadeIn>
            <div className="section-head">
              <div>
                <p className="eyebrow">{t("Curated Classics")}</p>
                <h2>{t("Iconic Matchday Apparel")}</h2>
              </div>
              <Link href="/shop" className="section-link">
                {t("Shop all 1,760 pieces")} <ArrowUpRight size={16} />
              </Link>
            </div>
          </FadeIn>
          <div className="catalog-grid">
            {featuredProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index === 0} />
            ))}
          </div>
        </section>

        <FadeIn>
          <section id="campaign" className="campaign-section">
            <div className="campaign-copy">
              <p className="eyebrow">{t("Field notes / 001")}</p>
              <h2>
                {t("The long way")}
                <br />
                {t("to the turnstile.")}
              </h2>
              <p>
                {t("It begins with the route in, the familiar concrete, the hum of a gathering crowd. The first CFJ story follows what happens before the game becomes a game.")}
              </p>
              <a href="#journal" className="section-link">
                {t("Enter the journal")} <ArrowUpRight size={16} />
              </a>
            </div>
            <div className="campaign-stat">
              <span>1,760+</span>
              <p>{t("Archival shirts, badges, and original classic collections.")}</p>
              <Sparkle size={18} strokeWidth={1.25} />
            </div>
          </section>
        </FadeIn>

        <section className="collection-section">
          <FadeIn>
            <div className="section-head">
              <div>
                <p className="eyebrow">{t("By league & era")}</p>
                <h2>{t("Find your heritage")}</h2>
              </div>
            </div>
          </FadeIn>
          <StaggerContainer className="collection-grid" staggerDelay={0.12}>
            {collections.map(collection => (
              <StaggerItem key={collection.name}>
                <Link href={collection.href || "/shop"} className="collection-card">
                  <img src={collection.image} alt={t(collection.name)} />
                  <div>
                    <p>{t(collection.description)}</p>
                    <h3>{t(collection.name)}</h3>
                  </div>
                  <ArrowUpRight size={19} />
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        <FadeIn>
          <section id="journal" className="newsletter-section">
            <p className="eyebrow">{t("Notes from CFJ")}</p>
            <h2>
              {t("New studies, field notes,")}
              <br />
              {t("and early access.")}
            </h2>
            <form onSubmit={event => event.preventDefault()}>
              <label className="sr-only" htmlFor="email">
                {t("Email address")}
              </label>
              <input id="email" type="email" placeholder={t("Your email address")} required />
              <button type="submit">
                {t("Subscribe")} <ArrowUpRight size={16} />
              </button>
            </form>
            <p>{t("By subscribing, you agree to receive considered correspondence from CFJ (cfjersey).")}</p>
          </section>
        </FadeIn>
      </main>
    </PageEntrance>
  );
}
