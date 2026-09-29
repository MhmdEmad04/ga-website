import { after,NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin,readJson,failure } from '@/lib/server/http';
import { parse,StoreError } from '@/lib/server/validation';
import { getDatabase } from '@/lib/server/database';
import { configuredTransports,processOrderNotifications } from '@/lib/server/notifications';
export async function POST(request:NextRequest){try{
  await requireAdmin(request);
  const input=parse(z.object({orderId:z.uuid(),channel:z.enum(['telegram','whatsapp'])}).strict(),await readJson(request));
  const transport=configuredTransports().find((item)=>item.channel===input.channel);
  if(!transport)throw new StoreError('أكمل إعدادات قناة الإشعارات أولًا.');
  const result=await(await getDatabase()).query("UPDATE garbalia.order_notifications SET status='pending',attempts=0,next_attempt_at=now(),last_error=NULL WHERE order_id=$1 AND channel=$2 AND status='failed' AND (destination IS NULL OR destination=$3) RETURNING order_id",[input.orderId,input.channel,transport.destination]);
  if(!result.rows.length)throw new StoreError('إعادة المحاولة متاحة للإشعارات المتعذرة على نفس المحادثة فقط.',409);
  after(async()=>{try{await processOrderNotifications([transport],input.orderId);}catch{console.error('Notification retry remains queued.');}});
  return NextResponse.json({ok:true});
}catch(error){return failure(error);}}
