import { NextRequest, NextResponse } from 'next/server';
import { parseUploadedFile } from '@/lib/files/parse';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = request.cookies.get('clue_session')?.value;
    if (!session) return NextResponse.json({ error: 'Please sign in to analyze files.' }, { status: 401 });
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 });
    const parsed = await parseUploadedFile(file);
    return NextResponse.json({ ok: true, file: parsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to analyze this file.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
