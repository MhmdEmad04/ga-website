import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getDatabase,migrate,prepareDataDirectory,type Database } from '../src/lib/server/database';
import { PGlite } from '@electric-sql/pglite';
import { chmod } from 'node:fs/promises';
import path from 'node:path';
import { products,categories } from '../src/lib/catalog';
import { createOrder,changeOrder,getOrder,listProducts,saveProduct,expirePendingOrders } from '../src/lib/server/store';
import { createAdmin,findSession,login,logout,rateLimit } from '../src/lib/server/auth';
import {processOrderNotifications,telegramTransport,telegramOrderText,orderNotifications,type NotificationOrder,type NotificationTransport}from'../src/lib/server/notifications';

let db:Database;let adminId:string;
const customer={name:'عميلة اختبار',phone:'01012345678',governorate:'القاهرة',city:'مدينة نصر',address:'١ شارع تجريبي، الدور الثاني',notes:''};
function input(productId='01',color='black',quantity=1){return {idempotencyKey:randomUUID(),customer,lines:[{productId,color,quantity}],expectedTotal:products.find((p)=>p.id===productId)!.price*quantity+80};}
async function stock(id='01',color='black'){return (await db.query<{stock:number}>('SELECT stock FROM garbalia.variants WHERE product_id=$1 AND color=$2',[id,color])).rows[0].stock;}
before(async()=>{
  process.env.ORDER_NOTIFICATION_CHANNELS='telegram';process.env.TELEGRAM_BOT_TOKEN='';process.env.TELEGRAM_CHAT_ID='';
  process.env.DATABASE_URL='';process.env.GARBALIA_LOCAL_DATABASE='1';process.env.GARBALIA_DATA_DIR=`.cache/server-tests-${randomUUID()}`;
  db=await getDatabase();await migrate(db);
  for(const category of categories.filter((c)=>c!=='الكل'))await db.query('INSERT INTO garbalia.categories (name) VALUES ($1)',[category]);
  for(const product of products)await saveProduct({...product,active:true,version:0});
  await createAdmin('tests@example.com','local-test-password-very-long');
  adminId=(await db.query<{id:string}>('SELECT id FROM garbalia.admins')).rows[0].id;
});
after(async()=>{await db?.close();});

