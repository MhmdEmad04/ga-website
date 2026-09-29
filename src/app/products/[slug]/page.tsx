import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product-detail";
import { ProductCard } from "@/components/product-card";
import { colors } from "@/lib/catalog";
import { listProducts } from "@/lib/server/store";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ color?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const products=await listProducts();
  const product = products.find((item) => item.slug === slug);
  return { title: product ? `شنطة ${product.name}` : "المنتج غير موجود" };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const products=await listProducts();
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();
  const initialColor = colors.find((color) => color.id === query.color)?.id ?? product.defaultColor;
  const related = products.filter((item) => item.id !== product.id).slice(0, 4);
  return <div className="container page-space"><nav className="breadcrumbs" aria-label="مسار الصفحة"><Link href="/">الرئيسية</Link><span>/</span><Link href="/products">كل الشنط</Link><span>/</span><span>{product.name}</span></nav><ProductDetail key={`${product.id}-${initialColor}`} product={product} initialColor={initialColor} /><section className="related-products"><div className="section-heading"><div><span className="eyebrow">MORE TO LOVE</span><h2>وممكن يعجبك كمان.</h2></div></div><div className="product-grid">{related.map((item, index) => <ProductCard key={item.id} product={item} index={index} />)}</div></section></div>;
}
