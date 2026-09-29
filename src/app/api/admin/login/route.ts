import { NextResponse } from 'next/server';
import { z } from 'zod';
import { login, rateLimit, sessionCookie } from '@/lib/server/auth';
import { clientAddress, failure, readJson, sameOrigin } from '@/lib/server/http';
import { parse } from '@/lib/server/validation';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await rateLimit(`login-ip:${clientAddress(request)}`,30,900);
    const input = parse(z.object({email:z.email().max(200),password:z.string().min(1).max(200)}).strict(),await readJson(request));
    await rateLimit(`login-email:${input.email.toLowerCase()}`,8,900);
    const token = await login(input.email,input.password);
    const response = NextResponse.json({ok:true});
    response.cookies.set(sessionCookie,token,{httpOnly:true,sameSite:'strict',secure:new URL(process.env.APP_URL || 'http://127.0.0.1:3000').protocol === 'https:',path:'/',maxAge:8*60*60});
    response.headers.set('Cache-Control','no-store');
    return response;
  } catch (error) { return failure(error); }
}
