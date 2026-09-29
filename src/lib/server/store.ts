import { createHash, randomUUID } from 'node:crypto';
import { colors, shippingFor, type Product, type ColorId } from '../catalog';
import { getDatabase, type Queryable } from './database';
import { orderSchema, productSchema, parse, StoreError, type Customer } from './validation';
import { enqueueOrderNotifications } from './notifications';

export type StoredProduct = Product & { active: boolean; version: number };
type ProductRow = { id: string; slug: string; name: string; subtitle: string; description: string; features: string[]; category: Product['category']; price: number; default_color: ColorId; active: boolean; version: number; color: ColorId; stock: number; image: string };
export const statuses = { pending: 'بانتظار التأكيد', preparing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي' } as const;
export type OrderStatus = keyof typeof statuses;
export type OrderRow = { id: string; number: string; customer: Customer; subtotal: number; shipping: number; total: number; status: OrderStatus; payment_status: 'unpaid' | 'collected'; created_at: string };
export type OrderItem = { product_id: string; color: ColorId; name: string; image: string; unit_price: number; quantity: number };
export type Receipt = { number: string; subtotal: number; shipping: number; total: number; status: OrderStatus; items: OrderItem[] };

export async function listProducts(includeHidden = false, connection?: Queryable): Promise<StoredProduct[]> {
  if(!connection)await expirePendingOrders();
  const db = connection || await getDatabase();
  const { rows } = await db.query<ProductRow>(`SELECT p.*, v.color, v.stock, v.image FROM garbalia.products p JOIN garbalia.variants v ON v.product_id=p.id ${includeHidden ? '' : 'WHERE p.active=true'} ORDER BY p.id, v.color`);
  const result = new Map<string, StoredProduct>();
  for (const row of rows) {
    if (!result.has(row.id)) result.set(row.id, { id: row.id, slug: row.slug, name: row.name, subtitle: row.subtitle, description: row.description, features: row.features, category: row.category, price: row.price, defaultColor: row.default_color, active: row.active, version: row.version, stock: { black: 0, beige: 0, camel: 0 }, images: { black: '', beige: '', camel: '' } });
    result.get(row.id)!.stock[row.color] = row.stock;
    result.get(row.id)!.images[row.color] = row.image;
  }
  return [...result.values()];
}
export async function listCategories() { return (await (await getDatabase()).query<{ name: string; parent_name: string | null }>('SELECT * FROM garbalia.categories ORDER BY name')).rows; }

async function receipt(db: Queryable, id: string): Promise<Receipt> {
  const order = (await db.query<OrderRow>('SELECT number,subtotal,shipping,total,status FROM garbalia.orders WHERE id=$1', [id])).rows[0];
  const items = (await db.query<OrderItem>('SELECT product_id,color,name,image,unit_price,quantity FROM garbalia.order_items WHERE order_id=$1 ORDER BY product_id,color', [id])).rows;
  return { number: order.number, subtotal: order.subtotal, shipping: order.shipping, total: order.total, status: order.status, items };
}

export async function createOrder(value: unknown): Promise<Receipt> {
  const input = parse(orderSchema, value);
  const merged = new Map<string, (typeof input.lines)[number]>();
  for (const item of input.lines) {
    const key = `${item.productId}:${item.color}`;
    const quantity = (merged.get(key)?.quantity || 0) + item.quantity;
    if (quantity > 30) throw new StoreError('الحد الأقصى ٣٠ قطعة من نفس اللون في الطلب.');
    merged.set(key, { ...item, quantity });
  }
  const lines = [...merged.values()].sort((a,b) => `${a.productId}:${a.color}`.localeCompare(`${b.productId}:${b.color}`));
  const fingerprint = createHash('sha256').update(JSON.stringify({ customer: input.customer, lines, expectedTotal: input.expectedTotal })).digest('hex');
  const db = await getDatabase();
  await expirePendingOrders();
  return db.transaction(async (tx) => {
    const id = randomUUID();
    const number = `GB-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${randomUUID().replaceAll('-','').slice(0,12).toUpperCase()}`;
    const shipping = shippingFor(input.customer.governorate)!;
    // This provisional row is never committed unless every item and total succeeds.
    const inserted = await tx.query<{ id: string }>('INSERT INTO garbalia.orders (id,number,idempotency_key,request_hash,customer,subtotal,shipping,total) VALUES ($1,$2,$3,$4,$5,1,$6,$7) ON CONFLICT (idempotency_key) DO NOTHING RETURNING id', [id, number, input.idempotencyKey, fingerprint, JSON.stringify(input.customer), shipping, shipping+1]);
    if (!inserted.rows.length) {
      const previous = (await tx.query<{ id: string; request_hash: string }>('SELECT id,request_hash FROM garbalia.orders WHERE idempotency_key=$1', [input.idempotencyKey])).rows[0];
      if (previous.request_hash !== fingerprint) throw new StoreError('المحاولة السابقة تخص بيانات مختلفة. ابدئي طلبًا جديدًا بعد مراجعة طلباتك.', 409);
      return receipt(tx, previous.id);
    }
    let subtotal = 0;
    for (const item of lines) {
      const row = (await tx.query<{ name: string; price: number; active: boolean; stock: number; image: string }>('SELECT p.name,p.price,p.active,v.stock,v.image FROM garbalia.products p JOIN garbalia.variants v ON v.product_id=p.id WHERE p.id=$1 AND v.color=$2 FOR UPDATE OF p,v', [item.productId,item.color])).rows[0];
      if (!row || !row.active || row.stock < item.quantity) throw new StoreError('الكمية المطلوبة غير متاحة حاليًا. حدّثي المنتجات وراجعي الكمية.', 409);
      subtotal += row.price * item.quantity;
      await tx.query('UPDATE garbalia.variants SET stock=stock-$3 WHERE product_id=$1 AND color=$2', [item.productId,item.color,item.quantity]);
      await tx.query('UPDATE garbalia.products SET version=version+1,updated_at=now() WHERE id=$1', [item.productId]);
      await tx.query('INSERT INTO garbalia.order_items (order_id,product_id,color,name,image,unit_price,quantity) VALUES ($1,$2,$3,$4,$5,$6,$7)', [id,item.productId,item.color,row.name,row.image,row.price,item.quantity]);
    }
    if (subtotal + shipping !== input.expectedTotal) throw new StoreError('السعر اتحدّث. راجعي الإجمالي الجديد قبل إرسال الطلب.', 409);
    await tx.query('UPDATE garbalia.orders SET subtotal=$2,total=$3 WHERE id=$1', [id,subtotal,subtotal+shipping]);
    await tx.query("INSERT INTO garbalia.order_events (order_id,action) VALUES ($1,'تم استلام الطلب وحجز الكمية؛ بانتظار التأكيد اليدوي')", [id]);
    await enqueueOrderNotifications(tx,id);
    return receipt(tx,id);
  });
}

export async function listOrders() { await expirePendingOrders();return (await (await getDatabase()).query<OrderRow>('SELECT id,number,customer,subtotal,shipping,total,status,payment_status,created_at FROM garbalia.orders ORDER BY created_at DESC LIMIT 200')).rows; }
export async function getOrder(id: string) {
  await expirePendingOrders();
  const db = await getDatabase();
  const order = (await db.query<OrderRow>('SELECT id,number,customer,subtotal,shipping,total,status,payment_status,created_at FROM garbalia.orders WHERE id=$1',[id])).rows[0];
  if (!order) return null;
  const items = (await receipt(db,id)).items;
  const events = (await db.query<{ action: string; created_at: string }>('SELECT action,created_at FROM garbalia.order_events WHERE order_id=$1 ORDER BY id DESC',[id])).rows;
  return { ...order, items, events };
}

export async function changeOrder(id: string, action: OrderStatus | 'collect', adminId: string) {
  await expirePendingOrders();
  const db = await getDatabase();
  return db.transaction(async (tx) => {
    const order = (await tx.query<OrderRow>('SELECT * FROM garbalia.orders WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if (!order) throw new StoreError('الطلب غير موجود.',404);
    if (action === 'collect') {
      if (order.status !== 'delivered') throw new StoreError('سجّل التسليم قبل تحصيل المبلغ.',409);
      if (order.payment_status === 'collected') return;
      await tx.query("UPDATE garbalia.orders SET payment_status='collected' WHERE id=$1",[id]);
    } else {
      if (order.status === action) return;
      const allowed: Record<OrderStatus, OrderStatus[]> = { pending: ['preparing','cancelled'], preparing: ['shipped','cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
      if (!allowed[order.status].includes(action)) throw new StoreError('التغيير غير متاح من حالة الطلب الحالية.',409);
      if (action === 'cancelled') {
        const items = (await tx.query<OrderItem>('SELECT product_id,color,quantity FROM garbalia.order_items WHERE order_id=$1 ORDER BY product_id,color',[id])).rows;
        for (const item of items) {
          await tx.query('UPDATE garbalia.products SET version=version+1,updated_at=now() WHERE id=$1',[item.product_id]);
          await tx.query('UPDATE garbalia.variants SET stock=stock+$3 WHERE product_id=$1 AND color=$2',[item.product_id,item.color,item.quantity]);
        }
      }
      await tx.query('UPDATE garbalia.orders SET status=$2 WHERE id=$1',[id,action]);
    }
    await tx.query('INSERT INTO garbalia.order_events (order_id,admin_id,action) VALUES ($1,$2,$3)',[id,adminId,action === 'collect' ? 'تم تسجيل تحصيل المبلغ' : `${statuses[action]}${action === 'cancelled' ? ' — أُعيدت الكمية للمخزون' : ''}`]);
  });
}

export async function expirePendingOrders() {
  const db=await getDatabase();let count=0;
  // Each transaction owns one order and locks its products in a stable order.
  // SKIP LOCKED allows a scheduled worker and a request to run together safely.
  for(let i=0;i<100;i++){
    const expired=await db.transaction(async(tx)=>{
      const order=(await tx.query<{id:string}>("SELECT id FROM garbalia.orders WHERE status='pending' AND created_at<=now()-interval '24 hours' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED")).rows[0];
      if(!order)return false;
      const items=(await tx.query<OrderItem>('SELECT product_id,color,quantity FROM garbalia.order_items WHERE order_id=$1 ORDER BY product_id,color',[order.id])).rows;
      for(const item of items){await tx.query('UPDATE garbalia.products SET version=version+1,updated_at=now() WHERE id=$1',[item.product_id]);await tx.query('UPDATE garbalia.variants SET stock=stock+$3 WHERE product_id=$1 AND color=$2',[item.product_id,item.color,item.quantity]);}
      await tx.query("UPDATE garbalia.orders SET status='cancelled' WHERE id=$1",[order.id]);
      await tx.query("INSERT INTO garbalia.order_events (order_id,action) VALUES ($1,'إلغاء تلقائي لعدم التأكيد خلال ٢٤ ساعة — أُعيدت الكمية للمخزون')",[order.id]);
      return true;
    });
    if(!expired)break;count++;
  }
  return count;
}

export async function saveProduct(value: unknown) {
  const item = parse(productSchema,value);
  return (await getDatabase()).transaction(async (tx) => {
    const current = (await tx.query<{ version: number }>('SELECT version FROM garbalia.products WHERE id=$1 FOR UPDATE',[item.id])).rows[0];
    if ((current?.version ?? 0) !== item.version) throw new StoreError('بيانات المنتج أو مخزونه اتغيّرت. حدّث الصفحة قبل الحفظ.',409);
    if (!(await tx.query('SELECT name FROM garbalia.categories WHERE name=$1',[item.category])).rows.length) throw new StoreError('اختار تصنيفًا موجودًا.');
    if ((await tx.query('SELECT id FROM garbalia.products WHERE slug=$1 AND id<>$2',[item.slug,item.id])).rows.length) throw new StoreError('رابط المنتج مستخدم بالفعل.');
    await tx.query('INSERT INTO garbalia.products (id,slug,name,subtitle,description,features,category,price,default_color,active,version) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1) ON CONFLICT (id) DO UPDATE SET slug=$2,name=$3,subtitle=$4,description=$5,features=$6,category=$7,price=$8,default_color=$9,active=$10,version=garbalia.products.version+1,updated_at=now()', [item.id,item.slug,item.name,item.subtitle,item.description,JSON.stringify(item.features),item.category,item.price,item.defaultColor,item.active]);
    for (const color of colors) await tx.query('INSERT INTO garbalia.variants (product_id,color,stock,image) VALUES ($1,$2,$3,$4) ON CONFLICT (product_id,color) DO UPDATE SET stock=$3,image=$4',[item.id,color.id,item.stock[color.id],item.images[color.id]]);
  });
}
