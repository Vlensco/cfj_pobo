import { Product } from "@/data/catalog";
import { formatPrice } from "@/lib/money";
import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) { return <Link href={`/products/${product.slug}`} className="product-card"><div className="product-image-wrap"><img src={product.image} alt={`${product.name} in ${product.colors[0]}`} loading={priority ? "eager" : "lazy"} /><span className="product-view">View piece <ArrowUpRight size={15} strokeWidth={1.5} /></span></div><div className="product-meta"><div><p className="product-collection">{product.collection}</p><h3>{product.name}</h3></div><span>{formatPrice(product.price)}</span></div></Link>; }
