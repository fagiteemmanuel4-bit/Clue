import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { conversations } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { parseJson } from '@/lib/api'

export const runtime = 'nodejs'
const createSchema = z.object({ title: z.string().trim().min(1).max(200).optional() })
export async function GET() {
  try { const user = await requireUser(); const rows = await db.select().from(conversations).where(eq(conversations.userId, user.id)).orderBy(desc(conversations.updatedAt)); return Response.json({ conversations: rows }) }
  catch (e) { return Response.json({ error: e instanceof Error && e.message === 'UNAUTHORIZED' ? 'Unauthorized' : 'Failed to fetch conversations' }, { status: e instanceof Error && e.message === 'UNAUTHORIZED' ? 401 : 500 }) }
}
export async function POST(request: Request) {
  try { const user = await requireUser(); const parsed = parseJson(createSchema, await request.json().catch(() => null)); if (!parsed.ok) return parsed.response; const [conversation] = await db.insert(conversations).values({ userId: user.id, title: parsed.data.title ?? 'New conversation' }).returning(); return Response.json({ conversation }, { status: 201 }) }
  catch (e) { return Response.json({ error: e instanceof Error && e.message === 'UNAUTHORIZED' ? 'Unauthorized' : 'Failed to create conversation' }, { status: e instanceof Error && e.message === 'UNAUTHORIZED' ? 401 : 500 }) }
}
