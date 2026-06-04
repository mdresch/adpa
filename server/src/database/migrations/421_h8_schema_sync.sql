-- Migration: Synchronize H8 Entity Schemas with Database
-- This migration adds missing columns to entity tables to prevent "column does not exist" errors during extraction.
-- Specifically addresses the 'benefit_name' missing from 'benefit_realization_plan'.

-- 1) benefit_realization_plan hardening
DO $$ 
BEGIN
    -- Add benefit_name if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benefit_realization_plan' AND column_name = 'benefit_name') THEN
        ALTER TABLE public."benefit_realization_plan" ADD COLUMN "benefit_name" character varying(255);
        -- Copy data from benefit_description if possible (for existing records)
        UPDATE public."benefit_realization_plan" SET "benefit_name" = SUBSTRING("benefit_description" FROM 1 FOR 255) WHERE "benefit_name" IS NULL;
        -- Set to NOT NULL once populated
        ALTER TABLE public."benefit_realization_plan" ALTER COLUMN "benefit_name" SET NOT NULL;
    END IF;

    -- Add strategic_alignment if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benefit_realization_plan' AND column_name = 'strategic_alignment') THEN
        ALTER TABLE public."benefit_realization_plan" ADD COLUMN "strategic_alignment" text;
    END IF;

    -- Add actual_value if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benefit_realization_plan' AND column_name = 'actual_value') THEN
        ALTER TABLE public."benefit_realization_plan" ADD COLUMN "actual_value" numeric;
    END IF;
END $$;

-- 2) business_case_details hardening (idempotency support)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_case_details' AND column_name = 'idempotency_key') THEN
        ALTER TABLE public."business_case_details" ADD COLUMN "idempotency_key" character varying(64);
        CREATE INDEX IF NOT EXISTS "idx_business_case_idempotency" ON public.business_case_details("idempotency_key");
    END IF;
END $$;

-- 3) engagement_actions hardening (not-null insurance)
ALTER TABLE public."engagement_actions" ALTER COLUMN "description" DROP NOT NULL;
