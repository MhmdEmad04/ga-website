import Link from 'next/link';
import Image from 'next/image';
import { listProducts } from '@/lib/server/store';
import { pageAdmin } from '@/lib/server/http';
import { money } from '@/lib/catalog';
export default async function Page(){await pageAdmin();const products=await listProducts(true);return <><header className="admin-section-heading"><h2>المنتجات والمخزون</h2><Link className="button" href="/admin/products/new">إضافة منتج</Link></header><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>المنتج</th><th>التصنيف</th><th>السعر</th><th>أسود</th><th>بيج</th><th>جملي</th><th>الحالة</th><th>تعديل</th></tr></thead><tbody>{products.map((p)=><tr key={p.id}><td><div className="admin-product-name"><Image src={p.images[p.defaultColor]} width={55} height={55} alt=""/>{p.name}</div></td><td>{p.category}</td><td>{money(p.price)}</td><td>{p.stock.black}</td><td>{p.stock.beige}</td><td>{p.stock.camel}</td><td>{p.active?'ظاهر':'مخفي'}</td><td><Link className="text-link" href={`/admin/products/${p.id}`}>تعديل {p.name}</Link></td></tr>)}</tbody></table></div></>;}
