import { randomUUID } from 'node:crypto';
import { notFound } from 'next/navigation';
import { ProductEditor } from '@/components/admin-controls';
import { listProducts,listCategories,type StoredProduct } from '@/lib/server/store';
import { pageAdmin } from '@/lib/server/http';
export default async function Page({params}:{params:Promise<{id:string}>}){await pageAdmin();const {id}=await params;const [products,categories]=await Promise.all([listProducts(true),listCategories()]);const product:StoredProduct|undefined=id==='new'?{id:randomUUID(),slug:'',name:'',subtitle:'',description:'',features:[],category:categories[0]?.name||'',price:550,defaultColor:'beige',active:false,version:0,stock:{black:30,beige:30,camel:30},images:{black:'/images/products/variants/laila-black.png',beige:'/images/products/variants/laila-beige.png',camel:'/images/products/variants/laila-camel.png'}}:products.find((p)=>p.id===id);if(!product)notFound();return <><h2>{id==='new'?'إضافة منتج جديد':`تعديل ${product.name}`}</h2><ProductEditor key={`${product.id}-${product.version}`} product={product} categories={categories.map((c)=>c.name)}/></>;}
