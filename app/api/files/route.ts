import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { generatedFiles } from '@/db/schema'
import { requireUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireUser()
    const files = await db.select({ id: generatedFiles.id, conversationId: generatedFiles.conversationId, name: generatedFiles.name, mimeType: generatedFiles.mimeType, size: generatedFiles.size, contentText: generatedFiles.contentText, metadata: generatedFiles.metadata, createdAt: generatedFiles.createdAt }).from(generatedFiles).where(eq(generatedFiles.userId, user.id)).orderBy(desc(generatedFiles.createdAt)).limit(100)
    return NextResponse.json({ files })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === 'UNAUTHORIZED' ? 'Unauthorized' : 'Failed to fetch files' }, { status: error instanceof Error && error.message === 'UNAUTHORIZED' ? 401 : 500 })
  }
}
