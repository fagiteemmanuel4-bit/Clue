import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { voiceSettings } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { parseJson } from '@/lib/api'

export const runtime = 'nodejs'
const schema = z.object({ accent: z.string().trim().min(1).max(80).optional(), speed: z.number().min(0.5).max(2).optional(), pitch: z.number().min(-2).max(2).optional() })
export async function GET() { try { const user = await requireUser(); const [settings] = await db.select().from(voiceSettings).where(eq(voiceSettings.userId, user.id)).limit(1); return Response.json({ voiceSettings: settings ?? { accent: user.preferredAccent, speed: 1, pitch: 0 } }) } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }) } }
export async function PUT(request: Request) { try { const user = await requireUser(); const parsed = parseJson(schema, await request.json().catch(() => null)); if (!parsed.ok) return parsed.response; const [settings] = await db.insert(voiceSettings).values({ userId: user.id, accent: parsed.data.accent ?? user.preferredAccent, speed: parsed.data.speed ?? 1, pitch: parsed.data.pitch ?? 0 }).onConflictDoUpdate({ target: voiceSettings.userId, set: { ...(parsed.data.accent !== undefined ? { accent: parsed.data.accent } : {}), ...(parsed.data.speed !== undefined ? { speed: parsed.data.speed } : {}), ...(parsed.data.pitch !== undefined ? { pitch: parsed.data.pitch } : {}), updatedAt: new Date() } }).returning(); return Response.json({ voiceSettings: settings }) } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }) } }
