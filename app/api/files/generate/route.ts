import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { fileNameFor, generators, type FileFormat } from '@/lib/files/generate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const schema = z.object({
  format: z.enum(['docx','pdf','xlsx','pptx','zip']),
  filename: z.string().max(120).optional(),
  title: z.string().max(500).optional(),
  text: z.string().max(500_000).optional(),
  rows: z.array(z.array(z.string().max(20_000)).max(100)).max(10_000).optional(),
  slides: z.array(z.object({ title:z.string().max(500), text:z.string().max(50_000) })).max(100).optional(),
  files: z.array(z.object({ name:z.string().max(255), content:z.string().max(1_000_000) })).max(500).optional()
}).superRefine((value, ctx) => {
  if (value.format === 'zip') {
    if (!value.files?.length) ctx.addIssue({ code:'custom', path:['files'], message:'ZIP generation requires at least one file.' })
    const total = (value.files || []).reduce((sum, file) => sum + Buffer.byteLength(file.content, 'utf8'), 0)
    if (total > 20 * 1024 * 1024) ctx.addIssue({ code:'custom', path:['files'], message:'ZIP contents are too large.' })
    for (const file of value.files || []) {
      const normalized = file.name.replace(/\\/g, '/')
      if (!normalized || normalized.startsWith('/') || normalized.includes('../') || normalized === '..') {
        ctx.addIssue({ code:'custom', path:['files'], message:'ZIP entry contains an unsafe path.' })
      }
    }
  }
})

function safeDownloadName(format: FileFormat, requested?: string) {
  return fileNameFor(format, requested).replace(/[\r\n"\\]/g, '-')
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Sign in to generate files.' }, { status: 401 })
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid file-generation request.' }, { status: 400 })
    const { format, filename, ...content } = parsed.data
    const generator = generators[format as FileFormat]
    const data = await generator(content)
    const mime: Record<string,string> = {
      docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pdf:'application/pdf',
      xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      zip:'application/zip'
    }
    return new Response(new Uint8Array(data), { status:200, headers:{ 'Content-Type':mime[format], 'Content-Disposition':`attachment; filename="${safeDownloadName(format, filename)}"`, 'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff' } })
  } catch (error) {
    console.error('[Clue files] generation failed:', error)
    return NextResponse.json({ error:'File generation failed. Please try again.' }, { status:500 })
  }
}
