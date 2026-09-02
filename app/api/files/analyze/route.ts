import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { analyzeFile } from '@/lib/files/analyze'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const entry = form.get('file')
    if (!(entry instanceof File)) return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 })

    const result = await analyzeFile(entry)
    const user = await getCurrentUser()
    return NextResponse.json({
      ok: true,
      authenticated: Boolean(user),
      file: {
        name: result.name,
        type: result.type,
        size: result.size,
        kind: result.kind,
        summary: result.summary,
        rows: result.rows,
        columns: result.columns,
        sheets: result.sheets,
        stats: result.stats,
        sample: result.sample,
      },
      context: result.text,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('File analysis error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not analyze that file.' }, { status: 422 })
  }
}
