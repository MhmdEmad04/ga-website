import { CategoryForm } from '@/components/admin-controls';
import { listCategories } from '@/lib/server/store';
import { pageAdmin } from '@/lib/server/http';
export default async function Page(){await pageAdmin();const categories=await listCategories();return <><h2>التصنيفات</h2><div className="admin-panel"><ul className="admin-category-list">{categories.map((category)=><li key={category.name}>{category.name}{category.parent_name&&<small>ضمن {category.parent_name}</small>}</li>)}</ul></div><h2>إضافة تصنيف</h2><CategoryForm categories={categories.map((c)=>c.name)}/></>;}
