CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant');
CREATE TYPE "public"."content_type" AS ENUM('text', 'voice');
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "display_name" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "preferred_accent" text DEFAULT 'neutral' NOT NULL,
  "theme_preference" text DEFAULT 'system' NOT NULL
);
CREATE TABLE "conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text DEFAULT 'New conversation' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "conversations_user_updated_idx" ON "conversations" USING btree ("user_id", "updated_at");
CREATE TABLE "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "role" "message_role" NOT NULL,
  "content_text" text NOT NULL,
  "content_type" "content_type" DEFAULT 'text' NOT NULL,
  "audio_url" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "messages_conversation_created_idx" ON "messages" USING btree ("conversation_id", "created_at");
CREATE TABLE "voice_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "accent" text DEFAULT 'neutral' NOT NULL,
  "speed" real DEFAULT 1 NOT NULL,
  "pitch" real DEFAULT 0 NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "expires_at" timestamptz NOT NULL
);
CREATE INDEX "sessions_user_expires_idx" ON "sessions" USING btree ("user_id", "expires_at");
