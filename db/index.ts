import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL
// Keep module evaluation build-safe. Vercel injects DATABASE_URL at runtime.
// Any real database operation without it will fail rather than silently use a fallback database.
const sql = neon(connectionString ?? 'postgresql://missing:missing@missing.invalid/missing')
export const db = drizzle(sql, { schema })
export const hasDatabaseUrl = Boolean(connectionString)
