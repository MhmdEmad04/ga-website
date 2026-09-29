import { getDatabase } from '@/lib/server/database';
export async function GET(_request: Request, {params}: {params:Promise<{id:string}>}) {
  const {id}=await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null,{status:404});
  const row=(await (await getDatabase()).query<{mime:string;bytes:Uint8Array}>('SELECT mime,bytes FROM garbalia.media WHERE id=$1',[id])).rows[0];
  if (!row) return new Response(null,{status:404});
  return new Response(new Uint8Array(row.bytes),{headers:{'Content-Type':row.mime,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'",'Cache-Control':'public,max-age=31536000,immutable'}});
}
