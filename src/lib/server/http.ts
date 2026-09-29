import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { findSession, sessionCookie } from './auth';
import { StoreError } from './validation';

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const allowed = process.env.APP_URL || 'http://127.0.0.1:3000';
  if (origin !== new URL(allowed).origin) throw new StoreError('الطلب من مصدر غير مسموح.',403);
}
export function clientAddress(request: Request) { return process.env.TRUST_PROXY === '1' ? (request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown') : 'local'; }
export async function readBody(request: Request, maxBytes = 20000): Promise<Uint8Array> {
  if (Number(request.headers.get('content-length')) > maxBytes) throw new StoreError('حجم البيانات أكبر من المسموح.',413);
  const reader = request.body?.getReader();
  if (!reader) throw new StoreError('بيانات الطلب غير مكتملة.');
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > maxBytes) { await reader.cancel(); throw new StoreError('حجم البيانات أكبر من المسموح.',413); } chunks.push(value); }
  return Buffer.concat(chunks);
}
export async function readJson(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new StoreError('نوع البيانات غير مدعوم.',415);
  const bytes = await readBody(request);
  try { return JSON.parse(new TextDecoder().decode(bytes)) as unknown; } catch { throw new StoreError('بيانات غير صالحة.'); }
}
export function failure(error: unknown) { return NextResponse.json({ error: error instanceof StoreError ? error.message : 'تعذّر حفظ التغيير. حاول مرة أخرى.' }, { status: error instanceof StoreError ? error.status : 500, headers: { 'Cache-Control': 'no-store' } }); }
export async function requireAdmin(request: NextRequest) { sameOrigin(request); const admin = await findSession(request.cookies.get(sessionCookie)?.value); if (!admin) throw new StoreError('سجّل الدخول أولًا.',401); return admin; }
export async function pageAdmin() { const admin = await findSession((await cookies()).get(sessionCookie)?.value); if (!admin) redirect('/admin/login'); return admin; }
