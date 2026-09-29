import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { failure, readJson, requireAdmin } from '@/lib/server/http';
import { getDatabase } from '@/lib/server/database';
import { parse, StoreError } from '@/lib/server/validation';
export async function POST(request: NextRequest) { try {
  await requireAdmin(request);
  const input = parse(z.object({name:z.string().trim().min(1).max(60),parent:z.string().trim().max(60).default('')}).strict(),await readJson(request));
  const db=await getDatabase();
  if (input.parent === input.name) throw new StoreError('التصنيف لا يكون فرعًا من نفسه.');
  if (input.parent && !(await db.query('SELECT name FROM garbalia.categories WHERE name=$1',[input.parent])).rows.length) throw new StoreError('التصنيف الرئيسي غير موجود.');
  if ((await db.query('SELECT name FROM garbalia.categories WHERE name=$1',[input.name])).rows.length) throw new StoreError('التصنيف موجود بالفعل.');
  await db.query('INSERT INTO garbalia.categories (name,parent_name) VALUES ($1,$2)',[input.name,input.parent || null]);
  return NextResponse.json({ok:true});
} catch(error) { return failure(error); } }
