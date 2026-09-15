import { FadeIn, PageEntrance, StaggerContainer, StaggerItem } from "@/components/MotionReveal";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/contexts/CartContext";
import { dbProductToStoreProduct, getProductBySlug, productCatalog } from "@/data/catalog";
import { ADD_TO_BAG_FEEDBACK_MS } from "@/lib/interactionTimings";
import { formatPrice } from "@/lib/money";
import { ArrowLeft, ChevronDown, LoaderCircle, Plus, Ruler } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";

import { ProductDescription } from "@/components/ProductDescription";
import { trpc } from "@/lib/trpc";

export default function ProductPage() {
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
    return (
      <PageEntrance>
        <main className="missing-page">
          <p className="eyebrow">Lost in the concourse</p>
          <h1>This piece has moved on.</h1>
          <Link href="/shop">Return to the collection</Link>
        </main>
      </PageEntrance>
    );
  }

  const details = [
    ["Details", product.details.join(" · ")],
    ["Fit & fabric", `${product.fit}. ${product.material}.`],
    ["Care", "Cool machine wash. Wash inside out. Reshape while damp and dry flat."],
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
      toast.success(`${product.name} added to your bag.`);
    }, ADD_TO_BAG_FEEDBACK_MS);
  };

  return (
    <PageEntrance>
      <main className="product-page">
        <Link href="/shop" className="back-link">
          <ArrowLeft size={16} /> All pieces
        </Link>
        <section className="product-layout">
          <FadeIn className="product-gallery" delay={0.1}>
            <div className="product-gallery-main">
              <img src={product.gallery[selectedImage]} alt={`${product.name}, view ${selectedImage + 1}`} />
            </div>
            <div className="gallery-under">
              <div className="gallery-note">
                <span>0{selectedImage + 1}</span>
                <span>Original design / Small batch</span>
              </div>
              <div className="gallery-thumbnails" aria-label="Product image gallery">
                {product.gallery.map((image, index) => (
                  <button
                    className={selectedImage === index ? "selected" : ""}
                    onClick={() => setSelectedImage(index)}
                    key={image}
                    aria-label={`Show product view ${index + 1}`}
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
            <ProductDescription text={product.story} />

            <div className="option-group">
              <div className="option-label">
                <span>Colour</span>
                <strong>{color}</strong>
              </div>
              <div className="swatch-row">
                {product.colors.map(option => (
                  <button
                    disabled={isAdding}
                    onClick={() => setColor(option)}
                    key={option}
                    className={`colour-swatch ${option.toLowerCase()} ${color === option ? "selected" : ""}`}
                    aria-label={`Select ${option}`}
                  >
                    <span />
                  </button>
                ))}
              </div>
            </div>

            <div className="option-group">
              <div className="option-label">
                <span>Size</span>
                <button className="size-guide">
                  <Ruler size={14} /> Size guide
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
                  <LoaderCircle size={16} className="button-spinner" /> Adding to bag
                </>
              ) : (
                <>
                  Add to bag <span>{formatPrice(product.price)}</span>
                </>
              )}
            </button>
            <p className="shipping-note">Worldwide delivery. Dispatches within 2–3 business days.</p>

            <div className="product-accordions">
              {details.map(([title, content]) => (
                <div className="detail-row" key={title}>
                  <button onClick={() => setOpenDetail(openDetail === title ? null : title)}>
                    <span>{title}</span>
                    {openDetail === title ? <ChevronDown size={18} /> : <Plus size={18} />}
                  </button>
                  {openDetail === title && <p>{content}</p>}
                </div>
              ))}
            </div>
          </FadeIn>
        </section>

        <section className="related-section">
          <FadeIn>
            <p className="eyebrow">Continue the study</p>
            <div className="section-title-line">
              <h2>Other pieces</h2>
              <Link href="/shop">View all</Link>
            </div>
          </FadeIn>
          <StaggerContainer className="catalog-grid related-grid" staggerDelay={0.12}>
            {related.map(item => (
              <StaggerItem key={item.id}>
                <ProductCard product={item} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      </main>
    </PageEntrance>
  );
}
