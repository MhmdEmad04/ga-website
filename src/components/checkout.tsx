"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Banknote, Check, Pencil, ShoppingBag, Truck } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { useCart } from "./cart-provider";
import { colors, governorates, money, priceFormat, shippingFor, type CartLine } from "@/lib/catalog";
import { useCatalog } from './catalog-provider';
import { useRouter } from 'next/navigation';
import type { Receipt } from '@/lib/server/store';
import { OrderSuccess } from './order-success';

type Customer = { name: string; phone: string; governorate: string; city: string; address: string; notes: string };
const initialCustomer: Customer = { name: "", phone: "", governorate: "", city: "", address: "", notes: "" };

export function Checkout({ directItem }: { directItem: CartLine | null }) {
  const {getProduct}=useCatalog();
  const router=useRouter();
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState('');
  const [completed,setCompleted]=useState<Receipt|null>(null);
  const attempt=useRef<{key:string;fingerprint:string}|null>(null);
  const cart = useCart();
  const lines = directItem ? (getProduct(directItem.productId)?[directItem]:[]) : cart.lines;
  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const [reviewing, setReviewing] = useState(false);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const formHeading = useRef<HTMLHeadingElement>(null);
  const subtotal = lines.reduce((total, item) => total + getProduct(item.productId)!.price * item.quantity, 0);
  const shipping = shippingFor(customer.governorate);

  async function submitOrder() {
    if(submitting || shipping===null)return;
    setSubmitting(true);setError('');
    try {
      const body={customer,lines,expectedTotal:subtotal+shipping};
      const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(body)));
      const fingerprint=Array.from(new Uint8Array(hash)).map((value)=>value.toString(16).padStart(2,'0')).join('');
      if(!attempt.current)try{attempt.current=JSON.parse(sessionStorage.getItem('garbalia-order-attempt') || 'null');}catch{}
      if(attempt.current?.fingerprint!==fingerprint)attempt.current={key:crypto.randomUUID(),fingerprint};
      try{sessionStorage.setItem('garbalia-order-attempt',JSON.stringify(attempt.current));}catch{}
      const response=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,idempotencyKey:attempt.current.key})});
      const result=await response.json();
      if(!response.ok){setError(result.error || 'تعذّر تسجيل الطلب.');if(response.status===409)router.refresh();return;}
      if(!directItem&&result.status!=='cancelled')cart.consume(lines);
      setCompleted(result);
      try{sessionStorage.setItem('garbalia-last-receipt',JSON.stringify(result));sessionStorage.removeItem('garbalia-order-attempt');}catch{}
      attempt.current=null;
      router.push('/order-success');
    }catch{setError('الاتصال اتقطع قبل استلام التأكيد. اضغطي إرسال الطلب مرة تانية بنفس البيانات؛ مش هنسجّل طلبًا مكررًا.');}
    finally{setSubmitting(false);}
  }

  function update(field: keyof Customer, value: string) {
    setCustomer((previous) => ({ ...previous, [field]: value }));
    setReviewing(false);
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (shipping === null) return;
    setReviewing(true);
    requestAnimationFrame(() => { reviewHeading.current?.focus(); reviewHeading.current?.scrollIntoView({ block: "center", behavior: "smooth" }); });
  }

  if(completed)return <OrderSuccess receipt={completed}/>;
  if (!directItem && !cart.ready) return <p className="loading-copy" role="status">بنجهّز اختياراتك…</p>;
  if (!lines.length) return <div className="empty-state container page-space"><ShoppingBag size={45} strokeWidth={1} /><h1>اختاري شنطتك الأول.</h1><p>ضيفي منتج للسلة أو اضغطي «اشتري الآن» على الشنطة اللي عجبتك.</p><Link className="button" href="/products">تسوّقي الشنط <ArrowLeft size={18} /></Link></div>;

  return <div className="container page-space checkout-page">
    <nav className="breadcrumbs" aria-label="مسار الصفحة"><Link href="/">الرئيسية</Link><span>/</span><Link href={directItem ? `/products/${getProduct(directItem.productId)!.slug}?color=${directItem.color}` : "/cart"}>{directItem ? "تفاصيل المنتج" : "السلة"}</Link><span>/</span><span>إتمام الطلب</span></nav>
    <header className="page-heading"><span className="eyebrow">A LITTLE CLOSER TO YOURS</span><h1>فاضل تفاصيل بسيطة.</h1><p>{directItem ? "شراء مباشر لاختيارك، من غير ما نغيّر محتويات سلتك." : "راجعي اختياراتك وكمّلي بياناتك، من غير إنشاء حساب."}</p></header>
    <ol className="checkout-steps" aria-label="خطوات الطلب"><li className="complete"><Check size={15} /> اختياراتك</li><li className={!reviewing ? "current" : "complete"} aria-current={!reviewing ? "step" : undefined}><span>٢</span> البيانات والدفع</li><li className={reviewing ? "current" : ""} aria-current={reviewing ? "step" : undefined}><span>٣</span> مراجعة الطلب</li></ol>
    <div className="checkout-layout">
      <section className="checkout-form-section" aria-label="بيانات الطلب">
        {reviewing ? <div className="customer-review"><h2 ref={reviewHeading} tabIndex={-1}>راجعي تفاصيلك</h2><p className="review-intro">راجعي بياناتك والإجمالي، وبعدها اضغطي إرسال الطلب.</p><dl><div><dt>الاسم</dt><dd>{customer.name}</dd></div><div><dt>رقم الموبايل</dt><dd dir="ltr">{customer.phone}</dd></div><div><dt>العنوان</dt><dd>{customer.governorate}، {customer.city}، {customer.address}</dd></div>{customer.notes && <div><dt>ملاحظاتك</dt><dd>{customer.notes}</dd></div>}<div><dt>طريقة الدفع</dt><dd>الدفع عند الاستلام</dd></div></dl><button type="button" disabled={submitting} className="text-link" onClick={() => { setReviewing(false); requestAnimationFrame(() => formHeading.current?.focus()); }}><Pencil size={16} /> تعديل البيانات</button><p className="form-message" role="alert">{error}</p><button className="button review-button" type="button" disabled={submitting} onClick={submitOrder}>{submitting?"جاري تسجيل الطلب…":"إرسال الطلب"}</button><p className="form-intro">الطلب بيتسجل بانتظار التأكيد اليدوي. لو ما اتأكدش خلال ٢٤ ساعة بيتلغى تلقائيًا، والدفع عند الاستلام.</p></div> : <form onSubmit={review}>
          <h2 ref={formHeading} tabIndex={-1}>بياناتك وعنوانك</h2><p className="form-intro">كل الحقول مطلوبة ما عدا الملاحظات.</p>
          <div className="checkout-fields"><label>الاسم بالكامل<input name="name" autoComplete="name" required minLength={2} maxLength={100} value={customer.name} onChange={(event) => update("name", event.target.value)} placeholder="اكتبي اسمك" /></label><label>رقم الموبايل<input name="phone" type="tel" autoComplete="tel" inputMode="tel" required minLength={10} maxLength={18} pattern="[0٠][1١][0٠1١2٢5٥][0-9٠-٩]{8}" value={customer.phone} onChange={(event) => update("phone", event.target.value)} placeholder="01xxxxxxxxx" /></label><label>المحافظة<select name="governorate" autoComplete="address-level1" required value={customer.governorate} onChange={(event) => update("governorate", event.target.value)}><option value="">اختاري المحافظة</option>{governorates.map((name) => <option key={name}>{name}</option>)}</select></label><label>المدينة أو المنطقة<input name="city" autoComplete="address-level2" required minLength={2} maxLength={100} value={customer.city} onChange={(event) => update("city", event.target.value)} placeholder="اسم المدينة أو المنطقة" /></label><label className="full-width">العنوان بالتفصيل<textarea name="address" autoComplete="street-address" required minLength={5} maxLength={400} rows={3} value={customer.address} onChange={(event) => update("address", event.target.value)} placeholder="الشارع، رقم العمارة، الدور والشقة" /></label><label className="full-width">ملاحظات إضافية <span className="optional">(اختياري)</span><textarea name="notes" maxLength={500} rows={2} value={customer.notes} onChange={(event) => update("notes", event.target.value)} placeholder="أي تفاصيل تحبي تضيفيها" /></label></div>
          <fieldset className="payment-method"><legend>طريقة الدفع</legend><label><input type="radio" name="payment" value="cod" defaultChecked /><Banknote size={25} strokeWidth={1.3} /><span><strong>الدفع عند الاستلام</strong><small>تأكيد الطلب يدويًا عبر واتساب قبل الشحن.</small></span></label></fieldset>
          <p className="form-intro">هنستخدم بياناتك لتجهيز الطلب والتواصل معاكي لتأكيده.</p><button type="submit" className="button review-button">مراجعة الطلب <ArrowLeft size={18} /></button>
        </form>}
      </section>
      <aside className="order-summary checkout-summary"><h2>ملخص طلبك <span>({priceFormat.format(lines.reduce((total, line) => total + line.quantity, 0))})</span></h2><div className="checkout-items">{lines.map((line) => {
        const product = getProduct(line.productId)!;
        const color = colors.find((item) => item.id === line.color)!;
        return <article className="checkout-item" key={`${line.productId}-${line.color}`}><div className="checkout-item-image"><Image src={product.images[line.color]} alt={`شنطة ${product.name} باللون ${color.name}`} fill sizes="80px" /><span>{priceFormat.format(line.quantity)}</span></div><div><h3>{product.name}</h3><p>{color.name} · الكمية {priceFormat.format(line.quantity)}</p></div><strong>{money(product.price * line.quantity)}</strong></article>;
      })}</div><div className="summary-row"><span>إجمالي المنتجات</span><strong>{money(subtotal)}</strong></div><div className="summary-row shipping-row"><span><Truck size={16} /> الشحن</span><strong>{shipping === null ? "اختاري المحافظة" : money(shipping)}</strong></div><p className="summary-shipping-note">٨٠ ج.م للقاهرة والجيزة، و١٢٠ ج.م لباقي المحافظات. تكلفة واحدة للطلب مهما كانت الكمية.</p><div className="summary-row summary-total" aria-live="polite"><strong>{shipping === null ? "إجمالي المنتجات" : "الإجمالي شامل الشحن"}</strong><strong>{money(subtotal + (shipping ?? 0))}</strong></div>{shipping === null && <p className="total-pending">الإجمالي النهائي هيظهر بعد اختيار المحافظة.</p>}</aside>
    </div>
  </div>;
}
