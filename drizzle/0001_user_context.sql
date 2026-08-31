CREATE TABLE IF NOT EXISTS "user_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text,
  "profession" text,
  "uses" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "communication_style" text,
  "experience_level" text,
  "technologies" text,
  "goals" text,
  "explicit_memory" text,
  "memory_enabled" boolean DEFAULT true NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "memories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "source" text DEFAULT 'explicit' NOT NULL,
  "importance" real DEFAULT 0.5 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "memories_user_updated_idx" ON "memories" ("user_id", "updated_at");
