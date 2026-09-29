import { randomUUID } from 'node:crypto';
import { getDatabase,type Queryable } from './database';
import { colors,money } from '../catalog';
import type { OrderItem,OrderRow } from './store';

export type NotificationChannel='telegram'|'whatsapp';
export type NotificationRow={order_id:string;channel:NotificationChannel;status:'pending'|'sending'|'sent'|'failed';attempts:number;last_error:string|null;sent_at:string|null;next_attempt_at:string};
export type NotificationOrder=OrderRow&{items:OrderItem[]};
export interface NotificationTransport {channel:NotificationChannel;destination:string;send(order:NotificationOrder):Promise<string>}
class DeliveryError extends Error {constructor(message:string,public retryAfter=0){super(message);}}
export function notificationChannels():NotificationChannel[]{
  const configured=process.env.ORDER_NOTIFICATION_CHANNELS ?? 'telegram';
  return [...new Set(configured.split(',').map((value)=>value.trim()).filter((value):value is NotificationChannel=>value==='telegram'||value==='whatsapp'))];
}
export async function enqueueOrderNotifications(tx:Queryable,orderId:string){
  for(const channel of notificationChannels())await tx.query('INSERT INTO garbalia.order_notifications (order_id,channel) VALUES ($1,$2) ON CONFLICT DO NOTHING',[orderId,channel]);
}
const clean=(value:string,max=300)=>value.replace(/[\r\n\t]+/g,' ').slice(0,max);
export function telegramOrderText(order:NotificationOrder){
  const status={pending:'بانتظار التأكيد',preparing:'قيد التجهيز',shipped:'تم الشحن',delivered:'تم التسليم',cancelled:'ملغي'};
  const header=[`طلب Garbalia — ${order.number}`,`تاريخ التسجيل: ${new Date(order.created_at).toLocaleString('ar-EG',{timeZone:'Africa/Cairo'})}`,`الحالة وقت إرسال الإشعار: ${status[order.status]}`,`الاسم: ${clean(order.customer.name,100)}`,`الموبايل: ${order.customer.phone}`,`العنوان: ${order.customer.governorate}، ${clean(order.customer.city,100)}، ${clean(order.customer.address,400)}`];
  if(order.customer.notes)header.push(`ملاحظات: ${clean(order.customer.notes,300)}`);
  const lines=order.items.map((item)=>`• ${clean(item.name,70)} | ${colors.find((c)=>c.id===item.color)?.name} × ${item.quantity} | ${money(item.unit_price*item.quantity)}`);
  const footer=[`المنتجات: ${money(order.subtotal)}`,`الشحن: ${money(order.shipping)}`,`الإجمالي: ${money(order.total)}`,'الدفع عند الاستلام. التأكيد يدوي.'];
  const origin=process.env.APP_URL || 'http://127.0.0.1:3000';
  if(/^https:\/\//.test(origin))footer.push(`الإدارة: ${origin.replace(/\/$/,'')}/admin/orders/${order.id}`);
  else footer.push('افتح لوحة الإدارة على جهاز المتجر لتفاصيل الطلب.');
  let body=header.join('\n')+'\n\n';let included=0;
  for(const line of lines){if((body+line+'\n'+footer.join('\n')).length>3700)break;body+=line+'\n';included++;}
  if(included<lines.length)body+=`وباقي ${lines.length-included} بند في لوحة الإدارة.\n`;
  return body+'\n'+footer.join('\n');
}

export function telegramTransport(token:string,chatId:string,sendFetch:typeof fetch=fetch):NotificationTransport{
  return {channel:'telegram',destination:chatId,async send(order){
    let response:Response;
    try{response=await sendFetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text:telegramOrderText(order),link_preview_options:{is_disabled:true}}),signal:AbortSignal.timeout(15000),redirect:'error'});}catch{throw new DeliveryError('تعذّر الاتصال بتيليجرام أو انتهت المهلة.');}
    const result=await response.json().catch(()=>null);
    if(!response.ok||result?.ok!==true||!Number.isInteger(result?.result?.message_id)){
      const code=Number(result?.error_code)||response.status;
      const retryAfter=Number(result?.parameters?.retry_after)||0;
      throw new DeliveryError(code===429?'تيليجرام طلب الانتظار قبل إعادة الإرسال.':code===401?'توكن بوت تيليجرام غير صالح.':code===403?'البوت محظور أو ليس لديه صلاحية إرسال للمحادثة.':code===400?'راجع رقم المحادثة وابدأ محادثة مع البوت.':'لم يؤكد تيليجرام قبول الرسالة.',Math.min(Math.max(retryAfter,0),86400));
    }
    return String(result.result.message_id);
  }};
}
export function configuredTransports():NotificationTransport[]{
  const token=process.env.TELEGRAM_BOT_TOKEN?.trim();const chatId=process.env.TELEGRAM_CHAT_ID?.trim();
  const transports:NotificationTransport[]=[];
  if(notificationChannels().includes('telegram')&&token&&/^\d+:[A-Za-z0-9_-]+$/.test(token)&&chatId&&/^-?\d+$/.test(chatId))transports.push(telegramTransport(token,chatId));
  return transports;
}
export function notificationReadiness(){const configured=configuredTransports();return notificationChannels().map((channel)=>({channel,ready:configured.some((item)=>item.channel===channel)}));}

