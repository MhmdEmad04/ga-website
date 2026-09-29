"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import { useState } from "react";
import { buyNowHref, colors, money, type ColorId, type Product } from "@/lib/catalog";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const [selectedColor, setSelectedColor] = useState<ColorId>(product.defaultColor);
  const href = `/products/${product.slug}?color=${selectedColor}`;
  return <article className="product-card">
    <Link href={href} className="product-image" aria-label={`عرض شنطة ${product.name}`}>
      <Image src={product.images[selectedColor]} alt={`شنطة ${product.name} باللون ${colors.find((color) => color.id === selectedColor)!.name}`} fill sizes="(max-width: 600px) 46vw, (max-width: 1000px) 30vw, 23vw" />
      <span className="product-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
      <span className="product-view">اكتشفي التفاصيل <ArrowUpLeft size={17} /></span>
    </Link>
    <div className="product-meta"><div><span className="product-category">{product.category}</span><h3><Link href={href}>{product.name}</Link></h3></div><span className="product-price">{money(product.price)}</span></div>
    <p className="card-description">{product.subtitle}</p>
    <div className="product-bottom"><div className="color-swatches" role="group" aria-label={`ألوان شنطة ${product.name}`}>{colors.map((color) => <button key={color.id} type="button" aria-label={`${product.name} — ${color.name}`} aria-pressed={selectedColor === color.id} onClick={() => setSelectedColor(color.id)} className={`swatch ${selectedColor === color.id ? "selected" : ""}`} style={{ "--swatch": color.hex } as React.CSSProperties} />)}</div><span>٣ ألوان</span></div>
    <Link className="card-buy" href={buyNowHref(product.id, selectedColor)} aria-label={`اشتري ${product.name} الآن`}>اشتري الآن <ArrowUpLeft size={16} /></Link>
  </article>;
}
