// Poll route no longer needed — HuggingFace is synchronous.
// Kept as a stub so any lingering frontend poll calls don't 404.
import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ status: 'succeeded', message: 'HF is synchronous — no polling needed' });
}
