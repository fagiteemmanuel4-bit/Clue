import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { sessions } from '@/db/schema'
import { hashSessionToken } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST() {
  const store = await cookies()
  const raw = store.get('clue_session')?.value
  if (raw) await db.delete(sessions).where(eq(sessions.token, hashSessionToken(raw)))
  store.delete('clue_session')
  return Response.json({ ok: true })
}
