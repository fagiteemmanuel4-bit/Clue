import { db, hasDatabaseUrl } from '@/db'
import { sql } from 'drizzle-orm'

export const runtime = 'nodejs'
const requiredTables = ['users', 'conversations', 'messages', 'voice_settings', 'sessions']

export async function GET() {
  if (!hasDatabaseUrl) return Response.json({ ok: false, ai: Boolean(process.env.OPENROUTER_API_KEY), database: 'missing', error: 'DATABASE_URL is not configured' }, { status: 503 })
  try {
    const result = await Promise.race([
      db.execute(sql`select table_name from information_schema.tables where table_schema = 'public' and table_name in ('users','conversations','messages','voice_settings','sessions')`),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
    ])
    const found = new Set(result.rows.map(row => String(row.table_name)))
    const missing = requiredTables.filter(table => !found.has(table))
    if (missing.length) return Response.json({ ok: false, ai: Boolean(process.env.OPENROUTER_API_KEY), database: 'connected', error: 'Database schema incomplete', missing }, { status: 503 })
    return Response.json({ ok: true, service: 'clue-api', ai: Boolean(process.env.OPENROUTER_API_KEY), database: 'connected', schema: 'ready' })
  } catch {
    return Response.json({ ok: false, ai: Boolean(process.env.OPENROUTER_API_KEY), database: 'unreachable', error: 'Database unavailable' }, { status: 503 })
  }
}
