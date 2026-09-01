const { neon } = require('@neondatabase/serverless')

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) { console.log('DATABASE_URL not present; skipping production schema check.'); return }
  const sql = neon(url)
  const statements = [
    `CREATE TABLE IF NOT EXISTS public.user_profiles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid UNIQUE REFERENCES public.users(id) ON DELETE CASCADE, name text, profession text, uses jsonb DEFAULT '[]'::jsonb NOT NULL, communication_style text, experience_level text, technologies text, goals text, explicit_memory text, memory_enabled boolean DEFAULT true NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS public.memories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, content text NOT NULL, source text NOT NULL DEFAULT 'explicit', importance real NOT NULL DEFAULT 0.5, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS memories_user_updated_idx ON public.memories(user_id, updated_at)`,
    `ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS user_id uuid`,
    `ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS name text`,
    `ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS profession text`,
    `ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS uses jsonb DEFAULT '[]'::jsonb NOT NULL`,
    `ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS communication_style text`,
    `ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS experience_level text`,
    `ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS technologies text`,
    `ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS goals text`,
    `ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS explicit_memory text`,
    `ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS memory_enabled boolean DEFAULT true NOT NULL`,
    `ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL`,
    `ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey`,
    `ALTER TABLE public.user_profiles ALTER COLUMN uses TYPE jsonb USING to_jsonb(uses)`,
    `UPDATE public.user_profiles SET user_id = id WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM public.users WHERE public.users.id = public.user_profiles.id)`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_user_id_unique') THEN ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id); END IF; IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_user_id_users_id_fk') THEN ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE; END IF; END $$`,
    `CREATE TABLE IF NOT EXISTS public.generated_files (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL, name text NOT NULL, mime_type text NOT NULL, size integer NOT NULL, data bytea NOT NULL, content_text text, metadata jsonb DEFAULT '{}'::jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS generated_files_user_created_idx ON public.generated_files(user_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS generated_files_conversation_created_idx ON public.generated_files(conversation_id, created_at DESC)`,
  ]
  for (const statement of statements) await sql.unsafe(statement)
  console.log('Production schema check completed.')
}

main().catch(error => { console.error('Production schema check failed:', error); process.exit(1) })
