import { FadeIn, PageEntrance, StaggerContainer, StaggerItem } from "@/components/MotionReveal";
import { ArrowUpRight, BookOpen, Calendar, Clock, Filter, Sparkles, Tag, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

interface Article {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: "Field Notes" | "Fabric Studies" | "Culture" | "Lookbooks";
  readTime: string;
  date: string;
  image: string;
  excerpt: string;
  content: string[];
}

const ARTICLES: Article[] = [
  {
    id: "art-1",
    slug: "long-way-turnstile",
    title: "The Long Way to the Turnstile",
    subtitle: "A meditation on the quiet uniform of belonging and pre-match anticipation.",
    category: "Field Notes",
    readTime: "4 min read",
    date: "August 2026",
    image: "/manus-storage/terrace-hero-campaign_f4438644.jpg",
    excerpt:
      "Before the stadium roars, before the tactical shape is revealed, there is the walk. Cold air on damp brickwork, train station concourses, and the shared language of silhouette.",
    content: [
      "It begins two hours before kickoff. The light begins to tilt behind the brutalist concrete tiers of the north stand, casting long diagonal shadows across the wet tarmac.",
      "In terrace culture, clothing was never about performance in the athletic sense. It was about performance in the sociological sense—a uniform that identified you to those in the know, while remaining completely invisible to authority and broadcast cameras.",
      "Our Drop 01 takes that exact tension as its thesis: high-density loopback cotton, dropped shoulder geometry, and subtle stitching that references archival warm-ups without needing to stamp a corporate sponsor across the chest.",
      "When you step through the iron turnstile, the transition from cold city street to glowing green pitch is a sensory reset. We make garments for that exact threshold.",
    ],
  },
  {
    id: "art-2",
    slug: "heavyweights-and-high-collars",
    title: "Heavyweights & High Collars",
    subtitle: "Archival studies of 1990s Italian training garments and structured knits.",
    category: "Fabric Studies",
    readTime: "6 min read",
    date: "July 2026",
    image: "/manus-storage/terrace-interval-v2_a26c6c2e.jpg",
    excerpt:
      "Why 280gsm matters. Exploring the drape, structural integrity, and thermal comfort of vintage double-knit cotton jerseys.",
    content: [
      "Modern sportswear has chased synthetic lightness at the expense of presence. In the 1990s, training tops possessed a structural drape that held its shape regardless of movement.",
      "For the Interval Track Jacket and Junction Long Sleeve, we spent six months testing cotton-poly interlocking weaves that achieve 280gsm density. The result is a collar that stands firmly without collapsing and cuffs that retain memory over seasons of wash and wear.",
      "Color grading was equally deliberate: deep pitch green, weathered ink charcoal, and natural chalk. Colors that look better under floodlights and rainy days than in sterile studio lighting.",
    ],
  },
  {
    id: "art-3",
    slug: "the-geometry-of-floodlights",
    title: "The Geometry of Stadium Concrete",
    subtitle: "How brutalist arena architecture directly inspired our seamlines and contour panels.",
    category: "Culture",
    readTime: "5 min read",
    date: "June 2026",
    image: "/manus-storage/terrace-junction-v2_75e8572e.jpg",
    excerpt:
      "Diagonal stairways, cantilevers, and raw concrete. How the physical forms of European grounds inform our garment construction.",
    content: [
      "Stadiums are monuments of civic geometry. From San Siro's spiral towers to the cantilevered steel roofs of northern England, the architecture of football is bold, honest, and unadorned.",
      "When drafting the pattern for the Junction Long Sleeve, we mirrored the diagonal shear lines of concrete stairways across the back yoke. It provides natural ergonomic freedom for the arms while creating a clean graphic break on the garment.",
      "It is an homage to the grounds that raised us, translated not as a logo, but as architectural anatomy.",
    ],
  },
  {
    id: "art-4",
    slug: "small-batch-ethos",
    title: "The Small Batch Manifesto",
    subtitle: "Why we limit every study to strictly numbered runs.",
    category: "Lookbooks",
    readTime: "3 min read",
    date: "May 2026",
    image: "/manus-storage/terrace-archive-v2_c96921aa.jpg",
    excerpt:
      "No overproduction, no seasonal clearance cycles. Why rarity and care define the future of independent apparel design.",
    content: [
      "The traditional fashion calendar produces excess inventory designed to be discounted and discarded within four months. We reject that model.",
      "Every Terrace piece is produced in small, numbered batches. We order only what we know will be worn and cherished. Once a study sells out, the pattern is archived into our design ledger.",
      "This approach allows us to invest more in custom rib knits, double-needle stitching, and custom hardware that mass production cannot accommodate.",
    ],
  },
];

const CATEGORIES = ["All", "Field Notes", "Fabric Studies", "Culture", "Lookbooks"] as const;

export default function Journal() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [email, setEmail] = useState("");

  const filteredArticles =
    selectedCategory === "All"
      ? ARTICLES
      : ARTICLES.filter(art => art.category === selectedCategory);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast.success("Thank you for subscribing to Notes from the Terrace.");
    setEmail("");
  };

  return (
    <PageEntrance>
      <main className="journal-page">
        {/* Header */}
        <section className="journal-header">
          <FadeIn delay={0.05} y={15}>
            <p className="eyebrow">The Editorial Archive</p>
          </FadeIn>
          <FadeIn delay={0.15} y={20}>
            <h1>
              Notes from
              <br />
              the Terrace.
            </h1>
          </FadeIn>
          <FadeIn delay={0.25} y={20}>
            <p className="journal-lead">
              Field notes, fabric studies, and cultural dispatches from the intersection of football memory and garment
              design.
            </p>
          </FadeIn>

          {/* Category Filter */}
          <div className="journal-categories" aria-label="Filter journal by topic">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={selectedCategory === cat ? "active" : ""}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Featured Top Article */}
        {selectedCategory === "All" && (
          <section className="featured-article-section">
            <FadeIn>
              <article className="featured-article-card" onClick={() => setActiveArticle(ARTICLES[0])}>
                <div className="featured-article-media">
                  <img src={ARTICLES[0].image} alt={ARTICLES[0].title} />
                  <span className="featured-badge">Featured Dispatch</span>
                </div>
                <div className="featured-article-body">
                  <div className="article-meta">
                    <span className="article-cat">{ARTICLES[0].category}</span>
                    <span className="meta-dot">·</span>
                    <span>{ARTICLES[0].readTime}</span>
                    <span className="meta-dot">·</span>
                    <span>{ARTICLES[0].date}</span>
                  </div>
                  <h2>{ARTICLES[0].title}</h2>
                  <p className="article-subtitle">{ARTICLES[0].subtitle}</p>
                  <p className="article-excerpt">{ARTICLES[0].excerpt}</p>
                  <button className="read-button">
                    Read article <BookOpen size={15} />
                  </button>
                </div>
              </article>
            </FadeIn>
          </section>
        )}

        {/* Articles Grid */}
        <section className="journal-grid-section">
          <StaggerContainer className="journal-grid" staggerDelay={0.12}>
            {filteredArticles.map(article => (
              <StaggerItem key={article.id}>
                <article className="journal-card" onClick={() => setActiveArticle(article)}>
                  <div className="journal-card-img">
                    <img src={article.image} alt={article.title} />
                    <span className="card-category">{article.category}</span>
                  </div>
                  <div className="journal-card-info">
                    <div className="article-meta">
                      <span>{article.date}</span>
                      <span className="meta-dot">·</span>
                      <span>{article.readTime}</span>
                    </div>
                    <h3>{article.title}</h3>
                    <p>{article.subtitle}</p>
                    <span className="card-read-link">
                      Read study <ArrowUpRight size={14} />
                    </span>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        {/* Newsletter Subscription */}
        <section className="journal-newsletter">
          <FadeIn>
            <p className="eyebrow">Direct Correspondence</p>
            <h2>Receive early access & printed field notes.</h2>
            <p>
              Subscribers receive private drop links, editorial print previews, and invitations to Terrace archive pop-ups.
            </p>
            <form className="journal-subscribe-form" onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <button type="submit">
                Subscribe <ArrowUpRight size={16} />
              </button>
            </form>
          </FadeIn>
        </section>

        {/* Article Reader Modal */}
        {activeArticle && (
          <div className="article-modal-overlay" onClick={() => setActiveArticle(null)}>
            <div className="article-modal-content" onClick={e => e.stopPropagation()}>
              <button
                className="close-modal-button"
                onClick={() => setActiveArticle(null)}
                aria-label="Close article reader"
              >
                <X size={20} />
              </button>

              <div className="article-modal-head">
                <div className="article-meta">
                  <span className="article-cat">{activeArticle.category}</span>
                  <span className="meta-dot">·</span>
                  <span>{activeArticle.readTime}</span>
                  <span className="meta-dot">·</span>
                  <span>{activeArticle.date}</span>
                </div>
                <h1>{activeArticle.title}</h1>
                <p className="modal-subtitle">{activeArticle.subtitle}</p>
              </div>

              <div className="modal-hero-image">
                <img src={activeArticle.image} alt={activeArticle.title} />
              </div>

              <div className="modal-prose">
                {activeArticle.content.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>

              <div className="modal-foot">
                <p className="eyebrow">Terrace Journal / {activeArticle.category}</p>
                <Link href="/shop" className="primary-button" onClick={() => setActiveArticle(null)}>
                  Shop Drop 01 <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </PageEntrance>
  );
}
