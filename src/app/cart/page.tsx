import type { Metadata } from "next";
import Link from "next/link";
import { CartPage } from "@/components/cart-page";

export const metadata: Metadata = { title: "سلة التسوق" };
export default function Page() { return <div className="container page-space"><nav className="breadcrumbs" aria-label="مسار الصفحة"><Link href="/">الرئيسية</Link><span>/</span><span>السلة</span></nav><CartPage /></div>; }
