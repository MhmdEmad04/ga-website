"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./cart-provider";
import { priceFormat } from "@/lib/catalog";

export function SiteHeader() {
  const pathname = usePathname();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) { setOpen(false); menuButton.current?.focus(); }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const closeMenu = () => setOpen(false);
  return <>
    <div className="announcement">تفاصيل تشبهك، أينما كنتِ <span aria-hidden="true">✦</span> GARBALIA — صُنعت بحب</div>
    <header className="site-header">
      <div className="header-inner container">
        <nav className="desktop-nav" aria-label="القائمة الرئيسية">
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>الرئيسية</Link>
          <Link href="/products" aria-current={pathname.startsWith("/products") ? "page" : undefined}>الشنط</Link>
          <Link href="/#our-story">عن Garbalia</Link>
        </nav>
        <button className="icon-button mobile-menu-toggle" ref={menuButton} aria-label={open ? "إغلاق القائمة" : "فتح القائمة"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        <Link href="/" aria-label="Garbalia — الرئيسية" className="brand" onClick={closeMenu}>
          <Image src="/images/brand/garbalia.png" alt="GARBALIA — Handcrafted with love" width={447} height={447} priority />
        </Link>
        <div className="header-actions">
          <Link href="/products?search=1" className="icon-button search-link" aria-label="البحث عن شنطة"><Search size={21} /></Link>
          <Link href="/cart" className="cart-link" aria-label={`سلة التسوق، ${count} قطع`} onClick={closeMenu}><ShoppingBag size={21} /><span className="cart-label">السلة</span><span className="cart-count" aria-hidden="true">{priceFormat.format(count)}</span></Link>
        </div>
      </div>
      {open && <nav id="mobile-navigation" className="mobile-navigation" aria-label="قائمة الموبايل"><Link href="/" onClick={closeMenu}>الرئيسية</Link><Link href="/products" onClick={closeMenu}>تسوّقي الشنط</Link><Link href="/#our-story" onClick={closeMenu}>عن Garbalia</Link><Link href="/contact" onClick={closeMenu}>تواصلي معانا</Link></nav>}
    </header>
  </>;
}
