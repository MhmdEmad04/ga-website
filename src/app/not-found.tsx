import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() { return <div className="empty-state container page-space"><span className="eyebrow">404 / A LITTLE DETOUR</span><h1>الصفحة دي مش موجودة.</h1><p>بس لسه في اختيارات حلوة مستنياكي.</p><Link href="/products" className="button">ارجعي للتشكيلة <ArrowLeft size={18} /></Link></div>; }
