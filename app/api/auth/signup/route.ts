import { and, eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/db'
import { users } from '@/db/schema'
import { createSession } from '@/lib/auth'
import { emailSchema, parseJson } from '@/lib/api'

export const runtime = 'nodejs'
const schema = z.object({ email: emailSchema, password: z.string().min(8).max(128), displayName: z.string().trim().min(1).max(80).optional() })

export async function POST(request: Request) {
  const parsed = parseJson(schema, await request.json().catch(() => null)); if (!parsed.ok) return parsed.response
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1)
  if (existing.length) return Response.json({ error: 'Email already registered' }, { status: 409 })
  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  const [user] = await db.insert(users).values({ email: parsed.data.email, passwordHash, displayName: parsed.data.displayName }).returning({ id: users.id, email: users.email, displayName: users.displayName })
  await createSession(user.id)
  return Response.json({ user }, { status: 201 })
}
