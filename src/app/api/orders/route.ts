import { after,NextResponse } from 'next/server';
import { processOrderNotifications } from '@/lib/server/notifications';
import { createOrder } from '@/lib/server/store';
import { clientAddress, failure, readJson, sameOrigin } from '@/lib/server/http';
import { rateLimit } from '@/lib/server/auth';
import { orderSchema, parse } from '@/lib/server/validation';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await rateLimit(`orders-ip:${clientAddress(request)}`,60,600);
    const input = parse(orderSchema,await readJson(request));
    await rateLimit(`orders-phone:${input.customer.phone}`,15,600);
    const receipt=await createOrder(input);
    after(async()=>{try{await processOrderNotifications();}catch{console.error('Order notifications will retry in the background.');}});
    return NextResponse.json(receipt,{status:201,headers:{'Cache-Control':'no-store'}});
  } catch (error) { return failure(error); }
}
