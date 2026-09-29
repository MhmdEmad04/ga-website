import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Checkout } from "@/components/checkout";
import { colors, type CartLine } from "@/lib/catalog";
import { listProducts } from "@/lib/server/store";

export const metadata: Metadata = { title: "إتمام الطلب" };
type Query = { product?: string | string[]; color?: string | string[]; quantity?: string | string[] };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  let directItem: CartLine | null = null;
  if (query.product !== undefined || query.color !== undefined || query.quantity !== undefined) {
    if (typeof query.product !== "string" || typeof query.color !== "string" || typeof query.quantity !== "string" || !/^\d{1,2}$/.test(query.quantity)) notFound();
    const product = (await listProducts()).find((item)=>item.id===query.product);
    const color = colors.find((item) => item.id === query.color);
    const quantity = Number(query.quantity);
    if (!product || !color || quantity < 1 || quantity > product.stock[color.id]) notFound();
    directItem = { productId: product.id, color: color.id, quantity };
  }
  return <Checkout key={directItem ? `${directItem.productId}-${directItem.color}-${directItem.quantity}` : "cart"} directItem={directItem} />;
}
