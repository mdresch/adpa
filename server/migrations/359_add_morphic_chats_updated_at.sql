-- Migration 359: Add updated_at to morphic_chats
-- Guarded: morphic_chats lives in the separate Morphic/Supabase database
-- (MORPHIC_DATABASE_URL), not the main ADPA DATABASE_URL these migrations
-- apply to, so the table won't exist here on Azure. No-op if absent.

DO $$
BEGIN
  IF to_regclass('public.morphic_chats') IS NOT NULL THEN
    ALTER TABLE "morphic_chats" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
    UPDATE "morphic_chats" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
  END IF;
END $$;
