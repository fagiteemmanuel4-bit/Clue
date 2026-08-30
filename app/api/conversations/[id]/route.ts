import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { conversations } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { parseJson, uuidSchema } from '@/lib/api'

export const runtime = 'nodejs'
const bodySchema = z.object({ title: z.string().trim().min(1).max(200).optional() })
const paramsSchema = z.object({ id: uuidSchema })
async function owned(id: string, userId: string) { return db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId))).limit(1) }
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const p = parseJson(paramsSchema, await params); if (!p.ok) return p.response; const [row] = await owned(p.data.id, user.id); return row ? Response.json({ conversation: row }) : Response.json({ error: 'Not found' }, { status: 404 }) } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }) } }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const p = parseJson(paramsSchema, await params); if (!p.ok) return p.response; const b = parseJson(bodySchema, await request.json().catch(() => null)); if (!b.ok) return b.response; const [row] = await db.update(conversations).set({ ...(b.data.title !== undefined ? { title: b.data.title } : {}), updatedAt: new Date() }).where(and(eq(conversations.id, p.data.id), eq(conversations.userId, user.id))).returning(); return row ? Response.json({ conversation: row }) : Response.json({ error: 'Not found' }, { status: 404 }) } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }) } }
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const p = parseJson(paramsSchema, await params); if (!p.ok) return p.response; const result = await db.delete(conversations).where(and(eq(conversations.id, p.data.id), eq(conversations.userId, user.id))).returning({ id: conversations.id }); return result.length ? Response.json({ ok: true }) : Response.json({ error: 'Not found' }, { status: 404 }) } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }) } }
