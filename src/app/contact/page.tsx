import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { brand,whatsappLink } from '@/lib/brand';

export const metadata: Metadata = { title: "تواصلي معانا" };
export default function ContactPage() {
  return <div className="container information-page page-space"><span className="eyebrow">A CONVERSATION AWAY</span><h1>معاكي في كل اختيار.</h1><p className="lead">عندك سؤال عن شنطة أو لون؟ كلمينا على واتساب.</p><div className="information-block"><MessageCircle size={32} strokeWidth={1.3} /><div><h2>واتساب Garbalia</h2><p dir="ltr">{brand.phone}</p><a className="button" href={whatsappLink('أهلًا Garbalia، عندي استفسار عن المنتجات.')} target="_blank" rel="noopener noreferrer">تواصلي على واتساب</a></div></div><Link href="/products" className="text-link">اكتشفي الشنط <ArrowLeft size={18} /></Link></div>;
}
