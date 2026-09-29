import { NextRequest, NextResponse } from 'next/server';
import { logout, sessionCookie } from '@/lib/server/auth';
import { failure, requireAdmin } from '@/lib/server/http';
export async function POST(request: NextRequest) { try { await requireAdmin(request); await logout(request.cookies.get(sessionCookie)!.value); const response=NextResponse.json({ok:true}); response.cookies.delete(sessionCookie); return response; } catch(error) { return failure(error); } }
