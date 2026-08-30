import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { conversations, messages } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { parseJson, uuidSchema } from '@/lib/api'

export const runtime = 'nodejs'
const paramsSchema = z.object({ id: uuidSchema })
const messageSchema = z.object({ role: z.enum(['user', 'assistant']), contentText: z.string().min(1).max(200000), contentType: z.enum(['text', 'voice']).default('text'), audioUrl: z.string().url().max(2048).nullable().optional() })
async function ownsConversation(id: string, userId: string) { const [row] = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId))).limit(1); return row }
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const p = parseJson(paramsSchema, await params); if (!p.ok) return p.response; if (!(await ownsConversation(p.data.id, user.id))) return Response.json({ error: 'Not found' }, { status: 404 }); const rows = await db.select().from(messages).where(eq(messages.conversationId, p.data.id)).orderBy(asc(messages.createdAt)); return Response.json({ messages: rows }) } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }) } }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const p = parseJson(paramsSchema, await params); if (!p.ok) return p.response; if (!(await ownsConversation(p.data.id, user.id))) return Response.json({ error: 'Not found' }, { status: 404 }); const b = parseJson(messageSchema, await request.json().catch(() => null)); if (!b.ok) return b.response; const [message] = await db.insert(messages).values({ conversationId: p.data.id, role: b.data.role, contentText: b.data.contentText, contentType: b.data.contentType, audioUrl: b.data.audioUrl ?? null }).returning(); await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, p.data.id)); return Response.json({ message }, { status: 201 }) } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }) } }
