"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { colors, money } from "@/lib/catalog";
import { useCatalog } from './catalog-provider';
import { useCart } from "./cart-provider";

export function CartPage() {
  const {getProduct}=useCatalog();
  const { lines, ready, updateItem, removeItem } = useCart();
  const subtotal = lines.reduce((total, line) => total + (getProduct(line.productId)?.price ?? 0) * line.quantity, 0);

  if (!ready) return <p className="loading-copy" role="status">بنجهّز سلتك…</p>;
  if (!lines.length) return <div className="empty-state cart-empty"><ShoppingBag size={54} strokeWidth={1} /><span className="eyebrow">ROOM FOR SOMETHING LOVELY</span><h1>سلتك مستنية حكاية.</h1><p>لسه مفيش شنط في السلة. لاقي الشنطة اللي تشبهك.</p><Link className="button" href="/products">اكتشفي التشكيلة <ArrowLeft size={18} /></Link></div>;

  return <><header className="page-heading"><span className="eyebrow">YOUR LITTLE FINDS</span><h1>اختياراتك الحلوة.</h1></header><div className="cart-layout"><div className="cart-items">{lines.map((line) => {
    const product = getProduct(line.productId)!;
    const color = colors.find((item) => item.id === line.color)!;
    return <article className="cart-item" key={`${line.productId}-${line.color}`}><Link href={`/products/${product.slug}?color=${line.color}`} className="cart-item-image"><Image src={product.images[line.color]} alt={`شنطة ${product.name} باللون ${color.name}`} fill sizes="140px" /></Link><div className="cart-item-info"><span className="product-category">{product.category}</span><h2><Link href={`/products/${product.slug}?color=${line.color}`}>{product.name}</Link></h2><p><span className="color-dot" style={{ background: color.hex }} />{color.name}</p><div className="quantity-control" role="group" aria-label={`كمية ${product.name} ${color.name}`}><button aria-label={`تقليل كمية ${product.name} ${color.name}`} disabled={line.quantity <= 1} onClick={() => updateItem(line.productId, line.color, line.quantity - 1)}><Minus size={14} /></button><output>{line.quantity}</output><button aria-label={`زيادة كمية ${product.name} ${color.name}`} disabled={line.quantity >= Math.min(30, product.stock[line.color])} onClick={() => updateItem(line.productId, line.color, line.quantity + 1)}><Plus size={14} /></button></div></div><div className="cart-item-end"><strong>{money(product.price * line.quantity)}</strong><button className="remove-button" aria-label={`حذف ${product.name} ${color.name} من السلة`} onClick={() => removeItem(line.productId, line.color)}><Trash2 size={16} /> إزالة</button></div></article>;
  })}<Link href="/products" className="text-link">كمّلي تسوّق <ArrowLeft size={18} /></Link></div><aside className="order-summary"><h2>ملخص السلة</h2><div className="summary-row summary-total" aria-live="polite"><strong>إجمالي المنتجات</strong><strong>{money(subtotal)}</strong></div><Link className="button checkout-link" href="/checkout">إتمام الطلب <ArrowLeft size={18} /></Link><div className="checkout-preview"><strong>جرّبي رحلة الشراء</strong><p>راجعي اختياراتك وكمّلي بياناتك في الخطوة التالية. الطلب بيتسجل بعد الضغط على إرسال الطلب.</p></div></aside></div></>;
}
