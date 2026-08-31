import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/db'
import { users } from '@/db/schema'
import { createSession } from '@/lib/auth'
import { emailSchema, parseJson } from '@/lib/api'

export const runtime = 'nodejs'
const schema = z.object({ email: emailSchema, password: z.string().min(1).max(128) })
const DB_TIMEOUT = 5000

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('DATABASE_TIMEOUT')), DB_TIMEOUT))])
}

export async function POST(request: Request) {
  const parsed = parseJson(schema, await request.json().catch(() => null)); if (!parsed.ok) return parsed.response
  try {
    const [user] = await withTimeout(db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1))
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return Response.json({ error: 'Invalid email or password' }, { status: 401 })
    await withTimeout(createSession(user.id))
    return Response.json({ user: { id: user.id, email: user.email, displayName: user.displayName, preferredAccent: user.preferredAccent, themePreference: user.themePreference } })
  } catch {
    return Response.json({ error: 'Clue could not reach the database right now. Please try again shortly.' }, { status: 503 })
  }
}
