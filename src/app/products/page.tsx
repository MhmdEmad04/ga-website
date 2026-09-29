import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CatalogGrid } from "@/components/catalog-grid";

export const metadata: Metadata = { title: "تسوّقي الشنط" };
export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const query = await searchParams;
  return <div className="container page-space"><nav className="breadcrumbs" aria-label="مسار الصفحة"><Link href="/">الرئيسية</Link><span>/</span><span>كل الشنط</span></nav><header className="page-heading"><span className="eyebrow">FIND YOUR EVERYDAY</span><h1>شنطة لكل حكاية.</h1><p>من أول مشوار في يومك، لآخر خروجة. اختاري اللي تكمّلك.</p></header><Suspense fallback={<p className="loading-copy">بنجهّز لك التشكيلة…</p>}><CatalogGrid key={query.category ?? "all"} full /></Suspense></div>;
}
