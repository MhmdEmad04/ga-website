"use client";
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Product } from '@/lib/catalog';
const CatalogContext=createContext<{products:Product[];categories:string[];getProduct:(id:string)=>Product|undefined}|null>(null);
export function CatalogProvider({products: initialProducts,categories: initialCategories,children}:{products:Product[];categories:string[];children:React.ReactNode}) {
  const [catalog,setCatalog]=useState({products:initialProducts,categories:initialCategories});
  const pathname=usePathname();
  useEffect(()=>{const controller=new AbortController();fetch('/api/catalog',{cache:'no-store',signal:controller.signal}).then((response)=>{if(!response.ok)throw new Error('Catalog unavailable');return response.json();}).then(setCatalog).catch(()=>{});return()=>controller.abort();},[pathname,initialProducts,initialCategories]);
  const {products,categories}=catalog;
  const getProduct=useCallback((id:string)=>products.find((p)=>p.id===id),[products]);
  return <CatalogContext.Provider value={{products,categories:['الكل',...categories],getProduct}}>{children}</CatalogContext.Provider>;
}
export function useCatalog() { const value=useContext(CatalogContext); if(!value) throw new Error('CatalogProvider required'); return value; }
