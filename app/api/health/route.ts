import { db } from '@/db'
import { sql } from 'drizzle-orm'

export const runtime = 'nodejs'
export async function GET() {
  try {
    await db.execute(sql`select 1`)
    return Response.json({ ok: true, service: 'clue-api' })
  } catch {
    return Response.json({ ok: false, error: 'Database unavailable' }, { status: 503 })
  }
}
