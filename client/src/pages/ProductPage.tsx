import { useT } from "@/i18n";
import { FadeIn, PageEntrance, StaggerContainer, StaggerItem } from "@/components/MotionReveal";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/contexts/CartContext";
import { dbProductToStoreProduct, getProductBySlug, productCatalog } from "@/data/catalog";
import { ADD_TO_BAG_FEEDBACK_MS } from "@/lib/interactionTimings";
import { useFormatPrice } from "@/lib/currency";
import { ArrowLeft, ChevronDown, LoaderCircle, Plus, Ruler } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";

import { ProductDescription } from "@/components/ProductDescription";
import { JerseyPersonalizer } from "@/components/JerseyPersonalizer";
import { trpc } from "@/lib/trpc";
import { ItemCustomization } from "@shared/customization";
import { Sparkles } from "lucide-react";

export default function ProductPage() {
  const t = useT();
  const formatPrice = useFormatPrice();
  const [, params] = useRoute("/products/:slug");
  const slug = params?.slug || "";
  const productDetailQuery = trpc.adminProducts.getDetails.useQuery({ handle: slug }, { enabled: Boolean(slug) });
  const allListQuery = trpc.adminProducts.list.useQuery({ pageSize: 50 });

  const product = useMemo(() => {
    if (productDetailQuery.data) {
      return dbProductToStoreProduct(productDetailQuery.data);
    }
    return getProductBySlug(slug);
  }, [productDetailQuery.data, slug]);

  const { addItem } = useCart();
  const trackEvent = trpc.analytics.trackEvent.useMutation();
  const [color, setColor] = useState(product?.colors[0] || "Standard");
  const [size, setSize] = useState(product?.sizes[2] || product?.sizes[0] || "M");
  const [selectedImage, setSelectedImage] = useState(0);
  const [openDetail, setOpenDetail] = useState<string | null>("Details");
  const [isAdding, setIsAdding] = useState(false);
  const [isPersonalizeOpen, setIsPersonalizeOpen] = useState(false);

  useEffect(() => {
    if (product) {
      setColor(product.colors[0] || "Standard");
      setSize(product.sizes[2] || product.sizes[0] || "M");
      setSelectedImage(0);
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
  }, [slug, product?.id]);

  const allProducts = useMemo(() => {
    if (allListQuery.data?.products?.length) {
      return allListQuery.data.products.map(dbProductToStoreProduct);
    }
    return productCatalog;
  }, [allListQuery.data?.products]);

  const related = useMemo(() => {
    return allProducts.filter(item => item.id !== product?.id && item.slug !== product?.slug).slice(0, 3);
  }, [allProducts, product]);
  if (!product) {
    if (productDetailQuery.isLoading) {
      return (
        <PageEntrance>
          <main className="missing-page is-loading">
            <LoaderCircle className="animate-spin" size={36} />
            <p className="eyebrow">{t("CFJ Archive")}</p>
            <h2>{t("Retrieving kit archival records…")}</h2>
          </main>
        </PageEntrance>
      );
    }
    return (
      <PageEntrance>
        <main className="missing-page">
          <p className="eyebrow">{t("Lost in the concourse")}</p>
          <h1>{t("This piece has moved on.")}</h1>
          <Link href="/shop">{t("Return to the collection")}</Link>
        </main>
      </PageEntrance>
    );
  }

  const details = [
    ["Details", product.details.map(detail => t(detail)).join(" · ")],
    ["Fit & fabric", `${t(product.fit)}. ${t(product.material)}.`],
    ["Care", t("Cool machine wash. Wash inside out. Reshape while damp and dry flat.")],
  ];

  const addToBag = () => {
    if (isAdding) return;
    setIsAdding(true);
    trackEvent.mutate({
      productId: product.id,
      productName: product.name,
      eventType: "add_to_bag",
      color,
      size,
      price: product.price,
    });
    window.setTimeout(() => {
      addItem(product, color, size);
      setIsAdding(false);
      toast.success(t("{name} added to your bag.", { name: product.name }));
    }, ADD_TO_BAG_FEEDBACK_MS);
  };

  const handleAddPersonalized = (customization: ItemCustomization) => {
    addItem(product, color, size, customization);
    const extraNameset = customization.nameset?.price || 0;
    const extraPatch = customization.patch?.price || 0;
    trackEvent.mutate({
      productId: product.id,
      productName: product.name,
      eventType: "add_to_bag",
      color,
      size,
      price: product.price + extraNameset + extraPatch,
    });
    const summary: string[] = [];
    if (customization.nameset) {
      summary.push(`${customization.nameset.name} #${customization.nameset.number}`);
    }
    if (customization.patch) {
      summary.push(customization.patch.name);
    }
    toast.success(t("Custom piece added to bag! ({summary})", { summary: summary.join(" + ") || t("Custom") }));
  };

  return (
    <PageEntrance>
      <main className="product-page">
        <Link href="/shop" className="back-link">
          <ArrowLeft size={16} /> {t("All pieces")}
        </Link>
        <section className="product-layout">
          <FadeIn className="product-gallery" delay={0.1}>
            <div className="product-gallery-main">
              <img src={product.gallery[selectedImage]} alt={t("{name}, view {number}", { name: product.name, number: selectedImage + 1 })} />
            </div>
            <div className="gallery-under">
              <div className="gallery-note">
                <span>0{selectedImage + 1}</span>
                <span>{t("Original design / Small batch")}</span>
              </div>
              <div className="gallery-thumbnails" aria-label={t("Product image gallery")}>
                {product.gallery.map((image, index) => (
                  <button
                    className={selectedImage === index ? "selected" : ""}
                    onClick={() => setSelectedImage(index)}
                    key={image}
                    aria-label={t("Show product view {number}", { number: index + 1 })}
                  >
                    <img src={image} alt="" />
                  </button>
                ))}
              </div>
            </div>
          </FadeIn>

          <FadeIn className="product-purchase" delay={0.2}>
            <p className="eyebrow">{product.collection}</p>
            <div className="product-title-row">
              <h1>{product.name}</h1>
              <span>{formatPrice(product.price)}</span>
            </div>
            <ProductDescription text={product.story} html={product.descriptionHtml} />

            <div className="option-group">
              <div className="option-label">
                <span>{t("Colour")}</span>
                <strong>{t(color)}</strong>
              </div>
              <div className="swatch-row">
                {product.colors.map(option => (
                  <button
                    disabled={isAdding}
                    onClick={() => setColor(option)}
                    key={option}
                    className={`colour-swatch ${option.toLowerCase()} ${color === option ? "selected" : ""}`}
                    aria-label={t("Select {option}", { option: t(option) })}
                  >
                    <span />
                  </button>
                ))}
              </div>
            </div>

            <div className="option-group">
              <div className="option-label">
                <span>{t("Size")}</span>
                <button className="size-guide">
                  <Ruler size={14} /> {t("Size guide")}
                </button>
              </div>
              <div className="size-grid">
                {product.sizes.map(option => (
                  <button
                    disabled={isAdding}
                    key={option}
                    onClick={() => setSize(option)}
                    className={size === option ? "selected" : ""}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <button
              className={`primary-button product-add ${isAdding ? "is-loading" : ""}`}
              onClick={addToBag}
              disabled={isAdding}
              aria-live="polite"
            >
              {isAdding ? (
                <>
                  <LoaderCircle size={16} className="button-spinner" /> {t("Adding to bag")}
                </>
              ) : (
                <>
                  {t("Add to bag")} <span>{formatPrice(product.price)}</span>
                </>
              )}
            </button>

            {/* Customise print and badge trigger link matching reference screenshot */}
            {product.hasNameset !== false && (
              <div className="customise-link-wrapper">
                <button
                  type="button"
                  className="customise-link-btn"
                  onClick={() => setIsPersonalizeOpen(true)}
                  aria-label={t("Customise nameset and patch badge")}
                >
                  <Sparkles size={15} className="sparkle-icon" />
                  <span>{t("Customise print and badge")}</span>
                </button>
              </div>
            )}

            <p className="shipping-note">{t("Worldwide delivery. Dispatches within 2–3 business days.")}</p>

            <div className="product-accordions">
              {details.map(([title, content]) => (
                <div className="detail-row" key={title}>
                  <button onClick={() => setOpenDetail(openDetail === title ? null : title)}>
                    <span>{t(title)}</span>
                    {openDetail === title ? <ChevronDown size={18} /> : <Plus size={18} />}
                  </button>
                  {openDetail === title && <p>{content}</p>}
                </div>
              ))}
            </div>
          </FadeIn>
        </section>

        {/* Jersey Personaliser Modal */}
        <JerseyPersonalizer
          product={product}
          selectedColor={color}
          selectedSize={size}
          isOpen={isPersonalizeOpen}
          onClose={() => setIsPersonalizeOpen(false)}
          onAddToCart={handleAddPersonalized}
        />

        <section className="related-section">
          <FadeIn>
            <p className="eyebrow">{t("Continue the study")}</p>
            <div className="section-title-line">
              <h2>{t("Other pieces")}</h2>
              <Link href="/shop">{t("View all")}</Link>
            </div>
          </FadeIn>
          <div className="catalog-grid related-grid">
            {related.map(item => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      </main>
    </PageEntrance>
  );
}
