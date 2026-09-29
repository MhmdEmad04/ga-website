"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { colors, money, priceFormat, type Category } from "@/lib/catalog";
import { useCatalog } from './catalog-provider';
import { ProductCard } from "./product-card";

export function CatalogGrid({ full = false }: { full?: boolean }) {
  const {products,categories}=useCatalog();
  const priceCeiling=Math.max(600,...products.map((product)=>product.price));
  const params = useSearchParams();
  const requestedCategory = params.get("category");
  const initialCategory = categories.find((category) => category === requestedCategory) ?? "الكل";
  const [category, setCategory] = useState<Category>(initialCategory);
  const [query, setQuery] = useState("");
  const [color, setColor] = useState("all");
  const [maxPrice, setMaxPrice] = useState(priceCeiling);
  const [sort, setSort] = useState("default");
  const [showFilters, setShowFilters] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => { if (params.get("search")) searchInput.current?.focus(); }, [params]);
  const normalized = query.trim().normalize("NFKC").replace(/[\u064B-\u065F\u0670]/g, "");
  const visible = products.filter((product) => (category === "الكل" || product.category === category) && `${product.name} ${product.category}`.includes(normalized) && product.price <= maxPrice && (color === "all" || product.stock[color as keyof typeof product.stock] > 0))
    .sort((a, b) => sort === "price-up" ? a.price - b.price : sort === "price-down" ? b.price - a.price : a.id.localeCompare(b.id));
  function reset() { setCategory("الكل"); setQuery(""); setColor("all"); setMaxPrice(priceCeiling); setSort("default"); }

  return <div className="catalog">
    <div className="catalog-toolbar">
      <div className="category-tabs" role="group" aria-label="نوع الشنطة">{categories.map((item) => <button type="button" key={item} className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
      {full && <button type="button" className={`filter-toggle ${showFilters ? "active" : ""}`} onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} aria-controls="catalog-filters"><SlidersHorizontal size={17} /> الفلترة</button>}
    </div>
    {full && <>
      <div className="search-sort"><label className="search-field"><Search size={19} /><span className="sr-only">ابحثي عن شنطة</span><input ref={searchInput} type="search" placeholder="بتدوري على شنطة معينة؟" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label className="sort-field"><span>الترتيب</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="default">اختيارات Garbalia</option><option value="price-up">السعر: الأقل أولًا</option><option value="price-down">السعر: الأعلى أولًا</option></select></label></div>
      {showFilters && <div id="catalog-filters" className="filter-panel"><label>اللون<select value={color} onChange={(event) => setColor(event.target.value)}><option value="all">كل الألوان</option>{colors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="price-filter">السعر حتى {money(maxPrice)}<input type="range" min={0} max={priceCeiling} step={10} value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} /></label><button type="button" className="text-link" onClick={reset}><X size={16} /> مسح الفلاتر</button></div>}
      <p className="result-count" role="status">{priceFormat.format(visible.length)} من {priceFormat.format(products.length)} منتجات</p>
    </>}
    {visible.length ? <div className="product-grid">{visible.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div> : <div className="empty-state"><Search size={35} strokeWidth={1} /><h2>لسه ملقيناش الشنطة دي</h2><p>جرّبي كلمة تانية أو وسّعي اختيارات الفلترة.</p><button type="button" className="button" onClick={reset}>عرض كل الشنط</button></div>}
  </div>;
}
