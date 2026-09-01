import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { conversations, messages } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { parseJson, uuidSchema } from '@/lib/api'
import { getProvider } from '@/lib/clue/providers'

export const runtime = 'nodejs'
const paramsSchema = z.object({ id: uuidSchema })
const messageSchema = z.object({ role: z.enum(['user', 'assistant']), contentText: z.string().min(1).max(200000), contentType: z.enum(['text', 'voice']).default('text'), audioUrl: z.string().url().max(2048).nullable().optional() })
async function ownsConversation(id: string, userId: string) { const [row] = await db.select({ id: conversations.id, title: conversations.title }).from(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId))).limit(1); return row }
async function maybeGenerateTitle(conversationId: string, userMessage: string) {
  const provider = getProvider()
  if (!provider) return
  try {
    const title = (await provider.complete([{ role: 'system', content: 'Create a concise conversation title from the user message. Return ONLY the title, 3 to 7 words, no quotes, no punctuation at the end, no generic words like New conversation.' }, { role: 'user', content: userMessage.slice(0, 4000) }])).trim().replace(/^['"`]+|['"`]+$/g, '').replace(/[.!?]+$/g, '').slice(0, 120)
    if (title) await db.update(conversations).set({ title, updatedAt: new Date() }).where(eq(conversations.id, conversationId))
  } catch (error) { console.warn('[Clue] title generation skipped:', error instanceof Error ? error.message : error) }
}
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const p = parseJson(paramsSchema, await params); if (!p.ok) return p.response; if (!(await ownsConversation(p.data.id, user.id))) return Response.json({ error: 'Not found' }, { status: 404 }); const rows = await db.select().from(messages).where(eq(messages.conversationId, p.data.id)).orderBy(asc(messages.createdAt)); return Response.json({ messages: rows }) } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }) } }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const p = parseJson(paramsSchema, await params); if (!p.ok) return p.response; const conversation = await ownsConversation(p.data.id, user.id); if (!conversation) return Response.json({ error: 'Not found' }, { status: 404 }); const b = parseJson(messageSchema, await request.json().catch(() => null)); if (!b.ok) return b.response; const [message] = await db.insert(messages).values({ conversationId: p.data.id, role: b.data.role, contentText: b.data.contentText, contentType: b.data.contentType, audioUrl: b.data.audioUrl ?? null }).returning(); await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, p.data.id)); if (b.data.role === 'user' && conversation.title === 'New conversation') void maybeGenerateTitle(p.data.id, b.data.contentText); return Response.json({ message }, { status: 201 }) } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }) } }
