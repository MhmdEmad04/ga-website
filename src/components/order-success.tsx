"use client";
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { money } from '@/lib/catalog';
import type { Receipt } from '@/lib/server/store';
import {whatsappLink} from '@/lib/brand';
export function OrderSuccess({receipt: initial}: {receipt?: Receipt}) {
  const [receipt,setReceipt]=useState<Receipt|null>(initial || null);
  const [ready,setReady]=useState(Boolean(initial));
  useEffect(()=>{if(initial)return;const timer=setTimeout(()=>{try{const saved=JSON.parse(sessionStorage.getItem('garbalia-last-receipt') || 'null');if(saved && typeof saved.number==='string' && Number.isFinite(saved.total))setReceipt(saved);}catch{}setReady(true);},0);return()=>clearTimeout(timer);},[initial]);
  if(!ready)return <p className="loading-copy">بنجهّز ملخص الطلب…</p>;
  return <section className="container information-page order-success"><CheckCircle2 size={48} strokeWidth={1.2}/><span className="eyebrow">THANK YOU FOR CHOOSING GARBALIA</span><h1>{receipt?(receipt.status==='cancelled'?'الطلب اتلغى.':'استلمنا طلبك.'):'راجعي تفاصيل طلبك.'}</h1>{receipt?<><p>رقم الطلب <strong dir="ltr">{receipt.number}</strong></p><p>{receipt.status==='cancelled'?'الطلب ده ملغي. تقدري ترجعي للمنتجات وتعملي طلب جديد.':'اتسجّل طلبك بانتظار التأكيد اليدوي عبر واتساب. الطلب غير المؤكد بيتلغى تلقائيًا بعد ٢٤ ساعة. الدفع عند الاستلام.'}</p><div className="order-summary"><div className="summary-row"><span>إجمالي المنتجات</span><strong>{money(receipt.subtotal)}</strong></div><div className="summary-row summary-total"><span>إجمالي الطلب</span><strong>{money(receipt.total)}</strong></div></div><p>احتفظي برقم الطلب للمتابعة. لم يتم تحصيل أي مبلغ إلكترونيًا.</p><a className="text-link" href={whatsappLink(`أهلًا Garbalia، بخصوص طلبي رقم ${receipt.number}.`)} target="_blank" rel="noopener noreferrer">تواصلي بخصوص الطلب</a></>:<p>ملخص آخر طلب يظهر في نفس جلسة المتصفح بعد تسجيله بنجاح. للتواصل بشأن طلب سابق استخدمي رقم الطلب المحفوظ عندك.</p>}<Link href="/products" className="button">الرجوع للمنتجات</Link></section>;
}