export async function processOrderNotifications(transports=configuredTransports(),onlyOrderId?:string){
  if(!transports.length)return 0;
  const db=await getDatabase();let sent=0;
  for(const transport of transports)for(let i=0;i<5;i++){
    const lease=randomUUID();
    const job=await db.transaction(async(tx)=>{
      const row=(await tx.query<NotificationRow>(`SELECT order_id,channel,status,attempts FROM garbalia.order_notifications WHERE channel=$1 AND (destination IS NULL OR destination=$2) AND ($3::uuid IS NULL OR order_id=$3::uuid) AND ((status='pending' AND next_attempt_at<=now()) OR (status='sending' AND locked_until<now())) ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED`,[transport.channel,transport.destination,onlyOrderId||null])).rows[0];
      if(!row)return null;
      if(row.attempts>=8){await tx.query("UPDATE garbalia.order_notifications SET status='failed',last_error='انتهت محاولات الإرسال؛ راجع القناة ثم أعد المحاولة.' WHERE order_id=$1 AND channel=$2",[row.order_id,row.channel]);return null;}
      await tx.query("UPDATE garbalia.order_notifications SET status='sending',attempts=attempts+1,lease_id=$3,locked_until=now()+interval '2 minutes',destination=$4 WHERE order_id=$1 AND channel=$2",[row.order_id,row.channel,lease,transport.destination]);
      return {...row,attempts:row.attempts+1};
    });
    if(!job)break;
    try{
      const order=(await db.query<OrderRow>('SELECT * FROM garbalia.orders WHERE id=$1',[job.order_id])).rows[0];
      const items=(await db.query<OrderItem>('SELECT product_id,color,name,image,unit_price,quantity FROM garbalia.order_items WHERE order_id=$1 ORDER BY product_id,color',[job.order_id])).rows;
      const providerId=await transport.send({...order,items});
      await db.query("UPDATE garbalia.order_notifications SET status='sent',sent_at=now(),provider_message_id=$4,last_error=NULL,locked_until=NULL,lease_id=NULL WHERE order_id=$1 AND channel=$2 AND lease_id=$3",[job.order_id,job.channel,lease,providerId]);
      sent++;
    }catch(error){
      const delay=Math.max(Math.min(30*2**(job.attempts-1),3600),error instanceof DeliveryError?error.retryAfter:0);
      const message=error instanceof DeliveryError?error.message:'تعذّر تأكيد إرسال الإشعار. ستتم إعادة المحاولة.';
      await db.query("UPDATE garbalia.order_notifications SET status=$4,last_error=$5,next_attempt_at=now()+($6 * interval '1 second'),locked_until=NULL,lease_id=NULL WHERE order_id=$1 AND channel=$2 AND lease_id=$3",[job.order_id,job.channel,lease,job.attempts>=8?'failed':'pending',message,delay]);
    }
  }
  return sent;
}
export async function orderNotifications(orderId:string){return(await(await getDatabase()).query<NotificationRow>('SELECT order_id,channel,status,attempts,last_error,sent_at,next_attempt_at FROM garbalia.order_notifications WHERE order_id=$1 ORDER BY channel',[orderId])).rows;}
