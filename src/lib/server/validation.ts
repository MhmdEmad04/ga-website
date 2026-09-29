import { z } from 'zod';
import { governorates } from '../catalog';

export class StoreError extends Error { constructor(message: string, public status = 400) { super(message); } }
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
export const colorSchema = z.enum(['black', 'beige', 'camel']);
export const customerSchema = z.object({
  name: text(2,100), phone: z.string().transform((value) => value.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).trim()).pipe(z.string().regex(/^01[0125][0-9]{8}$/)),
  governorate: z.enum(governorates), city: text(2,100), address: text(5,400), notes: z.string().trim().max(500).default(''),
}).strict();
export const orderSchema = z.object({
  idempotencyKey: z.uuid(), customer: customerSchema,
  lines: z.array(z.object({ productId: text(1,60), color: colorSchema, quantity: z.number().int().min(1).max(30) }).strict()).min(1).max(50),
  expectedTotal: z.number().int().positive(),
}).strict();
const imagePath = z.string().regex(/^\/(?:images\/[a-zA-Z0-9/_-]+\.(?:png|jpg|jpeg|webp)|media\/[0-9a-f-]{36})$/);
export const productSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-]{1,60}$/), slug: z.string().regex(/^[a-z0-9-]{1,80}$/),
  name: text(1,100), subtitle: text(1,150), description: text(10,3000),
  features: z.array(text(1,180)).max(12), category: text(1,60), price: z.number().int().min(1).max(100000),
  defaultColor: colorSchema, active: z.boolean(), version: z.number().int().min(0),
  stock: z.object({ black: z.number().int().min(0).max(100000), beige: z.number().int().min(0).max(100000), camel: z.number().int().min(0).max(100000) }).strict(),
  images: z.object({ black: imagePath, beige: imagePath, camel: imagePath }).strict(),
}).strict();
export type Customer = z.infer<typeof customerSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type AdminProduct = z.infer<typeof productSchema>;
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new StoreError('راجعي البيانات المطلوبة ورقم الموبايل والكميات.');
  return result.data;
}
