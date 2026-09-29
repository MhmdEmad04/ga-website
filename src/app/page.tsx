import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowDown, ArrowLeft, ArrowUpLeft } from "lucide-react";
import { CatalogGrid } from "@/components/catalog-grid";
import { ServiceStrip } from "@/components/site-footer";
import { listProducts } from "@/lib/server/store";

export default async function Home() {
  const products=await listProducts();
  return <>
    <section className="hero">
      <div className="hero-copy"><span className="eyebrow"><span className="little-line" /> GARBALIA COLLECTION</span><h1>لكل يوم،<br />حكاية <span>شنطة.</span></h1><p>في تفاصيل صغيرة بتكمّل إطلالتك.<br />اختاري الشنطة اللي تشبهك، وتروح معاكي كل حتة.</p><Link href="/products" className="button hero-button">تسوّقي الشنط <ArrowLeft size={20} /></Link><div className="hero-footnote"><span>بسيطة. مميزة. تشبهك.</span><a href="#collection" aria-label="اكتشفي التشكيلة"><ArrowDown size={19} /></a></div></div>
      <div className="hero-visual"><Image src="/images/products/garbalia-07.jpg" alt="إطلالة بألوان هادئة وشنطة سوداء صغيرة — صورة مرجعية" fill priority sizes="(max-width: 760px) 100vw, 55vw" /><span className="hero-image-label" dir="ltr">EVERYDAY, BEAUTIFULLY.</span><span className="hero-index" dir="ltr">01 / 08</span></div>
    </section>
    <ServiceStrip />
    <section className="category-showcase container" aria-label="تسوّقي حسب النوع"><div className="section-heading"><div><span className="eyebrow">YOUR STYLE, YOUR WAY</span><h2>لكل ستايل، اختيار.</h2></div></div><div className="category-tiles">{[{ title: "شنط اليد", category: "شنط يد", product: products[0] }, { title: "كروس بودي", category: "كروس بودي", product: products[1] }, { title: "شنط الكتف", category: "شنط كتف", product: products[3] }, { title: "الكلاتش", category: "كلاتش", product: products[2] }].filter((item)=>item.product).map((item) => <Link className="category-tile" key={item.category} href={`/products?category=${encodeURIComponent(item.category)}`}><Image src={item.product.images.beige} alt="" fill sizes="(max-width: 760px) 45vw, 23vw" /><div><h3>{item.title}</h3><span>اكتشفي المجموعة <ArrowUpLeft size={16} /></span></div></Link>)}</div></section>
    <section className="collection-section container" id="collection"><div className="section-heading"><div><span className="eyebrow">THE EVERYDAY EDIT</span><h2>اختاري اللي تشبهك<span className="heading-dot">.</span></h2></div><Link href="/products" className="text-link">شاهدي كل الشنط <ArrowUpLeft size={19} /></Link></div><Suspense fallback={<p className="loading-copy">بنجهّز لك التشكيلة…</p>}><CatalogGrid /></Suspense></section>
    <section className="story-section" id="our-story"><div className="story-image"><Image src="/images/products/garbalia-08.jpg" alt="تفاصيل شنط في مشهد تصوير بألوان دافئة" fill sizes="(max-width: 760px) 100vw, 50vw" /></div><div className="story-copy"><span className="eyebrow">A LITTLE ABOUT US</span><h2>مش بس شنطة،<br />تفصيلة منك.</h2><p>بنحب القطع اللي ليها حضور هادي، واللي تكمّل يومك من غير مجهود. في Garbalia، كل اختيار بيبدأ بفكرة بسيطة: أناقتك تكون بطريقتك.</p><span className="story-signature" dir="ltr">Handcrafted with love.</span><Link href="/products" className="text-link">اكتشفي التشكيلة <ArrowUpLeft size={19} /></Link></div></section>
    <section className="closing-note container"><span aria-hidden="true">✦</span><p>مشاوير كتير. حكايات أكتر. <strong>وشنطة تشبهك.</strong></p></section>
  </>;
}
