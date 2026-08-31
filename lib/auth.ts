import { cookies } from 'next/headers'
import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import { db } from '@/db'
import { sessions, users } from '@/db/schema'

const SESSION_DAYS = 30
const AUTH_LOOKUP_TIMEOUT = 1_500

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(userId: string) {
  const raw = randomBytes(32).toString('hex')
  const token = hashSessionToken(raw)
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000)
  await db.insert(sessions).values({ userId, token, expiresAt })
  const store = await cookies()
  store.set('clue_session', raw, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: expiresAt })
  return expiresAt
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), ms) }),
    ])
  } catch {
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function getCurrentUser() {
  const raw = (await cookies()).get('clue_session')?.value
  if (!raw) return null
  const token = hashSessionToken(raw)
  const rows = await withTimeout(
    db.select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1),
    AUTH_LOOKUP_TIMEOUT,
  )
  return rows?.[0]?.user ?? null
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error('UNAUTHORIZED')
  return user
}