test('server totals reject forged prices and transaction rollback restores stock',async()=>{
  const before=await stock();const order=input();order.expectedTotal=1;
  await assert.rejects(createOrder(order),/السعر/);
  assert.equal(await stock(),before);
  assert.equal((await db.query('SELECT id FROM garbalia.orders')).rows.length,0);
  assert.equal((await db.query('SELECT order_id FROM garbalia.order_notifications')).rows.length,0);
});
test('same idempotency key concurrently reserves stock once and persists one receipt',async()=>{
  const before=await stock();const order=input();const receipts=await Promise.all(Array.from({length:6},()=>createOrder(order)));
  assert.equal(new Set(receipts.map((r)=>r.number)).size,1);assert.equal(await stock(),before-1);
  assert.equal((await db.query('SELECT id FROM garbalia.orders WHERE idempotency_key=$1',[order.idempotencyKey])).rows.length,1);
  assert.equal((await db.query('SELECT n.order_id FROM garbalia.order_notifications n JOIN garbalia.orders o ON o.id=n.order_id WHERE o.idempotency_key=$1',[order.idempotencyKey])).rows.length,1);
  await assert.rejects(createOrder({...order,customer:{...customer,name:'اسم مختلف'}}),/المحاولة السابقة/);
});
test('concurrent requests for last piece cannot oversell',async()=>{
  await db.query("UPDATE garbalia.variants SET stock=1 WHERE product_id='02' AND color='black'");
  const outcomes=await Promise.allSettled([createOrder(input('02')),createOrder(input('02'))]);
  assert.equal(outcomes.filter((o)=>o.status==='fulfilled').length,1);assert.equal(await stock('02'),0);
});
test('cancellation returns stock only once and immutable item snapshots survive edits',async()=>{
  const order=input('03','beige',2);const before=await stock('03','beige');const receipt=await createOrder(order);
  const id=(await db.query<{id:string}>('SELECT id FROM garbalia.orders WHERE number=$1',[receipt.number])).rows[0].id;
  const product=(await listProducts(true)).find((p)=>p.id==='03')!;
  await saveProduct({...product,name:'اسم جديد',price:900,active:false});
  const saved=await getOrder(id);assert.equal(saved!.items[0].name,'داليا');assert.equal(saved!.items[0].unit_price,500);
  await Promise.all([changeOrder(id,'cancelled',adminId),changeOrder(id,'cancelled',adminId)]);
  assert.equal(await stock('03','beige'),before);
  await assert.rejects(changeOrder(id,'preparing',adminId),/غير متاح/);
  await assert.rejects(createOrder(input('03','beige')),/غير متاحة/);
  assert.equal((await getOrder(id))!.events.filter((e)=>e.action.includes('أُعيدت')).length,1);
});
test('shipping is flat for Cairo and Giza and 120 elsewhere; Arabic phone normalizes',async()=>{
  for(const [governorate,shipping] of [['القاهرة',80],['الجيزة',80],['الإسكندرية',120]] as const){
    const order=input('04','camel',2);order.customer={...customer,governorate,phone:'٠١٠١٢٣٤٥٦٧٨'};order.expectedTotal=1160+shipping;
    const receipt=await createOrder(order);assert.equal(receipt.shipping,shipping);assert.equal(receipt.total,1160+shipping);
    const row=(await db.query<{customer:typeof customer}>('SELECT customer FROM garbalia.orders WHERE number=$1',[receipt.number])).rows[0];assert.equal(row.customer.phone,'01012345678');
  }
});
test('invalid quantities, phone, governorate and duplicate summed quantities are rejected',async()=>{
  for(const bad of [{...input(),lines:[{productId:'01',color:'black',quantity:31}]},{...input(),customer:{...customer,phone:'123'}},{...input(),customer:{...customer,governorate:'unknown'}},{...input(),lines:[{productId:'01',color:'black',quantity:20},{productId:'01',color:'black',quantity:20}]},{...input(),total:1}])await assert.rejects(createOrder(bad));
});
test('stale admin stock updates are rejected after purchase',async()=>{
  const stale=(await listProducts(true)).find((p)=>p.id==='05')!;await createOrder(input('05'));
  await assert.rejects(saveProduct({...stale,stock:{...stale.stock,black:100}}),/اتغيّرت/);assert.equal(await stock('05'),29);
});
test('order transitions and payment collection are explicit and audited',async()=>{
  const receipt=await createOrder(input('06'));const id=(await db.query<{id:string}>('SELECT id FROM garbalia.orders WHERE number=$1',[receipt.number])).rows[0].id;
  await assert.rejects(changeOrder(id,'collect',adminId));await assert.rejects(changeOrder(id,'delivered',adminId));
  await changeOrder(id,'preparing',adminId);await changeOrder(id,'shipped',adminId);await assert.rejects(changeOrder(id,'cancelled',adminId));await changeOrder(id,'delivered',adminId);await changeOrder(id,'collect',adminId);
  assert.equal((await getOrder(id))!.payment_status,'collected');assert.equal((await getOrder(id))!.events.length,5);
});
test('admin sessions, bad credentials, expiry and rate limits',async()=>{
  await assert.rejects(login('tests@example.com','wrong'));await assert.rejects(login('missing@example.com','wrong'));
  const token=await login('tests@example.com','local-test-password-very-long');assert.equal((await findSession(token))!.id,adminId);
  assert.equal(await findSession('invalid'),null);await logout(token);assert.equal(await findSession(token),null);
  const expired=await login('tests@example.com','local-test-password-very-long');await db.query("UPDATE garbalia.sessions SET expires_at=now()-interval '1 hour'");assert.equal(await findSession(expired),null);
  await rateLimit('test',1,60);await assert.rejects(rateLimit('test',1,60));
});
test('customer tables have RLS and stored password is never plaintext',async()=>{
  const rows=(await db.query<{relrowsecurity:boolean}>("SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='garbalia' AND c.relkind='r'")).rows;
  assert.ok(rows.length>=10);assert.ok(rows.every((row)=>row.relrowsecurity));
  const hash=(await db.query<{password_hash:string}>('SELECT password_hash FROM garbalia.admins')).rows[0].password_hash;assert.ok(!hash.includes('local-test-password'));
});
test('24-hour expiry releases only unconfirmed orders once and runs before a purchase',async()=>{
  const before=await stock('08','black');const expired=await createOrder(input('08'));const confirmed=await createOrder(input('08'));
  const oldId=(await db.query<{id:string}>('SELECT id FROM garbalia.orders WHERE number=$1',[expired.number])).rows[0].id;
  const confirmedId=(await db.query<{id:string}>('SELECT id FROM garbalia.orders WHERE number=$1',[confirmed.number])).rows[0].id;
  await changeOrder(confirmedId,'preparing',adminId);
  await db.query("UPDATE garbalia.orders SET created_at=now()-interval '25 hours' WHERE id IN ($1,$2)",[oldId,confirmedId]);
  await Promise.all([expirePendingOrders(),expirePendingOrders()]);
  assert.equal(await stock('08','black'),before-1);assert.equal((await getOrder(oldId))!.status,'cancelled');assert.equal((await getOrder(confirmedId))!.status,'preparing');
  assert.equal((await getOrder(oldId))!.events.filter((e)=>e.action.includes('إلغاء تلقائي')).length,1);
  const pending=await createOrder(input('07'));await db.query("UPDATE garbalia.orders SET created_at=now()-interval '24 hours' WHERE number=$1",[pending.number]);
  const beforeRetry=await stock('07');await createOrder(input('07'));assert.equal(await stock('07'),beforeRetry);
});
test('saved database survives closing and reopening after Windows readonly directory flags',async()=>{
  const directory=path.resolve(`.cache/reopen-${randomUUID()}`);await prepareDataDirectory(directory);
  const first=await PGlite.create(directory);await first.exec('CREATE TABLE persisted(value integer); INSERT INTO persisted VALUES (42)');await first.close();
  if(process.platform==='win32')await chmod(directory,0o400);
  await prepareDataDirectory(directory);const reopened=await PGlite.create(directory);
  try{assert.equal((await reopened.query<{value:number}>('SELECT value FROM persisted')).rows[0].value,42);}finally{await reopened.close();}
});

