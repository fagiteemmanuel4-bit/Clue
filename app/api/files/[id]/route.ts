import { eq, and } from 'drizzle-orm'
import { db } from '@/db'
import { generatedFiles } from '@/db/schema'
import { requireUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const [file] = await db.select().from(generatedFiles).where(and(eq(generatedFiles.id, id), eq(generatedFiles.userId, user.id))).limit(1)
    if (!file) return Response.json({ error: 'File not found.' }, { status: 404 })
    const inline = new URL(request.url).searchParams.get('inline') === '1'
    const disposition = inline && file.mimeType.startsWith('audio/') ? 'inline' : 'attachment'
    return new Response(new Uint8Array(file.data), { status: 200, headers: { 'Content-Type': file.mimeType, 'Content-Disposition': `${disposition}; filename="${file.name.replace(/[\r\n"\\]/g, '-') }"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' } })
  } catch (error) {
    return Response.json({ error: error instanceof Error && error.message === 'UNAUTHORIZED' ? 'Unauthorized' : 'Failed to fetch file' }, { status: error instanceof Error && error.message === 'UNAUTHORIZED' ? 401 : 500 })
  }
}
