import { useT } from "@/i18n";
import { Product } from "@/data/catalog";
import { useFormatPrice } from "@/lib/currency";
import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const t = useT();
  const formatPrice = useFormatPrice();
  return (
    <Link href={`/products/${product.slug}`} className="product-card">
      <div className="product-image-wrap">
        <img
          src={product.image || "/cfj_90s_study.jpg"}
          alt={t("{name} in {color}", { name: product.name, color: t(product.colors?.[0] || "Standard") })}
          loading="eager"
          decoding="async"
          onError={e => {
            const target = e.currentTarget;
            if (!target.src.endsWith("/cfj_90s_study.jpg")) {
              target.src = "/cfj_90s_study.jpg";
            }
          }}
        />
        <span className="product-view">
          {t("View piece")} <ArrowUpRight size={15} strokeWidth={1.5} />
        </span>
      </div>
      <div className="product-meta">
        <div>
          <p className="product-collection">{product.collection}</p>
          <h3>{product.name}</h3>
        </div>
        <span>{formatPrice(product.price)}</span>
      </div>
    </Link>
  );
}
