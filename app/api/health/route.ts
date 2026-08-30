import { db, hasDatabaseUrl } from '@/db'
import { sql } from 'drizzle-orm'

export const runtime = 'nodejs'
export async function GET() {
  if (!hasDatabaseUrl) return Response.json({ ok: false, error: 'DATABASE_URL is not configured' }, { status: 503 })
  try { await db.execute(sql`select 1`); return Response.json({ ok: true, service: 'clue-api' }) }
  catch { return Response.json({ ok: false, error: 'Database unavailable' }, { status: 503 }) }
}