async function notificationOrder(){const data=input('01','beige');await createOrder(data);return(await db.query<{id:string}>('SELECT id FROM garbalia.orders WHERE idempotency_key=$1',[data.idempotencyKey])).rows[0].id;}
test('notification failure preserves the order and stock, retries without concurrent duplicate sending',async()=>{
  const before=await stock('01','beige');const id=await notificationOrder();
  const failed:NotificationTransport={channel:'telegram',destination:'123',send:async()=>{throw new Error('secret-token and private provider response');}};
  await processOrderNotifications([failed],id);
  const job=(await orderNotifications(id))[0];assert.equal(job.status,'pending');assert.equal(job.attempts,1);assert.ok(!job.last_error!.includes('secret'));assert.equal(await stock('01','beige'),before-1);assert.equal((await getOrder(id))!.status,'pending');
  await db.query('UPDATE garbalia.order_notifications SET next_attempt_at=now() WHERE order_id=$1',[id]);
  let calls=0;const success:NotificationTransport={...failed,send:async(order)=>{calls++;assert.equal(order.id,id);assert.equal(order.items[0].color,'beige');return '42';}};
  await Promise.all([processOrderNotifications([success],id),processOrderNotifications([success],id)]);
  assert.equal(calls,1);assert.equal((await orderNotifications(id))[0].status,'sent');
  await processOrderNotifications([success],id);assert.equal(calls,1);
});
test('unconfigured provider waits, abandoned leases recover, changed recipient cannot receive old jobs',async()=>{
  const id=await notificationOrder();await processOrderNotifications([],id);assert.equal((await orderNotifications(id))[0].attempts,0);
  await db.query("UPDATE garbalia.order_notifications SET status='sending',attempts=1,destination='123',locked_until=now()-interval '1 minute',lease_id=$2 WHERE order_id=$1",[id,randomUUID()]);
  let calls=0;const send=async()=>{calls++;return 'lease-recovered';};
  await processOrderNotifications([{channel:'telegram',destination:'999',send}],id);assert.equal(calls,0);
  await processOrderNotifications([{channel:'telegram',destination:'123',send}],id);assert.equal(calls,1);assert.equal((await orderNotifications(id))[0].status,'sent');
});
test('telegram request includes correct destination and plain text, and rate-limit delay is respected',async()=>{
  const id=await notificationOrder();
  const fakeFetch:typeof fetch=async(url,options)=>{
    assert.equal(String(url),'https://api.telegram.org/bot123:test_token/sendMessage');
    const body=JSON.parse(String(options!.body));assert.equal(body.chat_id,'123');assert.ok(body.text.includes('طلب Garbalia'));assert.ok(body.text.includes(customer.phone));assert.ok(body.text.includes('ليلى'));assert.ok(body.text.includes('الإجمالي'));assert.equal(body.parse_mode,undefined);
    return new Response(JSON.stringify({ok:true,result:{message_id:55}}),{status:200});
  };
  await processOrderNotifications([telegramTransport('123:test_token','123',fakeFetch)],id);assert.equal((await orderNotifications(id))[0].status,'sent');
  const limitedId=await notificationOrder();const limited:typeof fetch=async()=>new Response(JSON.stringify({ok:false,error_code:429,parameters:{retry_after:120},description:'do not store raw provider text'}),{status:429});
  await processOrderNotifications([telegramTransport('123:test_token','123',limited)],limitedId);
  const next=(await db.query<{future:boolean}>("SELECT next_attempt_at>now()+interval '110 seconds' AS future FROM garbalia.order_notifications WHERE order_id=$1",[limitedId])).rows[0];assert.ok(next.future);assert.ok(!(await orderNotifications(limitedId))[0].last_error!.includes('raw'));
});
test('notification reaches a visible failed state after eight attempts and long summaries fit Telegram',async()=>{
  const id=await notificationOrder();await db.query('UPDATE garbalia.order_notifications SET attempts=7 WHERE order_id=$1',[id]);
  await processOrderNotifications([{channel:'telegram',destination:'123',send:async()=>{throw Error('offline');}}],id);assert.equal((await orderNotifications(id))[0].status,'failed');
  const order=(await getOrder(id))!;const longOrder={...order,items:Array.from({length:50},()=>({...order.items[0],name:'أ'.repeat(100)}))} as NotificationOrder;
  const text=telegramOrderText(longOrder);assert.ok(text.length<=4096);assert.ok(text.includes('بند في لوحة الإدارة'));assert.ok(text.includes('الإجمالي'));
});
