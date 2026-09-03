import { db, hasDatabaseUrl } from '@/db'
import { sql } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const requiredTables = [
  'users', 'user_profiles', 'memories', 'conversations', 'messages',
  'generated_files', 'voice_settings', 'sessions',
] as const

async function checkDatabase() {
  const result = await Promise.race([
    db.execute(sql`select table_name from information_schema.tables where table_schema = 'public' and table_name in (${sql.join(requiredTables.map(t => sql`${t}`), sql`, `)})`),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
  ])
  const found = new Set(result.rows.map(row => String(row.table_name)))
  return requiredTables.filter(table => !found.has(table))
}

export async function GET() {
  const checks = {
    database: 'missing' as 'missing' | 'connected' | 'unreachable',
    schema: 'unknown' as 'unknown' | 'ready' | 'incomplete',
    ai: Boolean(process.env.OPENROUTER_API_KEY),
  }

  if (!hasDatabaseUrl) {
    return Response.json({ ok: false, service: 'clue-api', ...checks, error: 'DATABASE_URL is not configured' }, { status: 503 })
  }

  try {
    checks.database = 'connected'
    const missing = await checkDatabase()
    checks.schema = missing.length ? 'incomplete' : 'ready'
    if (missing.length) {
      return Response.json({ ok: false, service: 'clue-api', ...checks, error: 'Database schema incomplete', missing }, { status: 503 })
    }
    if (!checks.ai) {
      return Response.json({ ok: false, service: 'clue-api', ...checks, error: 'AI provider is not configured' }, { status: 503 })
    }
    return Response.json({ ok: true, service: 'clue-api', ...checks })
  } catch {
    checks.database = 'unreachable'
    return Response.json({ ok: false, service: 'clue-api', ...checks, error: 'Database unavailable' }, { status: 503 })
  }
}
