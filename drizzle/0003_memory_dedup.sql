-- Make explicit memory writes idempotent and prevent duplicate memories per user.
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS content_hash text;
UPDATE public.memories SET content_hash = md5(content) WHERE content_hash IS NULL;
ALTER TABLE public.memories ALTER COLUMN content_hash SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS memories_user_content_hash_uidx ON public.memories(user_id, content_hash);
