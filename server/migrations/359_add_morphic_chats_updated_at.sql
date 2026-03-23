-- Migration 359: Add updated_at to morphic_chats

ALTER TABLE "morphic_chats" ADD COLUMN "updated_at" timestamp DEFAULT now();

-- Update existing rows to have updated_at equal to created_at if preferred, 
-- but DEFAULT now() already handles it for new and existing rows (as a constant for existing).
UPDATE "morphic_chats" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
