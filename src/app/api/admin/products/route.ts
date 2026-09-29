import { NextRequest, NextResponse } from 'next/server';
import { failure, readJson, requireAdmin } from '@/lib/server/http';
import { saveProduct } from '@/lib/server/store';
export async function POST(request: NextRequest) { try { await requireAdmin(request); await saveProduct(await readJson(request)); return NextResponse.json({ok:true}); } catch(error) { return failure(error); } }
