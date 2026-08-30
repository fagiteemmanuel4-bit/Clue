# Clue backend

Clue uses Next.js API routes, Neon serverless Postgres, and Drizzle ORM. No Firebase or Supabase is required.

## Neon
1. Create a free Neon project at https://neon.tech/.
2. Create/select a Postgres database.
3. Copy the **pooled** connection string. Keep it private.

## Environment variables
Set these in Vercel (and locally in `.env.local`):

```env
DATABASE_URL=postgresql://...
```

Never commit `.env.local` or a database password.

## Database
Install dependencies and apply the checked-in migration:

```bash
npm install
DATABASE_URL='postgresql://...' npm run db:migrate
```

Generate a new migration after schema changes:

```bash
npm run db:generate
```

## Development

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:3000/api/health
```

## API

- `POST /api/auth/signup` — create a user and session
- `POST /api/auth/login` — authenticate and create a session
- `GET|POST /api/conversations` — list/create conversations
- `GET|PATCH|DELETE /api/conversations/:id` — read/update/delete a conversation
- `GET|POST /api/conversations/:id/messages` — list/create messages
- `GET|PATCH|DELETE /api/conversations/:conversationId/messages/:id` — read/update/delete a message
- `GET|PUT /api/voice-settings` — read/save voice settings
- `GET /api/health` — live database connectivity check

## Vercel
The repository is configured for Next.js. After setting `DATABASE_URL` in the Vercel project, deploy with:

```bash
npx vercel --prod
```

Migrations are intentionally explicit rather than automatically run during every deployment. Run `npm run db:migrate` against the production Neon database before using newly introduced schema changes.
