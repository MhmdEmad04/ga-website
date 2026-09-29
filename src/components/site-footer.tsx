import Link from "next/link";
import Image from "next/image";
import { ArrowUpLeft, Banknote, MessageCircle, Palette } from "lucide-react";

export function ServiceStrip() {
  return <section className="service-strip container" aria-label="معلومات التسوق">
    <div><Palette strokeWidth={1.3} /><span><strong>اختاري لونك</strong><small>أسود، بيج، ولا جملي؟</small></span></div>
    <div><Banknote strokeWidth={1.3} /><span><strong>الدفع عند الاستلام</strong><small>تجربة شراء مريحة وبسيطة</small></span></div>
    <div><MessageCircle strokeWidth={1.3} /><span><strong>معاكي في كل اختيار</strong><small>تجربة بسيطة من أول تفصيلة</small></span></div>
  </section>;
}

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="footer-main container">
      <div className="footer-brand"><Image src="/images/brand/garbalia.png" alt="Garbalia" width={447} height={447} /><p>تفاصيل صغيرة، تحكي عنك كتير.</p></div>
      <div><h2>اكتشفي Garbalia</h2><Link href="/products">كل الشنط</Link><Link href="/products?category=شنط%20يد">شنط اليد</Link><Link href="/products?category=كروس%20بودي">كروس بودي</Link><Link href="/#our-story">عن البراند</Link></div>
      <div><h2>نساعدك تختاري</h2><Link href="/contact">تواصلي معانا</Link><Link href="/cart">سلة التسوق</Link><Link href="/products">اختاري شنطتك</Link></div>
      <div className="footer-note"><span className="eyebrow">MADE TO GO WITH YOU</span><h2>من أول مشوار،<br />لأحلى حكاية.</h2><Link href="/products" className="text-link">اختاري رفيقة يومك <ArrowUpLeft size={18} /></Link></div>
    </div>
    <div className="footer-bottom container"><span>© {new Date().getFullYear()} GARBALIA</span><span>صُنعت بحب، لتكون معك.</span><span>مصر · EGP</span></div>
    <div className="preview-notice">نسخة تجريبية محلية — المنتجات والصور مؤقتة، والطلبات تُحفظ للتجربة فقط.</div>
  </footer>;
}
