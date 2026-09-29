"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { buyNowHref, colors, money, type ColorId, type Product } from "@/lib/catalog";
import { useCart } from "./cart-provider";
import { whatsappLink } from '@/lib/brand';

export function ProductDetail({ product, initialColor }: { product: Product; initialColor: ColorId }) {
  const [color, setColor] = useState<ColorId>(initialColor);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { addItem, lines, ready } = useCart();
  const inCart = lines.find((item) => item.productId === product.id && item.color === color)?.quantity ?? 0;
  const available = Math.max(0, Math.min(30, product.stock[color] - inCart));
  const selected = colors.find((item) => item.id === color)!;
  const boundedQuantity = Math.min(quantity, available);

  function add() {
    if (!ready || available < 1) return;
    addItem(product.id, color, boundedQuantity);
    setAdded(true);
    setQuantity(1);
  }

  return <>
    <div className="detail-grid">
      <div className="detail-gallery"><button className="detail-image" onClick={() => dialog.current?.showModal()} aria-label={`تكبير صورة شنطة ${product.name}`}><Image src={product.images[color]} alt={`شنطة ${product.name} باللون ${selected.name}`} fill priority sizes="(max-width: 760px) 100vw, 50vw" /><span>اضغطي لتكبير الصورة <Plus size={16} /></span></button><div className="variant-thumbnails" role="group" aria-label="صور ألوان المنتج">{colors.map((item) => <button type="button" key={item.id} aria-label={`عرض صورة اللون ${item.name}`} aria-pressed={color === item.id} onClick={() => { setColor(item.id); setQuantity(1); setAdded(false); }}><Image src={product.images[item.id]} alt={`شنطة ${product.name} ${item.name}`} width={96} height={96} /><span>{item.name}</span></button>)}</div><p className="image-disclaimer">صور مؤقتة مشتركة بين الموديلات لحين إضافة المنتجات الحقيقية.</p></div>
      <div className="detail-copy"><span className="eyebrow">GARBALIA / {product.id}</span><span className="product-category">{product.category}</span><h1>{product.name}</h1><p className="detail-subtitle">{product.subtitle}</p><p className="detail-price">{money(product.price)}</p><p className="detail-description">{product.description}</p>
        <fieldset className="detail-colors"><legend>اللون: <strong>{selected.name}</strong></legend>{colors.map((item) => <label key={item.id} className={`color-option ${item.id === color ? "selected" : ""}`}><input type="radio" name="product-color" value={item.id} checked={item.id === color} onChange={() => { setColor(item.id); setQuantity(1); setAdded(false); }} /><span className="color-dot" style={{ background: item.hex }} />{item.name}</label>)}</fieldset>
        <p className={`availability ${available ? "" : "unavailable"}`} aria-live="polite"><span />{available ? "متاح في كتالوج المعاينة" : product.stock[color] === 0 ? "اللون ده غير متاح حاليًا" : "كل الكمية المتاحة موجودة في سلتك"}</p>
        <div className="purchase-controls"><div className="quantity-control" role="group" aria-label="الكمية"><button type="button" aria-label="تقليل الكمية" disabled={quantity <= 1 || !available} onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></button><output aria-label="الكمية المختارة">{available ? boundedQuantity : 0}</output><button type="button" aria-label="زيادة الكمية" disabled={!available || quantity >= available} onClick={() => setQuantity(Math.min(available, quantity + 1))}><Plus size={16} /></button></div><button type="button" className="button add-button" onClick={add} disabled={!available || !ready}><ShoppingBag size={18} /> أضيفي للسلة</button></div>
        <button type="button" className="button buy-now-button" disabled={!available || !ready} onClick={() => router.push(buyNowHref(product.id, color, boundedQuantity))}>اشتري الآن <ArrowLeft size={18} /></button>
        <a className="text-link product-whatsapp" href={whatsappLink(`أهلًا Garbalia، عندي استفسار عن شنطة ${product.name} باللون ${selected.name}.`)} target="_blank" rel="noopener noreferrer">اسألي عن المنتج على واتساب</a>
        <div className="added-feedback" role="status">{added && <><Check size={17} /><span>اتضافت لسلتك</span><Link href="/cart">شاهدي السلة <ArrowLeft size={16} /></Link></>}</div>
        <details open><summary>تفاصيل تحبي تعرفيها</summary><ul className="product-features">{product.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></details><details><summary>تنسيق الألوان</summary><p>الأسود لإطلالة كلاسيكية، البيج لدرجات هادية، والجملي للمسة دافئة. اختاري اللون من الصور أو الدوائر عشان تشوفيه على نفس الموديل.</p></details>
      </div>
    </div>
    <dialog className="image-dialog" ref={dialog} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}><button autoFocus onClick={() => dialog.current?.close()} className="dialog-close">إغلاق <span aria-hidden="true">×</span></button><div className="zoomed-image"><Image src={product.images[color]} alt={`صورة مكبرة لشنطة ${product.name} باللون ${selected.name}`} fill sizes="90vw" /></div></dialog>
  </>;
}
