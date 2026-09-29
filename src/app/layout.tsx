import type { Metadata } from "next";
import "@fontsource-variable/cairo";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CatalogProvider } from '@/components/catalog-provider';
import { listProducts, listCategories } from '@/lib/server/store';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: "Garbalia | تفاصيل تشبهك", template: "%s | Garbalia" },
  description: "اكتشفي تشكيلة Garbalia من الشنط الحريمي. تصاميم تشبهك بالأسود والبيج والجملي، لكل يوم وكل حكاية.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [products,categories]=await Promise.all([listProducts(),listCategories()]);
  return <html lang="ar" dir="rtl"><body><a className="skip-link" href="#main-content">انتقلي إلى المحتوى</a><CatalogProvider products={products} categories={categories.map((category)=>category.name)}><CartProvider><SiteHeader /><main id="main-content">{children}</main><SiteFooter /></CartProvider></CatalogProvider></body></html>;
}
