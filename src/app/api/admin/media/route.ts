import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { NextRequest, NextResponse } from 'next/server';
import { failure, readBody, requireAdmin } from '@/lib/server/http';
import { getDatabase } from '@/lib/server/database';
import { StoreError } from '@/lib/server/validation';
export async function POST(request: NextRequest) { try {
  await requireAdmin(request);
  const bytes = await readBody(request,4*1024*1024);
  const metadata = await sharp(bytes,{limitInputPixels:25000000}).metadata().catch(() => { throw new StoreError('اختار صورة PNG أو JPEG أو WebP سليمة.'); });
  const mime = ({png:'image/png',jpeg:'image/jpeg',webp:'image/webp'} as Record<string,string>)[metadata.format];
  if (!mime || !metadata.width || !metadata.height || metadata.width>6000 || metadata.height>6000 || (metadata.pages || 1)>1) throw new StoreError('الصورة المطلوبة ثابتة، حتى ٦٠٠٠ بكسل و٤ ميجابايت.');
  const id = randomUUID();
  await (await getDatabase()).query('INSERT INTO garbalia.media (id,mime,bytes) VALUES ($1,$2,$3)',[id,mime,bytes]);
  return NextResponse.json({path:`/media/${id}`});
} catch(error) { return failure(error); } }
