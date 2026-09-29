import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { failure, readJson, requireAdmin } from '@/lib/server/http';
import { changeOrder } from '@/lib/server/store';
import { parse } from '@/lib/server/validation';
export async function POST(request: NextRequest) { try { const admin = await requireAdmin(request); const data = parse(z.object({id:z.uuid(),action:z.enum(['pending','preparing','shipped','delivered','cancelled','collect'])}).strict(),await readJson(request)); await changeOrder(data.id,data.action,admin.id); return NextResponse.json({ok:true}); } catch(error) { return failure(error); } }
