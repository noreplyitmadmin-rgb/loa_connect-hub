import { NextResponse } from 'next/server';
import { groupAccessRepository } from '@/lib/repositories/factory';

export async function GET() {
  const paths = await groupAccessRepository.listAllPages()
  const adminExclusive = new Set(["/admin/data/maintenance"])
  return NextResponse.json({ paths: paths.filter((p) => !adminExclusive.has(p)) });
}
