import { NextResponse } from 'next/server';
import { listProducts,listCategories } from '@/lib/server/store';
export async function GET(){const [products,categories]=await Promise.all([listProducts(),listCategories()]);return NextResponse.json({products,categories:categories.map((c)=>c.name)},{headers:{'Cache-Control':'no-store'}});}
