import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { conversations, messages } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { parseJson, uuidSchema } from '@/lib/api'

export const runtime = 'nodejs'
const paramsSchema = z.object({ conversationId: uuidSchema, id: uuidSchema })
const bodySchema = z.object({ contentText: z.string().min(1).max(200000).optional(), audioUrl: z.string().url().max(2048).nullable().optional() }).refine(v => v.contentText !== undefined || v.audioUrl !== undefined, 'Nothing to update')
async function owns(conversationId: string, id: string, userId: string) { const [row] = await db.select({ message: messages }).from(messages).innerJoin(conversations, eq(messages.conversationId, conversations.id)).where(and(eq(messages.id, id), eq(messages.conversationId, conversationId), eq(conversations.userId, userId))).limit(1); return row?.message }
export async function GET(_: Request, { params }: { params: Promise<{ conversationId: string; id: string }> }) { try { const user = await requireUser(); const p = parseJson(paramsSchema, await params); if (!p.ok) return p.response; const message = await owns(p.data.conversationId, p.data.id, user.id); return message ? Response.json({ message }) : Response.json({ error: 'Not found' }, { status: 404 }) } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }) } }
export async function PATCH(request: Request, { params }: { params: Promise<{ conversationId: string; id: string }> }) { try { const user = await requireUser(); const p = parseJson(paramsSchema, await params); if (!p.ok) return p.response; const b = parseJson(bodySchema, await request.json().catch(() => null)); if (!b.ok) return b.response; if (!(await owns(p.data.conversationId, p.data.id, user.id))) return Response.json({ error: 'Not found' }, { status: 404 }); const [message] = await db.update(messages).set({ ...(b.data.contentText !== undefined ? { contentText: b.data.contentText } : {}), ...(b.data.audioUrl !== undefined ? { audioUrl: b.data.audioUrl } : {}) }).where(eq(messages.id, p.data.id)).returning(); return Response.json({ message }) } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }) } }
export async function DELETE(_: Request, { params }: { params: Promise<{ conversationId: string; id: string }> }) { try { const user = await requireUser(); const p = parseJson(paramsSchema, await params); if (!p.ok) return p.response; if (!(await owns(p.data.conversationId, p.data.id, user.id))) return Response.json({ error: 'Not found' }, { status: 404 }); await db.delete(messages).where(eq(messages.id, p.data.id)); return Response.json({ ok: true }) } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }) } }
