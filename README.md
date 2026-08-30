# Clue

Clue is a calm, powerful AI workspace.

## Stack

- Next.js App Router
- TypeScript
- Neon PostgreSQL
- Drizzle ORM
- Zod validation
- Server-side AI provider abstraction

## Development

```bash
npm install
npm run dev
```

## Database

Set `DATABASE_URL` to the pooled Neon PostgreSQL connection string. Apply the checked-in Drizzle migration with `npm run db:migrate`.

## Deployment

The repository is connected to Vercel. Production deployments are created from `main`.
