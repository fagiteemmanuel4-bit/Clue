import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/db'
import { userProfiles, users } from '@/db/schema'
import { createSession } from '@/lib/auth'
import { emailSchema, parseJson } from '@/lib/api'

export const runtime = 'nodejs'
const schema = z.object({ email: emailSchema, password: z.string().min(8).max(128), displayName: z.string().trim().min(1).max(80).optional() })
const DB_TIMEOUT = 5000

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('DATABASE_TIMEOUT')), DB_TIMEOUT))])
}

export async function POST(request: Request) {
  const parsed = parseJson(schema, await request.json().catch(() => null))
  if (!parsed.ok) return parsed.response

  try {
    const existing = await withTimeout(
      db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1),
    )
    if (existing.length) return Response.json({ error: 'Email already registered' }, { status: 409 })

    const passwordHash = await bcrypt.hash(parsed.data.password, 12)
    const [user] = await withTimeout(
      db.insert(users)
        .values({ email: parsed.data.email, passwordHash, displayName: parsed.data.displayName })
        .returning({ id: users.id, email: users.email, displayName: users.displayName }),
    )

    // Create the profile immediately so a new account never depends on a
    // second profile/preferences write just to finish registration.
    await withTimeout(
      db.insert(userProfiles).values({
        userId: user.id,
        name: parsed.data.displayName ?? null,
      }),
    )

    await withTimeout(createSession(user.id))
    return Response.json({ user }, { status: 201 })
  } catch (error) {
    console.error('[auth/signup]', error instanceof Error ? error.message : error)
    return Response.json({ error: 'Clue could not complete account setup right now. Please try again shortly.' }, { status: 503 })
  }
}
