import { FadeIn, PageEntrance, StaggerContainer, StaggerItem } from "@/components/MotionReveal";
import { ArrowLeft, ArrowUpRight, Compass, Eye, ShieldCheck, Sparkle } from "lucide-react";
import { Link } from "wouter";

export default function Campaign() {
  return (
    <PageEntrance>
      <main className="campaign-page">
        {/* Hero Section */}
        <section className="campaign-hero">
          <img
            src="/manus-storage/terrace-hero-campaign_f4438644.jpg"
            alt="Terrace Lookbook Campaign"
            className="campaign-hero-img"
          />
          <div className="campaign-hero-overlay">
            <FadeIn delay={0.1} y={15}>
              <p className="eyebrow light">Field Notes / Issue 001</p>
            </FadeIn>
            <FadeIn delay={0.2} y={20}>
              <h1>
                The Long Way
                <br />
                to the Turnstile.
              </h1>
            </FadeIn>
            <FadeIn delay={0.3} y={20}>
              <p className="campaign-lead">
                A visual study of anticipation, raw concrete concourses, and the quiet uniform of belonging before the
                whistle blows.
              </p>
            </FadeIn>
          </div>
        </section>

        {/* Narrative Intro */}
        <section className="campaign-manifesto">
          <FadeIn>
            <div className="manifesto-grid">
              <div className="manifesto-left">
                <span className="chapter-tag">Chapter 01</span>
                <h2>The feeling before anything begins.</h2>
              </div>
              <div className="manifesto-right">
                <p>
                  Most football apparel is made for the pitch or the broadcast. We wanted to design for what happens
                  around it: the evening walk under train arches, the damp steps of the stadium concourse, the condensation
                  on the floodlights.
                </p>
                <p>
                  No synthetic replica jerseys. No commercial sponsor emblems. Instead, we take the soft geometry,
                  proportions, and heavy cotton weights of European terrace culture from the 1970s through the 1990s and
                  recompose them for everyday life.
                </p>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* Visual Editorial Gallery */}
        <section className="campaign-gallery-section">
          <FadeIn>
            <div className="section-head">
              <div>
                <p className="eyebrow">Visual Study / 001</p>
                <h2>The 90s Silhouette</h2>
              </div>
              <Link href="/shop" className="section-link">
                Shop the pieces <ArrowUpRight size={16} />
              </Link>
            </div>
          </FadeIn>

          <div className="editorial-mosaic">
            <FadeIn className="mosaic-card large" delay={0.1}>
              <div className="mosaic-media">
                <img src="/manus-storage/terrace-junction-v2_75e8572e.jpg" alt="Junction Long Sleeve" />
                <span className="mosaic-caption">Study 01 / Junction Heavy Cotton</span>
              </div>
              <div className="mosaic-info">
                <h3>Junction Long Sleeve</h3>
                <p>
                  Constructed with a dropped shoulder and structured 280gsm knit. Features contrast contour stitching
                  reminiscent of 90s warm-up tops.
                </p>
                <Link href="/products/junction-long-sleeve" className="text-link">
                  View study <ArrowUpRight size={14} />
                </Link>
              </div>
            </FadeIn>

            <FadeIn className="mosaic-card" delay={0.2}>
              <div className="mosaic-media">
                <img src="/manus-storage/terrace-interval-v2_a26c6c2e.jpg" alt="Interval Track Jacket" />
                <span className="mosaic-caption">Study 02 / Deep Pitch Green</span>
              </div>
              <div className="mosaic-info">
                <h3>Interval Track Jacket</h3>
                <p>Raglan sleeves with high funnel collar. Archival geometry for pre-match cold winds.</p>
                <Link href="/products/interval-track-jacket" className="text-link">
                  View study <ArrowUpRight size={14} />
                </Link>
              </div>
            </FadeIn>

            <FadeIn className="mosaic-card" delay={0.15}>
              <div className="mosaic-media">
                <img src="/manus-storage/terrace-archive-v2_c96921aa.jpg" alt="Archive Knit Polo" />
                <span className="mosaic-caption">Study 03 / Textured Cotton Knit</span>
              </div>
              <div className="mosaic-info">
                <h3>Archive Knit Polo</h3>
                <p>Open Johnny collar in contrast navy with subtle micro-waffle texture.</p>
                <Link href="/products/archive-knit-polo" className="text-link">
                  View study <ArrowUpRight size={14} />
                </Link>
              </div>
            </FadeIn>

            <FadeIn className="mosaic-card large" delay={0.25}>
              <div className="mosaic-media">
                <img src="/manus-storage/terrace-cap-v2_3966becd.jpg" alt="Halfway Cap" />
                <span className="mosaic-caption">Study 04 / Washed Heavy Twill</span>
              </div>
              <div className="mosaic-info">
                <h3>Halfway Cap</h3>
                <p>Unstructured 6-panel silhouette with subtle tonal embroidery and brass buckle fastening.</p>
                <Link href="/products/halfway-cap" className="text-link">
                  View study <ArrowUpRight size={14} />
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Pillars / Philosophy */}
        <section className="campaign-pillars">
          <FadeIn>
            <p className="eyebrow light">Principles of Production</p>
            <h2>Designed with intention.</h2>
          </FadeIn>

          <StaggerContainer className="pillars-grid" staggerDelay={0.15}>
            <StaggerItem className="pillar-item">
              <div className="pillar-icon">
                <ShieldCheck size={24} strokeWidth={1.5} />
              </div>
              <h3>Small Batch Runs</h3>
              <p>
                We produce strictly limited editions. Each run is numbered and never mass-reproduced to prevent surplus
                waste and maintain craftsmanship.
              </p>
            </StaggerItem>

            <StaggerItem className="pillar-item">
              <div className="pillar-icon">
                <Compass size={24} strokeWidth={1.5} />
              </div>
              <h3>Architectural Cuts</h3>
              <p>
                Proportions are derived from stadium architecture—brutalist concrete, curved staircases, and diagonal steel
                girders translated into garment seamlines.
              </p>
            </StaggerItem>

            <StaggerItem className="pillar-item">
              <div className="pillar-icon">
                <Eye size={24} strokeWidth={1.5} />
              </div>
              <h3>Subtle Identity</h3>
              <p>
                No loud logos. The identity lives in the cut, the drape of the heavyweight cotton, and the understated
                stitch details known only to the wearer.
              </p>
            </StaggerItem>
          </StaggerContainer>
        </section>

        {/* Timeline Log */}
        <section className="campaign-timeline">
          <FadeIn>
            <div className="timeline-header">
              <p className="eyebrow">Concourse Logs</p>
              <h2>18:42 — Matchday Sequence</h2>
            </div>
          </FadeIn>

          <div className="timeline-items">
            <FadeIn delay={0.1} className="timeline-row">
              <span className="time-stamp">17:15</span>
              <div className="timeline-content">
                <h4>The Underpass</h4>
                <p>Low rumble of passing trains overhead. Damp wool, cigarette smoke, and the hum of early arrivals.</p>
              </div>
            </FadeIn>

            <FadeIn delay={0.15} className="timeline-row">
              <span className="time-stamp">18:02</span>
              <div className="timeline-content">
                <h4>The Corner Pub</h4>
                <p>Pints in dim light. Debating squad selections over greaseproof paper programs.</p>
              </div>
            </FadeIn>

            <FadeIn delay={0.2} className="timeline-row">
              <span className="time-stamp">18:42</span>
              <div className="timeline-content">
                <h4>The Turnstile</h4>
                <p>The metallic click of the gate. Stepping out onto the concrete stairs as the floodlights hum to life.</p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* CTA Footer */}
        <section className="campaign-cta">
          <FadeIn>
            <Sparkle size={24} strokeWidth={1.25} />
            <h2>Experience Drop 01</h2>
            <p>Limited quantities available worldwide. Dispatched within 2–3 business days.</p>
            <Link href="/shop" className="primary-button">
              Explore the collection <ArrowUpRight size={16} />
            </Link>
          </FadeIn>
        </section>
      </main>
    </PageEntrance>
  );
}
