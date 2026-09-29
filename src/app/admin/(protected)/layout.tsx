import Link from 'next/link';
import { pageAdmin } from '@/lib/server/http';
import { AdminLogout } from '@/components/admin-controls';
export default async function Layout({children}:{children:React.ReactNode}){const admin=await pageAdmin();return <div className="container page-space admin-shell"><header className="admin-header"><div><span className="eyebrow">GARBALIA / STORE MANAGER</span><h1>لوحة التحكم</h1><small dir="ltr">{admin.email}</small></div><AdminLogout/></header><nav className="admin-nav" aria-label="إدارة المتجر"><Link href="/admin">الطلبات</Link><Link href="/admin/products">المنتجات والمخزون</Link><Link href="/admin/categories">التصنيفات</Link><Link href="/">فتح المتجر</Link></nav>{children}</div>;}
