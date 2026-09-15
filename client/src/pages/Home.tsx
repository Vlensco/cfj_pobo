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
  const catalogQuery = trpc.adminProducts.list.useQuery({ pageSize: 6 });
  const featuredProducts = useMemo(() => {
    if (catalogQuery.data?.products?.length) {
      return catalogQuery.data.products.slice(0, 3).map(dbProductToStoreProduct);
    }
    return productCatalog.slice(0, 3);
  }, [catalogQuery.data?.products]);
  return (
    <PageEntrance>
      <main>
        <section className="hero">
          <img
            src="/manus-storage/terrace-hero-campaign_f4438644.jpg"
            alt="CFJ campaign featuring original football-culture apparel by cfjersey"
          />
          <div className="hero-overlay">
            <FadeIn delay={0.1} y={15}>
              <p className="eyebrow light">Drop 01 / The 90s Study</p>
            </FadeIn>
            <FadeIn delay={0.2} y={20}>
              <h1>
                For the feeling
                <br />
                before it starts.
              </h1>
            </FadeIn>
            <FadeIn delay={0.35} y={20}>
              <div className="hero-actions">
                <Link href="/shop" className="primary-button light-button">
                  Shop the release <ArrowUpRight size={16} />
                </Link>
                <a href="#campaign" className="text-link light-link">
                  Read the campaign <ArrowDownRight size={16} />
                </a>
              </div>
            </FadeIn>
          </div>
          <p className="hero-caption">A study of passageways, anticipation, and the quiet uniform of belonging.</p>
        </section>

        <HalfwayLine />

        <FadeIn delay={0.1}>
          <section className="intro-section">
            <div>
              <p className="eyebrow">CFJ · cfjersey / Original by design</p>
              <h2>
                Football culture,
                <br />
                <em>recomposed.</em>
              </h2>
            </div>
            <p>
              We take the shared rituals and soft geometry around the game as a starting point, then make something new. No
              borrowed badges. No replicas. Just considered garments for people who know the feeling.
            </p>
          </section>
        </FadeIn>

        <section className="featured-section">
          <FadeIn>
            <div className="section-head">
              <div>
                <p className="eyebrow">Featured drop</p>
                <h2>The 90s Study</h2>
              </div>
              <Link href="/shop" className="section-link">
                Shop all pieces <ArrowUpRight size={16} />
              </Link>
            </div>
          </FadeIn>
          <StaggerContainer className="catalog-grid" staggerDelay={0.15}>
            {featuredProducts.map((product, index) => (
              <StaggerItem key={product.id}>
                <ProductCard product={product} priority={index === 0} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        <FadeIn>
          <section id="campaign" className="campaign-section">
            <div className="campaign-copy">
              <p className="eyebrow">Field notes / 001</p>
              <h2>
                The long way
                <br />
                to the turnstile.
              </h2>
              <p>
                It begins with the route in, the familiar concrete, the hum of a gathering crowd. The first CFJ story
                follows what happens before the game becomes a game.
              </p>
              <a href="#journal" className="section-link">
                Enter the journal <ArrowUpRight size={16} />
              </a>
            </div>
            <div className="campaign-stat">
              <span>18:42</span>
              <p>Last light on the concourse, before the doors open.</p>
              <Sparkle size={18} strokeWidth={1.25} />
            </div>
          </section>
        </FadeIn>

        <section className="collection-section">
          <FadeIn>
            <div className="section-head">
              <div>
                <p className="eyebrow">By era, not by badge</p>
                <h2>Find your study</h2>
              </div>
            </div>
          </FadeIn>
          <StaggerContainer className="collection-grid" staggerDelay={0.12}>
            {collections.map(collection => (
              <StaggerItem key={collection.name}>
                <Link href={collection.href || "/shop"} className="collection-card">
                  <img src={collection.image} alt={collection.name} />
                  <div>
                    <p>{collection.description}</p>
                    <h3>{collection.name}</h3>
                  </div>
                  <ArrowUpRight size={19} />
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        <FadeIn>
          <section id="journal" className="newsletter-section">
            <p className="eyebrow">Notes from CFJ</p>
            <h2>
              New studies, field notes,
              <br />
              and early access.
            </h2>
            <form onSubmit={event => event.preventDefault()}>
              <label className="sr-only" htmlFor="email">
                Email address
              </label>
              <input id="email" type="email" placeholder="Your email address" required />
              <button type="submit">
                Subscribe <ArrowUpRight size={16} />
              </button>
            </form>
            <p>By subscribing, you agree to receive considered correspondence from CFJ (cfjersey).</p>
          </section>
        </FadeIn>
      </main>
    </PageEntrance>
  );
}
