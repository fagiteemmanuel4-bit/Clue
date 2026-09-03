import { and, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { memories, userProfiles } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { parseJson } from '@/lib/api'

export const runtime = 'nodejs'
const createSchema = z.object({ content: z.string().trim().min(1).max(6000), importance: z.number().min(0).max(1).optional() })
const updateSchema = z.object({ id: z.string().uuid(), content: z.string().trim().min(1).max(6000), importance: z.number().min(0).max(1).optional() })
const deleteSchema = z.object({ id: z.string().uuid() })

async function memoryEnabled(userId: string) {
  const [profile] = await db.select({ enabled: userProfiles.memoryEnabled }).from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1)
  return profile?.enabled !== false
}

export async function GET() {
  try {
    const user = await requireUser()
    if (!(await memoryEnabled(user.id))) return Response.json({ memories: [], enabled: false })
    const rows = await db.select().from(memories).where(eq(memories.userId, user.id)).orderBy(desc(memories.updatedAt)).limit(100)
    return Response.json({ memories: rows, enabled: true })
  } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }) }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    if (!(await memoryEnabled(user.id))) return Response.json({ error: 'Memory is disabled.' }, { status: 409 })
    const parsed = parseJson(createSchema, await request.json().catch(() => null))
    if (!parsed.ok) return parsed.response
    const content = parsed.data.content.trim()
    const [row] = await db.insert(memories).values({ userId: user.id, content, contentHash: sql`md5(${content})`, importance: parsed.data.importance ?? 0.5, source: 'explicit' }).onConflictDoUpdate({ target: [memories.userId, memories.contentHash], set: { updatedAt: new Date(), ...(parsed.data.importance === undefined ? {} : { importance: parsed.data.importance }) } }).returning()
    return Response.json({ memory: row }, { status: 201 })
  } catch { return Response.json({ error: 'Unable to save memory.' }, { status: 500 }) }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser()
    if (!(await memoryEnabled(user.id))) return Response.json({ error: 'Memory is disabled.' }, { status: 409 })
    const parsed = parseJson(updateSchema, await request.json().catch(() => null))
    if (!parsed.ok) return parsed.response
    const content = parsed.data.content.trim()
    const [row] = await db.update(memories).set({ content, contentHash: sql`md5(${content})`, ...(parsed.data.importance === undefined ? {} : { importance: parsed.data.importance }), updatedAt: new Date() }).where(and(eq(memories.id, parsed.data.id), eq(memories.userId, user.id))).returning()
    return row ? Response.json({ memory: row }) : Response.json({ error: 'Memory not found' }, { status: 404 })
  } catch { return Response.json({ error: 'Unable to update memory.' }, { status: 500 }) }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser()
    const parsed = parseJson(deleteSchema, await request.json().catch(() => null))
    if (!parsed.ok) return parsed.response
    const rows = await db.delete(memories).where(and(eq(memories.id, parsed.data.id), eq(memories.userId, user.id))).returning({ id: memories.id })
    return rows.length ? Response.json({ ok: true }) : Response.json({ error: 'Memory not found' }, { status: 404 })
  } catch { return Response.json({ error: 'Unable to delete memory.' }, { status: 500 }) }
}
