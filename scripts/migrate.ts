import { migrate } from 'drizzle-orm/neon-http/migrator'
import { db } from '@/db'

async function main() {
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('Migrations applied')
}

main().catch(error => {
  console.error('Database migration failed:', error)
  process.exitCode = 1
})
